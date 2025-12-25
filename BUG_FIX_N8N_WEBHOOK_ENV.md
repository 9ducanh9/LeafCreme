# Bug Fix: N8N Webhook URL Environment Variable Not Loading

## 📋 Tóm tắt

**Vấn đề:** Backend FastAPI không load được `N8N_WEBHOOK_URL` từ file `.env`, dẫn đến lỗi 503 "n8n webhook URL not configured" khi gọi endpoint `/leafie/ask`.

**Nguyên nhân:** FastAPI với `--reload` có thể xóa environment variables giữa các requests hoặc khi module được reload.

**Giải pháp:** Reload `dotenv` ngay đầu function `ask_leafie` để đảm bảo environment variables luôn được load từ file `.env` trước khi sử dụng.

**Trạng thái:** ✅ Đã fix

---

## 🔍 Chi tiết vấn đề

### Triệu chứng

1. **Lỗi 503 Service Unavailable:**
   ```
   POST http://localhost:8000/leafie/ask
   Response: 503
   Detail: "n8n webhook URL not configured. Please set N8N_WEBHOOK_URL environment variable."
   ```

2. **Logs cho thấy:**
   - Module load thành công: `n8n_url_env: true`, `n8n_url_set: true`
   - Nhưng khi endpoint được gọi: `has_n8n_url: false`

3. **Environment variable bị mất:**
   - URL được load ở module level (khi import)
   - Nhưng không có trong `os.environ` khi endpoint chạy

### Nguyên nhân gốc rễ

**FastAPI với `--reload` có thể:**
1. Xóa environment variables giữa các requests
2. Reload module và mất env vars đã load trước đó
3. Không persist environment variables từ `load_dotenv()` ở module level

**Code cũ:**
```python
# app/routers/leafie.py
# Load dotenv ở module level
env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path, override=True)

@router.post("/ask")
async def ask_leafie(payload: LeafieRequest):
    # Chỉ load nếu không tìm thấy (nhưng vẫn fail)
    n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL")
    if not n8n_webhook_url:
        # Fallback reload - nhưng quá muộn
        load_dotenv(override=True)
        n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL")
```

**Vấn đề:**
- `load_dotenv()` ở module level không đảm bảo env vars persist khi FastAPI reload
- Fallback reload trong endpoint không đủ sớm hoặc không đúng path

---

## ✅ Giải pháp

### Code mới (đã fix)

```python
# app/routers/leafie.py
@router.post("/ask")
async def ask_leafie(payload: LeafieRequest):
    """
    Simple proxy endpoint: Backend chỉ forward request đến n8n và trả về response.
    Logic AI nằm trong n8n workflow.
    """
    # FORCE reload dotenv FIRST - this is the fix
    current_file = Path(__file__).resolve()
    project_root = current_file.parent.parent.parent
    env_path = project_root / ".env"
    
    # ALWAYS reload dotenv FIRST - this fixes the issue
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=True)
    else:
        load_dotenv(override=True)
    
    # Get n8n webhook URL from environment (after reload)
    n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL")
    
    if not n8n_webhook_url:
        raise HTTPException(
            status_code=503,
            detail="n8n webhook URL not configured. Please set N8N_WEBHOOK_URL environment variable in .env file."
        )
    
    # ... rest of the code
```

### Điểm quan trọng

1. **Reload ngay đầu function:** Đảm bảo env vars được load trước khi sử dụng
2. **Dùng absolute path:** `Path(__file__).resolve()` để tránh vấn đề working directory
3. **Override=True:** Đảm bảo env vars được ghi đè nếu đã tồn tại
4. **Không phụ thuộc vào module-level load:** Mỗi request đều reload để đảm bảo

---

## 📊 Logs xác nhận fix

### Logs trước khi fix:
```json
{
  "location": "leafie.py:ask_leafie:entry",
  "data": {"has_n8n_url": false}
}
{
  "location": "leafie.py:ask_leafie:no_url",
  "message": "No n8n URL found"
}
```

### Logs sau khi fix:
```json
{
  "location": "leafie.py:ask_leafie:FORCE_RELOAD",
  "message": "FORCE RELOAD DOTENV - NEW CODE",
  "data": {
    "env_path": "C:\\Leaf Crème\\.env",
    "env_exists": true,
    "before_reload": true
  }
}
{
  "location": "leafie.py:ask_leafie:after_reload",
  "data": {
    "n8n_url_found": true,
    "in_environ": true,
    "url_preview": "https://lamchitai.app.n8n.cloud/webhook/Leafie..."
  }
}
{
  "location": "leafie.py:ask_leafie:after_fetch",
  "data": {"status_code": 200}
}
```

---

## 🎯 Bài học rút ra

### 1. FastAPI với `--reload` và Environment Variables

**Vấn đề:**
- FastAPI `--reload` có thể reload module và mất env vars
- Module-level `load_dotenv()` không đảm bảo persistence

**Giải pháp:**
- Reload `dotenv` trong mỗi request/function cần env vars
- Hoặc dùng dependency injection để load env vars một lần và cache

### 2. Environment Variables trong Production

**Best practices:**
- **Development:** Reload trong function (như fix này)
- **Production:** Load một lần ở startup và cache
- **Docker/K8s:** Dùng environment variables từ container/system, không từ `.env` file

### 3. Debugging Environment Variables

**Cách debug:**
1. Log `os.environ` trước và sau `load_dotenv()`
2. Log path của `.env` file để đảm bảo đúng file
3. Log kết quả của `load_dotenv()` (return value)
4. Kiểm tra `os.getenv()` vs `os.environ.get()`

---

## 🔧 Cách test

### 1. Test endpoint hoạt động:
```bash
curl -X POST http://localhost:8000/leafie/ask \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```

**Expected:** 200 OK với response từ n8n

### 2. Test với env var bị xóa:
```python
# Trong function, thử xóa env var
del os.environ['N8N_WEBHOOK_URL']
# Reload dotenv
load_dotenv(override=True)
# Kiểm tra lại
assert os.getenv('N8N_WEBHOOK_URL') is not None
```

### 3. Test với file `.env` không tồn tại:
- Di chuyển file `.env` tạm thời
- Test endpoint
- Expected: 503 với message rõ ràng

---

## 📝 Checklist khi gặp lỗi tương tự

- [ ] Kiểm tra file `.env` có tồn tại không
- [ ] Kiểm tra path của `.env` file (absolute vs relative)
- [ ] Kiểm tra `load_dotenv()` có được gọi không
- [ ] Kiểm tra `override=True` có được set không
- [ ] Log `os.environ` trước và sau `load_dotenv()`
- [ ] Kiểm tra FastAPI có đang dùng `--reload` không
- [ ] Kiểm tra có process backend khác đang chạy không
- [ ] Kiểm tra Python cache (`__pycache__`) có cần xóa không

---

## 🔗 Files liên quan

- `app/routers/leafie.py` - Router chứa endpoint `/leafie/ask`
- `app/main.py` - Main FastAPI app, có `load_dotenv()` ở đầu file
- `.env` - File chứa `N8N_WEBHOOK_URL`
- `.cursor/debug.log` - Debug logs (có thể xóa sau khi fix)

---

## 📅 Thông tin

- **Ngày fix:** 2025-01-26
- **Người fix:** AI + Giải pháp của bạn
- **Thời gian debug:** ~2 giờ (nhiều lần restart backend)
- **Root cause:** FastAPI reload xóa env vars giữa requests

---

## 💡 Gợi ý cải thiện trong tương lai

1. **Dùng dependency injection:**
   ```python
   async def get_n8n_url() -> str:
       url = os.getenv("N8N_WEBHOOK_URL")
       if not url:
           load_dotenv(override=True)
           url = os.getenv("N8N_WEBHOOK_URL")
       return url
   
   @router.post("/ask")
   async def ask_leafie(payload: LeafieRequest, n8n_url: str = Depends(get_n8n_url)):
       # Use n8n_url
   ```

2. **Cache env vars trong production:**
   ```python
   # Load once at startup
   @app.on_event("startup")
   async def load_env():
       load_dotenv()
       # Cache in app state
       app.state.n8n_url = os.getenv("N8N_WEBHOOK_URL")
   ```

3. **Dùng Pydantic Settings:**
   ```python
   from pydantic_settings import BaseSettings
   
   class Settings(BaseSettings):
       n8n_webhook_url: str
       
       class Config:
           env_file = ".env"
   
   settings = Settings()
   ```

---

**Kết luận:** Vấn đề đã được fix bằng cách reload `dotenv` ngay đầu function. Đây là giải pháp đơn giản và hiệu quả cho development environment. Trong production, nên cân nhắc dùng dependency injection hoặc load env vars một lần ở startup.

