import sys
sys.path.insert(0, "d:/Leaf Creme")
from app.db import engine
from app.models import Base
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

# Ensure credentials are used
load_dotenv(dotenv_path="d:/Leaf Creme/.env")
print("Creating database tables...")
Base.metadata.create_all(engine)
print("Finished. Tables created.")

# Insert an admin user for testing
from app.db import SessionLocal
from app.models import NguoiDung, VaiTro
from app.core.security import get_password_hash

session = SessionLocal()
if not session.query(VaiTro).filter_by(vaitro_id=1).first():
    admin_vaitro = VaiTro(vaitro_id=1, ten_vai_tro="admin", mo_ta="Administrator")
    session.add(admin_vaitro)
    session.commit()

if not session.query(NguoiDung).filter_by(ten_dang_nhap="admin").first():
    admin_user = NguoiDung(
        ten_dang_nhap="admin",
        email="admin@example.com",
        mat_khau_ma_hoa=get_password_hash("admin123"),
        ho_ten="Admin",
        dang_hoat_dong=True,
        vaitro_id=1
    )
    session.add(admin_user)
    session.commit()
    print("Admin user created: admin / admin123")
session.close()
