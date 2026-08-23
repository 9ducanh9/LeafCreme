# Operations Agent Prompt Versioning

The Operations Agent prompt is versioned in
`app/services/agent/agent_service.py` as `SYSTEM_PROMPT_VERSION`. The value
is propagated to every Langfuse observation as both `version` and
`metadata.promptversion`.

## Versioning rule

- Treat a prompt version as immutable after it has been used in a trace.
- Increment the numeric suffix only when the system prompt content changes.
  For example, `operations-agent-system-v1` becomes
  `operations-agent-system-v2`.
- Do not increment the prompt version for changes limited to model settings,
  tool implementations, tracing, or frontend presentation. Those changes are
  recorded by the evaluation run metadata instead.

## Required verification for a prompt change

1. Update `SYSTEM_PROMPT_VERSION` in the same commit as the prompt text.
2. Run the Phase 2 regression dataset against an isolated evaluation database:
   `venv\\Scripts\\python.exe scripts\\run_agent_evaluation.py`.
3. Record the resulting baseline JSON and Langfuse experiment under the new
   prompt version. Compare it with the previous prompt version across tool
   selection, grounding, conversational context, action safety, completion
   quality, latency, and token usage.
4. Do not promote a changed prompt if mutation scenarios execute directly,
   grounded scenarios lose their required tool calls, or a fallback/LIVE_LLM
   result is compared as though they were the same mode.

## Trace lookup

In Langfuse, filter observations by:

- trace name: `operations-agent-chat`
- prompt version: the `SYSTEM_PROMPT_VERSION` value
- environment: `development`, `test`, or `production`

The business `AgentAction` audit trail remains the authority for proposed,
approved, and rejected business actions. Langfuse is observability only.
