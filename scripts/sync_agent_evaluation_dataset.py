"""Synchronize the sanitized Operations Agent Phase 2 dataset to Langfuse.

The dataset itself is versioned at
``data/agent-evaluations/operations-agent-phase2-v1.json``. Dataset items use
stable IDs, so re-running this script updates those items instead of creating
duplicates. It never reads application data or runs the Agent.

Usage:

    venv\\Scripts\\python.exe scripts\\sync_agent_evaluation_dataset.py --dry-run
    venv\\Scripts\\python.exe scripts\\sync_agent_evaluation_dataset.py --apply
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
DATASET_PATH = ROOT / "data" / "agent-evaluations" / "operations-agent-phase2-v1.json"
REQUIRED_ENV = ("LANGFUSE_PUBLIC_KEY", "LANGFUSE_SECRET_KEY")


def _load_dotenv_if_present() -> None:
    """Load only the Langfuse variables from local .env without printing them."""
    path = ROOT / ".env"
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line or line.lstrip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key.startswith("LANGFUSE_") and not os.getenv(key):
            os.environ[key] = value.strip().strip('"').strip("'")


def _load_dataset() -> dict:
    with DATASET_PATH.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    if not payload.get("name") or not payload.get("items"):
        raise SystemExit(f"Invalid dataset file: {DATASET_PATH}")
    return payload


def _client():
    missing = [key for key in REQUIRED_ENV if not os.getenv(key)]
    if missing:
        raise SystemExit(f"Missing Langfuse configuration: {', '.join(missing)}")
    from langfuse import Langfuse

    return Langfuse(
        public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
        secret_key=os.environ["LANGFUSE_SECRET_KEY"],
        base_url=os.getenv("LANGFUSE_BASE_URL") or None,
    )


def _ensure_dataset(client, payload: dict) -> str:
    name = payload["name"]
    try:
        client.get_dataset(name=name)
        return "existing"
    except Exception:
        client.create_dataset(
            name=name,
            description=payload.get("description"),
            metadata=payload.get("metadata"),
        )
        return "created"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="write the dataset and its items to Langfuse")
    parser.add_argument("--dry-run", action="store_true", help="validate the local dataset without network writes")
    args = parser.parse_args()
    if args.apply == args.dry_run:
        parser.error("choose exactly one of --dry-run or --apply")

    payload = _load_dataset()
    print(f"dataset: {payload['name']}")
    print(f"items: {len(payload['items'])}")
    print("contains application data: no")
    if args.dry_run:
        return

    _load_dotenv_if_present()
    client = _client()
    dataset_state = _ensure_dataset(client, payload)
    for item in payload["items"]:
        client.create_dataset_item(
            id=item["id"],
            dataset_name=payload["name"],
            input=item["input"],
            expected_output=item["expected_output"],
            metadata=item.get("metadata"),
        )
    client.flush()
    print(f"dataset state: {dataset_state}")
    print(f"items synchronized: {len(payload['items'])}")


if __name__ == "__main__":
    main()
