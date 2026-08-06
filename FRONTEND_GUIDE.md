# Hướng Dẫn Chạy Frontend & Backend

## 🚀 Đã chạy servers

### Frontend (React + Vite)
- **URL**: http://localhost:3000
- **Status**: Đang chạy
- **Features**: 
  - Login page
  - Dashboard
  - Products management
  - Orders management
  - Batches management

### Backend (FastAPI)
- **URL**: http://localhost:8000
- **Status**: Đang chạy
- **API Docs**: http://localhost:8000/docs
- **Features**: Full REST API với authentication

## 📋 Cách sử dụng

### 1. Truy cập Frontend
Mở trình duyệt và vào: **http://localhost:3000**

### 2. Đăng nhập
- Tên đăng nhập hoặc email của user đã tạo trong database
- Mật khẩu
- Sau khi đăng nhập thành công, sẽ tự động chuyển đến Dashboard

### 3. Các trang có sẵn
- **Dashboard**: Xem thống kê tổng quan
- **Sản phẩm**: Quản lý danh sách sản phẩm
- **Đơn hàng**: Xem danh sách đơn hàng
- **Lô hàng**: Quản lý lô hàng và tồn kho

## 🔧 Nếu cần restart servers

### Restart Frontend:
```bash
cd frontend
npm run dev
```

### Restart Backend:
```bash
cd D:\BakeryOnl
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

## ⚙️ Cấu hình

### Frontend Environment Variables
Tạo file `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

### Backend Environment Variables
Tạo file `.env` ở root:
```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/bakery
SECRET_KEY=your-secret-key-change-in-production
CORS_ORIGINS=*
```

## 🐛 Troubleshooting

### Frontend không kết nối được với Backend
- Kiểm tra backend đã chạy chưa: http://localhost:8000/health
- Kiểm tra CORS settings trong backend
- Kiểm tra `VITE_API_URL` trong `.env`

### Backend không chạy
- Kiểm tra database đã start chưa (docker-compose up -d)
- Kiểm tra `.env` file có đúng không
- Kiểm tra port 8000 có bị chiếm không

### Lỗi authentication
- Kiểm tra user đã tồn tại trong database
- Kiểm tra JWT token trong localStorage (F12 -> Application -> Local Storage)

## 📝 Lưu ý

1. Backend cần database PostgreSQL đang chạy
2. Frontend tự động refresh khi code thay đổi (Hot Module Replacement)
3. Backend có auto-reload khi code thay đổi (--reload flag)
4. API documentation có sẵn tại http://localhost:8000/docs

