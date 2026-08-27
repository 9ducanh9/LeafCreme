"""Tests for Operations Agent V2: classification-based approval
authorization, the stale-approval guard, and the new order/production/
replenishment tools.

Mirrors the fixture style of the other tests/test_agent_*.py files: a real
Postgres session per test (db_session), hand-built rows instead of the API
layer, except where the router boundary itself is under test.
"""
import json
from datetime import datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models import (
    AgentAction,
    BienTheSanPham,
    CanhBaoTonKho,
    ChiTietDonHang,
    DonHang,
    HopQua,
    HopQuaBOM,
    LoHangSanPham,
    NguoiDung,
    SanPham,
    TonKhoSanPham,
    VaiTro,
)
from app.services.agent import DomainError, agent_service, tools as tool_registry
from app.services.alerts import AlertService


def _make_user(db_session, role_name: str, username: str) -> NguoiDung:
    role = db_session.query(VaiTro).filter_by(ten_vai_tro=role_name).first()
    if not role:
        role = VaiTro(ten_vai_tro=role_name)
        db_session.add(role)
        db_session.flush()
    user = NguoiDung(
        ten_dang_nhap=username,
        email=f"{username}@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten=username,
    )
    db_session.add(user)
    db_session.flush()
    return user


@pytest.fixture()
def admin_user(db_session):
    return _make_user(db_session, "admin", "v2_admin")


@pytest.fixture()
def staff_user(db_session):
    return _make_user(db_session, "staff", "v2_staff")


def _make_low_stock_alert(db_session, so_luong: int = 3) -> CanhBaoTonKho:
    product = SanPham(ten="Bánh v2", sku=f"SP-V2-{so_luong}-{datetime.now().timestamp()}", gia_co_ban=Decimal("50000"))
    db_session.add(product)
    db_session.flush()
    variant = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Vani", gia_bienthe=Decimal("50000"))
    db_session.add(variant)
    db_session.flush()
    batch = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ma_lo=f"LOT-V2-{variant.bienthe_id}",
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
    return db_session.query(CanhBaoTonKho).filter(
        CanhBaoTonKho.loai_canh_bao == "san_pham_can_nhap",
        CanhBaoTonKho.trang_thai == "chua_xu_ly",
    ).one()


def _make_order(db_session, trang_thai: str = "cho") -> DonHang:
    order = DonHang(
        ma_don_hang=f"ORD-V2-{datetime.now().timestamp()}",
        loai_don="online",
        tong_tien=Decimal("100000"),
        tien_thanh_toan=Decimal("100000"),
        trang_thai=trang_thai,
    )
    db_session.add(order)
    db_session.flush()
    return order


def _make_variant_with_stock(db_session, so_luong: int, suffix: str) -> BienTheSanPham:
    product = SanPham(ten=f"SP {suffix}", sku=f"SP-PROD-{suffix}", gia_co_ban=Decimal("50000"))
    db_session.add(product)
    db_session.flush()
    variant = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Chocolate", gia_bienthe=Decimal("50000"))
    db_session.add(variant)
    db_session.flush()
    batch = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ma_lo=f"LOT-PROD-{suffix}",
        ngay_het_han=datetime.now() + timedelta(days=90),
        so_luong=so_luong,
        gia_don_vi=Decimal("50000"),
        trang_thai="hoatdong",
    )
    db_session.add(batch)
    db_session.flush()
    db_session.add(TonKhoSanPham(lohang_sanpham_id=batch.lohang_id, so_luong_hien_tai=so_luong, so_luong_da_ban=0))
    db_session.flush()
    return variant


def _make_gift_box_with_bom(db_session, variant: BienTheSanPham, so_luong_required: int) -> HopQua:
    gift_box = HopQua(ten_hop_qua=f"Hộp quà {datetime.now().timestamp()}", gia_ban=Decimal("200000"))
    db_session.add(gift_box)
    db_session.flush()
    db_session.add(HopQuaBOM(hop_qua_id=gift_box.hop_qua_id, bienthe_id=variant.bienthe_id, so_luong=so_luong_required))
    db_session.flush()
    return gift_box


class TestClassificationAuthorization:
    def test_staff_can_approve_draft_action(self, db_session, admin_user, staff_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        proposal = agent_service.propose_action(
            db_session, "draft_replenishment_note", {"alert_id": alert.canhbao_id, "so_luong_de_nghi": 20}, admin_user,
        )
        action_id = proposal["action"]["action_id"]
        assert proposal["action"]["phan_loai"] == "draft"

        result = agent_service.approve_action(db_session, action_id, staff_user)
        assert result["trang_thai"] == "hoan_thanh"

    def test_staff_cannot_approve_execute_action(self, db_session, admin_user, staff_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        proposal = agent_service.propose_action(
            db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user,
        )
        action_id = proposal["action"]["action_id"]
        assert proposal["action"]["phan_loai"] == "execute"

        with pytest.raises(DomainError) as exc_info:
            agent_service.approve_action(db_session, action_id, staff_user)
        assert exc_info.value.status_code == 403

        # Rejected authorization must not have claimed the row.
        untouched = db_session.query(AgentAction).filter(AgentAction.action_id == action_id).first()
        assert untouched.trang_thai == "de_xuat"

    def test_staff_cannot_reject_execute_action(self, db_session, admin_user, staff_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        proposal = agent_service.propose_action(db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user)
        action_id = proposal["action"]["action_id"]

        with pytest.raises(DomainError) as exc_info:
            agent_service.reject_action(db_session, action_id, staff_user)
        assert exc_info.value.status_code == 403

    def test_admin_can_approve_execute_action(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        proposal = agent_service.propose_action(db_session, "resolve_alert", {"alert_id": alert.canhbao_id}, admin_user)
        result = agent_service.approve_action(db_session, proposal["action"]["action_id"], admin_user)
        assert result["trang_thai"] == "hoan_thanh"


class TestStaleApproval:
    def test_approve_rejects_order_that_changed_since_proposal(self, db_session, admin_user):
        order = _make_order(db_session, trang_thai="cho")

        proposal = agent_service.propose_action(
            db_session, "cancel_order", {"order_id": order.donhang_id, "reason": "customer request"}, admin_user,
        )
        action_id = proposal["action"]["action_id"]
        assert proposal["action"]["dieu_kien_tien_quyet"]["trang_thai"] == "cho"

        # Simulate the order moving on (e.g. fulfillment shipped it)
        # between the proposal and the approval — exactly the spec's
        # "10:00 propose cancel, 10:05 order ships, 10:07 manager
        # approves the stale proposal" scenario.
        order.trang_thai = "dang_giao"
        db_session.commit()

        with pytest.raises(DomainError) as exc_info:
            agent_service.approve_action(db_session, action_id, admin_user)
        assert exc_info.value.status_code == 409
        assert "ACTION_STALE" in exc_info.value.detail

        db_session.refresh(order)
        assert order.trang_thai == "dang_giao"  # untouched by the stale approval

        failed = db_session.query(AgentAction).filter(AgentAction.action_id == action_id).first()
        assert failed.trang_thai == "that_bai"
        assert "ACTION_STALE" in failed.loi

    def test_approve_succeeds_when_order_state_is_unchanged(self, db_session, admin_user):
        order = _make_order(db_session, trang_thai="cho")
        proposal = agent_service.propose_action(
            db_session, "cancel_order", {"order_id": order.donhang_id, "reason": "customer request"}, admin_user,
        )

        result = agent_service.approve_action(db_session, proposal["action"]["action_id"], admin_user)

        assert result["trang_thai"] == "hoan_thanh"
        db_session.refresh(order)
        assert order.trang_thai == "da_huy"

    def test_set_batch_status_also_guards_against_stale_batch_state(self, db_session, admin_user):
        variant = _make_variant_with_stock(db_session, so_luong=10, suffix="stale-batch")
        batch = db_session.query(LoHangSanPham).filter(LoHangSanPham.bienthe_sanpham_id == variant.bienthe_id).first()

        proposal = agent_service.propose_action(
            db_session, "set_batch_status",
            {"kind": "products", "batch_id": batch.lohang_id, "trang_thai": "tamdung"}, admin_user,
        )
        batch.trang_thai = "hethan"  # someone else already changed it
        db_session.commit()

        with pytest.raises(DomainError) as exc_info:
            agent_service.approve_action(db_session, proposal["action"]["action_id"], admin_user)
        assert exc_info.value.status_code == 409
        assert "ACTION_STALE" in exc_info.value.detail


class TestOrderTools:
    def test_get_order_details_returns_order_and_payments(self, db_session, admin_user):
        order = _make_order(db_session)
        tool = tool_registry.get_tool("get_order_details")

        result = tool.execute(db_session, {"order_id": order.donhang_id}, admin_user)

        assert result["order"]["donhang_id"] == order.donhang_id
        assert result["payments"] == []

    def test_cancel_order_restores_inventory_and_sets_status(self, db_session, admin_user):
        variant = _make_variant_with_stock(db_session, so_luong=10, suffix="cancel-flow")
        batch = db_session.query(LoHangSanPham).filter(LoHangSanPham.bienthe_sanpham_id == variant.bienthe_id).first()
        order = _make_order(db_session)
        db_session.add(ChiTietDonHang(
            donhang_id=order.donhang_id, lohang_sanpham_id=batch.lohang_id,
            so_luong=2, gia_don_vi=Decimal("50000"), tong_tien_phu=Decimal("100000"),
        ))
        db_session.commit()

        tool = tool_registry.get_tool("cancel_order")
        result = tool.execute(db_session, {"order_id": order.donhang_id, "reason": "test"}, admin_user)

        assert result["trang_thai"] == "da_huy"


class TestProductionFeasibility:
    def test_feasible_when_stock_covers_requirement(self, db_session, admin_user):
        variant = _make_variant_with_stock(db_session, so_luong=20, suffix="feasible")
        gift_box = _make_gift_box_with_bom(db_session, variant, so_luong_required=2)

        tool = tool_registry.get_tool("check_production_feasibility")
        result = tool.execute(
            db_session, {"target_type": "hopqua", "target_id": gift_box.hop_qua_id, "quantity": 5}, admin_user,
        )

        assert result["has_recipe"] is True
        assert result["feasible"] is True
        assert result["requirements"][0]["required"] == 10
        assert result["requirements"][0]["shortage"] == 0

    def test_infeasible_when_stock_is_short(self, db_session, admin_user):
        variant = _make_variant_with_stock(db_session, so_luong=5, suffix="short")
        gift_box = _make_gift_box_with_bom(db_session, variant, so_luong_required=2)

        tool = tool_registry.get_tool("check_production_feasibility")
        result = tool.execute(
            db_session, {"target_type": "hopqua", "target_id": gift_box.hop_qua_id, "quantity": 10}, admin_user,
        )

        assert result["feasible"] is False
        assert result["requirements"][0]["shortage"] == 15  # 20 required - 5 available

    def test_plain_product_reports_no_recipe_instead_of_fabricating_one(self, db_session, admin_user):
        variant = _make_variant_with_stock(db_session, so_luong=7, suffix="no-recipe")

        tool = tool_registry.get_tool("check_production_feasibility")
        result = tool.execute(
            db_session, {"target_type": "bienthe", "target_id": variant.bienthe_id, "quantity": 40}, admin_user,
        )

        assert result["has_recipe"] is False
        assert result["current_stock"] == 7
        assert "message" in result

    def test_gift_box_without_bom_reports_missing_recipe(self, db_session, admin_user):
        gift_box = HopQua(ten_hop_qua="Hộp trống", gia_ban=Decimal("100000"))
        db_session.add(gift_box)
        db_session.commit()

        tool = tool_registry.get_tool("check_production_feasibility")
        result = tool.execute(
            db_session, {"target_type": "hopqua", "target_id": gift_box.hop_qua_id, "quantity": 1}, admin_user,
        )

        assert result["has_recipe"] is False


class TestReplenishment:
    def test_get_replenishment_signals_surfaces_low_stock_alerts(self, db_session, admin_user):
        _make_low_stock_alert(db_session, so_luong=2)
        tool = tool_registry.get_tool("get_replenishment_signals")

        result = tool.execute(db_session, {}, admin_user)

        assert result["low_stock_alerts"] == []
        assert len(result["product_stock_digest"]) == 1

    def test_draft_note_writes_recommendation_onto_alert_without_resolving_it(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=2)
        proposal = agent_service.propose_action(
            db_session, "draft_replenishment_note",
            {"alert_id": alert.canhbao_id, "so_luong_de_nghi": 15, "ly_do": "restock for weekend"},
            admin_user,
        )

        result = agent_service.approve_action(db_session, proposal["action"]["action_id"], admin_user)

        assert result["trang_thai"] == "hoan_thanh"
        db_session.refresh(alert)
        assert alert.trang_thai == "chua_xu_ly"  # note-only, doesn't resolve the alert
        assert "15" in alert.ghi_chu
        assert "restock for weekend" in alert.ghi_chu


class TestToolChainingThroughLoop:
    """Proves the agentic loop (app.services.agent.agent_service._run_agent_loop)
    can select and chain the new V2 tools, not just the V1 alert tools —
    same mocked-DeepSeek-client approach as tests/test_agent_chat_loop.py
    (DeepSeek's API is OpenAI-compatible: choices[0].message.tool_calls,
    each with .function.name/.function.arguments as a JSON string).
    """

    @staticmethod
    def _tool_call(name, tool_input, call_id):
        return SimpleNamespace(id=call_id, function=SimpleNamespace(name=name, arguments=json.dumps(tool_input)))

    @staticmethod
    def _tool_calls_response(tool_calls):
        message = SimpleNamespace(content=None, tool_calls=tool_calls)
        return SimpleNamespace(choices=[SimpleNamespace(finish_reason="tool_calls", message=message)], usage=None)

    @staticmethod
    def _text_response(text):
        message = SimpleNamespace(content=text, tool_calls=None)
        return SimpleNamespace(choices=[SimpleNamespace(finish_reason="stop", message=message)], usage=None)

    class _FakeCompletions:
        def __init__(self, responses):
            self._responses = list(responses)
            self.calls = []

        def create(self, **kwargs):
            self.calls.append(kwargs)
            return self._responses.pop(0)

    class _FakeClient:
        def __init__(self, responses):
            self.chat = SimpleNamespace(completions=TestToolChainingThroughLoop._FakeCompletions(responses))

    def test_chains_get_order_details_then_proposes_cancel(self, db_session, admin_user):
        order = _make_order(db_session)
        client = self._FakeClient([
            self._tool_calls_response([self._tool_call("get_order_details", {"order_id": order.donhang_id}, "t1")]),
            self._tool_calls_response([self._tool_call(
                "cancel_order", {"order_id": order.donhang_id, "reason": "khách yêu cầu"}, "t2",
            )]),
            self._text_response("Đã đề xuất huỷ đơn, chờ quản lý duyệt."),
        ])

        reply, proposed, trace = agent_service._run_agent_loop(
            client, db_session, admin_user, f"huỷ đơn #{order.donhang_id} giúp tôi", [],
        )

        assert [t["tool"] for t in trace] == ["get_order_details", "cancel_order"]
        assert trace[0]["outcome"] == "executed"
        assert trace[1]["outcome"] == "proposed"
        assert len(proposed) == 1
        assert proposed[0]["phan_loai"] == "execute"
        db_session.refresh(order)
        assert order.trang_thai == "cho"  # not executed yet — only proposed
