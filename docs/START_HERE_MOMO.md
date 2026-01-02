# Bắt đầu tích hợp MoMo (Leaf Crème)

Trong dự án này có **2 cách** xử lý thanh toán MoMo:

## 1) MoMo QR “đơn giản” (khuyến nghị khi demo/local)

- **Không cần** đăng ký MoMo Business API.
- Backend sẽ tạo **thông tin thanh toán/QR** để khách quét và chuyển tiền thủ công trong app MoMo.
- Phù hợp: demo nhanh, shop nhỏ, quy trình xác nhận thủ công.

Đi tiếp: xem `docs/QUICK_START_MOMO_QR.md`.

## 2) MoMo Business API (nâng cao)

- Cần tài khoản/đăng ký MoMo Business + key (Partner Code, Access Key, Secret Key).
- Có callback/verify chữ ký, phù hợp quy trình “chuẩn gateway”.

Đi tiếp: xem `docs/MOMO_INTEGRATION_GUIDE.md`.

## Lưu ý chung

- Các biến môi trường mẫu nằm trong `ENV_SETUP.md`.
- **Không commit** file `.env` lên Git.


