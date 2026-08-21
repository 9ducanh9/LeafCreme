"""
Script để tự động thêm gift boxes và BOM vào database từ frontend data
Usage: python scripts/seed_gift_boxes.py
"""
import sys
import os
from pathlib import Path

# Add parent directory to path để import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))
from seed_guard import require_seed_environment

require_seed_environment(__file__)

from sqlalchemy.orm import Session
from app.db import SessionLocal, engine
from app.models import Base, HopQua, HopQuaBOM, BienTheSanPham, SanPham
from decimal import Decimal

# Mapping tên sản phẩm từ frontend sang database
PRODUCT_NAME_MAPPING = {
    'Tiramisu Classic': 'Tiramisu classic coffee',
    'Mousse Chocolate': 'Mousse chocolate đen',
    'Mousse Strawberry': 'Mousse dâu tươi',
    'Bông lan Vanilla': 'Bông lan trứng muối basic',
    'Bông lan Chocolate': 'Bông lan bơ sữa chocolate chips',
    'Macaron Mix': None,  # Chưa có trong database
    'Bánh kem nhỏ': 'Bánh kem vanilla trái cây',
}

# Gift boxes data từ frontend
GIFT_BOXES_DATA = [
    {
        'id': 1,
        'name': 'Hộp Quà Sinh Nhật',
        'price': 450000,
        'included_items': [
            {'name': 'Tiramisu Classic (M)', 'quantity': 1},
            {'name': 'Mousse Chocolate (S)', 'quantity': 2},
            {'name': 'Bông lan Vanilla (M)', 'quantity': 1},
        ],
    },
    {
        'id': 2,
        'name': 'Hộp Quà Tình Yêu',
        'price': 520000,
        'included_items': [
            {'name': 'Tiramisu Classic (L)', 'quantity': 1},
            {'name': 'Mousse Strawberry (M)', 'quantity': 2},
            {'name': 'Bông lan Chocolate (M)', 'quantity': 1},
            {'name': 'Macaron Mix (12pcs)', 'quantity': 1},
        ],
    },
    {
        'id': 3,
        'name': 'Hộp Quà Cảm Ơn',
        'price': 380000,
        'included_items': [
            {'name': 'Mousse Chocolate (M)', 'quantity': 2},
            {'name': 'Bông lan Vanilla (S)', 'quantity': 2},
            {'name': 'Tiramisu Classic (S)', 'quantity': 1},
        ],
    },
    {
        'id': 4,
        'name': 'Hộp Quà Lễ Hội',
        'price': 580000,
        'included_items': [
            {'name': 'Tiramisu Classic (L)', 'quantity': 1},
            {'name': 'Mousse Chocolate (L)', 'quantity': 1},
            {'name': 'Bông lan Vanilla (L)', 'quantity': 1},
            {'name': 'Macaron Mix (24pcs)', 'quantity': 1},
        ],
    },
    {
        'id': 5,
        'name': 'Hộp Quà Chăm Sóc Bản Thân',
        'price': 350000,
        'included_items': [
            {'name': 'Mousse Chocolate (M)', 'quantity': 1},
            {'name': 'Bông lan Vanilla (M)', 'quantity': 1},
            {'name': 'Tiramisu Classic (S)', 'quantity': 1},
            {'name': 'Macaron Mix (6pcs)', 'quantity': 1},
        ],
    },
    {
        'id': 6,
        'name': 'Hộp Quà Cao Cấp',
        'price': 750000,
        'included_items': [
            {'name': 'Tiramisu Classic (L)', 'quantity': 2},
            {'name': 'Mousse Chocolate (L)', 'quantity': 1},
            {'name': 'Bông lan Vanilla (L)', 'quantity': 1},
            {'name': 'Macaron Mix (24pcs)', 'quantity': 1},
            {'name': 'Bánh kem nhỏ (2pcs)', 'quantity': 1},
        ],
    },
    {
        'id': 7,
        'name': 'Hộp Quà Mini',
        'price': 280000,
        'included_items': [
            {'name': 'Mousse Chocolate (S)', 'quantity': 2},
            {'name': 'Bông lan Vanilla (S)', 'quantity': 2},
            {'name': 'Macaron Mix (6pcs)', 'quantity': 1},
        ],
    },
    {
        'id': 8,
        'name': 'Hộp Quà Kỷ Niệm',
        'price': 480000,
        'included_items': [
            {'name': 'Tiramisu Classic (M)', 'quantity': 1},
            {'name': 'Mousse Strawberry (M)', 'quantity': 1},
            {'name': 'Bông lan Chocolate (M)', 'quantity': 1},
            {'name': 'Macaron Mix (12pcs)', 'quantity': 1},
        ],
    },
]


def list_available_products(db: Session):
    """Liệt kê tất cả sản phẩm và biến thể có sẵn"""
    print("\n📋 Danh sách sản phẩm có sẵn trong database:")
    print("=" * 80)
    
    sanphams = db.query(SanPham).filter(SanPham.dang_hoat_dong == True).all()
    
    if not sanphams:
        print("⚠️  Không có sản phẩm nào trong database!")
        return
    
    for sp in sanphams:
        print(f"\n🍰 {sp.ten} (ID: {sp.sanpham_id})")
        bienthes = db.query(BienTheSanPham).filter(
            BienTheSanPham.sanpham_id == sp.sanpham_id,
            BienTheSanPham.dang_hoat_dong == True
        ).all()
        
        if bienthes:
            for bt in bienthes:
                size_info = f" - Size: {bt.kich_thuoc}" if bt.kich_thuoc else ""
                print(f"   • {bt.huong_vi}{size_info} (bienthe_id: {bt.bienthe_id})")
        else:
            print("   (Không có biến thể)")
    
    print("=" * 80)


def find_bienthe_by_name(db: Session, product_name: str):
    """
    Tìm bienthe_id từ tên sản phẩm
    Ví dụ: 'Tiramisu Classic (M)' -> tìm biến thể có tên chứa 'Tiramisu' và size 'M'
    """
    # Parse tên sản phẩm: "Tiramisu Classic (M)" -> product_name="Tiramisu Classic", size="M"
    parts = product_name.rsplit('(', 1)
    if len(parts) == 2:
        base_name = parts[0].strip()
        size = parts[1].replace(')', '').strip()
    else:
        base_name = product_name
        size = None
    
    # Map tên từ frontend sang database
    mapped_name = PRODUCT_NAME_MAPPING.get(base_name, base_name)
    if mapped_name is None:
        return None
    
    # Tìm sản phẩm theo tên (tìm chính xác hoặc chứa)
    sanpham = db.query(SanPham).filter(
        SanPham.ten.ilike(f'%{mapped_name}%'),
        SanPham.dang_hoat_dong == True
    ).first()
    
    if not sanpham:
        return None
    
    # Tìm biến thể
    query = db.query(BienTheSanPham).filter(
        BienTheSanPham.sanpham_id == sanpham.sanpham_id,
        BienTheSanPham.dang_hoat_dong == True
    )
    
    if size:
        # Size trong DB có format "M - 14cm (3-4 người)", tìm theo pattern
        query = query.filter(BienTheSanPham.kich_thuoc.ilike(f'{size}%'))
    
    bienthe = query.first()
    
    if not bienthe:
        return None
    
    return bienthe.bienthe_id


def create_gift_boxes(db: Session):
    """Tạo gift boxes và BOM trong database"""
    
    # Tạo bảng nếu chưa có
    Base.metadata.create_all(bind=engine, tables=[HopQuaBOM.__table__])
    
    created_count = 0
    updated_count = 0
    bom_count = 0
    
    for gift_box_data in GIFT_BOXES_DATA:
        # Kiểm tra gift box đã tồn tại chưa
        existing = db.query(HopQua).filter(
            HopQua.hop_qua_id == gift_box_data['id']
        ).first()
        
        if existing:
            # Update nếu đã tồn tại
            existing.ten_hop_qua = gift_box_data['name']
            existing.gia_ban = Decimal(str(gift_box_data['price']))
            existing.dang_hoat_dong = True
            existing.sku = f"GIFTBOX-{gift_box_data['id']}"
            updated_count += 1
            print(f"✅ Updated: {gift_box_data['name']} (ID: {gift_box_data['id']})")
        else:
            # Tạo mới
            gift_box = HopQua(
                hop_qua_id=gift_box_data['id'],
                ten_hop_qua=gift_box_data['name'],
                gia_ban=Decimal(str(gift_box_data['price'])),
                dang_hoat_dong=True,
                sku=f"GIFTBOX-{gift_box_data['id']}",
                mo_ta=f"Hộp quà {gift_box_data['name']}"
            )
            db.add(gift_box)
            created_count += 1
            print(f"✅ Created: {gift_box_data['name']} (ID: {gift_box_data['id']})")
        
        db.flush()
        
        # Xóa BOM cũ nếu có
        db.query(HopQuaBOM).filter(
            HopQuaBOM.hop_qua_id == gift_box_data['id']
        ).delete()
        
        # Tạo BOM mới
        for item in gift_box_data['included_items']:
            bienthe_id = find_bienthe_by_name(db, item['name'])
            
            if bienthe_id:
                bom = HopQuaBOM(
                    hop_qua_id=gift_box_data['id'],
                    bienthe_id=bienthe_id,
                    so_luong=item['quantity']
                )
                db.add(bom)
                bom_count += 1
                print(f"   📦 BOM: {item['name']} x{item['quantity']} (bienthe_id: {bienthe_id})")
            else:
                print(f"   ⚠️  Bỏ qua: {item['name']} (không tìm thấy biến thể)")
    
    db.commit()
    
    print("\n📊 Tổng kết:")
    print(f"   - Gift boxes created: {created_count}")
    print(f"   - Gift boxes updated: {updated_count}")
    print(f"   - BOM items created: {bom_count}")
    print("\n✅ Hoàn thành!")


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    db = SessionLocal()
    try:
        # Hiển thị danh sách sản phẩm có sẵn
        list_available_products(db)
        print("\n")
        
        # Tạo gift boxes
        create_gift_boxes(db)
        
        print("\n💡 Lưu ý: Nếu BOM chưa được tạo, vui lòng:")
        print("   1. Kiểm tra tên sản phẩm trong database có khớp với tên trong script không")
        print("   2. Hoặc thêm BOM thủ công qua admin panel hoặc SQL")
    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

