"""Contract for external payment gateways used by PaymentService."""

from typing import Protocol

from sqlalchemy.orm import Session

from app.models import DonHang, NguoiDung, ThanhToan


class PaymentProvider(Protocol):
    def create_payment(self, db: Session, order: DonHang, user: NguoiDung, **kwargs) -> dict: ...
    def verify_webhook(self, db: Session, payload: dict) -> dict: ...
    def get_payment_info(self, payment: ThanhToan) -> dict: ...
    def check_configuration(self) -> None: ...
