# Chi tiết Database Schema - Leaf Creme

Dưới đây là chi tiết toàn bộ 31 thực thể (bảng) và các thuộc tính (cột) bên trong chúng dựa trên `app/models.py`.

---

## 1. TÀI KHOẢN & PHÂN QUYỀN

### 1.1 `VaiTro` (Vai trò & Quyền)
- **vaitro_id** (PK): Mã vai trò (int)
- **ten_vai_tro**: Tên vai trò (VD: admin, user) (Unique)
- **mo_ta**: Mô tả vai trò
- **quyen_xem, quyen_them, quyen_sua, quyen_xoa**: JSON ghi chú các quyền tương ứng
- **ngay_tao**: Ngày tạo

### 1.2 `NguoiDung` (Người dùng)
- **nguoidung_id** (PK): Mã người dùng (int)
- **ten_dang_nhap**: Username (Unique)
- **email**: Email (Unique)
- **mat_khau_ma_hoa**: Mật khẩu đã hash
- **vaitro_id** (FK): Liên kết tới bảng `VaiTro`
- **ho_ten**: Họ và tên
- **so_dien_thoai**: SDT (Unique)
- **dia_chi, ngay_sinh, gioi_tinh, avatar_url**: Các thông tin cá nhân
- **dang_hoat_dong**: Trạng thái khóa/mở (boolean)
- **lan_dang_nhap_cuoi, ngay_tao, ngay_cap_nhat**: Timestamp

---

## 2. QUẢN LÝ SẢN PHẨM & BIẾN THỂ

### 2.1 `SanPham` (Sản phẩm gốc)
- **sanpham_id** (PK): Mã sản phẩm gốc
- **ten, sku**: Tên và Mã SKU (Unique)
- **loai**: Thể loại (đơn, biến thể, hộp quà)
- **gia_co_ban**: Giá gốc mặc định
- **mo_ta, hinh_anh_url, danh_muc, don_vi_tinh**: Thông tin hiển thị (tên danh mục, hình ảnh...)
- **phu_hop_dip**: Mảng các dịp tặng phù hợp (birthday, love, holiday...)
- **dang_hoat_dong, ngay_tao, ngay_cap_nhat**: Trạng thái, ngày tháng

### 2.2 `BienTheSanPham` (Phiên bản của sản phẩm)
- **bienthe_id** (PK): Mã biến thể
- **sanpham_id** (FK): Liên kết với `SanPham`
- **huong_vi, kich_thuoc**: Đặc tính biến thể
- **gia_bienthe**: Giá của riêng dòng máy/khối lượng này
- **sku_bienthe**: SKU riêng (Unique)
- **muc_gioi_han_ton**: Ngưỡng tồn kho để hệ thống báo động
- **dang_hoat_dong, ngay_tao**: Trạng thái

### 2.3 `HopQua` (Danh mục hộp quà set mix sẵn)
- **hop_qua_id** (PK): Mã hộp quà
- **ten_hop_qua, sku**: Tên, mã tham chiếu
- **gia_ban**: Giá bán lẻ của hộp
- **mo_ta, hinh_anh_url, kich_thuoc, trong_luong**: Chi tiết hiện thị
- **dang_hoat_dong, ngay_tao**: Trạng thái

---

## 3. MUA HÀNG & ĐỐI TÁC

### 3.1 `NhaCungCap` (Nhà cung ứng)
- **ncc_id** (PK): Mã NCC
- **ten_ncc, ma_ncc**: Tên và mã tham chiếu
- **nguoi_lien_he, so_dien_thoai, email, dia_chi**: Thông tin liên lạc
- **thong_tin_thanh_toan**: (JSON) STK, Tên ngân hàng...
- **ghi_chu, dang_hoat_dong, ngay_tao**

### 3.2 `LinhKien` (Phụ kiện/Nguyên vật liệu)
- **linh_kien_id** (PK): Mã linh kiện
- **ten_linh_kien, sku**: Tên và mã
- **don_vi_tinh**: Cân/đong/đếm (VD: kg, cuộn, cái)
- **gia_don_vi**: Đơn giá mua
- **mo_ta, dang_hoat_dong, ngay_tao**
- **ncc_id** (FK): Liên kết với bảng `NhaCungCap` (ai bán)

---

## 4. QUẢN LÝ LÔ HÀNG (BATCH TRACKING - FEFO)

### 4.1 `LoHangSanPham` (Lô bánh)
- **lohang_id** (PK): Mã lô
- **bienthe_sanpham_id** (FK): Lô này là của Biến thể nào
- **ncc_id** (FK): Nhập từ ai
- **ma_lo**: Kí hiệu lô (Unique)
- **ngay_nhap**: Thời gian nhập lô
- **ngay_het_han**: Date hết hạn (Dùng để FEFO)
- **so_luong, gia_don_vi**: SL nhập / Đơn giá chia theo item
- **trang_thai**: hoatdong, hethan, huy
- **ma_qr, ghi_chu, ngay_tao**

### 4.2 `LoHangLinhKien` (Lô đồ ruy băng/phụ kiện)
*(Các trường y hệt `LoHangSanPham` nhưng trỏ tới `linh_kien_id` thay vì sản phẩm)*

### 4.3 `LoHangHopQua` (Lô hộp quà làm sẵn)
*(Các trường y hệt, nhưng trỏ tới `hop_qua_id`)*

---

## 5. TỒN KHO HIỆN TẠI

### 5.1 `TonKhoSanPham`
- **tonkho_id** (PK)
- **lohang_sanpham_id** (FK - Unique): Map 1-1 với lô sản phẩm
- **so_luong_hien_tai**: SL thực tế còn tồn
- **so_luong_da_ban**: SL đã bay ra khỏi kho
- **lan_cap_nhat_cuoi**: Timestamp last changed

### 5.2 `TonKhoLinhKien`
- **tonkho_id** (PK)
- **lohang_linhkien_id** (FK - Unique)
- **so_luong_hien_tai, so_luong_da_su_dung, lan_cap_nhat_cuoi**

### 5.3 `TonKhoHopQua`
- **tonkho_id** (PK)
- **lohang_hopqua_id** (FK - Unique)
- **so_luong_hien_tai, so_luong_da_ban, lan_cap_nhat_cuoi**

---

## 6. CÔNG THỨC (BOM) LÀM HỘP QUÀ TÙY ĐỐI

### 6.1 `CongThucHopQua` (BOM cấu tạo phụ kiện vỏ)
- **bom_id** (PK)
- **hop_qua_id** (FK): Mã loại hộp quà
- **lohang_linhkien_id** (FK): Mã loại linh kiện (Ví dụ vỏ giấy size L, 3 mét nơ)
- **so_luong_linh_kien**: Hao phí linh kiện để đóng gói
- **huong_dan**: Note cách thắt nơ...
- **thu_tu_lap_rap**: Bước làm số 1 2 3...
- **ngay_tao**

### 6.2 `HopQuaBOM` (BOM cốt bánh - nhân bên trong hộp)
- **bom_id** (PK)
- **hop_qua_id** (FK): Loại hộp quà
- **bienthe_id** (FK): Sẽ bỏ bánh/biến thể Bánh Nào vào
- **so_luong**: Số lượng bỏ vào
- **ngay_tao**

---

## 7. KHUYẾN MÃI (VOUCHER)

### 7.1 `PhieuGiamGia`
- **phieugiam_id** (PK)
- **ma_phieu, ten_phieu**: (VD: SUMMERT2)
- **loai_giam**: Trừ thẳng tiền ('sotien') hay % ('phantram')
- **gia_tri_giam**: Số lượng tương ứng loại trên
- **tong_tien_toi_thieu**: Rule minimum giỏ hàng áp voucher
- **ngay_bat_dau, ngay_het_han**: Thời hạn hiệu lực
- **gioi_han_su_dung, so_lan_da_dung, gioi_han_nguoi_dung**: Logic spam protection
- **san_pham_ap_dung**: (JSON) Liệt kê mã sản phẩm đc apply nếu không phải mua all
- **dang_hoat_dong, mo_ta, ngay_tao**

---

## 8. ĐƠN HÀNG VÀ CHUỖI THANH TOÁN

### 8.1 `DonHang` (Bảng cha - Header Hoá đơn)
- **donhang_id** (PK)
- **ma_don_hang**: (Unique) mã show cho KH
- **nguoidung_id** (FK): Liên kết khách hàng (ẩn danh thì Null)
- **loai_don**: pos (tại quầy), dattruoc (Pre Order), online
- **tong_tien**: Giá gốc
- **tien_giam_gia**: Tiền chiết khấu
- **tien_thanh_toan**: Thực bách
- **tien_dat_coc**: Đã thu trước (nếu là preorder)
- **trang_thai**: cho, thanh_toan, da_nhan, huy, dang_xu_ly
- **ngay_nhan, ngay_giao_du_kien**: Kế hoạch ship
- **ghi_chu, ten_khach_hang, so_dien_thoai_khach, dia_chi_giao_hang**: Chứa TT bill
- **nhan_vien_tao**: (FK) Ai tạo bill nội bộ
- **ngay_tao, ngay_cap_nhat**

### 8.2 `DonHangPhieuGiamGia` (Junction table)
- **donhang_id** (FK PK)
- **phieugiam_id** (FK PK): Voucher áp dụng
- **so_tien_giam**: Lượng tiền lưu tại thời điểm chốt đơn

### 8.3 `ChiTietDonHang` (Line Items hóa đơn)
- **chitiet_id** (PK)
- **donhang_id** (FK): Hóa đơn cha
- **lohang_sanpham_id, lohang_hopqua_id**: (FKs) Bắt chính xác LOT/LÔ nào sẽ trừ của SP/HQA
- **hop_qua_id** (FK): Sản phẩm chung quy
- **so_luong, gia_don_vi**: Khối lượng mua
- **tong_tien_phu**: Thành tiền từng mặt hàng
- **ghi_chu, trang_thai_don_hang, ngay_tao**

### 8.4 `ThanhToan` (Transaction Receipt)
- **thanhtoan_id** (PK)
- **donhang_id** (FK)
- **phuong_thuc**: tien_mat, chuyen_khoan...
- **so_tien**
- **trang_thai**: dang_xu_ly, thanh_cong, that_bai, huy
- **ma_giao_dich**: Mã đối soát Momo/VNPay
- **thong_tin_giao_dich**: JSON log thô từ máy Pos/Gateway
- **ngay_thanh_toan, ngay_tao**

### 8.5 `DoiTra` (Hoàn trả)
- **doitra_id** (PK)
- **donhang_id** (FK), **chitiet_id** (FK): Trả lại món của đơn nào
- **ly_do**, **so_luong_tra**, **tien_hoan**
- **trang_thai**: yeu_cau, dong_y, tu_choi, hoan_thanh
- **nhan_vien_xu_ly** (FK), **ghi_chu_nhan_vien**, **ngay_tao, ngay_xu_ly**

### 8.6 `GioHang` (Cart Header)
- **giohang_id** (PK)
- **nguoidung_id** (FK), **session_id**: Dành cho khách ẩn danh hoặc đã login
- **ngay_tao, ngay_cap_nhat**

### 8.7 `ChiTietGioHang` (Cart Items)
- **chitiet_id** (PK)
- **giohang_id** (FK)
- **lohang_sanpham_id, lohang_hopqua_id** (FK)
- **so_luong, ghi_chu, ngay_them**

---

## 9. LỊCH SỬ KHO (TRUY VẾT & LOGGING)
*(Dùng để check rò rỉ nguyên vật liệu và doanh số kho)*

### 9.1 `LichSuKhoSanPham` & `LichSuKhoLinhKien` & `LichSuKhoHopQua`
- **lichsu_id** (PK)
- **lohang_XXX_id** (FK): Gắn với Lô cụ thể
- **loai_giao_dich**: nhap, xuat, dieu_chuyen, kiem_ke, huy
- **so_luong**: Lượng thay đổi số dư (+/-)
- **so_luong_truoc, so_luong_sau**: Base để tính snapshot
- **gia_tri**: Trị giá giao dịch
- **ly_do**: Nguyên nhân xuất/nhập/hao hụt
- **donhang_id, doitra_id, bom_id**: Links tới nghiệp vụ gây ra lịch sử (Tùy loại bảng)
- **nguoidung_id**: (FK) Ai thực hiện thao tác
- **ngay_tao**

### 9.4 `LichSuGia`
- **lichsu_id** (PK)
- **sanpham_id, bienthe_id** (FK)
- **gia_cu, gia_moi**: Khoảng trượt giá để đối chiếu
- **ly_do_thay_doi, ngay_thay_doi**
- **nguoi_thay_doi** (FK)

---

## 10. CHĂM SÓC KHÁCH HÀNG & MONITORING

### 10.1 `DanhGiaSanPham`
- **danhgia_id** (PK)
- **sanpham_id, nguoidung_id, donhang_id** (FKs)
- **so_sao**: 1 tới 5
- **tieu_de, noi_dung, hinh_anh_url**: Media/Comments (Array Text)
- **trang_thai**: cho_duyet, đã xuất ...
- **nguoi_duyet** (FK), **ngay_tao, ngay_duyet**

### 10.2 `CanhBaoTonKho` (Alarms sinh bởi Cron/Background task)
- **canhbao_id** (PK)
- **lohang_XXX_id**: Lô nào đang gặp lỗi/deadline
- **loai_canh_bao**: het_han, sap_het_han, ton_kho_thap, qua_han
- **muc_do_nghiem_trong**: thap, binh_thuong, cao
- **ngay_canh_bao**
- **trang_thai**: chua_xu_ly, đa_xu_ly
- **nguoi_xu_ly** (FK), **ngay_xu_ly, ghi_chu**

### 10.3 `SystemLog`
- **log_id** (PK)
- **nguoi_dung_id** (FK)
- **hanh_dong**: Create, Update, Delete nghiệp vụ
- **bang_du_lieu**: Table nào bị tác động
- **ban_ghi_id**: Row ID nào
- **chi_tiet_cu, chi_tiet_moi**: (JSON) Log lại snapshot body request đổi thay ra sao
- **ip_address, user_agent**: Client meta dữ kiện
- **ngay_tao**

---

## 11. BÁO CÁO NHANH

### 11.1 `ThongKeSanPham`
- **thongke_id** (PK)
- **sanpham_id, bienthe_id** (FK)
- **ngay_thong_ke**: (Unique với sanpham, bienthe) Grouping By Date
- **so_luong_ban**: Số nhẩm pre-calculated
- **doanh_thu**: Tổng tiền cho Date nớ
- **so_don_hang, gia_trung_binh**
