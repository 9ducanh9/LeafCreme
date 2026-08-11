---
description: Thực thi Phase 5 — Cart + Checkout
---

# Phase 5 — Cart + Checkout

Spec: `docs/ui-redesign/05-cart-checkout.md` (toàn bộ)
Phase trước: **3** — phải PASS gate trước khi bắt đầu phase này.

---

## Bước 0 — Trước khi viết code

1. Đọc `CLAUDE.md` **toàn bộ**. Luật §1 là cứng.
2. Đọc `docs/ui-redesign/05-cart-checkout.md`.
3. Đọc `docs/ui-redesign/VERIFICATION.md` §4 — kiểm mọi giả định liên quan phase này.
   **Nếu giả định nào SAI so với code thật: DỪNG, báo, không code tiếp.**
4. Xác nhận `npm run gate:phase3` vẫn PASS.
5. `git checkout -b redesign/phase-5`

---

## Việc phải làm

- [ ] FIX BUG 1 (§2): thứ tự clearCart / toast / navigate. Payment fail phải điều hướng tới trang đơn hàng, không để ở lại checkout
- [ ] FIX BUG 2 (§2): idempotency key — FE sinh 1 lần bằng useMemo, BE xử lý (docs/backend-tasks.md §3)
- [ ] FIX BUG 3 (§2): validation trả object lỗi theo field, validate format SĐT, focus field lỗi đầu tiên
- [ ] Bỏ @mui/x-date-pickers → DeliverySlotPicker chip ngày + khung giờ (§3.2)
- [ ] Fix timezone: dùng Asia/Ho_Chi_Minh tường minh, KHÔNG dùng giờ máy khách (§3.3)
- [ ] Giờ cửa hàng ra config/backend, không hardcode trong component (§3.1)
- [ ] CartItem → discriminated union + migration v1→v2 có version + try/catch (§6)
- [ ] Tách CheckoutPage 633 → ~110 dòng (§5)
- [ ] useCartStockCheck — revalidate tồn kho ở giỏ (§7.2)
- [ ] PaymentQRPage: backoff, dừng khi tab ẩn, phương án nhập tay có copy (§8)
- [ ] Unit test deliverySlots.ts — có case biên giờ mở/đóng cửa VÀ case timezone

---

## Lưu ý riêng của phase này

- Đây là luồng TIỀN. Rủi ro cao nhất của cả roadmap.
- Làm DeliverySlotPicker trên nhánh riêng, test độc lập, chỉ thay vào CheckoutPage khi đã chắc.
- Migration cart: nếu có nguy cơ mất giỏ hàng người dùng thật → DỪNG và hỏi.
- Làm phase này TRƯỚC phase 4.

---

## Bước cuối

```bash
npm run gate:phase5
```

- Gate ĐỎ → sửa **CODE**, không sửa gate. Chạy lại.
- Gate XANH → viết báo cáo theo mẫu `CLAUDE.md` §5, liệt kê manual check ở `docs/MANUAL-CHECKS.md` §5, rồi **DỪNG**.

**KHÔNG** tự chạy `/phase-4`. Người sẽ chạy manual check rồi mới cho phép.
