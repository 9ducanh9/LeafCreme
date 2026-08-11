# Spec 09 — Admin: audit & chiến lược

> Phase 7. Admin panel: 14 pages, 45 files, 10.183 LOC.
> Người dùng thật: chủ bakery + 1-2 nhân viên, dùng hàng ngày.
>
> Spec này **sửa lại một quyết định ở spec 00**. Đọc §3 trước khi làm gì.

---

## 1. Admin không phải storefront — nguyên tắc thiết kế ngược nhau

Đây là điều quan trọng nhất cần nắm trước khi đọc tiếp. Đừng bê thẩm mỹ storefront sang admin.

| | Storefront | Admin |
|---|---|---|
| Người dùng | Khách lạ, lần đầu, 2 phút | Nhân viên, mỗi ngày, 8 tiếng |
| Mục tiêu | Tạo cảm xúc → mua | Hoàn thành việc → xong nhanh |
| Mật độ thông tin | Thoáng, nhiều whitespace | **Dày**. Whitespace là chi phí |
| Số click | Ít quan trọng | **Rất quan trọng** — nhân đó với 200 lần/ngày |
| Animation | Có, tinh tế | **Gần như không**. Chờ 300ms × 200 lần = 1 phút/ngày mất đi |
| Bundle size | Quan trọng (LCP) | Không quan trọng (đăng nhập 1 lần, ở cả ngày) |
| Onboarding | Phải tự hiểu ngay | Có thể học một lần rồi thuộc |
| Keyboard shortcut | Không cần | **Cần** |
| Ảnh lớn | Trung tâm | Chỉ là thumbnail nhận diện |
| Mobile | Đa số traffic | Có, cho kịch bản kiểm kho tại xưởng |

Hệ quả cụ thể: `--space-*` ở admin nên dùng bậc nhỏ hơn storefront một nấc. Row của bảng cao 44-48px, không 64px. Không có `animate-scale-in` khi mở dialog. Không có hover lift trên card.

---

## 2. Audit — số liệu

Đo trong `frontend/src/{pages,components,layout}/admin`.

### 2.1 Quy mô

| | Số |
|---|---|
| Files `.ts` + `.tsx` | 45 |
| LOC `.tsx` | 8.558 |
| LOC gồm cả `services/admin/*.ts` | 10.183 |
| Pages | 14 |

File lớn nhất:

| File | LOC |
|---|---|
| `pages/admin/AdminDashboardPage.tsx` | **964** |
| `pages/admin/AdminGiftBoxPage.tsx` | **810** |
| `components/admin/vouchers/VoucherForm.tsx` | 514 |
| `pages/admin/AdminBatchCreatePage.tsx` | 511 |
| `pages/admin/AdminAlertsPage.tsx` | 506 |
| `components/admin/products/ProductForm.tsx` | 500 |
| `pages/admin/AdminGiftBoxBomPage.tsx` | 488 |
| `pages/admin/AdminInventoryPage.tsx` | 467 |
| `layout/admin/AdminLayout.tsx` | 453 |
| `services/admin/productService.ts` | 399 |

### 2.2 Debt inventory

| # | Vấn đề | Số liệu | Loại | Severity |
|---|---|---|---|---|
| A1 | **0 pagination** trên toàn bộ 11 bảng | `TablePagination` × **0** | **Functional** | **P0** |
| A2 | **0 sorting** | `TableSortLabel` × **0** | **Functional** | **P0** |
| A3 | **0 bulk select** | `Checkbox` × **0** | **Functional** | **P1** |
| A4 | Fetch toàn bộ dữ liệu về client | `limit: 1000` / `limit: 100` × 4 chỗ | Perf + Functional | **P0** |
| A5 | Backend **không trả total count** (trừ `alerts.py`) | 1/10+ endpoint | Blocker cho A1 | **P0** |
| A6 | Filter/page state không vào URL | `useSearchParams` × **0** | Functional | **P1** |
| A7 | `sx={{...}}` inline | **593 lần** | Perf + Maintainability | **P1** |
| A8 | Hex hardcode | **471 chỗ** | Maintainability | **P1** |
| A9 | MUI không có theme | `createTheme` × **0** | Visual | **P1** |
| A10 | `alert()` native cho lỗi | 3 chỗ, `ProductForm.tsx:113,119,162` | UX | **P1** |
| A11 | Validation không nhất quán | **1/6 form** có `validate()` — chỉ `VoucherForm` | UX | **P1** |
| A12 | Không có unsaved-changes guard | `beforeunload` × **0** | **Mất dữ liệu** | **P1** |
| A13 | `aria-*` / `role=` | **4** trên 45 files | A11y | **P2** |
| A14 | File quá lớn, UI trộn logic + fetch | 9 file > 400 LOC | Maintainability | **P1** |
| A15 | `console.error` thay vì báo cho người dùng | 20 chỗ | UX | **P2** |
| A16 | Responsive breakpoint | 28 lần trên 45 files | Mobile | **P2** |
| A17 | Không có keyboard shortcut | 0 | UX (ops tool) | **P2** |

### 2.3 Bốn phát hiện cần nói rõ

#### A1+A2+A4 — Bảng admin không dùng được với dữ liệu thật

Đây là vấn đề nghiêm trọng nhất của admin, và nó **không phải vấn đề UI**.

```bash
$ grep -rn "TablePagination" frontend/src/{pages,components}/admin | wc -l
0
$ grep -rn "TableSortLabel\|onSort\|sortBy" frontend/src/{pages,components}/admin | wc -l
0
$ grep -rn "limit: 1000" frontend/src/services/admin/productService.ts
58:      limit: 1000, // Get all products
```

11 bảng, không bảng nào có phân trang hay sắp xếp. `services/admin/productService.ts:58` fetch **1000 sản phẩm** một lần rồi render hết.

Kịch bản thật với một bakery đang hoạt động:

- 200 sản phẩm × 3 biến thể = 600 dòng trong `AdminProductPage`
- Mỗi lô hàng là một dòng trong `AdminInventoryPage` → sau 6 tháng có hàng nghìn lô
- `AdminStockLedgerPage` là sổ nhật ký — nó **chỉ tăng**, không bao giờ giảm

Với 600 dòng: DOM có ~5.400 cell, mỗi cell là một MUI `TableCell` với `sx` object riêng. Trang sẽ mất vài giây để render và scroll bị giật. Với vài nghìn dòng thì không mở được.

Và ngay cả khi nó render được: **nhân viên không thể tìm thấy gì.** Không sort theo ngày hết hạn → không biết lô nào cần xử lý trước. Không sort theo tồn kho → không biết cái nào sắp hết. Không phân trang → phải scroll qua 600 dòng.

Đây là lý do t xếp lại ưu tiên: bỏ 15 ngày đổi MUI sang Radix trong khi bakery không lọc nổi danh sách sản phẩm là sai thứ tự.

#### A5 — Pagination thật bị chặn bởi backend

Backend **có** `skip`/`limit` trên hầu hết endpoint:

```
app/routers/batches.py:249    skip: int = Query(0, ge=0)
                       :250    limit: int = Query(100, ge=1, le=1000)
app/routers/orders.py:130     skip / limit
app/routers/gift_boxes.py:98  skip / limit
app/routers/components.py:27  skip / limit
app/routers/inventory_trace.py:69  skip / limit
```

Nhưng **không endpoint nào trả tổng số dòng**, trừ `alerts.py:53` (`total: int`).

Không có total count thì không hiển thị được "Trang 3 / 24" hay "601-650 của 1.183". Chỉ làm được "Tải thêm" — kém hơn nhiều cho ops tool, vì nhân viên cần nhảy tới trang cụ thể và cần biết quy mô dữ liệu.

**Cũng không endpoint nào có `sort_by` / `sort_dir`.** Sort ở client chỉ đúng khi đã fetch hết — mà fetch hết là đúng cái ta đang muốn bỏ.

Nghĩa là: **A1 và A2 không sửa được bằng frontend một mình.** Giống D14 ở storefront. Chi tiết yêu cầu backend ở spec 10 §3.

#### A7 — 593 `sx` là debt về performance, không chỉ về maintainability

`components/admin/products/ProductTable.tsx:44-53` — cùng một object style lặp **10 lần**:

```tsx
<TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Hình ảnh</TableCell>
<TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Tên</TableCell>
<TableCell sx={{ fontWeight: 600, color: '#7A6F63', fontSize: '0.8125rem', py: 2, letterSpacing: '0.3px' }}>Mô tả</TableCell>
... 7 dòng nữa giống hệt
```

Ba vấn đề, theo mức độ nghiêm trọng:

1. **Object literal mới mỗi lần render.** `sx={{...}}` tạo object mới → emotion phải serialize lại và so cache theo nội dung. Với bảng 600 dòng × 9 cell, đó là 5.400 object mỗi lần re-render. Đây là nguyên nhân thật của cảm giác "admin chậm", không phải do React.
2. **Đổi màu header bảng = sửa 10 chỗ trong 1 file × 11 file.** Không ai làm đúng hết.
3. **`color: '#7A6F63'`** — hex hardcode, và đây chính là màu `text-secondary` cũ đã fail contrast (spec 01 §1: 4.66:1, headroom 0.16). Nó đang được copy vào 593 chỗ.

Fix bằng `createTheme` + `styleOverrides` cho `MuiTableCell` (spec 12) → 593 `sx` thu về còn vài chục, và object style được tạo **một lần** ở tầng theme.

#### A12 — Không có unsaved-changes guard: đây là mất dữ liệu thật

```bash
$ grep -rn "beforeunload" frontend/src/{pages,components,layout}/admin
# (0 kết quả)
```

`VoucherForm.tsx` có 514 dòng và ~8 field. `AdminBatchCreatePage.tsx` có 511 dòng — form tạo lô hàng, nhập tay ngày sản xuất, ngày hết hạn, số lượng, nhà cung cấp, giá nhập.

Nhân viên nhập nửa form, bấm sai vào một link ở sidebar, hoặc đóng tab → **mất hết, không cảnh báo gì**. Với form nhập lô hàng (việc làm nhiều lần mỗi ngày), đây là loại lỗi khiến người dùng mất tin cậy vào tool.

Đây là loại vấn đề chỉ phát hiện được khi nghĩ về người dùng thật, không phát hiện được bằng cách đọc code tìm anti-pattern.

### 2.4 Ba chỗ t đã đoán sai ở spec 08 và phải sửa

Ghi ra để không ai làm theo bản cũ.

| Claim ở spec 08 §2 phase 7 | Thực tế | Nguồn |
|---|---|---|
| "Mobile: stacked card, **không scroll ngang**" — hàm ý mobile admin đang vỡ | **AdminLayout ĐÃ CÓ mobile drawer.** `AdminLayout.tsx:55` `mobileOpen`, `:283` `display:{md:'none'}` hamburger, `:383` Drawer | đọc code |
| "Thay MUI Table → TanStack Table headless" | MUI Table đang cung cấp `<th scope="col">` **miễn phí**. Bỏ = phải tự viết lại a11y bảng cho 11 bảng | MUI render `TableCell` trong `TableHead` thành `th` qua `TableContext` |
| Ngụ ý admin cần bỏ MUI như storefront | Chi phí/lợi ích ngược hẳn. Xem §3 | audit này |

Điểm 2 quan trọng: nếu đã bỏ MUI rồi mới nhận ra, sẽ phải viết lại a11y bảng mà không có ai nhắc — và đó là loại lỗi im lặng.

---

## 3. Quyết định: giữ MUI ở admin, thêm theme

**Sửa lại spec 00 §2.1.** Bản đầu viết "bỏ MUI hoàn toàn". Đúng cho storefront, sai cho admin.

### 3.1 So sánh có số

| Tiêu chí | Bỏ MUI → TanStack + Radix | **Giữ MUI + theme** |
|---|---|---|
| Ngày làm | ~15 | **~4** |
| File phải sửa | 45 | 11 (theme + 11 bảng đổi `sx` → theme) |
| Nhất quán thị giác với storefront | Tuyệt đối | Cao (cùng token) |
| A11y bảng | **Phải tự viết lại** `th`/`scope`/`caption`/`aria-sort` × 11 bảng | MUI lo |
| Bundle admin | −135KB | Không đổi |
| Bundle **storefront** | Không đổi (đã tách chunk) | Không đổi |
| Rủi ro hồi quy | Cao — 45 file, gồm form nhập lô hàng | Thấp — chủ yếu đổi màu |
| Giải quyết A1-A6 (pagination/sort/bulk) | Không. Đó là việc riêng | Không. Đó là việc riêng |

Dòng cuối là điểm quyết định: **đổi library không giải quyết vấn đề lớn nhất của admin.** Cả hai phương án đều phải làm pagination/sort/bulk riêng. Nên câu hỏi thực sự là "bỏ 15 ngày hay 4 ngày cho phần visual", không phải "phương án nào tốt hơn về kiến trúc".

### 3.2 Đánh đổi phải chấp nhận

Nói thẳng cái mất:

- **Hai design system cùng tồn tại vĩnh viễn.** Storefront Tailwind+Radix, admin MUI. Ranh giới là thư mục `admin/`, được ESLint enforce (spec 00 §2.5).
- **Bundle admin vẫn ~135KB nặng hơn cần thiết.** Chấp nhận vì admin là internal tool, 2-3 người, đăng nhập một lần.
- **Emotion runtime vẫn chạy ở admin.** Nhưng sau khi bỏ 593 `sx` → theme, chi phí serialize giảm mạnh (đó là phần đắt, không phải bản thân emotion).
- **Hai bộ icon.** `@mui/icons-material` ở admin, `lucide-react` ở storefront. Chấp nhận — thay 31 file icon không đáng.
- **Trên CV không kể được "một design system duy nhất".** Nhưng kể được câu tốt hơn: *"chọn giữ MUI ở admin vì bỏ nó tốn 15 ngày để giải quyết một vấn đề nhỏ hơn vấn đề đang có"* — đó là câu trả lời của người biết ưu tiên, không phải người thích công nghệ mới.

Điểm cuối là thật: recruiter đánh giá cao khả năng **không** refactor hơn là khả năng refactor.

### 3.3 Điều kiện để quyết định này còn đúng

Quyết định này dựa trên "admin là internal tool cho 2-3 người". Nó **sai** nếu:

- Admin trở thành SaaS multi-tenant cho nhiều bakery → bundle và visual nhất quán quan trọng lại
- Cần dùng admin trên mạng 3G ở ngoài xưởng thường xuyên → 135KB thành vấn đề
- Số người dùng admin lên hàng chục → onboarding và nhất quán quan trọng hơn

Ghi vào ADR để người sau biết khi nào phải xem lại.

---

## 4. Chia phase: 7a chức năng → 7b visual

### Phase 7a — Chức năng (~3 ngày)

Sau 7a, admin **dùng được với dữ liệu thật**. Chưa đẹp, nhưng làm được việc.

| Việc | Spec | Debt |
|---|---|---|
| Backend: trả total count + `sort_by`/`sort_dir` | 10 §3 | A5 |
| `DataTable` dùng chung: pagination, sort, bulk, density, sticky header | 10 §4 | A1 A2 A3 |
| Bỏ `limit: 1000` → server paging thật | 10 §5 | A4 |
| Filter/page/sort vào URL | 10 §6 | A6 |
| Áp `DataTable` cho 11 bảng | 10 §7 | — |
| Unsaved-changes guard cho form | 11 §4 | A12 |
| Bỏ 3 `alert()` → toast/inline | 11 §2 | A10 |
| Chuẩn hoá validation form | 11 §3 | A11 |
| Tách `AdminDashboardPage` 964 → ~150 | 13 §2 | A14 |
| Tách `AdminGiftBoxPage` 810 → ~180 | 13 §3 | A14 |
| Keyboard shortcut cơ bản | 13 §8 | A17 |

### Phase 7b — Visual (~4 ngày)

| Việc | Spec | Debt |
|---|---|---|
| `createTheme` map sang `tokens.css` | 12 §2 | A9 |
| `styleOverrides` cho MuiTableCell, MuiButton, MuiTextField, MuiPaper, MuiDialog… | 12 §3 | A7 |
| Xoá 593 `sx` → còn < 60 | 12 §4 | A7 |
| Xoá 471 hex → 0 | 12 §4 | A8 |
| Xoá `legacy-*` alias | 12 §5 | — |
| AdminLayout: mật độ, sidebar state bền, breadcrumb | 13 §7 | — |
| Chart đổi màu sang token | 13 §6 | — |
| A11y: `aria-sort`, `caption`, live region | 10 §8 | A13 |

**Quy tắc: 7a xong hẳn (gate pass) mới sang 7b.** Lý do: nếu làm visual trước, sẽ style những bảng rồi bị viết lại ở 7a → làm hai lần.

---

## 5. Thứ tự trong toàn bộ roadmap

```
Storefront:  0 → 1 → 2 → 3 → 5 → 4 → 6
                     │
                     └── phase 1 (token) là ĐIỀU KIỆN TIÊN QUYẾT của 7b
                         (theme MUI map sang chính token đó)

Admin:       7a (chức năng)  ──→  7b (visual)
             │
             └── KHÔNG phụ thuộc phase 2-6. Làm song song được với storefront
                 nếu có 2 người.

Cuối:        8 (dọn dẹp)
```

**7a độc lập với storefront hoàn toàn** — nó chỉ chạm `admin/` và backend. Nếu chỉ có một mình, có thể chen 7a vào bất cứ đâu sau phase 0.

**7b phụ thuộc phase 1** vì theme MUI map sang `tokens.css`.

### Nếu chỉ có thời gian làm một việc trong admin

Làm **A1+A2 (pagination + sort)** cho `AdminInventoryPage` và `AdminStockLedgerPage`. Hai bảng đó tăng vô hạn theo thời gian và là chỗ vỡ trước tiên.

---

## 6. Files phải sửa — tổng quan

Chi tiết trong spec 10-13. Đây là bản đồ.

### Backend
| File | Việc | Phase |
|---|---|---|
| `app/routers/products.py`, `batches.py`, `gift_boxes.py`, `orders.py`, `components.py`, `inventory_trace.py` | Trả total count + `sort_by`/`sort_dir` | 7a |
| `app/schemas.py` | Generic `Page[T]` wrapper | 7a |

### Frontend — tạo mới
| File | Nội dung | Phase |
|---|---|---|
| `src/components/admin/ui/data-table.tsx` | Bảng dùng chung | 7a |
| `src/components/admin/ui/data-table-toolbar.tsx` | Search + filter + bulk action bar | 7a |
| `src/components/admin/ui/data-table-pagination.tsx` | | 7a |
| `src/hooks/admin/useDataTableState.ts` | page/sort/filter ↔ URL | 7a |
| `src/hooks/admin/useUnsavedChanges.ts` | Guard | 7a |
| `src/hooks/admin/useAdminShortcuts.ts` | Keyboard | 7a |
| `src/theme/admin-theme.ts` | `createTheme` | 7b |
| `src/theme/admin-components.ts` | `styleOverrides` | 7b |

### Frontend — sửa
| File | Việc | Phase |
|---|---|---|
`components/admin/{products/ProductTable,sales/SalesTable,preorders/PreOrderTable,vouchers/VoucherTable}.tsx` | Dùng `DataTable` | 7a |
| `pages/admin/{AdminInventoryPage,AdminStockLedgerPage,AdminAlertsPage,AdminBatchTracePage,AdminGiftBoxPage}.tsx` | Dùng `DataTable` | 7a |
| `components/admin/products/ProductForm.tsx` | Bỏ `alert()`, thêm validation + guard | 7a |
| `components/admin/vouchers/VoucherForm.tsx` | Chuẩn hoá + guard | 7a |
| `pages/admin/AdminBatchCreatePage.tsx` | Guard + tách | 7a |
| `pages/admin/AdminDashboardPage.tsx` | Tách 964 → ~150 | 7a |
| `pages/admin/AdminGiftBoxPage.tsx` | Tách 810 → ~180 | 7a |
| `services/admin/*.ts` | Bỏ `limit: 1000`, nhận `Page<T>` | 7a |
| `layout/admin/AdminLayout.tsx` | Theme + mật độ + breadcrumb | 7b |
| `App.tsx` | Bọc `<ThemeProvider>` cho route `/admin` | 7b |
| 11 bảng + 8 form | `sx` → theme | 7b |

---

## 7. Acceptance criteria — mức spec (chi tiết ở 10-13)

### Phase 7a
- [ ] Seed **1.000 sản phẩm** vào DB → `AdminProductPage` mở trong **< 2s**, scroll mượt
- [ ] Network: mở bảng → request có `skip`/`limit`/`sort_by`, **không** có `limit=1000`
- [ ] Sort theo ngày hết hạn ở `AdminInventoryPage` → thứ tự đúng, và là **server-side** (kiểm bằng Network)
- [ ] Pagination hiện "1-50 của 1.000", nhảy tới trang 12 được
- [ ] Bulk select 5 dòng → thanh action hiện, thao tác chạy trên đúng 5 dòng
- [ ] Đổi filter/page/sort → URL đổi; copy URL mở tab mới → đúng trạng thái
- [ ] Nhập nửa form `AdminBatchCreatePage`, bấm link sidebar → **có cảnh báo**
- [ ] `grep -rn "[^.a-zA-Z]alert(" src/components/admin src/pages/admin` → **0**
- [ ] `AdminDashboardPage` ≤ 200 dòng, `AdminGiftBoxPage` ≤ 250 dòng
- [ ] Mọi form có validation theo field, không có form nào chỉ `console.error`

### Phase 7b
- [ ] `grep -c "sx={{" -r src/{pages,components,layout}/admin` → **< 60** (từ 593)
- [ ] `grep -rno "#[0-9a-fA-F]\{6\}" src/{pages,components,layout}/admin` → **0** (từ 471)
- [ ] `grep -rn "legacy-" src` → **0**
- [ ] `createTheme` tồn tại và `ThemeProvider` bọc route admin
- [ ] Mở admin: font, màu primary, radius **khớp** brand Soft Craft, không còn Roboto/`#1976d2`
- [ ] Bảng có `aria-sort` trên cột đang sort
- [ ] `npm run check:contrast` vẫn PASS
- [ ] Screenshot so sánh trước/sau 4 trang admin

---

## TL;DR

- **Sửa lại quyết định ở spec 00: giữ MUI ở admin, thêm theme.** Bỏ MUI = ~15 ngày + phải tự viết lại a11y bảng cho 11 bảng (MUI đang cho `<th scope="col">` miễn phí). Giữ + theme = ~4 ngày. Và **cả hai phương án đều không giải quyết** vấn đề lớn nhất của admin.
- **Vấn đề lớn nhất của admin không phải visual:** **0 pagination, 0 sorting, 0 bulk select** trên toàn bộ 11 bảng, và `limit: 1000` fetch hết về client. Bakery có 200 sản phẩm × 3 biến thể = 600 dòng → không tìm được gì, không sort được theo ngày hết hạn.
- **A1/A2 bị chặn bởi backend:** có `skip`/`limit` nhưng **không trả total count** (trừ `alerts.py`) và **không có `sort_by`**. Giống D14 ở storefront — không sửa được bằng frontend một mình.
- **593 `sx` là debt về performance,** không chỉ maintainability: object literal mới mỗi render × 5.400 cell. Đây là nguyên nhân thật của "admin chậm". Và nó đang copy màu `#7A6F63` — chính màu đã fail contrast — vào 593 chỗ.
- **Không có unsaved-changes guard.** Form nhập lô hàng 511 dòng, bấm sai một link là mất hết. Loại lỗi chỉ thấy khi nghĩ về người dùng thật.
- **T đã đoán sai 3 chỗ ở spec 08** và đã sửa: AdminLayout **đã có** mobile drawer; MUI Table **đang lo** a11y bảng; chi phí/lợi ích bỏ MUI ở admin **ngược** với storefront.
- Chia **7a (chức năng, ~3 ngày) → 7b (visual, ~4 ngày)**. 7a độc lập với storefront hoàn toàn.
- Nếu chỉ làm được một việc: pagination + sort cho `AdminInventoryPage` và `AdminStockLedgerPage` — hai bảng tăng vô hạn theo thời gian.
