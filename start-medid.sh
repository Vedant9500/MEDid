#!/bin/bash

echo "========================================"
echo " MedID - Medical Biometric System"
echo " Starting All Services..."
echo "========================================"
echo

# Change to project root
cd "$(dirname "$0")"

echo "[1/3] Starting Django Backend Server..."
gnome-terminal --title="Django Backend" -- bash -c "cd backend && python manage.py runserver 0.0.0.0:8001; exec bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/backend\" && python manage.py runserver 0.0.0.0:8001"' 2>/dev/null || \
echo "Please start Django manually: cd backend && python manage.py runserver 0.0.0.0:8001" &

echo "[2/3] Starting Biometric Service..."
gnome-terminal --title="Biometric Service" -- bash -c "cd biometric-service && python main.py; exec bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/biometric-service\" && python main.py"' 2>/dev/null || \
echo "Please start Biometric Service manually: cd biometric-service && python main.py" &

echo "[3/3] Starting React Frontend..."
gnome-terminal --title="React Frontend" -- bash -c "cd frontend/web && npm start; exec bash" 2>/dev/null || \
osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/frontend/web\" && npm start"' 2>/dev/null || \
echo "Please start React manually: cd frontend/web && npm start" &

echo
echo "========================================"
echo " All services are starting..."
echo " "
echo " Backend API:     http://localhost:8001"
echo " Frontend UI:     http://localhost:3000"  
echo " Biometric API:   http://localhost:8002"
echo
echo " Login with: demo@medid.com / demo123"
echo "========================================"
echo

# Wait a moment for services to start
sleep 5

# Open the application in default browser
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:3000
elif command -v open > /dev/null; then
    open http://localhost:3000
else
    echo "Please open http://localhost:3000 in your browser"
fi

echo
echo "All services are running!"
echo "Press Ctrl+C in each terminal window to stop services."