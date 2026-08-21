# Spec 09 — P0/P1 Remediation (Authorization · Catalog Integrity · Test Safety)

Status: DRAFT — chờ chốt trước khi mở PR đầu tiên.
Phạm vi: 7 workstream tương ứng 3 finding P0 và 4 finding P1 từ đợt audit gần nhất.
Không thuộc phạm vi: toàn bộ P2 (xem §11).
Code liên quan: `tests/conftest.py`, `app/core/dependencies.py`, `app/routers/{orders,payments,alerts,batches,auth}.py`, `app/services/orders/order_service.py`, `app/services/payments/payment_service.py`, `frontend/src/services/admin/productService.ts`, `frontend/src/components/admin/products/ProductForm.tsx`, `frontend/src/types/admin.ts`, `frontend/src/components/admin/routing/AdminProtectedRoute.tsx`, `frontend/src/config/admin-nav.ts`.
Spec nền liên quan: `docs/specs/01-auth-access-control.md` (RBAC), `02-orders.md`, `03-payments.md`, `04-inventory.md`, `05-products-giftboxes.md`, `07-frontend-uiux.md`.

---

## 0. Tóm tắt & thứ tự ưu tiên

| WS | Vấn đề | Mức | Điểm sửa chính | PR |
|----|--------|-----|----------------|----|
| WS-1 | pytest có thể `downgrade → base` trên database thật | P0 | `tests/conftest.py`, `.github/workflows/ci.yml` | PR1 |
| WS-2 | Khách thường tạo được đơn POS đã `hoan_thanh`, trừ tồn kho thật | P0 | `order_service.create_order`, `routers/orders.py` | PR2 |
| WS-3 | Khách thường tự ghi nhận thanh toán `tien_mat` → tự hoàn thành đơn | P0 | `payment_service.create_payment`, `routers/payments.py` | PR2 |
| WS-6 | API kho/cảnh báo mở cho mọi tài khoản active | P1 | `routers/batches.py`, `routers/alerts.py` | PR3 |
| WS-7 | Quyền staff lệch giữa UI và backend | P1 | `capabilities` (BE+FE), `AdminProtectedRoute`, `admin-nav` | PR4 |
| WS-5 | ID sản phẩm và ID biến thể bị trộn | P1 | `types/admin.ts`, `productService.ts` | PR5 |
| WS-4 | Form sản phẩm ghi hỏng `kich_thuoc` và `huong_vi` | P1 | `ProductForm.tsx`, `productService.ts` | PR6 |

Ba WS đầu là điều kiện cần để hệ thống được coi là an toàn cho môi trường thật. WS-4 xếp cuối vì phụ thuộc WS-5 (cùng đổi type `ProductVariant`) và cần snapshot dữ liệu trước khi chạm vào.

---

## 1. Nguyên tắc chung áp dụng cho cả 7 WS

1. **Enforcement nằm ở service layer, không chỉ ở router.** Agent tools (`app/services/agent/tools.py`) gọi thẳng `_order_service` / `_payment_service`, bỏ qua dependency của FastAPI. Guard chỉ đặt ở `Depends(require_role(...))` sẽ bị đường Agent đi vòng qua. Router vẫn giữ `require_role` để trả 403 sớm và để OpenAPI mô tả đúng.
2. **Frontend guard là UX, không phải bảo mật.** Mọi thay đổi ở FE trong spec này chỉ nhằm không hiển thị thứ người dùng không dùng được; backend vẫn phải từ chối độc lập.
3. **Một nguồn sự thật cho ma trận quyền.** Kết thúc WS-7, danh sách vai trò được phép của mỗi endpoint phải suy ra được từ một nơi duy nhất, và có test khoá lại.
4. **Không đổi schema DB trong spec này.** Không có migration mới. WS-4 sửa đường ghi phía client, không đổi kiểu cột.
5. **Vai trò hệ thống là flat, 4 cấp**: `admin > manager > staff > customer`, không kế thừa (theo `docs/specs/01`). `customer` là vai trò mặc định khi tự đăng ký (`auth_service._SELF_REGISTER_ROLE_NAME`).

Helper dùng chung, thêm vào `app/core/dependencies.py`:

```python
BACK_OFFICE_ROLES: tuple[str, ...] = ("admin", "manager", "staff")
MANAGEMENT_ROLES: tuple[str, ...] = ("admin", "manager")


def role_name(user: NguoiDung) -> str | None:
    """Nguồn duy nhất cho việc đọc tên vai trò.

    Hiện tại biểu thức `user.vaitro.ten_vai_tro if user.vaitro else None`
    bị lặp ở 7 chỗ (order_service ×4, payment_service, agent_service,
    dependencies) — mỗi bản sao là một chỗ có thể quên sửa.
    """
    return user.vaitro.ten_vai_tro if user.vaitro else None
```

---

## WS-1 — Chặn test suite phá database thật (P0)

### Hiện trạng

`tests/conftest.py:24`:

```python
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")
```

`tests/conftest.py:46`, trong fixture `_migrated_schema` (scope session, autouse):

```python
command.upgrade(cfg, "head")
yield
command.downgrade(cfg, "base")
```

### Rủi ro cụ thể

Máy dev thường chỉ có `DATABASE_URL` trong `.env`, trỏ tới database đang dùng. Chỉ cần gõ `pytest` trong shell đã export biến đó là suite chạy migration lên database thật rồi **`downgrade base`** — drop toàn bộ bảng — ở bước teardown. Không có xác nhận, không có dry-run, và teardown vẫn chạy kể cả khi test fail.

Rủi ro phụ, âm thầm hơn: khi không có biến nào được set, fixture gọi `pytest.skip(...)`. Toàn bộ suite bị skip nhưng exit code là 0 — một pipeline cấu hình sai vẫn xanh trong khi không chạy dòng test nào.

### Thiết kế

Thêm guard chạy **trước** `command.upgrade`, và đổi `skip` thành `exit`:

```python
import re
from sqlalchemy.engine import make_url

_DISPOSABLE_DB = re.compile(r"(^|[_-])test([_-]|$)", re.IGNORECASE)
_PROTECTED_ENVS = {"prod", "production", "staging"}


def _assert_disposable(url: str) -> None:
    app_env = os.getenv("APP_ENV", "").strip().lower()
    if app_env in _PROTECTED_ENVS:
        pytest.exit(f"APP_ENV={app_env!r} — từ chối chạy test suite.", returncode=4)

    db_name = make_url(url).database or ""
    if not _DISPOSABLE_DB.search(db_name):
        pytest.exit(
            f"Từ chối chạy test trên database {db_name!r}: tên database phải chứa "
            "'test' (vd. bakery_test). Suite này chạy `alembic downgrade base` ở "
            "teardown và sẽ xoá toàn bộ schema. Đặt TEST_DATABASE_URL trỏ tới một "
            "database dùng một lần.",
            returncode=4,
        )
```

Trong `_migrated_schema`:

```python
if not TEST_DATABASE_URL:
    pytest.exit(
        "Chưa set TEST_DATABASE_URL/DATABASE_URL — xem .env.example. "
        "Chạy `docker compose up -d db` trước.",
        returncode=4,
    )
_assert_disposable(TEST_DATABASE_URL)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
```

`.github/workflows/ci.yml`: thêm `TEST_DATABASE_URL` tường minh bên cạnh `DATABASE_URL` (giá trị hiện tại `...bakery_test` đã qua guard, nhưng để tường minh thì lần sau đổi tên DB không âm thầm phá guard).

Đã cân nhắc và bỏ: dùng schema riêng thay vì `downgrade base` (đổi kiến trúc test, không tương xứng với vấn đề đang giải); prompt xác nhận tương tác (không chạy được trong CI).

### Acceptance criteria

- `DATABASE_URL=postgresql://.../leafcreme pytest` → dừng ngay, exit code 4, **không** có lệnh alembic nào chạy (assert bằng `caplog` hoặc kiểm tra bảng `alembic_version` không tồn tại).
- Không set biến nào → exit code ≠ 0 (không còn skip-and-pass).
- `APP_ENV=production pytest` → dừng, exit code 4.
- CI hiện tại vẫn xanh, số test chạy không đổi.

### Test

`tests/test_conftest_guard.py` — gọi `_assert_disposable` trực tiếp với các URL mẫu (`.../leafcreme`, `.../bakery_test`, `.../test_bakery`, `.../prod-test-db`) và assert nhánh `pytest.exit`. Không cần chạy pytest lồng nhau.

---

## WS-2 — Khách thường tạo được đơn POS (P0)

### Hiện trạng

`app/routers/orders.py:186`:

```python
@router.post("", response_model=OrderResponse, status_code=201)
def create_order(
    payload: OrderCreate,
    loai_don: str = Query("pos", ...),
    current_user: NguoiDung = Depends(get_current_user),
):
```

`app/services/orders/order_service.py:225` chỉ validate `loai_don` thuộc tập hợp lệ, không kiểm tra vai trò. Với `loai_don="pos"` (mặc định), đơn được tạo với:

- `trang_thai="hoan_thanh"` (dòng 245–247),
- `nguoidung_id=None` (dòng 240),
- `nhan_vien_tao=current_user.nguoidung_id` (dòng 253),
- và `inventory_service.allocate_variant(...)` trừ tồn kho thật + ghi ledger.

### Rủi ro cụ thể

Một tài khoản `customer` bất kỳ gọi `POST /orders` không kèm query param sẽ tạo một đơn đã hoàn thành, trừ tồn kho, ghi ledger, mà **không hề thanh toán**. Vì `nguoidung_id=None`, đơn đó không thuộc về ai: `list_orders` (dòng 91–93) lọc theo `nguoidung_id` với người không phải admin/manager, nên chính khách đó cũng không thấy nó, còn staff cũng không. Kết quả là tồn kho bị bào mòn bởi những đơn "ma" chỉ admin/manager mới nhìn ra, và số dư tồn kho lệch so với thực tế mà không có manh mối.

Đơn `customer` tự đặt cũng bị gán `nhan_vien_tao` — làm hỏng luôn ý nghĩa của trường audit này.

### Thiết kế

**Service (enforcement chính).** Trong `order_service.create_order`, ngay sau bước validate `loai_don`:

```python
_STAFF_ONLY_ORDER_TYPES = ("pos",)

if loai_don in _STAFF_ONLY_ORDER_TYPES and role_name(current_user) not in BACK_OFFICE_ROLES:
    raise DomainError(
        status_code=403,
        detail="Chỉ nhân viên mới được tạo đơn bán tại quầy (POS).",
    )
```

`online` và `dat_truoc` vẫn mở cho mọi tài khoản đã đăng nhập — đó là luồng khách tự đặt, và cả hai đều tạo đơn ở trạng thái chưa hoàn thành (`dang_xu_ly` / `cho_coc`), chưa được coi là đã trả tiền.

**Router (mặc định an toàn).** Đổi query param thành enum, mặc định `online` thay vì `pos`:

```python
class OrderTypeParam(str, Enum):
    pos = "pos"
    online = "online"
    dattruoc = "dattruoc"
    dat_truoc = "dat_truoc"

loai_don: OrderTypeParam = Query(OrderTypeParam.online, description="Loại đơn")
```

Đổi mặc định là an toàn với client hiện tại: `frontend/src/services/orderService.ts:64` luôn gửi `online` từ `CheckoutPage`, và `frontend/src/services/admin/adminOrderService.ts:132` luôn gửi `pos`/`dat_truoc` tường minh từ `ManualOrderForm`. Không có caller nào dựa vào mặc định cũ.

**Sửa kèm `nhan_vien_tao`.** Dòng 253 hiện gán `nhan_vien_tao` theo `loai_don == "pos"`. Sau khi POS chỉ còn staff tạo, biểu thức này đúng về mặt ngữ nghĩa — nhưng nên đổi sang điều kiện tường minh `role_name(current_user) in BACK_OFFICE_ROLES` để nếu sau này có loại đơn back-office khác thì audit vẫn đúng.

### Phát sinh liên quan (ghi nhận, quyết định riêng)

Sau khi khoá POS lại cho staff, staff tạo đơn POS xong sẽ **không thấy đơn đó** trong `GET /orders`, vì `list_orders` chỉ nới cho `admin`/`manager` và đơn POS có `nguoidung_id=None`. Đây là hệ quả trực tiếp, sẽ lộ ra ngay khi WS-2 lên. Hai lựa chọn:

- (a) nới scope của `list_orders`/`get_order` cho `BACK_OFFICE_ROLES` — nhất quán với ma trận WS-7, cần cân nhắc là staff sẽ thấy toàn bộ đơn của mọi khách;
- (b) nới theo `nhan_vien_tao == current_user.nguoidung_id` — hẹp hơn, nhưng staff không tra được đơn do đồng nghiệp lập.

**Khuyến nghị (a)**, và ghi vào ma trận WS-7 dưới capability `orders.read.all`: nhân viên quầy trong một tiệm bánh vốn cần tra đơn của ca trước; giới hạn theo người tạo sẽ tạo ra hàng loạt ca "không tra được đơn" mà không đổi lại được lợi ích bảo mật đáng kể — dữ liệu đơn hàng đã nằm trong tầm nhìn của họ ở POS. Chốt phương án trước khi mở PR2.

### Acceptance criteria

- `customer` `POST /orders?loai_don=pos` → 403; không có `DonHang` mới; không có dòng ledger; `TonKhoSanPham.so_luong_hien_tai` không đổi.
- `staff` `POST /orders?loai_don=pos` → 201, `trang_thai="hoan_thanh"`, tồn kho trừ đúng.
- `customer` `POST /orders?loai_don=online` → 201, `nguoidung_id` = chính họ, `nhan_vien_tao` là `None`.
- `POST /orders` không kèm `loai_don` → tạo đơn `online`, không phải `pos`.

### Test

`tests/test_order_service.py`: thêm `TestCreateOrderAuthorization` với 4 case trên. Case 403 phải assert cả side-effect (đếm `DonHang`, đếm ledger, đọc lại tồn kho) — chứ không chỉ assert status code, vì bug ở đây là bug side-effect.

Điều kiện tiên quyết: **chưa có fixture `role_staff` ở bất kỳ đâu**, và `role_customer`/`role_admin`/`_make_user` đang bị chép lại trong từng file test (`test_order_service.py:42,50,57`, `test_payment_service.py:21,29,36`, `test_maintenance_service.py:28,35`). WS-2, WS-3, WS-6 và WS-7 đều cần một actor `staff`. Gộp các fixture này về `tests/conftest.py` và bổ sung `role_staff`, `role_manager` **trong PR1** — nếu không, ba PR sau sẽ mỗi PR tự chép thêm một bản.

---

## WS-3 — Khách thường tự xác nhận thanh toán tiền mặt (P0)

### Hiện trạng

`app/routers/payments.py:234` — `POST /payments` chỉ cần `get_current_user`.
`app/services/payments/payment_service.py:141` — `create_payment`:

```python
trang_thai="thanh_cong" if phuong_thuc == "tien_mat" else "dang_xu_ly",
ngay_thanh_toan=utc_now() if phuong_thuc == "tien_mat" else None,
...
if payment.trang_thai == "thanh_cong":
    self._maybe_complete_order(order, total_paid + payload.so_tien)
```

`tests/test_payment_service.py:69` (`test_cash_payment_for_full_amount_completes_order`) hiện dùng chính `customer` làm actor và assert đơn chuyển sang `hoan_thanh` — nghĩa là hành vi này đang được test khoá lại như đúng.

### Rủi ro cụ thể

Khách gửi `POST /payments {donhang_id, phuong_thuc: "tien_mat", so_tien: <đúng số còn lại>}` cho đơn của chính mình. `_ensure_order_access` cho qua (họ là chủ đơn), thanh toán được ghi `thanh_cong` ngay lập tức, và `_maybe_complete_order` đẩy đơn sang `hoan_thanh`. Không có tiền nào thực sự đổi tay. `tien_mat` theo định nghĩa là khoản chỉ nhân viên tại quầy mới xác nhận được — nó không có chứng cứ nào ngoài lời khẳng định của người gọi API.

### Thiết kế

`POST /payments` là endpoint **ghi nhận thanh toán thủ công** — một thao tác back-office trọn vẹn. Khoá toàn bộ endpoint thay vì lọc theo `phuong_thuc`: `chuyen_khoan` và `the_tin_dung` cũng tạo bản ghi `dang_xu_ly` mà khách không có lý do gì để tự tạo, và mọi guard theo từng phương thức đều sẽ mục nát khi thêm phương thức mới.

Router:

```python
current_user: NguoiDung = Depends(require_role(*BACK_OFFICE_ROLES)),
```

Service (chặn cả đường Agent):

```python
def create_payment(self, db, payload, current_user):
    if role_name(current_user) not in BACK_OFFICE_ROLES:
        raise DomainError(
            status_code=403,
            detail="Chỉ nhân viên mới được ghi nhận thanh toán thủ công.",
        )
```

**Hệ quả bắt buộc phải xử lý cùng PR:** `_ensure_order_access` (dòng 48) cho qua khi vai trò thuộc `("admin", "manager")` **hoặc** người gọi là chủ đơn. Staff không thoả cả hai với đơn của khách, nên sau khi khoá endpoint, staff sẽ bị 403 ở chính bước tiếp theo. Tham số hoá:

```python
def _ensure_order_access(self, order, current_user, message, allowed_roles=MANAGEMENT_ROLES):
    if self._role(current_user) not in allowed_roles and order.nguoidung_id != current_user.nguoidung_id:
        raise DomainError(status_code=403, detail=message)
```

`create_payment` truyền `allowed_roles=BACK_OFFICE_ROLES`. Các đường đọc (`get_payment`, `get_order_payments`, `list_payments`) cũng chuyển sang `BACK_OFFICE_ROLES` để khớp ma trận WS-7 (staff ở quầy cần tra thanh toán của đơn đang xử lý).

**Đường tự phục vụ của khách không đổi:** `POST /payments/momo/create` và `POST /payments/momo-qr/create` vẫn mở cho `get_current_user`. Cả hai chỉ tạo bản ghi `dang_xu_ly`; chuyển sang `thanh_cong` phải qua webhook có chữ ký HMAC (`handle_momo_ipn`) hoặc qua `POST /payments/momo-qr/{id}/confirm` vốn đã yêu cầu `require_role("admin", "manager", "staff")`. Đây là ranh giới đúng và spec này không đụng vào.

**Test hiện có phải sửa, không phải nới guard cho vừa test.** `test_cash_payment_for_full_amount_completes_order` đổi actor từ `customer` sang `staff`, và thêm `test_customer_cannot_create_manual_payment`.

### Acceptance criteria

- `customer` `POST /payments {phuong_thuc: "tien_mat"}` cho đơn của chính mình → 403; không có `ThanhToan` mới; `order.trang_thai` không đổi.
- `staff` `POST /payments {phuong_thuc: "tien_mat"}` cho đơn của một khách bất kỳ → 201, đơn chuyển `hoan_thanh` khi đủ tiền.
- `customer` vẫn gọi được `POST /payments/momo-qr/create` → 201, `trang_thai="dang_xu_ly"`.
- `customer` gọi `POST /payments/momo-qr/{id}/confirm` → 403 (giữ nguyên hành vi hiện tại, thêm test khoá lại).

---

## WS-6 — API kho và cảnh báo cấp quyền quá rộng (P1)

### Hiện trạng

`app/routers/batches.py` dùng `Depends(get_current_active_user)` — nghĩa là mọi tài khoản active, kể cả `customer` — cho 11 endpoint đọc:

`GET /batches/products`, `/products/{id}`, `/components`, `/components/{id}`, `/gift-boxes`, `/gift-boxes/{id}`, `/expiring`, `/inventory/products`, `/inventory/components`, `/inventory/gift-boxes`, `/by-variant/{bienthe_id}`.

`app/routers/alerts.py`: `GET /alerts` (dòng 91), `GET /alerts/summary` (dòng 106), và `PATCH /alerts/{alert_id}` (dòng 134) — endpoint cuối là **ghi**: `alert_service.update_alert` đặt `trang_thai`, `nguoi_xu_ly = current_user.nguoidung_id`, `ngay_xu_ly`.

`app/routers/suppliers.py`: `GET /suppliers` (dòng 85) và `GET /suppliers/{id}` (dòng 95) dùng `get_current_user` — cùng vấn đề, lộ danh sách nhà cung cấp kèm liên hệ cho mọi tài khoản.

Ghi chú để không sửa nhầm hướng: `get_current_user` và `get_current_active_user` **tương đương** — cả hai đều chặn tài khoản `dang_hoat_dong = False` (`dependencies.py:64`). Vấn đề ở đây thuần tuý là thiếu kiểm tra vai trò, không phải thiếu kiểm tra active. Tiện thể gỡ `get_current_active_user` (alias thừa) trong cùng PR để lần sau không ai phải kiểm tra lại điều này.

### Rủi ro cụ thể

Lộ dữ liệu vận hành: giá nhập theo lô, nhà cung cấp và thông tin liên hệ của họ, số lượng tồn thực, ngày hết hạn từng lô, ngưỡng cảnh báo — toàn bộ đọc được bằng một tài khoản khách tự đăng ký. Nặng hơn là `PATCH /alerts/{id}`: khách có thể đánh dấu cảnh báo hết hạn/tồn thấp là `da_xu_ly` hoặc `bo_qua`, và tên họ bị ghi vào `nguoi_xu_ly` như thể nhân viên đã xử lý. Cảnh báo trong hệ thống này **không tự sinh** (xem `docs/specs/04`, Finding #1) — nó phụ thuộc vào người bấm `POST /alerts/generate`; một cảnh báo bị đóng nhầm sẽ không quay lại, và hàng hết hạn đi thẳng ra quầy.

### Thiết kế

Đổi toàn bộ các endpoint kể trên sang `Depends(require_role(*BACK_OFFICE_ROLES))`.

Đã kiểm chứng không phá storefront: `grep` toàn bộ `frontend/src` ngoài thư mục `admin/` không có lời gọi nào tới `/batches`, `/alerts`, `/inventory`. Trang bán hàng lấy tồn kho qua `GET /products/{id}/availability` — endpoint riêng, dùng `get_optional_user`, chỉ trả về số lượng bán được và ngày hết hạn sớm nhất, không lộ giá nhập hay nhà cung cấp. Endpoint đó giữ nguyên.

`DELETE /alerts/{id}` (admin/manager) và `DELETE /alerts/resolved/clear` (admin) giữ nguyên.

### Acceptance criteria

- `customer` gọi từng endpoint trong danh sách 16 endpoint trên (11 batches + 3 alerts + 2 suppliers) → 403.
- `staff` gọi cùng danh sách → 200.
- Trang sản phẩm ở storefront (chưa đăng nhập và đăng nhập bằng `customer`) vẫn hiện đúng trạng thái còn hàng/hết hàng.

### Test

`tests/test_rbac_matrix.py` (tạo mới, dùng chung với WS-7): duyệt `app.routes`, đối chiếu vai trò được phép của từng route với ma trận khai báo; test fail khi có route mới không được khai báo trong ma trận. Cách này thay cho việc viết tay 16 test 403 và tự động bắt được endpoint thêm sau này.

---

## WS-7 — Quyền staff lệch giữa UI và backend (P1)

### Hiện trạng

`AdminProtectedRoute.tsx:32` cho cả `admin`, `manager`, `staff` vào toàn bộ `/admin/*`:

```ts
const isBackOffice = (roleName && BACK_OFFICE_ROLES.has(roleName)) || user?.vaitro?.vaitro_id === 1
```

`frontend/src/config/admin-nav.ts` hiển thị 11 mục menu như nhau cho mọi vai trò. Nhưng backend chặt hơn ở nhiều chỗ: `GET /reports/sales` yêu cầu `admin`/`manager`; `POST|PUT|DELETE /products` và `/products/variants` yêu cầu `admin`/`manager`; `DELETE /orders` yêu cầu `admin`/`manager`; gift box CRUD yêu cầu `admin`/`manager`.

Kết quả với một tài khoản `staff`: `/admin/dashboard` là màn hình trống (doanh thu 403), nút Sửa/Xoá sản phẩm hiện đầy đủ nhưng bấm vào trả 403, mục Hộp quà mở được nhưng không thao tác được.

Fallback `vaitro_id === 1` là một vấn đề riêng, đã ghi nhận ở `docs/specs/01` Finding #6: nó suy ra quyền admin từ khoá tự tăng. Trên database seed lại theo thứ tự khác, `vaitro_id = 1` có thể là `customer` — và người đó vào được toàn bộ admin shell.

### Thiết kế

**Ma trận capability do backend sở hữu, frontend chỉ tiêu thụ.** Đây là lựa chọn quan trọng của WS này: nếu FE giữ một bản sao ma trận, hai bản sẽ lệch lại đúng như hiện tại. Backend đã có tiền lệ đúng ở `agent_service._APPROVAL_ROLE_TIERS` (`draft` → admin/manager/staff, `execute` → admin/manager) — mở rộng mô hình đó ra toàn hệ thống.

`app/core/capabilities.py` (mới):

```python
CAPABILITIES: dict[str, tuple[str, ...]] = {
    "admin.access":            ("admin", "manager", "staff"),
    "dashboard.read":          ("admin", "manager"),
    "products.read":           ("admin", "manager", "staff"),
    "products.write":          ("admin", "manager"),
    "giftbox.read":            ("admin", "manager", "staff"),
    "giftbox.write":           ("admin", "manager"),
    "giftbox.delete":          ("admin",),
    "bom.write":               ("admin", "manager"),
    "orders.read.all":         ("admin", "manager", "staff"),
    "orders.pos.create":       ("admin", "manager", "staff"),
    "orders.delete":           ("admin", "manager"),
    "payments.read":           ("admin", "manager", "staff"),
    "payments.manual.create":  ("admin", "manager", "staff"),
    "payments.verify":         ("admin", "manager"),
    "inventory.read":          ("admin", "manager", "staff"),
    "batches.write":           ("admin", "manager", "staff"),
    "alerts.read":             ("admin", "manager", "staff"),
    "alerts.update":           ("admin", "manager", "staff"),
    "alerts.delete":           ("admin", "manager"),
    "reports.read":            ("admin", "manager"),
    "suppliers.read":          ("admin", "manager", "staff"),
    "suppliers.write":         ("admin", "manager"),
    "users.manage":            ("admin",),
    "agent.chat":              ("admin", "manager", "staff"),
    "agent.action.draft":      ("admin", "manager", "staff"),
    "agent.action.approve":    ("admin", "manager", "staff"),
    "agent.action.execute":    ("admin", "manager"),
}


def capabilities_for(role: str | None) -> list[str]:
    return sorted(name for name, roles in CAPABILITIES.items() if role in roles)


def require_capability(name: str):
    return require_role(*CAPABILITIES[name])
```

`GET /auth/me` trả thêm `capabilities: list[str]` (không thêm round trip, `AuthContext` đã gọi endpoint này).

**Frontend:**

- `AdminProtectedRoute`: bỏ hoàn toàn nhánh `vaitro_id === 1`; gate bằng `capabilities.includes('admin.access')`.
- `AdminNavItem` thêm trường `capability: string`; `AdminLayout` lọc `adminNavGroups` theo capability của người đang đăng nhập.
- Mỗi route con trong `App.tsx` bọc bằng `<RequireCapability name="...">`, redirect về màn đầu tiên mà người dùng có quyền (staff → `/admin/orders`) thay vì hiện màn trống.
- Nút hành động dùng `can('products.write')`; ẩn hẳn thay vì disable, trừ khi cần giải thích lý do.

**Backend:** thay dần `require_role("admin", "manager")` rải rác bằng `require_capability("products.write")`. Trong PR4 chỉ cần chuyển các router đã chạm ở WS-2/3/6 cộng `products`, `gift_boxes`, `reports`, `orders`; phần còn lại chuyển dần, test ma trận sẽ chỉ ra chỗ chưa chuyển.

**Chống lệch:** `tests/test_rbac_matrix.py` duyệt `app.routes`, trích tuple vai trò từ dependency của từng route, và assert nó khớp một capability trong `CAPABILITIES`. Route không map được → fail kèm tên route. Đây là thứ khiến ma trận không quay lại trạng thái lệch.

Ma trận cần thêm một tier `PUBLIC_ROUTES` khai báo tường minh, nếu không test sẽ đỏ oan ở những endpoint cố ý mở: `GET /analytics/best-sellers` (không có dependency auth nào — công khai theo thiết kế, phục vụ chatbot Leafie và storefront), các route storefront dùng `get_optional_user` (`GET /products`, `GET /products/{id}/availability`, `GET /gift-boxes` phần công khai ở `gift_boxes.py:260,274,287`), `/auth/*`, `/leafie/*`, và webhook `POST /payments/momo/ipn` (xác thực bằng chữ ký HMAC, không bằng JWT). Danh sách này phải là allowlist tường minh — thêm route công khai mới bắt buộc phải sửa file ma trận, đó chính là điểm rà soát ta muốn có.

### Acceptance criteria

- Đăng nhập `staff`: menu không hiện Tổng quan/Mã giảm giá; không còn màn trống; không còn nút nào bấm vào trả 403.
- Đăng nhập `manager`: không thấy mục quản lý người dùng.
- `customer` mở `/admin/anything` → redirect `/`.
- Người dùng có `vaitro_id == 1` nhưng `ten_vai_tro == "customer"` → **không** vào được admin (test hồi quy cho fallback đã gỡ).
- `tests/test_rbac_matrix.py` xanh; thêm một route mới không khai báo capability → đỏ.

---

## WS-5 — ID sản phẩm và ID biến thể bị trộn (P1)

### Hiện trạng

`productService.ts:272` (`updateProductVariant`) và `:372` (`deleteProductVariant`) có cùng cấu trúc:

```ts
const variantId = parseInt(id)
if (!isNaN(variantId)) {
  await apiClient.delete(`/products/variants/${variantId}`)
  return
}
// If not a variant ID, try as product ID
const productId = parseInt(id)
if (!isNaN(productId)) { ... }
```

Nhánh thứ hai là code chết: nếu `parseInt(id)` là `NaN` ở nhánh một thì nó cũng `NaN` ở nhánh hai. Nguyên nhân gốc nằm ở `mapToAdminVariant` (dòng 14–43): với sản phẩm có biến thể, `id = variant.bienthe_id.toString()`; với sản phẩm `don`, `id = product.sanpham_id.toString()`. Hai không gian ID khác nhau, cùng một kiểu chuỗi số, không có gì phân biệt.

### Rủi ro cụ thể

Sửa hoặc xoá một sản phẩm loại `don` có `sanpham_id = 7` sẽ gọi `PUT|DELETE /products/variants/7` — tác động lên **biến thể** số 7, một bản ghi hoàn toàn khác thuộc một sản phẩm khác. Người dùng thấy thao tác thành công (API trả 200) trong khi bản ghi họ định sửa không đổi và một bản ghi vô can bị đổi giá hoặc bị ẩn. Va chạm gần như chắc chắn xảy ra vì cả hai bảng đều đánh số từ 1.

### Thiết kế

ID mang kiểu, tường minh trong chính giá trị:

```ts
// frontend/src/types/admin.ts
export type AdminEntityId = `variant:${number}` | `product:${number}`

export type ParsedAdminEntityId =
  | { kind: 'variant'; id: number }
  | { kind: 'product'; id: number }

export function parseAdminEntityId(value: string): ParsedAdminEntityId {
  const [kind, raw] = value.split(':')
  const id = Number(raw)
  if ((kind !== 'variant' && kind !== 'product') || !Number.isInteger(id) || id <= 0) {
    throw new Error(`ID admin không hợp lệ: ${value}`)
  }
  return { kind, id }
}
```

- `ProductVariant.id` đổi kiểu từ `string` sang `AdminEntityId`.
- `mapToAdminVariant`: `id: variant ? \`variant:${variant.bienthe_id}\` : \`product:${product.sanpham_id}\``.
- `updateProductVariant` / `deleteProductVariant`: `switch (parseAdminEntityId(id).kind)`, xoá hẳn hai nhánh `isNaN`. Nhánh `product` giờ thực sự chạy được — đây là lần đầu đường sửa sản phẩm `don` hoạt động đúng.
- Consumer cần rà: `AdminProductPage.tsx` (key của row, state chọn dòng, dialog xác nhận xoá), `ProductForm.tsx` (`variant.id`).

Dùng dấu `:` an toàn: đã kiểm tra `App.tsx` — không có route admin nào nhận product/variant id qua URL (`/admin/products` là bảng + dialog, không có `/admin/products/:id`), nên không có vấn đề mã hoá path segment.

Đã cân nhắc và bỏ: thêm trường `kind` riêng bên cạnh `id` — vẫn cho phép truyền `id` trần đi lẫn nhau; kiểu template literal khiến TypeScript bắt lỗi ngay tại chỗ gán.

### Acceptance criteria

- Xoá một sản phẩm loại `don` → gọi `DELETE /products/{sanpham_id}`, không phải `/products/variants/...`.
- Sửa giá một sản phẩm `don` có `sanpham_id` trùng với một `bienthe_id` đang tồn tại → chỉ sản phẩm đó đổi; biến thể cùng số không đổi (assert bằng cách đọc lại cả hai).
- Truyền ID sai định dạng → ném lỗi có thông điệp rõ, không âm thầm gọi nhầm endpoint.

### Test

`frontend/src/services/admin/__tests__/productService.test.ts` (vitest, mock `apiClient`): assert **URL được gọi** cho 4 tổ hợp {variant, product} × {update, delete}. Đây là loại bug chỉ lộ ra khi kiểm tra URL, không lộ ra khi kiểm tra giá trị trả về.

---

## WS-4 — Form sản phẩm ghi hỏng catalog (P1)

### Hiện trạng

Hai lỗi độc lập trên cùng một đường ghi.

**(a) Kích thước bị ép về 4 mã.** `types/admin.ts:11` khai báo `size: 'S' | 'M' | 'L' | 'XL'`. `ProductForm.tsx:34` chỉ cho chọn trong `SIZES = ['S','M','L','XL']`. Nhưng `bienthesanpham.kich_thuoc` là `VARCHAR(50)` tự do (`app/models.py:110`), và catalog thật đang dùng các giá trị như `7cm`, `16cm`, `6in`, `20cm`.

Đường đi của một biến thể `16cm` khi mở form và bấm Lưu:

1. `mapToAdminVariant` (`productService.ts:24`): `getSizeCode(normalizeSize('16cm'))`. `normalizeSize` không khớp mapping nào nên trả về nguyên `'16cm'` (đúng thiết kế của nó — "preserve data"); `getSizeCode('16cm')` trả `null`; biểu thức `|| 'M'` biến nó thành `'M'`.
2. Form hiển thị Size = M.
3. Bấm Lưu → `PUT /products/variants/{id}` với `kich_thuoc: 'M'`.

Giá trị gốc mất vĩnh viễn. Đây là **lossy read → lossy write**: một hàm chuẩn hoá dành cho hiển thị bị đặt trên đường ghi.

**(b) Tên sản phẩm ghi đè hương vị.** `productService.ts:247`, khi tạo: `huong_vi: data.name, // Use product name as flavor`. Khi cập nhật (dòng ~285): `variantUpdatePayload.huong_vi = data.name`. Form không có ô nhập hương vị. Mọi biến thể của cùng một sản phẩm vì thế có `huong_vi` giống hệt nhau và bằng tên sản phẩm — trường phân biệt biến thể bị vô hiệu hoá.

### Thiết kế

**Nguyên tắc: `normalizeSize` / `getSizeCode` / `getSizeDisplayLabel` chỉ được xuất hiện trên đường đọc-để-hiển thị và đường lọc. Không hàm nào trong số đó được nằm giữa form và payload gửi đi.**

Type (kết hợp với WS-5):

```ts
export interface ProductVariant {
  id: AdminEntityId
  productId: string
  name: string        // sanpham.ten
  flavor: string      // bienthesanpham.huong_vi  ← trường mới
  description: string
  category: string
  price: number
  size: string        // kich_thuoc nguyên văn, KHÔNG ép kiểu
  sizeLabel: string   // chỉ để hiển thị, dẫn xuất, không gửi đi
  status: 'active' | 'hidden'
  image: string
  sku?: string
}
```

`mapToAdminVariant`:

```ts
size: variant.kich_thuoc ?? '',
sizeLabel: getSizeDisplayLabel(normalizeSize(variant.kich_thuoc)),
flavor: variant.huong_vi ?? '',
```

Nhánh sản phẩm không có biến thể: `size: ''`, `flavor: ''` — không bịa `'M'`.

`ProductForm.tsx`:

- Thay `<Select>` 4 lựa chọn bằng `<Autocomplete freeSolo>`, options là tập `kich_thuoc` phân biệt lấy từ danh sách đang hiển thị (gợi ý, không ràng buộc). Giá trị người dùng gõ được giữ nguyên văn.
- Thêm ô **Hương vị**, bắt buộc với sản phẩm loại `bien_the`, không bao giờ tự điền bằng tên sản phẩm.
- Validate độ dài khớp schema: `size` ≤ 50, `flavor` ≤ 100 — bắt ở client để lỗi hiện tại chỗ nhập thay vì trả 500 từ DB.

`productService.ts`:

- Tạo: `huong_vi: data.flavor`, `kich_thuoc: data.size`.
- Cập nhật: `variantUpdatePayload.huong_vi = data.flavor` (bỏ `data.name`); `kich_thuoc` gửi nguyên `data.size`.
- SKU tự sinh (`generateSKU`, `${product.sku}-${data.size}`) dùng `size` đã slug hoá (bỏ ký tự không phải chữ/số) để `16cm` không tạo SKU lạ.

Phòng thủ tầng hai ở backend: thêm validator `max_length=50` cho `kich_thuoc` và `max_length=100` cho `huong_vi` trong schema `VariantCreate`/`VariantUpdate` (`app/routers/products.py`). Backend **không** chuẩn hoá giá trị — chuẩn hoá là việc của tầng hiển thị.

**Bước bắt buộc trước khi merge:** chụp lại hiện trạng dữ liệu, vì không rõ bao nhiêu bản ghi đã bị ghi đè bởi phiên bản hiện tại:

```sql
SELECT b.bienthe_id, s.ten, b.huong_vi, b.kich_thuoc, b.sku_bienthe
FROM bienthesanpham b JOIN sanpham s ON s.sanpham_id = b.sanpham_id
ORDER BY b.bienthe_id;
```

Xuất ra CSV, đối chiếu với `docs/PRODUCT_CATALOG_RECOVERY_REPORT.md`. Bản ghi có `huong_vi = s.ten` hoặc `kich_thuoc ∈ {S,M,L,XL}` là ứng viên đã hỏng và cần nhập lại thủ công — spec này sửa đường ghi, không tự khôi phục dữ liệu đã mất (không có nguồn để suy ngược).

### Acceptance criteria

- Mở form của biến thể `kich_thuoc = '16cm'`, chỉ đổi giá, bấm Lưu → `GET` lại trả về `kich_thuoc = '16cm'`.
- Tạo biến thể mới với size `6in`, hương vị `Trà xanh` → DB lưu đúng cả hai chuỗi.
- `huong_vi` chỉ bằng `sanpham.ten` khi người dùng gõ đúng như vậy.
- Sản phẩm có 3 biến thể `7cm` / `16cm` / `20cm` hiển thị đủ 3 dòng phân biệt, không gộp thành 3 dòng "M".
- Nhập size 60 ký tự → lỗi validate ở form, không có request nào được gửi.

### Test

- Vitest: `mapToAdminVariant` giữ nguyên `kich_thuoc` cho các giá trị không thuộc mapping; payload tạo/cập nhật chứa đúng `huong_vi`/`kich_thuoc`.
- Pytest: `PUT /products/variants/{id}` với `kich_thuoc='16cm'` → `GET` trả lại `'16cm'` (khoá lại rằng backend không chuẩn hoá).

---

## 8. Thứ tự triển khai

| PR | Nội dung | Phụ thuộc | Ghi chú |
|----|----------|-----------|---------|
| PR1 | WS-1 + helper `role_name`/`BACK_OFFICE_ROLES` + gộp fixture role về `conftest` (thêm `role_staff`, `role_manager`) | — | Phải đi trước: mọi PR sau đều thêm test, và guard này bảo vệ chính người chạy chúng |
| PR2 | WS-2 + WS-3 | PR1 | Hotfix bảo mật, deploy sớm nhất có thể |
| PR3 | WS-6 | PR1 | Dùng lại helper, kèm khung `test_rbac_matrix.py` |
| PR4 | WS-7 | PR2, PR3 | Ma trận phải phản ánh quyền **sau khi** đã sửa |
| PR5 | WS-5 | — | Thuần frontend, không đụng API, chạy song song được |
| PR6 | WS-4 | PR5 | Snapshot `bienthesanpham` trước khi merge |

Chốt phương án cho câu hỏi mở ở WS-2 ("Phát sinh liên quan": phạm vi `orders.read.all` của staff) trước khi bắt đầu PR2 — nó quyết định một dòng trong ma trận PR4.

## 9. Definition of Done

Cho toàn bộ spec:

1. Mọi acceptance criteria ở 7 WS có test tự động tương ứng, không có mục nào chỉ kiểm thủ công.
2. `tests/test_rbac_matrix.py` xanh và bao phủ toàn bộ route dưới `app/routers/`.
3. `pytest` với `DATABASE_URL` trỏ DB không phải test → dừng, exit code ≠ 0.
4. Đăng nhập lần lượt bằng `admin` / `manager` / `staff` / `customer` và đi hết menu: không màn trống, không nút trả 403, không mục nào hiện mà không dùng được.
5. Sửa và lưu một biến thể có `kich_thuoc` không thuộc S/M/L/XL → giá trị không đổi.
6. Ruff, TypeScript build, vitest, pytest đều xanh; số test tăng, không có test nào bị nới lỏng để cho qua.

Test bị sửa vì hành vi đúng đã thay đổi (`test_cash_payment_for_full_amount_completes_order`) phải nêu lý do trong mô tả PR — sửa test để khớp guard mới là hợp lệ, sửa guard để khớp test cũ thì không.

## 10. Rủi ro và rollback

| Rủi ro | Khả năng | Giảm thiểu |
|--------|----------|-----------|
| Còn client ngoài repo gọi `POST /orders` không kèm `loai_don` và trông đợi POS | Thấp — đã rà toàn bộ `frontend/src`, chỉ có 2 caller và cả hai đều tường minh | Ghi log cảnh báo 30 ngày khi request không kèm `loai_don`, trước khi coi là lỗi |
| Staff mất quyền đang dùng hằng ngày sau PR4 | Trung bình | Ma trận nằm ở một file duy nhất; nới một dòng và deploy lại là đủ, không cần sửa rải rác |
| WS-5 sót consumer của `ProductVariant.id` | Thấp | Đổi kiểu sang template literal khiến TypeScript liệt kê hết chỗ hỏng lúc build |
| WS-4 lộ ra dữ liệu đã hỏng từ trước mà không khôi phục được | Cao | Snapshot trước khi merge; nhập lại thủ công theo danh sách đối chiếu |

Rollback: PR1–PR3 là revert độc lập được. PR4 revert cần kèm PR2/PR3 nếu ma trận đã thay `require_role` ở các router đó — giữ hai bước tách biệt trong cùng PR để revert từng phần.

## 11. Ngoài phạm vi

Các mục P2 sau **không** thuộc spec này, giữ lại để lên spec riêng:

- Phân trang server-side cho danh sách sản phẩm (đang `limit: 50` + N+1 request), đơn hàng (`limit: 100` + lọc khoảng tiền ở client), cảnh báo (`rows.length` làm tổng nên không sang trang được).
- Dashboard: ba ô sản phẩm/bán chạy/danh mục luôn rỗng, `bestSeller` luôn `N/A`, trong khi `GET /analytics/best-sellers` đã có sẵn ở backend; hook có lưu lỗi nhưng trang không hiển thị.
- Lối vào quản lý BOM từ danh sách hộp quà (route `/admin/gift-boxes/:id/bom` và backend CRUD đã có, chỉ thiếu nút).
- Voucher và Category còn chạy trên `localStorage` demo.
- Dọn dữ liệu seed demo khỏi database, retry cho action bị kẹt, che PII trước khi gửi sang DeepSeek/Langfuse.

Một mục nhỏ có thể gộp vào PR1 nếu tiện: test cũ mong `HTTP 400` khi upload file không phải ảnh trong khi code trả `415` — `415` là đúng, sửa test.
