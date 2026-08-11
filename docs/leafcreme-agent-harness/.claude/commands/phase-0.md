---
description: Thực thi Phase 0 — Chuẩn bị
---

# Phase 0 — Chuẩn bị

Spec: `docs/ui-redesign/00-audit-and-strategy.md` (§2.3, §2.5, §3, §4)
Phase đầu tiên.

---

## Bước 0 — Trước khi viết code

1. Đọc `CLAUDE.md` **toàn bộ**. Luật §1 là cứng.
2. Đọc `docs/ui-redesign/00-audit-and-strategy.md`.
3. Đọc `docs/ui-redesign/VERIFICATION.md` §4 — kiểm mọi giả định liên quan phase này.
   **Nếu giả định nào SAI so với code thật: DỪNG, báo, không code tiếp.**

5. `git checkout -b redesign/phase-0`

---

## Việc phải làm

- [ ] Thêm 15 dependency (spec 00 §2.3) — KHÔNG thêm gì ngoài danh sách
- [ ] ESLint no-restricted-imports + override cho admin (spec 00 §2.5)
- [ ] Xoá dead code: LayoutShell.tsx, SectionContainer.tsx, SectionHeader.tsx + export trong barrel
- [ ] Tạo src/lib/cn.ts (spec 00 §3)
- [ ] Cài vitest + vitest-axe + @testing-library/react
- [ ] Thêm scripts gate:*/check:* vào package.json — dùng đúng bản ở INSTALL.md §2
- [ ] GHI BASELINE vào docs/ui-baseline.md: bundle gzip, Lighthouse 4 trang, số hex, số focus:outline-none, commit hash

---

## Lưu ý riêng của phase này

- Baseline là bắt buộc, không phải thủ tục. Không có nó thì không chứng minh được migration cải thiện gì.
- Chưa sửa file .tsx nào trong phase này.

---

## Bước cuối

```bash
npm run gate:phase0
```

- Gate ĐỎ → sửa **CODE**, không sửa gate. Chạy lại.
- Gate XANH → viết báo cáo theo mẫu `CLAUDE.md` §5, liệt kê manual check ở `docs/MANUAL-CHECKS.md` §0, rồi **DỪNG**.

**KHÔNG** tự chạy `/phase-1`. Người sẽ chạy manual check rồi mới cho phép.
