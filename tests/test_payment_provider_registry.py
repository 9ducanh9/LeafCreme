"""A new gateway can be dispatched without editing the payment manager."""

import pytest

from app.services.errors import DomainError
from app.services.payments import PaymentService
from app.services.payments.providers.sepay_provider import SePayProvider


def test_registered_provider_receives_payment_and_webhook_calls():
    calls = []

    class DemoProvider:
        def create_payment(self, db, order, user, **kwargs):
            calls.append(("create", db, order, user, kwargs))
            return {"created": True}

        def verify_webhook(self, db, payload):
            calls.append(("webhook", db, payload))
            return {"verified": True}

        def get_payment_info(self, payment):
            calls.append(("info", payment))
            return {"payment_id": 17}

        def check_configuration(self):
            calls.append(("configuration",))

    service = PaymentService()
    service.register_provider("demo", DemoProvider())
    db, order, user, payment = object(), object(), object(), object()

    assert service.create_gateway_payment(db, "demo", order, user, commit=False) == {"created": True}
    assert service.verify_gateway_webhook(db, "demo", {"id": 17}) == {"verified": True}
    assert service.get_gateway_payment_info("demo", payment) == {"payment_id": 17}
    service.check_gateway_configuration("demo")
    assert calls == [
        ("create", db, order, user, {"commit": False}),
        ("webhook", db, {"id": 17}),
        ("info", payment),
        ("configuration",),
    ]


def test_unknown_payment_method_is_rejected():
    with pytest.raises(DomainError) as error:
        PaymentService().provider_for("missing")
    assert error.value.status_code == 400


def test_legacy_sepay_configuration_entrypoint_still_accepts_class_call(monkeypatch):
    calls = []
    monkeypatch.setattr(SePayProvider, "check_configuration", lambda self: calls.append(self))
    PaymentService.ensure_sepay_configured()
    PaymentService().ensure_sepay_configured()
    assert len(calls) == 2
