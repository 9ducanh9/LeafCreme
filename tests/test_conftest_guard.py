import pytest
from _pytest.outcomes import Exit

from conftest import _assert_disposable


def test_rejects_non_test_database(monkeypatch):
    monkeypatch.delenv("APP_ENV", raising=False)
    with pytest.raises(Exit) as exc_info:
        _assert_disposable("postgresql://postgres:postgres@localhost/leafcreme")
    assert exc_info.value.returncode == 4


def test_rejects_protected_environment(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    with pytest.raises(Exit) as exc_info:
        _assert_disposable("postgresql://postgres:postgres@localhost/bakery_test")
    assert exc_info.value.returncode == 4


def test_accepts_disposable_database(monkeypatch):
    monkeypatch.setenv("APP_ENV", "test")
    _assert_disposable("postgresql://postgres:postgres@localhost/bakery_test")
