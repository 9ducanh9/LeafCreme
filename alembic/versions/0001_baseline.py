"""baseline: recreate current schema (32 tables, 11 enum types)

1:1 mirror of app/models.py at the point Alembic was introduced (merged-main,
built on top of UpdateT5's schema — see the "Merge UpdateT5 into main as
canonical baseline" commit). Generated from live SQLAlchemy metadata, not
hand-typed, so it is guaranteed to match the ORM exactly.

Two tables that predate this migration were added to the real database via
ad-hoc SQL scripts in migrations/*.sql rather than through the ORM:
  - phanbolo_chitietdonhang and the sanpham.phu_hop_dip column ARE modeled
    in app/models.py already (someone back-filled the ORM after the fact),
    so they are included here automatically via Base.metadata.
  - chat_messages is NOT modeled in app/models.py on purpose (it belongs to
    an external n8n workflow, not this app) and is intentionally handled in
    0002_chat_messages_n8n.py instead, so this migration stays a pure ORM
    mirror.

Revision ID: 0001_baseline
Revises:
"""
from alembic import op

# revision identifiers, used by Alembic.
revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- 1. ENUM types (must exist before any table references them) ---

    op.execute(
        "CREATE TYPE loai_san_pham AS ENUM ('don', 'bien_the', 'hop_qua');"
    )

    op.execute(
        "CREATE TYPE loai_don_hang AS ENUM ('pos', 'dattruoc', 'online');"
    )

    op.execute(
        "CREATE TYPE trang_thai_don_hang AS ENUM ('cho', 'thanh_toan', 'da_nhan', 'huy', 'dang_xu_ly');"
    )

    op.execute(
        "CREATE TYPE trang_thai_lo_hang AS ENUM ('hoatdong', 'hethan', 'huy');"
    )

    op.execute(
        "CREATE TYPE loai_giam_gia AS ENUM ('phantram', 'sotien');"
    )

    op.execute(
        "CREATE TYPE phuong_thuc_thanh_toan AS ENUM ('tien_mat', 'chuyen_khoan', 'the', 'vi_dien_tu');"
    )

    op.execute(
        "CREATE TYPE trang_thai_thanh_toan AS ENUM ('dang_xu_ly', 'thanh_cong', 'that_bai', 'huy');"
    )

    op.execute(
        "CREATE TYPE trang_thai_doi_tra AS ENUM ('yeu_cau', 'dong_y', 'tu_choi', 'hoan_thanh');"
    )

    op.execute(
        "CREATE TYPE loai_giao_dich_kho AS ENUM ('nhap', 'xuat', 'dieu_chuyen', 'kiem_ke', 'huy');"
    )

    op.execute(
        "CREATE TYPE loai_canh_bao AS ENUM ('het_han', 'sap_het_han', 'ton_kho_thap', 'qua_han');"
    )

    op.execute(
        "CREATE TYPE muc_do_nghiem_trong AS ENUM ('thap', 'binh_thuong', 'cao');"
    )



    # --- 2. Tables, in FK-dependency order (topologically sorted by SQLAlchemy) ---

    op.execute(
        """
        CREATE TABLE hopqua (
        	hop_qua_id SERIAL NOT NULL, 
        	ten_hop_qua VARCHAR(200) NOT NULL, 
        	sku VARCHAR(50), 
        	gia_ban NUMERIC(10, 2) NOT NULL, 
        	mo_ta TEXT, 
        	hinh_anh_url VARCHAR(500), 
        	kich_thuoc VARCHAR(100), 
        	trong_luong NUMERIC(8, 2), 
        	dang_hoat_dong BOOLEAN NOT NULL, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (hop_qua_id), 
        	UNIQUE (sku)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE nhacungcap (
        	ncc_id SERIAL NOT NULL, 
        	ten_ncc VARCHAR(200) NOT NULL, 
        	ma_ncc VARCHAR(50), 
        	nguoi_lien_he VARCHAR(100), 
        	so_dien_thoai VARCHAR(20), 
        	email VARCHAR(100), 
        	dia_chi TEXT, 
        	thong_tin_thanh_toan JSONB, 
        	ghi_chu TEXT, 
        	dang_hoat_dong BOOLEAN NOT NULL, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (ncc_id), 
        	UNIQUE (ma_ncc)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE phieugiamgia (
        	phieugiam_id SERIAL NOT NULL, 
        	ma_phieu VARCHAR(50) NOT NULL, 
        	ten_phieu VARCHAR(100) NOT NULL, 
        	loai_giam loai_giam_gia NOT NULL, 
        	gia_tri_giam NUMERIC(10, 2) NOT NULL, 
        	tong_tien_toi_thieu NUMERIC(10, 2) NOT NULL, 
        	ngay_bat_dau TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	ngay_het_han TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
        	gioi_han_su_dung INTEGER NOT NULL, 
        	so_lan_da_dung INTEGER NOT NULL, 
        	gioi_han_nguoi_dung INTEGER, 
        	san_pham_ap_dung JSONB, 
        	dang_hoat_dong BOOLEAN NOT NULL, 
        	mo_ta TEXT, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (phieugiam_id), 
        	UNIQUE (ma_phieu)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE sanpham (
        	sanpham_id SERIAL NOT NULL, 
        	ten VARCHAR(200) NOT NULL, 
        	sku VARCHAR(50) NOT NULL, 
        	loai loai_san_pham DEFAULT 'don' NOT NULL, 
        	gia_co_ban NUMERIC(10, 2) NOT NULL, 
        	mo_ta TEXT, 
        	hinh_anh_url VARCHAR(500), 
        	danh_muc VARCHAR(100), 
        	don_vi_tinh VARCHAR(20) DEFAULT 'chiếc', 
        	phu_hop_dip VARCHAR[], 
        	dang_hoat_dong BOOLEAN NOT NULL, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	ngay_cap_nhat TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (sanpham_id), 
        	UNIQUE (sku)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE vaitro (
        	vaitro_id SERIAL NOT NULL, 
        	ten_vai_tro VARCHAR(50) NOT NULL, 
        	mo_ta VARCHAR(255), 
        	quyen_xem JSONB, 
        	quyen_them JSONB, 
        	quyen_sua JSONB, 
        	quyen_xoa JSONB, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (vaitro_id), 
        	UNIQUE (ten_vai_tro)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE bienthesanpham (
        	bienthe_id SERIAL NOT NULL, 
        	sanpham_id INTEGER NOT NULL, 
        	huong_vi VARCHAR(100) NOT NULL, 
        	kich_thuoc VARCHAR(50), 
        	gia_bienthe NUMERIC(10, 2) NOT NULL, 
        	sku_bienthe VARCHAR(50), 
        	muc_gioi_han_ton INTEGER NOT NULL, 
        	dang_hoat_dong BOOLEAN NOT NULL, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (bienthe_id), 
        	FOREIGN KEY(sanpham_id) REFERENCES sanpham (sanpham_id) ON DELETE CASCADE, 
        	UNIQUE (sku_bienthe)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE linhkien (
        	linh_kien_id SERIAL NOT NULL, 
        	ten_linh_kien VARCHAR(100) NOT NULL, 
        	sku VARCHAR(50), 
        	don_vi_tinh VARCHAR(20) DEFAULT 'kg', 
        	gia_don_vi NUMERIC(10, 2) NOT NULL, 
        	mo_ta TEXT, 
        	ncc_id INTEGER, 
        	dang_hoat_dong BOOLEAN NOT NULL, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (linh_kien_id), 
        	UNIQUE (sku), 
        	FOREIGN KEY(ncc_id) REFERENCES nhacungcap (ncc_id)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE lohanghopqua (
        	lohang_id SERIAL NOT NULL, 
        	hop_qua_id INTEGER NOT NULL, 
        	ncc_id INTEGER, 
        	ma_lo VARCHAR(50) NOT NULL, 
        	ngay_nhap TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	ngay_het_han TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
        	so_luong INTEGER NOT NULL, 
        	gia_don_vi NUMERIC(10, 2) NOT NULL, 
        	trang_thai trang_thai_lo_hang DEFAULT 'hoatdong' NOT NULL, 
        	ma_qr VARCHAR(100), 
        	ghi_chu TEXT, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (lohang_id), 
        	FOREIGN KEY(hop_qua_id) REFERENCES hopqua (hop_qua_id) ON DELETE CASCADE, 
        	FOREIGN KEY(ncc_id) REFERENCES nhacungcap (ncc_id), 
        	UNIQUE (ma_lo), 
        	UNIQUE (ma_qr)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE nguoidung (
        	nguoidung_id SERIAL NOT NULL, 
        	ten_dang_nhap VARCHAR(50) NOT NULL, 
        	email VARCHAR(100) NOT NULL, 
        	mat_khau_ma_hoa VARCHAR(255) NOT NULL, 
        	vaitro_id INTEGER NOT NULL, 
        	ho_ten VARCHAR(100) NOT NULL, 
        	so_dien_thoai VARCHAR(20), 
        	dia_chi TEXT, 
        	ngay_sinh DATE, 
        	gioi_tinh VARCHAR(10), 
        	avatar_url VARCHAR(500), 
        	dang_hoat_dong BOOLEAN NOT NULL, 
        	lan_dang_nhap_cuoi TIMESTAMP WITHOUT TIME ZONE, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	ngay_cap_nhat TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (nguoidung_id), 
        	UNIQUE (ten_dang_nhap), 
        	UNIQUE (email), 
        	FOREIGN KEY(vaitro_id) REFERENCES vaitro (vaitro_id) ON DELETE RESTRICT, 
        	UNIQUE (so_dien_thoai)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE donhang (
        	donhang_id SERIAL NOT NULL, 
        	ma_don_hang VARCHAR(50) NOT NULL, 
        	nguoidung_id INTEGER, 
        	loai_don loai_don_hang DEFAULT 'pos' NOT NULL, 
        	tong_tien NUMERIC(10, 2) NOT NULL, 
        	tien_giam_gia NUMERIC(10, 2) NOT NULL, 
        	tien_thanh_toan NUMERIC(10, 2) NOT NULL, 
        	tien_dat_coc NUMERIC(10, 2) NOT NULL, 
        	trang_thai trang_thai_don_hang DEFAULT 'cho' NOT NULL, 
        	ngay_nhan TIMESTAMP WITHOUT TIME ZONE, 
        	ngay_giao_du_kien TIMESTAMP WITHOUT TIME ZONE, 
        	ghi_chu TEXT, 
        	ten_khach_hang VARCHAR(100), 
        	so_dien_thoai_khach VARCHAR(20), 
        	dia_chi_giao_hang TEXT, 
        	nhan_vien_tao INTEGER, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	ngay_cap_nhat TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (donhang_id), 
        	UNIQUE (ma_don_hang), 
        	FOREIGN KEY(nguoidung_id) REFERENCES nguoidung (nguoidung_id) ON DELETE SET NULL, 
        	FOREIGN KEY(nhan_vien_tao) REFERENCES nguoidung (nguoidung_id) ON DELETE SET NULL
        );
        """
    )

    op.execute(
        """
        CREATE TABLE giohang (
        	giohang_id SERIAL NOT NULL, 
        	nguoidung_id INTEGER, 
        	session_id VARCHAR(100), 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	ngay_cap_nhat TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (giohang_id), 
        	FOREIGN KEY(nguoidung_id) REFERENCES nguoidung (nguoidung_id) ON DELETE CASCADE
        );
        """
    )

    op.execute(
        """
        CREATE TABLE hopquabom (
        	bom_id SERIAL NOT NULL, 
        	hop_qua_id INTEGER NOT NULL, 
        	bienthe_id INTEGER NOT NULL, 
        	so_luong INTEGER NOT NULL, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (bom_id), 
        	UNIQUE (hop_qua_id, bienthe_id), 
        	FOREIGN KEY(hop_qua_id) REFERENCES hopqua (hop_qua_id) ON DELETE CASCADE, 
        	FOREIGN KEY(bienthe_id) REFERENCES bienthesanpham (bienthe_id) ON DELETE CASCADE
        );
        """
    )

    op.execute(
        """
        CREATE TABLE lichsugia (
        	lichsu_id SERIAL NOT NULL, 
        	sanpham_id INTEGER, 
        	bienthe_id INTEGER, 
        	gia_cu NUMERIC(10, 2), 
        	gia_moi NUMERIC(10, 2) NOT NULL, 
        	ly_do_thay_doi VARCHAR(255), 
        	ngay_thay_doi TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	nguoi_thay_doi INTEGER, 
        	PRIMARY KEY (lichsu_id), 
        	FOREIGN KEY(sanpham_id) REFERENCES sanpham (sanpham_id), 
        	FOREIGN KEY(bienthe_id) REFERENCES bienthesanpham (bienthe_id), 
        	FOREIGN KEY(nguoi_thay_doi) REFERENCES nguoidung (nguoidung_id) ON DELETE SET NULL
        );
        """
    )

    op.execute(
        """
        CREATE TABLE lohanglinhkien (
        	lohang_id SERIAL NOT NULL, 
        	linh_kien_id INTEGER NOT NULL, 
        	ncc_id INTEGER, 
        	ma_lo VARCHAR(50) NOT NULL, 
        	ngay_nhap TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	ngay_het_han TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
        	so_luong INTEGER NOT NULL, 
        	gia_don_vi NUMERIC(10, 2) NOT NULL, 
        	trang_thai trang_thai_lo_hang DEFAULT 'hoatdong' NOT NULL, 
        	ma_qr VARCHAR(100), 
        	ghi_chu TEXT, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (lohang_id), 
        	FOREIGN KEY(linh_kien_id) REFERENCES linhkien (linh_kien_id) ON DELETE CASCADE, 
        	FOREIGN KEY(ncc_id) REFERENCES nhacungcap (ncc_id), 
        	UNIQUE (ma_lo), 
        	UNIQUE (ma_qr)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE lohangsanpham (
        	lohang_id SERIAL NOT NULL, 
        	bienthe_sanpham_id INTEGER NOT NULL, 
        	ncc_id INTEGER, 
        	ma_lo VARCHAR(50) NOT NULL, 
        	ngay_nhap TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	ngay_het_han TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
        	so_luong INTEGER NOT NULL, 
        	gia_don_vi NUMERIC(10, 2) NOT NULL, 
        	trang_thai trang_thai_lo_hang DEFAULT 'hoatdong' NOT NULL, 
        	ma_qr VARCHAR(100), 
        	ghi_chu TEXT, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (lohang_id), 
        	FOREIGN KEY(bienthe_sanpham_id) REFERENCES bienthesanpham (bienthe_id) ON DELETE CASCADE, 
        	FOREIGN KEY(ncc_id) REFERENCES nhacungcap (ncc_id), 
        	UNIQUE (ma_lo), 
        	UNIQUE (ma_qr)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE systemlog (
        	log_id SERIAL NOT NULL, 
        	nguoi_dung_id INTEGER, 
        	hanh_dong VARCHAR(100) NOT NULL, 
        	bang_du_lieu VARCHAR(50), 
        	ban_ghi_id INTEGER, 
        	chi_tiet_cu JSONB, 
        	chi_tiet_moi JSONB, 
        	ip_address VARCHAR(45), 
        	user_agent TEXT, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (log_id), 
        	FOREIGN KEY(nguoi_dung_id) REFERENCES nguoidung (nguoidung_id) ON DELETE SET NULL
        );
        """
    )

    op.execute(
        """
        CREATE TABLE thongkesanpham (
        	thongke_id SERIAL NOT NULL, 
        	sanpham_id INTEGER, 
        	bienthe_id INTEGER, 
        	ngay_thong_ke DATE NOT NULL, 
        	so_luong_ban INTEGER NOT NULL, 
        	doanh_thu NUMERIC(10, 2) NOT NULL, 
        	so_don_hang INTEGER NOT NULL, 
        	gia_trung_binh NUMERIC(10, 2), 
        	PRIMARY KEY (thongke_id), 
        	UNIQUE (sanpham_id, bienthe_id, ngay_thong_ke), 
        	FOREIGN KEY(sanpham_id) REFERENCES sanpham (sanpham_id), 
        	FOREIGN KEY(bienthe_id) REFERENCES bienthesanpham (bienthe_id)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE tonkhohopqua (
        	tonkho_id SERIAL NOT NULL, 
        	lohang_hopqua_id INTEGER NOT NULL, 
        	so_luong_hien_tai INTEGER NOT NULL, 
        	so_luong_da_ban INTEGER NOT NULL, 
        	lan_cap_nhat_cuoi TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (tonkho_id), 
        	UNIQUE (lohang_hopqua_id), 
        	FOREIGN KEY(lohang_hopqua_id) REFERENCES lohanghopqua (lohang_id) ON DELETE CASCADE
        );
        """
    )

    op.execute(
        """
        CREATE TABLE canhbaotonkho (
        	canhbao_id SERIAL NOT NULL, 
        	lohang_sanpham_id INTEGER, 
        	lohang_hopqua_id INTEGER, 
        	lohang_linhkien_id INTEGER, 
        	loai_canh_bao loai_canh_bao NOT NULL, 
        	muc_do_nghiem_trong muc_do_nghiem_trong DEFAULT 'binh_thuong' NOT NULL, 
        	ngay_canh_bao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	trang_thai VARCHAR(20) DEFAULT 'chua_xu_ly' NOT NULL, 
        	nguoi_xu_ly INTEGER, 
        	ngay_xu_ly TIMESTAMP WITHOUT TIME ZONE, 
        	ghi_chu TEXT, 
        	PRIMARY KEY (canhbao_id), 
        	FOREIGN KEY(lohang_sanpham_id) REFERENCES lohangsanpham (lohang_id), 
        	FOREIGN KEY(lohang_hopqua_id) REFERENCES lohanghopqua (lohang_id), 
        	FOREIGN KEY(lohang_linhkien_id) REFERENCES lohanglinhkien (lohang_id), 
        	FOREIGN KEY(nguoi_xu_ly) REFERENCES nguoidung (nguoidung_id) ON DELETE SET NULL
        );
        """
    )

    op.execute(
        """
        CREATE TABLE chitietdonhang (
        	chitiet_id SERIAL NOT NULL, 
        	donhang_id INTEGER NOT NULL, 
        	lohang_sanpham_id INTEGER, 
        	lohang_hopqua_id INTEGER, 
        	hop_qua_id INTEGER, 
        	so_luong INTEGER NOT NULL, 
        	gia_don_vi NUMERIC(10, 2) NOT NULL, 
        	tong_tien_phu NUMERIC(10, 2) NOT NULL, 
        	ghi_chu TEXT, 
        	trang_thai_don_hang trang_thai_don_hang DEFAULT 'dang_xu_ly' NOT NULL, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (chitiet_id), 
        	FOREIGN KEY(donhang_id) REFERENCES donhang (donhang_id) ON DELETE CASCADE, 
        	FOREIGN KEY(lohang_sanpham_id) REFERENCES lohangsanpham (lohang_id), 
        	FOREIGN KEY(lohang_hopqua_id) REFERENCES lohanghopqua (lohang_id), 
        	FOREIGN KEY(hop_qua_id) REFERENCES hopqua (hop_qua_id)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE chitietgiohang (
        	chitiet_id SERIAL NOT NULL, 
        	giohang_id INTEGER NOT NULL, 
        	lohang_sanpham_id INTEGER, 
        	lohang_hopqua_id INTEGER, 
        	so_luong INTEGER NOT NULL, 
        	ghi_chu TEXT, 
        	ngay_them TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (chitiet_id), 
        	FOREIGN KEY(giohang_id) REFERENCES giohang (giohang_id) ON DELETE CASCADE, 
        	FOREIGN KEY(lohang_sanpham_id) REFERENCES lohangsanpham (lohang_id), 
        	FOREIGN KEY(lohang_hopqua_id) REFERENCES lohanghopqua (lohang_id)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE congthuchopqua (
        	bom_id SERIAL NOT NULL, 
        	hop_qua_id INTEGER NOT NULL, 
        	lohang_linhkien_id INTEGER NOT NULL, 
        	so_luong_linh_kien INTEGER NOT NULL, 
        	huong_dan TEXT, 
        	thu_tu_lap_rap INTEGER NOT NULL, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (bom_id), 
        	UNIQUE (hop_qua_id, lohang_linhkien_id), 
        	FOREIGN KEY(hop_qua_id) REFERENCES hopqua (hop_qua_id) ON DELETE CASCADE, 
        	FOREIGN KEY(lohang_linhkien_id) REFERENCES lohanglinhkien (lohang_id) ON DELETE CASCADE
        );
        """
    )

    op.execute(
        """
        CREATE TABLE danhgiasanpham (
        	danhgia_id SERIAL NOT NULL, 
        	sanpham_id INTEGER, 
        	nguoidung_id INTEGER, 
        	donhang_id INTEGER, 
        	so_sao INTEGER NOT NULL, 
        	tieu_de VARCHAR(200), 
        	noi_dung TEXT, 
        	hinh_anh_url TEXT[], 
        	trang_thai VARCHAR(20) DEFAULT 'cho_duyet' NOT NULL, 
        	nguoi_duyet INTEGER, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	ngay_duyet TIMESTAMP WITHOUT TIME ZONE, 
        	PRIMARY KEY (danhgia_id), 
        	FOREIGN KEY(sanpham_id) REFERENCES sanpham (sanpham_id) ON DELETE CASCADE, 
        	FOREIGN KEY(nguoidung_id) REFERENCES nguoidung (nguoidung_id) ON DELETE SET NULL, 
        	FOREIGN KEY(donhang_id) REFERENCES donhang (donhang_id) ON DELETE SET NULL, 
        	FOREIGN KEY(nguoi_duyet) REFERENCES nguoidung (nguoidung_id) ON DELETE SET NULL
        );
        """
    )

    op.execute(
        """
        CREATE TABLE donhang_phieugiamgia (
        	donhang_id INTEGER NOT NULL, 
        	phieugiam_id INTEGER NOT NULL, 
        	so_tien_giam NUMERIC(10, 2) NOT NULL, 
        	ngay_ap_dung TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (donhang_id, phieugiam_id), 
        	FOREIGN KEY(donhang_id) REFERENCES donhang (donhang_id) ON DELETE CASCADE, 
        	FOREIGN KEY(phieugiam_id) REFERENCES phieugiamgia (phieugiam_id) ON DELETE CASCADE
        );
        """
    )

    op.execute(
        """
        CREATE TABLE lichsukhohopqua (
        	lichsu_id SERIAL NOT NULL, 
        	lohang_hopqua_id INTEGER NOT NULL, 
        	loai_giao_dich loai_giao_dich_kho NOT NULL, 
        	so_luong INTEGER NOT NULL, 
        	so_luong_truoc INTEGER NOT NULL, 
        	so_luong_sau INTEGER NOT NULL, 
        	gia_tri NUMERIC(10, 2), 
        	ly_do TEXT, 
        	donhang_id INTEGER, 
        	nguoidung_id INTEGER, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (lichsu_id), 
        	FOREIGN KEY(lohang_hopqua_id) REFERENCES lohanghopqua (lohang_id), 
        	FOREIGN KEY(donhang_id) REFERENCES donhang (donhang_id), 
        	FOREIGN KEY(nguoidung_id) REFERENCES nguoidung (nguoidung_id)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE thanhtoan (
        	thanhtoan_id SERIAL NOT NULL, 
        	donhang_id INTEGER NOT NULL, 
        	phuong_thuc phuong_thuc_thanh_toan NOT NULL, 
        	so_tien NUMERIC(10, 2) NOT NULL, 
        	trang_thai trang_thai_thanh_toan DEFAULT 'dang_xu_ly' NOT NULL, 
        	ma_giao_dich VARCHAR(100), 
        	thong_tin_giao_dich JSONB, 
        	ngay_thanh_toan TIMESTAMP WITHOUT TIME ZONE, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (thanhtoan_id), 
        	FOREIGN KEY(donhang_id) REFERENCES donhang (donhang_id) ON DELETE CASCADE, 
        	UNIQUE (ma_giao_dich)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE tonkholinhkien (
        	tonkho_id SERIAL NOT NULL, 
        	lohang_linhkien_id INTEGER NOT NULL, 
        	so_luong_hien_tai INTEGER NOT NULL, 
        	so_luong_da_su_dung INTEGER NOT NULL, 
        	lan_cap_nhat_cuoi TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (tonkho_id), 
        	UNIQUE (lohang_linhkien_id), 
        	FOREIGN KEY(lohang_linhkien_id) REFERENCES lohanglinhkien (lohang_id) ON DELETE CASCADE
        );
        """
    )

    op.execute(
        """
        CREATE TABLE tonkhosanpham (
        	tonkho_id SERIAL NOT NULL, 
        	lohang_sanpham_id INTEGER NOT NULL, 
        	so_luong_hien_tai INTEGER NOT NULL, 
        	so_luong_da_ban INTEGER NOT NULL, 
        	lan_cap_nhat_cuoi TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (tonkho_id), 
        	UNIQUE (lohang_sanpham_id), 
        	FOREIGN KEY(lohang_sanpham_id) REFERENCES lohangsanpham (lohang_id) ON DELETE CASCADE
        );
        """
    )

    op.execute(
        """
        CREATE TABLE doitra (
        	doitra_id SERIAL NOT NULL, 
        	donhang_id INTEGER NOT NULL, 
        	chitiet_id INTEGER NOT NULL, 
        	ly_do VARCHAR(255) NOT NULL, 
        	so_luong_tra INTEGER NOT NULL, 
        	tien_hoan NUMERIC(10, 2) NOT NULL, 
        	trang_thai trang_thai_doi_tra DEFAULT 'yeu_cau' NOT NULL, 
        	nhan_vien_xu_ly INTEGER, 
        	ghi_chu_nhan_vien TEXT, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	ngay_xu_ly TIMESTAMP WITHOUT TIME ZONE, 
        	PRIMARY KEY (doitra_id), 
        	FOREIGN KEY(donhang_id) REFERENCES donhang (donhang_id) ON DELETE CASCADE, 
        	FOREIGN KEY(chitiet_id) REFERENCES chitietdonhang (chitiet_id) ON DELETE CASCADE, 
        	FOREIGN KEY(nhan_vien_xu_ly) REFERENCES nguoidung (nguoidung_id) ON DELETE SET NULL
        );
        """
    )

    op.execute(
        """
        CREATE TABLE lichsukholinhkien (
        	lichsu_id SERIAL NOT NULL, 
        	lohang_linhkien_id INTEGER NOT NULL, 
        	loai_giao_dich loai_giao_dich_kho NOT NULL, 
        	so_luong INTEGER NOT NULL, 
        	so_luong_truoc INTEGER NOT NULL, 
        	so_luong_sau INTEGER NOT NULL, 
        	gia_tri NUMERIC(10, 2), 
        	ly_do TEXT, 
        	bom_id INTEGER, 
        	donhang_id INTEGER, 
        	nguoidung_id INTEGER, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (lichsu_id), 
        	FOREIGN KEY(lohang_linhkien_id) REFERENCES lohanglinhkien (lohang_id), 
        	FOREIGN KEY(bom_id) REFERENCES congthuchopqua (bom_id), 
        	FOREIGN KEY(donhang_id) REFERENCES donhang (donhang_id), 
        	FOREIGN KEY(nguoidung_id) REFERENCES nguoidung (nguoidung_id)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE phanbolo_chitietdonhang (
        	phanbo_id SERIAL NOT NULL, 
        	chitiet_id INTEGER NOT NULL, 
        	loai_lohang VARCHAR(20) NOT NULL, 
        	lohang_sanpham_id INTEGER, 
        	lohang_linhkien_id INTEGER, 
        	lohang_hopqua_id INTEGER, 
        	so_luong INTEGER NOT NULL, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (phanbo_id), 
        	CONSTRAINT ck_phanbolo_loai_lohang CHECK (loai_lohang IN ('sanpham', 'linhkien', 'hopqua')), 
        	CONSTRAINT ck_phanbolo_so_luong_positive CHECK (so_luong > 0), 
        	FOREIGN KEY(chitiet_id) REFERENCES chitietdonhang (chitiet_id) ON DELETE CASCADE, 
        	FOREIGN KEY(lohang_sanpham_id) REFERENCES lohangsanpham (lohang_id), 
        	FOREIGN KEY(lohang_linhkien_id) REFERENCES lohanglinhkien (lohang_id), 
        	FOREIGN KEY(lohang_hopqua_id) REFERENCES lohanghopqua (lohang_id)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE lichsukhosanpham (
        	lichsu_id SERIAL NOT NULL, 
        	lohang_sanpham_id INTEGER NOT NULL, 
        	loai_giao_dich loai_giao_dich_kho NOT NULL, 
        	so_luong INTEGER NOT NULL, 
        	so_luong_truoc INTEGER NOT NULL, 
        	so_luong_sau INTEGER NOT NULL, 
        	gia_tri NUMERIC(10, 2), 
        	ly_do TEXT, 
        	donhang_id INTEGER, 
        	doitra_id INTEGER, 
        	nguoidung_id INTEGER, 
        	ngay_tao TIMESTAMP WITHOUT TIME ZONE DEFAULT now() NOT NULL, 
        	PRIMARY KEY (lichsu_id), 
        	FOREIGN KEY(lohang_sanpham_id) REFERENCES lohangsanpham (lohang_id), 
        	FOREIGN KEY(donhang_id) REFERENCES donhang (donhang_id), 
        	FOREIGN KEY(doitra_id) REFERENCES doitra (doitra_id), 
        	FOREIGN KEY(nguoidung_id) REFERENCES nguoidung (nguoidung_id)
        );
        """
    )


def downgrade() -> None:
    # --- 1. Drop tables in reverse dependency order ---
    op.execute("DROP TABLE IF EXISTS lichsukhosanpham CASCADE;")
    op.execute("DROP TABLE IF EXISTS phanbolo_chitietdonhang CASCADE;")
    op.execute("DROP TABLE IF EXISTS lichsukholinhkien CASCADE;")
    op.execute("DROP TABLE IF EXISTS doitra CASCADE;")
    op.execute("DROP TABLE IF EXISTS tonkhosanpham CASCADE;")
    op.execute("DROP TABLE IF EXISTS tonkholinhkien CASCADE;")
    op.execute("DROP TABLE IF EXISTS thanhtoan CASCADE;")
    op.execute("DROP TABLE IF EXISTS lichsukhohopqua CASCADE;")
    op.execute("DROP TABLE IF EXISTS donhang_phieugiamgia CASCADE;")
    op.execute("DROP TABLE IF EXISTS danhgiasanpham CASCADE;")
    op.execute("DROP TABLE IF EXISTS congthuchopqua CASCADE;")
    op.execute("DROP TABLE IF EXISTS chitietgiohang CASCADE;")
    op.execute("DROP TABLE IF EXISTS chitietdonhang CASCADE;")
    op.execute("DROP TABLE IF EXISTS canhbaotonkho CASCADE;")
    op.execute("DROP TABLE IF EXISTS tonkhohopqua CASCADE;")
    op.execute("DROP TABLE IF EXISTS thongkesanpham CASCADE;")
    op.execute("DROP TABLE IF EXISTS systemlog CASCADE;")
    op.execute("DROP TABLE IF EXISTS lohangsanpham CASCADE;")
    op.execute("DROP TABLE IF EXISTS lohanglinhkien CASCADE;")
    op.execute("DROP TABLE IF EXISTS lichsugia CASCADE;")
    op.execute("DROP TABLE IF EXISTS hopquabom CASCADE;")
    op.execute("DROP TABLE IF EXISTS giohang CASCADE;")
    op.execute("DROP TABLE IF EXISTS donhang CASCADE;")
    op.execute("DROP TABLE IF EXISTS nguoidung CASCADE;")
    op.execute("DROP TABLE IF EXISTS lohanghopqua CASCADE;")
    op.execute("DROP TABLE IF EXISTS linhkien CASCADE;")
    op.execute("DROP TABLE IF EXISTS bienthesanpham CASCADE;")
    op.execute("DROP TABLE IF EXISTS vaitro CASCADE;")
    op.execute("DROP TABLE IF EXISTS sanpham CASCADE;")
    op.execute("DROP TABLE IF EXISTS phieugiamgia CASCADE;")
    op.execute("DROP TABLE IF EXISTS nhacungcap CASCADE;")
    op.execute("DROP TABLE IF EXISTS hopqua CASCADE;")

    # --- 2. Drop ENUM types ---
    op.execute("DROP TYPE IF EXISTS muc_do_nghiem_trong;")
    op.execute("DROP TYPE IF EXISTS loai_canh_bao;")
    op.execute("DROP TYPE IF EXISTS loai_giao_dich_kho;")
    op.execute("DROP TYPE IF EXISTS trang_thai_doi_tra;")
    op.execute("DROP TYPE IF EXISTS trang_thai_thanh_toan;")
    op.execute("DROP TYPE IF EXISTS phuong_thuc_thanh_toan;")
    op.execute("DROP TYPE IF EXISTS loai_giam_gia;")
    op.execute("DROP TYPE IF EXISTS trang_thai_lo_hang;")
    op.execute("DROP TYPE IF EXISTS trang_thai_don_hang;")
    op.execute("DROP TYPE IF EXISTS loai_don_hang;")
    op.execute("DROP TYPE IF EXISTS loai_san_pham;")
