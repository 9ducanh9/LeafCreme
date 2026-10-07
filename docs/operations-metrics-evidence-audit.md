# Operations Metrics Evidence Audit

Refreshed 2026-10-07 local. No verified real-customer operational improvement
percentage is available. The paired observations below are controlled
synthetic service experiments, not historical production deployments.
Selected old services run unchanged with current schema/shared dependencies.
Current files are uncommitted; HEAD alone is not their deployed identity.

## Five Requested Metrics

| Metric And Exact Unit | Before / After / N | Measurement Date And Environment | Relative Reduction | Evidence And Recheck | Confidence | Defensible CV Sentence |
| --- | --- | --- | --- | --- | --- | --- |
| POS/online/pre-order handling time: seconds from starting entry of a fixed order to confirmed persisted order and correct stock; measure each channel separately | KHÔNG ĐỦ DỮ LIỆU: no paired timed workflow baseline; N unavailable | No verified paired operational or operator-timed session | Not calculated | Implementation: `app/services/orders/order_service.py:267`, `app/services/orders/checkout_service.py:50`; benchmark explicitly excludes workflow timing at `docs/controlled-operations-benchmark.md:55` | Implemented/tested code, not measured task-time improvement | Implemented unified POS, online and pre-order workflows with inventory-backed checkout. |
| Expired-lot allocation incidence: requests consuming any expired lot / paired allocation requests | Before 20/30; after 0/30; N=30 paired cases, including 20 exposed cases and 10 unchanged controls | Refreshed 2026-10-07 local, isolated PostgreSQL 16; selected historical/current services | (20 - 0) / 20 x 100 = 100% reduction in constructed error count only | Numbers: `docs/controlled-operations-benchmark.md:31`; N: `tests/test_controlled_operations_benchmark.py:62`; before/after/control assertions at lines 92/93/94. Raw: `scratch/controlled-operations-benchmark-refreshed.json`, `expiry`. Re-run opt-in paired benchmark using its documented disposable DB | Controlled service experiment; NOT operating/population error rate | Eliminated expired-lot allocation in 20 targeted regression cases while preserving 10 unaffected controls in paired PostgreSQL experiments. |
| Unpaid POS completion/revenue inclusion: unpaid orders marked completed (count), plus their value erroneously included in the sales report (VND) | Before 30/30 completed and 7,300,000 synthetic VND; after 0/30 and 0 VND; N=30 paired POS cases | Refreshed 2026-10-07 local, same manager role and equivalent isolated stock/prices; artificial reporting dates are fixture data, not measurement dates | (30 - 0) / 30 x 100 = 100% reduction in constructed completion errors; synthetic VND reduction also 100%, NOT recovered real money | Numbers: `docs/controlled-operations-benchmark.md:33` and `:34`; N: `tests/test_controlled_operations_benchmark.py:74`; status/payment/report assertions at lines 95/96/97. Raw: refreshed JSON `pos`. Re-run paired benchmark | Controlled service experiment; NOT real lost/recovered revenue | Prevented unpaid POS completion and revenue inclusion across 30 paired synthetic order scenarios. |
| Manual versus SePay/VietQR confirmation: seconds from a bank-recorded incoming transfer to correct payment/order confirmation; errors are false positives, missed confirmations or duplicate ledger entries per transfer | KHÔNG ĐỦ DỮ LIỆU: no comparable manual/provider timing cohorts; N unavailable | Synthetic webhook/browser drills verify code paths only; no real bank transfer in these experiments | Not calculated | `scratch/http-live-browser-results.json` verifies authenticated synthetic callback/polling; `scratch/http-backup-all-tables-with-payment-results.json` contains synthetic receipt/ledger checks. Neither is a paired real-bank/manual timing baseline | Runtime-tested simulation, not provider/human performance | Implemented authenticated, idempotent SePay reconciliation and verified duplicate-callback handling in isolated end-to-end tests. |
| Revenue-report or inventory-reconciliation task time: seconds from receiving a fixed task/dataset to a reviewed correct output; measure report and stock reconciliation separately | KHÔNG ĐỦ DỮ LIỆU: no paired timed task sessions; N unavailable | Current report correctness assertions are controlled tests, not time saved | Not calculated | Implementation: `app/services/reports/report_service.py:39`; limitations at `docs/controlled-operations-benchmark.md:55`. SQL restore time, pytest duration and dashboard/API latency are not task duration | Implemented/tested code, not measured operator-time improvement | Built revenue reporting and inventory reconciliation with correctness checks against persisted operational records. |

FEFO ordering already existed before the expiry fix. Attribute the paired
result to expiry filtering in the allocation path, not newly introducing
FEFO. Do not compare expired-allocation-row rates 20/37 and 0/52 as matched
denominator rates: valid allocations split differently after the fix.

The old source refs are pinned in the refreshed JSON `historical_sources`:
inventory `627d4483c63ed934848fd9d2f4d8093356c61fce`, order/report
`c8eb684cda2ce427dbfdde274f52912863f832ca`. Source hashes and actual UTC
start/end timestamps are in that artifact. Its original predecessor remains
in `docs/controlled-operations-benchmark-results.json`.

## At Most Three Numeric CV Claims

1. Expired allocation: 20 reproduced errors to zero in a 30-case paired
   controlled cohort, with ten unchanged controls. Use the sentence above.
2. Unpaid POS: 30 reproduced completion errors to zero in 30 paired synthetic
   cases. Do not turn the synthetic VND total into money saved.
3. Load validation: "Load-tested a Dockerized API at 100 read requests/sec
   for 30 seconds under one-CPU/256-MiB limits: 3,001 valid responses,
   zero dropped/busy requests and 9.22ms p95 latency." Specify that this was
   a local catalog/availability workload, not checkout or production traffic.
   Evidence: `scratch/k6-arrival-100rps-30s-summary.json:6` (target),
   `:109`/`:188`/`:215` (actual counters), `:137`/`:157` (latency metrics).
   The higher 200/sec profile FAILED the completion gate; disclose it when
   discussing capacity rather than selecting only the passing run.

Database/table/API/UI counts, number of passing tests and project-completion
percentages are verification/context, never business improvement metrics.

## Measurement Plan For Missing Baselines

- Order handling: at least 30 paired cases per channel (90 pairs total),
  matched by line count, variant/quantity, discount, delivery details and
  stock. Choose a documented old workflow that actually exists; otherwise
  report only an absolute current measurement. Record operator start,
  confirmed persistence/stock end, corrections, failures and completion.
- Payment: at least 30 matched manual and automated confirmation cases with
  comparable amounts, arrival/provider conditions and network. Record bank
  timestamp, webhook receive time, confirmed ledger/order time, operator
  start/end and duplicate/missed/false confirmations. Synthetic callbacks
  must be labeled separately. Real transfers need explicit scoped approval.
- Reporting/reconciliation: at least 30 paired tasks of each kind with the
  same frozen source records and verified expected output. Define whether
  filtering, correction/export and review are included before measuring.
- Use the same device/operator where relevant, randomize before/after order,
  account for practice/warm-up, include failed attempts, and report median,
  p95, N, dates, environment and raw observations. Do not remove outliers to
  manufacture a percentage or extrapolate deterministic repeats to users.
- Calculate `(before - after) / before x 100` only for comparable measured
  cohorts with a nonzero baseline. A missing baseline remains missing.

## Wider Reliability Boundary

See `reliability-scorecard.md` for concurrency, fault/retry, bounded overload,
restore/authentication, access-control, media-persistence and frontend evidence.
Known transport intermittency and unverified Railway storage/backup/deployed
identity/provider gates remain open. This audit does not declare the entire
production system stable or authorize deployment/database changes.
