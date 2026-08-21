"""Shared safety guard for scripts that write demo/test data."""

from __future__ import annotations

import os
import sys


ALLOWED_SEED_ENVS = frozenset({"dev", "test"})


def require_seed_environment(script_name: str | None = None) -> None:
    """Stop seed scripts unless the caller explicitly selected a safe env."""
    app_env = os.getenv("APP_ENV", "").strip().lower()
    if app_env not in ALLOWED_SEED_ENVS:
        label = script_name or "seed script"
        raise SystemExit(
            f"Refusing to run {label}: APP_ENV={app_env or '<unset>'!r}. "
            "Set APP_ENV=dev or APP_ENV=test explicitly."
        )


if __name__ == "__main__":
    sys.exit("Import require_seed_environment from this module.")
