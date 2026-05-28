# LeafCreme Project Handover

## 1. Project Overview

### Project name
- `LeafCreme`

### Main purpose / business goal
- `LeafCreme` is a full-stack bakery operations and storefront system.
- The core business goal is to combine customer ordering with internal inventory, batch, voucher, supplier, payment, and gift-box management.
- The most distinctive operational requirement is batch-aware stock handling with FEFO allocation for perishable products.

### Current development stage
- Current stage: `working demo / portfolio prototype with real backend foundations`.
- The backend has real CRUD and transaction flows for products, users, batches, orders, payments, suppliers, alerts, gift boxes, and basic analytics/reporting.
- The frontend is partially production-shaped, but some admin/customer features are still demo-only, incomplete, or inconsistently wired.
- The repository has already gone through cleanup passes focused on trustworthiness, portfolio presentation, config safety, and removal of misleading fake flows.

### Core features already implemented
- Authentication with JWT access/refresh tokens.
- User management with roles and avatar upload.
- Product CRUD with variants and image upload.
- Supplier CRUD.
- Batch management for products, components, and gift boxes.
- Inventory tracking at batch level.
- FEFO allocation for order creation.
- Order creation, listing, detail, status updates, cancellation, and deletion.
- Voucher application during order creation.
- Payment records plus MoMo QR and MoMo Business API integration paths.
- Gift-box admin CRUD plus public gift-box browsing.
- Inventory alerts and low-stock / expiry alert generation.
- Public storefront pages for products, gift boxes, cart, checkout, order history, and profile.
- Leafie chatbot proxy endpoint to n8n.

### Features planned but unfinished
- Fully real voucher administration and public voucher validation API flow.
- Category management backed by real backend persistence.
- Complete reporting/analytics breakdowns by product and category.
- Fully reliable admin alerts frontend wiring.
- Pre-order note editing flow with a real backend endpoint.
- Complete password change backend support.
- Stronger deployment story, CI/CD, and automated test coverage.
- Cleanup of encoding/mojibake issues in Vietnamese messages and docs.

---

## 2. Tech Stack

### Frontend
- React 18
- TypeScript
- Vite
- React Router DOM
- Tailwind CSS
- Material UI (`@mui/material`, `@mui/icons-material`, `@mui/x-date-pickers`)
- Emotion
- Recharts
- Day.js
- Lucide React

### Backend
- FastAPI
- SQLAlchemy 2.x ORM
- Pydantic
- Uvicorn
- Python Dotenv
- Passlib with bcrypt
- Python-JOSE for JWT
- HTTPX
- Requests
- Pillow
- QRCode

### Database
- PostgreSQL
- PostgreSQL JSONB and ARRAY column types
- SQL enums already existing in DB schema

### Authentication
- JWT access token + refresh token flow
- HTTP Bearer auth
- Password hashing with bcrypt

### State management
- React Context for auth, cart, toast, and Leafie chat state
- Local storage for auth tokens and cart persistence
- Demo-only local storage usage in some admin services such as vouchers/categories

### Styling / UI libraries
- Tailwind with CSS variable token system
- Material UI components where needed
- Custom component library in `frontend/src/components/ui`

### Deployment / infrastructure
- Local PostgreSQL via Docker Compose
- Adminer via Docker Compose
- Windows batch scripts for local startup
- No confirmed production deployment config in repo

### Dev tools
- ESLint
- TypeScript compiler
- Vite dev server
- Docker Compose
- Adminer

### AI integrations
- `Leafie` frontend chat UI
- Backend proxy endpoint to n8n webhook
- AI logic itself is external to this repository and lives in n8n workflow(s)

---

## 3. Folder & Architecture Breakdown

### Repository-level structure

| Path | Purpose |
|---|---|
| `app/` | FastAPI backend application |
| `frontend/` | React + TypeScript frontend |
| `migrations/` | Manual SQL migration fragments |
| `scripts/` | One-off operational/seed scripts |
| `uploads/` | Uploaded assets such as product images and payment images |
| `docs/` | Project notes and payment integration docs |
| `scratch/` | Temporary working area |
| `docker-compose.yml` | Local DB + Adminer services |
| `requirements.txt` | Python dependencies |
| `ENV_SETUP.md` | Environment variable guide |

### Backend structure

| Path | Purpose |
|---|---|
| `app/main.py` | FastAPI app bootstrap, middleware, exception handlers, router registration |
| `app/db.py` | SQLAlchemy engine/session setup and deterministic root `.env` loading |
| `app/models.py` | Full SQLAlchemy ORM model layer |
| `app/schemas.py` | Validation helpers for JSONB-backed structures |
| `app/core/` | Config, auth dependencies, JWT security |
| `app/middleware/` | Request logging and HTTP security headers |
| `app/routers/` | API route modules by business area |
| `app/services/` | Shared business utilities and extracted service-layer logic |
| `app/services/orders/` | Recent vertical-slice refactor for orders domain |

### Backend architecture style
- Primary pattern is `router-centric FastAPI`, with a newer push toward service extraction.
- Most older routers still contain business logic directly.
- Orders is the clearest example of the intended direction: router receives HTTP input and delegates to a service layer.
- ORM models are centralized in a single `app/models.py`.
- Shared procedural helpers are concentrated in `app/services/helpers.py`.

### Frontend structure

| Path | Purpose |
|---|---|
| `frontend/src/App.tsx` | Main route map and provider composition |
| `frontend/src/components/` | Reusable UI and domain components |
| `frontend/src/components/admin/` | Admin-only view components |
| `frontend/src/components/bakery/` | Customer-facing brand/storefront components |
| `frontend/src/contexts/` | Auth, cart, toast, and Leafie state |
| `frontend/src/pages/` | Customer-facing pages |
| `frontend/src/pages/admin/` | Admin pages |
| `frontend/src/services/` | API clients and frontend business services |
| `frontend/src/services/admin/` | Admin-specific service wrappers |
| `frontend/src/config/` | Runtime env-sensitive frontend config |
| `frontend/src/data/` | Static fallback/demo datasets |
| `frontend/src/styles/` | CSS tokens and shared styling |
| `frontend/src/types/` | Shared TypeScript types |
| `frontend/src/utils/` | Frontend utilities |

### API layers
- Frontend API traffic is routed through `frontend/src/services/api.ts` (`apiClient`) or direct `fetch` in a few targeted flows.
- Backend exposes REST endpoints via FastAPI routers.
- Auth tokens are stored in local storage and attached as bearer tokens by frontend service code.
- The Leafie frontend talks to the backend proxy, which then forwards to n8n.

### Database model organization
- A single SQLAlchemy model file defines all tables and enum-backed domains.
- Models use Vietnamese business naming directly (`DonHang`, `PhieuGiamGia`, `LoHangSanPham`, `TonKhoSanPham`, etc.).
- The schema is strongly batch-oriented and models inventory as one row per lot per entity type.

### Service layers
- Existing extracted service modules:
  - `app/services/fefo.py`: FEFO stock allocation
  - `app/services/momo.py`: MoMo Business API helper logic
  - `app/services/momo_qr.py`: MoMo QR payment info generation
  - `app/services/helpers.py`: utility and business helper functions
  - `app/services/orders/`: order domain service layer
- Frontend service modules are split by domain but not all are equally production-ready.

### Reusable components
- Customer UI: product cards, cart drawer, profile forms, Leafie widgets, layout shells.
- Admin UI: tables/forms for products, vouchers, preorders, sales, dashboard widgets.
- Generic UI primitives: button, input, card, modal, toast, confirm dialog, loading spinner.

### Config system
- Backend:
  - `app/db.py` explicitly loads root `.env` using `Path(__file__).resolve()`.
  - `app/core/config.py` loads runtime settings for secrets, CORS, URLs, and payment providers.
- Frontend:
  - `frontend/src/config/runtimeConfig.ts` centralizes API base URL and Leafie backend URL.
  - Frontend dev server runs on port `3000`; backend default is `8000`.

---

## 4. Database Design

### Database overview
- Database is PostgreSQL with SQLAlchemy ORM models mapped in `app/models.py`.
- The schema is organized around:
  - role/user/auth data
  - products and variants
  - suppliers and components
  - inventory batches and stock snapshots
  - gift boxes and BOM definitions
  - vouchers
  - orders, order details, payments, returns
  - operational history, alerts, reviews, analytics, logs

### Core entities and relationships

#### Access and users
- `vaitro`
  - Fields: `vaitro_id`, `ten_vai_tro`, permission JSONB columns, timestamps.
  - Used by `nguoidung`.
- `nguoidung`
  - Fields: username, email, hashed password, role FK, profile fields, avatar, active flag, last login.
  - Relationships:
    - belongs to `vaitro`
    - referenced by `donhang`, `doitra`, `lichsugia`, `systemlog`, `canhbaotonkho`

#### Products and variants
- `sanpham`
  - Fields: `ten`, `sku`, `loai`, `gia_co_ban`, description, image URL, `danh_muc`, `don_vi_tinh`, `phu_hop_dip`, active flag.
  - Relationships:
    - has many `bienthesanpham`
- `bienthesanpham`
  - Fields: `sanpham_id`, `huong_vi`, `kich_thuoc`, `gia_bienthe`, `sku_bienthe`, `muc_gioi_han_ton`, active flag.
  - Relationships:
    - belongs to `sanpham`
    - has many `lohangsanpham`

#### Gift boxes and components
- `hopqua`
  - Gift-box master table with name, SKU, price, image, dimensions, weight.
- `linhkien`
  - Component/raw material table with supplier reference.
- `congthuchopqua`
  - BOM using component lots (`lohanglinhkien`) with quantity and assembly order.
- `hopquabom`
  - Simplified BOM mapping gift boxes to product variants (`bienthesanpham`).

#### Suppliers
- `nhacungcap`
  - Supplier master with payment info JSONB and contact data.
  - Referenced by product lots, component lots, gift-box lots, and components.

#### Batch and stock model
- `lohangsanpham`
  - Product lot.
  - Important fields: `bienthe_sanpham_id`, `ncc_id`, `ma_lo`, `ngay_het_han`, `so_luong`, `gia_don_vi`, `trang_thai`, `ma_qr`.
- `lohanglinhkien`
  - Component lot with similar structure.
- `lohanghopqua`
  - Gift-box lot with similar structure.
- `tonkhosanpham`
  - One-to-one current stock snapshot for a product lot.
  - Important fields: `so_luong_hien_tai`, `so_luong_da_ban`.
- `tonkholinhkien`
  - Current stock for component lot.
- `tonkhohopqua`
  - Current stock for gift-box lot.

#### Orders and vouchers
- `phieugiamgia`
  - Fields: code, name, discount type enum, discount value, minimum order, start/end dates, usage limits, applicable products JSONB, active flag.
- `donhang`
  - Header row for orders.
  - Important fields: `ma_don_hang`, `nguoidung_id`, `loai_don`, `tong_tien`, `tien_giam_gia`, `tien_thanh_toan`, `tien_dat_coc`, `trang_thai`, delivery/customer metadata.
- `donhang_phieugiamgia`
  - Junction table linking applied vouchers to orders with actual discount amount.
- `chitietdonhang`
  - Line items.
  - Important fields: `lohang_sanpham_id`, `lohang_hopqua_id`, `hop_qua_id`, `so_luong`, `gia_don_vi`, `tong_tien_phu`, `trang_thai_don_hang`.
  - This table is also the basis for inventory restoration on order cancellation after the recent fix.

#### Payments and returns
- `thanhtoan`
  - Payment records with method enum, amount, status, gateway transaction code, JSONB transaction details.
- `doitra`
  - Return/refund requests by order line.

#### Cart
- `giohang`
  - Cart header for either user or anonymous session.
- `chitietgiohang`
  - Cart lines referencing lots.

#### History / observability / analytics
- `lichsukhosanpham`, `lichsukholinhkien`, `lichsukhohopqua`
  - Inventory transaction history tables.
- `canhbaotonkho`
  - Low stock / expiry / overdue alerts.
- `lichsugia`
  - Price change history.
- `danhgiasanpham`
  - Product review data.
- `thongkesanpham`
  - Aggregated product statistics.
- `systemlog`
  - Audit/system logging table.

### Important constraints and schema characteristics
- Multiple unique codes:
  - `sanpham.sku`
  - `bienthesanpham.sku_bienthe`
  - lot codes and QR codes
  - voucher code
  - order code
  - payment transaction code
- Stock tables use one-to-one uniqueness on lot FK.
- Several JSONB fields are validated by helper schemas rather than dedicated ORM submodels.
- Many enums are assumed to already exist in PostgreSQL and are created with `create_type=False`.

### Migrations already present
- `migrations/add_phu_hop_dip_to_sanpham.sql`
- `migrations/create_chat_messages.sql`

### Pending schema issues / risks
- Schema evolution is mostly manual; there is no Alembic pipeline in the repo.
- Some app behavior depends on enum literal strings staying exactly aligned across Python, SQL, and frontend.
- There is evidence of at least one enum mismatch bug in voucher logic (`phantram` vs `phan_tram`).
- Encoding corruption in source files raises confidence concerns around localized strings and future schema-related scripts.

---

## 5. API Documentation

### Authentication flow
- Register: `POST /auth/register`
- Login: `POST /auth/login` using `OAuth2PasswordRequestForm`
- Refresh: `POST /auth/refresh`
- Current user: `GET /auth/me`
- Access/refresh tokens are JWTs; frontend stores them in local storage.
- Protected endpoints use bearer token auth via `get_current_user`.
- Role-based endpoints additionally use `require_role(...)`.

### Endpoint inventory by router

#### Auth
- `POST /auth/register`
  - Request: username, email, password, full name, `vaitro_id`, optional profile fields.
  - Response: access token, refresh token, token type, user summary.
- `POST /auth/login`
  - Request: form-encoded username/email + password.
  - Response: same token response shape as register.
- `POST /auth/refresh`
  - Request: refresh token JSON body.
  - Response: new access token and user identity fields.
- `GET /auth/me`
  - Response: authenticated user profile.

#### Users
- `GET /users`
- `GET /users/{user_id}`
- `POST /users`
- `PUT /users/{user_id}`
- `DELETE /users/{user_id}`
- `POST /users/{user_id}/avatar`
- Role behavior: admin/manager-oriented for management flows; profile update is partly reused by customer UI.

#### Products and variants
- `GET /products`
- `POST /products`
- `POST /products/upload-image`
- `GET /products/{product_id}`
- `PUT /products/{product_id}`
- `DELETE /products/{product_id}`
- `POST /products/variants`
- `GET /products/variants/{variant_id}`
- `PUT /products/variants/{variant_id}`
- `DELETE /products/variants/{variant_id}`
- `GET /products/{product_id}/variants`

#### Suppliers
- `GET /suppliers`
- `GET /suppliers/{supplier_id}`
- `POST /suppliers`
- `PUT /suppliers/{supplier_id}`
- `DELETE /suppliers/{supplier_id}`

#### Components
- `GET /components`
- `GET /components/{component_id}`

#### Batches and inventory
- Product lots:
  - `POST /batches/products`
  - `GET /batches/products`
  - `GET /batches/products/{batch_id}`
  - `PUT /batches/products/{batch_id}`
- Component lots:
  - `POST /batches/components`
  - `GET /batches/components`
  - `GET /batches/components/{batch_id}`
  - `PUT /batches/components/{batch_id}`
- Gift-box lots:
  - `POST /batches/gift-boxes`
  - `GET /batches/gift-boxes`
  - `GET /batches/gift-boxes/{batch_id}`
  - `PUT /batches/gift-boxes/{batch_id}`
- Cross-cutting inventory views:
  - `GET /batches/expiring`
  - `GET /batches/inventory/products`
  - `GET /batches/inventory/components`
  - `GET /batches/inventory/gift-boxes`
  - `GET /batches/by-variant/{bienthe_id}`

#### Orders
- `GET /orders`
  - Supports filtering: `skip`, `limit`, `loai_don`, `trang_thai`, `ma_don_hang`, date range.
- `GET /orders/{order_id}`
- `POST /orders`
  - Query param `loai_don` defaults to `pos`.
  - Body `OrderCreate`:
    - `items[]` with `bienthe_id` or `hop_qua_id` plus `so_luong`
    - optional voucher codes
    - optional delivery/customer fields
    - optional deposit and notes
- `PUT|PATCH /orders/{order_id}/status`
- `POST /orders/{order_id}/cancel`
  - Query param `ly_do`
  - Recent fix restores lot inventory inside the same transaction before commit.
- `DELETE /orders/{order_id}`

#### Payments
- `GET /payments`
- `GET /payments/{payment_id}`
- `POST /payments`
- `PUT /payments/{payment_id}/status`
- `POST /payments/{payment_id}/verify`
- MoMo Business:
  - `POST /payments/momo/create`
  - `GET /payments/momo/ipn`
  - `POST /payments/momo/ipn`
  - `GET /payments/momo/return`
- MoMo QR:
  - `POST /payments/momo-qr/create`
  - `POST /payments/momo-qr/{payment_id}/confirm`
- Order payments:
  - `GET /payments/orders/{order_id}`

#### Reports and analytics
- `GET /reports/sales`
- `GET /analytics/best-sellers`

#### Alerts
- `GET /alerts`
- `GET /alerts/summary`
- `POST /alerts/generate`
- `PATCH /alerts/{alert_id}`
- `DELETE /alerts/{alert_id}`
- `DELETE /alerts/resolved/clear`

#### Gift boxes
- Admin:
  - `GET /admin/gift-boxes`
  - `POST /admin/gift-boxes`
  - `GET /admin/gift-boxes/{id}`
  - `PUT /admin/gift-boxes/{id}`
  - `DELETE /admin/gift-boxes/{id}`
  - BOM CRUD under `/admin/gift-boxes/{id}/bom`
- Public:
  - `GET /gift-boxes`
  - `GET /gift-boxes/{id}`
  - `GET /gift-boxes/{id}/bom`

#### Lookup / scan
- `GET /lookup/scan`

#### Leafie AI proxy
- `POST /leafie/ask`
  - Request: message, context, conversation history, optional session ID.
  - Response: proxied n8n output.

### Request / response shape notes
- Many responses are directly ORM-to-dict serializations through explicit response models in routers.
- Order responses include:
  - order header fields
  - `items`
  - `vouchers`
- Payment responses include joined order code and total.
- JSONB fields are validated through helper schema functions rather than deeply nested routers everywhere.

### Unfinished or broken endpoint integrations
- Frontend preorder notes update expects `PATCH /orders/{id}` but backend does not expose that endpoint.
- Frontend vouchers do not use a real standalone backend validation endpoint.
- Frontend admin categories do not map to a dedicated category API because no such backend module exists.
- Frontend admin alert service is currently incompatible with the API client implementation.

### Integration dependencies
- Root `.env` is required for backend DB and payment configuration.
- `N8N_WEBHOOK_URL` is required for Leafie proxy to work.
- MoMo Business endpoints require partner credentials.
- MoMo QR flows require QR account configuration or image asset.

---

## 6. Current Working Features

### Working based on code inspection and recent targeted verification
- Backend app startup structure is complete.
- Root `.env` loading for `DATABASE_URL` is now deterministic in `app/db.py`.
- Authentication flow is implemented end-to-end.
- Product, variant, supplier, and batch CRUD paths are real backend functionality.
- Order creation uses FEFO allocation through `app/services/fefo.py`.
- Order cancellation now restores product-lot stock before commit.
- Payment creation and payment status flows are implemented.
- Customer storefront routes, cart persistence, checkout, and order history wiring exist.
- Contact page now honestly avoids pretending the contact form is live.
- User profile editing and avatar upload are wired to real backend endpoints.

### Verified maintenance artifacts
- `scripts/seed_order_test_data.py` exists to seed a minimal order-flow test dataset.
- `python -m compileall app\\services\\orders app\\routers\\orders.py` has been run successfully during the recent orders work.

### Working but operationally conditional
- Leafie works only if n8n webhook config is present and healthy.
- MoMo Business flow works only with valid credentials.
- MoMo QR flow is viable for local/demo with manual confirmation.
- Gift-box pages work best when backend endpoints are available; a frontend static fallback may mask backend outages.

---

## 7. Current Bugs / Blockers

### Known issues

#### 1. Encoding corruption / mojibake across source files
- Present in multiple Python and TypeScript files, comments, and message strings.
- Risk:
  - unprofessional UI/API messages
  - harder maintenance
  - higher chance of incorrect future edits
- Likely root cause:
  - file encoding mismatch during prior editing on Windows

#### 2. Admin alerts frontend service is broken
- File: `frontend/src/services/admin/alertService.ts`
- Problems:
  - imports default `api` from `../api`, but `api.ts` exports `apiClient`
  - expects Axios-style `response.data`, but `apiClient` returns parsed JSON directly
- Impact:
  - admin alerts page and dashboard alert widgets are at high risk of runtime/build failure

#### 3. Pre-order notes update flow targets a missing backend endpoint
- File: `frontend/src/services/admin/preOrderService.ts`
- Problem:
  - calls `PATCH /orders/{id}` for note updates
  - backend only exposes `/orders`, `/orders/{id}`, `/orders/{id}/status`, `/orders/{id}/cancel`, `DELETE /orders/{id}`
- Impact:
  - visible admin functionality appears real but is not actually supported

#### 4. Voucher behavior has a likely enum mismatch bug
- File: `app/services/orders/voucher_service.py`
- Problem:
  - model enum values are `phantram` / `sotien`
  - service logic checks for `phan_tram`
- Impact:
  - percentage voucher computation may be wrong or unreachable depending on DB values

#### 5. Report service is only partially real
- Backend only exposes `/reports/sales`.
- Frontend `reportService` intentionally returns empty arrays for several breakdowns.
- Impact:
  - dashboard/reporting UI can look broader than backend support actually is

#### 6. Gift-box fallback can hide backend failures
- File: `frontend/src/services/giftBoxService.ts`
- Impact:
  - static fallback improves demo resilience but reduces observability and can mislead debugging

#### 7. Password change remains unimplemented backend-side
- Frontend has been made more honest, but the capability is still absent.

#### 8. Config loading is still somewhat duplicated
- `app/db.py` loads root `.env` explicitly.
- `app/core/config.py` still uses plain `load_dotenv()`.
- `app/routers/leafie.py` performs its own fallback `load_dotenv()`.
- Impact:
  - more than one source of truth for environment-loading behavior

#### 9. Development fallback secret remains in backend config
- File: `app/core/config.py`
- It is explicitly dev-only, but still a production-readiness risk if deployment hygiene is weak.

#### 10. Limited automated verification
- No meaningful automated backend or frontend test suite was found.
- Most confidence comes from code inspection, compile checks, and manual flows.

### Debugging attempts already made
- Portfolio-cleanup pass removed unsafe logs, secret-adjacent logs, and local ingest/telemetry patterns.
- Frontend mock-only and misleading flows were cleaned to make demo boundaries more honest.
- Config safety pass centralized frontend runtime URLs and stabilized backend DB env loading.
- Orders vertical-slice refactor moved router business logic into `app/services/orders/`.
- High-risk cancellation inventory bug was fixed so cancellation restores stock in the same transaction.
- A minimal seed script was added for order flow testing.

### Suspected root causes for current fragility
- Incremental feature growth without a consistent service-layer pattern.
- Mixed real/demo requirements inside the same UI surfaces.
- Lack of automated regression tests.
- Encoding/locale handling inconsistency.
- Shared API client contract drift across frontend service modules.

---

## 8. Frontend State

### Completed pages and components
- Customer pages:
  - home
  - product detail
  - category listing
  - search
  - gift-box list/detail
  - cart
  - checkout
  - login/register
  - profile
  - orders list/detail
  - payment QR
  - order success
  - policies
  - contact
- Admin pages:
  - dashboard
  - products
  - gift boxes
  - gift-box BOM
  - sales list/detail
  - inventory
  - batches
  - alerts
  - vouchers
  - preorders list/detail

### Routing structure
- Public storefront routes are mounted under `MainLayout`.
- Protected customer routes use `ProtectedRoute`.
- Admin routes use `AdminProtectedRoute` and `AdminLayout`.
- Route declarations live centrally in `frontend/src/App.tsx`.

### UI system
- Brand styling uses CSS custom properties plus Tailwind theme extension.
- There is a cohesive custom component layer for cards, buttons, inputs, modals, toasts, and section shells.
- The visual theme is bakery/holiday-oriented and is suitable for portfolio presentation.

### Responsive status
- The app is clearly designed for browser-based responsive use.
- Components use Tailwind and MUI patterns that generally support responsive layouts.
- Full device-by-device QA was not performed in this review.

### Unfinished or honesty-gated UI flows
- Contact page intentionally does not submit to backend and instead shows contact details.
- Password change is not backend-supported and is treated as unavailable/not implemented.
- Voucher admin and customer voucher validation are demo-only unless env flags explicitly enable them.
- Category management is demo-only when enabled.
- Some report widgets intentionally render empty datasets because the backend does not expose those breakdowns.

### Major frontend bugs / weak points
- `frontend/src/services/admin/alertService.ts` is a concrete integration bug.
- `frontend/src/services/admin/preOrderService.ts` includes a broken notes update path.
- `frontend/src/services/productService.ts` uses a placeholder best-sellers strategy instead of the real analytics endpoint.
- `frontend/src/services/giftBoxService.ts` static fallback may hide failures.
- The frontend build may still have unrelated TypeScript/admin issues outside the recent cleanup scope.

---

## 9. Backend State

### Completed services and routers
- Auth
- Users
- Products and variants
- Suppliers
- Components read APIs
- Batches and inventory
- Orders
- Payments
- Reports
- Analytics
- Gift boxes
- Lookup/scan
- Alerts
- Leafie proxy

### Business logic implemented
- FEFO inventory allocation on order creation.
- Voucher lookup and application during order creation.
- Payment completion updates order state when paid amount covers required amount.
- Inventory lot creation auto-creates stock rows in batch workflows.
- Order cancellation now restores product-lot inventory before commit.

### Validation
- Pydantic request models are defined inside routers for many endpoints.
- JSONB payloads use validation helpers from `app/schemas.py`.
- Security and role validation are handled in dependencies.

### Middleware
- `LoggingMiddleware` logs request/response metadata while skipping docs/health noise.
- `SecurityMiddleware` adds basic HTTP security headers.

### Security / auth
- JWT access/refresh model is in place.
- Password hashing uses bcrypt.
- Role checks use `require_role(...)`.
- CORS configuration is environment-driven.
- Some hardcoded dev-friendly config remains and should stay explicitly non-production.

### Async / background jobs
- No formal background job system is present.
- Leafie proxy uses async HTTPX but is request/response synchronous from the app perspective.
- Alert generation is done on demand through API endpoint, not scheduled job infrastructure.

---

## 10. Development Conventions

### Naming conventions
- Domain model names are Vietnamese transliterations:
  - `NguoiDung`, `DonHang`, `PhieuGiamGia`, `LoHangSanPham`
- API/router/module names are lower-case English file names:
  - `orders.py`, `payments.py`, `products.py`
- Frontend TypeScript uses English file/module names but often preserves Vietnamese API field names.

### Code style
- Backend is mostly procedural FastAPI code with local Pydantic models defined in routers.
- Frontend uses function components and service wrappers.
- Responses and DTOs frequently mirror DB/API field names directly.
- The codebase mixes English identifiers with Vietnamese business fields.

### Architecture philosophy currently emerging
- Keep API contracts stable.
- Prefer incremental service extraction rather than broad refactors.
- Preserve business logic behavior and status codes while moving code behind thinner routers.
- Prefer honest demo-only boundaries over fake production behavior.

### Patterns used
- Backend:
  - dependency injection via FastAPI `Depends`
  - ORM-centric data access
  - transaction logic inline in routers or service methods
- Frontend:
  - context providers for app-wide state
  - service modules for API calls
  - route-based page composition
  - local storage for auth/cart/demo features

### Important assumptions
- PostgreSQL schema and enums already exist and match ORM definitions.
- Root `.env` contains a valid `DATABASE_URL`.
- Vietnamese enum/string values are treated as contract-sensitive.
- Gift-box order creation expands to product-lot detail lines sufficient for stock restoration.

---

## 11. Environment & Setup

### Required backend environment variables
- `DATABASE_URL`
- `SECRET_KEY`
- `ALGORITHM`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `REFRESH_TOKEN_EXPIRE_DAYS`
- `FRONTEND_BASE_URL`
- `BACKEND_BASE_URL`
- `CORS_ORIGINS`
- `N8N_WEBHOOK_URL` for Leafie
- MoMo Business:
  - `MOMO_PARTNER_CODE`
  - `MOMO_ACCESS_KEY`
  - `MOMO_SECRET_KEY`
  - `MOMO_PAYMENT_URL`
  - `MOMO_REQUEST_TYPE`
  - `MOMO_LANG`
- MoMo QR:
  - `MOMO_QR_PHONE`
  - `MOMO_QR_ACCOUNT_NAME`
  - optional `MOMO_QR_IMAGE_PATH`
- VNPay placeholders also exist in config/docs:
  - `VNPAY_TMN_CODE`
  - `VNPAY_HASH_SECRET`
  - `VNPAY_PAYMENT_URL`
  - `VNPAY_VERSION`
  - `VNPAY_COMMAND`
  - `VNPAY_LOCALE`
  - `VNPAY_CURR_CODE`
  - `VNPAY_ORDER_TYPE`

### Required frontend environment variables
- `VITE_API_BASE_URL`
- `VITE_LEAFIE_BACKEND_URL` or allow derived default to backend `/leafie/ask`
- `VITE_ENABLE_DEMO_VOUCHERS` only if demo voucher UI should be enabled
- `VITE_ENABLE_DEMO_CATEGORY_MANAGEMENT` only if demo category local writes should be enabled
- Legacy example file also references `VITE_N8N_WEBHOOK_URL`, but the current architecture prefers the backend Leafie proxy.

### Local setup steps
1. Create root `.env`.
2. Install Python dependencies:
   - `pip install -r requirements.txt`
3. Start local database and Adminer if needed:
   - `docker compose up -d`
4. Start backend:
   - `python -m uvicorn app.main:app --reload --port 8000`
5. Frontend setup:
   - `cd frontend`
   - `npm install`
   - `npm run dev`

### Helpful project scripts
- `start-backend.bat`
- `frontend/start-frontend.bat`
- `start-all.bat`
- `scripts/seed_gift_boxes.py`
- `scripts/seed_order_test_data.py`
- `scripts/check_inventory.py`

### Build commands
- Frontend:
  - `cd frontend`
  - `npm run build`
- Backend:
  - no dedicated build step beyond Python runtime / import / compile checks

### Deployment steps currently implied
- There is no full production deployment pipeline in the repo.
- A future deployment would need:
  - managed Postgres
  - secure secrets injection
  - ASGI process manager / containerization
  - frontend static hosting
  - production CORS and payment callback URLs

---

## 12. Dependencies & Risks

### Fragile areas
- Orders logic is partly modernized while other domains remain router-heavy.
- Frontend service quality is inconsistent across modules.
- Multiple features rely on exact enum values and Vietnamese string contracts.
- Source encoding corruption increases maintenance risk.

### Tightly coupled modules
- Order processing depends directly on ORM structure, FEFO service, voucher logic, and payment side effects.
- Frontend admin dashboards couple together reports and alerts, so one broken service can damage the whole page.
- Leafie frontend/backed behavior depends on external n8n workflow design not stored in repo.

### Scalability concerns
- No repository-wide service abstraction standard yet.
- No background jobs for alert generation, payment reconciliation, or analytics aggregation.
- Minimal separation between CRUD APIs and domain orchestration in many routers.
- Audit/logging model exists but operational observability is not deeply integrated.

### Missing abstractions
- No central settings/config module used consistently across all backend modules.
- No API schema package split by domain; many schemas are inline in routers.
- No shared frontend query/cache layer such as React Query.
- No automated test harness for high-value workflows.

### Security concerns
- Dev fallback secret still exists.
- Some modules still duplicate env loading.
- Logging middleware is safer than before but should still be reviewed before production.
- Payment callbacks and external URLs depend on correct environment setup.

---

## 13. Next Recommended Priorities

### Immediate fixes
1. Fix `frontend/src/services/admin/alertService.ts` to match `apiClient` contract.
2. Fix or disable preorder notes update flow that points to missing backend endpoint.
3. Fix voucher enum mismatch in `app/services/orders/voucher_service.py`.
4. Normalize file encodings in backend and frontend source files.
5. Run targeted manual verification for:
   - order creation
   - cancellation stock restoration
   - voucher application
   - admin alerts page

### Medium-term improvements
1. Continue service-layer extraction in high-complexity routers after orders.
2. Replace demo-only voucher/category flows with either real APIs or clearly admin-hidden surfaces.
3. Add minimal automated regression tests for auth, orders, FEFO, and payments.
4. Consolidate backend environment loading into a single settings path.
5. Align frontend best-seller/reporting views to real analytics endpoints only.

### Long-term architecture goals
1. Introduce migration tooling such as Alembic.
2. Split `app/models.py` into domain modules.
3. Introduce background job processing for alerts, analytics, and payment reconciliation.
4. Add structured observability, error tracking, and deployment automation.
5. Formalize API versioning and schema ownership.

---

## 14. AI Collaboration Context

### How the project has been developed with AI assistance
- The recent project evolution has been strongly AI-assisted.
- AI work has focused on:
  - repository review from a hiring-manager/portfolio lens
  - cleaning security/debug artifacts
  - removing misleading mocked UX
  - stabilizing config handling
  - rewriting README for portfolio use
  - refactoring the orders vertical slice into a service layer
  - fixing high-risk cancellation inventory restoration
  - generating minimal test seed data

### Recurring design discussions
- Trustworthiness is more important than feature count.
- Demo-only features should be explicit, not disguised as real production flows.
- Backend refactors should be incremental and behavior-preserving.
- Orders/inventory/FEFO correctness is a priority because it demonstrates real operational logic.
- Configuration should be safer and less dependent on scattered localhost defaults.

### Preferred architecture direction
- Thin routers + service layer for complex domains.
- Stable public API contracts while internals are improved.
- Honest separation between real backend features and demo-only frontend fallbacks.
- Centralized config loading and fewer hardcoded local assumptions.

### Coding preferences established during recent work
- Minimal, surgical edits.
- Do not change public field names or API paths unless explicitly required.
- Do not invent backend behavior where it does not exist.
- Preserve request/response schemas and status codes.
- Prefer compile-safe and behavior-safe changes over broad cleanup.

### Important rejected approaches
- Do not paper over missing backend features with fake frontend success flows.
- Do not do a full repository rewrite just to improve architecture.
- Do not refactor DB models or business logic when the task is only cleanup/safety.
- Do not keep hidden localhost telemetry or unsafe token preview logging.

---

## 15. Critical Context Preservation

### Facts a new AI assistant must know immediately
- `app/db.py` was intentionally changed to load the root `.env` deterministically using `Path(__file__).resolve()`. Do not casually revert this.
- The orders module was recently refactored:
  - router remains at `app/routers/orders.py`
  - business logic moved into `app/services/orders/`
- The order cancellation bug was fixed by restoring `TonKhoSanPham` quantities from `ChiTietDonHang` before commit.
- The project contains a mix of real backend features and demo-only frontend surfaces; this distinction is central to repository credibility.
- Voucher logic is split:
  - backend supports voucher application during order creation
  - frontend admin/customer voucher management is still demo-only unless env flags explicitly enable it
- Category management is not backed by a real category API.
- Gift-box UI may appear more resilient than backend reality because of static fallback data.
- `frontend/src/services/admin/alertService.ts` is currently a concrete integration defect and should be treated as a priority blocker.
- No strong automated tests exist; future changes should be verified with targeted manual flows and small compile/build checks.

### Recommended verification flows for future contributors
1. Login/register flow.
2. Product + variant CRUD.
3. Product batch creation and stock inspection.
4. Order creation using `scripts/seed_order_test_data.py`.
5. Order cancellation and stock restoration check in `tonkhosanpham`.
6. Payment creation and payment status transitions.
7. Admin alerts/dashboard rendering after fixing alert service.
8. Leafie proxy with a configured n8n webhook.

### Existing seed/testing aid
- `scripts/seed_order_test_data.py` is the safest starting point for order-flow testing.
- It inserts:
  - a customer role if needed
  - a test customer
  - a product
  - a variant
  - a lot
  - a stock row

### Current honest assessment
- This is a credible portfolio project because it contains real domain depth, especially around FEFO inventory, lot-aware orders, vouchers, and payment integration.
- It is not yet a production-ready system.
- The next AI or engineer should preserve the honesty-first posture: strengthen the real parts, clearly mark or remove incomplete parts, and avoid overselling the repository.
