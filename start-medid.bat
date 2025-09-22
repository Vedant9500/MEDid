@echo off
echo ========================================
echo  MedID - Medical Biometric System
echo  Starting All Services...
echo ========================================
echo.

REM Change to project root
cd /d "%~dp0"

echo [1/3] Starting Django Backend Server...
start "Django Backend" cmd /k "cd backend && C:/Users/deshm/AppData/Local/Microsoft/WindowsApps/python3.12.exe manage.py runserver 0.0.0.0:8001"

echo [2/3] Starting Biometric Service...
start "Biometric Service" cmd /k "cd biometric-service && C:/Users/deshm/AppData/Local/Microsoft/WindowsApps/python3.12.exe main.py"

echo [3/3] Starting React Frontend...
start "React Frontend" cmd /k "cd frontend\web && npm start"

echo.
echo ========================================
echo  All services are starting...
echo  
echo  Backend API:     http://localhost:8001
echo  Frontend UI:     http://localhost:3000  
echo  Biometric API:   http://localhost:8002
echo.
echo  Login with: demo@medid.com / demo123
echo ========================================
echo.
echo Press any key to open the application in your browser...
pause > nul

REM Open the application in default browser
start http://localhost:3000

echo.
echo All services are running!
echo Press Ctrl+C in each terminal window to stop services.
pause