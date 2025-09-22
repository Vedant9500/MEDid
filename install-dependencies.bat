@echo off
echo ========================================
echo  MedID Dependency Installation
echo ========================================
echo.

REM Change to project root
cd /d "%~dp0"

echo [1/3] Installing Backend Dependencies...
cd backend
C:/Users/deshm/AppData/Local/Microsoft/WindowsApps/python3.12.exe -m pip install django djangorestframework django-cors-headers pillow requests python-dotenv python-decouple
if %errorlevel% neq 0 (
    echo Failed to install backend dependencies
    pause
    exit /b 1
)
echo ✅ Backend dependencies installed

echo.
echo [2/3] Installing Biometric Service Dependencies...
cd ..\biometric-service
C:/Users/deshm/AppData/Local/Microsoft/WindowsApps/python3.12.exe -m pip install fastapi uvicorn face-recognition opencv-python pillow cryptography PyJWT numpy python-multipart
if %errorlevel% neq 0 (
    echo Failed to install biometric service dependencies
    pause
    exit /b 1
)
echo ✅ Biometric service dependencies installed

echo.
echo [3/3] Checking Frontend Dependencies...
cd ..\frontend\web
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Failed to install frontend dependencies
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies already installed
)
echo ✅ Frontend dependencies ready

echo.
echo ========================================
echo  All Dependencies Installed Successfully!
echo ========================================
echo.
echo Next steps:
echo 1. Run .\start-medid.bat to start all services
echo 2. Open http://localhost:3000 in your browser
echo 3. Login with: demo@medid.com / demo123
echo.
pause