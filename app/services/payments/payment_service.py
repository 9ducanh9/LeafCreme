"""
Payment domain service.

Business logic, transaction boundaries, and database access live here so the
router can validate input and translate DomainError to HTTPException. Payment
confirmation updates money state only; order fulfillment advances separately
after handover.
"""

from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session, object_session

from app.core.dependencies import BACK_OFFICE_ROLES, MANAGEMENT_ROLES, role_name
from app.core.time import utc_now
from app.models import DonHang, NguoiDung, ThanhToan, SePayTransaction
from app.schemas import validate_thong_tin_giao_dich
from app.services.errors import DomainError
from app.services.payments.base import PaymentProvider
from app.services.payments.providers.sepay_provider import SePayProvider
from app.services.orders import OrderService, can_access_order


class PaymentService:
    def __init__(self):
        self.order_service = OrderService()
        self._providers: dict[str, PaymentProvider] = {}
        self.register_provider("sepay_qr", SePayProvider(self))

    def register_provider(self, payment_method: str, provider: PaymentProvider) -> None:
        """Register a gateway without changing checkout or manual payment logic."""
        self._providers[payment_method] = provider

    def provider_for(self, payment_method: str) -> PaymentProvider:
        try:
            return self._providers[payment_method]
        except KeyError as exc:
            raise DomainError(400, "Phương thức thanh toán không được hỗ trợ.") from exc

    def create_gateway_payment(
        self, db: Session, payment_method: str, order: DonHang, user: NguoiDung, **kwargs
    ) -> dict:
        """Dispatch a gateway payment by method; new providers need registration only."""
        return self.provider_for(payment_method).create_payment(db, order, user, **kwargs)

    def verify_gateway_webhook(self, db: Session, payment_method: str, payload: dict) -> dict:
        return self.provider_for(payment_method).verify_webhook(db, payload)

    def get_gateway_payment_info(self, payment_method: str, payment: ThanhToan) -> dict:
        return self.provider_for(payment_method).get_payment_info(payment)

    def check_gateway_configuration(self, payment_method: str) -> None:
        self.provider_for(payment_method).check_configuration()

    # ------------------------------------------------------------------
    # Shared helpers (previously duplicated inline across the router)
    # ------------------------------------------------------------------
    @staticmethod
    def _role(current_user: NguoiDung) -> Optional[str]:
        return role_name(current_user)

    def _ensure_order_access(
        self,
        order: DonHang,
        current_user: NguoiDung,
        message: str,
        allowed_roles: tuple[str, ...] = MANAGEMENT_ROLES,
    ) -> None:
        if self._role(current_user) not in allowed_roles and not can_access_order(order, current_user):
            raise DomainError(status_code=403, detail=message)

    @staticmethod
    def _get_order_or_404(db: Session, order_id: int, *, lock: bool = False) -> DonHang:
        query = db.query(DonHang).filter(DonHang.donhang_id == order_id)
        if lock:
            query = query.populate_existing().with_for_update()
        order = query.first()
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
        db = object_session(payment)
        statuses = set(db.query(SePayTransaction.status).filter(SePayTransaction.thanhtoan_id == payment.thanhtoan_id).all()) if db else set()
        reconciliation = "refund_required" if ("refund_required",) in statuses else "refunded" if payment.trang_thai != "thanh_cong" and ("refunded",) in statuses else "none"
        return {
            **{c.name: getattr(payment, c.name) for c in payment.__table__.columns},
            "ma_don_hang": order.ma_don_hang,
            "tong_tien_don_hang": order.tong_tien,
            "reconciliation_status": reconciliation,
            "order_status": order.trang_thai,
        }

    @classmethod
    def _ensure_payment_fits_balance(cls, db: Session, order: DonHang, payment: ThanhToan) -> None:
        """Prevent confirming concurrently-created pending payments beyond the order balance."""
        due = order.tien_thanh_toan or Decimal("0")
        remaining = max(due - cls._total_paid(db, order.donhang_id), Decimal("0"))
        if payment.so_tien > remaining:
            raise DomainError(400, f"Khoản thanh toán vượt số dư còn phải trả ({remaining:,.0f} VNĐ); cần đối soát.")

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

        role = self._role(current_user)
        if role not in MANAGEMENT_ROLES:
            query = query.join(DonHang)
            if role in BACK_OFFICE_ROLES:
                query = query.filter(
                    (DonHang.nhan_vien_tao == current_user.nguoidung_id)
                    | (DonHang.nguoidung_id == current_user.nguoidung_id)
                )
            else:
                query = query.filter(DonHang.nguoidung_id == current_user.nguoidung_id)

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
        if self._role(current_user) not in BACK_OFFICE_ROLES:
            raise DomainError(status_code=403, detail="Chỉ nhân viên mới được ghi nhận thanh toán thủ công.")

        method_aliases = {"the": "the_tin_dung"}
        phuong_thuc = method_aliases.get(payload.phuong_thuc, payload.phuong_thuc)
        valid_methods = ["tien_mat", "chuyen_khoan", "the_tin_dung", "vi_dien_tu"]
        if phuong_thuc not in valid_methods:
            raise DomainError(
                status_code=400,
                detail=f"Phương thức không hợp lệ. Chọn: {', '.join(valid_methods)}",
            )
        if phuong_thuc == "chuyen_khoan":
            raise DomainError(400, "Chuyển khoản phải dùng QR SePay có mã thanh toán riêng của đơn.")

        order = self._get_order_or_404(db, payload.donhang_id, lock=True)
        self._ensure_order_access(order, current_user, "Bạn không có quyền ghi nhận thanh toán cho đơn hàng này")
        if order.trang_thai == "da_huy":
            raise DomainError(400, "Không thể thanh toán đơn đã hủy.")
        if order.loai_don == "dat_truoc":
            raise DomainError(400, "Đơn đặt trước chỉ nhận thanh toán đủ qua QR SePay.")
        pending_sepay = db.query(ThanhToan).filter(
            ThanhToan.donhang_id == order.donhang_id,
            ThanhToan.phuong_thuc == "chuyen_khoan",
            ThanhToan.trang_thai == "dang_xu_ly",
        ).first()
        if pending_sepay:
            raise DomainError(409, "Đơn đang chờ SePay xác nhận; không ghi nhận khoản thu khác trước khi đối soát QR.")

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

        db.commit()
        db.refresh(payment)
        return self._to_response(payment, order)

    def update_payment_status(self, db: Session, payment_id: int, payload: Any, current_user: NguoiDung) -> dict:
        if self._role(current_user) not in MANAGEMENT_ROLES:
            raise DomainError(status_code=403, detail="Chỉ quản lý mới được cập nhật trạng thái thanh toán.")

        payment = self._get_payment_or_404(db, payment_id)
        order = self._get_order_or_404(db, payment.donhang_id, lock=True)
        db.refresh(payment, with_for_update=True)
        if order.trang_thai == "da_huy" and payload.trang_thai == "thanh_cong":
            raise DomainError(400, "Đơn đã hủy; cần đối soát khoản tiền nhận được.")

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
            if next_status != old_status:
                if old_status == "thanh_cong" and next_status != "da_hoan_tien":
                    raise DomainError(400, "Không thể hạ trạng thái khoản đã thu; ghi nhận hoàn tiền riêng.")
                if old_status in ("that_bai", "da_hoan_tien"):
                    raise DomainError(400, "Khoản thanh toán đã kết thúc; hãy tạo khoản thanh toán mới nếu cần.")
                if next_status == "thanh_cong":
                    if payment.phuong_thuc == "chuyen_khoan":
                        raise DomainError(400, "Chuyển khoản chỉ được xác nhận từ webhook SePay đã đối soát.")
                    self._ensure_payment_fits_balance(db, order, payment)
                payment.trang_thai = next_status

            if next_status == "thanh_cong" and old_status != "thanh_cong":
                payment.ngay_thanh_toan = payload.ngay_thanh_toan or utc_now()

            elif next_status in ("that_bai", "da_hoan_tien") and old_status == "thanh_cong":
                # Payment state records money movement; it must not roll back
                # the separate fulfilment state of an already delivered order.
                pass

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
        if self._role(current_user) not in MANAGEMENT_ROLES:
            raise DomainError(403, "Chỉ quản lý mới được xác nhận thanh toán.")
        payment = self._get_payment_or_404(db, payment_id)
        order = self._get_order_or_404(db, payment.donhang_id, lock=True)
        db.refresh(payment, with_for_update=True)
        if order.trang_thai == "da_huy":
            raise DomainError(400, "Đơn đã hủy; cần đối soát khoản tiền nhận được.")

        if payment.phuong_thuc == "chuyen_khoan":
            raise DomainError(400, "Chuyển khoản chỉ được xác nhận từ webhook SePay đã đối soát.")
        if payment.trang_thai != "dang_xu_ly":
            raise DomainError(400, "Chỉ có thể xác minh khoản thanh toán đang chờ xử lý.")

        status_token = payload.trang_thai.strip().lower()
        if status_token in {"00", "success", "successful"}:
            if not payload.ma_giao_dich or not payload.ma_giao_dich.strip():
                raise DomainError(400, "Thiếu mã giao dịch để xác nhận thanh toán.")
            if getattr(payload, "so_tien", None) is None or Decimal(str(payload.so_tien)) != payment.so_tien:
                raise DomainError(400, "Số tiền xác nhận không khớp khoản thanh toán.")
            self._ensure_payment_fits_balance(db, order, payment)
            payment.trang_thai = "thanh_cong"
            payment.ngay_thanh_toan = utc_now()
        elif status_token in {"fail", "failed", "failure", "error"}:
            payment.trang_thai = "that_bai"
        elif status_token in {"pending", "processing", "01"}:
            payment.trang_thai = "dang_xu_ly"
        else:
            raise DomainError(400, "Trạng thái xác minh từ cổng thanh toán không hợp lệ.")

        if payload.ma_giao_dich:
            duplicate = db.query(ThanhToan).filter(
                ThanhToan.ma_giao_dich == payload.ma_giao_dich,
                ThanhToan.thanhtoan_id != payment_id,
            ).first()
            if duplicate:
                raise DomainError(400, f"Mã giao dịch '{payload.ma_giao_dich}' đã tồn tại")
            payment.ma_giao_dich = payload.ma_giao_dich

        if payload.thong_tin_giao_dich:
            try:
                payment.thong_tin_giao_dich = validate_thong_tin_giao_dich(payload.thong_tin_giao_dich)
            except Exception:
                payment.thong_tin_giao_dich = payload.thong_tin_giao_dich

        if payment.trang_thai == "that_bai":
            self.order_service.fail_unpaid_order(db, order.donhang_id, "Payment verification failed")

        db.commit()
        db.refresh(payment)
        return self._to_response(payment, order)

    # Existing router and checkout entry points remain stable while gateway
    # behavior is dispatched through the registered provider.
    def _sepay_payment_info(self, payment: ThanhToan) -> dict:
        return self.get_gateway_payment_info("sepay_qr", payment)

    @classmethod
    def ensure_sepay_configured(cls) -> None:
        # Preserve both PaymentService.ensure_sepay_configured() and instance calls.
        cls().check_gateway_configuration("sepay_qr")

    def create_sepay_payment(self, db: Session, payload: Any, current_user: NguoiDung, *, commit: bool = True) -> dict:
        provider = self.provider_for("sepay_qr")
        provider.check_configuration()
        order = self._get_order_or_404(db, payload.donhang_id, lock=True)
        return self.create_gateway_payment(db, "sepay_qr", order, current_user, commit=commit)

    def handle_sepay_webhook(self, db: Session, body: dict) -> dict:
        return self.verify_gateway_webhook(db, "sepay_qr", body)

    def list_reconciliation(self, db: Session, current_user: NguoiDung, skip: int, limit: int, status: Optional[str]) -> dict:
        if self._role(current_user) not in MANAGEMENT_ROLES:
            raise DomainError(403, "Chỉ quản lý mới được đối soát thanh toán.")
        query = db.query(SePayTransaction)
        if status:
            query = query.filter(SePayTransaction.status == status)
        else:
            query = query.filter(SePayTransaction.status.in_(("refund_required", "unmatched")))
        total = query.count()
        rows = query.order_by(desc(SePayTransaction.ngay_tao), SePayTransaction.transaction_id).offset(skip).limit(limit).all()
        return {"items": [self._receipt_response(row) for row in rows], "total": total, "skip": skip, "limit": limit}

    @staticmethod
    def _receipt_response(receipt: SePayTransaction) -> dict:
        # Raw bank payloads stay server-side; the management UI only needs these fields.
        return {field: getattr(receipt, field) for field in (
            "transaction_id", "thanhtoan_id", "donhang_id", "so_tien", "status", "reason",
            "refund_reference", "refund_note", "resolved_by", "resolved_at", "ngay_tao",
        )}

    def confirm_refund(self, db: Session, transaction_id: str, payload: Any, current_user: NguoiDung) -> dict:
        if self._role(current_user) not in MANAGEMENT_ROLES:
            raise DomainError(403, "Chỉ quản lý mới được xác nhận hoàn tiền.")
        receipt = db.query(SePayTransaction).filter_by(transaction_id=transaction_id).populate_existing().with_for_update().first()
        if not receipt:
            raise DomainError(404, "Giao dịch không tồn tại.")
        if receipt.status == "refunded":
            if receipt.refund_reference == payload.refund_reference and receipt.refund_note == payload.refund_note:
                return self._receipt_response(receipt)
            raise DomainError(409, "Giao dịch đã được xác nhận hoàn tiền với thông tin khác.")
        if receipt.status not in ("refund_required", "unmatched"):
            raise DomainError(409, "Giao dịch không cần hoàn tiền.")
        receipt.status = "refunded"
        receipt.refund_reference = payload.refund_reference
        receipt.refund_note = payload.refund_note
        receipt.resolved_by = current_user.nguoidung_id
        receipt.resolved_at = utc_now()
        db.commit()
        return self._receipt_response(receipt)
