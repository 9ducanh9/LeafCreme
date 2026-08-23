# Operations Agent Privacy Boundary

The Operations Agent uses DeepSeek for the live tool-use conversation and
optionally Langfuse for observability.

## Current policy

- Langfuse payloads pass through `app.services.agent.redaction.redact` before
  they are created or updated. Phone numbers, email addresses, customer names,
  delivery addresses, avatars, and credential-like keys are replaced with
  `[đã ẩn]`.
- DeepSeek receives the real result of a tool when the agent needs that value
  to answer an operational question. PII is not placed in the system prompt or
  few-shot examples; it only enters the conversation through an actual tool
  result or the user's own message.
- The DeepSeek provider account must have retention/training disabled before
  production use. This is an account-level control and cannot be proven by
  application code; record the provider setting and its review date in the
  deployment runbook.

Observability is best-effort. Redaction errors must not break chat, and
observability errors must not break the business flow.

## Langfuse configuration

Langfuse is backend-only and remains disabled when either key is missing. Set
these values in the local `.env` or the backend deployment environment; never
commit them or expose them through the frontend:

```env
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_TRACING_ENVIRONMENT=development
```

`LANGFUSE_HOST` remains supported as a backward-compatible alias for
`LANGFUSE_BASE_URL`. Restart the backend after changing these values. A
Langfuse project and API key pair must be created manually under the project's
API Keys settings; the application does not create accounts or credentials.
