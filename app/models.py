# app/models.py
from __future__ import annotations

from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import (
    String, Integer, DateTime, Date, ForeignKey, Text, Boolean, func, Numeric, UniqueConstraint, CheckConstraint
)
from sqlalchemy.dialects.postgresql import ENUM, JSONB, ARRAY
from datetime import datetime, date
from decimal import Decimal

from .db import Base


# =========================================================
# ENUM TYPES (đã tồn tại trong DB)
# =========================================================
loai_san_pham = ENUM("don", "bien_the", name="loai_san_pham", create_type=False)
loai_don_hang = ENUM("pos", "online", "dat_truoc", name="loai_don_hang", create_type=False)
trang_thai_don_hang = ENUM("cho", "dang_xu_ly", "dang_giao", "hoan_thanh", "da_huy", "cho_coc", name="trang_thai_don_hang", create_type=False)
trang_thai_lo_hang = ENUM("hoatdong", "tamdung", "hethan", "daxuathet", name="trang_thai_lo_hang", create_type=False)

# ENUM mới - dùng String nếu chưa biết giá trị chính xác
loai_giam_gia = ENUM("phantram", "sotien", name="loai_giam_gia", create_type=False)
phuong_thuc_thanh_toan = ENUM("tien_mat", "chuyen_khoan", "the_tin_dung", "vi_dien_tu", name="phuong_thuc_thanh_toan", create_type=False)
trang_thai_thanh_toan = ENUM("dang_xu_ly", "thanh_cong", "that_bai", "da_hoan_tien", name="trang_thai_thanh_toan", create_type=False)
trang_thai_doi_tra = ENUM("yeu_cau", "da_duyet", "tu_choi", "da_hoan_thanh", name="trang_thai_doi_tra", create_type=False)
loai_giao_dich_kho = ENUM("nhap_hang", "xuat_ban", "xuat_huy", "dieu_chinh", "kiem_ke", "tra_hang", "xuat_bom", name="loai_giao_dich_kho", create_type=False)
loai_canh_bao = ENUM(
    "het_han",
    "sap_het_han",
    "ton_kho_thap",
    "qua_han",
    "san_pham_can_nhap",
    name="loai_canh_bao",
    create_type=False,
)
muc_do_nghiem_trong = ENUM("thap", "binh_thuong", "cao", name="muc_do_nghiem_trong", create_type=False)


# =========================================================
# 1. VAI TRÒ
# =========================================================
class VaiTro(Base):
    __tablename__ = "vaitro"
    
    vaitro_id: Mapped[int] = mapped_column(primary_key=True)
    ten_vai_tro: Mapped[str] = mapped_column(String(50), unique=True)
    mo_ta: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Database có các cột JSONB: quyen_xem, quyen_them, quyen_sua, quyen_xoa
    # Có thể lưu dạng JSON hoặc boolean, tùy vào cấu trúc database
    quyen_xem: Mapped[dict | bool | None] = mapped_column(JSONB, nullable=True)
    quyen_them: Mapped[dict | bool | None] = mapped_column(JSONB, nullable=True)
    quyen_sua: Mapped[dict | bool | None] = mapped_column(JSONB, nullable=True)
    quyen_xoa: Mapped[dict | bool | None] = mapped_column(JSONB, nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    nguoidung_list: Mapped[list["NguoiDung"]] = relationship(back_populates="vaitro")


# =========================================================
# 2. NGƯỜI DÙNG
# =========================================================
class NguoiDung(Base):
    __tablename__ = "nguoidung"
    
    nguoidung_id: Mapped[int] = mapped_column(primary_key=True)
    ten_dang_nhap: Mapped[str] = mapped_column(String(50), unique=True)
    email: Mapped[str] = mapped_column(String(100), unique=True)
    # Immutable Cognito subject used to map an external identity to this
    # application's existing role and customer records.
    cognito_sub: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    mat_khau_ma_hoa: Mapped[str] = mapped_column(String(255))
    vaitro_id: Mapped[int] = mapped_column(ForeignKey("vaitro.vaitro_id", ondelete="RESTRICT"))
    ho_ten: Mapped[str] = mapped_column(String(100))
    so_dien_thoai: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    dia_chi: Mapped[str | None] = mapped_column(Text, nullable=True)
    ngay_sinh: Mapped[date | None] = mapped_column(Date, nullable=True)
    gioi_tinh: Mapped[str | None] = mapped_column(String(10), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Database column name: avatar_url
    dang_hoat_dong: Mapped[bool] = mapped_column(Boolean, default=True)
    lan_dang_nhap_cuoi: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_cap_nhat: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    
    vaitro: Mapped[VaiTro] = relationship(back_populates="nguoidung_list")


# =========================================================
# 3. SẢN PHẨM / BIẾN THỂ
# =========================================================
class SanPham(Base):
    __tablename__ = "sanpham"
    
    sanpham_id: Mapped[int] = mapped_column(primary_key=True)
    ten: Mapped[str] = mapped_column(String(200))
    sku: Mapped[str] = mapped_column(String(50), unique=True)
    loai: Mapped[str] = mapped_column(loai_san_pham, server_default="don")
    gia_co_ban: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    mo_ta: Mapped[str | None] = mapped_column(Text, nullable=True)
    hinh_anh_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    danh_muc: Mapped[str | None] = mapped_column(String(100), nullable=True)
    don_vi_tinh: Mapped[str | None] = mapped_column(String(20), nullable=True, server_default="chiếc")
    han_su_dung_ngay: Mapped[int | None] = mapped_column(nullable=True)
    phu_hop_dip: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True, comment="Danh sách dịp phù hợp (đồng bộ với GiftBoxOccasion): birthday, thanks, love, holiday, self_care")
    dang_hoat_dong: Mapped[bool] = mapped_column(Boolean, default=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_cap_nhat: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    
    bienthe_list: Mapped[list["BienTheSanPham"]] = relationship(back_populates="sanpham", cascade="all,delete-orphan")


class BienTheSanPham(Base):
    __tablename__ = "bienthesanpham"
    
    bienthe_id: Mapped[int] = mapped_column(primary_key=True)
    sanpham_id: Mapped[int] = mapped_column(ForeignKey("sanpham.sanpham_id", ondelete="CASCADE"))
    huong_vi: Mapped[str] = mapped_column(String(100))
    kich_thuoc: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gia_bienthe: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    sku_bienthe: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    muc_gioi_han_ton: Mapped[int] = mapped_column(default=10)
    dang_hoat_dong: Mapped[bool] = mapped_column(Boolean, default=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    sanpham: Mapped[SanPham] = relationship(back_populates="bienthe_list")
    lo_list: Mapped[list["LoHangSanPham"]] = relationship(back_populates="bienthe")


# =========================================================
# 4. HỘP QUÀ
# =========================================================
class HopQua(Base):
    __tablename__ = "hopqua"
    
    hop_qua_id: Mapped[int] = mapped_column(primary_key=True)
    ten_hop_qua: Mapped[str] = mapped_column(String(200))
    sku: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    gia_ban: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    mo_ta: Mapped[str | None] = mapped_column(Text, nullable=True)
    hinh_anh_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    kich_thuoc: Mapped[str | None] = mapped_column(String(100), nullable=True)
    trong_luong: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    dang_hoat_dong: Mapped[bool] = mapped_column(Boolean, default=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# =========================================================
# 5. NHÀ CUNG CẤP
# =========================================================
class NhaCungCap(Base):
    __tablename__ = "nhacungcap"
    
    ncc_id: Mapped[int] = mapped_column(primary_key=True)
    ten_ncc: Mapped[str] = mapped_column(String(200))
    ma_ncc: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    nguoi_lien_he: Mapped[str | None] = mapped_column(String(100), nullable=True)
    so_dien_thoai: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dia_chi: Mapped[str | None] = mapped_column(Text, nullable=True)
    # JSONB structure (3.4.6B): {"ten_ngan_hang": str, "chi_nhanh": str?, "so_tai_khoan": str, "ten_thu_huong": str}
    # Xem app.schemas.ThongTinThanhToan để validate
    thong_tin_thanh_toan: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ghi_chu: Mapped[str | None] = mapped_column(Text, nullable=True)
    dang_hoat_dong: Mapped[bool] = mapped_column(Boolean, default=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# =========================================================
# 6. LINH KIỆN
# =========================================================
class LinhKien(Base):
    __tablename__ = "linhkien"
    
    linh_kien_id: Mapped[int] = mapped_column(primary_key=True)
    ten_linh_kien: Mapped[str] = mapped_column(String(100))
    sku: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    don_vi_tinh: Mapped[str | None] = mapped_column(String(20), nullable=True, server_default="kg")
    gia_don_vi: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    mo_ta: Mapped[str | None] = mapped_column(Text, nullable=True)
    ncc_id: Mapped[int | None] = mapped_column(ForeignKey("nhacungcap.ncc_id"), nullable=True)
    dang_hoat_dong: Mapped[bool] = mapped_column(Boolean, default=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# =========================================================
# 7-9. LÔ HÀNG (Sản phẩm, Linh kiện, Hộp quà)
# =========================================================
class LoHangSanPham(Base):
    __tablename__ = "lohangsanpham"
    
    lohang_id: Mapped[int] = mapped_column(primary_key=True)
    bienthe_sanpham_id: Mapped[int] = mapped_column(ForeignKey("bienthesanpham.bienthe_id", ondelete="CASCADE"))
    ncc_id: Mapped[int | None] = mapped_column(ForeignKey("nhacungcap.ncc_id"), nullable=True)
    ma_lo: Mapped[str] = mapped_column(String(50), unique=True)
    ngay_nhap: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_san_xuat: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_het_han: Mapped[datetime] = mapped_column(DateTime)
    so_luong: Mapped[int] = mapped_column(nullable=False)
    gia_don_vi: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    trang_thai: Mapped[str] = mapped_column(trang_thai_lo_hang, server_default="hoatdong")
    ma_qr: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    ghi_chu: Mapped[str | None] = mapped_column(Text, nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    bienthe: Mapped[BienTheSanPham] = relationship(back_populates="lo_list")
    tonkho: Mapped["TonKhoSanPham"] = relationship(back_populates="lo", uselist=False)


class LoHangLinhKien(Base):
    __tablename__ = "lohanglinhkien"
    
    lohang_id: Mapped[int] = mapped_column(primary_key=True)
    linh_kien_id: Mapped[int] = mapped_column(ForeignKey("linhkien.linh_kien_id", ondelete="CASCADE"))
    ncc_id: Mapped[int | None] = mapped_column(ForeignKey("nhacungcap.ncc_id"), nullable=True)
    ma_lo: Mapped[str] = mapped_column(String(50), unique=True)
    ngay_nhap: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_het_han: Mapped[datetime] = mapped_column(DateTime)
    so_luong: Mapped[int] = mapped_column(nullable=False)
    gia_don_vi: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    trang_thai: Mapped[str] = mapped_column(trang_thai_lo_hang, server_default="hoatdong")
    ma_qr: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    ghi_chu: Mapped[str | None] = mapped_column(Text, nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class LoHangHopQua(Base):
    __tablename__ = "lohanghopqua"
    
    lohang_id: Mapped[int] = mapped_column(primary_key=True)
    hop_qua_id: Mapped[int] = mapped_column(ForeignKey("hopqua.hop_qua_id", ondelete="CASCADE"))
    ncc_id: Mapped[int | None] = mapped_column(ForeignKey("nhacungcap.ncc_id"), nullable=True)
    ma_lo: Mapped[str] = mapped_column(String(50), unique=True)
    ngay_nhap: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_het_han: Mapped[datetime] = mapped_column(DateTime)
    so_luong: Mapped[int] = mapped_column(nullable=False)
    gia_don_vi: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    trang_thai: Mapped[str] = mapped_column(trang_thai_lo_hang, server_default="hoatdong")
    ma_qr: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    ghi_chu: Mapped[str | None] = mapped_column(Text, nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# =========================================================
# 10-12. TỒN KHO (Sản phẩm, Linh kiện, Hộp quà)
# =========================================================
class TonKhoSanPham(Base):
    __tablename__ = "tonkhosanpham"
    
    tonkho_id: Mapped[int] = mapped_column(primary_key=True)
    lohang_sanpham_id: Mapped[int] = mapped_column(ForeignKey("lohangsanpham.lohang_id", ondelete="CASCADE"), unique=True)
    so_luong_hien_tai: Mapped[int] = mapped_column(default=0)
    so_luong_da_ban: Mapped[int] = mapped_column(default=0)
    lan_cap_nhat_cuoi: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    lo: Mapped[LoHangSanPham] = relationship(back_populates="tonkho")


class TonKhoLinhKien(Base):
    __tablename__ = "tonkholinhkien"
    
    tonkho_id: Mapped[int] = mapped_column(primary_key=True)
    lohang_linhkien_id: Mapped[int] = mapped_column(ForeignKey("lohanglinhkien.lohang_id", ondelete="CASCADE"), unique=True)
    so_luong_hien_tai: Mapped[int] = mapped_column(default=0)
    so_luong_da_su_dung: Mapped[int] = mapped_column(default=0)
    lan_cap_nhat_cuoi: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class TonKhoHopQua(Base):
    __tablename__ = "tonkhohopqua"
    
    tonkho_id: Mapped[int] = mapped_column(primary_key=True)
    lohang_hopqua_id: Mapped[int] = mapped_column(ForeignKey("lohanghopqua.lohang_id", ondelete="CASCADE"), unique=True)
    so_luong_hien_tai: Mapped[int] = mapped_column(default=0)
    so_luong_da_ban: Mapped[int] = mapped_column(default=0)
    lan_cap_nhat_cuoi: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# =========================================================
# 13. CÔNG THỨC HỘP QUÀ (BOM)
# =========================================================
class CongThucHopQua(Base):
    __tablename__ = "congthuchopqua"
    
    bom_id: Mapped[int] = mapped_column(primary_key=True)
    hop_qua_id: Mapped[int] = mapped_column(ForeignKey("hopqua.hop_qua_id", ondelete="CASCADE"))
    lohang_linhkien_id: Mapped[int] = mapped_column(ForeignKey("lohanglinhkien.lohang_id", ondelete="CASCADE"))
    so_luong_linh_kien: Mapped[int] = mapped_column(nullable=False)
    huong_dan: Mapped[str | None] = mapped_column(Text, nullable=True)
    thu_tu_lap_rap: Mapped[int] = mapped_column(default=1)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    __table_args__ = (UniqueConstraint("hop_qua_id", "lohang_linhkien_id"),)


# BOM đơn giản cho hộp quà - chứa sản phẩm (bánh) thay vì linh kiện
class HopQuaBOM(Base):
    __tablename__ = "hopquabom"
    
    bom_id: Mapped[int] = mapped_column(primary_key=True)
    hop_qua_id: Mapped[int] = mapped_column(ForeignKey("hopqua.hop_qua_id", ondelete="CASCADE"))
    bienthe_id: Mapped[int] = mapped_column(ForeignKey("bienthesanpham.bienthe_id", ondelete="CASCADE"))
    so_luong: Mapped[int] = mapped_column(nullable=False, comment="Số lượng sản phẩm trong hộp quà")
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    __table_args__ = (UniqueConstraint("hop_qua_id", "bienthe_id"),)


# =========================================================
# 14. PHIẾU GIẢM GIÁ
# =========================================================
class PhieuGiamGia(Base):
    __tablename__ = "phieugiamgia"
    
    phieugiam_id: Mapped[int] = mapped_column(primary_key=True)
    ma_phieu: Mapped[str] = mapped_column(String(50), unique=True)
    ten_phieu: Mapped[str] = mapped_column(String(100))
    loai_giam: Mapped[str] = mapped_column(loai_giam_gia, nullable=False)
    gia_tri_giam: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    tong_tien_toi_thieu: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    ngay_bat_dau: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_het_han: Mapped[datetime] = mapped_column(DateTime)
    gioi_han_su_dung: Mapped[int] = mapped_column(default=1)
    so_lan_da_dung: Mapped[int] = mapped_column(default=0)
    gioi_han_nguoi_dung: Mapped[int | None] = mapped_column(nullable=True)
    # JSONB structure (3.4.15B): {"loai_ap_dung": "all"|"san_pham"|"danh_muc", "danh_sach_id": [int]?}
    # Xem app.schemas.SanPhamApDung để validate
    san_pham_ap_dung: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    dang_hoat_dong: Mapped[bool] = mapped_column(Boolean, default=True)
    mo_ta: Mapped[str | None] = mapped_column(Text, nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# =========================================================
# 15-16. ĐƠN HÀNG
# =========================================================
class DonHang(Base):
    __tablename__ = "donhang"
    
    donhang_id: Mapped[int] = mapped_column(primary_key=True)
    ma_don_hang: Mapped[str] = mapped_column(String(50), unique=True)
    nguoidung_id: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True)
    loai_don: Mapped[str] = mapped_column(loai_don_hang, server_default="pos")
    tong_tien: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    tien_giam_gia: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    tien_thanh_toan: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    tien_dat_coc: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    trang_thai: Mapped[str] = mapped_column(trang_thai_don_hang, server_default="cho")
    ngay_nhan: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ngay_giao_du_kien: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ghi_chu: Mapped[str | None] = mapped_column(Text, nullable=True)
    ten_khach_hang: Mapped[str | None] = mapped_column(String(100), nullable=True)
    so_dien_thoai_khach: Mapped[str | None] = mapped_column(String(20), nullable=True)
    dia_chi_giao_hang: Mapped[str | None] = mapped_column(Text, nullable=True)
    nhan_vien_tao: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_cap_nhat: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    
    items: Mapped[list["ChiTietDonHang"]] = relationship(back_populates="donhang", cascade="all,delete-orphan")


# =========================================================
# 17. ĐƠN HÀNG - PHIẾU GIẢM GIÁ (Junction)
# =========================================================
class DonHangPhieuGiamGia(Base):
    __tablename__ = "donhang_phieugiamgia"
    
    donhang_id: Mapped[int] = mapped_column(ForeignKey("donhang.donhang_id", ondelete="CASCADE"), primary_key=True)
    phieugiam_id: Mapped[int] = mapped_column(ForeignKey("phieugiamgia.phieugiam_id", ondelete="CASCADE"), primary_key=True)
    so_tien_giam: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    ngay_ap_dung: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# =========================================================
# 18. CHI TIẾT ĐƠN HÀNG
# =========================================================
class ChiTietDonHang(Base):
    __tablename__ = "chitietdonhang"
    
    chitiet_id: Mapped[int] = mapped_column(primary_key=True)
    donhang_id: Mapped[int] = mapped_column(ForeignKey("donhang.donhang_id", ondelete="CASCADE"))
    lohang_sanpham_id: Mapped[int | None] = mapped_column(ForeignKey("lohangsanpham.lohang_id"), nullable=True)
    lohang_hopqua_id: Mapped[int | None] = mapped_column(ForeignKey("lohanghopqua.lohang_id"), nullable=True)
    hop_qua_id: Mapped[int | None] = mapped_column(ForeignKey("hopqua.hop_qua_id"), nullable=True)
    so_luong: Mapped[int] = mapped_column(nullable=False)
    gia_don_vi: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    tong_tien_phu: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    ghi_chu: Mapped[str | None] = mapped_column(Text, nullable=True)
    trang_thai_don_hang: Mapped[str] = mapped_column(trang_thai_don_hang, server_default="dang_xu_ly")
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    donhang: Mapped[DonHang] = relationship(back_populates="items")

    @property
    def trang_thai(self) -> str:
        return self.trang_thai_don_hang


class PhanBoChiTietDonHang(Base):
    __tablename__ = "phanbolo_chitietdonhang"

    phanbo_id: Mapped[int] = mapped_column(primary_key=True)
    chitiet_id: Mapped[int] = mapped_column(ForeignKey("chitietdonhang.chitiet_id", ondelete="CASCADE"))
    loai_lohang: Mapped[str] = mapped_column(String(20), nullable=False)
    lohang_sanpham_id: Mapped[int | None] = mapped_column(ForeignKey("lohangsanpham.lohang_id"), nullable=True)
    lohang_linhkien_id: Mapped[int | None] = mapped_column(ForeignKey("lohanglinhkien.lohang_id"), nullable=True)
    lohang_hopqua_id: Mapped[int | None] = mapped_column(ForeignKey("lohanghopqua.lohang_id"), nullable=True)
    so_luong: Mapped[int] = mapped_column(nullable=False)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint("loai_lohang IN ('sanpham', 'linhkien', 'hopqua')", name="ck_phanbolo_loai_lohang"),
        CheckConstraint("so_luong > 0", name="ck_phanbolo_so_luong_positive"),
    )


# =========================================================
# 19. THANH TOÁN
# =========================================================
class ThanhToan(Base):
    __tablename__ = "thanhtoan"
    
    thanhtoan_id: Mapped[int] = mapped_column(primary_key=True)
    donhang_id: Mapped[int] = mapped_column(ForeignKey("donhang.donhang_id", ondelete="CASCADE"))
    phuong_thuc: Mapped[str] = mapped_column(phuong_thuc_thanh_toan, nullable=False)
    so_tien: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    trang_thai: Mapped[str] = mapped_column(trang_thai_thanh_toan, server_default="dang_xu_ly")
    ma_giao_dich: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    # JSONB structure (3.4.19B): {"ma_giao_dich_ben_thu_3": str?, "thoi_gian_giao_dich": str?, "chi_tiet_raw": dict?}
    # Xem app.schemas.ThongTinGiaoDich để validate
    thong_tin_giao_dich: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ngay_thanh_toan: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# =========================================================
# 20. ĐỔI TRẢ
# =========================================================
class DoiTra(Base):
    __tablename__ = "doitra"
    
    doitra_id: Mapped[int] = mapped_column(primary_key=True)
    donhang_id: Mapped[int] = mapped_column(ForeignKey("donhang.donhang_id", ondelete="CASCADE"))
    chitiet_id: Mapped[int] = mapped_column(ForeignKey("chitietdonhang.chitiet_id", ondelete="CASCADE"))
    ly_do: Mapped[str] = mapped_column(String(255))
    so_luong_tra: Mapped[int] = mapped_column(nullable=False)
    tien_hoan: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    trang_thai: Mapped[str] = mapped_column(trang_thai_doi_tra, server_default="yeu_cau")
    nhan_vien_xu_ly: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True)
    ghi_chu_nhan_vien: Mapped[str | None] = mapped_column(Text, nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_xu_ly: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


# =========================================================
# 21-22. GIỎ HÀNG
# =========================================================
class GioHang(Base):
    __tablename__ = "giohang"
    
    giohang_id: Mapped[int] = mapped_column(primary_key=True)
    nguoidung_id: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="CASCADE"), nullable=True)
    session_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_cap_nhat: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())
    
    chitiet_list: Mapped[list["ChiTietGioHang"]] = relationship(back_populates="giohang", cascade="all,delete-orphan")


class ChiTietGioHang(Base):
    __tablename__ = "chitietgiohang"
    
    chitiet_id: Mapped[int] = mapped_column(primary_key=True)
    giohang_id: Mapped[int] = mapped_column(ForeignKey("giohang.giohang_id", ondelete="CASCADE"))
    lohang_sanpham_id: Mapped[int | None] = mapped_column(ForeignKey("lohangsanpham.lohang_id"), nullable=True)
    lohang_hopqua_id: Mapped[int | None] = mapped_column(ForeignKey("lohanghopqua.lohang_id"), nullable=True)
    so_luong: Mapped[int] = mapped_column(nullable=False)
    ghi_chu: Mapped[str | None] = mapped_column(Text, nullable=True)
    ngay_them: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    
    giohang: Mapped[GioHang] = relationship(back_populates="chitiet_list")


# =========================================================
# 23-25. LỊCH SỬ KHO
# =========================================================
class LichSuKhoSanPham(Base):
    __tablename__ = "lichsukhosanpham"
    
    lichsu_id: Mapped[int] = mapped_column(primary_key=True)
    lohang_sanpham_id: Mapped[int] = mapped_column(ForeignKey("lohangsanpham.lohang_id"))
    loai_giao_dich: Mapped[str] = mapped_column(loai_giao_dich_kho, nullable=False)
    so_luong: Mapped[int] = mapped_column(nullable=False)
    so_luong_truoc: Mapped[int] = mapped_column(nullable=False)
    so_luong_sau: Mapped[int] = mapped_column(nullable=False)
    gia_tri: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    ly_do: Mapped[str | None] = mapped_column(Text, nullable=True)
    donhang_id: Mapped[int | None] = mapped_column(ForeignKey("donhang.donhang_id"), nullable=True)
    doitra_id: Mapped[int | None] = mapped_column(ForeignKey("doitra.doitra_id"), nullable=True)
    nguoidung_id: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id"), nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class LichSuKhoLinhKien(Base):
    __tablename__ = "lichsukholinhkien"
    
    lichsu_id: Mapped[int] = mapped_column(primary_key=True)
    lohang_linhkien_id: Mapped[int] = mapped_column(ForeignKey("lohanglinhkien.lohang_id"))
    loai_giao_dich: Mapped[str] = mapped_column(loai_giao_dich_kho, nullable=False)
    so_luong: Mapped[int] = mapped_column(nullable=False)
    so_luong_truoc: Mapped[int] = mapped_column(nullable=False)
    so_luong_sau: Mapped[int] = mapped_column(nullable=False)
    gia_tri: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    ly_do: Mapped[str | None] = mapped_column(Text, nullable=True)
    bom_id: Mapped[int | None] = mapped_column(ForeignKey("congthuchopqua.bom_id"), nullable=True)
    donhang_id: Mapped[int | None] = mapped_column(ForeignKey("donhang.donhang_id"), nullable=True)
    nguoidung_id: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id"), nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class LichSuKhoHopQua(Base):
    __tablename__ = "lichsukhohopqua"
    
    lichsu_id: Mapped[int] = mapped_column(primary_key=True)
    lohang_hopqua_id: Mapped[int] = mapped_column(ForeignKey("lohanghopqua.lohang_id"))
    loai_giao_dich: Mapped[str] = mapped_column(loai_giao_dich_kho, nullable=False)
    so_luong: Mapped[int] = mapped_column(nullable=False)
    so_luong_truoc: Mapped[int] = mapped_column(nullable=False)
    so_luong_sau: Mapped[int] = mapped_column(nullable=False)
    gia_tri: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    ly_do: Mapped[str | None] = mapped_column(Text, nullable=True)
    donhang_id: Mapped[int | None] = mapped_column(ForeignKey("donhang.donhang_id"), nullable=True)
    nguoidung_id: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id"), nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


# =========================================================
# 26. CẢNH BÁO TỒN KHO
# =========================================================
class CanhBaoTonKho(Base):
    __tablename__ = "canhbaotonkho"
    
    canhbao_id: Mapped[int] = mapped_column(primary_key=True)
    lohang_sanpham_id: Mapped[int | None] = mapped_column(ForeignKey("lohangsanpham.lohang_id"), nullable=True)
    lohang_hopqua_id: Mapped[int | None] = mapped_column(ForeignKey("lohanghopqua.lohang_id"), nullable=True)
    lohang_linhkien_id: Mapped[int | None] = mapped_column(ForeignKey("lohanglinhkien.lohang_id"), nullable=True)
    loai_canh_bao: Mapped[str] = mapped_column(loai_canh_bao, nullable=False)
    muc_do_nghiem_trong: Mapped[str] = mapped_column(muc_do_nghiem_trong, server_default="binh_thuong")
    ngay_canh_bao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    trang_thai: Mapped[str] = mapped_column(String(20), server_default="chua_xu_ly")
    nguoi_xu_ly: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True)
    ngay_xu_ly: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ghi_chu: Mapped[str | None] = mapped_column(Text, nullable=True)


# =========================================================
# 27. LỊCH SỬ GIÁ
# =========================================================
class LichSuGia(Base):
    __tablename__ = "lichsugia"
    
    lichsu_id: Mapped[int] = mapped_column(primary_key=True)
    sanpham_id: Mapped[int | None] = mapped_column(ForeignKey("sanpham.sanpham_id"), nullable=True)
    bienthe_id: Mapped[int | None] = mapped_column(ForeignKey("bienthesanpham.bienthe_id"), nullable=True)
    gia_cu: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    gia_moi: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    ly_do_thay_doi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ngay_thay_doi: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    nguoi_thay_doi: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True)


# =========================================================
# 28. ĐÁNH GIÁ SẢN PHẨM
# =========================================================
class DanhGiaSanPham(Base):
    __tablename__ = "danhgiasanpham"
    
    danhgia_id: Mapped[int] = mapped_column(primary_key=True)
    sanpham_id: Mapped[int | None] = mapped_column(ForeignKey("sanpham.sanpham_id", ondelete="CASCADE"), nullable=True)
    nguoidung_id: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True)
    donhang_id: Mapped[int | None] = mapped_column(ForeignKey("donhang.donhang_id", ondelete="SET NULL"), nullable=True)
    so_sao: Mapped[int] = mapped_column(nullable=False)  # 1-5
    tieu_de: Mapped[str | None] = mapped_column(String(200), nullable=True)
    noi_dung: Mapped[str | None] = mapped_column(Text, nullable=True)
    hinh_anh_url: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    trang_thai: Mapped[str] = mapped_column(String(20), server_default="cho_duyet")
    nguoi_duyet: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_duyet: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


# =========================================================
# 29. THỐNG KÊ SẢN PHẨM
# =========================================================
class ThongKeSanPham(Base):
    __tablename__ = "thongkesanpham"
    
    thongke_id: Mapped[int] = mapped_column(primary_key=True)
    sanpham_id: Mapped[int | None] = mapped_column(ForeignKey("sanpham.sanpham_id"), nullable=True)
    bienthe_id: Mapped[int | None] = mapped_column(ForeignKey("bienthesanpham.bienthe_id"), nullable=True)
    ngay_thong_ke: Mapped[date] = mapped_column(Date, nullable=False)
    so_luong_ban: Mapped[int] = mapped_column(default=0)
    doanh_thu: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    so_don_hang: Mapped[int] = mapped_column(default=0)
    gia_trung_binh: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    
    __table_args__ = (UniqueConstraint("sanpham_id", "bienthe_id", "ngay_thong_ke"),)


# =========================================================
# 30B. AGENT ACTIONS (Operations Agent proposal/execution log)
# =========================================================
class AgentAction(Base):
    __tablename__ = "agent_actions"

    action_id: Mapped[int] = mapped_column(primary_key=True)
    loai_hanh_dong: Mapped[str] = mapped_column(String(50), nullable=False)
    tham_so: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    ly_do: Mapped[str | None] = mapped_column(Text, nullable=True)
    nguon: Mapped[str] = mapped_column(String(20), server_default="agent")
    # Tool classification at the time the action was created — "read" never
    # reaches this table (see AgentTool docstring in tools.py), "draft"
    # records a recommendation without an irreversible external effect,
    # "execute" actually mutates business state. Drives who's allowed to
    # approve (see agent_service._require_role_for_classification).
    phan_loai: Mapped[str] = mapped_column(String(20), nullable=False)
    # Optional human-facing risk tier, independent of classification (an
    # "execute" can be low-risk, e.g. pausing a batch; a "draft" is always
    # low-risk by definition but this lets a future tool say otherwise).
    muc_do_uu_tien: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Phase 5 policy snapshot. The model never chooses these values; they
    # come from the code-owned AgentTool registry at proposal/execution time.
    execution_policy: Mapped[str] = mapped_column(String(30), nullable=False, server_default="APPROVAL_REQUIRED")
    execution_mode: Mapped[str] = mapped_column(String(20), nullable=False, server_default="human_approval")
    policy_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    trigger_context: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reasoning_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_idempotent: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    execution_attempts: Mapped[int] = mapped_column(nullable=False, server_default="0")
    langfuse_trace_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    proactive_insight_id: Mapped[int | None] = mapped_column(
        ForeignKey("proactive_insights.insight_id", ondelete="SET NULL"), nullable=True
    )
    trang_thai: Mapped[str] = mapped_column(String(20), server_default="de_xuat")
    # Snapshot of the live state a mutating tool's target was in when this
    # action was proposed (AgentTool.capture_state). Re-checked against
    # live state at approval time (AgentTool.revalidate_state) so an
    # approval can't execute against a target that moved on since the
    # proposal was made — see agent_service.approve_action.
    dieu_kien_tien_quyet: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ket_qua: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    loi: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Who proposed it (set at propose time) vs who approved/rejected it (set
    # at approve/reject time) — kept as two separate columns since they're
    # frequently different people and both matter for the audit trail.
    nguoidung_de_xuat_id: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True)
    nguoidung_duyet_id: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_bat_dau_xu_ly: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ngay_xu_ly: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    nguoidung_reset_id: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True)
    ngay_reset: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint("nguon IN ('agent', 'nhan_vien')", name="ck_agent_actions_nguon"),
        CheckConstraint("phan_loai IN ('read', 'draft', 'execute')", name="ck_agent_actions_phan_loai"),
        CheckConstraint("muc_do_uu_tien IN ('low', 'medium', 'high')", name="ck_agent_actions_muc_do_uu_tien"),
        CheckConstraint(
            "execution_policy IN ('AUTO_ALLOWED', 'APPROVAL_REQUIRED', 'NEVER_AUTOMATE')",
            name="ck_agent_actions_execution_policy",
        ),
        CheckConstraint(
            "execution_mode IN ('automatic', 'human_approval')",
            name="ck_agent_actions_execution_mode",
        ),
        CheckConstraint("trang_thai IN ('de_xuat', 'dang_xu_ly', 'hoan_thanh', 'tu_choi', 'that_bai')", name="ck_agent_actions_trang_thai"),
        UniqueConstraint("idempotency_key", name="uq_agent_actions_idempotency_key"),
    )


# =========================================================
# 30C. PROACTIVE AGENT INSIGHTS (separate from action audit)
# =========================================================
class ProactiveInsight(Base):
    """A durable, deduplicated recommendation emitted by the proactive Agent.

    This is deliberately not an ``AgentAction``: an insight is read-only
    analysis of a business condition. Any follow-up mutation still has to
    enter the existing proposal -> approval -> execution lifecycle.
    """

    __tablename__ = "proactive_insights"

    insight_id: Mapped[int] = mapped_column(primary_key=True)
    source_alert_id: Mapped[int] = mapped_column(
        ForeignKey("canhbaotonkho.canhbao_id", ondelete="CASCADE"), nullable=False
    )
    # Hash of the alert condition that produced this recommendation. A new
    # condition supersedes the previous insight instead of creating repeats.
    fingerprint: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    scenario: Mapped[str] = mapped_column(String(50), nullable=False)
    muc_do_nghiem_trong: Mapped[str] = mapped_column(String(20), nullable=False)
    tieu_de: Mapped[str] = mapped_column(String(300), nullable=False)
    khuyen_nghi: Mapped[str] = mapped_column(Text, nullable=False)
    bang_chung: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    tool_trace: Mapped[list] = mapped_column(JSONB, nullable=False, server_default="[]")
    prompt_version: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str | None] = mapped_column(String(100), nullable=True)
    used_llm: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    trang_thai: Mapped[str] = mapped_column(String(20), nullable=False, server_default="unread")
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ngay_doc: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ngay_xu_ly: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ngay_thay_the: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "trang_thai IN ('unread', 'read', 'resolved', 'superseded')",
            name="ck_proactive_insights_trang_thai",
        ),
        CheckConstraint(
            "muc_do_nghiem_trong IN ('thap', 'binh_thuong', 'cao')",
            name="ck_proactive_insights_muc_do",
        ),
    )


# =========================================================
# 30. SYSTEM LOG
# =========================================================
class SystemLog(Base):
    __tablename__ = "systemlog"
    
    log_id: Mapped[int] = mapped_column(primary_key=True)
    nguoi_dung_id: Mapped[int | None] = mapped_column(ForeignKey("nguoidung.nguoidung_id", ondelete="SET NULL"), nullable=True)
    hanh_dong: Mapped[str] = mapped_column(String(100), nullable=False)
    bang_du_lieu: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ban_ghi_id: Mapped[int | None] = mapped_column(nullable=True)
    chi_tiet_cu: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    chi_tiet_moi: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    ngay_tao: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
