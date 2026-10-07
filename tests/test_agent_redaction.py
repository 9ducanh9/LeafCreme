from app.services.agent.redaction import REDACTED, redact
import pytest


@pytest.mark.parametrize("credential", [
    "sk-synthetic-credential-ABCDEFG123", "Bearer synthetic-auth-token", "bearer synthetic-auth-token",
    "eyJhbGciOiJIUzI1NiJ9.syntheticpayload.syntheticsignature",
    "postgresql://fixture:synthetic-password@db.example.test:5432/example",
    "mongodb+srv://fixture:synthetic-password@db.example.test/example",
])
def test_credentials_in_free_text_are_masked(credential):
    result = redact("Synthetic context " + credential)
    assert credential not in result
    assert result == "Synthetic context " + REDACTED


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


def test_redact_masks_json_encoded_tool_payloads():
    value = '{"ten_khach_hang":"Nguyen Van A","dia_chi_giao_hang":"123 Duong ABC","email":"mail@example.com"}'

    result = redact(value)

    assert REDACTED in result
    assert "Nguyen Van A" not in result
    assert "123 Duong ABC" not in result
    assert "mail@example.com" not in result
