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
system prompt used for that call. The current prompt version is `leafie-sales-v3.1`. Latency is
measured by the SDK. Cost requires a matching Langfuse model pricing definition;
missing cost must not be presented as zero.

## Prompt Versions

The prompt remains in `app/services/leafie_prompt.py`; changes require a version
bump, regression evaluation, and an API restart/deploy. Version metadata links
traces to the deployed prompt; this is not Langfuse-hosted prompt management.

- `leafie-sales-v1`: initial public sales prompt and privacy-minimized tracing.
- `leafie-sales-v2` (2026-10-05): answer directly when history uniquely identifies
  a catalog product; retain clarification for ambiguous references. New purchases
  use product pages, `/cart`, and `/checkout`; `/orders` is existing-order history.
- `leafie-sales-v3` (2026-10-10): adapt forms of address to explicit customer cues,
  retain the gift recipient, ask cake type before missing flavor, recommend
  directly when both are known, and apologize concretely for repeated questions.
  New-purchase phrases reach sales advice; existing-order/payment/privacy signals
  retain their policy guard. Product-data and JSON constraints remain in place.

- `leafie-sales-v3.1` (2026-10-10): keep explicit em/anh/chị address pairs
  consistent; make suggestion chips customer messages that respect cake-type
  before flavor and do not repeat known preferences or budget.

Keep evaluation evidence for each version separate; do not overwrite baselines.

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
