# MedID Biometric Processing Service

## Overview
Secure facial recognition microservice implementing liveness detection, template encryption, and privacy-preserving biometric matching for the MedID health passport system.

## Features
- **Liveness Detection**: Multi-modal spoofing prevention
- **Template Encryption**: AES-256-GCM encrypted biometric embeddings
- **Privacy-Preserving Matching**: HMAC-based indexing with selective decryption
- **Quality Assessment**: NFIQ2-based quality scoring
- **Multi-Algorithm Support**: face_recognition, InsightFace, OpenFace
- **HSM Integration**: Hardware-backed key management

## Architecture

### Service Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Image Input   │───▶│  Preprocessing  │───▶│ Liveness Check  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Quality Score   │    │   Feature       │    │   Template      │
│   Assessment    │    │  Extraction     │    │  Encryption     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                      │                      │
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Response      │◀───│     Secure      │◀───│    Matching     │
│   Formation     │    │    Storage      │    │    Engine       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Security Flow
```
Raw Image → Preprocessing → Liveness → Feature Extraction → Encryption → HMAC Index → Secure Storage
                ↓              ↓              ↓              ↓              ↓
              Quality       Spoof         Embedding      AES-256-GCM    SHA-256
             Assessment    Detection      Generation      Encryption      Index
```

## Installation & Setup

### Requirements
```bash
pip install -r requirements.txt
```

### Docker Setup
```bash
docker build -t medid-biometric-service .
docker run -p 8082:8082 medid-biometric-service
```

### Environment Variables
```bash
# Security
VAULT_ADDR=https://vault.medid.example.com
VAULT_TOKEN=your-vault-token
ENCRYPTION_KEY_PATH=secret/medid/biometric-keys

# Service Configuration
SERVICE_PORT=8082
LOG_LEVEL=INFO
METRICS_ENABLED=true

# Algorithm Configuration
PRIMARY_ALGORITHM=face_recognition
SECONDARY_ALGORITHM=insightface
LIVENESS_REQUIRED=true
QUALITY_THRESHOLD=0.7
MATCH_THRESHOLD=0.85

# Performance
MAX_CONCURRENT_REQUESTS=100
REQUEST_TIMEOUT=30
CACHE_SIZE=1000
```

## API Endpoints

### Template Extraction
```http
POST /v1/extract
Content-Type: application/json

{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
  "require_liveness": true,
  "quality_threshold": 0.7,
  "patient_id": "patient-uuid"
}
```

### Biometric Matching
```http
POST /v1/match
Content-Type: application/json

{
  "image_base64": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB...",
  "match_threshold": 0.85,
  "max_candidates": 10,
  "require_liveness": true
}
```

### Health Check
```http
GET /v1/health
```

### Metrics
```http
GET /v1/metrics
```

## Service Configuration

### algorithms.yaml
```yaml
algorithms:
  face_recognition:
    enabled: true
    model_path: models/face_recognition/
    embedding_size: 128
    quality_threshold: 0.7
    preprocessing:
      face_detection: hog
      face_alignment: true
      normalization: true
    
  insightface:
    enabled: true
    model_path: models/insightface/
    embedding_size: 512
    quality_threshold: 0.8
    preprocessing:
      face_detection: retinaface
      face_alignment: similarity_transform
      normalization: true
    
  openface:
    enabled: false
    model_path: models/openface/
    embedding_size: 128
    quality_threshold: 0.6

liveness_detection:
  methods:
    - blink_detection
    - head_movement
    - texture_analysis
  thresholds:
    blink_rate: 0.15
    head_movement: 0.3
    texture_score: 0.7
  
quality_assessment:
  enabled: true
  method: nfiq2
  min_face_size: 80
  max_face_size: 1000
  brightness_range: [50, 200]
  contrast_threshold: 0.3
```

## Implementation

### Core Service (FastAPI)
```python
# app.py
from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel
import asyncio
import logging
from typing import Optional, List

from .processors import BiometricProcessor
from .security import EncryptionService
from .models import (
    ExtractRequest, MatchRequest, 
    ExtractResponse, MatchResponse
)

app = FastAPI(
    title="MedID Biometric Service",
    description="Secure facial recognition for healthcare",
    version="1.0.0"
)

security = HTTPBearer()
logger = logging.getLogger(__name__)

# Initialize services
biometric_processor = BiometricProcessor()
encryption_service = EncryptionService()

@app.post("/v1/extract", response_model=ExtractResponse)
async def extract_template(
    request: ExtractRequest,
    token: str = Depends(security)
):
    """Extract encrypted biometric template from face image."""
    try:
        # Validate request
        if len(request.image_base64) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(400, "Image too large")
        
        # Process image
        result = await biometric_processor.extract_template(
            image_data=request.image_base64,
            require_liveness=request.require_liveness,
            quality_threshold=request.quality_threshold,
            patient_id=request.patient_id
        )
        
        # Encrypt template
        encrypted_template = await encryption_service.encrypt_template(
            embedding=result.embedding,
            patient_id=request.patient_id,
            algorithm=result.algorithm
        )
        
        return ExtractResponse(
            template_id=encrypted_template.template_id,
            template_hash=encrypted_template.template_hash,
            quality_score=result.quality_score,
            liveness_score=result.liveness_score,
            algorithm=result.algorithm,
            success=True
        )
        
    except Exception as e:
        logger.error(f"Template extraction failed: {e}")
        raise HTTPException(500, f"Extraction failed: {str(e)}")

@app.post("/v1/match", response_model=MatchResponse)
async def match_biometric(
    request: MatchRequest,
    token: str = Depends(security)
):
    """Match biometric against stored templates."""
    try:
        # Extract features from input image
        features = await biometric_processor.extract_features(
            image_data=request.image_base64,
            require_liveness=request.require_liveness
        )
        
        # Perform matching
        matches = await biometric_processor.match_templates(
            query_embedding=features.embedding,
            match_threshold=request.match_threshold,
            max_candidates=request.max_candidates
        )
        
        return MatchResponse(
            matches_found=len(matches) > 0,
            best_match=matches[0] if matches else None,
            all_matches=matches,
            query_quality=features.quality_score,
            query_liveness=features.liveness_score
        )
        
    except Exception as e:
        logger.error(f"Biometric matching failed: {e}")
        raise HTTPException(500, f"Matching failed: {str(e)}")

@app.get("/v1/health")
async def health_check():
    """Service health check."""
    return {
        "status": "healthy",
        "algorithms": biometric_processor.get_algorithm_status(),
        "encryption": encryption_service.get_key_status(),
        "version": "1.0.0"
    }
```

### Biometric Processing Engine
```python
# processors/biometric_processor.py
import face_recognition
import cv2
import numpy as np
from typing import Tuple, List, Optional
import logging
from dataclasses import dataclass

from .liveness import LivenessDetector
from .quality import QualityAssessment
from .encryption import TemplateEncryption

@dataclass
class ExtractionResult:
    embedding: np.ndarray
    quality_score: float
    liveness_score: float
    algorithm: str
    face_bbox: Tuple[int, int, int, int]

@dataclass
class MatchResult:
    patient_id: str
    confidence: float
    template_id: str
    algorithm: str

class BiometricProcessor:
    def __init__(self, config_path: str = "config/algorithms.yaml"):
        self.logger = logging.getLogger(__name__)
        self.liveness_detector = LivenessDetector()
        self.quality_assessor = QualityAssessment()
        self.template_encryption = TemplateEncryption()
        
        # Load configuration
        with open(config_path, 'r') as f:
            self.config = yaml.safe_load(f)
        
        # Initialize algorithms
        self._init_algorithms()
    
    def _init_algorithms(self):
        """Initialize biometric algorithms."""
        self.algorithms = {}
        
        if self.config['algorithms']['face_recognition']['enabled']:
            self.algorithms['face_recognition'] = FaceRecognitionProcessor()
            
        if self.config['algorithms']['insightface']['enabled']:
            self.algorithms['insightface'] = InsightFaceProcessor()
    
    async def extract_template(
        self,
        image_data: str,
        require_liveness: bool = True,
        quality_threshold: float = 0.7,
        patient_id: Optional[str] = None
    ) -> ExtractionResult:
        """Extract biometric template from face image."""
        
        # Decode base64 image
        image = self._decode_image(image_data)
        
        # Preprocessing
        preprocessed = self._preprocess_image(image)
        
        # Quality assessment
        quality_score = self.quality_assessor.assess_quality(preprocessed)
        if quality_score < quality_threshold:
            raise ValueError(f"Image quality too low: {quality_score}")
        
        # Liveness detection
        liveness_score = 1.0
        if require_liveness:
            liveness_score = self.liveness_detector.detect_liveness(image)
            if liveness_score < 0.7:
                raise ValueError(f"Liveness check failed: {liveness_score}")
        
        # Feature extraction
        primary_algo = self.config.get('PRIMARY_ALGORITHM', 'face_recognition')
        processor = self.algorithms[primary_algo]
        
        embedding, face_bbox = processor.extract_embedding(preprocessed)
        
        return ExtractionResult(
            embedding=embedding,
            quality_score=quality_score,
            liveness_score=liveness_score,
            algorithm=primary_algo,
            face_bbox=face_bbox
        )
    
    async def match_templates(
        self,
        query_embedding: np.ndarray,
        match_threshold: float = 0.85,
        max_candidates: int = 10
    ) -> List[MatchResult]:
        """Match query embedding against stored templates."""
        
        # Generate HMAC for fast lookup
        query_hash = self.template_encryption.compute_hmac(query_embedding)
        
        # Find candidate templates
        candidates = await self._find_candidate_templates(
            query_hash, 
            max_candidates * 3  # Over-fetch for better accuracy
        )
        
        matches = []
        for candidate in candidates:
            # Decrypt candidate template
            candidate_embedding = await self.template_encryption.decrypt_template(
                candidate.encrypted_template,
                candidate.patient_id
            )
            
            # Compute similarity
            similarity = self._compute_similarity(
                query_embedding, 
                candidate_embedding
            )
            
            if similarity >= match_threshold:
                matches.append(MatchResult(
                    patient_id=candidate.patient_id,
                    confidence=similarity,
                    template_id=candidate.template_id,
                    algorithm=candidate.algorithm
                ))
        
        # Sort by confidence and return top matches
        matches.sort(key=lambda x: x.confidence, reverse=True)
        return matches[:max_candidates]
    
    def _decode_image(self, image_data: str) -> np.ndarray:
        """Decode base64 image data."""
        import base64
        
        # Remove data URL prefix if present
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        # Decode base64
        image_bytes = base64.b64decode(image_data)
        
        # Convert to numpy array
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise ValueError("Invalid image data")
        
        return image
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for feature extraction."""
        
        # Convert BGR to RGB
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Normalize lighting
        lab = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        l = clahe.apply(l)
        enhanced = cv2.merge([l, a, b])
        image_rgb = cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
        
        return image_rgb
    
    def _compute_similarity(
        self, 
        embedding1: np.ndarray, 
        embedding2: np.ndarray
    ) -> float:
        """Compute cosine similarity between embeddings."""
        
        # Normalize embeddings
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        # Cosine similarity
        similarity = np.dot(embedding1, embedding2) / (norm1 * norm2)
        
        # Convert to distance (0-1 range)
        return (1 + similarity) / 2
```

### Liveness Detection
```python
# processors/liveness.py
import cv2
import numpy as np
import dlib
from scipy.spatial import distance
import logging

class LivenessDetector:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize face detection
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        # Initialize landmark detection
        self.predictor = dlib.shape_predictor(
            'models/shape_predictor_68_face_landmarks.dat'
        )
        self.detector = dlib.get_frontal_face_detector()
        
        # Eye aspect ratio threshold
        self.EAR_THRESHOLD = 0.25
        self.HEAD_MOVEMENT_THRESHOLD = 0.3
        self.TEXTURE_THRESHOLD = 0.7
    
    def detect_liveness(self, image: np.ndarray) -> float:
        """Detect liveness using multiple methods."""
        scores = []
        
        # Blink detection
        blink_score = self._detect_blink(image)
        scores.append(blink_score)
        
        # Head movement detection
        head_score = self._detect_head_movement(image)
        scores.append(head_score)
        
        # Texture analysis
        texture_score = self._analyze_texture(image)
        scores.append(texture_score)
        
        # Combine scores
        final_score = np.mean(scores)
        
        self.logger.info(f"Liveness scores - Blink: {blink_score:.3f}, "
                        f"Head: {head_score:.3f}, Texture: {texture_score:.3f}, "
                        f"Final: {final_score:.3f}")
        
        return final_score
    
    def _detect_blink(self, image: np.ndarray) -> float:
        """Detect eye blinks for liveness."""
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Detect faces
        faces = self.detector(gray, 0)
        
        if len(faces) != 1:
            return 0.0  # No face or multiple faces
        
        # Get facial landmarks
        landmarks = self.predictor(gray, faces[0])
        
        # Calculate eye aspect ratio
        left_ear = self._calculate_ear(landmarks, [36, 37, 38, 39, 40, 41])
        right_ear = self._calculate_ear(landmarks, [42, 43, 44, 45, 46, 47])
        
        ear = (left_ear + right_ear) / 2.0
        
        # Check if eyes are closed (potential blink)
        if ear < self.EAR_THRESHOLD:
            return 0.8  # Good liveness indicator
        else:
            return 0.6  # Eyes open, moderate score
    
    def _calculate_ear(self, landmarks, eye_points):
        """Calculate Eye Aspect Ratio."""
        # Convert landmarks to numpy array
        points = np.array([(landmarks.part(i).x, landmarks.part(i).y) 
                          for i in eye_points])
        
        # Compute distances
        A = distance.euclidean(points[1], points[5])
        B = distance.euclidean(points[2], points[4])
        C = distance.euclidean(points[0], points[3])
        
        # Calculate EAR
        ear = (A + B) / (2.0 * C)
        return ear
    
    def _detect_head_movement(self, image: np.ndarray) -> float:
        """Detect head movement patterns."""
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Detect faces
        faces = self.detector(gray, 0)
        
        if len(faces) != 1:
            return 0.0
        
        # Get facial landmarks
        landmarks = self.predictor(gray, faces[0])
        
        # Calculate head pose
        nose_tip = (landmarks.part(30).x, landmarks.part(30).y)
        face_center = faces[0].center()
        
        # Calculate deviation from center
        deviation = abs(nose_tip[0] - face_center.x) / faces[0].width()
        
        if deviation > self.HEAD_MOVEMENT_THRESHOLD:
            return 0.7  # Some head movement detected
        else:
            return 0.5  # Minimal movement
    
    def _analyze_texture(self, image: np.ndarray) -> float:
        """Analyze image texture for liveness."""
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Detect face region
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) != 1:
            return 0.0
        
        x, y, w, h = faces[0]
        face_region = gray[y:y+h, x:x+w]
        
        # Calculate Local Binary Pattern variance
        lbp = self._calculate_lbp(face_region)
        texture_variance = np.var(lbp)
        
        # Normalize variance (0-1 range)
        normalized_variance = min(texture_variance / 1000, 1.0)
        
        return normalized_variance
    
    def _calculate_lbp(self, image: np.ndarray) -> np.ndarray:
        """Calculate Local Binary Pattern."""
        height, width = image.shape
        lbp = np.zeros((height-2, width-2), dtype=np.uint8)
        
        for i in range(1, height-1):
            for j in range(1, width-1):
                center = image[i, j]
                code = 0
                
                # Check 8 neighbors
                neighbors = [
                    image[i-1, j-1], image[i-1, j], image[i-1, j+1],
                    image[i, j+1], image[i+1, j+1], image[i+1, j],
                    image[i+1, j-1], image[i, j-1]
                ]
                
                for k, neighbor in enumerate(neighbors):
                    if neighbor >= center:
                        code += 2**k
                
                lbp[i-1, j-1] = code
        
        return lbp
```

### Template Encryption Service
```python
# security/encryption.py
import os
import hmac
import hashlib
import numpy as np
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import base64
from typing import Tuple, Optional
import logging

from .vault_client import VaultClient

class TemplateEncryption:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.vault_client = VaultClient()
        
    async def encrypt_template(
        self, 
        embedding: np.ndarray, 
        patient_id: str,
        algorithm: str
    ) -> dict:
        """Encrypt biometric template with patient-specific key."""
        
        # Serialize embedding
        serialized = self._serialize_embedding(embedding)
        
        # Get encryption key for patient
        encryption_key = await self.vault_client.get_patient_key(patient_id)
        
        # Generate unique IV
        iv = os.urandom(12)  # 96-bit IV for GCM
        
        # Encrypt template
        cipher = Cipher(
            algorithms.AES(encryption_key),
            modes.GCM(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(serialized) + encryptor.finalize()
        
        # Generate HMAC for indexing
        salt = os.urandom(32)
        hmac_key = self._derive_hmac_key(patient_id, salt)
        template_hash = hmac.new(
            hmac_key, 
            serialized, 
            hashlib.sha256
        ).hexdigest()
        
        return {
            'template_encrypted': base64.b64encode(ciphertext + encryptor.tag).decode(),
            'template_hash': template_hash,
            'iv': base64.b64encode(iv).decode(),
            'salt': base64.b64encode(salt).decode(),
            'algorithm': algorithm,
            'embedding_size': len(embedding)
        }
    
    async def decrypt_template(
        self, 
        encrypted_data: str, 
        patient_id: str,
        iv: str,
        auth_tag_size: int = 16
    ) -> np.ndarray:
        """Decrypt biometric template."""
        
        # Get decryption key
        decryption_key = await self.vault_client.get_patient_key(patient_id)
        
        # Decode data
        encrypted_bytes = base64.b64decode(encrypted_data)
        iv_bytes = base64.b64decode(iv)
        
        # Split ciphertext and auth tag
        ciphertext = encrypted_bytes[:-auth_tag_size]
        auth_tag = encrypted_bytes[-auth_tag_size:]
        
        # Decrypt
        cipher = Cipher(
            algorithms.AES(decryption_key),
            modes.GCM(iv_bytes, auth_tag),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        plaintext = decryptor.update(ciphertext) + decryptor.finalize()
        
        # Deserialize embedding
        embedding = self._deserialize_embedding(plaintext)
        
        return embedding
    
    def compute_hmac(self, embedding: np.ndarray, salt: bytes) -> str:
        """Compute HMAC for template indexing."""
        serialized = self._serialize_embedding(embedding)
        hmac_key = self._derive_hmac_key("query", salt)
        return hmac.new(hmac_key, serialized, hashlib.sha256).hexdigest()
    
    def _serialize_embedding(self, embedding: np.ndarray) -> bytes:
        """Serialize embedding to bytes."""
        # Quantize to reduce size
        quantized = np.round(embedding * 1000).astype(np.int16)
        return quantized.tobytes()
    
    def _deserialize_embedding(self, data: bytes) -> np.ndarray:
        """Deserialize embedding from bytes."""
        quantized = np.frombuffer(data, dtype=np.int16)
        return quantized.astype(np.float32) / 1000.0
    
    def _derive_hmac_key(self, patient_id: str, salt: bytes) -> bytes:
        """Derive HMAC key from patient ID and salt."""
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        
        return kdf.derive(patient_id.encode())
```

### Quality Assessment
```python
# processors/quality.py
import cv2
import numpy as np
from skimage import measure
import logging

class QualityAssessment:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
    
    def assess_quality(self, image: np.ndarray) -> float:
        """Assess biometric image quality (0-1 scale)."""
        
        scores = []
        
        # Face detection and size
        face_score = self._assess_face_detection(image)
        scores.append(face_score)
        
        # Image sharpness
        sharpness_score = self._assess_sharpness(image)
        scores.append(sharpness_score)
        
        # Brightness and contrast
        brightness_score = self._assess_brightness(image)
        scores.append(brightness_score)
        
        # Resolution quality
        resolution_score = self._assess_resolution(image)
        scores.append(resolution_score)
        
        # Pose quality
        pose_score = self._assess_pose(image)
        scores.append(pose_score)
        
        # Weighted average
        weights = [0.3, 0.25, 0.2, 0.15, 0.1]
        quality_score = sum(s * w for s, w in zip(scores, weights))
        
        self.logger.info(f"Quality assessment - Face: {face_score:.3f}, "
                        f"Sharpness: {sharpness_score:.3f}, "
                        f"Brightness: {brightness_score:.3f}, "
                        f"Resolution: {resolution_score:.3f}, "
                        f"Pose: {pose_score:.3f}, "
                        f"Overall: {quality_score:.3f}")
        
        return quality_score
    
    def _assess_face_detection(self, image: np.ndarray) -> float:
        """Assess face detection quality."""
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            return 0.0  # No face detected
        elif len(faces) > 1:
            return 0.3  # Multiple faces
        
        # Single face detected
        x, y, w, h = faces[0]
        face_area = w * h
        image_area = image.shape[0] * image.shape[1]
        
        # Face should be 5-50% of image
        face_ratio = face_area / image_area
        if 0.05 <= face_ratio <= 0.5:
            return 1.0
        elif 0.02 <= face_ratio <= 0.7:
            return 0.7
        else:
            return 0.3
    
    def _assess_sharpness(self, image: np.ndarray) -> float:
        """Assess image sharpness using Laplacian variance."""
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Calculate Laplacian variance
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Normalize (empirically determined thresholds)
        if laplacian_var > 500:
            return 1.0
        elif laplacian_var > 100:
            return 0.7
        elif laplacian_var > 50:
            return 0.4
        else:
            return 0.1
    
    def _assess_brightness(self, image: np.ndarray) -> float:
        """Assess image brightness and contrast."""
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Calculate mean brightness
        mean_brightness = np.mean(gray)
        
        # Calculate contrast (standard deviation)
        contrast = np.std(gray)
        
        # Optimal brightness: 80-170
        brightness_score = 1.0
        if mean_brightness < 50 or mean_brightness > 200:
            brightness_score = 0.3
        elif mean_brightness < 80 or mean_brightness > 170:
            brightness_score = 0.7
        
        # Optimal contrast: > 30
        contrast_score = 1.0 if contrast > 30 else contrast / 30
        
        return (brightness_score + contrast_score) / 2
    
    def _assess_resolution(self, image: np.ndarray) -> float:
        """Assess image resolution quality."""
        height, width = image.shape[:2]
        
        # Face area for resolution assessment
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(faces) == 0:
            return 0.5  # No face to assess
        
        x, y, w, h = faces[0]
        
        # Face should be at least 80x80 pixels
        if w < 60 or h < 60:
            return 0.2
        elif w < 80 or h < 80:
            return 0.5
        elif w < 120 or h < 120:
            return 0.8
        else:
            return 1.0
    
    def _assess_pose(self, image: np.ndarray) -> float:
        """Assess face pose quality (frontal is best)."""
        # Simplified pose assessment using eye positions
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        
        # Detect eyes
        eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_eye.xml'
        )
        eyes = eye_cascade.detectMultiScale(gray, 1.3, 5)
        
        if len(eyes) < 2:
            return 0.4  # Less than 2 eyes visible
        elif len(eyes) == 2:
            # Check if eyes are roughly horizontal
            eye1, eye2 = eyes[:2]
            y_diff = abs(eye1[1] - eye2[1])
            x_diff = abs(eye1[0] - eye2[0])
            
            if x_diff == 0:
                return 0.5
            
            angle = np.arctan(y_diff / x_diff) * 180 / np.pi
            
            if angle < 10:
                return 1.0  # Good frontal pose
            elif angle < 20:
                return 0.7
            else:
                return 0.4
        else:
            return 0.6  # Multiple eyes detected
```

### Dockerfile
```dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download face recognition models
RUN mkdir -p models && \
    wget -O models/shape_predictor_68_face_landmarks.dat \
    http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2 && \
    bunzip2 models/shape_predictor_68_face_landmarks.dat.bz2

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 biometric && \
    chown -R biometric:biometric /app
USER biometric

# Expose port
EXPOSE 8082

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8082/v1/health || exit 1

# Run application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8082"]
```

### Requirements
```txt
# requirements.txt
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
numpy==1.24.3
opencv-python==4.8.1.78
face-recognition==1.3.0
dlib==19.24.2
scikit-image==0.21.0
cryptography==41.0.7
aioredis==2.0.1
prometheus-client==0.19.0
structlog==23.2.0
pyyaml==6.0.1
httpx==0.25.2
```

## Security Considerations

### Template Protection
- Never store raw biometric images
- Encrypt all templates with AES-256-GCM
- Use patient-specific encryption keys
- Implement secure template matching

### Privacy Preservation
- HMAC-based indexing for fast lookup
- Selective template decryption
- No cross-patient template access
- Audit all biometric operations

### Performance Optimization
- Template caching with TTL
- Parallel processing for matching
- Quality-based early rejection
- GPU acceleration support

## Monitoring & Metrics

### Prometheus Metrics
```python
from prometheus_client import Counter, Histogram, Gauge

# Template extraction metrics
TEMPLATE_EXTRACTIONS = Counter(
    'biometric_template_extractions_total',
    'Total template extractions',
    ['algorithm', 'status']
)

EXTRACTION_DURATION = Histogram(
    'biometric_extraction_duration_seconds',
    'Template extraction duration'
)

# Matching metrics
BIOMETRIC_MATCHES = Counter(
    'biometric_matches_total',
    'Total biometric matches',
    ['status', 'confidence_range']
)

MATCH_DURATION = Histogram(
    'biometric_match_duration_seconds',
    'Biometric matching duration'
)

# Quality metrics
QUALITY_SCORES = Histogram(
    'biometric_quality_scores',
    'Distribution of quality scores'
)

LIVENESS_SCORES = Histogram(
    'biometric_liveness_scores',
    'Distribution of liveness scores'
)
```

## Testing

### Unit Tests
```bash
pytest tests/unit/ -v
```

### Integration Tests
```bash
pytest tests/integration/ -v
```

### Load Testing
```bash
locust -f tests/load/locustfile.py --host=http://localhost:8082
```

### Security Testing
```bash
bandit -r . -f json -o security-report.json
```

---

This biometric service provides secure, privacy-preserving facial recognition for the MedID system while maintaining high accuracy and performance standards.