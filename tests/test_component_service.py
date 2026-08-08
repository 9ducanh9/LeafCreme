"""
Tests for app.services.components.ComponentService — Phase 1 service-layer
migration (see app/services/components/component_service.py).
"""
from decimal import Decimal

import pytest

from app.models import LinhKien
from app.services.components import ComponentService, DomainError


@pytest.fixture()
def service() -> ComponentService:
    return ComponentService()


class TestListComponents:
    def test_filters_by_active_status(self, db_session, service):
        db_session.add(LinhKien(ten_linh_kien="Hộp giấy A", gia_don_vi=Decimal("1000"), dang_hoat_dong=True))
        db_session.add(LinhKien(ten_linh_kien="Hộp giấy B (ẩn)", gia_don_vi=Decimal("1000"), dang_hoat_dong=False))
        db_session.flush()

        active = service.list_components(db_session, dang_hoat_dong=True)
        assert all(c.dang_hoat_dong for c in active)
        assert all(c.ten_linh_kien != "Hộp giấy B (ẩn)" for c in active)

    def test_search_matches_name_or_sku(self, db_session, service):
        db_session.add(LinhKien(ten_linh_kien="Ruy băng đỏ", sku="RB-RED", gia_don_vi=Decimal("500")))
        db_session.flush()

        by_name = service.list_components(db_session, search="Ruy băng")
        by_sku = service.list_components(db_session, search="RB-RED")
        assert len(by_name) == 1
        assert len(by_sku) == 1


class TestGetComponent:
    def test_not_found_raises_404(self, db_session, service):
        with pytest.raises(DomainError) as exc_info:
            service.get_component(db_session, 999999)
        assert exc_info.value.status_code == 404

    def test_returns_component(self, db_session, service):
        c = LinhKien(ten_linh_kien="Nơ vàng", gia_don_vi=Decimal("800"))
        db_session.add(c)
        db_session.flush()

        result = service.get_component(db_session, c.linh_kien_id)
        assert result.ten_linh_kien == "Nơ vàng"
