/**
 * Khai báo gate cho từng phase.
 *
 * NGUYÊN TẮC: chỉ đưa vào đây những check MÁY kiểm được, trả kết quả xác định.
 * Check cần mắt người / thiết bị thật nằm ở docs/MANUAL-CHECKS.md — KHÔNG trộn vào.
 *
 * Mỗi check: { name, kind, ...args, why }
 *
 * kind:
 *   'cmd'      — chạy lệnh, pass nếu exit 0                { cmd }
 *   'cmdFails' — chạy lệnh, pass nếu exit != 0             { cmd }
 *   'exists'   — file/dir tồn tại                          { path }
 *   'absent'   — file/dir KHÔNG tồn tại                    { path }
 *   'count'    — đếm match regex trong glob, so ngưỡng     { pattern, glob, op, value, exclude }
 *   'contains' — file chứa regex                           { path, pattern }
 *   'lacks'    — file KHÔNG chứa regex                     { path, pattern }
 *   'maxLoc'   — file có <= N dòng                         { path, value }
 *   'kebab'    — mọi file trong dir đều kebab-case         { path }
 */

const SRC = 'frontend/src'
const NO_ADMIN = ['**/admin/**']

export const PHASES = {
  /* =================================================================== */
  0: {
    title: 'Chuẩn bị',
    spec: 'docs/ui-redesign/00-audit-and-strategy.md §2.3, §2.5, §3, §4',
    checks: [
      { name: 'build pass', kind: 'cmd', cmd: 'npm --prefix frontend run build',
        why: 'Baseline phải xanh trước khi đổi gì.' },

      { name: 'cn.ts tồn tại', kind: 'exists', path: `${SRC}/lib/cn.ts`,
        why: 'Helper clsx + tailwind-merge, mọi primitive phụ thuộc.' },

      { name: 'dead code LayoutShell đã xoá', kind: 'absent', path: `${SRC}/components/layout/LayoutShell.tsx`,
        why: 'Spec 00 §3 — trùng MainLayout, chỉ export trong barrel.' },

      { name: 'ESLint chặn @mui ở storefront', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs eslint-mui',
        why: 'Guardrail chính chống MUI quay lại. Phải chặn storefront VÀ cho phép admin.' },

      { name: 'vitest cài đặt', kind: 'contains', path: 'frontend/package.json',
        pattern: '"vitest"',
        why: 'Phase 5 cần unit test deliverySlots.' },

      { name: 'baseline đã ghi', kind: 'exists', path: 'docs/ui-baseline.md',
        why: 'Không có baseline thì không chứng minh được migration cải thiện gì.' },

      { name: 'baseline không rỗng', kind: 'cmd',
        cmd: 'node -e "const s=require(\'fs\').readFileSync(\'docs/ui-baseline.md\',\'utf8\');if(s.trim().length<200)process.exit(1)"',
        why: 'Baseline phải có số thật, không phải file trống.' },

      { name: 'baseline có số bundle', kind: 'contains', path: 'docs/ui-baseline.md',
        pattern: '(?i)(gzip|kb|KiB)',
        why: 'Bundle size là chỉ số chính để so sau phase 5.' },

      { name: 'baseline có điểm Lighthouse', kind: 'contains', path: 'docs/ui-baseline.md',
        pattern: '(?i)lighthouse',
        why: 'Cần điểm a11y/perf trước để so.' },
    ],
  },

  /* =================================================================== */
  1: {
    title: 'Design tokens',
    spec: 'docs/ui-redesign/01-design-tokens.md',
    checks: [
      { name: 'contrast 21/21 PASS', kind: 'cmd', cmd: 'python3 docs/contrast-check.py',
        why: 'Palette phải đạt WCAG AA. Đây là lý do tồn tại của phase này.' },

      { name: 'build pass', kind: 'cmd', cmd: 'npm --prefix frontend run build',
        why: 'Hết phase 1 build phải xanh lại (sau khi map admin sang legacy-*).' },

      { name: 'tokens.css có tầng semantic', kind: 'contains', path: `${SRC}/styles/tokens.css`,
        pattern: '--bg-canvas',
        why: 'Kiến trúc 3 tầng. Component chỉ dùng tầng semantic.' },
      { name: 'tokens.css có --fg-default', kind: 'contains', path: `${SRC}/styles/tokens.css`, pattern: '--fg-default', why: '' },
      { name: 'tokens.css có --border-interactive', kind: 'contains', path: `${SRC}/styles/tokens.css`, pattern: '--border-interactive',
        why: 'Viền input phải đạt 3:1 — token riêng, khác border trang trí.' },
      { name: 'tokens.css có --focus-ring', kind: 'contains', path: `${SRC}/styles/tokens.css`, pattern: '--focus-ring', why: '' },
      { name: 'tokens.css có thang z-index', kind: 'contains', path: `${SRC}/styles/tokens.css`, pattern: '--z-modal', why: '' },
      { name: 'tokens.css tôn trọng reduced-motion', kind: 'contains', path: `${SRC}/styles/tokens.css`,
        pattern: 'prefers-reduced-motion', why: 'WCAG 2.3.3.' },

      { name: 'tailwind GHI ĐÈ colors (không extend)', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs tailwind-override',
        why: 'Nếu colors nằm trong extend thì bg-blue-500 vẫn hợp lệ → mất guardrail.' },

      { name: 'index.css KHÔNG còn radial-gradient blob', kind: 'lacks', path: `${SRC}/index.css`,
        pattern: 'radial-gradient',
        why: 'Spec 01 §8 — làm ảnh sản phẩm ngả màu, gây jank iOS.' },
      { name: 'index.css KHÔNG còn background-attachment fixed', kind: 'lacks', path: `${SRC}/index.css`,
        pattern: 'background-attachment:\\s*fixed', why: 'Bug repaint Safari iOS.' },
      { name: 'index.css có focus-visible toàn cục', kind: 'contains', path: `${SRC}/index.css`,
        pattern: ':focus-visible',
        why: 'Fix một lượt 52 chỗ focus:outline-none.' },
      { name: 'index.css có .skip-link', kind: 'contains', path: `${SRC}/index.css`, pattern: 'skip-link',
        why: 'Phase 3 dùng.' },

      { name: 'font self-host, không gọi Google Fonts', kind: 'lacks', path: 'frontend/index.html',
        pattern: 'fonts\\.googleapis\\.com',
        why: 'Tránh FOUT + phụ thuộc CDN ngoài.' },
      { name: 'có preload font', kind: 'contains', path: 'frontend/index.html',
        pattern: 'rel="preload"[^>]*as="font"', why: '' },

      { name: '0 màu Tailwind mặc định ở storefront', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs legacy-colors --fail-on storefront',
        why: 'Storefront phải dùng token. legacy-* chỉ cho admin.' },

      { name: 'legacy-* chỉ xuất hiện trong admin', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs legacy-scope',
        why: 'Alias legacy là tạm cho admin. Lọt vào storefront là né guardrail.' },
    ],
  },

  /* =================================================================== */
  2: {
    title: 'Primitives',
    spec: 'docs/ui-redesign/02-primitives.md + 07 §2',
    checks: [
      { name: 'build pass', kind: 'cmd', cmd: 'npm --prefix frontend run build', why: '' },

      { name: '0 hex trong components/ui', kind: 'count',
        pattern: '#[0-9a-fA-F]{6}', glob: `${SRC}/components/ui/**/*.tsx`, op: '==', value: 0,
        why: 'Primitive là nơi hex cũ tập trung nhiều nhất (Button/Card/Badge).' },

      { name: '0 focus:outline-none trong components/ui', kind: 'count',
        pattern: 'focus:outline-none', glob: `${SRC}/components/ui/**/*.tsx`, op: '==', value: 0, why: '' },

      { name: 'file trong components/ui đều kebab-case', kind: 'kebab', path: `${SRC}/components/ui`,
        why: 'Tránh bug case-sensitivity khi deploy Linux.' },

      { name: 'Modal.tsx cũ đã xoá', kind: 'absent', path: `${SRC}/components/ui/Modal.tsx`,
        why: 'Thiếu focus trap, Escape, role=dialog, restore focus.' },
      { name: 'Toast.tsx cũ đã xoá', kind: 'absent', path: `${SRC}/components/ui/Toast.tsx`, why: '' },
      { name: 'ToastContainer.tsx cũ đã xoá', kind: 'absent', path: `${SRC}/components/ui/ToastContainer.tsx`, why: '' },
      { name: 'DateInput.tsx cũ đã xoá', kind: 'absent', path: `${SRC}/components/ui/DateInput.tsx`, why: '' },

      { name: 'button.tsx có asChild', kind: 'contains', path: `${SRC}/components/ui/button.tsx`,
        pattern: 'asChild',
        why: 'Điều kiện tiên quyết để sửa 65 chỗ navigate() → <Link>.' },
      { name: 'button.tsx có loading', kind: 'contains', path: `${SRC}/components/ui/button.tsx`, pattern: 'loading', why: '' },
      { name: 'button.tsx có focus-visible ring', kind: 'contains', path: `${SRC}/components/ui/button.tsx`,
        pattern: 'focus-visible:ring', why: '' },

      { name: 'input.tsx có FormField', kind: 'contains', path: `${SRC}/components/ui/input.tsx`,
        pattern: 'FormField',
        why: 'Sinh htmlFor/aria-describedby tự động → 19 label mồ côi không tái diễn.' },
      { name: 'input.tsx dùng useId', kind: 'contains', path: `${SRC}/components/ui/input.tsx`,
        pattern: 'useId', why: 'Nguồn của id — không để caller truyền tay.' },
      { name: 'input.tsx có aria-invalid', kind: 'contains', path: `${SRC}/components/ui/input.tsx`, pattern: 'aria-invalid', why: '' },
      { name: 'input.tsx có aria-describedby', kind: 'contains', path: `${SRC}/components/ui/input.tsx`, pattern: 'aria-describedby', why: '' },
      { name: 'input.tsx dùng border-interactive', kind: 'contains', path: `${SRC}/components/ui/input.tsx`,
        pattern: 'border-border-interactive',
        why: 'Viền input phải 3:1, không dùng border trang trí.' },

      { name: 'dialog.tsx dùng Radix', kind: 'contains', path: `${SRC}/components/ui/dialog.tsx`,
        pattern: '@radix-ui/react-dialog', why: 'Focus trap + Escape + ARIA có sẵn.' },
      { name: 'drawer.tsx dùng dvh không vh', kind: 'contains', path: `${SRC}/components/ui/drawer.tsx`,
        pattern: 'dvh',
        why: '100vh trên mobile Safari làm nút cuối drawer không bấm được.' },
      { name: 'drawer.tsx không dùng h-screen', kind: 'lacks', path: `${SRC}/components/ui/drawer.tsx`,
        pattern: '\\bh-screen\\b', why: '' },

      { name: 'quantity-stepper dùng inputMode numeric', kind: 'contains',
        path: `${SRC}/components/ui/quantity-stepper.tsx`, pattern: 'inputMode="numeric"',
        why: 'type=number có spinner xấu + scroll wheel đổi giá trị.' },
      { name: 'quantity-stepper không dùng type=number', kind: 'lacks',
        path: `${SRC}/components/ui/quantity-stepper.tsx`, pattern: 'type="number"', why: '' },

      { name: 'skeleton.tsx tồn tại', kind: 'exists', path: `${SRC}/components/ui/skeleton.tsx`, why: '' },
      { name: 'empty-state.tsx tồn tại', kind: 'exists', path: `${SRC}/components/ui/empty-state.tsx`, why: '' },
      { name: 'alert.tsx tồn tại', kind: 'exists', path: `${SRC}/components/ui/alert.tsx`, why: '' },
      { name: 'alert.tsx role=alert chỉ cho danger', kind: 'contains', path: `${SRC}/components/ui/alert.tsx`,
        pattern: "role=\\{?[^}]*danger",
        why: 'role=alert ngắt lời screen reader — chỉ dùng cho lỗi.' },

      { name: 'ErrorBoundary tồn tại', kind: 'exists', path: `${SRC}/components/error-boundary.tsx`,
        why: 'Hiện tại 1 lỗi render làm trắng cả app.' },
      { name: 'App.tsx bọc ErrorBoundary', kind: 'contains', path: `${SRC}/App.tsx`, pattern: 'ErrorBoundary', why: '' },
      { name: 'App.tsx không còn ToastContainer cũ', kind: 'lacks', path: `${SRC}/App.tsx`, pattern: 'ToastContainer', why: '' },

      { name: 'barrel export Button/Dialog/FormField', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs ui-barrel',
        why: 'Page cũ phải còn build được nhờ alias @deprecated.' },

      { name: 'git history rename không mất', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs rename-history',
        why: 'Rename 1 bước trên FS case-insensitive → git bỏ qua → CI Linux vỡ.' },
    ],
  },

  /* =================================================================== */
  3: {
    title: 'Layout + Nav (FIX P0)',
    spec: 'docs/ui-redesign/03-layout-navigation.md',
    checks: [
      { name: 'build pass', kind: 'cmd', cmd: 'npm --prefix frontend run build', why: '' },

      { name: 'mobile-nav tồn tại', kind: 'exists', path: `${SRC}/components/bakery/mobile-nav.tsx`,
        why: 'FIX P0 — dưới 1024px hiện không có đường vào /gift-boxes.' },
      { name: 'mobile-nav có trigger lg:hidden', kind: 'contains', path: `${SRC}/components/bakery/mobile-nav.tsx`,
        pattern: 'lg:hidden', why: '' },
      { name: 'mobile-nav dùng Drawer', kind: 'contains', path: `${SRC}/components/bakery/mobile-nav.tsx`,
        pattern: 'Drawer', why: '' },
      { name: 'mobile-nav có aria-current', kind: 'contains', path: `${SRC}/components/bakery/mobile-nav.tsx`,
        pattern: 'aria-current', why: 'Trang hiện tại không được báo chỉ bằng màu.' },
      { name: 'nav tới cả 5 trang', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs nav-routes',
        why: '/, /search, /gift-boxes, /contact, /policies' },

      { name: '0 <a href="/"> nội bộ', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs internal-anchors',
        why: 'Trong SPA gây full page reload → mất giỏ hàng.' },
      { name: '0 href="#menu" (anchor chết)', kind: 'count',
        pattern: 'href="#menu"', glob: `${SRC}/**/*.tsx`, op: '==', value: 0, why: '' },

      { name: '0 max-w-[1440px]', kind: 'count',
        pattern: 'max-w-\\[1440px\\]', glob: `${SRC}/**/*.tsx`, op: '==', value: 0,
        why: '34 chỗ copy-paste → Container. Và 1440px cho dòng text ~180 ký tự.' },
      { name: 'container.tsx tồn tại', kind: 'exists', path: `${SRC}/components/layout/container.tsx`, why: '' },
      { name: 'section.tsx tồn tại', kind: 'exists', path: `${SRC}/components/layout/section.tsx`, why: '' },
      { name: 'product-grid.tsx tồn tại', kind: 'exists', path: `${SRC}/components/layout/product-grid.tsx`, why: '' },
      { name: 'product-grid mobile 2 cột', kind: 'contains', path: `${SRC}/components/layout/product-grid.tsx`,
        pattern: 'grid-cols-2',
        why: 'Sản phẩm ảnh-first cần scan được; 1 cột buộc scroll gấp đôi.' },
      { name: 'product-grid dùng ul', kind: 'contains', path: `${SRC}/components/layout/product-grid.tsx`,
        pattern: '<ul', why: 'Screen reader thông báo "danh sách N mục".' },

      { name: 'skip link tồn tại', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs skip-link',
        why: 'Phải có href=#main-content VÀ main phải có id + tabIndex=-1, thiếu tabIndex là skip link không hoạt động.' },

      { name: 'useRouteAnnouncer tồn tại', kind: 'exists', path: `${SRC}/hooks/useRouteAnnouncer.ts`,
        why: 'Navigate không reset focus/scroll → screen reader không biết đổi trang.' },
      { name: 'App gọi useRouteAnnouncer', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs route-announcer-used', why: '' },

      { name: 'FloatingEmojiOverlay đã xoá', kind: 'absent', path: `${SRC}/components/layout/FloatingEmojiOverlay.tsx`,
        why: 'Motion không tắt được, render cả ở Checkout.' },
      { name: 'ProductDropdown đã xoá', kind: 'absent', path: `${SRC}/components/bakery/ProductDropdown.tsx`,
        why: '319 dòng, fetch limit=1000 mỗi lần hover, chỉ mở được bằng chuột.' },
      { name: 'không còn fetch limit 1000', kind: 'count',
        pattern: 'limit:\\s*1000', glob: `${SRC}/**/*.tsx`, op: '==', value: 0, why: '' },

      { name: 'Footer dùng năm động', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs footer-year',
        why: 'Đang hardcode © 2024.' },

      { name: 'nav landmark có aria-label', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs nav-labels',
        why: 'Nhiều nav trên 1 trang phải phân biệt được.' },

      { name: 'header cao đúng --header-height', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs header-height',
        why: 'Phải khớp scroll-padding-top, không thì anchor bị header che.' },

      { name: 'axe 0 violation (Home, Search, Cart)', kind: 'cmd',
        cmd: 'npm --prefix frontend run test:a11y', why: 'Sàn tự động — không phải trần.' },
    ],
  },

  /* =================================================================== */
  5: {
    title: 'Cart + Checkout (làm TRƯỚC phase 4)',
    spec: 'docs/ui-redesign/05-cart-checkout.md',
    checks: [
      { name: 'build pass', kind: 'cmd', cmd: 'npm --prefix frontend run build', why: '' },

      { name: '0 @mui ngoài admin', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs mui-storefront',
        why: 'CheckoutPage là file storefront duy nhất còn MUI.' },

      { name: 'deliverySlots.ts tồn tại', kind: 'exists', path: `${SRC}/utils/deliverySlots.ts`,
        why: 'Logic giờ giao tách khỏi component để test được.' },
      { name: 'deliverySlots.test.ts tồn tại', kind: 'exists', path: `${SRC}/utils/deliverySlots.test.ts`, why: '' },
      { name: 'unit test deliverySlots pass', kind: 'cmd',
        cmd: 'npm --prefix frontend run test -- --run src/utils/deliverySlots.test.ts', why: '' },
      { name: 'test có case timezone', kind: 'contains', path: `${SRC}/utils/deliverySlots.test.ts`,
        pattern: '(?i)(timezone|America/|Asia/Ho_Chi_Minh)',
        why: 'Bug thật: getMinDeliveryTime dùng giờ máy khách.' },
      { name: 'dùng timezone cửa hàng tường minh', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs store-tz',
        why: 'Phải có Asia/Ho_Chi_Minh + dayjs.tz, không dùng toISOString() trần.' },

      { name: 'giờ cửa hàng KHÔNG hardcode trong page', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs store-hours-config',
        why: 'storeOpenHour = 8 trong component → đổi giờ mở cửa phải deploy FE.' },

      { name: 'CheckoutPage <= 160 dòng', kind: 'maxLoc', path: `${SRC}/pages/CheckoutPage.tsx`, value: 160,
        why: 'Từ 633 dòng. Tách theo spec 05 §5.' },

      { name: 'CartItem là discriminated union', kind: 'contains', path: `${SRC}/types/cart.ts`,
        pattern: "kind:\\s*'(product|giftbox)'",
        why: 'sku.startsWith("GIFTBOX-") làm discriminator là mong manh.' },
      { name: 'không còn GIFTBOX- parsing ngoài migration', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs giftbox-discriminator', why: '' },
      { name: 'validItems.filter đã xoá', kind: 'lacks', path: `${SRC}/pages/CheckoutPage.tsx`,
        pattern: 'validItems',
        why: 'Union làm trạng thái "giỏ không hợp lệ" không biểu diễn được.' },
      { name: 'cart có version + migration', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs cart-migration',
        why: 'Đổi shape mà không migrate → mất giỏ hàng người dùng thật.' },

      { name: 'BUG1: clearCart sau khi payment xong', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs checkout-order',
        why: 'clearCart + toast "thành công" chạy TRƯỚC createMomoQRPayment → đơn trùng.' },
      { name: 'BUG1: navigate dùng replace', kind: 'contains', path: `${SRC}/pages/CheckoutPage.tsx`,
        pattern: 'replace:\\s*true',
        why: 'Back button không được quay lại checkout với giỏ đã trống.' },

      { name: 'BUG2: có Idempotency-Key', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs idempotency',
        why: 'Double submit / network retry tạo đơn trùng.' },
      { name: 'BUG2: backend nhận Idempotency-Key', kind: 'cmd',
        cmd: 'python3 -c "import pathlib,sys; s=pathlib.Path(\'app/routers/orders.py\').read_text(); sys.exit(0 if \'Idempotency\' in s or \'idempotency\' in s else 1)"',
        why: 'FE gửi mà BE không xử lý thì vô nghĩa.' },
      { name: 'BUG2: pytest idempotency', kind: 'cmd',
        cmd: 'python3 -m pytest tests/ -k idempoten -q',
        why: 'Gửi 2 lần cùng key → 1 đơn.' },

      { name: 'BUG3: validation trả lỗi theo field', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs checkout-validation',
        why: 'Early-return 1 lỗi/lần → để trống 4 field phải submit 5 lần.' },
      { name: 'BUG3: validate format SĐT', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs phone-validation',
        why: 'Hiện chỉ check .trim() — nhập "abc" cũng qua, đơn không giao được.' },
      { name: 'BUG3: focus field lỗi đầu tiên', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs error-focus',
        why: 'Trên mobile, submit ở cuối trang mà lỗi hiện ở đầu = trông như không phản hồi.' },

      { name: 'PaymentQR dừng poll khi tab ẩn', kind: 'contains', path: `${SRC}/pages/PaymentQRPage.tsx`,
        pattern: 'visibilitychange|visibilityState', why: '' },
      { name: 'PaymentQR có backoff', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs qr-backoff',
        why: 'Đừng poll 3s trong 15 phút.' },
      { name: 'PaymentQR có phương án nhập tay', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs qr-manual',
        why: 'Screen reader không quét QR được; desktop cũng không quét màn hình mình.' },

      { name: 'stock revalidation ở giỏ', kind: 'exists', path: `${SRC}/hooks/useCartStockCheck.ts`,
        why: 'Bánh perishable có thể hết hàng trong lúc ở giỏ.' },

      { name: 'axe 0 violation (Cart, Checkout)', kind: 'cmd',
        cmd: 'npm --prefix frontend run test:a11y', why: '' },
    ],
  },

  /* =================================================================== */
  4: {
    title: 'Catalog',
    spec: 'docs/ui-redesign/04-catalog-discovery.md',
    checks: [
      { name: 'build pass', kind: 'cmd', cmd: 'npm --prefix frontend run build', why: '' },

      { name: 'B1: FEFO filter ngay_het_han', kind: 'contains', path: 'app/services/fefo.py',
        pattern: 'ngay_het_han\\s*>=',
        why: 'P0 — hiện chỉ filter so_luong_hien_tai > 0, có thể bán lô hết hạn.' },
      { name: 'B1: pytest lô hết hạn (5 case)', kind: 'cmd',
        cmd: 'python3 -m pytest tests/ -k "fefo" -q',
        why: 'Xem docs/backend-tasks.md §1 — 5 case bắt buộc.' },
      { name: 'B1: test từng FAIL trên code cũ', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs fefo-test-history',
        why: 'Test pass ngay trên code cũ = test viết sai. Phải có commit "(failing)".' },

      { name: 'endpoint availability tồn tại', kind: 'contains', path: 'app/routers/products.py',
        pattern: 'availability', why: 'ProductResponse hiện không có field tồn kho nào.' },
      { name: 'pytest availability', kind: 'cmd',
        cmd: 'python3 -m pytest tests/ -k "availab" -q', why: '' },
      { name: 'availability dùng CÙNG điều kiện với FEFO', kind: 'cmd',
        cmd: 'python3 -m pytest tests/ -k "availability_matches_fefo" -q',
        why: 'UI không được hứa số lượng mà allocation không giao được.' },

      { name: 'utils/inventory.ts tồn tại', kind: 'exists', path: `${SRC}/utils/inventory.ts`, why: '' },
      { name: 'ngưỡng low stock dùng max(3,…)', kind: 'contains', path: `${SRC}/utils/inventory.ts`,
        pattern: 'Math\\.max\\(\\s*3',
        why: 'Tín hiệu khan hiếm chỉ được hiện khi nó THẬT. muc_gioi_han_ton là ngưỡng đặt hàng của admin, không phải ngưỡng báo khách.' },
      { name: 'stock-signal.tsx tồn tại', kind: 'exists', path: `${SRC}/components/bakery/stock-signal.tsx`, why: '' },

      { name: 'product-card dùng Link không div onClick', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs product-card',
        why: 'div onClick: không keyboard, không ctrl+click, phải stopPropagation.' },
      { name: 'ảnh sản phẩm có width+height', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs img-dimensions',
        why: 'Không có → grid 12 sản phẩm nhảy 12 lần khi ảnh load.' },
      { name: 'ảnh dùng aspect-ratio không h-64', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs img-aspect',
        why: 'h-64 cố định 256px bất kể chiều rộng card.' },
      { name: 'có lazy loading', kind: 'count', pattern: 'loading="lazy"', glob: `${SRC}/**/*.tsx`, op: '>=', value: 1, why: '' },

      { name: 'getBestSellers không còn dữ liệu giả', kind: 'lacks', path: `${SRC}/services/productService.ts`,
        pattern: '(?i)for now',
        why: 'Đang lấy 3 sản phẩm đầu DB rồi gọi là "Bán chạy nhất".' },

      { name: 'filter state vào URL', kind: 'exists', path: `${SRC}/hooks/useProductFilters.ts`, why: '' },
      { name: 'dùng useSearchParams', kind: 'contains', path: `${SRC}/hooks/useProductFilters.ts`,
        pattern: 'useSearchParams', why: 'Share link + back button + reload.' },
      { name: 'setParams dùng replace (không nhồi history)', kind: 'contains', path: `${SRC}/hooks/useProductFilters.ts`,
        pattern: 'replace:\\s*true',
        why: 'Nếu push thì mỗi ký tự gõ tạo 1 history entry.' },

      { name: 'SearchPage <= 150 dòng', kind: 'maxLoc', path: `${SRC}/pages/SearchPage.tsx`, value: 150,
        why: 'Từ 412 dòng.' },
      { name: 'CategoryListingPage <= 90 dòng', kind: 'maxLoc', path: `${SRC}/pages/CategoryListingPage.tsx`, value: 90,
        why: 'Từ 230. Cùng một trang với Search — dùng ProductListing.' },

      { name: 'axe 0 violation (Home, Search, ProductDetail)', kind: 'cmd',
        cmd: 'npm --prefix frontend run test:a11y', why: '' },
    ],
  },

  /* =================================================================== */
  6: {
    title: 'Account + Orders',
    spec: 'docs/ui-redesign/06-account-orders.md',
    checks: [
      { name: 'build pass', kind: 'cmd', cmd: 'npm --prefix frontend run build', why: '' },

      { name: 'BUG5: ProtectedRoute lưu from', kind: 'contains', path: `${SRC}/components/routing/ProtectedRoute.tsx`,
        pattern: 'state=\\{\\{\\s*from',
        why: 'Khách bấm Thanh toán → login → hạ cánh trang chủ. Rơi ở chỗ đắt nhất của phễu.' },
      { name: 'BUG5: LoginPage không hardcode navigate("/")', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs login-redirect', why: '' },
      { name: 'BUG5: chặn open-redirect', kind: 'exists', path: `${SRC}/utils/safeInternalPath.ts`,
        why: 'Redirect không validate → /login?next=https://evil.com sau khi vừa nhập mật khẩu.' },
      { name: 'BUG5: test safeInternalPath', kind: 'cmd',
        cmd: 'npm --prefix frontend run test -- --run src/utils/safeInternalPath.test.ts', why: '' },

      { name: 'BUG6: autoComplete >= 15 chỗ', kind: 'count',
        pattern: 'autoComplete=', glob: `${SRC}/**/*.tsx`, op: '>=', value: 15, exclude: NO_ADMIN,
        why: 'Hiện 0 chỗ. Password manager không điền được gì, WCAG 1.3.5 fail.' },
      { name: 'BUG6: có new-password ở register', kind: 'contains', path: `${SRC}/pages/RegisterPage.tsx`,
        pattern: 'autoComplete="new-password"',
        why: 'Đây là thứ báo password manager đề xuất tạo mật khẩu mạnh.' },
      { name: 'BUG6: có current-password ở login', kind: 'contains', path: `${SRC}/pages/LoginPage.tsx`,
        pattern: 'autoComplete="current-password"', why: '' },
      { name: 'BUG6: checkout có shipping autoComplete', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs checkout-autocomplete',
        why: 'Gõ tay địa chỉ dài mỗi lần đặt là ma sát lớn nhất trên mobile.' },
      { name: 'BUG6: SĐT có inputMode tel', kind: 'count',
        pattern: 'inputMode="tel"', glob: `${SRC}/**/*.tsx`, op: '>=', value: 2, exclude: NO_ADMIN, why: '' },

      { name: 'lỗi login có role=alert', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs login-alert',
        why: 'Người dùng screen reader gõ sai mật khẩu và KHÔNG nhận phản hồi nào.' },
      { name: 'LoginPage không dùng min-h-screen', kind: 'lacks', path: `${SRC}/pages/LoginPage.tsx`,
        pattern: 'min-h-screen',
        why: 'Bên trong MainLayout đã có header+footer → luôn có scrollbar.' },
      { name: 'LoginPage h1 không phải tên brand', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs login-h1',
        why: 'h1 phải nói trang này làm gì, không lặp lại logo header.' },

      { name: 'UserProfilePage đúng 1 h1', kind: 'cmd', cmd: 'node scripts/gate/probe.mjs single-h1',
        why: 'Hiện h1 ĐỔI theo tab — sai cấu trúc tài liệu.' },
      { name: 'profile dùng Radix Tabs', kind: 'contains', path: `${SRC}/pages/UserProfilePage.tsx`,
        pattern: 'TabsList|@radix-ui/react-tabs',
        why: 'Tab tự viết: không role=tablist, không arrow-key nav.' },
      { name: 'tab state vào URL', kind: 'contains', path: `${SRC}/pages/UserProfilePage.tsx`,
        pattern: 'useSearchParams', why: '' },
      { name: 'UserProfilePage <= 200 dòng', kind: 'maxLoc', path: `${SRC}/pages/UserProfilePage.tsx`, value: 200,
        why: 'Từ 446.' },

      { name: 'password-input.tsx tồn tại', kind: 'exists', path: `${SRC}/components/ui/password-input.tsx`, why: '' },
      { name: 'toggle password có aria-pressed', kind: 'contains', path: `${SRC}/components/ui/password-input.tsx`,
        pattern: 'aria-pressed', why: '' },
      { name: 'password-strength.tsx tồn tại', kind: 'exists', path: `${SRC}/components/ui/password-strength.tsx`, why: '' },
      { name: 'strength meter có text không chỉ màu', kind: 'contains', path: `${SRC}/components/ui/password-strength.tsx`,
        pattern: 'aria-live', why: 'Thanh 4 vạch màu đứng một mình fail WCAG 1.4.1.' },

      { name: 'orderStatus có description', kind: 'contains', path: `${SRC}/constants/orderStatus.ts`,
        pattern: 'description',
        why: 'Khách không biết "Đã xác nhận" là bánh đang làm chưa → gọi điện hỏi.' },

      { name: 'axe 0 violation (Login, Register, Profile, Orders)', kind: 'cmd',
        cmd: 'npm --prefix frontend run test:a11y', why: '' },

      { name: 'GLOBAL: 0 hex storefront', kind: 'cmd', cmd: 'npm --prefix frontend run check:tokens',
        why: 'Chốt cuối storefront.' },
      { name: 'GLOBAL: 0 focus:outline-none', kind: 'cmd', cmd: 'npm --prefix frontend run check:focus', why: '' },
      { name: 'GLOBAL: 0 <a href="/">', kind: 'cmd', cmd: 'npm --prefix frontend run check:links', why: '' },
    ],
  },

  /* =================================================================== */
  '7a': {
    title: 'Admin — CHỨC NĂNG (pagination, sort, bulk, URL state, tách file)',
    spec: 'docs/ui-redesign/09,10,11,13',
    checks: [
      { name: 'build pass', kind: 'cmd', cmd: 'npm --prefix frontend run build', why: '' },

      /* --- backend: điều kiện tiên quyết --- */
      { name: 'BE: Page[T] generic tồn tại', kind: 'contains', path: 'app/schemas.py',
        pattern: 'class Page\\(',
        why: 'Không có total count thì không hiển thị được "Trang 3/24" — chỉ làm được "Tải thêm".' },
      { name: 'BE: batches trả Page[T]', kind: 'contains', path: 'app/routers/batches.py',
        pattern: 'response_model=Page\\[', why: '' },
      { name: 'BE: sort_by là Enum không phải str', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs sort-enum',
        why: 'sort_by: str rồi getattr(Model, sort_by) là SQL injection.' },
      { name: 'BE: có tie-breaker trong order_by', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs order-tiebreaker',
        why: 'Không có → offset pagination cho dòng TRÙNG ở trang này và MẤT ở trang khác.' },
      { name: 'BE: pytest pagination pass', kind: 'cmd',
        cmd: 'python3 -m pytest tests/ -k "pagination or paging" -q',
        why: 'Gồm test 100 dòng cùng ngay_het_han → 4 trang phải cho 100 id duy nhất.' },
      { name: 'BE: GET /products vẫn tương thích ngược', kind: 'cmd',
        cmd: 'python3 -m pytest tests/ -k "not_paginated or backward" -q',
        why: 'Storefront đang dùng GET /products — đổi shape là breaking change.' },
      { name: 'BE: inventory_trace không sort ở Python', kind: 'lacks',
        path: 'app/routers/inventory_trace.py', pattern: 'rows\\.sort\\(',
        why: 'Sort phải ở ORDER BY, không phải sau khi đã cắt trang.' },
      { name: 'BE: batch có model_validator ngày', kind: 'contains', path: 'app/routers/batches.py',
        pattern: 'model_validator',
        why: 'ngay_het_han >= ngay_san_xuat phải validate ở BE, không chỉ form.' },
      { name: 'BE: pytest validate batch pass', kind: 'cmd',
        cmd: 'python3 -m pytest tests/ -k "batch and valid" -q', why: '' },

      /* --- DataTable --- */
      { name: 'DataTable tồn tại', kind: 'exists',
        path: 'frontend/src/components/admin/ui/data-table.tsx', why: '' },
      { name: 'DataTable có caption BẮT BUỘC', kind: 'contains',
        path: 'frontend/src/components/admin/ui/data-table.tsx', pattern: 'caption:\\s*string',
        why: 'caption không optional — để optional thì không ai truyền.' },
      { name: 'DataTable có aria-sort', kind: 'contains',
        path: 'frontend/src/components/admin/ui/data-table.tsx', pattern: 'aria-sort', why: '' },
      { name: 'DataTable có TablePagination', kind: 'contains',
        path: 'frontend/src/components/admin/ui/data-table.tsx', pattern: 'TablePagination', why: '' },
      { name: 'DataTable có TableSortLabel', kind: 'contains',
        path: 'frontend/src/components/admin/ui/data-table.tsx', pattern: 'TableSortLabel', why: '' },
      { name: 'DataTable phân biệt 2 loại empty state', kind: 'contains',
        path: 'frontend/src/components/admin/ui/data-table.tsx', pattern: 'hasActiveFilters',
        why: '"Chưa có dữ liệu" (→ Thêm mới) khác "Không khớp filter" (→ Xoá bộ lọc).' },
      { name: 'DataTable mobile card view dùng dl/dt/dd', kind: 'contains',
        path: 'frontend/src/components/admin/ui/data-table.tsx', pattern: "component=\\{?['\"]dl",
        why: 'Quan hệ nhãn–giá trị là ngữ nghĩa thật; bảng 9 cột scroll ngang trên 375px không dùng được.' },

      { name: 'useDataTableState tồn tại', kind: 'exists',
        path: 'frontend/src/hooks/admin/useDataTableState.ts', why: '' },
      { name: 'state vào URL (useSearchParams)', kind: 'contains',
        path: 'frontend/src/hooks/admin/useDataTableState.ts', pattern: 'useSearchParams', why: '' },
      { name: 'setParams dùng replace (không nhồi history)', kind: 'contains',
        path: 'frontend/src/hooks/admin/useDataTableState.ts', pattern: 'replace:\\s*true',
        why: 'Gõ 10 ký tự vào ô search → 10 history entry.' },
      { name: 'có namespace key cho 2 bảng cùng trang', kind: 'contains',
        path: 'frontend/src/hooks/admin/useDataTableState.ts', pattern: 'key',
        why: 'Không namespace → sort bảng A đổi cả bảng B.' },

      /* --- bỏ fetch-all --- */
      { name: '0 chỗ limit: 1000 / limit: 100', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs no-fetch-all',
        why: 'productService.ts:58 đang fetch 1000 sản phẩm rồi render hết.' },
      { name: '0 sort ở client trong services', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs no-client-sort',
        why: 'preOrderService.ts:114 sort trên tập đã bị cắt — không phải sort thật.' },
      { name: 'các bảng chính đã dùng DataTable', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs tables-migrated',
        why: 'Ưu tiên theo tốc độ tăng dữ liệu: ledger, inventory, sales, batch-trace.' },
      { name: 'KHÔNG có bulk delete trên bảng lô hàng', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs no-bulk-delete-batches',
        why: 'Lô hàng phải audit được — xoá là mất traceability, phá vỡ đúng cái project xây quanh nó.' },
      { name: 'StockLedger read-only', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs ledger-readonly',
        why: 'Sổ nhật ký sửa được thì không còn là audit trail.' },

      /* --- form --- */
      { name: '0 alert() native', kind: 'count', pattern: '[^.a-zA-Z]alert\\(',
        glob: 'frontend/src/{pages,components}/admin/**/*.tsx', op: '==', value: 0,
        why: 'ProductForm.tsx:113,119,162 — chặn luồng, không style được, không nói file bao nhiêu MB.' },
      { name: 'useAdminForm tồn tại', kind: 'exists',
        path: 'frontend/src/hooks/admin/useAdminForm.ts', why: '' },
      { name: 'useUnsavedChanges tồn tại', kind: 'exists',
        path: 'frontend/src/hooks/admin/useUnsavedChanges.ts', why: '' },
      { name: 'guard chặn CẢ điều hướng SPA', kind: 'contains',
        path: 'frontend/src/hooks/admin/useUnsavedChanges.ts', pattern: 'useBlocker',
        why: 'beforeunload KHÔNG bắt được bấm link sidebar — đường xảy ra nhiều nhất trong admin.' },
      { name: 'guard chặn cả đóng tab', kind: 'contains',
        path: 'frontend/src/hooks/admin/useUnsavedChanges.ts', pattern: 'beforeunload', why: '' },
      { name: 'guard được DÙNG ở các form', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs unsaved-guard-used',
        why: 'File tồn tại không đủ — phải được gọi ở AdminBatchCreatePage, ProductForm, VoucherForm.' },
      { name: 'validateBatch tồn tại', kind: 'exists',
        path: 'frontend/src/utils/admin/validateBatch.ts', why: '' },
      { name: 'validateBatch: hết hạn phải sau sản xuất', kind: 'contains',
        path: 'frontend/src/utils/admin/validateBatch.ts', pattern: 'isBefore',
        why: 'Nhập sai ở đây làm hỏng trực tiếp FEFO.' },
      { name: 'validateBatch có cảnh báo mềm', kind: 'contains',
        path: 'frontend/src/utils/admin/validateBatch.ts', pattern: 'validateBatchSoft',
        why: 'Shelf life bất thường / gõ nhầm 10000 — validation cứng không bắt được.' },
      { name: 'unit test validateBatch pass', kind: 'cmd',
        cmd: 'npm --prefix frontend run test -- --run src/utils/admin/validateBatch.test.ts', why: '' },
      { name: 'test có case biên "hết hạn = hôm nay"', kind: 'contains',
        path: 'frontend/src/utils/admin/validateBatch.test.ts', pattern: '(?i)hôm nay|today',
        why: 'Phải CHẤP NHẬN — khớp ngưỡng >= today ở FEFO. Lệch ngưỡng thì form cho nhập mà FEFO không phân bổ được.' },
      { name: 'mọi form có validation theo field', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs forms-validated',
        why: 'Hiện chỉ 1/6 form có. AdminBatchCreatePage 511 dòng có 0.' },

      /* --- tách file --- */
      { name: 'AdminDashboardPage <= 200 dòng', kind: 'maxLoc',
        path: 'frontend/src/pages/admin/AdminDashboardPage.tsx', value: 200, why: 'Từ 964.' },
      { name: 'AdminGiftBoxPage <= 250 dòng', kind: 'maxLoc',
        path: 'frontend/src/pages/admin/AdminGiftBoxPage.tsx', value: 250, why: 'Từ 810.' },
      { name: 'AdminInventoryPage <= 150 dòng', kind: 'maxLoc',
        path: 'frontend/src/pages/admin/AdminInventoryPage.tsx', value: 150, why: 'Từ 467.' },
      { name: 'AdminAlertsPage <= 250 dòng', kind: 'maxLoc',
        path: 'frontend/src/pages/admin/AdminAlertsPage.tsx', value: 250, why: 'Từ 506.' },
      { name: 'AdminBatchCreatePage <= 220 dòng', kind: 'maxLoc',
        path: 'frontend/src/pages/admin/AdminBatchCreatePage.tsx', value: 220, why: 'Từ 511.' },
      { name: 'StatCard 1 định nghĩa dùng 4 lần', kind: 'exists',
        path: 'frontend/src/components/admin/dashboard/stat-card.tsx',
        why: '240 dòng lặp cho 4 con số.' },
      { name: 'dashboard: state theo từng widget', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs dashboard-independent-state',
        why: 'Promise.all + 1 state loading → 1 request fail làm trắng cả dashboard.' },

      /* --- layout / nav --- */
      { name: 'admin nav dùng <Link> không navigate()', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs admin-nav-link',
        why: 'Ops tool: mở nhiều tab là hành vi hàng ngày. Không ctrl+click được là ma sát thật.' },
      { name: 'sidebar collapse không dùng hover', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs sidebar-no-hover',
        why: 'AdminLayout.tsx:74 — chuột đi ngang là bung ra đè nội dung, bàn phím không mở được.' },
      { name: 'sidebar state bền qua reload', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs sidebar-persist',
        why: 'Ops tool: trạng thái UI phải bền.' },
      { name: 'admin nav được nhóm', kind: 'exists',
        path: 'frontend/src/config/admin-nav.ts',
        why: '11 item phẳng vượt ngưỡng scan nhanh; 5 item về kho rải rác.' },
      { name: 'không còn nhãn nav tiếng Anh', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs nav-vietnamese',
        why: '"Batch trace" lẫn giữa 10 nhãn tiếng Việt.' },
      { name: 'AdminPage có breadcrumb + 1 h1', kind: 'exists',
        path: 'frontend/src/components/admin/ui/admin-page.tsx', why: '' },

      /* --- shortcut --- */
      { name: 'useAdminShortcuts tồn tại', kind: 'exists',
        path: 'frontend/src/hooks/admin/useAdminShortcuts.ts', why: '' },
      { name: 'shortcut KHÔNG bắt phím trong input', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs shortcut-guard',
        why: 'Không có check này thì gõ "n" vào ô tìm kiếm sẽ mở form tạo mới — lỗi phổ biến nhất.' },

      { name: 'axe 0 violation trên trang admin', kind: 'cmd',
        cmd: 'npm --prefix frontend run test:a11y', why: '' },
    ],
  },

  /* =================================================================== */
  '7b': {
    title: 'Admin — VISUAL (MUI theme, xoá 593 sx + 471 hex)',
    spec: 'docs/ui-redesign/12 + 13 §6,§7',
    checks: [
      { name: 'build pass', kind: 'cmd', cmd: 'npm --prefix frontend run build', why: '' },
      { name: 'gate 7a vẫn PASS', kind: 'cmd', cmd: 'node scripts/gate/run.mjs 7a',
        why: 'Không được hồi quy chức năng khi làm visual.' },

      { name: 'admin-tokens.ts tồn tại', kind: 'exists',
        path: 'frontend/src/theme/admin-tokens.ts', why: '' },
      { name: 'test đồng bộ token với tokens.css', kind: 'cmd',
        cmd: 'npm --prefix frontend run test -- --run src/theme/admin-tokens.test.ts',
        why: 'Guardrail thật chống lệch, không phải comment "nhớ sync tay".' },
      { name: 'createTheme tồn tại', kind: 'contains',
        path: 'frontend/src/theme/admin-theme.ts', pattern: 'createTheme', why: '' },
      { name: 'button không UPPERCASE', kind: 'contains',
        path: 'frontend/src/theme/admin-theme.ts', pattern: "textTransform:\\s*'none'",
        why: 'ALL CAPS đọc chậm hơn ~10%, và tiếng Việt có dấu thì ALL CAPS trông tệ.' },
      { name: 'locale viVN', kind: 'contains',
        path: 'frontend/src/theme/admin-theme.ts', pattern: 'viVN',
        why: 'aria-label mặc định của MUI phải tiếng Việt.' },
      { name: 'styleOverrides cho MuiTableCell', kind: 'contains',
        path: 'frontend/src/theme/admin-components.ts', pattern: 'MuiTableCell',
        why: '204 TableCell + 40 TableRow = 41% của 593 sx.' },
      { name: 'input 16px (chống iOS auto-zoom)', kind: 'contains',
        path: 'frontend/src/theme/admin-components.ts', pattern: "fontSize:\\s*'1rem'",
        why: 'Dưới 16px iOS Safari TỰ ZOOM khi focus. Xảy ra thật với kịch bản kiểm kho bằng điện thoại.' },
      { name: 'viền input dùng sand500 (3.32:1)', kind: 'contains',
        path: 'frontend/src/theme/admin-components.ts', pattern: 'sand500',
        why: 'WCAG 1.4.11 cho viền input.' },
      { name: 'ThemeProvider bọc admin', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs admin-theme-provider', why: '' },
      { name: 'enableCssLayer (Tailwind thắng MUI)', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs css-layer',
        why: 'Giải quyết lo ngại specificity war ở spec 00 §2.1 mà không cần !important.' },
      { name: 'CssBaseline CHỈ trong admin', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs cssbaseline-scoped',
        why: 'Bọc toàn app sẽ đụng Tailwind preflight và làm storefront lệch.' },

      { name: 'sx < 60 (từ 593)', kind: 'count', pattern: 'sx=\\{\\{',
        glob: 'frontend/src/{pages,components,layout}/admin/**/*.tsx', op: '<', value: 60,
        why: 'Object literal mới mỗi render × 5.400 cell — nguyên nhân thật của "admin chậm".' },
      { name: '0 hex trong admin (từ 471)', kind: 'count', pattern: '#[0-9a-fA-F]{6}',
        glob: 'frontend/src/{pages,components,layout}/admin/**/*.tsx', op: '==', value: 0, why: '' },
      { name: '0 legacy-* còn lại', kind: 'count', pattern: 'legacy-',
        glob: 'frontend/src/**/*.tsx', op: '==', value: 0, why: '' },
      { name: 'legacy đã xoá khỏi tailwind.config', kind: 'lacks',
        path: 'frontend/tailwind.config.js', pattern: 'legacy', why: '' },

      { name: 'chart-colors.ts tồn tại', kind: 'exists',
        path: 'frontend/src/theme/chart-colors.ts', why: '' },
      { name: 'chart: mọi cặp màu chênh >= 0.10', kind: 'cmd',
        cmd: 'python3 docs/chart-contrast-check.py',
        why: 'Palette cũ có #F7B4B8 / #F5C96A chênh 0.063 — mù màu và in đen trắng không phân biệt được.' },
      { name: 'chart không dùng COLORS hex cũ', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs chart-colors-used', why: '' },
      { name: 'chart có bảng dữ liệu tương đương', kind: 'cmd',
        cmd: 'node scripts/gate/probe.mjs chart-data-table',
        why: 'Recharts render SVG mà screen reader không đọc được.' },

      { name: 'storefront: contrast vẫn PASS', kind: 'cmd', cmd: 'python3 docs/contrast-check.py', why: '' },
      { name: 'storefront: gate phase 6 vẫn PASS', kind: 'cmd', cmd: 'node scripts/gate/run.mjs 6',
        why: 'Không được hồi quy storefront.' },
      { name: 'axe 0 violation trên trang admin', kind: 'cmd',
        cmd: 'npm --prefix frontend run test:a11y', why: '' },
    ],
  },
}

export const PHASE_ORDER = [0, 1, 2, 3, 5, 4, 6, '7a', '7b']
