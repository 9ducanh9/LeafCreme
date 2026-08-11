---
description: Thực thi Phase 1 — Design tokens
---

# Phase 1 — Design tokens

Spec: `docs/ui-redesign/01-design-tokens.md` (toàn bộ)
Phase trước: **0** — phải PASS gate trước khi bắt đầu phase này.

---

## Bước 0 — Trước khi viết code

1. Đọc `CLAUDE.md` **toàn bộ**. Luật §1 là cứng.
2. Đọc `docs/ui-redesign/01-design-tokens.md`.
3. Đọc `docs/ui-redesign/VERIFICATION.md` §4 — kiểm mọi giả định liên quan phase này.
   **Nếu giả định nào SAI so với code thật: DỪNG, báo, không code tiếp.**
4. Xác nhận `npm run gate:phase0` vẫn PASS.
5. `git checkout -b redesign/phase-1`

---

## Việc phải làm

- [ ] Thay src/styles/tokens.css (§4) — kiến trúc 3 tầng, dùng ĐÚNG hex trong spec
- [ ] Thay tailwind.config.js (§6) — GHI ĐÈ theme.colors, KHÔNG dùng extend
- [ ] Thay src/index.css (§8) — bỏ radial-gradient, bỏ background-attachment:fixed, thêm :focus-visible toàn cục, .skip-link
- [ ] Self-host 2 variable font vào public/fonts, subset Việt; sửa index.html (preload, bỏ Google Fonts)
- [ ] Thêm alias legacy-* cho admin (§7)
- [ ] Chạy `node scripts/gate/probe.mjs legacy-colors` để lấy danh sách, rồi map: admin → legacy-*, storefront → token semantic

---

## Lưu ý riêng của phase này

- BUILD SẼ VỠ giữa phase. Đó là ĐÚNG — xem CLAUDE.md §2.
- TUYỆT ĐỐI KHÔNG đổi colors sang extend, KHÔNG thêm hex vào component, KHÔNG dùng legacy-* cho storefront.
- Hết phase app sẽ trông XẤU HƠN (component chưa cập nhật). Bình thường. Đừng vá.

---

## Bước cuối

```bash
npm run gate:phase1
```

- Gate ĐỎ → sửa **CODE**, không sửa gate. Chạy lại.
- Gate XANH → viết báo cáo theo mẫu `CLAUDE.md` §5, liệt kê manual check ở `docs/MANUAL-CHECKS.md` §1, rồi **DỪNG**.

**KHÔNG** tự chạy `/phase-2`. Người sẽ chạy manual check rồi mới cho phép.
