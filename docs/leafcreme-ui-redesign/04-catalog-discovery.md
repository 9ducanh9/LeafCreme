# Spec 04 — Catalog & Discovery

> Phase 4. Home, Category listing, Search, ProductCard, ProductDetail, GiftBox.
> Spec này chứa **fix cho D14** — đưa batch inventory / FEFO lên bề mặt UI. Đó là phần giá trị cao nhất của toàn bộ redesign, và nó **cần một endpoint backend mới**.

---

## 1. Trang trong scope

| Page | LOC | Vấn đề chính |
|---|---|---|
| `BakeryHomePage.tsx` | 26 | Mỏng — chỉ ghép 5 component. Vấn đề nằm trong các component con |
| `CategoryListingPage.tsx` | 230 | — |
| `SearchPage.tsx` | 412 | Trang to nhất của storefront, trộn filter + fetch + render |
| `ProductDetailPage.tsx` | 285 | Không hiện tồn kho, không hiện độ tươi |
| `GiftBoxListPage.tsx` | — | — |
| `GiftBoxDetailPage.tsx` | 233 | — |
| `ProductCard.tsx` | — | D13 (div onClick), D14 (không có tín hiệu tồn kho) |
| `HeroBanner.tsx`, `BestSellers.tsx`, `ProductCategories.tsx`, `IntroMessage.tsx`, `SeasonalMiniSection.tsx` | — | Component của home |

---

## 2. D14 — Batch inventory phải hiện lên UI

### 2.1 Backend đã có gì

`app/services/fefo.py:8`

```python
def alloc_fefo_by_variant(db: Session, bienthe_id: int, need_qty: int):
    """Trả về: [(lohang_id, take_qty), ...]
       Rule: lọc các lô còn hàng, order by ngay_het_han ASC, FOR UPDATE"""
```

Model có đủ dữ liệu:

- `LoHangSanPham.ngay_het_han` — ngày hết hạn từng lô
- `TonKhoSanPham.so_luong_hien_tai` — số còn lại
- `TonKhoSanPham.so_luong_da_ban`
- `BienTheSanPham.muc_gioi_han_ton` — ngưỡng cảnh báo tồn thấp (đã có trong `VariantResponse`)

### 2.2 Backend chưa expose gì

`app/routers/products.py:58` — `ProductResponse` gồm 13 field: id, tên, sku, loại, giá, mô tả, ảnh, danh mục, đơn vị, dịp phù hợp, đang hoạt động, ngày tạo, ngày cập nhật.

**Không có một field nào về tồn kho hay hạn dùng.** `VariantResponse` cũng vậy — có `muc_gioi_han_ton` (ngưỡng) nhưng không có `so_luong_hien_tai` (thực tế).

Nghĩa là: **D14 không sửa được bằng frontend một mình.** Đây là điểm t muốn nói thẳng — spec UI/UX này không thể chỉ là UI/UX. Phần giá trị nhất của redesign nằm ở chỗ nối UI với dữ liệu backend đã có nhưng chưa lộ ra.

### 2.3 Endpoint mới cần thêm

```
GET /products/{product_id}/availability
```

```jsonc
// 200 OK
{
  "sanpham_id": 12,
  "tong_kha_dung": 14,              // tổng across tất cả variant
  "trang_thai": "con_hang",         // con_hang | ton_thap | het_hang | sap_het_han
  "ngay_het_han_gan_nhat": "2026-08-13",
  "bien_the": [
    {
      "bienthe_id": 34,
      "huong_vi": "Vani",
      "kich_thuoc": "18cm",
      "so_luong_kha_dung": 3,        // SUM(so_luong_hien_tai) các lô chưa hết hạn
      "muc_gioi_han_ton": 10,
      "ngay_het_han_gan_nhat": "2026-08-13",
      "so_lo_kha_dung": 2
    },
    {
      "bienthe_id": 35, "huong_vi": "Matcha", "kich_thuoc": "18cm",
      "so_luong_kha_dung": 0, "muc_gioi_han_ton": 10,
      "ngay_het_han_gan_nhat": null, "so_lo_kha_dung": 0
    }
  ]
}
```

Query — tái dùng đúng logic filter của FEFO để UI và allocation không lệch nhau:

```python
# app/routers/products.py
@router.get("/{product_id}/availability", response_model=ProductAvailabilityResponse)
def get_product_availability(product_id: int, db: Session = Depends(get_db)):
    """Tồn kho khả dụng theo biến thể, chỉ tính lô CHƯA hết hạn.
       Dùng CÙNG điều kiện với fefo.alloc_fefo_by_variant để UI không
       hứa số lượng mà allocation không giao được."""
    today = date.today()
    rows = db.execute(
        select(
            BienTheSanPham.bienthe_id,
            BienTheSanPham.huong_vi,
            BienTheSanPham.kich_thuoc,
            BienTheSanPham.muc_gioi_han_ton,
            func.coalesce(func.sum(TonKhoSanPham.so_luong_hien_tai), 0).label("kha_dung"),
            func.min(LoHangSanPham.ngay_het_han).label("hsd_gan_nhat"),
            func.count(distinct(LoHangSanPham.lohang_id)).label("so_lo"),
        )
        .select_from(BienTheSanPham)
        .outerjoin(LoHangSanPham, and_(
            LoHangSanPham.bienthe_sanpham_id == BienTheSanPham.bienthe_id,
            LoHangSanPham.ngay_het_han >= today,          # ← lô hết hạn không tính
        ))
        .outerjoin(TonKhoSanPham, and_(
            TonKhoSanPham.lohang_sanpham_id == LoHangSanPham.lohang_id,
            TonKhoSanPham.so_luong_hien_tai > 0,
        ))
        .where(
            BienTheSanPham.sanpham_id == product_id,
            BienTheSanPham.dang_hoat_dong.is_(True),
        )
        .group_by(BienTheSanPham.bienthe_id)
    ).all()
    ...
```

**Chú ý điều kiện `ngay_het_han >= today`.** `alloc_fefo_by_variant` hiện tại **không** filter theo `ngay_het_han` — nó chỉ filter `so_luong_hien_tai > 0` rồi order by `ngay_het_han ASC`. Nghĩa là FEFO hiện tại **có thể phân bổ lô đã hết hạn** nếu lô đó còn số lượng.

Đây là một bug backend mà t phát hiện khi đọc code để viết spec UI. Nó nằm ngoài scope UI/UX, nhưng nên ghi vào backlog: `alloc_fefo_by_variant` cần thêm `LoHangSanPham.ngay_het_han >= date.today()` vào `where`, không thì bakery bán bánh hết hạn. Với sản phẩm perishable, đây là P0 nghiêm trọng hơn mọi vấn đề UI trong bộ spec này.

**Cho danh sách sản phẩm (grid),** đừng gọi N request. Thêm field vào `ProductResponse` của endpoint list:

```jsonc
// GET /products  → thêm 3 field
{
  "sanpham_id": 12, "ten": "...", /* ... như cũ ... */
  "tong_kha_dung": 14,
  "trang_thai_ton": "con_hang",
  "ngay_het_han_gan_nhat": "2026-08-13"
}
```

Nếu không muốn đổi shape `ProductResponse` (sợ vỡ admin), thêm query param `?include=availability` để opt-in. Nhưng khuyến nghị thêm thẳng — đây là thông tin cốt lõi của một sản phẩm perishable, không phải phần mở rộng.

### 2.4 Suy ra trạng thái ở frontend

```ts
// src/utils/inventory.ts
import { differenceInCalendarDays, parseISO } from 'date-fns'   // hoặc dayjs đã có

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'
export type Freshness   = 'fresh' | 'use_soon' | 'last_day' | 'unknown'

export function stockStatus(khaDung: number, nguong: number): StockStatus {
  if (khaDung <= 0) return 'out_of_stock'
  if (khaDung <= Math.max(3, Math.ceil(nguong * 0.3))) return 'low_stock'
  return 'in_stock'
}

export function freshness(hsd: string | null): Freshness {
  if (!hsd) return 'unknown'
  const days = differenceInCalendarDays(parseISO(hsd), new Date())
  if (days <= 0) return 'last_day'
  if (days <= 2) return 'use_soon'
  return 'fresh'
}
```

**Ngưỡng low stock:** `max(3, ceil(muc_gioi_han_ton * 0.3))`. Lý do không dùng thẳng `muc_gioi_han_ton`: field đó là ngưỡng để **admin đặt hàng thêm** (có thể là 10-20), không phải ngưỡng để **báo khách hàng gấp**. Báo "chỉ còn 10 cái" khi vẫn còn 10 cái là gây áp lực giả — vừa không trung thực vừa mất tin cậy nếu khách quay lại hôm sau vẫn thấy "chỉ còn 10".

Điểm này quan trọng về mặt đạo đức sản phẩm: tín hiệu khan hiếm chỉ được hiện khi nó **thật**. `max(3, …)` đảm bảo chỉ báo khi thực sự sắp hết.

### 2.5 Component `StockSignal`

```tsx
// src/components/bakery/stock-signal.tsx
import { Badge } from '@/components/ui'
import { stockStatus, freshness } from '@/utils/inventory'

export function StockSignal({
  khaDung, nguong, hsd, variant = 'compact',
}: {
  khaDung: number
  nguong: number
  hsd: string | null
  variant?: 'compact' | 'full'
}) {
  const stock = stockStatus(khaDung, nguong)
  const fresh = freshness(hsd)

  if (stock === 'out_of_stock') {
    return <Badge variant="neutral">Tạm hết hàng</Badge>
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stock === 'low_stock' && (
        <Badge variant="warning">Còn {khaDung}</Badge>
      )}
      {fresh === 'fresh'    && variant === 'full' && <Badge variant="success">Mới ra lò</Badge>}
      {fresh === 'use_soon' && <Badge variant="warning">Dùng trong 2 ngày</Badge>}
      {fresh === 'last_day' && <Badge variant="danger">Dùng trong hôm nay</Badge>}
    </div>
  )
}
```

### 2.6 "Dùng trong hôm nay" là cơ hội, không phải cảnh báo

Với bánh short-shelf-life, lô sắp hết hạn là **rủi ro lãng phí** cho bakery. Đây là chỗ UI có thể tạo giá trị kinh doanh thật, không chỉ trang trí:

**Đề xuất (đưa vào backlog product, không phải phase 4):** section "Ưu đãi hôm nay" trên trang chủ, list sản phẩm có `freshness === 'last_day' || 'use_soon'`, có giảm giá. Đây là:

- Giải quyết pain point thật của bakery (giảm waste — đúng vấn đề README nêu)
- Tạo lý do để khách quay lại xem hằng ngày
- Kể được câu chuyện FEFO cho recruiter trong 3 giây mở demo

Cần backend hỗ trợ: endpoint list sản phẩm sắp hết hạn (đã có `/batches/expiring` cho admin — mở phiên bản public, lọc field) + logic giá khuyến mãi. Không nằm trong phase 4, nhưng ghi vào spec vì nó là cách đúng nhất để trả lời "AI-native / business-driven" trong `custom_instructions` của project.

---

## 3. `ProductCard` mới

```tsx
// src/components/bakery/product-card.tsx
import { Link } from 'react-router-dom'
import { Card, CardMedia, CardBody, CardFooter, CardTitle, Price, Button } from '@/components/ui'
import { StockSignal } from './stock-signal'
import { stockStatus } from '@/utils/inventory'
import type { Product } from '@/types/product'

export function ProductCard({ product, priority = false }: { product: Product; priority?: boolean }) {
  const soldOut = stockStatus(product.tong_kha_dung ?? 0, 10) === 'out_of_stock'

  return (
    <Card interactive={!soldOut} className={soldOut ? 'opacity-75' : undefined}>
      <CardMedia ratio="product">
        <img
          src={getImageUrl(product.hinh_anh_url) ?? FALLBACK_IMAGE.product}
          // alt mô tả sản phẩm, KHÔNG lặp lại "ảnh của" — screen reader đã biết đó là img
          alt={product.ten}
          className="size-full object-cover transition-transform duration-slow ease-out
                     group-hover/card:scale-[1.03] motion-reduce:transform-none"
          // Ảnh above-the-fold: eager + fetchpriority. Còn lại lazy.
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          // width/height BẮT BUỘC — chống CLS. aspect-product = 4/5.
          width={400} height={500}
          decoding="async"
        />

        {/* Badge góc trên: danh mục + tín hiệu độ tươi */}
        <div className="absolute inset-x-2 top-2 flex flex-wrap items-start justify-between gap-1">
          {product.danh_muc && <Badge variant="brand">{product.danh_muc}</Badge>}
          <StockSignal
            khaDung={product.tong_kha_dung ?? 0}
            nguong={10}
            hsd={product.ngay_het_han_gan_nhat ?? null}
          />
        </div>

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-bg-overlay">
            <Badge variant="neutral" className="text-sm">Tạm hết hàng</Badge>
          </div>
        )}
      </CardMedia>

      <CardBody>
        <CardTitle className="text-base">
          {/* Stretched link — spec 02 §6.1. Đúng 1 tab stop cho cả card. */}
          <Link
            to={`/products/${product.sanpham_id}`}
            className="outline-none after:absolute after:inset-0 after:z-raised after:content-['']"
          >
            {product.ten}
            {/* Nếu tên ngắn/trùng nhau, thêm ngữ cảnh cho screen reader */}
            {product.danh_muc && <span className="sr-only"> — {product.danh_muc}</span>}
          </Link>
        </CardTitle>
        {product.mo_ta && (
          <p className="line-clamp-2 text-sm text-fg-muted">{product.mo_ta}</p>
        )}
      </CardBody>

      <CardFooter className="justify-between">
        <Price value={product.gia_co_ban} />
        <Button
          size="sm" variant="secondary" disabled={soldOut}
          className="relative z-sticky"          // nổi trên stretched link
          onClick={() => addToCart(product)}
          aria-label={`Thêm ${product.ten} vào giỏ hàng`}
        >
          <ShoppingCart className="size-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Thêm</span>
        </Button>
      </CardFooter>
    </Card>
  )
}
```

### Những thứ được fix, có lý do

| Fix | Lý do |
|---|---|
| `aspect-product` (4:5) thay `h-64` | `h-64` cố định 256px bất kể chiều rộng card → ở mobile 2 cột card rộng 166px thì ảnh bị crop lệch tỉ lệ, ở desktop 296px thì ảnh bị dẹt. Aspect-ratio giữ tỉ lệ ở mọi breakpoint |
| `width`/`height` attribute | Browser reserve chỗ trước khi ảnh tải → **CLS ≈ 0**. Không có nó, grid 12 sản phẩm sẽ nhảy 12 lần khi ảnh load |
| `loading="lazy"` + `priority` cho ảnh đầu | Grid 12 sản phẩm hiện tại tải cả 12 ảnh ngay → LCP tệ. Lazy cho ảnh dưới fold, eager+high cho 2-4 ảnh đầu |
| Bỏ `onError` handler inline | 5 dòng logic fallback trong mỗi card × N card. Chuyển vào `getImageUrl()` trả fallback sẵn, hoặc dùng `onError` một lần trong component `<ProductImage>` |
| `<Link>` thay `<div onClick>` | Fix D13 + D5 |
| Nút "Thêm" icon-only trên mobile | Ở 166px card, nút có text "Thêm vào giỏ" chiếm hết chiều ngang. `sr-only sm:not-sr-only` giữ text cho screen reader ở mọi cỡ, hiện text từ `sm` |
| `aria-label` đầy đủ trên nút thêm | "Thêm" một mình vô nghĩa khi screen reader đọc rời khỏi ngữ cảnh card |
| `StockSignal` | Fix D14 |

**`onError` fallback — làm ở một chỗ:**

```tsx
// src/components/ui/product-image.tsx
export function ProductImage({ src, alt, ...rest }: React.ComponentProps<'img'>) {
  const [failed, setFailed] = useState(false)
  return (
    <img
      src={failed ? FALLBACK_IMAGE.product : (src ?? FALLBACK_IMAGE.product)}
      alt={alt}
      onError={() => setFailed(true)}
      {...rest}
    />
  )
}
```

Hiện tại logic `onError` lặp trong `Header.tsx` (có cả logic 2 bước fallback), `ProductCard.tsx`, `GiftBoxCard.tsx`, `ProductDetailPage.tsx`. Gom về 1 chỗ.

---

## 4. `ProductDetailPage`

### 4.1 Layout

```
Desktop (>= lg)                          Mobile
┌─────────────────┬──────────────────┐   ┌──────────────────┐
│                 │ Danh mục ›       │   │ [breadcrumb]     │
│   Gallery       │ Tên sản phẩm     │   │ [gallery swipe]  │
│   aspect 4:5    │ ★ Giá            │   │ Tên              │
│   sticky        │ [StockSignal]    │   │ Giá              │
│   + thumbnails  │ ─────────────    │   │ [StockSignal]    │
│                 │ Chọn hương vị    │   │ Chọn biến thể    │
│                 │ [○Vani ○Matcha]  │   │ [số lượng]       │
│                 │ Chọn size        │   │ ─── sticky bar ──│
│                 │ [số lượng]       │   │ [Giá] [Thêm giỏ] │
│                 │ [Thêm vào giỏ]   │   └──────────────────┘
│                 │ ─────────────    │
│                 │ Giao sớm nhất:   │
│                 │  Thứ 5, 13/08    │
│                 │ [Tabs: Mô tả /   │
│                 │  Bảo quản / Ship]│
└─────────────────┴──────────────────┘
     Sản phẩm liên quan (grid 4)
```

### 4.2 Ba bổ sung có giá trị cao

**(1) Sticky add-to-cart bar trên mobile.** Trang chi tiết dài; nút "Thêm vào giỏ" ở giữa trang → khách scroll xuống đọc mô tả rồi phải scroll lên. Bar cố định đáy màn hình (`fixed bottom-0 z-sticky lg:hidden`) chứa giá + nút. Đây là pattern chuẩn của mọi e-commerce mobile và tác động chuyển đổi lớn hơn mọi thay đổi màu sắc trong bộ spec này.

```tsx
{/* Chỉ hiện khi nút chính đã scroll khỏi viewport — dùng IntersectionObserver */}
<div className={cn(
  'fixed inset-x-0 bottom-0 z-sticky lg:hidden',
  'flex items-center gap-3 border-t border-border bg-bg-surface/95 p-3 backdrop-blur-md',
  'pb-[max(0.75rem,env(safe-area-inset-bottom))]',   // ← tránh home indicator iPhone
  'transition-transform duration-normal',
  showBar ? 'translate-y-0' : 'translate-y-full'
)}>
  <div className="flex-1">
    <Price value={selectedVariant?.gia_bienthe ?? product.gia_co_ban} />
    {khaDung > 0 && khaDung <= 3 && (
      <p className="text-xs text-warning">Còn {khaDung}</p>
    )}
  </div>
  <Button size="lg" disabled={soldOut} onClick={addToCart}>Thêm vào giỏ</Button>
</div>
```

`env(safe-area-inset-bottom)` — thiếu cái này thì trên iPhone có home indicator, nút bị thanh gesture che một nửa.

**(2) Ngày giao sớm nhất, hiện ngay trên trang sản phẩm.**

Hiện tại thông tin thời gian giao chỉ xuất hiện ở `CheckoutPage.tsx:49` (`deliveryDateTime`). Khách chọn sản phẩm, thêm giỏ, nhập địa chỉ, rồi mới phát hiện không giao được ngày cần → abandon ở bước cuối cùng, tốn nhất.

Với sản phẩm có `ngay_het_han` và pre-order, ngày giao khả thi là thông tin **quyết định mua**, phải hiện sớm:

```tsx
<div className="flex items-start gap-2 rounded-md bg-accent-subtle p-3">
  <Truck className="mt-0.5 size-4 shrink-0 text-accent-fg" aria-hidden />
  <div className="text-sm">
    <p className="font-medium text-fg">Giao sớm nhất: {formatDate(earliestDelivery)}</p>
    <p className="text-fg-muted">Đặt trước 15:00 để giao trong ngày mai.</p>
  </div>
</div>
```

**(3) Tab "Bảo quản" — không phải nội dung phụ.**

Bánh short-shelf-life thì cách bảo quản là thông tin thiết yếu, không phải nice-to-have. Cần trường dữ liệu (backend chưa có — thêm `huong_dan_bao_quan` vào `ProductResponse`, hoặc dùng chung theo `danh_muc` nếu không muốn nhập từng sản phẩm).

### 4.3 Chọn biến thể — dùng RadioGroup, không dùng Select

```tsx
<fieldset>
  <legend className="text-sm font-medium text-fg">Hương vị</legend>
  <RadioGroup value={flavor} onValueChange={setFlavor} className="mt-3 flex flex-wrap gap-2">
    {flavors.map((f) => {
      const out = availability[f.bienthe_id]?.so_luong_kha_dung === 0
      return (
        <RadioGroupItem
          key={f.bienthe_id} value={f.huong_vi} disabled={out}
          className={cn(
            'flex min-h-11 items-center rounded-md border px-4 text-sm',
            'data-[state=checked]:border-brand data-[state=checked]:bg-brand-subtle data-[state=checked]:text-brand-fg',
            'border-border-interactive',
            // Hết hàng: gạch ngang + màu mờ + KÈM text, không chỉ dựa vào màu
            out && 'cursor-not-allowed text-fg-disabled line-through'
          )}
        >
          {f.huong_vi}
          {out && <span className="sr-only"> (hết hàng)</span>}
        </RadioGroupItem>
      )
    })}
  </RadioGroup>
</fieldset>
```

**RadioGroup thay Select:** với 2-6 lựa chọn, radio hiện hết ra cho khách so sánh và thấy ngay cái nào hết hàng. Select ẩn thông tin sau một cú click, và không cách nào hiện trạng thái hết hàng của option chưa mở. Chỉ dùng Select khi > 8 lựa chọn.

**`<fieldset>` + `<legend>`:** nhóm radio bắt buộc phải có, không thì screen reader không biết radio này thuộc câu hỏi nào (WCAG 1.3.1).

**Hết hàng báo bằng 3 kênh:** `disabled` (không click được), `line-through` (thị giác không phụ thuộc màu), `sr-only "(hết hàng)"` (AT). Chỉ đổi màu mờ là fail WCAG 1.4.1.

---

## 5. `SearchPage` — 412 dòng, tách ra

### 5.1 Vấn đề

Trang lớn nhất của storefront. Trộn: fetch, filter state, sort state, pagination, empty state, render grid. Kèm vấn đề UX:

**Filter state không nằm trong URL.** Cần verify, nhưng nếu filter chỉ ở `useState` thì:

- Không share được link kết quả filter
- Back button không quay lại filter trước
- Reload mất hết filter
- Không track được filter nào được dùng nhiều

### 5.2 Filter state → URL

```tsx
// src/hooks/useProductFilters.ts
import { useSearchParams } from 'react-router-dom'

export function useProductFilters() {
  const [params, setParams] = useSearchParams()

  const filters = {
    q:        params.get('q') ?? '',
    danhMuc:  params.getAll('danh_muc'),
    minPrice: params.get('min') ? Number(params.get('min')) : undefined,
    maxPrice: params.get('max') ? Number(params.get('max')) : undefined,
    sort:     (params.get('sort') ?? 'moi_nhat') as SortKey,
    // Filter đặc thù cho perishable — không có ở e-commerce thường
    conHang:  params.get('con_hang') === '1',
    page:     Number(params.get('page') ?? 1),
  }

  const setFilter = (patch: Partial<typeof filters>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([k, v]) => {
      const key = PARAM_MAP[k]
      next.delete(key)
      if (Array.isArray(v)) v.forEach((x) => next.append(key, String(x)))
      else if (v !== undefined && v !== '' && v !== false) next.set(key, String(v))
    })
    // Đổi filter luôn reset về trang 1
    if (!('page' in patch)) next.delete('page')
    // replace: true → không nhồi history entry cho mỗi keystroke
    setParams(next, { replace: true })
  }

  return { filters, setFilter }
}
```

`replace: true` quan trọng: nếu `push`, mỗi ký tự gõ vào search box tạo một history entry → back button phải bấm 20 lần mới ra khỏi trang.

### 5.3 Layout filter

```
Desktop (>= lg)                      Mobile
┌────────┬──────────────────────┐   ┌────────────────────┐
│ Filter │ 24 kết quả  [Sắp xếp▾]│  │ 24 kết quả         │
│ sidebar│ [chip] [chip] [Xoá]  │   │ [Lọc 2] [Sắp xếp▾] │
│ sticky │ ┌────┬────┬────┬────┐│   │ [chip][chip][Xoá]  │
│ w-64   │ │card│card│card│card││   │ ┌──────┬──────┐    │
│        │ └────┴────┴────┴────┘│   │ │ card │ card │    │
│        │      [phân trang]    │   │ └──────┴──────┘    │
└────────┴──────────────────────┘   └────────────────────┘
                                      ↑ "Lọc" mở Drawer side="bottom"
```

- Desktop: sidebar `sticky top-20` (dưới header 64px + 16px).
- Mobile: nút "Lọc" có badge số filter đang bật → `Drawer side="bottom"`, footer drawer có "Xoá tất cả" + "Xem N kết quả".
- **Applied filter chips** hiện dưới header kết quả ở cả 2 breakpoint — người dùng phải thấy mình đang lọc gì mà không cần mở panel. Đây là thứ hay bị bỏ và gây confusion "sao ít kết quả vậy".

**Nút trong drawer filter ghi số kết quả:** "Xem 24 kết quả" thay vì "Áp dụng". Người dùng biết trước kết quả có gì trước khi đóng drawer → giảm mở-đóng lặp lại.

### 5.4 Filter "Chỉ hiện còn hàng" — bật mặc định hay không?

Đề xuất: **bật mặc định**, có chip hiện rõ để tắt được.

Lý do: với perishable, hiển thị sản phẩm hết hàng làm loãng kết quả và gây thất vọng. Nhưng phải cho tắt được (khách muốn biết bakery có làm loại bánh đó không, để đặt pre-order).

Trade-off phải chấp nhận: bật mặc định thì tổng số kết quả nhỏ hơn, có thể trông "ít sản phẩm". Chấp nhận được — thà ít mà mua được.

### 5.5 Tách file

```
src/pages/SearchPage.tsx                  ~90 dòng: layout + ghép
src/components/catalog/
├── filter-panel.tsx        (desktop sidebar + mobile drawer dùng CHUNG component con)
├── filter-chips.tsx
├── sort-select.tsx
├── result-header.tsx       ("24 kết quả" + sort)
├── product-grid-section.tsx (grid + skeleton + empty + error)
└── pagination.tsx
src/hooks/useProductFilters.ts
src/hooks/useProducts.ts     (fetch + cache, dùng chung cho Search/Category)
```

Desktop sidebar và mobile drawer **phải render cùng một component filter con**. Nếu viết 2 bản, chúng sẽ lệch nhau sau 2 sprint — lỗi kinh điển.

---

## 6. `CategoryListingPage` vs `SearchPage`

Hai trang này về bản chất là **cùng một trang**: grid sản phẩm + filter + sort + pagination. Khác duy nhất: category page có `danh_muc` cố định từ URL param và có heading/mô tả riêng.

**Khuyến nghị:** `CategoryListingPage` render `<ProductListing>` với `lockedFilters={{ danhMuc: [slug] }}`. Không duplicate 230 dòng logic.

```tsx
// src/pages/CategoryListingPage.tsx  — ~50 dòng
export default function CategoryListingPage() {
  const { category } = useParams()
  const { data: cat } = useCategory(category!)

  return (
    <>
      <Breadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: cat?.ten ?? category! }]} />
      <Container>
        <SectionHeader level="h1" title={cat?.ten ?? ''} description={cat?.mo_ta} />
        <ProductListing lockedFilters={{ danhMuc: [category!] }} />
      </Container>
    </>
  )
}
```

`level="h1"` — trang category thì tên danh mục **là** h1 của trang. Đừng để h1 là logo hay tên site.

---

## 7. Home page

### 7.1 `HeroBanner`

| Cần fix | Cách |
|---|---|
| Ảnh hero là LCP element → phải tối ưu | `<img>` không phải CSS `background-image` (CSS background không preload được), `loading="eager"` `fetchPriority="high"`, `<link rel="preload">` trong `index.html` |
| Text trên ảnh phải đọc được ở mọi ảnh | Overlay `bg-hero-scrim` (token duy nhất được phép gradient). Text trắng trên ảnh sáng mà không scrim là fail contrast không đoán trước được |
| Aspect ratio đổi theo breakpoint | `aspect-hero-mobile` (4:5) trên mobile, `aspect-hero` (16:9) từ `md`. Hero 16:9 trên mobile chỉ cao ~210px, không đủ tạo ấn tượng |
| CTA phải cụ thể | "Xem bánh hôm nay" tốt hơn "Khám phá" — nói rõ sẽ đến đâu và ngụ ý sản phẩm tươi mỗi ngày |

Contrast text trên ảnh: không thể tính trước vì phụ thuộc ảnh. Scrim `rgb(36 27 20 / 0.72)` ở đáy đảm bảo text trắng đạt ≥ 4.5:1 bất kể ảnh gốc — đó là lý do scrim là gradient chứ không phải overlay phẳng (giữ được ảnh rõ ở trên, đảm bảo text ở dưới).

### 7.2 `BestSellers` — dữ liệu đang giả

`services/productService.ts:20-28`:

```ts
export async function getBestSellers(limit: number = 3): Promise<Product[]> {
  // For now, get active products and take first N
  // Later can be enhanced with backend endpoint for best sellers
  const products = await getProducts({ dang_hoat_dong: true, limit })
  return products.slice(0, limit)
}
```

"Bán chạy nhất" hiện tại = 3 sản phẩm đầu tiên trong DB. Đây là **thông tin sai** hiển thị cho khách, và là điểm chí tử nếu recruiter đọc code.

Backend đã có `app/routers/analytics.py` và `reports.py` (`AdminSalesPage` dùng "sales reporting based on real backend sales data" theo README). Nghĩa là dữ liệu bán hàng thật **đã có**.

**Hai lựa chọn:**

- **A (khuyến nghị):** thêm `GET /products/best-sellers?limit=8&period=30d` dùng dữ liệu đơn hàng thật. Backend đã có bảng chi tiết đơn — chỉ cần `SUM(so_luong) GROUP BY sanpham_id ORDER BY DESC`.
- **B:** đổi tên section thành "Sản phẩm mới" / "Gợi ý cho bạn" cho khớp với dữ liệu thật đang trả về.

Không được giữ nguyên. Hiển thị "Bán chạy nhất" cho dữ liệu không phải bán chạy là sai với người dùng, và với `custom_instructions` mục 1 ("Every feature must address a real pain point") thì đây là feature giả.

### 7.3 `SeasonalMiniSection` + `config/seasons.ts`

`seasons.ts` chứa hex màu inline (comment ở `tokens.css` cũ nói rõ điều đó). Chuyển sang reference token:

```ts
// src/config/seasons.ts
export const SEASONS = [
  {
    id: 'tet',
    from: '01-20', to: '02-15',
    // Reference token, KHÔNG hex. Đổi brand không phải sửa file này.
    accentVar: '--terra-600',
    miniSection: { cards: [...] },
    // decoration ĐÃ BỎ — FloatingEmojiOverlay xoá ở spec 03 §1.7
  },
] as const
```

---

## 8. GiftBox pages

`GiftBoxDetailPage` (233 dòng), `GiftBoxListPage`, `GiftBoxCard`, `GiftBoxFilters` (203), `GiftBoxGallery`, `GiftBoxStory`, `GiftBoxSummary`.

Gift box là feature khác biệt của project (có BOM — `AdminGiftBoxBomPage` 488 dòng), nên UI phải kể được:

| Cần | Hiện có? | Việc |
|---|---|---|
| Hiện **thành phần** trong hộp (BOM) | Backend có BOM. Frontend cần verify | Nếu chưa, thêm — "trong hộp có gì" là câu hỏi số 1 của khách mua hộp quà |
| Hạn dùng của hộp = min(hạn các thành phần) | Chưa | `StockSignal` với `hsd = min(component.ngay_het_han)`. Đây là chỗ FEFO nhiều lớp lộ ra rõ nhất, kể chuyện tốt nhất |
| Chọn dịp (`phu_hop_dip`) | Có trong `Product.phu_hop_dip` | `GiftBoxFilters` filter theo dịp — verify đã dùng chưa |
| Thông điệp/lời chúc kèm hộp | Chưa rõ | Nếu backend chưa có, ghi backlog — hộp quà không có chỗ ghi lời chúc là thiếu cơ bản |

Reuse: `GiftBoxCard` và `ProductCard` nên dùng chung `Card` primitive + `StockSignal`, khác nhau ở nội dung meta (số món trong hộp thay mô tả).

---

## 9. Loading & error state cho catalog

```tsx
// src/components/catalog/product-grid-section.tsx
export function ProductGridSection({ status, products, error, retry }: Props) {
  if (status === 'loading') {
    return (
      <ProductGrid aria-busy="true">
        {/* Số skeleton = số card thật kỳ vọng, để layout không nhảy khi data về */}
        {Array.from({ length: 8 }, (_, i) => (
          <li key={i}><SkeletonCard /></li>
        ))}
      </ProductGrid>
    )
  }

  if (status === 'error') {
    return (
      <Alert variant="danger">
        <AlertTitle>Không tải được danh sách sản phẩm</AlertTitle>
        <AlertDescription>{error?.message ?? 'Vui lòng thử lại.'}</AlertDescription>
        <Button variant="secondary" size="sm" onClick={retry} className="mt-3">Thử lại</Button>
      </Alert>
    )
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="Không tìm thấy sản phẩm phù hợp"
        description="Thử bỏ một vài bộ lọc, hoặc xem tất cả sản phẩm."
        action={<Button variant="secondary" onClick={clearFilters}>Xoá bộ lọc</Button>}
      />
    )
  }

  return (
    <>
      {/* Live region: screen reader biết số kết quả đã đổi sau khi filter */}
      <p aria-live="polite" className="sr-only">Tìm thấy {products.length} sản phẩm</p>
      <ProductGrid>
        {products.map((p, i) => (
          <li key={p.sanpham_id}>
            <ProductCard product={p} priority={i < 4} />
          </li>
        ))}
      </ProductGrid>
    </>
  )
}
```

**Empty state phải có đường ra.** "Không tìm thấy" mà không có nút gì là dead end — người dùng đóng tab. Nút "Xoá bộ lọc" là đường ra rẻ nhất.

**`aria-live` cho số kết quả:** người dùng screen reader gõ vào search box, kết quả đổi ngầm mà không có thông báo → họ không biết có kết quả hay không.

---

## 10. Files phải sửa

### Backend (không phải UI, nhưng D14 phụ thuộc)
| File | Việc | Ưu tiên |
|---|---|---|
| `app/services/fefo.py:8` | Thêm `LoHangSanPham.ngay_het_han >= date.today()` vào `where` | **P0 — bug bán hàng hết hạn** |
| `app/routers/products.py` | Thêm `GET /{id}/availability`; thêm 3 field tồn kho vào `ProductResponse` | P1 |
| `app/routers/products.py` | Thêm `GET /products/best-sellers` (hoặc đổi tên section ở FE) | P1 |
| `app/routers/products.py` | Thêm `huong_dan_bao_quan` vào `ProductResponse` | P2 |

### Frontend — tạo mới
`src/utils/inventory.ts`, `src/components/bakery/stock-signal.tsx`, `src/components/ui/product-image.tsx`, `src/components/catalog/{filter-panel,filter-chips,sort-select,result-header,product-grid-section,pagination,product-listing}.tsx`, `src/components/ui/breadcrumb.tsx`, `src/hooks/{useProductFilters,useProducts,useAvailability}.ts`

### Frontend — sửa
| File | Việc |
|---|---|
| `src/components/bakery/ProductCard.tsx` → `product-card.tsx` | Viết lại §3 |
| `src/pages/ProductDetailPage.tsx` | §4 — sticky bar, ngày giao, RadioGroup biến thể, StockSignal |
| `src/pages/SearchPage.tsx` | §5 — từ 412 xuống ~90 dòng, filter vào URL |
| `src/pages/CategoryListingPage.tsx` | §6 — dùng `ProductListing`, từ 230 xuống ~50 dòng |
| `src/components/bakery/HeroBanner.tsx` | §7.1 |
| `src/components/bakery/BestSellers.tsx` | §7.2 — dữ liệu thật hoặc đổi tên |
| `src/services/productService.ts` | Bỏ fake `getBestSellers`; thêm `getAvailability` |
| `src/types/product.ts` | Thêm `tong_kha_dung`, `trang_thai_ton`, `ngay_het_han_gan_nhat` |
| `src/config/seasons.ts` | §7.3 — token reference, bỏ `decoration` |
| `src/components/bakery/GiftBoxCard.tsx` | Dùng `Card` + `StockSignal` |
| `src/pages/GiftBoxDetailPage.tsx` | §8 — hiện BOM, hạn dùng |
| `src/components/bakery/GiftBoxFilters.tsx` | Dùng chung `FilterPanel` |

---

## 11. Acceptance criteria

### D14 — inventory lên UI
- [ ] `GET /products/1/availability` trả đúng shape §2.3
- [ ] Sản phẩm có `so_luong_kha_dung = 0` → card mờ + badge "Tạm hết hàng" + nút "Thêm" **disabled**
- [ ] Sản phẩm còn ≤ 3 → badge "Còn N", N khớp DB
- [ ] Sản phẩm có lô hết hạn hôm nay → badge "Dùng trong hôm nay"
- [ ] `QuantityStepper` trên ProductDetail: `max` = `so_luong_kha_dung`, không tăng vượt được
- [ ] Biến thể hết hàng trong RadioGroup: `disabled` + `line-through` + screen reader đọc "(hết hàng)"
- [ ] **Bug FEFO:** tạo lô `ngay_het_han` = hôm qua, `so_luong_hien_tai` = 5 → đặt hàng → allocation **không** lấy lô đó

### Filter & URL
- [ ] Chọn filter → URL đổi; copy URL mở tab mới → filter giữ nguyên
- [ ] Back button quay lại filter trước, **không** phải bấm 20 lần sau khi gõ search
- [ ] Reload → filter giữ
- [ ] Đổi filter → về trang 1
- [ ] Chip filter hiện đúng số filter đang bật; nút "Xoá tất cả" hoạt động
- [ ] Mobile: nút "Lọc" có badge số; drawer footer ghi "Xem N kết quả" với N đúng

### Performance
- [ ] Lighthouse trên `/`: **LCP < 2.5s**, **CLS < 0.1**
- [ ] Network: grid 12 sản phẩm → chỉ 4 ảnh đầu tải ngay, 8 ảnh còn lại lazy
- [ ] Mọi `<img>` sản phẩm có `width` + `height` → grid **không** nhảy khi ảnh load (quay video scroll để kiểm)
- [ ] Hero image có `<link rel="preload">` trong `index.html`
- [ ] Trang danh sách: **1** request availability (không phải N)

### A11y
- [ ] Tab qua grid 12 sản phẩm: đúng 24 stop (12 link + 12 nút thêm), không 36+
- [ ] Screen reader đọc grid → thông báo "danh sách, 12 mục"
- [ ] Filter đổi → live region đọc "Tìm thấy N sản phẩm"
- [ ] Mọi `<img>` có `alt` mô tả (ảnh trang trí thì `alt=""` + `aria-hidden`)
- [ ] `grep -rn "aspect-\|width=" src/components/bakery/product-card.tsx` → có cả hai
- [ ] Trang category: `h1` là tên danh mục; kiểm heading outline bằng extension (headingsMap) → không nhảy level
- [ ] Trên iPhone thật: sticky add-to-cart bar **không** bị home indicator che

### Trung thực dữ liệu
- [ ] Section "Bán chạy nhất" hoặc dùng dữ liệu bán hàng thật, hoặc đã đổi tên
- [ ] `grep -n "For now" src/services/productService.ts` → 0 kết quả

---

## TL;DR

- **D14 không sửa được bằng frontend một mình.** `ProductResponse` (`app/routers/products.py:58`) không có field tồn kho nào. Cần `GET /{id}/availability` + 3 field vào response list. Đây là phần giá trị cao nhất của cả bộ spec: FEFO/batch là feature khó nhất của backend mà hiện tại **vô hình** với người mở demo.
- **Phát hiện bug backend P0 khi đọc code:** `alloc_fefo_by_variant` chỉ filter `so_luong_hien_tai > 0`, **không** filter `ngay_het_han >= today`. Bakery đang có thể phân bổ và bán lô đã hết hạn. Nghiêm trọng hơn mọi vấn đề UI trong bộ spec này.
- **`getBestSellers` là dữ liệu giả** (`productService.ts:20` — lấy 3 sản phẩm đầu DB, có comment "For now"). Hiển thị "Bán chạy nhất" cho dữ liệu không phải bán chạy → phải sửa hoặc đổi tên.
- Ngưỡng "còn N" dùng `max(3, ceil(nguong*0.3))` chứ không dùng thẳng `muc_gioi_han_ton`: tín hiệu khan hiếm chỉ được hiện khi nó **thật**.
- Sticky add-to-cart bar trên mobile + ngày giao sớm nhất hiện ngay trên trang sản phẩm — hai thứ này tác động chuyển đổi lớn hơn mọi thay đổi màu sắc trong bộ spec.
- `SearchPage` (412) và `CategoryListingPage` (230) là **cùng một trang**. Gộp thành `ProductListing`, filter state vào URL để share/back/reload hoạt động.
- Ảnh: `aspect-ratio` thay `h-64`, có `width`/`height` chống CLS, `lazy` trừ 4 ảnh đầu.
