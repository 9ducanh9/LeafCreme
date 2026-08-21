"""Seed idempotent LeafCreme demo data from the legacy Bakery dataset.

The old DataBakery.sql targets a retired schema and starts with TRUNCATE.
This script preserves its usable catalog, inventory, and voucher data while
using the current SQLAlchemy models and never deleting existing rows.

Usage:
    python scripts/seed_demo_data.py

Set LEAFCREME_DEMO_PASSWORD to override the local demo-user password.
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

from sqlalchemy import or_

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from seed_guard import require_seed_environment

require_seed_environment(__file__)

from app.core.security import get_password_hash
from app.db import SessionLocal
from app.models import (
    BienTheSanPham,
    LinhKien,
    LoHangLinhKien,
    LoHangSanPham,
    NguoiDung,
    PhieuGiamGia,
    SanPham,
    TonKhoLinhKien,
    TonKhoSanPham,
    VaiTro,
)


DEMO_PASSWORD = os.getenv("LEAFCREME_DEMO_PASSWORD", "LeafCremeDemo123!")

ROLES = {
    "admin": "Quản trị hệ thống",
    "manager": "Quản lý cửa hàng",
    "staff": "Nhân viên vận hành",
    "customer": "Khách hàng",
}

USERS = (
    {"username": "admin", "email": "admin@leafcreme.local", "name": "Quản trị viên", "phone": "0900000001", "role": "admin"},
    {"username": "pos01", "email": "pos01@leafcreme.local", "name": "Nhân viên bán hàng", "phone": "0900000002", "role": "staff"},
    {"username": "kho01", "email": "kho01@leafcreme.local", "name": "Nhân viên kho", "phone": "0900000003", "role": "staff"},
    {"username": "customer01", "email": "customer01@leafcreme.local", "name": "Khách hàng demo", "phone": "0900000004", "role": "customer"},
)

# Adapted from the legacy DataBakery.sql catalog. Products with variants use
# the current ``bien_the`` type rather than the retired script's ``don`` value.
PRODUCTS = (
    {"sku": "BN-001", "name": "Bánh nướng thập cẩm", "price": "59000", "description": "Bánh nướng thập cẩm truyền thống.", "category": "Trung Thu", "occasion": ["holiday", "thanks"], "variant_sku": "BN-001-TC-250", "flavor": "Thập cẩm", "size": "250g", "variant_price": "69000", "stock_limit": 6, "lot": "LSP-007", "quantity": 35, "cost": "69000", "expiry_days": 8},
    {"sku": "BN-002", "name": "Bánh nướng sen nhuyễn", "price": "52000", "description": "Nhân sen nhuyễn hạt mềm.", "category": "Trung Thu", "occasion": ["holiday", "thanks"], "variant_sku": "BN-002-SN-180", "flavor": "Sen nhuyễn", "size": "180g", "variant_price": "62000", "stock_limit": 10, "lot": "LSP-004", "quantity": 70, "cost": "62000", "expiry_days": 25},
    {"sku": "BD-001", "name": "Bánh dẻo đậu xanh", "price": "46000", "description": "Bánh dẻo nhân đậu xanh.", "category": "Trung Thu", "occasion": ["holiday", "self_care"], "variant_sku": "BD-001-DX-220", "flavor": "Đậu xanh", "size": "220g", "variant_price": "52000", "stock_limit": 9, "lot": "LSP-008", "quantity": 80, "cost": "52000", "expiry_days": 40},
    {"sku": "BD-002", "name": "Bánh dẻo lá dứa", "price": "42000", "description": "Hương lá dứa nhẹ.", "category": "Trung Thu", "occasion": ["holiday", "self_care"], "variant_sku": "BD-002-LD-160", "flavor": "Lá dứa", "size": "160g", "variant_price": "46000", "stock_limit": 10, "lot": "LSP-005", "quantity": 60, "cost": "46000", "expiry_days": 14},
    {"sku": "BP-001", "name": "Bánh pía sầu riêng", "price": "60000", "description": "Vỏ nhiều lớp, nhân sầu riêng.", "category": "Đặc sản", "occasion": ["thanks", "self_care"], "variant_sku": "BP-001-SR-220", "flavor": "Sầu riêng", "size": "220g", "variant_price": "72000", "stock_limit": 8, "lot": "LSP-006", "quantity": 40, "cost": "72000", "expiry_days": 10},
)

COMPONENTS = (
    {"sku": "LK-DU-01", "name": "Đường tinh luyện", "unit": "kg", "price": "18000", "description": "Đường RE trắng.", "lot": "LLK-004", "quantity": 120, "expiry_days": 300},
    {"sku": "LK-DX-02", "name": "Bột đậu xanh", "unit": "kg", "price": "65000", "description": "Đậu xanh xay mịn.", "lot": "LLK-005", "quantity": 90, "expiry_days": 150},
    {"sku": "LK-SR-01", "name": "Sầu riêng cấp đông", "unit": "kg", "price": "160000", "description": "Cơm sầu riêng cấp đông.", "lot": "LLK-006", "quantity": 60, "expiry_days": 45},
)

VOUCHERS = (
    {"code": "SALE15", "name": "Giảm 15.000đ", "discount_type": "sotien", "value": "15000", "minimum": "80000", "usage_limit": 500, "expiry_days": 20},
    {"code": "PCT10", "name": "Giảm 10%", "discount_type": "phantram", "value": "10", "minimum": "100000", "usage_limit": 300, "expiry_days": 45},
)


def get_or_create_role(db, name: str, description: str) -> VaiTro:
    role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == name).first()
    if role:
        return role
    role = VaiTro(ten_vai_tro=name, mo_ta=description)
    db.add(role)
    db.flush()
    return role


def get_or_create_user(db, payload: dict, role: VaiTro) -> NguoiDung:
    user = db.query(NguoiDung).filter(
        or_(NguoiDung.ten_dang_nhap == payload["username"], NguoiDung.email == payload["email"])
    ).first()
    if user:
        return user
    user = NguoiDung(
        ten_dang_nhap=payload["username"],
        email=payload["email"],
        mat_khau_ma_hoa=get_password_hash(DEMO_PASSWORD),
        vaitro_id=role.vaitro_id,
        ho_ten=payload["name"],
        so_dien_thoai=payload["phone"],
        dang_hoat_dong=True,
    )
    db.add(user)
    db.flush()
    return user


def get_or_create_product(db, payload: dict) -> BienTheSanPham:
    product = db.query(SanPham).filter(SanPham.sku == payload["sku"]).first()
    if not product:
        product = SanPham(
            ten=payload["name"], sku=payload["sku"], loai="bien_the", gia_co_ban=Decimal(payload["price"]),
            mo_ta=payload["description"], danh_muc=payload["category"], don_vi_tinh="chiếc",
            phu_hop_dip=payload["occasion"], dang_hoat_dong=True,
        )
        db.add(product)
        db.flush()

    variant = db.query(BienTheSanPham).filter(BienTheSanPham.sku_bienthe == payload["variant_sku"]).first()
    if not variant:
        variant = BienTheSanPham(
            sanpham_id=product.sanpham_id, huong_vi=payload["flavor"], kich_thuoc=payload["size"],
            gia_bienthe=Decimal(payload["variant_price"]), sku_bienthe=payload["variant_sku"],
            muc_gioi_han_ton=payload["stock_limit"], dang_hoat_dong=True,
        )
        db.add(variant)
        db.flush()
    return variant


def get_or_create_product_inventory(db, payload: dict, variant: BienTheSanPham) -> None:
    lot = db.query(LoHangSanPham).filter(LoHangSanPham.ma_lo == payload["lot"]).first()
    if not lot:
        lot = LoHangSanPham(
            bienthe_sanpham_id=variant.bienthe_id, ma_lo=payload["lot"],
            ngay_het_han=datetime.now() + timedelta(days=payload["expiry_days"]), so_luong=payload["quantity"],
            gia_don_vi=Decimal(payload["cost"]), trang_thai="hoatdong", ma_qr=f"QR-{payload['lot']}",
            ghi_chu="Migrated from legacy DataBakery demo dataset.",
        )
        db.add(lot)
        db.flush()
    if not db.query(TonKhoSanPham).filter(TonKhoSanPham.lohang_sanpham_id == lot.lohang_id).first():
        db.add(TonKhoSanPham(lohang_sanpham_id=lot.lohang_id, so_luong_hien_tai=payload["quantity"], so_luong_da_ban=0))


def get_or_create_component_inventory(db, payload: dict) -> None:
    component = db.query(LinhKien).filter(LinhKien.sku == payload["sku"]).first()
    if not component:
        component = LinhKien(
            ten_linh_kien=payload["name"], sku=payload["sku"], don_vi_tinh=payload["unit"],
            gia_don_vi=Decimal(payload["price"]), mo_ta=payload["description"], dang_hoat_dong=True,
        )
        db.add(component)
        db.flush()

    lot = db.query(LoHangLinhKien).filter(LoHangLinhKien.ma_lo == payload["lot"]).first()
    if not lot:
        lot = LoHangLinhKien(
            linh_kien_id=component.linh_kien_id, ma_lo=payload["lot"],
            ngay_het_han=datetime.now() + timedelta(days=payload["expiry_days"]), so_luong=payload["quantity"],
            gia_don_vi=Decimal(payload["price"]), trang_thai="hoatdong", ma_qr=f"QR-{payload['lot']}",
            ghi_chu="Migrated from legacy DataBakery demo dataset.",
        )
        db.add(lot)
        db.flush()
    if not db.query(TonKhoLinhKien).filter(TonKhoLinhKien.lohang_linhkien_id == lot.lohang_id).first():
        db.add(TonKhoLinhKien(lohang_linhkien_id=lot.lohang_id, so_luong_hien_tai=payload["quantity"], so_luong_da_su_dung=0))


def get_or_create_voucher(db, payload: dict) -> None:
    if db.query(PhieuGiamGia).filter(PhieuGiamGia.ma_phieu == payload["code"]).first():
        return
    db.add(
        PhieuGiamGia(
            ma_phieu=payload["code"], ten_phieu=payload["name"], loai_giam=payload["discount_type"],
            gia_tri_giam=Decimal(payload["value"]), tong_tien_toi_thieu=Decimal(payload["minimum"]),
            ngay_bat_dau=datetime.now(), ngay_het_han=datetime.now() + timedelta(days=payload["expiry_days"]),
            gioi_han_su_dung=payload["usage_limit"], so_lan_da_dung=0, san_pham_ap_dung={"loai_ap_dung": "all"},
            dang_hoat_dong=True, mo_ta="Migrated from legacy DataBakery demo dataset.",
        )
    )


def main() -> None:
    db = SessionLocal()
    try:
        roles = {name: get_or_create_role(db, name, description) for name, description in ROLES.items()}
        for user in USERS:
            get_or_create_user(db, user, roles[user["role"]])
        for product in PRODUCTS:
            variant = get_or_create_product(db, product)
            get_or_create_product_inventory(db, product, variant)
        for component in COMPONENTS:
            get_or_create_component_inventory(db, component)
        for voucher in VOUCHERS:
            get_or_create_voucher(db, voucher)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print("Demo seed complete.")
    print("Created only missing rows; existing data was left unchanged.")
    print(f"Demo password for newly created users: {DEMO_PASSWORD}")
    print("Users: admin, pos01, kho01, customer01")


if __name__ == "__main__":
    main()
