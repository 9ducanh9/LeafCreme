# Spec 00 — Audit hiện trạng & chiến lược migration

> Mọi số liệu dưới đây đo trực tiếp trên `main` branch của `9ducanh9/LeafCreme`, thư mục `frontend/src` (152 files `.ts`/`.tsx`, 17.623 LOC `.tsx`).

---

## 1. Hiện trạng

### 1.1 Stack thực tế

```
React 18.2 + TypeScript 5.2 + Vite 7.2
Tailwind 3.3.6      ← storefront
MUI 7.3.5 + emotion ← admin (KHÔNG có theme)
lucide-react 0.294  ← icons (32 files)
@mui/icons-material ← icons (31 files)   ← trùng chức năng
recharts 3.5.1
react-router-dom 6.20
```

### 1.2 Debt inventory — có số liệu

| # | Vấn đề | Số liệu | Loại debt | Severity |
|---|---|---|---|---|
| D1 | Mobile nav không tồn tại | `Header.tsx:107` `hidden lg:flex`, không có fallback | Functional | **P0** |
| D2 | MUI không có theme | 31 files import `@mui`, 0 file có `createTheme` | Visual + Arch | **P0** |
| D3 | Focus indicator bị phá | `focus:outline-none` × 52, `focus-visible` × 0 | A11y (WCAG 2.4.7) | **P0** |
| D4 | Hex hardcode | 621 chỗ trong `.tsx` (150 ở storefront, 471 ở admin) | Maintainability | **P1** |
| D5 | `<button onClick={navigate}>` thay vì `<Link>` | 65 vs 2 | A11y + SEO | **P1** |
| D6 | Label không gắn với input | 52 `<label>` nhưng chỉ 33 `htmlFor` → 19 label mồ côi | A11y (WCAG 1.3.1) | **P1** |
| D7 | Modal tự viết, không focus trap / không Escape | `ui/Modal.tsx` | A11y (WCAG 2.1.2) | **P1** |
| D8 | z-index vô kỷ luật | 9 giá trị rời rạc: `z-10, z-40, z-50, z-[60], z-[90], z-[100], z-[105], z-[110]` | Maintainability | **P1** |
| D9 | Container width copy-paste | `max-w-[1440px]` × 34, `max-w-[1200px]` × 2 | Maintainability | **P2** |
| D10 | Page quá to, UI trộn logic | AdminDashboard 964, AdminGiftBox 810, Checkout 633, ProductForm 500 | Maintainability | **P1** |
| D11 | Dead code | `LayoutShell`, `SectionContainer`, `SectionHeader`, `EmptyState`, `Skeleton` — chỉ được export trong barrel, **không nơi nào dùng** | Debt | **P2** |
| D12 | Gradient rải rác không token | 30 chỗ `bg-gradient-*`, đa số hardcode hex | Visual | **P2** |
| D13 | Card click bằng `<div onClick>` | `ProductCard.tsx:20` — không keyboard-accessible, lại còn nest `<Button>` bên trong | A11y (WCAG 2.1.1) | **P0** |
| D14 | Thiếu tín hiệu tồn kho / độ tươi trên UI | Toàn bộ catalog | **Product** | **P1** |
| D15 | Không có dark mode, token là literal chứ không semantic | `tokens.css` toàn bộ 77 dòng | Extensibility | **P2** |

### 1.3 Bốn phát hiện cần nói rõ

#### D1 — Mobile nav: đây là bug, không phải thẩm mỹ

`components/bakery/Header.tsx`:

```tsx
// line 107
<nav className="hidden lg:flex items-center gap-6 ml-6">
  <button onClick={() => navigate('/')}>Trang chủ</button>
  <button onClick={() => navigate('/search')}>Sản phẩm</button>
  <button onClick={() => navigate('/gift-boxes')}>Hộp quà</button>
  <button onClick={() => navigate('/contact')}>Liên hệ</button>
</nav>
```

Không có `<button className="lg:hidden">` mở drawer ở đâu trong file. Dưới breakpoint `lg` (1024px), thanh nav biến mất và **không có gì thay thế**. Người dùng mobile chỉ còn: logo (→ home), icon Leafie, icon cart, icon user.

Bakery bán bánh — traffic mobile gần chắc chiếm phần lớn. Nghĩa là đa số khách **không có đường vào trang Hộp quà** — đúng cái feature được README nêu như điểm khác biệt của sản phẩm.

Hệ quả: nếu chỉ redesign visual mà bỏ qua D1, redesign đó không giải quyết vấn đề lớn nhất của app.

#### D2 — MUI không có theme

```bash
$ grep -rl "createTheme\|ThemeProvider" frontend/src
# (không có kết quả)
```

31 files đang render MUI với default theme: font Roboto, primary `#1976d2`, radius 4px, elevation shadow xám lạnh. Trong khi `tokens.css` định nghĩa Playfair Display + `#C59B72` + radius 16px.

Đây là nguyên nhân trực tiếp của cái cảm giác "student project" mà `custom_instructions` của project yêu cầu tránh. Không phải do thiếu animation hay thiếu gradient — mà do **hai bộ quy tắc thị giác chạy song song trong cùng một app**.

#### D3 — Focus indicator

```bash
$ grep -rn "focus:outline-none" frontend/src --include=*.tsx | wc -l
52
$ grep -rn "focus-visible" frontend/src --include=*.tsx | wc -l
0
```

`ui/Input.tsx:24` là ví dụ điển hình:

```tsx
focus:outline-none focus:border-accent-brown
```

Outline gốc bị tắt, thay bằng đổi màu border từ `#E8E5DD` → `#C59B72`. Độ chênh giữa hai màu này là **2.01:1**, và bản thân `#C59B72` so với nền `#FFF8F0` chỉ **2.40:1** — WCAG 1.4.11 yêu cầu ≥ 3:1 cho state indicator. Người dùng bàn phím thực tế không nhìn thấy mình đang ở field nào.

51 chỗ còn lại đa số **không có** gì thay thế outline.

#### D14 — Thiếu tín hiệu tồn kho: debt về product, không phải về code

Đây là điểm t muốn phản biện mạnh nhất.

README định vị LeafCreme là: *"batch-level inventory, FEFO allocation for perishable products, expiry dates"*. Backend làm hết. Nhưng `ProductCard.tsx` và `ProductDetailPage.tsx` **không hiển thị một tín hiệu nào** về tồn kho hay độ tươi:

- Không có "còn 3 cái"
- Không có "làm hôm nay" / "dùng trong 2 ngày"
- Không có disable khi hết batch khả dụng
- Không có ngày giao sớm nhất khả thi trên trang sản phẩm (chỉ có ở checkout, `CheckoutPage.tsx:49`)

Đây là mất mát kép:

1. **Về UX:** khách không biết mình đang mua gì, đến khi checkout mới phát hiện không giao được → abandonment.
2. **Về portfolio:** feature kỹ thuật khó nhất của project (FEFO + batch tracking) hoàn toàn vô hình với recruiter mở demo. Backend giỏi mà UI không kể ra thì coi như không có.

Redesign UI/UX lần này phải đưa inventory state lên bề mặt. Spec 04 xử lý điểm này.

---

## 2. Chiến lược migration

### 2.1 Quyết định: bỏ MUI **ở storefront**, giữ có theme **ở admin**

> **CẬP NHẬT sau khi audit admin (spec 09).** Bản đầu của spec này viết "bỏ MUI hoàn toàn".
> Sau khi đọc code admin thật, quyết định đó **đúng cho storefront nhưng sai cho admin**.
> Lý do đầy đủ ở spec 09 §3. Tóm tắt: admin có 593 `sx`, 11 file dùng MUI Table, và
> MUI đang lo a11y bảng (`<th scope="col">`) miễn phí. Bỏ = ~15 ngày + phải tự viết lại a11y bảng.
> Giữ + theme = ~4 ngày và giải quyết đúng vấn đề (màu không khớp brand).

**Storefront:** Tailwind + Radix Primitives + CVA. Bỏ MUI hoàn toàn — chỉ có 1 file chạm (`CheckoutPage.tsx`).

**Admin:** giữ `@mui/material` + `@emotion`, **thêm `createTheme` map sang `tokens.css`** (spec 12).

**Xoá hẳn khỏi `package.json`:** không xoá gì. `@mui/x-date-pickers` vẫn cần cho `AdminBatchCreatePage` / `AdminVoucherPage`.

| Tiêu chí | Bỏ MUI → Radix | Giữ MUI + theme |
|---|---|---|
| Số hệ design | 1 | 2 |
| Bundle (gzip, ước tính) | ~45KB (Radix tree-shakeable) | ~135KB (MUI core + emotion runtime) |
| Kiểm soát visual theo brand | Toàn phần — Radix không có style | Bị giới hạn bởi `sx` / theme override, hay bị specificity war |
| A11y | Radix lo focus trap, ARIA, keyboard nav | MUI cũng có, tương đương |
| CSS runtime | Không (Tailwind compile-time) | Có (emotion inject runtime) |
| Chi phí viết lại | 31 files admin (~15 ngày) | 0 |
| Rủi ro | Cao hơn ngắn hạn | Thấp ngắn hạn, cao dài hạn |

**Lý do bỏ MUI ở storefront:**

1. Emotion inject CSS lúc runtime → thêm work trên main thread mỗi lần mount. Tailwind là compile-time, zero runtime. Storefront là trang khách xem — bundle và LCP quan trọng.
2. `sx` prop và Tailwind class trên cùng một element sẽ tạo specificity war. Đã thấy mầm mống: 39 chỗ dùng `style={{...}}` inline để thắng cascade.
3. Radix là headless — mọi pixel do mình quyết. Storefront cần brand riêng, đây là con đường duy nhất không phải đánh nhau với library.
4. **Chi phí gần bằng 0:** storefront chỉ có **1 file** chạm MUI (`CheckoutPage.tsx`, dùng `@mui/x-date-pickers`). 30/31 files MUI nằm trong admin.

**Lý do KHÔNG bỏ MUI ở admin** (ngược lại với 3 điểm trên, và đó là điểm đáng nói):

1. **Chi phí thật gấp 4 lần lợi ích.** Bỏ = 593 `sx` + 11 file dùng MUI Table + 45 file ≈ 15 ngày. Thêm theme = ~4 ngày, và giải quyết đúng vấn đề gốc (màu không khớp brand).
2. **MUI đang lo a11y bảng miễn phí.** `<TableCell>` trong `<TableHead>` tự render `<th scope="col">`. Bỏ MUI = phải tự viết lại `th`, `scope`, `caption`, `aria-sort` cho 11 bảng. Đây là loại việc dễ làm sai và không ai nhận ra.
3. **Bundle không quan trọng ở admin.** Admin là internal tool, 2-3 người dùng, đăng nhập rồi ở trong đó cả ngày. 135KB tải một lần không ảnh hưởng gì. Storefront thì ngược lại.
4. **Vấn đề lớn nhất của admin không phải visual.** Là 0 pagination, 0 sort, 0 bulk select trên toàn bộ 11 bảng (spec 09 §2). Dồn 15 ngày vào việc đổi library trong khi bakery không lọc nổi 500 sản phẩm là sai thứ tự ưu tiên.

Điểm 4 là lý do chính. Chi tiết ở spec 09 §3.

**Hệ quả:** ESLint `no-restricted-imports` ở §2.5 trở thành ranh giới **vĩnh viễn** giữa hai vùng, không phải hàng rào tạm chờ phase 7.

### 2.2 Xử lý MUI trong storefront

Chỉ 1 điểm chạm: `CheckoutPage.tsx` dùng `@mui/x-date-pickers` + `dayjs` cho chọn thời gian giao hàng.

**Thay bằng:** `react-day-picker` (v9) + input time riêng, hoặc build trên `@radix-ui/react-popover` + `react-day-picker`. Giữ `dayjs`.

Lý do không tự viết date picker: date/time picker là component dễ sai nhất về a11y và timezone. `react-day-picker` 9 nhẹ (~12KB), headless-ish, style bằng Tailwind class được.

Chi tiết ở spec 05 §3.

### 2.3 Dependency thay đổi

**Thêm:**
```jsonc
{
  "@radix-ui/react-dialog":        "^1.1.x",  // Modal, CartDrawer, MobileNav
  "@radix-ui/react-dropdown-menu": "^2.1.x",  // user menu (thay code tự viết ở Header)
  "@radix-ui/react-popover":       "^1.1.x",  // ProductDropdown
  "@radix-ui/react-select":        "^2.1.x",  // filters, sort
  "@radix-ui/react-toast":         "^1.2.x",  // thay ToastContext tự viết
  "@radix-ui/react-tabs":          "^1.1.x",  // Profile, ProductDetail
  "@radix-ui/react-accordion":     "^1.2.x",  // Policy, FAQ, mobile filters
  "@radix-ui/react-tooltip":       "^1.1.x",
  "@radix-ui/react-radio-group":   "^1.2.x",  // payment method ở Checkout
  "@radix-ui/react-slot":          "^1.1.x",  // asChild cho Button
  "@radix-ui/react-visually-hidden":"^1.1.x",
  "class-variance-authority":      "^0.7.x",
  "clsx":                          "^2.1.x",
  "tailwind-merge":                "^2.5.x",
  "react-day-picker":              "^9.x",
  "tailwindcss-animate":           "^1.0.7"
}
```

**Xoá:** không xoá gì. MUI ở lại admin vĩnh viễn, có theme (spec 09 §3, spec 12).

**Icon:** admin tiếp tục dùng `@mui/icons-material` (khớp với MUI component), storefront dùng `lucide-react`. Hai bộ icon nhưng mỗi bên nhất quán trong phạm vi của nó — chấp nhận được, và rẻ hơn việc thay 31 file icon.

**Icon:** chuẩn hoá về `lucide-react`. Cấm import mới từ `@mui/icons-material`. Thêm ESLint rule (§2.5).

### 2.4 Thứ tự migration — bottom-up, không big-bang

```
Phase 1  Token layer          (spec 01)  ← không sửa component nào, chỉ thêm/đổi CSS vars + tailwind.config
Phase 2  Primitives           (spec 02)  ← rewrite components/ui/*, giữ nguyên API export
Phase 3  Layout + nav         (spec 03)  ← Header/Footer/Container + mobile nav (fix D1)
Phase 4  Catalog              (spec 04)
Phase 5  Cart + Checkout      (spec 05)
Phase 6  Account + Orders     (spec 06)
Phase 7  Admin                (spec riêng, sau)
```

Quy tắc: **Phase N không được bắt đầu khi acceptance criteria của phase N-1 chưa pass.**

Lý do bottom-up: nếu redesign page trước rồi mới làm token, sẽ phải sửa page hai lần. Token → primitive → layout → page là thứ tự duy nhất mà mỗi file chỉ chạm một lần.

### 2.5 Guardrail — chống debt quay lại

Thêm vào `.eslintrc` / `eslint.config.js`:

```js
rules: {
  // Cấm import MUI mới ở storefront
  'no-restricted-imports': ['error', {
    patterns: [
      { group: ['@mui/*'], message: 'Storefront dùng Radix + Tailwind. MUI CHỈ được dùng trong src/pages/admin, src/components/admin, src/layout/admin — đây là ranh giới vĩnh viễn, không phải tạm thời.' },
      { group: ['@mui/icons-material'], message: 'Dùng lucide-react.' },
    ],
  }],
}
```

Kèm override cho phép MUI trong admin (đây là ranh giới **vĩnh viễn**, không phải tạm):

```js
{
  files: ['src/pages/admin/**', 'src/components/admin/**', 'src/layout/admin/**'],
  rules: { 'no-restricted-imports': 'off' },
}
```

Thêm script chống hex hardcode quay lại — chạy trong CI:

```jsonc
// package.json
"scripts": {
  "lint:tokens": "! grep -rEn '#[0-9a-fA-F]{6}' src --include=*.tsx --exclude-dir=admin || (echo '❌ Phát hiện hex hardcode. Dùng token trong tokens.css.' && exit 1)"
}
```

Thêm `stylelint-declaration-strict-value` là quá nặng cho giai đoạn này; grep đủ dùng.

---

## 3. Files phải sửa (Phase 0 — chuẩn bị)

| File | Việc |
|---|---|
| `frontend/package.json` | Thêm 15 dependency ở §2.3 |
| `frontend/eslint.config.js` | Thêm `no-restricted-imports` + override admin |
| `frontend/src/components/layout/index.ts` | Xoá export `LayoutShell`, `SectionContainer`, `SectionHeader`, `EmptyState` |
| `frontend/src/components/layout/LayoutShell.tsx` | **Xoá file** (dead code, trùng `MainLayout`) |
| `frontend/src/components/layout/SectionContainer.tsx` | Xoá hoặc viết lại thành `Container` ở spec 03 — quyết định ở spec 03 |
| `frontend/src/components/layout/SectionHeader.tsx` | Xoá hoặc viết lại — spec 03 |
| `frontend/src/components/layout/EmptyState.tsx` | Viết lại — spec 07 |
| `frontend/src/components/ui/Skeleton.tsx` | Viết lại — spec 07 |
| `frontend/src/lib/cn.ts` | **File mới** — helper `clsx` + `tailwind-merge` |

`src/lib/cn.ts`:

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Gộp class, class sau thắng class trước khi cùng nhóm Tailwind. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## 4. Acceptance criteria — Phase 0

- [ ] `npm i` chạy sạch, không peer-dependency warning
- [ ] `npm run build` pass (`tsc && vite build`)
- [ ] `npm run lint` pass với rule mới
- [ ] Thử thêm `import Button from '@mui/material/Button'` vào `src/pages/CartPage.tsx` → ESLint **báo lỗi**
- [ ] Thử thêm cùng import đó vào `src/pages/admin/AdminProductPage.tsx` → ESLint **không** báo lỗi
- [ ] `grep -rn "LayoutShell" src` → không kết quả
- [ ] `src/lib/cn.ts` tồn tại và được import thành công ở ít nhất 1 file test
- [ ] Bundle size trước migration được ghi lại làm baseline: chạy `npx vite-bundle-visualizer` và lưu số vào `docs/ui-baseline.md`

Điểm cuối quan trọng: không có baseline thì không chứng minh được migration làm app nhẹ hơn. Đây là con số nên đưa vào README của project sau khi xong.

---

## TL;DR

- Vấn đề số 1 không phải "UI chưa đẹp" mà là **mobile nav không tồn tại** (`Header.tsx:107`) và **hai design system chạy song song không theme** (31 files MUI, 0 `createTheme`).
- Bỏ MUI là quyết định đúng và **rẻ hơn tưởng**: 30/31 files MUI nằm trong admin, storefront phase chỉ phải xử lý 1 file (`CheckoutPage.tsx`).
- Debt nghiêm trọng nhất về mặt product: FEFO/batch inventory — feature khó nhất của backend — **hoàn toàn vô hình trên UI**. Redesign phải sửa điều này, không chỉ đổi màu.
- Migration bottom-up 7 phase, mỗi file chỉ chạm một lần. Guardrail bằng ESLint + grep CI để debt không quay lại.
