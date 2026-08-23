"""Run the Phase 2 Operations Agent regression suite safely.

The baseline harness can create proposal rows for scenarios D and E. This
wrapper refuses to run unless ``AGENT_EVAL_DATABASE_URL`` points to a distinct
database whose name includes ``eval`` or ``test``. It then runs the existing
fixture inspector/seeder and baseline harness in a child process with that
database URL only.

Usage (PowerShell):

    $env:AGENT_EVAL_DATABASE_URL = "postgresql://.../leafcreme_eval"
    venv\\Scripts\\python.exe scripts\\run_agent_evaluation.py

No production or ordinary local ``DATABASE_URL`` is used by this script.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent.parent
DATASET = ROOT / "data" / "agent-evaluations" / "operations-agent-phase2-v1.json"
FIXTURE = ROOT / "scratch" / "agent_verify_fixture.py"
BASELINE = ROOT / "scratch" / "agent_phase2_baseline.py"


def _database_name(url: str) -> str:
    return urlparse(url).path.rstrip("/").rsplit("/", 1)[-1].lower()


def _require_isolated_database() -> str:
    target = os.environ.get("AGENT_EVAL_DATABASE_URL", "").strip()
    current = os.environ.get("DATABASE_URL", "").strip()
    if not target:
        raise SystemExit("Set AGENT_EVAL_DATABASE_URL to a dedicated evaluation database URL.")
    if target == current:
        raise SystemExit("AGENT_EVAL_DATABASE_URL must differ from DATABASE_URL.")
    name = _database_name(target)
    if not name or ("eval" not in name and "test" not in name):
        raise SystemExit("Evaluation database name must include 'eval' or 'test'.")
    return target


def _load_dataset() -> dict:
    with DATASET.open(encoding="utf-8") as handle:
        dataset = json.load(handle)
    if dataset.get("name") != "leafcreme-operations-agent-phase2-v1":
        raise SystemExit(f"Unexpected dataset name in {DATASET}")
    if len(dataset.get("items", [])) != 7:
        raise SystemExit("Phase 2 dataset must contain scenarios A through G.")
    return dataset


def _run(command: list[str], env: dict[str, str]) -> str:
    completed = subprocess.run(command, cwd=ROOT, env=env, text=True, capture_output=True)
    if completed.stdout:
        print(completed.stdout, end="")
    if completed.returncode:
        if completed.stderr:
            print(completed.stderr, file=sys.stderr, end="")
        raise SystemExit(completed.returncode)
    return completed.stdout


def main() -> None:
    dataset = _load_dataset()
    database_url = _require_isolated_database()
    env = os.environ.copy()
    env["DATABASE_URL"] = database_url
    env["APP_ENV"] = "test"

    print(f"dataset       : {dataset['name']} ({len(dataset['items'])} scenarios)")
    print(f"database name : {_database_name(database_url)}")
    print("database mode : isolated evaluation only")

    inspection = _run([sys.executable, str(FIXTURE), "--inspect"], env)
    if "SUFFICIENT - no seeding needed" not in inspection:
        _run([sys.executable, str(FIXTURE), "--seed"], env)
    _run([sys.executable, str(BASELINE)], env)
    print("Evaluation completed. Results are written to scratch/phase2_baseline.{json,md}.")


if __name__ == "__main__":
    main()
