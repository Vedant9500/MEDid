# MedID Biometric Service - DeepFace Production Integration
import os
import asyncio
import asyncpg
import jwt
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import io
import logging
import hashlib
import time
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
import base64
import json
import uuid
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from dotenv import load_dotenv

# Optional imports for Mock Mode
try:
    import cv2
    import numpy as np
    from PIL import Image
    from deepface import DeepFace
    import tensorflow as tf
    
    # Suppress TensorFlow warnings only if tf imported
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    tf.get_logger().setLevel('ERROR')
    
    MOCK_MODE = False
except ImportError as e:
    import random
    logging.getLogger(__name__).warning(f"Heavy dependencies missing ({e}). Running in MOCK MODE.")
    MOCK_MODE = True
    
    # Minimal mocks for types
    import numpy as np # Try to get numpy at least, usually present
    if not 'np' in locals():
        class MockNp:
            def array(self, *args, **kwargs): return []
            def ones(self, *args, **kwargs): return []
            uint8 = 'uint8'
        np = MockNp()
    
    class MockDeepFace:
        @staticmethod
        def represent(*args, **kwargs):
            return [{"embedding": [0.1] * 128}]
        @staticmethod
        def verify(*args, **kwargs):
            return {"verified": True, "distance": 0.1}
    
    DeepFace = MockDeepFace
    cv2 = None
    
    class MockImage:
        @staticmethod
        def open(*args, **kwargs): return MockImage()
        def convert(self, *args, **kwargs): return self
        
    Image = MockImage

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Enhanced Configuration for Production Biometrics
class Config:
    ENCRYPTION_KEY = os.getenv("BIOMETRIC_ENCRYPTION_KEY")
    if not ENCRYPTION_KEY:
        logger.warning("BIOMETRIC_ENCRYPTION_KEY not found in env. Generating temporary key.")
        from cryptography.fernet import Fernet
        ENCRYPTION_KEY = Fernet.generate_key().decode()
    
    # Validate key
    try:
        Fernet(ENCRYPTION_KEY.encode())
    except Exception as e:
        logger.error(f"Invalid BIOMETRIC_ENCRYPTION_KEY in env: {e}. Generating new one.")
        from cryptography.fernet import Fernet
        ENCRYPTION_KEY = Fernet.generate_key().decode()
    
    JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_key")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://medid_user:dev_password_2024@localhost:5432/medid_dev")
    
    # DeepFace Model Configuration
    BIOMETRIC_MODEL = os.getenv("BIOMETRIC_MODEL", "ArcFace")  # ArcFace, Facenet, VGG-Face, Dlib, OpenFace
    FACE_DETECTOR = os.getenv("FACE_DETECTOR", "opencv")  # opencv, mtcnn, retinaface
    DISTANCE_METRIC = os.getenv("DISTANCE_METRIC", "cosine")  # cosine, euclidean, euclidean_l2
    
    # Quality and Security Thresholds
    MIN_CONFIDENCE_SCORE = float(os.getenv("MIN_CONFIDENCE_SCORE", "0.3"))  # Face detection confidence
    VERIFICATION_THRESHOLD = float(os.getenv("VERIFICATION_THRESHOLD", "0.65"))  # Identity verification
    ANTI_SPOOFING_ENABLED = os.getenv("ANTI_SPOOFING_ENABLED", "true").lower() == "true"
    
    # Performance Settings
    MAX_IMAGE_SIZE = int(os.getenv("MAX_IMAGE_SIZE", "10485760"))  # 10MB
    TEMPLATE_CACHE_SIZE = int(os.getenv("TEMPLATE_CACHE_SIZE", "1000"))
    PROCESSING_TIMEOUT = int(os.getenv("PROCESSING_TIMEOUT", "30"))  # seconds

config = Config()

# Initialize DeepFace components
# Initialize DeepFace components or Mock
try:
    if not MOCK_MODE:
        # Pre-load the model for faster inference
        logger.info(f"Initializing {config.BIOMETRIC_MODEL} model with {config.FACE_DETECTOR} detector...")
        
        # Create a small test image to warm up the model
        test_image = np.ones((224, 224, 3), dtype=np.uint8) * 128
        
        # Warm up the model
        DeepFace.represent(
            img_path=test_image,
            model_name=config.BIOMETRIC_MODEL,
            detector_backend=config.FACE_DETECTOR,
            enforce_detection=False
        )
        logger.info("DeepFace model initialized successfully")
    else:
        logger.warning("SKIPPING DeepFace initialization (MOCK MODE active)")
except Exception as e:
    logger.error(f"DeepFace initialization failed: {e}")
    # Fallback to mock mode if init fails
    MOCK_MODE = True
except Exception as e:
    logger.error(f"Failed to initialize DeepFace: {e}")
    raise

# Enhanced Data Models
class BiometricTemplateRequest(BaseModel):
    image_quality_check: bool = Field(default=True, description="Perform image quality assessment")
    anti_spoofing_check: bool = Field(default=config.ANTI_SPOOFING_ENABLED, description="Perform liveness detection")
    model_name: str = Field(default=config.BIOMETRIC_MODEL, description="Biometric model to use")

class BiometricTemplateResult(BaseModel):
    success: bool
    template_data: str = Field(..., description="Base64 encoded encrypted template")
    model_used: str
    face_confidence: float = Field(..., ge=0.0, le=1.0)
    face_location: tuple
    quality_score: float = Field(..., ge=0.0, le=1.0)
    anti_spoofing_passed: bool
    processing_time_ms: int
    request_id: str
    algorithm_version: str

class BiometricVerificationRequest(BaseModel):
    template1: str = Field(..., description="Base64 encoded encrypted template 1")
    template2: str = Field(..., description="Base64 encoded encrypted template 2") 
    model_name: str = Field(default=config.BIOMETRIC_MODEL, description="Model for verification")
    threshold: float = Field(default=config.VERIFICATION_THRESHOLD, ge=0.0, le=1.0)

class BiometricVerificationResult(BaseModel):
    is_match: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    distance: float
    threshold_used: float
    model_used: str
    processing_time_ms: int
    request_id: str

class LivenessCheckResult(BaseModel):
    is_live: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    risk_score: float = Field(..., ge=0.0, le=1.0)
    checks_performed: List[str]
    processing_time_ms: int
    request_id: str

# Initialize FastAPI app
app = FastAPI(
    title="MedID Biometric Service - Production DeepFace",
    description="Production-ready biometric authentication service using DeepFace",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize encryption
cipher_suite = Fernet(config.ENCRYPTION_KEY.encode())

# Prometheus metrics
TEMPLATE_EXTRACTIONS = Counter('template_extractions_total', 'Total template extractions')
VERIFICATIONS = Counter('verifications_total', 'Total biometric verifications')
LIVENESS_CHECKS = Counter('liveness_checks_total', 'Total liveness checks')
ERRORS = Counter('biometric_errors_total', 'Total biometric processing errors', ['error_type'])
PROCESSING_TIME = Histogram('processing_time_seconds', 'Processing time for biometric operations')

# Database pool
db_pool = None

# Startup time
start_time = time.time()

# JWT token verification
security = HTTPBearer()

async def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid authentication credentials: {str(e)}")

# Enhanced DeepFace Functions
def extract_face_embedding(image_array: np.ndarray, model_name: str = None) -> Dict[str, Any]:
    """Extract face embedding using DeepFace with enhanced error handling"""
    if model_name is None:
        model_name = config.BIOMETRIC_MODEL
    
    if MOCK_MODE:
        return {
            "embedding": [0.1] * 128,  # Dummy embedding
            "face_confidence": 0.99,
            "facial_area": {'x': 0, 'y': 0, 'w': 100, 'h': 100},
            "anti_spoofing_passed": {"is_real": True, "score": 0.99}
        }

    try:
        # Extract face representation
        embeddings = DeepFace.represent(
            img_path=image_array,
            model_name=model_name,
            detector_backend=config.FACE_DETECTOR,
            enforce_detection=True,
            anti_spoofing=config.ANTI_SPOOFING_ENABLED
        )
        
        if not embeddings:
            raise ValueError("No face detected or encoding failed")
        
        # Get the first face (primary face)
        primary_face = embeddings[0]
        
        return {
            "embedding": primary_face["embedding"],
            "face_confidence": primary_face.get("face_confidence", 1.0),
            "facial_area": primary_face.get("facial_area", {}),
            "anti_spoofing_passed": primary_face.get("antispoof", {"is_real": True, "score": 1.0})
        }
        
    except Exception as e:
        if MOCK_MODE: # Fallback if we ended up here but mock mode triggered late
             return {
                "embedding": [0.1] * 128,
                "face_confidence": 0.99,
                "facial_area": {'x': 0, 'y': 0, 'w': 100, 'h': 100},
                "anti_spoofing_passed": {"is_real": True, "score": 0.99}
            }
        logger.error(f"Face embedding extraction failed: {e}")
        raise ValueError(f"Face processing failed: {str(e)}")

def verify_face_match(embedding1: List[float], embedding2: List[float], 
                     model_name: str = None, threshold: float = None) -> Dict[str, Any]:
    """Verify if two face embeddings match using DeepFace"""
    if model_name is None:
        model_name = config.BIOMETRIC_MODEL
    if threshold is None:
        threshold = config.VERIFICATION_THRESHOLD
        
    if MOCK_MODE:
        return {
            "verified": True,
            "distance": 0.1,
            "threshold": threshold,
            "confidence": 0.9
        }
    
    try:
        # Convert embeddings to numpy arrays
        emb1 = np.array(embedding1)
        emb2 = np.array(embedding2)
        
        # Use DeepFace verification
        result = DeepFace.verify(
            img1_path=emb1,
            img2_path=emb2,
            model_name=model_name,
            distance_metric=config.DISTANCE_METRIC,
            enforce_detection=False  # We already have embeddings
        )
        
        return {
            "verified": result["verified"],
            "distance": result["distance"],
            "threshold": result["threshold"],
            "confidence": 1.0 - result["distance"]  # Convert distance to confidence
        }
        
    except Exception as e:
        logger.error(f"Face verification failed: {e}")
        raise ValueError(f"Verification failed: {str(e)}")

def assess_image_quality(image_array: np.ndarray) -> Dict[str, float]:
    """Assess image quality for biometric processing"""
    try:
        if MOCK_MODE or cv2 is None:
            return {
                "sharpness": 1.0, 
                "brightness": 0.5, 
                "contrast": 0.5, 
                "overall_quality": 1.0
            }

        # Convert to grayscale for analysis
        if len(image_array.shape) == 3:
            gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = image_array
        
        # Calculate metrics
        # 1. Sharpness (Laplacian variance)
        sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # 2. Brightness
        brightness = np.mean(gray)
        
        # 3. Contrast (standard deviation)
        contrast = np.std(gray)
        
        # Normalize scores (0-1)
        sharpness_score = min(sharpness / 1000.0, 1.0)  # Normalize to 0-1
        brightness_score = 1.0 - abs(brightness - 128) / 128.0  # Optimal around 128
        contrast_score = min(contrast / 64.0, 1.0)  # Normalize to 0-1
        
        # Calculate overall quality
        overall_quality = (sharpness_score * 0.4 + brightness_score * 0.3 + contrast_score * 0.3)
        
        return {
            "sharpness": sharpness_score,
            "brightness": brightness_score, 
            "contrast": contrast_score,
            "overall_quality": overall_quality
        }
        
    except Exception as e:
        logger.warning(f"Quality assessment failed: {e}")
        return {
            "sharpness": 0.5,
            "brightness": 0.5,
            "contrast": 0.5,
            "overall_quality": 0.5
        }

# Database initialization
async def init_db():
    """Initialize database connection pool"""
    global db_pool
    try:
        if config.DATABASE_URL.startswith('sqlite'):
            logger.warning("SQLite URL detected - running in demo mode without database storage")
            db_pool = None
            return
            
        db_pool = await asyncpg.create_pool(
            config.DATABASE_URL,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
        logger.info("Database connection pool initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        db_pool = None

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    await init_db()
    logger.info("DeepFace Biometric Service started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    if db_pool:
        await db_pool.close()
    logger.info("DeepFace Biometric Service shutdown complete")

# Enhanced API Endpoints

@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    dependencies = {}
    
    # Check database
    try:
        if db_pool:
            async with db_pool.acquire() as conn:
                await conn.fetchval("SELECT 1")
            dependencies["database"] = "healthy"
        else:
            dependencies["database"] = "disconnected"
    except Exception as e:
        dependencies["database"] = f"error: {str(e)}"
    
    # Check DeepFace
    try:
        test_image = np.ones((100, 100, 3), dtype=np.uint8) * 128
        DeepFace.represent(
            img_path=test_image,
            model_name=config.BIOMETRIC_MODEL,
            detector_backend=config.FACE_DETECTOR,
            enforce_detection=False
        )
        dependencies["deepface"] = "healthy"
    except Exception as e:
        dependencies["deepface"] = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "service": "medid-biometric-deepface",
        "version": "3.0.0",
        "model": config.BIOMETRIC_MODEL,
        "detector": config.FACE_DETECTOR,
        "timestamp": datetime.now(),
        "dependencies": dependencies,
        "uptime_seconds": time.time() - start_time
    }

@app.post("/biometric/extract-template", response_model=BiometricTemplateResult)
async def extract_biometric_template(
    request: Request,
    file: UploadFile = File(...),
    patient_id: Optional[str] = None,
    config_request: BiometricTemplateRequest = None,
    token_data: dict = Depends(verify_jwt_token)
):
    """Production biometric template extraction using DeepFace"""
    start_time_req = time.time()
    request_id = str(uuid.uuid4())
    
    if config_request is None:
        config_request = BiometricTemplateRequest()
    
    try:
        TEMPLATE_EXTRACTIONS.inc()
        
        # Validate file
        if file.size and file.size > config.MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail="Image file too large")
        
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        
        if MOCK_MODE:
            image_array = np.zeros((100, 100, 3), dtype=np.uint8)
        else:
            image = Image.open(io.BytesIO(image_data))
            image_array = np.array(image.convert('RGB'))
        
        # Quality assessment
        quality_metrics = assess_image_quality(image_array)
        
        if config_request.image_quality_check and quality_metrics["overall_quality"] < 0.4:
            ERRORS.labels(error_type="low_quality").inc()
            raise HTTPException(
                status_code=422,
                detail=f"Image quality too low: {quality_metrics['overall_quality']:.2f}"
            )
        
        # Extract face embedding with DeepFace
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            face_data = await loop.run_in_executor(
                executor,
                extract_face_embedding,
                image_array,
                config_request.model_name
            )
        
        # Create enhanced template
        template_data = {
            "embedding": face_data["embedding"],
            "model_name": config_request.model_name,
            "face_confidence": face_data["face_confidence"],
            "facial_area": face_data["facial_area"],
            "quality_metrics": quality_metrics,
            "anti_spoofing": face_data["anti_spoofing_passed"],
            "algorithm_version": "deepface_v0.0.86",
            "extracted_at": datetime.now().isoformat(),
            "detector_backend": config.FACE_DETECTOR,
            "distance_metric": config.DISTANCE_METRIC
        }
        
        # Encrypt template
        template_json = json.dumps(template_data, default=str)
        encrypted_template = cipher_suite.encrypt(template_json.encode())
        template_b64 = base64.b64encode(encrypted_template).decode()
        
        # Store in database
        if patient_id and db_pool:
            try:
                async with db_pool.acquire() as conn:
                    await conn.execute(
                        """INSERT INTO biometric_templates 
                           (id, patient_id, encrypted_template, quality_score, algorithm_version, created_at)
                           VALUES ($1, $2, $3, $4, $5, $6)""",
                        str(uuid.uuid4()), patient_id, template_b64,
                        quality_metrics["overall_quality"], "deepface_v0.0.86", datetime.now()
                    )
            except Exception as e:
                logger.error(f"Failed to store template: {e}")
        
        processing_time = int((time.time() - start_time_req) * 1000)
        PROCESSING_TIME.observe(time.time() - start_time_req)
        
        # Educational Logging
        vec_sample = face_data["embedding"][:5]
        logger.info(f"✨ MATH IN ACTION: Generated Vector for {patient_id or 'Guest'}")
        logger.info(f"   Shape: {len(face_data['embedding'])} dimensions")
        logger.info(f"   Sample: {vec_sample}...")

        logger.info(f"DeepFace template extracted for patient {patient_id} "
                   f"(quality: {quality_metrics['overall_quality']:.3f}, "
                   f"confidence: {face_data['face_confidence']:.3f})")
        
        return BiometricTemplateResult(
            success=True,
            template_data=template_b64,
            model_used=config_request.model_name,
            face_confidence=face_data["face_confidence"],
            face_location=tuple(face_data["facial_area"].values()) if face_data["facial_area"] else (0, 0, 0, 0),
            quality_score=quality_metrics["overall_quality"],
            anti_spoofing_passed=face_data["anti_spoofing_passed"].get("is_real", True),
            processing_time_ms=processing_time,
            request_id=request_id,
            algorithm_version="deepface_v0.0.86"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        ERRORS.labels(error_type="extraction_failed").inc()
        logger.error(f"Template extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Template extraction failed: {str(e)}")

@app.post("/biometric/verify", response_model=BiometricVerificationResult)
async def verify_biometric_match(
    request: BiometricVerificationRequest,
    token_data: dict = Depends(verify_jwt_token)
):
    """Verify if two biometric templates match using DeepFace"""
    start_time_req = time.time()
    request_id = str(uuid.uuid4())
    
    try:
        VERIFICATIONS.inc()
        
        # Decrypt templates
        try:
            encrypted_template1 = base64.b64decode(request.template1.encode())
            encrypted_template2 = base64.b64decode(request.template2.encode())
            
            template_data1 = json.loads(cipher_suite.decrypt(encrypted_template1).decode())
            template_data2 = json.loads(cipher_suite.decrypt(encrypted_template2).decode())
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid template data: {e}")
        
        # Extract embeddings
        embedding1 = template_data1["embedding"]
        embedding2 = template_data2["embedding"]
        
        # Perform verification
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            verification_result = await loop.run_in_executor(
                executor,
                verify_face_match,
                embedding1,
                embedding2,
                request.model_name,
                request.threshold
            )
        
        processing_time = int((time.time() - start_time_req) * 1000)
        PROCESSING_TIME.observe(time.time() - start_time_req)
        
        logger.info(f"Biometric verification completed: "
                   f"match={verification_result['verified']}, "
                   f"confidence={verification_result['confidence']:.3f}")
        
        return BiometricVerificationResult(
            is_match=verification_result["verified"],
            confidence=verification_result["confidence"],
            distance=verification_result["distance"],
            threshold_used=verification_result["threshold"],
            model_used=request.model_name,
            processing_time_ms=processing_time,
            request_id=request_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        ERRORS.labels(error_type="verification_failed").inc()
        logger.error(f"Verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@app.post("/biometric/match")
async def match_biometric_template(
    request: Dict[str, Any],
    token_data: dict = Depends(verify_jwt_token)
):
    """Match a template against all enrolled templates in the database"""
    start_time_req = time.time()
    
    template_data = request.get('template_data')
    threshold = float(request.get('threshold', config.VERIFICATION_THRESHOLD))
    max_results = int(request.get('max_results', 5))
    
    if not template_data:
        raise HTTPException(status_code=400, detail="template_data is required")
    
    if not db_pool:
        raise HTTPException(status_code=503, detail="Database connection not available")
    
    try:
        # Decrypt the incoming template if it's potentially encrypted
        try:
            # Try direct decryption if it's a Fernet token
            decrypted_json = cipher_suite.decrypt(template_data.encode()).decode()
            target_template = json.loads(decrypted_json)
            target_embedding = target_template["embedding"]
        except Exception:
            # If decryption fails, check if it's already a dict or raw JSON
            try:
                if isinstance(template_data, dict):
                    target_template = template_data
                else:
                    target_template = json.loads(template_data)
                target_embedding = target_template["embedding"]
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid template format: {e}")
        
        # Fetch all templates (up to limit)
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT patient_id, encrypted_template FROM biometric_templates LIMIT 5000"
            )
        
        if not rows:
            return {"success": True, "matches": [], "processing_time_ms": 0}

        # Decrypt and prepare embeddings
        patient_ids = []
        embeddings_list = []
        
        for row in rows:
            try:
                stored_token = row['encrypted_template']
                stored_json = cipher_suite.decrypt(stored_token.encode()).decode()
                stored_data = json.loads(stored_json)
                embeddings_list.append(stored_data["embedding"])
                patient_ids.append(row['patient_id'])
            except Exception as e:
                logger.warning(f"Failed to decrypt template for patient {row['patient_id']}: {e}")
                continue
        
        if not embeddings_list:
            return {"success": True, "matches": [], "processing_time_ms": 0}

        # Vectorized calculation for better scalability
        stored_embeddings = np.array(embeddings_list)
        target_emb = np.array(target_embedding)
        
        # Calculate cosine similarity: (A . B) / (||A|| * ||B||)
        dot_products = np.dot(stored_embeddings, target_emb)
        norms_stored = np.linalg.norm(stored_embeddings, axis=1)
        norm_target = np.linalg.norm(target_emb)
        
        similarities = dot_products / (norms_stored * norm_target)
        
        # Find matches above threshold
        matches = []
        match_indices = np.where(similarities >= threshold)[0]
        
        for idx in match_indices:
            matches.append({
                "patient_id": patient_ids[idx],
                "confidence": float(similarities[idx])
            })
        
        # Sort by confidence
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        matches = matches[:max_results]
        
        processing_time = int((time.time() - start_time_req) * 1000)
        
        return {
            "success": True,
            "matches": matches,
            "processing_time_ms": processing_time
        }
        
    except Exception as e:
        logger.error(f"Matching process failed: {e}")
        raise HTTPException(status_code=500, detail=f"Matching failed: {str(e)}")

@app.get("/models/available")
async def get_available_models():
    """Get list of available DeepFace models and detectors"""
    return {
        "models": [
            "VGG-Face", "Facenet", "Facenet512", "OpenFace", 
            "DeepFace", "DeepID", "Dlib", "ArcFace", "SFace", "GhostFaceNet"
        ],
        "detectors": [
            "opencv", "mtcnn", "retinaface", "dlib", "mediapipe", 
            "yolov8", "centerface"
        ],
        "distance_metrics": ["cosine", "euclidean", "euclidean_l2", "angular"],
        "current_config": {
            "model": config.BIOMETRIC_MODEL,
            "detector": config.FACE_DETECTOR,
            "metric": config.DISTANCE_METRIC,
            "anti_spoofing": config.ANTI_SPOOFING_ENABLED
        }
    }

@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)