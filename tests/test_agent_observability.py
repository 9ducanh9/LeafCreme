"""Behavioral guarantees for optional Operations Agent observability."""
from contextlib import contextmanager
import json
from types import SimpleNamespace

import pytest
from threading import Event, Lock, Thread
from langfuse._client.attributes import create_generation_attributes

from app.services.agent import observability
from app.services.agent.redaction import REDACTED


class _Observation:
    def __init__(self):
        self.updates = []

    def update(self, **kwargs):
        self.updates.append(kwargs)


def test_flush_does_not_block_caller_and_coalesces_while_exporter_waits(monkeypatch):
    started, release, finished, returned = Event(), Event(), Event(), Event()
    calls = []

    class Client:
        def flush(self):
            calls.append(1)
            started.set()
            release.wait(2)
            finished.set()

    monkeypatch.setattr(observability, "_get_client", lambda: Client())

    def request():
        observability.flush()
        returned.set()

    caller = Thread(target=request)
    caller.start()
    try:
        assert started.wait(1)
        assert returned.wait(0.2), "Request caller is waiting for SDK export"
        for _ in range(20):
            observability.flush()
        assert len(calls) == 1
    finally:
        release.set()
        caller.join(1)
        assert finished.wait(1)


def test_flush_worker_failure_releases_slot():
    lock = Lock()
    lock.acquire()

    class Client:
        def flush(self):
            raise RuntimeError("Synthetic SDK failure")

    observability._flush_background(Client(), lock)
    assert not lock.locked()


def test_flush_thread_start_failure_releases_slot(monkeypatch):
    lock = Lock()

    class BrokenThread:
        def __init__(self, **kwargs):
            pass

        def start(self):
            raise RuntimeError("Synthetic thread start failure")

    monkeypatch.setattr(observability, "_flush_lock", lock)
    monkeypatch.setattr(observability, "_get_client", lambda: _Client())
    monkeypatch.setattr(observability, "Thread", BrokenThread)
    observability.flush()
    assert not lock.locked()


def test_body_exception_is_not_given_to_sdk_automatic_recording():
    observation = _Observation()
    exits = []

    class Context:
        def __enter__(self):
            return observation

        def __exit__(self, *args):
            exits.append(args)

    error = RuntimeError("Synthetic private error")
    with pytest.raises(RuntimeError) as raised:
        with observability._best_effort_context(Context):
            raise error
    assert raised.value is error
    assert exits == [(None, None, None)]
    assert observation.updates == [{"level": "ERROR", "status_message": "RuntimeError"}]


@pytest.mark.parametrize("input_count,output_count,expected", [
    (120, 30, {"input": 120, "output": 30}),
    (0, 0, {"input": 0, "output": 0}),
    (None, 4, {"output": 4}),
    ("120", True, None),
    (-1, None, None),
])
def test_usage_metrics_survive_redaction_without_unmasking_secrets(input_count, output_count, expected):
    observation = _Observation()
    usage = SimpleNamespace(prompt_tokens=input_count, completion_tokens=output_count)
    observability.safe_update(observation,
                              usage_details=observability.token_usage_details(usage),
                              metadata={"access_token": "synthetic-secret", "email": "synthetic@example.test"})
    assert observation.updates[0]["usage_details"] == expected
    assert observation.updates[0]["metadata"]["access_token"] == REDACTED
    assert observation.updates[0]["metadata"]["email"] == REDACTED
    attributes = create_generation_attributes(**observation.updates[0])
    usage_attributes = {key: value for key, value in attributes.items() if "usage" in key}
    if expected is None:
        assert not usage_attributes
    else:
        assert len(usage_attributes) == 1
        assert json.loads(next(iter(usage_attributes.values()))) == expected


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


def test_observation_names_are_stable_and_errors_are_recorded(monkeypatch):
    client = _Client()
    monkeypatch.setattr(observability, "_get_client", lambda: client)

    with pytest.raises(RuntimeError, match="provider unavailable"):
        with observability.trace_llm_call("deepseek-chat", 2) as _generation:
            assert client.started[-1]["name"] == "agent-llm-call"
            assert client.started[-1]["metadata"] == {"iteration": 2}
            raise RuntimeError("provider unavailable")

    assert client.observations[-1].updates[-1] == {
        "level": "ERROR",
        "status_message": "RuntimeError",
    }


def test_trace_body_exceptions_are_not_suppressed(monkeypatch):
    client = _Client()
    monkeypatch.setattr(observability, "_get_client", lambda: client)

    with pytest.raises(RuntimeError, match="provider unavailable"):
        with observability.trace_llm_call("deepseek-chat", 0):
            raise RuntimeError("provider unavailable")


def test_conversation_propagates_session_user_and_prompt_version(monkeypatch):
    client = _Client()
    monkeypatch.setattr(observability, "_get_client", lambda: client)
    monkeypatch.delenv("LANGFUSE_TRACING_ENVIRONMENT", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)

    import langfuse

    propagated = []

    @contextmanager
    def fake_propagate_attributes(**kwargs):
        propagated.append(kwargs)
        yield

    monkeypatch.setattr(langfuse, "propagate_attributes", fake_propagate_attributes)

    with observability.trace_conversation(
        7,
        "status?",
        session_id="admin-agent-test-session",
        prompt_version="operations-agent-system-v1",
    ) as span:
        assert span is not None

    assert propagated == [{
        "user_id": "7",
        "session_id": "admin-agent-test-session",
        "version": "operations-agent-system-v1",
        "environment": "development",
        "trace_name": "operations-agent-chat",
        "metadata": {"feature": "operations-agent", "promptversion": "operations-agent-system-v1"},
        "tags": ["operations-agent"],
    }]
