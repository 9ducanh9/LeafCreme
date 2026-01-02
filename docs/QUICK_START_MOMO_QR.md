# Quick start MoMo QR (5 phút) — Leaf Crème

Mục tiêu: dùng **MoMo QR đơn giản** để khách quét QR và chuyển tiền (xác nhận thủ công).

## Bước 1: Chuẩn bị QR MoMo

- Mở app MoMo → **Nhận tiền** → hiện mã QR.
- Chụp/ xuất ảnh QR và lưu vào:
  - `uploads/payment/momo_qr.png` (khuyến nghị)

## Bước 2: Tạo file `.env`

Tạo `.env` ở thư mục gốc, tối thiểu cần:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bakery
SECRET_KEY=your-secret-key-change-in-production-minimum-32-characters

MOMO_QR_PHONE=0912345678
MOMO_QR_ACCOUNT_NAME=Leaf Creme
MOMO_QR_IMAGE_PATH=uploads/payment/momo_qr.png
```

Gợi ý đầy đủ xem `ENV_SETUP.md`.

## Bước 3: Chạy backend + frontend

- Backend: `start-backend.bat`
- Frontend: `cd frontend` rồi chạy `start-frontend.bat`
- Hoặc chạy chung: `start-all.bat`

## Bước 4: Test luồng thanh toán

- Tạo đơn hàng ở frontend
- Chọn phương thức MoMo/QR (tuỳ UI hiện có)
- Frontend sẽ hiển thị trang QR (`PaymentQRPage`) để khách quét và chuyển tiền

## Troubleshooting nhanh

- Không thấy ảnh QR: kiểm tra file `uploads/payment/momo_qr.png` có tồn tại và backend có mount `/uploads`.
- Sai số điện thoại/tên: kiểm tra lại `MOMO_QR_PHONE`, `MOMO_QR_ACCOUNT_NAME`.


