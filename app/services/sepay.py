"""Helpers for SePay VietQR checkout responses."""

from __future__ import annotations

from urllib.parse import urlencode


def build_sepay_qr_url(
    *,
    bank_account: str,
    bank_code: str,
    amount: int,
    payment_code: str,
    account_name: str,
    base_url: str,
) -> str:
    """Build a VietQR image URL with immutable payment details."""
    params = {
        "acc": bank_account,
        "bank": bank_code,
        "amount": str(amount),
        "des": payment_code,
        "template": "compact",
        "showinfo": "true",
        "fullacc": "true",
        "holder": account_name,
        "store": "Leaf Creme",
    }
    return f"{base_url.rstrip('?')}?{urlencode(params)}"
