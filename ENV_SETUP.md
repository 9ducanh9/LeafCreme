# Hướng dẫn cấu hình biến môi trường

## Tạo file .env

Tạo file `.env` trong thư mục gốc của project với nội dung sau:

```env
# =========================================================
# JWT Settings
# =========================================================
SECRET_KEY=your-secret-key-change-in-production-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# =========================================================
# Application URLs
# =========================================================
FRONTEND_BASE_URL=http://localhost:5173
BACKEND_BASE_URL=http://localhost:8000

# =========================================================
# Leafie / n8n (Chatbot)
# =========================================================
# Backend chỉ làm proxy, logic AI nằm trong n8n workflow
# Ví dụ: https://<your-n8n-domain>/webhook/<id>
N8N_WEBHOOK_URL=

# =========================================================
# VNPay Payment Gateway
# =========================================================
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_VERSION=2.1.0
VNPAY_COMMAND=pay
VNPAY_LOCALE=vn
VNPAY_CURR_CODE=VND
VNPAY_ORDER_TYPE=other

# =========================================================
# MoMo Payment Gateway (Tích hợp Business API - Cần đăng ký doanh nghiệp)
# =========================================================
MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_PAYMENT_URL=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REQUEST_TYPE=payWithMethod
MOMO_LANG=vi

# =========================================================
# MoMo QR Simple (Không cần Business API - Dùng tài khoản cá nhân)
# =========================================================
MOMO_QR_PHONE=0911263934
MOMO_QR_ACCOUNT_NAME=Leaf Creme
# MOMO_QR_IMAGE_PATH=uploads/payment/momo_qr.png  # Nếu có ảnh QR sẵn
```

## Hướng dẫn lấy thông tin

### 1. VNPay

1. Đăng ký tài khoản tại: https://vnpay.vn/
2. Đăng ký merchant account
3. Lấy thông tin:
   - `VNPAY_TMN_CODE`: Terminal Code
   - `VNPAY_HASH_SECRET`: Secret Key

### 2. MoMo (2 cách)

#### Cách 1: MoMo QR Simple (Đơn giản - Không cần đăng ký doanh nghiệp)

1. Mở app MoMo trên điện thoại
2. Vào **"Nhận tiền"** → Chụp ảnh mã QR
3. Lưu ảnh vào `uploads/payment/momo_qr.png`
4. Cấu hình:
   - `MOMO_QR_PHONE`: Số điện thoại MoMo của bạn
   - `MOMO_QR_ACCOUNT_NAME`: Tên hiển thị
   - `MOMO_QR_IMAGE_PATH`: Đường dẫn đến ảnh QR (tùy chọn)

#### Cách 2: MoMo Business API (Nâng cao - Cần đăng ký doanh nghiệp)

1. Đăng ký tài khoản tại: https://business.momo.vn/
2. Đăng ký Payment Gateway
3. Lấy thông tin:
   - `MOMO_PARTNER_CODE`: Partner Code
   - `MOMO_ACCESS_KEY`: Access Key
   - `MOMO_SECRET_KEY`: Secret Key

## Môi trường Production

Khi deploy lên production, thay đổi các URL sau:

```env
# Frontend & Backend URLs
FRONTEND_BASE_URL=https://your-domain.com
BACKEND_BASE_URL=https://api.your-domain.com

# VNPay Production
VNPAY_PAYMENT_URL=https://vnpayment.vn/paymentv2/vpcpay.html

# MoMo Production
MOMO_PAYMENT_URL=https://payment.momo.vn/v2/gateway/api/create
```

## Bảo mật

⚠️ **QUAN TRỌNG:**
- **KHÔNG BAO GIỜ** commit file `.env` vào Git
- File `.env` đã được thêm vào `.gitignore`
- Lưu trữ SECRET_KEY và các key khác một cách an toàn
- Sử dụng secret manager cho production (AWS Secrets Manager, Azure Key Vault, etc.)

## Kiểm tra cấu hình

Sau khi tạo file `.env`, khởi động lại backend:

```bash
# Windows
.\start-backend.bat

# Linux/Mac
python -m uvicorn app.main:app --reload
```

Kiểm tra logs để đảm bảo không có lỗi cấu hình.

