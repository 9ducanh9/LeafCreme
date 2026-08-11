# Spec 01 — Design Tokens: "Soft Craft"

> Phase 1. Không sửa component nào trong spec này. Chỉ thay `tokens.css` + `tailwind.config.js` + `index.css`.
> Mọi contrast ratio dưới đây đã tính bằng công thức WCAG 2.1 relative luminance, không phải ước lượng.

---

## 1. Hiện trạng

`src/styles/tokens.css` — 77 dòng, và đây là vấn đề:

```css
:root {
  --color-bg-main: #FFF8F0;
  --color-text-primary: #473C2F;
  --color-text-secondary: #7A6F63;
  --color-accent-yellow: #F5C96A;
  --color-accent-pink:   #F7B4B8;
  --color-accent-brown:  #C59B72;
  --radius-card: 16px;
  --radius-button: 12px;
  --radius-input: 8px;
}
```

### Bốn lỗi thiết kế của token layer hiện tại

**1. Token là literal, không phải semantic.**
`--color-accent-pink` mô tả *màu gì*, không mô tả *dùng để làm gì*. Kết quả là `ui/Input.tsx:26` dùng pink cho error state:

```tsx
${error ? 'border-accent-pink' : ''}
...
<p className="mt-2 text-sm text-accent-pink">{error}</p>
```

Pink `#F7B4B8` trên bg `#FFF8F0` cho contrast **1.64:1**. Text lỗi gần như không đọc được. Và vì token tên là "pink" chứ không phải "danger", không ai phát hiện ra là đang dùng sai vai trò.

Đây là lỗi kiến trúc, không phải lỗi cẩu thả: người viết `Input.tsx` cần "màu báo lỗi", palette chỉ có 3 màu tên theo sắc độ, pink là cái gần nghĩa "sai" nhất → chọn pink. Token đặt tên theo màu thì tự nó dẫn người dùng tới lựa chọn sai.

**2. Palette quá mỏng để làm UI thật.**
3 accent + 2 text + 2 bg = 7 màu. Một app thương mại cần: 10-step neutral ramp, 2 brand ramp, 4 semantic (success/warning/danger/info), mỗi cái tối thiểu 3 step (bg / border / text). Thiếu ramp nên mọi hover/active/disabled state phải bịa hex tại chỗ → đúng nguyên nhân của 621 hex hardcode.

**3. Không có elevation, không có z-index, không có focus ring token.**
Nên có 9 giá trị z-index rời rạc và 0 focus ring.

**4. Contrast chưa từng được verify.**
Kiểm tra palette cũ (tính bằng công thức WCAG 2.1, không ước lượng):

| Cặp | Ratio | Ngưỡng | Kết quả |
|---|---|---|---|
| `text-primary #473C2F` trên `#FFF8F0` | 10.20 | 4.5 | PASS (AAA) |
| `text-secondary #7A6F63` trên `#FFF8F0` | **4.66** | 4.5 | PASS — nhưng headroom chỉ 0.16 |
| `accent-pink #F7B4B8` trên `#FFF8F0` *(đang dùng làm error text)* | **1.64** | 4.5 | **FAIL nặng** |
| `accent-yellow #F5C96A` trên `#FFF8F0` *(dùng trong Badge)* | **1.48** | 4.5 | **FAIL nặng** |
| `accent-brown #C59B72` trên `#FFF8F0` | **2.40** | 4.5 | **FAIL** |
| `border #E8E5DD` vs bg *(non-text)* | **1.20** | 3.0 | **FAIL** |
| Focus state: `border #E8E5DD` → `accent-brown #C59B72` | **2.01** | 3.0 | **FAIL** |

Ba điều đáng nói:

- **`text-secondary` không fail** như t nói ở bản nháp đầu — nó đạt 4.66, qua AA. Nhưng headroom 0.16 nghĩa là chỉ cần đổi nền một nấc là fail. Không có biên an toàn.
- **Cả 3 accent color đều không dùng làm text được** (1.48 / 1.64 / 2.40). Nhưng cả 3 đang được dùng làm text: pink cho error (`ui/Input.tsx:27,33`), và `#473C2F` trên nền yellow/pink trong `ui/Badge.tsx` — cái đó thì ok vì text tối trên nền sáng.
- **Focus state chỉ đạt 2.01** — dòng cuối bảng là nguyên nhân gốc của D3. Đổi border từ `#E8E5DD` sang `#C59B72` để báo focus chỉ tạo ra 2.01:1, dưới ngưỡng 3:1 của WCAG 1.4.11. Người dùng bàn phím thực tế không phân biệt được field nào đang focus.

---

## 2. Hướng brand: Soft Craft

Giữ tinh thần ấm/thân thiện của brand cũ, nhưng:

| Bỏ | Thêm |
|---|---|
| Gradient blob trên `body` (3 `radial-gradient` ở `index.css:18-22`) | Nền phẳng warm sand, để ảnh bánh làm điểm nhấn |
| `FloatingEmojiOverlay` emoji bay | Seasonal signal bằng badge/ribbon trong catalog — vẫn có mùa vụ nhưng không trẻ con |
| 30 chỗ `bg-gradient-*` hardcode | Gradient chỉ còn 1 token, dùng đúng 1 chỗ (hero overlay) |
| Playfair Display (serif display, rất khó chỉnh cỡ nhỏ, nặng tiếng Việt) | Bricolage Grotesque cho heading — có cá tính craft, hỗ trợ tiếng Việt tốt, variable font |
| Radius lộn xộn 8/12/16 | Scale radius nhất quán, base 10px |

**Lý do đổi khỏi Playfair Display:** Playfair là serif high-contrast, thiết kế cho tiêu đề tạp chí cỡ ≥40px. Ở 20-28px (cỡ heading thật của app) nét mảnh của nó bị bệt, và dấu tiếng Việt (ằ, ệ, ỗ) chồng lên serif rất xấu. Bricolage Grotesque là variable font, có wdth axis, dấu tiếng Việt sạch, và vẫn có nét "làm thủ công" — đúng brand bakery.

Nếu muốn giữ Playfair: chỉ dùng cho đúng 1 element (logo wordmark hoặc hero H1), không dùng cho H2/H3.

---

## 3. Token architecture — 3 tầng

Đây là điểm khác biệt cốt lõi so với hiện tại. Ba tầng riêng biệt:

```
Tầng 1 — PRIMITIVE   : --sand-500, --terra-600      (giá trị thật, không dùng trực tiếp trong component)
Tầng 2 — SEMANTIC    : --bg-surface, --fg-muted     (vai trò; component CHỈ dùng tầng này)
Tầng 3 — COMPONENT    : --btn-primary-bg            (chỉ khi cần override cục bộ; hạn chế)
```

**Quy tắc bất di bất dịch:** component không bao giờ tham chiếu tầng 1. Nhờ vậy đổi brand hoặc bật dark mode chỉ cần remap tầng 2, không chạm component nào.

---

## 4. `src/styles/tokens.css` — file mới, thay toàn bộ

```css
/**
 * Leaf Crème Design Tokens — "Soft Craft"
 *
 * KIẾN TRÚC 3 TẦNG:
 *   Tầng 1 (--sand-*, --terra-*, --mint-*)  : giá trị thật. KHÔNG dùng trong component.
 *   Tầng 2 (--bg-*, --fg-*, --border-*, ...) : vai trò. Component CHỈ dùng tầng này.
 *   Tầng 3                                   : component-specific, khai báo tại chỗ khi cần.
 *
 * Mọi cặp màu text/bg dưới đây đã verify WCAG 2.1 AA (>=4.5:1 body, >=3:1 non-text).
 * Đổi bất kỳ hex nào thì phải chạy lại script kiểm tra ở docs/contrast-check.py.
 */

/* ==========================================================================
   TẦNG 1 — PRIMITIVE
   ========================================================================== */
:root {
  /* Neutral — warm sand ramp */
  --sand-50:  #FFFBF5;
  --sand-100: #FBF4EA;
  --sand-200: #F2E8DA;
  --sand-300: #E3D5C2;
  --sand-400: #C4B29B;
  --sand-500: #9D8770;   /* mức tối thiểu đạt 3:1 với sand-50 → dùng cho interactive border */
  --sand-600: #7A6A56;
  --sand-700: #5A4C3C;
  --sand-800: #3A2E24;
  --sand-900: #241B14;

  /* Brand — terracotta / caramel nướng */
  --terra-50:  #FDF3EC;
  --terra-100: #FAE3D4;
  --terra-200: #F5CDB2;
  --terra-300: #EFB894;
  --terra-400: #E08B54;
  --terra-500: #D97742;
  --terra-600: #C2410C;   /* primary action */
  --terra-700: #9A3412;   /* hover / text-on-light */
  --terra-800: #7C2D12;   /* active */

  /* Accent — mint/teal: tín hiệu "tươi", dùng cho freshness & success-ish */
  --mint-50:  #EFFAF7;
  --mint-100: #D6F2EC;
  --mint-300: #5EC7BA;
  --mint-500: #14897C;
  --mint-600: #0F766E;
  --mint-700: #115E59;

  /* Semantic base */
  --green-600:  #15803D;
  --green-50:   #F0FDF4;
  --amber-600:  #B45309;
  --amber-50:   #FFFBEB;
  --red-600:    #B91C1C;
  --red-50:     #FEF2F2;
  --blue-600:   #1D4ED8;
  --blue-50:    #EFF6FF;
}

/* ==========================================================================
   TẦNG 2 — SEMANTIC  (component chỉ dùng nhóm này)
   ========================================================================== */
:root {
  /* --- Background --- */
  --bg-canvas:        var(--sand-50);    /* nền trang */
  --bg-subtle:        var(--sand-100);   /* section xen kẽ */
  --bg-surface:       #FFFFFF;           /* card, panel, modal */
  --bg-surface-hover: var(--sand-100);
  --bg-inset:         var(--sand-200);   /* input disabled, code block */
  --bg-overlay:       rgb(36 27 20 / 0.55);  /* backdrop modal */

  /* --- Foreground --- */
  --fg-default:   var(--sand-800);   /* 12.76:1 trên bg-canvas — AAA */
  --fg-strong:    var(--sand-900);   /* 16.40:1 — heading */
  --fg-muted:     var(--sand-700);   /*  8.04:1 — AAA, text phụ */
  --fg-subtle:    var(--sand-600);   /*  5.06:1 — AA, metadata, timestamp */
  --fg-disabled:  var(--sand-400);   /*  2.00:1 — CHỈ dùng cho text đã disabled (WCAG miễn trừ 1.4.3) */
  --fg-on-brand:  #FFFFFF;           /*  5.18:1 trên terra-600 — AA */
  --fg-on-accent: #FFFFFF;           /*  5.47:1 trên mint-600  — AA */

  /* --- Border --- */
  --border-subtle:      var(--sand-200);  /* divider trang trí, không cần 3:1 */
  --border-default:     var(--sand-300);  /* viền card */
  --border-interactive: var(--sand-500);  /* 3.32:1 — viền input/checkbox/radio, ĐẠT WCAG 1.4.11 */
  --border-strong:      var(--sand-600);
  --border-brand:       var(--terra-600);

  /* --- Brand roles --- */
  --brand-bg:           var(--terra-600);
  --brand-bg-hover:     var(--terra-700);
  --brand-bg-active:    var(--terra-800);
  --brand-bg-subtle:    var(--terra-50);
  --brand-border-subtle:var(--terra-200);
  --brand-fg:           var(--terra-700);  /* 7.09:1 — brand color dùng làm TEXT phải là 700, không phải 600 */

  --accent-bg:          var(--mint-600);
  --accent-bg-hover:    var(--mint-700);
  --accent-bg-subtle:   var(--mint-50);
  --accent-fg:          var(--mint-600);   /* 5.31:1 — AA */

  /* --- Semantic feedback --- */
  --success-fg: var(--green-600);  --success-bg: var(--green-50);
  --warning-fg: var(--amber-600);  --warning-bg: var(--amber-50);
  --danger-fg:  var(--red-600);    --danger-bg:  var(--red-50);
  --info-fg:    var(--blue-600);   --info-bg:    var(--blue-50);
  --danger-bg-solid: var(--red-600);  --danger-fg-on-solid: #FFFFFF;  /* 6.47:1 */

  /* --- Focus ring: KHÔNG ĐƯỢC tắt --- */
  --focus-ring:        var(--terra-600);   /* 5.02:1 với bg-canvas — vượt yêu cầu 3:1 */
  --focus-ring-offset: var(--bg-canvas);
  --focus-ring-width:  2px;
  --focus-ring-offset-width: 2px;

  /* --- Radius --- */
  --radius-xs:   4px;
  --radius-sm:   6px;
  --radius-md:  10px;   /* base: button, input, badge */
  --radius-lg:  14px;   /* card */
  --radius-xl:  20px;   /* modal, drawer, hero */
  --radius-full: 9999px;

  /* --- Elevation: bóng ấm, không phải xám lạnh --- */
  --shadow-xs: 0 1px 2px 0 rgb(58 46 36 / 0.05);
  --shadow-sm: 0 1px 3px 0 rgb(58 46 36 / 0.08), 0 1px 2px -1px rgb(58 46 36 / 0.06);
  --shadow-md: 0 4px 8px -2px rgb(58 46 36 / 0.10), 0 2px 4px -2px rgb(58 46 36 / 0.06);
  --shadow-lg: 0 12px 20px -6px rgb(58 46 36 / 0.12), 0 4px 8px -4px rgb(58 46 36 / 0.07);
  --shadow-xl: 0 24px 40px -12px rgb(58 46 36 / 0.16);

  /* --- Gradient: chỉ 1 token, chỉ dùng cho hero overlay --- */
  --gradient-hero-scrim: linear-gradient(
    to top,
    rgb(36 27 20 / 0.72) 0%,
    rgb(36 27 20 / 0.30) 45%,
    rgb(36 27 20 / 0) 100%
  );

  /* --- Typography --- */
  --font-heading: 'Bricolage Grotesque Variable', 'Bricolage Grotesque',
                  'Be Vietnam Pro', system-ui, sans-serif;
  --font-body:    'Inter Variable', 'Inter', 'Be Vietnam Pro',
                  system-ui, -apple-system, sans-serif;
  --font-mono:    ui-monospace, 'SF Mono', 'Cascadia Code', monospace;
  --font-numeric: 'Inter Variable', 'Inter', system-ui, sans-serif;

  /* Type scale — modular 1.2 (minor third), base 16px.
     Dùng clamp() cho display/h1/h2 để responsive không cần media query. */
  --text-2xs:     0.6875rem;  /* 11px — chỉ dùng cho legal/superscript */
  --text-xs:      0.75rem;    /* 12px */
  --text-sm:      0.875rem;   /* 14px */
  --text-base:    1rem;       /* 16px */
  --text-lg:      1.125rem;   /* 18px */
  --text-xl:      1.3125rem;  /* 21px */
  --text-2xl:     1.5625rem;  /* 25px */
  --text-3xl:     1.875rem;   /* 30px */
  --text-4xl:     2.25rem;    /* 36px */
  --text-display: clamp(2.25rem, 1.5rem + 3.2vw, 3.5rem);   /* 36 → 56px */
  --text-h1:      clamp(1.875rem, 1.4rem + 2vw, 2.75rem);   /* 30 → 44px */
  --text-h2:      clamp(1.5625rem, 1.3rem + 1.1vw, 2rem);   /* 25 → 32px */

  /* Line height */
  --leading-none:    1;
  --leading-tight:   1.15;   /* display, h1 */
  --leading-snug:    1.3;    /* h2, h3 */
  --leading-normal:  1.5;
  --leading-relaxed: 1.65;   /* body dài, tiếng Việt cần thoáng hơn tiếng Anh */

  /* Letter spacing */
  --tracking-tighter: -0.03em;  /* display */
  --tracking-tight:   -0.015em; /* heading */
  --tracking-normal:  0;
  --tracking-wide:    0.02em;
  --tracking-caps:    0.06em;   /* ALL CAPS label */

  /* Font weight */
  --weight-normal:   400;
  --weight-medium:   500;
  --weight-semibold: 600;
  --weight-bold:     700;

  /* --- Spacing: 4px base, không dùng số tuỳ ý --- */
  --space-0:  0;
  --space-1:  0.25rem;  /*  4px */
  --space-2:  0.5rem;   /*  8px */
  --space-3:  0.75rem;  /* 12px */
  --space-4:  1rem;     /* 16px */
  --space-5:  1.25rem;  /* 20px */
  --space-6:  1.5rem;   /* 24px */
  --space-8:  2rem;     /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */

  /* --- Layout --- */
  --container-max:     1280px;  /* giảm từ 1440px: 1440 quá rộng, dòng text vượt 90ch khó đọc */
  --container-prose:   68ch;    /* Policy, ContactPage, mô tả sản phẩm */
  --container-form:    30rem;   /* 480px — Login, Register */
  --container-gutter:      1rem;    /* mobile */
  --container-gutter-md:   1.5rem;
  --container-gutter-lg:   2rem;
  --header-height:     4rem;    /* 64px — dùng cho scroll-margin-top */

  /* --- Z-index: thang bậc, cấm dùng số tuỳ ý --- */
  --z-base:        0;
  --z-raised:     10;   /* card hover, sticky trong trang */
  --z-sticky:     20;   /* sticky filter bar, sticky order summary */
  --z-header:     30;
  --z-dropdown:   40;   /* popover, dropdown menu, select */
  --z-overlay:    50;   /* backdrop */
  --z-modal:      60;   /* dialog, drawer */
  --z-toast:      70;
  --z-tooltip:    80;
  /* KHÔNG có tầng nào cao hơn 80. Cần cao hơn nghĩa là đang thiết kế sai. */

  /* --- Motion --- */
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-instant: 75ms;
  --duration-fast:   150ms;
  --duration-normal: 220ms;
  --duration-slow:   320ms;
  --duration-slower: 480ms;   /* chỉ dùng cho drawer/page transition */
}

/* ==========================================================================
   Dark mode — CHƯA nằm trong scope, nhưng token layer đã sẵn.
   Bật sau bằng cách bỏ comment + thêm darkMode:'class' vào tailwind.config.
   Chỉ cần remap TẦNG 2. Không chạm component nào.
   ========================================================================== */
/*
.dark {
  --bg-canvas:  #1A1613;
  --bg-subtle:  #221C17;
  --bg-surface: #262019;
  --bg-inset:   #302820;
  --fg-default: var(--sand-200);   
  --fg-strong:  #FFFBF5;
  --fg-muted:   var(--sand-400);   
  --fg-subtle:  var(--sand-500);
  --border-subtle:      #302820;
  --border-default:     #3D342B;
  --border-interactive: #6B5B4A;
  --brand-bg:  var(--terra-500);
  --brand-fg:  var(--terra-300);   
  --accent-fg: var(--mint-300);    
  --focus-ring: var(--terra-300);
}
*/

/* ==========================================================================
   Tôn trọng prefers-reduced-motion
   ========================================================================== */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-instant: 0ms; --duration-fast: 0ms; --duration-normal: 0ms;
    --duration-slow: 0ms;    --duration-slower: 0ms;
  }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 5. Bảng verify contrast (đã tính, không phải ước lượng)

Chạy lại bất cứ lúc nào bằng `docs/contrast-check.py` (§8).

### Text trên `--bg-canvas` (#FFFBF5)

| Token | Hex | Ratio | Chuẩn |
|---|---|---|---|
| `--fg-strong` | `#241B14` | **16.40** | AAA |
| `--fg-default` | `#3A2E24` | **12.76** | AAA |
| `--fg-muted` | `#5A4C3C` | **8.04** | AAA |
| `--fg-subtle` | `#7A6A56` | **5.06** | AA |
| `--brand-fg` | `#9A3412` | **7.09** | AAA |
| `--accent-fg` | `#0F766E` | **5.31** | AA |
| `--success-fg` | `#15803D` | **4.86** | AA |
| `--warning-fg` | `#B45309` | **4.87** | AA |
| `--danger-fg` | `#B91C1C` | **6.28** | AA |
| `--info-fg` | `#1D4ED8` | **6.50** | AA |

### Text trên nền solid

| Cặp | Ratio | Chuẩn |
|---|---|---|
| `#FFFFFF` trên `--brand-bg` (#C2410C) | **5.18** | AA |
| `#FFFFFF` trên `--brand-bg-hover` (#9A3412) | **7.31** | AAA |
| `#FFFFFF` trên `--accent-bg` (#0F766E) | **5.47** | AA |
| `#FFFFFF` trên `--danger-bg-solid` (#B91C1C) | **6.47** | AA |
| `--fg-default` trên `--bg-subtle` (#FBF4EA) | **12.05** | AAA |

### Non-text (WCAG 1.4.11, cần ≥ 3:1)

| Token | Hex | Ratio vs canvas | Chuẩn |
|---|---|---|---|
| `--border-interactive` | `#9D8770` | **3.32** | PASS |
| `--focus-ring` | `#C2410C` | **5.02** | PASS |
| `--border-default` | `#E3D5C2` | 1.40 | *(trang trí — miễn trừ)* |
| `--border-subtle` | `#F2E8DA` | 1.17 | *(trang trí — miễn trừ)* |

**Quy tắc rút ra — ghi vào PR template:**

- Viền của **input, checkbox, radio, select, switch** → bắt buộc `--border-interactive`, không được dùng `--border-default`.
- Viền của **card, divider, section** → dùng `--border-default` / `--border-subtle`, được miễn trừ 3:1 vì không mang thông tin.
- Brand color làm **text** → dùng `--brand-fg` (terra-700), **không** dùng `--brand-bg` (terra-600, chỉ 5.02 — vẫn AA nhưng sát ngưỡng, và fail nếu font < 16px thì không, vẫn ok; dùng 700 cho an toàn).
- `--fg-disabled` (2.00:1) chỉ dùng cho text của control đã `disabled` — WCAG 1.4.3 miễn trừ inactive component. **Không** được dùng cho placeholder. Placeholder dùng `--fg-subtle`.

Điểm cuối rất hay bị sai: placeholder là text người dùng cần đọc để hiểu field, nên phải đạt 4.5:1.

---

## 6. `tailwind.config.js` — file mới, thay toàn bộ

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // darkMode: 'class',   // bật cùng lúc bỏ comment block .dark trong tokens.css
  theme: {
    // GHI ĐÈ hoàn toàn, không dùng extend, để KHÔNG còn truy cập được
    // palette mặc định của Tailwind (blue-500, gray-200, ...).
    // Đây là cách chặn hex/màu lạ lọt vào ở tầng config, không phải tầng review.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      white: '#FFFFFF',

      bg: {
        canvas:        'var(--bg-canvas)',
        subtle:        'var(--bg-subtle)',
        surface:       'var(--bg-surface)',
        'surface-hover':'var(--bg-surface-hover)',
        inset:         'var(--bg-inset)',
        overlay:       'var(--bg-overlay)',
      },
      fg: {
        DEFAULT:   'var(--fg-default)',
        strong:    'var(--fg-strong)',
        muted:     'var(--fg-muted)',
        subtle:    'var(--fg-subtle)',
        disabled:  'var(--fg-disabled)',
        'on-brand':'var(--fg-on-brand)',
        'on-accent':'var(--fg-on-accent)',
      },
      border: {
        DEFAULT:     'var(--border-default)',
        subtle:      'var(--border-subtle)',
        interactive: 'var(--border-interactive)',
        strong:      'var(--border-strong)',
        brand:       'var(--border-brand)',
      },
      brand: {
        DEFAULT:  'var(--brand-bg)',
        hover:    'var(--brand-bg-hover)',
        active:   'var(--brand-bg-active)',
        subtle:   'var(--brand-bg-subtle)',
        'border-subtle': 'var(--brand-border-subtle)',
        fg:       'var(--brand-fg)',
      },
      accent: {
        DEFAULT: 'var(--accent-bg)',
        hover:   'var(--accent-bg-hover)',
        subtle:  'var(--accent-bg-subtle)',
        fg:      'var(--accent-fg)',
      },
      success: { DEFAULT: 'var(--success-fg)', bg: 'var(--success-bg)' },
      warning: { DEFAULT: 'var(--warning-fg)', bg: 'var(--warning-bg)' },
      danger:  { DEFAULT: 'var(--danger-fg)',  bg: 'var(--danger-bg)',
                 solid: 'var(--danger-bg-solid)', 'fg-on-solid': 'var(--danger-fg-on-solid)' },
      info:    { DEFAULT: 'var(--info-fg)',    bg: 'var(--info-bg)' },

      focus: 'var(--focus-ring)',
    },

    fontFamily: {
      heading: 'var(--font-heading)',
      body:    'var(--font-body)',
      mono:    'var(--font-mono)',
      numeric: 'var(--font-numeric)',
    },

    fontSize: {
      '2xs':    ['var(--text-2xs)',    { lineHeight: 'var(--leading-normal)' }],
      xs:       ['var(--text-xs)',     { lineHeight: 'var(--leading-normal)' }],
      sm:       ['var(--text-sm)',     { lineHeight: 'var(--leading-normal)' }],
      base:     ['var(--text-base)',   { lineHeight: 'var(--leading-relaxed)' }],
      lg:       ['var(--text-lg)',     { lineHeight: 'var(--leading-relaxed)' }],
      xl:       ['var(--text-xl)',     { lineHeight: 'var(--leading-snug)' }],
      '2xl':    ['var(--text-2xl)',    { lineHeight: 'var(--leading-snug)' }],
      '3xl':    ['var(--text-3xl)',    { lineHeight: 'var(--leading-snug)' }],
      '4xl':    ['var(--text-4xl)',    { lineHeight: 'var(--leading-tight)' }],
      h2:       ['var(--text-h2)',     { lineHeight: 'var(--leading-snug)',  letterSpacing: 'var(--tracking-tight)' }],
      h1:       ['var(--text-h1)',     { lineHeight: 'var(--leading-tight)', letterSpacing: 'var(--tracking-tight)' }],
      display:  ['var(--text-display)',{ lineHeight: 'var(--leading-tight)', letterSpacing: 'var(--tracking-tighter)' }],
    },

    fontWeight: {
      normal:   'var(--weight-normal)',
      medium:   'var(--weight-medium)',
      semibold: 'var(--weight-semibold)',
      bold:     'var(--weight-bold)',
    },

    letterSpacing: {
      tighter: 'var(--tracking-tighter)',
      tight:   'var(--tracking-tight)',
      normal:  'var(--tracking-normal)',
      wide:    'var(--tracking-wide)',
      caps:    'var(--tracking-caps)',
    },

    lineHeight: {
      none: 'var(--leading-none)',   tight:   'var(--leading-tight)',
      snug: 'var(--leading-snug)',   normal:  'var(--leading-normal)',
      relaxed: 'var(--leading-relaxed)',
    },

    spacing: {
      0: 'var(--space-0)',   px: '1px',
      1: 'var(--space-1)',   2:  'var(--space-2)',   3:  'var(--space-3)',
      4: 'var(--space-4)',   5:  'var(--space-5)',   6:  'var(--space-6)',
      8: 'var(--space-8)',   10: 'var(--space-10)',  12: 'var(--space-12)',
      16:'var(--space-16)',  20: 'var(--space-20)',  24: 'var(--space-24)',
    },

    borderRadius: {
      none: '0',
      xs:   'var(--radius-xs)',  sm: 'var(--radius-sm)',
      md:   'var(--radius-md)',  lg: 'var(--radius-lg)',
      xl:   'var(--radius-xl)',
      full: 'var(--radius-full)',
    },

    boxShadow: {
      none: 'none',
      xs: 'var(--shadow-xs)', sm: 'var(--shadow-sm)',
      md: 'var(--shadow-md)', lg: 'var(--shadow-lg)', xl: 'var(--shadow-xl)',
    },

    zIndex: {
      base:     'var(--z-base)',     raised:   'var(--z-raised)',
      sticky:   'var(--z-sticky)',   header:   'var(--z-header)',
      dropdown: 'var(--z-dropdown)', overlay:  'var(--z-overlay)',
      modal:    'var(--z-modal)',    toast:    'var(--z-toast)',
      tooltip:  'var(--z-tooltip)',
    },

    transitionDuration: {
      instant: 'var(--duration-instant)', fast:   'var(--duration-fast)',
      normal:  'var(--duration-normal)',  slow:   'var(--duration-slow)',
      slower:  'var(--duration-slower)',
    },
    transitionTimingFunction: {
      out:    'var(--ease-out)',
      'in-out':'var(--ease-in-out)',
      spring: 'var(--ease-spring)',
    },

    screens: {
      sm:  '640px',
      md:  '768px',
      lg:  '1024px',
      xl:  '1280px',
      '2xl':'1536px',
    },

    extend: {
      maxWidth: {
        container: 'var(--container-max)',
        prose:     'var(--container-prose)',
        form:      'var(--container-form)',
      },
      backgroundImage: {
        'hero-scrim': 'var(--gradient-hero-scrim)',
      },
      // Aspect ratio chuẩn cho ảnh sản phẩm — cấm h-64 hardcode (xem spec 04)
      aspectRatio: {
        product: '4 / 5',
        hero:    '16 / 9',
        'hero-mobile': '4 / 5',
      },
      keyframes: {
        'fade-in':      { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in':     { from: { opacity: '0', transform: 'scale(0.96)' },
                          to:   { opacity: '1', transform: 'scale(1)' } },
        'slide-in-right':{ from:{ transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'slide-in-left': { from:{ transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'slide-up':     { from: { transform: 'translateY(8px)', opacity: '0' },
                          to:   { transform: 'translateY(0)',   opacity: '1' } },
        shimmer:        { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in':       'fade-in var(--duration-fast) var(--ease-out)',
        'scale-in':      'scale-in var(--duration-normal) var(--ease-out)',
        'slide-in-right':'slide-in-right var(--duration-slow) var(--ease-out)',
        'slide-in-left': 'slide-in-left var(--duration-slow) var(--ease-out)',
        'slide-up':      'slide-up var(--duration-normal) var(--ease-out)',
        shimmer:         'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}
```

### Vì sao ghi đè `colors` thay vì `extend.colors`

Với `extend`, `bg-blue-500` và `text-gray-400` vẫn hợp lệ. Với ghi đè, chúng **báo lỗi build**. Đây là cách duy nhất khiến token layer được tôn trọng mà không phụ thuộc vào việc ai đó nhớ review.

Trade-off: sẽ phải sửa các file đang dùng màu Tailwind mặc định. Đó là chi phí một lần, và nó chính là mục đích.

Ngoại lệ cần biết: `src/pages/admin/**` cũng chịu ảnh hưởng. Nếu admin đang dùng `bg-gray-100`, build sẽ vỡ. Cách xử lý ở §7.

---

## 7. Xử lý admin trong lúc chuyển tiếp

Ghi đè `colors` sẽ làm vỡ build ở admin nếu admin dùng màu Tailwind mặc định. Hai lựa chọn:

**Lựa chọn A (khuyến nghị): thêm alias tạm cho legacy, có deadline.**

```js
colors: {
  // ... token ở trên ...

  /** @deprecated Chỉ tồn tại cho src/**/admin/** trong lúc chuyển tiếp.
   *  XOÁ ở phase 7. Không dùng cho file mới. */
  legacy: {
    gray50:'#F9FAFB', gray100:'#F3F4F6', gray200:'#E5E7EB',
    gray400:'#9CA3AF', gray500:'#6B7280', gray700:'#374151', gray900:'#111827',
  },
}
```

Rồi sed một lượt trong admin: `bg-gray-100` → `bg-legacy-gray100`. Tên `legacy-*` cố tình xấu để không ai muốn dùng, và `grep -c "legacy-"` trở thành thước đo tiến độ migration admin.

**Lựa chọn B: `extend.colors` cho phase 1-6, đổi sang ghi đè ở phase 7.**
Đơn giản hơn nhưng mất guardrail đúng lúc cần nhất. Không khuyến nghị.

**Chọn A.**

Chạy trước để biết quy mô:

```bash
grep -rEno '\b(bg|text|border|ring|from|to|via)-(gray|slate|zinc|neutral|stone|red|blue|green|yellow|amber|orange|purple|pink|indigo|teal|cyan|emerald|lime|rose|violet|fuchsia|sky)-[0-9]{2,3}\b' \
  frontend/src --include=*.tsx | tee /tmp/legacy-colors.txt | wc -l
```

---

## 8. `src/index.css` — file mới

```css
@import './styles/tokens.css';

/* Variable fonts, subset Việt + Latin. self-host ở /public/fonts để tránh
   FOUT và tránh phụ thuộc Google Fonts CDN (cũng tốt cho GDPR). */
@font-face {
  font-family: 'Inter Variable';
  src: url('/fonts/InterVariable.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0102-0103, U+0110-0111, U+0128-0129,
                 U+0168-0169, U+01A0-01B0, U+1EA0-1EF9, U+20AB;
}
@font-face {
  font-family: 'Bricolage Grotesque Variable';
  src: url('/fonts/BricolageGrotesque.woff2') format('woff2-variations');
  font-weight: 200 800;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0102-0103, U+0110-0111, U+0128-0129,
                 U+0168-0169, U+01A0-01B0, U+1EA0-1EF9, U+20AB;
}

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  *, *::before, *::after { box-sizing: border-box; }

  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    scroll-behavior: smooth;
    /* anchor không bị header sticky che */
    scroll-padding-top: var(--header-height);
  }

  body {
    @apply bg-bg-canvas text-fg font-body text-base antialiased;
    /* KHÔNG còn radial-gradient blob. Nền phẳng, để ảnh bánh làm điểm nhấn. */
    font-feature-settings: 'cv11' 1;  /* single-storey a của Inter — mềm hơn, phù hợp brand */
    min-height: 100vh;
    min-height: 100dvh;   /* fix thanh địa chỉ mobile */
  }

  h1, h2, h3, h4, h5, h6 {
    @apply font-heading text-fg-strong;
    text-wrap: balance;   /* heading không còn 1 chữ rơi xuống dòng cuối */
  }
  h1 { @apply text-h1 font-semibold; }
  h2 { @apply text-h2 font-semibold; }
  h3 { @apply text-2xl font-semibold; }
  h4 { @apply text-xl  font-semibold; }
  h5 { @apply text-lg  font-medium; }
  h6 { @apply text-base font-medium; }

  p { text-wrap: pretty; }   /* tránh dòng cuối chỉ 1 từ */

  /* Focus ring TOÀN CỤC. Đây là fix cho D3 (52 chỗ focus:outline-none).
     Không component nào được phép override thành outline-none mà không
     thay bằng ring tương đương. */
  :focus-visible {
    outline: var(--focus-ring-width) solid var(--focus-ring);
    outline-offset: var(--focus-ring-offset-width);
    border-radius: var(--radius-xs);
  }
  /* Chỉ tắt outline khi KHÔNG phải keyboard focus */
  :focus:not(:focus-visible) { outline: none; }

  /* Số tiền, số lượng, ngày: dùng tabular để không nhảy cột */
  [data-numeric], .tabular { font-variant-numeric: tabular-nums; }

  /* Ảnh mặc định không tràn */
  img, svg, video { max-width: 100%; height: auto; display: block; }

  /* Placeholder phải đọc được — dùng fg-subtle (5.06:1), KHÔNG dùng fg-disabled */
  ::placeholder { @apply text-fg-subtle; opacity: 1; }

  /* Selection theo brand */
  ::selection { background: var(--brand-bg-subtle); color: var(--brand-fg); }
}

@layer components {
  /* Container: thay cho 34 chỗ max-w-[1440px] copy-paste.
     Chi tiết component <Container> ở spec 03. */
  .container-app {
    width: 100%;
    max-width: var(--container-max);
    margin-inline: auto;
    padding-inline: var(--container-gutter);
  }
  @media (min-width: 768px) {
    .container-app { padding-inline: var(--container-gutter-md); }
  }
  @media (min-width: 1024px) {
    .container-app { padding-inline: var(--container-gutter-lg); }
  }

  /* Skip link — bắt buộc có, xem spec 07 */
  .skip-link {
    @apply absolute left-4 z-tooltip -translate-y-full rounded-md bg-bg-surface
           px-4 py-2 text-sm font-medium text-fg shadow-lg
           transition-transform duration-fast focus-visible:translate-y-4;
  }
}

@layer utilities {
  /* line-clamp là built-in từ Tailwind 3.3 — XOÁ định nghĩa tay ở index.css cũ */

  /* Ẩn nhưng screen reader vẫn đọc */
  .sr-only-focusable:not(:focus):not(:focus-within) {
    position: absolute; width: 1px; height: 1px;
    padding: 0; margin: -1px; overflow: hidden;
    clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
  }
}
```

### Những thứ bị xoá khỏi `index.css` cũ và lý do

| Xoá | Lý do |
|---|---|
| 3 `radial-gradient` trên `body` (dòng 18-22) | Làm ảnh sản phẩm bị ngả màu không kiểm soát; `background-attachment: fixed` gây jank khi scroll trên iOS |
| `background-attachment: fixed` | Bug repaint trên Safari iOS, tốn GPU |
| Định nghĩa tay `.line-clamp-2` / `-3` | Tailwind 3.3+ đã built-in |
| Toàn bộ override `.backdrop-blur-*` với `-webkit-` prefix | Autoprefixer đã lo; đây là 40+ dòng CSS chết |
| `position: relative` trên `body` | Không cần, gây containing-block bất ngờ cho `position: fixed` con |

---

## 9. Script verify contrast — `docs/contrast-check.py`

```python
#!/usr/bin/env python3
"""Verify mọi cặp màu semantic đạt WCAG 2.1 AA. Chạy trong CI."""
import re, sys, pathlib

def lum(h):
    h = h.lstrip('#')
    r, g, b = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    l1, l2 = sorted([lum(a), lum(b)], reverse=True)
    return round((l1 + 0.05) / (l2 + 0.05), 2)

CANVAS, SURFACE, SUBTLE = '#FFFBF5', '#FFFFFF', '#FBF4EA'

# (tên, fg, bg, ngưỡng)   ngưỡng 4.5 = body text, 3.0 = non-text/large
CHECKS = [
    ('fg-strong / canvas',        '#241B14', CANVAS,   4.5),
    ('fg-default / canvas',       '#3A2E24', CANVAS,   4.5),
    ('fg-default / surface',      '#3A2E24', SURFACE,  4.5),
    ('fg-default / subtle',       '#3A2E24', SUBTLE,   4.5),
    ('fg-muted / canvas',         '#5A4C3C', CANVAS,   4.5),
    ('fg-subtle / canvas',        '#7A6A56', CANVAS,   4.5),
    ('fg-subtle / surface',       '#7A6A56', SURFACE,  4.5),
    ('brand-fg / canvas',         '#9A3412', CANVAS,   4.5),
    ('accent-fg / canvas',        '#0F766E', CANVAS,   4.5),
    ('success-fg / success-bg',   '#15803D', '#F0FDF4',4.5),
    ('warning-fg / warning-bg',   '#B45309', '#FFFBEB',4.5),
    ('danger-fg / danger-bg',     '#B91C1C', '#FEF2F2',4.5),
    ('info-fg / info-bg',         '#1D4ED8', '#EFF6FF',4.5),
    ('on-brand / brand-bg',       '#FFFFFF', '#C2410C',4.5),
    ('on-brand / brand-hover',    '#FFFFFF', '#9A3412',4.5),
    ('on-accent / accent-bg',     '#FFFFFF', '#0F766E',4.5),
    ('danger-fg-on-solid/solid',  '#FFFFFF', '#B91C1C',4.5),
    ('border-interactive/canvas', '#9D8770', CANVAS,   3.0),
    ('border-interactive/surface','#9D8770', SURFACE,  3.0),
    ('focus-ring / canvas',       '#C2410C', CANVAS,   3.0),
    ('focus-ring / surface',      '#C2410C', SURFACE,  3.0),
]

fails = []
print(f"{'cặp':32} {'ratio':>7} {'cần':>6}  kết quả")
print('-' * 60)
for name, fg, bg, need in CHECKS:
    r = ratio(fg, bg)
    ok = r >= need
    print(f'{name:32} {r:>7} {need:>6}  {"PASS" if ok else "FAIL"}')
    if not ok:
        fails.append((name, r, need))

if fails:
    print(f'\n{len(fails)} cặp FAIL:')
    for n, r, need in fails:
        print(f'  {n}: {r} < {need}')
    sys.exit(1)
print(f'\nTất cả {len(CHECKS)} cặp PASS WCAG 2.1 AA.')
```

Thêm vào CI:

```jsonc
"scripts": {
  "check:contrast": "python3 docs/contrast-check.py"
}
```

---

## 10. Files phải sửa

| File | Việc |
|---|---|
| `frontend/src/styles/tokens.css` | **Thay toàn bộ** — §4 |
| `frontend/tailwind.config.js` | **Thay toàn bộ** — §6 (+ `legacy` alias §7) |
| `frontend/src/index.css` | **Thay toàn bộ** — §8 |
| `frontend/public/fonts/InterVariable.woff2` | **Thêm** — tải từ rsms/inter releases |
| `frontend/public/fonts/BricolageGrotesque.woff2` | **Thêm** — Google Fonts, subset Việt |
| `frontend/index.html` | Xoá `<link>` Google Fonts nếu có; thêm `<link rel="preload" as="font" ...>` cho 2 font trên |
| `frontend/docs/contrast-check.py` | **Thêm** — §9 |
| `frontend/package.json` | Thêm script `check:contrast` |
| `frontend/src/config/seasons.ts` | Đọc lại — seasonal color đang inline hex, chuyển thành reference token (spec 04 §6) |

**Chưa sửa trong spec này:** không file `.tsx` nào. Build sẽ vỡ ở những chỗ dùng màu Tailwind mặc định — đó là kết quả mong đợi, và là input cho spec 02.

---

## 11. Acceptance criteria

- [ ] `npm run check:contrast` → tất cả 21 cặp PASS, exit 0
- [ ] `npx tailwindcss -o /tmp/out.css` chạy không lỗi
- [ ] `grep -c "legacy-" src` được ghi lại làm baseline tiến độ migration admin
- [ ] Trong DevTools, `getComputedStyle(document.body).getPropertyValue('--fg-default')` trả `#3A2E24`
- [ ] Tab qua toàn bộ trang chủ: **mọi** element focus được đều có outline terracotta 2px nhìn thấy rõ
- [ ] `bg-blue-500` trong file `.tsx` → build **fail** (chứng minh guardrail hoạt động)
- [ ] Lighthouse Accessibility trên `/` ghi lại làm baseline (kỳ vọng tăng ở phase sau)
- [ ] Kiểm tra font: mở trang, DevTools → Network → filter Font → đúng 2 file `.woff2`, không có request tới `fonts.googleapis.com`
- [ ] Bật `prefers-reduced-motion` ở OS → không animation nào chạy
- [ ] Đo lại `body` scroll performance trên iOS Safari (hoặc DevTools throttle): không còn jank do `background-attachment: fixed`

---

## TL;DR

- Token cũ fail WCAG ở 4 chỗ. Nặng nhất: `accent-pink` dùng làm error text — **1.64:1**. Cả 3 accent color đều không dùng được làm text (1.48 / 1.64 / 2.40). Focus state chỉ đạt **2.01:1**, dưới ngưỡng 3:1.
- Token mới chia **3 tầng** (primitive → semantic → component). Component chỉ được dùng tầng semantic → đổi brand hay bật dark mode sau này chỉ remap 1 tầng.
- **Ghi đè** `theme.colors` thay vì `extend` → dùng `bg-blue-500` sẽ fail build. Guardrail ở tầng config, không phụ thuộc code review.
- Focus ring khai báo toàn cục ở `:focus-visible` → fix một lượt 52 chỗ `focus:outline-none`.
- Mọi contrast trong spec đã tính bằng công thức WCAG thật, có script `docs/contrast-check.py` để chạy lại trong CI.
- Đổi Playfair Display → Bricolage Grotesque: Playfair là serif high-contrast cho cỡ ≥40px, ở 20-28px nét mảnh bị bệt và dấu tiếng Việt chồng serif.
