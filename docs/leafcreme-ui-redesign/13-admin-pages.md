# Spec 13 — Admin pages

> Phase 7a (tách file, chức năng) + 7b (visual). 14 pages.
> Spec này xử lý từng trang. Phần dùng chung nằm ở spec 10 (bảng), 11 (form), 12 (theme).

---

## 1. Bản đồ 14 trang

| Trang | LOC | Việc chính | Phase |
|---|---|---|---|
| `AdminDashboardPage` | **964** | Tách → ~150. `StatCard` ×4 lặp. Chart màu fail | 7a + 7b |
| `AdminGiftBoxPage` | **810** | Tách → ~180. Trộn list + form + BOM | 7a |
| `AdminBatchCreatePage` | 511 | Validation (spec 11 §3) + tách → ~180 | 7a |
| `AdminAlertsPage` | 506 | `DataTable` + phân nhóm mức độ | 7a |
| `AdminGiftBoxBomPage` | 488 | Validation BOM + tách | 7a |
| `AdminInventoryPage` | 467 | `DataTable` → ~110 | 7a |
| `AdminBatchTracePage` | 226 | `DataTable` + timeline | 7a |
| `AdminProductPage` | 214 | `DataTable` | 7a |
| `AdminStockLedgerPage` | 206 | `DataTable` — **ưu tiên 1** | 7a |
| `AdminVoucherPage` | 173 | `DataTable` | 7a |
| `AdminPreOrderPage` | — | `DataTable` | 7a |
| `AdminPreOrderDetailPage` | 114 | Layout chi tiết | 7b |
| `AdminSalesPage` | — | `DataTable` | 7a |
| `AdminSalesDetailPage` | — | Layout chi tiết | 7b |
| `AdminLayout` | 453 | Nav grouping, breadcrumb, `<Link>` | 7a + 7b |

---

## 2. `AdminDashboardPage` — 964 dòng

### 2.1 Vấn đề

**Bốn stat card lặp gần như y hệt.** Dòng 172-415: mỗi card ~60 dòng `<Grid><Card sx={...}><CardContent sx={{p:3}}>…`. 240 dòng cho 4 con số.

**Chart color fail cả contrast và phân biệt.** `AdminDashboardPage.tsx:52`:

```tsx
const COLORS = ['#C59B72', '#F5C96A', '#F7B4B8', '#E8E5DD', '#7A6F63']
```

Độ sáng tương đối:

| Màu | L |
|---|---|
| `#7A6F63` | 0.164 |
| `#C59B72` | 0.365 |
| `#F7B4B8` | 0.559 |
| `#F5C96A` | 0.622 |
| `#E8E5DD` | 0.784 |

Khoảng cách giữa các màu liền kề: `0.201, 0.193, 0.063, 0.162`.

**`#F7B4B8` (hồng) và `#F5C96A` (vàng) chỉ chênh 0.063.** Ngưỡng an toàn là ~0.10. Nghĩa là:

- Người mù màu đỏ-xanh (deuteranopia, ~8% nam giới) **không phân biệt được** hai lát pie đó
- In báo cáo ra giấy đen trắng → hai lát thành cùng một xám

Với biểu đồ doanh thu theo sản phẩm, không phân biệt được lát nào là sản phẩm nào thì biểu đồ vô dụng. Và `#E8E5DD` (L=0.784) trên nền trắng gần như vô hình.

**8 `useState` + `Promise.all` 6 request trong một file 964 dòng** (dòng 56-68). Một request fail → cả dashboard trắng (chưa có error boundary, spec 07 §2.5).

### 2.2 Tách file

```
pages/admin/AdminDashboardPage.tsx              ~150  layout + ghép
components/admin/dashboard/
├── stat-card.tsx                    ~50  1 component, dùng 4 lần (thay 240 dòng)
├── stat-cards-row.tsx               ~40
├── inventory-alerts-widget.tsx      ~90  (đang là dòng 416-554)
├── revenue-trend-chart.tsx          ~80
├── revenue-by-product-chart.tsx     ~70  (đã có RevenueByProduct.tsx — gộp)
├── revenue-by-category-chart.tsx    ~70
├── best-sellers-list.tsx            ~60
└── time-range-toggle.tsx            ~30
hooks/admin/useDashboardData.ts      ~70  6 request + error/loading từng phần
```

### 2.3 `StatCard`

```tsx
// components/admin/dashboard/stat-card.tsx
export function StatCard({
  label, value, unit, delta, icon: Icon, tone = 'neutral', href, loading,
}: {
  label: string
  value: number | string
  unit?: string
  /** % thay đổi so kỳ trước. undefined = không hiện. */
  delta?: number
  icon: React.ElementType
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  /** Card dẫn tới đâu khi bấm. Con số phải hành động được. */
  href?: string
  loading?: boolean
}) {
  const Wrapper = href ? CardActionArea : Box
  return (
    <Card>
      <Wrapper {...(href ? { component: Link, to: href } : {})}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Avatar variant="rounded" sx={{ bgcolor: `${tone}.light`, color: `${tone}.main`, width: 36, height: 36 }}>
              <Icon fontSize="small" />
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" noWrap>{label}</Typography>
              {loading ? (
                <Skeleton width={90} height={32} />
              ) : (
                <Typography variant="h2" component="p" data-numeric>
                  {typeof value === 'number' ? value.toLocaleString('vi') : value}
                  {unit && <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>{unit}</Typography>}
                </Typography>
              )}
              {delta !== undefined && (
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
                  {/* Mũi tên + dấu +/- : hai kênh, không chỉ màu (WCAG 1.4.1) */}
                  {delta >= 0 ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />}
                  <Typography variant="caption"
                    color={delta >= 0 ? 'success.main' : 'error.main'} data-numeric>
                    {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">so kỳ trước</Typography>
                </Stack>
              )}
            </Box>
          </Stack>
        </CardContent>
      </Wrapper>
    </Card>
  )
}
```

**Ba điểm:**

- **`href` — con số phải hành động được.** "12 lô sắp hết hạn" mà không bấm được là thông tin chết. Card phải dẫn tới `/admin/inventory?trang_thai=sap_het_han`. Đây là khác biệt lớn nhất giữa dashboard trang trí và dashboard dùng được.
- **`delta` có mũi tên + dấu, không chỉ màu.** Xanh/đỏ một mình fail WCAG 1.4.1.
- **`toLocaleString('vi')`** — `1.250.000` thay `1250000`.

### 2.4 Chart color — bảng mới

```ts
// src/theme/chart-colors.ts
/**
 * Palette biểu đồ — 6 series, luân phiên 2 hue của brand (terracotta 20°, mint 175°).
 *
 * ĐIỀU KIỆN: MỌI cặp màu chênh độ sáng tương đối >= 0.10, để phân biệt được khi
 * (a) mù màu đỏ-xanh, (b) in đen trắng. Palette cũ có #F7B4B8 / #F5C96A chênh 0.063.
 *
 * Bảng này KHÔNG chọn bằng mắt — nó là kết quả giải bài toán: chia đều 6 mốc độ sáng
 * từ 0.055 đến 0.720 rồi tìm màu gần nhất trong mỗi hue. Bản nháp đầu của spec dùng
 * token brand có sẵn (terra-600 / mint-600) và FAIL: hai màu đó chênh 0.011.
 *
 * Verify bằng docs/chart-contrast-check.py — chạy trong CI.
 */
export const CHART_COLORS = [
  '#6D3113',  // terracotta rất đậm   L=0.055   contrast vs trắng 10.00
  '#2C847C',  // mint đậm             L=0.185   4.47
  '#EA7940',  // terracotta sáng      L=0.315   2.87
  '#16C7B8',  // mint sáng            L=0.445   2.12
  '#DFC2B3',  // terracotta nhạt      L=0.575   1.68
  '#C8E2DF',  // mint nhạt            L=0.720   1.36
] as const

/** Chart 2 series: khác cả hue lẫn độ sáng (gap 0.130) */
export const CHART_PAIR = ['#6D3113', '#16C7B8'] as const
```

**Chỉ 6 màu, không 7+.** Với > 6 series, người đọc không đối chiếu legend được nữa bất kể màu tốt đến đâu — gộp phần dư thành "Khác". Và 6 mốc trên dải 0.055-0.720 cho gap ~0.13; thêm màu thứ 7 làm gap tụt xuống dưới ngưỡng.

**Ba màu cuối (L ≥ 0.575) chỉ dùng làm fill**, không dùng làm text hay stroke mảnh — contrast so với trắng chỉ 1.36-1.68. Nhãn trên các lát đó phải là chữ tối.

```python
# docs/chart-contrast-check.py — chạy trong CI
CHART_COLORS = ['#6D3113', '#2C847C', '#EA7940', '#16C7B8', '#DFC2B3', '#C8E2DF']
MIN_GAP = 0.10

fails = []
for i, a in enumerate(CHART_COLORS):
    for b in CHART_COLORS[i+1:]:
        gap = abs(lum(a) - lum(b))
        if gap < MIN_GAP:
            fails.append((a, b, round(gap, 3)))
if fails:
    print('Các cặp màu chart không phân biệt được:')
    for a, b, g in fails:
        print(f'  {a} / {b}  gap={g} < {MIN_GAP}')
    sys.exit(1)
```

Kiểm **mọi cặp**, không chỉ cặp liền kề — Recharts không đảm bảo series 1 và series 4 nằm cạnh nhau về mặt thị giác.

**Ngoài màu, chart phải có kênh thứ hai:**

| Loại chart | Kênh phụ |
|---|---|
| Line / Area | `strokeDasharray` khác nhau mỗi series |
| Bar | Pattern fill (`<pattern>` SVG) nếu > 3 series |
| Pie | **Nhãn trực tiếp trên lát** (`label` prop của Recharts), không chỉ legend |

Pie chỉ có legend bên cạnh là bắt người dùng đối chiếu màu — đúng chỗ mù màu thất bại. Nhãn trực tiếp giải quyết luôn.

**Và mọi chart cần bảng dữ liệu tương đương cho screen reader:**

```tsx
<Box role="img" aria-label="Biểu đồ doanh thu 30 ngày, chi tiết trong bảng bên dưới">
  <ResponsiveContainer>…</ResponsiveContainer>
</Box>
<Accordion>
  <AccordionSummary>Xem dữ liệu dạng bảng</AccordionSummary>
  <AccordionDetails>
    <Table size="small"><caption>Doanh thu theo ngày</caption>…</Table>
  </AccordionDetails>
</Accordion>
```

Recharts render SVG mà screen reader không đọc được. Accordion "Xem dữ liệu dạng bảng" vừa giải quyết a11y vừa hữu ích thật — nhân viên muốn copy số vào Excel.

### 2.5 Loading/error theo từng widget

```tsx
// hooks/admin/useDashboardData.ts
export function useDashboardData(range: TimeRange) {
  // KHÔNG Promise.all rồi 1 state loading duy nhất.
  // Một request fail không được làm trắng cả dashboard.
  const revenue    = useQuery(['revenue', range], ...)
  const products   = useQuery(['revenueByProduct', range], ...)
  const sellers    = useQuery(['bestSellers', range], ...)
  const categories = useQuery(['revenueByCategory', range], ...)
  const stats      = useQuery(['dashboardStats'], ...)
  const alerts     = useQuery(['alertsSummary'], ...)
  return { revenue, products, sellers, categories, stats, alerts }
}
```

Mỗi widget tự xử lý state của nó. Widget lỗi → chỉ widget đó hiện "Không tải được. [Thử lại]".

Nếu chưa muốn thêm react-query (spec 08 §4 nói không thêm trong phase storefront), viết tay 6 hook nhỏ với `{data, status, error, refetch}`. Điểm quan trọng là **6 state độc lập**, không phải 1.

### 2.6 Dashboard nên hiện gì — nội dung, không chỉ layout

Dashboard hiện tại có: 4 stat, alerts widget, 3 chart, best sellers. Với bakery perishable, thiếu 2 thứ quan trọng nhất:

| Nên thêm | Vì sao |
|---|---|
| **"Cần xử lý hôm nay"** — danh sách lô hết hạn trong 1-2 ngày, kèm nút "Giảm giá" / "Đánh dấu thất thoát" | Đây là việc đầu tiên chủ bakery mở admin để làm. Nó là lý do tồn tại của FEFO |
| **Đơn cần chuẩn bị hôm nay** — pre-order có `ngay_giao_du_kien` = hôm nay | Việc thứ hai |

Hai widget này đưa dashboard từ "báo cáo quá khứ" thành "việc cần làm hôm nay". Với ops tool, cái sau giá trị hơn nhiều.

Đặt chúng **trên** các chart. Chart doanh thu là thứ xem một lần mỗi tuần; danh sách việc cần làm là thứ xem mỗi sáng.

Cần backend: `GET /batches/expiring?days=2` (đã có `/batches/expiring` ở `batches.py:733` — kiểm param) và `GET /orders?ngay_giao=today`.

---

## 3. `AdminGiftBoxPage` — 810 dòng

### 3.1 Vấn đề

9 `useState` trong một file. Trộn: danh sách hộp quà + form tạo/sửa + quản lý BOM + bảng. Đây là 3-4 trách nhiệm trong một file.

### 3.2 Tách

```
pages/admin/AdminGiftBoxPage.tsx           ~180  list + DataTable
pages/admin/AdminGiftBoxFormPage.tsx       ~160  tạo/sửa (page riêng, không dialog — nhiều field)
components/admin/giftbox/
├── gift-box-table.tsx           ~60   dùng DataTable
├── gift-box-form.tsx           ~140
├── gift-box-bom-editor.tsx     ~160  (dùng chung với AdminGiftBoxBomPage)
└── gift-box-batch-panel.tsx     ~90
hooks/admin/useGiftBoxes.ts       ~50
```

`gift-box-bom-editor.tsx` dùng chung giữa `AdminGiftBoxPage` và `AdminGiftBoxBomPage` — hiện tại logic BOM có ở cả hai (810 + 488 dòng), gần chắc có trùng lặp. Kiểm khi tách.

### 3.3 BOM editor — điểm nghiệp vụ

Hộp quà là sản phẩm tổng hợp. UI phải trả lời được:

- Hộp này gồm gì, mỗi thứ mấy cái
- **Với tồn kho hiện tại, làm được bao nhiêu hộp** — `min(floor(tồn_kho_i / số_lượng_cần_i))`
- **Thành phần nào là nút cổ chai** — highlight cái quyết định giới hạn trên
- Hạn dùng của hộp = `min(hạn các thành phần)` — nối với spec 04 §8

```tsx
<Alert severity={maxBoxes > 0 ? 'info' : 'warning'}>
  {maxBoxes > 0 ? (
    <>Với tồn kho hiện tại, có thể làm <strong>{maxBoxes}</strong> hộp.
       Giới hạn bởi <strong>{bottleneck.ten}</strong> (còn {bottleneck.available}).</>
  ) : (
    <>Không đủ nguyên liệu để làm hộp này. Thiếu: {missing.map(m => m.ten).join(', ')}.</>
  )}
</Alert>
```

Đây là loại thông tin mà backend có đủ dữ liệu để tính nhưng UI hiện không hiển thị — cùng loại với D14 ở storefront.

---

## 4. `AdminInventoryPage` + `AdminStockLedgerPage`

Hai bảng quan trọng nhất về nghiệp vụ. Chủ yếu là áp `DataTable` (spec 10).

### 4.1 `AdminInventoryPage` — 467 → ~110

Sort mặc định `ngay_het_han asc` (spec 10 §4.2). Cột "Hết hạn" dùng `ExpiryCell`:

```tsx
// components/admin/ui/expiry-cell.tsx
export function ExpiryCell({ date }: { date: string | null }) {
  if (!date) return <Typography variant="body2" color="text.secondary">—</Typography>
  const days = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day')
  const tone = days < 0 ? 'error' : days <= 2 ? 'warning' : days <= 7 ? 'info' : 'default'
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="body2" data-numeric>{dayjs(date).format('DD/MM/YYYY')}</Typography>
      <Chip size="small" variant="outlined" color={tone === 'default' ? undefined : tone}
        label={
          days < 0  ? `Quá ${-days} ngày`
        : days === 0 ? 'Hôm nay'
        : `${days} ngày`
        } />
    </Stack>
  )
}
```

Hiện **cả ngày cụ thể và số ngày còn lại**. Ngày để đối chiếu giấy tờ, số ngày để quyết định nhanh. Chỉ có một trong hai thì phải tự tính nhẩm.

**Filter cần có:** trạng thái (còn hàng / sắp hết hạn / đã hết hạn / hết hàng), danh mục, nhà cung cấp, khoảng ngày hết hạn. Filter "sắp hết hạn" là filter được dùng nhiều nhất — đặt làm quick filter chip ở đầu, không nằm trong dropdown.

**Bulk action:** xuất Excel. **Không** bulk delete (spec 10 §4.4 quy tắc 4) — lô hàng phải audit được.

### 4.2 `AdminStockLedgerPage` — ưu tiên 1

Sổ nhật ký, chỉ tăng. Áp `DataTable` trước tiên.

- Sort mặc định `timestamp desc`
- Filter theo loại giao dịch (nhập / xuất / điều chỉnh / thất thoát), khoảng thời gian, sản phẩm
- **Read-only** — không sửa, không xoá. Sổ nhật ký mà sửa được thì không còn là audit trail. Nếu UI hiện có nút sửa/xoá ở đây, **bỏ đi**
- Mỗi dòng link tới lô liên quan → `AdminBatchTracePage`
- Xuất Excel theo khoảng thời gian — kế toán cần

Điểm "read-only" là quyết định nghiệp vụ, không phải UI: traceability là giá trị cốt lõi của project.

---

## 5. `AdminAlertsPage` — 506 dòng

Backend đã trả `total` (`alerts.py:53`) → dễ áp `DataTable` nhất.

### 5.1 Nhóm theo mức độ, không phải một bảng phẳng

Cảnh báo có mức độ khác nhau về hành động:

| Mức | Ví dụ | Hành động |
|---|---|---|
| **Đã hết hạn** | Lô quá hạn còn tồn | Đánh dấu thất thoát ngay — **mất tiền rồi** |
| **Sắp hết hạn** | Còn 1-2 ngày | Giảm giá / ưu tiên bán — **còn cứu được** |
| **Tồn thấp** | Dưới `muc_gioi_han_ton` | Đặt hàng thêm |

Ba mức này cần thứ tự ưu tiên rõ, không trộn chung một bảng sort theo ngày tạo.

**Đề xuất:** Tabs theo mức độ, có badge số, tab "Sắp hết hạn" mặc định (vì đó là mức còn hành động cứu được):

```tsx
<Tabs value={tab} onChange={...}>
  <Tab label={<Badge badgeContent={counts.expired} color="error">Đã hết hạn</Badge>} value="expired" />
  <Tab label={<Badge badgeContent={counts.expiring} color="warning">Sắp hết hạn</Badge>} value="expiring" />
  <Tab label={<Badge badgeContent={counts.lowStock} color="info">Tồn thấp</Badge>} value="low_stock" />
</Tabs>
```

Tab state vào URL (spec 10 §5).

### 5.2 Cảnh báo phải hành động được

Mỗi dòng cần nút hành động, không chỉ hiển thị:

| Loại | Nút |
|---|---|
| Đã hết hạn | "Đánh dấu thất thoát" → ghi vào ledger |
| Sắp hết hạn | "Tạo khuyến mãi" / "Ưu tiên bán" |
| Tồn thấp | "Nhập lô mới" → `AdminBatchCreatePage` với sản phẩm pre-fill |

Và **nút "Đã xử lý"** để dismiss — không có thì danh sách cảnh báo chỉ dài mãi và người dùng ngừng đọc. Đây là failure mode kinh điển của hệ thống alert: quá nhiều cảnh báo không dismiss được → alert fatigue → bỏ qua hết, kể cả cái quan trọng.

Cần backend: `PATCH /alerts/{id}` với `da_xu_ly: true` + `ghi_chu`.

---

## 6. Chart components

`components/admin/dashboard/RevenueByDayMonth.tsx` (113 dòng), `RevenueByProduct.tsx` — chủ yếu đổi màu sang `CHART_COLORS` (§2.4) và thêm:

- `strokeDasharray` khác nhau cho line/area nhiều series
- Nhãn trực tiếp cho pie
- Accordion bảng dữ liệu
- Tooltip format `toLocaleString('vi')` + đơn vị `₫`
- `<ResponsiveContainer>` có `minHeight` — không thì chart cao 0 trên một số layout
- Empty state khi không có dữ liệu (đừng render chart rỗng)

```tsx
// Tooltip tiếng Việt, có đơn vị
<Tooltip
  formatter={(v: number) => [`${v.toLocaleString('vi')} ₫`, 'Doanh thu']}
  labelFormatter={(l) => dayjs(l).format('DD/MM/YYYY')}
  contentStyle={{ borderRadius: 8, border: `1px solid ${T.sand200}`, fontSize: 13 }}
/>
```

---

## 7. `AdminLayout` — 453 dòng

### 7.1 Nav 11 item phẳng — cần nhóm

`AdminLayout.tsx:39-49`:

```tsx
{ text: 'Dashboard',    path: '/admin/dashboard' },
{ text: 'Sản phẩm',     path: '/admin/products' },
{ text: 'Hộp quà',      path: '/admin/gift-boxes' },
{ text: 'Tồn kho',      path: '/admin/inventory' },
{ text: 'Lịch sử kho',  path: '/admin/stock-ledger' },
{ text: 'Batch trace',  path: '/admin/batch-trace' },     // ← tiếng Anh lẫn vào
{ text: 'Cảnh báo',     path: '/admin/alerts' },
{ text: 'Nhập lô',      path: '/admin/batches' },
{ text: 'Mã giảm giá',  path: '/admin/vouchers' },
{ text: 'Đơn hàng',     path: '/admin/preorders' },
{ text: 'Bán hàng',     path: '/admin/sales' },
```

Ba vấn đề:

1. **11 item phẳng** — vượt ngưỡng scan nhanh (~7). Và 5 item liên quan kho (`Tồn kho`, `Lịch sử kho`, `Batch trace`, `Cảnh báo`, `Nhập lô`) nằm rải rác.
2. **"Batch trace" tiếng Anh** giữa 10 nhãn tiếng Việt.
3. **`Đơn hàng` vs `Bán hàng`** — hai nhãn này không phân biệt được nghĩa. Pre-order vs POS? Nhãn phải nói rõ.

**Nhóm lại:**

```ts
// src/config/admin-nav.ts
export const ADMIN_NAV = [
  { label: 'Tổng quan', to: '/admin/dashboard', icon: DashboardIcon },
  {
    group: 'Bán hàng',
    items: [
      { label: 'Đơn đặt trước', to: '/admin/preorders', icon: EventNoteIcon },
      { label: 'Bán tại quầy',  to: '/admin/sales',     icon: PointOfSaleIcon },
      { label: 'Mã giảm giá',   to: '/admin/vouchers',  icon: LocalOfferIcon },
    ],
  },
  {
    group: 'Kho',
    items: [
      { label: 'Tồn kho',       to: '/admin/inventory',    icon: WarehouseIcon },
      { label: 'Nhập lô',       to: '/admin/batches',      icon: AddBoxIcon },
      { label: 'Truy vết lô',   to: '/admin/batch-trace',  icon: QrCodeScannerIcon },
      { label: 'Lịch sử kho',   to: '/admin/stock-ledger', icon: HistoryIcon },
      { label: 'Cảnh báo',      to: '/admin/alerts',       icon: NotificationsActiveIcon,
        badge: 'alertCount' },
    ],
  },
  {
    group: 'Danh mục',
    items: [
      { label: 'Sản phẩm', to: '/admin/products',   icon: InventoryIcon },
      { label: 'Hộp quà',  to: '/admin/gift-boxes', icon: CardGiftcardIcon },
    ],
  },
] as const
```

`Đơn hàng` → **`Đơn đặt trước`**, `Bán hàng` → **`Bán tại quầy`**. Phân biệt được ngay.

`Cảnh báo` có **badge số** — nhân viên biết có việc cần xử lý mà không phải vào xem.

### 7.2 Nav dùng `<Link>`, không `navigate()`

`AdminLayout.tsx:65` — `handleNavigation(path)` gọi `navigate(path)`. Cùng vấn đề D5 ở storefront: không ctrl+click được để mở tab mới.

Với ops tool, mở nhiều tab là hành vi **rất phổ biến** — nhân viên muốn xem tồn kho ở tab này và nhập lô ở tab kia. Không mở tab mới được là ma sát thật hàng ngày.

```tsx
<ListItemButton
  component={Link}
  to={item.to}
  selected={isActive}
  aria-current={isActive ? 'page' : undefined}
  onClick={() => { if (isMobile) setMobileOpen(false) }}   // giữ đóng drawer trên mobile
>
```

### 7.3 Sidebar collapse — hiện đang hover, nên đổi

`AdminLayout.tsx:74-75`:

```tsx
onMouseEnter={() => !isMobile && setSidebarExpanded(true)}
onMouseLeave={() => !isMobile && setSidebarExpanded(false)}
```

Sidebar mở/đóng theo hover. Vấn đề:

- **Không có ý muốn.** Chuột đi ngang qua → sidebar bung ra, đè nội dung. Gây giật liên tục khi làm việc.
- **Người dùng bàn phím không mở được.**
- **Không nhớ lựa chọn** — mỗi lần chuột rời là đóng lại.

**Đổi thành:** nút toggle tường minh + lưu vào `localStorage`.

```tsx
const [expanded, setExpanded] = useState(
  () => localStorage.getItem('admin.sidebar') !== 'collapsed'
)
const toggle = () => {
  setExpanded((v) => {
    localStorage.setItem('admin.sidebar', v ? 'collapsed' : 'expanded')
    return !v
  })
}
```

Nhân viên chọn một lần rồi giữ mãi. Đây là loại chi tiết mà ops tool phải làm đúng — trạng thái UI phải bền qua reload.

### 7.4 Breadcrumb + tiêu đề trang

Hiện chưa có breadcrumb. Với 11 trang và các trang chi tiết lồng nhau (`/admin/preorders/:id`), người dùng cần biết mình ở đâu và đường về.

```tsx
// components/admin/ui/admin-page.tsx
export function AdminPage({ title, breadcrumb, actions, children }: {
  title: string
  breadcrumb?: { label: string; to?: string }[]
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  useEffect(() => { document.title = `${title} · Leaf Crème Admin` }, [title])

  return (
    <Box>
      {breadcrumb && (
        <Breadcrumbs sx={{ mb: 1 }} aria-label="Đường dẫn">
          <MuiLink component={Link} to="/admin/dashboard" underline="hover" color="text.secondary">
            Admin
          </MuiLink>
          {breadcrumb.map((b, i) =>
            b.to && i < breadcrumb.length - 1 ? (
              <MuiLink key={b.label} component={Link} to={b.to} underline="hover" color="text.secondary">
                {b.label}
              </MuiLink>
            ) : (
              <Typography key={b.label} color="text.primary">{b.label}</Typography>
            )
          )}
        </Breadcrumbs>
      )}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
             alignItems={{ sm: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
        {/* h1 duy nhất của trang */}
        <Typography variant="h1" component="h1">{title}</Typography>
        {actions && <Stack direction="row" spacing={1}>{actions}</Stack>}
      </Stack>
      {children}
    </Box>
  )
}
```

`document.title` đổi theo trang — nhân viên mở 5 tab admin cần đọc được tab nào là gì.

### 7.5 Mật độ layout

`AdminLayout` hiện dùng `sx={{ p: 3 }}` (24px) cho nội dung. Với ops tool, giảm xuống `p: 2.5` (20px) trên desktop, `p: 2` (16px) trên mobile. Whitespace là chi phí.

---

## 8. Keyboard shortcut

Ops tool dùng 8 tiếng/ngày thì shortcut là tiết kiệm thật.

```ts
// src/hooks/admin/useAdminShortcuts.ts
const SHORTCUTS = [
  { keys: 'g d', label: 'Tới Tổng quan',   action: () => nav('/admin/dashboard') },
  { keys: 'g i', label: 'Tới Tồn kho',     action: () => nav('/admin/inventory') },
  { keys: 'g b', label: 'Tới Nhập lô',     action: () => nav('/admin/batches') },
  { keys: 'g a', label: 'Tới Cảnh báo',    action: () => nav('/admin/alerts') },
  { keys: '/',   label: 'Focus ô tìm kiếm', action: () => focusSearch() },
  { keys: 'n',   label: 'Tạo mới (theo trang hiện tại)', action: () => onCreate?.() },
  { keys: '?',   label: 'Hiện danh sách shortcut', action: () => setHelpOpen(true) },
  { keys: 'Escape', label: 'Đóng dialog / bỏ chọn', action: () => onEscape() },
]
```

**Quy tắc bắt buộc:**

- **Không bắt phím khi focus đang ở `input`/`textarea`/`select`/`contenteditable`.** Nếu không, gõ "n" vào ô tìm kiếm sẽ mở form tạo mới. Đây là lỗi phổ biến nhất khi làm shortcut.
- **`?` mở dialog liệt kê shortcut.** Shortcut không có nơi tra là shortcut không ai dùng.
- **Không override shortcut của browser** (`Ctrl+T`, `Ctrl+W`, `Ctrl+L`, `Cmd+R`).
- Dùng chuỗi `g` + phím (kiểu GitHub/Linear) thay vì `Ctrl+`— tránh xung đột và dễ nhớ.

```ts
// Chống bắt phím trong input
const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ||
         el.tagName === 'SELECT' || el.isContentEditable
}
```

---

## 9. Files phải sửa

### Tạo mới
`components/admin/dashboard/{stat-card,stat-cards-row,inventory-alerts-widget,revenue-trend-chart,revenue-by-category-chart,best-sellers-list,time-range-toggle,today-actions-widget}.tsx`
`components/admin/giftbox/{gift-box-table,gift-box-form,gift-box-bom-editor,gift-box-batch-panel}.tsx`
`components/admin/ui/{admin-page,expiry-cell,shortcut-help-dialog}.tsx`
`hooks/admin/{useDashboardData,useGiftBoxes,useAdminShortcuts}.ts`
`config/admin-nav.ts`, `theme/chart-colors.ts`, `docs/chart-contrast-check.py`

### Sửa
| File | Việc | Phase |
|---|---|---|
| `AdminDashboardPage.tsx` | 964 → ~150; StatCard; chart color; state theo widget; thêm "Cần xử lý hôm nay" | 7a+7b |
| `AdminGiftBoxPage.tsx` | 810 → ~180; tách form + BOM | 7a |
| `AdminStockLedgerPage.tsx` | `DataTable`; **bỏ nút sửa/xoá nếu có** | 7a |
| `AdminInventoryPage.tsx` | 467 → ~110; `DataTable`; `ExpiryCell`; quick filter | 7a |
| `AdminAlertsPage.tsx` | 506 → ~200; Tabs theo mức độ; nút hành động; dismiss | 7a |
| `AdminBatchTracePage.tsx` | `DataTable` + timeline | 7a |
| `AdminProductPage.tsx`, `AdminVoucherPage.tsx`, `AdminPreOrderPage.tsx`, `AdminSalesPage.tsx` | `DataTable` | 7a |
| `AdminGiftBoxBomPage.tsx` | Dùng `gift-box-bom-editor` chung | 7a |
| `AdminLayout.tsx` | Nav nhóm; `<Link>`; toggle bền; breadcrumb; mật độ | 7a+7b |
| `components/admin/dashboard/RevenueByDayMonth.tsx`, `RevenueByProduct.tsx` | Màu + a11y chart | 7b |

### Backend
| Việc | Ưu tiên |
|---|---|
| `PATCH /alerts/{id}` — `da_xu_ly` + `ghi_chu` (dismiss) | P1 |
| `GET /batches/expiring?days=2` — kiểm param đã có (`batches.py:733`) | P1 |
| `GET /orders?ngay_giao=today` | P1 |
| `GET /gift-boxes/{id}/max-buildable` — số hộp làm được + bottleneck | P2 |

---

## 10. Acceptance criteria

### Tách file
- [ ] `AdminDashboardPage.tsx` ≤ **200** dòng (từ 964)
- [ ] `AdminGiftBoxPage.tsx` ≤ **250** dòng (từ 810)
- [ ] `AdminInventoryPage.tsx` ≤ **150** dòng (từ 467)
- [ ] `AdminAlertsPage.tsx` ≤ **250** dòng (từ 506)
- [ ] `AdminBatchCreatePage.tsx` ≤ **220** dòng (từ 511)
- [ ] `StatCard` dùng đúng **1** định nghĩa, gọi 4 lần
- [ ] Logic BOM có đúng **1** chỗ, dùng bởi cả 2 trang

### Dashboard
- [ ] Block 1 trong 6 request → chỉ widget đó lỗi, 5 widget còn lại **vẫn hiện**
- [ ] Mỗi stat card bấm được, dẫn tới trang có filter tương ứng
- [ ] `delta` có mũi tên **và** dấu +/−, không chỉ màu
- [ ] Số tiền hiện `1.250.000 ₫`, không `1250000`
- [ ] Widget "Cần xử lý hôm nay" hiện lô hết hạn trong 1-2 ngày, có nút hành động
- [ ] Widget đó nằm **trên** các chart

### Chart
- [ ] `grep -n "COLORS = \[" src/pages/admin/AdminDashboardPage.tsx` → dùng `CHART_COLORS`, không hex cũ
- [ ] `python3 docs/chart-contrast-check.py` → mọi cặp màu liền kề chênh độ sáng ≥ 0.10
- [ ] Pie chart có **nhãn trực tiếp** trên lát, không chỉ legend
- [ ] Line/Area nhiều series có `strokeDasharray` khác nhau
- [ ] Mỗi chart có Accordion "Xem dữ liệu dạng bảng", bảng có `<caption>`
- [ ] Chart có `role="img"` + `aria-label`
- [ ] Chụp screenshot chart → chuyển grayscale → **vẫn phân biệt được** các series
- [ ] Không có dữ liệu → hiện empty state, không render chart rỗng

### AdminLayout
- [ ] Nav nhóm thành 4 cụm: Tổng quan, Bán hàng, Kho, Danh mục
- [ ] Không còn nhãn tiếng Anh ("Batch trace" → "Truy vết lô")
- [ ] `Đơn hàng`/`Bán hàng` → `Đơn đặt trước`/`Bán tại quầy`
- [ ] **Ctrl+click** nav item → mở tab mới thật
- [ ] `aria-current="page"` trên item đang active
- [ ] Sidebar collapse bằng **nút**, không phải hover
- [ ] Collapse state **giữ qua reload**
- [ ] Chuột đi ngang sidebar → **không** tự bung ra
- [ ] Badge số trên "Cảnh báo" khớp số cảnh báo chưa xử lý
- [ ] Mọi trang có breadcrumb và đúng **1** `<h1>`
- [ ] `document.title` đổi theo trang

### Alerts
- [ ] Tabs theo mức độ, có badge số, tab "Sắp hết hạn" mặc định
- [ ] Tab state vào URL
- [ ] Mỗi dòng có nút hành động phù hợp loại cảnh báo
- [ ] Nút "Đã xử lý" hoạt động, cảnh báo biến khỏi danh sách
- [ ] "Tồn thấp" → "Nhập lô mới" → `AdminBatchCreatePage` có sản phẩm **pre-fill**

### Inventory / Ledger
- [ ] `AdminInventoryPage` sort mặc định `ngay_het_han asc`
- [ ] `ExpiryCell` hiện **cả** ngày cụ thể **và** số ngày còn lại
- [ ] Quick filter chip "Sắp hết hạn" ở đầu, không trong dropdown
- [ ] `AdminStockLedgerPage` **không có** nút sửa/xoá
- [ ] Ledger link được sang `AdminBatchTracePage`
- [ ] Xuất Excel theo khoảng thời gian hoạt động

### Gift box
- [ ] BOM editor hiện "có thể làm N hộp, giới hạn bởi X"
- [ ] Không đủ nguyên liệu → nói rõ thiếu gì
- [ ] Hạn dùng hộp = min(hạn thành phần)

### Shortcut
- [ ] `g` `i` → tới Tồn kho
- [ ] `/` → focus ô tìm kiếm
- [ ] `?` → dialog liệt kê shortcut
- [ ] **Gõ "n" vào ô tìm kiếm → KHÔNG mở form tạo mới**
- [ ] Không override `Ctrl+T` / `Ctrl+W` / `Cmd+R`

### Mobile
- [ ] `AdminInventoryPage` ở 375px: hiện tên + hết hạn + số lượng, không scroll ngang
- [ ] Dashboard ở 375px: stat card 1 cột hoặc 2 cột, chart scroll được
- [ ] Sidebar drawer đóng khi bấm nav item

---

## TL;DR

- **Chart color hiện tại không phân biệt được:** `#F7B4B8` và `#F5C96A` chỉ chênh độ sáng **0.063** (ngưỡng an toàn 0.10). Người mù màu đỏ-xanh (~8% nam) và bản in đen trắng thấy chúng như một. Với biểu đồ doanh thu theo sản phẩm thì biểu đồ vô dụng. `#E8E5DD` (L=0.784) gần như vô hình trên nền trắng.
- **4 stat card lặp 240 dòng cho 4 con số.** Và không card nào bấm được — "12 lô sắp hết hạn" mà không dẫn tới đâu là thông tin chết.
- **`Promise.all` 6 request + 1 state loading** → một request fail làm trắng cả dashboard. Phải 6 state độc lập.
- **Dashboard thiếu thứ quan trọng nhất:** widget "Cần xử lý hôm nay" (lô hết hạn 1-2 ngày + đơn giao hôm nay). Đó là việc đầu tiên chủ bakery mở admin để làm, và là lý do tồn tại của FEFO. Chart doanh thu xem một lần mỗi tuần — đặt dưới.
- **Sidebar mở/đóng theo hover** (`AdminLayout.tsx:74`) → chuột đi ngang là bung ra đè nội dung, người dùng bàn phím không mở được, không nhớ lựa chọn. Đổi thành nút + `localStorage`.
- **Nav 11 item phẳng**, 5 item về kho rải rác, có nhãn tiếng Anh "Batch trace", và `Đơn hàng` vs `Bán hàng` không phân biệt được nghĩa. Nhóm lại 4 cụm, đổi thành `Đơn đặt trước` / `Bán tại quầy`.
- **Nav dùng `navigate()` không `<Link>`** — với ops tool, mở nhiều tab là hành vi hàng ngày (xem tồn kho tab này, nhập lô tab kia). Không ctrl+click được là ma sát thật.
- **`AdminStockLedgerPage` phải read-only.** Sổ nhật ký sửa được thì không còn là audit trail — mà traceability là giá trị cốt lõi của project.
- **Alerts cần nút "Đã xử lý".** Không dismiss được → danh sách dài mãi → alert fatigue → bỏ qua hết, kể cả cái quan trọng.
- **Shortcut: không bắt phím khi đang focus trong input.** Không có check này thì gõ "n" vào ô tìm kiếm sẽ mở form tạo mới — lỗi phổ biến nhất khi làm shortcut.
