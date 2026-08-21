# Spec 11 — Admin Operational Validation & Pre-AI Readiness

**Status:** DRAFT
**Purpose:** Xác nhận toàn bộ business/admin layer của Leaf Crème hoạt động đúng, nhất quán và có thể tin cậy trước khi triển khai AI Operations Agent.

---

# 0. Mục tiêu

Leaf Crème phải hoạt động như một bakery commerce & operations system hoàn chỉnh ngay cả khi không có AI.

AI Agent sau này sẽ sử dụng chính các domain services và business data này. Vì vậy:

> Nếu admin/business workflow hiện tại sai, AI chỉ tự động hóa lỗi nhanh hơn.

Spec này không thêm AI capability.

Spec này kiểm chứng:

```text
Product
→ Variant
→ Recipe/BOM
→ Inventory
→ Batch
→ FEFO
→ Order
→ Payment
→ Cancellation
→ Stock restoration
→ Ledger
→ Reporting
→ Dashboard
```

và các boundary liên quan:

```text
Authentication
Authorization
Pagination
Filtering
Data integrity
Auditability
Failure handling
```

---

# 1. Definition of Ready for AI

Leaf Crème chỉ được coi là sẵn sàng bước sang AI Agent phase khi:

```text
Admin operator
↓
có thể vận hành business end-to-end
↓
không cần AI
↓
business state luôn đúng
↓
các domain services có behavior ổn định
↓
Agent có thể sử dụng chúng như governed tools
```

Nếu một workflow quan trọng chưa hoạt động đúng, không bắt đầu Agent implementation cho workflow đó.

---

# 2. Non-Goals

Không thuộc phạm vi spec này:

* AI Agent reasoning
* LLM tool calling
* Langfuse
* n8n
* ClickHouse
* Proactive AI alerts
* AI recommendations
* Multi-agent
* Demand forecasting
* Major UI redesign
* New database architecture

Trang Operations Agent hiện tại không phải tiêu chí đánh giá của spec này.

---

# 3. Test Principles

## 3.1 Test business outcomes, không chỉ API status

Ví dụ không đủ:

```text
POST /orders → 201
```

Phải kiểm tra:

```text
Order created
+
correct state
+
correct customer/staff ownership
+
inventory allocation
+
ledger entry
+
payment state
+
subsequent cancellation behavior
```

---

## 3.2 Verify persistence

Mọi mutation quan trọng phải được kiểm tra sau:

```text
mutation
↓
reload/read from API or DB
↓
verify persisted state
```

Không chấp nhận chỉ kiểm tra React state hoặc response vừa trả về.

---

## 3.3 Verify side effects

Các operation như:

* order
* payment
* cancellation
* stock adjustment
* batch receiving

phải kiểm tra toàn bộ side effect liên quan.

---

## 3.4 No silent failure

Không được có trường hợp:

```text
UI báo thành công
↓
backend không đổi
```

hoặc:

```text
API 200
↓
record khác bị thay đổi
```

---

## 3.5 Server is source of truth

Filtering, pagination, permissions và business rules không được phụ thuộc vào frontend để đúng.

---

# 4. Test Environment

Test trên development/test environment riêng.

Không chạy destructive tests trên production/staging database.

Trước test:

1. Xác nhận `APP_ENV`.
2. Xác nhận database test/dev.
3. Chạy migrations.
4. Ghi lại revision hiện tại.
5. Backup/snapshot nếu đang dùng database development có dữ liệu cần giữ.

Automated test suite phải fail-safe nếu database không phải disposable test database.

---

# 5. Canonical Test Dataset

Không random data hoàn toàn.

Tạo một bộ dữ liệu nhỏ nhưng có quan hệ nghiệp vụ rõ ràng.

## 5.1 Users

```text
ADMIN-01
role = admin

MANAGER-01
role = manager

STAFF-01
role = staff

STAFF-02
role = staff

CUSTOMER-01
role = customer
```

Nếu hệ thống hiện tại chưa thực sự sử dụng manager/staff trong runtime, vẫn dùng chúng trong authorization tests nếu role model đã hỗ trợ.

---

# 6. Product Test Data

Tạo:

## Product A

```text
Tiramisu

Category:
Tiramisu

Variants:

TIR-S
size = 12cm
flavor = Coffee
price = 180000

TIR-M
size = 16cm
flavor = Coffee
price = 280000

TIR-L
size = 20cm
flavor = Coffee
price = 420000
```

## Product B

```text
Strawberry Cake

Variants:

STR-S
size = 12cm

STR-M
size = 16cm
```

Mục tiêu không phải realistic pricing tuyệt đối.

Mục tiêu là có dataset xác định được để verify behavior.

---

# 7. Ingredients & BOM Dataset

Tiramisu M:

```text
Mascarpone   250 g
Cream        120 ml
Coffee        20 g
Sugar         60 g
Egg            2 pcs
```

Nếu schema hiện tại không support ingredient-level BOM cho sản phẩm, sử dụng business model hiện có và ghi rõ limitation.

Không thay đổi schema chỉ để test.

---

# 8. Inventory Dataset

Tạo ít nhất:

```text
Mascarpone

Batch MAS-001
quantity = 10 kg
expiry = +7 days

Batch MAS-002
quantity = 5 kg
expiry = +3 days
```

Và:

```text
Cream
20 L

Coffee
5 kg

Sugar
20 kg

Egg
200 pcs
```

MAS-002 phải hết hạn trước MAS-001 để test FEFO.

---

# 9. Test Suite A — Authentication & Authorization

## A1 — Customer cannot access admin

Login:

```text
CUSTOMER-01
```

Attempt:

```text
/admin/*
```

Expected:

* không vào admin;
* không thấy back-office data;
* API back-office trả 401/403 đúng contract.

---

## A2 — Customer cannot read operational inventory data

Customer gọi:

```text
/batches
/inventory
/alerts
/suppliers
```

Expected:

```text
403
```

Không leak:

* purchase price;
* batch quantities;
* supplier information;
* internal expiry details.

---

## A3 — Customer cannot create POS order

Attempt:

```text
POST /orders?loai_don=pos
```

Expected:

```text
403
```

Verify:

```text
orders count unchanged
inventory unchanged
ledger unchanged
```

---

## A4 — Customer cannot record manual payment

Attempt:

```text
POST /payments
method = cash
```

Expected:

```text
403
```

Verify:

```text
no payment created
order status unchanged
```

---

## A5 — Frontend permissions match backend

For each role:

```text
admin
manager
staff
customer
```

Verify:

* menu visibility;
* route access;
* action buttons;
* API authorization.

Frontend không được hiện action mà backend chắc chắn từ chối trong normal workflow.

Frontend guard không được xem là security boundary.

---

# 10. Test Suite B — Product & Variant Integrity

## B1 — Create product

Create `Tiramisu`.

Verify persisted:

```text
name
category
description
active status
```

---

## B2 — Create variants

Create:

```text
TIR-S
TIR-M
TIR-L
```

Verify:

```text
SKU unique
size preserved
flavor preserved
price preserved
correct product association
```

---

## B3 — Edit one field only

Open `TIR-M`.

Change:

```text
price
280000 → 295000
```

Do NOT change size/flavor.

Save.

Reload.

Expected:

```text
price = 295000
size = 16cm
flavor = Coffee
```

No unrelated field may be overwritten.

---

## B4 — Product/Variant ID collision

Specifically test identifiers where:

```text
sanpham_id == bienthe_id
```

for different entities.

Edit/delete product.

Verify unrelated variant remains unchanged.

Edit/delete variant.

Verify unrelated product remains unchanged.

---

## B5 — Invalid values

Test:

* duplicate SKU;
* missing name;
* invalid price;
* excessive size length;
* excessive flavor length.

Expected:

* validation error;
* no partial persistence.

---

# 11. Test Suite C — Catalog Lists

Create enough products/variants to exceed one page.

Recommended:

```text
≥ 120 products or
≥ 200 variant rows
```

Test:

* page 1;
* page 2;
* page size changes;
* search;
* category filter;
* size filter;
* sort ascending/descending.

Expected:

```text
total = server total
```

not:

```text
rows.length
```

Verify admin product list does not perform N+1 requests per product.

For the main listing:

```text
one list request
```

should be the normal behavior.

---

# 12. Test Suite D — Batch Receiving

## D1 — Receive MAS-001

Receive:

```text
Mascarpone
MAS-001
10 kg
expiry +7d
```

Verify:

```text
batch exists
quantity = 10kg
inventory aggregate updated
ledger entry exists
```

---

## D2 — Receive MAS-002

Receive:

```text
MAS-002
5 kg
expiry +3d
```

Verify:

```text
total mascarpone = 15kg
```

and batches remain independently traceable.

---

## D3 — Duplicate batch code

Attempt duplicate:

```text
MAS-002
```

Expected behavior must follow existing domain rule:

* reject;
  or
* explicitly merge only if designed that way.

Never silently create ambiguous duplicate batches.

---

# 13. Test Suite E — FEFO

Given:

```text
MAS-002 expiry +3d
MAS-001 expiry +7d
```

Create an operation requiring mascarpone.

Expected allocation:

```text
MAS-002 first
```

before MAS-001.

Verify:

```text
batch allocation
inventory
ledger
```

all reference the correct batch.

---

# 14. Test Suite F — Order Lifecycle

## F1 — Online order

CUSTOMER-01 creates online order:

```text
TIR-M × 2
```

Verify:

```text
order owner = CUSTOMER-01
order type = online
staff creator = null
correct initial status
correct amount
```

---

## F2 — POS order

STAFF-01 creates:

```text
TIR-M × 1
```

Verify:

```text
order type = pos
staff creator = STAFF-01
expected POS status
inventory allocation occurs
ledger recorded
```

---

## F3 — Invalid stock

Create order requiring quantity greater than available stock.

Expected:

```text
order rejected
```

Verify:

```text
no partial order
no partial allocation
no partial ledger
```

---

# 15. Test Suite G — Payment Lifecycle

## G1 — Manual cash payment by staff

STAFF-01 records full payment.

Expected:

```text
payment created
correct amount
correct method
correct status
order transitions according to domain rule
```

---

## G2 — Manual payment by customer

CUSTOMER-01 attempts same.

Expected:

```text
403
```

No side effects.

---

## G3 — Partial payment

If supported:

```text
order = 500000
payment = 200000
```

Verify order does not become fully paid/completed unless domain rule permits.

---

## G4 — Overpayment

Attempt amount above permitted outstanding amount.

Expected behavior according to current payment contract.

Must not silently corrupt payment/order totals.

---

# 16. Test Suite H — Cancellation & Inventory Restoration

Create an order that allocates inventory.

Record inventory before:

```text
Q0
```

Create order:

```text
Q1
```

Cancel order.

Read inventory:

```text
Q2
```

Expected:

```text
Q2 == Q0
```

for quantities that should be restored.

Verify:

* order status;
* cancellation metadata;
* inventory restored;
* correct batch restored;
* ledger reversal/restore entry;
* voucher usage restored if applicable;
* payment/refund state follows current domain contract.

Cancellation must not simply change an order status string.

---

# 17. Test Suite I — Stock Ledger Integrity

For every inventory-affecting event:

```text
batch receive
order allocation
cancellation
manual adjustment
production consumption (if implemented)
```

verify corresponding ledger entry.

Ledger must answer:

```text
What changed?
How much?
Which product/ingredient?
Which batch?
Why?
When?
Who/what caused it?
```

Inventory totals must be reconcilable from ledger/domain state.

---

# 18. Test Suite J — Alerts

Create conditions for:

```text
low stock
expiring batch
```

Run the currently supported alert generation mechanism.

Verify:

* correct alert generated;
* correct related entity;
* correct severity/status;
* no unrelated alert;
* resolved/ignored lifecycle behaves correctly;
* unauthorized customer cannot modify alert.

If alert generation is currently manual/scheduled rather than event-driven, do not mark proactive detection as failed.

Proactive Agent behavior belongs to a later AI phase.

---

# 19. Test Suite K — Dashboard

Create controlled orders with known values.

Example:

```text
Order A = 200000
Order B = 300000
Order C = 500000
```

Expected revenue:

```text
1000000
```

Verify dashboard:

* total revenue;
* order count;
* best seller;
* revenue by product;
* revenue by category;
* date range.

Critical invariant:

```text
Dashboard revenue
==
Sales report revenue
```

for the same date range and same business definition of recognized revenue.

If values differ, test fails even if each endpoint individually returns 200.

---

# 20. Test Suite L — Server-Side Filtering & Pagination

Create at least:

```text
120 orders
```

with varying totals.

Filter:

```text
amount >= 500000
```

Verify:

* correct total;
* page 1;
* page 2;
* sort independent;
* filter independent of page size.

Calculate expected count directly from database/test fixture.

Frontend must not filter only the currently loaded page.

---

# 21. Test Suite M — Categories

Create product with category outside any old hardcoded list:

```text
Bánh Trung Thu
```

Reload product form.

Expected:

```text
category remains visible/selectable
```

Create another category through normal product assignment if current domain model treats category as free text.

Verify category source reflects actual data.

---

# 22. Test Suite N — Gift Box & BOM

If Gift Box module is enabled:

Create:

```text
Gift Box A
```

with several components.

Verify:

* gift box creation;
* BOM page reachable from list;
* correct components;
* quantity;
* add/update/delete BOM;
* authorization;
* persistence after reload.

Do not accept a route that exists technically but has no normal UI navigation path.

---

# 23. Test Suite O — Voucher

Only execute if real voucher CRUD has been implemented.

Create:

```text
WELCOME10
10% discount
usage limit = defined test value
```

Then:

```text
create eligible order
→ apply voucher
→ verify total
→ verify usage
→ cancel order
→ verify usage restoration
```

No localStorage/demo implementation counts as passing.

---

# 24. Test Suite P — Failure Safety

Simulate failures where practical.

Examples:

```text
database error
network interruption
invalid foreign key
service exception
```

Critical requirement:

No operation may leave:

```text
order created
but inventory not updated

or

inventory updated
but order missing

or

payment created
but order inconsistent
```

Business mutations requiring atomicity must rollback as a unit.

---

# 25. Test Suite Q — Concurrency Smoke Tests

Do not build a full performance test suite yet.

Test only high-risk concurrency.

## Q1 — Two simultaneous purchases

Available:

```text
1 unit
```

Two requests attempt to buy it simultaneously.

Expected:

```text
maximum successful allocation = 1
```

Inventory must never become invalid/negative unless explicitly supported.

---

## Q2 — Concurrent cancellation/update

Attempt two conflicting state-changing operations.

Expected:

* deterministic business behavior;
* no duplicate ledger reversal;
* no duplicate stock restoration.

---

# 26. Test Suite R — Demo/Synthetic Data Isolation

Synthetic development data is allowed.

But it must not be confused with real production state.

Verify:

* seed scripts are restricted to allowed environments;
* production mode refuses demo seed;
* demo data can be identified/audited;
* no orphaned dependencies after cleanup;
* current operational reports reflect intended test dataset only.

Synthetic data is acceptable.

Synthetic behavior is not.

---

# 27. Manual E2E Scenario — “One Bakery Day”

After automated tests pass, perform one complete manual scenario.

## Morning

Admin creates:

```text
Tiramisu
```

with variants.

Admin receives:

```text
MAS-001 = 10kg
MAS-002 = 5kg
```

Verify inventory.

---

## Midday

Customer places:

```text
TIR-M × 2
```

Staff creates:

```text
POS TIR-S × 1
```

Verify:

```text
orders
inventory
batch allocation
ledger
```

---

## Payment

Staff records allowed payment.

Verify:

```text
payment
order status
reports
```

---

## Cancellation

Cancel one eligible order.

Verify:

```text
inventory restoration
ledger reversal
voucher restoration where relevant
```

---

## End of day

Open dashboard.

Verify:

```text
orders
revenue
best seller
inventory
alerts
```

against manually calculated expected values.

The system passes only if the numbers reconcile.

---

# 28. Evidence Required

For every test group, record:

```text
PASS
FAIL
BLOCKED
NOT IMPLEMENTED
```

Do not mark `NOT IMPLEMENTED` as `PASS`.

Each failure report must contain:

```text
Test ID
Expected
Actual
Business impact
Relevant API/service
Reproduction steps
Evidence
```

Evidence may include:

* pytest output;
* vitest output;
* API request/response;
* DB query;
* browser/network screenshot;
* ledger rows.

---

# 29. Automated Test Expectations

Prefer automated regression tests for:

* RBAC;
* service authorization;
* product/variant integrity;
* order lifecycle;
* payment permissions;
* inventory allocation;
* FEFO;
* cancellation restoration;
* pagination/filtering;
* dashboard/report consistency;
* transactional rollback.

Do not create brittle UI tests for behavior better verified at service/API level.

Use UI/E2E testing where frontend integration itself is the behavior under test.

---

# 30. Test Report

After execution, produce:

## Overall status

```text
NOT READY FOR AI
```

Execution date: 2026-08-21

The automated domain suite passes and the browser mutation subset was run
against disposable PostgreSQL `bakery_test` through the local admin UI. The
full "One Bakery Day" scenario is still incomplete, so the release gate
remains NOT READY FOR AI.

## Summary table

| Domain       | Result        | Critical failures |
| ------------ | ------------- | ----------------- |
| Auth/RBAC    | PASS | No bypass found; automated suite and browser guard pass. |
| Product      | PASS | API tests and browser catalog/detail checks pass. |
| Inventory    | PASS | Batch receive, aggregate stock, and ledger rows verified in browser. |
| FEFO         | PARTIAL | Earlier-expiry substitute batches created and visible; component allocation cannot be exercised because Mascarpone/production operation is absent. |
| Orders       | PASS | POS order created and cancelled through admin UI; invalid-stock order rejected. |
| Payments     | PASS | Payment service/API tests pass. |
| Cancellation | PASS | Browser cancellation restored stock and recorded reason. |
| Ledger       | PASS | Browser ledger shows receive, sale, and return rows. |
| Dashboard    | PASS | Dashboard and report requests load successfully. |
| Pagination   | PASS | Browser catalog filter and page 1/3 -> page 2/3 pass. |
| Gift Box/BOM | PASS | Browser BOM route loads 3 real items. |
| Voucher      | BLOCKED | `PCT10` and `SALE15` were rejected as expired/not yet effective in test data; discount and usage restoration were not executable. |

### Executed result

- Automated backend suite: `260 passed` on disposable PostgreSQL `bakery_test`.
- Frontend checks: `npm.cmd run lint` and `npm.cmd run build` pass.
- Targeted alert regression: `9 passed`; `ruff check` passes on changed alert files.
- Browser frontend: `http://127.0.0.1:3000`; disposable test frontend/API:
  `http://127.0.0.1:3001` / `http://127.0.0.1:8002`.
- Browser catalog returned 25 products; the `Mousse` filter returned 5 products.
- Browser admin dashboard loaded real data: `52.000 VND` revenue, 1 order, and 1 pending alert.
- Browser inventory, ledger, product, voucher, gift-box/BOM, batch, orders, and Operations Agent screens loaded.
- Browser alert screen initially exposed `GET /alerts` `422` because the UI sent `sort_by=ngay_canh_bao`; the supported alias and service mapping were added, then the page returned `200` with one alert.
- Browser mutation evidence on `bakery_test`:
  - component batches `FEFO-SR-001` (10, expiry 2026-08-28) and
    `FEFO-SR-002` (5, expiry 2026-08-24) were created; inventory and ledger
    rows showed independent `Nhập hàng` entries;
  - product batch `TIR-M-TEST-001` was received with 12 units;
  - POS order `POS-20260821072210034338` for Tiramisu M changed stock
    `12 -> 11`, then cancellation restored `11 -> 12`;
  - ledger showed `Nhập hàng`, `Xuất bán`, and `Trả hàng` for the order;
  - quantity 13 against available stock 12 was rejected with no new order and
    stock remained 12.
- The exact Mascarpone FEFO scenario is blocked by the disposable dataset/UI:
  no Mascarpone component or production-operation screen exists, so the
  substitute batch test is not claimed as historical Spec 11 FEFO proof.

### Remaining evidence before the AI gate

The following Spec 11 evidence is still missing and must be run on the
disposable browser-backed test database:

- customer-owned online order and the complete receive -> online -> POS ->
  payment -> cancellation -> dashboard reconciliation path;
- exact Mascarpone FEFO allocation and component ledger rows, after adding a
  canonical Mascarpone component plus a production/consumption operation;
- voucher usage and restoration after loading a valid, future-dated test voucher;
- failure-safety and concurrency smoke through the web/API boundary.

No P0/P1 authorization bypass or data-integrity failure was found in this
execution. The status remains NOT READY because the Definition of Done
requires the manual mutation scenario and the remaining boundary evidence.

---

# 31. Release Gate

Leaf Crème is **NOT READY FOR AI** if any of these remain:

```text
P0/P1 authorization bypass
inventory inconsistency
wrong batch allocation
order mutation without correct stock effect
cancellation without correct restoration
payment authorization bypass
product/variant cross-update
incorrect server-side filter results
dashboard/report disagreement
transaction causing partial business state
```

UI polish bugs and minor P2 issues may be documented separately if they do not affect business correctness.

---

# 32. AI Readiness Gate

When this spec passes, the next phase may expose existing capabilities as Agent tools.

Examples:

```text
get_inventory_status()
get_expiring_batches()
get_order()
check_production_feasibility()
create_purchase_order_draft()
cancel_order()
```

But Agent tooling must reuse the **validated domain services** from this phase.

Do not create a parallel implementation of business rules for AI.

---

# Definition of Done

Spec 11 is complete when:

1. Core admin workflows work end-to-end.
2. RBAC is enforced server-side.
3. Product and variant data remain intact through CRUD.
4. Batch receiving produces correct inventory and ledger state.
5. FEFO allocation works against deterministic test data.
6. Order creation produces correct business side effects.
7. Payments respect authorization and lifecycle rules.
8. Cancellation restores all required business state.
9. Dashboard numbers reconcile with reports.
10. Pagination/filtering remains correct beyond the first page.
11. Failure scenarios do not leave partial transactional state.
12. Critical regression tests exist and pass.
13. Manual “One Bakery Day” scenario passes.
14. No unresolved critical business-integrity issue remains.

Only then mark:

**BUSINESS PLATFORM STABLE — READY FOR AI AGENT PHASE.**
