
from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=BASE_DIR / ".env")
DATABASE_URL = os.getenv("DATABASE_URL")

# Clean URL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

engine = create_engine(DATABASE_URL)
with engine.connect() as connection:
    result = connection.execute(text("SELECT ten_dang_nhap, ho_ten FROM nguoi_dung LIMIT 5"))
    for row in result:
        print(f"User: {row[0]} | Name: {row[1]}")
