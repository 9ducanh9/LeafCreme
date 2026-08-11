# LeafCreme — UI/UX Redesign Specs

**Scope:** Storefront (17 pages) — spec 00-08. Admin (14 pages) — spec 09-13.
**Quyết định đã chốt:**

| Hạng mục | Quyết định |
|---|---|
| Component library | **Storefront:** bỏ MUI → Tailwind + Radix + CVA. **Admin:** giữ MUI, thêm theme map sang token (spec 09 §3) |
| Brand | "Soft Craft" — warm sand + terracotta + mint, có kỷ luật, WCAG AA |
| Scope | Storefront (spec 00-08) → Admin (spec 09-13) |
| Dark mode | Không nằm trong scope, nhưng token layer thiết kế sẵn để bật sau |

---

## Đọc theo thứ tự này

| # | Spec | Nội dung | Phụ thuộc |
|---|---|---|---|
| 00 | [`00-audit-and-strategy.md`](./00-audit-and-strategy.md) | Audit hiện trạng có số liệu, debt inventory, chiến lược bỏ MUI | — |
| 01 | [`01-design-tokens.md`](./01-design-tokens.md) | Token layer Soft Craft, palette đã verify contrast, type/space/radius/elevation/motion/z-index | 00 |
| 02 | [`02-primitives.md`](./02-primitives.md) | 14 primitive components trên Radix + CVA, thay MUI và rewrite `components/ui` | 01 |
| 03 | [`03-layout-navigation.md`](./03-layout-navigation.md) | Header + mobile nav (đang **thiếu hoàn toàn**), Footer, Container, grid, breakpoints | 01, 02 |
| 04 | [`04-catalog-discovery.md`](./04-catalog-discovery.md) | Home, Category, Search, ProductCard, ProductDetail, GiftBox | 02, 03 |
| 05 | [`05-cart-checkout.md`](./05-cart-checkout.md) | Cart, CartDrawer, tách CheckoutPage 633 LOC, PaymentQR, OrderSuccess | 02, 03 |
| 06 | [`06-account-orders.md`](./06-account-orders.md) | Login, Register, Profile, MyOrders, OrderDetail | 02, 03 |
| 07 | [`07-states-and-a11y.md`](./07-states-and-a11y.md) | Loading/empty/error, skeleton, toast, form validation, a11y baseline | 02 |
| 08 | [`08-execution-roadmap.md`](./08-execution-roadmap.md) | 9 phase, dependency graph, verification gate mỗi phase, bảng 16 bug | tất cả |
| 09 | [`09-admin-audit-and-strategy.md`](./09-admin-audit-and-strategy.md) | **Admin:** audit, quyết định giữ MUI + theme, chia 7a/7b | — |
| 10 | [`10-admin-data-tables.md`](./10-admin-data-tables.md) | DataTable: pagination, sort, bulk, URL state. **Cần backend** | 09 |
| 11 | [`11-admin-forms.md`](./11-admin-forms.md) | 6 form, validation lô hàng 3 tầng, unsaved guard | 09 |
| 12 | [`12-admin-theme.md`](./12-admin-theme.md) | MUI `createTheme` map sang token, xoá 593 `sx` + 471 hex | 01, 09 |
| 13 | [`13-admin-pages.md`](./13-admin-pages.md) | 14 trang admin, chart color, AdminLayout, shortcut | 10, 11, 12 |
| — | [`VERIFICATION.md`](./VERIFICATION.md) | Số liệu nào đã verify bằng lệnh, số liệu nào chưa, giới hạn của bộ spec | — |

**Đọc `VERIFICATION.md` trước khi tin bất kỳ con số nào trong bộ spec.** Nó ghi rõ cái gì đã đo bằng lệnh, cái gì là suy luận từ code tĩnh, và 11 điều cần tự kiểm ở phase 0.

---

## 5 vấn đề nghiêm trọng nhất (chi tiết ở spec 00)

1. **Mobile nav không tồn tại.** `Header.tsx:107` — `<nav className="hidden lg:flex">` và không có hamburger fallback. Dưới 1024px người dùng **không thể** vào Sản phẩm / Hộp quà / Liên hệ. Đây là bug chức năng, không phải vấn đề thẩm mỹ.
2. **Hai design system đánh nhau.** 31 files import `@mui`, và **không có `createTheme`/`ThemeProvider`** ở đâu cả → admin đang chạy Roboto + blue `#1976d2` mặc định của MUI, đụng thẳng brand ấm. Fix bằng theme, không bằng cách bỏ MUI (spec 09 §3).
3. **Keyboard focus bị phá.** `focus:outline-none` xuất hiện **52 lần**, `focus-visible` xuất hiện **0 lần**. WCAG 2.4.7 fail toàn cục.
4. **Token layer chỉ để trang trí.** `tokens.css` có 77 dòng, nhưng vẫn **621 hex hardcode** trong `.tsx` — kể cả trong chính `ui/Button.tsx`, `ui/Card.tsx`, `ui/Badge.tsx`.
5. **Navigation dùng `<button onClick={navigate}>`.** 65 lần `navigate()` vs 2 lần `<Link>` → không ctrl+click được, không SEO, sai semantic.

### Và 3 vấn đề nghiêm trọng nhất của admin (chi tiết ở spec 09)

6. **Bảng admin không dùng được với dữ liệu thật.** **0 pagination, 0 sorting, 0 bulk select** trên toàn bộ 11 bảng, và `productService.ts:58` fetch `limit: 1000`. Bakery 200 sản phẩm × 3 biến thể = 600 dòng → không sort được theo ngày hết hạn, tức là không biết lô nào cần xử lý trước.
7. **593 `sx={{...}}` inline** — object literal mới mỗi render × 5.400 cell. Đây là nguyên nhân thật của "admin chậm", và nó đang copy màu `#7A6F63` vào 593 chỗ.
8. **1/6 form có validation.** `AdminBatchCreatePage` (511 dòng, form nhập lô hàng) có **0** — mà đây là nơi dữ liệu FEFO bắt đầu. Và **0 unsaved-changes guard** trên toàn bộ admin.

---

## Cách dùng bộ spec này

Mỗi spec có 5 phần cố định:

1. **Hiện trạng** — dẫn `file:line` cụ thể, không nói chung chung
2. **Vấn đề** — tại sao nó sai (product / a11y / maintainability / performance)
3. **Thiết kế mới** — kèm code thật, copy được
4. **Files phải sửa** — danh sách đầy đủ
5. **Acceptance criteria** — checklist tự verify được, đo được

Không tự ý đổi quyết định ở spec 01 khi đang làm spec 04. Nếu phát hiện spec sai, sửa spec trước rồi mới code.
