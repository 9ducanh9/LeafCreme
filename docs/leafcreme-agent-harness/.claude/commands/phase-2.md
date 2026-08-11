---
description: Thực thi Phase 2 — Primitives
---

# Phase 2 — Primitives

Spec: `docs/ui-redesign/02-primitives.md` (toàn bộ + spec 07 §2)
Phase trước: **1** — phải PASS gate trước khi bắt đầu phase này.

---

## Bước 0 — Trước khi viết code

1. Đọc `CLAUDE.md` **toàn bộ**. Luật §1 là cứng.
2. Đọc `docs/ui-redesign/02-primitives.md`.
3. Đọc `docs/ui-redesign/VERIFICATION.md` §4 — kiểm mọi giả định liên quan phase này.
   **Nếu giả định nào SAI so với code thật: DỪNG, báo, không code tiếp.**
4. Xác nhận `npm run gate:phase1` vẫn PASS.
5. `git checkout -b redesign/phase-2`

---

## Việc phải làm

- [ ] Tạo 27 primitive trong src/components/ui/ theo spec 02 §2 — code mẫu có sẵn ở §3-§9, dùng nó
- [ ] legacy-modal.tsx adapter giữ API Modal/ConfirmDialog cũ (§2)
- [ ] Barrel mới + alias @deprecated (§2) — page cũ PHẢI còn build được
- [ ] State component: skeleton, empty-state, alert (spec 07 §2)
- [ ] ErrorBoundary 3 tầng (spec 07 §2.5) — app, route, widget
- [ ] ToastContext đổi ruột sang Radix Toast, GIỮ chữ ký useToast()
- [ ] Rename file sang kebab-case — 2 BƯỚC (CLAUDE.md §3.2)

---

## Lưu ý riêng của phase này

- Nếu phase quá lớn: chia 2 nửa. Nửa (a) button/input/card/badge/dialog/drawer đủ cho phase 3.
- Alias @deprecated là thứ làm a11y fix có hiệu lực NGAY, không phải chờ phase 6. Đừng bỏ.
- Rename 1 bước trên Windows/macOS bị git bỏ qua → CI Linux vỡ. Nhớ 2 bước.

---

## Bước cuối

```bash
npm run gate:phase2
```

- Gate ĐỎ → sửa **CODE**, không sửa gate. Chạy lại.
- Gate XANH → viết báo cáo theo mẫu `CLAUDE.md` §5, liệt kê manual check ở `docs/MANUAL-CHECKS.md` §2, rồi **DỪNG**.

**KHÔNG** tự chạy `/phase-3`. Người sẽ chạy manual check rồi mới cho phép.
