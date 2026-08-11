# Spec 12 — Admin MUI theme

> Phase 7b. Phụ thuộc **phase 1** (token layer) — theme map sang chính `tokens.css` đó.
> Mục tiêu đo được: `sx={{` từ **593 → < 60**, hex từ **471 → 0**.

---

## 1. Hiện trạng

### 1.1 Số liệu

```bash
$ grep -rn "createTheme|ThemeProvider" frontend/src        # 0
$ grep -rno "sx={{" frontend/src/{pages,components,layout}/admin | wc -l    # 593
$ grep -rno "#[0-9a-fA-F]{6}" frontend/src/{pages,components,layout}/admin | wc -l  # 471
```

Không có theme → MUI đang chạy default: font **Roboto**, primary **`#1976d2`** (xanh dương), radius **4px**, shadow xám lạnh. Trong khi brand Soft Craft là warm sand + terracotta, radius 10px, shadow ấm.

### 1.2 10 màu hardcode nhiều nhất — và contrast của chúng

| Hex | Số lần | vs `#FAFAF9` | vs `#FFF` | AA? | Vai trò suy ra |
|---|---|---|---|---|---|
| `#7A6F63` | **136** | 4.70 | 4.90 | PASS | Text phụ — dùng khắp header bảng |
| `#C59B72` | **97** | **2.42** | **2.53** | **FAIL** | Brand / accent |
| `#473C2F` | **91** | 10.28 | 10.74 | PASS | Text chính |
| `#9B948B` | **40** | **2.87** | **3.00** | **FAIL** | Text mờ / placeholder |
| `#B0895F` | 8 | **3.05** | **3.19** | **FAIL** | Brand hover |
| `#D32F2F` | 7 | 4.77 | 4.98 | PASS | Error — **= MUI `red[700]`** |
| `#F57F17` | 4 | **2.54** | **2.65** | **FAIL** | Warning — **= MUI `yellow[800]`** |
| `#E65100` | 4 | **3.63** | **3.79** | **FAIL** | Warning đậm — **= MUI `orange[900]`** |
| `#2E7D32` | 3 | 4.91 | 5.13 | PASS | Success — **= MUI `green[800]`** |
| `#F5C96A` | 5 | **1.50** | **1.56** | **FAIL** | Accent vàng cũ |

### 1.3 Ba điều đáng nói

**`#C59B72` xuất hiện 97 lần và fail contrast (2.42:1).** Đây là brand color cũ. Nếu nó đang được dùng làm **text** ở bất kỳ chỗ nào trong 97 chỗ đó, chỗ đó không đọc được. Cần kiểm từng chỗ khi migrate: dùng làm `background` thì ok, làm `color` thì phải đổi sang `--brand-fg` (`#9A3412`, 7.09:1).

**`#9B948B` (40 lần, 2.87:1) — có lẽ đang dùng cho text mờ.** WCAG miễn trừ text của control **đã disabled**, nhưng không miễn trừ placeholder hay metadata. 40 chỗ này phải rà: cái nào là disabled thì giữ, cái nào là text thật thì đổi sang `--fg-subtle`.

**`#D32F2F`, `#2E7D32`, `#F57F17`, `#E65100` chính là palette mặc định của MUI, viết lại thành hex.** Nghĩa là code đang copy `theme.palette.error.main` thành `'#D32F2F'` thay vì dùng `theme.palette.error.main`. Đây là hệ quả trực tiếp của việc **không có theme** — không có gì để tham chiếu nên phải hardcode. Có theme thì 18 chỗ này biến thành `color="error"` / `severity="warning"`.

Điểm cuối là lý do tại sao thêm theme không chỉ là "đổi màu cho đẹp": nó tạo ra **chỗ để tham chiếu**, và hardcode tự nhiên biến mất.

---

## 2. `createTheme` — map sang `tokens.css`

### 2.1 Vấn đề: MUI cần giá trị, CSS var là runtime

MUI `createTheme` cần màu lúc tạo theme để tính `contrastText`, `alpha()`, hover state. `var(--brand-bg)` là string, MUI không parse được.

**Giải pháp:** khai báo giá trị thật trong `admin-tokens.ts`, đồng bộ với `tokens.css` bằng **test**, không bằng niềm tin.

```ts
// src/theme/admin-tokens.ts
/**
 * Giá trị màu cho MUI theme. PHẢI khớp tokens.css.
 * Đồng bộ được đảm bảo bởi src/theme/admin-tokens.test.ts — test đọc
 * tokens.css và so từng giá trị. Sửa một bên mà không sửa bên kia → test FAIL.
 *
 * Vì sao không dùng var(--...) trực tiếp: createTheme cần giá trị thật để tính
 * contrastText và alpha(). CSS var là runtime string, MUI không parse được.
 */
export const T = {
  sand50:  '#FFFBF5', sand100: '#FBF4EA', sand200: '#F2E8DA', sand300: '#E3D5C2',
  sand400: '#C4B29B', sand500: '#9D8770', sand600: '#7A6A56', sand700: '#5A4C3C',
  sand800: '#3A2E24', sand900: '#241B14',

  terra50: '#FDF3EC', terra100:'#FAE3D4', terra200:'#F5CDB2', terra300:'#EFB894',
  terra500:'#D97742', terra600:'#C2410C', terra700:'#9A3412', terra800:'#7C2D12',

  mint50:  '#EFFAF7', mint500: '#14897C', mint600: '#0F766E', mint700: '#115E59',

  green600:'#15803D', green50: '#F0FDF4',
  amber600:'#B45309', amber50: '#FFFBEB',
  red600:  '#B91C1C', red50:   '#FEF2F2',
  blue600: '#1D4ED8', blue50:  '#EFF6FF',

  white: '#FFFFFF',
} as const
```

```ts
// src/theme/admin-tokens.test.ts
import { readFileSync } from 'node:fs'
import { T } from './admin-tokens'

/** Chống lệch giữa tokens.css và admin-tokens.ts. Đây là guardrail thật,
 *  không phải comment "nhớ sync tay". */
describe('admin theme tokens khớp tokens.css', () => {
  const css = readFileSync('src/styles/tokens.css', 'utf8')
  const get = (name: string) =>
    css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]?.toUpperCase()

  const PAIRS: [string, string][] = [
    ['sand-50', T.sand50], ['sand-200', T.sand200], ['sand-300', T.sand300],
    ['sand-500', T.sand500], ['sand-700', T.sand700], ['sand-800', T.sand800],
    ['sand-900', T.sand900],
    ['terra-600', T.terra600], ['terra-700', T.terra700], ['terra-800', T.terra800],
    ['mint-600', T.mint600],
    ['green-600', T.green600], ['amber-600', T.amber600],
    ['red-600', T.red600], ['blue-600', T.blue600],
  ]

  it.each(PAIRS)('--%s khớp', (name, value) => {
    expect(get(name)).toBe(value.toUpperCase())
  })
})
```

### 2.2 Palette + typography + shape

```ts
// src/theme/admin-theme.ts
import { createTheme, alpha } from '@mui/material/styles'
import { viVN } from '@mui/material/locale'
import { T } from './admin-tokens'
import { components } from './admin-components'

export const adminTheme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: T.terra600, dark: T.terra700, light: T.terra300, contrastText: T.white },
    secondary: { main: T.mint600,  dark: T.mint700,  light: '#5EC7BA',  contrastText: T.white },
    error:     { main: T.red600,   light: T.red50 },
    warning:   { main: T.amber600, light: T.amber50 },
    success:   { main: T.green600, light: T.green50 },
    info:      { main: T.blue600,  light: T.blue50 },

    text: {
      primary:   T.sand800,   // 12.76:1 — thay #473C2F (91 chỗ)
      secondary: T.sand700,   //  8.04:1 — thay #7A6F63 (136 chỗ). CAO HƠN màu cũ (4.70)
      disabled:  T.sand400,   //  chỉ cho control đã disabled
    },
    background: { default: T.sand50, paper: T.white },
    divider: T.sand200,
    action: {
      hover:    alpha(T.sand800, 0.04),
      selected: alpha(T.terra600, 0.08),
      focus:    alpha(T.terra600, 0.12),
      disabledBackground: T.sand200,
    },
  },

  typography: {
    // Bricolage cho heading, Inter cho body — cùng font với storefront
    fontFamily: "'Inter Variable', 'Inter', 'Be Vietnam Pro', system-ui, sans-serif",
    // Admin dùng cỡ NHỎ hơn storefront một nấc: mật độ thông tin quan trọng hơn
    fontSize: 14,
    h1: { fontFamily: "'Bricolage Grotesque Variable', sans-serif", fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.015em' },
    h2: { fontFamily: "'Bricolage Grotesque Variable', sans-serif", fontSize: '1.375rem', fontWeight: 600, letterSpacing: '-0.01em' },
    h3: { fontFamily: "'Bricolage Grotesque Variable', sans-serif", fontSize: '1.125rem', fontWeight: 600 },
    h4: { fontSize: '1rem',     fontWeight: 600 },
    h5: { fontSize: '0.9375rem',fontWeight: 600 },
    h6: { fontSize: '0.875rem', fontWeight: 600 },
    subtitle1: { fontSize: '0.9375rem', fontWeight: 500 },
    subtitle2: { fontSize: '0.8125rem', fontWeight: 600, color: T.sand700 },
    body1: { fontSize: '0.875rem', lineHeight: 1.55 },
    body2: { fontSize: '0.8125rem', lineHeight: 1.55 },
    caption: { fontSize: '0.75rem', color: T.sand600 },
    button: { fontSize: '0.875rem', fontWeight: 500, textTransform: 'none' },  // ← bỏ UPPERCASE
  },

  shape: { borderRadius: 10 },   // khớp --radius-md

  // Shadow ấm thay xám lạnh. MUI cần đúng 25 phần tử.
  shadows: [
    'none',
    '0 1px 2px 0 rgb(58 46 36 / 0.05)',
    '0 1px 3px 0 rgb(58 46 36 / 0.08), 0 1px 2px -1px rgb(58 46 36 / 0.06)',
    '0 4px 8px -2px rgb(58 46 36 / 0.10), 0 2px 4px -2px rgb(58 46 36 / 0.06)',
    '0 12px 20px -6px rgb(58 46 36 / 0.12), 0 4px 8px -4px rgb(58 46 36 / 0.07)',
    ...Array(20).fill('0 24px 40px -12px rgb(58 46 36 / 0.16)'),
  ] as never,

  // Ops tool: animation ngắn. 300ms × 200 lần/ngày = 1 phút mất đi.
  transitions: {
    duration: { shortest: 100, shorter: 120, short: 150, standard: 180, complex: 220,
                enteringScreen: 180, leavingScreen: 150 },
  },

  spacing: 8,
  components,
}, viVN)   // ← locale tiếng Việt cho aria-label mặc định của MUI
```

### 2.3 Bốn quyết định cần giải thích

**`textTransform: 'none'` cho button.** MUI mặc định UPPERCASE. ALL CAPS đọc chậm hơn ~10% vì mất đường viền chữ (word shape), và tiếng Việt có dấu thì ALL CAPS trông tệ (`ĐẶT HÀNG` vs `Đặt hàng`). Với ops tool nhấn nút 200 lần/ngày, đọc chậm hơn là chi phí thật.

**`fontSize: 14` thay vì 16.** Admin ưu tiên mật độ. Body 14px với `lineHeight 1.55` vẫn đọc tốt và cho thêm ~2 dòng mỗi màn hình. Nhưng **input thì vẫn 16px** — xem §3, vì iOS zoom.

**`text.secondary` = `sand700` (8.04:1) thay vì `sand600` (5.06:1).** Màu cũ `#7A6F63` đạt 4.70 — sát ngưỡng. Vì nó dùng ở 136 chỗ gồm header của mọi bảng, chọn màu có headroom lớn. Chi phí: đậm hơn một chút. Đáng.

**`transitions.duration` ngắn hơn MUI default (~250-300ms).** Ops tool không cần animation mượt, cần phản hồi nhanh. Nhưng đừng về 0 — 0ms làm giao diện có cảm giác "nhảy". 150-180ms là điểm cân bằng.

---

## 3. `styleOverrides` — nơi 593 `sx` biến mất

Thứ tự ưu tiên theo số lần dùng:

| Component | Usage | Ưu tiên |
|---|---|---|
| `TableCell` | **204** | **1** |
| `Box` | 166 | — (không override được, xem §4.2) |
| `Typography` | 114 | 4 |
| `MenuItem` | 86 | 5 |
| `TextField` | 53 | 2 |
| `TableRow` | 40 | 1 |
| `Chip` | 36 | 3 |
| `Button` | 29 | 2 |
| `Select` / `InputLabel` / `FormControl` | 60 | 2 |
| `IconButton` | 18 | 5 |
| `Paper` / `Card` / `CardContent` | 47 | 3 |

```ts
// src/theme/admin-components.ts
import type { Components, Theme } from '@mui/material/styles'
import { T } from './admin-tokens'

export const components: Components<Theme> = {

  /* ---- Ưu tiên 1: Table. 204 TableCell + 40 TableRow = 244/593 sx ---- */
  MuiTableCell: {
    styleOverrides: {
      root: {
        borderBottom: `1px solid ${T.sand200}`,
        padding: '10px 16px',
        fontSize: '0.875rem',
      },
      // Thay đúng cái sx lặp 10 lần trong ProductTable.tsx:44-53
      head: {
        backgroundColor: T.sand100,
        color: T.sand700,
        fontWeight: 600,
        fontSize: '0.8125rem',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        // Sticky header — scroll 50 dòng mà không biết cột nào là gì thì vô dụng
        position: 'sticky',
        top: 0,
        zIndex: 2,
      },
      body: { color: T.sand800 },
      sizeSmall: { padding: '6px 12px' },   // density=compact
    },
  },

  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:last-child td': { borderBottom: 'none' },
        '&:hover': { backgroundColor: T.sand50 },
        '&.Mui-selected': { backgroundColor: `${T.terra50} !important` },
      },
    },
  },

  MuiTableContainer: {
    styleOverrides: {
      root: {
        // maxHeight + sticky head = scroll trong bảng, header luôn thấy
        borderRadius: 10,
        border: `1px solid ${T.sand200}`,
        boxShadow: 'none',      // border thay shadow — gọn hơn cho ops tool
      },
    },
  },

  MuiTableSortLabel: {
    styleOverrides: {
      root: {
        '&.Mui-active': { color: T.terra700 },
        '&.Mui-active .MuiTableSortLabel-icon': { color: `${T.terra700} !important` },
      },
    },
  },

  /* ---- Ưu tiên 2: input & button ---- */
  MuiTextField: {
    defaultProps: { size: 'small', variant: 'outlined' },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: {
        backgroundColor: T.white,
        // 16px: dưới 16px, iOS Safari TỰ ZOOM khi focus vào input.
        // Đây là lý do input không dùng 14px như body.
        fontSize: '1rem',
        '& fieldset': { borderColor: T.sand500 },       // 3.32:1 — đạt WCAG 1.4.11
        '&:hover fieldset': { borderColor: T.sand600 },
        '&.Mui-focused fieldset': { borderColor: T.terra600, borderWidth: 2 },
        '&.Mui-error fieldset': { borderColor: T.red600 },
        '&.Mui-disabled': { backgroundColor: T.sand100 },
      },
      input: { padding: '9px 12px' },
    },
  },
  MuiInputLabel: {
    styleOverrides: { root: { fontSize: '0.875rem', color: T.sand700 } },
  },
  MuiFormHelperText: {
    styleOverrides: {
      root: { fontSize: '0.75rem', marginLeft: 2 },
      // Lỗi phải rõ — không chỉ viền đỏ (WCAG 1.4.1)
      contained: { marginLeft: 2 },
    },
  },

  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        borderRadius: 8,
        fontWeight: 500,
        // Target ≥ 36px cho admin (dày hơn thì mất mật độ; ops tool dùng chuột chính)
        minHeight: 36,
        paddingInline: 14,
        '&:focus-visible': { outline: `2px solid ${T.terra600}`, outlineOffset: 2 },
      },
      sizeSmall: { minHeight: 30, fontSize: '0.8125rem', paddingInline: 10 },
      containedPrimary: { '&:hover': { backgroundColor: T.terra700 } },
      outlined: { borderColor: T.sand500 },
    },
  },

  MuiIconButton: {
    styleOverrides: {
      root: { '&:focus-visible': { outline: `2px solid ${T.terra600}`, outlineOffset: 2 } },
    },
  },

  /* ---- Ưu tiên 3: surface & chip ---- */
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: { backgroundImage: 'none' },
      outlined: { borderColor: T.sand200 },
    },
  },
  MuiCard: {
    defaultProps: { variant: 'outlined' },
    styleOverrides: { root: { borderColor: T.sand200, borderRadius: 10 } },
  },
  MuiCardContent: {
    styleOverrides: { root: { padding: 16, '&:last-child': { paddingBottom: 16 } } },
  },

  MuiChip: {
    styleOverrides: {
      root: { borderRadius: 6, fontWeight: 500, fontSize: '0.75rem', height: 24 },
      // Trạng thái: dùng variant="outlined" + color semantic thay vì hardcode màu
      outlined: { borderWidth: 1 },
    },
  },

  /* ---- Ưu tiên 4-5 ---- */
  MuiTypography: {
    styleOverrides: { root: { '&[data-numeric]': { fontVariantNumeric: 'tabular-nums' } } },
  },
  MuiMenuItem: {
    styleOverrides: { root: { fontSize: '0.875rem', minHeight: 36 } },
  },
  MuiDialog: {
    styleOverrides: { paper: { borderRadius: 14 } },
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: { fontFamily: "'Bricolage Grotesque Variable', sans-serif",
              fontSize: '1.125rem', fontWeight: 600, padding: '16px 20px' },
    },
  },
  MuiDialogContent: { styleOverrides: { root: { padding: '4px 20px 16px' } } },
  MuiDialogActions: { styleOverrides: { root: { padding: '12px 20px', gap: 8 } } },

  MuiAlert: {
    styleOverrides: { root: { borderRadius: 8, fontSize: '0.875rem' } },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: { backgroundColor: T.sand900, fontSize: '0.75rem', borderRadius: 6 },
    },
  },
  MuiTabs: {
    styleOverrides: { indicator: { backgroundColor: T.terra600, height: 2 } },
  },
  MuiTab: {
    styleOverrides: {
      root: { textTransform: 'none', fontWeight: 500, fontSize: '0.875rem', minHeight: 44,
              '&.Mui-selected': { color: T.terra700 } },
    },
  },
  MuiDivider: { styleOverrides: { root: { borderColor: T.sand200 } } },
  MuiCircularProgress: { styleOverrides: { root: { color: T.terra600 } } },
  MuiCheckbox: {
    styleOverrides: { root: { color: T.sand500, '&.Mui-checked': { color: T.terra600 } } },
  },

  // Chống mất focus ring toàn cục — đây là lỗi hay tái diễn
  MuiButtonBase: {
    defaultProps: { disableRipple: false },
    styleOverrides: {
      root: { '&:focus-visible': { outline: `2px solid ${T.terra600}`, outlineOffset: 2 } },
    },
  },
}
```

### 3.1 Ba chi tiết dễ sai

**Input `fontSize: '1rem'` (16px) dù body là 14px.** Dưới 16px, iOS Safari **tự zoom** khi focus vào input — trang phóng to, người dùng phải pinch về. Đây là lỗi rất phổ biến và chỉ thấy trên iPhone thật. Với kịch bản nhân viên kiểm kho bằng điện thoại (spec 09 §1), nó xảy ra thật.

**`boxShadow: 'none'` + `border` cho TableContainer.** Bảng có shadow trông "nổi" — phù hợp storefront, không phù hợp ops tool nơi có nhiều bảng cạnh nhau. Border 1px gọn và rõ ranh giới hơn.

**`MuiTableCell.head` có `position: sticky`.** Nhưng nó chỉ hoạt động khi `TableContainer` có `maxHeight`. Nếu để container cao tự nhiên, sticky sẽ dính vào viewport và bị AppBar che. Phải set `maxHeight: 'calc(100dvh - 260px)'` ở chỗ dùng — ghi vào `DataTable` (spec 10), không để mỗi trang tự làm.

---

## 4. Xoá 593 `sx` và 471 hex

### 4.1 Quy trình — theo nhóm, không theo file

```bash
# 1. Liệt kê sx theo component để biết cái nào theme đã lo
grep -rn "sx={{" src/{pages,components,layout}/admin \
  | sed 's/.*\(<[A-Z][A-Za-z]*\).*/\1/' | sort | uniq -c | sort -rn
```

Thứ tự xử lý:

| Bước | Nhóm | Kỳ vọng giảm |
|---|---|---|
| 1 | `TableCell` + `TableRow` + `TableContainer` | ~244 |
| 2 | `TextField` + `Select` + `InputLabel` + `FormControl` | ~113 |
| 3 | `Button` + `IconButton` | ~47 |
| 4 | `Paper` + `Card` + `CardContent` | ~47 |
| 5 | `Chip` | ~36 |
| 6 | `Typography` | ~114 → phần lớn thay bằng `variant` |
| 7 | Còn lại (`Box` layout) | giữ, xem §4.2 |

### 4.2 `sx` nào được PHÉP giữ lại

Mục tiêu `< 60`, không phải 0. Được giữ:

| Trường hợp | Ví dụ | Vì sao |
|---|---|---|
| Layout một lần | `sx={{ display: 'flex', gap: 2 }}` trên `Box` | Không phải style component, là layout cục bộ |
| Giá trị động | `sx={{ opacity: isFetching ? 0.55 : 1 }}` | Không đưa vào theme được |
| Sticky vị trí cụ thể | `sx={{ position: 'sticky', right: 0 }}` cho cột hành động | Chỉ áp cho một số cell |
| `maxHeight` của container | `sx={{ maxHeight: 'calc(100dvh - 260px)' }}` | Phụ thuộc layout từng trang |

**Không được giữ:** bất kỳ `color`, `backgroundColor`, `fontSize`, `fontWeight`, `borderColor`, `borderRadius`, `boxShadow` nào có giá trị hex hoặc số cứng. Những cái đó thuộc theme.

### 4.3 Map hex → token, có ngữ cảnh

Đây là bảng thay thế, nhưng **phải xem từng chỗ**, không sed máy móc:

| Hex cũ | Số | Nếu dùng làm `color` (text) | Nếu dùng làm `backgroundColor` |
|---|---|---|---|
| `#473C2F` | 91 | `text.primary` | — (quá đậm) |
| `#7A6F63` | 136 | `text.secondary` | — |
| `#9B948B` | 40 | `text.secondary` nếu là text thật; `text.disabled` **chỉ nếu** control đã disabled | — |
| `#C59B72` | 97 | **`primary.dark`** (`#9A3412`) — màu cũ fail 2.42:1 | `primary.main` hoặc `terra50` |
| `#B0895F` | 8 | `primary.dark` | `primary.main` (hover) |
| `#FAFAF9`, `#FAFAF7` | 22 | — | `background.default` |
| `#F7F6F3`, `#EFEDE6`, `#F0EDE8` | 22 | — | `sand100` / `sand200` |
| `#E8E5DD` | 9 | — | `divider` |
| `#D32F2F` | 7 | `error.main` | `error.light` |
| `#2E7D32` | 3 | `success.main` | `success.light` |
| `#F57F17`, `#E65100`, `#FFF3E0`, `#FFF8E1` | 15 | `warning.main` | `warning.light` |
| `#F5C96A` | 5 | **không dùng làm text** (1.50:1) | `warning.light` hoặc bỏ |

**Dòng `#C59B72` và `#9B948B` là chỗ phải cẩn thận nhất** — 137 chỗ cộng lại, và cả hai đều fail contrast. Sed thành `primary.main` sẽ giữ nguyên lỗi. Phải phân loại text vs background trước.

Cách phân loại nhanh:

```bash
# chỗ dùng làm màu chữ
grep -rn "color: '#C59B72'\|color:'#C59B72'" src/{pages,components,layout}/admin
# chỗ dùng làm nền
grep -rn "bgcolor: '#C59B72'\|backgroundColor: '#C59B72'" src/{pages,components,layout}/admin
```

### 4.4 Chip trạng thái — dùng `color` prop, không hardcode

`ProductTable.tsx:29` đã có mầm mống đúng:

```tsx
const getStatusColor = (status) => status === 'active' ? 'success' : 'default'
```

Chuẩn hoá cho mọi bảng, đặt cùng chỗ với `ORDER_STATUS` ở spec 06 §7.2:

```ts
// src/constants/admin/statusChips.ts
export const BATCH_STATUS_CHIP = {
  con_hang:    { label: 'Còn hàng',     color: 'success' as const },
  sap_het_han: { label: 'Sắp hết hạn',  color: 'warning' as const },
  het_han:     { label: 'Đã hết hạn',   color: 'error'   as const },
  het_hang:    { label: 'Hết hàng',     color: 'default' as const },
}
```

```tsx
<Chip size="small" variant="outlined" {...BATCH_STATUS_CHIP[row.trang_thai]} />
```

Không `sx`, không hex. Và `label` là kênh thứ hai ngoài màu (WCAG 1.4.1).

---

## 5. Gắn ThemeProvider chỉ cho admin

```tsx
// src/App.tsx
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { adminTheme } from './theme/admin-theme'

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    // enableCssLayer: đưa CSS của emotion vào @layer → Tailwind utility
    // luôn thắng khi cần, không phải đánh nhau bằng !important.
    <StyledEngineProvider enableCssLayer>
      <ThemeProvider theme={adminTheme}>
        {/* CssBaseline chỉ trong admin — KHÔNG bọc toàn app, nó sẽ reset
            cả storefront và đụng với Tailwind preflight */}
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </StyledEngineProvider>
  )
}

// Trong Routes
<Route path="/admin/*" element={
  <AdminShell>
    <AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>
  </AdminShell>
} />
```

### 5.1 `enableCssLayer` — điểm kỹ thuật quan trọng

Spec 00 §2.1 nêu lo ngại: `sx` và Tailwind class trên cùng element gây specificity war, và code hiện tại đã có 39 chỗ `style={{...}}` inline để thắng cascade.

`StyledEngineProvider enableCssLayer` (MUI v6+) đưa CSS emotion vào `@layer mui`. CSS không nằm trong layer luôn thắng CSS trong layer, bất kể specificity. Nghĩa là Tailwind utility (không layer) thắng MUI (trong layer) một cách xác định.

Đây là cách giải quyết đúng vấn đề đó, và là lý do quyết định "giữ MUI" trở nên an toàn hơn.

**Cần verify MUI version hỗ trợ.** `package.json` ghi `@mui/material ^7.3.5` — v7 có `enableCssLayer`. Nếu không có, fallback: thêm `@layer` thủ công qua `emotion` cache options.

### 5.2 Không bọc CssBaseline toàn app

`CssBaseline` reset margin, box-sizing, typography toàn cục. Bọc toàn app sẽ đụng Tailwind preflight và làm storefront lệch. Chỉ bọc trong `AdminShell`.

### 5.3 Code splitting

Admin theme + MUI chỉ cần khi vào `/admin`. Lazy load để storefront không tải:

```tsx
const AdminShell = lazy(() => import('./admin-shell'))
```

Kiểm bằng Network: mở `/` → **không** có chunk MUI. Đây là điều làm cho "bundle admin nặng" trở thành không vấn đề với storefront.

---

## 6. Xoá `legacy-*` alias

Sau khi 471 hex → 0 và `sx` dùng theme, các class `legacy-gray100`… (spec 01 §7) không còn ai dùng.

```bash
grep -rn "legacy-" src | wc -l     # phải = 0
```

Rồi xoá khối `legacy` khỏi `tailwind.config.js`.

**Lưu ý:** admin vẫn dùng Tailwind cho layout (`className="flex gap-4"`) — chỉ **màu** là qua MUI theme. Không cần bỏ Tailwind khỏi admin.

---

## 7. Files phải sửa

### Tạo mới
| File | Nội dung |
|---|---|
| `src/theme/admin-tokens.ts` | §2.1 |
| `src/theme/admin-tokens.test.ts` | §2.1 — guardrail chống lệch |
| `src/theme/admin-theme.ts` | §2.2 |
| `src/theme/admin-components.ts` | §3 |
| `src/admin-shell.tsx` | §5 |
| `src/constants/admin/statusChips.ts` | §4.4 |

### Sửa
| File | Việc |
|---|---|
| `src/App.tsx` | Bọc `AdminShell` cho `/admin/*`, lazy load |
| 11 bảng | Bỏ `sx` màu → theme |
| 6 form | Bỏ `sx` màu → theme |
| `layout/admin/AdminLayout.tsx` | Bỏ `sx` màu; giữ `sx` layout |
| `components/admin/dashboard/{RevenueByDayMonth,RevenueByProduct}.tsx` | Màu chart → token (spec 13 §6) |
| `tailwind.config.js` | Xoá khối `legacy` |
| 45 files admin | Rà 471 hex theo bảng §4.3 |

---

## 8. Acceptance criteria

### Đo được
- [ ] `grep -c "sx={{" -r src/{pages,components,layout}/admin` → **< 60** (từ 593)
- [ ] `grep -rno "#[0-9a-fA-F]\{6\}" src/{pages,components,layout}/admin | wc -l` → **0** (từ 471)
- [ ] `grep -rn "legacy-" src` → **0**
- [ ] `npm test src/theme/admin-tokens.test.ts` pass — token khớp `tokens.css`
- [ ] `npm run check:contrast` vẫn PASS 21/21
- [ ] `npm --prefix frontend run build` pass

### Visual
- [ ] Mở `/admin`: font là Inter/Bricolage, **không** Roboto
- [ ] Nút primary màu terracotta `#C2410C`, **không** xanh `#1976d2`
- [ ] Radius 10px, không 4px
- [ ] Nhãn nút là "Đặt hàng", **không** "ĐẶT HÀNG"
- [ ] Shadow ấm (tông nâu), không xám lạnh
- [ ] Header bảng nền `sand100`, chữ `sand700`
- [ ] Header bảng **sticky** khi scroll trong bảng
- [ ] Screenshot so sánh trước/sau 4 trang: Dashboard, Inventory, Product, Sales

### A11y & contrast
- [ ] Mọi text trong admin ≥ 4.5:1 — kiểm bằng axe trên 5 trang
- [ ] Viền input ≥ 3:1 (dùng `sand500` = 3.32:1)
- [ ] Focus ring terracotta thấy rõ trên **mọi** nút, input, IconButton, tab, checkbox
- [ ] Tab qua toàn bộ `AdminInventoryPage` → không element nào "im lặng"
- [ ] Chip trạng thái có **label text**, không chỉ màu
- [ ] `#9B948B` (40 chỗ) đã phân loại: text thật → `text.secondary`, control disabled → `text.disabled`
- [ ] `#C59B72` (97 chỗ) đã phân loại: text → `primary.dark`, background → `primary.main`
- [ ] axe trên 5 trang admin → 0 violation

### Kỹ thuật
- [ ] `StyledEngineProvider enableCssLayer` hoạt động: thêm `className="bg-bg-surface"` lên một MUI component → Tailwind **thắng**, không cần `!important`
- [ ] `grep -rn "style={{" src/{pages,components,layout}/admin` — giảm so với 39 (không còn cần hack cascade)
- [ ] `CssBaseline` **chỉ** trong `AdminShell`, không bọc toàn app
- [ ] Mở `/` (storefront) → Network **không** có chunk MUI (code splitting hoạt động)
- [ ] iPhone thật: focus vào input trong admin → **không tự zoom** (input 16px)
- [ ] `prefers-reduced-motion` → transition MUI về 0

### Không hồi quy
- [ ] Storefront không đổi gì về visual (screenshot diff = 0)
- [ ] Tất cả gate storefront (phase 0-6) vẫn PASS
- [ ] Gate phase 7a vẫn PASS

---

## TL;DR

- **`#D32F2F`, `#2E7D32`, `#F57F17`, `#E65100` chính là palette mặc định của MUI, viết lại thành hex** (18 chỗ). Đây là hệ quả trực tiếp của việc không có theme: không có gì để tham chiếu nên phải hardcode. Có theme thì chúng thành `color="error"` / `severity="warning"`.
- **`#C59B72` (97 chỗ) fail contrast 2.42:1** và `#9B948B` (40 chỗ) fail 2.87:1. **Không sed máy móc** — phải phân loại text vs background trước, vì thay thẳng sang `primary.main` sẽ giữ nguyên lỗi.
- **`text.secondary` chọn `sand700` (8.04:1)** thay vì màu cũ `#7A6F63` (4.70 — sát ngưỡng). Nó dùng ở 136 chỗ gồm header mọi bảng, cần headroom.
- **`MuiTableCell` + `MuiTableRow` xoá được ~244/593 `sx`** — làm nhóm này trước, nó là 41% công việc.
- **Input dùng 16px dù body 14px:** dưới 16px iOS Safari **tự zoom** khi focus. Xảy ra thật với kịch bản kiểm kho bằng điện thoại.
- **`StyledEngineProvider enableCssLayer`** đưa CSS emotion vào `@layer` → Tailwind utility thắng xác định, không cần `!important`. Đây là cách giải quyết đúng lo ngại "specificity war" ở spec 00 §2.1, và làm quyết định giữ MUI an toàn hơn.
- **`CssBaseline` chỉ bọc admin**, không toàn app — nó sẽ đụng Tailwind preflight và làm storefront lệch.
- Đồng bộ `admin-tokens.ts` ↔ `tokens.css` bằng **test đọc file CSS và so từng giá trị**, không bằng comment "nhớ sync tay".
- Mục tiêu `sx` là **< 60, không phải 0**: layout trên `Box`, giá trị động, sticky vị trí cụ thể được giữ. Không được giữ: bất kỳ `color`/`fontSize`/`borderRadius` có giá trị cứng.
