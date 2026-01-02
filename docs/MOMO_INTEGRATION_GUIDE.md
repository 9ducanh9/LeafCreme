# Hướng dẫn MoMo Business API (nâng cao) — Leaf Crème

Tài liệu này mô tả cấu hình tối thiểu để backend có thể gọi **MoMo Business API**.

## 1) Biến môi trường cần có

Tạo `.env` ở thư mục gốc (tham khảo `ENV_SETUP.md`), tối thiểu:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bakery
SECRET_KEY=your-secret-key-change-in-production-minimum-32-characters

MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_PAYMENT_URL=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REQUEST_TYPE=payWithMethod
MOMO_LANG=vi
```

## 2) Backend đang dùng file nào?

- Logic MoMo Business API nằm ở `app/services/momo.py`
- API endpoints thanh toán nằm ở `app/routers/payments.py`

## 3) Luồng tổng quan

- Frontend tạo đơn → gọi backend tạo thanh toán
- Backend gọi MoMo create payment → nhận URL/transaction info
- Gateway callback → backend verify signature và cập nhật trạng thái thanh toán

## 4) Lưu ý khi lên production

- Thay endpoint sandbox → production (MoMo cung cấp).
- Quản lý secret bằng secret manager, không để trong code/repo.
- Đặt domain callback/return URL đúng theo môi trường deploy.


