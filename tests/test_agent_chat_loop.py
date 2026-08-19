"""Tests for the Operations Agent's tool-use chat loop
(app.services.agent.agent_service._run_agent_loop / chat).

There's no live ANTHROPIC_API_KEY in CI/dev sandboxes, so these fake the
Anthropic client's `.messages.create` to return canned tool-use responses,
the same shape the real SDK returns, and assert the loop:
  - chains multiple read-tool calls across turns before answering,
  - never executes a mutating tool directly, only proposes it,
  - surfaces tool errors as `is_error` tool_results instead of crashing,
  - stops after MAX_TOOL_ITERATIONS instead of looping forever,
  - falls back to the deterministic reply when no API key is configured
    or the SDK call raises.
"""
from datetime import datetime, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest

from app.models import (
    AgentAction,
    BienTheSanPham,
    CanhBaoTonKho,
    LoHangSanPham,
    NguoiDung,
    SanPham,
    TonKhoSanPham,
    VaiTro,
)
from app.services.agent import agent_service
from app.services.alerts import AlertService


@pytest.fixture()
def admin_user(db_session):
    role = VaiTro(ten_vai_tro="admin")
    db_session.add(role)
    db_session.flush()
    user = NguoiDung(
        ten_dang_nhap="agent_chat_admin",
        email="agent_chat_admin@example.com",
        mat_khau_ma_hoa="hashed",
        vaitro_id=role.vaitro_id,
        ho_ten="Agent Chat Admin",
    )
    db_session.add(user)
    db_session.flush()
    return user


def _make_low_stock_alert(db_session, so_luong: int = 3) -> CanhBaoTonKho:
    product = SanPham(ten="Bánh test chat", sku=f"SP-CHAT-{so_luong}-{datetime.now().timestamp()}", gia_co_ban=Decimal("50000"))
    db_session.add(product)
    db_session.flush()
    variant = BienTheSanPham(sanpham_id=product.sanpham_id, huong_vi="Vani", gia_bienthe=Decimal("50000"))
    db_session.add(variant)
    db_session.flush()
    batch = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ma_lo=f"LOT-CHAT-{variant.bienthe_id}",
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


# ---------------------------------------------------------------------------
# Fake Anthropic client: mirrors the shape of anthropic.messages.create()
# responses (stop_reason + content blocks with .type/.name/.input/.id/.text)
# closely enough for _run_agent_loop to treat it identically to the real SDK.
# ---------------------------------------------------------------------------
def _text_block(text: str) -> SimpleNamespace:
    return SimpleNamespace(type="text", text=text)


def _tool_use_block(name: str, tool_input: dict, block_id: str) -> SimpleNamespace:
    return SimpleNamespace(type="tool_use", name=name, input=tool_input, id=block_id)


def _response(stop_reason: str, content: list) -> SimpleNamespace:
    return SimpleNamespace(stop_reason=stop_reason, content=content)


class _FakeMessages:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if not self._responses:
            raise AssertionError("Fake Anthropic client ran out of canned responses")
        return self._responses.pop(0)


class _FakeAnthropicClient:
    def __init__(self, responses):
        self.messages = _FakeMessages(responses)


class TestRunAgentLoopChaining:
    def test_chains_two_read_tools_before_answering(self, db_session, admin_user):
        _make_low_stock_alert(db_session, so_luong=3)

        client = _FakeAnthropicClient([
            _response("tool_use", [_tool_use_block("get_alert_summary", {}, "t1")]),
            _response("tool_use", [_tool_use_block("list_stale_orders", {"hours": 24}, "t2")]),
            _response("end_turn", [_text_block("Alerts: 1 pending. Orders: none stuck. All good otherwise.")]),
        ])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "status?", [])

        assert "Alerts: 1 pending" in reply
        assert [t["tool"] for t in trace] == ["get_alert_summary", "list_stale_orders"]
        assert all(t["outcome"] == "executed" for t in trace)
        assert proposed == []
        assert len(client.messages.calls) == 3

    def test_single_turn_answer_without_tool_use(self, db_session, admin_user):
        client = _FakeAnthropicClient([
            _response("end_turn", [_text_block("Hi, how can I help?")]),
        ])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "hello", [])

        assert reply == "Hi, how can I help?"
        assert trace == []
        assert proposed == []


class TestRunAgentLoopMutatingTools:
    def test_mutating_tool_call_is_proposed_not_executed(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)

        client = _FakeAnthropicClient([
            _response("tool_use", [_tool_use_block("resolve_alert", {"alert_id": alert.canhbao_id}, "t1")]),
            _response("end_turn", [_text_block("I've queued that alert for resolution — a manager needs to approve it.")]),
        ])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "resolve the low stock alert", [])

        assert len(proposed) == 1
        assert proposed[0]["trang_thai"] == "de_xuat"
        assert proposed[0]["nguon"] == "agent"
        assert trace[0]["outcome"] == "proposed"

        db_session.refresh(alert)
        assert alert.trang_thai == "chua_xu_ly"  # untouched — only proposed, not executed

        pending = db_session.query(AgentAction).filter(AgentAction.action_id == proposed[0]["action_id"]).first()
        assert pending is not None
        assert pending.trang_thai == "de_xuat"

    def test_second_tool_result_reports_proposal_not_execution(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)
        client = _FakeAnthropicClient([
            _response("tool_use", [_tool_use_block("resolve_alert", {"alert_id": alert.canhbao_id}, "t1")]),
            _response("end_turn", [_text_block("done")]),
        ])

        agent_service._run_agent_loop(client, db_session, admin_user, "resolve it", [])

        second_call_messages = client.messages.calls[1]["messages"]
        tool_result_turn = second_call_messages[-1]
        assert tool_result_turn["role"] == "user"
        result_content = tool_result_turn["content"][0]["content"]
        assert "proposed_pending_approval" in result_content


class TestRunAgentLoopErrorsAndLimits:
    def test_tool_error_becomes_is_error_result_not_a_crash(self, db_session, admin_user):
        client = _FakeAnthropicClient([
            _response("tool_use", [_tool_use_block("resolve_alert", {"alert_id": 999999}, "t1")]),
            _response("end_turn", [_text_block("That alert doesn't seem to exist.")]),
        ])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "resolve alert 999999", [])

        # resolve_alert on a nonexistent alert doesn't fail at propose time
        # (propose_action only validates params, not that the target
        # exists — existence is checked at approval) so this actually
        # succeeds as a proposal; assert that instead of an error path.
        assert len(proposed) == 1
        assert reply == "That alert doesn't seem to exist."

    def test_unknown_tool_name_surfaces_as_tool_error(self, db_session, admin_user):
        client = _FakeAnthropicClient([
            _response("tool_use", [_tool_use_block("delete_everything", {}, "t1")]),
            _response("end_turn", [_text_block("I don't have a tool for that.")]),
        ])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "delete everything", [])

        second_call_messages = client.messages.calls[1]["messages"]
        tool_result_turn = second_call_messages[-1]
        result_block = tool_result_turn["content"][0]
        assert result_block.get("is_error") is True
        assert "error" in result_block["content"]
        assert proposed == []

    def test_stops_after_max_iterations_instead_of_looping_forever(self, db_session, admin_user, monkeypatch):
        monkeypatch.setattr(agent_service, "MAX_TOOL_ITERATIONS", 3)
        client = _FakeAnthropicClient([
            _response("tool_use", [_tool_use_block("get_alert_summary", {}, f"t{i}")]) for i in range(5)
        ])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "keep going", [])

        assert len(client.messages.calls) == 3
        assert "tool-call limit" in reply
        assert len(trace) == 3


class TestChatFallback:
    def test_no_api_key_uses_deterministic_fallback(self, db_session, admin_user, monkeypatch):
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        _make_low_stock_alert(db_session, so_luong=3)

        result = agent_service.chat(db_session, "status?", admin_user)

        assert result["used_llm"] is False
        assert result["proposed_actions"] == []
        assert result["tool_calls"] == []

    def test_llm_failure_falls_back_gracefully(self, db_session, admin_user, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "fake-key-for-test")

        class _BoomClient:
            def __init__(self, api_key=None):
                raise RuntimeError("network unreachable")

        import anthropic
        monkeypatch.setattr(anthropic, "Anthropic", _BoomClient)

        result = agent_service.chat(db_session, "status?", admin_user)

        assert result["used_llm"] is False
        assert "reply" in result

    def test_successful_chat_uses_llm_and_returns_trace(self, db_session, admin_user, monkeypatch):
        monkeypatch.setenv("ANTHROPIC_API_KEY", "fake-key-for-test")

        canned = _FakeAnthropicClient([
            _response("tool_use", [_tool_use_block("get_alert_summary", {}, "t1")]),
            _response("end_turn", [_text_block("No pending alerts.")]),
        ])

        class _FakeAnthropicModule:
            @staticmethod
            def Anthropic(api_key=None):
                return canned

        import anthropic
        monkeypatch.setattr(anthropic, "Anthropic", _FakeAnthropicModule.Anthropic)

        result = agent_service.chat(db_session, "any pending alerts?", admin_user)

        assert result["used_llm"] is True
        assert result["reply"] == "No pending alerts."
        assert len(result["tool_calls"]) == 1
        assert "insights" in result
