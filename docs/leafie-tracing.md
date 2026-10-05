# Leafie tracing

Leafie uses the existing optional Langfuse client and failure-isolated context
helpers. It does not change Operations Agent prompts or business-action auditing.

Configure the API service (not the frontend) with secret environment variables:

- `LANGFUSE_PUBLIC_KEY`
- `LANGFUSE_SECRET_KEY`
- `LANGFUSE_BASE_URL=https://jp.cloud.langfuse.com`
- `LANGFUSE_TRACING_ENVIRONMENT=production` (use `development` locally)

Restart/redeploy the API after configuring credentials. The client initializes
once per process. Never commit keys. Missing credentials, SDK failures, and
export failures must not interrupt chat.

Each request creates `leafie-sales` with child `leafie-public-catalog` (retriever)
and `leafie-model-call` (generation). Policy refusals do not call the model.
Generations capture the model, provider token usage, catalog snapshot, and the
unchanged system prompt. The prompt version is `leafie-sales-v1`. Latency is
measured by the SDK. Cost requires a matching Langfuse model pricing definition;
missing cost must not be presented as zero.

The client sends an optional UUID `conversation_id` for grouping follow-ups.
It is telemetry only, never an authentication or authorization boundary. A fresh
chat starts another UUID; a page reload starts another telemetry session.

## Privacy Boundary

Customer free-form messages, history contents, model prose, raw provider errors,
IP addresses, and customer identities are not exported. Regex-only redaction
cannot reliably remove names and addresses from natural-language chat. The root
records message/history lengths and selected public product IDs instead.

This intentionally limits semantic debugging and LLM-as-judge evaluation of
production conversations. Do not claim full conversation replay is available.
Use explicitly approved synthetic evaluation data for semantic evaluation.
No SDK exception recording receives raw provider exceptions in this path.

## Verification

Run tests with a disposable `TEST_DATABASE_URL`, never the business database.
Then send a synthetic request and query its actual trace in Langfuse. Confirm:

- root and children share one trace, with the proper parent IDs;
- model, prompt version, environment, and token usage are present;
- no customer text or secrets are present;
- frontend follow-ups share the opaque session UUID;
- production verification happens after deployment, separately from local tests.

Guidance: https://langfuse.com/docs/observability/best-practices
