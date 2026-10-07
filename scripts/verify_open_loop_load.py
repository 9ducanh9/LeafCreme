"""Fixed offered-rate read workload against the guarded disposable image API."""
import asyncio
import json
import os
from pathlib import Path
import subprocess
import time

import httpx

ROOT = Path(__file__).resolve().parents[1]
NAME = "leafcreme-image-api-test"
BASE = "http://127.0.0.1:58082"


async def exercise(report):
    pending = set()
    rows = []
    async with httpx.AsyncClient(timeout=10, trust_env=False,
                                limits=httpx.Limits(max_connections=256, max_keepalive_connections=256)) as client:
        async def read(index, scheduled):
            actual = time.perf_counter()
            path = "/products?limit=80" if index % 2 == 0 else "/products/1/availability"
            try:
                response = await client.get(BASE + path)
                body = response.json()
                valid = (isinstance(body, list) and (len(body) == 80 if index % 2 == 0 else
                         len(body) == 3 and all(row["so_luong_con"] == 10 for row in body))) if response.status_code == 200 else (
                         response.status_code == 503 and body == {"detail": "Server busy; retry shortly."}
                         and response.headers.get("retry-after") == "1")
                rows.append({"status": response.status_code, "valid": valid,
                             "launch_lag_ms": (actual - scheduled) * 1000,
                             "elapsed_ms": (time.perf_counter() - actual) * 1000})
            except Exception as error:
                rows.append({"status": 0, "valid": False, "error_type": type(error).__name__})

        started = time.perf_counter()
        total = report["rate_per_second"] * report["offering_seconds"]
        for index in range(total):
            scheduled = started + index / report["rate_per_second"]
            await asyncio.sleep(max(0, scheduled - time.perf_counter()))
            if len(pending) >= 256:
                report["client_capacity_rejections"] += 1
                continue
            task = asyncio.create_task(read(index, scheduled))
            pending.add(task)
            task.add_done_callback(pending.discard)
            report["peak_pending_client_tasks"] = max(report["peak_pending_client_tasks"], len(pending))
        report["offering_elapsed_seconds"] = time.perf_counter() - started
        if pending:
            await asyncio.gather(*pending)
        report["elapsed_including_drain_seconds"] = time.perf_counter() - started
        report["requests"] = rows
        health = await client.get(BASE + "/health/db")
        report["readiness_after_drain"] = health.status_code
        assert health.status_code == 200
        assert len(rows) == total and report["client_capacity_rejections"] == 0
        assert all(row["valid"] and row["status"] in (200, 503) for row in rows)
        report["completed_read_count"] = sum(row["status"] == 200 for row in rows)
        report["controlled_busy_count"] = sum(row["status"] == 503 for row in rows)


def main():
    if not __debug__ or os.getenv("RUN_OPEN_LOOP_LOAD") != "1":
        raise SystemExit("Requires nonoptimized Python and RUN_OPEN_LOOP_LOAD=1")
    identity = json.loads(subprocess.run(["docker", "inspect", NAME], check=True,
                          capture_output=True, text=True, timeout=30).stdout)[0]
    required = "DATABASE_URL=postgresql+psycopg2://benchmark:local-disposable-benchmark@leafcreme-image-db-test:5432/leafcreme_image_test"
    assert identity["State"]["Running"] and required in identity["Config"]["Env"]
    assert "LANGFUSE_ENABLED=false" in identity["Config"]["Env"] and "DEEPSEEK_API_KEY=" in identity["Config"]["Env"]
    assert identity["Config"]["Cmd"][0] == "sh", "Refuses diagnostic protocol overrides"
    assert any(row["HostIp"] == "127.0.0.1" and row["HostPort"] == "58082"
               for row in identity["NetworkSettings"]["Ports"]["8000/tcp"])
    rate = int(os.getenv("OPEN_LOOP_RATE", "200"))
    seconds = int(os.getenv("OPEN_LOOP_SECONDS", "30"))
    if not 1 <= rate <= 200 or not 10 <= seconds <= 120:
        raise SystemExit("Allowed rate 1-200/sec, duration 10-120 seconds")
    report = {"verification_status": "incomplete", "environment": "synthetic disposable local image; providers disabled",
              "image_id": identity["Image"], "container_id": identity["Id"], "rate_per_second": rate,
              "offering_seconds": seconds, "client_capacity_rejections": 0, "peak_pending_client_tasks": 0,
              "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "api_memory_limit_bytes": identity["HostConfig"]["Memory"],
              "api_nano_cpu_limit": identity["HostConfig"]["NanoCpus"],
              "timeout_seconds": 10, "retries": 0, "keepalive_expiry_seconds": 5}
    output = ROOT / f"scratch/open-loop-{rate}rps-{seconds}s-results.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    try:
        asyncio.run(exercise(report))
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
