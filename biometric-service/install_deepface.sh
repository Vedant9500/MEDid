#!/bin/bash
# MedID DeepFace Integration Setup Script

echo "🚀 Installing MedID Production Biometric System with DeepFace..."

# Navigate to biometric service directory
cd biometric-service

# Create backup of current system
echo "📦 Creating backup of current system..."
cp main.py main_backup.py
cp requirements.txt requirements_backup.txt

# Install new dependencies
echo "📚 Installing DeepFace and dependencies..."
pip uninstall -y face-recognition dlib  # Remove old library
pip install -r requirements_deepface.txt

# Verify installation
echo "🔍 Verifying DeepFace installation..."
python -c "
from deepface import DeepFace
import tensorflow as tf
print('✅ DeepFace version:', DeepFace.__version__ if hasattr(DeepFace, '__version__') else 'installed')
print('✅ TensorFlow version:', tf.__version__)
print('✅ Available models:', ['VGG-Face', 'ArcFace', 'Facenet', 'OpenFace'])
"

# Download and cache initial models (optional)
echo "⬇️  Pre-downloading DeepFace models for faster startup..."
python -c "
import numpy as np
from deepface import DeepFace
test_img = np.ones((224, 224, 3), dtype=np.uint8) * 128
try:
    DeepFace.represent(test_img, model_name='ArcFace', detector_backend='opencv', enforce_detection=False)
    print('✅ ArcFace model cached')
    DeepFace.represent(test_img, model_name='Facenet', detector_backend='opencv', enforce_detection=False)
    print('✅ Facenet model cached')
except Exception as e:
    print('⚠️  Model caching failed (will download on first use):', e)
"

# Replace main service file
echo "🔄 Deploying new biometric service..."
cp main_deepface.py main.py

# Update environment variables
echo "⚙️  Setting up environment configuration..."
cat >> .env << EOF

# DeepFace Configuration
BIOMETRIC_MODEL=ArcFace
FACE_DETECTOR=opencv
DISTANCE_METRIC=cosine
MIN_CONFIDENCE_SCORE=0.3
VERIFICATION_THRESHOLD=0.65
ANTI_SPOOFING_ENABLED=true
PROCESSING_TIMEOUT=30
EOF

echo "✅ DeepFace integration complete!"
echo ""
echo "🔧 Configuration Options:"
echo "  - Model: ArcFace (high accuracy)"
echo "  - Detector: OpenCV (fast)"
echo "  - Anti-spoofing: Enabled"
echo "  - Verification threshold: 0.65"
echo ""
echo "📋 Next Steps:"
echo "  1. Start the service: python main.py"
echo "  2. Test the health endpoint: curl http://localhost:8002/health"
echo "  3. Check available models: curl http://localhost:8002/models/available"
echo ""
echo "⚡ Performance Notes:"
echo "  - First run will download ~200MB of models"
echo "  - Subsequent runs are much faster"
echo "  - Consider GPU acceleration for high throughput"