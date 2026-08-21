"""Tests for app.services.agent — the Operations Agent's governed tool
registry, business-state snapshot, insight engine, and the
propose -> approve/reject action lifecycle.

Mirrors the fixture style of test_alert_service.py / test_batch_service.py:
a real Postgres session per test, hand-built rows instead of the API layer.
"""
from datetime import datetime, timedelta
from decimal import Decimal

import pytest

from app.models import (
    AgentAction,
    BienTheSanPham,
    CanhBaoTonKho,
    DonHang,
    LoHangSanPham,
    NguoiDung,
    SanPham,
    TonKhoSanPham,
    VaiTro,
)
from app.core.time import utc_now
from app.services.agent import DomainError, agent_service, state_service, tools as tool_registry
from app.services.alerts import AlertService


@pytest.fixture()
def admin_user(db_session):
    role = VaiTro(ten_vai_tro="admin")
    db_session.add(role)
    db_session.flush()
    user = NguoiDung(
        ten_dang_nhap="agent_admin",
        email="agent_admin@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten="Agent Admin",
    )
    db_session.add(user)
    db_session.flush()
    return user


def _make_low_stock_alert(db_session, so_luong: int = 3) -> CanhBaoTonKho:
    product = SanPham(ten="Bánh test agent", sku=f"SP-AGENT-{so_luong}-{datetime.now().timestamp()}", gia_co_ban=Decimal("50000"))
    db_session.add(product)
    db_session.flush()
    variant = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Vani", gia_bienthe=Decimal("50000"))
    db_session.add(variant)
    db_session.flush()
    batch = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ma_lo=f"LOT-AGENT-{variant.bienthe_id}",
        ngay_het_han=datetime.now() + timedelta(days=90),
        so_luong=so_luong,
        gia_don_vi=Decimal("50000"),
        trang_thai="hoatdong",
    )
    db_session.add(batch)
    db_session.flush()
    inventory = TonKhoSanPham(lohang_sanpham_id=batch.lohang_id, so_luong_hien_tai=so_luong, so_luong_da_ban=0)
    db_session.add(inventory)
    db_session.flush()

    AlertService().generate_alerts(db_session, low_stock_threshold=10, expiring_days=7)
    return db_session.query(CanhBaoTonKho).filter(CanhBaoTonKho.lohang_sanpham_id == batch.lohang_id).first()


def _make_stale_order(db_session, hours_old: int, trang_thai: str = "cho") -> DonHang:
    order = DonHang(
        ma_don_hang=f"POS-STALE-{datetime.now().timestamp()}",
        loai_don="pos",
        tong_tien=Decimal("100000"),
        tien_thanh_toan=Decimal("100000"),
        trang_thai=trang_thai,
        ngay_tao=datetime.now() - timedelta(hours=hours_old),
    )
    db_session.add(order)
    db_session.flush()
    return order


class TestToolRegistry:
    def test_validate_params_rejects_missing_required(self):
        tool = tool_registry.get_tool("resolve_alert")
        with pytest.raises(DomainError) as exc_info:
            tool_registry.validate_params(tool, {})
        assert exc_info.value.status_code == 400

    def test_validate_params_rejects_unknown_param(self):
        tool = tool_registry.get_tool("resolve_alert")
        with pytest.raises(DomainError):
            tool_registry.validate_params(tool, {"alert_id": 1, "surprise": True})

    def test_validate_params_accepts_required_plus_optional(self):
        tool = tool_registry.get_tool("resolve_alert")
        tool_registry.validate_params(tool, {"alert_id": 1, "note": "restocked"})  # no raise

    def test_unknown_tool_raises_404(self):
        with pytest.raises(DomainError) as exc_info:
            tool_registry.get_tool("delete_everything")
        assert exc_info.value.status_code == 404

    def test_describe_tools_lists_every_registered_tool(self):
        catalogue = tool_registry.describe_tools()
        names = {t["name"] for t in catalogue}
        assert names == set(tool_registry.TOOL_REGISTRY.keys())


class TestToolParamBounds:
    """Numeric/enum params (limit, hours, thresholds, ...) are unbounded
    inputs otherwise — a caller (or a model hallucinating an argument) can
    pass an absurd value straight into a query/loop. validate_params is
    the single choke point every tool call goes through, so bounds are
    enforced there once rather than per-tool.
    """

    def test_limit_over_maximum_is_rejected(self):
        tool = tool_registry.get_tool("list_pending_alerts")
        with pytest.raises(DomainError) as exc_info:
            tool_registry.validate_params(tool, {"limit": 10000})
        assert exc_info.value.status_code == 400

    def test_limit_at_maximum_is_accepted(self):
        tool = tool_registry.get_tool("list_pending_alerts")
        tool_registry.validate_params(tool, {"limit": 100})  # no raise

    def test_limit_below_minimum_is_rejected(self):
        tool = tool_registry.get_tool("list_pending_alerts")
        with pytest.raises(DomainError):
            tool_registry.validate_params(tool, {"limit": 0})

    def test_negative_limit_is_rejected(self):
        tool = tool_registry.get_tool("list_stale_orders")
        with pytest.raises(DomainError):
            tool_registry.validate_params(tool, {"limit": -5})

    def test_hours_over_thirty_days_is_rejected(self):
        tool = tool_registry.get_tool("list_stale_orders")
        with pytest.raises(DomainError):
            tool_registry.validate_params(tool, {"hours": 100000})

    def test_non_integer_value_is_rejected(self):
        tool = tool_registry.get_tool("list_pending_alerts")
        with pytest.raises(DomainError):
            tool_registry.validate_params(tool, {"limit": "not a number"})

    def test_numeric_string_within_range_is_accepted(self):
        # JSON payloads from HTTP clients can carry numbers as strings;
        # coercion should still respect bounds rather than skip them.
        tool = tool_registry.get_tool("list_pending_alerts")
        tool_registry.validate_params(tool, {"limit": "50"})  # no raise

    def test_batch_status_enum_rejects_unknown_value(self):
        tool = tool_registry.get_tool("set_batch_status")
        with pytest.raises(DomainError):
            tool_registry.validate_params(tool, {"kind": "products", "batch_id": 1, "trang_thai": "not_a_status"})

    def test_batch_kind_enum_rejects_unknown_value(self):
        tool = tool_registry.get_tool("set_batch_status")
        with pytest.raises(DomainError):
            tool_registry.validate_params(tool, {"kind": "not_a_kind", "batch_id": 1, "trang_thai": "tamdung"})

    def test_note_over_max_length_is_rejected(self):
        tool = tool_registry.get_tool("resolve_alert")
        with pytest.raises(DomainError):
            tool_registry.validate_params(tool, {"alert_id": 1, "note": "x" * 5000})

    def test_generate_alerts_threshold_bounds_enforced(self):
        tool = tool_registry.get_tool("generate_alerts")
        with pytest.raises(DomainError):
            tool_registry.validate_params(tool, {"expiring_days": 10000})


class TestBuildSnapshot:
    def test_reflects_pending_alerts(self, db_session):
        alert = _make_low_stock_alert(db_session, so_luong=3)

        snapshot = state_service.build_snapshot(db_session)

        assert snapshot.alert_summary["pending"] >= 1
        assert any(a["canhbao_id"] == alert.canhbao_id for a in snapshot.urgent_alerts)

    def test_flags_stale_orders_past_threshold(self, db_session):
        _make_stale_order(db_session, hours_old=30)

        snapshot = state_service.build_snapshot(db_session, stale_order_hours=24)

        assert snapshot.stale_order_count == 1
        assert len(snapshot.stale_orders) == 1

    def test_does_not_flag_recent_orders(self, db_session):
        _make_stale_order(db_session, hours_old=1)

        snapshot = state_service.build_snapshot(db_session, stale_order_hours=24)

        assert snapshot.stale_order_count == 0

    def test_ignores_completed_orders_regardless_of_age(self, db_session):
        _make_stale_order(db_session, hours_old=100, trang_thai="hoan_thanh")

        snapshot = state_service.build_snapshot(db_session, stale_order_hours=24)

        assert snapshot.stale_order_count == 0


class TestGetInsights:
    def test_all_clear_when_nothing_is_wrong(self, db_session):
        insights = agent_service.get_insights(db_session)
        assert len(insights) == 1
        assert insights[0]["id"] == "all_clear"

    def test_high_severity_alert_gets_recommended_action(self, db_session):
        alert = _make_low_stock_alert(db_session, so_luong=3)  # <=5 -> severity "cao"

        insights = agent_service.get_insights(db_session)

        matching = [i for i in insights if i["id"] == f"alert:{alert.canhbao_id}"]
        assert len(matching) == 1
        assert matching[0]["severity"] == "cao"
        assert matching[0]["recommended_action"]["tool"] == "resolve_alert"
        assert matching[0]["recommended_action"]["params"] == {"alert_id": alert.canhbao_id}

    def test_stale_orders_surface_as_insight_without_a_tool(self, db_session):
        _make_stale_order(db_session, hours_old=48)

        insights = agent_service.get_insights(db_session)

        stale = [i for i in insights if i["id"] == "stale_orders"]
        assert len(stale) == 1
        assert stale[0]["recommended_action"] is None

    def test_insights_sorted_most_severe_first(self, db_session):
        _make_low_stock_alert(db_session, so_luong=3)  # cao
        _make_stale_order(db_session, hours_old=48)  # binh_thuong (count < 5)

        insights = agent_service.get_insights(db_session)

        severities = [i["severity"] for i in insights]
        assert severities == sorted(severities, key=lambda s: {"cao": 0, "binh_thuong": 1, "thap": 2}[s])


class TestProposeAction:
    def test_read_only_tool_executes_immediately_without_a_row(self, db_session, admin_user):
        result = agent_service.propose_action(db_session, "get_alert_summary", {}, admin_user)

        assert result["executed"] is True
        assert result["pending"] is False
        assert db_session.query(AgentAction).count() == 0

    def test_mutating_tool_creates_pending_row_and_does_not_execute(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)

        result = agent_service.propose_action(
            db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user, ly_do="restocked"
        )

        assert result["pending"] is True
        assert result["action"]["trang_thai"] == "de_xuat"
        db_session.refresh(alert)
        assert alert.trang_thai == "chua_xu_ly"  # untouched until approved

    def test_invalid_tool_name_raises_404(self, db_session, admin_user):
        with pytest.raises(DomainError) as exc_info:
            agent_service.propose_action(db_session, "not_a_tool", {}, admin_user)
        assert exc_info.value.status_code == 404

    def test_missing_required_param_raises_400(self, db_session, admin_user):
        with pytest.raises(DomainError) as exc_info:
            agent_service.propose_action(db_session, "resolve_alert", {}, admin_user)
        assert exc_info.value.status_code == 400


class TestApproveAction:
    def test_approve_executes_the_underlying_tool(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        proposal = agent_service.propose_action(
            db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user
        )
        action_id = proposal["action"]["action_id"]

        result = agent_service.approve_action(db_session, action_id, admin_user)

        assert result["trang_thai"] == "hoan_thanh"
        assert result["nguoidung_duyet_id"] == admin_user.nguoidung_id
        db_session.refresh(alert)
        assert alert.trang_thai == "da_xu_ly"

    def test_approve_does_not_touch_who_proposed_it(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        proposal = agent_service.propose_action(
            db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user
        )
        action_id = proposal["action"]["action_id"]
        assert proposal["action"]["nguoidung_de_xuat_id"] == admin_user.nguoidung_id
        assert proposal["action"]["nguoidung_duyet_id"] is None

        result = agent_service.approve_action(db_session, action_id, admin_user)

        assert result["nguoidung_de_xuat_id"] == admin_user.nguoidung_id
        assert result["nguoidung_duyet_id"] == admin_user.nguoidung_id

    def test_approve_on_invalid_target_marks_action_failed_and_raises(self, db_session, admin_user):
        proposal = agent_service.propose_action(
            db_session, "resolve_alert", {"alert_id": 999999}, admin_user
        )
        action_id = proposal["action"]["action_id"]

        with pytest.raises(DomainError) as exc_info:
            agent_service.approve_action(db_session, action_id, admin_user)
        assert exc_info.value.status_code == 404

        failed = db_session.query(AgentAction).filter(AgentAction.action_id == action_id).first()
        assert failed.trang_thai == "that_bai"
        assert failed.loi is not None

    def test_cannot_approve_twice(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        proposal = agent_service.propose_action(
            db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user
        )
        action_id = proposal["action"]["action_id"]
        agent_service.approve_action(db_session, action_id, admin_user)

        with pytest.raises(DomainError) as exc_info:
            agent_service.approve_action(db_session, action_id, admin_user)
        assert exc_info.value.status_code == 400

    def test_approve_nonexistent_action_raises_404(self, db_session, admin_user):
        with pytest.raises(DomainError) as exc_info:
            agent_service.approve_action(db_session, 999999, admin_user)
        assert exc_info.value.status_code == 404


class TestRejectAction:
    def test_reject_marks_action_rejected_without_executing(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        proposal = agent_service.propose_action(
            db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user
        )
        action_id = proposal["action"]["action_id"]

        result = agent_service.reject_action(db_session, action_id, admin_user, note="not needed")

        assert result["trang_thai"] == "tu_choi"
        assert result["loi"] == "not needed"
        assert result["nguoidung_duyet_id"] == admin_user.nguoidung_id
        db_session.refresh(alert)
        assert alert.trang_thai == "chua_xu_ly"

    def test_cannot_reject_already_completed_action(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        proposal = agent_service.propose_action(
            db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user
        )
        action_id = proposal["action"]["action_id"]
        agent_service.approve_action(db_session, action_id, admin_user)

        with pytest.raises(DomainError) as exc_info:
            agent_service.reject_action(db_session, action_id, admin_user)
        assert exc_info.value.status_code == 400


class TestListActions:
    def test_filters_by_status(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        proposal = agent_service.propose_action(
            db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user
        )
        agent_service.approve_action(db_session, proposal["action"]["action_id"], admin_user)
        _make_low_stock_alert(db_session, so_luong=4)

        pending = agent_service.list_actions(db_session, trang_thai="de_xuat")
        completed = agent_service.list_actions(db_session, trang_thai="hoan_thanh")

        assert all(a["trang_thai"] == "de_xuat" for a in pending["items"])
        assert all(a["trang_thai"] == "hoan_thanh" for a in completed["items"])
        assert len(completed["items"]) == 1
        assert completed["total"] == 1

    def test_pagination_reports_total_independent_of_page_size(self, db_session, admin_user):
        for so_luong in (3, 4, 5):
            alert = _make_low_stock_alert(db_session, so_luong=so_luong)
            agent_service.propose_action(db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user)

        first_page = agent_service.list_actions(db_session, skip=0, limit=2)
        second_page = agent_service.list_actions(db_session, skip=2, limit=2)

        assert first_page["total"] == 3
        assert len(first_page["items"]) == 2
        assert second_page["total"] == 3
        assert len(second_page["items"]) == 1
        first_ids = {a["action_id"] for a in first_page["items"]}
        second_ids = {a["action_id"] for a in second_page["items"]}
        assert first_ids.isdisjoint(second_ids)

    def test_limit_is_clamped_to_a_sane_maximum(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        agent_service.propose_action(db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user)

        result = agent_service.list_actions(db_session, limit=100000)

        assert result["limit"] <= 200

    def test_stale_action_is_visible_and_can_be_reset_without_execution(self, db_session, admin_user):
        action = AgentAction(
            loai_hanh_dong="resolve_alert",
            tham_so={"alert_id": 999999},
            nguon="nhan_vien",
            phan_loai="execute",
            muc_do_uu_tien="high",
            trang_thai="dang_xu_ly",
            nguoidung_duyet_id=admin_user.nguoidung_id,
            ngay_bat_dau_xu_ly=utc_now() - timedelta(minutes=16),
        )
        db_session.add(action)
        db_session.flush()

        listed = agent_service.list_actions(db_session, trang_thai="dang_xu_ly")
        assert listed["items"][0]["is_stale"] is True

        reset = agent_service.reset_action(db_session, action.action_id, admin_user)

        assert reset["trang_thai"] == "de_xuat"
        assert reset["nguoidung_duyet_id"] is None
        assert reset["nguoidung_reset_id"] == admin_user.nguoidung_id
        assert reset["ngay_reset"] is not None
        assert reset["is_stale"] is False

    def test_recent_action_cannot_be_reset(self, db_session, admin_user):
        action = AgentAction(
            loai_hanh_dong="resolve_alert",
            tham_so={"alert_id": 999999},
            nguon="nhan_vien",
            phan_loai="execute",
            muc_do_uu_tien="high",
            trang_thai="dang_xu_ly",
            ngay_bat_dau_xu_ly=utc_now(),
        )
        db_session.add(action)
        db_session.flush()

        with pytest.raises(DomainError) as exc_info:
            agent_service.reset_action(db_session, action.action_id, admin_user)
        assert exc_info.value.status_code == 400


class TestChat:
    def test_falls_back_to_deterministic_summary_without_api_key(self, db_session, admin_user, monkeypatch):
        monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
        _make_low_stock_alert(db_session, so_luong=3)

        result = agent_service.chat(db_session, "what needs attention?", admin_user)

        assert result["used_llm"] is False
        assert "attention" in result["reply"].lower() or "Low stock" in result["reply"]
        assert len(result["insights"]) >= 1
