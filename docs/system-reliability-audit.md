# System reliability audit

## Current Decision Summary

Admission mitigation implemented locally on 2026-10-07 using pure ASGI
middleware and AnyIO CapacityLimiter: default 20 active HTTP requests,
200 queued, two-second admission wait; bounded overload returns 503 with
Retry-After=1 before route/business execution. Slots stay held through the
inner ASGI call's completion/teardown and release on failure/cancellation.
Only liveness /health bypasses admission; CORS remains outside the limiter.
DB pool/30-second pool wait and client ten-second timeout are UNCHANGED.
Config: HTTP_MAX_INFLIGHT (1-20), HTTP_MAX_WAITING (1-1000),
HTTP_ADMISSION_WAIT_SECONDS (>0 to 5); no production config change.
Official primitive reference: https://anyio.readthedocs.io/en/stable/api.html#anyio.CapacityLimiter
Targeted tests passed; latest full host suite: 432 passed, one benchmark skip,
42.71 seconds (`scratch/reliability-suite.xml`). New tests cover bounded queue,
timeout/liveness bypass, error/cancel cleanup and retaining a slot through
post-body teardown. Full image regression remains pending after this change.

Strict unchanged 200-client read verifier STILL FAILS after mitigation:
first rerun 7,599/7,600 HTTP 200, one RemoteProtocolError; repeat 7,197/7,200
HTTP 200, three RemoteProtocolError. Neither run had ReadTimeout or 503.
First run API logs had zero pool/ASGI errors, health 200 during the experiment,
container healthy and zero idle-in-transaction sessions after load. Both
completed checkout replay/contention phases and recorded stock [8,0,10].
Thus worker/pool starvation is mitigated in these runs but complete transport
reliability is NOT proven. No client auto-retry, timeout increase or acceptance
of503 was used to turn the verifier green. Protocol disconnect origin remains
unknown and requires separate connection-lifecycle diagnosis. Reports:
`scratch/image-http-load-200-clients-results-admission-fix.json` and
`scratch/image-http-load-200-clients-results-admission-repeat.json`, each
retained as failed with corresponding .api.log. Image used:
`sha256:cdff5d7de15fdcff215fcf4ca66a7392173175f67952a86ab4220782d03b6545`.
Owned resources removed. This is not a population/business improvement
percentage or Railway capacity claim; production was untouched.

Overload stack capture on 2026-10-07 reproduced the failure using the same
image/fixture, with only a test launcher registering faulthandler SIGUSR1.
The signal dumped stacks without killing API or recording local variables.
Forty of 48 captured Python threads were waiting in SQLAlchemy pool checkout
(threading.wait -> sqlalchemy.util.queue.get -> pool.impl._do_get), including
the real product service query/route and FastAPI sync endpoint worker.
The current event-loop thread snapshot was in asyncio/uvicorn run, not a
blocking SQL call. Together with the separately observed thirty held idle
transactions, this confirms worker/pool starvation; it does not yet prove
which response/session lifecycle stage retains those connections. No pool
size/client timeout change or business logic rewrite occurred. The repeat
report remains failed and partial checkout results are not counted as success.
Evidence: `scratch/image-http-load-200-clients-results-stack-capture.json`
and its full `.api.log`; helper `scripts/run_image_debug_api.py` is mounted
test scaffolding, not copied into the production image. Original failed run
is retained under its original filename. Owned resources cleaned up; Ruff
passed. Next fix must bound request admission relative to available DB/worker
capacity and verify session teardown plus the unchanged 200-client workload,
not hide rejection/timeouts or merely increase pool size.

IMPORTANT: 200-client Docker overload drill on 2026-10-07 FAILED. Actual
peak in-flight reads reached 200. In 64.074 seconds, 1,200 attempted reads
produced 196 valid HTTP 200 responses and 1,004 client ReadTimeout outcomes.
The subsequent checkout phase also timed out before final business invariant
verification. Do not count this as passed or infer successful checkout count
from absent/partial replay fields. Container stayed running, not OOM-killed,
but its liveness healthcheck repeatedly exceeded five seconds and became
unhealthy. API logs show SQLAlchemy QueuePool size 10 + overflow 20 exhausted
with 30-second pool waits; independent DB snapshot showed 30 idle-in-transaction
connections waiting on ClientRead. This is consistent with worker/session
starvation, but the exact blocking stack/root cause has not been captured.
It is NOT merely a client-only port exhaustion artifact, and no timeout was
increased or failure ignored. Container had no explicit CPU/memory limit;
results cannot be translated to Railway capacity. Raw failed report plus
captured diagnostics: `scratch/image-http-load-200-clients-results.json`;
last 500 API log lines: same stem `.api.log`. Owned API/DB/network removed
after evidence collection. This new failure overrides any broad local
overload-stability claim; bounded admission/backpressure and session/worker
lifecycle need investigation/fix before repeating the SAME workload.

Interrupted-turn result revalidated on 2026-10-07: the expanded restore run
completed 2026-10-06T16:38:19Z-16:38:40Z with `verification_status=passed`.
All existing data/canonical-constraint/index checks plus 385 column metadata
rows (types, nullability, identity/generated flags, defaults), 58 enum labels,
35 sequence configuration rows and 35 sequence-to-column ownership links
matched between source and restored disposable DB. User-trigger lists were
empty on both sides (zero); this is NOT nonempty trigger recovery coverage.
Fresh restored API reads returned three HTTP 200 responses. Container was
confirmed absent after interruption; no live handle was restarted. Ruff passed.
Raw: `scratch/http-backup-all-tables-with-payment-results.json`. This closes
the enumerated metadata-comparison gaps for this same-version fixture only;
permissions/roles, functions/views/RLS, upload files, cross-version recovery
and real Railway restore/cutover remain separate operational concerns.

Health-revision follow-up on 2026-10-06: full host backend suite passed
429 tests, one opt-in benchmark skipped, in 40.21 seconds; JUnit refreshed
at `scratch/reliability-suite.xml`. Image rebuilt as
`sha256:c2030c5ac5604bbd52204293bce2035dc31c17e034ca985e8c5c8e20341c4f00`.
A TestClient endpoint contract check inside that image verified valid
synthetic APP_COMMIT_SHA appears on both health endpoints and invalid value
becomes null. DB dependency was fake; this is NOT a fresh real DB/HTTP load
test or full image-suite rerun. Initial import correctly refused missing
DATABASE_URL; rerun supplied a placeholder DSN with DB dependency overridden,
not a live DB. Test container used --rm; host test DB removed. The last full
image regression remains the prior 423-test image, not this new image.
No production identity claim, trace write, push or deploy occurred.

Runtime revision metadata implemented locally on 2026-10-06: `/health` and
`/health/db` now return revision {sha, source} from a format-validated 40-hex
RAILWAY_GIT_COMMIT_SHA (preferred) or explicitly supplied APP_COMMIT_SHA;
missing/invalid values produce null. No Git subprocess, local-HEAD guessing,
branch/message/secret dump or production settings change. Official Railway
variables reference documents the GitHub-triggered deployment variable:
https://docs.railway.com/variables/reference
Eleven health tests passed in 2.75 seconds, including invalid-secret-like
values not appearing in responses, priority, absence, and DB outage/recovery;
focused Ruff passed. This is environment-declared revision, not signed image
attestation, and is not deployed yet. Full suite/image rerun after this change
remains pending. Production SHA remains unverified until a reviewed deploy
and comparison with the actual deployment/CI record.

Read-only deployment-path verification on 2026-10-06: `git ls-remote` shows
remote main at 1a6b59f0ee255854f946f899089c2ae0f619593d, same as local HEAD.
GitHub Actions run 37421380135 (created 06:00:14 UTC) completed success:
test, frontend-quality, frontend-e2e, docker-build and Deploy frontend to
Vercel all succeeded. Source run URL:
https://github.com/9ducanh9/LeafCreme/actions/runs/37421380135
Public GETs at 16:26:28-38 UTC returned 200 for leafcr.logantai.com,
documented Railway API /health and /health/db. Only three spot checks, no
business/auth writes, load or fault injection. This does not establish
Railway's actual backend SHA/limits/storage/backups, nor the production
deployment of dirty local fixes. Railway CLI was not installed in the local
command inventory; no CLI login, token/project creation or service settings
changes were attempted. GitHub run includes frontend deploy but not Railway
backend deploy, so backend release identity remains a separate gate.

Rebuilt image regression after usage/redaction fix on 2026-10-06: 423 passed,
one opt-in benchmark skipped, in 31.83 seconds. JUnit:
`scratch/image-regression-suite.xml`; image ID
`sha256:c17cd254ac9bfe364a7b1b4b06cbaefa2f896ca153c49e54e12d5fb040841f33`.
Parameterized usage tests now exercise the actual installed SDK generation
attribute serializer as well as app redaction, confirming canonical numeric
counts and omission of unavailable/invalid counts on SDK 4.17.0 in the image.
This is offline serialization/regression, not cloud delivery or real token
consumption. Provider keys are absent/disabled; test tooling stays in /tmp
and scaffolding mounts read-only. Owned DB/runner/network removed. Pending
Docker regression gate after this fix is closed; synthetic cloud smoke awaits
owner reply. No trace was sent, model invoked, registry pushed or production
data/deployment changed.

Full host regression after usage/redaction fix on 2026-10-06: 423 passed,
one opt-in benchmark skipped, in 39.32 seconds; JUnit refreshed at
`scratch/reliability-suite.xml`. An offline diagnostic through the installed
Langfuse 4.14.4 SDK's actual generation attribute serializer confirms numeric
input=7/output=3 survive the application redaction and serialization path.
Those are synthetic checker values, not provider-reported consumption.
No client/exporter or external write was invoked. Disposable DB removed.
Owner approval requested for exactly one clearly labeled synthetic Langfuse
smoke trace (no model call/customer data); fresh ingestion remains unverified
until approved and observed. Docker rebuild/regression after this fix also
remains pending. Do not infer new production tracing from offline success.

Local usage-capture defect found and fixed on 2026-10-06: Agent chat and
proactive generation updates used `input_tokens`/`output_tokens`; safe_update
redacts any key containing `token`, converting those numeric values to a
redaction string. The SDK accepts usage_details as numeric metrics, and
official token/cost documentation uses canonical input/output keys. Both
Agent paths now use a shared helper emitting `input`/`output` only for
nonnegative integer counts (zero retained; missing/invalid counts omitted).
Secret/PII redaction is unchanged. Combined observability/redaction/proactive/
autonomy regression: 35 passed in 3.98 seconds; focused Ruff passed.
Official reference: https://langfuse.com/docs/observability/features/token-and-cost-tracking
This is a reproduced local instrumentation bug, not proof that every missing
cloud usage field arose from this code/version. No fresh trace/model call was
sent and historical observations were not backfilled. New ingest, full suite
and rebuilt image verification after this change remain pending. Host SDK
inspected was 4.14.4; the earlier image resolved 4.17.0. No production push
or credentials/project changes occurred.

Read-only Langfuse verification on 2026-10-06 used local configured key pair
and HTTPS host jp.cloud.langfuse.com, without exposing keys, sending traces
or invoking an LLM. Current CLI observations v2 list returned HTTP 200 for
20 observations in project cmt41p0tm0001ad0do7g79dg9, spanning three trace IDs,
with AGENT/GENERATION/TOOL types and deepseek-chat model. Sample start times
range 2026-10-06T06:07:31.907Z to 06:12:36.008Z; all sampled observations
have parent IDs. Seven GENERATION observations have no nonempty usage/token
fields (usageDetails/inputUsage/outputUsage/totalUsage) or prompt-reference
fields. This confirms valid read credentials and existing ingest, NOT fresh
trace delivery from the current dirty code, deployment identity, complete
trace reconstruction, token correctness or PII redaction. No input/output,
metadata, userId/sessionId fields were fetched. Missing prompt IDs may reflect
code-owned prompts rather than a managed Langfuse prompt; do not call it a
bug without checking instrumentation/deployed version. Missing sampled usage
is an observability gap to investigate, not proof all project traces lack it.
CLI help identifies the old traces endpoint as deprecated; the read used
`api observations list --fields core,model,usage,prompt,metrics`, limit 20,
from 2026-09-06T00:00:00Z to 2026-10-07T00:00:00Z. Raw payload/credentials
were not saved; only aggregate metadata was inspected. No project/account
creation or external writes occurred.

Actual Docker image HTTP workload on 2026-10-06 passed: image
`sha256:dabbd98b201429f2fa6f19199a4d878a85ac1993c4ae9f85b34f448a3ced2718`
served 12,200 catalog/availability reads with 50 closed-loop clients in
60.384 seconds; all status/body checks passed. Nearest-rank p95 346.18 ms,
maximum 592.18 ms. Afterwards twenty same-key checkout requests returned
one order ID; twenty distinct-key/users competing for ten units produced
five successes/fifteen domain rejections and stock [8,0,10]. Scheduler was
enabled, external AI/tracing providers disabled. These are real HTTP requests
to API code in the Python 3.12 image with a separate migrated/seeded DB,
not mocked API responses. Scripts were mounted read-only for fixture seeding
only; the application's runtime command/code remained from the image.
Ten Docker stats samples show 115.8-121.5 MiB reported container memory.
Samples occur between request batches and include probe overhead/pauses;
CPU samples are NOT a sustained-load average or peak. This is a one-minute
read workload followed by short checkout contention, not continuous mixed
commerce, constrained Railway capacity or memory-leak proof. Raw:
`scratch/image-http-load-results.json`; client:
`scripts/verify_image_http_load.py`. API/DB containers and network removed.
No production data, registry push or deploy occurred.

Rebuilt Docker image full regression on 2026-10-06 passed after bounded
missing-notification recovery: 418 passed, one opt-in benchmark skipped,
in 32.16 seconds. JUnit: `scratch/image-regression-suite.xml`; image ID
`sha256:dabbd98b201429f2fa6f19199a4d878a85ac1993c4ae9f85b34f448a3ced2718`.
Tests and scripts were mounted read-only; app code came from the rebuilt
Python 3.12 image, with test tooling isolated under `/tmp` and providers off.
The disposable PostgreSQL container and runner/network were removed. This
closes the pending full-Docker-regression gate for the backend change,
not runtime load, live provider/production deployment or arbitrary failover.
The local image remains available; no registry push or deployment occurred.

Full host backend regression after missing-notification recovery on
2026-10-06: 418 passed, one opt-in controlled benchmark skipped, in
39.82 seconds. JUnit: `scratch/reliability-suite.xml`. This rerun includes
bounded retry, stale revalidation, approval/mutation safety and report-checker
tests on disposable PostgreSQL; providers were disabled. DB container was
removed after completion. This supersedes the pending full-host-suite gate
below, but the Docker image has not yet been rebuilt/retested after the
backend change. No production deployment or database was changed.

Missing-notification crash recovery now implemented locally and verified on
2026-10-06. Reconciliation is still restricted to stale automatic
`create_proactive_notification` actions: if matching insight exists, complete
audit without executing; if absent, mark failed with the existing retryable
outcome rather than silently mark successful. The existing executor retains
code-owned policy, idempotency and live-state revalidation and at most two
total attempts. No mutation/proposal permission changed. Real process exit
76 before notification write followed by restart/stale-time fixture produced
one insight and completed audit at attempt 2, reconciled=false. HTTP report
passed: `scratch/http-notification-before-commit-results.json`; log:
`scratch/http-notification-before-commit-api.log`. Combined proactive/selective
regression: 23 passed in 3.84 seconds, including missing result recovery,
exhausted attempts (no new insight) and changed expiry condition (ACTION_STALE,
no insight). This supersedes missing-notification manual-only recovery for
this one internal idempotent tool, not general business mutation recovery.
Full suite and Docker image are not rerun/rebuilt after this backend change.

Actual notification crash window verified locally on 2026-10-06:
`--notification-crash` patches only the harness process to exit 75 immediately
after the real notification function commits a newly created insight, before
automated executor audit completion. Independent SQL observes the persisted
action `dang_xu_ly` with execution_attempts=1. The test explicitly ages its
claim timestamp by 16 minutes in the disposable DB (clock fixture, not an
actual 15-minute wait), restarts the API with fault injection off, then checks
`hoan_thanh`, attempts=1, reconciled=true, one matching insight. The normal
HTTP/concurrency/DB-recovery assertions also pass; report status `passed`.
Raw: `scratch/http-notification-crash-results.json`; log:
`scratch/http-notification-crash-api.log`. This closes persisted-notification
audit recovery with a real process exit plus synthetic stale-time fixture.
It does NOT establish recovery before insight commit, mutation recovery,
or scanner failover during an arbitrary transaction. Production code contains
no crash hook; no external provider or production DB was used.

Two-real-API local drill on 2026-10-06 passed (`--multi-api`): two independent
Uvicorn processes share the disposable PostgreSQL DB, both with actual
scheduler/business scanning enabled (no marker callback). SQL found 481
eligible alerts, zero missing insight sources and zero duplicate open sources.
After stopping the first process, the second returned catalog 200 with all
80 synthetic products. First API restarted and the normal concurrency/DB
outage assertions completed; JSON status `passed`. This is not a shared-port
multi-worker deployment/load-balancer test, nor a kill during a scan/action
transaction or proof of uninterrupted in-flight work. Lock contention itself
remains covered by the separate process-entrypoint tests. Raw:
`scratch/http-multi-api-results.json`; log:
`scratch/http-multi-api-business-scan.log`. Initial harness startup polling
and Windows blocked-port failures were retained in separate failed reports;
the second loopback port is now allocated by the OS. Owned resources cleaned
up; no production or external providers involved.

Latest full host regression on 2026-10-06: 415 backend tests passed,
one controlled benchmark skipped, in 39.68 seconds; JUnit refreshed at
`scratch/reliability-suite.xml`. The default browser suite passed nine
mock-backed cases in 10.5 seconds and skipped all four live-harness cases
with `RUN_LIVE_BROWSER=0`. Thus ordinary browser CI does not implicitly
run live business mutations. This does not rerun opt-in live cases or the
new report-checker tests inside the Docker image. Disposable backend DB
was removed and browser/dev-server runner exited. No production data or
deployment was changed; existing unrelated worktree edits were preserved.

Report-checker regression on 2026-10-06: ten automated tests passed in
1.21 seconds; source `tests/test_http_report_validation.py`. Synthetic
report fixtures exercise the checker, not operational workload measurements.
The final gate now requires all three read tiers (1/10/50 workers), 200
requests per tier, twenty replays and twenty contenders, successful stock
read, expected stock, and a nonempty soak when present. Missing tiers/reads,
failed recovery, duplicate orders, missing contenders, incorrect stock,
failed stock reads and empty soaks are rejected. The existing real base
HTTP report also passed the stricter checker. Focused Ruff checks passed;
the disposable test DB was removed. Full suite/image rerun after this new
test module remains pending (Docker test scaffolding must now include this
helper script as well as seed_guard).

HTTP evidence gate hardened on 2026-10-06: report schema v1 explicitly
starts `incomplete`, records execution/verification exceptions as `failed`
(exception type only), and marks `passed` with UTC timestamp only after
cleanup and all final assertions. Optimized Python is refused because it
disables assertions. Base real HTTP probe reran successfully and now writes
`verification_status=passed` in `scratch/http-resilience-results.json`.
A read-only in-memory negative control changed the recorded recovery status
to 503; the final checker rejected that corrupted copy while accepting the
original. This validates the evidence checker, not a new operational metric.
Older JSON files lacking status remain legacy evidence requiring original
process exit/log review; do not retroactively assign them a pass status.

Allocation profiling drill on 2026-10-06: optional tracemalloc starts before
test API imports and exposes a diagnostic endpoint ONLY in the disposable
loopback harness, not application production code. It records byte/count
deltas by source line, never object values. Under the profiled 61.297-second
mixed workload, 4,600 requests passed all invariants. Traced Python current
allocation was 90.21 MiB after warm-up, 100.19 MiB after load and 89.06 MiB
after ten seconds without client requests (scheduler enabled); traced peak
154.11 MiB. Largest positive line delta after idle was about 4 MB at Windows
asyncio proactor_events.py:191, the read-transport bytearray buffer allocation
(inspected in the installed Python source). This is a buffer allocation
location, not proof of its lifecycle or a proven leak root cause. The traced
total decreases below baseline in this run, which does not support monotonic
Python allocation growth here; native allocations and longer-term leaks
remain unproven. Profiler overhead makes throughput unsuitable for comparison.
Raw: `scratch/http-mixed-results-memory-profile.json`; log:
`scratch/http-memory-profile-api.log`. `RESILIENCE_MEMORY_PROFILE=1` is opt-in.
No runtime/business logic changes were made to "fix" unproven leakage.

Same-process load/recovery memory observation on 2026-10-06: 30,100 mixed
requests in 180.157 seconds, zero invalid/unexpected responses, correct five
mixed orders and stock. Thirty-one process-tree samples during load and
seven during 30 seconds without client requests (scheduler still enabled)
show private bytes 144.29 MiB at first load sample, 159.68 MiB at last load
sample and 163.49 MiB at final idle sample; maximum load sample 163.57 MiB.
Final idle aggregate working set 186.91 MiB. The memory did NOT return to
the initial sampled level; this test does not pass a no-leak/steady-state
gate, nor does retained memory alone establish a leak. Longer repeated
cycles and allocation profiling are required; scheduler work and allocator
retention remain potential confounders. Business/DB outage assertions passed,
and owned resources were cleaned up. Raw:
`scratch/http-mixed-results-180s.json`; log:
`scratch/http-mixed-180s-idle-api.log`. Harness now supports optional
`RESILIENCE_IDLE_SECONDS` (0-300) for post-load sampling. This remains local
synthetic retry saturation, not production memory or new-order capacity.

Resource-aware local mixed-load run on 2026-10-06 passed 9,800 requests in
60.088 seconds with zero invalid/unexpected responses. Ten periodic samples
cover the API launcher AND its observed Python child (two process IDs):
aggregate working set 166.43-183.52 MiB, private bytes 143.77-159.57 MiB;
CPU delta divided by sampled wall time is 86.59% of one core on average.
Working-set aggregation may double-count shared pages; these are sampled
ranges, not instantaneous peaks, Docker/Railway resource metrics or proof
against memory leaks. Growth requires a longer warm-up/steady-state/recovery
experiment to distinguish cache/allocation from leakage. Sampling itself
adds overhead; no before/after performance percentage is justified.
Raw: `scratch/http-mixed-process-tree-results.json`; log:
`scratch/http-mixed-process-tree-api.log`. The initial launcher-only run
(`scratch/http-mixed-resource-results.json`) measured about 4 MiB/zero CPU
and is INVALID for API resource claims; do not reuse those resource figures.
The corrected Windows sampler includes only descendants of the owned API
process. Workload remains synthetic finite-stock retry saturation, no live
provider or production traffic; processes/DB cleaned up after each run.

Live API browser payment/polling verified locally on 2026-10-06: QR
checkout returns pending and its payment endpoint confirms `dang_xu_ly`.
An unauthorized synthetic webhook returns 401. Two authorized deliveries
of the same synthetic bank transaction return 200; SQL finds one confirmed
receipt. Browser polling observes payment success and automatically reaches
the success page with cart cleared. Four browser scenarios create four
checkout records, selected stock [8,8,8] and journey stock [9,10,10].
This uses the real local checkout/webhook/payment API and DB, but callback
is synthetic: no bank transfer, SePay delivery or external QR scan is tested.
External browser requests are blocked for the payment scenario, including
the QR image provider. Token/cart bootstrapping still applies to this case.
Evidence: `scratch/http-live-browser-results.json` and
`scratch/http-live-browser-payment-api.log`. No production data/config changed.

Continuous browser commerce journey verified locally on 2026-10-06:
the authentication case now proceeds from real form login to product 6,
selects its 15cm size, adds one item through the product UI, opens cart,
uses the checkout button, submits COD and reaches the success page with
cart cleared. No token/cart is injected for this journey, and API routes
are not mocked. Actual checkout response is 201/unpaid/100000; SQL finds
three checkout records across all three browser cases. Journey stock is
[9,10,10]; the independent COD/retry product stock remains [8,8,10].
This supersedes the separate-login/submission-only limitation for one COD
journey, not payment, voucher, pre-order, gift-box or mobile coverage.
Raw: `scratch/http-live-browser-results.json`; log:
`scratch/http-live-browser-journey-api.log`. Data remains synthetic and local,
providers disabled; nothing was pushed or written to production.

Local live-browser authentication now verified on 2026-10-06: a seeded
disposable customer has a bcrypt password hash generated by the app's actual
security helper. Browser starts without an injected access token, submits
a deliberately wrong password (HTTP 401, no saved token), then the correct
synthetic password (HTTP 200, navigation away from login). Its stored token
authenticates `/auth/me` as the expected customer. This test uses real API
responses, not auth mocks; it does not cover Cognito or production credentials.
The two checkout/retry cases also reran; they still bootstrap tokens/carts
independently, so this is not yet one continuous login-to-purchase journey.
Evidence: `scratch/http-live-browser-results.json` and
`scratch/http-live-browser-auth-api.log`. No Railway accounts/data changed.

Live-backend browser retry test on 2026-10-06 passed together with COD:
Chromium's first checkout request is forwarded to the actual local API;
only after real 201/commit does the test abort delivery to the browser.
After reload the UI preserves the same idempotency key and payload, retries
and receives the same persisted order ID, then clears pending checkout state.
The test injects browser transport failure, not a server crash or fabricated
API response. SQL sees exactly two checkout records for the two scenarios;
selected product stock ends [8,8,10], proving no extra deduction on replay.
Raw: `scratch/http-live-browser-results.json`; log:
`scratch/http-live-browser-retry-api.log`. Tests still bootstrap token/cart
and run on host Python; login/product selection and payment flows remain
separate gates. No external provider or production data was involved.

Real browser-to-backend local checkout verified on 2026-10-06: opt-in
`--browser` harness ran Chromium against Vite and the actual local API/DB,
without intercepting or mocking API routes. Synthetic token/cart setup
bypasses interactive login and product/cart selection, so those flows are
not covered. Browser submitted COD checkout, received 201/unpaid/200000,
navigated to the order success page and cleared its cart. SQL found exactly
one checkout record; selected product availability became [8,10,10]. One
browser case passed in 2.5 seconds; frontend lint passed. Raw evidence:
`scratch/http-live-browser-results.json`; log: `scratch/http-live-browser-api.log`.
Initial attempts exposed harness Windows output decoding and the API's
Decimal-as-string response (test corrected its numeric comparison).
The harness also completed its normal replay/contention/DB outage checks
and cleaned up API/DB. This closes COD submission coverage on host Python,
not full browser commerce, login, real payment, retry failure or Docker
browser coverage. External providers stayed off; no production writes.

Full backend regression on the Docker runtime on 2026-10-06 passed:
405 passed, one opt-in controlled benchmark skipped, in 31.86 seconds.
JUnit: `scratch/image-regression-suite.xml`. It used the previously built
Python 3.12.15 image, a separate PostgreSQL 16 DB, read-only mounted tests
and pytest 9.1.1/pytest-asyncio 1.4.0 installed under container `/tmp`.
App dependency versions remained those installed in the image. Initial
collection lacked `scripts.seed_guard` (not packaged by production Dockerfile);
the helper was copied only into the disposable test container, then the
entire suite reran. This is not an image packaging defect for API boot,
but means test scaffolding is additional to the deployed image. The image
contains the current backend changes; source tests include the latest
process-level scheduler test. External AI/tracing providers were disabled.
Container/network cleanup completed. This supersedes the Python-version
gap for automated backend regression, NOT for load tests, live providers,
real browser end-to-end flows or actual Railway deployment identity.

Docker runtime smoke on 2026-10-06 passed using the actual repository
Dockerfile and Python 3.12.15 (Linux), separate from host Python 3.14 tests.
Image ID: `sha256:683ddb453c6adcb953a104d0791aa574d35afa82d9ce21d03613ea3ed2c5bebd`.
Build, application import, Alembic upgrade through 0017 and pip dependency
check passed. With a disposable PostgreSQL DB and scheduler/providers off,
HTTP `/health`, `/health/db`, empty `/products`, and `/openapi.json` returned
200. Stopping that DB produced liveness 200/readiness 503; restarting it
restored readiness/catalog 200 without restarting the API. Owned containers
and network were removed; the local image remains. This is boot/readiness
smoke, NOT the full regression suite or business/load tests on Python 3.12.
Requirements use open ranges: fresh image resolved e.g. FastAPI 0.142.2,
SQLAlchemy 2.1.3, OpenAI 3.24.0 and Langfuse 4.17.0. Do not infer matching
dependencies from the host results or claim this image is deployed Railway.

Evidence provenance is now emitted by the HTTP harness: base Git commit,
SHA-256 per backend/migration/harness source file, combined manifest hash,
Python/OS/package versions and PostgreSQL version. This identifies dirty
source content without capturing .env or secrets, but does not fingerprint
the full deployment or all installed packages. The base HTTP probe passed
again after this change (read tiers, checkout replay/contention, DB outage
and recovery). Raw: `scratch/http-resilience-results.json`; log:
`scratch/http-provenance-api.log`. Older reports without this metadata must
not be retroactively assigned the current source identity. Harness startup
now waits for PostgreSQL TCP readiness to avoid the temporary init server;
an initial failed metadata-read run exposed that race and was cleaned up.
Focused Ruff checks passed. No production configuration/data was changed.

Latest canonical-metadata restore drill on 2026-10-06 PASSED. The harness
retains raw CHECK definitions, then asks PostgreSQL itself to parse each
definition on a transaction-local temporary table with the source column
types. The resulting deparsed definitions match across source/restored DB:
149 constraints (including names/types/validation flags), 35 sequence
last_value/is_called states, 73 indexes and all 38 table data digests match.
Raw CHECK text still differs; no string-replacement normalization or blanket
constraint bypass is used. This resolves the previous representation-only
comparison failure within this same-version local drill, not a general
cross-version equivalence proof. Restored API catalog/stock/order reads
returned 200. Evidence: `scratch/http-backup-all-tables-with-payment-results.json`
and `scratch/http-backup-canonical-metadata-api.log`; prior failed evidence
is retained as `scratch/http-backup-raw-constraint-mismatch-results.json`.
Columns/defaults/enums/triggers, sequence configuration/ownership, uploaded
files and production restore/cutover still need separate coverage.

Latest expanded restore gate on 2026-10-06 FAILED exact constraint-definition
comparison. All 38 table counts/data digests, sequence last_value/is_called
states and 73 index definitions matched. Ten of 149 constraint definitions
have different deparsed CHECK expressions: for example a cast of a varchar
array to text[] became casts of individual varchar elements to text. This
may be a PostgreSQL expression rewrite, but semantic equivalence has not
been established by this test. The strict assertion remains in place; do
not describe the latest metadata-aware drill as passed. It stopped before
fresh restored-API verification and cleaned up its processes/container.
Raw: `scratch/http-backup-all-tables-with-payment-results.json`; log:
`scratch/http-backup-metadata-api.log`. The earlier data-only successful
drill remains historical evidence, not proof of complete schema recovery.

Expanded restore drill on 2026-10-06 passed: all 38 public tables matched
row counts and data digests between quiesced source and restored local DB.
The source API was stopped before snapshot/dump to prevent concurrent writes.
This run includes one synthetic successful payment and one confirmed SePay
receipt, plus 79 Agent actions and 79 proactive insights. Fresh API catalog,
stock and order reads returned 200. SQL restore plus digest verification took
1.160 seconds; this is not full recovery time/RTO. Evidence:
`scratch/http-backup-all-tables-with-payment-results.json` and
`scratch/http-backup-all-tables-api.log`. This supersedes ten-table-only
coverage; sequences, schema/constraint equivalence, product upload files,
cross-version recovery and Railway cutover remain unverified. No production
data or real bank transfers were used.

Scheduler entrypoint process test on 2026-10-06: seven scheduler tests
passed in 4.74 seconds (`scratch/scheduler-process-suite.xml`). Two separate
Python processes import and call the actual `_inventory_alert_scan_job`:
the holder enters a marker-based maintenance callback, the contender cannot
enter while the holder owns the PostgreSQL advisory lock, and a new process
enters after the holder is killed. The callback substitutes domain scanning
only to observe entry; PostgreSQL locking and scheduler connection lifetime
are real. This strengthens process-level exclusion/recovery evidence but
does not verify two full API workers, Agent-action recovery, or business
scan correctness during failover. Disposable DB removed after verification.

Extended mixed-load verification on 2026-10-06: 50 closed-loop client
threads completed 50,100 requests in 300.156 seconds, with zero invalid or
unexpected responses. Nearest-rank p95 was 500.74 ms; maximum 1,855.03 ms.
Reads returned 33,567 HTTP 200 responses. Checkout returned 4,008 HTTP 201
replays/successes and 12,525 expected HTTP 400 rejections; SQL confirmed
only five distinct mixed checkout records and stock [0,10,10]. Fifty-five
periodic DB samples recorded 11-13 connections and zero sampled lock
waiters, not an instantaneous peak guarantee. Subsequent DB stop/restart
checks passed readiness 503/liveness 200, then readiness/catalog 200.
Raw evidence: `scratch/http-mixed-results-300s.json`; API log:
`scratch/http-mixed-300s-api.log`. Owned API and disposable DB were cleaned
up. This is local finite-stock retry saturation with external providers
disabled, not new-order throughput, an hours-long soak, memory-leak proof,
or a production capacity claim. It does not support a before/after
performance percentage because the runs are not controlled paired trials.
The harness now accepts `RESILIENCE_SOAK_SECONDS` (1-3600, default 60)
and keeps non-default durations in separate result files.

Full backend regression rerun on 2026-10-06 after stale-notification
reconciliation: 404 passed, one opt-in controlled benchmark skipped, in
38.28 seconds. Evidence: `scratch/reliability-suite.xml`. The run used a
disposable PostgreSQL 16 container without existing-data mounts; AI and
Langfuse providers were disabled. The container was stopped and removed
afterward. This proves automated regression coverage, not production load
tolerance or live-provider reliability.

Narrow stale-notification reconciliation now implemented locally: proactive
scans examine stale automatic `create_proactive_notification` audit rows.
Only when an insight with matching fingerprint AND source alert is persisted
does the audit become completed, linked to that insight, marked `reconciled`.
No tool is executed and execution_attempts is unchanged. Missing results and
business mutation actions are not retried or marked successful. Combined
selective-autonomy/proactive regressions: twenty passed in 3.68 seconds.
This supersedes manual-only recovery for the already-written notification
window, not crash-before-notification execution or full mutation recovery.

Earlier AgentAction crash-state audit (partly superseded above): persisted `dang_xu_ly` actions are deduplicated,
not automatically reexecuted even after the stale threshold. New controlled
regression represents a completed notification with its action audit left
in-progress, then retries the same key: no duplicate insight or execution,
but action remains in-progress. Focused selective-autonomy suite: 13 passed
in 2.37 seconds. This is a synthetic persisted crash-state test, not an actual
process-kill experiment. Manual stale reset exists; automatic recovery of
low-risk notifications needs reconciliation before retry. Do not enable blind
retry for business mutations or bypass approval/revalidation to close this gap.

Production read-only spot-check on 2026-10-06: main domain
`https://leafcr.logantai.com/` returned 200; documented API
`https://api-production-3f93.up.railway.app/health` and `/health/db` returned
200. DB-health response at 16:50:04 +07:00 reported `connected`, error null.
These few public GETs do not prove deployed commit identity, uptime history,
load tolerance or deployment of the uncommitted local fixes. No authenticated
business reads, mutations, production fault injection or load tests occurred.
Repository Railway config still uses `/health`, pre-deploy Alembic upgrade and
ON_FAILURE restart with ten retries. No deployment settings were changed.

Local changes only; not committed, pushed or deployed. Production database was
not changed. Historical notes below are chronological: later verification can
supersede an earlier limitation, but never upgrades mock evidence to live use.

| Area | Verified improvement or behavior | Evidence boundary / remaining gate |
| --- | --- | --- |
| Checkout responsiveness | Removed synchronous insight refresh; 20 replay HTTP requests pass after previously reproducing a timeout | Not a controlled production latency percentage |
| Retry safety | Browser retains key on 503; API crash before/after commit does not duplicate stock deduction | Mock browser and real local HTTP are separate experiments |
| Inventory contention | 20 distinct users/keys for ten units create five orders and reject fifteen | One synthetic local race, not sustained mixed traffic |
| DB failure | Readiness 503; liveness remains 200; reconnect after DB restart | Railway still probes liveness; production outage not tested |
| Proactive recovery | Pagination fixed; 480 eligible alerts covered after restart, no missing/duplicate sources | No full multi-worker Agent-action failover or wall-clock deadline |
| Scheduler exclusion | PostgreSQL advisory lock excludes another connection and releases after holder process kill | Manual scans and stale-payment sweep have separate concurrency risks |
| AI failure/cost | Explicit timeout/no retries; five evaluations per scan; deterministic fallback | Fake-provider tests, not measured live provider availability |
| Payment idempotency | Twenty duplicate HTTP callbacks plus crashes before/after commit preserve one receipt/payment | Synthetic SePay, no real transfer or delivery-latency claim |
| Read load | 15,000 valid responses in 60 seconds with 50 keep-alive clients | Local catalog read-only soak; no hours-long leak/capacity test |
| Restore | Ten core table digests match; fresh API reads restored catalog/stock/order | Same-version local restore; not Railway disaster recovery/files |
| Frontend | 60 unit tests; lint/build pass; nine Chromium browser cases pass | Browser API responses mocked, not real end-to-end production |

Full Chromium suite: nine passed in 11.5 seconds, covering public lazy routes,
anonymous checkout protection, profile password UI, checkout recovery and
Leafie desktop/mobile context/cards/retry/layout. Source: `frontend/e2e`.
All application API calls are intercepted synthetic responses for these tests.

Required before a broad stability claim: sustained mixed authenticated traffic,
resource/connection measurements, multi-worker scans and action crash recovery,
production read-only configuration/runtime verification, restore/rollback
operational runbooks, and provider-specific live verification with approval.
No validated business-performance percentage or production capacity guarantee
is claimed. Preserve unrelated worktree edits when publishing this change set.

Mixed authenticated local load (`--mixed`) passes: 9,200 requests in 60.086
seconds at 50 closed-loop client threads, scheduler enabled. Catalog and
availability reads: 6,164 HTTP 200; checkout/replays: 828 HTTP 201 and 2,208
HTTP 400 domain rejections. Despite 828 success responses, SQL finds only five
distinct mixed checkout records, as successful requests replay twenty users'
stable keys. Selected stock ends [0,10,10], not negative. Unexpected/invalid
responses: zero. Overall nearest-rank p95 559.42 ms, maximum 813.27 ms.
Eleven periodic DB samples show 11-12 connections, including the sampler;
these samples do not prove instantaneous peak or absence of memory leaks.
Raw: `scratch/http-mixed-results.json`; log: `scratch/http-mixed-api.log`.
This is a finite-inventory synthetic saturation/retry workload, not realistic
ongoing replenishment, active-customer throughput or an hours-long soak.

Measured 2026-10-06 on local Windows, isolated PostgreSQL 16 Alpine and one
Uvicorn worker. Production/Railway data was not accessed or modified.
These are controlled experiments, not customer traffic or production capacity.

## Verified

- Full backend suite: 395 passed, one opt-in benchmark skipped, 45.50 seconds.
  Raw JUnit: `scratch/reliability-suite.xml`.
- Independent committed-session concurrency: 6 tests passed. Same checkout
  key at 2/10/20 threads produced one order and one inventory deduction.
  Twenty distinct keys competing for ten units (two per order) produced five
  orders, fifteen domain rejections and zero remaining inventory.
  Source: `tests/test_checkout_concurrency.py`.
- DB readiness now returns HTTP 503 with a sanitized error on failed queries;
  liveness remains HTTP 200. Mocked failure/recovery regression is in
  `tests/test_health.py`.

## Actual HTTP and database outage experiment

Run: `RUN_HTTP_RESILIENCE=1` with the repository Python environment, then
`python scripts/verify_http_resilience.py`. The script owns a dedicated Docker
container, applies migrations, starts a separate API at 127.0.0.1:58081,
stops/starts only that DB, and removes its container/process afterwards.
Raw request results: `scratch/http-resilience-results.json`.
The raw file is overwritten by each run. The read-only timing table below
describes the earlier populated-catalog run, not the latest checkout run.

### Latest authenticated checkout run: FAILED latency gate

Twenty synthetic customer accounts were created only in the disposable DB.
Twenty concurrent requests with one user's identical idempotency key returned
19 HTTP 201 responses and one client TimeoutError after 10017.37 ms (10-second
client timeout). Inventory remained eight units from ten, consistent with one
two-unit deduction. The timeout is a real failed request observation, not a
successful response; this run does not pass the harness.

Twenty distinct users/keys competed for ten units of a second variant:
five HTTP 201 responses and fifteen HTTP 400 responses, ending with zero
sellable units. Final product availability was [8, 0, 10]. No real payment
provider was used (pay-later checkouts).

An instrumented rerun reproduced the timeout. The newly created checkout took
11.578 seconds at the service boundary; deterministic alerts took 0.909 seconds
and proactive insights took 10.609 seconds. The nineteen replay service calls
took 0.087-0.372 seconds. This local trace demonstrates synchronous insight
refresh delaying the newly created order response beyond the client deadline.
It does not establish the individual SQL bottleneck or production latency.
Instrumented raw results/log are preserved as
`scratch/http-checkout-instrumented-results.json` and
`scratch/http-checkout-instrumented-api.log`.

Checkout commits the order before
calling synchronous `safe_refresh_inventory_attention`; that hook is disabled
in the service concurrency fixture but remains active in this actual HTTP
experiment. The instrumentation wraps original functions in the test process,
without disabling their execution or changing production code.
Next: preserve the failure artifact, isolate hook timing, reproduce the
timeout, and verify lost-response retry against persisted order/stock/ledger.

A later attempted cProfile run is INVALID for performance comparison: Python
3.14 raised `Another profiling tool is already active` during simultaneous
profiling; the best-effort hook swallowed that instrumentation error. The
harness no longer uses cProfile. Do not interpret this run as successful
business behavior or use its profile counts as per-request measurements.
Connection-scoped query counting replaces profiling; counts only cover the
initial connection, since service commits can acquire new connections.

Each tier sends 200 GET requests, alternating `/products?limit=60` and
`/products/1/availability`.
Client workers are concurrent request loops, NOT simulated authenticated users.
The synthetic database has 60 products, 180 variants and 360 batches, half
expired and half valid, each with ten units. Availability returns ten sellable
units per variant, excluding expired inventory. Scheduler and AI
providers are disabled. No writes, bank transfers or webhook calls occur.
Each tier was run once; tiers are sequential, with warm-up/cache bias possible.
Percentiles below use nearest-rank on all requests within each tier.

| Client workers | Requests | Non-200 | Duration seconds | p50 ms | p95 ms |
| --- | --- | --- | --- | --- | --- |
| 1 | 200 | 0 | 2.260 | 5.95 | 31.03 |
| 10 | 200 | 0 | 0.680 | 30.78 | 48.67 |
| 50 | 200 | 0 | 0.700 | 164.88 | 194.95 |

After stopping PostgreSQL, `/health/db` returned 503 in 2079.00 ms and
`/health` returned 200 in 16.00 ms. After restarting PostgreSQL and waiting
for `pg_isready`, readiness returned 200 in 44.25 ms and products returned
200 in 18.94 ms. API process remained alive without restart. These are single
observations; they do not measure recovery time from the beginning of outage.

## Still unverified

## Checkout scheduling change (local, not deployed)

Checkout no longer scans all alerts/insights synchronously after commit. It
wakes the existing scheduler job. That job also runs at startup and every
minute, re-reading durable inventory conditions. This recovers current-state
work after lost wakeups, not every transient historical event. No database
schema changes, external queue or audit bypass were introduced.

The same local HTTP harness passed after this change: all twenty same-key
checkout responses were HTTP 201 and referenced one order; distinct-user
competition still returned five 201 and fifteen 400 responses, with stock
[8, 0, 10]. Evidence: `scratch/http-checkout-scheduled-results.json` and
`scratch/http-checkout-scheduled-api.log`. Scheduler was enabled, unlike the
earlier baseline. Do not derive a controlled latency-improvement percentage
from these differently scheduled runs.

Regression after scheduling edit: 398 passed, one opt-in benchmark skipped,
36.17 seconds (`scratch/reliability-suite.xml`). A subsequently added startup
scheduling assertion was checked in a focused run: four scheduler tests passed
in 1.30 seconds (`scratch/scheduler-reliability.xml`). The startup test verifies
immediate/periodic schedule configuration and no duplicate job creation; it
does not simulate a killed process and prove persisted insights recover.

Actual restart experiment (`--recovery` mode) passed: API initially ran with
scheduler disabled, processed the same checkout scenarios, and had zero
persisted insights. The harness killed that API process and restarted it with
scheduler enabled against the same DB. It observed ten persisted insights
after 3.725 seconds and confirmed a different API PID. Sellable stock remained
[8, 0, 10] after restart. Raw evidence:
`scratch/http-startup-recovery-results.json` and
`scratch/http-startup-recovery-api.log`. This proves startup resumes some
missed current-condition work; the probe stops at the first nonzero count,
so it does NOT establish complete backlog drainage, exact alert-to-insight
coverage or recovery from a crash midway through an individual action.

Still required: complete backlog drainage and mid-action crash recovery,
multi-process scheduler coordination, and verification that sustained checkout
traffic cannot starve scans. A one-minute scan interval also needs resource
measurement before production rollout.

Extended restart run: zero insights before API kill; after restart, 360
persisted insights versus 360 eligible alerts were observed after 11.924
seconds. Raw: `scratch/http-startup-recovery-results.json`; log:
`scratch/http-startup-recovery-complete-api.log`. Eligibility is an independent
SQL count of pending high expiry/expired alerts plus product-stock digests in
this synthetic fixture. Matching counts do not alone prove exact one-to-one
source coverage; a missing-source join and duplicate-source check remain.

Code inspection also found a scale limit: proactive candidate selection reads
only the first 200 alerts per expiry type, plus ten stock digests. Existing
insights stay in that candidate window, so larger backlogs may starve later
alerts. This dataset has fewer than 200 alerts per expiry type and does not
test that boundary. A >200-per-type fixture is required before claiming
unbounded backlog recovery.

Pagination fix subsequently implemented locally: candidate selection traverses
all pages (200 rows per fetch) before evaluating conditions. Expanded fixture:
80 products, 240 variants, 480 batches, 240 expired. Startup recovery observed
480 persisted insights for 480 eligible alerts after 14.589 seconds. SQL
anti-join found zero eligible alerts missing an open insight; grouped source
IDs found zero duplicate open insight sources. Raw latest recovery result:
`scratch/http-startup-recovery-results.json`; log:
`scratch/http-large-backlog-recovery-api.log`. This checks beyond the previous
200-per-type boundary, not arbitrary scale. Full regression after pagination
edit, bounded LLM evaluation cost, repeated scans and multi-process coordination
remain unverified. All candidates are still materialized in memory.

Latest regression after pagination and scheduler locking: 400 passed, one
opt-in benchmark skipped, 37.48 seconds (`scratch/reliability-suite.xml`).
Inventory scans now take a nonblocking PostgreSQL advisory lock on a dedicated
connection, retained across business-service commits, explicitly unlocked
before returning it to the pool. Failed unlock invalidates the connection.
An actual PostgreSQL test holds the same lock on another connection: scan
skips; after release, two successive scans execute, proving normal release.
This is cross-connection exclusion evidence, not yet a full two-API-process
crash/failover experiment. Direct manual scan entry points are not covered by
this scheduler-only lock. Stale-payment sweep coordination remains separate.

First 60-second soak FAILED and is not a valid server capacity measurement:
15,600 requests in 60.080 seconds, 2,147 non-200/invalid responses. The driver
opened a fresh TCP connection per urllib request. API logs include local
Windows socket error 10048 (`Address already in use`) opening PostgreSQL
connections on the same host. Subsequent outage probes got URLError; one
recovery product probe got 500. These observations cannot separate load-driver
ephemeral-port exhaustion from application bottlenecks. Preserve:
`scratch/http-soak-results.json` and `scratch/http-soak-api.log`.
Next: reuse HTTP keep-alive connections, retain error classification and repeat;
do not count this failure as proof of production request failure rate.

Keep-alive repeat: 15,000 requests in 60.102 seconds, zero non-200 and zero
invalid payloads, nearest-rank p95 348.44 ms, maximum 549.10 ms. This is one
local 50-client read soak with scheduler enabled, not a long-duration leak
test or production capacity limit. DB outage returned readiness 503 and
liveness 200; after restart readiness returned 200. The harness still exited
nonzero because `/products/` returned the expected HTTP 307 slash redirect
(urllib followed it previously, httpx does not). Recovery probe now uses the
canonical `/products` route. Do not report that entire run as passing.
Raw: `scratch/http-soak-results.json`; log:
`scratch/http-soak-keepalive-api.log`.

Deployment inspection: Dockerfile uses one worker; Railway's configured
healthcheckPath is `/health` (liveness), not `/health/db` readiness. No deployment
configuration has been changed during these tests.

Lock-holder crash experiment now passes: a separate Python process holds the
PostgreSQL scan advisory lock; the test connection cannot acquire it. After
the holder is killed, that connection acquires the same lock within a bounded
ten-second wait and releases it. Focused scheduler suite: six passed in 2.02
seconds (`scratch/scheduler-reliability.xml`). This verifies lock crash release,
not business-action crash recovery or full multi-worker scan correctness.

After correcting the canonical recovery URL, the default keep-alive HTTP
harness exits successfully: all 600 read requests, replay/competing checkout
invariants and actual database outage/recovery assertions pass. Raw latest:
`scratch/http-resilience-results.json`. This rerun is the short scenario, not
a repeat of the 60-second soak.

Lost-response crash experiment (`--lost-response`) passed: test-only wrapper
exits API with code 71 immediately after the original checkout service returns
(its transaction has committed), before HTTP serialization/response. Client
observes a transport error. After restarting the API against the same DB,
retrying the same authenticated key/payload returns 201; exactly one matching
checkout record exists and sellable inventory changes from [8,0,10] to
[8,0,8], not [8,0,6]. Evidence:
`scratch/http-lost-response-results.json` and
`scratch/http-lost-response-api.log`. Injection is restricted to the disposable
DB harness process; no production crash hook exists. This proves the
post-commit/pre-response window for this checkout, not crashes before commit,
mid-payment or mid-Agent-action. No real bank payment occurred.

Pre-commit crash experiment (`--before-commit`) passed: test-only wrapper exits
with code 72 after `OrderService.create_order(..., commit=False)` returns,
before checkout commits. Independent SQL after process exit finds the original
six fixture orders only and ten units still in the selected valid lot. After
API restart, retry returns 201, one checkout record exists and stock becomes
eight units. Raw: `scratch/http-before-commit-results.json`; log:
`scratch/http-before-commit-api.log`. This covers rollback of the staged
order/inventory transaction on process death. It does not simulate disk loss,
PostgreSQL corruption or bank-provider transaction interruption.

Frontend audit found checkout cleared its persisted idempotency key on HTTP
503, incorrectly treating server/proxy failure as proof of no committed order.
Locally fixed: only definitive domain/validation rejection (400/422) clears
the attempt; transport errors, 5xx, 401 and 409 retain the original key/payload.
Nine status-policy cases were added; frontend unit suite now has 60 passing
tests. This verifies the policy helper and existing storage behavior, not an
actual browser lost-response journey. Payment QR polling checks server payment
status rather than marking payment successful based on a user button; review
is code evidence, not live SePay delivery evidence.

Disposable backup/restore experiment (`--backup`) passes: pg_dump of the
synthetic application DB restores via psql with ON_ERROR_STOP into a separate
`leafcreme_restore_test` database. Independent count plus stable sorted-row
digest matches for ten core tables (users, roles, products, variants, lots,
stock, orders, order lines, checkout keys, payments). Actual source/restored
digests are in `scratch/http-backup-restore-results.json`.
This is a small local logical restore on the same PostgreSQL version, not a
Railway backup test, disaster RTO/RPO, full-table equality audit, restored API
boot verification or proof of external image/file recovery. Scheduler writes
can continue in other tables during this run; selected core tables are not
mutated while their digests/dump are collected. No production backup touched.

HTTP duplicate-webhook experiment (`--webhook`) passes: synthetic SePay QR
checkout for 200,000 VND, one wrong authorization request rejected with 401,
then twenty concurrent identical authenticated webhook requests returned 200.
Independent SQL finds one `SEPAY-987654` receipt and one successful payment
of 200,000 VND, not twenty payments. Raw: `scratch/http-webhook-results.json`;
log: `scratch/http-webhook-api.log`. Receiving account and API key are fake
values scoped to the disposable runtime. No bank/provider call occurred.
This tests authentication/idempotency, not real money confirmation latency,
malformed transaction variants or crash midway through payment processing.

Webhook pre-commit crash (`--webhook-before-commit`) passes: test-only session
commit wrapper flushes pending payment/receipt SQL then terminates the test API
with code 73 before commit. Independent SQL after death finds payment still
pending and zero matching receipts. After API restart, twenty duplicate
webhook retries return 200 with one successful 200,000 VND payment and one
receipt. Evidence: `scratch/http-webhook-before-commit-results.json` and
`scratch/http-webhook-before-commit-api.log`. This proves transaction rollback
and retry for this synthetic webhook, not provider retries in production.

Webhook post-commit lost-response (`--webhook-after-commit`) also passes:
test API exits code 74 after original webhook processing returns and before
HTTP response. SQL confirms one committed receipt and successful payment before
restart. Twenty retries after restart still leave one successful 200,000 VND
payment and one receipt with `confirmed` status, not `refund_required`.
Raw: `scratch/http-webhook-after-commit-results.json`; log:
`scratch/http-webhook-after-commit-api.log`. The original idempotent payment
implementation passed both crash windows without business-logic edits.

Proactive provider-failure controls implemented locally: client timeout 10
seconds, retries zero, and at most five LLM evaluations per scan. Failed
attempts consume the evaluation budget. Remaining new conditions still receive
deterministic notifications, not dropped alerts. Budget-exceeded deterministic
notifications are not automatically upgraded to LLM recommendations later.
Each evaluation still allows three model/tool iterations, so the scan budget
is not a ten-second total wall-clock deadline. Timeout is client request
configuration, not a hard kill for SQL/tools or observability flushing.
Focused proactive suite: seven passed in 2.90 seconds. New tests verify six
conditions all create notifications while only the first five allow LLM;
a fake provider timeout yields the grounded deterministic fallback and verifies
timeout/retry constructor settings. No actual slow provider was contacted.

Chromium checkout browser suite now passes four scenarios (12.5 seconds):
COD confirmation/cart clearing; lost response plus reload/same-key retry;
late-payment reconciliation hides expired QR and stops polling; newly added
HTTP 503-after-commit plus reload/same-key retry. Source:
`frontend/e2e/checkout.spec.ts`. These execute the real frontend in Chromium
with intercepted mock API responses. The mock committed-key set checks client
request identity, not real database order creation. Actual DB crash/checkout
evidence remains the separate HTTP harness. No production browser mutation.

- Repeated larger-catalog measurements, authenticated browsing and mixed checkout
  traffic over HTTP; sustained soak and resource/connection saturation.
- Crash between transaction steps; retry after lost HTTP responses; concurrent
  mutation traffic during outages, followed by DB invariant checks.
- Real SePay delivery latency, real LLM/provider availability, and production
  multi-process scheduler/rate-limit behavior.
- Frontend behavior under slow/offline/error responses and end-to-end journeys.
- Backup restore and deployment rollback with schema compatibility.

No production capacity guarantee or performance improvement percentage is
supported yet. Historical controlled business-rule comparisons are documented
separately in `controlled-operations-benchmark.md`.

Extended restore verification now passes: source API stopped, a fresh API
process starts with DATABASE_URL pointing to `leafcreme_restore_test` and
scheduler disabled. Restored readiness, 80-product catalog, inventory
availability [8,0,10] and authenticated original order read all return 200;
the pre-restore user's token remains valid with the same runtime secret.
Evidence: latest `scratch/http-backup-restore-results.json` and
`scratch/http-restored-api.log`. This supersedes the earlier limitation about
unverified restored API boot, but not Railway backup, external files, full
table equality, credential recovery or larger-dataset disaster recovery.
