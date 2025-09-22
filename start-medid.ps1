# MedID System Startup Script
# PowerShell version for Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " MedID - Medical Biometric System" -ForegroundColor Cyan
Write-Host " Starting All Services..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

Write-Host "[1/3] Starting Django Backend Server..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\backend'; C:/Users/deshm/AppData/Local/Microsoft/WindowsApps/python3.12.exe manage.py runserver 0.0.0.0:8001"

Start-Sleep -Seconds 2

Write-Host "[2/3] Starting Biometric Service..." -ForegroundColor Yellow  
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\biometric-service'; C:/Users/deshm/AppData/Local/Microsoft/WindowsApps/python3.12.exe main.py"

Start-Sleep -Seconds 2

Write-Host "[3/3] Starting React Frontend..." -ForegroundColor Yellow
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "Set-Location '$PWD\frontend\web'; npm start"

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " All services are starting..." -ForegroundColor Green
Write-Host " " 
Write-Host " Backend API:     http://localhost:8001" -ForegroundColor White
Write-Host " Frontend UI:     http://localhost:3000" -ForegroundColor White
Write-Host " Biometric API:   http://localhost:8002" -ForegroundColor White
Write-Host ""
Write-Host " Login with: demo@medid.com / demo123" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Wait for services to start
Write-Host "Waiting for services to initialize..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

# Open the application in default browser
Write-Host "Opening application in browser..." -ForegroundColor Cyan
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "All services are running!" -ForegroundColor Green
Write-Host "Press Ctrl+C in each PowerShell window to stop services." -ForegroundColor Yellow
Write-Host ""
Read-Host "Press Enter to exit this script (services will continue running)"