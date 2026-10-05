"""Optional, privacy-minimized telemetry for the public sales assistant."""

from contextlib import contextmanager

from app.services.agent import observability as tracing


@contextmanager
def observation(name, *, kind="span", **attributes):
    client = tracing._get_client_safely()
    if client is None:
        yield None
        return
    with tracing._best_effort_context(lambda: client.start_as_current_observation(
        name=name, as_type=kind, **attributes,
    )) as span:
        failure = None
        try:
            yield span
        except Exception as exc:
            tracing.safe_update(span, level="ERROR", status_message=type(exc).__name__)
            failure = (exc, exc.__traceback__)
    # Do not hand raw provider exceptions (which may contain user text) to the SDK.
    if failure is not None:
        raise failure[0].with_traceback(failure[1])


@contextmanager
def conversation(payload, prompt_version):
    # Free-form customer text can contain names/addresses that regex masking misses.
    with observation("leafie-sales", kind="agent", input={
        "message_length": len(payload.message),
        "history": [{"role": turn.role, "length": len(turn.content)}
                    for turn in payload.conversationHistory],
    }) as span:
        if span is None:
            yield None
            return
        try:
            from langfuse import propagate_attributes
        except ImportError:
            yield span
            return
        with tracing._best_effort_context(lambda: propagate_attributes(
            session_id=f"leafie-{payload.conversation_id}" if payload.conversation_id else None,
            version=prompt_version, environment=tracing._tracing_environment(),
            trace_name="leafie-sales", tags=["leafie-sales"],
            metadata={"feature": "leafie-sales", "promptversion": prompt_version,
                      "customer_text_capture": "disabled"},
        )):
            yield span


def reply_summary(reply):
    return {"product_ids": [item["id"] for item in reply.get("products", [])],
            "output_length": len(reply.get("output", ""))}
