@echo off
echo ========================================
echo Starting Leaf Creme Frontend...
echo ========================================
cd /d "%~dp0"
if not exist "node_modules" (
    echo.
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
)
echo.
echo Starting Vite dev server on http://localhost:3000
echo.
call npm run dev
pause


