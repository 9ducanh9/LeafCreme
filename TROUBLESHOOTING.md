# Troubleshooting Guide - Leaf Creme

## 🔍 Kiểm tra User trong Database

### Xem tất cả users:
```bash
python check_user.py
```

### Kiểm tra user cụ thể:
```bash
python check_user.py camgiacntn
```

## 🔐 Test Login

### Test password:
```bash
python test_login.py camgiacntn yourpassword
```

### Reset password:
```bash
python reset_password.py reset camgiacntn newpassword123
```

### Test password hiện tại:
```bash
python reset_password.py test camgiacntn yourpassword
```

## 🐛 Lỗi thường gặp

### 1. Lỗi 401 Unauthorized khi login
**Nguyên nhân có thể:**
- Username/password không đúng
- User không tồn tại trong database
- Password hash không đúng

**Cách fix:**
1. Kiểm tra user có tồn tại: `python check_user.py <username>`
2. Test password: `python reset_password.py test <username> <password>`
3. Reset password nếu cần: `python reset_password.py reset <username> <newpassword>`

### 2. Lỗi 401 khi gọi /auth/me
**Nguyên nhân có thể:**
- Token không được lưu đúng
- Token đã hết hạn
- Token format không đúng
- SECRET_KEY không match

**Cách fix:**
1. Check browser console logs
2. Check backend logs để xem token decode có fail không
3. Thử login lại
4. Clear localStorage và login lại

### 3. Lỗi 403 Forbidden khi fetch products
**Đã fix:** Products endpoints giờ cho phép public access (không cần login)

## 📝 Debug Steps

1. **Check user tồn tại:**
   ```bash
   python check_user.py camgiacntn
   ```

2. **Test login flow:**
   ```bash
   python test_login.py camgiacntn yourpassword
   ```

3. **Check browser console:**
   - Mở F12 → Console
   - Xem logs khi login
   - Check token có được lưu không

4. **Check backend logs:**
   - Xem terminal chạy backend
   - Tìm logs về login và token decode

5. **Reset password nếu cần:**
   ```bash
   python reset_password.py reset camgiacntn newpassword123
   ```

## 🔑 Tạo User mới

Nếu cần tạo user mới, có thể:
1. Dùng API `/auth/register` qua frontend
2. Hoặc tạo trực tiếp trong database với script


