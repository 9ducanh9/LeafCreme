# Leaf Creme - Bakery Management System

Hệ thống quản lý và bán hàng cho tiệm bánh Leaf Creme.

## 🚀 Quick Start

### Chạy cả Backend và Frontend cùng lúc

**Windows:**
```bash
start-all.bat
```

Script này sẽ tự động:
- Khởi động Backend server (port 8000)
- Khởi động Frontend server (port 3000)
- Mở 2 cửa sổ terminal riêng biệt

### Chạy riêng lẻ

#### Backend (FastAPI)
```bash
# Windows
start-backend.bat

# Hoặc manual
cd venv\Scripts
activate
cd ..\..
python -m uvicorn app.main:app --reload --port 8000
```

Backend sẽ chạy tại: http://localhost:8000
API Documentation: http://localhost:8000/docs

#### Frontend (React + Vite)
```bash
# Windows
cd frontend
start-frontend.bat

# Hoặc manual
cd frontend
npm install  # Lần đầu tiên
npm run dev
```

Frontend sẽ chạy tại: http://localhost:3000

## 📋 Requirements

### Backend
- Python 3.11+
- PostgreSQL database
- Virtual environment với các packages trong `requirements.txt`

### Frontend
- Node.js 18+
- npm hoặc yarn

## 🔧 Setup

### 1. Backend Setup

```bash
# Tạo virtual environment
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Tạo file .env với database connection:
# DATABASE_URL=postgresql://user:password@localhost:5432/dbname
# SECRET_KEY=your-secret-key-here
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

## 🌐 URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📁 Project Structure

```
Leaf Crème/
├── app/                 # Backend (FastAPI)
│   ├── routers/         # API endpoints
│   ├── models.py        # Database models
│   ├── services/        # Business logic
│   └── main.py          # FastAPI app
├── frontend/            # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── contexts/    # React contexts
└── venv/                # Python virtual environment
```

## 🎯 Features

### Frontend
- ✅ Homepage với hero banner, best sellers, categories
- ✅ Product browsing và search
- ✅ Shopping cart
- ✅ Checkout và order placement
- ✅ User authentication (login/register)
- ✅ User profile management
- ✅ Category listing pages
- ✅ Multiple payment methods (Cash on Delivery, MoMo QR)

### Backend
- ✅ RESTful API với FastAPI
- ✅ Authentication & Authorization (JWT)
- ✅ Product management
- ✅ Order management với FEFO allocation
- ✅ Inventory management
- ✅ Batch tracking
- ✅ Payment processing (MoMo QR integration với auto-fill)

## 📝 Documentation

- `RulesLeafCreme.md` - Design rules và guidelines cho frontend
- `START_HERE_MOMO.md` - **BẮT ĐẦU TẠI ĐÂY** để setup thanh toán MoMo
- `QUICK_START_MOMO_QR.md` - Setup MoMo QR đơn giản trong 5 phút
- `MOMO_INTEGRATION_GUIDE.md` - Hướng dẫn MoMo Business API (nâng cao)
- `ENV_SETUP.md` - Hướng dẫn cấu hình biến môi trường
- API Documentation: http://localhost:8000/docs (Swagger UI)

## 💳 Payment Integration

Hệ thống hỗ trợ 2 phương thức thanh toán:

### 1. Thanh toán khi nhận hàng (COD)
- Khách hàng thanh toán trực tiếp khi nhận hàng
- Không cần cấu hình thêm

### 2. Thanh toán MoMo ⭐
- **Quét QR tự động điền số tiền & nội dung** - Khách chỉ cần xác nhận
- Setup trong 5 phút, không cần đăng ký doanh nghiệp
- Xác nhận thủ công qua app MoMo
- **Bắt đầu:** `START_HERE_MOMO.md` → `QUICK_START_MOMO_QR.md`

**Cấu hình MoMo:**
1. Chụp ảnh QR MoMo của bạn
2. Tạo file `.env` với MOMO_QR_PHONE
3. Restart backend  
4. Test thử - QR sẽ tự động điền số tiền!

## 🐛 Troubleshooting

### Backend không chạy được
- Kiểm tra virtual environment đã được activate
- Kiểm tra database connection trong `.env`
- Kiểm tra port 8000 có bị chiếm không

### Frontend không chạy được
- Chạy `npm install` trong thư mục `frontend`
- Kiểm tra port 3000 có bị chiếm không
- Kiểm tra Node.js version (cần 18+)

### CORS errors
- Backend đã cấu hình CORS để cho phép frontend
- Kiểm tra `CORS_ORIGINS` trong `.env` hoặc `app/main.py`

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Logs trong terminal
2. Browser console (F12)
3. API documentation tại `/docs`




