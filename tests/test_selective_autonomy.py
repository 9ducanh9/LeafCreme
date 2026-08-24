"""Phase 5 regression coverage for code-governed selective autonomy."""
from contextlib import contextmanager
from dataclasses import replace
from datetime import datetime, timedelta
from decimal import Decimal

import pytest

from app.models import AgentAction, BienTheSanPham, CanhBaoTonKho, LoHangSanPham, ProactiveInsight, SanPham, TonKhoSanPham
from app.services.agent import agent_service, observability, proactive_service
from app.services.agent.action_policy import (
    APPROVAL_REQUIRED,
    AUTO_ALLOWED,
    NEVER_AUTOMATE,
    OUTCOME_AUTOMATIC,
    OUTCOME_BLOCKED,
    evaluate_automated_action,
)
from app.services.agent.proactive_actions import (
    automation_idempotency_key,
    build_alert_condition,
    insight_fingerprint,
)
from app.services.agent.tools import TOOL_REGISTRY, chat_tool_schemas, describe_tools, get_tool
from app.services.alerts import AlertService
from app.services.errors import DomainError


@pytest.fixture(autouse=True)
def no_external_ai(monkeypatch):
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)


def _make_high_expiry_alert(db_session) -> tuple[CanhBaoTonKho, LoHangSanPham]:
    product = SanPham(
        ten="Bánh selective autonomy",
        sku=f"SP-AUTO-{datetime.now().timestamp()}",
        gia_co_ban=Decimal("50000"),
    )
    db_session.add(product)
    db_session.flush()
    variant = BienTheSanPham(
        sanpham_id=product.sanpham_id,
        huong_vi="Vani",
        gia_bienthe=Decimal("50000"),
    )
    db_session.add(variant)
    db_session.flush()
    batch = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ma_lo=f"LOT-AUTO-{variant.bienthe_id}",
        ngay_het_han=datetime.now() + timedelta(days=2),
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

    generated = AlertService().generate_alerts(db_session, low_stock_threshold=10, expiring_days=7)
    assert generated["expiring_created"] == 1
    alert = db_session.query(CanhBaoTonKho).filter(
        CanhBaoTonKho.lohang_sanpham_id == batch.lohang_id,
        CanhBaoTonKho.loai_canh_bao == "sap_het_han",
    ).one()
    return alert, batch


def _notification_params(condition: dict) -> dict:
    fingerprint = insight_fingerprint(condition)
    return {
        "source_alert_id": condition["alert_id"],
        "fingerprint": fingerprint,
        "scenario": "expiring_batch",
        "severity": condition["severity"],
        "title": "Hạn dùng cần xử lý",
        "recommendation": "Kiểm tra lô trước khi xử lý.",
        "evidence": condition,
        "tool_trace": [],
        "prompt_version": proactive_service.PROACTIVE_PROMPT_VERSION,
        "model": None,
        "used_llm": False,
    }


class TestActionPolicy:
    def test_every_registered_tool_has_an_explicit_policy(self):
        assert {tool.execution_policy for tool in TOOL_REGISTRY.values()} <= {
            AUTO_ALLOWED,
            APPROVAL_REQUIRED,
            NEVER_AUTOMATE,
        }
        assert get_tool("cancel_order").execution_policy == NEVER_AUTOMATE
        assert get_tool("set_batch_status").execution_policy == APPROVAL_REQUIRED
        assert get_tool("create_proactive_notification").execution_policy == AUTO_ALLOWED
        assert evaluate_automated_action(get_tool("create_proactive_notification")).outcome == OUTCOME_AUTOMATIC

    def test_user_context_tools_cannot_run_unattended(self):
        """The unattended executor passes current_user=None, so any tool whose
        call path dereferences it must be stopped by the gate rather than
        failing inside the domain layer at runtime.

        Ordered before the read-only shortcut on purpose: get_order_details is
        classified "read" yet OrderService.get_order does a role check on
        current_user, so "read-only therefore safe" is not sound.
        """
        decision = evaluate_automated_action(get_tool("get_order_details"))
        assert decision.outcome == OUTCOME_BLOCKED
        assert "authenticated user" in decision.reason

        for name in ("generate_alerts", "create_proactive_notification"):
            tool = get_tool(name)
            assert tool.requires_user_context is False, f"{name} is auto-executable"
            assert evaluate_automated_action(tool).outcome == OUTCOME_AUTOMATIC

    def test_auto_execute_with_user_context_is_rejected_at_construction(self):
        """Defence in depth: the contradiction cannot even be declared."""
        with pytest.raises(ValueError, match="requires user context"):
            replace(get_tool("generate_alerts"), requires_user_context=True)

    def test_unreviewed_tools_are_excluded_from_automation_by_default(self):
        """requires_user_context defaults to True, so promoting a tool to
        AUTO_ALLOWED is not by itself enough to get it automated."""
        assert get_tool("resolve_alert").requires_user_context is True
        promoted = replace(get_tool("resolve_alert"), execution_policy=AUTO_ALLOWED)
        assert evaluate_automated_action(promoted).outcome == OUTCOME_BLOCKED

    def test_internal_auto_tool_is_not_exposed_to_the_llm_or_action_picker(self):
        chat_names = {row["function"]["name"] for row in chat_tool_schemas()}
        picker_names = {row["name"] for row in describe_tools(include_internal=False)}
        assert "create_proactive_notification" not in chat_names
        assert "create_proactive_notification" not in picker_names


class TestSelectiveAutonomyExecution:
    def test_expiry_scenario_executes_once_and_records_full_audit(self, db_session, monkeypatch):
        alert, _ = _make_high_expiry_alert(db_session)

        @contextmanager
        def fake_trace(*args, **kwargs):
            class Span:
                trace_id = "a" * 32

            yield Span()

        monkeypatch.setattr(observability, "trace_proactive_evaluation", fake_trace)
        monkeypatch.setattr(observability, "flush", lambda: None)

        first = proactive_service.refresh_expiring_batch_insights(db_session)
        second = proactive_service.refresh_expiring_batch_insights(db_session)

        assert first["created"] == 1
        assert first["failed"] == 0
        assert second["created"] == 0
        assert second["skipped"] == 1
        action = db_session.query(AgentAction).filter(
            AgentAction.loai_hanh_dong == "create_proactive_notification"
        ).one()
        insight = db_session.query(ProactiveInsight).filter(
            ProactiveInsight.source_alert_id == alert.canhbao_id
        ).one()
        assert action.trang_thai == "hoan_thanh"
        assert action.execution_policy == AUTO_ALLOWED
        assert action.execution_mode == "automatic"
        assert action.is_idempotent is True
        assert action.execution_attempts == 1
        assert action.idempotency_key.startswith("proactive-notification:")
        assert action.trigger_context["source_alert_id"] == alert.canhbao_id
        assert action.reasoning_reference.startswith("prompt=operations-agent-proactive-v1")
        assert action.langfuse_trace_id == "a" * 32
        assert action.proactive_insight_id == insight.insight_id
        assert action.ket_qua["created"] is True

    def test_duplicate_idempotency_key_does_not_execute_twice(self, db_session):
        alert, _ = _make_high_expiry_alert(db_session)
        condition = build_alert_condition(AlertService().get_alert(db_session, alert.canhbao_id))
        params = _notification_params(condition)
        kwargs = {
            "idempotency_key": automation_idempotency_key(condition),
            "trigger_context": {"source": "test", "source_alert_id": alert.canhbao_id},
            "reasoning_reference": "test:duplicate",
            "preconditions": condition,
        }

        first = agent_service.execute_automated_action(
            db_session, "create_proactive_notification", params, **kwargs
        )
        second = agent_service.execute_automated_action(
            db_session, "create_proactive_notification", params, **kwargs
        )

        assert first["executed"] is True
        assert second["executed"] is True
        assert second["deduplicated"] is True
        assert db_session.query(AgentAction).count() == 1
        assert db_session.query(ProactiveInsight).count() == 1

        changed = dict(params)
        changed["title"] = "Different request"
        with pytest.raises(DomainError, match="Idempotency key"):
            agent_service.execute_automated_action(
                db_session, "create_proactive_notification", changed, **kwargs
            )

    def test_reopening_a_superseded_notification_is_also_policy_audited(self, db_session):
        alert, _ = _make_high_expiry_alert(db_session)
        proactive_service.refresh_expiring_batch_insights(db_session)
        insight = db_session.query(ProactiveInsight).filter(
            ProactiveInsight.source_alert_id == alert.canhbao_id
        ).one()
        insight.trang_thai = "superseded"
        insight.ngay_thay_the = datetime.now()
        db_session.commit()

        result = proactive_service.refresh_expiring_batch_insights(db_session)
        db_session.refresh(insight)

        assert result["reopened"] == 1
        assert insight.trang_thai == "unread"
        actions = db_session.query(AgentAction).filter(
            AgentAction.loai_hanh_dong == "create_proactive_notification"
        ).all()
        assert len(actions) == 2
        assert all(action.execution_policy == AUTO_ALLOWED for action in actions)
        assert all(action.trang_thai == "hoan_thanh" for action in actions)

    def test_stale_condition_is_revalidated_and_not_executed(self, db_session):
        alert, batch = _make_high_expiry_alert(db_session)
        condition = build_alert_condition(AlertService().get_alert(db_session, alert.canhbao_id))
        batch.ngay_het_han = datetime.now() + timedelta(days=30)
        db_session.commit()

        result = agent_service.execute_automated_action(
            db_session,
            "create_proactive_notification",
            _notification_params(condition),
            idempotency_key=automation_idempotency_key(condition),
            trigger_context={"source": "test", "source_alert_id": alert.canhbao_id},
            reasoning_reference="test:stale",
            preconditions=condition,
        )

        assert result["executed"] is False
        assert result["action"]["trang_thai"] == "that_bai"
        assert "ACTION_STALE" in result["action"]["loi"]
        assert db_session.query(ProactiveInsight).count() == 0

    def test_unexpected_failure_rolls_back_partial_business_state(self, db_session, monkeypatch):
        alert, _ = _make_high_expiry_alert(db_session)
        condition = build_alert_condition(AlertService().get_alert(db_session, alert.canhbao_id))
        original = get_tool("create_proactive_notification")

        def failing_execute(db, params, current_user):
            row = db.query(CanhBaoTonKho).filter(
                CanhBaoTonKho.canhbao_id == params["source_alert_id"]
            ).one()
            row.trang_thai = "dang_xu_ly"
            raise RuntimeError("simulated failure")

        monkeypatch.setitem(
            TOOL_REGISTRY,
            "create_proactive_notification",
            replace(original, execute=failing_execute),
        )
        result = agent_service.execute_automated_action(
            db_session,
            "create_proactive_notification",
            _notification_params(condition),
            idempotency_key=automation_idempotency_key(condition),
            trigger_context={"source": "test"},
            reasoning_reference="test:rollback",
            preconditions=condition,
        )
        db_session.refresh(alert)

        assert result["executed"] is False
        assert result["action"]["ket_qua"]["outcome"] == "failed"
        assert alert.trang_thai == "chua_xu_ly"
        assert db_session.query(ProactiveInsight).count() == 0

    def test_approval_policy_proposes_but_does_not_mutate(self, db_session):
        alert, _ = _make_high_expiry_alert(db_session)
        result = agent_service.execute_automated_action(
            db_session,
            "resolve_alert",
            {"alert_id": alert.canhbao_id},
            idempotency_key=f"test-resolve:{alert.canhbao_id}",
            trigger_context={"source": "test"},
            reasoning_reference="test:approval",
        )
        db_session.refresh(alert)

        assert result["pending"] is True
        assert result["action"]["execution_policy"] == APPROVAL_REQUIRED
        assert result["action"]["execution_mode"] == "human_approval"
        assert alert.trang_thai == "chua_xu_ly"

    def test_never_automate_policy_blocks_cancel_order_before_domain_call(self, db_session):
        result = agent_service.execute_automated_action(
            db_session,
            "cancel_order",
            {"order_id": 999999},
            idempotency_key="test-never-cancel:999999",
            trigger_context={"source": "test"},
            reasoning_reference="test:never",
        )

        assert result["executed"] is False
        assert result["pending"] is False
        assert result["action"]["execution_policy"] == NEVER_AUTOMATE
        assert result["action"]["trang_thai"] == "that_bai"
        assert result["action"]["loi"].startswith("POLICY_BLOCKED")
