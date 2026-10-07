# Reliability release and recovery runbook

Status: local procedure derived from repository configuration on 2026-10-06.
No Railway restore, production rollback or production fault injection has
been performed. All production database changes require owner approval.

## Release gate

Local candidate health responses include `revision.sha` and `revision.source`
when a valid full SHA is supplied by `RAILWAY_GIT_COMMIT_SHA` (GitHub-triggered
Railway deployments) or explicit `APP_COMMIT_SHA`. Otherwise revision is null.
This is environment metadata, not cryptographic attestation: compare it with
the deployment record. Do not set a local base SHA on dirty code and label
that image as a clean release. This field has not yet been deployed.

1. Record backend and frontend commit SHA, deployment IDs, migration revision
   and environment identity. A green domain alone does not identify its code.
2. Run backend regression against an explicitly disposable database. The
   pytest fixture downgrades its schema at teardown: never point it at the
   development or Railway database.
3. Run frontend unit tests, lint, build and browser tests. Current browser
   mocks do not replace a browser-to-real-backend checkout check.
4. Run isolated HTTP concurrency/failure tests and retain result JSON plus
   logs labeled with date, code SHA, environment and workload.
   Browser mode now records that browser evidence is required. The final
   report verifier independently checks browser exit status, four checkout
   records, one confirmed synthetic receipt, successful stock reads, and
   exact expected remaining stock. Report-validator negative tests reject
   missing or corrupted evidence; a browser exit code alone is insufficient.
   Authorization and fresh-order modes also have required-evidence gates:
   exact permission cases/denial envelopes and scoped owner list; two fresh
   waves with non-overlapping order IDs, replay counts and expected stock.
   Passing consistency checks does not authenticate an artifact or prove
   production execution; retain source/runtime identities and raw logs too.
5. Verify migration compatibility with both deployed and candidate code.
   Review every downgrade before considering it; do not assume reversing a
   migration preserves data. Capture a restorable backup before migration.
6. Verify both `/health` and `/health/db`, catalog availability, login and
   relevant checkout/payment flows. Production writes or transfers need
   explicit approval and a cleanup/reconciliation plan.

Repository facts: `railway.toml` runs `alembic upgrade head` before deploy
and probes `/health`. The Docker image runs one Uvicorn worker and probes
the same liveness endpoint. Neither current probe verifies DB readiness.
GitHub CI builds the backend image but this is not proof that Railway
deploys that same SHA. Frontend deployment is a separate CI job.

## Incident triage

1. Record start time, affected routes, status codes, deployment identity and
   redacted logs. Never paste credentials, customer payloads or database dumps
   into public issue trackers or observability traces.
2. Check `/health` and `/health/db` separately. Liveness 200 with readiness
   503 means the API is alive but cannot confirm database access; investigate
   connectivity, connection limits and DB service health before restarting.
3. For uncertain checkout responses, retry the same idempotency key with the
   same payload. Do not generate a new key or recreate an order manually
   until persisted checkout/order/payment state has been inspected.
4. For payment callback uncertainty, inspect the provider transaction ID,
   receipt state and payment ledger. A customer's confirmation click is not
   proof of payment. Do not manually mark paid from a screenshot alone.
5. Check scheduler logs and persisted alert/insight/action state. Notification
   reconciliation only completes a stale audit when its matching persisted
   insight exists. Missing outcomes and mutations are not blindly retried.

## Overload handling (local candidate, not deployed)

The candidate admits at most 20 HTTP requests per process and queues at most
200 for up to two seconds. `/health` bypasses admission; `/health/db` does not.
Defaults can be lowered with `HTTP_MAX_INFLIGHT`, `HTTP_MAX_WAITING`, and
`HTTP_ADMISSION_WAIT_SECONDS`; validation rejects inflight values above 20,
queues above 1,000, and waits above five seconds. This is bounded concurrency,
not a request-per-second rate limit or a cluster-wide limit.

An admission rejection returns 503 with `Retry-After: 1` before executing the
route. Do not treat it as a completed business action. Preserve checkout's
existing idempotency key/payload for uncertain responses; do not retry a
mutation with a new key. Apply bounded backoff to safe reads rather than
creating a retry storm. Provider callback retries remain provider-governed
and must use the existing receipt deduplication path.

During an incident, correlate rejection counts, latency, pool-wait errors,
DB readiness, and container CPU/RAM. Do not simply add workers: admission
and the SQLAlchemy pool are per-process, so aggregate DB demand increases,
and each worker starts a scheduler. The local 200-client tests use a
closed-loop catalog workload with no explicit CPU/RAM quota, not production
arrival rates or a guarantee for LLM-heavy traffic.

A local constrained-image drill explicitly verified Docker NanoCpus
1,000,000,000 and Memory/MemorySwap both 268,435,456 bytes. It completed
6,000 read requests at peak 50 in-flight without OOM and recovered checkout
assertions. Database resources were not capped. Compare workloads, durations,
client connection settings and all service quotas before extrapolating this
result; none of these limits have been confirmed on Railway.

Do not equate closed-loop client concurrency with an offered arrival rate.
The first Windows async offered-rate diagnostic failed its own generation
gate: target 6,000 arrivals, 3,627 client-cap rejections, launch-lag p95
12.253s, and an offering period extended to 35.803s. Its 2,218 valid reads
and 155 controlled busy responses show observed behavior only, not delivery
of the target 200 requests/sec. Require zero dropped generation, bounded
launch jitter, request/response counts and drain metrics before using an
arrival-rate result for capacity conclusions. Use a dedicated established
load generator for the next comparison rather than increasing this client's
cap or relabeling the failed result as passed.

The subsequent established-generator run uses local k6 1.7.1 with
`constant-arrival-rate`, 512 preallocated/max VUs, zero retry and usage
reporting disabled; it sends only to the dedicated test API hostname.
Official executor reference:
https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/constant-arrival-rate/.
At target 200/sec for 30s it recorded 6,010 actual iterations, zero dropped,
4,590 valid HTTP 200 and 1,420 controlled 503. Response-contract gate passed,
customer-completion gate FAILED. k6 `http_req_failed` excludes the deliberately
expected 503; always inspect custom `read_completed` and `controlled_busy`,
not that transport metric alone. Post-test API health/readiness remained
healthy with no OOM. This establishes controlled degradation in that local
quota/workload, not successful capacity at 200 reads/sec or Railway behavior.

The matched 100/sec, 30-second k6 profile passed all three gates with 3,001
actual reads, zero busy/dropped, mean 100.002 completed reads/sec, p95 9.220ms,
p99 87.490ms. API image and script SHA256 matched the 200/sec profile, quota
was explicitly verified at one CPU/256 MiB, and post-run health/readiness
was healthy without OOM. This is a measured short local read-only profile.
It is not the maximum rate, a long-term SLO, production capacity, a checkout
rate, or a before/after latency reduction. Closed-loop 50-client latency
must not be compared as an improvement percentage against this different
arrival-rate/concurrency pattern.

## Code rollback

1. Identify a known-good backend/frontend deployment and current schema.
2. Confirm the old code can use the current schema and current configuration.
   If compatibility is unknown, reproduce it against a separate restored
   database first. A code rollback does not undo a successful migration.
3. Obtain approval for production rollback, select the verified deployment
   using the platform's supported mechanism, then verify both health routes
   and affected business reads. Do not run `alembic downgrade` as a generic
   rollback step.
4. Preserve transaction records created since the previous release. Database
   restore is not interchangeable with code rollback and can lose new orders
   or bank receipts unless reconciled.

## Backup and restore drill

Inventory the database AND product-upload files, their actual persistence
location, backup retention, access controls and restore permissions. Avatar
bytes are stored in PostgreSQL; product uploads use `uploads/product` and
are not covered by a DB dump. Railway volume/object-storage configuration
has not been verified in this audit.

The local asset audit matched all 20 files recursively under `uploads/product`
against image `cdff5d7...` by SHA256 using a network-disabled disposable
container. `ProductService` writes to that filesystem and `StaticFiles` serves
`/uploads`; Dockerfile copies build-time product files into the image. Those
facts do not establish persistence or backup for files uploaded after build.
Confirm Railway volume/object-store configuration separately before claiming
image/customer-media recovery. Recheck local baked-file consistency with:

```powershell
$env:RUN_ASSET_VERIFY = '1'
.\venv\Scripts\python.exe scripts/verify_image_assets.py
```

The disposable replacement drill reproduced loss of a NEW synthetic file in
`/app/uploads/product` with no mount and verified identical SHA256 after
replacement with a fresh named volume. Neither real assets nor databases
were changed. Its unique test volume and containers were removed. Repeat:

```powershell
$env:RUN_UPLOAD_PERSISTENCE = '1'
.\venv\Scripts\python.exe scripts/verify_upload_persistence.py
```

This demonstrates the persistence requirement, not Railway's current setup.
Before changing production storage, inspect its actual mount/volume and
backup policy read-only, inventory existing runtime uploads, and agree on a
copy/cutover plan. Mounting an empty volume over the path can hide existing
files; do not apply one blindly. No production storage change is authorized
by this local drill.

1. Take a consistent database backup through an approved, credential-safe
   mechanism; retain migration revision, timestamp, size and checksum.
2. Restore to a NEW isolated database, never over the running Railway DB.
   Disable schedulers, external providers, payment delivery and outbound
   notifications during verification.
3. Verify users, roles, products, variants, lots, stock, orders, lines,
   idempotency records, payments, SePay receipts and Agent audit records.
   Compare row counts and canonical data digests, not just a successful
   restore command. Verify sequence values, constraints and migration head.
4. Start a separate API on the restored DB. Verify readiness, authentication,
   catalog, stock and order/payment reads. Restore product-upload files and
   check representative image URLs. Do not send real bank transfers.
5. Measure backup age (potential recovery-point loss) and full elapsed
   recovery time, including provisioning, files, configuration, boot and
   verification. A SQL restore duration alone is not production RTO.
6. Only after owner approval plan any cutover, write pause and reconciliation
   of transactions received after the backup. Keep the original DB intact.

The isolated `--backup` harness now stops the source API before dumping,
verifies every public table's row count/data digest and starts a fresh API
reading the restored DB. The 2026-10-06 combined backup/webhook drill matched
38 tables including a synthetic payment/receipt and Agent audit/insight rows.
The initial metadata-aware run failed raw text comparison for ten CHECK
expressions. The subsequent drill reparses each CHECK with PostgreSQL on a
temporary table of the same column types and compares the resulting exact
definitions. All 149 constraints, 35 sequence states and 73 indexes match;
raw differences remain recorded. This is not a general cross-version proof
or complete schema coverage. A later expanded run also matched 385 column
metadata/default rows, 58 enum labels and 35 sequence configuration/ownership
links. User-trigger lists were empty, so nonempty trigger/function recovery
was not exercised; permissions/roles/views/RLS and files remain unverified.
It uses same-version local
PostgreSQL and does not prove complete backup coverage, file recovery,
provider reconciliation, cross-version compatibility or Railway recovery.

The refreshed local backup/payment drill additionally tests one synthetic
password-backed customer before and after restore: invalid password returns
401; fresh login, authenticated identity, token refresh and refreshed identity
return 200 for the same user. No token/password is persisted in the result.
Both runtimes use the same local auth/JWT configuration, so this does not
verify Cognito, secret rotation, all roles or restored provider configuration.
Measured 1.346s covers SQL restore and metadata checking only, not full RTO.

## Repeatable local failure drills

Use the workspace virtual environment and Docker. The HTTP harness owns
only a disposable container with no mounted existing-data volume. Ensure
its localhost ports 55440 and 58081 are free before starting.

```powershell
$env:RUN_HTTP_RESILIENCE = '1'
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --lost-response
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --before-commit
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --webhook-before-commit
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --webhook-after-commit
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --backup
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --backup --webhook
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --browser
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --admission
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --authorization
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --fresh-orders
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --multi-api
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --notification-crash
$env:RESILIENCE_SOAK_SECONDS = '300'
.\venv\Scripts\python.exe scripts/verify_http_resilience.py --mixed
```

Run one mode at a time except the verified backup/webhook combination above.
Admission mode holds a transaction-local exclusive lock on the synthetic
product table, issues 60 HTTP reads, verifies bounded 503 responses and live
health, then releases the lock in `finally` and verifies recovery. It never
targets an existing database; do not manually reproduce its lock in Railway.
Authorization mode adds read-only probes with two synthetic customer tokens:
anonymous/invalid authentication, cross-user order/payment denial, admin
directory/variant/Agent denial, and owner reads/list scoping. This is targeted
access-control coverage, not a complete penetration test or all-role matrix.
Fresh-order mode adds one synthetic staff fixture and uses twenty synthetic
customers with new checkout keys in two short waves. It depletes one variant,
restocks ten through `/batches/products` with normal staff capability checks,
then depletes it again. Successful checkout replays must preserve order IDs
and leave stock unchanged. Restock business rows are created through the API,
not direct SQL; all fixtures are disposed when the harness ends. This is
controlled COD/unpaid activity, not real customers or autonomous replenishment.
Preserve its output and API log before another run
overwrites the shared log. These commands create synthetic local business
records, never real customer traffic or production capacity measurements.

## Outstanding operational gates

- The subsequent nonblocking flush candidate was rebuilt and passed 472
  full tests/one skip (32.54s) plus a baked-code SDK privacy probe. Caller
  waiting was reproduced with an event-blocked SDK stub; the candidate uses
  one coalesced daemon worker and passed 22 focused tests. Re-run relevant
  HTTP/provider/load gates; these are not live-LLM latency measurements. Do not rely on
  helper `flush()` as synchronous delivery confirmation in CLI/smoke tests;
  explicit SDK flushing outside request paths is a separate operation.

- The SDK exception privacy fix has been rebuilt and passed 469 full tests
  (one opt-in skip) plus a baked-code SDK export-boundary probe. Earlier
  462-test/load artifacts predate these two helper changes. Re-run relevant
  HTTP/tracing/load gates on the candidate before release; review other
  free-text/third-party export paths before broad PII assurances.

The local observability-outage drill enabled SDK 4.17.0 with exact fake keys
and refused loopback endpoint `http://127.0.0.1:1`. Both probe and API process
reported failed span exports/retries. Policy-guard chat remained HTTP 200;
checkout and same-key replay remained 201 for one order, stock `[8,10,10]`;
post-test health/readiness was healthy without OOM. The guarded probe is
`scripts/verify_langfuse_outage.py`; result is
`scratch/langfuse-outage-results.json`. It refuses real keys/other endpoints
and external OTLP overrides. This is runtime failure isolation, not successful
Langfuse ingestion, LIVE_LLM reliability, or arbitrary observability outages.
No dependency was upgraded and no trace was sent to the real project.

- Verify deployed SHA, Railway runtime configuration and backup capabilities
  read-only; do not infer them from repository files.
- The live browser harness now covers login/product/cart, COD, uncertain
  response recovery and synthetic payment polling. All four opt-in cases
  passed against current host-backend files on 2026-10-07 local; the default
  browser suite skips them. Deployment-image browser coverage and actual
  provider behavior remain separate gates.
- Test full multi-worker/business scan failover, not only lock entry markers.
- Measure CPU/RAM and connections during a longer realistic workload with
  fresh orders and replenishment; keep retry saturation labeled separately.
- Verify live SePay/LLM/Langfuse behavior only with scoped approval.
- Perform a reviewed restore/rollback drill before claiming production RTO,
  RPO, uptime or broad operational reliability.
