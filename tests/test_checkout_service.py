from decimal import Decimal

from app.models import CheckoutRequest, DonHang, SePayTransaction, ThanhToan
from app.core.config import settings
from app.services.errors import DomainError
from test_order_flow import flow as order_flow_fixture

flow = order_flow_fixture


def payload(flow, method="sepay_qr"):
    return {"items": [{"bienthe_id": flow.variant.bienthe_id, "so_luong": 2}], "payment_method": method}


def checkout(flow, body=None, key="checkout-test-key"):
    return flow.client.post("/orders/checkout", json=body or payload(flow), headers={**flow.headers(), "Idempotency-Key": key})


def test_checkout_retry_reuses_order_and_stock(flow):
    first = checkout(flow)
    second = checkout(flow)
    assert first.status_code == second.status_code == 201
    assert first.json() == second.json()
    assert flow.stock() == 8
    assert flow.db.query(CheckoutRequest).count() == 1
    assert flow.db.query(ThanhToan).count() == 1


def test_reusing_key_with_changed_payload_is_conflict(flow):
    assert checkout(flow).status_code == 201
    assert checkout(flow, payload(flow, "pay_later")).status_code == 409
    assert flow.stock() == 8


def test_missing_or_empty_key_rejected(flow):
    assert flow.client.post("/orders/checkout", json=payload(flow), headers=flow.headers()).status_code == 422
    assert checkout(flow, key=" ").status_code == 422
    assert flow.stock() == 10


def test_checkout_payment_failure_rolls_back_order_stock_and_key(flow, monkeypatch):
    from app.services.payments import PaymentService

    def fail(*args, **kwargs):
        raise DomainError(503, "simulated QR failure")

    monkeypatch.setattr(PaymentService, "create_sepay_payment", fail)
    assert checkout(flow).status_code == 503
    assert flow.stock() == 10
    assert flow.db.query(DonHang).count() == 0
    assert flow.db.query(CheckoutRequest).count() == 0
    assert flow.db.query(ThanhToan).count() == 0


def test_missing_webhook_key_does_not_reserve_stock(flow, monkeypatch):
    monkeypatch.setattr(settings, "SEPAY_WEBHOOK_API_KEY", "")
    assert checkout(flow).status_code == 503
    assert flow.stock() == 10
    assert flow.db.query(DonHang).count() == 0


def test_cod_checkout_needs_no_sepay_config(flow, monkeypatch):
    monkeypatch.setattr(settings, "SEPAY_WEBHOOK_API_KEY", "")
    response = checkout(flow, payload(flow, "pay_later"))
    assert response.status_code == 201
    assert response.json()["payment_info"] is None
    assert response.json()["payment_status"] == "unpaid"
    assert response.json()["order"]["trang_thai"] == "dang_xu_ly"
    assert flow.stock() == 8


def test_cancelled_checkout_replay_does_not_recreate_order(flow):
    first = checkout(flow).json()
    assert flow.cancel(first["order"]).status_code == 200
    replay = checkout(flow).json()
    assert replay["order"]["donhang_id"] == first["order"]["donhang_id"]
    assert replay["order"]["trang_thai"] == "da_huy"
    assert replay["payment_info"] is None
    assert flow.stock() == 10


def test_receipt_and_refund_confirmation_are_audited_and_idempotent(flow):
    result = checkout(flow).json()
    assert flow.cancel(result["order"]).status_code == 200
    receipt_response = flow.webhook(result["payment_info"])
    assert receipt_response.json()["message"] == "Cancelled order requires refund"
    status = flow.client.get(f'/payments/{result["payment_info"]["payment_id"]}', headers=flow.headers()).json()
    assert status["reconciliation_status"] == "refund_required"
    assert status["trang_thai"] == "that_bai"
    assert flow.client.get("/payments/sepay/reconciliation", headers=flow.headers()).status_code == 403
    listing = flow.client.get("/payments/sepay/reconciliation", headers=flow.headers(flow.manager)).json()
    assert listing["total"] == 1
    assert "payload" not in listing["items"][0]
    body = {"refund_reference": "REFUND-TEST", "refund_note": "Confirmed from bank statement"}
    url = "/payments/sepay/reconciliation/SEPAY-99010/refund-confirmation"
    assert flow.client.post(url, headers=flow.headers(), json=body).status_code == 403
    first = flow.client.post(url, headers=flow.headers(flow.manager), json=body)
    assert first.status_code == 200 and first.json()["status"] == "refunded"
    assert first.json()["resolved_by"] == flow.manager.nguoidung_id
    assert flow.client.post(url, headers=flow.headers(flow.manager), json=body).json() == first.json()
    assert flow.client.post(url, headers=flow.headers(flow.manager), json={**body, "refund_reference": "OTHER"}).status_code == 409
    assert flow.stock() == 10
    receipt = flow.db.get(SePayTransaction, "SEPAY-99010")
    assert receipt.refund_note == body["refund_note"]


def test_extra_transfer_is_saved_for_refund(flow):
    payment = checkout(flow).json()["payment_info"]
    assert flow.webhook(payment).json()["message"] == "Payment confirmed"
    assert flow.webhook(payment, transaction_id=99011).json()["message"] == "Additional transfer requires refund"
    assert flow.db.query(SePayTransaction).count() == 2
    assert flow.stock() == 8


def test_manager_cannot_cancel_paid_order_through_status_endpoint(flow):
    result = checkout(flow).json()
    assert flow.webhook(result["payment_info"]).status_code == 200
    response = flow.client.patch(f'/orders/{result["order"]["donhang_id"]}/status', headers=flow.headers(flow.manager), json={"trang_thai": "da_huy"})
    assert response.status_code == 400
    assert flow.stock() == 8


def test_wrong_amount_is_persisted_and_requires_reconciliation(flow):
    result = checkout(flow).json()
    assert flow.webhook(result["payment_info"], amount=123).status_code == 200
    receipt = flow.db.get(SePayTransaction, "SEPAY-99010")
    assert receipt.status == "refund_required"
    assert receipt.so_tien == 123


def test_refund_confirmation_rejects_blank_fields(flow):
    payment = checkout(flow).json()["payment_info"]
    flow.webhook(payment, amount=1)
    response = flow.client.post("/payments/sepay/reconciliation/SEPAY-99010/refund-confirmation", headers=flow.headers(flow.manager), json={"refund_reference": "   ", "refund_note": " "})
    assert response.status_code == 422


def test_fractional_vnd_cannot_be_silently_rounded_into_qr(flow):
    flow.variant.gia_bienthe = 100000.25
    flow.db.commit()
    response = checkout(flow)
    assert response.status_code == 400
    assert flow.stock() == 10
    assert flow.db.query(DonHang).count() == 0


def test_extra_transfer_for_legacy_confirmed_sepay_payment_is_preserved(flow):
    payment_info = checkout(flow).json()["payment_info"]
    flow.webhook(payment_info)
    payment = flow.db.get(ThanhToan, payment_info["payment_id"])
    # Older webhook handling replaced the provider metadata with the bank body.
    payment.thong_tin_giao_dich = {"chi_tiet_raw": {"id": 99010, "content": payment_info["transfer_content"]}}
    flow.db.commit()
    response = flow.webhook(payment_info, transaction_id=99011)
    assert response.json()["message"] == "Additional transfer requires refund"
    assert flow.db.get(SePayTransaction, "SEPAY-99011").status == "refund_required"


def test_preorder_checkout_requires_full_sepay_payment_and_is_idempotent(flow):
    body = {
        "items": [{"bienthe_id": flow.variant.bienthe_id, "so_luong": 1}],
        "ten_khach_hang": "Preorder Test",
        "tien_dat_coc": 0,
    }
    headers = {**flow.headers(flow.manager), "Idempotency-Key": "preorder-flow-key"}
    first = flow.client.post("/orders/preorder-checkout", headers=headers, json=body)
    assert first.status_code == 201, first.text
    result = first.json()
    assert result["order"]["loai_don"] == "dat_truoc"
    assert Decimal(result["order"]["tien_dat_coc"]) == 0
    assert result["order"]["trang_thai"] == "cho"
    assert Decimal(result["payment_info"]["amount"]) == Decimal(result["order"]["tien_thanh_toan"])
    assert result["payment_status"] == "pending"
    assert flow.stock() == 9

    paid = flow.webhook(result["payment_info"])
    assert paid.status_code == 200
    assert flow.client.get(f'/orders/{result["order"]["donhang_id"]}', headers=flow.headers(flow.manager)).json()["trang_thai"] == "dang_xu_ly"
    replay = flow.client.post("/orders/preorder-checkout", headers=headers, json=body)
    assert replay.status_code == 201, replay.text
    assert replay.json()["order"]["donhang_id"] == result["order"]["donhang_id"]
    assert replay.json()["payment_status"] == "paid"
    assert replay.json()["payment_info"] is None
    assert flow.stock() == 9
    assert flow.db.query(ThanhToan).filter_by(donhang_id=result["order"]["donhang_id"]).count() == 1


def test_preorder_rejects_deposit_and_bypassing_checkout(flow):
    body = {"items": [{"bienthe_id": flow.variant.bienthe_id, "so_luong": 1}], "tien_dat_coc": 1}
    headers = {**flow.headers(flow.manager), "Idempotency-Key": "preorder-deposit-key"}
    response = flow.client.post("/orders/preorder-checkout", headers=headers, json=body)
    assert response.status_code == 400
    direct = flow.client.post("/orders?loai_don=dat_truoc", headers=flow.headers(flow.manager), json=body)
    assert direct.status_code == 400
    assert flow.stock() == 10
    assert flow.db.query(DonHang).count() == 0
