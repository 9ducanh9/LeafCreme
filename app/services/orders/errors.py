# Re-exported from app.services.errors — kept here so existing
# `from app.services.orders import DomainError` / `from .errors import
# DomainError` imports keep working unchanged after the type moved to a
# shared location for cross-domain reuse (see app/services/errors.py).
from app.services.errors import DomainError

__all__ = ["DomainError"]
