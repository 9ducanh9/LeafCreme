"""Atomic storefront checkout with durable per-user idempotency."""
import hashlib
import json
import logging
from types import SimpleNamespace
from decimal import Decimal

from sqlalchemy.orm import Session

from app.core.dependencies import BACK_OFFICE_ROLES, role_name
from app.models import CheckoutRequest, DonHang, NguoiDung, ThanhToan
from app.services.errors import DomainError
from app.services.orders import OrderService
from app.services.payments import PaymentService

logger = logging.getLogger(__name__)


class CheckoutService:
    def __init__(self):
        self.orders = OrderService()
        self.payments = PaymentService()

    def _response(self, db: Session, order: DonHang, current_user: NguoiDung) -> dict:
        payment_info = None
        payments = db.query(ThanhToan).filter_by(donhang_id=order.donhang_id).all()
        paid_total = sum(
            (payment.so_tien for payment in payments if payment.trang_thai == "thanh_cong"),
            start=Decimal("0"),
        )
        if (order.tien_thanh_toan or 0) <= 0 or paid_total >= order.tien_thanh_toan:
            payment_status = "paid"
        elif any(payment.trang_thai == "dang_xu_ly" for payment in payments):
            payment_status = "pending"
        else:
            payment_status = "unpaid"
        if order.trang_thai in ("cho", "cho_coc", "dang_xu_ly"):
            candidates = [payment for payment in payments if payment.trang_thai == "dang_xu_ly"]
            candidates.sort(key=lambda payment: payment.thanhtoan_id, reverse=True)
            for payment in candidates:
                if ((payment.thong_tin_giao_dich or {}).get("chi_tiet_raw") or {}).get("provider") == "sepay":
                    payment_info = self.payments._sepay_payment_info(payment)
                    break
        return {
            "order": self.orders.get_order(db, order.donhang_id, current_user),
            "payment_info": payment_info,
            "payment_status": payment_status,
        }

    def checkout(self, db: Session, payload, key: str, current_user: NguoiDung, *, order_type: str = "online") -> dict:
        if order_type not in ("online", "dat_truoc"):
            raise DomainError(400, "Loại đơn không được hỗ trợ trong checkout.")
        if order_type == "dat_truoc":
            if role_name(current_user) not in BACK_OFFICE_ROLES:
                raise DomainError(403, "Chỉ nhân viên mới được tạo đơn đặt trước.")
            if (getattr(payload, "tien_dat_coc", None) or 0) > 0:
                raise DomainError(400, "Đơn đặt trước mới phải thanh toán đủ, không nhận đặt cọc.")
            payment_method = "sepay_qr"
        else:
            payment_method = payload.payment_method
        request_body = {**payload.model_dump(mode="json"), "order_type": order_type, "payment_method": payment_method}
        fingerprint = hashlib.sha256(json.dumps(request_body, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
        try:
            # This also serializes concurrent requests before a checkout row exists.
            db.query(NguoiDung).filter_by(nguoidung_id=current_user.nguoidung_id).with_for_update().one()
            previous = db.query(CheckoutRequest).filter_by(nguoidung_id=current_user.nguoidung_id, idempotency_key=key).first()
            if previous:
                if previous.payload_hash != fingerprint:
                    raise DomainError(409, "Mã checkout đã dùng cho nội dung khác. Hãy tiếp tục đơn đang xử lý.")
                order = db.query(DonHang).filter_by(donhang_id=previous.donhang_id).populate_existing().with_for_update().one()
                response = self._response(db, order, current_user)
                db.commit()
                logger.info("Checkout replay user=%s order=%s", current_user.nguoidung_id, order.donhang_id)
                return response
            if payment_method == "sepay_qr":
                self.payments.ensure_sepay_configured()
            created = self.orders.create_order(db, payload, order_type, current_user, commit=False)
            order = db.get(DonHang, created["donhang_id"])
            if order.tien_thanh_toan > 0 and payment_method == "sepay_qr":
                self.payments.create_sepay_payment(db, SimpleNamespace(donhang_id=order.donhang_id), current_user, commit=False)
            db.add(CheckoutRequest(nguoidung_id=current_user.nguoidung_id, idempotency_key=key, payload_hash=fingerprint, donhang_id=order.donhang_id))
            db.flush()
            response = self._response(db, order, current_user)
            db.commit()
        except Exception:
            db.rollback()
            raise
        from app.scheduler import request_inventory_attention_refresh

        request_inventory_attention_refresh()
        return response
