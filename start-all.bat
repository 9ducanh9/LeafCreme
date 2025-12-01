@echo off
echo ========================================
echo Starting Leaf Creme - Backend + Frontend
echo ========================================
echo.

REM Get the script directory
set SCRIPT_DIR=%~dp0

REM Start Backend in a new window
echo Starting Backend Server...
start "Leaf Creme Backend" cmd /k "cd /d %SCRIPT_DIR% && start-backend.bat"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Start Frontend in a new window
echo Starting Frontend Server...
start "Leaf Creme Frontend" cmd /k "cd /d %SCRIPT_DIR%frontend && start-frontend.bat"

echo.
echo ========================================
echo Both servers are starting...
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Press any key to close this window (servers will keep running)
pause >nul




