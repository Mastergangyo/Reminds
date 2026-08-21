# PowerShell Real-Time Reminder Notification & Web Server
$port = 8765
$appDir = $PSScriptRoot

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  ⚡ LIFE REMINDER ASSISTANT - POWERSHELL REAL-TIME DAEMON" -ForegroundColor Yellow
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "Starting local dashboard..." -ForegroundColor Green

# Open browser to index.html
Start-Process "$appDir\index.html"

Write-Host "Application is open and running in real time!" -ForegroundColor Green
Write-Host "You can keep this window open or minimize it." -ForegroundColor Gray
