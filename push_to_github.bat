@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Users\pb963\AppData\Local\Programs\MinGit\cmd;C:\Users\pb963\AppData\Local\Programs\MinGit\mingw64\bin;%PATH%"

echo ===================================================
echo   Uploading Life Reminder App to GitHub
echo   Repository: https://github.com/Mastergangyo/Reminds.git
echo ===================================================
echo.

git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ===================================================
    echo  SUCCESS: Code uploaded to GitHub successfully!
    echo  View at: https://github.com/Mastergangyo/Reminds
    echo ===================================================
) else (
    echo.
    echo ---------------------------------------------------
    echo If GitHub asked for a password, note that GitHub
    echo requires a Personal Access Token (PAT).
    echo.
    echo 1. Generate a token at: https://github.com/settings/tokens
    echo    (Select 'repo' permission)
    echo 2. Run in terminal:
    echo    git remote set-url origin https://YOUR_TOKEN@github.com/Mastergangyo/Reminds.git
    echo    git push -u origin main
    echo ---------------------------------------------------
)

echo.
pause
