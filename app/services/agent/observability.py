"""Optional Langfuse tracing for the Operations Agent's tool-use loop.

Fully optional and non-critical: if LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY
aren't set, the `langfuse` package isn't installed, or any Langfuse call
raises for any reason, every function here degrades to a no-op. Nothing
in this module is allowed to break `chat()` — see agent_service.py's
module docstring. Callers never need to check "is tracing on"; they just
call these unconditionally and get real spans when configured, silence
otherwise.

Uses Langfuse v4's OTEL-based API: `start_as_current_observation` is a
context manager that both creates a span/generation/tool observation *and*
nests it under whatever observation is currently active — so wrapping the
whole `_run_agent_loop` call in `trace_conversation` and then wrapping
each LLM/tool call inside it in `trace_llm_call`/`trace_tool_call` is
enough to get a full conversation -> LLM call -> tool call trace tree with
no manual parent-id plumbing.
"""
import logging
import os
from contextlib import contextmanager
from typing import Any, Iterator, Optional

from app.services.agent.redaction import redact

logger = logging.getLogger("bakeryonl.agent.observability")

_client: Optional[Any] = None
_client_checked = False


def _get_client() -> Optional[Any]:
    global _client, _client_checked
    if _client_checked:
        return _client
    _client_checked = True

    if not (os.getenv("LANGFUSE_PUBLIC_KEY") and os.getenv("LANGFUSE_SECRET_KEY")):
        return None
    try:
        from langfuse import Langfuse

        _client = Langfuse(
            public_key=os.environ["LANGFUSE_PUBLIC_KEY"],
            secret_key=os.environ["LANGFUSE_SECRET_KEY"],
            host=os.getenv("LANGFUSE_HOST") or None,
        )
    except Exception:
        logger.debug("Langfuse init failed; tracing disabled for this process", exc_info=True)
        _client = None
    return _client


@contextmanager
def trace_conversation(user_id: Optional[int], message: str) -> Iterator[Optional[Any]]:
    """Top-level span for one full chat() tool-use loop."""
    try:
        client = _get_client()
        if client is None:
            yield None
            return
        with client.start_as_current_observation(
            name="operations-agent-chat",
            as_type="agent",
            input={"message": redact(message)},
            metadata={"user_id": user_id},
        ) as span:
            yield span
    except Exception:
        logger.debug("Langfuse trace_conversation failed", exc_info=True)
        yield None


@contextmanager
def trace_llm_call(model: str, iteration: int) -> Iterator[Optional[Any]]:
    """One DeepSeek `chat.completions.create` call within the loop."""
    try:
        client = _get_client()
        if client is None:
            yield None
            return
        with client.start_as_current_observation(
            name=f"llm-call-{iteration}", as_type="generation", model=model,
        ) as generation:
            yield generation
    except Exception:
        logger.debug("Langfuse trace_llm_call failed", exc_info=True)
        yield None


@contextmanager
def trace_tool_call(tool_name: str, tool_input: dict) -> Iterator[Optional[Any]]:
    """One tool execution requested by the model."""
    try:
        client = _get_client()
        if client is None:
            yield None
            return
        with client.start_as_current_observation(
            name=f"tool:{tool_name}", as_type="tool", input=redact(tool_input),
        ) as span:
            yield span
    except Exception:
        logger.debug("Langfuse trace_tool_call failed", exc_info=True)
        yield None


def safe_update(observation: Optional[Any], **kwargs: Any) -> None:
    """Updates an observation returned by one of the trace_* context
    managers above. No-op if tracing is disabled (`observation is None`)
    or the update call itself raises."""
    if observation is None:
        return
    try:
        observation.update(**redact(kwargs))
    except Exception:
        logger.debug("Langfuse observation update failed", exc_info=True)


def flush() -> None:
    """Best-effort flush at the end of a request so traces aren't stuck
    in an in-memory batch if the process exits or the worker recycles."""
    try:
        client = _get_client()
        if client is None:
            return
        client.flush()
    except Exception:
        logger.debug("Langfuse flush failed", exc_info=True)
