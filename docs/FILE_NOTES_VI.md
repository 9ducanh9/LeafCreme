# Ghi chú cấu trúc dự án (note từng file) — Leaf Crème

Tài liệu này mô tả **mục đích của từng file/thư mục chính** trong dự án để người mới nhìn vào hiểu ngay dự án làm gì và nên bắt đầu từ đâu.

> Gợi ý: nếu thêm file mới, hãy bổ sung 1 dòng mô tả tương ứng ở đây.

## 1) Thư mục gốc (root)

- **`README.md`**: Giới thiệu dự án + cách chạy backend/frontend, URLs, troubleshooting.
- **`ENV_SETUP.md`**: Hướng dẫn tạo file `.env` (JWT, URL, VNPay, MoMo).
- **`requirements.txt`**: Dependency Python cho backend (FastAPI, SQLAlchemy, JWT, ...).
- **`docker-compose.yml`**: Postgres (và Adminer) cho môi trường local nhanh.
- **`start-all.bat`**: Chạy cả backend + frontend (Windows), tự mở trình duyệt.
- **`start-backend.bat`**: Chạy FastAPI backend (Windows).
- **`frontend/start-frontend.bat`**: Chạy React/Vite frontend (Windows).
- **`pyrightconfig.json`**: Cấu hình type-check cho Python (Pyright).
- **`RulesLeafCreme.md`**: Quy tắc UI/UX + coding style cho phần frontend.
- **`migrations/add_phu_hop_dip_to_sanpham.sql`**: Migration SQL (thêm cột `phu_hop_dip` cho bảng `sanpham`).
- **`migrations/create_chat_messages.sql`**: Migration SQL (tạo bảng `public.chat_messages` để n8n/Leafie dùng làm chat memory).
- **`uploads/`**: Thư mục lưu file upload/static (avatar, ảnh sản phẩm, ảnh QR, ...). Backend mount tại `/uploads`.

## 2) Backend — `app/` (FastAPI)

### 2.1) Entry & DB

- **`app/__init__.py`**: Đánh dấu package Python.
- **`app/main.py`**: Khởi tạo FastAPI app, cấu hình CORS, middleware, mount `/uploads`, register routers, health-check.
- **`app/db.py`**: Khởi tạo SQLAlchemy engine/session từ `DATABASE_URL` trong `.env`.
- **`app/models.py`**: Khai báo ORM models (bảng DB) cho toàn hệ thống.
- **`app/schemas.py`**: Pydantic schemas + validate payload (dùng chung nhiều router).

### 2.2) Core — `app/core/`

- **`app/core/config.py`**: Đọc biến môi trường và gom cấu hình (JWT, URL, VNPay, MoMo).
- **`app/core/security.py`**: Hash/verify password, JWT token create/verify, helpers liên quan bảo mật.
- **`app/core/dependencies.py`**: Dependency injection (lấy current user, require_role, ...).

### 2.3) Middleware — `app/middleware/`

- **`app/middleware/logging_middleware.py`**: Log request/response.
- **`app/middleware/security_middleware.py`**: Thêm security headers.

### 2.4) Routers — `app/routers/` (API endpoints)

- **`app/routers/auth.py`**: Đăng nhập/đăng ký/refresh token.
- **`app/routers/users.py`**: CRUD người dùng + upload avatar + phân quyền.
- **`app/routers/products.py`**: CRUD sản phẩm + biến thể + upload ảnh.
- **`app/routers/batches.py`**: Quản lý lô hàng (batch) và tồn kho theo lô.
- **`app/routers/orders.py`**: Quản lý đơn hàng (POS/Online/Đặt trước), tính tiền, FEFO allocate tồn kho, trạng thái đơn.
- **`app/routers/payments.py`**: Thanh toán (MoMo Business API + MoMo QR đơn giản), verify callback, lưu giao dịch.
- **`app/routers/suppliers.py`**: CRUD nhà cung cấp.
- **`app/routers/reports.py`**: Báo cáo (doanh thu, tồn kho, ... tuỳ logic hiện có).
- **`app/routers/analytics.py`**: Endpoint analytics public (phục vụ Leafie/chatbot; ví dụ best-sellers).
- **`app/routers/gift_boxes.py`**: CRUD hộp quà + BOM; có public router `/gift-boxes`.
- **`app/routers/lookup.py`**: API “lookup”/danh mục tra cứu (phục vụ dropdown/filter).
- **`app/routers/components.py`**: Quản lý “component” (nguyên liệu/linh kiện cấu thành) cho BOM/warehouse (tuỳ logic hiện có).
- **`app/routers/leafie.py`**: API cho Leafie assistant (chat/assistant features).
- **`app/routers/__init__.py`**: Export router modules.

### 2.5) Services — `app/services/` (business logic)

- **`app/services/fefo.py`**: Thuật toán phân bổ tồn kho theo FEFO (First-Expired-First-Out).
- **`app/services/helpers.py`**: Helper dùng chung cho backend.
- **`app/services/logging.py`**: Logging helpers/service.
- **`app/services/momo.py`**: Tích hợp MoMo Business API (tạo payment request, verify signature, parse datetime).
- **`app/services/momo_qr.py`**: Tạo thông tin thanh toán MoMo QR “đơn giản” (không cần Business API).

## 3) Frontend — `frontend/` (React + TypeScript + Vite)

### 3.1) Cấu hình

- **`frontend/package.json`**: Dependency + scripts.
- **`frontend/package-lock.json`**: Lock file để cài dependency ổn định.
- **`frontend/vite.config.ts`**: Vite config (dev server port `3000`, proxy `/api` sang backend `8000`).
- **`frontend/tailwind.config.js`**: Tailwind config.
- **`frontend/postcss.config.js`**: PostCSS config.
- **`frontend/tsconfig*.json`**: TypeScript config.
- **`frontend/index.html`**: Entry HTML cho Vite.

### 3.2) Entry

- **`frontend/src/main.tsx`**: Mount React app.
- **`frontend/src/App.tsx`**: Định tuyến/layout root.
- **`frontend/src/index.css`**: Global CSS.
- **`frontend/src/vite-env.d.ts`**: Types cho Vite.

### 3.3) Pages — `frontend/src/pages/`

- **`BakeryHomePage.tsx`**: Trang chủ.
- **`CategoryListingPage.tsx`**: Trang danh sách theo danh mục.
- **`ProductDetailPage.tsx`**: Trang chi tiết sản phẩm.
- **`SearchPage.tsx`**: Trang tìm kiếm.
- **`CartPage.tsx`**: Trang giỏ hàng.
- **`CheckoutPage.tsx`**: Trang checkout.
- **`OrderSuccessPage.tsx`**: Trang thành công sau đặt hàng.
- **`MyOrdersPage.tsx`**: Trang lịch sử đơn hàng của user.
- **`OrderDetailPage.tsx`**: Trang chi tiết một đơn.
- **`LoginPage.tsx`**: Trang đăng nhập.
- **`RegisterPage.tsx`**: Trang đăng ký.
- **`UserProfilePage.tsx`**: Trang hồ sơ người dùng.
- **`ContactPage.tsx`**: Trang liên hệ.
- **`PolicyPage.tsx`**: Trang chính sách.
- **`GiftBoxListPage.tsx`**: Trang danh sách hộp quà.
- **`GiftBoxDetailPage.tsx`**: Trang chi tiết hộp quà.
- **`PaymentQRPage.tsx`**: Trang hiển thị QR thanh toán.

#### Admin pages — `frontend/src/pages/admin/`

- **`AdminLayout.tsx`** (nằm ở `frontend/src/layout/admin/AdminLayout.tsx`): Layout cho admin.
- **`AdminDashboardPage.tsx`**: Dashboard admin.
- **`AdminProductPage.tsx`**: Quản lý sản phẩm.
- **`AdminBatchCreatePage.tsx`**: Tạo lô hàng.
- **`AdminInventoryPage.tsx`**: Quản lý tồn kho.
- **`AdminSalesPage.tsx`**: Danh sách bán hàng/đơn.
- **`AdminSalesDetailPage.tsx`**: Chi tiết bán hàng/đơn.
- **`AdminPreOrderPage.tsx`**: Danh sách đơn đặt trước.
- **`AdminPreOrderDetailPage.tsx`**: Chi tiết đơn đặt trước.
- **`AdminGiftBoxPage.tsx`**: Quản lý hộp quà.
- **`AdminGiftBoxBomPage.tsx`**: Quản lý BOM hộp quà.
- **`AdminVoucherPage.tsx`**: Quản lý voucher.

### 3.4) Components — `frontend/src/components/`

#### Bakery — `frontend/src/components/bakery/`

- **`Header.tsx`**: Header/navbar.
- **`Footer.tsx`**: Footer.
- **`HeroBanner.tsx`**: Hero carousel/banner.
- **`BestSellers.tsx`**: Section sản phẩm bán chạy.
- **`ProductCard.tsx`**: Card sản phẩm.
- **`ProductCategories.tsx`**: Section danh mục.
- **`IntroMessage.tsx`**: Card giới thiệu thương hiệu.
- **`ProductDropdown.tsx`**: Dropdown chọn sản phẩm/biến thể (tuỳ use-case).
- **`GiftBoxCard.tsx`**: Card hộp quà.
- **`GiftBoxFilters.tsx`**: Bộ lọc hộp quà.
- **`GiftBoxGallery.tsx`**: Gallery hình hộp quà.
- **`GiftBoxStory.tsx`**: Nội dung câu chuyện/giới thiệu hộp quà.
- **`GiftBoxSummary.tsx`**: Tóm tắt thông tin hộp quà.
- **`AvatarUploadSection.tsx`**: Upload avatar trong profile.
- **`ProfileSidebar.tsx`**: Sidebar hồ sơ.
- **`ProfileForm.tsx`**: Form cập nhật profile.
- **`PasswordForm.tsx`**: Form đổi mật khẩu.
- **`ChristmasMiniSection.tsx`**: Section trang trí/mini campaign Noel (nếu dùng).

#### Cart — `frontend/src/components/cart/`

- **`CartDrawer.tsx`**: Drawer giỏ hàng.
- **`CartItem.tsx`**: Item trong giỏ.
- **`CartSummary.tsx`**: Tổng kết đơn (tạm tính/ship/giảm giá).
- **`GiftBoxInfo.tsx`**: Thông tin hộp quà trong giỏ.

#### Layout — `frontend/src/components/layout/`

- **`LayoutShell.tsx`**: Khung layout tổng.
- **`MainLayout.tsx`**: Layout chính (header/footer + content).
- **`SectionContainer.tsx`**: Wrapper section.
- **`SectionHeader.tsx`**: Tiêu đề section.
- **`EmptyState.tsx`**: Empty state.
- **`ChristmasSnowflakes.tsx`**: Hiệu ứng tuyết Noel (nếu dùng).
- **`index.ts`**: Barrel exports.

#### Routing — `frontend/src/components/routing/`

- **`ProtectedRoute.tsx`**: Guard route cho user đăng nhập.
- **`admin/routing/AdminProtectedRoute.tsx`**: Guard route cho admin.

#### Leafie — `frontend/src/components/leafie/`

- **`LeafieAssistantBar.tsx`**: Thanh trợ lý Leafie.
- **`LeafieChatPanel.tsx`**: Panel chat.
- **`LeafieMessageList.tsx`**: List message.
- **`LeafieSuggestionChips.tsx`**: Gợi ý nhanh (chips).
- **`ChristmasSnowflakes.tsx`**: Trang trí Noel (Leafie).
- **`index.ts`**: Barrel exports.

#### Admin components — `frontend/src/components/admin/`

- **`dashboard/RevenueByDayMonth.tsx`**: Biểu đồ doanh thu theo ngày/tháng.
- **`dashboard/RevenueByProduct.tsx`**: Biểu đồ doanh thu theo sản phẩm.
- **`products/ProductTable.tsx`**: Bảng sản phẩm.
- **`products/ProductForm.tsx`**: Form tạo/sửa sản phẩm.
- **`products/ProductFilters.tsx`**: Bộ lọc sản phẩm.
- **`products/CategoryManager.tsx`**: Quản lý danh mục.
- **`sales/SalesTable.tsx`**: Bảng sales/đơn.
- **`sales/SalesDetailCard.tsx`**: Card chi tiết sale/đơn.
- **`sales/SalesFilters.tsx`**: Bộ lọc sales.
- **`preorders/PreOrderTable.tsx`**: Bảng đặt trước.
- **`preorders/PreOrderDetailCard.tsx`**: Chi tiết đặt trước.
- **`preorders/PreOrderFilters.tsx`**: Bộ lọc đặt trước.
- **`vouchers/*`**: Components quản lý voucher (tạo/sửa/danh sách).

#### UI primitives — `frontend/src/components/ui/`

- **`Button.tsx`**: Button component.
- **`Input.tsx`**: Input component.
- **`Card.tsx`**: Card component.
- **`Badge.tsx`**: Badge component.
- **`Modal.tsx`**: Modal.
- **`ConfirmDialog.tsx`**: Dialog xác nhận.
- **`Toast.tsx`** / **`ToastContainer.tsx`**: Toast UI.
- **`LoadingSpinner.tsx`** / **`Skeleton.tsx`**: Loading states.
- **`ErrorMessage.tsx`**: Hiển thị lỗi.
- **`DateInput.tsx`**: Input ngày.
- **`PriceDisplay.tsx`**: Hiển thị giá.
- **`index.ts`**: Barrel exports.

### 3.5) State/Context — `frontend/src/contexts/`

- **`AuthContext.tsx`**: Auth state (user/token).
- **`CartContext.tsx`**: Giỏ hàng.
- **`LeafieContext.tsx`**: State cho Leafie.
- **`ToastContext.tsx`**: Toast notifications.

### 3.6) Services (API client) — `frontend/src/services/`

- **`api.ts`**: Axios/fetch wrapper + baseURL + interceptors (nếu có).
- **`authService.ts`**: API đăng nhập/đăng ký/refresh.
- **`userService.ts`**: API user/profile.
- **`productService.ts`**: API sản phẩm.
- **`orderService.ts`**: API đơn hàng.
- **`paymentService.ts`**: API thanh toán.
- **`cartService.ts`**: Logic gọi API liên quan cart (nếu có).
- **`giftBoxService.ts`**: API hộp quà.
- **`lookupService.ts`**: API lookup.
- **`analyticsService.ts`**: API analytics (best-sellers,...).
- **`leafieService.ts`**: API cho Leafie assistant.
- **`voucherService.ts`**: API voucher.
- **`services/admin/*`**: API cho trang admin (batch/category/component/giftbox/inventory/preorder/report/sales/supplier/voucher).

### 3.7) Utils/Types/Constants

- **`frontend/src/utils/*`**: Hàm thuần (format tiền, format ngày, build context Leafie, ...).
- **`frontend/src/types/*`**: TypeScript types cho domain (product, cart, giftBox, user, admin, ...).
- **`frontend/src/constants/*`**: Hằng số (ảnh, file upload config,...).
- **`frontend/src/hooks/*`**: Custom hooks cho data-fetching (gift box, leafie, ...).
- **`frontend/src/data/giftBoxes.ts`**: Dữ liệu mẫu/hardcode cho hộp quà (nếu dùng).

## 4) Scripts — `scripts/`

- **`scripts/download_product_images.py`**: Tải ảnh sản phẩm theo danh sách (phục vụ seed dữ liệu/đồng bộ ảnh).
- **`scripts/download-images.bat`**: Wrapper chạy script download ảnh trên Windows.
- **`scripts/README_DOWNLOAD_IMAGES.md`**: Hướng dẫn tải ảnh hàng loạt.
- **`scripts/check_inventory.py`**: Script kiểm tra tồn kho (phục vụ admin/ops).
- **`scripts/seed_gift_boxes.py`**: Seed dữ liệu hộp quà + BOM (phục vụ demo/dev).


