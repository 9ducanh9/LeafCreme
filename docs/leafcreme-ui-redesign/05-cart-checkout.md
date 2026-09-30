# Checkout — trạng thái và việc cần xác minh

**Cập nhật:** 2026-09-27. Tài liệu này thay bản thiết kế cũ có giả định MoMo và số dòng không còn đúng.

## Luồng đang có

- Phương thức checkout: thanh toán khi nhận hoặc chuyển khoản QR qua SePay/VietQR.
- Frontend tạo đơn trước; nếu chọn QR, sau đó gọi API tạo thông tin thanh toán SePay.
- Khi nhận được thông tin QR, frontend xóa giỏ, báo khách đơn đã tạo và chuyển sang trang thanh toán.
- Trang QR hiển thị thông tin tài khoản, số tiền, nội dung chuyển khoản và cho phép kiểm tra trạng thái.
- Form kiểm tra các trường giao hàng cùng lúc, kiểm tra định dạng số điện thoại và dùng múi giờ `Asia/Ho_Chi_Minh`.

## Rủi ro cần xử lý

### Lỗi tạo QR sau khi đơn đã được tạo

Nếu `createSePayPayment()` lỗi, `catch` hiện tại hiển thị thông báo lỗi chung ở checkout. Đơn backend đã tạo nhưng giao diện không chuyển khách tới đơn đó; khách có thể submit lại và tạo thêm đơn.

**Việc cần làm:** kiểm tra hành vi bằng môi trường test; sau đó hiển thị rõ mã/đường dẫn đơn đã tạo và cho phép tiếp tục thanh toán mà không tạo đơn mới.

### Chống gửi lặp

Chưa thấy `Idempotency-Key` hoặc cơ chế tương đương trong luồng `POST /orders` hiện tại. Cần xác nhận bằng test tích hợp trước khi chọn cách triển khai. Nút submit bị khóa khi request đang chạy không bảo vệ được trường hợp reload hoặc retry mạng.

**Tiêu chí:** gửi lại cùng thao tác sau timeout không tạo đơn trùng; hai lần đặt hàng có chủ ý vẫn tạo hai đơn riêng.

### Polling trạng thái thanh toán

Trang QR hiện kiểm tra mỗi 3 giây và dọn interval khi unmount. Khi tab ẩn, callback vẫn chạy định kỳ rồi thoát; chưa có backoff. Có thể cải thiện bằng cách dừng timer khi ẩn tab và giãn chu kỳ kiểm tra, sau khi cân nhắc tốc độ xác nhận mong muốn.

## Đã được xử lý so với spec cũ

- Thanh toán MoMo và xác nhận thủ công không còn là luồng checkout hiện hành; dùng SePay/VietQR với webhook xác nhận.
- Validation không còn dừng ở lỗi đầu tiên; form có kiểm tra nhiều trường và đưa focus về lỗi đầu tiên.
- Giờ giao được tính theo múi giờ cửa hàng Việt Nam.
- QR có phương án chuyển khoản thủ công qua số tài khoản, số tiền, nội dung và nút copy; không dùng số điện thoại MoMo.

## Cách xác minh trước khi đóng backlog

1. Dùng database test và API SePay giả lập.
2. Cho tạo đơn thành công nhưng API tạo QR thất bại; kiểm tra thông báo, trạng thái đơn và khả năng thử thanh toán lại.
3. Thử retry sau timeout/reload và kiểm tra số đơn trong database.
4. Mở trang QR, chuyển tab ẩn/hiện, xác nhận không phát sinh polling dày khi tab ẩn và trang dừng polling sau unmount.

Không dùng lại snippet MoMo, số dòng, thời gian giao dạng slot, hoặc acceptance criteria trong bản spec cũ.
