# Spec 08 — Execution roadmap

> Thứ tự làm, cổng kiểm tra mỗi phase, và những gì **không** làm.

---

## 1. Dependency graph

```
Phase 0  Chuẩn bị (deps, ESLint, dead code, baseline)
   │
Phase 1  Design tokens ──────────── spec 01
   │      (build sẽ VỠ ở chỗ dùng màu Tailwind mặc định — đúng như kỳ vọng)
   │
Phase 2  Primitives ─────────────── spec 02  +  spec 07 (state components)
   │      (giữ alias @deprecated → page cũ vẫn build)
   │
Phase 3  Layout + Nav ───────────── spec 03   ← FIX P0: mobile nav
   │
   ├── Phase 4  Catalog ────────── spec 04   ← cần endpoint availability
   ├── Phase 5  Cart + Checkout ── spec 05   ← fix 3 bug logic
   └── Phase 6  Account + Orders ─ spec 06   ← fix bug intent + autoComplete
   │      (4, 5, 6 độc lập với nhau — làm song song được nếu nhiều người)
   │
Phase 7a Admin — CHỨC NĂNG ───────── spec 09, 10, 11, 13
   │      (pagination, sort, bulk, URL state, tách file lớn)
   │
Phase 7b Admin — VISUAL ──────────── spec 12
   │      (MUI createTheme map sang token, xoá 593 sx)
   │
Phase 8  Dọn dẹp (xoá alias @deprecated, xoá legacy-* color)
          MUI KHÔNG bị xoá — nó ở lại admin có theme
```

**Quy tắc: phase N không bắt đầu khi cổng kiểm tra phase N-1 chưa pass.** Không có ngoại lệ cho phase 1-3 vì mọi thứ phía sau phụ thuộc chúng.

Phase 4, 5, 6 độc lập — nếu làm một mình thì thứ tự đề xuất: **5 → 4 → 6**.

Lý do đặt 5 trước 4: phase 5 chứa 3 bug logic ảnh hưởng doanh thu trực tiếp (đơn trùng, toast sai, validation), trong khi phase 4 chủ yếu là cải thiện. Sửa cái mất tiền trước.

---

## 2. Chi tiết từng phase

### Phase 0 — Chuẩn bị

| Việc | Spec |
|---|---|
| Thêm 15 dependency | 00 §2.3 |
| ESLint `no-restricted-imports` + override admin | 00 §2.5 |
| Xoá dead code: `LayoutShell`, `SectionContainer`, `SectionHeader` | 00 §3 |
| Tạo `src/lib/cn.ts` | 00 §3 |
| Cài `vitest` + `vitest-axe` + `@testing-library/react` | 07 §7 |
| **Ghi baseline:** bundle size, Lighthouse (4 trang), số hex hardcode, số `focus:outline-none` | 00 §4 |

**Cổng:** `npm run build` pass; thêm `import '@mui/material'` vào file storefront → ESLint **fail**; thêm vào file admin → **pass**; baseline đã ghi vào `docs/ui-baseline.md`.

Ghi baseline không phải thủ tục hình thức: không có nó thì không chứng minh được migration làm app tốt hơn, và đó chính là con số nên đưa vào README/CV.

---

### Phase 1 — Design tokens

| Việc | Spec |
|---|---|
| Thay `tokens.css`, `tailwind.config.js`, `index.css` | 01 §4, §6, §8 |
| Self-host 2 variable font, subset Việt | 01 §8 |
| Thêm `docs/contrast-check.py` | 01 §9 |
| Thêm alias `legacy-*` cho admin | 01 §7 |
| Sed màu Tailwind mặc định trong admin → `legacy-*` | 01 §7 |

**Cổng:**

- [ ] `npm run check:contrast` — 21/21 PASS
- [ ] `npm run build` pass
- [ ] `bg-blue-500` trong file `.tsx` → build **fail**
- [ ] Tab qua trang chủ: mọi element focus được có ring terracotta 2px nhìn rõ
- [ ] Network: đúng 2 request font, không có request tới `fonts.googleapis.com`
- [ ] `prefers-reduced-motion` → 0 animation
- [ ] Kiểm dấu tiếng Việt `ằ ẳ ẵ ặ ộ ợ ự ỹ` render đúng font mới, không fallback
- [ ] iOS Safari: scroll trang chủ không jank (đã bỏ `background-attachment: fixed`)

**Cảnh báo:** hết phase 1, app sẽ **trông xấu hơn** — token mới nhưng component chưa cập nhật, gradient bị bỏ, màu chưa map đúng. Đây là bình thường và tạm thời. Đừng vá bằng cách thêm hex vào component; chờ phase 2.

**Thời gian:** 1-2 ngày. Phần lâu nhất là sed admin và fix build.

---

### Phase 2 — Primitives

| Việc | Spec |
|---|---|
| 27 file primitive mới trong `src/components/ui/` | 02 §2 |
| `legacy-modal.tsx` adapter (giữ API `Modal`/`ConfirmDialog` cũ) | 02 §2 |
| Barrel mới + alias `@deprecated` | 02 §2 |
| State component: `skeleton`, `empty-state`, `alert` | 07 §7 |
| `ErrorBoundary` 3 tầng | 07 §2.5 |
| `ToastContext` đổi ruột sang Radix | 02 §8 |
| Rename file kebab-case qua tên trung gian | 02 §10 |

**Cổng:**

- [ ] `npm run build` pass
- [ ] `grep -rEn '#[0-9a-fA-F]{6}' src/components/ui` → **0**
- [ ] `grep -rn 'focus:outline-none' src/components/ui` → **0**
- [ ] Dialog: focus trap kín; Escape đóng; focus **quay về trigger**
- [ ] Shift+Tab từ element đầu Dialog → về element cuối, không thoát ra
- [ ] `FormField` + `Label` → click label focus vào input
- [ ] Screen reader vào input có lỗi → đọc label rồi đọc lỗi
- [ ] Toast xuất hiện → **không** đánh cắp focus khỏi field đang gõ
- [ ] Drawer trên iOS thật: nút cuối bấm được (kiểm `dvh`)
- [ ] Ném lỗi giả trong 1 component → fallback hiện, **không trắng cả app**
- [ ] `git log --follow src/components/ui/button.tsx` → thấy rename, không mất history
- [ ] Screenshot diff toàn storefront: chỉ Button/Input/Card/Badge đổi, không page nào vỡ layout
- [ ] Bundle không tăng > 20KB gzip so baseline

**Thời gian:** 3-5 ngày. Phase nặng nhất về khối lượng code.

**Rủi ro chính:** rename file case-insensitive. Làm sai → build pass local, fail CI Linux. Làm 2 bước như spec 02 §10.

---

### Phase 3 — Layout + Nav (FIX P0)

| Việc | Spec |
|---|---|
| **Mobile nav drawer** | 03 §3.2 |
| Header mới (bỏ getBoundingClientRect + 2 scroll listener) | 03 §3.3 |
| Footer mới (`<Link>` thay `<a href>`, bỏ `#menu`, năm động) | 03 §7 |
| `Container` / `Section` / `SectionHeader` / `ProductGrid` | 03 §2 |
| Skip link + landmark + `useRouteAnnouncer` | 03 §4 |
| Bỏ `ProductDropdown` → mega-menu Popover | 03 §6 |
| Bỏ `FloatingEmojiOverlay` | 03 §1.7 |
| Thay 34 chỗ `max-w-[1440px]` | 03 §9 |

**Cổng:**

- [ ] Ở 375px: hamburger hiện, drawer mở, tới được **cả 5** trang
- [ ] Click Link trong drawer → drawer tự đóng
- [ ] Ở đúng 1024px: nav desktop hiện, hamburger ẩn, không wrap, không overflow ngang
- [ ] `grep -rn '<a href="/' src --include=*.tsx` → **0** (trừ `tel:`/`mailto:`/`http`)
- [ ] `grep -c 'max-w-\[1440px\]' -r src` → **0**
- [ ] Ctrl+click mọi nav item → mở tab mới thật
- [ ] Tab lần đầu → element đầu là skip link, nhìn thấy được
- [ ] Enter trên skip link → focus vào `<main>`; Tab tiếp vào nội dung, không về header
- [ ] Navigate → scroll về top, focus về `<main>`
- [ ] Popover "Sản phẩm" mở bằng **Enter** và **Space**; `aria-expanded` đổi đúng
- [ ] Network: hover header **không** còn request `limit=1000`
- [ ] Footer copyright hiện năm hiện tại
- [ ] Lighthouse CLS < 0.1 trên `/`
- [ ] Tắt CSS → thứ tự đọc logic: skip link → header → main → footer

**Thời gian:** 2-3 ngày.

**Đây là phase có ROI cao nhất.** Nếu chỉ có thời gian làm 1 phase sau token+primitive, làm phase 3.

---

### Phase 5 — Cart + Checkout (làm trước phase 4)

| Việc | Spec |
|---|---|
| **Fix Bug 1:** thứ tự clearCart/toast/navigate | 05 §2 |
| **Fix Bug 2:** idempotency key (cần backend) | 05 §2 |
| **Fix Bug 3:** validation field-level + focus lỗi đầu + validate SĐT | 05 §2 |
| Bỏ `@mui/x-date-pickers` → `DeliverySlotPicker` | 05 §3 |
| Fix timezone (dùng `STORE_TZ`, không giờ máy khách) | 05 §3.3 |
| `CartItem` → discriminated union + migration v1→v2 | 05 §6 |
| Tách `CheckoutPage` 633 → ~110 dòng | 05 §5 |
| Stock revalidation ở giỏ hàng | 05 §7.2 |
| `PaymentQRPage` polling backoff + visibility + nhập tay | 05 §8 |
| Unit test `deliverySlots.ts` | 05 §5 |

**Cổng:**

- [ ] Block `createMomoQRPayment` → **không** thấy toast "thành công" rồi lỗi
- [ ] Double submit trên 3G → chỉ **1** đơn trong DB
- [ ] Để trống 4 field → submit **1 lần** hiện **4** lỗi cạnh từng field
- [ ] Submit có lỗi → focus nhảy vào field lỗi đầu tiên
- [ ] SĐT `"abc"` bị chặn có ví dụ; `0901234567` qua
- [ ] Timezone máy = `America/New_York`, chọn 14:00 → payload là 14:00 **giờ VN**
- [ ] `grep -rn "@mui" src/pages src/components --exclude-dir=admin` → **0**
- [ ] Bundle storefront giảm ≥ **50KB gzip** so baseline
- [ ] `grep -rn "startsWith('GIFTBOX-')" src` → chỉ còn trong migration
- [ ] Giỏ hàng localStorage v1 → migrate được, không mất item
- [ ] `validItems.filter` và check "giỏ không hợp lệ" đã **xoá**
- [ ] Xoá hết tồn kho → refresh giỏ → cảnh báo "đã hết hàng", nút thanh toán disabled
- [ ] Tab ẩn → polling dừng; quay lại → poll ngay
- [ ] QR có phương án nhập tay: SĐT + số tiền + nội dung, mỗi cái copy được
- [ ] `npm test src/utils/deliverySlots.test.ts` pass, có case biên + case timezone

**Thời gian:** 4-6 ngày. `CheckoutPage` là file phức tạp nhất của storefront.

**Phụ thuộc backend:** idempotency key (P1), `POST /cart/validate` (P1). Nếu backend chưa xong, làm phần còn lại trước, để 2 việc này thành task riêng.

---

### Phase 4 — Catalog

| Việc | Spec |
|---|---|
| **Backend: fix bug FEFO bán lô hết hạn** | 04 §2.3 — **P0** |
| Backend: `GET /{id}/availability` + 3 field vào list response | 04 §2.3 |
| Backend: `/products/best-sellers` (hoặc đổi tên section) | 04 §7.2 |
| `StockSignal` + `utils/inventory.ts` | 04 §2.5 |
| `ProductCard` mới (stretched link, aspect-ratio, lazy, w/h) | 04 §3 |
| `ProductDetail`: sticky bar, ngày giao, RadioGroup biến thể | 04 §4 |
| `SearchPage` 412 → ~90; filter vào URL | 04 §5 |
| `CategoryListingPage` 230 → ~50; dùng `ProductListing` | 04 §6 |
| `HeroBanner` tối ưu LCP | 04 §7.1 |
| GiftBox: hiện BOM + hạn dùng | 04 §8 |

**Cổng:**

- [ ] **Bug FEFO:** lô hết hạn hôm qua còn số lượng → đặt hàng → allocation **không** lấy lô đó
- [ ] Hết hàng → card mờ + badge + nút disabled
- [ ] Còn ≤ 3 → badge "Còn N", N khớp DB
- [ ] Lô hết hạn hôm nay → badge "Dùng trong hôm nay"
- [ ] `QuantityStepper.max` = tồn kho khả dụng, không tăng vượt
- [ ] Filter → URL đổi; copy URL sang tab mới → filter giữ
- [ ] Back button quay lại filter trước (không phải bấm 20 lần)
- [ ] Lighthouse: **LCP < 2.5s**, **CLS < 0.1**
- [ ] Grid 12 sản phẩm: 4 ảnh đầu eager, 8 ảnh lazy
- [ ] Quay video scroll grid khi ảnh load → **không** nhảy layout
- [ ] Trang danh sách: **1** request availability, không N
- [ ] Tab qua grid 12 sản phẩm: **24** stop, không 36+
- [ ] Screen reader: grid đọc "danh sách 12 mục"; filter đổi → đọc "Tìm thấy N sản phẩm"
- [ ] iPhone thật: sticky add-to-cart bar không bị home indicator che
- [ ] `grep -n "For now" src/services/productService.ts` → **0**
- [ ] Trang category: `h1` là tên danh mục; heading không nhảy level

**Thời gian:** 4-5 ngày frontend + backend song song.

---

### Phase 6 — Account + Orders

| Việc | Spec |
|---|---|
| **Fix bug intent** (`ProtectedRoute` + `LoginPage`) | 06 §2 |
| Thêm `autoComplete` **mọi** form | 06 §3 |
| `LoginPage` viết lại; error `role="alert"` | 06 §4 |
| `RegisterPage`: field-level error, strength meter, `new-password` | 06 §5 |
| `UserProfilePage` 446 → ~140; 1 `h1`; Radix Tabs; tab vào URL | 06 §6 |
| `MyOrdersPage`: filter, pagination, thumbnail, reorder | 06 §7 |
| `OrderDetailPage`: timeline, tách trạng thái thanh toán, mobile stacked | 06 §8 |

**Cổng:**

- [ ] Chưa login → `/checkout` → login → **về `/checkout`**, không phải `/`
- [ ] Từ login sang register rồi đăng ký → vẫn về `/checkout`
- [ ] `state.from` bị chèn URL ngoài → bị bỏ qua
- [ ] `grep -rn "autoComplete" src --include=*.tsx | wc -l` → **≥ 15**
- [ ] Chrome: lưu mật khẩu → lần sau tự điền cả 2 field
- [ ] Register: password manager **đề xuất tạo mật khẩu mạnh**
- [ ] Checkout: browser tự gợi ý địa chỉ đã lưu
- [ ] iOS: field SĐT mở bàn phím **số**
- [ ] axe: 0 violation "Identify Input Purpose" trên Login/Register/Checkout
- [ ] Đăng nhập sai → screen reader **đọc** lỗi
- [ ] `/profile` có **đúng 1** `h1`, **không đổi** khi switch tab
- [ ] Tab: mũi trái/phải hoạt động; `/profile?tab=password` mở đúng tab
- [ ] Upload ảnh 8MB → chặn ở client, **không** gửi request
- [ ] `OrderDetail` ở 375px: bảng là stacked card, **không** scroll ngang
- [ ] Card đơn hàng: 1 tab stop + 1 nút; ctrl+click mở tab mới

**Thời gian:** 3-4 ngày.

---

### Phase 7a / 7b — Admin

**Spec đã viết:** 09 (audit + chiến lược), 10 (DataTable), 11 (forms), 12 (theme), 13 (pages).

**Quyết định quan trọng đã sửa lại:** MUI **ở lại admin**, có theme. Xem spec 09 §3 — bỏ MUI ở admin tốn ~15 ngày và phải tự viết lại a11y bảng cho 11 bảng, trong khi cả hai phương án đều **không** giải quyết vấn đề lớn nhất (0 pagination/sort/bulk).

| Phase | Nội dung | Ngày | Phụ thuộc |
|---|---|---|---|
| **7a** | Chức năng: pagination, sort, bulk, URL state, validation, unsaved guard, tách file lớn | ~3 | **Không phụ thuộc phase 2-6.** Chỉ chạm `admin/` + backend |
| **7b** | Visual: `createTheme`, xoá 593 `sx` + 471 hex, chart color | ~4 | Phase **1** (token) + phase **7a** |

**7a độc lập với storefront hoàn toàn** — chen vào bất cứ đâu sau phase 0 nếu có 2 người làm song song.

**Nếu chỉ làm được một việc trong admin:** pagination + sort cho `AdminStockLedgerPage` và `AdminInventoryPage`. Hai bảng đó tăng vô hạn theo thời gian.

Khối lượng: 14 pages, 45 files, 10.183 LOC. `AdminDashboardPage` 964, `AdminGiftBoxPage` 810.

Bản đồ tóm tắt (chi tiết ở spec 13 §1):

| Nhóm | Files | Ghi chú |
|---|---|---|
| Data table | `ProductTable`, `SalesTable`, `PreOrderTable`, `VoucherTable` | Thay MUI Table → TanStack Table headless + Tailwind. **Mobile: stacked card, không scroll ngang** |
| Form | `ProductForm` (500), `VoucherForm` (514) | `FormField` + react-hook-form + zod |
| Date picker | `AdminBatchCreatePage`, `AdminVoucherPage` | `DatePicker` từ phase 5 |
| Chart | `RevenueByDayMonth`, `RevenueByProduct` | Recharts giữ, chỉ đổi màu sang token |
| Layout | `AdminLayout` (453) | Sidebar + Drawer mobile |
| Trang lớn | `AdminDashboardPage` (964), `AdminGiftBoxPage` (810) | Tách trước, style sau |

**Điểm quan trọng cho admin:** đây là công cụ vận hành cho nhân viên bakery dùng **hằng ngày**, không phải trang marketing. Ưu tiên: mật độ thông tin, số ít click, keyboard shortcut, không animation. Ngược lại hoàn toàn với storefront. Đừng bê thẩm mỹ storefront sang admin.

---

### Phase 8 — Dọn dẹp

| Việc | Điều kiện |
|---|---|
| Xoá alias `@deprecated` khỏi barrel `ui/index.ts` | Sau khi `grep -rn "LoadingSpinner\|ErrorMessage\|PriceDisplay" src` → 0 |
| Xoá `legacy-modal.tsx` | Sau khi mọi chỗ dùng `Dialog`/`AlertDialog` trực tiếp |
| ~~Xoá `@mui/*` + `@emotion/*`~~ | **KHÔNG làm** — MUI ở lại admin có theme (spec 09 §3) |
| Xoá `legacy-*` color khỏi `tailwind.config.js` | Sau khi `grep -c "legacy-" -r src` → 0 |
| Xoá ESLint override cho admin | Cùng lúc |
| Bật `darkMode: 'class'` + bỏ comment block `.dark` | Nếu quyết định làm dark mode |

**Cổng cuối:**

- [ ] `grep -rn "@mui" src --exclude-dir=admin` → **0** (admin vẫn còn, đúng như thiết kế)
- [ ] `grep -rn "legacy-" src` → **0**
- [ ] `grep -rn "@deprecated" src/components/ui` → **0**
- [ ] So sánh với baseline phase 0: bundle, Lighthouse (4 điểm), số hex, số `focus:outline-none`
- [ ] Ghi kết quả vào `README.md` — đây là con số dùng được khi phỏng vấn

---

## 3. Bảng tổng: bug tìm được (ngoài phạm vi UI)

Những thứ này phát hiện khi đọc code để viết spec. Không phải UI, nhưng nghiêm trọng hơn phần lớn vấn đề UI.

| # | Bug | File | Severity | Spec |
|---|---|---|---|---|
| B1 | FEFO có thể phân bổ **lô đã hết hạn** — chỉ filter `so_luong_hien_tai > 0`, không filter `ngay_het_han` | `app/services/fefo.py:8` | **P0** — bakery bán bánh hết hạn | 04 §2.3 |
| B2 | Mobile nav không tồn tại → `/gift-boxes` không có đường vào dưới 1024px | `Header.tsx:107` | **P0** | 03 §1.1 |
| B3 | `clearCart()` + toast "thành công" chạy trước `createMomoQRPayment` → đơn trùng | `CheckoutPage.tsx:165-171` | **P0** | 05 §2 |
| B4 | Không có idempotency key → double submit tạo đơn trùng | `CheckoutPage.tsx:165` | P1 | 05 §2 |
| B5 | Mất intent sau login → khách bấm thanh toán, login xong về trang chủ | `ProtectedRoute.tsx:23` | P1 | 06 §2 |
| B6 | `autoComplete` = 0 chỗ trong toàn app | mọi form | P1 | 06 §3 |
| B7 | Timezone: `getMinDeliveryTime()` dùng giờ máy khách | `CheckoutPage.tsx:216` | P1 | 05 §3.3 |
| B8 | Validation early-return, lỗi không gắn field, SĐT không validate format | `CheckoutPage.tsx:85-113` | P1 | 05 §2 |
| B9 | Không có error boundary → 1 lỗi render làm **trắng cả app** | toàn app | P1 | 07 §2.5 |
| B10 | `getBestSellers` là dữ liệu giả (3 sản phẩm đầu DB) | `productService.ts:20` | P1 | 04 §7.2 |
| B11 | Footer `<a href="/contact">` → full page reload, mất giỏ hàng | `Footer.tsx:34,42` | P2 | 03 §1.2 |
| B12 | `<a href="#menu">` trỏ tới id không tồn tại | `Footer.tsx:26` | P2 | 03 §1.3 |
| B13 | Focus state contrast 2.01:1 (cần ≥ 3:1) | `Input.tsx:24` + 51 chỗ | P2 | 01 §1 |
| B14 | Modal: mousedown trong, mouseup ngoài → đóng modal | `Modal.tsx:44,63` | P2 | 02 §1 |
| B15 | Không có forgot password | — | P1 (feature thiếu) | 06 §9 |
| B16 | Copyright hardcode `© 2024` (hiện là 2026) | `Footer.tsx:103` | P3 | 03 §7 |

**Nếu chỉ có thời gian sửa 3 thứ:** B1, B2, B3. Cả ba đều mất tiền hoặc mất khách trực tiếp, và không cái nào là vấn đề thẩm mỹ.

---

## 4. Những gì KHÔNG làm

Ghi rõ để tránh scope creep.

| Không làm | Lý do |
|---|---|
| Dark mode | Không nằm trong quyết định đã chốt. Token layer đã sẵn, bật sau bằng cách remap 1 tầng |
| i18n / đa ngôn ngữ | App phục vụ khách Việt. Thêm i18n bây giờ là abstraction chưa cần |
| Đổi sang Next.js / SSR | Vite + SPA đủ cho quy mô này. SSR chỉ đáng khi SEO là kênh chính, và lúc đó là quyết định kiến trúc riêng |
| Thêm react-query/SWR trong phase này | Cải thiện thật, nhưng là refactor data layer, không phải UI/UX. Làm sau phase 6 nếu cần |
| Storybook | Có giá trị nhưng là công cụ, không phải deliverable. Cân nhắc sau phase 2 |
| Animation phức tạp / Framer Motion | Brand Soft Craft không cần. CSS animation trong `tailwindcss-animate` đủ |
| Redesign admin trong cùng phase với storefront | 14 pages + 30 files MUI. Trộn vào sẽ làm cả hai chậm và không cái nào xong |
| Micro-frontend / module federation | Quy mô không cần |
| Đổi thư viện chart | Recharts hoạt động tốt, chỉ cần đổi màu sang token |

---

## 5. Rủi ro & giảm thiểu

| Rủi ro | Xác suất | Tác động | Giảm thiểu |
|---|---|---|---|
| Ghi đè `theme.colors` làm vỡ build ở nhiều chỗ không lường được | Cao | Trung bình | Chạy grep đếm trước (01 §7); alias `legacy-*`; sửa theo nhóm file, không sửa từng file |
| Rename kebab-case mất git history / vỡ CI Linux | Trung bình | Cao | Rename 2 bước (02 §10); test CI ngay sau phase 2 |
| Migration cart v1→v2 làm mất giỏ hàng người dùng thật | Trung bình | Cao | Migration có version + try/catch; nếu parse fail thì giỏ trống chứ không crash; test với dữ liệu localStorage thật |
| Backend không kịp làm `/availability` → phase 4 bị chặn | Trung bình | Trung bình | Frontend làm với mock trước; `StockSignal` nhận `undefined` thì không render (graceful degradation) |
| Bỏ MUI ở checkout làm hỏng luồng đặt hàng đang chạy | Thấp | **Rất cao** | Làm `DeliverySlotPicker` sau nhánh riêng; unit test `deliverySlots.ts` trước khi tích hợp; test đặt hàng end-to-end trước merge |
| Làm phase 2 quá lâu, mất động lực | Trung bình | Trung bình | Chia phase 2 thành 2 nửa: (a) button/input/card/badge/dialog — đủ cho phase 3; (b) còn lại làm khi cần |
| Redesign xong mà app chậm hơn | Thấp | Cao | Đo Lighthouse **mỗi phase**, không chỉ cuối. Baseline ở phase 0 |

Ô có rủi ro "rất cao": bỏ MUI ở checkout. Đây là luồng tạo doanh thu. Đề xuất cụ thể: làm `DeliverySlotPicker` **trước**, test độc lập, chỉ thay vào `CheckoutPage` khi đã chắc, và giữ commit revert được.

---

## 6. Ước lượng

| Phase | Ngày (1 người) | Có thể song song |
|---|---|---|
| 0 | 0.5 | — |
| 1 | 1.5 | — |
| 2 | 4 | Chia 2 nửa |
| 3 | 2.5 | — |
| 5 | 5 | Backend song song |
| 4 | 4.5 | Backend song song |
| 6 | 3.5 | — |
| **Storefront tổng** | **~21.5 ngày** | |
| 7 (admin) | ~15 | Spec riêng |
| 8 | 1 | |

Con số cho 1 người làm full-time, đã tính thời gian test thủ công (bàn phím, screen reader, mobile thật) ở mỗi cổng. Nếu bỏ phần test đó thì nhanh hơn ~25% nhưng sẽ mất phần lớn giá trị của bộ spec này — vì gần hết vấn đề tìm được ở audit là loại mà chỉ test thủ công mới phát hiện.

---

## 7. Cách đo thành công

Không đo bằng "trông đẹp hơn". Đo bằng số, so với baseline phase 0.

| Chỉ số | Baseline (ghi ở phase 0) | Mục tiêu |
|---|---|---|
| Hex hardcode trong `.tsx` — **storefront** | 150 | **0** |
| Hex hardcode trong `.tsx` — toàn bộ (gồm admin) | 621 | 0 sau phase 7 |
| `focus:outline-none` | 52 | **0** |
| `focus-visible` | 0 | ≥ 1 (khai báo toàn cục) |
| `autoComplete` | 0 | ≥ 15 |
| `<a href="/">` link nội bộ | 2 | **0** |
| `max-w-[1440px]` | 34 | **0** |
| Lighthouse Accessibility (`/`) | ? | ≥ 95 |
| Lighthouse Performance (`/`) | ? | ≥ 90 |
| LCP (`/`, mobile 4G) | ? | < 2.5s |
| CLS (`/`) | ? | < 0.1 |
| Bundle storefront (gzip) | ? | −50KB sau phase 5 |
| axe violation (7 trang) | ? | **0** |
| Trang tới được trên mobile | 2/5 | **5/5** |
| Hoàn thành luồng mua chỉ bằng bàn phím | ? | **Được** |
| File `.tsx` > 400 LOC | 9 | ≤ 2 |

Dòng cuối bảng — "trang tới được trên mobile: 2/5 → 5/5" — là chỉ số duy nhất trong bảng mà người dùng thật cảm nhận được ngay, và nó là fix rẻ nhất.

Bảng này sau khi điền xong là nội dung tốt để viết vào README hoặc kể trong phỏng vấn: không phải "tôi redesign UI cho đẹp hơn" mà "tôi audit ra 16 bug trong đó 3 cái P0, và đây là số liệu trước/sau".

---

## TL;DR

- Thứ tự bắt buộc: **0 → 1 → 2 → 3**, rồi 4/5/6 độc lập. Làm một mình thì **5 → 4 → 6** (sửa cái mất tiền trước).
- Phase có ROI cao nhất là **phase 3** (mobile nav). Nếu chỉ làm được 1 phase sau token+primitive, làm phase 3.
- Bỏ MUI **rẻ hơn tưởng** ở storefront: 30/31 files MUI nằm trong admin, storefront chỉ có `CheckoutPage.tsx`.
- Hết phase 1, app sẽ **trông xấu hơn** — bình thường và tạm thời. Đừng vá bằng hex.
- Audit tìm được **16 bug**, trong đó 3 P0: **FEFO có thể bán lô hết hạn**, **mobile nav không tồn tại**, **toast báo thành công trước khi payment xong gây đơn trùng**. Không cái nào là vấn đề thẩm mỹ.
- Rủi ro cao nhất: bỏ MUI ở `CheckoutPage` — đó là luồng doanh thu. Làm `DeliverySlotPicker` nhánh riêng, unit test trước, giữ commit revert được.
- Ước lượng storefront ~21.5 ngày (1 người), đã tính test thủ công ở mỗi cổng. Bỏ test thủ công thì nhanh hơn 25% nhưng mất phần lớn giá trị — vì gần hết vấn đề tìm được là loại chỉ test thủ công mới thấy.
- Đo thành công bằng bảng số liệu ở §7, không bằng "trông đẹp hơn". Bảng đó điền xong là nội dung kể được khi phỏng vấn.
