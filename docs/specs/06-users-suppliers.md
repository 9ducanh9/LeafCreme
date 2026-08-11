# Spec 06 — Users & Suppliers

Status: DRAFT — chờ chốt.
Phạm vi: `app/routers/{users,suppliers}.py`, `app/services/{users,suppliers}/*.py`.

---

## 1. Business Value

Users: quản lý tài khoản nội bộ (admin tạo/sửa/xoá nhân viên) + khách hàng tự sửa profile. Suppliers: nhà cung cấp nguyên liệu/hàng hoá, gắn với mỗi lô hàng nhập (domain Inventory).

## 2. Cùng 1 pattern lỗi đã thấy ở domain 5 — giờ xác nhận là vấn đề hệ thống, không phải cá biệt

Đây là domain thứ 3 phát hiện cùng 1 loại lỗi (sau Batches ma_qr đã fix ở Phase 1, và Gift Boxes ở Spec 05): **xoá cứng (hard delete) không check trước các bảng tham chiếu, để Postgres tự chặn bằng FK constraint và exception đó lọt ra thành 500 thô**. Đáng giá vì đến domain này đã đủ dữ liệu để kết luận đây là 1 vấn đề kiến trúc lặp lại (xem tổng hợp ở domain Cross-cutting cuối cùng), không phải lỗi riêng lẻ từng chỗ.

### 🔴 HIGH — #1: `delete_user` — xoá cứng, KHÔNG có lựa chọn soft-delete, và gần như chắc chắn sẽ bị chặn bởi FK

Khác với Suppliers (có `hard_delete` param, mặc định false, an toàn), `delete_user` của `UserService` **luôn luôn hard-delete**, không có cách nào khác:

```python
def delete_user(self, db, user_id, current_user):
    if current_user.nguoidung_id == user_id:
        raise DomainError(400, "Không thể xóa chính mình")
    user = self._get_user_or_404(db, user_id)
    db.delete(user)
    db.commit()
```

Kiểm tra migration (`alembic/versions/0001_baseline.py`): 3 bảng ledger tồn kho — `lichsukhosanpham`, `lichsukholinhkien`, `lichsukhohopqua` — đều có `nguoidung_id` (người thực hiện giao dịch kho) tham chiếu tới `nguoidung.nguoidung_id` **không có `ON DELETE CASCADE`/`SET NULL`** (mặc định RESTRICT). Trong khi đó `donhang.nguoidung_id` may mắn có `ON DELETE SET NULL` (đơn hàng của khách bị xoá vẫn giữ nguyên, chỉ mất liên kết khách hàng — thiết kế đúng).

Hệ quả thực tế: **bất kỳ nhân viên nào đã từng nhập lô hàng, xử lý đơn, hoặc bị hệ thống ghi nhận là người thực hiện 1 giao dịch kho (rất phổ biến với admin/manager/staff — gần như chắc chắn xảy ra sau vài ngày vận hành)** đều không thể bị `DELETE /users/{id}` xoá — request sẽ ném `IntegrityError` không được app bắt, rơi xuống catch-all exception handler, trả **500 thô** ra client thay vì thông báo rõ ràng.

**Đề xuất fix** (ưu tiên cao hơn Gift Boxes Finding #1 vì khả năng bị hit trong thực tế cao hơn nhiều — hầu như chắc chắn xảy ra ngay lần đầu ai đó thử xoá 1 nhân viên đã làm việc):
- Đổi `delete_user` sang soft-delete mặc định (tái sử dụng đúng field đã có sẵn: `dang_hoat_dong = False` — field này ĐÃ TỒN TẠI trên `NguoiDung`, dùng cho mục đích y hệt "vô hiệu hoá tài khoản", chỉ là hàm xoá hiện tại không dùng tới nó).
- Việc "vô hiệu hoá" này thực ra đã có sẵn qua `PUT /users/{id}` với `dang_hoat_dong: false` — vậy `DELETE` có thể coi là dư thừa nếu đã có cách vô hiệu hoá khác an toàn hơn; cân nhắc bỏ hẳn hard-delete, chỉ giữ soft qua PUT.

### 🟡 MEDIUM — #2: Suppliers có cùng lỗ hổng nhưng ở mức nhẹ hơn (opt-in, mặc định an toàn)

Đã nêu ở service code: comment TODO gốc của tác giả cũ tự thừa nhận thiếu check này (`# TODO: Kiểm tra xem nhà cung cấp có đang được sử dụng trong lô hàng không...`). `hard_delete=True` là tham số optional (`?hard_delete=true`), mặc định `False` (an toàn) — nhưng khi admin/manager chủ động bật, vẫn hit đúng lỗi FK-500 nếu supplier đã có lô hàng (rất phổ biến — supplier tồn tại chủ yếu để gắn vào lô hàng). Ưu tiên thấp hơn Finding #1 vì cần hành động cố ý (`?hard_delete=true`) mới trúng, không phải default path.

**Đề xuất fix**: thêm check tầng app trước khi xoá cứng — nếu supplier có bất kỳ `LoHang*` nào tham chiếu, trả 400 rõ ràng "Không thể xoá — nhà cung cấp đang có lô hàng, hãy vô hiệu hoá thay vì xoá" thay vì để DB tự raise.

## 3. Điểm làm đúng

- `donhang.nguoidung_id` dùng `ON DELETE SET NULL` đúng — cho phép xoá user mà không phá đơn hàng cũ (dù bản thân domain Orders khuyến nghị không nên hard-delete order — đây là nói về hard-delete USER, khác chuyện).
- `UserService.update_user` chặn đúng: chỉ admin mới đổi được `vaitro_id`, user thường chỉ sửa được profile của chính mình — đã verify kỹ ở Spec 01 (Auth), không có lỗ hổng leo quyền qua đường update.
- `delete_user`/`delete_supplier` đều chặn tự-xoá-chính-mình / có check tồn tại trước khi thao tác — phần logic nghiệp vụ (ai được xoá ai) làm đúng, vấn đề chỉ nằm ở tầng kỹ thuật xử lý FK.

## 4. Modernize / New-feature roadmap

1. Fix Finding #1 (users) — ưu tiên cao nhất trong domain này, khả năng bị hit gần như chắc chắn.
2. Fix Finding #2 (suppliers) — cùng pattern, làm chung 1 lượt.
3. Cân nhắc: chuẩn hoá **1 helper dùng chung** "check FK reference trước khi hard-delete" cho toàn bộ hệ thống, thay vì vá riêng lẻ từng domain — đúng nguyên tắc "Minimal but Valuable", vì đây là lỗi lặp lại ≥3 lần cùng 1 nguyên nhân gốc (xem tổng hợp domain Cross-cutting).

---

Tiếp tục tự động qua domain 7 (Frontend UI/UX flows).
