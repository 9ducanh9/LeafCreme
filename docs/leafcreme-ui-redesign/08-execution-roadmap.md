# UI/UX — kế hoạch công việc còn lại

**Cập nhật:** 2026-09-27. Kế hoạch này thay roadmap cũ. Các số liệu và checklist phase cũ không còn là tiêu chí thực thi.

## Trạng thái hiện tại

| Khu vực | Trạng thái |
|---|---|
| Nền tảng kiểm tra frontend | Đã có Vitest, lint, build và browser smoke tests trong CI. Baseline cũ không dùng làm mốc hiện tại. |
| Brand và primitive UI | Token semantic, component UI chung và focus-visible styles đã có. Chưa xác nhận mọi component/page đạt cùng tiêu chuẩn. |
| Layout storefront | Mobile navigation, layout dùng chung, footer nội bộ bằng router link đã có. Cần kiểm tra hành vi thực tế. |
| Cart/checkout | Checkout dùng SePay/VietQR; validate thông tin giao hàng và thời gian theo múi giờ Việt Nam. Còn cần xác minh xử lý lỗi giữa tạo đơn và tạo mã QR, cùng chống tạo đơn lặp. |
| Tài khoản/catalog | Luồng hiện hữu đã phát triển tiếp so với audit cũ. Chưa có audit mới đủ để nêu danh sách lỗi đáng tin cậy. |
| Admin chức năng | Có component DataTable và hook cho pagination/sort/state URL; cần xác định độ phủ trên từng trang và API. |
| Admin visual | MUI theme đã có. Không mặc định phải xoá toàn bộ `sx` hoặc thay thư viện component. |

## Thứ tự xử lý

### 1. Kiểm tra checkout và bảo vệ thao tác đặt đơn

- Mô phỏng SePay QR lỗi sau khi backend đã tạo đơn.
- Xác nhận giao diện nói rõ đơn đã được tạo và cho phép tiếp tục thanh toán mà không tạo đơn mới.
- Kiểm tra backend có idempotency hoặc cơ chế tương đương trước khi thêm giải pháp mới.

**Hoàn tất khi:** retry cùng thao tác không tạo đơn ngoài ý muốn; trạng thái đơn và hướng dẫn khách hàng vẫn rõ khi SePay không trả QR.

### 2. Kiểm kê phân trang admin

- Lập danh sách trang bảng admin, endpoint tương ứng, sort/filter và cách đếm tổng bản ghi.
- Chỉ bổ sung API hoặc UI ở màn thực sự chưa hỗ trợ dữ liệu lớn.

**Hoàn tất khi:** mọi danh sách vận hành cần thiết không phải tải toàn bộ dữ liệu để phân trang hoặc sắp xếp.

### 3. Kiểm tra UI, responsive và accessibility

- Duyệt các luồng chính: tìm sản phẩm, giỏ hàng, checkout, đơn hàng, tồn kho, cảnh báo.
- Kiểm tra bàn phím/focus, label và lỗi form, dialog/drawer, zoom và kích thước mobile.
- Dùng audit tự động để tìm lỗi, sau đó xác nhận bằng trình duyệt và screen reader ở các luồng quan trọng.

**Hoàn tất khi:** các lỗi cụ thể được ghi thành backlog có bước tái hiện và tiêu chí chấp nhận.

### 4. Sửa lỗi có bằng chứng và cập nhật tài liệu

- Sửa theo mức ảnh hưởng đến mua hàng, thao tác tồn kho và khả năng tiếp cận.
- Cập nhật spec hoặc bỏ đề xuất cũ ngay khi code/luồng sản phẩm thay đổi.
- Chụp ảnh giao diện mới cho README sau khi các luồng chính đã được kiểm tra.

## Quyết định kỹ thuật hiện hành

- Giữ MUI ở admin với theme hiện có.
- Không bắt buộc cài Radix/CVA hay thay toàn bộ primitive chỉ để khớp spec cũ.
- Không lấy số lượng `sx`, màu hex hoặc LOC từ audit trước làm mục tiêu tự thân.
- SePay/VietQR là luồng QR hiện tại; hướng dẫn MoMo cũ đã bị loại khỏi kế hoạch thực thi.

## Cổng cập nhật

Trước mỗi đợt UI tiếp theo, cập nhật [VERIFICATION.md](./VERIFICATION.md) bằng quan sát từ code/runtime hiện tại. Không đưa issue vào roadmap chỉ dựa trên mô tả audit cũ.
