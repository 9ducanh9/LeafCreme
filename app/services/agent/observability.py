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
import sys
from contextlib import contextmanager
from typing import Any, Iterator, Optional

from app.services.agent.redaction import redact

logger = logging.getLogger("bakeryonl.agent.observability")

_client: Optional[Any] = None
_client_checked = False


def _tracing_environment() -> str:
    value = (os.getenv("LANGFUSE_TRACING_ENVIRONMENT") or os.getenv("APP_ENV") or "development").lower()
    return {"dev": "development", "local": "development", "prod": "production"}.get(value, value)


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
            base_url=os.getenv("LANGFUSE_BASE_URL") or os.getenv("LANGFUSE_HOST") or None,
            environment=_tracing_environment(),
            release=os.getenv("LANGFUSE_RELEASE") or None,
        )
    except Exception:
        logger.debug("Langfuse init failed; tracing disabled for this process", exc_info=True)
        _client = None
    return _client


def _get_client_safely() -> Optional[Any]:
    try:
        return _get_client()
    except Exception:
        logger.debug("Langfuse client lookup failed; tracing disabled for this call", exc_info=True)
        return None


def get_trace_id(observation: Optional[Any] = None) -> Optional[str]:
    """Return the current 32-character trace id without risking app flow."""
    try:
        direct = getattr(observation, "trace_id", None) if observation is not None else None
        if isinstance(direct, str) and len(direct) == 32:
            return direct
        client = _get_client_safely()
        getter = getattr(client, "get_current_trace_id", None) if client is not None else None
        current = getter() if callable(getter) else None
        return current if isinstance(current, str) and len(current) == 32 else None
    except Exception:
        logger.debug("Langfuse trace-id lookup failed", exc_info=True)
        return None


@contextmanager
def _best_effort_context(factory: Any) -> Iterator[Optional[Any]]:
    """Enter an SDK context without letting SDK lifecycle failures escape.

    Exceptions raised by the application body are re-raised unchanged. Only
    Langfuse setup/teardown failures are suppressed, preserving the Agent's
    existing fallback behavior.
    """
    try:
        context = factory()
        value = context.__enter__()
    except Exception:
        logger.debug("Langfuse context setup failed", exc_info=True)
        yield None
        return

    try:
        yield value
    except BaseException:
        try:
            context.__exit__(*sys.exc_info())
        except Exception:
            logger.debug("Langfuse context teardown failed", exc_info=True)
        raise
    else:
        try:
            context.__exit__(None, None, None)
        except Exception:
            logger.debug("Langfuse context teardown failed", exc_info=True)


@contextmanager
def _propagate_trace_attributes(
    *,
    user_id: Optional[int],
    session_id: Optional[str],
    prompt_version: str,
    trace_name: str = "operations-agent-chat",
    feature: str = "operations-agent",
) -> Iterator[None]:
    """Propagate stable correlation fields to every child observation."""
    try:
        from langfuse import propagate_attributes
    except Exception:
        # Import/version incompatibilities are observability-only failures.
        logger.debug("Langfuse attribute propagation failed", exc_info=True)
        yield
        return

    kwargs: dict[str, Any] = {
        "user_id": str(user_id) if user_id is not None else None,
        "version": prompt_version,
        "environment": _tracing_environment(),
        "trace_name": trace_name,
        "metadata": {"feature": feature, "promptversion": prompt_version},
        "tags": ["operations-agent"] if feature == "operations-agent" else ["operations-agent", feature],
    }
    if session_id:
        kwargs["session_id"] = session_id
    with _best_effort_context(lambda: propagate_attributes(**kwargs)):
        yield


@contextmanager
def trace_conversation(
    user_id: Optional[int],
    message: str,
    *,
    session_id: Optional[str] = None,
    prompt_version: str = "unknown",
) -> Iterator[Optional[Any]]:
    """Top-level span for one full chat() tool-use loop."""
    client = _get_client_safely()
    if client is None:
        yield None
        return

    with _best_effort_context(
        lambda: client.start_as_current_observation(
            name="operations-agent-chat",
            as_type="agent",
            input={"message": redact(message)},
        )
    ) as span:
        if span is None:
            yield None
            return
        try:
            with _propagate_trace_attributes(
                user_id=user_id,
                session_id=session_id,
                prompt_version=prompt_version,
            ):
                yield span
        except Exception as exc:
            safe_update(span, level="ERROR", status_message=type(exc).__name__)
            flush()
            raise


@contextmanager
def trace_proactive_evaluation(
    source_alert_id: int,
    condition: dict[str, Any],
    *,
    prompt_version: str,
    scenario: str = "expiring_batch",
) -> Iterator[Optional[Any]]:
    """Trace one unattended, read-only proactive evaluation.

    It deliberately has no user identity.  The source alert and the
    deterministic condition provide the correlation path instead.
    """
    client = _get_client_safely()
    if client is None:
        yield None
        return

    with _best_effort_context(
        lambda: client.start_as_current_observation(
            name="operations-agent-proactive",
            as_type="agent",
            input=redact(condition),
            metadata={"source_alert_id": source_alert_id, "scenario": scenario},
        )
    ) as span:
        if span is None:
            yield None
            return
        try:
            with _propagate_trace_attributes(
                user_id=None,
                session_id=f"proactive-alert-{source_alert_id}",
                prompt_version=prompt_version,
                trace_name="operations-agent-proactive",
                feature="operations-agent-proactive",
            ):
                yield span
        except Exception as exc:
            safe_update(span, level="ERROR", status_message=type(exc).__name__)
            flush()
            raise


@contextmanager
def trace_llm_call(model: str, iteration: int) -> Iterator[Optional[Any]]:
    """One DeepSeek `chat.completions.create` call within the loop."""
    client = _get_client_safely()
    if client is None:
        yield None
        return
    with _best_effort_context(
        lambda: client.start_as_current_observation(
            name="agent-llm-call",
            as_type="generation",
            model=model,
            metadata={"iteration": iteration},
        )
    ) as generation:
        try:
            yield generation
        except Exception as exc:
            safe_update(generation, level="ERROR", status_message=type(exc).__name__)
            raise


@contextmanager
def trace_tool_call(tool_name: str, tool_input: dict) -> Iterator[Optional[Any]]:
    """One tool execution requested by the model."""
    client = _get_client_safely()
    if client is None:
        yield None
        return
    with _best_effort_context(
        lambda: client.start_as_current_observation(
            name="agent-tool-call",
            as_type="tool",
            input=redact(tool_input),
            metadata={"tool_name": tool_name},
        )
    ) as span:
        try:
            yield span
        except Exception as exc:
            safe_update(span, level="ERROR", status_message=type(exc).__name__)
            raise


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
