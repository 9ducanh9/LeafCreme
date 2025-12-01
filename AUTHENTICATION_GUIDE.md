# Hướng dẫn Authentication & User Management

## Đã tạo

### 1. Core Modules (`app/core/`)
- **`config.py`**: Cấu hình JWT (SECRET_KEY, token expiry)
- **`security.py`**: Password hashing (bcrypt) và JWT token generation
- **`dependencies.py`**: FastAPI dependencies cho authentication và authorization

### 2. Routers
- **`app/routers/auth.py`**: Authentication endpoints
- **`app/routers/users.py`**: User management endpoints

## API Endpoints

### Authentication (`/auth`)

#### 1. **POST `/auth/register`** - Đăng ký
```json
{
  "ten_dang_nhap": "admin",
  "email": "admin@example.com",
  "mat_khau": "password123",
  "ho_ten": "Admin User",
  "vaitro_id": 1,
  "so_dien_thoai": "0123456789",
  "dia_chi": "123 Đường ABC",
  "ngay_sinh": "1990-01-01",
  "gioi_tinh": "Nam"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer",
  "user_id": 1,
  "ten_dang_nhap": "admin",
  "ho_ten": "Admin User",
  "vaitro": "admin"
}
```

#### 2. **POST `/auth/login`** - Đăng nhập
Form data (OAuth2):
- `username`: Tên đăng nhập hoặc email
- `password`: Mật khẩu

**Response:** Giống register response

#### 3. **POST `/auth/refresh`** - Refresh token
```json
{
  "refresh_token": "eyJ..."
}
```

#### 4. **GET `/auth/me`** - Lấy thông tin user hiện tại
**Headers:** `Authorization: Bearer <access_token>`

### User Management (`/users`)

**Tất cả endpoints đều yêu cầu authentication**

#### 1. **GET `/users`** - Danh sách users
- **Required role:** admin, manager
- **Query params:**
  - `skip`: Offset (default: 0)
  - `limit`: Limit (default: 100, max: 1000)
  - `search`: Tìm kiếm theo tên, email, username
  - `vaitro_id`: Lọc theo vai trò
  - `dang_hoat_dong`: Lọc theo trạng thái (true/false)

#### 2. **GET `/users/{user_id}`** - Chi tiết user
- **Required role:** admin, manager

#### 3. **POST `/users`** - Tạo user mới
- **Required role:** admin

#### 4. **PUT `/users/{user_id}`** - Cập nhật user
- **Required role:** admin, manager
- **Note:** User có thể tự update profile của mình (trừ vai trò)

#### 5. **DELETE `/users/{user_id}`** - Xóa user
- **Required role:** admin
- **Note:** Không thể xóa chính mình

## Cách sử dụng

### 1. Cài đặt dependencies
```bash
pip install -r requirements.txt
```

### 2. Thêm SECRET_KEY vào `.env` (tùy chọn)
```env
SECRET_KEY=your-super-secret-key-minimum-32-characters-long
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### 3. Tạo vai trò đầu tiên trong database
Cần có ít nhất 1 vai trò trong bảng `vaitro` để có thể đăng ký user:
```sql
INSERT INTO vaitro (ten_vai_tro, mo_ta) VALUES 
  ('admin', 'Quản trị viên'),
  ('manager', 'Quản lý'),
  ('staff', 'Nhân viên'),
  ('customer', 'Khách hàng');
```

### 4. Test authentication

**Đăng ký user đầu tiên:**
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "ten_dang_nhap": "admin",
    "email": "admin@example.com",
    "mat_khau": "admin123",
    "ho_ten": "Admin",
    "vaitro_id": 1
  }'
```

**Đăng nhập:**
```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123"
```

**Lấy thông tin user (với token):**
```bash
curl -X GET "http://localhost:8000/auth/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Security Features

✅ **Password Hashing**: Dùng bcrypt
✅ **JWT Tokens**: Access token (30 phút) + Refresh token (7 ngày)
✅ **Role-based Access Control**: Kiểm tra vai trò cho các endpoints
✅ **Token Validation**: Verify token signature và expiry
✅ **User Status Check**: Kiểm tra `dang_hoat_dong`

## Lưu ý

⚠️ **SECRET_KEY**: Đổi trong production, dùng key ngẫu nhiên ít nhất 32 ký tự
⚠️ **Password**: Minimum 6 characters (có thể tăng trong schema)
⚠️ **Token Expiry**: Có thể điều chỉnh trong `.env`

