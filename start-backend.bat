@echo off
echo ========================================
echo Starting Leaf Creme Backend Server...
echo ========================================
cd /d "%~dp0"
if not exist "venv\Scripts\python.exe" (
    echo ERROR: Virtual environment not found!
    echo Please create virtual environment first:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)
echo.
echo Starting FastAPI server on http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
pause
