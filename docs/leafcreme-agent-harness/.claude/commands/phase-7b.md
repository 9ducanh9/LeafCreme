---
description: Thực thi Phase 7b — Admin VISUAL
---

# Phase 7b — Admin: visual

Spec: `docs/ui-redesign/12-admin-theme.md`, `13-admin-pages.md` §6 §7

**Điều kiện tiên quyết:** phase **1** (token layer) và phase **7a** đều đã PASS gate.

---

## Bước 0

1. Xác nhận `npm run gate:phase1` PASS — theme map sang chính `tokens.css` đó
2. Xác nhận `npm run gate:phase7a` PASS
3. `git checkout -b redesign/phase-7b`

---

## Việc phải làm

- [ ] `admin-tokens.ts` + **test đồng bộ với `tokens.css`** (spec 12 §2.1) — guardrail thật, không phải comment "nhớ sync tay"
- [ ] `createTheme` (spec 12 §2.2): palette, typography `fontSize: 14`, `textTransform: 'none'`, shadow ấm, `viVN`, transition ngắn
- [ ] `styleOverrides` (spec 12 §3) theo thứ tự usage: `MuiTableCell` (204) + `MuiTableRow` (40) trước — đó là 41% công việc
- [ ] **Input `fontSize: '1rem'`** dù body 14px — dưới 16px iOS Safari tự zoom khi focus
- [ ] Viền input dùng `sand500` (3.32:1) — WCAG 1.4.11
- [ ] `AdminShell` với `StyledEngineProvider enableCssLayer` + `ThemeProvider` + `CssBaseline` **chỉ trong admin**
- [ ] Lazy load `AdminShell` — storefront không tải chunk MUI
- [ ] Xoá `sx` theo nhóm (spec 12 §4.1): Table → input → button → surface → chip → Typography. Mục tiêu **< 60**, không phải 0
- [ ] Xoá 471 hex theo bảng map (spec 12 §4.3) — **phân loại text vs background trước**, `#C59B72` (97 chỗ) và `#9B948B` (40 chỗ) đều fail contrast
- [ ] `statusChips.ts` — Chip dùng `color` prop semantic, không hex
- [ ] `chart-colors.ts` với `CHART_COLORS` đã verify (spec 13 §2.4) + `docs/chart-contrast-check.py`
- [ ] Chart: nhãn trực tiếp trên pie, `strokeDasharray` cho line, Accordion bảng dữ liệu, `role="img"`
- [ ] Xoá `legacy-*` khỏi `tailwind.config.js`
- [ ] `AdminLayout` mật độ: `p: 3` → `p: 2.5` desktop, `p: 2` mobile

---

## Lưu ý riêng

- **`#C59B72` (97 chỗ) và `#9B948B` (40 chỗ) đều fail contrast.** KHÔNG sed máy móc sang `primary.main` — sẽ giữ nguyên lỗi. Phân loại `color:` vs `backgroundColor:` trước.
- **`CssBaseline` chỉ bọc admin.** Bọc toàn app sẽ đụng Tailwind preflight và làm storefront lệch.
- **Không hồi quy storefront.** Gate 7b có check `run.mjs 6` và `contrast-check.py`.
- `sx` được giữ: layout trên `Box`, giá trị động, sticky vị trí cụ thể, `maxHeight` container. Không được giữ: bất kỳ `color`/`fontSize`/`borderRadius` giá trị cứng.

---

## Bước cuối

```bash
npm run gate:phase7b
```

Gate xanh → báo cáo + manual check `docs/MANUAL-CHECKS.md` §7b → **DỪNG**.

Đây là phase cuối trước phase 8 (dọn dẹp).
