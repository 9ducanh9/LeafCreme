# LeafCreme

LeafCreme is a full-stack bakery operations and commerce system built for a small cake business that needs more than a basic storefront. The project combines product catalog management, batch-based inventory control, FEFO stock allocation, order handling, and payment workflows in a single codebase.

This repository is positioned as a portfolio flagship because it is not just a CRUD app. The core value is operational correctness: the system models how a real bakery tracks perishable stock, fulfills orders against the right batch, and keeps sales, inventory, and payments aligned.

## Project Overview

**Goal:** help a bakery sell online while managing short-shelf-life inventory with traceability.

**What makes it different from a typical storefront project:**
- Batch-level inventory instead of simple product counts
- FEFO allocation for perishable products
- Multiple order types: POS, online, and pre-order
- Payment workflows that update order/payment state together
- Admin tooling for products, batches, orders, inventory, reporting, and alerts

## Business Problem

Small food businesses often run sales and operations in disconnected tools: a storefront for orders, spreadsheets for stock, and manual notes for expiry dates. That creates avoidable waste, poor fulfillment visibility, and fragile payment reconciliation.

LeafCreme addresses that by treating inventory as batches with expiry dates and routing order fulfillment through FEFO rules. The result is a system that is closer to actual bakery operations than a generic e-commerce demo.

## Implemented Features

### Customer-facing
- Product browsing, category pages, and product detail flows
- Shopping cart and checkout
- User registration, login, profile editing, and avatar upload
- Order placement and order history flows
- Payment flows for:
  - cash / manual payment records
  - SePay/VietQR bank transfers with automatic webhook confirmation
- Leafie AI assistant proxy flow via backend to n8n

### Admin / operations
- Product and variant management
- Batch management for products, components, and gift boxes
- Inventory visibility by batch
- Order list, order detail, status updates, and deletion
- Sales reporting based on real backend sales data
- Alerts/inventory monitoring surfaces
- User management endpoints for admin/manager roles

## Architecture / Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- Tailwind CSS
- Material UI
- Recharts

### Backend
- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT authentication
- Python services for FEFO allocation and payment helpers

### External / integration points
- SePay/VietQR payment integration
- n8n webhook integration for Leafie assistant
- Docker Compose for local PostgreSQL + Adminer

## Key Business Logic

### 1. FEFO stock allocation
Implemented in [fefo.py](/D:/Leaf%20Creme/app/services/fefo.py:1).

When an order is created, the system allocates stock by earliest expiry first, not just by any available inventory. This is the highest-value business rule in the project because it maps directly to how a bakery reduces spoilage.

### 2. Batch-based inventory
Implemented through [batches.py](/D:/Leaf%20Creme/app/routers/batches.py:1).

Inventory is tracked per batch for:
- finished products
- components
- gift boxes

Each batch stores identifiers, quantities, expiry dates, and status, which allows operational visibility beyond a single aggregate stock number.

### 3. Order flow
Implemented through [orders.py](/D:/Leaf%20Creme/app/routers/orders.py:1).

The order pipeline supports:
- POS orders
- online orders
- pre-orders

Order creation validates items, allocates inventory, applies vouchers when available in backend order logic, creates line items, and updates payment/order state.

### 4. Payments
Implemented through [payments.py](/D:/Leaf%20Creme/app/routers/payments.py:1).

The payment layer supports:
- direct/manual payment records
- order-specific VietQR generation with amount and payment code
- authenticated, idempotent SePay webhook confirmation

Successful payment updates can move an order from pending to paid when the total paid amount reaches the order total.

### 5. Order and inventory lifecycle

Order creation allocates the exact source lots through FEFO and records one allocation per lot. Each allocation produces an inventory-ledger movement: `xuat_ban` for product or gift-box sales and `xuat_bom` for components consumed by a gift box. Cancelling an order, or failing an unpaid order, restores those same lots and records `tra_hang` movements.

Pre-orders begin at `cho_coc`, online orders at `dang_xu_ly`, and paid/completed orders use `hoan_thanh`. Failed or cancelled orders use `da_huy`. Run `python scripts/verify_inventory_reliability.py` against a disposable PostgreSQL database to verify FEFO, BOM, ledger, and restoration behavior.

## Runtime-backed Features and Boundaries

The production UI is backed by APIs for authentication (local JWT or Cognito),
profiles and password changes, catalog/variants, vouchers, batches, inventory,
orders, reports, analytics, Agent actions, and SePay payments. Voucher
validation is repeated by backend order creation, so client-side feedback is
never authoritative.

Categories intentionally remain a product attribute rather than a separate
catalog table. Admins manage them while editing products, and category filters
are derived from active product data. Leafie remains an integration boundary:
the backend proxies to the configured n8n workflow and returns `503` when that
external workflow is not configured.

## Repository Structure

```text
app/
  core/           backend config, auth, dependencies
  routers/        FastAPI route modules
  services/       FEFO and payment helper logic
  models.py       SQLAlchemy models
  main.py         FastAPI application entrypoint

frontend/
  src/
    pages/        customer and admin pages
    services/     API clients and frontend service layer
    contexts/     auth/cart/toast state
    components/   reusable UI and admin components

alembic/          versioned database schema migrations (source of truth)
migrations/       historical SQL fragments; do not run for new environments
docs/             current payment-operation guides
```

## Setup Instructions

### 1. Infrastructure

Start PostgreSQL locally:

```bash
docker compose up -d
```

This provides:
- PostgreSQL on `localhost:5433` (container-to-container hostname: `db:5432`)
- Adminer on `http://localhost:8080`

### 2. Backend

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/bakery
APP_ENV=development
SECRET_KEY=replace-with-a-long-random-secret
FRONTEND_BASE_URL=http://localhost:3000
BACKEND_BASE_URL=http://localhost:8000
```

Optional integrations:

```env
N8N_WEBHOOK_URL=https://your-n8n-webhook
SEPAY_BANK_ACCOUNT=
SEPAY_BANK_CODE=
SEPAY_ACCOUNT_NAME=
SEPAY_WEBHOOK_API_KEY=
```

Apply database migrations (schema is now Alembic-managed — see
`alembic/versions/`; `app/models.py` is not applied to the DB directly):

```bash
alembic upgrade head
```

For a new local database, load the migrated LeafCreme catalog and demo users
without deleting any existing rows:

```bash
python scripts/seed_demo_data.py
```

The default local-only demo password is `LeafCremeDemo123!`. Override it with
`LEAFCREME_DEMO_PASSWORD` before running the seed outside local development.

Run backend:

```bash
python -m uvicorn app.main:app --reload --port 8000
```

Backend URLs:
- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Optional frontend integration:

```env
VITE_LEAFIE_BACKEND_URL=http://localhost:8000/leafie/ask
```

Run frontend:

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`.

### 4. Quick local launch

Windows helper scripts are included:
- `start-backend.bat`
- `start-all.bat`

### 5. Tests

Needs a reachable Postgres (`docker compose up -d db` first) — the suite
runs against real Postgres, not SQLite, because the schema depends on
JSONB, native ENUM, and TEXT[] types.

```bash
pip install -r requirements-dev.txt
# PowerShell: $env:TEST_DATABASE_URL='postgresql+psycopg2://postgres:postgres@localhost:5433/bakery_test'
# bash: export TEST_DATABASE_URL='postgresql+psycopg2://postgres:postgres@localhost:5433/bakery_test'
pytest
```

Frontend quality checks:

```bash
cd frontend
npm ci
npm run lint
npm run test -- --run
npm run build
npx playwright install chromium
npm run test:e2e
```

### 6. Docker (API + Postgres + Adminer together)

```bash
docker compose up --build
```

CI (`.github/workflows/ci.yml`) runs backend lint/migrations/tests, frontend
lint/unit tests/build/browser smoke tests, and the backend Docker build on
every push/PR against `main`. A successful push to `main` then deploys the
frontend to Vercel.

## Demo / Screenshots

Add screenshots or GIFs here before using this repository in applications.

Suggested assets:
- `[Screenshot Placeholder] Customer storefront / home page`
- `[Screenshot Placeholder] Product detail + cart`
- `[Screenshot Placeholder] Checkout + payment flow`
- `[Screenshot Placeholder] Admin order management`
- `[Screenshot Placeholder] Batch inventory / FEFO-oriented operations`
- `[Screenshot Placeholder] Admin dashboard`

## Current Limitations

- Leafie depends on the external n8n workflow configured by `N8N_WEBHOOK_URL`.
- SePay confirmation depends on a correctly configured provider webhook and a
  real incoming bank transaction; automated tests cover QR construction,
  authentication, amount/account matching, and idempotency without moving money.
- Browser smoke tests use mocked public API responses. Authenticated full-stack
  browser tests still require a disposable seeded PostgreSQL environment.
- Categories are derived from products by design; there is no independent
  category lifecycle, ordering, or category-media model.
- Railway's legacy `railway.toml` config-as-code path must be migrated to the
  current Railway Infrastructure-as-Code format before Railway's announced
  legacy cutoff.

## Future Improvements

- Run authenticated browser tests against an isolated, seeded full stack.
- Add a backup/restore rehearsal and production recovery runbook.
- Profile slow queries and frontend bundles before applying performance changes.
- Migrate Railway deployment configuration to `.railway/railway.ts`.
- Add polished screenshots/GIFs for portfolio review.

## Why This Project Matters In A Portfolio

LeafCreme demonstrates more than framework familiarity. It shows backend modeling, operational business rules, payment integration, role-aware APIs, and the discipline to separate real features from demo-only surfaces. That combination makes it a stronger flagship project than a standard CRUD storefront.
