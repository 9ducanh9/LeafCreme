
import os
from dotenv import load_dotenv
from pathlib import Path

# Thử nạp file .env
ENV_PATH = Path(r"d:\Leaf Creme\.env")
print(f"Checking path: {ENV_PATH}")
print(f"Exists: {ENV_PATH.exists()}")

load_dotenv(dotenv_path=ENV_PATH)
db_url = os.getenv("DATABASE_URL")
print(f"DATABASE_URL: {db_url}")
