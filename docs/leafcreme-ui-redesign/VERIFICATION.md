# UI spec — đối chiếu với code hiện tại

**Ngày rà soát:** 2026-09-27
**Phạm vi:** đọc tĩnh một số entry point và component chính. Không chạy app, không kiểm tra production, không dùng screen reader.

Tài liệu này thay các bảng số liệu và file:line của audit cũ. Những con số cũ không còn được xem là baseline.

## Đã đối chiếu

| Khu vực | Hiện trạng trong code |
|---|---|
| Điều hướng mobile storefront | `Header` render `MobileNav` và có trigger đóng/mở. Mục “mobile nav không tồn tại” trong audit cũ đã lỗi thời. |
| Footer | Dùng React Router `Link` cho liên kết nội bộ và lấy năm hiện tại khi render. Nhận định audit cũ về anchor chết và năm cố định không còn đúng. |
| Design tokens và focus | `tokens.css` có semantic palette; `index.css` có quy tắc `:focus-visible`. Chưa đo contrast toàn bộ component. |
| UI lỗi | Có `ErrorBoundary` và được dùng trong `App`. Chưa xác nhận hành vi từng boundary trên trình duyệt. |
| Admin theme | `adminTheme.ts` tạo MUI theme; `AdminLayout` bọc nội dung bằng `ThemeProvider`. |
| Admin data tables | Có DataTable chung hỗ trợ sort/pagination, hook lưu state bảng vào URL, và một số màn hình dùng chúng. Chưa kiểm kê đủ tất cả trang/API. |
| Checkout | Dùng `sepay_qr`, validate các trường giao hàng/số điện thoại, và xử lý thời gian theo `Asia/Ho_Chi_Minh`. Luồng lỗi sau khi đơn được tạo vẫn cần kiểm tra riêng. |

## Cần kiểm tra trước khi lập backlog mới

- Chạy app và kiểm tra storefront/admin ở desktop và mobile; xác nhận drawer, focus, dialog và thông báo lỗi.
- Kiểm tra luồng checkout khi tạo đơn thành công nhưng tạo QR SePay lỗi, rồi thử gửi lại để xác nhận không phát sinh đơn trùng.
- Kiểm kê từng màn admin và endpoint để biết màn nào thật sự có pagination/sort phía server.
- Chạy kiểm tra accessibility tự động và kiểm tra screen reader cho các luồng mua hàng, form admin và dialog.
- Tạo screenshot/baseline mới nếu cần đo thay đổi về giao diện hoặc bundle.

## Giới hạn

Đây là đối chiếu tĩnh, không phải kết quả QA. Việc một component hoặc cơ chế tồn tại trong source không chứng minh trải nghiệm của nó đã đạt tiêu chí ở mọi route.
