@echo off
echo ========================================
echo Starting Leaf Creme Backend Server...
echo ========================================
cd /d "%~dp0"

REM Use system Python (venv is corrupted)
REM To use venv in future, recreate it: python -m venv venv --clear
set PYTHON_CMD=python

echo.
echo Starting FastAPI server on http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
%PYTHON_CMD% -m uvicorn app.main:app --reload --port 8000
pause
