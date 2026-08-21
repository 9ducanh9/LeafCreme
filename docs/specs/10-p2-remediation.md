# Spec 10 — P2 Remediation (Danh sách · Dashboard · Catalog phụ trợ · Vận hành Agent)

Status: DRAFT — chờ chốt 3 câu hỏi ở §16 trước khi mở PR đầu tiên.
Tiền đề: Spec 09 (P0/P1) đã triển khai — `app/core/capabilities.py`, guard `tests/conftest.py`, chặn POS/thanh toán thủ công cho khách, RBAC kho/cảnh báo, typed `AdminEntityId`, ma trận capability. Spec này tiếp nối, không lặp lại.
Phạm vi: 4 finding P2, 3 mục vận hành Agent, và 1 điều chỉnh mô hình vai trò phát sinh sau khi spec 09 lên.
Code liên quan: `app/routers/{products,orders,reports,gift_boxes}.py`, `app/services/reports/report_service.py`, `app/services/agent/{observability,agent_service}.py`, `scripts/seed_*.py`, `frontend/src/services/admin/{productService,adminOrderService,alertService,reportService,voucherService,categoryService}.ts`, `frontend/src/pages/admin/{AdminDashboardPage,AdminAlertsPage,AdminGiftBoxPage}.tsx`, `frontend/src/hooks/admin/useDashboardData.ts`.

---

## 0. Tóm tắt

| WS | Vấn đề | Mức | Tầng | PR |
|----|--------|-----|------|----|
| WS-0 | `orders.read.all` đang rộng hơn mô hình vai trò thực tế | Điều chỉnh | BE | PR7 |
| WS-14 | Tin nhắn và tham số tool gửi nguyên văn (kèm PII) sang Langfuse/DeepSeek | **Trên P2** | BE | PR8 |
| WS-8a/b | Alerts, Gift boxes: `total = rows.length` nên không sang trang được | P2 | FE | PR9 |
| WS-10 | Không có lối vào BOM từ danh sách hộp quà | P2 | FE | PR9 |
| WS-8c | Orders: lọc khoảng tiền ở client trên 100 dòng → **kết quả sai** | P2 | BE+FE | PR10 |
| WS-8d | Products: giới hạn 50 + N+1 request + `total` sai đơn vị | P2 | BE+FE | PR11 |
| WS-9 | Dashboard: 3 ô luôn rỗng, `bestSeller` cứng `'N/A'` | P2 | BE+FE | PR12 |
| WS-11 | Category cứng 4 giá trị; Voucher là localStorage demo nhưng vẫn có menu | P2 | BE+FE | PR13 |
| WS-12 | Dữ liệu seed demo nằm lẫn trong DB thật mà Agent đang đọc | P2 | Ops | PR14 |
| WS-13 | Action Agent kẹt ở `dang_xu_ly` không có đường thoát | P2 | BE | PR15 |

Hai mục đứng ngoài thứ tự đánh số: **WS-14** là dữ liệu cá nhân rời khỏi hệ thống sang bên thứ ba — xếp cùng nhóm ưu tiên với các mục bảo mật của spec 09, không phải P2. **WS-8c** không phải vấn đề tiện lợi mà là bộ lọc trả về kết quả sai.

---

## 1. Nguyên tắc chung

1. **Không để một mục menu dẫn tới trang không dùng được.** Nếu một tính năng chưa có backend thì gỡ lối vào, không để nguyên và trông chờ người dùng tự hiểu.
2. **`total` của bảng luôn đến từ `Page.total` của server.** Không bao giờ từ `rows.length`.
3. **Không lọc/sắp xếp ở client trên một trang dữ liệu.** Mỗi filter là một query param server-side. Lọc client trên dữ liệu đã phân trang cho ra kết quả sai, không phải kết quả chậm.
4. **Aggregate phải dùng chung định nghĩa với báo cáo đang có.** Card "Doanh thu" và bảng "Doanh thu theo ngày" phải cộng ra cùng một số; lệch nhau một lần là mất tin vào cả dashboard.
5. **Agent không được là nơi PII rò ra ngoài.** Observability và prompt là hai đường ra khác nhau, cần hai chính sách khác nhau.

---

## WS-0 — Thu hẹp `orders.read.all` theo mô hình vai trò thực tế

### Bối cảnh

Spec 09 §WS-2 để ngỏ câu hỏi phạm vi đọc đơn của staff, và bản triển khai chọn phương án rộng: `CAPABILITIES["orders.read.all"] = ("admin", "manager", "staff")`, còn `order_service.list_orders` (dòng 92) và `get_order` (dòng 115) nới cho toàn bộ `BACK_OFFICE_ROLES`.

Mô hình vận hành thực tế của Leaf Creme hiện tại là **admin + khách (guest/customer)**. Chưa có staff, chưa có manager. Khi staff xuất hiện, phạm vi đúng là: **chỉ đơn do chính họ tạo**.

### Vì sao sửa bây giờ dù chưa có staff

Đúng vì chưa có staff nên sửa bây giờ **không đổi hành vi của một người dùng nào**. Đây là thời điểm rẻ nhất và an toàn nhất để khoá ngữ nghĩa lại. Để đến khi có staff thật mới siết thì đó là một thay đổi gây mất quyền đang dùng — loại thay đổi luôn bị hoãn.

### Thiết kế

`app/core/capabilities.py`:

```python
"orders.read.all":         ("admin", "manager"),
"orders.read.own_created": ("admin", "manager", "staff"),
```

`order_service.list_orders` — thay khối scoping hiện tại:

```python
role = role_name(current_user)
if role not in MANAGEMENT_ROLES:
    if role in BACK_OFFICE_ROLES:
        # staff: đơn mình lập tại quầy, cộng đơn mình tự đặt với tư cách khách
        query = query.filter(
            or_(
                DonHang.nhan_vien_tao == current_user.nguoidung_id,
                DonHang.nguoidung_id == current_user.nguoidung_id,
            )
        )
    else:
        query = query.filter(DonHang.nguoidung_id == current_user.nguoidung_id)
```

Nhánh `or_` là cần thiết, không phải thừa: đơn POS có `nguoidung_id = None` và `nhan_vien_tao = <staff>`; đơn online do chính staff đó đặt thì ngược lại. Chỉ lọc theo `nhan_vien_tao` sẽ khiến staff không thấy đơn của chính mình với tư cách khách.

`get_order` (dòng 115) áp cùng điều kiện.

**Nhất quán với payments.** `payment_service._ensure_order_access` hiện được gọi với `BACK_OFFICE_ROLES` ở `get_payment` (dòng 134), `get_order_payments` (139) và `create_payment` (162) — nghĩa là staff đọc và ghi được thanh toán của mọi đơn. Đưa về cùng quy tắc: staff chỉ với đơn thoả điều kiện trên. Cách gọn nhất là một helper dùng chung `order_service.can_access_order(order, current_user) -> bool` và để `payment_service` gọi nó, thay vì chép logic sang file thứ hai.

### Acceptance criteria

- Với DB chỉ có `admin` và `customer`: hành vi trước và sau thay đổi **giống hệt nhau** (test hồi quy — đây là điểm chính).
- `staff` A tạo đơn POS, `staff` B `GET /orders` → không thấy đơn của A.
- `staff` A `GET /orders` → thấy đơn POS mình lập **và** đơn online mình tự đặt.
- `staff` B `GET /orders/{id}` với đơn của A → 403.
- `staff` B `POST /payments` cho đơn của A → 403.

---

## WS-14 — Che PII trước khi gửi sang Langfuse và DeepSeek

> Đánh số sau nhưng ưu tiên trước. Xử lý ở PR8, ngay sau WS-0.

### Hiện trạng

`app/services/agent/observability.py` gửi thẳng, không qua bất kỳ bước lọc nào:

- `trace_conversation(user_id, message)` (dòng 53) — nguyên văn tin nhắn người dùng.
- `trace_tool_call(tool_name, tool_input)` (dòng 90) — nguyên văn tham số tool.
- `safe_update(observation, **kwargs)` (dòng 106) — nơi kết quả tool được đính vào trace.

Không có hàm mask/redact nào trong file. Cùng dữ liệu đó cũng nằm trong prompt gửi DeepSeek.

### Rủi ro cụ thể

`DonHang` có `ten_khach_hang`, `so_dien_thoai_khach`, `dia_chi_giao_hang`. Tool đọc đơn hàng trả về đúng các cột này, nên chỉ cần một câu "kiểm tra đơn ONL-xxxx giúp tôi" là tên, số điện thoại và địa chỉ của một khách hàng thật rời khỏi hệ thống sang hai nhà cung cấp bên ngoài — một bên là hệ thống quan sát (Langfuse), một bên là mô hình ngôn ngữ (DeepSeek). Trace của Langfuse còn được lưu lại lâu dài để xem lại.

Đây không phải rủi ro giả định: đó là đường đi mặc định của mọi cuộc hội thoại vận hành có nhắc tới đơn hàng.

### Thiết kế

Hai đường ra, hai chính sách — vì nhu cầu khác nhau:

**(a) Langfuse — che, không thoả hiệp.** Observability cần biết *hình dạng* của dữ liệu, không cần giá trị. Một trace hiện `so_dien_thoai_khach: "[đã ẩn]"` vẫn debug được đầy đủ.

`app/services/agent/redaction.py` (mới):

```python
_SENSITIVE_KEYS = ("so_dien_thoai", "dia_chi", "email", "ten_khach_hang", "avatar_url")
_PHONE = re.compile(r"(?<!\d)(0|\+84)\d{8,10}(?!\d)")
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")

def redact(value):
    """Đệ quy trên dict/list/str. Che theo TÊN KHOÁ và theo MẪU —
    cần cả hai: khoá bắt được field có cấu trúc, mẫu bắt được số điện
    thoại người dùng gõ lẫn trong câu văn tự do."""
```

Mọi lời gọi `observability.*` đi qua `redact` trước. Vì `trace_*` đã là chỗ thắt cổ chai duy nhất, đây là thay đổi cục bộ.

**(b) DeepSeek — không che, nhưng có kiểm soát và ghi rõ.** Agent cần giá trị thật để làm việc: một tool trả `"[đã ẩn]"` khiến Agent không thể trả lời "gọi cho khách đơn này ở số nào". Che ở đây là bỏ đi chính năng lực đang xây. Bù lại bằng kiểm soát ở chỗ khác:

- Tắt data retention / training phía nhà cung cấp (kiểm tra cấu hình tài khoản, ghi lại bằng chứng đã tắt).
- PII chỉ vào prompt qua **kết quả tool đã được gọi thật**, không bao giờ nằm trong system prompt hay ví dụ few-shot.
- Ghi rõ trong tài liệu vận hành: dữ liệu khách hàng được xử lý bởi bên thứ ba nào, cho mục đích gì.
- `tool_input` không được chứa token/khoá — thêm assertion trong `redact` để `secret`, `token`, `password`, `api_key` luôn bị che kể cả ở đường (b).

Chốt lựa chọn (b) trước khi implement — xem §16.

### Acceptance criteria

- Gửi Agent tin nhắn `"gọi giúp khách 0912345678"` → trace Langfuse hiện `[đã ẩn]`, không hiện số.
- Tool trả đơn hàng có `so_dien_thoai_khach` → trace hiện `[đã ẩn]`; Agent vẫn trả lời đúng cho người dùng.
- Unit test `redact` với dict lồng 3 tầng, list trong dict, và chuỗi tự do chứa số điện thoại + email.
- Observability lỗi vẫn không làm hỏng luồng chat (hành vi có sẵn — thêm test khoá lại, vì `redact` là code mới nằm trên đường đó).

---

## WS-8 — Phân trang server-side cho mọi danh sách admin

Bốn danh sách, ba mức độ hỏng khác nhau. Backend đã hỗ trợ sẵn nhiều hơn frontend đang dùng.

### 8a. Alerts — thuần frontend

`GET /alerts` đã nhận `paginated`, `sort_by`, `sort_dir` và trả `Page[AlertResponse]` (`routers/alerts.py:80–97`). Nhưng `alertService.getAlerts` không gửi `paginated`, khai báo trả `Promise<Alert[]>`, và `AdminAlertsPage.tsx:59` truyền `total={rows.length}` vào `DataTable`.

Hệ quả: thanh phân trang tin rằng tổng số bản ghi bằng đúng số dòng đang hiển thị → không bao giờ có trang 2. Cảnh báo cũ nằm ngoài `limit` mặc định (50) là không thể xem được bằng UI.

Fix: `getAlerts` trả `Page<Alert>`, gửi `paginated: true` cùng `skip`/`limit`/`sort_by`/`sort_dir` từ `useDataTableState`; trang truyền `total={page.total}`.

### 8b. Gift boxes — thuần frontend

`AdminGiftBoxPage.tsx:73` vô hiệu hoá phân trang một cách tường minh: `page={0}`, `pageSize={Math.max(25, rows.length || 25)}`, `total={rows.length}`, `onPageChange={() => undefined}`. `GET /gift-boxes` (`routers/gift_boxes.py:109`) đã trả `Union[List, Page]`.

Fix: cùng khuôn với 8a.

### 8c. Orders — bộ lọc trả kết quả sai

`adminOrderService.getOrders` gửi `{ limit: 100 }`, không `paginated`, rồi lọc khoảng tiền **ở client**:

```ts
if (filters?.amountFrom !== undefined) {
  orders = orders.filter((order) => order.totalAmount >= filters.amountFrom!)
}
```

Bộ lọc chỉ chạy trên 100 đơn mới nhất. Đơn thứ 101 trở đi khớp điều kiện vẫn không bao giờ xuất hiện, và người dùng không có dấu hiệu nào để biết. Đây là **kết quả sai**, không phải danh sách thiếu.

Fix cần cả hai tầng:

- Backend: thêm `tien_tu: Optional[Decimal]` và `tien_den: Optional[Decimal]` vào `GET /orders` và `order_service.list_orders`, lọc bằng SQL trên `DonHang.tien_thanh_toan` — cùng chỗ với các filter `trang_thai`/`loai_don` đã có, trước khi `count()` chạy, để `total` phản ánh đúng bộ lọc.
- Frontend: `getOrders` chuyển sang `paginated: true`, gửi `tien_tu`/`tien_den`, **xoá hai lời gọi `.filter()`**, trả `Page<Order>`.

### 8d. Products — nặng nhất, cần endpoint mới

`getProductVariants` hiện: gửi `{ limit: 50, paginated: true }` tới `/products`, lấy `productPage.items`, rồi với **mỗi** sản phẩm `loai === 'bien_the'` gọi thêm `GET /products/{id}/variants`, rồi lọc `size` ở client.

Ba vấn đề chồng lên nhau:

1. Chỉ 50 sản phẩm đầu tiên tồn tại đối với admin.
2. `1 + N` request mỗi lần mở trang.
3. **Sai đơn vị đếm**: `Page.total` từ `/products` đếm *sản phẩm*, còn bảng hiển thị *biến thể*. Một sản phẩm 3 biến thể tạo 3 dòng. Không có công thức nào biến `total` sản phẩm thành `total` dòng, nên phân trang ở đây không thể đúng dù sửa số `limit` thế nào.

Đơn vị hàng của bảng là **biến thể**, nên phân trang phải theo biến thể. Thêm endpoint phẳng:

```python
@router.get("/variants", response_model=Page[AdminVariantRow])   # ⚠️ xem ghi chú thứ tự route
def list_admin_variants(
    search: Optional[str] = Query(None),
    danh_muc: Optional[str] = Query(None),
    kich_thuoc: Optional[str] = Query(None),
    dang_hoat_dong: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort_by: VariantSortField = Query(VariantSortField.ten),
    sort_dir: Literal["asc", "desc"] = Query("asc"),
    db: Session = Depends(get_db),
    current_user: NguoiDung = Depends(require_capability("products.read")),
): ...


class AdminVariantRow(BaseModel):
    bienthe_id: int | None      # None với sản phẩm loại 'don'
    sanpham_id: int
    ten: str
    huong_vi: str | None
    kich_thuoc: str | None
    gia: Decimal                # gia_bienthe, hoặc gia_co_ban với 'don'
    sku: str | None
    danh_muc: str | None
    mo_ta: str | None
    hinh_anh_url: str | None
    dang_hoat_dong: bool
```

**⚠️ Thứ tự khai báo route.** `@router.get("/{product_id}")` đang ở `products.py:302`. FastAPI khớp theo thứ tự khai báo, nên `GET /products/variants` **phải** được khai báo trước dòng đó — nếu không `{product_id}` nuốt chuỗi `"variants"` và trả 422. Đây là loại lỗi chỉ lộ ra lúc chạy, nên phải có test riêng cho nó.

Client: `getProductVariants` gọi đúng **một** request, map thẳng `AdminVariantRow` → `ProductVariant` (dùng `AdminEntityId` từ spec 09 WS-5: `bienthe_id` có → `variant:<id>`, không có → `product:<id>`), bỏ vòng lặp `Promise.all`, bỏ lọc `size` ở client.

Nhánh sản phẩm `loai='don'` cần chốt trước khi viết truy vấn — xem §16.

### Quy ước chung (ghi lại thành chuẩn cho danh sách admin về sau)

- Mọi list API admin gọi với `paginated=true`, trả `Page<T>`.
- `total` luôn từ `Page.total`.
- Mọi filter là query param server-side; `count()` chạy **sau** khi áp filter.
- `useDataTableState` giữ `skip/limit/sort/filters`; service nhận nguyên bộ đó, không tự chế mặc định riêng.

### Acceptance criteria

- Tạo 120 đơn với giá trị rải rác, lọc `tien_tu=500000`: tổng số khớp SQL đếm tay, trang 2 vẫn đúng bộ lọc, không phụ thuộc thứ tự sắp xếp.
- Catalog 200 biến thể: trang sản phẩm gửi đúng **1** request danh sách (đếm bằng network tab hoặc mock), `total = 200`.
- Alerts và Gift boxes: đổi trang / đổi `pageSize` đều gọi lại API; `total` khớp `Page.total`.
- `GET /products/variants` trả 200 (không phải 422).

### Test

- pytest: `tien_tu`/`tien_den` (bao gồm biên và tổ hợp với filter khác); `GET /products/variants` — phân trang, từng filter, và case route-ordering.
- vitest: mỗi service gửi đúng bộ param; `getProductVariants` gọi đúng 1 lần.

---

## WS-9 — Dashboard chỉ hoạt động một nửa

### Hiện trạng

`frontend/src/services/admin/reportService.ts`:

```ts
export async function getRevenueByProduct(): Promise<ProductRevenue[]> { return [] }
export async function getBestSellers(_limit = 5): Promise<BestSeller[]> { return [] }
export async function getRevenueByCategory(): Promise<CategoryRevenue[]> { return [] }
```

và `getDashboardStats` trả `bestSeller: 'N/A'` cứng.

`useDashboardData` gọi cả 6 nguồn và **có** state `errors`, nhưng `AdminDashboardPage.tsx:18` destructure không lấy `errors`. Kết quả: ba card "Sản phẩm theo doanh thu", "Bán chạy", "Danh mục" luôn trắng, và người dùng không phân biệt được "chưa có dữ liệu trong kỳ" với "gọi API hỏng" với "tính năng chưa làm".

Trong khi đó `GET /analytics/best-sellers` đã tồn tại và chạy thật (`analytics_service.get_best_sellers`).

### Thiết kế — ba mức, làm cả ba

**1. Nối ngay thứ đã có.** `getBestSellers` → `GET /analytics/best-sellers?limit=5`; `getDashboardStats.bestSeller` lấy tên từ phần tử đầu thay vì hằng `'N/A'`. Đây là thay đổi nhỏ nhất trong WS này và gỡ được card sai lệch rõ nhất.

**2. Thêm hai endpoint aggregate còn thiếu** — đặt ở `reports` (cần `reports.read`), không ở `analytics` (đang công khai cho chatbot):

```
GET /reports/revenue-by-product?from_date&to_date&limit  → [{sanpham_id, ten, doanh_thu, so_luong}]
GET /reports/revenue-by-category?from_date&to_date       → [{danh_muc, doanh_thu, so_luong}]
```

Nguồn: `ChiTietDonHang` → `LoHangSanPham` → `BienTheSanPham` → `SanPham`, giới hạn theo khoảng ngày và trạng thái đơn.

**Ràng buộc quan trọng:** phải dùng **chung một định nghĩa "đơn được tính doanh thu"** với `report_service.get_sales_report` đang chạy. Tách thành một hàm/điều kiện dùng chung, không viết lại điều kiện lọc lần thứ hai. Nếu card "Doanh thu" và bảng "Doanh thu theo ngày" cộng ra hai số khác nhau thì người dùng mất tin vào toàn bộ dashboard, và đó là thiệt hại lớn hơn việc thiếu ba card.

**3. Phân biệt rỗng với lỗi.** `AdminDashboardPage` lấy `errors` từ hook; mỗi card render một trong ba trạng thái: có dữ liệu / "Không có dữ liệu trong khoảng này" / `errors[key]` kèm nút thử lại. Ba trạng thái, ba giao diện khác nhau.

### Acceptance criteria

- Tổng doanh thu ở card khớp tổng cột doanh thu của `/reports/sales` cùng khoảng ngày (kiểm tra bằng số, không bằng mắt).
- `bestSeller` là tên sản phẩm thật; đổi khoảng thời gian thì đổi theo.
- Ngắt một endpoint → chỉ card đó hiện lỗi, các card khác vẫn hiển thị bình thường.
- Khoảng ngày không có đơn nào → card hiện "không có dữ liệu", không hiện lỗi.

---

## WS-10 — Lối vào quản lý BOM

### Hiện trạng

Route `/admin/gift-boxes/:id/bom` có trong `App.tsx`, `AdminGiftBoxBomPage` tồn tại, backend có đủ `GET|POST|PUT|DELETE /gift-boxes/{id}/bom` (`gift_boxes.py:189–238`). Nhưng `AdminGiftBoxPage.tsx:73` chỉ render hai nút Sửa và Xoá — không có đường nào từ UI dẫn tới trang BOM. Tính năng hoàn chỉnh ở cả hai tầng, chỉ thiếu một nút.

### Thiết kế

Thêm `IconButton` "Công thức (BOM)" vào `rowActions`, hiển thị khi `can('giftbox.read')`, điều hướng tới `/admin/gift-boxes/${row.hop_qua_id}/bom`.

Không thêm cột "Số thành phần" trừ khi `GET /gift-boxes` đã trả sẵn con số đó — thêm một request mỗi dòng chỉ để hiện một số là đúng cái N+1 mà WS-8d đang gỡ.

Gộp vào PR9 cùng WS-8b vì cùng file.

### Acceptance criteria

- Từ danh sách hộp quà, một cú nhấp mở được trang BOM đúng hộp quà đó.
- Tài khoản không có `giftbox.read` không thấy nút.

---

## WS-11 — Category và Voucher

Hai vấn đề bị gộp chung ở finding gốc, nhưng lời giải hoàn toàn khác nhau vì một bên đã có bảng thật, một bên không cần bảng nào.

### 11a. Category — không cần CRUD, cần đọc từ dữ liệu thật

Hiện trạng: `categoryService.getCategories()` trả `DEFAULT_CATEGORIES = ['Bánh kem', 'Bông lan', 'Mousse', 'Tiramisu']` cứng khi cờ demo tắt (mặc định). `ProductForm` dùng danh sách này cho ô Danh mục. Nhưng `sanpham.danh_muc` là text tự do — danh mục thật trong DB có thể không nằm trong 4 giá trị đó, và khi đó **không chọn lại được** trong form.

Thiết kế: `danh_muc` đã là thuộc tính của sản phẩm, không cần bảng riêng. Thêm:

```
GET /products/categories → ["Bánh kem", "Bông lan", ...]
```

trả `SELECT DISTINCT danh_muc FROM sanpham WHERE dang_hoat_dong AND danh_muc IS NOT NULL ORDER BY danh_muc`. `getCategories()` gọi endpoint này; xoá `categoryService` demo cùng cờ `VITE_ENABLE_DEMO_CATEGORY_MANAGEMENT`.

Không làm "CRUD danh mục". Trong mô hình hiện tại, danh mục sinh ra từ việc gán cho sản phẩm — đó là mô hình đúng với schema và ít việc hơn. Chỉ khi nào cần đổi tên hàng loạt hoặc gộp danh mục thì mới cần bảng riêng + migration; chưa có nhu cầu đó thì không tạo ra nó.

(Endpoint này cũng phải khai báo **trước** `GET /products/{product_id}` — cùng bẫy với WS-8d.)

### 11b. Voucher — có bảng thật, thiếu CRUD admin

Hiện trạng: `voucherService.ts` là localStorage, tắt mặc định bằng `VITE_ENABLE_DEMO_VOUCHERS`, ném lỗi khi ghi. Nhưng `/admin/vouchers` vẫn nằm trong `App.tsx` và `admin-nav.ts` → menu dẫn tới một trang không làm gì được.

Backend **đã có** voucher thật: `order_service` áp voucher khi tạo đơn và `_restore_voucher_usage` hoàn lượt dùng khi huỷ. Thiếu duy nhất là CRUD cho admin.

Thiết kế: thêm `app/routers/vouchers.py`:

```
GET    /vouchers        (paginated)   → require_capability("vouchers.read")   # đã có trong CAPABILITIES
POST   /vouchers                      → require_capability("vouchers.write")  # thêm mới: ("admin", "manager")
PUT    /vouchers/{id}                 → vouchers.write
DELETE /vouchers/{id}                 → vouchers.write
```

Logic đặt trong `app/services/vouchers/`, tái dùng model và quy tắc mà `order_service` đang dùng — **không** định nghĩa lại quy tắc voucher lần thứ hai. FE `voucherService` gọi API thật; xoá localStorage và cờ env.

**Chưa chốt được contract**: spec này chưa đọc `voucher_service.py` nên chưa biết tên model và các cột. Bước đầu tiên của PR13 là đọc file đó và điền contract vào spec trước khi viết code — xem §16.

**Nếu 11b bị hoãn sang sprint sau:** gỡ `/admin/vouchers` khỏi `admin-nav.ts` và `App.tsx` ngay trong PR9. Để nguyên một menu chết không phải trạng thái trung dung — nó là lỗi mà người dùng gặp trước khi chúng ta kịp sửa.

### Acceptance criteria

- Sản phẩm có `danh_muc = "Bánh Trung Thu"` (không thuộc 4 giá trị cứng) mở form ra vẫn chọn đúng danh mục của nó.
- Tạo voucher trong admin → dùng được ở luồng đặt hàng thật; huỷ đơn → lượt dùng được hoàn.
- Không còn `localStorage.getItem('leaf_creme_demo_*')` trong `frontend/src`.
- Không có mục menu nào dẫn tới trang không thao tác được.

---

## WS-12 — Dọn dữ liệu seed demo khỏi database

### Hiện trạng và vì sao đây là vấn đề grounding

`scripts/seed_demo_data.py` tạo 4 vai trò, 4 tài khoản (`admin`, `pos01`, `kho01`, `customer01`) và bộ sản phẩm bánh Trung Thu; `seed_gift_boxes.py` và `seed_order_test_data.py` thêm hộp quà và đơn hàng mẫu. Dữ liệu này đang nằm trong database đang dùng.

Operations Agent đọc trạng thái kinh doanh trực tiếp từ database đó. Agent **không có cách nào** phân biệt lô hàng demo với lô hàng thật, nên mọi câu trả lời về tồn kho, doanh thu, cảnh báo hết hạn hiện đang trộn hai loại. Theo tiêu chuẩn grounding của dự án ("không bịa tồn kho, doanh thu, waste"), số liệu Agent đưa ra hiện không đạt — không phải vì Agent bịa, mà vì nguồn đã lẫn.

Vì vậy đây là điều kiện tiên quyết để tin được Agent, không phải việc dọn dẹp cho gọn.

### Thiết kế — ba bước, không gộp

**1. Kiểm kê trước, không xoá gì.** `scripts/audit_demo_data.py` (mới, chỉ đọc): liệt kê bản ghi khớp dấu vết seed — tài khoản trong danh sách seed, lô hàng theo prefix `ma_lo` mà script sinh ra, sản phẩm thuộc bộ Trung Thu — **kèm theo mọi FK trỏ tới chúng** (đơn hàng, dòng ledger, lô, cảnh báo). In ra để người đọc quyết định, không tự quyết.

**2. Xoá có điều kiện, trong một transaction.** Bản ghi demo **chưa** phát sinh giao dịch nào → xoá cứng. Bản ghi demo **đã** nằm trong đơn hàng hoặc ledger thật → soft-delete (`dang_hoat_dong = False`), không xoá cứng. Xoá cứng ở đây sẽ phá audit trail, đúng cái pattern lỗi đã ghi nhận ở `docs/specs/05` và `06` — không lặp lại nó ở chiều ngược lại.

**3. Khoá seed script lại.** Thêm guard đầu mỗi `scripts/seed_*.py`: chỉ chạy khi `APP_ENV ∈ {dev, test}`, ngược lại `sys.exit` kèm thông điệp rõ. Cùng khuôn với guard `tests/conftest.py` đã làm ở spec 09 WS-1 — một dự án chỉ nên có một cách nghĩ về "môi trường nào được phép phá dữ liệu".

Giữ nguyên các script để test và môi trường dev dùng; vấn đề là chúng chạy được ở nơi không nên, không phải chúng tồn tại.

### Acceptance criteria

- `audit_demo_data.py` chạy trên DB hiện tại, in danh sách đầy đủ kèm số FK phụ thuộc từng bản ghi.
- Sau khi dọn: `GET /agent/state` không còn tham chiếu sản phẩm demo.
- `APP_ENV=production python scripts/seed_demo_data.py` → từ chối, exit code ≠ 0.
- Không có FK nào bị mồ côi sau khi dọn (kiểm tra bằng truy vấn đối chiếu).

---

## WS-13 — Action Agent kẹt ở `dang_xu_ly`

### Hiện trạng

Vòng đời trong `agent_service.py`: `de_xuat` → `_claim_action_or_404` (UPDATE nguyên tử, dòng 265–301) → `dang_xu_ly` → `hoan_thanh` (337) hoặc `that_bai` (324, 331).

Việc claim đã đúng: một `UPDATE ... WHERE trang_thai = 'de_xuat'` duy nhất, nên hai người duyệt song song không thể cùng thắng. Vấn đề nằm ở sau đó — nếu tiến trình chết **sau** khi claim và **trước** khi execute kết thúc, hàng ở lại `dang_xu_ly` vĩnh viễn:

- `_claim_action_or_404` chỉ nhận `de_xuat`, nên không ai duyệt lại được (dòng 301 trả 400 "Hành động đã ở trạng thái...").
- Không có timeout, không có job dọn.
- Không có chỗ nào trong UI cho biết hàng đó đang kẹt chứ không phải đang chạy.

### Thiết kế

**1. Ghi lại thời điểm claim.** `ngay_xu_ly` hiện dùng cho thời điểm kết thúc; cần một mốc riêng cho lúc bắt đầu — thêm `ngay_bat_dau_xu_ly` (migration mới). Xác minh ngữ nghĩa cột hiện có trước khi thêm để không tạo cột trùng nghĩa.

**2. Nhìn thấy được.** `GET /agent/actions` trả thêm `is_stale: bool` — `trang_thai == 'dang_xu_ly'` và `ngay_bat_dau_xu_ly` cũ hơn ngưỡng (mặc định 15 phút, cấu hình được). Operations Center hiển thị chúng tách khỏi nhóm "đang chạy".

**3. Đường thoát thủ công.** `POST /agent/actions/{id}/reset`, capability `agent.action.execute`: chỉ nhận hàng `dang_xu_ly` đã quá ngưỡng, đưa về `de_xuat`, ghi audit ai reset và lúc nào. **Không tự chạy lại.**

**4. Không tự động retry — và đây là quyết định có chủ đích.** Hành động EXECUTE của Agent thay đổi trạng thái nghiệp vụ thật (trừ kho, đổi trạng thái đơn). Một lần retry mù trên hành động đã chạy được một nửa có thể trừ kho hai lần. Điều kiện tiên quyết cho retry tự động là idempotency key cho từng loại hành động — chưa có, nên chưa làm. Ghi lại điều kiện này để lần sau không ai đề xuất retry tự động mà không kèm nó.

**5. Reset đi lại đúng luồng.** Sau reset, hành động quay về `de_xuat` và phải đi lại toàn bộ: APPROVE → **reload state + revalidate preconditions** → EXECUTE. Đây chính là lý do reset đưa về `de_xuat` chứ không chạy thẳng: trạng thái kinh doanh đã thay đổi trong lúc hàng bị kẹt, và một proposal cũ không được phép thực thi trên dữ liệu mới mà không kiểm tra lại.

### Acceptance criteria

- Mô phỏng chết giữa chừng (raise sau claim) → hàng ở `dang_xu_ly`; sau 15 phút `GET /agent/actions` trả `is_stale: true`.
- `POST /reset` trên hàng chưa quá ngưỡng → 400.
- `POST /reset` trên hàng đã quá ngưỡng → về `de_xuat`, có dòng audit.
- Sau reset, duyệt lại chạy đủ bước revalidate; nếu điều kiện tiên quyết đã đổi (vd. tồn kho không còn đủ) → thất bại có thông điệp rõ, **không** thực thi.
- `POST /reset` trên hàng `hoan_thanh`/`that_bai` → 400.

---

## 14. Thứ tự triển khai

| PR | Nội dung | Phụ thuộc | Ghi chú |
|----|----------|-----------|---------|
| PR7 | WS-0 vai trò | — | Nhỏ, không đổi hành vi hôm nay; làm trước khi có staff |
| PR8 | WS-14 PII | — | Ưu tiên cao nhất trong spec này dù đánh số sau |
| PR9 | WS-8a + WS-8b + WS-10 (+ gỡ menu voucher nếu hoãn 11b) | — | Thuần FE, cùng nhóm `DataTable` |
| PR10 | WS-8c orders | PR9 | Thêm `tien_tu`/`tien_den` ở backend |
| PR11 | WS-8d products | PR9 | Endpoint `/products/variants` mới; nặng nhất |
| PR12 | WS-9 dashboard | PR11 | Dùng lại khuôn aggregate; chốt định nghĩa doanh thu dùng chung |
| PR13 | WS-11a category → WS-11b voucher | PR11 | Đọc `voucher_service.py` và điền contract trước khi code |
| PR14 | WS-12 dọn seed | PR12 | Làm sau khi dashboard đúng, để nhìn thấy hệ quả của việc dọn |
| PR15 | WS-13 retry | — | Độc lập, chạy song song được |

## 15. Definition of Done

1. Không danh sách admin nào còn lấy `total` từ `rows.length`; không filter nào chạy ở client trên dữ liệu đã phân trang.
2. Trang sản phẩm gửi đúng một request danh sách với catalog bất kỳ kích thước nào.
3. Card doanh thu và bảng doanh thu cộng ra cùng một số trong mọi khoảng ngày kiểm thử.
4. Mọi mục menu admin dẫn tới trang thao tác được.
5. Trace Langfuse không chứa số điện thoại, email, địa chỉ, tên khách hàng.
6. `GET /agent/state` phản ánh dữ liệu kinh doanh thật, không lẫn seed demo.
7. Không có action nào ở `dang_xu_ly` mà không có đường thoát.
8. Ruff, TypeScript build, vitest, pytest xanh; số test tăng.

## 16. Ba câu cần chốt trước khi mở PR

1. **`loai='don'` — catalog hiện có bao nhiêu sản phẩm không có biến thể?** Nếu 0, `GET /products/variants` chỉ cần INNER JOIN, `bienthe_id` không nullable, và code đơn giản hơn hẳn. Nếu có, cần LEFT JOIN + nhánh `AdminEntityId` dạng `product:`. Một truy vấn `SELECT loai, count(*) FROM sanpham GROUP BY loai` là đủ để chốt.
2. **Tên model và cột của voucher.** Spec chưa đọc `app/services/orders/voucher_service.py`. Đọc trước, điền contract `GET/POST/PUT/DELETE /vouchers` vào §WS-11b, rồi mới code — để không tạo ra một lớp map thứ hai lệch khỏi model thật (đúng lỗi đã xảy ra với `salesService`/`preOrderService` cũ).
3. **Chính sách PII với DeepSeek.** Xác nhận phương án (b) — gửi PII trong kết quả tool, bù bằng tắt retention phía nhà cung cấp và ghi rõ trong tài liệu. Nếu không chấp nhận được thì phải chọn (a) và chấp nhận Agent không trả lời được các câu hỏi có yếu tố khách hàng cụ thể. Đây là quyết định sản phẩm, không phải quyết định kỹ thuật.

## 17. Ngoài phạm vi

- Bảng danh mục riêng + migration (chỉ cần khi phát sinh nhu cầu đổi tên/gộp danh mục).
- Retry tự động cho action Agent (điều kiện tiên quyết: idempotency key — xem WS-13 §4).
- Sinh cảnh báo tự động theo lịch (`docs/specs/04` Finding #1) — vẫn mở, thuộc spec khác.
- Chuyển toàn bộ `require_role` còn lại sang `require_capability` (spec 09 để lại, test ma trận sẽ chỉ ra chỗ chưa chuyển).
- ClickHouse/Redis: chưa có pain point nào trong spec này đòi hỏi chúng.
