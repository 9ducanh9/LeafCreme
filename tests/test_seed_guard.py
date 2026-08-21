from __future__ import annotations

import pytest

from scripts.seed_guard import require_seed_environment


def test_seed_guard_allows_only_explicit_safe_environments(monkeypatch):
    for app_env in ("dev", "test"):
        monkeypatch.setenv("APP_ENV", app_env)
        require_seed_environment("seed_demo_data.py")


@pytest.mark.parametrize("app_env", ["", "development", "staging", "production", "prod"])
def test_seed_guard_rejects_unlisted_environments(monkeypatch, app_env):
    monkeypatch.setenv("APP_ENV", app_env)
    with pytest.raises(SystemExit, match="APP_ENV"):
        require_seed_environment("seed_demo_data.py")
