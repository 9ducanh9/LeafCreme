"""
Script để tự động tìm và tải ảnh sản phẩm từ Unsplash/Pexels
Lưu vào thư mục uploads/product hoặc uploads/giftboxes
"""
import os
import sys
import requests
from pathlib import Path
from typing import Optional
import time

# Add parent directory to path để import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.db import SessionLocal
from app.models import SanPham, HopQua

# API Keys (cần đăng ký miễn phí tại unsplash.com/developers hoặc pexels.com/api)
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "")

# Base directories
BASE_DIR = Path(__file__).parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
PRODUCT_DIR = UPLOADS_DIR / "product"
GIFTBOX_DIR = UPLOADS_DIR / "giftboxes"

# Tạo thư mục nếu chưa có
PRODUCT_DIR.mkdir(parents=True, exist_ok=True)
GIFTBOX_DIR.mkdir(parents=True, exist_ok=True)


def search_unsplash_image(query: str, max_results: int = 10, skip_index: int = 0) -> Optional[str]:
    """Tìm ảnh trên Unsplash với khả năng skip để tránh trùng"""
    if not UNSPLASH_ACCESS_KEY:
        print("⚠️  UNSPLASH_ACCESS_KEY chưa được set. Bỏ qua Unsplash.")
        return None
    
    try:
        url = "https://api.unsplash.com/search/photos"
        headers = {"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"}
        params = {
            "query": query,
            "per_page": max_results,
            "orientation": "landscape",
            "content_filter": "high"
            # Bỏ order_by để tránh lỗi 403
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if data.get("results") and len(data["results"]) > 0:
            # Chọn ảnh ở vị trí skip_index để tránh trùng
            # Nếu skip_index vượt quá số lượng, dùng random
            import random
            available_results = len(data["results"])
            if skip_index >= available_results:
                selected_index = random.randint(0, min(available_results - 1, 4))  # Chọn trong top 5
            else:
                selected_index = skip_index
            
            image_url = data["results"][selected_index]["urls"]["regular"]
            return image_url
        
    except Exception as e:
        print(f"❌ Lỗi khi tìm trên Unsplash: {e}")
    
    return None


def search_pexels_image(query: str, max_results: int = 5) -> Optional[str]:
    """Tìm ảnh trên Pexels"""
    if not PEXELS_API_KEY:
        print("⚠️  PEXELS_API_KEY chưa được set. Bỏ qua Pexels.")
        return None
    
    try:
        url = "https://api.pexels.com/v1/search"
        headers = {"Authorization": PEXELS_API_KEY}
        params = {
            "query": query,
            "per_page": max_results,
            "orientation": "landscape"
        }
        
        response = requests.get(url, headers=headers, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        if data.get("photos") and len(data["photos"]) > 0:
            # Chọn ảnh đầu tiên
            image_url = data["photos"][0]["src"]["large"]
            return image_url
        
    except Exception as e:
        print(f"❌ Lỗi khi tìm trên Pexels: {e}")
    
    return None


def download_image(image_url: str, save_path: Path) -> bool:
    """Tải ảnh từ URL và lưu vào file"""
    try:
        response = requests.get(image_url, timeout=30, stream=True)
        response.raise_for_status()
        
        # Kiểm tra content type
        content_type = response.headers.get("content-type", "")
        if not content_type.startswith("image/"):
            print(f"⚠️  URL không phải là ảnh: {content_type}")
            return False
        
        # Xác định extension
        ext = ".jpg"
        if "png" in content_type:
            ext = ".png"
        elif "webp" in content_type:
            ext = ".webp"
        
        # Thêm extension nếu chưa có
        if not save_path.suffix:
            save_path = save_path.with_suffix(ext)
        
        # Tải và lưu
        with open(save_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        print(f"✅ Đã tải: {save_path.name}")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi khi tải ảnh: {e}")
        return False


def generate_search_query(product_name: str, category: Optional[str] = None) -> str:
    """Tạo search query phù hợp từ tên sản phẩm - cụ thể và đa dạng hơn"""
    # Map từ tiếng Việt sang tiếng Anh
    vietnamese_to_english = {
        "chanh dây": "passion fruit",
        "dâu tươi": "strawberry",
        "dâu": "strawberry",
        "matcha": "matcha",
        "phô mai": "cheese",
        "chocolate": "chocolate",
        "đen": "dark",
        "việt quất": "blueberry",
        "classic": "classic",
        "coffee": "coffee",
        "cacao": "cocoa",
        "oreo": "oreo",
        "trứng muối": "salted egg",
        "trứng": "egg",
        "muối": "salted",
        "basic": "basic",
        "sốt dầu trứng": "egg sauce",
        "bơ sữa": "butter cream",
        "trái cây": "fruit",
        "vanilla": "vanilla",
        "red velvet": "red velvet",
        "tiramisu": "tiramisu",
        "sinh nhật": "birthday",
        "tình yêu": "love romantic",
        "cảm ơn": "thank you",
        "lễ hội": "holiday celebration",
        "chăm sóc bản thân": "self care",
        "cao cấp": "premium luxury",
        "mini": "mini small",
        "kỷ niệm": "anniversary",
    }
    
    name = product_name.lower()
    
    # Map danh mục sang tiếng Anh
    category_map = {
        "Bánh kem": "birthday cake",
        "Mousse": "mousse cake",
        "Tiramisu": "tiramisu dessert",
        "Bông lan": "sponge cake",
        "Bánh quy": "cookie",
        "Bánh ngọt": "pastry",
    }
    
    search_terms = []
    
    # Thêm category
    if category and category in category_map:
        search_terms.append(category_map[category])
    
    # Dịch các từ tiếng Việt sang tiếng Anh
    translated_terms = []
    for viet_word, eng_word in vietnamese_to_english.items():
        if viet_word in name:
            translated_terms.append(eng_word)
            name = name.replace(viet_word, "")  # Loại bỏ từ đã dịch
    
    if translated_terms:
        search_terms.extend(translated_terms)
    
    # Thêm các từ tiếng Anh còn lại (nếu có)
    stop_words = {"bánh", "kem", "vanilla", "trái", "cây", "quả", "hộp", "quà", "bông", "lan", "basic"}
    words = name.split()
    relevant_words = [w for w in words if w not in stop_words and len(w) > 2]
    
    # Chỉ thêm các từ tiếng Anh (không có dấu)
    import re
    english_words = [w for w in relevant_words if re.match(r'^[a-zA-Z]+$', w)]
    if english_words:
        search_terms.extend(english_words[:2])  # Tối đa 2 từ
    
    # Tạo query cuối cùng - không thêm "bakery dessert food" để query cụ thể hơn
    query = " ".join(search_terms) if search_terms else "bakery dessert"
    
    return query


def process_product(product: SanPham, db: Session) -> bool:
    """Xử lý một sản phẩm: tìm và tải ảnh"""
    # Bỏ qua nếu đã có ảnh
    if product.hinh_anh_url and not product.hinh_anh_url.startswith("http"):
        print(f"⏭️  Sản phẩm '{product.ten}' đã có ảnh local: {product.hinh_anh_url}")
        return False
    
    print(f"\n🔍 Đang tìm ảnh cho: {product.ten}")
    if product.danh_muc:
        print(f"   Danh mục: {product.danh_muc}")
    
    # Tạo search query
    search_query = generate_search_query(product.ten, product.danh_muc)
    print(f"   Search query: {search_query}")
    
    # Tìm ảnh (ưu tiên Unsplash, fallback Pexels)
    # Sử dụng product_id để skip index khác nhau, tránh trùng ảnh
    skip_index = product.sanpham_id % 5  # Lấy modulo để có index khác nhau
    image_url = None
    if UNSPLASH_ACCESS_KEY:
        image_url = search_unsplash_image(search_query, max_results=10, skip_index=skip_index)
    
    if not image_url and PEXELS_API_KEY:
        image_url = search_pexels_image(search_query)
    
    if not image_url:
        print(f"❌ Không tìm thấy ảnh cho '{product.ten}'")
        return False
    
    # Tạo tên file (sanitize)
    safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in product.ten)
    safe_name = safe_name[:50]  # Giới hạn độ dài
    filename = f"{product.sanpham_id}_{safe_name}.jpg"
    save_path = PRODUCT_DIR / filename
    
    # Tải ảnh
    if download_image(image_url, save_path):
        # Cập nhật database
        relative_path = f"product/{filename}"
        product.hinh_anh_url = relative_path
        db.commit()
        print(f"✅ Đã cập nhật database: {relative_path}")
        return True
    
    return False


def process_giftbox(giftbox: HopQua, db: Session) -> bool:
    """Xử lý một hộp quà: tìm và tải ảnh"""
    # Bỏ qua nếu đã có ảnh
    if giftbox.hinh_anh_url and not giftbox.hinh_anh_url.startswith("http"):
        print(f"⏭️  Hộp quà '{giftbox.ten_hop_qua}' đã có ảnh local: {giftbox.hinh_anh_url}")
        return False
    
    print(f"\n🔍 Đang tìm ảnh cho: {giftbox.ten_hop_qua}")
    
    # Tạo search query cho gift box - đơn giản hóa để tránh lỗi
    # Dùng query đơn giản hơn cho gift box
    simple_query = "gift box bakery"
    if "sinh nhật" in giftbox.ten_hop_qua.lower():
        simple_query = "birthday gift box"
    elif "tình yêu" in giftbox.ten_hop_qua.lower():
        simple_query = "romantic gift box"
    elif "cảm ơn" in giftbox.ten_hop_qua.lower():
        simple_query = "thank you gift"
    elif "lễ hội" in giftbox.ten_hop_qua.lower():
        simple_query = "holiday gift box"
    elif "chăm sóc" in giftbox.ten_hop_qua.lower():
        simple_query = "self care gift"
    elif "cao cấp" in giftbox.ten_hop_qua.lower():
        simple_query = "luxury gift box"
    elif "mini" in giftbox.ten_hop_qua.lower():
        simple_query = "small gift box"
    elif "kỷ niệm" in giftbox.ten_hop_qua.lower():
        simple_query = "anniversary gift"
    
    search_query = simple_query
    print(f"   Search query: {search_query}")
    
    # Tìm ảnh
    # Sử dụng giftbox_id để skip index khác nhau, tránh trùng ảnh
    skip_index = giftbox.hop_qua_id % 5  # Lấy modulo để có index khác nhau
    image_url = None
    if UNSPLASH_ACCESS_KEY:
        image_url = search_unsplash_image(search_query, max_results=10, skip_index=skip_index)
    
    if not image_url and PEXELS_API_KEY:
        image_url = search_pexels_image(search_query)
    
    if not image_url:
        print(f"❌ Không tìm thấy ảnh cho '{giftbox.ten_hop_qua}'")
        return False
    
    # Tạo tên file
    safe_name = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in giftbox.ten_hop_qua)
    safe_name = safe_name[:50]
    filename = f"{giftbox.hop_qua_id}_{safe_name}.jpg"
    save_path = GIFTBOX_DIR / filename
    
    # Tải ảnh
    if download_image(image_url, save_path):
        # Cập nhật database
        relative_path = f"giftboxes/{filename}"
        giftbox.hinh_anh_url = relative_path
        db.commit()
        print(f"✅ Đã cập nhật database: {relative_path}")
        return True
    
    return False


def main():
    """Hàm chính"""
    print("=" * 60)
    print("🖼️  Script tải ảnh sản phẩm tự động")
    print("=" * 60)
    
    # Kiểm tra API keys
    if not UNSPLASH_ACCESS_KEY and not PEXELS_API_KEY:
        print("\n⚠️  CẢNH BÁO: Chưa có API key nào được set!")
        print("   Để sử dụng script này, bạn cần:")
        print("   1. Đăng ký tài khoản miễn phí tại:")
        print("      - Unsplash: https://unsplash.com/developers")
        print("      - Pexels: https://www.pexels.com/api/")
        print("   2. Set environment variable:")
        print("      - UNSPLASH_ACCESS_KEY=your_key")
        print("      - PEXELS_API_KEY=your_key")
        print("\n   Hoặc export trong terminal:")
        print("      export UNSPLASH_ACCESS_KEY=your_key")
        print("      export PEXELS_API_KEY=your_key")
        return
    
    db = SessionLocal()
    try:
        # Lấy tất cả sản phẩm chưa có ảnh hoặc có ảnh từ URL
        products = db.query(SanPham).filter(
            (SanPham.hinh_anh_url.is_(None)) | 
            (SanPham.hinh_anh_url.like("http%"))
        ).all()
        
        print(f"\n📦 Tìm thấy {len(products)} sản phẩm cần tải ảnh")
        
        success_count = 0
        for i, product in enumerate(products, 1):
            print(f"\n[{i}/{len(products)}]")
            if process_product(product, db):
                success_count += 1
            # Delay để tránh rate limit
            time.sleep(1)
        
        # Lấy tất cả hộp quà
        giftboxes = db.query(HopQua).filter(
            (HopQua.hinh_anh_url.is_(None)) | 
            (HopQua.hinh_anh_url.like("http%"))
        ).all()
        
        print(f"\n🎁 Tìm thấy {len(giftboxes)} hộp quà cần tải ảnh")
        
        for i, giftbox in enumerate(giftboxes, 1):
            print(f"\n[{i}/{len(giftboxes)}]")
            if process_giftbox(giftbox, db):
                success_count += 1
            time.sleep(1)
        
        print("\n" + "=" * 60)
        print(f"✅ Hoàn thành! Đã tải {success_count} ảnh thành công")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()

