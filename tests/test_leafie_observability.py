import json
from contextlib import contextmanager
from types import SimpleNamespace

import pytest

from app.services import leafie, leafie_observability as telemetry


class Client:
    def __init__(self):
        self.started = []
        self.updated = []
        self.exited_with_error = False

    @contextmanager
    def start_as_current_observation(self, **kwargs):
        self.started.append(kwargs)
        try:
            yield SimpleNamespace(update=lambda **data: self.updated.append(data))
        except Exception:
            self.exited_with_error = True
            raise


def test_private_free_text_never_enters_telemetry(monkeypatch):
    client = Client()
    monkeypatch.setattr(telemetry.tracing, "_get_client", lambda: client)
    private = "My name is Jane, address 123 Example Road, test@example.com, sk-private123"
    payload = leafie.LeafieRequest(message=private)
    with telemetry.conversation(payload, "leafie-sales-v1") as span:
        telemetry.tracing.safe_update(span, output=telemetry.reply_summary({
            "output": private, "products": [{"id": 7}],
        }))
    assert private not in json.dumps(client.started + client.updated)
    assert client.updated[-1]["output"]["product_ids"] == [7]


def test_raw_exceptions_are_not_exported(monkeypatch):
    client = Client()
    monkeypatch.setattr(telemetry.tracing, "_get_client", lambda: client)
    with pytest.raises(ValueError, match="private"):
        with telemetry.observation("leafie-model-call"):
            raise ValueError("private user address")
    assert not client.exited_with_error
    assert client.updated[-1] == {"level": "ERROR", "status_message": "ValueError"}


def test_missing_telemetry_preserves_chat(monkeypatch):
    monkeypatch.setattr(telemetry.tracing, "_get_client", lambda: None)
    with telemetry.conversation(leafie.LeafieRequest(message="hello"), "leafie-sales-v1") as span:
        assert span is None


def test_sdk_setup_failure_preserves_body(monkeypatch):
    class Broken:
        def start_as_current_observation(self, **kwargs):
            raise RuntimeError("offline")
    monkeypatch.setattr(telemetry.tracing, "_get_client", lambda: Broken())
    with telemetry.observation("leafie-model-call") as span:
        assert span is None


def test_sdk_teardown_failure_preserves_body(monkeypatch):
    class Broken(Client):
        @contextmanager
        def start_as_current_observation(self, **kwargs):
            yield SimpleNamespace(update=lambda **data: None)
            raise RuntimeError("export offline")
    monkeypatch.setattr(telemetry.tracing, "_get_client", lambda: Broken())
    with telemetry.observation("leafie-model-call") as span:
        telemetry.tracing.safe_update(span, output={"ok": True})


def test_session_and_prompt_propagate_without_customer_identity(monkeypatch):
    import langfuse
    captured = []

    @contextmanager
    def propagate(**kwargs):
        captured.append(kwargs)
        yield

    monkeypatch.setattr(telemetry.tracing, "_get_client", lambda: Client())
    monkeypatch.setattr(langfuse, "propagate_attributes", propagate)
    payload = leafie.LeafieRequest(message="hello", conversation_id="75b234c5-1b0c-4f5d-9b0c-698dc3135789")
    with telemetry.conversation(payload, "leafie-sales-v1"):
        pass
    assert captured[0]["session_id"] == f"leafie-{payload.conversation_id}"
    assert captured[0]["version"] == "leafie-sales-v1"
    assert captured[0]["tags"] == ["leafie-sales"]
    assert "user_id" not in captured[0]
