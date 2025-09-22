# MedID System - Quick Start Guide

## 🚀 One-Click Startup

### For Windows:
```bash
# Double-click or run from command prompt:
start-medid.bat

# Or from PowerShell:
.\start-medid.ps1
```

### For Mac/Linux:
```bash
chmod +x start-medid.sh
./start-medid.sh
```

## 📋 What Gets Started

The startup scripts will automatically launch:

1. **Django Backend API** (Port 8001)
   - Authentication & user management
   - Patient data management
   - Main application APIs

2. **Biometric Service** (Port 8002) 
   - Fingerprint processing
   - Face recognition
   - Biometric matching

3. **React Frontend** (Port 3000)
   - User interface
   - Emergency dashboard
   - Patient registration

## 🔐 Demo Login

- **Email**: `demo@medid.com`
- **Password**: `demo123`

## 🌐 Service URLs

- **Main Application**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Biometric API**: http://localhost:8002

## 🛑 Stopping Services

Press `Ctrl+C` in each terminal window to stop the services.

## 🔧 Manual Startup (if scripts don't work)

### Backend:
```bash
cd backend
python manage.py runserver 0.0.0.0:8001
```

### Biometric Service:
```bash
cd biometric-service  
python main.py
```

### Frontend:
```bash
cd frontend/web
npm start
```

## 🐛 Troubleshooting

- **Port conflicts**: Make sure ports 3000, 8001, 8002 are available
- **Python errors**: Ensure Python 3.8+ is installed
- **Node errors**: Ensure Node.js 16+ and npm are installed
- **Permission errors**: Run as administrator/sudo if needed

## ✨ Features Available

- ✅ User Authentication
- ✅ Patient Management
- ✅ Emergency Dashboard
- ✅ Biometric Scanning (Demo)
- ✅ Patient Registration
- ✅ System Health Monitoring