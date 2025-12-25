from __future__ import annotations

import hmac
import hashlib
from datetime import datetime
from typing import Any, Dict, Tuple
from urllib.parse import urlencode


def _build_hash_data(params: Dict[str, Any]) -> str:
    items = sorted((k, v) for k, v in params.items() if v is not None and v != "")
    return "&".join(f"{k}={v}" for k, v in items)


def sign_params(params: Dict[str, Any], secret_key: str) -> str:
    hash_data = _build_hash_data(params)
    return hmac.new(secret_key.encode("utf-8"), hash_data.encode("utf-8"), hashlib.sha512).hexdigest()


def build_payment_url(base_url: str, params: Dict[str, Any], secret_key: str) -> str:
    params = dict(params)
    secure_hash = sign_params(params, secret_key)
    params["vnp_SecureHash"] = secure_hash
    return f"{base_url}?{urlencode(params)}"


def verify_params(all_params: Dict[str, Any], secret_key: str) -> Tuple[bool, str]:
    received_hash = str(all_params.get("vnp_SecureHash") or "")
    data = dict(all_params)
    data.pop("vnp_SecureHash", None)
    data.pop("vnp_SecureHashType", None)
    expected_hash = sign_params(data, secret_key)
    return received_hash.lower() == expected_hash.lower(), expected_hash


def parse_vnpay_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y%m%d%H%M%S")
    except Exception:
        return None
