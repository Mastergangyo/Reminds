@echo off
title Life Reminder Assistant - Background Service
cd /d "%~dp0"

echo ===================================================================
echo   ⚡ LIFE REMINDER ASSISTANT - STARTING REAL-TIME SERVICE
echo ===================================================================
echo.
echo Checking Python environment...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found on your system PATH!
    echo Please install Python 3 or add it to PATH.
    pause
    exit /b 1
)

echo Starting Background Notification Scheduler & Web Server...
echo URL: http://127.0.0.1:8765
echo.
echo (Keep this window open or minimized to receive desktop notifications)
echo.

python server.py
pause
