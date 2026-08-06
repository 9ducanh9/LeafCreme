"""
Script tạo user test nhanh
Chạy: python create_test_user.py
"""
import sys
from app.db import SessionLocal, engine
from app.models import NguoiDung, VaiTro, Base
import bcrypt

def create_test_data():
    """Tạo dữ liệu test: vai trò và user"""
    db = SessionLocal()
    
    try:
        # 1. Tạo vai trò nếu chưa có
        # Lưu ý: các cột quyen_* trong DB là JSONB, dùng raw SQL để insert
        from sqlalchemy import text
        
        roles_data = [
            ("admin", "Quản trị viên", True, True, True, True),
            ("manager", "Quản lý", True, True, True, False),
            ("staff", "Nhân viên", True, True, False, False),
            ("customer", "Khách hàng", True, False, False, False)
        ]
        
        for ten_vai_tro, mo_ta, qxem, qthem, qsua, qxoa in roles_data:
            existing = db.query(VaiTro).filter(
                VaiTro.ten_vai_tro == ten_vai_tro
            ).first()
            
            if not existing:
                # Dùng raw SQL để insert JSONB boolean đúng cách
                import json
                db.execute(text("""
                    INSERT INTO vaitro (ten_vai_tro, mo_ta, quyen_xem, quyen_them, quyen_sua, quyen_xoa)
                    VALUES (:ten, :mo_ta, :qxem, :qthem, :qsua, :qxoa)
                """), {
                    "ten": ten_vai_tro,
                    "mo_ta": mo_ta,
                    "qxem": json.dumps(qxem),
                    "qthem": json.dumps(qthem),
                    "qsua": json.dumps(qsua),
                    "qxoa": json.dumps(qxoa)
                })
                print(f"✅ Đã tạo vai trò: {ten_vai_tro}")
            else:
                print(f"ℹ️  Vai trò đã tồn tại: {ten_vai_tro}")
        
        db.commit()
        
        # 2. Lấy admin role ID
        admin_role = db.query(VaiTro).filter(VaiTro.ten_vai_tro == "admin").first()
        if not admin_role:
            print("❌ Không tìm thấy vai trò admin!")
            return
        
        # 3. Tạo admin user nếu chưa có
        admin_user = db.query(NguoiDung).filter(
            NguoiDung.ten_dang_nhap == "admin"
        ).first()
        
        if not admin_user:
            # Hash password bằng bcrypt
            password_bytes = "admin123".encode('utf-8')
            password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
            
            admin_user = NguoiDung(
                ten_dang_nhap="admin",
                email="admin@bakery.com",
                mat_khau_ma_hoa=password_hash,
                vaitro_id=admin_role.vaitro_id,
                ho_ten="Admin User",
                so_dien_thoai="0123456789",
                dang_hoat_dong=True
            )
            db.add(admin_user)
            db.commit()
            print("✅ Đã tạo user admin:")
            print("   - Username: admin")
            print("   - Password: admin123")
            print("   - Email: admin@bakery.com")
        else:
            print("ℹ️  User admin đã tồn tại")
            print("   - Username: admin")
        
        # 4. Tạo test user
        test_user = db.query(NguoiDung).filter(
            NguoiDung.ten_dang_nhap == "test"
        ).first()
        
        if not test_user:
            # Hash password bằng bcrypt
            password_bytes = "test123456".encode('utf-8')
            password_hash = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')
            
            test_user = NguoiDung(
                ten_dang_nhap="test",
                email="test@bakery.com",
                mat_khau_ma_hoa=password_hash,
                vaitro_id=admin_role.vaitro_id,
                ho_ten="Test User",
                so_dien_thoai="0987654321",
                dang_hoat_dong=True
            )
            db.add(test_user)
            db.commit()
            print("✅ Đã tạo user test:")
            print("   - Username: test")
            print("   - Password: test123456")
            print("   - Email: test@bakery.com")
        else:
            print("ℹ️  User test đã tồn tại")
            print("   - Username: test")
        
        print("\n" + "="*60)
        print("✅ Hoàn tất! Bạn có thể test API với các tài khoản trên")
        print("="*60)
        
    except Exception as e:
        db.rollback()
        print(f"❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("🔧 Đang tạo dữ liệu test...")
    create_test_data()

