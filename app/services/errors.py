"""
Shared domain error type for the service layer.

Moved out of app.services.orders so other domains (payments, batches, ...)
can raise/catch it without importing the orders package. app.services.orders
re-exports this for backward compatibility — existing `from app.services.orders
import DomainError` imports keep working unchanged.
"""


class DomainError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(detail)
