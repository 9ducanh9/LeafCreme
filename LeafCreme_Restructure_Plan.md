# LeafCreme — Kế hoạch hoàn thiện

**Cập nhật:** 2026-09-27
**Cơ sở đối chiếu:** code ở `main` tại `cd046ff`, tài liệu trong repository và kiểm tra production ngày 2026-09-27. Health check của backend và kết nối PostgreSQL đã được xác nhận; webhook thật từ SePay và luồng thanh toán thật chưa được xác nhận.

## Mục tiêu

Hoàn thiện LeafCreme như một modular monolith có luồng bán hàng và vận hành đáng tin cậy. Không coi việc đổi toàn bộ cấu trúc thư mục, chuyển async, hay thêm một cổng thanh toán khác là điều kiện hoàn thành nếu chưa có nhu cầu vận hành chứng minh.

## Đã có trong codebase

| Hạng mục | Tình trạng đã xác nhận |
|---|---|
| Schema và migrations | Alembic quản lý schema; CI chạy migrations trên PostgreSQL. |
| Chất lượng code | Có pytest, lint backend, frontend lint/unit/build và browser smoke tests trong GitHub Actions. |
| Nghiệp vụ chính | Có catalog, orders, inventory/FEFO, vouchers, reports, SePay/VietQR và Leafie. |
| Backend structure | Có các service theo nghiệp vụ dưới `app/services/`; router vẫn được nhóm riêng dưới `app/routers/`. |
| Jobs | APScheduler chạy quét cảnh báo tồn kho và xử lý thanh toán chờ quá hạn. |
| Frontend | Có design tokens, mobile navigation, ErrorBoundary, theme MUI cho admin và component DataTable dùng chung. |
| Build/deploy | CI build Docker image backend; pipeline deploy frontend lên Vercel khi push `main`. README đang ghi cấu hình Railway cần chuyển sang định dạng mới. |

Các mục trên xác nhận sự hiện diện trong repository, không xác nhận dịch vụ production đang chạy đúng cấu hình.

## Trạng thái production đã kiểm tra

- Backend đang chạy trên Railway tại `https://api-production-3f93.up.railway.app`.
- `GET /health/db` trả `healthy`, PostgreSQL `connected` vào ngày 2026-09-27.
- Railway báo deployment API ở trạng thái `SLEEPING`; request health có thể đánh thức service và có thể có cold start.
- POST thử webhook không có API key bị từ chối `401`; API key đã được cấu hình ở backend và auth gate hoạt động. Chưa xác nhận key có khớp với SePay hoặc SePay gửi callback thành công.
- Railway Postgres PITR đang tắt. Chưa có backup/restore rehearsal được ghi nhận.
- Chưa xác nhận cấu hình webhook phía SePay hoặc đã nhận callback thanh toán thật.

## Việc còn lại

### P1 — Xác minh vận hành production

- Chuyển cấu hình Railway khỏi `railway.toml` legacy sang `.railway/railway.ts` nếu Railway vẫn là nơi chạy backend.
- Xác nhận cấu hình webhook phía SePay bằng công cụ test của SePay; đối chiếu callback với payment/order trên môi trường kiểm thử trước khi nhận thanh toán thật.
- Diễn tập backup/restore PostgreSQL trên database cô lập và viết runbook khôi phục ngắn. Cân nhắc bật PITR sau khi chốt nhu cầu và mức chi phí Railway.
- Bổ sung luồng kiểm thử browser có đăng nhập trên database cô lập, đã seed dữ liệu. Hiện E2E CI là smoke test public routes với API giả lập.

### P2 — Bảo mật và quan sát ứng dụng

- Đánh giá nhu cầu và triển khai rate limit cho đăng nhập và webhook/payment nếu chưa được lớp hạ tầng bảo vệ.
- Quyết định có cần thu hồi JWT trước hạn không; hiện chưa thấy cơ chế revoked-token trong code.
- Bổ sung request ID/correlation ID cho HTTP request và metrics cơ bản. Agent có observability riêng; không đồng nghĩa API đã có `/metrics` hoặc Sentry.
- Rà soát RBAC theo từng thao tác tài nguyên; hiện có dependency kiểm tra role/capability.

### P3 — Hoàn tất backlog sản phẩm có giá trị

- Soát phân trang/sắp xếp ở từng trang admin và endpoint; đã có hook trạng thái bảng, URL state và component DataTable, nhưng cần kiểm tra độ phủ toàn bộ màn hình.
- Xác minh luồng lỗi sau khi tạo đơn nhưng tạo QR SePay thất bại, cùng hành vi submit lại để tránh đơn trùng. Chỉ bổ sung idempotency nếu xác nhận backend chưa xử lý trường hợp này.
- Dự báo nhu cầu và gợi ý nhập hàng là tính năng tương lai. Đã có insight vận hành chủ động, nhưng không coi đó là dự báo nhu cầu đã hoàn thành.
- Cập nhật audit UI cũ bằng code hiện tại, kiểm tra trực quan/mobile và screen reader trước khi chọn thêm việc giao diện.

## Không còn là việc cần làm theo plan cũ

- **Alembic, test + CI và Dockerfile backend** đã có; không lập lại Phase 0 như việc chưa bắt đầu.
- **Thanh toán thật** đã có luồng SePay/VietQR; không cần chọn giữa VNPay và MoMo để tiếp tục.
- **APScheduler và sinh cảnh báo định kỳ** đã có; không thêm scheduler lần nữa.
- **Async hoá toàn bộ backend** không phải điều kiện bắt buộc. Chỉ xem xét khi số liệu tải hoặc độ trễ cho thấy cách hiện tại không đáp ứng.
- Không yêu cầu chuyển cả ứng dụng sang `app/domains/` chỉ để khớp sơ đồ cũ. Tiếp tục tách service theo nghiệp vụ từng phần.

## Thứ tự đề xuất

1. Backend/Railway và health check đã xác nhận; còn chốt cấu hình webhook SePay và callback test.
2. Thực hiện backup/restore rehearsal và kiểm thử browser có đăng nhập trên môi trường cô lập.
3. Đóng các lỗ hổng vận hành được xác nhận: retry tạo đơn, rate limit, quan sát HTTP.
4. Kiểm tra độ phủ phân trang admin và làm mới backlog UI từ code hiện tại.
5. Chỉ sau đó mới quyết định có đầu tư vào dự báo nhu cầu/tồn kho hay không.

## Ghi chú

Tài liệu này thay thế các nhận định hiện trạng và câu hỏi mở cũ trong bản kế hoạch ban đầu. Tiêu chí cụ thể cho mỗi việc cần được ghi nhận cùng PR hoặc issue khi bắt đầu triển khai; không dùng lại số liệu audit UI cũ như số liệu hiện tại.
