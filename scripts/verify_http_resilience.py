"""Opt-in local HTTP probe; owns its disposable Docker DB and API process."""
import concurrent.futures
import hashlib
from importlib import metadata
import json
import os
import platform
import socket
from pathlib import Path
import subprocess
import sys
import time
import httpx


ROOT = Path(__file__).resolve().parents[1]
NAME = "leafcreme-http-resilience-test"
BASE = "http://127.0.0.1:58081"
DB_URL = "postgresql+psycopg2://benchmark:local-disposable-benchmark@127.0.0.1:55440/leafcreme_http_test"
IMAGE_DB_URL = "postgresql+psycopg2://benchmark:local-disposable-benchmark@leafcreme-image-db-test:5432/leafcreme_image_test"
CLIENT = httpx.Client(timeout=10, trust_env=False,
                      limits=httpx.Limits(max_connections=100, max_keepalive_connections=100))


def code_identity():
    files = sorted(set(
        list((ROOT / "app").rglob("*.py"))
        + list((ROOT / "alembic").rglob("*.py"))
        + [Path(__file__).resolve(), ROOT / "requirements.txt", ROOT / "alembic.ini"]
    ))
    hashes = {path.relative_to(ROOT).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
              for path in files}
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True)
    if commit.returncode != 0:
        raise RuntimeError("Cannot identify benchmark base commit")
    return {"base_commit": commit.stdout.strip(), "source_sha256": hashes,
            "source_manifest_sha256": hashlib.sha256(json.dumps(hashes, sort_keys=True).encode()).hexdigest(),
            "python": platform.python_version(), "os": platform.system(),
            "packages": {name: metadata.version(name) for name in ("fastapi", "sqlalchemy", "httpx", "uvicorn")},
            "scope": "backend Python, migrations, harness, requirements.txt and alembic.ini; not full deployment identity"}


def process_sample(pid):
    if os.name != "nt":
        return {"supported": False, "reason": "Windows process sampler only"}
    result = subprocess.run([
        "powershell", "-NoProfile", "-NonInteractive", "-Command",
        f"$ids=@({int(pid)}); $queue=[System.Collections.Generic.Queue[int]]::new(); "
        f"$queue.Enqueue({int(pid)}); while($queue.Count -gt 0) {{$parent=$queue.Dequeue(); "
        "Get-CimInstance Win32_Process -Filter \"ParentProcessId = $parent\" | ForEach-Object {"
        "$child=[int]$_.ProcessId; if($ids -notcontains $child){$ids += $child; $queue.Enqueue($child)}}}; "
        "@(Get-Process -Id $ids | Select-Object Id,CPU,WorkingSet64,PrivateMemorySize64) | ConvertTo-Json -Compress",
    ], capture_output=True, text=True, encoding="utf-8", check=True, timeout=10)
    rows = json.loads(result.stdout)
    if isinstance(rows, dict):
        rows = [rows]
    return {"supported": True, "launcher_pid": pid, "process_ids": [row["Id"] for row in rows],
            "cpu_seconds": sum(row["CPU"] or 0 for row in rows),
            "working_set_bytes": sum(row["WorkingSet64"] for row in rows),
            "private_bytes": sum(row["PrivateMemorySize64"] for row in rows),
            "scope": "launcher plus observed descendants; working sets may include shared pages"}


def serve_instrumented():
    if os.getenv("DATABASE_URL") not in (DB_URL, DB_URL.replace("leafcreme_http_test", "leafcreme_restore_test")):
        raise RuntimeError("Instrumentation is restricted to disposable DB")
    sys.path.insert(0, str(ROOT))
    memory_profile = os.getenv("RESILIENCE_MEMORY_PROFILE") == "1"
    if memory_profile:
        import tracemalloc
        tracemalloc.start()
    import logging
    from sqlalchemy import event
    import uvicorn
    from app.services.alerts.alert_service import AlertService
    from app.services.agent import proactive_service
    from app.services.orders.checkout_service import CheckoutService
    from app.services.orders import OrderService
    from app.services.payments import PaymentService
    if os.getenv("RESILIENCE_NOTIFICATION_CRASH") == "1":
        from app.services.agent import proactive_actions
        original_notification = proactive_actions.create_proactive_notification

        def notification_with_crash(*args, **kwargs):
            if os.getenv("RESILIENCE_NOTIFICATION_BEFORE") == "1":
                os._exit(76)
            result = original_notification(*args, **kwargs)
            if result.get("created"):
                os._exit(75)
            return result

        proactive_actions.create_proactive_notification = notification_with_crash

    logger = logging.getLogger("resilience.timings")
    original_create = OrderService.create_order

    def create_with_precommit_crash(self, db, payload, *args, **kwargs):
        result = original_create(self, db, payload, *args, **kwargs)
        if (os.getenv("RESILIENCE_BEFORE_COMMIT") == "1"
                and getattr(payload, "ghi_chu", None) == "crash-before-commit"
                and kwargs.get("commit") is False):
            os._exit(72)
        return result

    OrderService.create_order = create_with_precommit_crash
    original_webhook = PaymentService.handle_sepay_webhook

    def webhook_with_crash(self, db, body):
        if os.getenv("RESILIENCE_WEBHOOK_BEFORE") == "1" and body.get("id") == 987654:
            original_commit = db.commit

            def crash_commit():
                db.flush()
                os._exit(73)

            db.commit = crash_commit
            try:
                return original_webhook(self, db, body)
            finally:
                db.commit = original_commit
        result = original_webhook(self, db, body)
        if os.getenv("RESILIENCE_WEBHOOK_AFTER") == "1" and body.get("id") == 987654:
            os._exit(74)
        return result

    PaymentService.handle_sepay_webhook = webhook_with_crash

    def timed(original, label):
        def wrapped(*args, **kwargs):
            started = time.perf_counter()
            measure_queries = label == "proactive_insights"
            counts = {"queries": 0}
            connection = args[0].connection() if measure_queries else None

            def count_query(*unused):
                counts["queries"] += 1

            if measure_queries:
                event.listen(connection, "before_cursor_execute", count_query)
            try:
                result = original(*args, **kwargs)
                if (label == "checkout_total" and os.getenv("RESILIENCE_LOST_RESPONSE") == "1"
                        and len(args) > 3 and args[3] == "lost-response"):
                    os._exit(71)
                return result
            finally:
                logger.warning("TIMING %s %.3f seconds", label, time.perf_counter() - started)
                if measure_queries:
                    event.remove(connection, "before_cursor_execute", count_query)
                    logger.warning("QUERIES initial_connection_only=%s", counts["queries"])
        return wrapped

    AlertService.generate_alerts = timed(AlertService.generate_alerts, "deterministic_alerts")
    proactive_service.safe_refresh_proactive_insights = timed(
        proactive_service.safe_refresh_proactive_insights, "proactive_insights")
    CheckoutService.checkout = timed(CheckoutService.checkout, "checkout_total")
    if memory_profile:
        from app.main import app
        baseline = None

        @app.get("/__resilience/memory", include_in_schema=False)
        def memory_snapshot():
            nonlocal baseline
            current = tracemalloc.take_snapshot()
            if baseline is None:
                baseline = current
            rows = current.compare_to(baseline, "lineno")[:20]
            traced, peak = tracemalloc.get_traced_memory()
            return {"traced_current_bytes": traced, "traced_peak_bytes": peak,
                    "deltas": [{"file": row.traceback[0].filename, "line": row.traceback[0].lineno,
                                "size_diff_bytes": row.size_diff, "count_diff": row.count_diff}
                               for row in rows]}

        uvicorn.run(app, host="127.0.0.1", port=int(os.getenv("RESILIENCE_API_PORT", "58081")))
    else:
        uvicorn.run("app.main:app", host="127.0.0.1", port=int(os.getenv("RESILIENCE_API_PORT", "58081")))


def seed_catalog():
    if os.getenv("DATABASE_URL") not in (DB_URL, IMAGE_DB_URL) or os.getenv("RUN_HTTP_RESILIENCE") != "1":
        raise RuntimeError("Refusing to seed outside the dedicated disposable DB")
    sys.path.insert(0, str(ROOT))
    from datetime import timedelta
    from app.core.time import utc_now
    from app.db import SessionLocal
    from app.models import SanPham, BienTheSanPham, LoHangSanPham, TonKhoSanPham, NguoiDung, VaiTro
    from app.core.security import create_access_token, get_password_hash

    with SessionLocal() as db:
        for index in range(80):
            product = SanPham(ten=f"Synthetic Cake {index}", sku=f"HTTP-{index}",
                              loai="bien_the", gia_co_ban=100000, dang_hoat_dong=True)
            db.add(product)
            db.flush()
            for size in (15, 20, 25):
                variant = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Chocolate",
                                        kich_thuoc=f"{size}cm", gia_bienthe=100000)
                db.add(variant)
                db.flush()
                for days in (-1, 3):
                    batch = LoHangSanPham(bienthe_sanpham_id=variant.bienthe_id,
                                          ma_lo=f"HTTP-{index}-{size}-{days}",
                                          ngay_het_han=utc_now() + timedelta(days=days),
                                          so_luong=10, gia_don_vi=50000, trang_thai="hoatdong")
                    db.add(batch)
                    db.flush()
                    db.add(TonKhoSanPham(lohang_sanpham_id=batch.lohang_id, so_luong_hien_tai=10))
        role = db.query(VaiTro).filter_by(ten_vai_tro="customer").one()
        tokens = []
        for index in range(20):
            user = NguoiDung(ten_dang_nhap=f"http-user-{index}", email=f"http-{index}@example.test",
                            mat_khau_ma_hoa=(get_password_hash(os.environ["LIVE_BROWSER_PASSWORD"])
                                             if index == 0 and os.getenv("LIVE_BROWSER_PASSWORD")
                                             else "synthetic-unusable-password"), vaitro_id=role.vaitro_id,
                            ho_ten="Synthetic Customer", dang_hoat_dong=True)
            db.add(user)
            db.flush()
            tokens.append(create_access_token({"sub": str(user.nguoidung_id)}))
        if os.getenv("RESILIENCE_FRESH_ORDERS") == "1":
            staff_role = db.query(VaiTro).filter_by(ten_vai_tro="staff").first()
            if staff_role is None:
                staff_role = VaiTro(ten_vai_tro="staff")
                db.add(staff_role)
                db.flush()
            staff = NguoiDung(ten_dang_nhap="synthetic-replenishment-staff", email="staff@example.test",
                              mat_khau_ma_hoa="synthetic-unusable-password", vaitro_id=staff_role.vaitro_id,
                              ho_ten="Synthetic Staff", dang_hoat_dong=True)
            db.add(staff)
            db.flush()
            tokens.append(create_access_token({"sub": str(staff.nguoidung_id)}))
        db.commit()
        (ROOT / "scratch/http-resilience-tokens.json").write_text(json.dumps(tokens), encoding="utf-8")


def command(*args):
    return subprocess.run(args, cwd=ROOT, check=True, capture_output=True, text=True)


def probe(path, payload=None, headers=None):
    started = time.perf_counter()
    try:
        response = CLIENT.request("POST" if payload else "GET", BASE + path, json=payload, headers=headers)
        body, status = response.text, response.status_code
    except Exception as error:
        status, body = 0, type(error).__name__
    return {"path": path, "status": status, "elapsed_ms": (time.perf_counter() - started) * 1000,
            "body": body}


def wait_ready():
    for _ in range(60):
        result = subprocess.run(["docker", "exec", NAME, "pg_isready", "-h", "127.0.0.1", "-U", "benchmark"], capture_output=True)
        if result.returncode == 0:
            return
        time.sleep(0.5)
    raise RuntimeError("Disposable DB did not become ready")


def probe_synthetic_auth(password):
    rejected = CLIENT.post(BASE + "/auth/login", data={
        "username": "http-user-0", "password": "Deliberately-wrong-local-password"})
    accepted = CLIENT.post(BASE + "/auth/login", data={"username": "http-user-0", "password": password})
    assert rejected.status_code == 401 and accepted.status_code == 200
    credentials = accepted.json()
    me = CLIENT.get(BASE + "/auth/me", headers={"Authorization": "Bearer " + credentials["access_token"]})
    refreshed = CLIENT.post(BASE + "/auth/refresh", json={"refresh_token": credentials["refresh_token"]})
    assert me.status_code == refreshed.status_code == 200
    refreshed_me = CLIENT.get(BASE + "/auth/me", headers={
        "Authorization": "Bearer " + refreshed.json()["access_token"]})
    assert refreshed_me.status_code == 200
    identity = me.json()
    assert identity["ten_dang_nhap"] == "http-user-0"
    assert refreshed_me.json()["nguoidung_id"] == identity["nguoidung_id"]
    # Record outcomes only, never password, access token, or refresh token.
    return {"invalid_password_status": rejected.status_code, "login_status": accepted.status_code,
            "me_status": me.status_code, "refresh_status": refreshed.status_code,
            "refreshed_me_status": refreshed_me.status_code, "synthetic_user_id": identity["nguoidung_id"]}


def probe_customer_authorization(tokens, order_id):
    owner = {"Authorization": "Bearer " + tokens[0]}
    other = {"Authorization": "Bearer " + tokens[1]}
    cases = [
        ("anonymous_orders", "/orders", None, 401),
        ("invalid_token", "/orders", {"Authorization": "Bearer deliberately-invalid-test-token"}, 401),
        ("other_customer_order", f"/orders/{order_id}", other, 403),
        ("other_customer_payments", f"/payments/orders/{order_id}", other, 403),
        ("customer_user_directory", "/users", owner, 403),
        ("customer_admin_variants", "/products/variants", owner, 403),
        ("customer_admin_agent", "/agent/state", owner, 403),
        ("owner_order", f"/orders/{order_id}", owner, 200),
    ]
    outcomes = []
    for name, path, headers, expected in cases:
        response = CLIENT.get(BASE + path, headers=headers)
        assert response.status_code == expected, name
        denied_body_safe = set(response.json()) == {"detail"} if expected != 200 else None
        assert expected == 200 or denied_body_safe, name
        outcomes.append({"case": name, "status": response.status_code,
                         "expected_status": expected, "denial_body_only_detail": denied_body_safe})
    own = CLIENT.get(BASE + f"/orders/{order_id}", headers=owner).json()
    listed = CLIENT.get(BASE + "/orders", headers=owner)
    assert listed.status_code == 200 and listed.json()
    for row in listed.json():
        detail = CLIENT.get(BASE + f"/orders/{row['donhang_id']}", headers=owner)
        assert detail.status_code == 200
        assert detail.json()["nguoidung_id"] == own["nguoidung_id"]
    return {"checks": outcomes, "own_order_list_status": listed.status_code,
            "own_order_list_scoped": True}


def probe_fresh_orders_and_replenishment(tokens):
    from datetime import datetime, timedelta, timezone

    assert len(tokens) == 21
    waves = []
    order_ids = set()
    for wave in range(2):
        if wave:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            restock = probe("/batches/products", {
                "bienthe_sanpham_id": 4, "so_luong": 10, "gia_don_vi": 50000,
                "ngay_san_xuat": now.isoformat(), "ngay_het_han": (now + timedelta(days=4)).isoformat(),
            }, {"Authorization": "Bearer " + tokens[20]})
            assert restock["status"] == 201

        def purchase(index):
            return probe("/orders/checkout", {"items": [{"bienthe_id": 4, "so_luong": 1}],
                         "payment_method": "pay_later"},
                         {"Authorization": "Bearer " + tokens[index],
                          "Idempotency-Key": f"fresh-wave-{wave}-customer-{index}"})

        with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
            rows = list(pool.map(purchase, range(20)))
        assert sum(row["status"] == 201 for row in rows) == 10
        assert sum(row["status"] == 400 for row in rows) == 10
        successful = [index for index, row in enumerate(rows) if row["status"] == 201]
        ids = {json.loads(rows[index]["body"])["order"]["donhang_id"] for index in successful}
        assert len(ids) == 10 and not ids.intersection(order_ids)
        order_ids.update(ids)
        for index in successful:
            replay = purchase(index)
            assert replay["status"] == 201
            assert json.loads(replay["body"])["order"]["donhang_id"] == json.loads(rows[index]["body"])["order"]["donhang_id"]
        stock = probe("/products/2/availability")
        assert stock["status"] == 200 and json.loads(stock["body"])[0]["so_luong_con"] == 0
        waves.append({"requests": rows, "distinct_orders": len(ids), "successful_replays": len(successful),
                      "remaining_stock": 0})
    return {"waves": waves, "restock_status": restock["status"], "total_distinct_orders": len(order_ids),
            "synthetic_customers": 20, "synthetic_staff": 1}


def probe_admission_under_db_lock():
    import psycopg2

    # Fixed disposable DSN only; the transaction never changes business rows.
    connection = psycopg2.connect(DB_URL.replace("postgresql+psycopg2://", "postgresql://"))
    rows = []

    def read():
        response = CLIENT.get(BASE + "/products?limit=60")
        return {"status": response.status_code, "retry_after": response.headers.get("retry-after"),
                "valid": len(response.json()) == 60 if response.status_code == 200 else
                response.json() == {"detail": "Server busy; retry shortly."}}

    try:
        with connection.cursor() as cursor:
            cursor.execute("SET LOCAL lock_timeout='3s'")
            cursor.execute("LOCK TABLE sanpham IN ACCESS EXCLUSIVE MODE")
        with concurrent.futures.ThreadPoolExecutor(max_workers=60) as pool:
            futures = [pool.submit(read) for _ in range(60)]
            try:
                deadline = time.perf_counter() + 4
                while not any(future.done() for future in futures):
                    if time.perf_counter() > deadline:
                        raise AssertionError("No bounded admission response while DB reads are blocked")
                    time.sleep(0.02)
                liveness = probe("/health")
                assert liveness["status"] == 200
            finally:
                connection.rollback()
            rows = [future.result() for future in futures]
        assert len(rows) == 60 and all(row["status"] in (200, 503) and row["valid"] for row in rows)
        assert any(row["status"] == 503 for row in rows)
        assert all(row["retry_after"] == "1" for row in rows if row["status"] == 503)
        readiness = probe("/health/db")
        recovered = probe("/products?limit=60")
        assert readiness["status"] == recovered["status"] == 200
        assert len(json.loads(recovered["body"])) == 60
        return {"requests": rows, "liveness_while_locked": liveness,
                "readiness_after_unlock": readiness, "catalog_after_unlock": recovered}
    finally:
        connection.rollback()
        connection.close()


def main():
    if not __debug__:
        raise SystemExit("Optimized Python disables assertions; refusing reliability verification")
    if os.getenv("RUN_HTTP_RESILIENCE") != "1":
        raise SystemExit("Set RUN_HTTP_RESILIENCE=1 to run isolated local probes")
    recovery_mode = "--recovery" in sys.argv
    soak_mode = "--soak" in sys.argv
    mixed_mode = "--mixed" in sys.argv
    browser_mode = "--browser" in sys.argv
    admission_mode = "--admission" in sys.argv
    authorization_mode = "--authorization" in sys.argv
    fresh_mode = "--fresh-orders" in sys.argv
    if fresh_mode and sys.argv[1:] != ["--fresh-orders"]:
        raise SystemExit("Fresh-order mode must run alone")
    if authorization_mode and sys.argv[1:] != ["--authorization"]:
        raise SystemExit("Authorization mode must run alone")
    if admission_mode and sys.argv[1:] != ["--admission"]:
        raise SystemExit("Admission mode must run alone")
    multi_api_mode = "--multi-api" in sys.argv
    notification_before_mode = "--notification-before-commit" in sys.argv
    notification_crash_mode = "--notification-crash" in sys.argv or notification_before_mode
    soak_seconds = int(os.getenv("RESILIENCE_SOAK_SECONDS", "60"))
    idle_seconds = int(os.getenv("RESILIENCE_IDLE_SECONDS", "0"))
    if not 0 <= idle_seconds <= 300:
        raise SystemExit("RESILIENCE_IDLE_SECONDS must be between 0 and 300")
    if not 1 <= soak_seconds <= 3600:
        raise SystemExit("RESILIENCE_SOAK_SECONDS must be between 1 and 3600")
    lost_response_mode = "--lost-response" in sys.argv
    before_commit_mode = "--before-commit" in sys.argv
    backup_mode = "--backup" in sys.argv
    webhook_after_mode = "--webhook-after-commit" in sys.argv
    webhook_before_mode = "--webhook-before-commit" in sys.argv
    webhook_crash_mode = webhook_before_mode or webhook_after_mode
    webhook_mode = "--webhook" in sys.argv or webhook_crash_mode
    output = ROOT / ("scratch/http-mixed-results.json" if mixed_mode else
                     "scratch/http-webhook-after-commit-results.json" if webhook_after_mode else
                     "scratch/http-webhook-before-commit-results.json" if webhook_before_mode else
                     "scratch/http-webhook-results.json" if webhook_mode else
                     "scratch/http-backup-restore-results.json" if backup_mode else
                     "scratch/http-before-commit-results.json" if before_commit_mode else
                     "scratch/http-lost-response-results.json" if lost_response_mode else
                     "scratch/http-soak-results.json" if soak_mode else
                     "scratch/http-startup-recovery-results.json" if recovery_mode else "scratch/http-resilience-results.json")
    output.parent.mkdir(exist_ok=True)
    if admission_mode:
        output = output.with_name("http-admission-results.json")
    if authorization_mode:
        output = output.with_name("http-authorization-results.json")
    if fresh_mode:
        output = output.with_name("http-fresh-orders-results.json")
    if os.getenv("RESILIENCE_MEMORY_PROFILE") == "1":
        output = output.with_name(f"{output.stem}-memory-profile.json")
    if backup_mode and webhook_mode:
        output = output.with_name("http-backup-all-tables-with-payment-results.json")
    if browser_mode:
        if any((mixed_mode, soak_mode, recovery_mode, backup_mode, webhook_mode, lost_response_mode, before_commit_mode)):
            raise SystemExit("Browser mode must run alone")
        output = output.with_name("http-live-browser-results.json")
    if multi_api_mode:
        if any((browser_mode, mixed_mode, soak_mode, recovery_mode, backup_mode, webhook_mode, lost_response_mode, before_commit_mode)):
            raise SystemExit("Multi-API mode must run alone")
        output = output.with_name("http-multi-api-results.json")
    if notification_crash_mode:
        if any((multi_api_mode, browser_mode, mixed_mode, soak_mode, recovery_mode, backup_mode, webhook_mode, lost_response_mode, before_commit_mode)):
            raise SystemExit("Notification crash mode must run alone")
        output = output.with_name("http-notification-before-commit-results.json" if notification_before_mode else "http-notification-crash-results.json")
    if (soak_mode or mixed_mode) and soak_seconds != 60:
        output = output.with_name(f"{output.stem}-{soak_seconds}s.json")
    env = dict(os.environ, APP_ENV="development", AUTH_PROVIDER="local", SCHEDULER_ENABLED="false" if recovery_mode else "true",
               DATABASE_URL=DB_URL,
               LANGFUSE_ENABLED="false", LANGFUSE_PUBLIC_KEY="", LANGFUSE_SECRET_KEY="", DEEPSEEK_API_KEY="")
    env["RESILIENCE_LOST_RESPONSE"] = "1" if lost_response_mode else "0"
    env["RESILIENCE_FRESH_ORDERS"] = "1" if fresh_mode else "0"
    env["RESILIENCE_BEFORE_COMMIT"] = "1" if before_commit_mode else "0"
    env["RESILIENCE_WEBHOOK_BEFORE"] = "1" if webhook_before_mode else "0"
    env["RESILIENCE_WEBHOOK_AFTER"] = "1" if webhook_after_mode else "0"
    env["RESILIENCE_NOTIFICATION_CRASH"] = "1" if notification_crash_mode else "0"
    env["RESILIENCE_NOTIFICATION_BEFORE"] = "1" if notification_before_mode else "0"
    env.update(SEPAY_BANK_ACCOUNT="0123456789", SEPAY_BANK_CODE="MB", SEPAY_ACCOUNT_NAME="Synthetic Receiver",
               SEPAY_WEBHOOK_API_KEY="isolated-webhook-test-key")
    if browser_mode:
        env["CORS_ORIGINS"] = "http://127.0.0.1:4173"
    if browser_mode or backup_mode:
        env["LIVE_BROWSER_PASSWORD"] = "Synthetic-only-local-browser-2026"
    report = {"environment": "isolated local; one uvicorn worker; synthetic catalog; no external providers",
              "verification_status": "incomplete", "report_schema_version": 1,
              "browser_required": browser_mode,
              "admission_required": admission_mode,
              "backup_auth_required": backup_mode,
              "authorization_required": authorization_mode, "fresh_orders_required": fresh_mode,
              "code_identity": code_identity(),
              "dataset": {"products": 80, "variants": 240, "batches": 480, "expired_batches": 240},
              "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "load": []}
    api = None
    second_api = None
    owned = False
    try:
        command("docker", "run", "--detach", "--name", NAME, "--publish", "127.0.0.1:55440:5432",
                "--env", "POSTGRES_USER=benchmark", "--env", "POSTGRES_PASSWORD=local-disposable-benchmark",
                "--env", "POSTGRES_DB=leafcreme_http_test", "postgres:16-alpine")
        owned = True
        wait_ready()
        report["postgres_version"] = command("docker", "exec", NAME, "psql", "-U", "benchmark",
                                             "-d", "leafcreme_http_test", "-Atc", "SHOW server_version").stdout.strip()
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=ROOT, env=env, check=True,
                       stdout=subprocess.DEVNULL)
        subprocess.run([sys.executable, __file__, "--seed"], cwd=ROOT, env=env, check=True)
        with (ROOT / "scratch/http-resilience-api.log").open("w", encoding="utf-8") as log:
            api = subprocess.Popen([sys.executable, __file__, "--serve"], cwd=ROOT, env=env, stdout=log, stderr=log)
            if notification_crash_mode:
                exit_code = api.wait(timeout=30)
                assert exit_code == (76 if notification_before_mode else 75)
                state = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                "-Atc", "SELECT action_id, trang_thai, execution_attempts FROM agent_actions WHERE trang_thai='dang_xu_ly'")
                action_id, status, attempts = state.stdout.strip().split("|")
                assert status == "dang_xu_ly" and int(attempts) == 1
                report["notification_crash"] = {"exit_code": exit_code, "action_id": int(action_id),
                                                "before_status": status, "before_attempts": int(attempts),
                                                "clock_fixture": "Claim timestamp aged 16 minutes in disposable DB"}
                command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test", "-Atc",
                        f"UPDATE agent_actions SET ngay_bat_dau_xu_ly=now()-interval '16 minutes' WHERE action_id={int(action_id)}")
                env["RESILIENCE_NOTIFICATION_CRASH"] = "0"
                api = subprocess.Popen([sys.executable, __file__, "--serve"], cwd=ROOT, env=env, stdout=log, stderr=log)
            for _ in range(60):
                if api.poll() is not None:
                    raise RuntimeError("API exited; inspect scratch/http-resilience-api.log")
                if probe("/health/db")["status"] == 200:
                    break
                time.sleep(0.5)
            else:
                raise RuntimeError("API startup timed out")
            if notification_crash_mode:
                for _ in range(120):
                    recovered = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test", "-Atc",
                                        f"SELECT trang_thai, execution_attempts, coalesce((ket_qua->>'reconciled')::boolean,false), "
                                        f"(SELECT count(*) FROM proactive_insights i WHERE i.fingerprint=a.tham_so->>'fingerprint') "
                                        f"FROM agent_actions a WHERE action_id={int(action_id)}")
                    fields = recovered.stdout.strip().split("|")
                    if fields[0] == "hoan_thanh":
                        break
                    time.sleep(0.5)
                assert fields == (["hoan_thanh", "2", "f", "1"] if notification_before_mode else ["hoan_thanh", "1", "t", "1"])
                report["notification_crash"]["after_status_attempts_reconciled_insight_count"] = fields
            if multi_api_mode:
                with socket.socket() as reservation:
                    reservation.bind(("127.0.0.1", 0))
                    second_port = reservation.getsockname()[1]
                second_base = f"http://127.0.0.1:{second_port}"
                second_env = dict(env, RESILIENCE_API_PORT=str(second_port))
                second_api = subprocess.Popen([sys.executable, __file__, "--serve"], cwd=ROOT,
                                              env=second_env, stdout=log, stderr=log)
                for _ in range(60):
                    assert second_api.poll() is None, "Second API exited"
                    try:
                        if CLIENT.get(second_base + "/health/db").status_code == 200:
                            break
                    except httpx.TransportError:
                        pass
                    time.sleep(0.5)
                else:
                    raise RuntimeError("Second API startup timed out")
                query = """
WITH eligible AS (
SELECT canhbao_id FROM canhbaotonkho WHERE trang_thai='chua_xu_ly'
AND ((loai_canh_bao IN ('sap_het_han','qua_han') AND muc_do_nghiem_trong='cao')
OR loai_canh_bao='san_pham_can_nhap'))
SELECT (SELECT count(*) FROM eligible),
(SELECT count(*) FROM eligible e WHERE NOT EXISTS (SELECT 1 FROM proactive_insights i
WHERE i.source_alert_id=e.canhbao_id AND i.trang_thai IN ('unread','read'))),
(SELECT count(*) FROM (SELECT source_alert_id FROM proactive_insights
WHERE trang_thai IN ('unread','read') GROUP BY source_alert_id HAVING count(*)>1) d)
"""
                for _ in range(120):
                    row = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test", "-Atc", query)
                    eligible, missing, duplicates = map(int, row.stdout.strip().split("|"))
                    if eligible > 0 and missing == 0:
                        break
                    assert api.poll() is None and second_api.poll() is None
                    time.sleep(0.5)
                assert eligible > 0 and missing == 0 and duplicates == 0
                api.terminate()
                api.wait(timeout=15)
                survivor = CLIENT.get(second_base + "/products?limit=80")
                assert survivor.status_code == 200 and len(survivor.json()) == 80
                report["multi_api"] = {"second_port": second_port, "eligible_alerts": eligible, "missing_sources": missing,
                                       "duplicate_open_sources": duplicates,
                                       "first_process_stopped": api.poll() is not None,
                                       "survivor_catalog_status": survivor.status_code}
                api = subprocess.Popen([sys.executable, __file__, "--serve"], cwd=ROOT, env=env, stdout=log, stderr=log)
                for _ in range(60):
                    if probe("/health/db")["status"] == 200:
                        break
                    time.sleep(0.5)
                assert probe("/health/db")["status"] == 200
            if admission_mode:
                report["admission"] = probe_admission_under_db_lock()
            for workers in (1, 10, 50):
                started = time.perf_counter()
                with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
                    rows = list(pool.map(probe, ["/products?limit=60", "/products/1/availability"] * 100))
                report["load"].append({"workers": workers, "duration_seconds": time.perf_counter() - started,
                                       "requests": rows})
            tokens = json.loads((ROOT / "scratch/http-resilience-tokens.json").read_text())
            if env.get("RESILIENCE_MEMORY_PROFILE") == "1":
                report["memory_profile"] = {"after_warmup": json.loads(probe("/__resilience/memory")["body"])}
            if browser_mode:
                browser_env = dict(env, RUN_LIVE_BROWSER="1", LIVE_BROWSER_TOKEN=tokens[0],
                                   VITE_API_BASE_URL=BASE, VITE_AUTH_PROVIDER="local")
                browser = subprocess.run(
                    ["npm.cmd" if os.name == "nt" else "npm", "run", "test:e2e", "--", "checkout-live.spec.ts"],
                    cwd=ROOT / "frontend", env=browser_env, capture_output=True,
                    text=True, encoding="utf-8", errors="replace", timeout=120,
                )
                report["browser"] = {"exit_code": browser.returncode, "stdout": browser.stdout, "stderr": browser.stderr}
                assert browser.returncode == 0, browser.stdout + browser.stderr
                records = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                  "-Atc", "SELECT count(*) FROM checkout_requests")
                report["browser"]["checkout_records"] = int(records.stdout.strip())
                assert report["browser"]["checkout_records"] == 4
                stock = probe("/products/3/availability")
                report["browser"]["availability"] = stock
                assert [item["so_luong_con"] for item in json.loads(stock["body"])] == [8, 8, 8]
                receipt = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                  "-Atc", "SELECT count(*) FROM sepay_transactions WHERE transaction_id='SEPAY-543210' AND status='confirmed'")
                report["browser"]["confirmed_receipts"] = int(receipt.stdout.strip())
                assert report["browser"]["confirmed_receipts"] == 1
                journey_stock = probe("/products/6/availability")
                report["browser"]["journey_availability"] = journey_stock
                assert [item["so_luong_con"] for item in json.loads(journey_stock["body"])] == [9, 10, 10]
            if soak_mode or mixed_mode:
                started = time.perf_counter()
                measurements = []
                connection_samples = []
                next_sample = started

                def checked_probe(index):
                    if mixed_mode and index % 3 == 2:
                        user_index = (index // 3) % 20
                        row = probe("/orders/checkout", {"items": [{"bienthe_id": 10, "so_luong": 2}], "payment_method": "pay_later"},
                                    {"Authorization": "Bearer " + tokens[user_index], "Idempotency-Key": f"mixed-{user_index}"})
                        try:
                            body = json.loads(row["body"])
                            valid = (row["status"] == 201 and body["payment_status"] == "unpaid") or (
                                row["status"] == 400 and isinstance(body.get("detail"), str))
                        except (ValueError, TypeError, KeyError):
                            valid = False
                        return {"path": "/orders/checkout", "status": row["status"], "elapsed_ms": row["elapsed_ms"], "valid": valid}
                    path = "/products?limit=60" if index % 2 == 0 else "/products/1/availability"
                    row = probe(path)
                    try:
                        body = json.loads(row["body"])
                        valid = len(body) == 60 if index % 2 == 0 else (
                            len(body) == 3 and all(item["so_luong_con"] == 10 for item in body))
                    except (ValueError, TypeError, KeyError):
                        valid = False
                    return {"path": path, "status": row["status"], "elapsed_ms": row["elapsed_ms"], "valid": valid}

                with concurrent.futures.ThreadPoolExecutor(max_workers=50) as pool:
                    while time.perf_counter() - started < soak_seconds:
                        measurements.extend(pool.map(checked_probe, range(100)))
                        if time.perf_counter() >= next_sample:
                            sample = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                             "-Atc", "SELECT json_build_object('connections', count(*), 'lock_waiters', count(*) FILTER (WHERE wait_event_type='Lock')) FROM pg_stat_activity WHERE datname='leafcreme_http_test'")
                            connection_samples.append({"elapsed_seconds": time.perf_counter() - started,
                                                       **json.loads(sample.stdout), "api_process": process_sample(api.pid)})
                            next_sample = time.perf_counter() + 5
                report["soak"] = {"workers": 50, "duration_seconds": time.perf_counter() - started,
                                  "requested_duration_seconds": soak_seconds,
                                  "requests": measurements, "connection_samples": connection_samples,
                                  "mixed": mixed_mode}
                if "memory_profile" in report:
                    report["memory_profile"]["after_load"] = json.loads(probe("/__resilience/memory")["body"])
                if idle_seconds:
                    idle_started = time.perf_counter()
                    idle_samples = []
                    while True:
                        idle_samples.append({"elapsed_seconds": time.perf_counter() - idle_started,
                                             "api_process": process_sample(api.pid)})
                        remaining = idle_seconds - (time.perf_counter() - idle_started)
                        if remaining <= 0:
                            break
                        time.sleep(min(5, remaining))
                    report["post_load_idle"] = {"requested_seconds": idle_seconds,
                                                "scheduler_enabled": True, "samples": idle_samples}
                    if "memory_profile" in report:
                        report["memory_profile"]["after_idle"] = json.loads(probe("/__resilience/memory")["body"])
                if mixed_mode:
                    count = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                    "-Atc", "SELECT count(*) FROM checkout_requests WHERE idempotency_key LIKE 'mixed-%'")
                    report["mixed_checkout_records"] = int(count.stdout.strip())
                    assert report["mixed_checkout_records"] == 5
                    availability = probe("/products/4/availability")
                    report["mixed_availability"] = availability
                    assert [item["so_luong_con"] for item in json.loads(availability["body"])] == [0, 10, 10]

            def checkout(index, replay=False):
                return probe("/orders/checkout",
                             {"items": [{"bienthe_id": 1 if replay else 2, "so_luong": 2}],
                              "payment_method": "pay_later"},
                             {"Content-Type": "application/json", "Authorization": "Bearer " + tokens[0 if replay else index],
                              "Idempotency-Key": "same-key" if replay else f"distinct-{index}"})

            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                report["checkout_replays"] = list(pool.map(lambda index: checkout(index, True), range(20)))
                report["checkout_competition"] = list(pool.map(checkout, range(20)))
            report["post_checkout_availability"] = probe("/products/1/availability")
            if fresh_mode:
                report["fresh_orders"] = probe_fresh_orders_and_replenishment(tokens)
            if authorization_mode:
                order_id = json.loads(report["checkout_replays"][0]["body"])["order"]["donhang_id"]
                report["authorization"] = probe_customer_authorization(tokens, order_id)
            if webhook_mode:
                checkout_result = probe("/orders/checkout",
                                        {"items": [{"bienthe_id": 4, "so_luong": 2}], "payment_method": "sepay_qr"},
                                        {"Authorization": "Bearer " + tokens[0], "Idempotency-Key": "webhook-test"})
                assert checkout_result["status"] == 201
                payment = json.loads(checkout_result["body"])["payment_info"]
                body = {"id": 987654, "gateway": "MBBank", "transactionDate": "2026-10-06 12:00:00",
                        "accountNumber": "0123456789", "transferType": "in", "transferAmount": payment["amount"],
                        "code": payment["transfer_content"]}
                unauthorized = probe("/payments/sepay/webhook", body, {"Authorization": "Apikey wrong"})
                assert unauthorized["status"] == 401
                if webhook_crash_mode:
                    crashed = probe("/payments/sepay/webhook", body, {"Authorization": "Apikey isolated-webhook-test-key"})
                    assert crashed["status"] == 0
                    exit_code = api.wait(timeout=10)
                    assert exit_code == (74 if webhook_after_mode else 73)
                    before_retry = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                           "-Atc", f"SELECT trang_thai FROM thanhtoan WHERE thanhtoan_id={int(payment['payment_id'])}")
                    receipt_before = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                             "-Atc", "SELECT count(*) FROM sepay_transactions WHERE transaction_id='SEPAY-987654'")
                    assert before_retry.stdout.strip() == ("thanh_cong" if webhook_after_mode else "dang_xu_ly")
                    assert int(receipt_before.stdout.strip()) == (1 if webhook_after_mode else 0)
                    report["webhook_crash"] = {"first": crashed, "exit_code": exit_code,
                                               "payment_before_retry": before_retry.stdout.strip(),
                                               "receipt_before_retry": int(receipt_before.stdout.strip())}
                    env["RESILIENCE_WEBHOOK_BEFORE"] = "0"
                    env["RESILIENCE_WEBHOOK_AFTER"] = "0"
                    api = subprocess.Popen([sys.executable, __file__, "--serve"], cwd=ROOT, env=env, stdout=log, stderr=log)
                    for _ in range(60):
                        if probe("/health/db")["status"] == 200:
                            break
                        time.sleep(0.5)
                with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                    results = list(pool.map(lambda _: probe("/payments/sepay/webhook", body,
                                                           {"Authorization": "Apikey isolated-webhook-test-key"}), range(20)))
                count = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                "-Atc", "SELECT count(*) FROM sepay_transactions WHERE transaction_id='SEPAY-987654'")
                paid = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                               "-Atc", f"SELECT count(*), sum(so_tien) FROM thanhtoan WHERE thanhtoan_id={int(payment['payment_id'])} AND trang_thai='thanh_cong'")
                report["webhook"] = {"unauthorized": unauthorized, "requests": results,
                                     "receipt_count": int(count.stdout.strip()), "paid_count_and_amount": paid.stdout.strip()}
                assert all(row["status"] == 200 for row in results)
                assert int(count.stdout.strip()) == 1
                assert paid.stdout.strip() == f"1|{payment['amount']}.00"
                receipt_status = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                         "-Atc", "SELECT status FROM sepay_transactions WHERE transaction_id='SEPAY-987654'")
                report["webhook"]["receipt_status_after_retries"] = receipt_status.stdout.strip()
                assert receipt_status.stdout.strip() == "confirmed"
            if backup_mode:
                source_auth = probe_synthetic_auth(env["LIVE_BROWSER_PASSWORD"])
                # Quiesce writes before comparing source and restored snapshots.
                api.terminate()
                api.wait(timeout=15)

                def snapshot(database):
                    from sqlalchemy import create_engine, text
                    if database not in ("leafcreme_http_test", "leafcreme_restore_test"):
                        raise RuntimeError("Snapshot requires a disposable database")
                    engine = create_engine(DB_URL.replace("leafcreme_http_test", database))
                    result = {"tables": {}, "sequences": {}, "constraints": [], "indexes": []}
                    try:
                        with engine.connect().execution_options(isolation_level="REPEATABLE READ") as connection:
                            tables = connection.execute(text(
                                "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
                            )).scalars().all()
                            for table in tables:
                                identifier = engine.dialect.identifier_preparer.quote_identifier(table)
                                row = connection.execute(text(
                                    "SELECT count(*), coalesce(md5(string_agg(row_to_json(t)::text, ',' "
                                    f"ORDER BY row_to_json(t)::text)), 'empty') FROM public.{identifier} t"
                                )).one()
                                result["tables"][table] = {"rows": row[0], "digest": row[1]}
                            sequences = connection.execute(text(
                                "SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename"
                            )).scalars().all()
                            for sequence in sequences:
                                identifier = engine.dialect.identifier_preparer.quote_identifier(sequence)
                                row = connection.execute(text(
                                    f"SELECT last_value, is_called FROM public.{identifier}"
                                )).one()
                                result["sequences"][sequence] = {"last_value": row[0], "is_called": row[1]}
                            result["constraints"] = [list(row) for row in connection.execute(text(
                                "SELECT r.relname, c.conname, c.contype, c.convalidated, "
                                "pg_get_constraintdef(c.oid) FROM pg_constraint c "
                                "JOIN pg_class r ON r.oid=c.conrelid "
                                "JOIN pg_namespace n ON n.oid=r.relnamespace "
                                "WHERE n.nspname='public' ORDER BY r.relname, c.conname"
                            ))]
                            result["canonical_constraints"] = []
                            for table, name, kind, validated, definition in result["constraints"]:
                                if kind == "c":
                                    quote = engine.dialect.identifier_preparer.quote_identifier
                                    temporary = quote("restore_check_probe")
                                    connection.execute(text(f"CREATE TEMP TABLE {temporary} (LIKE public.{quote(table)})"))
                                    connection.execute(text(f"ALTER TABLE {temporary} ADD CONSTRAINT {quote(name)} {definition}"))
                                    definition = connection.execute(text(
                                        "SELECT pg_get_constraintdef(oid) FROM pg_constraint "
                                        "WHERE conrelid='pg_temp.restore_check_probe'::regclass AND conname=:name"
                                    ), {"name": name}).scalar_one()
                                    connection.execute(text(f"DROP TABLE {temporary}"))
                                result["canonical_constraints"].append([table, name, kind, validated, definition])
                            result["indexes"] = [list(row) for row in connection.execute(text(
                                "SELECT tablename, indexname, indexdef FROM pg_indexes "
                                "WHERE schemaname='public' ORDER BY tablename, indexname"
                            ))]
                            result["columns"] = [list(row) for row in connection.execute(text(
                                "SELECT r.relname, a.attname, a.attnum, format_type(a.atttypid,a.atttypmod), "
                                "a.attnotnull, a.attidentity, a.attgenerated, pg_get_expr(d.adbin,d.adrelid) "
                                "FROM pg_class r JOIN pg_namespace n ON n.oid=r.relnamespace "
                                "JOIN pg_attribute a ON a.attrelid=r.oid "
                                "LEFT JOIN pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum "
                                "WHERE n.nspname='public' AND r.relkind IN ('r','p') "
                                "AND a.attnum>0 AND NOT a.attisdropped ORDER BY r.relname,a.attnum"
                            ))]
                            result["enum_labels"] = [list(row) for row in connection.execute(text(
                                "SELECT t.typname,e.enumsortorder,e.enumlabel FROM pg_type t "
                                "JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid "
                                "WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder"
                            ))]
                            result["sequence_config"] = [list(row) for row in connection.execute(text(
                                "SELECT sequencename,data_type::text,start_value,min_value,max_value,increment_by,cycle,cache_size "
                                "FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename"
                            ))]
                            result["sequence_ownership"] = [list(row) for row in connection.execute(text(
                                "SELECT s.relname,r.relname,a.attname,d.deptype FROM pg_class s "
                                "JOIN pg_namespace n ON n.oid=s.relnamespace JOIN pg_depend d ON d.objid=s.oid "
                                "AND d.classid='pg_class'::regclass AND d.refclassid='pg_class'::regclass "
                                "JOIN pg_class r ON r.oid=d.refobjid "
                                "JOIN pg_attribute a ON a.attrelid=r.oid AND a.attnum=d.refobjsubid "
                                "WHERE n.nspname='public' AND s.relkind='S' AND d.deptype IN ('a','i') "
                                "ORDER BY s.relname,r.relname,a.attname"
                            ))]
                            result["triggers"] = [list(row) for row in connection.execute(text(
                                "SELECT r.relname,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid) "
                                "FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid "
                                "JOIN pg_namespace n ON n.oid=r.relnamespace "
                                "WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY r.relname,t.tgname"
                            ))]
                    finally:
                        engine.dispose()
                    return result

                before = snapshot("leafcreme_http_test")
                dump = command("docker", "exec", NAME, "pg_dump", "-U", "benchmark", "--no-owner", "leafcreme_http_test")
                command("docker", "exec", NAME, "createdb", "-U", "benchmark", "leafcreme_restore_test")
                started = time.perf_counter()
                subprocess.run(["docker", "exec", "-i", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_restore_test",
                                "-v", "ON_ERROR_STOP=1"], input=dump.stdout, text=True, capture_output=True, check=True)
                after = snapshot("leafcreme_restore_test")
                report["backup_restore"] = {"source": before["tables"], "restored": after["tables"],
                                            "source_metadata": {key: value for key, value in before.items() if key != "tables"},
                                            "restored_metadata": {key: value for key, value in after.items() if key != "tables"},
                                            "raw_constraints_match": before["constraints"] == after["constraints"],
                                            "metadata_matches": all(before[key] == after[key] for key in
                                                                    ("sequences", "canonical_constraints", "indexes", "columns",
                                                                     "enum_labels", "sequence_config", "sequence_ownership", "triggers")),
                                            "restore_and_verify_seconds": time.perf_counter() - started,
                                            "table_count": len(before["tables"]), "all_public_tables_match": before["tables"] == after["tables"],
                                            "dump_bytes_utf8": len(dump.stdout.encode()), "all_selected_tables_match": before["tables"] == after["tables"]}
                assert before["tables"] == after["tables"]
                assert report["backup_restore"]["metadata_matches"]
                env["DATABASE_URL"] = DB_URL.replace("leafcreme_http_test", "leafcreme_restore_test")
                env["SCHEDULER_ENABLED"] = "false"
                api = subprocess.Popen([sys.executable, __file__, "--serve"], cwd=ROOT, env=env, stdout=log, stderr=log)
                for _ in range(60):
                    if probe("/health/db")["status"] == 200:
                        break
                    if api.poll() is not None:
                        raise RuntimeError("Restored API failed to boot")
                    time.sleep(0.5)
                restored_reads = [probe("/products?limit=80"), probe("/products/1/availability"),
                                  probe("/orders/1", headers={"Authorization": "Bearer " + tokens[0]})]
                report["backup_restore"]["api_reads_on_restored_db"] = restored_reads
                assert all(row["status"] == 200 for row in restored_reads)
                assert len(json.loads(restored_reads[0]["body"])) == 80
                assert [item["so_luong_con"] for item in json.loads(restored_reads[1]["body"])] == [8, 0, 10]
                restored_auth = probe_synthetic_auth(env["LIVE_BROWSER_PASSWORD"])
                report["backup_restore"]["authentication"] = {"source": source_auth, "restored": restored_auth}
                assert source_auth == restored_auth
            if lost_response_mode or before_commit_mode:
                payload = {"items": [{"bienthe_id": 3, "so_luong": 2}], "payment_method": "pay_later"}
                if before_commit_mode:
                    payload["ghi_chu"] = "crash-before-commit"
                headers = {"Authorization": "Bearer " + tokens[0], "Idempotency-Key": "lost-response"}
                first = probe("/orders/checkout", payload, headers)
                exit_code = api.wait(timeout=10)
                assert first["status"] == 0 and exit_code == (72 if before_commit_mode else 71)
                if before_commit_mode:
                    count = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                    "-Atc", "SELECT count(*) FROM donhang")
                    assert int(count.stdout.strip()) == 6
                    stock_before_retry = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                                  "-Atc", "SELECT t.so_luong_hien_tai FROM tonkhosanpham t JOIN lohangsanpham l ON l.lohang_id=t.lohang_sanpham_id WHERE l.bienthe_sanpham_id=3 AND l.ma_lo='HTTP-0-25-3'")
                    assert int(stock_before_retry.stdout.strip()) == 10
                env["RESILIENCE_LOST_RESPONSE"] = "0"
                env["RESILIENCE_BEFORE_COMMIT"] = "0"
                api = subprocess.Popen([sys.executable, __file__, "--serve"], cwd=ROOT, env=env, stdout=log, stderr=log)
                for _ in range(60):
                    if probe("/health/db")["status"] == 200:
                        break
                    time.sleep(0.5)
                replay = probe("/orders/checkout", payload, headers)
                availability = probe("/products/1/availability")
                rows = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                               "-Atc", "SELECT count(*) FROM checkout_requests WHERE idempotency_key='lost-response'")
                report["lost_response"] = {"first": first, "exit_code": exit_code, "replay": replay,
                                           "availability": availability, "checkout_records": int(rows.stdout.strip())}
                if before_commit_mode:
                    report["lost_response"].update(before_commit=True, orders_before_retry=6, stock_before_retry=10)
                assert replay["status"] == 201
                assert int(rows.stdout.strip()) == 1
                assert [item["so_luong_con"] for item in json.loads(availability["body"])] == [8, 0, 8]
            command("docker", "stop", NAME)
            report["outage"] = [probe("/health/db"), probe("/health")]
            command("docker", "start", NAME)
            wait_ready()
            report["recovery"] = [probe("/health/db"), probe("/products")]
            report["api_pid_unchanged"] = api.poll() is None
            if recovery_mode:
                def insight_count():
                    result = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                     "-Atc", "SELECT count(*) FROM proactive_insights")
                    return int(result.stdout.strip())

                report["startup_recovery"] = {"before_insights": insight_count(), "scheduler_initially_disabled": True}
                assert report["startup_recovery"]["before_insights"] == 0
                old_pid = api.pid
                api.kill()
                api.wait(timeout=15)
                env["SCHEDULER_ENABLED"] = "true"
                started = time.perf_counter()
                api = subprocess.Popen([sys.executable, __file__, "--serve"], cwd=ROOT, env=env, stdout=log, stderr=log)
                expected = 0
                for _ in range(120):
                    count = insight_count()
                    expected_result = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                              "-Atc", "SELECT count(*) FROM canhbaotonkho WHERE trang_thai='chua_xu_ly' AND ((loai_canh_bao IN ('sap_het_han','qua_han') AND muc_do_nghiem_trong='cao') OR loai_canh_bao='san_pham_can_nhap')")
                    expected = int(expected_result.stdout.strip())
                    if expected > 0 and count >= expected:
                        break
                    if api.poll() is not None:
                        raise RuntimeError("Restarted API exited")
                    time.sleep(0.5)
                report["startup_recovery"].update(after_insights=count, eligible_alerts=expected,
                                                  elapsed_seconds=time.perf_counter() - started,
                                                  process_replaced=api.pid != old_pid)
                assert expected > 0 and count >= expected
                missing = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                  "-Atc", "SELECT count(*) FROM canhbaotonkho a WHERE a.trang_thai='chua_xu_ly' AND ((a.loai_canh_bao IN ('sap_het_han','qua_han') AND a.muc_do_nghiem_trong='cao') OR a.loai_canh_bao='san_pham_can_nhap') AND NOT EXISTS (SELECT 1 FROM proactive_insights i WHERE i.source_alert_id=a.canhbao_id AND i.trang_thai IN ('unread','read'))")
                duplicates = command("docker", "exec", NAME, "psql", "-U", "benchmark", "-d", "leafcreme_http_test",
                                     "-Atc", "SELECT count(*) FROM (SELECT source_alert_id FROM proactive_insights WHERE trang_thai IN ('unread','read') GROUP BY source_alert_id HAVING count(*)>1) d")
                report["startup_recovery"].update(missing_sources=int(missing.stdout.strip()),
                                                  duplicate_open_sources=int(duplicates.stdout.strip()))
                assert report["startup_recovery"]["missing_sources"] == 0
                assert report["startup_recovery"]["duplicate_open_sources"] == 0
                report["availability_after_api_restart"] = probe("/products/1/availability")
                assert report["availability_after_api_restart"]["status"] == 200
    except Exception as error:
        report["verification_status"] = "failed"
        report["failure_type"] = type(error).__name__
        raise
    finally:
        if second_api is not None:
            second_api.terminate()
            second_api.wait(timeout=15)
        if api is not None:
            api.terminate()
            api.wait(timeout=15)
        if owned:
            command("docker", "rm", "--force", NAME)
        (ROOT / "scratch/http-resilience-tokens.json").unlink(missing_ok=True)
        CLIENT.close()
        output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    try:
        verify_final_report(report)
    except Exception as error:
        report["verification_status"] = "failed"
        report["failure_type"] = type(error).__name__
        output.write_text(json.dumps(report, indent=2), encoding="utf-8")
        raise
    report["verification_status"] = "passed"
    report["verified_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(str(output))


def verify_final_report(report):
    assert not report.get("authorization_required", False) or "authorization" in report
    if "authorization" in report:
        authorization = report["authorization"]
        expected = {"anonymous_orders": 401, "invalid_token": 401, "other_customer_order": 403,
                    "other_customer_payments": 403, "customer_user_directory": 403,
                    "customer_admin_variants": 403, "customer_admin_agent": 403, "owner_order": 200}
        rows = authorization["checks"]
        assert len(rows) == len(expected)
        assert {row["case"]: row["status"] for row in rows} == expected
        assert all(row["denial_body_only_detail"] is True for row in rows if row["status"] != 200)
        assert authorization["own_order_list_status"] == 200 and authorization["own_order_list_scoped"] is True
    assert not report.get("fresh_orders_required", False) or "fresh_orders" in report
    if "fresh_orders" in report:
        fresh = report["fresh_orders"]
        assert fresh["restock_status"] == 201 and fresh["total_distinct_orders"] == 20
        assert fresh["synthetic_customers"] == 20 and fresh["synthetic_staff"] == 1
        assert len(fresh["waves"]) == 2
        order_ids = set()
        for wave in fresh["waves"]:
            rows = wave["requests"]
            assert len(rows) == 20
            assert sum(row["status"] == 201 for row in rows) == 10
            assert sum(row["status"] == 400 for row in rows) == 10
            ids = {json.loads(row["body"])["order"]["donhang_id"] for row in rows if row["status"] == 201}
            assert len(ids) == 10 and not ids.intersection(order_ids)
            order_ids.update(ids)
            assert wave["distinct_orders"] == wave["successful_replays"] == 10
            assert wave["remaining_stock"] == 0
    if report.get("backup_auth_required", False):
        authentication = report["backup_restore"]["authentication"]
        assert authentication["source"] == authentication["restored"]
        outcome = authentication["restored"]
        assert outcome["invalid_password_status"] == 401
        assert all(outcome[key] == 200 for key in (
            "login_status", "me_status", "refresh_status", "refreshed_me_status"))
        assert type(outcome["synthetic_user_id"]) is int and outcome["synthetic_user_id"] > 0
    assert not report.get("admission_required", False) or "admission" in report
    if "admission" in report:
        admission = report["admission"]
        rows = admission["requests"]
        assert len(rows) == 60 and all(row["status"] in (200, 503) and row["valid"] for row in rows)
        assert any(row["status"] == 503 for row in rows)
        assert all(row["retry_after"] == "1" for row in rows if row["status"] == 503)
        assert admission["liveness_while_locked"]["status"] == 200
        assert admission["readiness_after_unlock"]["status"] == 200
        assert admission["catalog_after_unlock"]["status"] == 200
        assert len(json.loads(admission["catalog_after_unlock"]["body"])) == 60
    assert not report.get("browser_required", False) or "browser" in report
    if "browser" in report:
        browser = report["browser"]
        assert browser["exit_code"] == 0
        assert browser["checkout_records"] == 4
        assert browser["confirmed_receipts"] == 1
        for key, expected in (("availability", [8, 8, 8]),
                              ("journey_availability", [9, 10, 10])):
            assert browser[key]["status"] == 200
            assert [row["so_luong_con"] for row in json.loads(browser[key]["body"])] == expected
    assert [batch["workers"] for batch in report["load"]] == [1, 10, 50]
    assert all(len(batch["requests"]) == 200 for batch in report["load"])
    assert all(row["status"] == 200 for batch in report["load"] for row in batch["requests"])
    for batch in report["load"]:
        for row in batch["requests"]:
            body = json.loads(row["body"])
            if row["path"] == "/products?limit=60":
                assert len(body) == 60
            else:
                assert row["path"] == "/products/1/availability"
                assert len(body) == 3
                assert all(variant["so_luong_con"] == 10 for variant in body)
    assert [row["status"] for row in report["outage"]] == [503, 200]
    assert [row["status"] for row in report["recovery"]] == [200, 200]
    assert len(report["checkout_replays"]) == 20
    assert all(row["status"] == 201 for row in report["checkout_replays"])
    assert len({json.loads(row["body"])["order"]["donhang_id"] for row in report["checkout_replays"]}) == 1
    assert len(report["checkout_competition"]) == 20
    assert sum(row["status"] == 201 for row in report["checkout_competition"]) == 5
    assert sum(row["status"] == 400 for row in report["checkout_competition"]) == 15
    assert report["post_checkout_availability"]["status"] == 200
    assert [row["so_luong_con"] for row in json.loads(report["post_checkout_availability"]["body"])] == [8, 0, 10]
    if "soak" in report:
        assert report["soak"]["requests"]
        assert all(row["valid"] and (row["status"] in (201, 400) if row["path"] == "/orders/checkout" else row["status"] == 200)
                   for row in report["soak"]["requests"])


if __name__ == "__main__":
    if sys.argv[1:] == ["--seed"]:
        seed_catalog()
    elif sys.argv[1:] == ["--serve"]:
        serve_instrumented()
    else:
        main()
