#!/usr/bin/env node
/**
 * Probe dispatcher — các check cần logic phức tạp hơn grep một dòng.
 *
 * Usage: node scripts/gate/probe.mjs <name> [args...]
 * Exit 0 = PASS, exit 1 = FAIL (in lý do ra stdout).
 *
 * Agent KHÔNG được sửa file này (CLAUDE.md §1.1).
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'node:fs'
import { glob } from './fsutil.mjs'

const SRC = 'frontend/src'
const args = process.argv.slice(3)
const name = process.argv[2]

const fail = (msg) => { console.log(msg); process.exit(1) }
const pass = (msg) => { if (msg) console.log(msg); process.exit(0) }
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : null)
const need = (p) => read(p) ?? fail(`File không tồn tại: ${p}`)

const tsx = (opts = {}) => {
  const all = glob(`${SRC}/**/*.tsx`).map((f) => f.replace(/\\/g, '/'))
  if (opts.noAdmin) return all.filter((f) => !f.includes('/admin/'))
  if (opts.adminOnly) return all.filter((f) => f.includes('/admin/'))
  return all
}

/** Tìm regex trong nhiều file, trả [{file,line,text}] */
const find = (files, re) => {
  const out = []
  for (const f of files) {
    readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      if (re.test(l)) out.push({ file: f, line: i + 1, text: l.trim().slice(0, 100) })
    })
  }
  return out
}

/**
 * Tìm regex TRÊN TOÀN BỘ nội dung file (không phải từng dòng).
 * BẮT BUỘC dùng cho mọi pattern có thể trải nhiều dòng — JSX thường xuống dòng
 * giữa tên thẻ và attribute:
 *     <a
 *       href="/contact"
 * find() theo từng dòng sẽ BỎ SÓT trường hợp này (đã từng là false negative thật).
 */
const findMulti = (files, re) => {
  const out = []
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  for (const f of files) {
    const s = readFileSync(f, 'utf8')
    for (const m of s.matchAll(g)) {
      out.push({
        file: f,
        line: s.slice(0, m.index).split('\n').length,
        text: m[0].replace(/\s+/g, ' ').trim().slice(0, 100),
      })
    }
  }
  return out
}

const show = (hits, n = 10) => hits.slice(0, n).map((h) => `    ${h.file}:${h.line}  ${h.text}`).join('\n')
  + (hits.length > n ? `\n    … và ${hits.length - n} chỗ nữa` : '')

const sh = (cmd) => {
  try { return { ok: true, out: execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } }
  catch (e) { return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` } }
}

const DEFAULT_PALETTE =
  /\b(?:bg|text|border|ring|from|to|via|divide|outline|decoration|shadow|accent|caret|fill|stroke|placeholder)-(?:slate|gray|grey|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|[1-9]00|950)\b/

/* ================================================================== */

const PROBES = {

  /* ---------------- phase 0 ---------------- */

  'eslint-mui': () => {
    // Phải chặn ở storefront VÀ cho phép ở admin. Kiểm bằng cách tạo file thử.
    const sf = `${SRC}/__gate_probe_storefront.tsx`
    const ad = `${SRC}/pages/admin/__gate_probe_admin.tsx`
    const body = `import Button from '@mui/material/Button'\nexport default function P(){return <Button/>}\n`
    let sfBlocked = false, adAllowed = false
    try {
      writeFileSync(sf, body)
      sfBlocked = !sh(`npx --prefix frontend eslint ${sf}`).ok
      writeFileSync(ad, body)
      adAllowed = sh(`npx --prefix frontend eslint ${ad}`).ok
    } finally {
      for (const f of [sf, ad]) { try { unlinkSync(f) } catch {} }
    }
    if (!sfBlocked) fail('ESLint KHÔNG chặn import @mui ở storefront. Thêm no-restricted-imports (spec 00 §2.5).')
    if (!adAllowed) fail('ESLint chặn cả admin. Cần override cho src/pages/admin, src/components/admin, src/layout/admin.')
    pass('chặn storefront, cho phép admin')
  },

  /* ---------------- phase 1 ---------------- */

  'tailwind-override': () => {
    const p = ['frontend/tailwind.config.js', 'frontend/tailwind.config.ts', 'frontend/tailwind.config.mjs']
      .find(existsSync) ?? fail('Không tìm thấy tailwind.config.*')
    const s = readFileSync(p, 'utf8')
    // colors phải ở tầng theme, KHÔNG ở trong extend
    const extendBlock = s.match(/extend\s*:\s*\{[\s\S]*?\n\s{4}\}/)?.[0] ?? ''
    if (/\bcolors\s*:/.test(extendBlock))
      fail(`${p}: \`colors\` nằm trong \`extend\` → bg-blue-500 vẫn hợp lệ, mất guardrail.\n`
         + `Spec 01 §6: phải GHI ĐÈ theme.colors.`)
    if (!/theme\s*:\s*\{[\s\S]*?\n\s{4}colors\s*:/.test(s))
      fail(`${p}: không tìm thấy \`colors\` ở tầng theme (ngoài extend).`)
    // Palette mặc định không được khai báo lại
    if (/\b(slate|zinc|stone)\s*:\s*\{/.test(s))
      fail(`${p}: đang khai báo lại palette mặc định của Tailwind. Chỉ dùng token semantic + legacy-*.`)
    pass()
  },

  'legacy-colors': () => {
    const failOn = args[args.indexOf('--fail-on') + 1]
    const sfHits = find(tsx({ noAdmin: true }), DEFAULT_PALETTE)
    const adHits = find(tsx({ adminOnly: true }), DEFAULT_PALETTE)
    if (failOn === 'storefront') {
      if (sfHits.length) fail(`${sfHits.length} chỗ dùng màu Tailwind mặc định ở STOREFRONT:\n${show(sfHits)}\n`
        + `  → đổi sang token semantic. legacy-* CHỈ dành cho admin.`)
      if (adHits.length) console.log(`  (ghi chú: admin còn ${adHits.length} chỗ — sẽ dọn ở phase 7)`)
      pass()
    }
    // chế độ liệt kê
    console.log(`STOREFRONT: ${sfHits.length}\n${show(sfHits, 50)}`)
    console.log(`\nADMIN: ${adHits.length}\n${show(adHits, 50)}`)
    pass()
  },

  'legacy-scope': () => {
    const hits = find(tsx({ noAdmin: true }), /\blegacy-/)
    if (hits.length) fail(`legacy-* lọt vào storefront (${hits.length} chỗ) — đó là né guardrail:\n${show(hits)}`)
    pass()
  },

  /* ---------------- phase 2 ---------------- */

  'ui-barrel': () => {
    const s = need(`${SRC}/components/ui/index.ts`)
    const required = ['Button', 'Input', 'FormField', 'Label', 'Card', 'Badge',
                      'Dialog', 'DialogContent', 'DialogTitle', 'Drawer', 'AlertDialog',
                      'Alert', 'Skeleton', 'EmptyState', 'Spinner', 'QuantityStepper']
    const missing = required.filter((r) => !new RegExp(`\\b${r}\\b`).test(s))
    if (missing.length) fail(`ui/index.ts thiếu export: ${missing.join(', ')}`)
    // alias tương thích ngược để page cũ còn build
    const aliases = ['LoadingSpinner', 'ErrorMessage', 'PriceDisplay', 'Modal', 'ConfirmDialog']
    const missAlias = aliases.filter((a) => !new RegExp(`as\\s+${a}\\b`).test(s))
    if (missAlias.length) fail(`Thiếu alias @deprecated: ${missAlias.join(', ')}\n`
      + `  → không có alias thì page cũ vỡ build, phải sửa hết trong 1 phase (spec 02 §2).`)
    if (!/@deprecated/.test(s)) fail('Alias phải đánh dấu @deprecated để biết cần xoá ở phase 8.')
    pass(`${required.length} export + ${aliases.length} alias`)
  },

  'rename-history': () => {
    // Trên FS case-insensitive, rename 1 bước bị git bỏ qua → CI Linux vỡ.
    const r = sh('git log --diff-filter=R --name-status --oneline -- frontend/src/components/ui')
    if (!r.ok) fail('Không đọc được git log.')
    const renames = (r.out.match(/^R\d*\s+\S+\s+\S+$/gm) ?? [])
    if (renames.length === 0)
      fail('Git không ghi nhận rename nào trong components/ui.\n'
         + '  Nếu bạn đã rename sang kebab-case mà git không thấy → bạn rename 1 bước trên FS\n'
         + '  case-insensitive. Làm lại 2 bước (CLAUDE.md §3.2), không thì CI Linux vỡ.')
    pass(`${renames.length} rename được git ghi nhận`)
  },

  /* ---------------- phase 3 ---------------- */

  'nav-routes': () => {
    const files = [`${SRC}/components/bakery/mobile-nav.tsx`, `${SRC}/config/navigation.ts`]
      .filter(existsSync)
    if (!files.length) fail('Không tìm thấy mobile-nav.tsx hoặc config/navigation.ts')
    const s = files.map((f) => readFileSync(f, 'utf8')).join('\n')
    const routes = ['/', '/search', '/gift-boxes', '/contact', '/policies']
    const missing = routes.filter((r) => !new RegExp(`["'\`]${r.replace('/', '\\/')}["'\`]`).test(s))
    if (missing.length) fail(`Mobile nav thiếu đường vào: ${missing.join(', ')}\n`
      + `  → đây chính là bug P0. /gift-boxes là feature khác biệt của sản phẩm.`)
    pass('5/5 trang tới được')
  },

  'internal-anchors': () => {
    const hits = findMulti(tsx(), /<a\b[\s\S]{0,400}?href=["']\/(?!\/)[^"']*["']/)
    if (hits.length) fail(`${hits.length} chỗ <a href="/..."> nội bộ (gây full page reload, mất giỏ hàng):\n${show(hits)}\n`
      + `  → dùng <Link to="...">`)
    pass()
  },

  'skip-link': () => {
    const layouts = glob(`${SRC}/**/{main-layout,MainLayout}.tsx`, { nodir: true })
    if (!layouts.length) fail('Không tìm thấy main-layout.tsx')
    const s = layouts.map((f) => readFileSync(f, 'utf8')).join('\n')
    if (!/href=["']#main-content["']/.test(s)) fail('Thiếu skip link href="#main-content".')
    if (!/id=["']main-content["']/.test(s)) fail('Thiếu id="main-content" trên <main>.')
    if (!/tabIndex=\{-1\}/.test(s))
      fail('<main> thiếu tabIndex={-1}.\n'
         + '  Không có nó, click skip link chỉ đổi URL hash mà focus vẫn ở skip link\n'
         + '  → người dùng bàn phím tiếp tục Tab vào header. Skip link coi như không hoạt động.')
    pass()
  },

  'route-announcer-used': () => {
    const s = [`${SRC}/App.tsx`, ...glob(`${SRC}/**/main-layout.tsx`)]
      .filter(existsSync).map((f) => readFileSync(f, 'utf8')).join('\n')
    if (!/useRouteAnnouncer\s*\(/.test(s))
      fail('useRouteAnnouncer đã tạo nhưng chưa được GỌI ở App/MainLayout. File tồn tại không đủ.')
    pass()
  },

  'footer-year': () => {
    const f = glob(`${SRC}/components/bakery/{footer,Footer}.tsx`, { nodir: true })[0]
      ?? fail('Không tìm thấy footer')
    const s = readFileSync(f, 'utf8')
    if (/©\s*20\d\d/.test(s) && !/getFullYear/.test(s))
      fail(`${f}: copyright hardcode năm. Dùng {new Date().getFullYear()}.`)
    if (!/getFullYear/.test(s)) fail(`${f}: không thấy getFullYear.`)
    pass()
  },

  'nav-labels': () => {
    const hits = findMulti(tsx({ noAdmin: true }), /<nav\b[\s\S]{0,300}?>/)
    const bad = hits.filter((h) => !/aria-label/.test(h.text))
    const reallyBad = bad
    if (reallyBad.length) fail(`<nav> thiếu aria-label (${reallyBad.length} chỗ) — nhiều nav trên 1 trang phải phân biệt được:\n${show(reallyBad)}`)
    if (hits.length === 0) fail('Không tìm thấy <nav> nào ở storefront.')
    pass(`${hits.length} nav, đều có aria-label`)
  },

  'header-height': () => {
    const f = glob(`${SRC}/components/bakery/{header,Header}.tsx`, { nodir: true })[0]
      ?? fail('Không tìm thấy header')
    const s = readFileSync(f, 'utf8')
    if (!/\bh-16\b|--header-height/.test(s))
      fail(`${f}: header phải cao đúng --header-height (h-16 = 64px).\n`
         + `  Không khớp → scroll-padding-top sai → anchor link bị header che.`)
    const css = read(`${SRC}/index.css`) ?? ''
    if (!/scroll-padding-top/.test(css)) fail('index.css thiếu scroll-padding-top: var(--header-height).')
    pass()
  },

  /* ---------------- phase 5 ---------------- */

  'mui-storefront': () => {
    const hits = find(tsx({ noAdmin: true }), /@mui\//)
    if (hits.length) fail(`Còn ${hits.length} chỗ import @mui ở storefront:\n${show(hits)}`)
    pass()
  },

  'store-tz': () => {
    const s = [`${SRC}/utils/deliverySlots.ts`, `${SRC}/pages/CheckoutPage.tsx`,
               ...glob(`${SRC}/components/checkout/*.tsx`),
               ...glob(`${SRC}/hooks/useStoreHours.ts`)]
      .filter(existsSync).map((f) => readFileSync(f, 'utf8')).join('\n')
    if (!/Asia\/Ho_Chi_Minh/.test(s))
      fail('Không thấy timezone cửa hàng tường minh (Asia/Ho_Chi_Minh).\n'
         + '  Bug thật: getMinDeliveryTime dùng dayjs() = giờ MÁY KHÁCH.\n'
         + '  Khách ở nước ngoài đặt bánh giao Sài Gòn sẽ lệch giờ.')
    if (!/dayjs\.tz\(|\.tz\(/.test(s)) fail('Thiếu dayjs.tz() — phải build thời gian theo timezone cửa hàng.')
    pass()
  },

  'store-hours-config': () => {
    const pages = [`${SRC}/pages/CheckoutPage.tsx`, ...glob(`${SRC}/components/checkout/*.tsx`)]
      .filter(existsSync)
    const hits = find(pages, /store(Open|Close)Hour\s*=\s*\d+|=\s*8\s*\/\/.*(giờ|hour)/i)
    if (hits.length) fail(`Giờ cửa hàng vẫn hardcode trong component:\n${show(hits)}\n`
      + `  → chuyển sang config/backend (GET /store/config) để admin đổi được mà không deploy FE.`)
    if (!existsSync(`${SRC}/hooks/useStoreHours.ts`) && !existsSync(`${SRC}/config/store.ts`))
      fail('Thiếu useStoreHours.ts hoặc config/store.ts.')
    pass()
  },

  'checkout-order': () => {
    const raw = need(`${SRC}/pages/CheckoutPage.tsx`)
      + glob(`${SRC}/hooks/useCheckoutForm.ts`).map((f) => readFileSync(f, 'utf8')).join('\n')
    // Bỏ dòng import — nếu không, `import { createMomoQRPayment }` ở đầu file
    // sẽ khớp trước call site và làm so sánh vị trí sai hoàn toàn.
    // (đây từng là false negative thật khi test harness)
    const s = raw.split('\n').filter((l) => !/^\s*import\b/.test(l)).join('\n')

    const iClear = s.search(/clearCart\s*\(/)
    const iPay = s.search(/\bawait\s+createMomoQRPayment|createMomoQRPayment\s*\(/)
    if (iPay === -1) pass('không dùng momo QR ở file này')
    if (iClear !== -1 && iClear < iPay)
      fail('BUG1 CHƯA FIX: clearCart() vẫn chạy TRƯỚC createMomoQRPayment().\n'
         + '  Payment fail → giỏ đã xoá + toast "thành công" + đơn đã tồn tại mà khách không biết\n'
         + '  → submit lại → ĐƠN TRÙNG. Xem spec 05 §2 Bug 1.')
    const iToast = s.search(/showSuccess\s*\(|toast\s*\(\s*\{[^}]*success/)
    if (iToast !== -1 && iToast < iPay)
      fail('BUG1 CHƯA FIX: toast "thành công" chạy TRƯỚC createMomoQRPayment().')
    if (!/catch/.test(s.slice(iPay, iPay + 800)))
      fail('createMomoQRPayment không có try/catch riêng.\n'
         + '  Payment fail thì đơn ĐÃ tạo — phải điều hướng tới trang đơn hàng với thông báo,\n'
         + '  không được để người dùng ở lại checkout tưởng là chưa đặt.')
    pass()
  },

  'idempotency': () => {
    const s = [`${SRC}/pages/CheckoutPage.tsx`, `${SRC}/services/orderService.ts`, `${SRC}/services/api.ts`,
               ...glob(`${SRC}/hooks/useCheckoutForm.ts`)]
      .filter(existsSync).map((f) => readFileSync(f, 'utf8')).join('\n')
    if (!/idempotency/i.test(s)) fail('Không thấy Idempotency-Key ở frontend (spec 05 §2 Bug 2).')
    if (!/randomUUID|uuid|nanoid/.test(s)) fail('Không thấy nơi sinh key. Dùng crypto.randomUUID().')
    if (!/useMemo|useRef/.test(s))
      fail('Key phải sinh MỘT LẦN (useMemo/useRef). Sinh mới mỗi lần submit thì vô nghĩa.')
    pass()
  },

  'checkout-validation': () => {
    const files = [`${SRC}/pages/CheckoutPage.tsx`, ...glob(`${SRC}/hooks/useCheckoutForm.ts`)]
      .filter(existsSync)
    const s = files.map((f) => readFileSync(f, 'utf8')).join('\n')
    // early return 1 lỗi/lần: setError('...') ngay sau if rồi return
    const early = find(files, /setError\((['"`]).*(Vui lòng|vui lòng).*\1\s*\)/)
    if (early.length >= 2)
      fail(`BUG3 CHƯA FIX: còn ${early.length} chỗ setError(string) kiểu early-return:\n${show(early)}\n`
         + `  → trả object lỗi theo field, dùng FormField (spec 05 §2 Bug 3).`)
    if (!/FieldErrors|fieldErrors|setFieldErrors/.test(s))
      fail('Không thấy state lỗi theo field. Cần FieldErrors object.')
    if (!/FormField/.test(s + glob(`${SRC}/components/checkout/*.tsx`)
        .map((f) => readFileSync(f, 'utf8')).join('\n')))
      fail('Form checkout chưa dùng FormField (spec 02 §4) → lỗi không gắn được với field.')
    pass()
  },

  'phone-validation': () => {
    const s = [...glob(`${SRC}/{hooks,utils}/*.ts`, { nodir: true }),
               `${SRC}/pages/CheckoutPage.tsx`,
               ...glob(`${SRC}/components/checkout/*.tsx`)]
      .filter(existsSync).map((f) => readFileSync(f, 'utf8')).join('\n')
    if (!/\(0\|\\\+84\)|0\|\+84|\^0\[35789\]|\\d\{8\}/.test(s))
      fail('Không thấy regex validate SĐT Việt Nam.\n'
         + '  Hiện chỉ check .trim() — nhập "abc" cũng qua, đơn không giao được.\n'
         + '  Gợi ý: /^(0|\\+84)(3|5|7|8|9)\\d{8}$/')
    pass()
  },

  'error-focus': () => {
    const s = [`${SRC}/pages/CheckoutPage.tsx`, ...glob(`${SRC}/hooks/useCheckoutForm.ts`)]
      .filter(existsSync).map((f) => readFileSync(f, 'utf8')).join('\n')
    if (!/\.focus\(\)/.test(s))
      fail('Submit có lỗi phải focus vào field lỗi ĐẦU TIÊN (WCAG 3.3.1).\n'
         + '  Trên mobile, submit ở cuối trang mà lỗi hiện ở đầu = trông như không phản hồi.')
    pass()
  },

  'giftbox-discriminator': () => {
    const hits = find(tsx({ noAdmin: true }).concat(glob(`${SRC}/**/*.ts`)
      .map((f) => f.replace(/\\/g, '/')).filter((f) => !f.includes('/admin/'))),
      /startsWith\(['"]GIFTBOX-/)
    const outsideMigration = hits.filter((h) => !/migrat/i.test(h.file) && !/migrat/i.test(h.text))
    if (outsideMigration.length)
      fail(`Còn ${outsideMigration.length} chỗ dùng sku.startsWith('GIFTBOX-') làm discriminator:\n${show(outsideMigration)}\n`
         + `  → dùng discriminated union item.kind (spec 05 §6). Chỉ được còn trong hàm migration v1→v2.`)
    pass()
  },

  'cart-migration': () => {
    const s = need(`${SRC}/contexts/CartContext.tsx`)
    if (!/CART_VERSION|cartVersion|version/i.test(s))
      fail('CartItem đổi shape mà không có version + migration → mất giỏ hàng người dùng thật.\n'
         + '  Thêm CART_VERSION + migrateCart() (spec 05 §6).')
    if (!/try\s*\{[\s\S]{0,400}(JSON\.parse|migrate)/.test(s))
      fail('Migration phải bọc try/catch. Parse fail thì giỏ trống, KHÔNG được crash app.')
    pass()
  },

  'qr-backoff': () => {
    const s = need(`${SRC}/pages/PaymentQRPage.tsx`)
    if (!/setTimeout/.test(s))
      fail('Dùng setTimeout đệ quy để có backoff, không phải setInterval cố định.')
    if (!/(3_?000|3000)[\s\S]{0,200}(10_?000|10000)|elapsed|Date\.now\(\)/.test(s))
      fail('Không thấy logic backoff (3s trong 1 phút đầu → 10s sau đó).\n'
         + '  Poll 3s liên tục trong 15 phút là lãng phí và dễ bị rate limit.')
    pass()
  },

  'qr-manual': () => {
    const s = need(`${SRC}/pages/PaymentQRPage.tsx`)
    const missing = []
    if (!/CopyButton|navigator\.clipboard/.test(s)) missing.push('nút copy')
    if (!/(số tiền|amount)/i.test(s)) missing.push('số tiền')
    if (!/(nội dung|ma_don|orderCode|mã đơn)/i.test(s)) missing.push('nội dung chuyển khoản')
    if (missing.length)
      fail(`Thiếu phương án nhập tay: ${missing.join(', ')}\n`
         + `  Screen reader không quét được QR. Người dùng desktop cũng không quét màn hình mình được.`)
    pass()
  },

  /* ---------------- phase 4 ---------------- */

  'fefo-test-history': () => {
    // Test phải từng FAIL trên code cũ → phải có commit riêng cho test, trước commit sửa fefo.py
    const t = sh('git log --oneline --diff-filter=A -- tests/ | grep -i fefo')
    const testCommit = sh('git log --format=%H --reverse -- "tests/*fefo*"').out.trim().split('\n')[0]
    const srcCommit = sh('git log --format=%H --reverse -- app/services/fefo.py').out.trim().split('\n').pop()
    if (!testCommit) fail('Không tìm thấy commit nào thêm test FEFO. Xem CLAUDE.md §6.1: test TRƯỚC, sửa SAU.')
    const order = sh(`git rev-list --count ${testCommit}..HEAD`)
    const msgs = sh('git log --format=%s -- "tests/*fefo*"').out
    if (!/failing/i.test(msgs))
      fail('Không có commit test nào ghi "(failing)".\n'
         + '  CLAUDE.md §6.1: phải commit test ở trạng thái FAIL trước, chứng minh test thật sự bắt được bug.\n'
         + '  Test pass ngay trên code cũ = test viết sai.')
    pass()
  },

  'product-card': () => {
    const f = glob(`${SRC}/components/bakery/{product-card,ProductCard}.tsx`, { nodir: true })[0]
      ?? fail('Không tìm thấy product-card')
    const s = readFileSync(f, 'utf8')
    if (/<Card[^>]*onClick=/.test(s))
      fail(`${f}: vẫn dùng <Card onClick>.\n`
         + `  div onClick: không focus được bằng bàn phím (WCAG 2.1.1), không ctrl+click,\n`
         + `  và buộc stopPropagation cho nút con. Dùng stretched-link (spec 02 §6.1).`)
    if (!/<Link\b/.test(s)) fail(`${f}: phải dùng <Link> làm vùng click chính.`)
    if (!/after:absolute|after:inset-0/.test(s))
      fail(`${f}: thiếu stretched-link (after:absolute after:inset-0) → cả card không bấm được.`)
    if (/stopPropagation/.test(s))
      fail(`${f}: còn stopPropagation. Với stretched-link, nút phụ chỉ cần relative z-sticky.`)
    pass()
  },

  'img-dimensions': () => {
    const files = tsx({ noAdmin: true })
    const imgs = []
    for (const f of files) {
      const s = readFileSync(f, 'utf8')
      for (const m of s.matchAll(/<img\b[\s\S]{0,600}?\/>/g)) {
        const tag = m[0]
        if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) {
          const line = s.slice(0, m.index).split('\n').length
          imgs.push({ file: f, line, text: tag.replace(/\s+/g, ' ').slice(0, 90) })
        }
      }
    }
    if (imgs.length) fail(`${imgs.length} <img> thiếu width/height:\n${show(imgs)}\n`
      + `  → browser không reserve chỗ → grid 12 sản phẩm nhảy 12 lần khi ảnh load (CLS).`)
    pass()
  },

  'img-aspect': () => {
    const hits = findMulti(tsx({ noAdmin: true }), /<img\b[\s\S]{0,600}?\bh-(?:48|56|64|72|80|96)\b/)
    if (hits.length) fail(`${hits.length} chỗ ảnh dùng chiều cao cố định:\n${show(hits)}\n`
      + `  → h-64 = 256px bất kể chiều rộng card. Ở mobile 2 cột (card ~166px) ảnh bị crop lệch tỉ lệ.\n`
      + `  Dùng aspect-product / aspect-hero (spec 01 §6).`)
    pass()
  },

  /* ---------------- phase 6 ---------------- */

  'login-redirect': () => {
    const s = need(`${SRC}/pages/LoginPage.tsx`)
    if (/navigate\((['"`])\/\1\s*\)/.test(s))
      fail(`BUG5 CHƯA FIX: LoginPage vẫn navigate('/') cứng.\n`
         + `  Khách bấm Thanh toán → bị đẩy login → đăng nhập xong hạ cánh TRANG CHỦ.\n`
         + `  Rơi ở đúng chỗ đắt nhất của phễu. Xem spec 06 §2.`)
    if (!/location\.state|safeInternalPath|\bfrom\b/.test(s))
      fail('LoginPage không đọc location.state.from.')
    if (!/replace:\s*true/.test(s)) fail('navigate sau login phải dùng { replace: true }.')
    pass()
  },

  'login-alert': () => {
    const s = need(`${SRC}/pages/LoginPage.tsx`)
    if (!/role=["']alert["']|<Alert\b[^>]*variant=["']danger["']/.test(s))
      fail('Lỗi đăng nhập thiếu role="alert".\n'
         + '  Người dùng screen reader gõ sai mật khẩu và KHÔNG nhận được phản hồi nào.')
    pass()
  },

  'login-h1': () => {
    const s = need(`${SRC}/pages/LoginPage.tsx`)
    const h1 = s.match(/<h1[^>]*>([\s\S]{0,120}?)<\/h1>/)
    if (!h1) fail('LoginPage không có <h1>.')
    const text = h1[1].replace(/<[^>]+>/g, '').trim()
    if (/leaf\s*cr[eè]me/i.test(text))
      fail(`LoginPage h1 = "${text}" — là tên brand, trùng logo ở header.\n`
         + `  h1 phải nói trang này LÀM GÌ: "Đăng nhập".`)
    pass(`h1 = "${text}"`)
  },

  'single-h1': () => {
    const targets = [`${SRC}/pages/UserProfilePage.tsx`]
    for (const f of targets) {
      const s = need(f)
      const n = (s.match(/<h1\b/g) ?? []).length
      if (n !== 1) fail(`${f}: có ${n} thẻ <h1>, cần đúng 1.\n`
        + `  Hiện h1 ĐỔI theo tab — sai cấu trúc tài liệu. h1 = tiêu đề TRANG ("Tài khoản của tôi"),\n`
        + `  tiêu đề panel dùng h2. Xem spec 06 §6.1.`)
    }
    pass()
  },

  'checkout-autocomplete': () => {
    const files = [`${SRC}/pages/CheckoutPage.tsx`, ...glob(`${SRC}/components/checkout/*.tsx`)]
      .filter(existsSync)
    const s = files.map((f) => readFileSync(f, 'utf8')).join('\n')
    const need_ = [['name', /autoComplete=["'](shipping )?name["']/],
                   ['tel', /autoComplete=["'](shipping )?tel["']/],
                   ['street-address', /autoComplete=["'](shipping )?street-address["']/]]
    const missing = need_.filter(([, re]) => !re.test(s)).map(([k]) => k)
    if (missing.length) fail(`Checkout thiếu autoComplete: ${missing.join(', ')}\n`
      + `  → browser không gợi ý địa chỉ đã lưu. Gõ tay địa chỉ dài mỗi lần đặt\n`
      + `  là ma sát lớn nhất của cả luồng trên mobile. Xem spec 06 §3.1.`)
    pass()
  },

  /* ================= phase 7a — admin chức năng ================= */

  'sort-enum': () => {
    const files = glob('app/routers/*.py')
    const bad = []
    for (const f of files) {
      const t = readFileSync(f, 'utf8')
      // sort_by: str = Query(...)  → nhận cột tự do
      if (/sort_by\s*:\s*str\s*=/.test(t)) bad.push(`${f}: sort_by: str`)
      // getattr(Model, sort_by) → SQL injection
      if (/getattr\s*\(\s*\w+\s*,\s*sort_by/.test(t)) bad.push(`${f}: getattr(Model, sort_by)`)
    }
    if (bad.length) fail(`sort_by nhận cột tự do:\n    ${bad.join('\n    ')}\n`
      + `  → dùng Enum (class XSortField(str, Enum)) + SORT_MAP. FastAPI sẽ validate và trả 422.`)
    const hasEnum = files.some((f) => /SortField\(str,\s*Enum\)|SortField\(str, Enum\)/.test(readFileSync(f, 'utf8')))
    if (!hasEnum) fail('Không tìm thấy Enum sort field nào. Xem spec 10 §3.2.')
    pass()
  },

  'order-tiebreaker': () => {
    const files = glob('app/routers/*.py')
    const bad = []
    for (const f of files) {
      const t = readFileSync(f, 'utf8')
      for (const m of t.matchAll(/\.order_by\(([\s\S]{0,200}?)\)/g)) {
        const inner = m[1]
        // Phải có >= 2 biểu thức (dấu phẩy ở cấp ngoài) → có tie-breaker
        const parts = inner.split(',').map((x) => x.trim()).filter(Boolean)
        if (parts.length < 2) {
          const line = t.slice(0, m.index).split('\n').length
          bad.push(`${f}:${line}  order_by(${inner.replace(/\s+/g, ' ').slice(0, 60)})`)
        }
      }
    }
    if (bad.length) fail(
      `order_by thiếu tie-breaker (${bad.length} chỗ):\n    ${bad.slice(0, 8).join('\n    ')}\n`
      + `  → ORDER BY chỉ 1 cột với giá trị trùng cho thứ tự KHÔNG XÁC ĐỊNH giữa các query.\n`
      + `  Hệ quả: offset pagination cho dòng TRÙNG ở trang này và MẤT ở trang khác.\n`
      + `  Thêm ", Model.id.asc()" vào cuối mọi order_by.`)
    pass(`${glob('app/routers/*.py').length} file, mọi order_by có tie-breaker`)
  },

  'no-fetch-all': () => {
    const files = [...glob('frontend/src/services/admin/*.ts'),
                   ...glob('frontend/src/pages/admin/*.tsx'),
                   ...glob('frontend/src/components/admin/**/*.tsx')]
    const hits = find(files, /limit:\s*(1000|500|200|100)\b/)
    if (hits.length) fail(`Còn fetch-all (${hits.length} chỗ):\n${show(hits)}\n`
      + `  → dùng server paging: limit từ pageSize của DataTable (mặc định 50).`)
    pass()
  },

  'no-client-sort': () => {
    const files = glob('frontend/src/services/admin/*.ts')
    const hits = find(files, /\.sort\(\s*\(/)
    if (hits.length) fail(`Sort ở client trong service (${hits.length} chỗ):\n${show(hits)}\n`
      + `  → với server paging, sort client chỉ sort TRONG TRANG hiện tại.\n`
      + `  Nhân viên bấm sort "ngày hết hạn" ở trang 1, tưởng thấy lô sắp hết hạn nhất,\n`
      + `  thực tế nó ở trang 7. Với perishable đó là bỏ sót lô cần xử lý.`)
    pass()
  },

  'tables-migrated': () => {
    // Ưu tiên theo tốc độ tăng dữ liệu (spec 10 §7)
    const MUST = [
      ['frontend/src/pages/admin/AdminStockLedgerPage.tsx', 'ledger — chỉ tăng, vỡ trước tiên'],
      ['frontend/src/pages/admin/AdminInventoryPage.tsx',   'inventory — quan trọng nhất về FEFO'],
      ['frontend/src/components/admin/sales/SalesTable.tsx','đơn hàng tăng nhanh'],
      ['frontend/src/pages/admin/AdminBatchTracePage.tsx',  'truy vết, tăng nhanh'],
    ]
    const notYet = MUST.filter(([f]) => {
      const t = read(f)
      return !t || !/DataTable/.test(t)
    })
    if (notYet.length) fail(`Chưa dùng DataTable:\n    ${notYet.map(([f, w]) => `${f}  (${w})`).join('\n    ')}`)
    // và không còn ai dùng MUI Table thô ở các bảng đó
    const raw = find(MUST.map(([f]) => f).filter(existsSync), /<TableContainer|<TableHead\b/)
    if (raw.length) fail(`Vẫn còn MUI Table thô (nên nằm trong DataTable):\n${show(raw)}`)
    pass(`${MUST.length}/4 bảng ưu tiên đã migrate`)
  },

  'no-bulk-delete-batches': () => {
    const files = ['frontend/src/pages/admin/AdminInventoryPage.tsx',
                   'frontend/src/pages/admin/AdminStockLedgerPage.tsx',
                   'frontend/src/pages/admin/AdminBatchTracePage.tsx'].filter(existsSync)
    const hits = findMulti(files, /bulkActions=\{[\s\S]{0,600}?\}/)
    const bad = hits.filter((h) => /(?:Xo[áa]|Delete|delete)/.test(h.text))
    if (bad.length) fail(
      `Có bulk delete trên bảng lô hàng:\n${show(bad)}\n`
      + `  → lô hàng phải AUDIT ĐƯỢC. Xoá là mất traceability, tức là phá vỡ đúng cái\n`
      + `  mà FEFO/batch tracking đang bảo đảm — giá trị cốt lõi của project.\n`
      + `  Cần "loại bỏ" lô thì ghi giao dịch thất thoát vào ledger, không xoá dòng.`)
    // Pass "rỗng" nếu chưa có bulkActions nào — chỉ có ý nghĩa sau khi áp DataTable.
    pass(hits.length ? `${hits.length} bulkActions, không có delete` : 'chưa có bulkActions (check này chỉ có ý nghĩa sau khi áp DataTable)')
  },

  'ledger-readonly': () => {
    const f = 'frontend/src/pages/admin/AdminStockLedgerPage.tsx'
    const t = need(f)
    const bad = []
    if (/onDelete|handleDelete|DeleteIcon/.test(t)) bad.push('có nút xoá')
    if (/onEdit|handleEdit|EditIcon/.test(t)) bad.push('có nút sửa')
    if (bad.length) fail(`${f}: ${bad.join(', ')}\n`
      + `  → sổ nhật ký kho sửa/xoá được thì không còn là audit trail.\n`
      + `  Đây là quyết định nghiệp vụ, không phải UI.`)
    pass()
  },

  'unsaved-guard-used': () => {
    const MUST = ['frontend/src/pages/admin/AdminBatchCreatePage.tsx',
                  'frontend/src/components/admin/products/ProductForm.tsx',
                  'frontend/src/components/admin/vouchers/VoucherForm.tsx']
    const missing = MUST.filter((f) => { const t = read(f); return !t || !/useUnsavedChanges/.test(t) })
    if (missing.length) fail(`Chưa gọi useUnsavedChanges:\n    ${missing.join('\n    ')}\n`
      + `  File hook tồn tại là chưa đủ. AdminBatchCreatePage 511 dòng — bấm sai link sidebar là mất hết.`)
    pass()
  },

  'forms-validated': () => {
    const forms = [...glob('frontend/src/components/admin/**/*Form*.tsx'),
                   'frontend/src/pages/admin/AdminBatchCreatePage.tsx',
                   'frontend/src/pages/admin/AdminGiftBoxBomPage.tsx'].filter(existsSync)
    const bad = forms.filter((f) => {
      const t = readFileSync(f, 'utf8')
      return !/useAdminForm|FieldErrors|const validate/.test(t)
    })
    if (bad.length) fail(`Form chưa có validation theo field (${bad.length}/${forms.length}):\n    ${bad.join('\n    ')}\n`
      + `  → dùng useAdminForm (spec 11 §2.1). Hiện chỉ VoucherForm có.`)
    pass(`${forms.length}/${forms.length} form có validation`)
  },

  'dashboard-independent-state': () => {
    const t = need('frontend/src/pages/admin/AdminDashboardPage.tsx')
      + glob('frontend/src/hooks/admin/useDashboardData.ts').map((f) => readFileSync(f, 'utf8')).join('\n')
    if (/Promise\.all\(/.test(t) && !/useDashboardData/.test(t))
      fail('Vẫn Promise.all 6 request với 1 state loading.\n'
         + '  → 1 request fail làm TRẮNG cả dashboard. Tách thành 6 state độc lập (spec 13 §2.5).')
    if (!existsSync('frontend/src/hooks/admin/useDashboardData.ts'))
      fail('Thiếu hooks/admin/useDashboardData.ts')
    pass()
  },

  'admin-nav-link': () => {
    const f = glob('frontend/src/layout/admin/{admin-layout,AdminLayout}.tsx')[0]
      ?? fail('Không tìm thấy AdminLayout')
    const t = readFileSync(f, 'utf8')
    if (/handleNavigation|onClick=\{\(\)\s*=>\s*navigate\(/.test(t))
      fail(`${f}: nav vẫn dùng navigate() thay <Link>.\n`
         + `  → ops tool: mở nhiều tab là hành vi hàng ngày (xem tồn kho tab này, nhập lô tab kia).\n`
         + `  Không ctrl+click được là ma sát thật. Dùng component={Link} to={...}.`)
    if (!/component=\{Link\}|component=\{RouterLink\}/.test(t))
      fail(`${f}: không thấy ListItemButton component={Link}.`)
    if (!/aria-current/.test(t)) fail(`${f}: thiếu aria-current="page" trên item active.`)
    pass()
  },

  'sidebar-no-hover': () => {
    const f = glob('frontend/src/layout/admin/{admin-layout,AdminLayout}.tsx')[0]
      ?? fail('Không tìm thấy AdminLayout')
    const t = readFileSync(f, 'utf8')
    if (/onMouseEnter=\{[^}]*setSidebarExpanded|onMouseLeave=\{[^}]*setSidebarExpanded/.test(t))
      fail(`${f}: sidebar vẫn mở/đóng theo hover.\n`
         + `  → chuột đi ngang là bung ra đè nội dung; người dùng bàn phím không mở được;\n`
         + `  không nhớ lựa chọn. Đổi thành nút toggle tường minh (spec 13 §7.3).`)
    pass()
  },

  'sidebar-persist': () => {
    const f = glob('frontend/src/layout/admin/{admin-layout,AdminLayout}.tsx')[0]
    const t = readFileSync(f, 'utf8')
    if (!/localStorage/.test(t))
      fail(`${f}: sidebar collapse không lưu localStorage → mất lựa chọn sau reload.\n`
         + `  Ops tool: trạng thái UI phải bền.`)
    pass()
  },

  'nav-vietnamese': () => {
    const files = ['frontend/src/config/admin-nav.ts',
                   ...glob('frontend/src/layout/admin/*.tsx')].filter(existsSync)
    const t = files.map((f) => readFileSync(f, 'utf8')).join('\n')
    const BAD = [['Batch trace', 'Truy vết lô'], ['Stock ledger', 'Lịch sử kho'],
                 ['Dashboard', 'Tổng quan']]
    const found = BAD.filter(([en]) => new RegExp(`['"\`]${en}['"\`]`).test(t))
    if (found.length) fail(`Nhãn nav tiếng Anh: ${found.map(([a, b]) => `"${a}" → "${b}"`).join(', ')}`)
    // Đơn hàng / Bán hàng không phân biệt được
    if (/['"`]Đơn hàng['"`]/.test(t) && /['"`]Bán hàng['"`]/.test(t))
      fail('Nhãn "Đơn hàng" và "Bán hàng" không phân biệt được nghĩa.\n'
         + '  → "Đơn đặt trước" và "Bán tại quầy" (spec 13 §7.1).')
    pass()
  },

  'shortcut-guard': () => {
    const t = need('frontend/src/hooks/admin/useAdminShortcuts.ts')
    if (!/INPUT|TEXTAREA|isContentEditable|isTyping/.test(t))
      fail('Shortcut không check focus đang ở input.\n'
         + '  → gõ "n" vào ô tìm kiếm sẽ mở form tạo mới. Đây là lỗi phổ biến nhất khi làm shortcut.\n'
         + '  Thêm guard: el.tagName === "INPUT" || "TEXTAREA" || "SELECT" || el.isContentEditable')
    if (!/['"`]\?['"`]/.test(t))
      fail('Thiếu shortcut "?" mở danh sách shortcut. Shortcut không có nơi tra là shortcut không ai dùng.')
    pass()
  },

  /* ================= phase 7b — admin visual ================= */

  'admin-theme-provider': () => {
    const t = [...glob('frontend/src/App.tsx'), ...glob('frontend/src/admin-shell.tsx')]
      .filter(existsSync).map((f) => readFileSync(f, 'utf8')).join('\n')
    if (!/ThemeProvider/.test(t)) fail('Không thấy ThemeProvider.')
    if (!/adminTheme/.test(t)) fail('ThemeProvider không dùng adminTheme.')
    pass()
  },

  'css-layer': () => {
    const t = [...glob('frontend/src/App.tsx'), ...glob('frontend/src/admin-shell.tsx')]
      .filter(existsSync).map((f) => readFileSync(f, 'utf8')).join('\n')
    if (!/enableCssLayer/.test(t))
      fail('Thiếu <StyledEngineProvider enableCssLayer>.\n'
         + '  → CSS emotion không vào @layer → Tailwind class trên MUI component sẽ đấu\n'
         + '  specificity, và code hiện tại đã có 39 chỗ style={{}} inline để thắng cascade.')
    pass()
  },

  'cssbaseline-scoped': () => {
    const app = read('frontend/src/App.tsx') ?? ''
    const shell = read('frontend/src/admin-shell.tsx') ?? ''
    if (/CssBaseline/.test(app) && !/AdminShell|adminTheme/.test(app))
      fail('CssBaseline bọc toàn app → reset toàn cục, đụng Tailwind preflight, làm storefront lệch.\n'
         + '  → chỉ bọc trong AdminShell.')
    if (!/CssBaseline/.test(shell + app)) fail('Không thấy CssBaseline ở đâu.')
    pass()
  },

  'chart-colors-used': () => {
    const files = [...glob('frontend/src/pages/admin/AdminDashboardPage.tsx'),
                   ...glob('frontend/src/components/admin/dashboard/*.tsx')].filter(existsSync)
    const hits = find(files, /#(?:C59B72|F5C96A|F7B4B8|E8E5DD|7A6F63)/i)
    if (hits.length) fail(`Chart còn dùng hex palette cũ:\n${show(hits)}\n`
      + `  → import { CHART_COLORS } from '@/theme/chart-colors'`)
    const uses = files.some((f) => /CHART_COLORS|CHART_PAIR/.test(readFileSync(f, 'utf8')))
    if (!uses) fail('Không file chart nào import CHART_COLORS.')
    pass()
  },

  'chart-data-table': () => {
    const files = glob('frontend/src/components/admin/dashboard/*chart*.tsx')
    if (!files.length) fail('Không tìm thấy component chart nào (đã tách chưa?).')
    const bad = files.filter((f) => {
      const t = readFileSync(f, 'utf8')
      return !/Accordion/.test(t) || !/<caption|<Table\b/.test(t)
    })
    if (bad.length) fail(`Chart thiếu bảng dữ liệu tương đương:\n    ${bad.join('\n    ')}\n`
      + `  → Recharts render SVG mà screen reader KHÔNG đọc được.\n`
      + `  Thêm Accordion "Xem dữ liệu dạng bảng" + <table> có <caption>.\n`
      + `  Vừa fix a11y vừa hữu ích thật — nhân viên muốn copy số vào Excel.`)
    const noRole = files.filter((f) => !/role=["']img["']/.test(readFileSync(f, 'utf8')))
    if (noRole.length) fail(`Chart thiếu role="img" + aria-label:\n    ${noRole.join('\n    ')}`)
    pass(`${files.length} chart có bảng tương đương`)
  },
}

/* ================================================================== */

if (!(name in PROBES)) {
  console.log(`Probe không tồn tại: ${name}\nCó sẵn:\n${Object.keys(PROBES).sort().map((k) => '  ' + k).join('\n')}`)
  process.exit(2)
}

try {
  PROBES[name]()
} catch (e) {
  if (e?.message === undefined) throw e
  console.log(`Probe "${name}" lỗi khi chạy: ${e.message}`)
  process.exit(1)
}
