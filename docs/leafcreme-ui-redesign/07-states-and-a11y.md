# Spec 07 — States, Feedback, Accessibility baseline

> Cross-cutting. Áp dụng song song với phase 2-6, không phải một phase riêng.
> Đây là spec định nghĩa **hợp đồng**: mọi trang phải xử lý đủ 5 state, và phải pass a11y baseline.

---

## 1. Hiện trạng a11y — số liệu

| Chỉ số | Số đo | Ý nghĩa |
|---|---|---|
| `focus-visible` trong `.tsx` | **0** | Không nơi nào định nghĩa focus indicator đúng cách |
| `focus:outline-none` | **52** | 52 chỗ tắt focus indicator |
| `aria-*` + `role=` trên toàn bộ 152 files | **29** | Trung bình 0.19 attribute/file |
| `<label>` | 52 | |
| `htmlFor` | 33 | → **19 label mồ côi** |
| `<img>` | 22 | |
| `alt=` | 25 | Có vẻ đủ, nhưng cần kiểm chất lượng alt, không chỉ số lượng |
| `autoComplete` | **0** | WCAG 1.3.5 fail (spec 06 §3) |
| Skip link | **0** | WCAG 2.4.1 |
| `<div onClick>` / `<span onClick>` | 0 | Tốt — nhưng `Card` nhận `onClick` qua props nên vẫn có (spec 02 §6.1) |
| `dark:` | 0 | Không nằm trong scope |

29 ARIA attribute cho một app 152 file có form thanh toán, modal, dropdown, tab, toast — nghĩa là a11y chưa từng được xử lý một cách hệ thống.

---

## 2. Hợp đồng 5 state — mọi màn hình fetch dữ liệu

Mỗi màn hình đọc dữ liệu **phải** xử lý đủ 5 state. Đây là checklist review, không phải gợi ý.

| State | Yêu cầu | Sai phổ biến |
|---|---|---|
| **1. Loading** | Skeleton khớp layout thật (số lượng, kích thước). `aria-busy="true"` trên container | Spinner giữa màn hình trắng → layout nhảy khi data về |
| **2. Empty** | Giải thích **vì sao** trống + **1 hành động** thoát ra | "Không có dữ liệu" rồi hết → dead end |
| **3. Error** | Nói cái gì fail, có nút **Thử lại**, không lộ stack trace | Toast lỗi rồi biến mất, người dùng thấy màn hình trắng |
| **4. Partial** | Data cũ + đang refetch → giữ data cũ, hiện indicator nhẹ. Không xoá nội dung | Chuyển về skeleton mỗi lần refetch → màn hình nhấp nháy |
| **5. Success** | Nội dung + live region báo số lượng nếu là danh sách | Không announce → screen reader không biết kết quả đổi |

### 2.1 Loading — skeleton phải khớp layout

```tsx
// SAI: spinner giữa trang
{loading && <div className="flex h-96 items-center justify-center"><Spinner /></div>}

// ĐÚNG: skeleton giữ đúng hình dạng, số lượng, tỉ lệ
{loading && (
  <ProductGrid aria-busy="true">
    {Array.from({ length: 8 }, (_, i) => <li key={i}><SkeletonCard /></li>)}
  </ProductGrid>
)}
```

```tsx
// src/components/ui/skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      // aria-hidden: skeleton là placeholder thị giác, AT không cần đọc.
      // Container ngoài đã có aria-busy để báo trạng thái.
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-md bg-bg-inset',
        // Shimmer bằng ::after translate — GPU-friendly, không animate background-position
        'after:absolute after:inset-0 after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent',
        // Tôn trọng reduced-motion: giữ khối xám tĩnh
        'motion-reduce:after:hidden',
        className
      )}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-surface">
      {/* aspect-product KHỚP với CardMedia thật → không có CLS khi data về */}
      <Skeleton className="aspect-product rounded-none" />
      <div className="flex flex-col gap-2 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-2 flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  )
}
```

**Skeleton phải dùng cùng token layout với component thật** (`aspect-product`, `rounded-lg`, `p-5`). Skeleton lệch kích thước còn tệ hơn spinner vì nó hứa một layout rồi đổi.

**Không animate `background-position`.** Cách shimmer phổ biến (`bg-[length:200%] animate-[bgpos]`) buộc browser repaint toàn khối mỗi frame. `::after` + `translateX` chỉ composite → 60fps kể cả 20 skeleton cùng lúc.

### 2.2 Empty state

```tsx
// src/components/ui/empty-state.tsx
export function EmptyState({
  icon: Icon, title, description, action, secondaryAction,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  secondaryAction?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-16 text-center">
      {Icon && (
        <div className="mb-4 grid size-12 place-items-center rounded-full bg-bg-inset">
          <Icon className="size-6 text-fg-subtle" aria-hidden />
        </div>
      )}
      <h3 className="text-lg font-semibold text-fg-strong">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-fg-muted">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">{action}{secondaryAction}</div>
      )}
    </div>
  )
}
```

**Mọi empty state phải có ít nhất 1 action.** Bảng nội dung cho các trường hợp trong app:

| Nơi | Title | Description | Action |
|---|---|---|---|
| Search 0 kết quả | Không tìm thấy sản phẩm phù hợp | Thử bỏ một vài bộ lọc, hoặc xem tất cả sản phẩm. | Xoá bộ lọc |
| Category trống | Danh mục này chưa có sản phẩm | Cửa hàng đang chuẩn bị thêm. | Xem tất cả sản phẩm |
| Giỏ hàng trống | Giỏ hàng đang trống | Thêm vài chiếc bánh để bắt đầu. | Xem sản phẩm |
| Chưa có đơn hàng | Bạn chưa có đơn hàng nào | Đơn hàng của bạn sẽ xuất hiện ở đây. | Xem sản phẩm |
| Filter đơn hàng 0 kết quả | Không có đơn nào ở trạng thái này | | Xem tất cả đơn |
| Gift box trống | Chưa có hộp quà nào | | Xem sản phẩm lẻ |

Nội dung viết theo giọng người thật, không dùng "Không có dữ liệu" / "No data available".

### 2.3 Error state

```tsx
// src/components/ui/alert.tsx
const alertVariants = cva('flex gap-3 rounded-md border p-4 text-sm', {
  variants: {
    variant: {
      info:    'border-info/20    bg-info-bg    text-info',
      success: 'border-success/20 bg-success-bg text-success',
      warning: 'border-warning/20 bg-warning-bg text-warning',
      danger:  'border-danger/20  bg-danger-bg  text-danger',
    },
  },
  defaultVariants: { variant: 'info' },
})

export function Alert({ variant, className, children, ...props }: AlertProps) {
  return (
    <div
      // role: alert cho lỗi (ngắt lời AT ngay), status cho các loại khác (đợi lượt)
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      <VariantIcon variant={variant} className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex-1">{children}</div>
    </div>
  )
}
```

**`role="alert"` chỉ cho lỗi.** `role="alert"` có `aria-live="assertive"` — nó **ngắt lời** những gì screen reader đang đọc. Dùng cho mọi loại thông báo là spam. Success/info dùng `role="status"` (`polite`, đợi hết câu).

**Icon `aria-hidden`.** Icon chỉ là kênh phụ; variant đã có border + bg + text color, và nội dung text mới là thông tin. Nhưng icon vẫn cần thiết cho người không phân biệt màu (WCAG 1.4.1) — nên giữ icon, chỉ ẩn khỏi AT vì text đã nói đủ.

**Thông báo lỗi — quy tắc nội dung:**

```
SAI:  "Error: Request failed with status code 500"
SAI:  "Có lỗi xảy ra"
ĐÚNG: "Không tải được danh sách sản phẩm. Kiểm tra kết nối mạng rồi thử lại."
      [Thử lại]
```

Ba yếu tố bắt buộc: (1) **cái gì** fail, (2) **có thể làm gì**, (3) **nút** để làm điều đó.

**Không lộ chi tiết kỹ thuật cho người dùng cuối** — vừa vô dụng vừa lộ thông tin hệ thống. Log chi tiết vào console/monitoring, hiện thông điệp người đọc được.

### 2.4 Partial — đừng xoá nội dung khi refetch

```tsx
// SAI: mỗi lần đổi filter → về skeleton → màn hình nhấp nháy
if (isLoading) return <Skeleton />

// ĐÚNG: chỉ skeleton ở lần load ĐẦU. Refetch thì giữ data cũ + mờ nhẹ
if (isLoading && !data) return <SkeletonGrid />

return (
  <div className={cn('transition-opacity', isFetching && 'opacity-60')} aria-busy={isFetching}>
    <ProductGrid>{...}</ProductGrid>
  </div>
)
```

Đây là khác biệt lớn nhất về cảm giác "app mượt" vs "app giật", và nó không tốn gì để làm đúng.

### 2.5 Error boundary — hiện chưa có

```bash
$ grep -rn "ErrorBoundary\|componentDidCatch\|errorElement" frontend/src
# (0 kết quả — đã verify)
```

**Xác nhận: app không có error boundary nào.** Nghĩa là một lỗi trong `ProductCard` (ví dụ `product.gia_co_ban` là `null` và `formatPrice` throw) làm **trắng toàn bộ app**. Người dùng không thấy gì, không biết làm gì.

```tsx
// src/components/error-boundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    // TODO: gửi tới monitoring (Sentry)
  }
  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <Container className="py-20">
          <EmptyState
            icon={AlertTriangle}
            title="Đã có lỗi xảy ra"
            description="Rất tiếc, phần này không tải được. Thử tải lại trang, hoặc quay về trang chủ."
            action={<Button onClick={() => window.location.reload()}>Tải lại trang</Button>}
            secondaryAction={<Button variant="secondary" asChild><Link to="/">Về trang chủ</Link></Button>}
          />
        </Container>
      )
    }
    return this.props.children
  }
}
```

**Đặt ở 3 tầng:**

1. Bọc toàn app trong `App.tsx` — chặn màn hình trắng
2. Bọc mỗi route — lỗi ở 1 trang không kéo cả app
3. Bọc các widget độc lập (`LeafieChatPanel`, `BestSellers`, `SeasonalMiniSection`) — chatbot lỗi thì trang vẫn dùng được

Tầng 3 quan trọng với `LeafieChatPanel` vì nó gọi n8n bên ngoài — dependency ngoài tầm kiểm soát nhất trong app.

---

## 3. Toast — quy tắc dùng

Nhắc lại từ spec 02 §8 vì hay bị lạm dụng:

| Dùng toast | Không dùng toast |
|---|---|
| "Đã thêm vào giỏ" | Lỗi validation form → `ErrorText` cạnh field |
| "Đã lưu thông tin" | Lỗi cần retry → `Alert` inline có nút |
| "Đã xoá — [Hoàn tác]" | Thông tin người dùng cần đọc kỹ → `Alert` hoặc `Dialog` |
| "Đã copy" | Trạng thái đang diễn ra → skeleton / `aria-busy` |

**Lý do:** toast biến mất sau 5s. Bất cứ thứ gì người dùng cần **hành động** hoặc **đọc lại** thì không được để nó tự biến mất.

Cấu hình: tối đa 3 toast đồng thời, `duration` 5000ms, toast lỗi `duration: Infinity` + nút đóng.

**Toast không được đánh cắp focus.** Radix Toast xử lý sẵn. Nếu toast focus vào chính nó, người dùng đang gõ vào field sẽ bị nhảy ra — lỗi a11y nghiêm trọng.

---

## 4. A11y baseline — hợp đồng bắt buộc

Đây là danh sách phải pass trước khi merge bất kỳ phase nào.

### 4.1 Bàn phím

- [ ] **Mọi** chức năng dùng được bằng bàn phím (WCAG 2.1.1)
- [ ] **Mọi** element focus được có indicator nhìn thấy rõ (WCAG 2.4.7) — đã giải quyết toàn cục ở spec 01 §8
- [ ] Không có bẫy focus ngoài modal (WCAG 2.1.2)
- [ ] Thứ tự Tab khớp thứ tự thị giác (WCAG 2.4.3)
- [ ] `Escape` đóng modal/drawer/popover; focus quay về trigger
- [ ] Tab: mũi trái/phải điều hướng; Radio: mũi lên/xuống
- [ ] Không dùng `tabIndex` dương ở đâu cả (`grep -rn 'tabIndex={[1-9]' src` → 0)

### 4.2 Ngữ nghĩa

- [ ] Đúng **1** `<h1>` mỗi trang, nội dung nói trang này là gì
- [ ] Heading không nhảy level (h1→h3 là fail)
- [ ] Landmark đầy đủ: `header`, `nav` (có `aria-label` phân biệt), `main`, `footer`, `search`
- [ ] Danh sách dùng `<ul>`/`<li>`, không `<div>`
- [ ] Điều hướng dùng `<a>`/`<Link>`; hành động dùng `<button>` — không hoán đổi
- [ ] `<fieldset>` + `<legend>` cho mọi nhóm radio/checkbox
- [ ] `<table>` chỉ dùng cho dữ liệu bảng thật, có `<th scope>`
- [x] `lang="vi"` trên `<html>` — **đã đúng** (`index.html:2`), giữ nguyên

### 4.3 Form

- [ ] Mọi input có label gắn đúng (dùng `FormField` — spec 02 §4)
- [ ] Mọi input có `autoComplete` phù hợp (spec 06 §3)
- [ ] Lỗi gắn với field qua `aria-describedby` + `aria-invalid`
- [ ] Lỗi mô tả **cách sửa**, không chỉ nói sai
- [ ] Field bắt buộc đánh dấu bằng cả `*` (thị giác) và `required`/`sr-only "(bắt buộc)"` (AT)
- [ ] Submit khi có lỗi → focus vào field lỗi đầu tiên
- [ ] Placeholder **không** thay label
- [ ] Placeholder đạt contrast 4.5:1 (dùng `--fg-subtle`, **không** `--fg-disabled`)

### 4.4 Màu & contrast

- [ ] Text thường ≥ 4.5:1; text lớn (≥24px hoặc ≥19px bold) ≥ 3:1
- [ ] Viền input/checkbox/radio ≥ 3:1 (dùng `--border-interactive`)
- [ ] Focus ring ≥ 3:1 với cả nền và element
- [ ] **Không** truyền thông tin chỉ bằng màu (WCAG 1.4.1) — mọi trạng thái phải có kênh thứ 2: text, icon, gạch ngang, hoặc pattern
- [ ] `npm run check:contrast` pass

### 4.5 Ảnh & media

- [ ] Ảnh có nội dung: `alt` mô tả nội dung
- [ ] Ảnh trang trí: `alt=""` + `aria-hidden` (đừng bỏ trống attribute)
- [ ] Icon trong button có text: icon `aria-hidden`, text làm accessible name
- [ ] Icon-only button: có `aria-label` hoặc `sr-only` text
- [ ] `alt` **không** bắt đầu bằng "Ảnh của" / "Hình" — AT đã nói đó là image
- [ ] Mọi `<img>` có `width` + `height` (chống CLS)

### 4.6 Motion

- [ ] `prefers-reduced-motion: reduce` → không animation, không parallax, không auto-play
- [ ] Không animation lặp vô hạn > 5s mà không có cách dừng (WCAG 2.2.2) — đã bỏ `FloatingEmojiOverlay`
- [ ] Không nhấp nháy > 3 lần/giây (WCAG 2.3.1)

### 4.7 Target size

- [ ] Target tương tác ≥ 44×44 CSS px (khuyến nghị mobile; WCAG 2.5.8 AA yêu cầu 24×24)
- [ ] Target liền nhau có khoảng cách ≥ 8px

### 4.8 Đặc thù tiếng Việt

- [ ] `lang="vi"` để screen reader đọc đúng dấu
- [ ] Font hỗ trợ đầy đủ dấu tiếng Việt — kiểm `ằ ẳ ẵ ặ ộ ợ ự ỹ` không bị fallback sang font khác
- [ ] `line-height` ≥ 1.5 cho body — tiếng Việt có dấu trên **và** dưới (ệ, ộ), cần nhiều không gian dọc hơn tiếng Anh. Đây là lý do `--leading-relaxed: 1.65` cho body ở spec 01
- [ ] Text zoom 200% → không mất nội dung, không overflow ngang (WCAG 1.4.4)
- [ ] Nhãn tiếng Việt dài hơn tiếng Anh ~20-30% → kiểm nút không bị tràn ("Thêm vào giỏ hàng" vs "Add to cart")

---

## 5. Quy trình kiểm tra

### 5.1 Tự động — chạy trong CI

```jsonc
// package.json
"scripts": {
  "check:contrast": "python3 docs/contrast-check.py",
  "check:tokens":   "! grep -rEn '#[0-9a-fA-F]{6}' src --include=*.tsx --exclude-dir=admin",
  "check:focus":    "! grep -rn 'focus:outline-none' src --include=*.tsx --exclude-dir=admin",
  "check:links":    "! grep -rn '<a[^>]*href=\"/' src --include=*.tsx",
  "check:a11y":     "vitest run --dir src --testNamePattern a11y",
  "check:all":      "npm run lint && npm run check:contrast && npm run check:tokens && npm run check:focus && npm run check:links"
}
```

Test a11y tự động bằng `vitest-axe`:

```tsx
// src/pages/__tests__/a11y.test.tsx
import { axe } from 'vitest-axe'

const PAGES = [
  ['Home',     <BakeryHomePage />],
  ['Search',   <SearchPage />],
  ['Cart',     <CartPage />],
  ['Checkout', <CheckoutPage />],
  ['Login',    <LoginPage />],
  ['Register', <RegisterPage />],
  ['Profile',  <UserProfilePage />],
] as const

describe.each(PAGES)('a11y: %s', (name, element) => {
  it('không có violation', async () => {
    const { container } = render(withProviders(element))
    await waitForLoadingToFinish()
    expect(await axe(container)).toHaveNoViolations()
  })
})
```

**Giới hạn phải hiểu rõ:** axe bắt được khoảng **30-40%** vấn đề a11y — chủ yếu là thứ kiểm được từ DOM tĩnh (thiếu alt, thiếu label, contrast, ARIA sai cú pháp). Nó **không** bắt được:

- Thứ tự Tab có hợp lý không
- Focus có quay về trigger sau khi đóng modal không
- Thông báo lỗi có được đọc không
- Nội dung `alt` có nghĩa không (`alt="image"` pass axe)
- Skip link có hoạt động không

Nên axe là sàn, không phải trần. Đừng coi "0 axe violation" là "app accessible".

### 5.2 Thủ công — checklist mỗi phase

**Test 1 — chỉ dùng bàn phím (10 phút).** Rút chuột ra. Hoàn thành luồng: trang chủ → tìm sản phẩm → xem chi tiết → thêm giỏ → checkout → đặt hàng. Ghi lại mọi chỗ bị kẹt.

Đây là test giá trị nhất so với thời gian bỏ ra. Nó phát hiện được gần hết vấn đề focus, và bất kỳ ai cũng làm được không cần biết a11y.

**Test 2 — screen reader (20 phút).** NVDA (Windows, miễn phí) hoặc VoiceOver (macOS: Cmd+F5). Cùng luồng trên, nhắm mắt hoặc tắt màn hình. Kiểm: có biết mình đang ở đâu? Có biết lỗi gì? Có biết đơn đặt thành công không?

**Test 3 — zoom 200%** (Ctrl+`+` ×4). Kiểm không mất nội dung, không scroll ngang.

**Test 4 — mobile thật.** Simulator không phát hiện được: `100vh` vs `100dvh`, safe-area-inset, target size thật với ngón tay, độ trễ touch.

**Test 5 — mạng chậm.** DevTools → Slow 3G + CPU throttle 4×. Kiểm 5 state đều hiện đúng, không màn hình trắng, không nhấp nháy.

---

## 6. Định nghĩa "xong" cho mỗi trang

Một trang được coi là xong khi:

```
□ 5 state đều xử lý (loading / empty / error / partial / success)
□ Đúng 1 h1, heading không nhảy level
□ Hoàn thành được toàn bộ chức năng chỉ bằng bàn phím
□ Mọi element focus được có ring nhìn thấy
□ Mọi input có label + autoComplete
□ Lỗi form gắn với field, có aria-invalid + aria-describedby
□ Trạng thái không truyền chỉ bằng màu
□ Mọi img có alt + width + height
□ Target tương tác ≥ 44px
□ 0 hex hardcode
□ 0 focus:outline-none
□ Không dùng <a href="/..."> cho link nội bộ
□ Chạy được ở 375px không scroll ngang
□ Chạy được ở zoom 200%
□ axe: 0 violation
□ Đã test bằng screen reader ít nhất 1 lần
□ Đã test trên 1 thiết bị mobile thật
```

Đưa checklist này vào PR template.

---

## 7. Files phải sửa

### Tạo mới
| File | Nội dung |
|---|---|
| `src/components/ui/skeleton.tsx` | §2.1 — `Skeleton`, `SkeletonText`, `SkeletonCard` |
| `src/components/ui/empty-state.tsx` | §2.2 |
| `src/components/ui/alert.tsx` | §2.3 |
| `src/components/error-boundary.tsx` | §2.5 |
| `src/components/ui/query-state.tsx` | Wrapper gộp 5 state, dùng chung mọi trang |
| `src/pages/__tests__/a11y.test.tsx` | §5.1 |
| `src/test/setup.ts` | Cấu hình `vitest-axe` |
| `.github/PULL_REQUEST_TEMPLATE.md` | Checklist §6 |

### Sửa
| File | Việc |
|---|---|
| `frontend/index.html` | `lang="vi"` đã đúng — **không cần sửa**. Thiếu `<meta name="description">` → thêm. Thêm `<link rel="preload">` cho 2 font + ảnh hero (spec 01 §10, spec 04 §7.1) |
| `src/App.tsx` | Bọc `ErrorBoundary` 3 tầng; `TooltipProvider`; `Toaster` |
| `src/components/ui/index.ts` | Export state component mới |
| `src/contexts/ToastContext.tsx` | Radix Toast; áp quy tắc §3 |
| `package.json` | Script §5.1; thêm `vitest`, `vitest-axe`, `@testing-library/react` |
| **Mọi trang fetch dữ liệu** | Áp hợp đồng 5 state §2 |
| `src/components/layout/EmptyState.tsx` | Chuyển sang `src/components/ui/empty-state.tsx` |
| `src/components/ui/ErrorMessage.tsx` | Thay bằng `alert.tsx` |

---

## 8. Acceptance criteria

### Automated
- [ ] `npm run check:all` pass
- [ ] `npm run check:a11y` — 0 violation trên cả 7 trang
- [ ] `grep -rn 'focus:outline-none' src --include=*.tsx --exclude-dir=admin` → **0**
- [ ] `grep -rn 'tabIndex={[1-9]' src` → **0**
- [ ] `grep -c 'lang="vi"' index.html` → **1**
- [ ] Lighthouse Accessibility ≥ **95** trên `/`, `/search`, `/cart`, `/checkout`, `/login`

### 5 state
- [ ] Throttle Slow 3G: mỗi trang danh sách hiện skeleton **khớp layout**, không spinner giữa màn hình
- [ ] Data về → **không** có layout shift (quay video, so frame)
- [ ] Block API bằng DevTools → hiện `Alert` có nút "Thử lại"; bấm thử lại → refetch thật
- [ ] Đổi filter → nội dung cũ giữ lại + mờ nhẹ, **không** về skeleton
- [ ] Mọi empty state có **≥ 1** nút thoát ra
- [ ] Ném lỗi giả trong `ProductCard` → chỉ khu vực đó hiện fallback, **không trắng cả app**
- [ ] Ném lỗi giả trong `LeafieChatPanel` → trang vẫn dùng bình thường

### Keyboard (Test 1)
- [ ] Hoàn thành luồng mua hàng đầy đủ **chỉ bằng bàn phím**, không kẹt ở đâu
- [ ] Mọi stop trong tab order đều thấy ring terracotta rõ
- [ ] Escape đóng mọi overlay; focus luôn quay về trigger
- [ ] Thứ tự Tab khớp thứ tự nhìn thấy trên cả 375px và 1440px

### Screen reader (Test 2)
- [ ] NVDA/VoiceOver: hoàn thành luồng mua hàng với màn hình tắt
- [ ] Lỗi form được đọc ngay khi xuất hiện
- [ ] Đổi filter → nghe "Tìm thấy N sản phẩm"
- [ ] Đặt hàng thành công → nghe được xác nhận và mã đơn
- [ ] Mọi nút icon-only đọc ra tên có nghĩa (không đọc "button" trơ)
- [ ] Không có toast nào ngắt lời giữa lúc đang gõ form

### Zoom & responsive (Test 3, 4)
- [ ] Zoom 200% trên mọi trang: không mất nội dung, không scroll ngang
- [ ] 320px (thiết bị nhỏ nhất còn phổ biến): không scroll ngang
- [ ] iPhone thật: sticky bar không bị home indicator che; drawer bấm được nút cuối
- [ ] Text tiếng Việt có dấu: kiểm `ệ ộ ự ỹ ằ ặ` hiển thị đúng font, không bị cắt trên/dưới

### Motion
- [ ] Bật `prefers-reduced-motion` → 0 animation chạy; không component nào kẹt state
- [ ] Không animation nào lặp vô hạn

---

## TL;DR

- Số liệu a11y hiện tại: **0** `focus-visible`, **52** `focus:outline-none`, **29** ARIA attribute cho 152 files, **0** `autoComplete`, **0** skip link. A11y chưa từng được xử lý hệ thống.
- Định nghĩa **hợp đồng 5 state** (loading/empty/error/partial/success) — mọi trang fetch dữ liệu phải có đủ. State bị bỏ nhiều nhất là **partial**: refetch mà xoá nội dung cũ → app nhấp nháy.
- **Chưa có error boundary** → một lỗi render (ví dụ `formatPrice(null)`) làm **trắng toàn bộ app**. Cần 3 tầng: app, route, widget. Tầng widget quan trọng nhất cho `LeafieChatPanel` vì nó gọi n8n bên ngoài.
- Skeleton phải dùng **cùng token layout** với component thật, không thì skeleton còn tệ hơn spinner (hứa một layout rồi đổi). Shimmer bằng `::after` + `translateX`, không animate `background-position`.
- `role="alert"` **chỉ** cho lỗi — nó ngắt lời screen reader. Success/info dùng `role="status"`.
- Toast không được dùng cho: lỗi validation, lỗi cần retry, thông tin cần đọc kỹ. Bất cứ gì cần hành động thì không được tự biến mất sau 5s.
- **axe bắt được ~30-40% vấn đề.** "0 axe violation" ≠ accessible. Test bàn phím 10 phút (rút chuột ra) là kiểm tra giá trị nhất so với thời gian bỏ ra.
- Đặc thù tiếng Việt: kiểm `lang="vi"` trong `index.html` (hay bị `en` → screen reader đọc giọng Anh), `line-height` ≥ 1.5 vì dấu nằm cả trên và dưới, và nhãn tiếng Việt dài hơn tiếng Anh 20-30% nên nút dễ tràn.
