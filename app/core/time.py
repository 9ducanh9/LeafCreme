"""Shared time helpers for the database's UTC-naive timestamp columns."""

from datetime import UTC, datetime


def utc_now() -> datetime:
    """Return the current UTC time without tzinfo for legacy DB columns."""
    return datetime.now(UTC).replace(tzinfo=None)
