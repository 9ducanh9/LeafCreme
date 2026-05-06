
import sys
sys.path.insert(0, "d:/Leaf Creme")
from app.db import SessionLocal
from app.models import NguoiDung
from app.core.security import get_password_hash

session = SessionLocal()
u = session.query(NguoiDung).filter_by(ten_dang_nhap="admin_demo").first()
if u:
    u.mat_khau_ma_hoa = get_password_hash("admin123")
    session.commit()
    print("Test user password reset to: admin123")
else:
    print("User admin_demo not found.")
session.close()
