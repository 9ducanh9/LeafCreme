---
description: Thực thi Phase 6 — Account + Orders
---

# Phase 6 — Account + Orders

Spec: `docs/ui-redesign/06-account-orders.md` (toàn bộ)
Phase trước: **4** — phải PASS gate trước khi bắt đầu phase này.

---

## Bước 0 — Trước khi viết code

1. Đọc `CLAUDE.md` **toàn bộ**. Luật §1 là cứng.
2. Đọc `docs/ui-redesign/06-account-orders.md`.
3. Đọc `docs/ui-redesign/VERIFICATION.md` §4 — kiểm mọi giả định liên quan phase này.
   **Nếu giả định nào SAI so với code thật: DỪNG, báo, không code tiếp.**
4. Xác nhận `npm run gate:phase4` vẫn PASS.
5. `git checkout -b redesign/phase-6`

---

## Việc phải làm

- [ ] FIX BUG 5 (§2): ProtectedRoute lưu state.from, LoginPage redirect về from, có safeInternalPath chặn open-redirect
- [ ] Thêm autoComplete cho MỌI form theo bảng §3.1 — đây là fix rẻ nhất/giá trị cao nhất
- [ ] LoginPage viết lại (§4): h1='Đăng nhập', bỏ min-h-screen, error role=alert, PasswordInput
- [ ] RegisterPage (§5): field-level error, new-password, strength meter, khớp mật khẩu onBlur, minLength 8
- [ ] UserProfilePage (§6): đúng 1 h1 không đổi theo tab, Radix Tabs, tab vào URL, success → toast. 446 → ~140
- [ ] MyOrdersPage (§7): filter trạng thái vào URL, pagination, thumbnail, reorder, empty state có đường ra
- [ ] OrderDetailPage (§8): timeline, TÁCH trạng thái thanh toán khỏi trạng thái đơn, mobile stacked card
- [ ] constants/orderStatus.ts có description cho từng trạng thái
- [ ] AvatarUploadSection (§6.4): validate client trước upload, revokeObjectURL khi unmount

---

## Lưu ý riêng của phase này

- Forgot password hiện KHÔNG có. Đừng thêm link tới route chưa tồn tại — thay bằng hướng dẫn liên hệ.
- Xoá item giỏ hàng dùng undo; huỷ đơn dùng confirm dialog. Ma sát tỉ lệ với mức không đảo ngược được.
- Thông báo lỗi login phải CHUNG, không tiết lộ username có tồn tại (user enumeration).

---

## Bước cuối

```bash
npm run gate:phase6
```

- Gate ĐỎ → sửa **CODE**, không sửa gate. Chạy lại.
- Gate XANH → viết báo cáo theo mẫu `CLAUDE.md` §5, liệt kê manual check ở `docs/MANUAL-CHECKS.md` §6, rồi **DỪNG**.

Đây là phase cuối của storefront. Admin (phase 7) cần spec riêng — chưa viết.
