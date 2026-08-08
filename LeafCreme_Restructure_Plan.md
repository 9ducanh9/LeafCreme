# LeafCreme — Kế hoạch tái cấu trúc (RIPER: SPEC → PLAN)

**Repo:** github.com/9ducanh9/LeafCreme · **Ngày:** 2026-08-06
**Mục tiêu đã chốt với bạn:** production thật cho tiệm bánh + dùng làm sân tập kiến trúc hiện đại · scope backend + DevOps toàn diện · được đổi schema tự do · ưu tiên tất cả (test/CI, kiến trúc layer, security/observability, AI-native).

---

## TL;DR

Giữ **modular monolith**, không microservices/Kafka/K8s — quy mô 1 tiệm bánh không biện minh được chi phí vận hành đó. Việc cần làm theo đúng thứ tự: **(1) test + CI + Alembic migration** (nền móng bắt buộc trước khi đổi bất cứ gì) → **(2) tách layer router/service/domain** → **(3) security & observability** → **(4) async hoá + cổng thanh toán thật (VNPay/MoMo)** → **(5) AI-native: dự báo tồn kho & gợi ý nhập hàng** → **(6) Docker + CI/CD deploy**. Redis/Celery/Kubernetes: **chưa cần**, lý do bên dưới. Tổng cộng ước lượng 6 phase, có thể làm phase 0–2 trước rồi review lại.

---

## 1. Đánh giá hiện trạng

| Hạng mục | Hiện trạng | Rủi ro |
|---|---|---|
| Schema | 30 bảng SQLAlchemy, domain rõ (FEFO batch, orders, payments...) | Quản lý tay ngoài code, không Alembic → không rollback, dễ lệch giữa môi trường |
| Testing | 1 script `test_api.py` thủ công | Không CI, không coverage — sửa code không biết vỡ chỗ nào |
| Kiến trúc | Router gọi thẳng ORM; business logic dồn vào `helpers.py` (770 dòng, ~60 hàm không phân domain) | Khó test, khó mở rộng, khó review |
| Async | 100% sync SQLAlchemy dưới FastAPI async | Nghẽn khi nhiều request I/O đồng thời (thanh toán, webhook) |
| Bảo mật | `SECRET_KEY` có default hardcode, CORS mặc định `*`, không rate-limit, không revoke token | Không an toàn cho production thật |
| Thanh toán | `payments` router chỉ ghi nhận nội bộ + endpoint `verify` dạng callback stub | Chưa nối cổng thanh toán thật (VNPay/MoMo) — thiếu tính năng lõi nếu khách trả tiền online |
| Cảnh báo tồn kho | Có bảng `canhbaotonkho` nhưng không có job nào tự sinh cảnh báo | Tính năng tồn tại trên schema nhưng chưa hoạt động |
| Observability | `prometheus-client` có trong requirements nhưng không wire `/metrics`; logging chưa có correlation ID | Không biết hệ thống đang chạy ra sao khi lên production |
| DevOps | `docker-compose.yml` chỉ chạy Postgres + Adminer, không có Dockerfile cho API | Chưa deploy được nhất quán giữa máy dev và server |

---

## 2. Kiến trúc mục tiêu

### 2.1 Modular monolith — không microservices

**Chọn:** một service FastAPI duy nhất, tổ chức theo domain module.
**Vì sao:** 1 tiệm bánh không có nhiều team độc lập cần deploy riêng, traffic không đủ lớn để cần scale từng phần riêng biệt. Microservices thêm chi phí vận hành (network, tracing phân tán, nhiều pipeline CI/CD) mà không tạo giá trị tương xứng.
**Trade-off chấp nhận:** khi thật sự cần tách (ví dụ module báo cáo/BI cần scale riêng), module hoá rõ ràng ngay từ đầu giúp tách sau này rẻ hơn.

Cấu trúc thư mục đề xuất:

```
app/
  domains/
    catalog/      (sanpham, bienthe, hopqua, congthuc)
    inventory/     (lohang*, tonkho*, lichsukho*, canhbaotonkho, fefo)
    orders/        (donhang, chitietdonhang, giohang, doitra)
    payments/       (thanhtoan, tích hợp VNPay/MoMo)
    identity/       (nguoidung, vaitro, auth)
    reporting/      (thongke, danhgia)
    each domain/: router.py, service.py, schemas.py, models.py
  core/            config (pydantic-settings), security, dependencies, logging, metrics
  infra/           db session, migrations (alembic/), job scheduler
  main.py          chỉ include_router + middleware, không chứa logic
```

**Vì sao tách theo domain thay vì giữ `models.py`/`routers/` phẳng:** ở quy mô 30 bảng, file phẳng đã khó điều hướng; tách theo domain giúp mỗi module tự giải thích (đúng nguyên tắc Explainability trong Leaf Creme guide) và review PR theo domain thay vì theo loại file.

### 2.2 Service layer, bỏ repository layer riêng

**Chọn:** router (mỏng, chỉ validate + gọi service) → service (business logic, transaction boundary) → SQLAlchemy Session trực tiếp.
**Vì sao rejected repository pattern riêng:** SQLAlchemy 2.0 Session đã là abstraction đủ tốt; thêm repository layer chỉ tạo indirection không cần thiết cho một team nhỏ. Test dùng Postgres thật (xem mục 2.4) nên không cần mock repository để unit test.
**helpers.py 770 dòng** → chia theo domain: hàm tính giá/giảm giá vào `orders/service.py`, hàm tồn kho/FEFO vào `inventory/service.py`, hàm format/validate dùng chung (ngày tháng, currency, slugify) giữ ở `core/formatting.py`.

### 2.3 Migrations: Alembic bắt buộc

Đây là việc **ưu tiên số 1**, làm trước mọi thứ khác. Không có migration = không thể deploy an toàn, không rollback được khi lỗi. Baseline từ schema hiện tại rồi mọi thay đổi sau đi qua migration file có review.

Vì được phép đổi schema tự do, tận dụng luôn để sửa các điểm yếu:
- Thêm index trên `lohang*.ngay_het_han`, `tonkho*.so_luong_hien_tai` (FEFO query hiện quét theo ngày hết hạn không có index — chậm dần khi data lớn).
- Đổi cột `datetime` sang `timestamptz` (hiện tại naive datetime — rủi ro khi có nhiều timezone hoặc deploy multi-region sau này).
- Thêm bảng `revoked_tokens` (id, jti, expires_at) để hỗ trợ logout/revoke JWT — xem mục 2.5.

**Cân nhắc đã loại:** hợp nhất 3 bộ bảng lô hàng/tồn kho song song (SanPham/LinhKien/HopQua) thành 1 bảng polymorphic dùng `item_type` discriminator. **Quyết định: giữ nguyên tách riêng.** Lý do: mỗi loại có business rule khác nhau (BOM chỉ áp dụng LinhKien, FEFO chỉ áp dụng SanPham/HopQua), gộp lại sẽ cần nhiều cột nullable + logic rẽ nhánh runtime — vi phạm nguyên tắc "tránh tối ưu sớm" và làm code khó đọc hơn để đổi lấy DRY không thực sự cần thiết ở quy mô này.

### 2.4 Testing & CI/CD

- `pytest` + `pytest-asyncio` + `httpx.AsyncClient`, chạy trên **Postgres thật** (qua `docker-compose` service hoặc testcontainers) — không dùng SQLite vì code phụ thuộc JSONB/ENUM đặc thù Postgres, SQLite sẽ che giấu bug.
- GitHub Actions: lint (ruff) → type-check (mypy, tối thiểu ở core/service) → test (với Postgres service container) → check Alembic migration không bị thiếu (`alembic check`) → build Docker image.
- Coverage target thực tế: ưu tiên bao phủ `services/` (business logic) trước, không ép 100%.

### 2.5 Bảo mật (bắt buộc cho production thật)

| Vấn đề hiện tại | Đề xuất |
|---|---|
| `SECRET_KEY` có default hardcode | `pydantic-settings`, fail-fast nếu thiếu env — không bao giờ chạy với secret mặc định |
| CORS `*` mặc định | Whitelist domain thật (storefront + admin) qua env, không dùng `*` khi có credentials |
| Không revoke được JWT khi logout | Bảng `revoked_tokens` (Postgres, không cần Redis) — check khi decode token, dọn định kỳ token hết hạn |
| Không rate-limit | `slowapi` (in-memory, single-instance) trên `/auth/*` và `/payments/*` — đủ cho 1 instance; nếu sau này scale ngang nhiều instance mới cần Redis-backed limiter |
| RBAC chỉ check tên role dạng string | Giữ bảng `vaitro` (đã có JSONB quyền_xem/thêm/sửa/xoá) nhưng enforce theo resource thực tế thay vì chỉ so tên role |

**Vì sao chưa dùng Redis:** cả revoke-token và rate-limit đều giải quyết được trong phạm vi 1 Postgres + 1 instance. Thêm Redis bây giờ là thêm 1 stateful service phải vận hành/backup/monitor mà chưa có nhu cầu thật — đúng cảnh báo "không dùng Redis nếu không có lý do rõ ràng" trong guide của bạn. Sẽ revisit khi thật sự scale ngang.

### 2.6 Observability

- Structured JSON logging (mở rộng `services/logging.py` hiện có) + middleware gắn `request_id`/`correlation_id` xuyên suốt 1 request.
- Wire `prometheus-client` đã có sẵn trong requirements → expose `/metrics` thật (request count, latency, error rate theo route).
- Sentry (free tier đủ dùng cho quy mô này) để bắt exception production — rẻ, giá trị cao, không cần tự vận hành ELK/Grafana stack ngay từ đầu.
- Healthcheck `/health` và `/health/db` đã có — giữ nguyên, tách thêm readiness vs liveness khi containerize.

### 2.7 Async hoá

Chuyển `sqlalchemy` sang async engine (`asyncpg`), router `async def`, service layer async. **Vì sao cần:** thanh toán thật (webhook cổng thanh toán), gửi email/notification là I/O-bound — sync blocking dưới FastAPI hiện tại giới hạn throughput theo số thread pool worker. **Trade-off:** cần rewrite toàn bộ router/service — nên làm sau khi đã có test suite (mục 2.4) để refactor an toàn, không phải làm ngay từ đầu.

### 2.8 Thanh toán thật

Router `payments` hiện chỉ ghi nhận nội bộ. Production thật cho tiệm bánh cần nối **VNPay hoặc MoMo** (2 cổng phổ biến nhất VN cho SME) — đây là tính năng lõi tạo giá trị kinh doanh thật (khách trả được tiền online), không phải "nice to have".

### 2.9 Scheduled jobs (cảnh báo tồn kho, hết hạn)

Bảng `canhbaotonkho` đã tồn tại nhưng không ai populate. Đề xuất: **APScheduler chạy in-process** (job nightly quét `ngay_het_han` sắp tới + tồn kho thấp → insert cảnh báo), **không dùng Celery+broker**. Vì sao: khối lượng job thấp (vài lần/ngày, 1 tiệm bánh), Celery cần thêm Redis/RabbitMQ — chi phí vận hành không tương xứng lợi ích ở quy mô này.

### 2.10 AI-native — có giá trị thật, không phải AI-washing

Loại bỏ ngay ý tưởng "thêm chatbot cho có" — không giải quyết pain point cụ thể nào ở đây. Hai tính năng AI thật sự đáng làm, bám vào dữ liệu FEFO/order đã có sẵn:

1. **Dự báo hết hàng & gợi ý nhập hàng** — kết hợp tốc độ bán (từ `chitietdonhang`) + tồn kho theo lô (FEFO) để dự đoán ngày hết hàng từng biến thể, tự sinh gợi ý số lượng cần nhập cho nhà cung cấp. Giá trị: giảm thời gian nhân viên tự theo dõi Excel, giảm thất thoát do hết hạn (bánh là hàng dễ hỏng — đây là ROI đo được trực tiếp).
2. **Dự báo nhu cầu sản xuất theo sản phẩm** — time-series đơn giản (moving average / Prophet, không cần hạ tầng ML nặng) trên lịch sử đơn hàng để hỗ trợ quyết định "hôm nay nướng bao nhiêu" — hỗ trợ ra quyết định đúng nguyên tắc AI-Native.

Cả hai chạy như 1 job định kỳ (dùng chung APScheduler ở mục 2.9) ghi kết quả vào bảng mới `goi_y_nhap_hang` — không cần thêm service/vector DB/LLM nào, vẫn đúng tinh thần "AI-native không phải AI-washed": vấn đề kinh doanh thật, giải pháp đơn giản nhất giải quyết đúng vấn đề.

### 2.11 DevOps / triển khai

- **Dockerfile multi-stage** cho API (hiện chưa có — chỉ Postgres được container hoá).
- **CI/CD:** GitHub Actions build → push image → deploy.
- **Hosting:** với ngân sách 1 tiệm bánh, **không Kubernetes**. Đề xuất Fly.io / Render / một VPS nhỏ chạy Docker Compose (API + Postgres managed hoặc self-host) — đủ tin cậy, chi phí thấp, vận hành đơn giản. IaC ở mức này = docker-compose + 1 file cấu hình deploy (Fly `fly.toml` hoặc Render `render.yaml`) là đủ, không cần Terraform cho một service duy nhất.

---

## 3. Lộ trình theo phase

| Phase | Nội dung | Vì sao ở vị trí này |
|---|---|---|
| **0. Nền móng** | Alembic baseline, pytest + Postgres CI, Dockerfile cho API | Bắt buộc trước — không có cái này thì mọi refactor sau đều rủi ro không kiểm chứng được |
| **1. Kiến trúc** | Tách `domains/`, chuyển `helpers.py` vào service theo domain | Cần làm trước khi thêm tính năng mới, tránh nợ kỹ thuật chồng thêm |
| **2. Bảo mật & Observability** | pydantic-settings, revoked_tokens, rate-limit, `/metrics`, Sentry, structured logging | Bắt buộc trước khi có traffic thật/thanh toán thật |
| **3. Async + Thanh toán thật** | asyncpg, tích hợp VNPay/MoMo | Tính năng lõi kinh doanh — cần nền tảng ổn định từ phase 0–2 trước |
| **4. Scheduled jobs + AI-native** | APScheduler, cảnh báo tồn kho tự động, dự báo hết hàng/nhu cầu | Phụ thuộc dữ liệu order/inventory đã chạy ổn định qua các phase trước |
| **5. Deploy production** | Docker Compose/Fly.io, CI/CD deploy pipeline, healthcheck/monitoring dashboard | Chốt hạ sau khi mọi thứ đã kiểm chứng |

Đề xuất: duyệt lại kế hoạch sau mỗi phase (đúng tinh thần RIPER — VALIDATE trước khi qua phase kế) thay vì cam kết toàn bộ 6 phase cùng lúc.

---

## 4. Việc không làm (và vì sao)

| Từ chối | Lý do |
|---|---|
| Microservices | Không có nhiều team/traffic đủ lớn để biện minh chi phí vận hành phân tán |
| Kubernetes | 1 service, traffic nhỏ — Docker Compose/PaaS đơn giản hơn nhiều mà vẫn đạt mục tiêu |
| Redis (ngay bây giờ) | Revoke token + rate-limit giải quyết được bằng Postgres + in-memory ở quy mô 1 instance |
| Celery + broker | Khối lượng job thấp, APScheduler in-process đủ dùng |
| Kafka/ClickHouse | Không có nhu cầu event-streaming hay OLAP quy mô lớn |
| Chatbot AI chung chung | Không giải quyết pain point cụ thể — vi phạm nguyên tắc AI-native |
| Repository pattern riêng | SQLAlchemy Session đã đủ abstraction, thêm layer chỉ tăng indirection |

---

## 5. Câu hỏi cần bạn xác nhận trước khi EXECUTE

1. Đã có data thật trong DB hiện tại chưa, hay có thể baseline Alembic từ schema hiện tại mà không cần migrate data cũ?
2. Chọn cổng thanh toán nào trước: VNPay hay MoMo (ảnh hưởng phase 3)?
3. Hosting mục tiêu: bạn đã có VPS/tài khoản cloud nào sẵn, hay cần đề xuất cụ thể (Fly.io/Render/VPS)?
4. Bắt đầu ngay từ Phase 0 (test + CI + Alembic), hay muốn tôi detail hoá task-level cho Phase 0–1 trước để duyệt?

---

## Addendum (2026-08-07): base branch corrected

Phase 0 was originally built against `main` (`fb55fde`), which turned out to
be a stripped-down "portfolio" snapshot with an unrelated git history from
the real working branch `UpdateT5` (`91c5d6e`) — the actual current state of
the project, with the event system, split order/inventory/voucher services,
MoMo/VNPay config, and the Leafie/n8n assistant already built.

Per your direction, `UpdateT5` is now adopted as the canonical base (commit
`0856aa6`, "Merge UpdateT5 into main as canonical baseline" — see commit
message for the reasoning on why this was a tree-adoption rather than a real
`git merge --allow-unrelated-histories`). Phase 0 (`8b80acc`) is rebuilt on
top of that, matching the real 32-table schema instead of the stale 30-table
one this doc was originally written against.

Two things worth flagging that weren't visible when this plan was first
written:

- **MoMo payment integration already exists** (`app/services/momo.py`,
  `momo_qr.py`) — Phase 3 ("thanh toán thật") in the roadmap above is
  further along than assumed. VNPay config exists too but no VNPay service
  file yet — worth confirming whether VNPay is still wanted or MoMo alone is
  sufficient.
- **Leafie (n8n-backed chat assistant) already exists** — this sits somewhat
  against this doc's "reject generic chatbot" stance in section 2.10. Not a
  contradiction to fix retroactively; just worth an honest look later at
  whether Leafie is solving a real pain point in practice or is a nice-to-have,
  now that it's shipped rather than hypothetical.

The rest of the roadmap (sections 2–4) still holds — architecture layering,
security/observability, async, and AI-native inventory forecasting are still
not done and still sequenced the same way.
