from app.services.agent.redaction import REDACTED, redact


def test_redact_masks_nested_pii_and_secrets():
    payload = {
        "customer": {
            "ten_khach_hang": "Nguyen Van A",
            "so_dien_thoai_khach": "0912345678",
            "contact": "mail@example.com / 0987654321",
            "nested": [{"dia_chi_giao_hang": "123 Duong ABC"}],
        },
        "access_token": "do-not-trace",
        "count": 2,
    }

    result = redact(payload)

    assert result["customer"]["ten_khach_hang"] == REDACTED
    assert result["customer"]["so_dien_thoai_khach"] == REDACTED
    assert result["customer"]["contact"] == f"{REDACTED} / {REDACTED}"
    assert result["customer"]["nested"][0]["dia_chi_giao_hang"] == REDACTED
    assert result["access_token"] == REDACTED
    assert result["count"] == 2
