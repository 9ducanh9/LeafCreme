@echo off
setlocal enabledelayedexpansion

REM Get the script directory
set SCRIPT_DIR=%~dp0

REM Title for the window
title Leaf Creme - Development Server

:START_SERVERS
cls
echo ========================================
echo    Leaf Creme - Auto Start Mode
echo ========================================
echo.
echo Starting Backend + Frontend automatically...
echo.

REM Check if already running and stop first
call :STOP_PROCESSES_SILENT

REM Start Backend in a new window
echo [1/2] Starting Backend Server...
start "Leaf Creme Backend" cmd /k "cd /d %SCRIPT_DIR% && start-backend.bat"

REM Wait for backend to start
echo Waiting for backend to initialize (5 seconds)...
timeout /t 5 /nobreak >nul

REM Start Frontend in a new window
echo [2/2] Starting Frontend Server...
start "Leaf Creme Frontend" cmd /k "cd /d %SCRIPT_DIR%frontend && start-frontend.bat"

REM Wait for frontend to start
echo Waiting for frontend to initialize (8 seconds)...
timeout /t 8 /nobreak >nul

REM Open frontend in browser
echo.
echo Opening frontend in browser...
start http://localhost:3000

cls
echo ========================================
echo    Leaf Creme - Running
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo ========================================
echo Controls (press key, no Enter needed):
echo   [R] = Restart All
echo   [S] = Stop All
echo   [B] = Open Browser
echo   [D] = Open API Docs
echo   [Q] = Quit
echo ========================================
echo.

:WAIT_FOR_INPUT
REM Use PowerShell to read single key press
set "KEY_FILE=%TEMP%\leaf_creme_key.txt"
powershell -Command "$key = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown'); Write-Host $key.Character" > "%KEY_FILE%"
set /p "key=" < "%KEY_FILE%"
del "%KEY_FILE%" 2>nul

if /i "%key%"=="R" goto RESTART
if /i "%key%"=="S" goto STOP_ALL
if /i "%key%"=="B" goto OPEN_BROWSER
if /i "%key%"=="D" goto OPEN_DOCS
if /i "%key%"=="Q" goto QUIT

goto WAIT_FOR_INPUT

:RESTART
cls
echo ========================================
echo    Restarting All Servers...
echo ========================================
echo.
echo [1/3] Stopping existing servers...
call :STOP_PROCESSES

echo [2/3] Starting Backend...
start "Leaf Creme Backend" cmd /k "cd /d %SCRIPT_DIR% && start-backend.bat"
timeout /t 5 /nobreak >nul

echo [3/3] Starting Frontend...
start "Leaf Creme Frontend" cmd /k "cd /d %SCRIPT_DIR%frontend && start-frontend.bat"
timeout /t 8 /nobreak >nul

echo.
echo Opening frontend in browser...
start http://localhost:3000

cls
echo ========================================
echo    Restart Complete!
echo ========================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Press [R] to Restart, [S] to Stop, [Q] to Quit
echo.
goto WAIT_FOR_INPUT

:STOP_ALL
cls
echo ========================================
echo    Stopping All Servers...
echo ========================================
echo.
call :STOP_PROCESSES
echo.
echo All servers stopped!
echo.
echo Press any key to start again, or close this window to exit...
pause >nul
goto START_SERVERS

:OPEN_BROWSER
start http://localhost:3000
cls
echo Browser opened!
echo.
echo Press [R] to Restart, [S] to Stop, [Q] to Quit
echo.
goto WAIT_FOR_INPUT

:OPEN_DOCS
start http://localhost:8000/docs
cls
echo API Docs opened!
echo.
echo Press [R] to Restart, [S] to Stop, [Q] to Quit
echo.
goto WAIT_FOR_INPUT

:QUIT
cls
echo.
echo Shutting down...
call :STOP_PROCESSES
echo.
echo Goodbye!
timeout /t 2 /nobreak >nul
exit /b 0

:STOP_PROCESSES
REM Stop Backend (kill processes on port 8000)
echo Stopping Backend...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Stop Frontend (kill processes on port 3000)
echo Stopping Frontend...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Kill the command windows
taskkill /F /FI "WINDOWTITLE eq Leaf Creme Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Leaf Creme Frontend*" >nul 2>&1

timeout /t 1 /nobreak >nul
exit /b

:STOP_PROCESSES_SILENT
REM Silent version for auto-start
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
taskkill /F /FI "WINDOWTITLE eq Leaf Creme Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Leaf Creme Frontend*" >nul 2>&1
timeout /t 1 /nobreak >nul
exit /b
