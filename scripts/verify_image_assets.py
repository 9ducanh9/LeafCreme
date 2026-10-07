"""Read-only comparison of baked product assets and current local asset files."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[1]
IMAGE = "leafcreme-reliability:local"


def main():
    if os.getenv("RUN_ASSET_VERIFY") != "1":
        raise SystemExit("Requires RUN_ASSET_VERIFY=1; reads the local reliability image only")
    image_id = subprocess.run(["docker", "image", "inspect", IMAGE, "--format", "{{.Id}}"],
                              check=True, capture_output=True, text=True, timeout=30).stdout.strip()
    result = subprocess.run(["docker", "run", "--rm", "--network", "none", image_id, "python", "-c",
        "import hashlib,json; from pathlib import Path; root=Path('/app/uploads/product'); "
        "print(json.dumps({p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() "
        "for p in root.rglob('*') if p.is_file()}))"],
        check=True, capture_output=True, text=True, timeout=30)
    baked = json.loads(result.stdout)
    asset_root = ROOT / "uploads/product"
    local = {path.relative_to(asset_root).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
             for path in asset_root.rglob("*") if path.is_file()}
    report = {"environment": "local image/local files; no network, app or database",
              "image_id": image_id, "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
              "harness_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              "local_files": local, "baked_files": baked,
              "missing_from_image": sorted(set(local) - set(baked)),
              "missing_from_local": sorted(set(baked) - set(local)),
              "hash_mismatches": sorted(name for name in set(local) & set(baked) if local[name] != baked[name]),
              "verification_status": "passed" if local and local == baked else "failed"}
    output = ROOT / "scratch/product-assets-image-results.json"
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"status": report["verification_status"], "local_count": len(local),
                      "baked_count": len(baked), "missing_from_image": report["missing_from_image"],
                      "hash_mismatches": report["hash_mismatches"]}))
    if report["verification_status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
