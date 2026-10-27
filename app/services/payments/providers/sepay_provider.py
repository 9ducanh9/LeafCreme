"""SePay gateway implementation; keeps bank reconciliation out of the payment manager."""

import logging
import re
from decimal import Decimal
from typing import Protocol

from sqlalchemy import desc, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.time import utc_now
from app.models import DonHang, NguoiDung, ThanhToan, SePayTransaction
from app.schemas import validate_thong_tin_giao_dich
from app.services.errors import DomainError
from app.services.sepay import build_sepay_qr_url

_PAYMENT_ACCEPTING_ORDER_STATUSES = ("cho", "cho_coc", "dang_xu_ly", "dang_giao")


class PaymentContext(Protocol):
    def _ensure_order_access(self, order: DonHang, user: NguoiDung, message: str) -> None: ...
    def _get_order_or_404(self, db: Session, order_id: int, *, lock: bool = False) -> DonHang: ...
    def _total_paid(self, db: Session, order_id: int) -> Decimal: ...


class SePayProvider:
    def __init__(self, context: PaymentContext) -> None:
        self.context = context

    def get_payment_info(self, payment: ThanhToan) -> dict:
        payment_code = f"LC{payment.thanhtoan_id}"
        amount = int(payment.so_tien or Decimal("0"))
        return {
            "payment_id": payment.thanhtoan_id,
            "method": "sepay",
            "bank_account": settings.SEPAY_BANK_ACCOUNT,
            "bank_code": settings.SEPAY_BANK_CODE,
            "account_name": settings.SEPAY_ACCOUNT_NAME,
            "amount": amount,
            "transfer_content": payment_code,
            "qr_image": build_sepay_qr_url(
                bank_account=settings.SEPAY_BANK_ACCOUNT,
                bank_code=settings.SEPAY_BANK_CODE,
                amount=amount,
                payment_code=payment_code,
                account_name=settings.SEPAY_ACCOUNT_NAME,
                base_url=settings.SEPAY_QR_BASE_URL,
            ),
        }

    def check_configuration(self) -> None:
        if not all((settings.SEPAY_BANK_ACCOUNT, settings.SEPAY_BANK_CODE, settings.SEPAY_WEBHOOK_API_KEY)):
            raise DomainError(503, "Chuyển khoản SePay chưa được cấu hình đầy đủ.")

    def create_payment(self, db: Session, order: DonHang, user: NguoiDung, **kwargs) -> dict:
        self.check_configuration()
        commit = kwargs.get("commit", True)
        self.context._ensure_order_access(order, user, "Bạn chỉ có thể thanh toán đơn hàng của mình")
        if order.trang_thai not in _PAYMENT_ACCEPTING_ORDER_STATUSES:
            raise DomainError(400, "Đơn hàng không còn nhận thanh toán QR.")

        total_paid = self.context._total_paid(db, order.donhang_id)
        remaining = (order.tien_thanh_toan or Decimal("0")) - total_paid
        if remaining <= 0:
            raise DomainError(400, "Đơn hàng đã được thanh toán đủ")
        if remaining != remaining.to_integral_value():
            raise DomainError(400, "Số tiền VietQR phải là số nguyên VNĐ.")

        existing = (
            db.query(ThanhToan)
            .filter(
                ThanhToan.donhang_id == order.donhang_id,
                ThanhToan.phuong_thuc == "chuyen_khoan",
                ThanhToan.trang_thai == "dang_xu_ly",
            )
            .order_by(desc(ThanhToan.ngay_tao))
            .first()
        )
        if existing:
            raw = (existing.thong_tin_giao_dich or {}).get("chi_tiet_raw") or {}
            if raw.get("provider") == "sepay" and existing.so_tien == remaining:
                return self.get_payment_info(existing)
            if raw.get("provider") == "sepay":
                existing.trang_thai = "that_bai"

        payment = ThanhToan(
            donhang_id=order.donhang_id,
            phuong_thuc="chuyen_khoan",
            so_tien=remaining,
            trang_thai="dang_xu_ly",
        )
        db.add(payment)
        db.flush()

        payment_code = f"LC{payment.thanhtoan_id}"
        payment.thong_tin_giao_dich = validate_thong_tin_giao_dich(
            {
                "ma_giao_dich_ben_thu_3": None,
                "thoi_gian_giao_dich": None,
                "chi_tiet_raw": {
                    "provider": "sepay",
                    "payment_code": payment_code,
                    "bank_code": settings.SEPAY_BANK_CODE,
                },
            }
        )
        db.flush()
        if commit:
            db.commit()
            db.refresh(payment)
        return self.get_payment_info(payment)

    def verify_webhook(self, db: Session, payload: dict) -> dict:
        """Persist each receipt once; cancelled orders require manual reconciliation."""
        body = payload
        transaction_id = body.get("id")
        if transaction_id is None:
            raise DomainError(400, "Missing transaction id")
        gateway_transaction = f"SEPAY-{transaction_id}"
        # Serialize deliveries of the same transaction before acquiring order locks.
        db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:key, 0))"), {"key": gateway_transaction})
        if db.get(SePayTransaction, gateway_transaction) or db.query(ThanhToan).filter(ThanhToan.ma_giao_dich == gateway_transaction).first():
            return {"success": True, "message": "Transaction already processed"}
        if str(body.get("transferType", "")).lower() != "in":
            return {"success": True, "message": "Outgoing transaction ignored"}
        if str(body.get("accountNumber") or "").strip() != settings.SEPAY_BANK_ACCOUNT:
            return {"success": True, "message": "Receiving account mismatch"}
        try:
            received_amount = Decimal(str(body.get("transferAmount")))
            if not received_amount.is_finite() or received_amount <= 0:
                raise ValueError("Invalid amount")
        except Exception:
            raise DomainError(400, "Invalid transfer amount")

        searchable = f"{body.get('code') or ''} {body.get('content') or ''}".upper()
        code_match = re.search(r"(?<![A-Z0-9])LC([0-9]+)(?![A-Z0-9])", searchable)
        payment = db.get(ThanhToan, int(code_match.group(1))) if code_match else None
        order = None
        if payment:
            # Always lock the order before its payment, like cancellation/sweeping.
            order = self.context._get_order_or_404(db, payment.donhang_id, lock=True)
            db.refresh(payment, with_for_update=True)
        raw = ((payment.thong_tin_giao_dich or {}).get("chi_tiet_raw") or {}) if payment else {}
        valid_provider = payment and (
            (raw.get("provider") == "sepay" and raw.get("payment_code") == f"LC{payment.thanhtoan_id}")
            or (payment.phuong_thuc == "chuyen_khoan" and str(payment.ma_giao_dich or "").startswith("SEPAY-"))
        )
        if not payment:
            reason = "Payment not found" if code_match else "No Leaf Creme payment code"
            receipt_status = "unmatched"
        elif not valid_provider:
            reason, receipt_status = "Payment provider mismatch", "unmatched"
        elif order.trang_thai == "da_huy":
            reason, receipt_status = "Cancelled order requires refund", "refund_required"
        elif payment.trang_thai == "thanh_cong":
            reason, receipt_status = "Additional transfer requires refund", "refund_required"
        elif received_amount != payment.so_tien:
            reason, receipt_status = "Transfer amount mismatch", "refund_required"
        elif payment.trang_thai != "dang_xu_ly" or order.trang_thai not in _PAYMENT_ACCEPTING_ORDER_STATUSES:
            reason, receipt_status = "Inactive payment requires refund", "refund_required"
        elif received_amount > max(
            (order.tien_thanh_toan or Decimal("0")) - self.context._total_paid(db, order.donhang_id),
            Decimal("0"),
        ):
            reason, receipt_status = "Transfer exceeds remaining order balance", "refund_required"
        else:
            reason, receipt_status = "Payment confirmed", "confirmed"
            payment.trang_thai = "thanh_cong"
            payment.ma_giao_dich = gateway_transaction
            payment.ngay_thanh_toan = utc_now()
            payment.thong_tin_giao_dich = validate_thong_tin_giao_dich({
                "ma_giao_dich_ben_thu_3": gateway_transaction,
                "thoi_gian_giao_dich": str(body.get("transactionDate") or ""),
                "chi_tiet_raw": {**raw, "webhook": body},
            })
            db.flush()
            if order.loai_don == "dat_truoc" and order.trang_thai == "cho":
                if self.context._total_paid(db, order.donhang_id) >= (order.tien_thanh_toan or Decimal("0")):
                    order.trang_thai = "dang_xu_ly"
        receipt = SePayTransaction(
            transaction_id=gateway_transaction,
            thanhtoan_id=payment.thanhtoan_id if payment else None,
            donhang_id=order.donhang_id if order else None,
            so_tien=received_amount, payload=body, status=receipt_status, reason=reason,
        )
        db.add(receipt)
        db.commit()
        if receipt_status != "confirmed":
            logging.getLogger(__name__).warning("SePay reconciliation transaction=%s status=%s reason=%s", gateway_transaction, receipt_status, reason)
        return {"success": True, "message": reason, "payment_id": payment.thanhtoan_id if payment else None}

