# MedID DeepFace Integration Setup Script - Windows PowerShell
Write-Host "🚀 Installing MedID Production Biometric System with DeepFace..." -ForegroundColor Green

# Navigate to biometric service directory
Set-Location biometric-service

# Create backup of current system
Write-Host "📦 Creating backup of current system..." -ForegroundColor Blue
Copy-Item main.py main_backup.py -Force
Copy-Item requirements.txt requirements_backup.txt -Force

# Install new dependencies
Write-Host "📚 Installing DeepFace and dependencies..." -ForegroundColor Blue
pip uninstall -y face-recognition dlib  # Remove old library
pip install -r requirements_deepface.txt

# Verify installation
Write-Host "🔍 Verifying DeepFace installation..." -ForegroundColor Blue
python -c @"
from deepface import DeepFace
import tensorflow as tf
print('✅ DeepFace installed successfully')
print('✅ TensorFlow version:', tf.__version__)
print('✅ Available models: VGG-Face, ArcFace, Facenet, OpenFace, Dlib')
"@

# Download and cache initial models
Write-Host "⬇️  Pre-downloading DeepFace models for faster startup..." -ForegroundColor Blue
python -c @"
import numpy as np
from deepface import DeepFace
import warnings
warnings.filterwarnings('ignore')

test_img = np.ones((224, 224, 3), dtype=np.uint8) * 128
try:
    DeepFace.represent(test_img, model_name='ArcFace', detector_backend='opencv', enforce_detection=False)
    print('✅ ArcFace model cached')
    DeepFace.represent(test_img, model_name='Facenet', detector_backend='opencv', enforce_detection=False)
    print('✅ Facenet model cached')
except Exception as e:
    print('⚠️  Model caching failed (will download on first use):', str(e))
"@

# Replace main service file
Write-Host "🔄 Deploying new biometric service..." -ForegroundColor Blue
Copy-Item main_deepface.py main.py -Force

# Update environment variables
Write-Host "⚙️  Setting up environment configuration..." -ForegroundColor Blue
$envContent = @"

# DeepFace Configuration
BIOMETRIC_MODEL=ArcFace
FACE_DETECTOR=opencv
DISTANCE_METRIC=cosine
MIN_CONFIDENCE_SCORE=0.3
VERIFICATION_THRESHOLD=0.65
ANTI_SPOOFING_ENABLED=true
PROCESSING_TIMEOUT=30
"@

Add-Content -Path .env -Value $envContent

Write-Host "✅ DeepFace integration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "🔧 Configuration Options:" -ForegroundColor Yellow
Write-Host "  - Model: ArcFace (high accuracy)"
Write-Host "  - Detector: OpenCV (fast)"
Write-Host "  - Anti-spoofing: Enabled"
Write-Host "  - Verification threshold: 0.65"
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Start the service: python main.py"
Write-Host "  2. Test the health endpoint: http://localhost:8002/health"
Write-Host "  3. Check available models: http://localhost:8002/models/available"
Write-Host ""
Write-Host "⚡ Performance Notes:" -ForegroundColor Cyan
Write-Host "  - First run will download ~200MB of models"
Write-Host "  - Subsequent runs are much faster"
Write-Host "  - GPU acceleration available with CUDA"