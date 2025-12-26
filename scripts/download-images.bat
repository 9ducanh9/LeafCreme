@echo off
REM Script để tải ảnh sản phẩm tự động
REM Yêu cầu: Set UNSPLASH_ACCESS_KEY và PEXELS_API_KEY trước khi chạy

echo ============================================================
echo    Script tải ảnh sản phẩm tự động
echo ============================================================
echo.

REM Kiểm tra API keys
if "%UNSPLASH_ACCESS_KEY%"=="" (
    echo [WARNING] UNSPLASH_ACCESS_KEY chua duoc set
    echo.
)
if "%PEXELS_API_KEY%"=="" (
    echo [WARNING] PEXELS_API_KEY chua duoc set
    echo.
)

if "%UNSPLASH_ACCESS_KEY%"=="" if "%PEXELS_API_KEY%"=="" (
    echo.
    echo [ERROR] Can it nhat 1 API key (Unsplash hoac Pexels)
    echo.
    echo Huong dan:
    echo   1. Dang ky tai khoan mien phi:
    echo      - Unsplash: https://unsplash.com/developers
    echo      - Pexels: https://www.pexels.com/api/
    echo.
    echo   2. Set environment variable:
    echo      set UNSPLASH_ACCESS_KEY=your_key
    echo      set PEXELS_API_KEY=your_key
    echo.
    pause
    exit /b 1
)

REM Chuyển về thư mục gốc
cd /d "%~dp0.."

REM Kích hoạt virtual environment nếu có
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Chạy script
python scripts\download_product_images.py

echo.
pause

