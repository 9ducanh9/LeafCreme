"""Opt-in client for the separately provisioned disposable Docker API."""
import concurrent.futures
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import threading
import time
import weakref

import httpx

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:58082"
NAME = "leafcreme-image-api-test"


def docker(*args):
    return subprocess.run(["docker", *args], check=True, capture_output=True, text=True).stdout.strip()


def main():
    if not __debug__:
        raise SystemExit("Optimized Python disables assertions; refusing image verification")
    if os.getenv("RUN_IMAGE_HTTP_LOAD") != "1":
        raise SystemExit("Requires explicitly provisioned disposable image API")
    identity = json.loads(docker("inspect", NAME))[0]
    workers = int(os.getenv("IMAGE_LOAD_WORKERS", "50"))
    if not 1 <= workers <= 200:
        raise SystemExit("IMAGE_LOAD_WORKERS must be between 1 and 200")
    duration = int(os.getenv("IMAGE_LOAD_SECONDS", "60"))
    if not 60 <= duration <= 600:
        raise SystemExit("IMAGE_LOAD_SECONDS must be between 60 and 600")
    keepalive_expiry = float(os.getenv("IMAGE_LOAD_KEEPALIVE_SECONDS", "5"))
    socket_trace = os.getenv("IMAGE_LOAD_SOCKET_TRACE") == "1"
    if not 0.1 <= keepalive_expiry <= 5:
        raise SystemExit("IMAGE_LOAD_KEEPALIVE_SECONDS must be between 0.1 and 5")
    assert identity["State"]["Running"]
    assert any(binding["HostIp"] == "127.0.0.1" and binding["HostPort"] == "58082"
               for binding in identity["NetworkSettings"]["Ports"]["8000/tcp"])
    required = "DATABASE_URL=postgresql+psycopg2://benchmark:local-disposable-benchmark@leafcreme-image-db-test:5432/leafcreme_image_test"
    assert required in identity["Config"]["Env"]
    assert "LANGFUSE_ENABLED=false" in identity["Config"]["Env"]
    assert "DEEPSEEK_API_KEY=" in identity["Config"]["Env"]
    tokens = json.loads(docker("exec", NAME, "cat", "/app/scratch/http-resilience-tokens.json"))
    report = {"image_id": identity["Image"], "container_id": identity["Id"],
              "environment": "local Docker; synthetic catalog; providers disabled",
              "verification_status": "incomplete", "requests": [], "container_samples": []}
    report["harness_sha256"] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    report["container_command"] = identity["Config"]["Cmd"]
    report["max_client_workers"] = workers
    report["requested_duration_seconds"] = duration
    report["client_transport"] = {"httpx_version": httpx.__version__,
                                  "timeout_seconds": 10, "retries": 0,
                                  "keepalive_expiry_seconds": keepalive_expiry}
    output = ROOT / "scratch/image-http-load-results.json"
    if workers != 50:
        output = output.with_name(f"image-http-load-{workers}-clients-results.json")
    tag = os.getenv("IMAGE_LOAD_RUN_TAG", "")
    if (duration != 60 or keepalive_expiry != 5 or socket_trace) and not tag:
        raise SystemExit("Nondefault experiments require a distinct IMAGE_LOAD_RUN_TAG")
    if tag:
        if not re.fullmatch(r"[a-z0-9-]{1,32}", tag):
            raise SystemExit("Invalid image-load artifact tag")
        output = output.with_name(f"{output.stem}-{tag}.json")
    report["started_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    if "--collect-only" in sys.argv:
        report = json.loads(output.read_text(encoding="utf-8"))
        assert report["container_id"] == identity["Id"] and report["image_id"] == identity["Image"]
        report["diagnostics"] = {
            "container_running": identity["State"]["Running"],
            "oom_killed": identity["State"]["OOMKilled"],
            "health": identity["State"].get("Health", {}).get("Status"),
            "memory_limit_bytes": identity["HostConfig"]["Memory"],
            "memory_swap_limit_bytes": identity["HostConfig"]["MemorySwap"],
            "nano_cpu_limit": identity["HostConfig"]["NanoCpus"],
            "db_activity": docker("exec", "leafcreme-image-db-test", "psql", "-U", "benchmark",
                                  "-d", "leafcreme_image_test", "-Atc",
                                  "SELECT state,wait_event_type,wait_event,count(*) FROM pg_stat_activity "
                                  "WHERE datname='leafcreme_image_test' GROUP BY state,wait_event_type,wait_event"),
        }
        log_args = ["docker", "logs"]
        if os.getenv("IMAGE_LOAD_FULL_LOGS") != "1":
            log_args.extend(["--tail", "500"])
        log_args.append(NAME)
        logs = subprocess.run(log_args, capture_output=True,
                              text=True, encoding="utf-8", errors="replace", check=True)
        output.with_suffix(".api.log").write_text(logs.stdout + logs.stderr, encoding="utf-8")
        output.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(output)
        return
    report["image_runtime"] = json.loads(docker("exec", NAME, "python", "-c",
        "import json,sys,uvicorn; from uvicorn.config import Config; "
        "c=Config(lambda scope,receive,send: None); c.load(); "
        "print(json.dumps({'python':sys.version.split()[0], 'uvicorn':uvicorn.__version__, "
        "'default_http_protocol':c.http_protocol_class.__module__+'.'+c.http_protocol_class.__name__, "
        "'default_keepalive_seconds':c.timeout_keep_alive}))"))
    socket_context = threading.local()
    socket_peers = weakref.WeakKeyDictionary()
    socket_lock = threading.Lock()
    report["socket_diagnostic_instrumentation"] = socket_trace
    if socket_trace:
        import httpcore
        from httpcore._sync.http11 import HTTP11Connection

        if httpcore.__version__ != "1.0.9" or identity["Config"]["Cmd"] != ["python", "scripts/run_image_transport_api.py"]:
            raise SystemExit("Socket diagnostics require reviewed httpcore and disposable diagnostic launcher")
        original_send = HTTP11Connection._send_request_headers

        def diagnostic_send(connection, request):
            with socket_lock:
                socket_context.peer_port = socket_peers.get(connection._network_stream)
            return original_send(connection, request)

        HTTP11Connection._send_request_headers = diagnostic_send
    try:
        with httpx.Client(timeout=10, trust_env=False,
                          limits=httpx.Limits(max_connections=max(100, workers),
                                             max_keepalive_connections=max(100, workers),
                                             keepalive_expiry=keepalive_expiry)) as client:
            active = 0
            peak = 0
            counter_lock = threading.Lock()

            def read(index):
                nonlocal active, peak
                path = "/products?limit=80" if index % 2 == 0 else "/products/1/availability"
                started = time.perf_counter()
                started_at = time.time()
                socket_context.peer_port = None
                transport_events = []

                def trace(event_name, _info):
                    # Never persist transport payloads, headers, or credentials.
                    if len(transport_events) < 40:
                        transport_events.append(event_name)

                with counter_lock:
                    active += 1
                    peak = max(peak, active)
                try:
                    response = client.get(BASE + path, extensions={"trace": trace})
                    if socket_trace:
                        stream = response.extensions.get("network_stream")
                        peer_port = response.headers.get("x-test-peer-port")
                        if stream is None or not peer_port:
                            raise RuntimeError("Missing disposable socket-correlation metadata")
                        with socket_lock:
                            socket_peers[stream] = int(peer_port)
                    body = response.json()
                    valid = isinstance(body, list) and (len(body) == 80 if index % 2 == 0 else (
                        len(body) == 3 and all(row["so_luong_con"] == 10 for row in body)))
                    return {"status": response.status_code, "valid": valid,
                            "elapsed_ms": (time.perf_counter() - started) * 1000}
                except Exception as error:
                    return {"status": 0, "valid": False, "error_type": type(error).__name__,
                            "transport_events": transport_events,
                            "new_tcp_connection": "connection.connect_tcp.started" in transport_events,
                            "started_at_unix": started_at,
                            "server_peer_port": socket_context.peer_port,
                            "elapsed_ms": (time.perf_counter() - started) * 1000}
                finally:
                    with counter_lock:
                        active -= 1

            started = time.perf_counter()
            next_sample = started
            with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
                while time.perf_counter() - started < duration:
                    report["requests"].extend(pool.map(read, range(max(100, workers * 2))))
                    if time.perf_counter() >= next_sample:
                        report["container_samples"].append(json.loads(docker(
                            "stats", "--no-stream", "--format", "{{json .}}", NAME)))
                        next_sample = time.perf_counter() + 5
            report["duration_seconds"] = time.perf_counter() - started
            report["observed_peak_inflight_reads"] = peak

            def checkout(index, replay):
                response = client.post(BASE + "/orders/checkout", json={
                    "items": [{"bienthe_id": 1 if replay else 2, "so_luong": 2}], "payment_method": "pay_later",
                }, headers={"Authorization": "Bearer " + tokens[0 if replay else index],
                            "Idempotency-Key": "image-replay" if replay else f"image-race-{index}"})
                return {"status": response.status_code, "body": response.json()}

            with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                report["replays"] = list(pool.map(lambda index: checkout(index, True), range(20)))
                report["contenders"] = list(pool.map(lambda index: checkout(index, False), range(20)))
            stock = client.get(BASE + "/products/1/availability")
            assert stock.status_code == 200
            report["stock"] = [row["so_luong_con"] for row in stock.json()]
        assert report["requests"] and all(row["status"] == 200 and row["valid"] for row in report["requests"])
        assert all(row["status"] == 201 for row in report["replays"])
        assert len({row["body"]["order"]["donhang_id"] for row in report["replays"]}) == 1
        assert sum(row["status"] == 201 for row in report["contenders"]) == 5
        assert sum(row["status"] == 400 for row in report["contenders"]) == 15
        assert report["stock"] == [8, 0, 10]
        report["verification_status"] = "passed"
    except Exception as error:
        report["verification_status"] = "failed"
        report["failure_type"] = type(error).__name__
        raise
    finally:
        output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
