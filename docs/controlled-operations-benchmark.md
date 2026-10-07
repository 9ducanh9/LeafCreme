# Controlled Operations Benchmark

Measured 2026-10-06. This is a synthetic, paired service-level experiment,
not production customer data, business savings, or a full historical deployment.

Refreshed on 2026-10-07 local against the current worktree: the same pinned
historical services and paired cohorts reproduced all values below. The
benchmark plus related service tests passed 25 tests in 32.13s. New raw
evidence is `../scratch/controlled-operations-benchmark-refreshed.json` and
JUnit `../scratch/controlled-operations-refreshed-suite.xml`; the original
2026-10-06 artifact is preserved. Test duration is not business task latency.

## Environment and provenance

- Isolated PostgreSQL 16.15, container `leafcreme-cv-benchmark-20261006`.
- Database `leafcreme_benchmark_test`, loopback port 55439; no persistent volume.
- Current HEAD: `1a6b59f0ee255854f946f899089c2ae0f619593d`.
- Expiry baseline: `627d4483c63ed934848fd9d2f4d8093356c61fce`
  (`f8fd7b5^`), unmodified inventory service from Git.
- POS/report baseline: `c8eb684cda2ce427dbfdde274f52912863f832ca`
  (`61612af^`), unmodified order and report services from Git.
- Both sides use CURRENT schema, ledger, vouchers, models and other dependencies.
  This isolates selected services; it does not reproduce every old dependency.
- Raw per-case observations, source hashes and timestamps:
  [controlled-operations-benchmark-results.json](controlled-operations-benchmark-results.json).

## Measured results

| Metric | Before | After | Paired cases | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Requests consuming any expired product lot | 20/30 | 0/30 | 30 | 20 deliberately exposed cases plus 10 no-expired-stock controls |
| Expired allocation rows / all allocation rows | 20/37 (54.05%) | 0/52 (0%) | Same 30 requests | Denominators differ because valid FEFO splits across lots |
| Unpaid POS orders created as completed | 30/30 | 0/30 | 30 | Same manager role, quantities 1-4, unit prices 50k/100k/150k VND |
| Unpaid POS value included in sales report | 7,300,000 VND | 0 VND | Same 30 POS pairs | Entirely synthetic value, NOT real lost revenue or recovered money |

Relative reduction `(before - after) / before * 100` is 100% for these
observed error counts/rates. This is only a regression result on deliberately
constructed cases; it is NOT a population error rate or business improvement.
All 10 stock controls produced identical allocation labels and quantities.
FEFO ordering existed before the expiry-filter fix: do not claim FEFO itself
was newly introduced by this change.

## Measurement boundaries

- Stock snapshots are independently seeded with equivalent values per side.
- Product lots: expired yesterday (9), expiring today (1), future (4).
- Requests vary from 1 to 4 units. Controls set expired-lot stock to zero.
- POS has no successful payments. Each report uses a dedicated synthetic
  reporting day to avoid counting other test orders; these dates are not
  historical operational observations.
- Deterministic repetitions are not independent customers or 30 unique workflows.
- Initial setup using staff hit the old service's order-read authorization error.
  The final comparison uses manager on BOTH sides, unchanged historical code.
  No claim is made about that staff error's production frequency.
- No checkout UI, bank transfer, SePay provider latency, human task timing,
  load/concurrency, or report-generation time is measured here.
- The related suite returned `25 passed in 24.40s`; this is verification evidence,
  NOT order-processing latency or a business metric.

## Reproduce

Start the dedicated disposable database (never reuse a business database):

```powershell
docker run --detach --rm --name leafcreme-cv-benchmark-20261006 --publish 127.0.0.1:55439:5432 --env POSTGRES_USER=benchmark --env POSTGRES_PASSWORD=local-disposable-benchmark --env POSTGRES_DB=leafcreme_benchmark_test postgres:16-alpine
$env:APP_ENV='development'
$env:RUN_OPERATIONS_BENCHMARK='1'
$env:TEST_DATABASE_URL='postgresql+psycopg2://benchmark:local-disposable-benchmark@127.0.0.1:55439/leafcreme_benchmark_test'
$env:DATABASE_URL=$env:TEST_DATABASE_URL
$env:LANGFUSE_ENABLED='false'
$env:LANGFUSE_PUBLIC_KEY=''
$env:LANGFUSE_SECRET_KEY=''
$env:DEEPSEEK_API_KEY=''
$env:OPERATIONS_BENCHMARK_OUTPUT='docs/controlled-operations-benchmark-results.json'
.\venv\Scripts\python.exe -m pytest tests/test_controlled_operations_benchmark.py tests/test_inventory_service.py tests/test_report_service.py tests/test_order_service.py -q -p no:cacheprovider
docker stop leafcreme-cv-benchmark-20261006
```

The benchmark is opt-in and checks the exact local database target at collection.
Pytest migrates and tears down ONLY that disposable schema. No API server or
real payment integration is started. Normal test runs skip this experiment.

## Defensible CV wording

"Reproduced and eliminated expired-lot allocation in 20 targeted regression
cases, with 10 unaffected controls, using paired PostgreSQL service experiments."

"Prevented unpaid POS completion and revenue inclusion across 30 paired
synthetic order scenarios using historical and current service implementations."

Timing metrics for POS/online/pre-order, manual versus SePay confirmation,
and report/reconciliation tasks remain INSUFFICIENT DATA.

## Five-metric completion audit

| Requested metric | Evidence available | Conclusion |
| --- | --- | --- |
| POS/online/pre-order processing time | No paired task stopwatch records | INSUFFICIENT DATA; do not substitute suite runtime |
| Expired-lot allocation before/after | Per-case allocations in raw JSON `expiry` | Controlled service regression only; not operational defect frequency |
| Unpaid POS completion/revenue before/after | Per-case status, payments and report totals in raw JSON `pos` | Controlled service regression only; synthetic money |
| Manual versus SePay confirmation time/errors | Code and mocked webhook tests, no paired provider/bank timing | INSUFFICIENT DATA; no transfer executed for this experiment |
| Reporting/inventory reconciliation time | Code and report assertions, no paired timed task | INSUFFICIENT DATA; report correctness is not time saved |

## Proposed measurements for missing metrics (not executed)

1. Order entry: 30 paired trials EACH for POS, online and pre-order. Use the
   same cart, role, device, network, stock snapshot and delivery requirements.
   Start at the first form input; stop at persisted-order confirmation.
   Separate payment wait and handover. Alternate trial order and exclude
   explicitly labelled practice runs. Human and browser-automation trials
   must be reported separately. Record failures as well as successful times.
2. Payment: 30 eligible receipts per confirmation method, with matched bank,
   amount and staffing conditions. Record bank receipt time, app confirmation
   time and staff active time separately; reconcile against bank records.
   Add independent wrong-amount/code and duplicate-callback cases, reporting
   their denominators separately. Mocked callbacks only measure application
   handling, not SePay/bank latency. Real transfers require explicit approval.
3. Reporting and stock reconciliation: 30 paired tasks each, using identical
   immutable snapshots and date ranges with independently calculated answers.
   Start at the task request and stop at a correct, verified result. Compare
   manual calculations with app-assisted tasks on the same machine/person;
   alternate ordering to reduce practice effects. Report dataset sizes,
   cache state, median/p95 time and wrong answers. Record API latency separately.

For each measurement, retain case ID, source revision, environment, input
snapshot fingerprint, start/end timestamps, result and independent correctness
check. Compute a relative percentage only for comparable before/after groups
with nonzero baseline. Do not extrapolate controlled samples to customer
traffic, turnover, spoilage reduction or employee productivity.
