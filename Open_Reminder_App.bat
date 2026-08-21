@echo off
title Life Reminder Assistant (PRO) - Background Service
cd /d "%~dp0"

echo ===================================================================
echo   ⚡ LIFE REMINDER ASSISTANT (PRO) - REAL-TIME ENGINE
echo ===================================================================
echo.
echo Starting Python Web Server & Background Scheduler...
echo Desktop Alerts: Windows Toast + Sound Chimes (Active)
echo Mobile Alerts:  ntfy / Telegram / WhatsApp Push (Active)
echo URL:            http://127.0.0.1:8765
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [NOTE] Python executable not found in PATH.
    echo Opening standalone browser mode with offline local storage...
    start "" "%~dp0index.html"
    exit /b 0
)

python server.py
pause
