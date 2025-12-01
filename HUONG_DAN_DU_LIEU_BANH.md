# Hướng dẫn Thêm Dữ Liệu Bánh

## Cấu trúc Dữ Liệu Hiện Tại

### 1. **Loại Bánh (Category)**
**Vị trí:** `SanPham.danh_muc` (trường String trong bảng `sanpham`)

**Cách sử dụng:**
- Dùng trường `danh_muc` để phân loại bánh
- Có thể nhập tự do các giá trị như: "Bánh ngọt", "Bánh kem", "Bánh mặn", "Bánh quy", etc.
- Khi lấy danh sách, có thể filter theo `danh_muc`: `GET /products?danh_muc=Bánh ngọt`

**Ví dụ khi tạo sản phẩm:**
```json
{
  "ten": "Bánh Chocolate",
  "sku": "BANH-CHOCO-001",
  "danh_muc": "Bánh ngọt",  // <-- Loại bánh ở đây
  "gia_co_ban": 50000.00,
  ...
}
```

### 2. **Hương Vị (Flavor)**
**Vị trí:** `BienTheSanPham.huong_vi` (trường String trong bảng `bienthesanpham`)

**Cách sử dụng:**
- Mỗi biến thể sản phẩm có thể có 1 hương vị
- Hương vị được lưu trong `huong_vi` khi tạo biến thể
- Có thể nhập tự do: "Chocolate", "Vani", "Dâu", "Matcha", "Caramel", etc.

**Ví dụ khi tạo biến thể:**
```json
{
  "sanpham_id": 1,
  "huong_vi": "Chocolate Đen",  // <-- Hương vị ở đây
  "kich_thuoc": "Nhỏ (200g)",
  "gia_bienthe": 55000.00,
  ...
}
```

### 3. **Loại Sản Phẩm (Type)**
**Vị trí:** `SanPham.loai` (ENUM: "don", "bien_the", "hop_qua")

- **"don"**: Sản phẩm đơn giản, không có biến thể
- **"bien_the"**: Sản phẩm có nhiều biến thể (hương vị, kích thước)
- **"hop_qua"**: Hộp quà (có thể chứa nhiều loại bánh)

## API Endpoints để Thêm Dữ Liệu

### 1. Tạo Sản Phẩm (Loại Bánh)
```bash
POST /products
Authorization: Bearer <token>

{
  "ten": "Bánh Chocolate",
  "sku": "BANH-CHOCO-001",
  "loai": "bien_the",
  "gia_co_ban": 50000.00,
  "danh_muc": "Bánh ngọt",      // Loại bánh
  "mo_ta": "Bánh chocolate thơm ngon",
  "don_vi_tinh": "chiếc"
}
```

### 2. Tạo Biến Thể (Hương Vị)
```bash
POST /products/variants
Authorization: Bearer <token>

{
  "sanpham_id": 1,
  "huong_vi": "Chocolate Đen",   // Hương vị
  "kich_thuoc": "Nhỏ (200g)",
  "gia_bienthe": 55000.00,
  "sku_bienthe": "BANH-CHOCO-DARK-001"
}
```

## Ví Dụ Dữ Liệu Bánh Thực Tế

### Bánh Ngọt
```json
{
  "ten": "Bánh Chocolate Layer Cake",
  "sku": "BANH-CHOCO-LAYER-001",
  "loai": "bien_the",
  "danh_muc": "Bánh ngọt",
  "gia_co_ban": 150000.00
}

// Biến thể:
[
  {"huong_vi": "Chocolate Đen", "kich_thuoc": "Nhỏ (500g)", "gia_bienthe": 150000.00},
  {"huong_vi": "Chocolate Sữa", "kich_thuoc": "Nhỏ (500g)", "gia_bienthe": 160000.00},
  {"huong_vi": "Chocolate Trắng", "kich_thuoc": "Nhỏ (500g)", "gia_bienthe": 170000.00}
]
```

### Bánh Kem
```json
{
  "ten": "Bánh Sinh Nhật",
  "sku": "BANH-SINHNHAT-001",
  "loai": "bien_the",
  "danh_muc": "Bánh kem",
  "gia_co_ban": 300000.00
}

// Biến thể:
[
  {"huong_vi": "Vani", "kich_thuoc": "Nhỏ (6 người)", "gia_bienthe": 300000.00},
  {"huong_vi": "Chocolate", "kich_thuoc": "Nhỏ (6 người)", "gia_bienthe": 320000.00},
  {"huong_vi": "Dâu", "kich_thuoc": "Nhỏ (6 người)", "gia_bienthe": 350000.00}
]
```

## Cải Thiện Có Thể (Tùy Chọn)

### Option 1: Tạo Bảng Danh Mục Riêng
Nếu muốn quản lý danh mục chặt chẽ hơn, có thể tạo bảng riêng:

```sql
CREATE TABLE danhmuc (
  danhmuc_id SERIAL PRIMARY KEY,
  ten_danhmuc VARCHAR(100) NOT NULL UNIQUE,
  mo_ta TEXT,
  hinh_anh_url VARCHAR(500),
  dang_hoat_dong BOOLEAN DEFAULT TRUE
);
```

Sau đó thay `SanPham.danh_muc` (String) thành Foreign Key `danhmuc_id`.

### Option 2: Tạo Bảng Hương Vị Riêng
Nếu muốn quản lý hương vị chuẩn hóa:

```sql
CREATE TABLE huongvi (
  huongvi_id SERIAL PRIMARY KEY,
  ten_huong_vi VARCHAR(100) NOT NULL UNIQUE,
  mo_ta TEXT,
  hinh_anh_url VARCHAR(500)
);
```

## Lưu Ý

1. **Hiện tại hệ thống dùng String tự do** cho `danh_muc` và `huong_vi`, phù hợp cho:
   - Thêm dữ liệu nhanh chóng
   - Linh hoạt về tên gọi
   - Không cần quản lý danh mục/hương vị phức tạp

2. **Nếu muốn chuẩn hóa hơn**, có thể:
   - Tạo bảng riêng cho danh mục/hương vị
   - Thêm validation khi tạo sản phẩm/biến thể
   - Tạo API CRUD cho danh mục/hương vị

3. **Đề xuất cho bánh:**
   - **Danh mục**: "Bánh ngọt", "Bánh kem", "Bánh mặn", "Bánh quy", "Bánh nướng"
   - **Hương vị**: "Chocolate", "Vani", "Dâu", "Matcha", "Caramel", "Tiramisu", "Cheese", "Red Velvet"

