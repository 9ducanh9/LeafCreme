"""Use independent committed sessions to exercise PostgreSQL locks, not SAVEPOINT mocks."""
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models import CanhBaoTonKho, CheckoutRequest, DonHang, LichSuKhoSanPham, NguoiDung, SanPham, SePayTransaction, ThanhToan, TonKhoSanPham, VaiTro
from app.routers.orders import CheckoutCreate
from app.services.errors import DomainError
from app.services.orders import OrderService
from app.services.orders.checkout_service import CheckoutService
from app.services.payments import PaymentService
from app.services.maintenance import MaintenanceService
from app.core.time import utc_now
from datetime import timedelta
from conftest import TEST_DATABASE_URL
from test_order_service import _make_user, _make_variant_with_stock


@pytest.fixture
def concurrent_flow(monkeypatch):
    # These independent committed sessions must not leave unrelated Agent insights
    # in the shared test schema; the alert/Agent suites cover that optional hook.
    monkeypatch.setattr("app.services.alerts.runtime.safe_refresh_inventory_attention", lambda *args, **kwargs: {})
    monkeypatch.setattr("app.services.maintenance.maintenance_service.safe_refresh_inventory_attention", lambda *args, **kwargs: {})
    monkeypatch.setattr(settings, "SEPAY_BANK_ACCOUNT", "0123456789")
    monkeypatch.setattr(settings, "SEPAY_BANK_CODE", "MB")
    monkeypatch.setattr(settings, "SEPAY_WEBHOOK_API_KEY", "local-test-key")
    engine = create_engine(TEST_DATABASE_URL)
    sessions = sessionmaker(bind=engine)
    suffix = uuid4().hex[:12]
    with sessions() as db:
        role = db.query(VaiTro).filter_by(ten_vai_tro="customer").one()
        user = _make_user(db, role, suffix)
        variant, batch = _make_variant_with_stock(db, suffix, so_luong=10)
        db.commit()
        user_id, batch_id, product_id = user.nguoidung_id, batch.lohang_id, variant.sanpham_id
        payload = CheckoutCreate(items=[{"bienthe_id": variant.bienthe_id, "so_luong": 2}], payment_method="sepay_qr")
    yield sessions, user_id, batch_id, payload, suffix
    with sessions() as db:
        order_ids = [row[0] for row in db.query(DonHang.donhang_id).filter_by(nguoidung_id=user_id)]
        db.query(SePayTransaction).filter(SePayTransaction.donhang_id.in_(order_ids)).delete(synchronize_session=False)
        db.query(CheckoutRequest).filter_by(nguoidung_id=user_id).delete(synchronize_session=False)
        db.query(LichSuKhoSanPham).filter_by(lohang_sanpham_id=batch_id).delete(synchronize_session=False)
        db.query(DonHang).filter_by(nguoidung_id=user_id).delete(synchronize_session=False)
        db.query(CanhBaoTonKho).filter_by(lohang_sanpham_id=batch_id).delete(synchronize_session=False)
        db.query(SanPham).filter_by(sanpham_id=product_id).delete(synchronize_session=False)
        db.query(NguoiDung).filter_by(nguoidung_id=user_id).delete(synchronize_session=False)
        db.commit()
    engine.dispose()


def run_parallel(functions):
    barrier = Barrier(len(functions))
    def run(function):
        barrier.wait(timeout=10)
        return function()
    with ThreadPoolExecutor(max_workers=len(functions)) as pool:
        futures = [pool.submit(run, function) for function in functions]
        return [future.result(timeout=30) for future in futures]


@pytest.mark.parametrize("concurrency", [2, 10, 20])
def test_concurrent_checkout_reuses_one_order(concurrent_flow, concurrency):
    sessions, user_id, batch_id, payload, key = concurrent_flow
    def create():
        with sessions() as db:
            return CheckoutService().checkout(db, payload, key, db.get(NguoiDung, user_id))
    results = run_parallel([create] * concurrency)
    assert len({result["order"]["donhang_id"] for result in results}) == 1
    with sessions() as db:
        assert db.query(DonHang).filter_by(nguoidung_id=user_id).count() == 1
        assert db.query(TonKhoSanPham).filter_by(lohang_sanpham_id=batch_id).one().so_luong_hien_tai == 8


def test_distinct_checkouts_cannot_oversell(concurrent_flow):
    sessions, user_id, batch_id, payload, key = concurrent_flow

    def create(index):
        with sessions() as db:
            try:
                CheckoutService().checkout(db, payload, f"{key}-{index}", db.get(NguoiDung, user_id))
                return "created"
            except DomainError as error:
                db.rollback()
                assert error.status_code == 400
                return "rejected"

    results = run_parallel([lambda index=index: create(index) for index in range(20)])
    assert results.count("created") == 5
    assert results.count("rejected") == 15
    with sessions() as db:
        assert db.query(DonHang).filter_by(nguoidung_id=user_id).count() == 5
        assert db.query(TonKhoSanPham).filter_by(lohang_sanpham_id=batch_id).one().so_luong_hien_tai == 0


def test_concurrent_cancel_returns_inventory_once(concurrent_flow):
    sessions, user_id, batch_id, payload, key = concurrent_flow
    with sessions() as db:
        result = CheckoutService().checkout(db, payload, key, db.get(NguoiDung, user_id))
    def cancel():
        with sessions() as db:
            try:
                OrderService().cancel_order(db, result["order"]["donhang_id"], "concurrent cancel", db.get(NguoiDung, user_id))
                return 200
            except DomainError as error:
                db.rollback()
                return error.status_code
    assert sorted(run_parallel([cancel, cancel])) == [200, 400]
    with sessions() as db:
        assert db.query(TonKhoSanPham).filter_by(lohang_sanpham_id=batch_id).one().so_luong_hien_tai == 10


def test_duplicate_webhooks_and_expiry_are_serialized(concurrent_flow):
    sessions, user_id, batch_id, payload, key = concurrent_flow
    with sessions() as db:
        result = CheckoutService().checkout(db, payload, key, db.get(NguoiDung, user_id))
        payment = db.get(ThanhToan, result["payment_info"]["payment_id"])
        payment.ngay_tao = utc_now() - timedelta(minutes=45)
        db.commit()
    body = {"id": int(key[:8], 16), "accountNumber": "0123456789", "transferType": "in", "transferAmount": 200000, "code": result["payment_info"]["transfer_content"]}
    def webhook():
        with sessions() as db:
            return PaymentService().handle_sepay_webhook(db, body)
    def sweep():
        with sessions() as db:
            return MaintenanceService().sweep_stale_pending_payments(db, 30)
    run_parallel([webhook, webhook, sweep])
    with sessions() as db:
        order = db.get(DonHang, result["order"]["donhang_id"])
        payment = db.get(ThanhToan, result["payment_info"]["payment_id"])
        receipt = db.get(SePayTransaction, f'SEPAY-{body["id"]}')
        stock = db.query(TonKhoSanPham).filter_by(lohang_sanpham_id=batch_id).one().so_luong_hien_tai
        if order.trang_thai == "da_huy":
            assert stock == 10 and payment.trang_thai == "that_bai" and receipt.status == "refund_required"
        else:
            assert order.trang_thai == "hoan_thanh"
            assert stock == 8 and payment.trang_thai == "thanh_cong" and receipt.status == "confirmed"
