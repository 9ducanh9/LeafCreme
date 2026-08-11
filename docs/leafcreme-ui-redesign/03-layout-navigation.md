# Spec 03 — Layout, Navigation, Responsive shell

> Phase 3. Đây là spec chứa **fix cho P0 nghiêm trọng nhất của toàn project**: mobile nav không tồn tại.
> Làm spec này trước tất cả các spec page (04-06).

---

## 1. Hiện trạng

### 1.1 Bug chức năng: không có mobile navigation

`src/components/bakery/Header.tsx:107`

```tsx
<nav className="hidden lg:flex items-center gap-6 ml-6">
  <button onClick={() => navigate('/')}>Trang chủ</button>
  <button onClick={() => navigate('/search')}>Sản phẩm</button>
  <button onClick={() => navigate('/gift-boxes')}>Hộp quà</button>
  <button onClick={() => navigate('/contact')}>Liên hệ</button>
</nav>
```

Không có element nào với `lg:hidden` mở nav trong toàn bộ file (310 dòng). Dưới 1024px, người dùng còn đúng 4 nút: logo, Leafie, cart, user.

**Đường vào bị mất trên mobile/tablet:**

| Trang | Đường vào duy nhất | Còn dùng được dưới 1024px? |
|---|---|---|
| `/search` (Sản phẩm) | nav item | **Không** |
| `/gift-boxes` | nav item | **Không** |
| `/contact` | nav item + footer link | Chỉ qua footer (phải scroll hết trang) |
| `/policies` | footer link | Chỉ qua footer |
| `/categories/:category` | ProductDropdown (hover-only) | **Không** |

`/gift-boxes` là feature được README nêu là điểm khác biệt của sản phẩm, và nó **không có đường vào nào** trên mobile ngoài gõ URL tay.

### 1.2 Bug: Footer dùng `<a href>` cho link nội bộ

`Footer.tsx:34,42`

```tsx
<a href="/contact">Liên hệ</a>
<a href="/policies">Chính sách</a>
```

Trong SPA, `<a href>` gây **full page reload**: mất toàn bộ state (giỏ hàng trong context, auth token trong memory nếu có), tải lại toàn bộ JS bundle, màn hình trắng ~1-2s. Phải dùng `<Link to>`.

### 1.3 Bug: anchor `#menu` trỏ tới id không tồn tại

`Footer.tsx:26` — `<a href="#menu">Menu</a>`

```bash
$ grep -rn 'id="menu"' frontend/src
# (không kết quả)
```

Click "Menu" ở footer → không có gì xảy ra, URL bị thêm `#menu`.

### 1.4 ProductDropdown: hover-only, không có đường vào bằng bàn phím

`Header.tsx:118-134`

```tsx
<button onMouseEnter={() => setShowProductDropdown(true)}>Sản phẩm</button>
<div onMouseEnter={...} onMouseLeave={() => setShowProductDropdown(false)}>
  {showProductDropdown && <ProductDropdown ... />}
</div>
```

- Mở **chỉ** bằng `onMouseEnter` → người dùng bàn phím không mở được, người dùng touch không mở được (touch không có hover).
- Không có `aria-expanded`, không có `aria-controls`.
- Không có Escape để đóng.
- `ProductDropdown` là panel 319 dòng có search + filter + pagination + fetch 1000 sản phẩm (`limit: 1000`) — mở bằng hover là sai loại tương tác cho nội dung nặng như vậy. Hover ra là mất hết filter vừa gõ.

Đây không phải dropdown, đây là một trang. Xử lý ở §6.

### 1.5 Không có skip link, không có landmark đầy đủ

```bash
$ grep -rn "skip" frontend/src   # 0 kết quả
```

Người dùng bàn phím phải Tab qua toàn bộ header (logo + 4 nav + 3 icon = 8 stop) trên **mỗi** trang trước khi tới nội dung. Có `<main>` (`MainLayout.tsx:40`) nhưng không có `<header>` role rõ ràng, không `<nav aria-label>`, không skip link.

### 1.6 Container width copy-paste

`max-w-[1440px]` xuất hiện **34 lần**, `max-w-[1200px]` 2 lần. Không có component nào đóng gói. Đổi container width = sửa 36 chỗ.

Thêm nữa: 1440px là **quá rộng**. Ở 1440px với text 16px, một dòng văn bản chạy ~180 ký tự. Ngưỡng dễ đọc là 45-90 ký tự. Mô tả sản phẩm, trang Policy, trang Contact đều đang quá rộng để đọc.

### 1.7 `FloatingEmojiOverlay` — đánh giá lại

`MainLayout.tsx:36` render overlay emoji bay khi có season active. Vấn đề:

- Emoji bay liên tục là **motion không thể tắt** trừ khi component tự check `prefers-reduced-motion` (cần verify — nếu không có thì đây là WCAG 2.2.2 fail: animation > 5s phải có cơ chế pause).
- Nó nằm trên toàn bộ trang, kể cả trang Checkout — nơi người dùng cần tập trung nhập địa chỉ và số điện thoại.
- Với brand "Soft Craft" (pastel có kỷ luật), emoji bay đi ngược hướng.

**Quyết định:** bỏ `FloatingEmojiOverlay`. Giữ tín hiệu mùa vụ bằng: badge trên `ProductCard`, ribbon trên hero, và `SeasonalMiniSection` (đã có). Vẫn có mùa vụ, nhưng không có motion không kiểm soát.

Nếu vẫn muốn giữ: bắt buộc (a) chỉ render ở `/` và `/gift-boxes`, không ở checkout/cart/auth; (b) tắt hoàn toàn khi `prefers-reduced-motion: reduce`; (c) `aria-hidden="true"` + `pointer-events-none`.

---

## 2. Layout primitives

### 2.1 `src/components/layout/container.tsx`

```tsx
import { cn } from '@/lib/cn'
import type { ElementType, ComponentPropsWithoutRef } from 'react'

const widths = {
  /** Trang catalog, grid sản phẩm, dashboard */
  default: 'max-w-container',   // 1280px
  /** Nội dung đọc: Policy, Contact, mô tả dài. ~68ch */
  prose:   'max-w-prose',
  /** Form 1 cột: Login, Register */
  form:    'max-w-form',        // 480px
  /** Hero, ảnh full-bleed */
  full:    'max-w-none',
} as const

export function Container<T extends ElementType = 'div'>({
  as, width = 'default', className, ...props
}: { as?: T; width?: keyof typeof widths } & ComponentPropsWithoutRef<T>) {
  const Comp = (as ?? 'div') as ElementType
  return (
    <Comp
      className={cn(
        'mx-auto w-full',
        widths[width],
        width !== 'full' && 'px-4 md:px-6 lg:px-8',
        className
      )}
      {...props}
    />
  )
}
```

Thay 34 chỗ `max-w-[1440px] mx-auto px-4 md:px-6` bằng `<Container>`.

**Container max giảm 1440 → 1280.** Lý do ở §1.6. Với grid 4 cột sản phẩm, 1280px cho mỗi card ~296px — vẫn thoải mái. Nội dung đọc dùng `width="prose"`.

### 2.2 `src/components/layout/section.tsx`

```tsx
export function Section({
  as = 'section', spacing = 'md', tone = 'canvas', className, ...props
}: {
  as?: ElementType
  spacing?: 'none' | 'sm' | 'md' | 'lg'
  tone?: 'canvas' | 'subtle' | 'surface'
} & ComponentPropsWithoutRef<'section'>) {
  const Comp = as
  return (
    <Comp
      className={cn(
        { none: '', sm: 'py-8 md:py-10', md: 'py-12 md:py-16', lg: 'py-16 md:py-24' }[spacing],
        { canvas: '', subtle: 'bg-bg-subtle', surface: 'bg-bg-surface' }[tone],
        className
      )}
      {...props}
    />
  )
}

export function SectionHeader({
  title, description, action, level = 'h2', align = 'start',
}: {
  title: string
  description?: string
  action?: React.ReactNode
  level?: 'h1' | 'h2' | 'h3'
  align?: 'start' | 'center'
}) {
  const Heading = level
  return (
    <div className={cn(
      'mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
      align === 'center' && 'sm:flex-col sm:items-center text-center'
    )}>
      <div className="max-w-prose">
        <Heading className={level === 'h1' ? 'text-h1' : 'text-h2'}>{title}</Heading>
        {description && <p className="mt-2 text-fg-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
```

**`level` là prop bắt buộc suy nghĩ:** heading level phải đúng thứ tự tài liệu (h1 → h2 → h3), không được chọn theo cỡ chữ. `SectionHeader` mặc định `h2` vì mỗi trang chỉ có đúng 1 `h1`. Nhảy từ h1 sang h3 là WCAG 1.3.1 fail.

### 2.3 Grid sản phẩm — chuẩn hoá 1 chỗ

Hiện tại mỗi trang tự viết `grid-cols-*`. Chuẩn hoá:

```tsx
// src/components/layout/product-grid.tsx
export function ProductGrid({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      className={cn(
        'grid gap-4 md:gap-6',
        'grid-cols-2',          // mobile: 2 cột — không phải 1.
        'md:grid-cols-3',
        'lg:grid-cols-4',
        className
      )}
      {...props}
    />
  )
}
```

**Mobile 2 cột, không 1 cột.** Với sản phẩm ảnh-first như bánh, 2 cột trên mobile cho người dùng so sánh và scan nhanh hơn; 1 cột buộc scroll gấp đôi và làm card cao quá nửa màn hình. Card ở 2 cột trên iPhone SE (375px) rộng ~166px — đủ cho ảnh 4:5 + tên + giá. Nút "Thêm vào giỏ" ở size `sm` icon-only ở breakpoint này.

**Dùng `<ul>`/`<li>`, không `<div>`.** Screen reader thông báo "danh sách 12 mục" → người dùng biết quy mô trước khi duyệt. Card bọc trong `<li>`.

---

## 3. Header mới

### 3.1 Cấu trúc

```
Desktop (>=1024px)
┌──────────────────────────────────────────────────────────────────────┐
│ [Logo]  Trang chủ  Sản phẩm▾  Hộp quà  Liên hệ    [🔍] [🌿] [🛒3] [👤]│
└──────────────────────────────────────────────────────────────────────┘

Mobile (<1024px)
┌──────────────────────────────────────────────────────────────────────┐
│ [☰]  [Logo]                                       [🔍] [🛒3] [👤]    │
└──────────────────────────────────────────────────────────────────────┘
   ↑ MỚI — mở Drawer side="left"
```

Hamburger đặt **bên trái**, trước logo. Lý do: vùng ngón tay cái với tay phải trên điện thoại lớn thì góc trên-phải là vùng khó nhất; nhưng cart/user icon đã ở đó và người dùng đã quen. Đặt hamburger trái là quy ước phổ biến (và tránh cụm 4 icon dồn một góc).

### 3.2 Mobile nav drawer

```tsx
// src/components/bakery/mobile-nav.tsx
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, ChevronRight } from 'lucide-react'
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle,
         Button, Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui'

const NAV = [
  { label: 'Trang chủ', to: '/' },
  {
    label: 'Sản phẩm', to: '/search',
    children: [
      { label: 'Tất cả sản phẩm', to: '/search' },
      { label: 'Bánh kem',        to: '/categories/banh-kem' },
      { label: 'Bánh mì',         to: '/categories/banh-mi' },
      // Lấy động từ API danh mục — xem §3.4
    ],
  },
  { label: 'Hộp quà', to: '/gift-boxes' },
  { label: 'Liên hệ', to: '/contact' },
  { label: 'Chính sách', to: '/policies' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu điều hướng">
          <Menu className="size-6" aria-hidden />
        </Button>
      </DrawerTrigger>

      <DrawerContent side="left">
        <DrawerHeader>
          <DrawerTitle>Điều hướng</DrawerTitle>
        </DrawerHeader>

        {/* nav bên trong drawer: cần aria-label riêng để phân biệt với nav desktop */}
        <nav aria-label="Điều hướng chính" className="flex-1 overflow-y-auto overscroll-contain p-4">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) =>
              item.children ? (
                <li key={item.to}>
                  <Accordion type="single" collapsible>
                    <AccordionItem value={item.to} className="border-0">
                      <AccordionTrigger className="rounded-md px-4 py-3 text-base font-medium hover:bg-bg-subtle">
                        {item.label}
                      </AccordionTrigger>
                      <AccordionContent className="pl-4">
                        <ul className="flex flex-col gap-1 border-l border-border-subtle pl-4">
                          {item.children.map((c) => (
                            <li key={c.to}>
                              <Link to={c.to} onClick={() => setOpen(false)}
                                className="block rounded-md px-4 py-2.5 text-sm text-fg-muted hover:bg-bg-subtle hover:text-fg">
                                {c.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </li>
              ) : (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => setOpen(false)}
                    // aria-current: AT đọc "trang hiện tại" — không chỉ tô màu
                    aria-current={pathname === item.to ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center justify-between rounded-md px-4 py-3 text-base font-medium',
                      'hover:bg-bg-subtle',
                      pathname === item.to
                        ? 'bg-brand-subtle text-brand-fg'
                        : 'text-fg'
                    )}
                  >
                    {item.label}
                    <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
                  </Link>
                </li>
              )
            )}
          </ul>
        </nav>

        {/* CTA đăng nhập/đăng ký ở đáy drawer — vùng ngón cái dễ chạm nhất */}
        <div className="border-t border-border-subtle p-4">
          {/* nội dung tuỳ auth state */}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
```

**Trạng thái active dùng `aria-current="page"` chứ không chỉ đổi màu.** WCAG 1.4.1: thông tin không được truyền chỉ bằng màu. `aria-current` cho AT, màu + background cho người nhìn.

**`min-h-11` (44px) cho mỗi nav item.** WCAG 2.5.8 target size. Nav item mà chỉ cao 32px là nguồn mis-tap kinh điển trên mobile.

**Drawer đóng khi navigate.** `onClick={() => setOpen(false)}` trên mỗi Link. Nếu bỏ, drawer vẫn mở sau khi đổi trang → người dùng tưởng click không ăn.

### 3.3 Header component mới

```tsx
// src/components/bakery/header.tsx
export function Header() {
  const { cart, openCartDrawer } = useCart()
  const { user } = useAuth()
  const { pathname } = useLocation()

  return (
    <header
      className={cn(
        'sticky top-0 z-header',
        'h-16',                                    // = --header-height, khớp scroll-padding-top
        'border-b border-border bg-bg-canvas/85 backdrop-blur-md',
        // supports: chỉ dùng nền trong suốt khi browser thật sự có backdrop-filter,
        // không thì fallback nền đục để text vẫn đọc được
        'supports-[not(backdrop-filter:blur(0))]:bg-bg-canvas'
      )}
    >
      <Container className="flex h-full items-center gap-3">
        <MobileNav />                              {/* lg:hidden */}

        <Link to="/" className="shrink-0" aria-label="Leaf Crème — về trang chủ">
          <img src={IMAGE_PATHS.navbar.logo} alt="Leaf Crème"
               className="h-8 w-auto md:h-9" width={140} height={36} />
        </Link>

        {/* nav desktop — aria-label phân biệt với nav trong drawer và nav footer */}
        <nav aria-label="Điều hướng chính" className="ml-4 hidden lg:block">
          <ul className="flex items-center gap-1">
            <li><NavLink to="/">Trang chủ</NavLink></li>
            <li><ProductNavItem /></li>            {/* §6 */}
            <li><NavLink to="/gift-boxes">Hộp quà</NavLink></li>
            <li><NavLink to="/contact">Liên hệ</NavLink></li>
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <SearchTrigger />                        {/* §5 — MỚI */}
          <LeafieTrigger className="hidden sm:inline-flex" />
          <CartTrigger count={cart.itemCount} onClick={openCartDrawer} />
          {user ? <UserMenu user={user} /> : <AuthButtons />}
        </div>
      </Container>
    </header>
  )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation()
  const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-11 items-center rounded-md px-3 text-sm font-medium transition-colors',
        'outline-none focus-visible:ring-2 focus-visible:ring-focus',
        active ? 'text-fg' : 'text-fg-muted hover:text-fg',
        // gạch dưới brand cho trạng thái active — kênh thứ hai ngoài màu
        active && 'after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-brand'
      )}
    >
      {children}
    </Link>
  )
}
```

**Bỏ toàn bộ gradient của header cũ.** `bg-gradient-to-r from-[#FFF5E6] via-[#FFFEF9] to-[#FFF5E6]` + `border-b-2 border-[#D4A574]` → `bg-bg-canvas/85 backdrop-blur-md border-b border-border`. Header nên gần như vô hình, không cạnh tranh với nội dung.

**`supports-[not(...)]` fallback:** nếu browser không hỗ trợ `backdrop-filter`, nền `/85` opacity làm text bị lẫn với nội dung scroll phía dưới. Fallback về nền đục. Firefox cũ và một số webview Android cần cái này.

**Header cao đúng 64px (`h-16`) = `--header-height`.** Nhờ vậy `scroll-padding-top` ở `index.css` khớp chính xác → anchor link không bị header che.

### 3.4 Nguồn dữ liệu cho nav

`NAV` ở §3.2 hardcode danh mục. Danh mục là dữ liệu, không phải cấu hình UI.

**Đề xuất:** thêm hook `useCategories()` gọi `GET /categories` (backend đã có — `AdminProductPage` dùng `CategoryManager`), cache bằng `staleTime` dài. Nav render từ đó.

Nếu chưa muốn thêm data fetch vào header (ảnh hưởng LCP), thì đặt danh mục vào `src/config/navigation.ts` — một chỗ duy nhất, có comment ghi rõ "phải sync tay với danh mục trong DB", và ghi vào backlog để chuyển sang API sau. Không rải hardcode ở cả `MobileNav` và `ProductDropdown` như hiện tại.

---

## 4. Skip link + landmark

`src/components/layout/main-layout.tsx`:

```tsx
export function MainLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  if (pathname.startsWith('/admin')) return <>{children}</>

  return (
    <div className="flex min-h-dvh flex-col bg-bg-canvas">
      {/* Skip link — element focus được ĐẦU TIÊN trong tab order.
          Ẩn cho đến khi focus (xem .skip-link ở index.css). */}
      <a href="#main-content" className="skip-link">Bỏ qua điều hướng, tới nội dung chính</a>

      <Header />

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>

      <Footer />

      <CartDrawer />
      <LeafieChatPanel />
      <Toaster />
      {/* FloatingEmojiOverlay đã bỏ — §1.7 */}
    </div>
  )
}
```

**`tabIndex={-1}` trên `<main>`** để skip link focus được vào nó. Không có nó, click skip link chỉ đổi URL hash mà focus vẫn ở skip link → người dùng bàn phím tiếp tục Tab vào header. Đây là lỗi hay gặp khi implement skip link.

**`min-h-dvh` không `min-h-screen`.** Cùng lý do như spec 02 §5.

### 4.1 Cần thêm: reset focus khi đổi route

React Router không reset focus khi navigate. Người dùng screen reader không biết trang đã đổi.

```tsx
// src/hooks/useRouteAnnouncer.ts
export function useRouteAnnouncer() {
  const { pathname } = useLocation()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; return }  // không chạy ở lần mount đầu
    // Đưa focus về main → screen reader đọc lại từ đầu nội dung mới
    document.getElementById('main-content')?.focus()
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname])
}
```

Kèm live region thông báo tên trang:

```tsx
// Trong MainLayout
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {pageTitle}    {/* set từ mỗi page qua context hoặc react-helmet */}
</div>
```

`window.scrollTo` cũng fix một bug UX thật: hiện tại navigate giữa các trang **không reset scroll**, nên đi từ giữa trang search sang trang chi tiết sản phẩm sẽ hạ cánh ở giữa trang.

---

## 5. Search — thêm đường vào (mới)

Hiện tại không có ô search nào ở header. `SearchPage` (412 dòng) chỉ vào được qua nav item "Sản phẩm" trên desktop.

**Desktop (≥ md):** input search inline trong header, `w-56`, focus thì `w-72`.
**Mobile:** icon 🔍 → mở `Dialog` full-width chứa input + gợi ý, `side="top"` hoặc dialog thường.

```tsx
function SearchTrigger() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
  }

  return (
    <>
      {/* Desktop */}
      <form onSubmit={submit} role="search" className="hidden md:block">
        <FormField>
          <Label className="sr-only">Tìm sản phẩm</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)}
                   placeholder="Tìm bánh, hộp quà…"
                   className="h-10 w-56 pl-9 transition-[width] focus:w-72" />
          </div>
        </FormField>
      </form>

      {/* Mobile */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Tìm kiếm">
            <Search className="size-5" aria-hidden />
          </Button>
        </DialogTrigger>
        <DialogContent size="lg" className="top-4 translate-y-0">
          <DialogTitle className="sr-only">Tìm kiếm sản phẩm</DialogTitle>
          {/* input + kết quả gợi ý */}
        </DialogContent>
      </Dialog>
    </>
  )
}
```

`role="search"` trên form → landmark, screen reader nhảy tới được bằng lệnh landmark.

---

## 6. `ProductDropdown` → Popover hay trang riêng?

`ProductDropdown.tsx` là 319 dòng: fetch 1000 sản phẩm, có search box, 2 filter (loại + hương vị), pagination 6 item/trang. Mở bằng hover.

**Đây không phải dropdown.** Dropdown là để chọn nhanh 5-10 mục. Cái này là giao diện duyệt sản phẩm có filter — tức là chính `SearchPage`.

**Khuyến nghị: bỏ `ProductDropdown`, thay bằng mega-menu tĩnh.**

```tsx
function ProductNavItem() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex h-11 items-center gap-1 rounded-md px-3 text-sm font-medium text-fg-muted hover:text-fg outline-none focus-visible:ring-2 focus-visible:ring-focus">
          Sản phẩm
          <ChevronDown className="size-4 transition-transform data-[state=open]:rotate-180" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[36rem] p-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-1">
          {/* Chỉ DANH MỤC — tối đa 8-10 mục. Không search, không filter, không pagination. */}
          {categories.map((c) => (
            <Link key={c.slug} to={`/categories/${c.slug}`}
              className="flex items-center gap-3 rounded-md p-3 hover:bg-bg-subtle">
              <img src={c.icon} alt="" aria-hidden className="size-10 rounded-md object-cover" />
              <div>
                <p className="text-sm font-medium text-fg">{c.ten}</p>
                <p className="text-xs text-fg-subtle">{c.soLuong} sản phẩm</p>
              </div>
            </Link>
          ))}
        </div>
        <Separator className="my-4" />
        <Button asChild variant="link"><Link to="/search">Xem tất cả sản phẩm →</Link></Button>
      </PopoverContent>
    </Popover>
  )
}
```

Radix Popover cho sẵn: mở bằng click **và** Enter/Space, `aria-expanded`, `aria-controls`, Escape đóng, focus trap nhẹ, click-outside đóng, và arrow-key nav nếu dùng `DropdownMenu` thay Popover.

**Ba lợi ích cụ thể:**

1. Bỏ được fetch `limit: 1000` mỗi lần hover header — đây là request nặng nhất trong app, đang chạy tuỳ tiện theo chuột.
2. Filter/search dồn về `SearchPage` — một nơi, URL shareable, back button hoạt động.
3. Người dùng touch và keyboard vào được.

**Trade-off:** mất tính năng "filter nhanh không rời trang". Đánh giá: tính năng đó vốn đã không dùng được (hover ra là mất state), nên không mất gì thật.

`ProductDropdown.tsx` xoá. Logic filter + pagination trong đó **chuyển sang** `SearchPage` nếu `SearchPage` còn thiếu — kiểm tra khi làm spec 04.

---

## 7. Footer mới

```tsx
export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-bg-subtle">
      <Container className="py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-4">
            <img src={IMAGE_PATHS.logo.main} alt="Leaf Crème" className="h-9 w-auto" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-muted">
              Từ Sài Gòn, với vị ngọt nhẹ nhàng mỗi ngày.
            </p>
            <ul className="mt-6 flex items-center gap-2">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer"
                     className="grid size-11 place-items-center rounded-md text-fg-subtle transition-colors hover:bg-bg-surface hover:text-brand-fg outline-none focus-visible:ring-2 focus-visible:ring-focus">
                    <s.Icon className="size-5" aria-hidden />
                    <span className="sr-only">{s.label} (mở tab mới)</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Link groups — <Link>, KHÔNG <a href> */}
          <nav aria-label="Liên kết chân trang" className="grid grid-cols-2 gap-8 md:col-span-5 md:grid-cols-2">
            <FooterGroup title="Sản phẩm" links={[
              { label: 'Tất cả sản phẩm', to: '/search' },
              { label: 'Hộp quà',         to: '/gift-boxes' },
              // "Menu" với href="#menu" ĐÃ BỎ — anchor trỏ tới id không tồn tại
            ]} />
            <FooterGroup title="Hỗ trợ" links={[
              { label: 'Liên hệ',    to: '/contact' },
              { label: 'Chính sách', to: '/policies' },
              { label: 'Đơn hàng của tôi', to: '/orders' },
            ]} />
          </nav>

          {/* Thông tin cửa hàng — dùng markup có nghĩa */}
          <div className="md:col-span-3">
            <h3 className="text-sm font-semibold text-fg">Ghé cửa hàng</h3>
            <address className="mt-4 space-y-2 text-sm not-italic text-fg-muted">
              <p>123 Đường ABC, Quận 1, TP.HCM</p>
              <p>
                <a href="tel:+84xxxxxxxxx" className="hover:text-fg hover:underline">
                  090 xxx xxxx
                </a>
              </p>
            </address>
            <p className="mt-3 text-sm text-fg-muted">
              Mở cửa <time dateTime="08:00">8:00</time>–<time dateTime="20:00">20:00</time>
            </p>
          </div>
        </div>

        <Separator className="my-8" />
        <p className="text-sm text-fg-subtle">
          © {new Date().getFullYear()} Leaf Crème. Đã đăng ký bản quyền.
        </p>
      </Container>
    </footer>
  )
}

function FooterGroup({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <ul className="mt-4 space-y-3">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-sm text-fg-muted transition-colors hover:text-fg hover:underline">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

Sửa cụ thể so với bản cũ:

| Cũ | Mới | Lý do |
|---|---|---|
| `<a href="/contact">` | `<Link to="/contact">` | Fix full page reload |
| `<a href="#menu">` | **Bỏ** | Anchor trỏ id không tồn tại |
| `© 2024` hardcode | `{new Date().getFullYear()}` | Đang là 2026, footer ghi 2024 |
| `<p>123 Đường ABC…</p>` | `<address>` | Landmark có nghĩa |
| Social icon `size={19}` không target đủ | `size-11` wrapper (44px) | WCAG 2.5.8 |
| `aria-label="Facebook"` | `sr-only` "Facebook (mở tab mới)" | Cảnh báo mở tab mới — WCAG 3.2.5 |
| Gradient + `border-t-2` | `bg-bg-subtle` + `border-t` | Brand Soft Craft |
| `max-w-[1440px]` | `<Container>` | 1 nguồn |

Số điện thoại: hiện tại footer **không có** số điện thoại. Với bakery bán bánh có pre-order, số điện thoại phải nhìn thấy — thêm vào, và làm `tel:` link để mobile bấm gọi được.

---

## 8. Breakpoint strategy

```
< 640   (base)  1 cột form, 2 cột product grid, drawer nav, icon-only action
>= 640  sm      3 cột product grid ở trang listing rộng
>= 768  md      search inline, footer 3 cụm, gutter 24px
>= 1024 lg      nav desktop hiện, drawer ẩn, 4 cột grid, sidebar layout
>= 1280 xl      container đạt max 1280px, gutter 32px
```

**Nguyên tắc quan trọng:** `lg` (1024px) là ranh giới duy nhất quyết định "nav desktop vs drawer". Không đặt thêm breakpoint nào cho nav — càng nhiều ngưỡng càng nhiều state phải test.

**Điểm thường sai:** iPad Pro dọc là 1024px → đúng ngưỡng `lg`, nên nav desktop hiện. Kiểm tra bằng tay ở đúng 1024px xem nav 4 item + logo + 4 icon có đủ chỗ không. Nếu chật, đổi ngưỡng nav sang `xl` và giữ drawer tới 1280px.

---

## 9. Files phải sửa

### Xoá
| File | Lý do |
|---|---|
| `src/components/layout/FloatingEmojiOverlay.tsx` | §1.7 |
| `src/components/bakery/ProductDropdown.tsx` | §6 — 319 dòng, thay bằng mega-menu ~40 dòng |
| `src/components/layout/LayoutShell.tsx` | Dead code |
| `src/components/layout/SectionContainer.tsx` | Thay bằng `container.tsx` + `section.tsx` |
| `src/components/layout/SectionHeader.tsx` | Thay bằng bản mới trong `section.tsx` |

### Tạo mới
| File | Nội dung |
|---|---|
| `src/components/layout/container.tsx` | §2.1 |
| `src/components/layout/section.tsx` | §2.2 — `Section` + `SectionHeader` |
| `src/components/layout/product-grid.tsx` | §2.3 |
| `src/components/bakery/mobile-nav.tsx` | §3.2 — **fix P0** |
| `src/components/bakery/search-trigger.tsx` | §5 |
| `src/components/bakery/product-nav-item.tsx` | §6 |
| `src/components/bakery/user-menu.tsx` | Tách khỏi Header, dùng Radix DropdownMenu |
| `src/hooks/useRouteAnnouncer.ts` | §4.1 |
| `src/config/navigation.ts` | §3.4 — nguồn duy nhất cho nav |

### Sửa
| File | Việc |
|---|---|
| `src/components/bakery/Header.tsx` → `header.tsx` | Viết lại theo §3.3. Bỏ toàn bộ code định vị menu bằng `getBoundingClientRect` + 2 scroll listener (dòng 27-58) — Radix Popper lo |
| `src/components/bakery/Footer.tsx` → `footer.tsx` | Viết lại theo §7 |
| `src/components/layout/MainLayout.tsx` → `main-layout.tsx` | §4 — skip link, landmark, bỏ FloatingEmojiOverlay |
| `src/components/cart/CartDrawer.tsx` | Chuyển sang `Drawer` (Radix). Bỏ `isOpen`/`onClose` prop, dùng context trực tiếp |
| `src/components/layout/index.ts` | Barrel mới |
| `src/pages/BakeryHomePage.tsx` | Thay `max-w-[1440px] mx-auto px-4 md:px-6` bằng `<Container>` |
| **34 files** dùng `max-w-[1440px]` | Thay bằng `<Container>`. Chạy `grep -rln "max-w-\[1440px\]" src` để lấy danh sách |
| `src/App.tsx` | Gọi `useRouteAnnouncer()` |
| `src/config/seasons.ts` | Bỏ `decoration` (emoji overlay); giữ `miniSection` |

---

## 10. Acceptance criteria

### Fix P0 — mobile nav
- [ ] Resize browser xuống 375px: hamburger hiện, click mở drawer từ trái
- [ ] Trong drawer, tới được **cả 5** trang: `/`, `/search`, `/gift-boxes`, `/contact`, `/policies`
- [ ] Accordion "Sản phẩm" mở ra danh mục con, click vào tới đúng `/categories/:slug`
- [ ] Click Link trong drawer → drawer **tự đóng**
- [ ] Escape đóng drawer, focus quay về nút hamburger
- [ ] Ở 1024px: hamburger **ẩn**, nav desktop **hiện**, không cả hai cùng lúc, không cả hai cùng ẩn
- [ ] Ở đúng 1024px với zoom 100%: nav 4 item + logo + 4 icon **không** wrap, **không** overflow ngang
- [ ] Đo lại: mọi nav item có chiều cao ≥ 44px (DevTools → hover → xem box model)

### Navigation semantics
- [ ] `grep -rn '<a href="/' src --include=*.tsx` → **0 kết quả** (trừ `tel:`, `mailto:`, `http`)
- [ ] Ctrl+click / middle-click mọi nav item + footer link → mở tab mới thật
- [ ] `grep -rn 'href="#menu"' src` → 0 kết quả
- [ ] Footer copyright hiện năm hiện tại, không phải 2024
- [ ] `grep -c "max-w-\[1440px\]" -r src` → **0**

### A11y
- [ ] Tab lần đầu vào bất kỳ trang → element focus đầu tiên là **skip link**, và nó nhìn thấy được
- [ ] Enter trên skip link → focus nhảy tới `<main>`; Tab tiếp theo vào nội dung, **không** quay lại header
- [ ] Navigate sang trang khác → scroll về top, focus về `<main>`
- [ ] Screen reader: có đúng 3 nav landmark, mỗi cái có `aria-label` khác nhau ("Điều hướng chính" ×1 tại một thời điểm, "Liên kết chân trang")
- [ ] `role="search"` landmark tồn tại
- [ ] Trang hiện tại trong nav có `aria-current="page"`
- [ ] Popover "Sản phẩm": mở được bằng **Enter** và **Space**, không chỉ hover; Escape đóng; `aria-expanded` đổi đúng
- [ ] Tắt CSS (DevTools disable stylesheets) → thứ tự đọc vẫn logic: skip link → header → main → footer

### Performance
- [ ] Network tab: hover vào "Sản phẩm" ở header **không** trigger request `limit=1000` nữa
- [ ] Lighthouse trên `/`: CLS < 0.1 (logo có `width`/`height` nên không layout shift)
- [ ] Scroll trang chủ trên iOS Safari (hoặc throttle 4× CPU): không jank — đã bỏ `background-attachment: fixed` và emoji overlay
- [ ] `prefers-reduced-motion` bật → drawer mở không animation, không kẹt

---

## TL;DR

- **Mobile nav không tồn tại** là bug P0 của cả project: dưới 1024px `/gift-boxes` — feature được README nêu là điểm khác biệt — không có đường vào nào ngoài gõ URL. Fix bằng Drawer + hamburger ở §3.2.
- Footer dùng `<a href="/contact">` gây **full page reload** trong SPA (mất giỏ hàng), và `<a href="#menu">` trỏ tới id không tồn tại. Copyright ghi 2024.
- `ProductDropdown` 319 dòng fetch `limit=1000` **mỗi lần hover** header, chỉ mở được bằng chuột. Thay bằng mega-menu tĩnh ~40 dòng; filter/search dồn về `SearchPage`.
- Không có skip link → mỗi trang phải Tab qua 8 stop mới tới nội dung. Thêm skip link + `tabIndex={-1}` trên `<main>` (thiếu `tabIndex` là skip link không hoạt động).
- Container 1440px quá rộng (dòng text ~180 ký tự). Giảm về 1280px, và nội dung đọc dùng `width="prose"` (68ch).
- Product grid mobile để **2 cột**, không 1 — sản phẩm ảnh-first cần scan được.
- Bỏ `FloatingEmojiOverlay`: motion không tắt được, render cả ở trang Checkout, và đi ngược brand Soft Craft.
