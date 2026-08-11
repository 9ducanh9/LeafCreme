# Verification report

Bộ spec này được viết sau khi clone `9ducanh9/LeafCreme@main` và đọc code thật. Dưới đây là những gì đã được **verify bằng lệnh**, và những gì **chưa** — để không phải tin lời suông.

---

## 1. Số liệu đã đo bằng lệnh (không ước lượng)

Chạy trong `frontend/src`:

| Chỉ số | Lệnh | Kết quả |
|---|---|---|
| Files `.ts` + `.tsx` | `find . -name "*.tsx" -o -name "*.ts" \| wc -l` | **152** |
| LOC `.tsx` | `find . -name "*.tsx" \| xargs cat \| wc -l` | **17.623** |
| Hex hardcode `.tsx` (toàn bộ) | `grep -rno "#[0-9a-fA-F]\{6\}" --include=*.tsx .` | **621** |
| Hex hardcode `.tsx` (không tính admin) | `… --exclude-dir=admin` | **150** |
| `focus:outline-none` | `grep -rn "focus:outline-none" --include=*.tsx .` | **52** |
| `focus-visible` | `grep -rn "focus-visible" --include=*.tsx .` | **0** |
| `aria-*` + `role=` | `grep -rn "aria-\|role=" --include=*.tsx .` | **29** |
| `<label>` | | **52** |
| `htmlFor` | | **33** → 19 label mồ côi |
| `autoComplete` | | **0** |
| `max-w-[1440px]` | | **34** |
| Files import `@mui` | `grep -rl "@mui" .` | **31** |
| — trong admin | | **30** |
| — trong storefront | | **1** (`pages/CheckoutPage.tsx`) |
| `createTheme` / `ThemeProvider` | `grep -rl "createTheme\|ThemeProvider" .` | **0** |
| `navigate(` | | **65** |
| `<Link` | | **2** |
| `bg-gradient` | | **30** |
| `style={{` inline | | **39** |
| `<a href="/…">` nội bộ | `grep -rn 'href="/' \| grep -v http` | **2** |
| Files `.tsx` > 400 LOC | `wc -l \| awk '$1>400'` | **9** |
| `ErrorBoundary` / `componentDidCatch` | `grep -rn …` | **0** |
| `id="menu"` (đích của `href="#menu"`) | `grep -rn 'id="menu"' .` | **0** — anchor chết |
| `lang="vi"` trong `index.html` | `grep -n 'lang=' index.html` | **có** (dòng 2) — đã đúng, không cần sửa |
| Vitest / Jest config | `ls \| grep -i "vitest\|jest"` | **0** — chưa có test nào |

### 1.1 Admin — đo riêng trong `{pages,components,layout}/admin`

| Chỉ số | Kết quả |
|---|---|
| Files `.ts` + `.tsx` (gồm `services/admin`) | **45** |
| LOC `.tsx` | **8.558** |
| LOC gồm `services/admin/*.ts` | **10.183** |
| `TablePagination` | **0** |
| `TableSortLabel` / `onSort` / `sortBy` | **0** |
| `Checkbox` (bulk select) | **0** |
| `useSearchParams` | **0** |
| `sx={{` | **593** |
| Hex hardcode | **471** |
| `createTheme` / `ThemeProvider` | **0** |
| `alert()` native | **3** (`ProductForm.tsx:113,119,162`) |
| `console.error` | **20** |
| `beforeunload` | **0** |
| Form có `validate()` | **1/6** (chỉ `VoucherForm.tsx:131`) |
| `aria-*` / `role=` | **4** trên 45 files |
| `focus:outline-none` | **0** (MUI tự lo focus) |
| Responsive breakpoint | **28** trên 45 files |
| `<TableCell>` usage | **204** |
| `sx` lặp giống hệt trong `ProductTable` | **10 lần** (`:44-53`) |
| File `.tsx` admin > 400 LOC | **9** |
| Backend endpoint trả `total` | **1** (`alerts.py:53`) |
| Backend endpoint có `sort_by` | **0** |
| `order_by` thiếu tie-breaker | **22 chỗ** trong `app/routers/*.py` |

---

## 2. File:line reference — đã verify từng cái

Toàn bộ **44** reference trong bộ spec (24 storefront + 20 admin) được kiểm bằng `sed -n "<line>p" <file>` và khớp nội dung.

### 2.1 Storefront

| Reference | Nội dung dòng đó |
|---|---|
| `Header.tsx:107` | `<nav className="hidden lg:flex items-center gap-6 ml-6">` |
| `Header.tsx:118-134` | block `onMouseEnter` + `ProductDropdown` |
| `Header.tsx:203` | `className="w-10 h-10 rounded-full object-cover border border-border"` |
| `Footer.tsx:26` | `href="#menu"` |
| `Footer.tsx:34` | `href="/contact"` |
| `Footer.tsx:42` | `href="/policies"` |
| `Footer.tsx:103` | `<p>© 2024 Leaf Creme. All rights reserved.</p>` |
| `ui/Input.tsx:24` | `focus:outline-none focus:border-accent-brown` |
| `ui/Input.tsx:27` | `${error ? 'border-accent-pink' : ''}` |
| `ui/Modal.tsx:44` | `onClick={onClose}` (trên wrapper `fixed inset-0`) |
| `MainLayout.tsx:36` | `<FloatingEmojiOverlay emoji={…} />` |
| `MainLayout.tsx:40` | `<main className="flex-1 relative z-10">` |
| `ProductCard.tsx:20` | `<Card className="… cursor-pointer" onClick={() => navigate(…)}>` |
| `ProtectedRoute.tsx:23` | `return <Navigate to="/login" replace />` — **không** có `state` |
| `LoginPage.tsx:25` | `navigate('/')` |
| `LoginPage.tsx:36` | `<div className="min-h-screen bg-background …">` |
| `LoginPage.tsx:39` | `<h1 className="font-heading text-4xl …">` (nội dung = "Leaf Creme") |
| `CheckoutPage.tsx:49` | `const [deliveryDateTime, setDeliveryDateTime] = useState<Dayjs \| null>(null)` |
| `CheckoutPage.tsx:165` | `clearCart()` — trước `createMomoQRPayment` ở dòng 171 |
| `CheckoutPage.tsx:216` | `const getMinDeliveryTime = (): Dayjs => {` |
| `PaymentQRPage.tsx:24` | `const timer = setInterval(() => {` |
| `productService.ts:20` | `export async function getBestSellers(limit: number = 3)` — có comment `// For now` |
| `app/routers/products.py:58` | `class ProductResponse(BaseModel):` — **không** field tồn kho nào |
| `app/services/fefo.py:8` | `def alloc_fefo_by_variant(db, bienthe_id, need_qty)` |

### 2.2 Admin

| Reference | Nội dung dòng đó |
|---|---|
| `ProductForm.tsx:113` | `alert('Vui lòng chọn file ảnh')` |
| `ProductForm.tsx:119` | `alert('File ảnh không được vượt quá 5MB')` |
| `ProductForm.tsx:162` | `alert(error instanceof Error ? ...)` |
| `VoucherForm.tsx:131` | `const validate = (): boolean => {` — mẫu tốt sẵn có |
| `ProductTable.tsx:29` | `return status === 'active' ? 'success' : 'default'` |
| `ProductTable.tsx:44-53` | 10 `<TableCell sx={{ fontWeight: 600, color: '#7A6F63', … }}>` giống hệt |
| `AdminDashboardPage.tsx:52` | `const COLORS = ['#C59B72', '#F5C96A', '#F7B4B8', '#E8E5DD', '#7A6F63']` |
| `AdminLayout.tsx:39-49` | 11 nav item phẳng, gồm `{ text: 'Batch trace', … }` |
| `AdminLayout.tsx:55` | `const [mobileOpen, setMobileOpen] = useState(false)` — **admin ĐÃ CÓ mobile drawer** |
| `AdminLayout.tsx:65` | `const handleNavigation = (path: string) => {` — dùng `navigate()` |
| `AdminLayout.tsx:74` | `onMouseEnter={() => !isMobile && setSidebarExpanded(true)}` |
| `AdminLayout.tsx:283` | `display: { md: 'none' }` — hamburger mobile |
| `services/admin/productService.ts:58` | `limit: 1000, // Get all products` |
| `services/admin/preOrderService.ts:69` | `limit: 100,` |
| `services/admin/preOrderService.ts:114` | `transformed.sort((a, b) =>` — sort ở client |
| `app/routers/batches.py:249` | `skip: int = Query(0, ge=0),` |
| `app/routers/batches.py:733` | `@router.get("/expiring")` |
| `app/routers/alerts.py:53` | `total: int` — **endpoint DUY NHẤT có total** |
| `app/routers/inventory_trace.py:115` | `rows.sort(key=lambda row: row["timestamp"] …)` — sort ở Python |
| `app/routers/products.py:117` | `@router.get("", response_model=List[ProductResponse])` |

Tất cả cross-reference nội bộ giữa **14** spec (`spec NN §X`) đã được kiểm — không có link tới section không tồn tại.

### 2.3 Hai chỗ t sửa sai trong quá trình viết spec admin

| Claim bản nháp | Thực tế | Đã sửa ở |
|---|---|---|
| Spec 08 phase 7: "Mobile: stacked card, **không scroll ngang**" — hàm ý mobile admin đang vỡ | `AdminLayout.tsx:55,283` — admin **đã có** mobile drawer | spec 09 §2.4 |
| `CHART_COLORS` dùng token brand có sẵn (`terra-600`, `mint-600`) | Hai màu đó chênh độ sáng **0.011** — fail chính tiêu chí ≥ 0.10 mà spec đặt ra. Phải giải bằng thuật toán, không chọn bằng mắt | spec 13 §2.4 |
| `ProductTable` `sx` lặp "9 lần" ở `:40-52` | **10 lần** ở `:44-53` | spec 09 §2.3, spec 12 §3 |

---

## 3. Contrast — đã tính bằng công thức WCAG 2.1, không ước lượng

Công thức: relative luminance theo WCAG 2.1, `(L1+0.05)/(L2+0.05)`.

### 3.1 Palette mới "Soft Craft" — 21/21 PASS

```
fg-strong / canvas               16.40 / 4.5  PASS
fg-default / canvas              12.76 / 4.5  PASS
fg-default / surface             13.16 / 4.5  PASS
fg-default / subtle              12.05 / 4.5  PASS
fg-muted / canvas                 8.04 / 4.5  PASS
fg-subtle / canvas                5.06 / 4.5  PASS
fg-subtle / surface               5.22 / 4.5  PASS
brand-fg / canvas                 7.09 / 4.5  PASS
accent-fg / canvas                5.31 / 4.5  PASS
success-fg / success-bg           4.79 / 4.5  PASS
warning-fg / warning-bg           4.84 / 4.5  PASS
danger-fg / danger-bg             5.91 / 4.5  PASS
info-fg / info-bg                 6.16 / 4.5  PASS
on-brand / brand-bg               5.18 / 4.5  PASS
on-brand / brand-hover            7.31 / 4.5  PASS
on-accent / accent-bg             5.47 / 4.5  PASS
danger-fg-on-solid / solid        6.47 / 4.5  PASS
border-interactive / canvas       3.32 / 3.0  PASS
border-interactive / surface      3.42 / 3.0  PASS
focus-ring / canvas               5.02 / 3.0  PASS
focus-ring / surface              5.18 / 3.0  PASS
```

Script để chạy lại nằm ở spec 01 §9 (`docs/contrast-check.py`).

### 3.2 Palette cũ — 4 cặp FAIL

| Cặp | Ratio | Ngưỡng | Kết quả |
|---|---|---|---|
| `text-primary #473C2F` / `#FFF8F0` | 10.20 | 4.5 | PASS |
| `text-secondary #7A6F63` / `#FFF8F0` | 4.66 | 4.5 | PASS (headroom 0.16) |
| `accent-pink #F7B4B8` / `#FFF8F0` — dùng làm **error text** | **1.64** | 4.5 | **FAIL** |
| `accent-yellow #F5C96A` / `#FFF8F0` | **1.48** | 4.5 | **FAIL** |
| `accent-brown #C59B72` / `#FFF8F0` | **2.40** | 4.5 | **FAIL** |
| `border #E8E5DD` / `#FFF8F0` (non-text) | **1.20** | 3.0 | **FAIL** |
| Focus state: border `#E8E5DD` → `#C59B72` | **2.01** | 3.0 | **FAIL** |

**Ghi chú về một sửa sai trong quá trình viết:** bản nháp đầu của spec 01 nói `text-secondary` FAIL với ratio 4.34. Sau khi tính lại bằng script, con số đúng là **4.66 — PASS**. Spec đã được sửa. Ba accent color thì fail thật.

---

## 4. Những gì CHƯA verify — phải tự kiểm khi làm

Bộ spec dựa trên đọc code tĩnh. Những điều sau **suy luận từ code**, chưa chạy app để xác nhận:

| Nội dung | Trạng thái | Cách kiểm |
|---|---|---|
| Bug FEFO bán lô hết hạn (spec 04 §2.3) | Suy từ code `fefo.py` — `where` chỉ có `so_luong_hien_tai > 0`, không có `ngay_het_han` | Tạo lô `ngay_het_han` = hôm qua còn số lượng → đặt hàng → xem allocation |
| Bug 1 checkout (toast trước payment) | Đọc thứ tự dòng 165 → 171 | Block `createMomoQRPayment` bằng DevTools → xem hành vi thật |
| Mobile nav thiếu | `grep` không thấy `lg:hidden` mở drawer trong `Header.tsx` | Resize browser xuống 375px |
| Filter `SearchPage` không nằm trong URL | Chưa đọc hết 412 dòng | Đổi filter → xem URL có đổi không |
| `CartContext` lưu ở localStorage hay không | Chưa đọc `CartContext.tsx` đầy đủ | Ảnh hưởng kế hoạch migration cart v1→v2 ở spec 05 §6 |
| `FloatingEmojiOverlay` có check `prefers-reduced-motion` | Chưa đọc file | Nếu có thì đánh giá ở spec 03 §1.7 nhẹ hơn |
| `GiftBoxFilters` đã filter theo `phu_hop_dip` chưa | Chưa đọc | spec 04 §8 |
| Contrast của `STATUS_LABELS` trong `MyOrdersPage` | Chưa tính (màu nằm trong object, cần đọc) | spec 06 §7.2 |
| Bundle size baseline | Chưa đo (cần build) | `npx vite-bundle-visualizer` ở phase 0 |
| Lighthouse baseline | Chưa đo (cần chạy app) | Phase 0 |
| Backend có bảng chi tiết đơn để tính best-seller thật | Suy từ việc có `analytics.py` + `reports.py` | Đọc schema đơn hàng |

**Cách dùng bảng này:** phase 0 của spec 08 nên bắt đầu bằng việc chạy app và kiểm 11 dòng trên. Nếu có dòng nào không đúng như spec suy luận, sửa spec trước khi code.

---

## 5. Giới hạn của bộ spec

Nói rõ để không kỳ vọng sai:

- **Chưa chạy app.** Toàn bộ audit là đọc code + grep. Có thể có vấn đề runtime không phát hiện được bằng cách này (memory leak, race condition, hành vi lạ khi mạng chậm).
- **Chưa xem UI thật.** Không có screenshot. Nhận xét về thẩm mỹ dựa trên đọc class Tailwind và token, không dựa trên nhìn.
- **Chưa test screen reader.** Vấn đề a11y nêu ra là loại kiểm được từ code (thiếu label, thiếu ARIA, focus bị tắt). Loại chỉ phát hiện khi dùng NVDA/VoiceOver thật thì chưa.
- **Chưa đọc hết backend.** Đọc `fefo.py`, `products.py`, và structure của `routers/`. Chưa đọc `models.py` đầy đủ, nên schema đề xuất ở spec 04 §2.3 có thể cần điều chỉnh tên field.
- **Ước lượng thời gian ở spec 08 §6 là phỏng đoán,** không dựa trên velocity thật của ai.
- ~~Admin chưa được audit sâu.~~ **Đã audit** — spec 09-13. Số liệu ở §1.1.
- **Admin: chưa chạy app.** Cùng giới hạn như storefront. Các claim về "600 dòng render chậm", "1.000 lô mở < 2s" là **suy luận**, chưa đo. Phải seed dữ liệu thật và đo ở phase 7a.
- **Chưa test admin trên điện thoại thật.** Kịch bản "nhân viên kiểm kho bằng điện thoại" là giả định về cách dùng, cần xác nhận với người dùng thật.
- **`shelf_life_min/max_days` theo danh mục (spec 11 §3.3) chưa tồn tại ở backend.** Cảnh báo mềm về hạn dùng bất thường phụ thuộc nó — đã thiết kế graceful degrade nhưng chưa verify.
- **Chưa verify MUI v7 có `enableCssLayer`.** `package.json` ghi `^7.3.5`; v6+ có API này nhưng cần kiểm thực tế (spec 12 §5.1).

---

## 6. Tóm tắt độ tin cậy

| Loại phát biểu | Độ tin cậy |
|---|---|
| Số liệu grep/count (§1) | **Cao** — đo bằng lệnh, lặp lại được |
| File:line reference (§2) | **Cao** — verify từng cái |
| Contrast ratio (§3) | **Cao** — tính bằng công thức, có script |
| Số liệu admin (§1.1) | **Cao** — đo bằng lệnh |
| Contrast 10 màu admin cũ (spec 12 §1.2) | **Cao** — tính bằng công thức |
| `CHART_COLORS` mới (spec 13 §2.4) | **Cao** — giải bằng thuật toán rồi verify mọi cặp gap ≥ 0.10. Bản nháp đầu FAIL (terra-600/mint-600 chênh 0.011) và đã sửa |
| 16 bug ở spec 08 §3 | **Trung bình-cao** — suy từ code, logic rõ, nhưng chưa reproduce bằng chạy thật |
| Đề xuất thiết kế (layout, component API) | **Trung bình** — dựa trên pattern chuẩn, cần điều chỉnh theo thực tế |
| Ước lượng thời gian | **Thấp** — phỏng đoán |
| Claim "admin chậm với 600 dòng" | **Trung bình** — suy từ 5.400 `sx` object/render, chưa đo bằng profiler |
| Giả định "nhân viên kiểm kho bằng điện thoại" | **Thấp** — giả định về cách dùng, cần xác nhận |
