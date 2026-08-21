@echo off
title Setup Auto-Start on Windows Boot
cd /d "%~dp0"

echo ===================================================================
echo   ⚡ SETUP LIFE REMINDER AUTO-START ON WINDOWS BOOT
echo ===================================================================
echo.
echo This script will configure Life Reminder Assistant to run silently 
echo in the background whenever you log in to Windows.
echo.

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_SCRIPT=%STARTUP_FOLDER%\LifeReminderBackground.vbs"
set "APP_DIR=%~dp0"

echo Creating background launcher in Startup folder...
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.CurrentDirectory = "%APP_DIR%"
echo WshShell.Run "python """ ^& "%APP_DIR%server.py""" ^& " 8765", 0, False
) > "%VBS_SCRIPT%"

if exist "%VBS_SCRIPT%" (
    echo.
    echo [SUCCESS] Auto-start configured successfully!
    echo Location: %VBS_SCRIPT%
    echo.
    echo The reminder assistant will now automatically run quietly in the
    echo background on Windows startup, delivering all your real-time alerts!
) else (
    echo [ERROR] Failed to write startup launcher.
)

echo.
pause
