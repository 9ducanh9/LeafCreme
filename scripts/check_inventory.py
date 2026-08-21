"""
Script để kiểm tra tồn kho hiện tại
Usage: python scripts/check_inventory.py [--detail]
"""
import sys
import os
from pathlib import Path
from collections import defaultdict

# Add parent directory to path để import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db import SessionLocal
from app.models import (
    TonKhoSanPham, LoHangSanPham, BienTheSanPham, SanPham,
    TonKhoHopQua, LoHangHopQua, HopQua
)


def format_number(num):
    """Format số với dấu phẩy"""
    return f"{num:,}"


def check_product_inventory(db: Session, show_detail: bool = False):
    """Kiểm tra tồn kho sản phẩm"""
    print("\n" + "=" * 100)
    print("📦 TỒN KHO SẢN PHẨM")
    print("=" * 100)
    
    # Query tồn kho với thông tin sản phẩm
    query = db.query(
        SanPham.ten.label('ten_sanpham'),
        BienTheSanPham.bienthe_id,
        BienTheSanPham.huong_vi,
        BienTheSanPham.kich_thuoc,
        func.sum(TonKhoSanPham.so_luong_hien_tai).label('tong_ton_kho'),
        func.sum(TonKhoSanPham.so_luong_da_ban).label('tong_da_ban'),
        func.count(TonKhoSanPham.tonkho_id).label('so_lo_hang')
    ).join(
        LoHangSanPham, LoHangSanPham.lohang_id == TonKhoSanPham.lohang_sanpham_id
    ).join(
        BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id
    ).join(
        SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id
    ).filter(
        LoHangSanPham.trang_thai == "hoatdong",
        SanPham.dang_hoat_dong == True,
        BienTheSanPham.dang_hoat_dong == True
    ).group_by(
        SanPham.ten,
        BienTheSanPham.bienthe_id,
        BienTheSanPham.huong_vi,
        BienTheSanPham.kich_thuoc
    ).order_by(
        SanPham.ten,
        BienTheSanPham.huong_vi,
        BienTheSanPham.kich_thuoc
    )
    
    results = query.all()
    
    if not results:
        print("⚠️  Không có tồn kho sản phẩm nào!")
        return
    
    # Tổng hợp theo sản phẩm
    product_totals = defaultdict(int)
    
    print(f"\n{'Tên sản phẩm':<30} {'Biến thể':<25} {'Size':<20} {'Tồn kho':<15} {'Đã bán':<15} {'Số lô':<10}")
    print("-" * 100)
    
    for row in results:
        ten_sp = row.ten_sanpham
        huong_vi = row.huong_vi or "N/A"
        kich_thuoc = row.kich_thuoc or "N/A"
        ton_kho = row.tong_ton_kho or 0
        da_ban = row.tong_da_ban or 0
        so_lo = row.so_lo_hang or 0
        
        product_totals[ten_sp] += ton_kho
        
        print(f"{ten_sp:<30} {huong_vi:<25} {kich_thuoc:<20} {format_number(ton_kho):<15} {format_number(da_ban):<15} {so_lo:<10}")
    
    print("-" * 100)
    print("\n📊 TỔNG HỢP THEO SẢN PHẨM:")
    for ten_sp, tong in sorted(product_totals.items()):
        print(f"   • {ten_sp}: {format_number(tong)} sản phẩm")
    
    # Chi tiết từng lô hàng nếu có yêu cầu
    if show_detail:
        print("\n" + "=" * 100)
        print("📋 CHI TIẾT TỪNG LÔ HÀNG")
        print("=" * 100)
        
        detail_query = db.query(
            SanPham.ten.label('ten_sanpham'),
            BienTheSanPham.huong_vi,
            BienTheSanPham.kich_thuoc,
            LoHangSanPham.ma_lo,
            LoHangSanPham.ngay_het_han,
            TonKhoSanPham.so_luong_hien_tai,
            TonKhoSanPham.so_luong_da_ban
        ).join(
            LoHangSanPham, LoHangSanPham.lohang_id == TonKhoSanPham.lohang_sanpham_id
        ).join(
            BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id
        ).join(
            SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id
        ).filter(
            LoHangSanPham.trang_thai == "hoatdong",
            SanPham.dang_hoat_dong == True,
            BienTheSanPham.dang_hoat_dong == True,
            TonKhoSanPham.so_luong_hien_tai > 0
        ).order_by(
            SanPham.ten,
            LoHangSanPham.ngay_het_han.asc()
        )
        
        detail_results = detail_query.all()
        
        if detail_results:
            print(f"\n{'Sản phẩm':<30} {'Biến thể':<20} {'Mã lô':<15} {'Hết hạn':<15} {'Tồn kho':<15} {'Đã bán':<15}")
            print("-" * 100)
            
            for row in detail_results:
                ngay_het_han = row.ngay_het_han.strftime("%d/%m/%Y") if row.ngay_het_han else "N/A"
                print(f"{row.ten_sanpham:<30} {row.huong_vi or 'N/A':<20} {row.ma_lo:<15} {ngay_het_han:<15} {format_number(row.so_luong_hien_tai):<15} {format_number(row.so_luong_da_ban):<15}")


def check_gift_box_inventory(db: Session):
    """Kiểm tra tồn kho hộp quà"""
    print("\n" + "=" * 100)
    print("🎁 TỒN KHO HỘP QUÀ")
    print("=" * 100)
    
    query = db.query(
        HopQua.ten_hop_qua,
        func.sum(TonKhoHopQua.so_luong_hien_tai).label('tong_ton_kho'),
        func.sum(TonKhoHopQua.so_luong_da_ban).label('tong_da_ban'),
        func.count(TonKhoHopQua.tonkho_id).label('so_lo_hang')
    ).join(
        LoHangHopQua, LoHangHopQua.lohang_id == TonKhoHopQua.lohang_hopqua_id
    ).join(
        HopQua, HopQua.hop_qua_id == LoHangHopQua.hop_qua_id
    ).filter(
        LoHangHopQua.trang_thai == "hoatdong",
        HopQua.dang_hoat_dong == True
    ).group_by(
        HopQua.ten_hop_qua
    ).order_by(
        HopQua.ten_hop_qua
    )
    
    results = query.all()
    
    if not results:
        print("⚠️  Không có tồn kho hộp quà nào!")
        return
    
    print(f"\n{'Tên hộp quà':<50} {'Tồn kho':<15} {'Đã bán':<15} {'Số lô':<10}")
    print("-" * 100)
    
    total_gift_boxes = 0
    for row in results:
        ton_kho = row.tong_ton_kho or 0
        da_ban = row.tong_da_ban or 0
        so_lo = row.so_lo_hang or 0
        total_gift_boxes += ton_kho
        
        print(f"{row.ten_hop_qua:<50} {format_number(ton_kho):<15} {format_number(da_ban):<15} {so_lo:<10}")
    
    print("-" * 100)
    print(f"\n📊 Tổng số hộp quà: {format_number(total_gift_boxes)}")


def check_low_stock(db: Session, threshold: int = 10):
    """Kiểm tra sản phẩm sắp hết hàng"""
    print("\n" + "=" * 100)
    print(f"⚠️  SẢN PHẨM SẮP HẾT HÀNG (Dưới {threshold} sản phẩm)")
    print("=" * 100)
    
    query = db.query(
        SanPham.ten.label('ten_sanpham'),
        BienTheSanPham.huong_vi,
        BienTheSanPham.kich_thuoc,
        func.sum(TonKhoSanPham.so_luong_hien_tai).label('tong_ton_kho')
    ).join(
        LoHangSanPham, LoHangSanPham.lohang_id == TonKhoSanPham.lohang_sanpham_id
    ).join(
        BienTheSanPham, BienTheSanPham.bienthe_id == LoHangSanPham.bienthe_sanpham_id
    ).join(
        SanPham, SanPham.sanpham_id == BienTheSanPham.sanpham_id
    ).filter(
        LoHangSanPham.trang_thai == "hoatdong",
        SanPham.dang_hoat_dong == True,
        BienTheSanPham.dang_hoat_dong == True
    ).group_by(
        SanPham.ten,
        BienTheSanPham.bienthe_id,
        BienTheSanPham.huong_vi,
        BienTheSanPham.kich_thuoc
    ).having(
        func.sum(TonKhoSanPham.so_luong_hien_tai) < threshold
    ).order_by(
        func.sum(TonKhoSanPham.so_luong_hien_tai).asc()
    )
    
    results = query.all()
    
    if not results:
        print(f"✅ Không có sản phẩm nào dưới {threshold} sản phẩm!")
        return
    
    print(f"\n{'Sản phẩm':<30} {'Biến thể':<25} {'Size':<20} {'Tồn kho':<15}")
    print("-" * 100)
    
    for row in results:
        ton_kho = row.tong_ton_kho or 0
        print(f"{row.ten_sanpham:<30} {row.huong_vi or 'N/A':<25} {row.kich_thuoc or 'N/A':<20} {format_number(ton_kho):<15}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Kiểm tra tồn kho hiện tại")
    parser.add_argument("--detail", action="store_true", help="Hiển thị chi tiết từng lô hàng")
    parser.add_argument("--low-stock", type=int, default=10, help="Ngưỡng cảnh báo tồn kho thấp (mặc định: 10)")
    args = parser.parse_args()
    
    db = SessionLocal()
    try:
        check_product_inventory(db, show_detail=args.detail)
        check_gift_box_inventory(db)
        check_low_stock(db, threshold=args.low_stock)
        
        print("\n" + "=" * 100)
        print("✅ Hoàn thành!")
        print("=" * 100)
    except Exception as e:
        print(f"❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

