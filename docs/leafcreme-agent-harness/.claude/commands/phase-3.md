---
description: Thực thi Phase 3 — Layout + Nav — FIX P0
---

# Phase 3 — Layout + Nav — FIX P0

Spec: `docs/ui-redesign/03-layout-navigation.md` (toàn bộ)
Phase trước: **2** — phải PASS gate trước khi bắt đầu phase này.

---

## Bước 0 — Trước khi viết code

1. Đọc `CLAUDE.md` **toàn bộ**. Luật §1 là cứng.
2. Đọc `docs/ui-redesign/03-layout-navigation.md`.
3. Đọc `docs/ui-redesign/VERIFICATION.md` §4 — kiểm mọi giả định liên quan phase này.
   **Nếu giả định nào SAI so với code thật: DỪNG, báo, không code tiếp.**
4. Xác nhận `npm run gate:phase2` vẫn PASS.
5. `git checkout -b redesign/phase-3`

---

## Việc phải làm

- [ ] MOBILE NAV DRAWER (§3.2) — đây là bug P0 của cả project, làm cái này trước tiên
- [ ] Header mới (§3.3) — bỏ getBoundingClientRect + 2 scroll listener, Radix Popper lo
- [ ] Footer mới (§7) — <Link> thay <a href>, bỏ href=#menu, năm động, thêm SĐT tel:
- [ ] Container / Section / SectionHeader / ProductGrid (§2)
- [ ] Skip link + landmark + useRouteAnnouncer (§4) — main PHẢI có tabIndex={-1}
- [ ] Bỏ ProductDropdown → mega-menu Popover (§6)
- [ ] Bỏ FloatingEmojiOverlay (§1.7); sửa config/seasons.ts bỏ decoration
- [ ] Thay 34 chỗ max-w-[1440px] bằng <Container> (§9)

---

## Lưu ý riêng của phase này

- Phase ROI cao nhất. Dưới 1024px hiện tại /gift-boxes KHÔNG có đường vào nào.
- Container giảm 1440 → 1280: 1440px cho dòng text ~180 ký tự, quá rộng để đọc.
- Product grid mobile để 2 CỘT, không 1.

---

## Bước cuối

```bash
npm run gate:phase3
```

- Gate ĐỎ → sửa **CODE**, không sửa gate. Chạy lại.
- Gate XANH → viết báo cáo theo mẫu `CLAUDE.md` §5, liệt kê manual check ở `docs/MANUAL-CHECKS.md` §3, rồi **DỪNG**.

**KHÔNG** tự chạy `/phase-5`. Người sẽ chạy manual check rồi mới cho phép.
