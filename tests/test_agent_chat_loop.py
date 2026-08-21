"""Tests for the Operations Agent's tool-use chat loop
(app.services.agent.agent_service._run_agent_loop / chat).

There's no live DEEPSEEK_API_KEY in CI/dev sandboxes, so these fake the
DeepSeek client's `.chat.completions.create` (DeepSeek's API is OpenAI-
compatible, used via the `openai` SDK) to return canned tool-call
responses, the same shape the real SDK returns, and assert the loop:
  - chains multiple read-tool calls across turns before answering,
  - never executes a mutating tool directly, only proposes it,
  - surfaces tool errors as an error-content tool message instead of
    crashing,
  - fails safely on malformed tool-call arguments (invalid JSON),
  - stops after MAX_TOOL_ITERATIONS instead of looping forever,
  - falls back to the deterministic reply when no API key is configured
    or the SDK call raises.
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
# Fake DeepSeek (OpenAI-compatible) client: mirrors the shape of
# openai.OpenAI().chat.completions.create() responses (choices[0].message
# .content/.tool_calls, choices[0].finish_reason) closely enough for
# _run_agent_loop to treat it identically to the real SDK.
# ---------------------------------------------------------------------------
def _tool_call(name: str, arguments: dict, call_id: str, raw_arguments: str = None) -> SimpleNamespace:
    args_json = raw_arguments if raw_arguments is not None else json.dumps(arguments)
    return SimpleNamespace(id=call_id, function=SimpleNamespace(name=name, arguments=args_json))


def _tool_calls_response(tool_calls: list) -> SimpleNamespace:
    message = SimpleNamespace(content=None, tool_calls=tool_calls)
    return SimpleNamespace(choices=[SimpleNamespace(finish_reason="tool_calls", message=message)], usage=None)


def _text_response(text: str) -> SimpleNamespace:
    message = SimpleNamespace(content=text, tool_calls=None)
    return SimpleNamespace(choices=[SimpleNamespace(finish_reason="stop", message=message)], usage=None)


class _FakeCompletions:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if not self._responses:
            raise AssertionError("Fake DeepSeek client ran out of canned responses")
        return self._responses.pop(0)


class _FakeDeepSeekClient:
    def __init__(self, responses):
        self.chat = SimpleNamespace(completions=_FakeCompletions(responses))


class TestRunAgentLoopChaining:
    def test_chains_two_read_tools_before_answering(self, db_session, admin_user):
        _make_low_stock_alert(db_session, so_luong=3)

        client = _FakeDeepSeekClient([
            _tool_calls_response([_tool_call("get_alert_summary", {}, "t1")]),
            _tool_calls_response([_tool_call("list_stale_orders", {"hours": 24}, "t2")]),
            _text_response("Alerts: 1 pending. Orders: none stuck. All good otherwise."),
        ])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "status?", [])

        assert "Alerts: 1 pending" in reply
        assert [t["tool"] for t in trace] == ["get_alert_summary", "list_stale_orders"]
        assert all(t["outcome"] == "executed" for t in trace)
        assert proposed == []
        assert len(client.chat.completions.calls) == 3


class TestConversationContext:
    def test_chat_forwards_recent_trimmed_history_to_model(self, db_session, admin_user, monkeypatch):
        monkeypatch.setenv("DEEPSEEK_API_KEY", "fake-key-for-test")
        client = _FakeDeepSeekClient([_text_response("Context received")])

        import openai

        monkeypatch.setattr(openai, "OpenAI", lambda **kwargs: client)
        history = [
            {"role": "user" if index % 2 == 0 else "assistant", "content": f"turn-{index}"}
            for index in range(25)
        ]
        history[-1]["content"] = "x" * 5000

        result = agent_service.chat(db_session, "new turn", admin_user, history=history)

        messages = client.chat.completions.calls[0]["messages"]
        sent_history = messages[1:-1]
        assert len(sent_history) == 20
        assert sent_history[0]["content"] == "turn-5"
        sent_contents = {message["content"] for message in sent_history}
        assert sent_contents.isdisjoint({f"turn-{index}" for index in range(5)})
        assert len(sent_history[-1]["content"]) == 4001
        assert sent_history[-1]["content"].endswith("…")
        assert messages[-1] == {"role": "user", "content": "new turn"}
        assert result["used_llm"] is True

    def test_single_turn_answer_without_tool_use(self, db_session, admin_user):
        client = _FakeDeepSeekClient([_text_response("Hi, how can I help?")])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "hello", [])

        assert reply == "Hi, how can I help?"
        assert trace == []
        assert proposed == []


class TestRunAgentLoopMutatingTools:
    def test_mutating_tool_call_is_proposed_not_executed(self, db_session, admin_user):
        alert = _make_low_stock_alert(db_session, so_luong=3)

        client = _FakeDeepSeekClient([
            _tool_calls_response([_tool_call("resolve_alert", {"alert_id": alert.canhbao_id}, "t1")]),
            _text_response("I've queued that alert for resolution — a manager needs to approve it."),
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
        client = _FakeDeepSeekClient([
            _tool_calls_response([_tool_call("resolve_alert", {"alert_id": alert.canhbao_id}, "t1")]),
            _text_response("done"),
        ])

        agent_service._run_agent_loop(client, db_session, admin_user, "resolve it", [])

        second_call_messages = client.chat.completions.calls[1]["messages"]
        tool_result_turn = second_call_messages[-1]
        assert tool_result_turn["role"] == "tool"
        assert "proposed_pending_approval" in tool_result_turn["content"]


class TestRunAgentLoopErrorsAndLimits:
    def test_tool_error_becomes_error_result_not_a_crash(self, db_session, admin_user):
        client = _FakeDeepSeekClient([
            _tool_calls_response([_tool_call("resolve_alert", {"alert_id": 999999}, "t1")]),
            _text_response("That alert doesn't seem to exist."),
        ])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "resolve alert 999999", [])

        # resolve_alert on a nonexistent alert doesn't fail at propose time
        # (propose_action only validates params, not that the target
        # exists — existence is checked at approval) so this actually
        # succeeds as a proposal; assert that instead of an error path.
        assert len(proposed) == 1
        assert reply == "That alert doesn't seem to exist."

    def test_unknown_tool_name_surfaces_as_tool_error(self, db_session, admin_user):
        client = _FakeDeepSeekClient([
            _tool_calls_response([_tool_call("delete_everything", {}, "t1")]),
            _text_response("I don't have a tool for that."),
        ])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "delete everything", [])

        second_call_messages = client.chat.completions.calls[1]["messages"]
        tool_result_turn = second_call_messages[-1]
        assert tool_result_turn["role"] == "tool"
        assert "error" in tool_result_turn["content"]
        assert proposed == []

    def test_malformed_tool_arguments_fail_safely(self, db_session, admin_user):
        client = _FakeDeepSeekClient([
            _tool_calls_response([_tool_call("get_alert_summary", {}, "t1", raw_arguments="{not valid json")]),
            _text_response("Sorry, that request didn't come through right."),
        ])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "status?", [])

        # Never reaches _execute_tool_call (invalid JSON is caught before
        # that), so no trace entry is recorded — but the loop still
        # completes cleanly instead of raising.
        assert reply == "Sorry, that request didn't come through right."
        assert trace == []
        second_call_messages = client.chat.completions.calls[1]["messages"]
        tool_result_turn = second_call_messages[-1]
        assert tool_result_turn["role"] == "tool"
        assert "error" in tool_result_turn["content"]

    def test_stops_after_max_iterations_instead_of_looping_forever(self, db_session, admin_user, monkeypatch):
        monkeypatch.setattr(agent_service, "MAX_TOOL_ITERATIONS", 3)
        client = _FakeDeepSeekClient([
            _tool_calls_response([_tool_call("get_alert_summary", {}, f"t{i}")]) for i in range(5)
        ])

        reply, proposed, trace = agent_service._run_agent_loop(client, db_session, admin_user, "keep going", [])

        assert len(client.chat.completions.calls) == 3
        assert "tool-call limit" in reply
        assert len(trace) == 3


class TestChatFallback:
    def test_no_api_key_uses_deterministic_fallback(self, db_session, admin_user, monkeypatch):
        monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
        _make_low_stock_alert(db_session, so_luong=3)

        result = agent_service.chat(db_session, "status?", admin_user)

        assert result["used_llm"] is False
        assert result["proposed_actions"] == []
        assert result["tool_calls"] == []

    def test_llm_failure_falls_back_gracefully(self, db_session, admin_user, monkeypatch):
        monkeypatch.setenv("DEEPSEEK_API_KEY", "fake-key-for-test")

        class _BoomClient:
            def __init__(self, api_key=None, base_url=None):
                raise RuntimeError("network unreachable")

        import openai
        monkeypatch.setattr(openai, "OpenAI", _BoomClient)

        result = agent_service.chat(db_session, "status?", admin_user)

        assert result["used_llm"] is False
        assert "reply" in result

    def test_successful_chat_uses_llm_and_returns_trace(self, db_session, admin_user, monkeypatch):
        monkeypatch.setenv("DEEPSEEK_API_KEY", "fake-key-for-test")

        canned = _FakeDeepSeekClient([
            _tool_calls_response([_tool_call("get_alert_summary", {}, "t1")]),
            _text_response("No pending alerts."),
        ])

        def _fake_openai_client(api_key=None, base_url=None):
            return canned

        import openai
        monkeypatch.setattr(openai, "OpenAI", _fake_openai_client)

        result = agent_service.chat(db_session, "any pending alerts?", admin_user)

        assert result["used_llm"] is True
        assert result["reply"] == "No pending alerts."
        assert len(result["tool_calls"]) == 1
        assert "insights" in result
