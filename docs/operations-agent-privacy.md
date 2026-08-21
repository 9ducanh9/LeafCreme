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
