"""
Tests for app.services.analytics.AnalyticsService — Phase 1 service-layer
migration (see app/services/analytics/analytics_service.py).
"""
from decimal import Decimal

import pytest

from app.models import SanPham
from app.services.analytics import AnalyticsService


@pytest.fixture()
def service() -> AnalyticsService:
    return AnalyticsService()


class TestGetBestSellers:
    def test_falls_back_to_active_products_when_no_sales(self, db_session, service):
        db_session.add(SanPham(ten="Bánh không bán được", sku="SP-NOSALE", gia_co_ban=Decimal("30000")))
        db_session.flush()

        results = service.get_best_sellers(db_session, limit=5)
        assert len(results) >= 1
        assert all(r["sold_count"] == 0 for r in results)

    def test_excludes_inactive_products_from_fallback(self, db_session, service):
        db_session.add(SanPham(ten="Bánh ẩn", sku="SP-INACTIVE", gia_co_ban=Decimal("30000"), dang_hoat_dong=False))
        db_session.flush()

        results = service.get_best_sellers(db_session, limit=20)
        assert all(r["name"] != "Bánh ẩn" for r in results)

    def test_respects_limit(self, db_session, service):
        for i in range(3):
            db_session.add(SanPham(ten=f"Bánh limit {i}", sku=f"SP-LIMIT-{i}", gia_co_ban=Decimal("30000")))
        db_session.flush()

        results = service.get_best_sellers(db_session, limit=2)
        assert len(results) <= 2
