"""
Payment domain service.

Extracted from app/routers/payments.py (Phase 1 service-layer migration —
see LeafCreme_Restructure_Plan.md section 2.2). This is a behavior-preserving
move: business logic, transaction boundaries and DB access that used to live
inline in the router now live here so the router stays thin (validate input,
call service, translate DomainError -> HTTPException) and the logic is
testable without spinning up FastAPI.

Five things were duplicated 5-6x across the original router and are now
single helpers: role/ownership access check, "total paid so far" query,
payment->API response serialization, and "mark order hoan_thanh once fully
paid" logic.
"""

import uuid
from decimal import Decimal
from typing import Any, Optional

import requests
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.time import utc_now
from app.models import DonHang, NguoiDung, ThanhToan
from app.schemas import validate_thong_tin_giao_dich
from app.services.momo import create_payment_request, parse_momo_datetime, verify_signature
from app.services.momo_qr import create_momo_payment_info
from app.services.errors import DomainError
from app.services.orders import OrderService

_COMPLETABLE_STATUSES = ("cho", "cho_coc", "dang_xu_ly")


class PaymentService:
    def __init__(self):
        self.order_service = OrderService()

    # ------------------------------------------------------------------
    # Shared helpers (previously duplicated inline across the router)
    # ------------------------------------------------------------------
    @staticmethod
    def _role(current_user: NguoiDung) -> Optional[str]:
        return current_user.vaitro.ten_vai_tro if current_user.vaitro else None

    def _ensure_order_access(self, order: DonHang, current_user: NguoiDung, message: str) -> None:
        if self._role(current_user) not in ("admin", "manager") and order.nguoidung_id != current_user.nguoidung_id:
            raise DomainError(status_code=403, detail=message)

    @staticmethod
    def _get_order_or_404(db: Session, order_id: int) -> DonHang:
        order = db.query(DonHang).filter(DonHang.donhang_id == order_id).first()
        if not order:
            raise DomainError(status_code=404, detail="Đơn hàng không tồn tại")
        return order

    @staticmethod
    def _get_payment_or_404(db: Session, payment_id: int) -> ThanhToan:
        payment = db.query(ThanhToan).filter(ThanhToan.thanhtoan_id == payment_id).first()
        if not payment:
            raise DomainError(status_code=404, detail="Thanh toán không tồn tại")
        return payment

    @staticmethod
    def _total_paid(db: Session, donhang_id: int) -> Decimal:
        return db.query(ThanhToan).filter(
            ThanhToan.donhang_id == donhang_id,
            ThanhToan.trang_thai == "thanh_cong",
        ).with_entities(func.sum(ThanhToan.so_tien)).scalar() or Decimal("0")

    @staticmethod
    def _to_response(payment: ThanhToan, order: DonHang) -> dict:
        return {
            **{c.name: getattr(payment, c.name) for c in payment.__table__.columns},
            "ma_don_hang": order.ma_don_hang,
            "tong_tien_don_hang": order.tong_tien,
        }

    def _maybe_complete_order(self, order: DonHang, total_paid: Decimal) -> None:
        """Mark the order hoan_thanh once total successful payments cover it.
        Only advances orders that are still in a pre-completion state — never
        overrides a status set by something else."""
        if total_paid >= (order.tien_thanh_toan or Decimal("0")) and order.trang_thai in _COMPLETABLE_STATUSES:
            order.trang_thai = "hoan_thanh"

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------
    def list_payments(
        self,
        db: Session,
        current_user: NguoiDung,
        skip: int = 0,
        limit: int = 50,
        donhang_id: Optional[int] = None,
        trang_thai: Optional[str] = None,
    ) -> list[dict]:
        query = db.query(ThanhToan)

        if donhang_id:
            query = query.filter(ThanhToan.donhang_id == donhang_id)
        if trang_thai:
            query = query.filter(ThanhToan.trang_thai == trang_thai)

        if self._role(current_user) not in ("admin", "manager"):
            query = query.join(DonHang).filter(DonHang.nguoidung_id == current_user.nguoidung_id)

        payments = query.order_by(desc(ThanhToan.ngay_tao)).offset(skip).limit(limit).all()

        result = []
        for payment in payments:
            order = db.query(DonHang).filter(DonHang.donhang_id == payment.donhang_id).first()
            result.append(
                {
                    **{c.name: getattr(payment, c.name) for c in payment.__table__.columns},
                    "ma_don_hang": order.ma_don_hang if order else None,
                    "tong_tien_don_hang": order.tong_tien if order else None,
                }
            )
        return result

    def get_payment(self, db: Session, payment_id: int, current_user: NguoiDung) -> dict:
        payment = self._get_payment_or_404(db, payment_id)
        order = self._get_order_or_404(db, payment.donhang_id)
        self._ensure_order_access(order, current_user, "Bạn không có quyền xem thanh toán này")
        return self._to_response(payment, order)

    def get_order_payments(self, db: Session, order_id: int, current_user: NguoiDung) -> list[dict]:
        order = self._get_order_or_404(db, order_id)
        self._ensure_order_access(order, current_user, "Bạn không có quyền xem đơn hàng này")

        payments = db.query(ThanhToan).filter(ThanhToan.donhang_id == order_id).order_by(desc(ThanhToan.ngay_tao)).all()

        return [self._to_response(payment, order) for payment in payments]

    # ------------------------------------------------------------------
    # Generic (manual / non-gateway) payments
    # ------------------------------------------------------------------
    def create_payment(self, db: Session, payload: Any, current_user: NguoiDung) -> dict:
        method_aliases = {"the": "the_tin_dung"}
        phuong_thuc = method_aliases.get(payload.phuong_thuc, payload.phuong_thuc)
        valid_methods = ["tien_mat", "chuyen_khoan", "the_tin_dung", "vi_dien_tu"]
        if phuong_thuc not in valid_methods:
            raise DomainError(
                status_code=400,
                detail=f"Phương thức không hợp lệ. Chọn: {', '.join(valid_methods)}",
            )

        order = self._get_order_or_404(db, payload.donhang_id)
        self._ensure_order_access(order, current_user, "Bạn chỉ có thể thanh toán đơn hàng của mình")

        total_paid = self._total_paid(db, payload.donhang_id)
        remaining = order.tien_thanh_toan - total_paid

        if payload.so_tien > remaining:
            raise DomainError(
                status_code=400,
                detail=f"Số tiền vượt quá số tiền còn lại. Còn lại: {remaining:,.0f} VNĐ",
            )

        thong_tin_gd_dict = None
        if payload.thong_tin_giao_dich:
            try:
                thong_tin_gd_dict = validate_thong_tin_giao_dich(payload.thong_tin_giao_dich.model_dump())
            except Exception as e:
                raise DomainError(status_code=400, detail=f"Thông tin giao dịch không hợp lệ: {str(e)}")

        payment = ThanhToan(
            donhang_id=payload.donhang_id,
            phuong_thuc=phuong_thuc,
            so_tien=payload.so_tien,
            trang_thai="thanh_cong" if phuong_thuc == "tien_mat" else "dang_xu_ly",
            ma_giao_dich=payload.ma_giao_dich,
            thong_tin_giao_dich=thong_tin_gd_dict,
            ngay_thanh_toan=utc_now() if phuong_thuc == "tien_mat" else None,
        )
        db.add(payment)

        if payment.trang_thai == "thanh_cong":
            self._maybe_complete_order(order, total_paid + payload.so_tien)

        db.commit()
        db.refresh(payment)
        return self._to_response(payment, order)

    def update_payment_status(self, db: Session, payment_id: int, payload: Any, current_user: NguoiDung) -> dict:
        payment = self._get_payment_or_404(db, payment_id)
        order = self._get_order_or_404(db, payment.donhang_id)

        if payload.trang_thai:
            status_aliases = {"huy": "da_hoan_tien"}
            next_status = status_aliases.get(payload.trang_thai, payload.trang_thai)
            valid_statuses = ["dang_xu_ly", "thanh_cong", "that_bai", "da_hoan_tien"]
            if next_status not in valid_statuses:
                raise DomainError(
                    status_code=400,
                    detail=f"Trạng thái không hợp lệ. Chọn: {', '.join(valid_statuses)}",
                )

            old_status = payment.trang_thai
            payment.trang_thai = next_status

            if next_status == "thanh_cong" and old_status != "thanh_cong":
                payment.ngay_thanh_toan = payload.ngay_thanh_toan or utc_now()
                total_paid = self._total_paid(db, order.donhang_id)
                self._maybe_complete_order(order, total_paid)

            elif next_status in ("that_bai", "da_hoan_tien") and old_status == "thanh_cong":
                total_paid = self._total_paid(db, order.donhang_id)
                if total_paid < order.tien_thanh_toan and order.trang_thai == "hoan_thanh":
                    order.trang_thai = "cho"

            elif next_status in ("that_bai", "da_hoan_tien") and old_status != "thanh_cong":
                self.order_service.fail_unpaid_order(
                    db,
                    order.donhang_id,
                    f"Payment status changed to {next_status}",
                )

        if payload.ma_giao_dich is not None:
            existing = (
                db.query(ThanhToan)
                .filter(
                    ThanhToan.ma_giao_dich == payload.ma_giao_dich,
                    ThanhToan.thanhtoan_id != payment_id,
                )
                .first()
            )
            if existing:
                raise DomainError(status_code=400, detail=f"Mã giao dịch '{payload.ma_giao_dich}' đã tồn tại")
            payment.ma_giao_dich = payload.ma_giao_dich

        if payload.thong_tin_giao_dich is not None:
            try:
                payment.thong_tin_giao_dich = validate_thong_tin_giao_dich(payload.thong_tin_giao_dich.model_dump())
            except Exception as e:
                raise DomainError(status_code=400, detail=f"Thông tin giao dịch không hợp lệ: {str(e)}")

        if payload.ngay_thanh_toan is not None:
            payment.ngay_thanh_toan = payload.ngay_thanh_toan

        db.commit()
        db.refresh(payment)
        return self._to_response(payment, order)

    def verify_payment(self, db: Session, payment_id: int, payload: Any, current_user: NguoiDung) -> dict:
        payment = self._get_payment_or_404(db, payment_id)
        order = self._get_order_or_404(db, payment.donhang_id)

        trang_thai_lower = payload.trang_thai.lower()
        if payload.trang_thai == "00" or "success" in trang_thai_lower:
            payment.trang_thai = "thanh_cong"
            payment.ngay_thanh_toan = utc_now()
        elif "fail" in trang_thai_lower or "error" in trang_thai_lower:
            payment.trang_thai = "that_bai"
        else:
            payment.trang_thai = "dang_xu_ly"

        if payload.ma_giao_dich:
            payment.ma_giao_dich = payload.ma_giao_dich

        if payload.thong_tin_giao_dich:
            try:
                payment.thong_tin_giao_dich = validate_thong_tin_giao_dich(payload.thong_tin_giao_dich)
            except Exception:
                payment.thong_tin_giao_dich = payload.thong_tin_giao_dich

        if payment.trang_thai == "thanh_cong":
            total_paid = self._total_paid(db, order.donhang_id)
            self._maybe_complete_order(order, total_paid)
        elif payment.trang_thai == "that_bai":
            self.order_service.fail_unpaid_order(db, order.donhang_id, "Payment verification failed")

        db.commit()
        db.refresh(payment)
        return self._to_response(payment, order)

    # ------------------------------------------------------------------
    # MoMo (Business API) payments
    # ------------------------------------------------------------------
    def create_momo_payment(self, db: Session, payload: Any, current_user: NguoiDung) -> dict:
        if not settings.MOMO_PARTNER_CODE or not settings.MOMO_ACCESS_KEY or not settings.MOMO_SECRET_KEY:
            raise DomainError(
                status_code=500,
                detail="Thiếu cấu hình MoMo (MOMO_PARTNER_CODE/MOMO_ACCESS_KEY/MOMO_SECRET_KEY)",
            )

        order = self._get_order_or_404(db, payload.donhang_id)
        self._ensure_order_access(order, current_user, "Bạn chỉ có thể thanh toán đơn hàng của mình")

        total_paid = self._total_paid(db, order.donhang_id)
        remaining = (order.tien_thanh_toan or Decimal("0")) - total_paid
        if remaining <= 0:
            raise DomainError(status_code=400, detail="Đơn hàng đã được thanh toán đủ")

        payment = ThanhToan(
            donhang_id=order.donhang_id,
            phuong_thuc="vi_dien_tu",
            so_tien=remaining,
            trang_thai="dang_xu_ly",
            thong_tin_giao_dich=validate_thong_tin_giao_dich(
                {
                    "ma_giao_dich_ben_thu_3": None,
                    "thoi_gian_giao_dich": None,
                    "chi_tiet_raw": {"provider": "momo"},
                }
            ),
        )
        db.add(payment)
        db.flush()

        request_id = f"MOMO_{payment.thanhtoan_id}_{uuid.uuid4().hex[:8]}"
        order_id = str(payment.thanhtoan_id)
        amount = int(payment.so_tien or Decimal("0"))

        return_url = f"{settings.BACKEND_BASE_URL.rstrip('/')}/payments/momo/return"
        ipn_url = f"{settings.BACKEND_BASE_URL.rstrip('/')}/payments/momo/ipn"

        momo_request = create_payment_request(
            partner_code=settings.MOMO_PARTNER_CODE,
            access_key=settings.MOMO_ACCESS_KEY,
            secret_key=settings.MOMO_SECRET_KEY,
            order_id=order_id,
            amount=amount,
            order_info=f"Thanh toán đơn {order.ma_don_hang}",
            redirect_url=return_url,
            ipn_url=ipn_url,
            request_id=request_id,
            extra_data="",
            request_type=settings.MOMO_REQUEST_TYPE,
            lang=settings.MOMO_LANG,
        )

        try:
            response = requests.post(settings.MOMO_PAYMENT_URL, json=momo_request, timeout=30)
            response.raise_for_status()
            momo_response = response.json()

            if momo_response.get("resultCode") != 0:
                raise DomainError(
                    status_code=400, detail=f"MoMo error: {momo_response.get('message', 'Unknown error')}"
                )

            payment_url = momo_response.get("payUrl")
            if not payment_url:
                raise DomainError(status_code=500, detail="MoMo không trả về payment URL")

            db.commit()
            db.refresh(payment)
            return {"payment_id": payment.thanhtoan_id, "payment_url": payment_url}

        except requests.exceptions.RequestException as e:
            db.rollback()
            raise DomainError(status_code=500, detail=f"Lỗi kết nối MoMo: {str(e)}")

    def handle_momo_ipn(self, db: Session, body: dict) -> dict:
        """MoMo IPN (Instant Payment Notification) callback body -> content
        dict to return with HTTP 200 (MoMo expects 200 regardless of
        resultCode; only transport-level failures like bad JSON or missing
        server config are non-200, and those are handled in the router
        before this is called)."""
        ok, _ = verify_signature(body, settings.MOMO_SECRET_KEY)
        if not ok:
            return {"resultCode": 97, "message": "Invalid signature"}

        order_id = body.get("orderId")
        if not order_id:
            return {"resultCode": 1, "message": "Order not found"}

        try:
            payment_id = int(str(order_id))
        except Exception:
            return {"resultCode": 1, "message": "Invalid order ID"}

        payment = db.query(ThanhToan).filter(ThanhToan.thanhtoan_id == payment_id).first()
        if not payment:
            return {"resultCode": 1, "message": "Payment not found"}

        order = db.query(DonHang).filter(DonHang.donhang_id == payment.donhang_id).first()
        if not order:
            return {"resultCode": 1, "message": "Order not found"}

        received_amount = body.get("amount")
        if received_amount is None:
            return {"resultCode": 4, "message": "Invalid amount"}

        try:
            expected_amount = int(payment.so_tien or Decimal("0"))
            received_amount = int(received_amount)
        except Exception:
            return {"resultCode": 4, "message": "Invalid amount"}

        if received_amount != expected_amount:
            return {"resultCode": 4, "message": "Amount mismatch"}

        if payment.trang_thai == "thanh_cong":
            return {"resultCode": 2, "message": "Order already confirmed"}

        result_code = body.get("resultCode")
        if result_code == 0:
            payment.trang_thai = "thanh_cong"
            payment.ngay_thanh_toan = parse_momo_datetime(str(body.get("responseTime"))) or utc_now()
        else:
            payment.trang_thai = "that_bai"

        trans_id = body.get("transId")
        if trans_id:
            payment.ma_giao_dich = str(trans_id)

        payment.thong_tin_giao_dich = {
            "ma_giao_dich_ben_thu_3": str(trans_id) if trans_id else None,
            "thoi_gian_giao_dich": str(body.get("responseTime")) if body.get("responseTime") else None,
            "chi_tiet_raw": body,
        }

        if payment.trang_thai == "thanh_cong":
            total_paid = self._total_paid(db, order.donhang_id)
            self._maybe_complete_order(order, total_paid)
        else:
            self.order_service.fail_unpaid_order(db, order.donhang_id, "MoMo payment failed")

        db.commit()
        return {"resultCode": 0, "message": "Success"}

    def resolve_momo_return(self, db: Session, params: dict) -> str:
        """Resolve the MoMo return-URL redirect params -> the frontend URL
        to redirect the shopper to."""
        payment_status = "unknown"
        if not settings.MOMO_SECRET_KEY:
            payment_status = "config_error"
        else:
            result_code = params.get("resultCode")
            if result_code == "0":
                payment_status = "success"
            elif result_code:
                payment_status = "failed"

        order_id = None
        momo_order_id = params.get("orderId")
        if momo_order_id:
            try:
                payment_id = int(str(momo_order_id))
                payment = db.query(ThanhToan).filter(ThanhToan.thanhtoan_id == payment_id).first()
                if payment:
                    order_id = payment.donhang_id
            except Exception:
                order_id = None

        if not order_id:
            return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/"

        return f"{settings.FRONTEND_BASE_URL.rstrip('/')}/orders/{order_id}/success?payment_status={payment_status}&payment_method=momo"

    # ------------------------------------------------------------------
    # MoMo QR (manual / non-API) payments
    # ------------------------------------------------------------------
    def create_momo_qr_payment(self, db: Session, payload: Any, current_user: NguoiDung) -> dict:
        if not settings.MOMO_QR_PHONE:
            raise DomainError(status_code=500, detail="Chưa cấu hình số điện thoại MoMo (MOMO_QR_PHONE)")

        order = self._get_order_or_404(db, payload.donhang_id)
        self._ensure_order_access(order, current_user, "Bạn chỉ có thể thanh toán đơn hàng của mình")

        total_paid = self._total_paid(db, order.donhang_id)
        remaining = (order.tien_thanh_toan or Decimal("0")) - total_paid
        if remaining <= 0:
            raise DomainError(status_code=400, detail="Đơn hàng đã được thanh toán đủ")

        payment = ThanhToan(
            donhang_id=order.donhang_id,
            phuong_thuc="vi_dien_tu",
            so_tien=remaining,
            trang_thai="dang_xu_ly",
            thong_tin_giao_dich=validate_thong_tin_giao_dich(
                {
                    "ma_giao_dich_ben_thu_3": None,
                    "thoi_gian_giao_dich": None,
                    "chi_tiet_raw": {"provider": "momo_qr", "method": "manual"},
                }
            ),
        )
        db.add(payment)
        db.flush()

        payment_info = create_momo_payment_info(
            order_code=order.ma_don_hang,
            amount=int(remaining),
            phone_number=settings.MOMO_QR_PHONE,
            account_name=settings.MOMO_QR_ACCOUNT_NAME or "Leaf Creme",
            qr_image_path=settings.MOMO_QR_IMAGE_PATH or None,
        )

        db.commit()
        db.refresh(payment)
        return {"payment_id": payment.thanhtoan_id, **payment_info}

    def confirm_momo_qr_payment(self, db: Session, payment_id: int, payload: Any, current_user: NguoiDung) -> dict:
        if payload.payment_id != payment_id:
            raise DomainError(status_code=400, detail="Payment ID không khớp")

        payment = self._get_payment_or_404(db, payment_id)
        order = self._get_order_or_404(db, payment.donhang_id)

        if payload.confirmed:
            payment.trang_thai = "thanh_cong"
            payment.ngay_thanh_toan = utc_now()

            if payment.thong_tin_giao_dich:
                payment.thong_tin_giao_dich["confirmed_by"] = current_user.nguoidung_id
                payment.thong_tin_giao_dich["confirmed_at"] = utc_now().isoformat()
                if payload.transaction_note:
                    payment.thong_tin_giao_dich["admin_note"] = payload.transaction_note

            total_paid = self._total_paid(db, order.donhang_id)
            self._maybe_complete_order(order, total_paid)
        else:
            payment.trang_thai = "that_bai"
            if payment.thong_tin_giao_dich:
                payment.thong_tin_giao_dich["rejected_by"] = current_user.nguoidung_id
                payment.thong_tin_giao_dich["rejected_at"] = utc_now().isoformat()
                if payload.transaction_note:
                    payment.thong_tin_giao_dich["reject_reason"] = payload.transaction_note
            self.order_service.fail_unpaid_order(db, order.donhang_id, "MoMo QR payment rejected")

        db.commit()
        db.refresh(payment)
        return self._to_response(payment, order)
