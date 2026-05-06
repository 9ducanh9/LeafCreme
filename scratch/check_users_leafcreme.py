
from pathlib import Path
import sys
sys.path.insert(0, "d:/Leaf Creme")
from app.db import SessionLocal
from app.models import NguoiDung

session = SessionLocal()
users = session.query(NguoiDung).limit(5).all()
if not users:
    print("No users found.")
else:
    for u in users:
        print(f"Username: {u.ten_dang_nhap}, Role ID: {u.vaitro_id}")
session.close()
