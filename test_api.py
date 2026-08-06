"""
Script test API cho hệ thống quản lý bánh
Chạy: python test_api.py
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000"

# Test user credentials
TEST_USER = {
    "ten_dang_nhap": "test_admin",
    "email": "test@example.com",
    "mat_khau": "test123456",
    "ho_ten": "Test Admin",
    "vaitro_id": 1  # Giả sử role_id 1 là admin
}


def print_response(title, response):
    """In kết quả response"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    except:
        print(f"Response: {response.text}")


def test_health():
    """Test health endpoint"""
    print("\n🔍 Testing Health Check...")
    response = requests.get(f"{BASE_URL}/health")
    print_response("Health Check", response)
    return response.status_code == 200


def test_register():
    """Test đăng ký user"""
    print("\n🔍 Testing User Registration...")
    try:
        response = requests.post(
            f"{BASE_URL}/auth/register",
            json=TEST_USER
        )
        print_response("Register", response)
        if response.status_code == 201:
            data = response.json()
            return data.get("access_token")
        elif response.status_code == 400:
            print("⚠️  User có thể đã tồn tại hoặc thiếu vai trò trong DB")
    except Exception as e:
        print(f"❌ Lỗi: {e}")
    return None


def test_login(username, password):
    """Test đăng nhập"""
    print("\n🔍 Testing Login...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print_response("Login", response)
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    return None


def test_get_products(token):
    """Test lấy danh sách sản phẩm"""
    print("\n🔍 Testing Get Products...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/products",
        headers=headers,
        params={"limit": 10}
    )
    print_response("Get Products", response)
    return response.status_code == 200


def test_create_product(token):
    """Test tạo sản phẩm mới"""
    print("\n🔍 Testing Create Product...")
    headers = {"Authorization": f"Bearer {token}"}
    product_data = {
        "ten": "Bánh Chocolate",
        "sku": "BANH-CHOCO-001",
        "loai": "bien_the",
        "gia_co_ban": 50000.00,
        "mo_ta": "Bánh chocolate thơm ngon",
        "danh_muc": "Bánh ngọt",
        "don_vi_tinh": "chiếc",
        "dang_hoat_dong": True
    }
    response = requests.post(
        f"{BASE_URL}/products",
        headers=headers,
        json=product_data
    )
    print_response("Create Product", response)
    if response.status_code == 201:
        data = response.json()
        return data.get("sanpham_id")
    return None


def test_create_variant(token, product_id):
    """Test tạo biến thể"""
    print("\n🔍 Testing Create Variant...")
    headers = {"Authorization": f"Bearer {token}"}
    variant_data = {
        "sanpham_id": product_id,
        "huong_vi": "Chocolate Đen",
        "kich_thuoc": "Nhỏ (200g)",
        "gia_bienthe": 55000.00,
        "sku_bienthe": "BANH-CHOCO-DARK-001",
        "muc_gioi_han_ton": 50,
        "dang_hoat_dong": True
    }
    response = requests.post(
        f"{BASE_URL}/products/variants",
        headers=headers,
        json=variant_data
    )
    print_response("Create Variant", response)
    if response.status_code == 201:
        data = response.json()
        return data.get("bienthe_id")
    return None


def test_get_batches(token):
    """Test lấy danh sách lô hàng"""
    print("\n🔍 Testing Get Batches...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/batches/products",
        headers=headers,
        params={"limit": 5}
    )
    print_response("Get Product Batches", response)
    return response.status_code == 200


def test_get_expiring(token):
    """Test cảnh báo hết hạn"""
    print("\n🔍 Testing Expiring Batches...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/batches/expiring",
        headers=headers,
        params={"days": 7}
    )
    print_response("Expiring Batches", response)
    return response.status_code == 200


def test_get_inventory(token):
    """Test tồn kho"""
    print("\n🔍 Testing Inventory...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/batches/inventory/products",
        headers=headers
    )
    print_response("Product Inventory", response)
    return response.status_code == 200


def main():
    """Chạy tất cả tests"""
    print("\n" + "="*60)
    print("🧪 TEST API - HỆ THỐNG QUẢN LÝ BÁNH")
    print("="*60)
    
    # Test 1: Health check
    if not test_health():
        print("\n❌ Server không chạy! Vui lòng chạy: uvicorn app.main:app --reload")
        return
    
    # Test 2: Login hoặc Register
    token = test_login(TEST_USER["ten_dang_nhap"], TEST_USER["mat_khau"])
    if not token:
        print("\n⚠️  Login thất bại, thử đăng ký...")
        token = test_register()
        if not token:
            print("\n❌ Không thể đăng nhập/đăng ký!")
            print("💡 Gợi ý:")
            print("   1. Kiểm tra database có dữ liệu vai trò (vaitro) chưa")
            print("   2. Hoặc tạo user trực tiếp trong database")
            print("   3. Hoặc đăng nhập với user có sẵn")
            
            # Thử với admin/test user mặc định
            print("\n🔍 Thử login với các tài khoản khác...")
            test_accounts = [
                ("admin", "admin123"),
                ("test", "test123456"),
                ("user", "password")
            ]
            for username, password in test_accounts:
                token = test_login(username, password)
                if token:
                    break
            
            if not token:
                print("\n❌ Vui lòng tạo user trong database trước khi test!")
                return
    
    print(f"\n✅ Đã có token: {token[:20]}...")
    
    # Test 3: Products
    if test_get_products(token):
        product_id = test_create_product(token)
        if product_id:
            variant_id = test_create_variant(token, product_id)
            if variant_id:
                print(f"\n✅ Đã tạo sản phẩm ID: {product_id}, biến thể ID: {variant_id}")
    
    # Test 4: Batches
    test_get_batches(token)
    test_get_expiring(token)
    test_get_inventory(token)
    
    print("\n" + "="*60)
    print("✅ HOÀN TẤT TEST!")
    print("="*60)
    print("\n💡 Tip: Xem API docs tại: http://127.0.0.1:8000/docs")


if __name__ == "__main__":
    main()

