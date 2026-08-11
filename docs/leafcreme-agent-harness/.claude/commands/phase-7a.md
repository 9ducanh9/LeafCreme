---
description: Thực thi Phase 7a — Admin CHỨC NĂNG
---

# Phase 7a — Admin: chức năng

Spec: `docs/ui-redesign/09-admin-audit-and-strategy.md`, `10-admin-data-tables.md`, `11-admin-forms.md`, `13-admin-pages.md`

**Phase này ĐỘC LẬP với storefront** — chỉ chạm `admin/` và backend. Không cần chờ phase 2-6.

---

## Bước 0 — Trước khi viết code

1. Đọc `CLAUDE.md` toàn bộ. Luật §1 là cứng.
2. Đọc **spec 09 §3** trước tiên: quyết định ở spec 00 ("bỏ MUI hoàn toàn") **đã được sửa lại**. MUI **ở lại admin**, có theme. Đừng bỏ MUI ở admin.
3. Đọc spec 09 §2.4 — 3 chỗ spec 08 đoán sai và đã sửa.
4. `git checkout -b redesign/phase-7a`

---

## Việc phải làm — theo thứ tự

### Backend trước (chặn frontend)
- [ ] `Page[T]` generic trong `app/schemas.py` (spec 10 §3.1) — `total` đếm theo **filter**, không phải cả bảng
- [ ] Sort **Enum + SORT_MAP**, không nhận `sort_by: str` (spec 10 §3.2) — `getattr(Model, sort_by)` là SQL injection
- [ ] **Tie-breaker** `ORDER BY col, id ASC` cho **mọi** order_by — không có thì phân trang cho dòng trùng/mất
- [ ] `?paginated=true` để `GET /products` không vỡ storefront (spec 10 §3.4)
- [ ] `tests/test_pagination.py` — gồm test 100 dòng cùng `ngay_het_han` → 4 trang cho **100 id duy nhất**
- [ ] `model_validator` cho `ngay_het_han >= ngay_san_xuat`, `so_luong > 0` (spec 11 §3.3)
- [ ] Bỏ `rows.sort()` ở Python trong `inventory_trace.py:115`

### DataTable
- [ ] `DataTable` + toolbar + pagination (spec 10 §4). `caption` là **required prop**
- [ ] `useDataTableState` — state vào URL, `replace: true`, có `key` namespace (spec 10 §5)
- [ ] Bỏ `limit: 1000` ở `productService.ts:58`, `limit: 100` ở `preOrderService.ts:69`, bỏ `.sort()` ở `:114`
- [ ] Áp `DataTable` theo thứ tự **tốc độ tăng dữ liệu**: StockLedger → Inventory → Sales → BatchTrace → còn lại
- [ ] `AdminStockLedgerPage` **read-only** — bỏ nút sửa/xoá nếu có
- [ ] **KHÔNG** bulk delete trên bảng lô hàng
- [ ] Sort mặc định theo nghiệp vụ (spec 10 §4.2): inventory `ngay_het_han asc`, ledger `timestamp desc`, pre-order `ngay_giao_du_kien asc`

### Form
- [ ] `useAdminForm` (spec 11 §2.1) — trích từ `VoucherForm.tsx:131`, đó là mẫu tốt sẵn có
- [ ] `useUnsavedChanges` — **cả** `beforeunload` **và** `useBlocker` (spec 11 §4)
- [ ] `validateBatch` 3 tầng + unit test (spec 11 §3) — có case biên "hết hạn = hôm nay" phải **chấp nhận**
- [ ] Bỏ 3 `alert()` ở `ProductForm.tsx:113,119,162` — thông báo phải nêu **số MB cụ thể**
- [ ] Áp validation cho cả 6 form

### Tách file
- [ ] `AdminDashboardPage` 964 → ≤ 200; `StatCard` 1 định nghĩa dùng 4 lần; 6 state độc lập
- [ ] `AdminGiftBoxPage` 810 → ≤ 250; BOM editor dùng chung với `AdminGiftBoxBomPage`
- [ ] `AdminInventoryPage` 467 → ≤ 150; `AdminAlertsPage` 506 → ≤ 250; `AdminBatchCreatePage` 511 → ≤ 220

### Layout + shortcut
- [ ] Nav nhóm 4 cụm (spec 13 §7.1); `Batch trace` → `Truy vết lô`; `Đơn hàng`/`Bán hàng` → `Đơn đặt trước`/`Bán tại quầy`
- [ ] Nav dùng `<Link>` không `navigate()`; có `aria-current`
- [ ] Sidebar collapse bằng **nút** + `localStorage`, **bỏ hover** (`AdminLayout.tsx:74`)
- [ ] `AdminPage` với breadcrumb + đúng 1 `h1` + `document.title`
- [ ] `useAdminShortcuts` — **phải** check focus đang ở input, và có `?` mở danh sách

---

## Lưu ý riêng

- **Đừng bỏ MUI.** Spec 09 §3: bỏ = ~15 ngày + phải tự viết lại a11y bảng cho 11 bảng. MUI đang cho `<th scope="col">` miễn phí.
- **Nguyên tắc admin ngược storefront** (spec 09 §1): mật độ cao, whitespace là chi phí, animation gần như không, ít click. Đừng bê thẩm mỹ storefront sang.
- **Không** làm visual/theme trong phase này. Đó là 7b. Làm visual trước sẽ phải style những bảng rồi bị viết lại.
- Nếu backend chưa xong `Page[T]`: **DỪNG và báo**, đừng làm client-side paging tạm — nó sẽ thành debt vĩnh viễn.

---

## Bước cuối

```bash
npm run gate:phase7a
```

Gate đỏ → sửa **CODE**, không sửa gate. Gate xanh → báo cáo theo `CLAUDE.md` §5 + liệt kê manual check `docs/MANUAL-CHECKS.md` §7a → **DỪNG**.

**KHÔNG** tự chạy `/phase-7b`.
