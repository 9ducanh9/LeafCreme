# Spec 10 — Admin DataTable: pagination, sort, bulk, URL state

> Phase 7a. Đây là spec quan trọng nhất của admin — nó biến admin từ "không dùng được với dữ liệu thật" thành "dùng được".
> Cần **backend thay đổi** (§3). Không làm được bằng frontend một mình.

---

## 1. Hiện trạng

### 1.1 Số liệu

```bash
$ grep -rn "TablePagination"           frontend/src/{pages,components}/admin | wc -l   # 0
$ grep -rn "TableSortLabel|onSort"     frontend/src/{pages,components}/admin | wc -l   # 0
$ grep -rn "Checkbox"                  frontend/src/{pages,components}/admin | wc -l   # 0
$ grep -rn "useSearchParams"           frontend/src/{pages,components}/admin | wc -l   # 0
$ grep -rn "limit: 1000|limit: 100"    frontend/src/{services,pages,components}/admin  # 4
```

### 1.2 11 bảng, không bảng nào có pagination/sort

| File | Nội dung | Tăng theo thời gian? |
|---|---|---|
| `components/admin/products/ProductTable.tsx` | Biến thể sản phẩm | Chậm |
| `components/admin/sales/SalesTable.tsx` | Đơn hàng | **Nhanh** |
| `components/admin/preorders/PreOrderTable.tsx` | Pre-order | **Nhanh** |
| `components/admin/vouchers/VoucherTable.tsx` | Voucher | Chậm |
| `pages/admin/AdminInventoryPage.tsx` | Tồn kho theo lô | **Nhanh** |
| `pages/admin/AdminStockLedgerPage.tsx` | Sổ nhật ký kho | **Chỉ tăng, không bao giờ giảm** |
| `pages/admin/AdminAlertsPage.tsx` | Cảnh báo | Nhanh |
| `pages/admin/AdminBatchTracePage.tsx` | Truy vết lô | **Nhanh** |
| `pages/admin/AdminGiftBoxPage.tsx` | Hộp quà | Chậm |
| `components/admin/preorders/PreOrderDetailCard.tsx` | Chi tiết (bảng nhỏ) | Không |
| `components/admin/sales/SalesDetailCard.tsx` | Chi tiết (bảng nhỏ) | Không |

**Ưu tiên áp `DataTable`:** `AdminStockLedgerPage` → `AdminInventoryPage` → `SalesTable` → `AdminBatchTracePage` → còn lại. Cột "tăng theo thời gian" quyết định thứ tự, không phải LOC.

`AdminStockLedgerPage` là sổ nhật ký — mỗi lần nhập/xuất/điều chỉnh kho là một dòng. Nó **chỉ tăng**. Sau một năm hoạt động sẽ có hàng chục nghìn dòng. Đây là bảng vỡ trước tiên.

### 1.3 Vì sao "sort ở client" không phải giải pháp

Có thể nghĩ: cứ fetch hết rồi sort/filter bằng JS. Ba vấn đề:

1. Fetch 10.000 dòng ledger về client là chính cái ta đang muốn bỏ.
2. `preOrderService.ts:114` **đã** sort ở client. Nó chỉ đúng vì `limit: 100` — tức là đang sort trên tập đã bị cắt. Sort trên 100 dòng đầu rồi hiển thị không phải sort thật.
3. Với server paging, sort ở client sẽ sort **trong trang hiện tại** — nhân viên bấm sort cột "ngày hết hạn" ở trang 1 và tưởng đã thấy lô hết hạn sớm nhất, thực tế nó nằm ở trang 7. **Đây là loại sai âm thầm dẫn tới quyết định vận hành sai** — với sản phẩm perishable thì nó nghĩa là bỏ sót lô cần xử lý.

Điểm 3 là lý do sort **phải** ở server, không phải tuỳ chọn.

---

## 2. Nguyên tắc thiết kế bảng cho ops tool

| Nguyên tắc | Vì sao | Cụ thể |
|---|---|---|
| Row cao 44-48px, không 64px | Nhìn được nhiều dòng hơn trong 1 màn hình | `density: 'compact' \| 'normal'`, mặc định `normal` = 48px |
| Header **sticky** | Scroll 50 dòng mà không biết cột nào là gì thì vô dụng | `position: sticky; top: 0` |
| Số liệu **canh phải + tabular-nums** | Cột số không thẳng thì không so sánh được bằng mắt | `align="right"` + `fontVariantNumeric` |
| Cột hành động **cố định bên phải** | Bảng 9 cột scroll ngang, nút Sửa/Xoá không được biến mất | `position: sticky; right: 0` |
| Trạng thái = màu **+ text** | WCAG 1.4.1, và nhân viên in ra giấy đen trắng | Chip có label |
| Không truncate im lặng | Tên sản phẩm bị cắt mà không biết là bực | `title` attr hoặc Tooltip |
| Click dòng = mở chi tiết | Giảm click; nhưng phải có cả nút rõ ràng | Row click + nút "Xem" |
| Empty state phân biệt 2 loại | "Chưa có dữ liệu" ≠ "Không khớp filter" — hành động khác nhau | §4.6 |
| Giữ nguyên vị trí sau khi sửa | Sửa dòng 37 rồi nhảy về đầu bảng là mất chỗ | Không reset page sau mutation |

Điểm cuối hay bị bỏ: sau khi sửa một dòng, đừng `setPage(0)`. Nhân viên đang ở trang 4 làm việc.

---

## 3. Backend: bắt buộc thay đổi trước

### 3.1 Wrapper `Page[T]`

`app/schemas.py`:

```python
from typing import Generic, TypeVar, List
from pydantic import BaseModel

T = TypeVar('T')

class Page(BaseModel, Generic[T]):
    """Bọc kết quả phân trang. Không có `total` thì frontend không hiển thị được
    'Trang 3/24' hay 'nhảy tới trang cuối' — chỉ làm được 'Tải thêm', kém hơn
    nhiều cho ops tool."""
    items: List[T]
    total: int          # tổng số dòng KHỚP FILTER, không phải tổng bảng
    skip: int
    limit: int
```

**`total` phải là số dòng khớp filter**, không phải `COUNT(*)` của cả bảng. Nếu trả tổng bảng, pagination sẽ hiện 24 trang trong khi filter chỉ ra 3 trang.

### 3.2 Sort tường minh — allowlist, không nhận cột tự do

```python
from enum import Enum
from fastapi import Query, HTTPException

class BatchSortField(str, Enum):
    """Allowlist cột được sort. KHÔNG nhận string tự do từ client —
    truyền thẳng vào order_by là SQL injection."""
    ngay_het_han = "ngay_het_han"
    ngay_san_xuat = "ngay_san_xuat"
    so_luong_hien_tai = "so_luong_hien_tai"
    ngay_tao = "ngay_tao"

SORT_MAP = {
    BatchSortField.ngay_het_han:      LoHangSanPham.ngay_het_han,
    BatchSortField.ngay_san_xuat:     LoHangSanPham.ngay_san_xuat,
    BatchSortField.so_luong_hien_tai: TonKhoSanPham.so_luong_hien_tai,
    BatchSortField.ngay_tao:          LoHangSanPham.ngay_tao,
}

@router.get("/products", response_model=Page[ProductBatchResponse])
def list_product_batches(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    sort_by: BatchSortField = Query(BatchSortField.ngay_het_han),
    sort_dir: Literal["asc", "desc"] = Query("asc"),
    db: Session = Depends(get_db),
):
    col = SORT_MAP[sort_by]
    order = col.asc() if sort_dir == "asc" else col.desc()

    base = select(...).where(...)          # điều kiện filter

    total = db.execute(
        select(func.count()).select_from(base.subquery())
    ).scalar_one()

    items = db.execute(
        base.order_by(order, LoHangSanPham.lohang_id.asc())   # ← tie-breaker
             .offset(skip).limit(limit)
    ).all()

    return Page(items=items, total=total, skip=skip, limit=limit)
```

**Ba chi tiết dễ sai:**

1. **Enum thay vì `str`.** Nhận `sort_by: str` rồi `getattr(Model, sort_by)` là lỗ hổng. Enum cho FastAPI validate và tự sinh docs.
2. **Tie-breaker bắt buộc.** `ORDER BY ngay_het_han` với nhiều lô cùng ngày → thứ tự **không xác định** giữa các query. Hệ quả: phân trang bị **trùng dòng ở trang này và mất dòng ở trang khác**. Phải thêm `, id ASC`. Đây là bug kinh điển của offset pagination và rất khó phát hiện — nhân viên chỉ thấy "sao dòng này biến mất".
3. **`limit` mặc định 50, max 200.** Đừng để `le=1000` — nó mời gọi quay lại `limit: 1000`.

### 3.3 Endpoint cần đổi

| File | Endpoint | Sort field đề xuất |
|---|---|---|
| `app/routers/batches.py:247` | `GET /batches/products` | `ngay_het_han`, `ngay_san_xuat`, `so_luong_hien_tai`, `ngay_tao` |
| `app/routers/batches.py:446` | `GET /batches/components` | như trên |
| `app/routers/batches.py:622` | `GET /batches/gift-boxes` | như trên |
| `app/routers/products.py:117` | `GET /products` | `ten`, `gia_co_ban`, `danh_muc`, `ngay_tao`, `tong_kha_dung` |
| `app/routers/orders.py:130` | `GET /orders` | `ngay_tao`, `tien_thanh_toan`, `trang_thai`, `ngay_giao_du_kien` |
| `app/routers/gift_boxes.py:98` | `GET /gift-boxes` | `ten`, `gia`, `ngay_tao` |
| `app/routers/components.py:27` | `GET /components` | `ten`, `ngay_tao` |
| `app/routers/inventory_trace.py:69` | ledger | `timestamp`, `loai_giao_dich` |
| `app/routers/alerts.py:76` | alerts | `muc_do`, `ngay_tao` — **đã có `total`**, chỉ cần thêm sort |

`inventory_trace.py:115` đang `rows.sort(...)` ở Python sau khi query — chuyển vào `ORDER BY`.

### 3.4 Backward compatibility

Đổi `List[T]` → `Page[T]` là **breaking change** cho mọi caller. Có storefront gọi endpoint nào trong danh sách trên không?

```bash
grep -rn "getProducts\|/products" frontend/src --include=*.ts | grep -v admin
```

`GET /products` được storefront dùng (spec 04). Hai lựa chọn:

- **A (khuyến nghị):** thêm query param `?paginated=true`. Không có param → trả `List[T]` như cũ. Storefront không đổi, admin dùng param mới. Xoá nhánh cũ sau khi storefront cũng chuyển.
- **B:** đổi luôn, sửa cả storefront cùng lúc. Rủi ro cao hơn, và phase 7a đang muốn độc lập với storefront.

**Chọn A.** Ghi `# TODO: xoá nhánh không-paginated sau khi storefront chuyển` để không thành debt vĩnh viễn.

### 3.5 Test bắt buộc

```python
def test_pagination_khong_trung_khong_mat_dong(client, seed_100_batches_same_expiry):
    """100 lô CÙNG ngay_het_han → phân trang 4 trang × 25 phải cho đúng 100 id
    duy nhất. Không có tie-breaker thì test này FAIL."""
    seen = []
    for skip in (0, 25, 50, 75):
        r = client.get(f"/batches/products?skip={skip}&limit=25&sort_by=ngay_het_han")
        seen += [i["lohang_id"] for i in r.json()["items"]]
    assert len(seen) == 100
    assert len(set(seen)) == 100, "Có dòng trùng hoặc bị mất giữa các trang"

def test_total_dem_theo_filter_khong_phai_ca_bang(client, seed):
    r = client.get("/batches/products?limit=10&trang_thai=con_hang")
    assert r.json()["total"] == count_matching_filter(...)

def test_sort_by_khong_nhan_cot_tu_do(client):
    r = client.get("/batches/products?sort_by=lohang_id;DROP TABLE")
    assert r.status_code == 422
```

Test đầu là quan trọng nhất — nó bắt bug tie-breaker mà mắt người không thấy.

---

## 4. `DataTable` component

### 4.1 API

```tsx
// src/components/admin/ui/data-table.tsx
export interface Column<T> {
  /** Khớp với enum sort_by ở backend. undefined = cột không sort được. */
  id: string
  label: string
  /** Render cell. Nhận cả row để làm cell phức hợp. */
  render: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
  /** Số liệu → tabular-nums + canh phải */
  numeric?: boolean
  sortable?: boolean
  width?: number | string
  /** Ẩn ở breakpoint nhỏ. Cột nào không thiết yếu thì ẩn thay vì scroll ngang. */
  hideBelow?: 'sm' | 'md' | 'lg'
  /** Nội dung dùng cho mobile card view (§4.5) */
  mobileLabel?: string
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string | number

  /** Server-side. total từ Page<T>. */
  total: number
  page: number
  pageSize: number
  onPageChange: (p: number) => void
  onPageSizeChange: (s: number) => void

  sortBy?: string
  sortDir?: 'asc' | 'desc'
  onSortChange: (by: string, dir: 'asc' | 'desc') => void

  /** Bulk select. Bỏ trống = tắt tính năng. */
  selectedIds?: Set<string | number>
  onSelectionChange?: (ids: Set<string | number>) => void
  bulkActions?: React.ReactNode

  status: 'loading' | 'error' | 'success'
  error?: Error | null
  onRetry?: () => void

  /** Phân biệt "chưa có dữ liệu" vs "không khớp filter" — §4.6 */
  hasActiveFilters?: boolean
  emptyState?: React.ReactNode
  noResultsState?: React.ReactNode

  onRowClick?: (row: T) => void
  density?: 'compact' | 'normal'
  /** Cột hành động sticky bên phải */
  rowActions?: (row: T) => React.ReactNode
  /** Cho screen reader: mô tả bảng này chứa gì */
  caption: string
}
```

`caption` là **required**, không optional. Lý do: `<caption>` là cách duy nhất screen reader biết bảng này nói về cái gì khi người dùng nhảy giữa các bảng. Để optional thì không ai truyền.

### 4.2 Header + sort

```tsx
<TableHead>
  <TableRow>
    {selectable && (
      <TableCell padding="checkbox" sx={{ position: 'sticky', left: 0, zIndex: 3 }}>
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected && !allSelected}
          onChange={toggleAll}
          inputProps={{ 'aria-label': 'Chọn tất cả dòng trong trang này' }}
        />
      </TableCell>
    )}

    {visibleColumns.map((col) => (
      <TableCell
        key={col.id}
        align={col.numeric ? 'right' : col.align ?? 'left'}
        // aria-sort: screen reader biết cột nào đang sort và theo chiều nào.
        // Chỉ đặt trên cột ĐANG sort, các cột khác để undefined (không phải 'none').
        aria-sort={sortBy === col.id ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
        sx={{ width: col.width }}
      >
        {col.sortable ? (
          <TableSortLabel
            active={sortBy === col.id}
            direction={sortBy === col.id ? sortDir : 'asc'}
            onClick={() => onSortChange(col.id, sortBy === col.id && sortDir === 'asc' ? 'desc' : 'asc')}
          >
            {col.label}
            {sortBy === col.id && (
              <Box component="span" sx={visuallyHidden}>
                {sortDir === 'desc' ? 'giảm dần' : 'tăng dần'}
              </Box>
            )}
          </TableSortLabel>
        ) : col.label}
      </TableCell>
    ))}

    {rowActions && (
      <TableCell align="right" sx={{ position: 'sticky', right: 0, zIndex: 3 }}>
        Thao tác
      </TableCell>
    )}
  </TableRow>
</TableHead>
```

**`aria-sort` chỉ trên cột đang sort.** Đặt `aria-sort="none"` trên mọi cột khác làm screen reader đọc "none" ở mỗi header — ồn vô ích.

**Mặc định sort của mỗi bảng phải hợp nghiệp vụ**, không phải `ngay_tao desc` cho tất cả:

| Bảng | Sort mặc định | Vì sao |
|---|---|---|
| `AdminInventoryPage` | `ngay_het_han asc` | Lô sắp hết hạn cần xử lý trước — đúng tinh thần FEFO |
| `AdminStockLedgerPage` | `timestamp desc` | Nhật ký: mới nhất trước |
| `SalesTable` | `ngay_tao desc` | Đơn mới cần xử lý |
| `PreOrderTable` | `ngay_giao_du_kien asc` | Đơn giao sớm nhất cần chuẩn bị trước |
| `AdminAlertsPage` | `muc_do desc, ngay_tao desc` | Cảnh báo nặng trước |
| `ProductTable` | `ten asc` | Tìm theo tên là hành vi chính |

Bảng này là phần "hiểu nghiệp vụ" của spec — đừng để agent tự chọn.

### 4.3 Pagination

```tsx
<TablePagination
  component="div"
  count={total}
  page={page}
  onPageChange={(_, p) => onPageChange(p)}
  rowsPerPage={pageSize}
  rowsPerPageOptions={[25, 50, 100, 200]}
  onRowsPerPageChange={(e) => onPageSizeChange(Number(e.target.value))}
  labelRowsPerPage="Số dòng:"
  labelDisplayedRows={({ from, to, count }) =>
    `${from.toLocaleString('vi')}–${to.toLocaleString('vi')} của ${count.toLocaleString('vi')}`
  }
  getItemAriaLabel={(type) =>
    ({ first: 'Trang đầu', last: 'Trang cuối', next: 'Trang sau', previous: 'Trang trước' }[type])
  }
/>
```

**`rowsPerPageOptions` bắt đầu từ 25**, không 5/10. Ops tool: người dùng muốn thấy nhiều, không ít. Có 200 cho trường hợp cần scan nhanh.

**`toLocaleString('vi')`** để `1183` hiện thành `1.183`. Số 4-5 chữ số không có phân cách rất khó đọc nhanh.

**Nhớ `page` là 0-based ở MUI nhưng URL nên là 1-based** (người dùng đọc URL thấy `page=1` cho trang đầu). Chuyển đổi ở `useDataTableState`, không rải khắp component.

### 4.4 Bulk actions

```tsx
{selectedIds.size > 0 && (
  <Toolbar
    // role=region + aria-live: screen reader biết thanh này vừa xuất hiện
    role="region"
    aria-live="polite"
    aria-label="Thao tác hàng loạt"
    sx={{ bgcolor: 'action.selected', borderRadius: 1, mb: 1 }}
  >
    <Typography sx={{ flex: 1 }}>
      Đã chọn {selectedIds.size} dòng
    </Typography>
    {bulkActions}
    <Button size="small" onClick={() => onSelectionChange(new Set())}>Bỏ chọn</Button>
  </Toolbar>
)}
```

**Quy tắc bulk action — quan trọng:**

1. **"Chọn tất cả" chỉ chọn trong trang hiện tại.** Nếu muốn chọn cả 1.183 dòng thì phải là một hành động riêng, tường minh: "Chọn tất cả 1.183 dòng khớp bộ lọc". Trộn hai cái là cách gây ra thao tác hàng loạt trên dữ liệu người dùng không nhìn thấy.
2. **Selection reset khi đổi filter hoặc sort.** Giữ selection qua filter → người dùng chọn 5 dòng, đổi filter, bấm Xoá, và xoá 5 dòng họ không còn thấy.
3. **Hành động phá hoại (xoá) bắt buộc `AlertDialog`** ghi rõ số lượng: *"Xoá 5 lô hàng? Không hoàn tác được."*
4. **Bulk action nào có trong nghiệp vụ này:** xuất Excel (mọi bảng), đổi trạng thái (đơn hàng), huỷ lô (inventory), gia hạn voucher. **Không** làm bulk delete cho lô hàng — lô hàng phải audit được, xoá là mất traceability. Đó là điểm cả project được xây dựng quanh nó.

Điểm 4 là chỗ dễ làm sai nhất: thêm bulk delete vào bảng inventory vì "cho đủ tính năng" sẽ phá vỡ traceability mà FEFO/batch tracking đang bảo đảm.

### 4.5 Mobile

Bảng 9 cột trên 375px là không dùng được, dù MUI `TableContainer` có `overflow-x: auto`.

**Hai tầng xử lý:**

1. **`hideBelow`** — ẩn cột không thiết yếu. `AdminProductPage` trên mobile chỉ cần: ảnh, tên, giá, trạng thái, thao tác (5/9 cột).
2. **Card view dưới `md`** cho bảng thực sự nhiều cột:

```tsx
{isMobile ? (
  <Stack spacing={1} component="ul" sx={{ listStyle: 'none', p: 0 }}>
    {rows.map((row) => (
      <Paper key={getRowId(row)} component="li" sx={{ p: 2 }}>
        {/* Cột đầu làm tiêu đề card */}
        <Typography variant="subtitle2">{columns[0].render(row)}</Typography>
        {/* Còn lại thành dl: nhãn — giá trị */}
        <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 0.5, m: 0, mt: 1 }}>
          {columns.slice(1).filter((c) => !c.hideBelow).map((c) => (
            <React.Fragment key={c.id}>
              <Box component="dt" sx={{ color: 'text.secondary', fontSize: 13 }}>
                {c.mobileLabel ?? c.label}
              </Box>
              <Box component="dd" sx={{ m: 0, fontSize: 14 }}>{c.render(row)}</Box>
            </React.Fragment>
          ))}
        </Box>
        {rowActions && <Box sx={{ mt: 1.5 }}>{rowActions(row)}</Box>}
      </Paper>
    ))}
  </Stack>
) : (
  <TableContainer>...</TableContainer>
)}
```

**Dùng `<dl>`/`<dt>`/`<dd>`, không `<div>`.** Quan hệ nhãn–giá trị là ngữ nghĩa thật, và screen reader đọc đúng cặp.

Kịch bản mobile thật cần hỗ trợ: nhân viên đứng ở kho, mở `AdminInventoryPage` trên điện thoại để kiểm lô nào sắp hết hạn. Nghĩa là mobile view của bảng inventory phải hiện được **tên + ngày hết hạn + số lượng** — ba thứ đó, rõ ràng, không cần scroll ngang.

### 4.6 Empty state — hai loại, khác nhau

```tsx
if (status === 'success' && rows.length === 0) {
  return hasActiveFilters
    ? (noResultsState ?? (
        <Empty
          title="Không có dòng nào khớp bộ lọc"
          action={<Button onClick={clearFilters}>Xoá bộ lọc</Button>}
        />
      ))
    : (emptyState ?? (
        <Empty
          title="Chưa có dữ liệu"
          description="Thêm mục đầu tiên để bắt đầu."
          action={<Button variant="contained" onClick={onCreate}>Thêm mới</Button>}
        />
      ))
}
```

Đây là chỗ hầu hết bảng làm sai: hiển thị "Không có dữ liệu" cho cả hai trường hợp. Nhưng hành động cần làm khác hẳn — một cái là "xoá filter", một cái là "tạo mới". Cho sai hành động thì người dùng bế tắc.

### 4.7 Loading — giữ dữ liệu cũ

```tsx
// SAI: mỗi lần đổi trang → bảng trắng → nhấp nháy
if (status === 'loading') return <Skeleton />

// ĐÚNG: skeleton chỉ ở lần đầu; đổi trang thì mờ dữ liệu cũ
{isInitialLoad ? (
  <TableBody>
    {Array.from({ length: pageSize > 25 ? 10 : pageSize }, (_, i) => (
      <TableRow key={i}>
        {visibleColumns.map((c) => (
          <TableCell key={c.id}><Skeleton variant="text" /></TableCell>
        ))}
      </TableRow>
    ))}
  </TableBody>
) : (
  <TableBody sx={{ opacity: isFetching ? 0.55 : 1, transition: 'opacity 120ms' }}>
    {rows.map(renderRow)}
  </TableBody>
)}
```

Số skeleton row = `min(pageSize, 10)`, không phải `pageSize`. Với `pageSize=200`, render 200 skeleton còn chậm hơn dữ liệu thật.

---

## 5. `useDataTableState` — state vào URL

```ts
// src/hooks/admin/useDataTableState.ts
import { useSearchParams } from 'react-router-dom'

export interface DataTableState {
  page: number          // 0-based (khớp MUI)
  pageSize: number
  sortBy: string
  sortDir: 'asc' | 'desc'
  filters: Record<string, string | string[]>
}

export function useDataTableState(opts: {
  /** namespace để 2 bảng trên cùng trang không đụng param của nhau */
  key?: string
  defaultSortBy: string
  defaultSortDir?: 'asc' | 'desc'
  defaultPageSize?: number
  filterKeys?: string[]
}) {
  const [params, setParams] = useSearchParams()
  const p = (n: string) => (opts.key ? `${opts.key}_${n}` : n)

  // URL 1-based (người dùng đọc thấy page=1 là trang đầu), state 0-based
  const page = Math.max(0, Number(params.get(p('page')) ?? 1) - 1)
  const pageSize = Number(params.get(p('size')) ?? opts.defaultPageSize ?? 50)
  const sortBy = params.get(p('sort')) ?? opts.defaultSortBy
  const sortDir = (params.get(p('dir')) ?? opts.defaultSortDir ?? 'asc') as 'asc' | 'desc'

  const filters = Object.fromEntries(
    (opts.filterKeys ?? []).map((k) => {
      const all = params.getAll(p(k))
      return [k, all.length > 1 ? all : (all[0] ?? '')]
    })
  )

  const patch = (next: Partial<DataTableState>) => {
    const q = new URLSearchParams(params)
    const set = (k: string, v: unknown, omitIf?: unknown) => {
      const key = p(k)
      q.delete(key)
      if (v === undefined || v === '' || v === omitIf) return   // giữ URL sạch
      if (Array.isArray(v)) v.forEach((x) => q.append(key, String(x)))
      else q.set(key, String(v))
    }

    if (next.page !== undefined)     set('page', next.page + 1, 1)
    if (next.pageSize !== undefined) set('size', next.pageSize, opts.defaultPageSize ?? 50)
    if (next.sortBy !== undefined)   set('sort', next.sortBy, opts.defaultSortBy)
    if (next.sortDir !== undefined)  set('dir', next.sortDir, opts.defaultSortDir ?? 'asc')
    if (next.filters) Object.entries(next.filters).forEach(([k, v]) => set(k, v))

    // Đổi filter hoặc sort → về trang 1. Đổi page thì giữ nguyên.
    if ((next.filters || next.sortBy !== undefined || next.sortDir !== undefined) && next.page === undefined) {
      q.delete(p('page'))
    }

    // replace: KHÔNG nhồi history entry cho mỗi ký tự gõ vào ô search
    setParams(q, { replace: true })
  }

  return { page, pageSize, sortBy, sortDir, filters, patch,
           skip: page * pageSize, limit: pageSize }
}
```

### Bốn chi tiết có lý do

**`key` namespace.** `AdminGiftBoxBomPage` có thể có 2 bảng (thành phần + lô). Không namespace → sort bảng A đổi cả bảng B.

**URL 1-based, state 0-based.** `?page=1` là trang đầu. Nếu để 0-based, người dùng share link `?page=0` trông như lỗi.

**Bỏ param khi bằng default.** URL của trạng thái mặc định phải sạch: `/admin/inventory` chứ không `/admin/inventory?page=1&size=50&sort=ngay_het_han&dir=asc`. URL dài làm người dùng không dám copy.

**`replace: true`.** Không có nó, gõ 10 ký tự vào ô search tạo 10 history entry → back button phải bấm 10 lần.

### 5.1 Bỏ `limit: 1000`

`services/admin/productService.ts:58`:

```ts
// TRƯỚC
const data = await apiClient.get<Product[]>('/products', {
  dang_hoat_dong: true,
  limit: 1000,          // Get all products
})

// SAU
export async function listProducts(q: {
  skip: number; limit: number; sortBy: string; sortDir: 'asc' | 'desc'
  search?: string; danhMuc?: string[]
}): Promise<Page<Product>> {
  return apiClient.get<Page<Product>>('/products', {
    paginated: true,                       // §3.4 phương án A
    skip: q.skip, limit: q.limit,
    sort_by: q.sortBy, sort_dir: q.sortDir,
    search: q.search || undefined,
    danh_muc: q.danhMuc?.length ? q.danhMuc : undefined,
  })
}
```

`preOrderService.ts:114` — bỏ `.sort()` ở client, để server sort.

---

## 6. Cách dùng — ví dụ `AdminInventoryPage`

```tsx
export default function AdminInventoryPage() {
  const t = useDataTableState({
    defaultSortBy: 'ngay_het_han',       // FEFO: lô sắp hết hạn lên đầu
    defaultSortDir: 'asc',
    defaultPageSize: 50,
    filterKeys: ['search', 'trang_thai', 'danh_muc'],
  })

  const { data, status, error, refetch, isFetching } = useBatches({
    skip: t.skip, limit: t.limit, sortBy: t.sortBy, sortDir: t.sortDir, ...t.filters,
  })

  const [selected, setSelected] = useState<Set<number>>(new Set())
  // Reset selection khi đổi filter/sort — §4.4 quy tắc 2
  useEffect(() => { setSelected(new Set()) }, [t.sortBy, t.sortDir, JSON.stringify(t.filters)])

  const columns: Column<Batch>[] = [
    { id: 'ma_lo', label: 'Mã lô', render: (r) => r.ma_lo, sortable: false, width: 120 },
    { id: 'ten_san_pham', label: 'Sản phẩm', render: (r) => r.ten_san_pham, sortable: true },
    { id: 'ngay_san_xuat', label: 'Ngày SX', render: (r) => formatDate(r.ngay_san_xuat),
      sortable: true, hideBelow: 'md' },
    { id: 'ngay_het_han', label: 'Hết hạn', sortable: true,
      // Cột quan trọng nhất của bảng này — hiện cả badge độ tươi
      render: (r) => <ExpiryCell date={r.ngay_het_han} /> },
    { id: 'so_luong_hien_tai', label: 'Còn lại', numeric: true, sortable: true,
      render: (r) => r.so_luong_hien_tai.toLocaleString('vi') },
    { id: 'nha_cung_cap', label: 'Nhà cung cấp', render: (r) => r.nha_cung_cap,
      sortable: false, hideBelow: 'lg' },
  ]

  return (
    <AdminPage title="Tồn kho theo lô" breadcrumb={[{ label: 'Kho' }, { label: 'Tồn kho' }]}>
      <DataTableToolbar
        search={t.filters.search as string}
        onSearchChange={(search) => t.patch({ filters: { ...t.filters, search } })}
        filters={<InventoryFilters value={t.filters} onChange={(f) => t.patch({ filters: f })} />}
      />

      <DataTable
        caption="Danh sách lô hàng tồn kho, sắp xếp theo ngày hết hạn"
        columns={columns}
        rows={data?.items ?? []}
        getRowId={(r) => r.lohang_id}
        total={data?.total ?? 0}
        page={t.page} pageSize={t.pageSize}
        onPageChange={(page) => t.patch({ page })}
        onPageSizeChange={(pageSize) => t.patch({ pageSize })}
        sortBy={t.sortBy} sortDir={t.sortDir}
        onSortChange={(sortBy, sortDir) => t.patch({ sortBy, sortDir })}
        selectedIds={selected} onSelectionChange={setSelected}
        bulkActions={<>
          <Button size="small" onClick={exportSelected}>Xuất Excel</Button>
          {/* KHÔNG có bulk delete — lô hàng phải audit được (§4.4 quy tắc 4) */}
        </>}
        status={status} error={error} onRetry={refetch}
        hasActiveFilters={Object.values(t.filters).some(Boolean)}
        rowActions={(r) => <>
          <IconButton size="small" onClick={() => trace(r)} aria-label={`Truy vết lô ${r.ma_lo}`}>
            <TimelineIcon fontSize="small" />
          </IconButton>
        </>}
        onRowClick={(r) => navigate(`/admin/batches/${r.lohang_id}`)}
      />
    </AdminPage>
  )
}
```

`AdminInventoryPage` từ 467 dòng xuống ~110.

---

## 7. Thứ tự áp dụng

| Thứ tự | Bảng | Lý do |
|---|---|---|
| 1 | `AdminStockLedgerPage` | Chỉ tăng, không giảm. Vỡ trước tiên |
| 2 | `AdminInventoryPage` | Bảng quan trọng nhất về nghiệp vụ (FEFO) |
| 3 | `SalesTable` | Đơn hàng tăng nhanh |
| 4 | `AdminBatchTracePage` | Truy vết, tăng nhanh |
| 5 | `AdminAlertsPage` | Backend đã có `total` — dễ nhất |
| 6 | `PreOrderTable` | |
| 7 | `ProductTable` | |
| 8 | `VoucherTable` | |
| 9 | `AdminGiftBoxPage` | Tách file trước (spec 13 §3) rồi mới áp |

Làm 1-3 xong là đã giải quyết 80% vấn đề thực tế.

---

## 8. A11y bảng

MUI cho sẵn `<th scope="col">`. Phần **phải tự thêm**:

- [ ] `<caption>` mô tả bảng — required prop, không optional
- [ ] `aria-sort` trên cột đang sort (chỉ cột đó)
- [ ] `visuallyHidden` text "tăng dần"/"giảm dần" trong `TableSortLabel`
- [ ] `aria-label` trên checkbox chọn tất cả và checkbox từng dòng (`Chọn lô ${ma_lo}`)
- [ ] `aria-label` trên mọi `IconButton` hành động, **có kèm định danh dòng** — "Sửa" một mình vô nghĩa khi screen reader đọc rời khỏi ngữ cảnh
- [ ] `aria-live="polite"` thông báo số kết quả sau khi filter: "Tìm thấy 1.183 dòng"
- [ ] `role="region"` + `aria-live` cho thanh bulk action
- [ ] `getItemAriaLabel` cho nút phân trang (tiếng Việt)
- [ ] Row clickable: nếu `onRowClick` thì row phải có `tabIndex={0}` + `onKeyDown` (Enter/Space) — hoặc bỏ row click và chỉ dùng nút. **Đừng làm row click mà không keyboard.**

Điểm cuối: row click bằng chuột mà không có keyboard equivalent là WCAG 2.1.1 fail. Nếu không muốn xử lý, bỏ `onRowClick` và để nút "Xem" làm việc đó.

---

## 9. Files phải sửa

### Backend
| File | Việc |
|---|---|
| `app/schemas.py` | `Page[T]` generic |
| `app/routers/batches.py` | 3 endpoint: `Page[T]` + sort enum + tie-breaker |
| `app/routers/products.py` | `?paginated=true` + sort enum |
| `app/routers/orders.py` | như trên |
| `app/routers/gift_boxes.py` | như trên |
| `app/routers/components.py` | như trên |
| `app/routers/inventory_trace.py` | như trên; bỏ `rows.sort()` ở Python (`:115`) |
| `app/routers/alerts.py` | thêm sort (đã có `total`) |
| `tests/test_pagination.py` | **mới** — §3.5 |

### Frontend — tạo mới
`src/components/admin/ui/{data-table,data-table-toolbar,data-table-pagination,expiry-cell,admin-page}.tsx`, `src/hooks/admin/useDataTableState.ts`, `src/types/page.ts`

### Frontend — sửa
| File | Việc |
|---|---|
| 11 bảng ở §1.2 | Dùng `DataTable` |
| `services/admin/productService.ts` | Bỏ `limit: 1000` (`:58`), nhận `Page<T>` |
| `services/admin/preOrderService.ts` | Bỏ `limit: 100` (`:69`), bỏ `.sort()` (`:114`) |
| `services/admin/{salesService,inventoryService,voucherService,giftBoxService}.ts` | Nhận `Page<T>` |

---

## 10. Acceptance criteria

### Backend
- [ ] `GET /batches/products?skip=0&limit=25` trả `{items, total, skip, limit}`
- [ ] `total` đếm theo **filter**, không phải cả bảng
- [ ] `sort_by=lohang_id;DROP TABLE` → **422**, không 500, không thực thi
- [ ] `pytest tests/test_pagination.py` pass, gồm test 100 dòng cùng `ngay_het_han` → 4 trang cho **100 id duy nhất** (test tie-breaker)
- [ ] `GET /products` **không** có `paginated=true` → vẫn trả `List[T]` (storefront không vỡ)
- [ ] `inventory_trace.py` không còn `rows.sort()` ở Python

### Frontend — chức năng
- [ ] Seed **1.000** lô hàng → `AdminInventoryPage` mở **< 2s**, scroll mượt
- [ ] Network: **không** còn request nào có `limit=1000` hay `limit=100`
- [ ] Sort cột "Hết hạn" → Network cho thấy `sort_by=ngay_het_han` (server-side, không client)
- [ ] Pagination hiện "1–50 của 1.000" với dấu phân cách `1.000`
- [ ] Nhảy tới trang 12 → đúng dòng 551-600
- [ ] Đổi `pageSize` 50 → 200 → về trang 1, tải đúng
- [ ] Sort mặc định `AdminInventoryPage` là `ngay_het_han asc` (không phải `ngay_tao`)
- [ ] Chọn 5 dòng → thanh bulk hiện "Đã chọn 5 dòng"
- [ ] Chọn 5 dòng → **đổi filter** → selection **reset về 0**
- [ ] "Chọn tất cả" chỉ chọn dòng trong trang hiện tại
- [ ] **Không** có bulk delete trên bảng lô hàng
- [ ] Sửa 1 dòng ở trang 4 → vẫn ở trang 4 sau khi lưu

### URL state
- [ ] Đổi page/sort/filter → URL đổi
- [ ] Copy URL mở tab mới → đúng page, sort, filter
- [ ] Trạng thái mặc định → URL **sạch**, không có param
- [ ] Gõ 10 ký tự vào ô search → Back **1 lần** ra khỏi trang
- [ ] Đổi filter → về trang 1; đổi page → giữ filter
- [ ] Reload → giữ nguyên trạng thái
- [ ] Trang có 2 bảng: sort bảng A **không** ảnh hưởng bảng B

### Mobile
- [ ] `AdminInventoryPage` ở 375px: hiện **tên + ngày hết hạn + số lượng** rõ ràng, không scroll ngang
- [ ] Card view dùng `<dl>/<dt>/<dd>`
- [ ] Pagination bấm được trên mobile (target ≥ 44px)

### A11y
- [ ] Mọi bảng có `<caption>`
- [ ] Screen reader ở header cột đang sort → đọc "tăng dần"/"giảm dần"
- [ ] Chỉ cột đang sort có `aria-sort`; các cột khác **không** đọc "none"
- [ ] Checkbox từng dòng có `aria-label` kèm định danh (mã lô/tên)
- [ ] `IconButton` hành động có `aria-label` kèm định danh dòng
- [ ] Filter đổi → screen reader nghe "Tìm thấy N dòng"
- [ ] Bulk bar xuất hiện → được announce
- [ ] Sort/paginate **hoàn toàn bằng bàn phím**
- [ ] Nếu row clickable: Enter/Space mở được chi tiết
- [ ] axe trên 4 trang admin có bảng → 0 violation

### States
- [ ] Lần đầu tải → skeleton (số row = min(pageSize, 10))
- [ ] Đổi trang → dữ liệu cũ mờ đi, **không** về skeleton, **không** nhấp nháy
- [ ] Block API → hiện lỗi + nút "Thử lại"; bấm → refetch thật
- [ ] Bảng chưa có dữ liệu → "Chưa có dữ liệu" + nút **Thêm mới**
- [ ] Filter không khớp → "Không có dòng nào khớp" + nút **Xoá bộ lọc**
- [ ] Hai empty state trên là **khác nhau**

---

## TL;DR

- **A1/A2 bị chặn bởi backend:** có `skip`/`limit` nhưng **không trả total** (trừ `alerts.py`) và **không có `sort_by`**. Phải sửa backend trước, không làm được bằng frontend.
- **Sort phải ở server, không phải tuỳ chọn.** Với server paging, sort client chỉ sort trong trang hiện tại → nhân viên bấm sort "ngày hết hạn" ở trang 1, tưởng đã thấy lô sắp hết hạn nhất, thực tế nó ở trang 7. Với sản phẩm perishable đó là bỏ sót lô cần xử lý.
- **Tie-breaker `ORDER BY sort_col, id ASC` là bắt buộc.** Không có → offset pagination cho **dòng trùng ở trang này, mất dòng ở trang khác**. Có test riêng cho bug này vì mắt người không thấy.
- **`sort_by` phải là Enum**, không phải `str`. `getattr(Model, sort_by)` là SQL injection.
- **Sort mặc định phải hợp nghiệp vụ**, không phải `ngay_tao desc` cho tất cả: inventory → `ngay_het_han asc` (đúng tinh thần FEFO), pre-order → `ngay_giao_du_kien asc`, ledger → `timestamp desc`.
- **Không làm bulk delete cho lô hàng.** Lô phải audit được — xoá là mất traceability, tức là phá vỡ đúng cái project được xây dựng quanh nó.
- Selection **reset khi đổi filter/sort**; "chọn tất cả" chỉ trong trang hiện tại. Trộn hai điều này gây thao tác hàng loạt lên dữ liệu người dùng không nhìn thấy.
- Empty state phải phân biệt **"chưa có dữ liệu"** (→ nút Thêm mới) vs **"không khớp filter"** (→ nút Xoá bộ lọc). Cho sai hành động thì người dùng bế tắc.
- Thứ tự áp dụng theo **tốc độ tăng dữ liệu**, không theo LOC: ledger → inventory → sales. Làm 3 bảng đó là xong 80% vấn đề thực tế.
