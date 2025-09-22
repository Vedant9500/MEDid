# MedID Dependency Installation Script (PowerShell)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " MedID Dependency Installation" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

Write-Host "[1/3] Installing Backend Dependencies..." -ForegroundColor Yellow
Set-Location "backend"
$backendResult = & C:/Users/deshm/AppData/Local/Microsoft/WindowsApps/python3.12.exe -m pip install django djangorestframework django-cors-headers pillow requests python-dotenv python-decouple
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Backend dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "[2/3] Installing Biometric Service Dependencies..." -ForegroundColor Yellow
Set-Location "..\biometric-service"
$biometricResult = & C:/Users/deshm/AppData/Local/Microsoft/WindowsApps/python3.12.exe -m pip install fastapi uvicorn face-recognition opencv-python pillow cryptography PyJWT numpy python-multipart
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install biometric service dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✅ Biometric service dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "[3/3] Checking Frontend Dependencies..." -ForegroundColor Yellow
Set-Location "..\frontend\web"
if (!(Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    $frontendResult = npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "Frontend dependencies already installed" -ForegroundColor Cyan
}
Write-Host "✅ Frontend dependencies ready" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " All Dependencies Installed Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run .\start-medid.ps1 to start all services" -ForegroundColor White
Write-Host "2. Open http://localhost:3000 in your browser" -ForegroundColor White
Write-Host "3. Login with: demo@medid.com / demo123" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to continue"