"""PII and secret redaction for third-party observability payloads."""

from __future__ import annotations

import re
from collections.abc import Mapping
from typing import Any

REDACTED = "[đã ẩn]"

_SENSITIVE_KEYS = {
    "so_dien_thoai",
    "so_dien_thoai_khach",
    "phone",
    "dien_thoai",
    "dia_chi",
    "dia_chi_giao_hang",
    "email",
    "ten_khach_hang",
    "ho_ten",
    "avatar_url",
}
_SECRET_KEY_PARTS = ("secret", "token", "password", "api_key", "apikey")
_PHONE = re.compile(r"(?<!\d)(?:0|\+84)\d{8,10}(?!\d)")
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def _is_sensitive_key(key: object) -> bool:
    normalized = str(key).strip().lower()
    return normalized in _SENSITIVE_KEYS or any(part in normalized for part in _SECRET_KEY_PARTS)


def _redact_text(value: str) -> str:
    return _EMAIL.sub(REDACTED, _PHONE.sub(REDACTED, value))


def redact(value: Any, *, _key: object | None = None) -> Any:
    """Recursively redact PII, secrets, and common credential patterns.

    The function preserves the shape of tool results so traces remain useful
    for debugging while values that should never leave the app are removed.
    """

    if _key is not None and _is_sensitive_key(_key):
        return REDACTED
    if isinstance(value, str):
        return _redact_text(value)
    if isinstance(value, Mapping):
        return {key: redact(item, _key=key) for key, item in value.items()}
    if isinstance(value, list):
        return [redact(item) for item in value]
    if isinstance(value, tuple):
        return tuple(redact(item) for item in value)
    return value
