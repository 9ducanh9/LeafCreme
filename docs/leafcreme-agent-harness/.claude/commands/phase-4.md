---
description: Thực thi Phase 4 — Catalog
---

# Phase 4 — Catalog

Spec: `docs/ui-redesign/04-catalog-discovery.md` (toàn bộ)
Phase trước: **5** — phải PASS gate trước khi bắt đầu phase này.

---

## Bước 0 — Trước khi viết code

1. Đọc `CLAUDE.md` **toàn bộ**. Luật §1 là cứng.
2. Đọc `docs/ui-redesign/04-catalog-discovery.md`.
3. Đọc `docs/ui-redesign/VERIFICATION.md` §4 — kiểm mọi giả định liên quan phase này.
   **Nếu giả định nào SAI so với code thật: DỪNG, báo, không code tiếp.**
4. Xác nhận `npm run gate:phase5` vẫn PASS.
5. `git checkout -b redesign/phase-4`

---

## Việc phải làm

- [ ] BACKEND B1 TRƯỚC TIÊN: fix FEFO bán lô hết hạn. Test trước, sửa sau (docs/backend-tasks.md §1)
- [ ] BACKEND: GET /{id}/availability + 3 field vào ProductResponse (backend-tasks.md §2) — dùng CHUNG filter với FEFO
- [ ] BACKEND: /products/best-sellers hoặc đổi tên section ở FE (backend-tasks.md §5)
- [ ] utils/inventory.ts + StockSignal (§2.4, §2.5) — ngưỡng max(3, ceil(nguong*0.3))
- [ ] ProductCard mới (§3): stretched link, aspect-ratio, width/height, lazy, StockSignal
- [ ] ProductImage — gom logic onError về 1 chỗ (§3)
- [ ] ProductDetail (§4): sticky add-to-cart mobile + env(safe-area-inset-bottom), ngày giao sớm nhất, RadioGroup biến thể
- [ ] SearchPage 412 → ~90 (§5); filter vào URL với replace:true
- [ ] CategoryListingPage 230 → ~50, dùng ProductListing (§6)
- [ ] HeroBanner tối ưu LCP (§7.1); GiftBox hiện BOM + hạn dùng (§8)

---

## Lưu ý riêng của phase này

- B1 là bug nghiêm trọng nhất tìm được trong cả codebase. Làm nó trước mọi thứ khác trong phase.
- Availability PHẢI dùng cùng điều kiện với alloc_fefo_by_variant, không thì UI hứa số mà không giao được.
- Ngưỡng low-stock dùng max(3,...) chứ không dùng thẳng muc_gioi_han_ton — tín hiệu khan hiếm chỉ được hiện khi THẬT.

---

## Bước cuối

```bash
npm run gate:phase4
```

- Gate ĐỎ → sửa **CODE**, không sửa gate. Chạy lại.
- Gate XANH → viết báo cáo theo mẫu `CLAUDE.md` §5, liệt kê manual check ở `docs/MANUAL-CHECKS.md` §4, rồi **DỪNG**.

**KHÔNG** tự chạy `/phase-6`. Người sẽ chạy manual check rồi mới cho phép.
