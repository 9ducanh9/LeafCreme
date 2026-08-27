"""Regression coverage for the bounded proactive expiry-insight loop."""
from datetime import datetime, timedelta
from decimal import Decimal

import pytest

from app.models import BienTheSanPham, CanhBaoTonKho, LoHangSanPham, ProactiveInsight, SanPham, TonKhoSanPham
from app.services.agent import proactive_service
from app.services.agent import tools as tool_registry
from app.services.alerts import AlertService


@pytest.fixture(autouse=True)
def no_live_llm(monkeypatch):
    """The proactive regression suite never calls a real provider."""
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)


def _make_expiring_batch(db_session, days: int = 2) -> LoHangSanPham:
    product = SanPham(
        ten="Bánh proactive test",
        sku=f"SP-PROACTIVE-{datetime.now().timestamp()}",
        gia_co_ban=Decimal("50000"),
    )
    db_session.add(product)
    db_session.flush()
    variant = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Vani", gia_bienthe=Decimal("50000"))
    db_session.add(variant)
    db_session.flush()
    batch = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ma_lo=f"LOT-PROACTIVE-{variant.bienthe_id}",
        ngay_het_han=datetime.now() + timedelta(days=days),
        so_luong=12,
        gia_don_vi=Decimal("50000"),
        trang_thai="hoatdong",
    )
    db_session.add(batch)
    db_session.flush()
    db_session.add(TonKhoSanPham(
        lohang_sanpham_id=batch.lohang_id,
        so_luong_hien_tai=12,
        so_luong_da_ban=0,
    ))
    db_session.commit()
    return batch


def _generate_high_expiry_alert(db_session) -> CanhBaoTonKho:
    batch = _make_expiring_batch(db_session)
    result = AlertService().generate_alerts(db_session, low_stock_threshold=10, expiring_days=7)
    assert result["expiring_created"] == 1
    return db_session.query(CanhBaoTonKho).filter(
        CanhBaoTonKho.lohang_sanpham_id == batch.lohang_id,
        CanhBaoTonKho.loai_canh_bao == "sap_het_han",
    ).one()


class TestProactiveExpiryInsights:
    def test_creates_one_deterministic_insight_and_dedupes(self, db_session):
        alert = _generate_high_expiry_alert(db_session)

        first = proactive_service.refresh_expiring_batch_insights(db_session)
        second = proactive_service.refresh_expiring_batch_insights(db_session)

        assert first["created"] == 1
        assert second["created"] == 0
        assert second["skipped"] == 1
        insight = db_session.query(ProactiveInsight).filter(ProactiveInsight.source_alert_id == alert.canhbao_id).one()
        assert insight.trang_thai == "unread"
        assert insight.used_llm is False
        assert insight.prompt_version == proactive_service.PROACTIVE_PROMPT_VERSION
        assert insight.bang_chung["alert_id"] == alert.canhbao_id

    def test_noncurrent_expiry_supersedes_open_insight(self, db_session):
        alert = _generate_high_expiry_alert(db_session)
        proactive_service.refresh_expiring_batch_insights(db_session)
        insight = db_session.query(ProactiveInsight).filter(ProactiveInsight.source_alert_id == alert.canhbao_id).one()

        batch = db_session.query(LoHangSanPham).filter(LoHangSanPham.lohang_id == alert.lohang_sanpham_id).one()
        batch.ngay_het_han = datetime.now() + timedelta(days=30)
        db_session.commit()

        result = proactive_service.refresh_expiring_batch_insights(db_session)
        db_session.refresh(insight)
        assert result["created"] == 0
        assert result["superseded"] == 1
        assert insight.trang_thai == "superseded"

    def test_resolved_insight_is_not_reopened_or_duplicated(self, db_session):
        alert = _generate_high_expiry_alert(db_session)
        proactive_service.refresh_expiring_batch_insights(db_session)
        insight = db_session.query(ProactiveInsight).filter(ProactiveInsight.source_alert_id == alert.canhbao_id).one()

        proactive_service.update_proactive_insight_status(db_session, insight.insight_id, "resolved")
        result = proactive_service.refresh_expiring_batch_insights(db_session)

        assert result["created"] == 0
        assert result["skipped"] == 1
        assert db_session.query(ProactiveInsight).count() == 1
        db_session.refresh(insight)
        assert insight.trang_thai == "resolved"

    def test_only_read_tools_can_enter_proactive_runner(self):
        schemas = proactive_service.proactive_tool_schemas()
        names = {schema["function"]["name"] for schema in schemas}
        assert names == proactive_service.PROACTIVE_READ_TOOL_NAMES
        assert all(tool_registry.get_tool(name).classification == "read" for name in names)

        with pytest.raises(ValueError, match="read tools"):
            tool_registry.read_tool_schemas({"resolve_alert"})


class TestProactiveProductStockDigest:
    def test_creates_one_digest_for_multiple_missing_sizes_and_dedupes(self, db_session):
        product = SanPham(
            ten="Bánh chưa nhập proactive",
            sku="SP-PROACTIVE-STOCK",
            gia_co_ban=Decimal("50000"),
        )
        db_session.add(product)
        db_session.flush()
        db_session.add_all([
            BienTheSanPham(
                sanpham_id=product.sanpham_id,
                huong_vi=product.ten,
                kich_thuoc=size,
                gia_bienthe=Decimal("50000"),
            )
            for size in ("18cm", "20cm")
        ])
        db_session.commit()

        generated = AlertService().generate_alerts(db_session)
        first = proactive_service.refresh_proactive_insights(db_session)
        second = proactive_service.refresh_proactive_insights(db_session)

        assert generated["product_stock_created"] == 1
        assert first["created"] == 1
        assert second["created"] == 0
        assert second["skipped"] == 1
        insight = db_session.query(ProactiveInsight).one()
        assert insight.scenario == proactive_service.PRODUCT_STOCK_SCENARIO
        assert insight.prompt_version == proactive_service.PRODUCT_STOCK_PROMPT_VERSION
        assert insight.bang_chung["product_count"] == 1
        assert insight.bang_chung["affected_size_count"] == 2
        assert insight.bang_chung["products"][0]["missing_sizes"] == ["18cm", "20cm"]
        assert "Chưa đủ dữ liệu" in insight.khuyen_nghi
