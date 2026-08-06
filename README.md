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
  - MoMo Business API flow
  - MoMo QR flow with manual confirmation
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
- MoMo payment integration
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
- MoMo redirect/API flow
- MoMo QR generation with admin confirmation

Successful payment updates can move an order from pending to paid when the total paid amount reaches the order total.

## Real Features vs Demo-Only Areas

This distinction matters. The repository contains both real backend-backed functionality and some intentionally bounded demo/admin surfaces.

### Real / backend-backed today
- Authentication and JWT-based session flow
- Product, variant, order, user, batch, inventory, and payment APIs
- FEFO allocation during order creation
- Sales report endpoint used by admin dashboard revenue views
- User profile update and avatar upload
- Leafie backend proxy endpoint

### Demo-only or intentionally limited today
- Admin voucher management UI
  - frontend now treats it as demo/dev-only unless explicitly enabled
  - there is no dedicated voucher CRUD backend API for admin use
- Customer voucher validation UI
  - backend applies vouchers during order creation, but there is no standalone public validation endpoint
- Category management UI
  - local/demo-only writes, no dedicated backend category CRUD
- Some admin dashboard analytics breakdowns
  - revenue trend and summary use real backend data
  - product/category/best-seller breakdowns remain limited until additional report endpoints exist
- Contact form
  - hidden as a fake flow and replaced by direct contact channels
- Password change UI
  - hidden until a real backend endpoint exists

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

migrations/       SQL migrations and supporting schema scripts
docs/             setup notes and payment integration docs
```

## Setup Instructions

### 1. Infrastructure

Start PostgreSQL locally:

```bash
docker compose up -d
```

This provides:
- PostgreSQL on `localhost:5432`
- Adminer on `http://localhost:8080`

### 2. Backend

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bakery
APP_ENV=development
SECRET_KEY=replace-with-a-long-random-secret
FRONTEND_BASE_URL=http://localhost:3000
BACKEND_BASE_URL=http://localhost:8000
```

Optional integrations:

```env
N8N_WEBHOOK_URL=https://your-n8n-webhook
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_QR_PHONE=
MOMO_QR_ACCOUNT_NAME=
MOMO_QR_IMAGE_PATH=
```

Apply database migrations (schema is now Alembic-managed — see
`alembic/versions/`; `app/models.py` is not applied to the DB directly):

```bash
alembic upgrade head
```

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

Optional frontend flags:

```env
VITE_LEAFIE_BACKEND_URL=http://localhost:8000/leafie/ask
VITE_ENABLE_DEMO_VOUCHERS=false
VITE_ENABLE_DEMO_CATEGORY_MANAGEMENT=false
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
pytest
```

### 6. Docker (API + Postgres + Adminer together)

```bash
docker compose up --build
```

CI (`.github/workflows/ci.yml`) runs lint → migrate → test → docker build
on every push/PR against `main`.

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

- Frontend production build still has unrelated TypeScript issues in some admin surfaces; local dev workflow is the most reliable way to evaluate the UI right now.
- Admin reporting is partially real, partially limited by missing backend analytics endpoints.
- Voucher and category management are not complete production features yet.
- Contact and password-change flows are intentionally hidden/disabled until backend support exists.
- Leafie depends on external n8n configuration; without it, the assistant endpoint returns a configuration error.

## Future Improvements

- Add dedicated voucher CRUD and customer-side voucher validation APIs
- Add full category CRUD on the backend
- Expand analytics endpoints for product, category, and bestseller reporting
- Finish frontend TypeScript cleanup so the production build passes cleanly
- Add automated tests for FEFO allocation, order creation, and payment state transitions
- Add seeded demo data and polished screenshot assets for faster reviewer evaluation

## Why This Project Matters In A Portfolio

LeafCreme demonstrates more than framework familiarity. It shows backend modeling, operational business rules, payment integration, role-aware APIs, and the discipline to separate real features from demo-only surfaces. That combination makes it a stronger flagship project than a standard CRUD storefront.
