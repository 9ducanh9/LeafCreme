"""Disposable replacement drill for the actual product-upload directory."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]


def docker(*args):
    return subprocess.run(["docker", *args], check=True, capture_output=True, text=True, timeout=30).stdout.strip()


def main():
    if os.getenv("RUN_UPLOAD_PERSISTENCE") != "1":
        raise SystemExit("Requires explicit disposable upload-persistence drill")
    image = docker("image", "inspect", "leafcreme-reliability:local", "--format", "{{.Id}}")
    run_id = uuid.uuid4().hex
    volume = "leafcreme-persistence-" + run_id
    target = "/app/uploads/product/.reliability-fixture-" + run_id + ".txt"
    payload = "Synthetic disposable persistence fixture " + run_id
    digest = hashlib.sha256(payload.encode()).hexdigest()
    write = ("from pathlib import Path; p=Path(" + repr(target) + "); "
             "assert not p.exists(); p.write_bytes(" + repr(payload.encode()) + "); print('written')")
    exists = ("from pathlib import Path; import hashlib; p=Path(" + repr(target) + "); "
              "print(hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else 'absent')")
    report = {"image_id": image, "environment": "local disposable containers/volume; no network, app or DB",
              "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "verification_status": "incomplete", "fixture_sha256": digest}
    owned = False
    try:
        assert docker("run", "--rm", "--network", "none", image, "python", "-c", write) == "written"
        report["without_volume_after_replacement"] = docker("run", "--rm", "--network", "none",
                                                            image, "python", "-c", exists)
        assert report["without_volume_after_replacement"] == "absent"
        assert docker("volume", "create", volume) == volume
        owned = True
        mount = "type=volume,source=" + volume + ",target=/app/uploads/product"
        assert docker("run", "--rm", "--network", "none", "--mount", mount,
                      image, "python", "-c", write) == "written"
        report["with_volume_after_replacement_sha256"] = docker(
            "run", "--rm", "--network", "none", "--mount", mount, image, "python", "-c", exists)
        assert report["with_volume_after_replacement_sha256"] == digest
    except Exception as error:
        report["verification_status"] = "failed"
        report["failure_type"] = type(error).__name__
        raise
    finally:
        if owned:
            docker("volume", "rm", volume)
        output = ROOT / "scratch/upload-persistence-results.json"
        output.parent.mkdir(exist_ok=True)
        output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    report["verification_status"] = "passed"
    report["owned_test_resources_removed"] = True
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report))


if __name__ == "__main__":
    main()
