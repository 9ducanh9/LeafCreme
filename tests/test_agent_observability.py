"""Behavioral guarantees for optional Operations Agent observability."""
from contextlib import contextmanager

from app.services.agent import observability
from app.services.agent.redaction import REDACTED


class _Observation:
    def __init__(self):
        self.updates = []

    def update(self, **kwargs):
        self.updates.append(kwargs)


class _Client:
    def __init__(self):
        self.started = []
        self.observations = []
        self.flush_count = 0

    @contextmanager
    def start_as_current_observation(self, **kwargs):
        self.started.append(kwargs)
        observation = _Observation()
        self.observations.append(observation)
        yield observation

    def flush(self):
        self.flush_count += 1


def test_observability_payloads_are_redacted(monkeypatch):
    client = _Client()
    monkeypatch.setattr(observability, "_get_client", lambda: client)

    with observability.trace_tool_call(
        "get_order_details",
        {"so_dien_thoai_khach": "0912345678", "email": "customer@example.com"},
    ) as span:
        observability.safe_update(
            span,
            output={
                "ten_khach_hang": "Nguyen Van A",
                "so_dien_thoai_khach": "0912345678",
                "trang_thai": "cho",
            },
        )

    assert client.started[0]["input"] == {
        "so_dien_thoai_khach": REDACTED,
        "email": REDACTED,
    }
    assert client.observations[0].updates[0]["output"] == {
        "ten_khach_hang": REDACTED,
        "so_dien_thoai_khach": REDACTED,
        "trang_thai": "cho",
    }


def test_observability_failures_never_escape_context_managers_or_flush(monkeypatch):
    def fail_get_client():
        raise RuntimeError("Langfuse unavailable")

    monkeypatch.setattr(observability, "_get_client", fail_get_client)

    with observability.trace_conversation(1, "status?") as conversation:
        assert conversation is None
    with observability.trace_llm_call("deepseek-chat", 0) as generation:
        assert generation is None
    with observability.trace_tool_call("get_alert_summary", {}) as tool:
        assert tool is None
    observability.flush()
