from datetime import timedelta
from decimal import Decimal

import pytest

from app.core.config import settings
from app.core.security import create_access_token
from app.core.time import utc_now
from app.models import DonHang, ThanhToan, TonKhoSanPham, VaiTro, SePayTransaction
from app.services.maintenance import MaintenanceService
from test_order_service import _make_user, _make_variant_with_stock, _make_voucher


@pytest.fixture
def flow(client, db_session, monkeypatch):
    for key, value in {
        'SEPAY_BANK_ACCOUNT': '0123456789', 'SEPAY_BANK_CODE': 'MB',
        'SEPAY_ACCOUNT_NAME': 'LOCAL TEST', 'SEPAY_WEBHOOK_API_KEY': 'local-test-key',
    }.items():
        monkeypatch.setattr(settings, key, value)
    role = db_session.query(VaiTro).filter_by(ten_vai_tro='customer').one()
    customer = _make_user(db_session, role, 'flow-owner')
    other = _make_user(db_session, role, 'flow-other')
    manager_role = VaiTro(ten_vai_tro='manager')
    db_session.add(manager_role)
    db_session.flush()
    manager = _make_user(db_session, manager_role, 'flow-manager')
    variant, batch = _make_variant_with_stock(db_session, 'flow-stock', so_luong=10)
    db_session.commit()

    class Flow:
        sequence = 0

        def headers(self, user=customer):
            return {'Authorization': f'Bearer {create_access_token({"sub": user.nguoidung_id})}'}

        def create(self, quantity=2, vouchers=None):
            self.sequence += 1
            response = client.post('/orders/checkout', headers={**self.headers(), 'Idempotency-Key': f'flow-checkout-{self.sequence}'}, json={
                'items': [{'bienthe_id': variant.bienthe_id, 'so_luong': quantity}],
                'ten_khach_hang': 'Local Test', 'so_dien_thoai_khach': '0901234567',
                'dia_chi_giao_hang': 'Local test address',
                'phieu_giam_gia_codes': vouchers or [],
                'payment_method': 'pay_later',
            })
            assert response.status_code == 201, response.text
            return response.json()['order']

        def qr(self, order):
            response = client.post('/payments/sepay/create', headers=self.headers(), json={'donhang_id': order['donhang_id']})
            assert response.status_code == 201, response.text
            return response.json()

        def webhook(self, payment, transaction_id=99010, amount=None):
            return client.post('/payments/sepay/webhook', headers={'Authorization': 'Apikey local-test-key'}, json={
                'id': transaction_id, 'gateway': 'MBBank', 'transactionDate': '2026-09-30 10:00:00',
                'accountNumber': '0123456789', 'transferType': 'in',
                'transferAmount': payment['amount'] if amount is None else amount,
                'code': payment['transfer_content'], 'content': 'Thanh toan ' + payment['transfer_content'],
            })

        def stock(self):
            db_session.expire_all()
            return db_session.query(TonKhoSanPham).filter_by(lohang_sanpham_id=batch.lohang_id).one().so_luong_hien_tai

        def cancel(self, order):
            return client.post(f'/orders/{order["donhang_id"]}/cancel', params={'ly_do': 'test cancel'}, headers=self.headers())

    result = Flow()
    result.customer, result.other, result.manager = customer, other, manager
    result.variant, result.batch, result.client, result.db = variant, batch, client, db_session
    return result


def test_http_create_qr_confirm_duplicate_and_read_order(flow):
    order = flow.create()
    assert flow.stock() == 8
    payment = flow.qr(order)
    assert payment['amount'] == 200000
    first = flow.webhook(payment)
    assert first.status_code == 200 and first.json()['message'] == 'Payment confirmed'
    assert flow.webhook(payment).json()['message'] == 'Transaction already processed'
    result = flow.client.get(f'/orders/{order["donhang_id"]}', headers=flow.headers())
    assert result.status_code == 200
    assert result.json()['trang_thai'] == 'dang_xu_ly'
    delivered = flow.client.patch(f'/orders/{order["donhang_id"]}/status', headers=flow.headers(flow.manager), json={'trang_thai': 'dang_giao'})
    assert delivered.status_code == 200, delivered.text
    received = flow.client.patch(f'/orders/{order["donhang_id"]}/status', headers=flow.headers(flow.manager), json={'trang_thai': 'hoan_thanh'})
    assert received.status_code == 200, received.text
    assert received.json()['trang_thai'] == 'hoan_thanh'
    assert flow.stock() == 8


def test_customer_can_poll_own_sepay_payment_after_confirmation(flow):
    payment = flow.qr(flow.create())
    assert flow.webhook(payment).status_code == 200
    response = flow.client.get(f'/payments/{payment["payment_id"]}', headers=flow.headers())
    assert response.status_code == 200, response.text
    assert response.json()['trang_thai'] == 'thanh_cong'


def test_cancel_restores_stock_once(flow):
    order = flow.create()
    assert flow.stock() == 8
    assert flow.cancel(order).status_code == 200
    assert flow.stock() == 10
    assert flow.cancel(order).status_code == 400
    assert flow.stock() == 10


def test_expiry_restores_inventory_and_voucher(flow):
    voucher = _make_voucher(flow.db, 'FLOW-DISCOUNT', Decimal('20000'))
    flow.db.commit()
    order = flow.create(vouchers=['FLOW-DISCOUNT'])
    payment = flow.qr(order)
    row = flow.db.query(ThanhToan).filter_by(thanhtoan_id=payment['payment_id']).one()
    row.ngay_tao = utc_now() - timedelta(minutes=45)
    flow.db.commit()
    assert voucher.so_lan_da_dung == 1
    MaintenanceService().sweep_stale_pending_payments(flow.db, 30)
    assert flow.stock() == 10
    flow.db.refresh(voucher)
    assert voucher.so_lan_da_dung == 0


def test_late_webhook_cannot_silently_confirm_cancelled_order(flow):
    order = flow.create()
    payment = flow.qr(order)
    row = flow.db.query(ThanhToan).filter_by(thanhtoan_id=payment['payment_id']).one()
    row.ngay_tao = utc_now() - timedelta(minutes=45)
    flow.db.commit()
    MaintenanceService().sweep_stale_pending_payments(flow.db, 30)
    flow.webhook(payment)
    result = flow.client.get(f'/orders/{order["donhang_id"]}', headers=flow.headers()).json()
    flow.db.refresh(row)
    assert row.trang_thai == 'that_bai'
    assert result['trang_thai'] == 'da_huy'
    assert flow.stock() == 10
    receipt = flow.db.get(SePayTransaction, 'SEPAY-99010')
    assert receipt.status == 'refund_required'
    assert receipt.so_tien == Decimal('200000')
    assert flow.webhook(payment).json()['message'] == 'Transaction already processed'


def test_cancelled_order_cannot_create_new_payment(flow):
    order = flow.create()
    assert flow.cancel(order).status_code == 200
    response = flow.client.post('/payments/sepay/create', headers=flow.headers(), json={'donhang_id': order['donhang_id']})
    assert response.status_code == 400, response.text


def test_admin_cancellation_via_status_restores_inventory(flow):
    order = flow.create()
    response = flow.client.patch(f'/orders/{order["donhang_id"]}/status', headers=flow.headers(flow.manager), json={'trang_thai': 'da_huy'})
    assert response.status_code == 200, response.text
    assert flow.stock() == 10


def test_paid_order_rejects_customer_cancellation(flow):
    order = flow.create()
    assert flow.webhook(flow.qr(order)).status_code == 200
    assert flow.cancel(order).status_code == 400
    assert flow.stock() == 8


def test_order_and_qr_are_scoped_to_owner(flow):
    order = flow.create()
    assert flow.client.get(f'/orders/{order["donhang_id"]}', headers=flow.headers(flow.other)).status_code == 403
    assert flow.client.post('/payments/sepay/create', headers=flow.headers(flow.other), json={'donhang_id': order['donhang_id']}).status_code == 403
    assert flow.client.post('/payments', headers=flow.headers(), json={'donhang_id': order['donhang_id'], 'phuong_thuc': 'tien_mat', 'so_tien': 200000}).status_code == 403


def test_failed_multi_item_order_rolls_back_all_stock(flow):
    before = flow.db.query(DonHang).count()
    response = flow.client.post('/orders/checkout', headers={**flow.headers(), 'Idempotency-Key': 'flow-multi-failure'}, json={'payment_method': 'pay_later', 'items': [
        {'bienthe_id': flow.variant.bienthe_id, 'so_luong': 2},
        {'bienthe_id': flow.variant.bienthe_id, 'so_luong': 20},
    ]})
    assert response.status_code == 400, response.text
    assert flow.stock() == 10
    assert flow.db.query(DonHang).count() == before


def test_outgoing_and_wrong_amount_webhooks_do_not_complete_order(flow):
    order = flow.create()
    payment = flow.qr(order)
    assert flow.webhook(payment, amount=1).json()['message'] == 'Transfer amount mismatch'
    response = flow.client.get(f'/orders/{order["donhang_id"]}', headers=flow.headers())
    assert response.json()['trang_thai'] == 'dang_xu_ly'
    assert flow.stock() == 8


def test_repeated_qr_create_reuses_payment(flow):
    order = flow.create()
    first, second = flow.qr(order), flow.qr(order)
    assert first['payment_id'] == second['payment_id']
    assert flow.db.query(ThanhToan).filter_by(donhang_id=order['donhang_id']).count() == 1


def test_zero_quantity_rejected_before_inventory_changes(flow):
    response = flow.client.post('/orders/checkout', headers={**flow.headers(), 'Idempotency-Key': 'flow-zero'}, json={'payment_method': 'pay_later', 'items': [{'bienthe_id': flow.variant.bienthe_id, 'so_luong': 0}]})
    assert response.status_code == 422
    assert flow.stock() == 10


def test_cod_order_paid_by_manager(flow):
    order = flow.create()
    response = flow.client.post('/payments', headers=flow.headers(flow.manager), json={'donhang_id': order['donhang_id'], 'phuong_thuc': 'tien_mat', 'so_tien': 200000})
    assert response.status_code == 201, response.text
    assert response.json()['trang_thai'] == 'thanh_cong'
    result = flow.client.get(f'/orders/{order["donhang_id"]}', headers=flow.headers()).json()
    assert result['trang_thai'] == 'dang_xu_ly'
    assert flow.client.patch(f'/orders/{order["donhang_id"]}/status', headers=flow.headers(flow.manager), json={'trang_thai': 'dang_giao'}).status_code == 200
    complete = flow.client.patch(f'/orders/{order["donhang_id"]}/status', headers=flow.headers(flow.manager), json={'trang_thai': 'hoan_thanh'})
    assert complete.status_code == 200, complete.text
    assert complete.json()['trang_thai'] == 'hoan_thanh'
    assert flow.stock() == 8


def test_online_order_must_use_idempotent_checkout(flow):
    response = flow.client.post('/orders?loai_don=online', headers=flow.headers(), json={
        'items': [{'bienthe_id': flow.variant.bienthe_id, 'so_luong': 1}],
    })
    assert response.status_code == 400
    assert flow.stock() == 10
    assert flow.db.query(DonHang).count() == 0


def test_order_cannot_complete_until_paid_and_delivered(flow):
    order = flow.create()
    complete_url = f'/orders/{order["donhang_id"]}/status'
    unpaid = flow.client.patch(complete_url, headers=flow.headers(flow.manager), json={'trang_thai': 'hoan_thanh'})
    assert unpaid.status_code == 400
    paid = flow.client.post('/payments', headers=flow.headers(flow.manager), json={
        'donhang_id': order['donhang_id'], 'phuong_thuc': 'tien_mat', 'so_tien': order['tien_thanh_toan'],
    })
    assert paid.status_code == 201, paid.text
    before_dispatch = flow.client.patch(complete_url, headers=flow.headers(flow.manager), json={'trang_thai': 'hoan_thanh'})
    assert before_dispatch.status_code == 400
    assert flow.client.patch(complete_url, headers=flow.headers(flow.manager), json={'trang_thai': 'dang_giao'}).status_code == 200
    complete = flow.client.patch(complete_url, headers=flow.headers(flow.manager), json={'trang_thai': 'hoan_thanh'})
    assert complete.status_code == 200, complete.text
    assert complete.json()['ngay_nhan'] is not None


def test_sepay_order_cannot_be_dispatched_before_full_payment(flow):
    order = flow.create()
    payment = flow.qr(order)
    dispatch_url = f'/orders/{order["donhang_id"]}/status'
    blocked = flow.client.patch(dispatch_url, headers=flow.headers(flow.manager), json={'trang_thai': 'dang_giao'})
    assert blocked.status_code == 400
    assert flow.webhook(payment).status_code == 200
    dispatched = flow.client.patch(dispatch_url, headers=flow.headers(flow.manager), json={'trang_thai': 'dang_giao'})
    assert dispatched.status_code == 200, dispatched.text


def test_cash_cannot_be_recorded_while_sepay_qr_is_pending(flow):
    order = flow.create()
    flow.qr(order)
    response = flow.client.post('/payments', headers=flow.headers(flow.manager), json={
        'donhang_id': order['donhang_id'], 'phuong_thuc': 'tien_mat', 'so_tien': order['tien_thanh_toan'],
    })
    assert response.status_code == 409
    assert flow.db.query(ThanhToan).filter_by(donhang_id=order['donhang_id']).count() == 1
