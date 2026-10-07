"""Actual SDK export-boundary diagnostic using synthetic markers in memory."""
import hashlib
import json
import os
from pathlib import Path
import sys
from importlib import metadata

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main():
    if os.getenv("RUN_SDK_PRIVACY_DIAGNOSTIC") != "1" or os.getenv("APP_ENV") != "development":
        raise SystemExit("Synthetic local SDK diagnostic only")
    if os.getenv("DATABASE_URL") != "postgresql://fixture:fixture@127.0.0.1:1/disposable_privacy_test":
        raise SystemExit("Refusing real database configuration")
    from langfuse import Langfuse
    from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
    from app.services.agent import observability

    sink = InMemorySpanExporter()
    client = Langfuse(public_key="pk-lf-memory-test", secret_key="sk-lf-memory-test",
                      base_url="http://127.0.0.1:1", span_exporter=sink)
    observability._client = client
    observability._client_checked = True
    markers = ("synthetic.person@example.test", "0901234567", "sk-synthetic-credential-ABCDEFG123")
    message = "Synthetic provider exception: " + " ".join(markers)
    original = RuntimeError(message)
    try:
        with observability.trace_conversation(None, message, prompt_version="privacy-diagnostic") as span:
            assert span is not None
            raise original
    except RuntimeError as error:
        assert error is original
    client.flush()
    spans = sink.get_finished_spans()
    assert spans, "No real SDK spans reached the in-memory export boundary"
    error_type_recorded = any(
        "RuntimeError" == value for span in spans for key, value in (span.attributes or {}).items()
        if "status_message" in key)
    error_level_recorded = any(
        "ERROR" == value for span in spans for key, value in (span.attributes or {}).items()
        if "level" in key)
    leaked = set()
    for span in spans:
        for key, value in (span.attributes or {}).items():
            if any(marker in str(value) for marker in markers):
                leaked.add("attribute:" + key)
        for event in span.events:
            for key, value in event.attributes.items():
                if any(marker in str(value) for marker in markers):
                    leaked.add("event:" + key)
        if any(marker in str(span.status.description) for marker in markers):
            leaked.add("status.description")
    passed = not leaked and error_type_recorded and error_level_recorded
    report = {"verification_status": "passed" if passed else "failed",
              "environment": "network-disabled local image; in-memory exporter; synthetic markers only",
              "langfuse_sdk_version": metadata.version("langfuse"), "exported_spans": len(spans),
              "application_exception_identity_preserved": True, "leaked_locations": sorted(leaked),
              "error_type_recorded": error_type_recorded, "error_level_recorded": error_level_recorded,
              "observability_source_sha256": hashlib.sha256((ROOT / "app/services/agent/observability.py").read_bytes()).hexdigest()}
    output = Path("/results/sdk-exception-privacy-results.json")
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report))
    client.shutdown()
    if not passed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
