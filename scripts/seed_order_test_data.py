"""
Minimal seed data for testing order creation and cancellation inventory restore.

Usage:
    python scripts/seed_order_test_data.py
"""

import json
import sys
from datetime import datetime, timedelta
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import or_

from app.core.security import get_password_hash
from app.db import SessionLocal
from app.models import (
    BienTheSanPham,
    LoHangSanPham,
    NguoiDung,
    SanPham,
    TonKhoSanPham,
    VaiTro,
)


TEST_ROLE_NAME = "customer"
TEST_USERNAME = "order_test_customer"
TEST_EMAIL = "order-test-customer@leafcreme.local"
TEST_PASSWORD = "OrderTest123!"
TEST_PHONE = "0900001234"

TEST_PRODUCT_SKU = "ORDER-TEST-CAKE-001"
TEST_VARIANT_SKU = "ORDER-TEST-CAKE-001-S"
TEST_LOT_CODE = "ORDER-TEST-LOT-001"
INITIAL_STOCK_QTY = 12


def get_or_create_customer_role(db):
    role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == TEST_ROLE_NAME).first()
    if role:
        return role

    role = VaiTro(
        ten_vai_tro=TEST_ROLE_NAME,
        mo_ta="Customer role for order flow test",
    )
    db.add(role)
    db.flush()
    return role


def get_or_create_test_user(db, role):
    user = db.query(NguoiDung).filter(
        or_(
            NguoiDung.email == TEST_EMAIL,
            NguoiDung.ten_dang_nhap == TEST_USERNAME,
        )
    ).first()
    password_hash = get_password_hash(TEST_PASSWORD)

    if user:
        user.ten_dang_nhap = TEST_USERNAME
        user.ho_ten = "Order Flow Test User"
        user.vaitro_id = role.vaitro_id
        user.so_dien_thoai = TEST_PHONE
        user.dang_hoat_dong = True
        user.mat_khau_ma_hoa = password_hash
        return user

    user = NguoiDung(
        ten_dang_nhap=TEST_USERNAME,
        email=TEST_EMAIL,
        mat_khau_ma_hoa=password_hash,
        vaitro_id=role.vaitro_id,
        ho_ten="Order Flow Test User",
        so_dien_thoai=TEST_PHONE,
        dia_chi="Leaf Creme order flow test address",
        dang_hoat_dong=True,
    )
    db.add(user)
    db.flush()
    return user


def get_or_create_product(db):
    product = db.query(SanPham).filter(SanPham.sku == TEST_PRODUCT_SKU).first()
    if product:
        product.ten = "Order Test Chocolate Cake"
        product.loai = "don"
        product.gia_co_ban = Decimal("120000")
        product.mo_ta = "Minimal product for order flow testing"
        product.danh_muc = "Test Cakes"
        product.don_vi_tinh = "chiec"
        product.dang_hoat_dong = True
        return product

    product = SanPham(
        ten="Order Test Chocolate Cake",
        sku=TEST_PRODUCT_SKU,
        loai="don",
        gia_co_ban=Decimal("120000"),
        mo_ta="Minimal product for order flow testing",
        danh_muc="Test Cakes",
        don_vi_tinh="chiec",
        dang_hoat_dong=True,
    )
    db.add(product)
    db.flush()
    return product


def get_or_create_variant(db, product):
    variant = db.query(BienTheSanPham).filter(
        BienTheSanPham.sku_bienthe == TEST_VARIANT_SKU
    ).first()
    if variant:
        variant.sanpham_id = product.sanpham_id
        variant.huong_vi = "Chocolate"
        variant.kich_thuoc = "S"
        variant.gia_bienthe = Decimal("125000")
        variant.muc_gioi_han_ton = 2
        variant.dang_hoat_dong = True
        return variant

    variant = BienTheSanPham(
        sanpham_id=product.sanpham_id,
        huong_vi="Chocolate",
        kich_thuoc="S",
        gia_bienthe=Decimal("125000"),
        sku_bienthe=TEST_VARIANT_SKU,
        muc_gioi_han_ton=2,
        dang_hoat_dong=True,
    )
    db.add(variant)
    db.flush()
    return variant


def get_or_create_lot(db, variant):
    lot = db.query(LoHangSanPham).filter(LoHangSanPham.ma_lo == TEST_LOT_CODE).first()
    expiry_date = datetime.utcnow() + timedelta(days=180)

    if lot:
        lot.bienthe_sanpham_id = variant.bienthe_id
        lot.so_luong = INITIAL_STOCK_QTY
        lot.gia_don_vi = Decimal("70000")
        lot.ngay_het_han = expiry_date
        lot.trang_thai = "hoatdong"
        return lot

    lot = LoHangSanPham(
        bienthe_sanpham_id=variant.bienthe_id,
        ncc_id=None,
        ma_lo=TEST_LOT_CODE,
        ngay_het_han=expiry_date,
        so_luong=INITIAL_STOCK_QTY,
        gia_don_vi=Decimal("70000"),
        trang_thai="hoatdong",
        ghi_chu="Order flow test lot",
    )
    db.add(lot)
    db.flush()
    return lot


def get_or_create_inventory(db, lot):
    inventory = db.query(TonKhoSanPham).filter(
        TonKhoSanPham.lohang_sanpham_id == lot.lohang_id
    ).first()

    if inventory:
        inventory.so_luong_hien_tai = INITIAL_STOCK_QTY
        inventory.so_luong_da_ban = 0
        return inventory

    inventory = TonKhoSanPham(
        lohang_sanpham_id=lot.lohang_id,
        so_luong_hien_tai=INITIAL_STOCK_QTY,
        so_luong_da_ban=0,
    )
    db.add(inventory)
    db.flush()
    return inventory


def main():
    db = SessionLocal()
    try:
        role = get_or_create_customer_role(db)
        user = get_or_create_test_user(db, role)
        product = get_or_create_product(db)
        variant = get_or_create_variant(db, product)
        lot = get_or_create_lot(db, variant)
        inventory = get_or_create_inventory(db, lot)

        db.commit()
        db.refresh(user)
        db.refresh(product)
        db.refresh(variant)
        db.refresh(lot)
        db.refresh(inventory)

        order_body = {
            "items": [
                {
                    "bienthe_id": variant.bienthe_id,
                    "so_luong": 2,
                }
            ],
            "ten_khach_hang": user.ho_ten,
            "so_dien_thoai_khach": user.so_dien_thoai,
            "dia_chi_giao_hang": user.dia_chi,
            "ghi_chu": "Order flow seed test",
        }

        print("Seed complete.")
        print(f"test_username: {user.ten_dang_nhap}")
        print(f"test_user_email: {user.email}")
        print(f"test_user_password: {TEST_PASSWORD}")
        print(f"product_id: {product.sanpham_id}")
        print(f"bienthe_id: {variant.bienthe_id}")
        print(f"lohang_sanpham_id: {lot.lohang_id}")
        print(f"initial_stock_quantity: {inventory.so_luong_hien_tai}")
        print("example_post_orders_path: /orders?loai_don=online")
        print("example_post_orders_body:")
        print(json.dumps(order_body, ensure_ascii=False, indent=2))
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
