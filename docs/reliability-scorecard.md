# Reliability scorecard

Refreshed against current local files and available artifacts on 2026-10-07
local time; individual experiment/remote dates remain labeled below.
Measurements below were taken before release from a dirty local worktree.
All business records used below are synthetic in disposable PostgreSQL;
none are real customer operations.

## Release Scope

The approved release includes reliability fixes, operational-alert presentation,
regression tests and reproducible diagnostic harnesses. It does not include
the separate Leafie v3 prompt/test/documentation edits or the UI demo. The
472-pass candidate result below includes those local prompt edits; it is not
an exact-commit CI result for this scoped release. Use the pushed commit's CI
and deployment records to establish release verification. Ignored `scratch/`
artifacts remain local and are not distributed with this release. No database
seed, data transfer or new schema migration is included.

## What improved versus before

| Area | Before evidence | After evidence | Defensible conclusion |
| --- | --- | --- | --- |
| Expired-lot allocation | Historical service: 20/30 paired requests used an expired lot | Current service: 0/30; ten unaffected controls match | Expiry filtering fixes those targeted cases; FEFO ordering already existed |
| Unpaid POS status/revenue | Historical service: 30/30 completed; synthetic 7.3M VND counted in sales | Current service: 0/30 completed; 0 synthetic unpaid revenue | Prevents the reproduced unpaid-order accounting defect, not recovered real revenue |
| DB readiness | Previous code implicitly returned 200 on DB failure and exposed exception text | Current code returns sanitized 503; real host/Docker outage drills verify recovery to 200 | Correct failure signaling; Railway still probes `/health`, not DB readiness |
| Checkout side effects | Previous code ran inventory/insight refresh inline after order commit | Current code wakes the existing scanner; contention/retry/failure drills pass | Removes that synchronous dependency; no controlled latency-improvement percentage |
| Browser retry on 503 | Previous frontend cleared the checkout key on 503 | Current frontend retains uncertain attempts; mocked 503 and live lost-response tests preserve key/order/stock | Fixes the tested retry path; live 503 delivery itself remains separate coverage |
| Proactive backlog coverage | Previous scanner queried bounded first pages | Paginated scanner covers all eligible sources in isolated drills | Prevents missing later pages in the tested datasets |
| Notification crash recovery | Stale claimed action could remain in-progress | Existing insight reconciles without reexecution; missing insight goes through bounded, revalidated retry | Covers both tested notification crash windows, not arbitrary mutation recovery |

Historical paired numbers: `controlled-operations-benchmark.md` and
`controlled-operations-benchmark-results.json`. Both sides use current models
and dependencies with selected historical service implementations, not full
old deployments. The relative reduction is 100% only for the deliberately
constructed error counts; do not present it as a business/population rate.
Other "before" rows are code comparisons, not measured operating baselines.

The paired experiment was refreshed against current local files on
2026-10-07: 30 expiry pairs again yielded 20 before/zero after errors, with
the ten controls matching; 30 POS pairs yielded 30 before/zero after unpaid
completed orders and synthetic report totals 7,300,000/zero VND. Historical
source refs remain `627d448...` and `c8eb684...`, running with shared CURRENT
schema/dependencies, not full historical deployments. Raw refreshed evidence:
`../scratch/controlled-operations-benchmark-refreshed.json`; related suite
25 passed in 32.13s (`../scratch/controlled-operations-refreshed-suite.xml`).
No operational timing, real revenue or population improvement is implied.

## Current measured behavior

Latest candidate load revalidation: flush-fix image `74da236...`, explicitly
verified at one CPU/256 MiB, passed the same k6 script hash at target 100/sec
for 30 seconds: 3,001 valid reads, zero dropped/busy, mean 100.005/sec,
completed-read p95 7.592ms and p99 65.351ms. Post-load API health/readiness
was healthy without OOM. Artifact:
`../scratch/flush-candidate/k6-arrival-100rps-30s-summary.json`.
Original image results remain untouched. This one matched short profile
does not establish a latency-improvement percentage, maximum capacity,
checkout throughput, LIVE_LLM load or long-term production stability.

Candidate HTTP/outage refresh: baked flush-fix image `74da236...` passed the
fake-key/refused-loopback Langfuse drill. SDK 4.17.0 created a real context
and reported failed exports; Leafie policy chat and Operations Agent fallback
were HTTP 200 before/after the wait. Agent explicitly returned `used_llm=false`,
with zero tool calls/proposals. Checkout/replay were 201 for one order and
stock remained `[8,10,10]`; post-test health/readiness was healthy, no OOM.
Artifact: `../scratch/langfuse-outage-flush-candidate-results.json`.
Fallback bypasses the model loop: this is not LIVE_LLM or a real ingestion
test. Only synthetic customers/staff, fake keys and loopback export were used.

**Nonblocking flush candidate rebuilt and regression-verified:** request-path
`flush()` called SDK export synchronously. An event-controlled regression
failed before the change because the caller waited for a blocked exporter
(`../scratch/blocking-flush-before.xml`). It now schedules at most one daemon
worker and coalesces additional flush requests while that worker is active.
Twenty-two focused tests passed (`../scratch/nonblocking-flush-focused.xml`),
including release on SDK/thread-start failure. The real SDK 4.17.0 in-memory
privacy probe first passed with the candidate helper mounted and then passed
on baked code without helper overrides. Full candidate image regression:
472 passed/one skip in 32.54s (`../scratch/flush-image-regression-suite.xml`),
image `74da23643502599db544dc705d73beb5529273cd84b2d146c79b71127afdeb64`.
This is component/regression evidence, not live provider latency. Earlier
469-test/load artifacts predate this change; full HTTP/provider/load gates
remain separate. Async flush is best-effort, not delivery assurance at process
termination; the SDK's normal batch processor still handles queued spans.

**Local privacy fix rebuilt and regression-verified:** real SDK 4.17.0 in-memory
export inspection reproduced synthetic credential leakage in input plus raw
exception message/stacktrace/status. Before artifact:
`../scratch/sdk-exception-privacy-before-fix.json`. Free-text credential/JWT/
connection-string patterns are now masked; SDK contexts end without receiving
the original exception while callers still receive the exact original object.
After artifact `../scratch/sdk-exception-privacy-results.json` shows no tested
markers, preserved ERROR/type capture and exception identity. Nineteen focused
tests passed (`../scratch/privacy-focused-suite.xml`). The after run mounts
two candidate helper files into the old image. A subsequent baked-image
probe (no helper mounts) also passed, and full candidate regression passed
469 tests/one skip in 49.60s. Candidate image is
`4173998bbfa9490340f1e8bce9914e226f86d878893033628240df5a36248aab`;
JUnit `../scratch/privacy-image-regression-suite.xml`. Prior 462-test/load
results still describe the earlier image, not post-fix load behavior.
This is not a guarantee for arbitrary free-form names/addresses,
third-party instrumentation or all possible secret formats. No Cloud traces
or real customer data were used.

**Unresolved overload failure:** the 200-client Docker drill reached 200
in-flight reads but timed out 1,004 of 1,200 requests; API remained running
yet liveness healthchecks timed out and DB pool was exhausted. The subsequent
checkout phase did not complete verification. Fifty-client success below
does not establish overload resilience. See detailed audit and
`../scratch/image-http-load-200-clients-results.json`.

Local admission mitigation subsequently removed observed pool starvation and
ReadTimeout in two reruns, but strict verifiers remain failed for 1/7,600 and
3/7,200 RemoteProtocolError outcomes. Do not claim all 200-client requests
passed; the connection-lifecycle issue remains unresolved. Full host suite
after mitigation: 432 passed/one skip (42.71s).

A subsequent event-name-only HTTPX transport diagnostic run passed 7,200/7,200
reads with peak 200 in-flight requests in 63.58 seconds; checkout replay,
contention, and stock assertions also passed. Artifact:
`../scratch/image-http-load-200-clients-results-connection-trace.json`.
The prior intermittent RemoteProtocolError did not recur, so its cause remains
unproven. One clean run does not invalidate the two earlier failed runs or
establish sustained production capacity. The disposable containers/network
were removed after collection; no Railway data was changed.

The subsequent three-minute diagnostic run **failed**: 21,998/22,000 reads
returned valid HTTP 200, with two RemoteProtocolError outcomes, peak 200
in-flight reads, elapsed 180.828s. Both failure traces had no new TCP-connect
event and failed during `http11.receive_response_headers`, consistent with
reuse of an existing connection. This narrows investigation but does not
prove a keep-alive race or fix. There were zero ReadTimeout/503 outcomes,
no pool-error/ASGI-error matches in the full API log, and post-run Docker
health was healthy, no OOM, with no idle-in-transaction DB connections.
Checkout assertions completed with stock `[8, 0, 10]`; overall status remains
failed. Artifact: `../scratch/image-http-load-200-clients-results-three-minute-trace.json`
and its `.api.log`. No retries or timeout changes were introduced.

Transport-only experiment: the same image (Uvicorn 0.54.0, default server
keep-alive five seconds) with HTTPX 0.28.1 client expiry shortened from five
to two seconds passed 6,400/6,400 reads in 61.497s, peak 200, plus checkout
assertions. Request timeout stayed ten seconds; retries stayed zero.
`../scratch/image-http-load-200-clients-results-client-expiry-two-seconds.json`
records the changed transport explicitly. This does NOT supersede the failed
default-client runs, prove causality, or constitute an application fix: the
default client also had a clean one-minute run. A matched repeated comparison
and server-side close-event evidence are still needed. Production settings
remain unchanged; all disposable test resources were removed.

Protocol provenance correction: direct `uvicorn.Config` resolution inside
image `cdff5d7...` selects `uvicorn.protocols.http.httptools_impl.HttpToolsProtocol`
(Python 3.12.15, Uvicorn 0.54.0), not server h11. Its actual timeout handler
closes the transport after the configured five-second idle period. Client
`http11.*` trace names describe HTTPX/httpcore's client implementation, not
the server protocol. Earlier h11 source inspection does not prove server
behavior. Future load artifacts now record image runtime/default protocol,
container command and harness SHA256; no old artifact is retroactively
rewritten. Socket-correlated server close evidence remains unverified.

The first separately instrumented socket run passed 6,800/6,800 reads in
63.664s, peak 200, plus checkout assertions. Full server logs contain 983
keep-alive timeout-close events, but zero failed requests, so there is no
failure/close pair and no causal conclusion. Artifact:
`../scratch/image-http-load-200-clients-results-socket-correlated.json`
and its `.api.log`. The test-only launcher subclasses the selected httptools
protocol and adds an internal peer-port response header; the guarded client
uses a version-specific httpcore 1.0.9 diagnostic hook. This altered diagnostic
runtime is not a clean deployment-image baseline or a production fix.
Future diagnostic runs additionally reject missing correlation metadata;
that stricter check was added after this one-minute run and is covered by
the subsequent three-minute run below.

The subsequent strict-metadata three-minute diagnostic run passed
18,800/18,800 reads in 181.919s, peak 200, with 2,961 server keep-alive
timeout-close events and no request failures. All successful reads supplied
the required socket-correlation metadata. Checkout assertions passed;
post-run health was healthy, no OOM, and DB connections were idle rather
than idle-in-transaction. Artifact:
`../scratch/image-http-load-200-clients-results-socket-correlated-three-minute.json`
and full `.api.log`. No failure/close pair exists in this run. Instrumentation
adds a client diagnostic hook/lock and a server response header, so it may
change timing; the original uninstrumented failures remain authoritative.
Launcher safety was separately checked: without the exact disposable DB
guard it exits 1 before importing the application. Test resources were removed.

The refreshed host live-browser API log contains one Windows asyncio
`_ProactorBasePipeTransport._call_connection_lost` ConnectionResetError
(WinError 10054) while browser connections close. Requests/assertions still
completed, but this is not a clean-log claim. SQL OperationalError entries
also occur during the deliberate DB shutdown drill. Do not conflate the
Windows callback with the Linux-image RemoteProtocolError under load.

| Experiment | Result | Authoritative artifact | Boundary |
| --- | --- | --- | --- |
| Full host regression, refreshed after harness/validator extensions | 450 passed, 1 opt-in skip; 52.65s | `../scratch/reliability-suite-refreshed.xml` | Real disposable PostgreSQL, external AI disabled; automated tests, not task-processing time |
| Frontend unit regression, refreshed 2026-10-07 local | 60 passed, zero failures/errors | `../scratch/frontend-reliability-unit.xml` | Service/presentation helpers; JUnit test execution time is not customer task latency |
| Final-report verifier regression | 40 passed, including browser/admission/restore-authentication/authorization/fresh-order corruption cases | `../scratch/report-validator-suite.xml` | Pure validation tests without DB conftest; measured authorization/fresh-order artifacts separately pass strengthened gates unchanged; full host 450-test run above predates these final twelve validator additions |
| Real HTTP admission under DB lock | 60 reads: 39 controlled 503 with Retry-After 1, 21 valid 200 after unlock; locked liveness 200 in 3.29ms; readiness/catalog recovered 200 | `../scratch/http-admission-results.json` | Exclusive table lock in disposable DB; host Python backend, not CPU saturation or image/provider capacity |
| Real HTTP customer authorization | Anonymous/invalid token 401; cross-customer order/payment and three admin reads 403; own order 200 and own list verified through each detail | `../scratch/http-authorization-results.json` | Eight named read checks plus scoped-list check; synthetic customers, not all roles/routes or a security certification |
| Fresh sale/replenishment cycle | Two waves of 20 new-key requests: each ten 201/ten stock-rejection 400; staff batch API restocks ten (201); 20 distinct successful orders and 20 successful same-order replays, stock zero after each wave | `../scratch/http-fresh-orders-results.json` | Twenty synthetic customers plus one fixture staff; two short controlled waves on one variant, COD unpaid, not natural production traffic or sustained fresh-order throughput |
| Frontend browser regression, refreshed 2026-10-07 local | 9 passed, 4 opt-in live cases skipped, zero flaky/unexpected; 11.321s | `../scratch/frontend-reliability-browser.json` | Chromium with mocked APIs, not real provider or real backend verification; UTC report start 2026-10-06T18:51:15.906Z |
| Full Docker regression after admission mitigation | 432 passed, 1 opt-in skip; 39.71s | `../scratch/image-regression-admission-suite.xml` | Python 3.12 image `cdff5d7de15fdcff215fcf4ca66a7392173175f67952a86ab4220782d03b6545`; disposable real PostgreSQL, external AI disabled |
| Latest full Docker regression after all validator additions | 462 passed, 1 opt-in skip; 43.37s | `../scratch/image-regression-latest-suite.xml` | Same image ID; 88 image Python app files hash-match worktree, current tests/scripts mounted read-only; real disposable PostgreSQL and external AI disabled |
| Full Docker regression before health-revision addition | 423 passed, 1 opt-in skip; 31.83s | `../scratch/image-regression-suite.xml` | Historical prior Python 3.12 image; superseded by the 432-test image run above |
| Docker HTTP reads | 12,200 requests/60.384s, 50 closed-loop clients; p95 346.18ms | `../scratch/image-http-load-results.json` | One-minute catalog/availability load, not simultaneous new-order throughput |
| Resource-constrained Docker HTTP reads | 6,000/6,000 valid HTTP 200 in 60.365s, peak 50 in-flight; combined nearest-rank p95 719.911ms; checkout/stock assertions pass | `../scratch/image-http-load-results-one-cpu-256m.json` | API limited to one CPU and 256 MiB, no additional swap; DB unbounded; one-minute closed-loop catalog/availability workload, not Railway capacity or a before/after improvement percentage |
| Offered-rate generator diagnostic | **FAILED** target 200/sec for 30s: 3,627 client-cap misses; 2,218 valid 200 and 155 controlled 503; offering elapsed 35.803s, launch-lag p95 12,253.269ms; readiness recovered 200 | `../scratch/open-loop-200rps-30s-results.json` | Windows async client could not sustain target schedule; not proof of delivered 200/sec, maximum server capacity, or successful workload completion |
| k6 constant-arrival-rate under quota | **FAILED completion gate**, zero dropped iterations: 6,010 actual iterations, 4,590 valid reads/1,420 controlled 503; completed-read p95 1,969.554ms; all response contracts valid; API healthy/no OOM/DB-ready afterward | `../scratch/k6-arrival-200rps-30s-summary.json` | k6 1.7.1 local Docker, target 200/sec for 30s, API one CPU/256 MiB; DB/generator uncapped; scheduler count retained as measured, not forced to target 6,000; busy is not customer completion |
| Matched k6 lower arrival-rate profile | **PASSED**, 3,001/3,001 valid reads, zero busy/dropped; achieved mean 100.002/sec, completed-read p95 9.220ms and p99 87.490ms | `../scratch/k6-arrival-100rps-30s-summary.json` | Same image/harness hashes and verified one-CPU/256-MiB API quota; 30-second local catalog/availability profile, DB/generator uncapped; not sustained production capacity or percent improvement |
| Checkout contention | Twenty same-key requests: one order; twenty users/keys for ten units: five successes/fifteen rejections | Same image HTTP artifact | Short controlled races; expected 400 is not a server failure |
| Real browser local commerce, refreshed 2026-10-07 local | Four cases passed (5.9s), four checkout records, one confirmed synthetic receipt; stock matches `[8,8,8]` and journey `[9,10,10]` | `../scratch/http-live-browser-results.json` | Current report status passed after final assertions/cleanup; host Python backend with disposable real DB, synthetic callback and external QR blocked, not deployment-image browser coverage |
| Two API processes | 481 eligible alerts, zero missing/duplicate open insight sources; survivor catalog 200 | `../scratch/http-multi-api-results.json` | Separate ports; no load balancer or mid-transaction failover |
| Notification crash after insight commit | Audit completes with one insight and one attempt after restart | `../scratch/http-notification-crash-results.json` | Actual process exit plus an explicitly aged claim timestamp |
| Notification crash before insight write | One insight, completed audit at attempt two | `../scratch/http-notification-before-commit-results.json` | Same stale-time fixture; exhausted/stale conditions rejected by regression |
| Restore | 38 table digests, 149 canonical constraints, 73 indexes, 385 columns/defaults, 58 enum labels, 35 sequence states/configurations/ownership links match | `../scratch/http-backup-all-tables-with-payment-results.json` | Same-version fixture; zero user triggers; files/permissions/Railway recovery unverified |
| Restored local authentication | Wrong password 401; login, auth/me, refresh, refreshed auth/me all 200 before/after restore for the same synthetic user | Same refreshed backup/payment artifact | One local-auth account, same JWT/configuration; not Cognito, key rotation, all-role access, or production recovery |
| Baked product-file consistency | All 20 local product files match the 20 image files by SHA256; no missing files | `../scratch/product-assets-image-results.json` | Network-disabled disposable container, no app/DB; not HTTP rendering, runtime-upload persistence, filesystem restore or Railway backup verification |
| Runtime upload replacement drill | Synthetic file disappears without a mount; same file hash survives replacement with a fresh named volume | `../scratch/upload-persistence-results.json` | Actual `/app/uploads/product` directory in local image, no network/app/DB; volume removed after drill; does not establish Railway configuration or backup retention |
| Memory profiling | Traced allocation 90.21MiB warm, 100.19MiB loaded, 89.06MiB after rest | `../scratch/http-mixed-results-memory-profile.json` | Python allocations only; no long-term/native leak proof |
| Langfuse read API | HTTP 200; 20 observations in expected project, 3 trace IDs, AGENT/GENERATION/TOOL | Read-only CLI verification recorded in detailed audit | Existing ingestion, not fresh emission from current code; sampled seven generations have no nonempty usage/prompt-reference fields |
| Unreachable Langfuse exporter runtime | Real SDK 4.17.0 context created; export connection refused/retries observed; policy chat 200 and checkout/replay 201 before/after export cycle, same order, stock `[8,10,10]`; API healthy/DB-ready afterward | `../scratch/langfuse-outage-results.json`; API/SDK console exporter failure observed | Fake keys, refused loopback endpoint only; no real trace/LLM/bank call; policy-guard chat, not LIVE_LLM or long hanging-export saturation |

Some scratch outputs are reused by harness runs. Read their embedded identity,
timestamps, mode and verification status before quoting them. Legacy reports
without status require recorded process-exit/log evidence. Never assign the
latest commit/image identity retroactively to older artifacts. Source hash
metadata identifies dirty code; it does not replace a reproducible checkout.

## Still insufficient or unverified

- POS/online/pre-order task time before/after: no comparable paired stopwatch
  dataset. Test-suite runtime and HTTP p95 are not substitutes.
- Manual versus SePay confirmation time/error rate: no paired bank/provider
  observations. Synthetic callbacks prove processing logic, not delivery time.
- Report/reconciliation time saved: no paired admin task measurements.
- Railway deployment SHA, service limits, persistent upload storage and backup
  capabilities: not established by repository config or local image tests.
- Real LLM/SePay availability, new trace delivery and end-to-end bank
  confirmation: not measured in provider-disabled experiments. Langfuse
  credentials/read API and existing ingestion were checked separately;
  sampled token/prompt-reference capture still needs investigation.
- Long sustained fresh-order/replenishment workload, constrained production
  capacity, native-memory behavior and arbitrary in-flight failover: unproven.
- Full restore/cutover/rollback: files, remaining schema metadata, provider
  reconciliation and operational RTO/RPO require separate verification.

## Release Decision

Public read-only media spot-check on 2026-10-07 local: production catalog
returned 21 records and 20 nonempty relative image references. Resolving
paths using `frontend/src/utils/getImageUrl.ts` rules, the first three
distinct sorted API-local images returned HEAD 200 with image/jpeg.
No authenticated requests, writes or load were sent. HEAD availability is
not content/hash/rendering validation or evidence of survival across redeploy.
Railway CLI/connector is unavailable locally; volume/backup configuration
remains unverified pending a read-only dashboard path or redacted screenshots.

The first authorization run failed in the harness with KeyError because its
list verifier assumed `nguoidung_id` existed in the list response. It did
not indicate an authorization bypass. That failed result/log were retained
as `../scratch/http-authorization-results-verifier-schema-failure.json` and
`../scratch/http-authorization-verifier-schema-failure.api.log`. The corrected
run verifies ownership through each authorized order detail and passed;
no application permissions/business code was changed for this drill.

Read-only remote check on 2026-10-06: remote main equals local HEAD
`1a6b59f0ee255854f946f899089c2ae0f619593d`. GitHub run 37421380135 succeeded
for that SHA, including tests, frontend quality/e2e, Docker build and Vercel
frontend deploy. Domain, API liveness and DB health returned 200 in three
public GETs at 16:26:28-38 UTC. This is not uptime/load evidence and does not
establish the Railway backend deployment SHA. Uncommitted local reliability
changes are absent from remote main; those green jobs do not verify them.

Local evidence supports reviewing and publishing these scoped fixes, not a
blanket production-stability claim. Push/deploy remains owner-controlled;
The newly reproduced overload failure must be addressed before a reliability
release is represented as protecting busy traffic.
do not change or overwrite Railway users/products/database. Before production
verification, establish deployment identity and review the recovery runbook.
Business-write tests, bank transfers, production load/fault injection and
database cutover need explicit scope and approval.

For a CV, prefer the two paired correctness experiments and clearly labeled
controlled concurrency work. Do not claim real users, money saved, uptime,
production throughput or a latency-improvement percentage from these results.
