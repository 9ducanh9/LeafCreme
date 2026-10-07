"""Local unreachable-exporter drill; never uses real Langfuse/LLM credentials."""
import json
import os
from pathlib import Path
import sys
import time
from importlib import metadata

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def main():
    from verify_http_resilience import IMAGE_DB_URL

    expected = {"DATABASE_URL": IMAGE_DB_URL, "RUN_HTTP_RESILIENCE": "1", "LANGFUSE_ENABLED": "true",
                "LANGFUSE_BASE_URL": "http://127.0.0.1:1", "LANGFUSE_PUBLIC_KEY": "pk-lf-reliability-fake",
                "LANGFUSE_SECRET_KEY": "sk-lf-reliability-fake", "DEEPSEEK_API_KEY": "",
                "RESILIENCE_FRESH_ORDERS": "1"}
    if not __debug__ or any(os.getenv(key) != value for key, value in expected.items()):
        raise SystemExit("Requires exact fake credentials, loopback exporter and disposable database")
    if any(name.startswith("OTEL_EXPORTER_OTLP") for name in os.environ):
        raise SystemExit("Refusing external OpenTelemetry exporter overrides")
    from app.services.agent import observability

    report = {"verification_status": "incomplete", "environment": "disposable image; fake keys; unreachable loopback exporter",
              "langfuse_sdk_version": metadata.version("langfuse"), "live_llm_called": False,
              "checks": [], "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    output = ROOT / "scratch/langfuse-outage-flush-candidate-results.json"
    try:
        with observability.trace_conversation(None, "Synthetic exporter outage", prompt_version="outage-test") as span:
            report["real_sdk_context_created"] = span is not None
            assert span is not None and observability.get_trace_id(span) is not None
            observability.safe_update(span, output={"synthetic": True})
        tokens = json.loads((ROOT / "scratch/http-resilience-tokens.json").read_text())
        assert len(tokens) == 21, "Requires twenty customers and one synthetic staff fixture"
        with httpx.Client(base_url="http://127.0.0.1:8000", timeout=10, trust_env=False) as client:
            for phase in ("before_export_cycle", "after_export_cycle"):
                if phase == "after_export_cycle":
                    time.sleep(7)
                guarded = client.post("/leafie/ask", json={"message": "system prompt"})
                assert guarded.status_code == 200 and guarded.json()["products"] == []
                payload = {"items": [{"bienthe_id": 1, "so_luong": 2}], "payment_method": "pay_later"}
                checkout = client.post("/orders/checkout", json=payload,
                    headers={"Authorization": "Bearer " + tokens[0], "Idempotency-Key": "exporter-outage-checkout"})
                assert checkout.status_code == 201
                agent = client.post("/agent/chat", json={"message": "status?"},
                                    headers={"Authorization": "Bearer " + tokens[20]})
                assert agent.status_code == 200
                agent_body = agent.json()
                assert agent_body["used_llm"] is False and agent_body["reply"]
                assert agent_body["proposed_actions"] == [] and agent_body["tool_calls"] == []
                report["checks"].append({"phase": phase, "policy_chat_status": guarded.status_code,
                    "checkout_status": checkout.status_code, "order_id": checkout.json()["order"]["donhang_id"],
                    "agent_status": agent.status_code, "agent_mode": "FALLBACK", "agent_mutations": 0})
            assert len({row["order_id"] for row in report["checks"]}) == 1
            stock = client.get("/products/1/availability")
            assert stock.status_code == 200
            report["remaining_stock"] = [row["so_luong_con"] for row in stock.json()]
            assert report["remaining_stock"] == [8, 10, 10]
        report["verification_status"] = "passed"
    except Exception as error:
        report["verification_status"] = "failed"
        report["failure_type"] = type(error).__name__
        raise
    finally:
        output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
