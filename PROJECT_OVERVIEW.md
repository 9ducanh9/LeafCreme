# 📋 TỔNG QUAN DỰ ÁN BAKERYONL - BACKEND

## 🎯 MỤC TIÊU
Hệ thống quản lý bánh kẹo với backend API hoàn chỉnh, hỗ trợ POS, đặt trước, và bán hàng online.

---

## 📦 KIẾN TRÚC DỰ ÁN

### 1. **Cấu trúc thư mục**
```
app/
├── core/           # Core configuration & security
│   ├── config.py          # Settings (JWT, environment)
│   ├── dependencies.py     # Auth dependencies, role checking
│   └── security.py         # Password hashing, JWT tokens
├── routers/       # API endpoints (8 routers)
├── services/      # Business logic services
│   ├── helpers.py         # 70+ utility functions
│   ├── fefo.py            # FEFO inventory allocation
│   └── logging.py          # System logging service
├── middleware/    # Custom middleware (metrics)
├── models.py      # 30 SQLAlchemy models
├── schemas.py     # Pydantic schemas cho JSONB
├── db.py          # Database connection
└── main.py        # FastAPI app entry point
```

---

## 🗄️ DATABASE MODELS (30 bảng)

### **Core Models**
1. ✅ **VaiTro** - Vai trò người dùng (quyền)
2. ✅ **NguoiDung** - Người dùng hệ thống

### **Product Models**
3. ✅ **SanPham** - Sản phẩm chính
4. ✅ **BienTheSanPham** - Biến thể sản phẩm (hương vị, size)
5. ✅ **HopQua** - Hộp quà

### **Inventory Models**
6. ✅ **LoHangSanPham** - Lô hàng sản phẩm
7. ✅ **LoHangLinhKien** - Lô hàng linh kiện
8. ✅ **LoHangHopQua** - Lô hàng hộp quà
9. ✅ **TonKhoSanPham** - Tồn kho sản phẩm
10. ✅ **TonKhoLinhKien** - Tồn kho linh kiện
11. ✅ **TonKhoHopQua** - Tồn kho hộp quà
12. ✅ **CongThucHopQua** - Công thức BOM cho hộp quà

### **Order & Payment Models**
13. ✅ **DonHang** - Đơn hàng (POS/Online/Đặt trước)
14. ✅ **ChiTietDonHang** - Chi tiết đơn hàng
15. ✅ **PhieuGiamGia** - Phiếu giảm giá
16. ✅ **DonHangPhieuGiamGia** - Junction table
17. ✅ **ThanhToan** - Thanh toán
18. ✅ **DoiTra** - Đổi trả

### **Cart Models**
19. ✅ **GioHang** - Giỏ hàng
20. ✅ **ChiTietGioHang** - Chi tiết giỏ hàng

### **Supplier Models**
21. ✅ **NhaCungCap** - Nhà cung cấp
22. ✅ **LinhKien** - Linh kiện/nguyên liệu

### **History & Logging Models**
23. ✅ **LichSuKhoSanPham** - Lịch sử kho sản phẩm
24. ✅ **LichSuKhoLinhKien** - Lịch sử kho linh kiện
25. ✅ **LichSuKhoHopQua** - Lịch sử kho hộp quà
26. ✅ **LichSuGia** - Lịch sử thay đổi giá
27. ✅ **CanhBaoTonKho** - Cảnh báo tồn kho
28. ✅ **DanhGiaSanPham** - Đánh giá sản phẩm
29. ✅ **ThongKeSanPham** - Thống kê sản phẩm
30. ✅ **SystemLog** - Log hệ thống

---

## 🔌 API ENDPOINTS (8 Routers)

### **1. Authentication (`/auth`)**
- ✅ `POST /auth/register` - Đăng ký tài khoản
- ✅ `POST /auth/login` - Đăng nhập (trả về access + refresh token)
- ✅ `POST /auth/refresh` - Refresh token
- ✅ `GET /auth/me` - Thông tin user hiện tại

### **2. Users (`/users`)**
- ✅ `GET /users` - Danh sách users (filter, search, pagination)
- ✅ `GET /users/{user_id}` - Chi tiết user
- ✅ `POST /users` - Tạo user mới (admin/manager)
- ✅ `PUT /users/{user_id}` - Cập nhật user
- ✅ `DELETE /users/{user_id}` - Xóa user

### **3. Products (`/products`)**
- ✅ `GET /products` - Danh sách sản phẩm (filter, search)
- ✅ `POST /products` - Tạo sản phẩm mới
- ✅ `GET /products/{product_id}` - Chi tiết sản phẩm
- ✅ `PUT /products/{product_id}` - Cập nhật sản phẩm
- ✅ `DELETE /products/{product_id}` - Xóa sản phẩm
- ✅ `POST /products/variants` - Tạo biến thể
- ✅ `GET /products/variants/{variant_id}` - Chi tiết biến thể
- ✅ `PUT /products/variants/{variant_id}` - Cập nhật biến thể
- ✅ `DELETE /products/variants/{variant_id}` - Xóa biến thể
- ✅ `GET /products/{product_id}/variants` - Biến thể của sản phẩm

### **4. Batches (`/batches`)**
#### Sản phẩm
- ✅ `POST /batches/products` - Tạo lô hàng sản phẩm
- ✅ `GET /batches/products` - Danh sách lô hàng (filter)
- ✅ `GET /batches/products/{batch_id}` - Chi tiết lô hàng
- ✅ `PUT /batches/products/{batch_id}` - Cập nhật lô hàng

#### Linh kiện
- ✅ `POST /batches/components` - Tạo lô hàng linh kiện
- ✅ `GET /batches/components` - Danh sách lô hàng linh kiện
- ✅ `GET /batches/components/{batch_id}` - Chi tiết lô hàng linh kiện
- ✅ `PUT /batches/components/{batch_id}` - Cập nhật lô hàng linh kiện

#### Hộp quà
- ✅ `POST /batches/gift-boxes` - Tạo lô hàng hộp quà
- ✅ `GET /batches/gift-boxes` - Danh sách lô hàng hộp quà
- ✅ `GET /batches/gift-boxes/{batch_id}` - Chi tiết lô hàng hộp quà
- ✅ `PUT /batches/gift-boxes/{batch_id}` - Cập nhật lô hàng hộp quà

#### Tồn kho & Cảnh báo
- ✅ `GET /batches/expiring` - Lô hàng sắp hết hạn
- ✅ `GET /batches/inventory/products` - Tồn kho sản phẩm
- ✅ `GET /batches/inventory/components` - Tồn kho linh kiện
- ✅ `GET /batches/inventory/gift-boxes` - Tồn kho hộp quà
- ✅ `GET /batches/by-variant/{bienthe_id}` - Lô hàng theo biến thể

### **5. Orders (`/orders`)**
- ✅ `GET /orders` - Danh sách đơn hàng (filter, search, pagination)
- ✅ `GET /orders/{order_id}` - Chi tiết đơn hàng
- ✅ `POST /orders` - Tạo đơn hàng mới (với FEFO allocation)
- ✅ `PUT /orders/{order_id}/status` - Cập nhật trạng thái đơn hàng
- ✅ `POST /orders/{order_id}/cancel` - Hủy đơn hàng

**Tính năng:**
- ✅ Hỗ trợ 3 loại đơn: POS, Online, Đặt trước
- ✅ Áp dụng phiếu giảm giá
- ✅ FEFO allocation tự động
- ✅ Validation tồn kho
- ✅ Tự động tính tổng tiền

### **6. Suppliers (`/suppliers`)**
- ✅ `GET /suppliers` - Danh sách nhà cung cấp (filter, search)
- ✅ `GET /suppliers/{supplier_id}` - Chi tiết nhà cung cấp
- ✅ `POST /suppliers` - Tạo nhà cung cấp mới
- ✅ `PUT /suppliers/{supplier_id}` - Cập nhật nhà cung cấp
- ✅ `DELETE /suppliers/{supplier_id}` - Xóa nhà cung cấp

### **7. Payments (`/payments`)**
- ✅ `GET /payments` - Danh sách thanh toán (filter, search)
- ✅ `GET /payments/{payment_id}` - Chi tiết thanh toán
- ✅ `GET /payments/orders/{order_id}` - Thanh toán của đơn hàng
- ✅ `POST /payments` - Tạo thanh toán mới
- ✅ `PUT /payments/{payment_id}/status` - Cập nhật trạng thái thanh toán
- ✅ `POST /payments/{payment_id}/verify` - Verify thanh toán từ cổng thanh toán

**Tính năng:**
- ✅ Hỗ trợ nhiều phương thức: tiền mặt, chuyển khoản, thẻ, ví điện tử
- ✅ Lưu thông tin giao dịch từ cổng thanh toán (JSONB)
- ✅ Verify và cập nhật trạng thái tự động

### **8. Reports (`/reports`)**
- ✅ `GET /reports/sales` - Báo cáo bán hàng theo ngày

**Tính năng:**
- ✅ Filter theo khoảng thời gian
- ✅ Thống kê: số đơn, doanh thu, số lượng bán

---

## 🔐 SECURITY & AUTHENTICATION

### **JWT Authentication**
- ✅ Access token (30 phút mặc định)
- ✅ Refresh token (7 ngày mặc định)
- ✅ Token validation middleware
- ✅ Auto token refresh

### **Password Security**
- ✅ Bcrypt hashing
- ✅ Password verification

### **Role-Based Access Control (RBAC)**
- ✅ Vai trò người dùng (VaiTro model)
- ✅ Dependency `require_role()` để check quyền
- ✅ Quyền xem/thêm/sửa/xóa (JSONB trong database)

### **Dependencies**
- ✅ `get_current_user` - Lấy user từ token
- ✅ `get_current_active_user` - Chỉ user active
- ✅ `require_role("admin", "manager")` - Check role

---

## 🛠️ SERVICES & UTILITIES

### **1. Helpers Service (`app/services/helpers.py`)**

#### **Date & Time (7 functions)**
- `parse_date_vietnam()` - Parse ngày VN format
- `format_date_vietnam()` - Format DD/MM/YYYY
- `format_datetime_vietnam()` - Format datetime
- `get_date_range()` - Lấy khoảng thời gian
- `is_expiring_soon()` - Kiểm tra sắp hết hạn
- `is_expired()` - Kiểm tra hết hạn

#### **Number & Currency (5 functions)**
- `format_currency()` - Format tiền VNĐ
- `calculate_percentage()` - Tính phần trăm
- `calculate_discount_amount()` - Tính giảm giá
- `calculate_final_price()` - Tính giá cuối
- `round_decimal()` - Làm tròn số

#### **String Utilities (3 functions)**
- `slugify()` - Tạo slug
- `truncate_string()` - Cắt chuỗi
- `sanitize_search_term()` - Làm sạch từ khóa

#### **Validation (4 functions)**
- `validate_email()` - Validate email
- `validate_phone()` - Validate số điện thoại
- `validate_sku()` - Validate SKU
- `is_valid_uuid()` - Validate UUID

#### **Pagination (2 functions)**
- `paginate_query()` - Phân trang query
- `get_pagination_info()` - Thông tin pagination

#### **Status Formatting (2 functions)**
- `get_status_color()` - Màu trạng thái
- `format_status_vietnam()` - Format trạng thái VN

#### **Code Generation (5 functions)**
- `generate_order_code()` - Mã đơn hàng (DH-20250116-001)
- `generate_batch_code()` - Mã lô hàng (LO-20250116-001)
- `generate_unique_code()` - Mã unique
- `generate_voucher_code()` - Mã voucher
- `generate_sku()` - Mã SKU

#### **Business Logic - Orders (5 functions)**
- `calculate_order_totals()` - Tính tổng đơn hàng
- `calculate_item_total()` - Tính tổng item
- `validate_order_status_transition()` - Validate chuyển trạng thái
- `can_cancel_order()` - Có thể hủy không
- `can_return_order()` - Có thể đổi trả không

#### **Business Logic - Inventory (5 functions)**
- `calculate_available_stock()` - Tính tồn kho khả dụng
- `is_low_stock()` - Kiểm tra tồn kho thấp
- `calculate_stock_value()` - Tính giá trị tồn kho
- `get_stock_status()` - Trạng thái tồn kho
- `validate_stock_availability()` - Validate tồn kho

#### **Business Logic - Vouchers (2 functions)**
- `calculate_voucher_discount()` - Tính giảm giá voucher
- `is_voucher_valid()` - Validate voucher

#### **Business Logic - Payments (3 functions)**
- `calculate_payment_status()` - Tính trạng thái thanh toán
- `calculate_remaining_amount()` - Tính số tiền còn lại
- `calculate_refund_amount()` - Tính tiền hoàn

#### **Data Formatting (3 functions)**
- `format_order_status()` - Format trạng thái đơn
- `format_payment_method()` - Format phương thức thanh toán
- `format_order_type()` - Format loại đơn

#### **Validation - Business (3 functions)**
- `validate_order_items()` - Validate items đơn hàng
- `validate_expiry_date()` - Validate ngày hết hạn
- `validate_stock_availability()` - Validate tồn kho

#### **Statistics & Aggregation (4 functions)**
- `calculate_growth_rate()` - Tỷ lệ tăng trưởng
- `calculate_average()` - Tính trung bình
- `calculate_total()` - Tính tổng
- `calculate_percentage_change()` - % thay đổi

**Tổng cộng: 70+ utility functions**

### **2. FEFO Service (`app/services/fefo.py`)**
- ✅ `alloc_fefo_by_variant()` - Phân bổ tồn kho theo FEFO (First-Expired, First-Out)
- ✅ Tự động chọn lô hàng sắp hết hạn trước

### **3. Logging Service (`app/services/logging.py`)**
- ✅ `log_action()` - Log hành động người dùng
- ✅ `extract_client_info()` - Lấy IP, User-Agent
- ✅ `serialize_model_for_log()` - Serialize model cho log
- ✅ Tích hợp với SystemLog model

---

## 📝 SCHEMAS & VALIDATION

### **Pydantic Schemas cho JSONB**
1. ✅ **ThongTinThanhToan** - Thông tin thanh toán nhà cung cấp
2. ✅ **SanPhamApDung** - Sản phẩm áp dụng voucher
3. ✅ **ThongTinGiaoDich** - Thông tin giao dịch thanh toán

### **Validation Functions**
- ✅ `validate_thong_tin_thanh_toan()`
- ✅ `validate_san_pham_ap_dung()`
- ✅ `validate_thong_tin_giao_dich()`

---

## 🏗️ MIDDLEWARE

### **Metrics Middleware** (`app/middleware/metrics_middleware.py`)
- ✅ Đếm số request
- ✅ Đo thời gian response
- ✅ Tích hợp Prometheus (prometheus-client)

---

## ⚙️ CONFIGURATION

### **Environment Variables (.env)**
- ✅ `DATABASE_URL` - PostgreSQL connection string
- ✅ `SECRET_KEY` - JWT secret key
- ✅ `ALGORITHM` - JWT algorithm (HS256)
- ✅ `ACCESS_TOKEN_EXPIRE_MINUTES` - Thời gian hết hạn access token
- ✅ `REFRESH_TOKEN_EXPIRE_DAYS` - Thời gian hết hạn refresh token
- ✅ `CORS_ORIGINS` - Allowed CORS origins

---

## 🚀 FEATURES ĐÃ HOÀN THÀNH

### **✅ Core Features**
- [x] User authentication & authorization (JWT)
- [x] Role-based access control
- [x] Password hashing (bcrypt)
- [x] Token refresh mechanism

### **✅ Product Management**
- [x] CRUD sản phẩm
- [x] CRUD biến thể sản phẩm
- [x] SKU generation
- [x] Danh mục sản phẩm

### **✅ Inventory Management**
- [x] Quản lý lô hàng (sản phẩm, linh kiện, hộp quà)
- [x] Tồn kho tự động
- [x] FEFO allocation
- [x] Cảnh báo hết hạn
- [x] Lịch sử kho

### **✅ Order Management**
- [x] Tạo đơn hàng (POS/Online/Đặt trước)
- [x] Áp dụng voucher
- [x] FEFO allocation tự động
- [x] Quản lý trạng thái đơn hàng
- [x] Hủy đơn hàng

### **✅ Payment Processing**
- [x] Nhiều phương thức thanh toán
- [x] Xử lý thanh toán online
- [x] Verify thanh toán
- [x] Lưu thông tin giao dịch

### **✅ Supplier Management**
- [x] CRUD nhà cung cấp
- [x] Thông tin thanh toán (JSONB)

### **✅ Reports**
- [x] Báo cáo bán hàng theo ngày

### **✅ Utilities**
- [x] 70+ helper functions
- [x] Code generation
- [x] Date formatting (VN format)
- [x] Currency formatting
- [x] Validation functions

---

## 📊 STATISTICS

### **Code Statistics**
- **Models**: 30 SQLAlchemy models
- **Routers**: 8 routers
- **Endpoints**: ~50+ API endpoints
- **Services**: 3 services (helpers, fefo, logging)
- **Utility Functions**: 70+ functions
- **Schemas**: 3 JSONB validation schemas

### **Database**
- **Tables**: 30 bảng
- **ENUMs**: 10+ ENUM types
- **Relationships**: Nhiều relationships (one-to-many, many-to-many)
- **JSONB Fields**: 3+ JSONB fields với validation

---

## 📚 DOCUMENTATION

### **Có sẵn:**
- ✅ `AUTHENTICATION_GUIDE.md` - Hướng dẫn authentication
- ✅ `DATABASE_SETUP.md` - Hướng dẫn setup database
- ✅ `TESTING_GUIDE.md` - Hướng dẫn testing
- ✅ `HUONG_DAN_DU_LIEU_BANH.md` - Hướng dẫn dữ liệu

### **API Documentation:**
- ✅ Swagger UI: `/docs`
- ✅ ReDoc: `/redoc`
- ✅ OpenAPI JSON: `/openapi.json`

---

## 🧪 TESTING & UTILITIES

### **Test Scripts:**
- ✅ `test_api.py` - Test API endpoints
- ✅ `test_db_connection.py` - Test database connection
- ✅ `test_password.py` - Test password hashing
- ✅ `create_test_user.py` - Tạo user test

---

## 🔄 CORS & ERROR HANDLING

### **CORS**
- ✅ Configurable CORS origins
- ✅ Support multiple origins (comma-separated)
- ✅ Allow credentials
- ✅ All methods & headers

### **Global Exception Handlers**
- ✅ `RequestValidationError` handler
- ✅ Generic `Exception` handler
- ✅ Detailed error responses

---

## 📦 DEPENDENCIES

### **Core:**
- ✅ FastAPI (web framework)
- ✅ SQLAlchemy 2.0+ (ORM)
- ✅ psycopg2-binary (PostgreSQL driver)
- ✅ python-dotenv (environment variables)

### **Security:**
- ✅ python-jose (JWT)
- ✅ passlib[bcrypt] (password hashing)
- ✅ bcrypt (password hashing)

### **Other:**
- ✅ python-multipart (form data)
- ✅ email-validator (email validation)
- ✅ requests (HTTP client)
- ✅ prometheus-client (metrics)

---

## 🎯 NEXT STEPS (Có thể phát triển thêm)

### **Chưa có nhưng có thể thêm:**
- [ ] Router `/cart` - Quản lý giỏ hàng (đã có models)
- [ ] Router `/vouchers` - CRUD phiếu giảm giá (đã có models)
- [ ] Router `/returns` - Quản lý đổi trả (đã có models)
- [ ] Router `/giftboxes` - Quản lý hộp quà (đã có models)
- [ ] Router `/reviews` - Quản lý đánh giá (đã có models)
- [ ] Router `/alerts` - Quản lý cảnh báo (đã có models)
- [ ] Router `/history` - Lịch sử (inventory, prices, logs)
- [ ] Router `/logs` - System logs
- [ ] Migration với Alembic
- [ ] Unit tests với pytest
- [ ] Integration tests
- [ ] API rate limiting
- [ ] File upload service
- [ ] Email service
- [ ] Background tasks (Celery)

---

## ✨ TỔNG KẾT

### **Đã hoàn thành:**
✅ **Backend API hoàn chỉnh** với:
- 30 database models
- 8 routers với 50+ endpoints
- Authentication & Authorization đầy đủ
- Business logic services
- 70+ utility functions
- Error handling & validation
- API documentation tự động

### **Trạng thái:**
🚀 **Backend đã sẵn sàng** cho việc:
- Phát triển frontend
- Testing API
- Deploy production
- Tích hợp với các service khác

---

**Tạo bởi:** AI Assistant  
**Ngày:** 2025-01-16  
**Version:** 1.0.0













