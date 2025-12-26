# Hướng dẫn tải ảnh sản phẩm tự động

Script này sẽ tự động tìm và tải ảnh sản phẩm từ Unsplash/Pexels dựa trên tên sản phẩm trong database.

## 📋 Yêu cầu

1. **API Keys** (miễn phí):
   - **Unsplash**: Đăng ký tại https://unsplash.com/developers
   - **Pexels**: Đăng ký tại https://www.pexels.com/api/

2. **Python packages**: Đã có trong `requirements.txt`

## 🚀 Cách sử dụng

### Bước 1: Lấy API Key

#### Unsplash:
1. Truy cập https://unsplash.com/developers
2. Đăng ký/đăng nhập
3. Tạo một "New Application"
4. Copy "Access Key"

#### Pexels:
1. Truy cập https://www.pexels.com/api/
2. Đăng ký/đăng nhập
3. Copy API key

### Bước 2: Set Environment Variables

**Windows (PowerShell):**
```powershell
$env:UNSPLASH_ACCESS_KEY="your_unsplash_key_here"
$env:PEXELS_API_KEY="your_pexels_key_here"
```

**Windows (CMD):**
```cmd
set UNSPLASH_ACCESS_KEY=your_unsplash_key_here
set PEXELS_API_KEY=your_pexels_key_here
```

**Linux/Mac:**
```bash
export UNSPLASH_ACCESS_KEY="your_unsplash_key_here"
export PEXELS_API_KEY="your_pexels_key_here"
```

**Hoặc thêm vào file `.env`:**
```
UNSPLASH_ACCESS_KEY=your_unsplash_key_here
PEXELS_API_KEY=your_pexels_key_here
```

### Bước 3: Chạy script

```bash
cd "c:\Leaf Crème"
python scripts/download_product_images.py
```

## 📁 Cấu trúc thư mục

Script sẽ tự động tạo và lưu ảnh vào:
- `uploads/product/` - Ảnh sản phẩm
- `uploads/giftboxes/` - Ảnh hộp quà

Tên file: `{id}_{sanitized_name}.jpg`

## 🔍 Cách script hoạt động

1. **Kết nối database**: Lấy danh sách sản phẩm và hộp quà
2. **Tạo search query**: Từ tên sản phẩm + danh mục
   - Ví dụ: "Bánh kem vanilla trái cây" → "cake vanilla fruit bakery dessert food"
3. **Tìm ảnh**: 
   - Ưu tiên Unsplash (chất lượng cao hơn)
   - Fallback Pexels nếu Unsplash không có
4. **Tải ảnh**: Lưu vào thư mục phù hợp
5. **Cập nhật database**: Ghi đường dẫn ảnh vào `hinh_anh_url`

## ⚙️ Tính năng

- ✅ Tự động bỏ qua sản phẩm đã có ảnh local
- ✅ Tìm ảnh phù hợp dựa trên tên và danh mục
- ✅ Delay giữa các request để tránh rate limit
- ✅ Xử lý lỗi và log chi tiết
- ✅ Cập nhật database tự động

## 📝 Ví dụ output

```
============================================================
🖼️  Script tải ảnh sản phẩm tự động
============================================================

📦 Tìm thấy 5 sản phẩm cần tải ảnh

[1/5]
🔍 Đang tìm ảnh cho: Bánh kem vanilla trái cây
   Danh mục: Bánh kem
   Search query: cake vanilla fruit bakery dessert food
✅ Đã tải: 1_banh_kem_vanilla_trai_cay.jpg
✅ Đã cập nhật database: product/1_banh_kem_vanilla_trai_cay.jpg

[2/5]
...
```

## ⚠️ Lưu ý

1. **Rate Limits**: 
   - Unsplash: 50 requests/hour (free tier)
   - Pexels: 200 requests/hour (free tier)
   - Script tự động delay 1 giây giữa các request

2. **Chất lượng ảnh**: 
   - Unsplash thường có ảnh chất lượng cao hơn
   - Script tải ảnh "regular" size (đủ cho web)

3. **Bản quyền**: 
   - Unsplash và Pexels đều là ảnh miễn phí, có thể dùng thương mại
   - Nên credit photographer nếu có thể

4. **Fallback**: 
   - Nếu không tìm thấy ảnh, script sẽ bỏ qua và tiếp tục với sản phẩm tiếp theo

## 🐛 Troubleshooting

**Lỗi: "UNSPLASH_ACCESS_KEY chưa được set"**
- Kiểm tra lại environment variables
- Đảm bảo đã set đúng tên biến

**Lỗi: "Không tìm thấy ảnh"**
- Thử với API key khác (Pexels)
- Kiểm tra tên sản phẩm có quá đặc biệt không
- Có thể cần chỉnh sửa `generate_search_query()` để tối ưu hơn

**Lỗi kết nối database:**
- Kiểm tra `DATABASE_URL` trong `.env`
- Đảm bảo database đang chạy

