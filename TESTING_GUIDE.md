# Hướng Dẫn Testing API

## Chuẩn Bị

### 1. Khởi động Server
```bash
cd D:\BakeryOnl
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Hoặc nếu server đã chạy ở background, bỏ qua bước này.

### 2. Kiểm tra Database
Đảm bảo database đã có:
- Bảng `vaitro` với ít nhất 1 vai trò (VD: admin, manager, staff, customer)
- Hoặc tạo user trực tiếp trong database

## Cách Test

### Option 1: Chạy Script Test Tự Động
```bash
python test_api.py
```

Script sẽ test các endpoints:
- ✅ Health check
- ✅ Authentication (login/register)
- ✅ Products CRUD
- ✅ Variants CRUD
- ✅ Batches & Inventory

### Option 2: Test Thủ Công Qua Swagger UI
1. Mở browser: http://127.0.0.1:8000/docs
2. Swagger UI sẽ hiển thị tất cả endpoints
3. Click "Authorize" → Nhập token (nếu có)
4. Test từng endpoint bằng cách click "Try it out"

### Option 3: Test Bằng curl/Postman

#### Lấy Token
```bash
# Login
curl -X POST "http://127.0.0.1:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=your_password"
```

#### Test Products
```bash
# Lấy danh sách sản phẩm
curl -X GET "http://127.0.0.1:8000/products" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Tạo sản phẩm
curl -X POST "http://127.0.0.1:8000/products" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ten": "Bánh Chocolate",
    "sku": "BANH-CHOCO-001",
    "loai": "bien_the",
    "gia_co_ban": 50000.00,
    "danh_muc": "Bánh ngọt"
  }'
```

#### Test Batches
```bash
# Lấy danh sách lô hàng
curl -X GET "http://127.0.0.1:8000/batches/products" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Cảnh báo hết hạn
curl -X GET "http://127.0.0.1:8000/batches/expiring?days=7" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Tạo User Để Test

### Cách 1: Tạo Qua API (Cần có vai trò trong DB)
```bash
POST /auth/register
{
  "ten_dang_nhap": "test_admin",
  "email": "test@example.com",
  "mat_khau": "password123",
  "ho_ten": "Test User",
  "vaitro_id": 1  # ID của vai trò trong bảng vaitro
}
```

### Cách 2: Tạo Trực Tiếp Trong Database
```sql
-- 1. Tạo vai trò nếu chưa có
INSERT INTO vaitro (ten_vai_tro, mo_ta) VALUES 
  ('admin', 'Quản trị viên'),
  ('manager', 'Quản lý'),
  ('staff', 'Nhân viên'),
  ('customer', 'Khách hàng');

-- 2. Tạo user (password hash cần được mã hóa bằng bcrypt)
-- Trong Python:
from app.core.security import get_password_hash
password_hash = get_password_hash("password123")

-- 3. Insert vào database
INSERT INTO nguoidung (ten_dang_nhap, email, mat_khau_ma_hoa, vaitro_id, ho_ten)
VALUES ('admin', 'admin@example.com', '<password_hash>', 1, 'Admin User');
```

## Các Endpoint Chính Đã Implement

### Products & Variants
- `GET /products` - Danh sách sản phẩm
- `GET /products/{id}` - Chi tiết sản phẩm
- `POST /products` - Tạo sản phẩm (admin/manager)
- `PUT /products/{id}` - Cập nhật sản phẩm (admin/manager)
- `DELETE /products/{id}` - Xóa sản phẩm (admin/manager)
- `GET /products/{id}/variants` - Danh sách biến thể
- `POST /products/variants` - Tạo biến thể (admin/manager)
- `GET /products/variants/{id}` - Chi tiết biến thể
- `PUT /products/variants/{id}` - Cập nhật biến thể (admin/manager)

### Batches & Inventory
- `POST /batches/products` - Tạo lô hàng sản phẩm
- `GET /batches/products` - Danh sách lô hàng sản phẩm
- `GET /batches/products/{id}` - Chi tiết lô hàng
- `PUT /batches/products/{id}` - Cập nhật lô hàng
- `POST /batches/components` - Tạo lô hàng linh kiện
- `POST /batches/gift-boxes` - Tạo lô hàng hộp quà
- `GET /batches/expiring` - Cảnh báo hết hạn
- `GET /batches/inventory/products` - Tồn kho sản phẩm
- `GET /batches/inventory/components` - Tồn kho linh kiện
- `GET /batches/inventory/gift-boxes` - Tồn kho hộp quà

## Lưu Ý

1. **Tất cả endpoints (trừ `/auth/register`, `/auth/login`, `/health`) đều yêu cầu authentication**
2. **Một số endpoints yêu cầu role cụ thể** (admin, manager, staff)
3. **Xem chi tiết trong Swagger UI**: http://127.0.0.1:8000/docs


