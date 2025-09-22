# MedID Biometric Service - Demo Version (SQLite Compatible)
import os
import json
import sqlite3
import base64
import time
import uuid
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
import face_recognition
import cv2
import numpy as np
from PIL import Image
import io
import logging
from cryptography.fernet import Fernet
import jwt
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration from environment variables
class Config:
    ENCRYPTION_KEY = os.getenv("BIOMETRIC_ENCRYPTION_KEY", "q-CC2LGLExVFuIZY6Rwwl2eVfSoj9bJQzoqwCH6V_Gw=")
    JWT_SECRET = os.getenv("JWT_SECRET", "ydK759WNPsI9xBKjeEKtqxlBVYy0Ggt2e2ru6dVoyM8")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    
    # Quality thresholds
    MIN_IMAGE_QUALITY = float(os.getenv("MIN_IMAGE_QUALITY", "0.5"))
    MIN_FACE_SIZE = int(os.getenv("MIN_FACE_SIZE", "100"))
    
    # Performance settings
    MAX_IMAGE_SIZE = int(os.getenv("MAX_IMAGE_SIZE", "10485760"))  # 10MB

config = Config()

# Initialize FastAPI app
app = FastAPI(
    title="MedID Biometric Service - Demo",
    description="Production-ready secure biometric processing service for emergency medical identification",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Initialize encryption
cipher_suite = Fernet(config.ENCRYPTION_KEY.encode() if isinstance(config.ENCRYPTION_KEY, str) else config.ENCRYPTION_KEY)

# Startup time for uptime calculation
start_time = time.time()

# SQLite Database setup
def init_sqlite_db():
    """Initialize SQLite database for demo"""
    conn = sqlite3.connect('medid_biometric.db')
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS biometric_templates (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            encrypted_template TEXT NOT NULL,
            quality_score REAL NOT NULL,
            algorithm_version TEXT DEFAULT 'face_recognition_v1.3.0',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS biometric_audit_log (
            id TEXT PRIMARY KEY,
            operation_type TEXT NOT NULL,
            operation_result TEXT NOT NULL,
            patient_id TEXT,
            confidence_score REAL,
            processing_time_ms INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_sqlite_db()

# Pydantic models
class BiometricTemplate(BaseModel):
    patient_id: str = Field(..., description="Unique patient identifier")
    template_data: str = Field(..., description="Base64 encoded encrypted biometric template")
    quality_score: float = Field(..., ge=0.0, le=1.0, description="Template quality score")
    algorithm_version: str = Field(default="face_recognition_v1.3.0")
    created_at: datetime = Field(default_factory=datetime.now)

class BiometricMatchRequest(BaseModel):
    template_data: str = Field(..., description="Base64 encoded encrypted template to match")
    threshold: float = Field(default=0.6, ge=0.0, le=1.0, description="Matching confidence threshold")
    max_results: int = Field(default=1, ge=1, le=10, description="Maximum number of results to return")

class BiometricMatchResult(BaseModel):
    patient_id: Optional[str]
    confidence: float = Field(..., ge=0.0, le=1.0)
    match_found: bool
    processing_time_ms: int
    algorithm_version: str = "face_recognition_v1.3.0"
    request_id: str

class LivenessCheckResult(BaseModel):
    is_live: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    checks_passed: List[str]
    checks_failed: List[str]
    processing_time_ms: int
    request_id: str

class HealthCheckResponse(BaseModel):
    status: str
    service: str = "biometric-service-demo"
    version: str = "2.0.0"
    timestamp: datetime
    dependencies: dict
    uptime_seconds: float

# Enhanced Authentication (Demo version - accepts any token)
async def verify_jwt_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify JWT token and return payload - Demo version"""
    try:
        # For demo, create a valid token if none provided
        if not credentials.credentials or credentials.credentials == "demo":
            return {
                'user_id': 'demo_user',
                'role': 'doctor',
                'exp': datetime.now().timestamp() + 3600
            }
        
        payload = jwt.decode(
            credentials.credentials, 
            config.JWT_SECRET, 
            algorithms=[config.JWT_ALGORITHM]
        )
        
        return payload
        
    except jwt.PyJWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        # Return demo payload for demo purposes
        return {
            'user_id': 'demo_user',
            'role': 'doctor',
            'exp': datetime.now().timestamp() + 3600
        }

# Request middleware for tracing
@app.middleware("http")
async def add_request_metadata(request: Request, call_next):
    """Add request ID and timing metadata"""
    request_id = str(uuid.uuid4())
    start_time_req = time.time()
    
    # Add request ID to request state
    request.state.request_id = request_id
    
    response = await call_next(request)
    
    # Add headers
    process_time = time.time() - start_time_req
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Request-ID"] = request_id
    
    return response

# Enhanced image preprocessing
def preprocess_image(image_array: np.ndarray) -> np.ndarray:
    """Enhanced image preprocessing for better face recognition"""
    try:
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            # Convert to LAB color space for better processing
            lab = cv2.cvtColor(image_array, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            
            # Apply CLAHE to L channel for better contrast
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            # Merge channels and convert back to RGB
            enhanced = cv2.merge([l, a, b])
            return cv2.cvtColor(enhanced, cv2.COLOR_LAB2RGB)
        else:
            # For grayscale images
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            return clahe.apply(image_array)
            
    except Exception as e:
        logger.warning(f"Image preprocessing failed, using original: {e}")
        return image_array

# Enhanced quality assessment
def calculate_enhanced_image_quality(image_rgb: np.ndarray, face_location: tuple) -> dict:
    """Enhanced image quality assessment with multiple metrics"""
    top, right, bottom, left = face_location
    face_image = image_rgb[top:bottom, left:right]
    
    # Convert to grayscale for analysis
    gray_face = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY)
    
    # 1. Sharpness (Laplacian variance)
    laplacian_var = cv2.Laplacian(gray_face, cv2.CV_64F).var()
    sharpness_score = min(laplacian_var / 1000, 1.0)
    
    # 2. Brightness analysis
    brightness = np.mean(gray_face) / 255.0
    brightness_score = 1.0 - abs(brightness - 0.5) * 2
    
    # 3. Contrast analysis
    contrast = np.std(gray_face) / 255.0
    contrast_score = min(contrast * 2, 1.0)
    
    # 4. Face size analysis
    face_area = (bottom - top) * (right - left)
    size_score = min(face_area / 10000, 1.0)
    
    # Weighted overall score
    overall_quality = (
        sharpness_score * 0.3 +
        brightness_score * 0.2 +
        contrast_score * 0.2 +
        size_score * 0.3
    )
    
    return {
        "overall_quality": overall_quality,
        "sharpness": sharpness_score,
        "brightness": brightness_score,
        "contrast": contrast_score,
        "size": size_score,
        "face_area": face_area
    }

# Enhanced endpoints
@app.get("/health", response_model=HealthCheckResponse)
async def enhanced_health_check():
    """Comprehensive health check with dependency status"""
    dependencies = {}
    
    # Check SQLite database
    try:
        conn = sqlite3.connect('medid_biometric.db')
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        conn.close()
        dependencies["database"] = "healthy"
    except Exception as e:
        dependencies["database"] = f"error: {str(e)}"
    
    # Check face recognition library
    try:
        test_image = np.zeros((100, 100, 3), dtype=np.uint8)
        face_recognition.face_locations(test_image)
        dependencies["face_recognition"] = "healthy"
    except Exception as e:
        dependencies["face_recognition"] = f"error: {str(e)}"
    
    return HealthCheckResponse(
        status="healthy",
        timestamp=datetime.now(),
        dependencies=dependencies,
        uptime_seconds=time.time() - start_time
    )

@app.get("/metrics")
async def get_metrics():
    """Simple metrics endpoint"""
    metrics = f"""
# HELP biometric_service_info Service information
# TYPE biometric_service_info gauge
biometric_service_info{{version="2.0.0",service="biometric-service-demo"}} 1

# HELP biometric_uptime_seconds Service uptime
# TYPE biometric_uptime_seconds counter
biometric_uptime_seconds {time.time() - start_time}

# HELP biometric_requests_total Total requests processed
# TYPE biometric_requests_total counter
biometric_requests_total 0
"""
    return Response(content=metrics, media_type="text/plain")

@app.post("/biometric/extract-template")
async def extract_template(
    request: Request,
    file: UploadFile = File(...),
    patient_id: Optional[str] = None,
    token_data: dict = Depends(verify_jwt_token)
):
    """Enhanced biometric template extraction with improved processing"""
    start_time_extract = time.time()
    request_id = request.state.request_id
    
    try:
        # Validate file size
        if file.size and file.size > config.MAX_IMAGE_SIZE:
            raise HTTPException(status_code=413, detail="Image file too large")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Convert to RGB numpy array
        image_array = np.array(image.convert('RGB'))
        
        # Preprocess image for better recognition
        preprocessed_image = preprocess_image(image_array)
        
        # Detect faces
        face_locations = face_recognition.face_locations(preprocessed_image)
        
        if not face_locations:
            raise HTTPException(status_code=422, detail="No face detected in image")
        
        if len(face_locations) > 1:
            raise HTTPException(status_code=422, detail="Multiple faces detected - please use image with single face")
        
        # Extract face encoding
        face_encodings = face_recognition.face_encodings(preprocessed_image, face_locations)
        
        if not face_encodings:
            raise HTTPException(status_code=422, detail="Could not extract face features")
        
        face_encoding = face_encodings[0]
        
        # Enhanced quality assessment
        quality_metrics = calculate_enhanced_image_quality(preprocessed_image, face_locations[0])
        
        if quality_metrics["overall_quality"] < config.MIN_IMAGE_QUALITY:
            raise HTTPException(
                status_code=422, 
                detail=f"Image quality too low: {quality_metrics['overall_quality']:.2f} (minimum: {config.MIN_IMAGE_QUALITY})"
            )
        
        # Create template with metadata
        template_data = {
            "encoding": face_encoding.tolist(),
            "quality_metrics": quality_metrics,
            "algorithm_version": "face_recognition_v1.3.0",
            "preprocessing_applied": True,
            "extracted_at": datetime.now().isoformat()
        }
        
        # Encrypt template
        template_json = json.dumps(template_data)
        encrypted_template = cipher_suite.encrypt(template_json.encode())
        template_b64 = base64.b64encode(encrypted_template).decode()
        
        # Store in SQLite database if patient_id provided
        if patient_id:
            try:
                conn = sqlite3.connect('medid_biometric.db')
                cursor = conn.cursor()
                cursor.execute(
                    """INSERT INTO biometric_templates 
                       (id, patient_id, encrypted_template, quality_score, algorithm_version, created_at)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (str(uuid.uuid4()), patient_id, template_b64, 
                     quality_metrics["overall_quality"], "face_recognition_v1.3.0", datetime.now())
                )
                conn.commit()
                conn.close()
            except Exception as e:
                logger.error(f"Failed to store template in database: {e}")
        
        processing_time = int((time.time() - start_time_extract) * 1000)
        
        logger.info(f"Template extracted successfully for patient {patient_id} (quality: {quality_metrics['overall_quality']:.3f})")
        
        return {
            "success": True,
            "template_data": template_b64,
            "quality_metrics": quality_metrics,
            "face_location": face_locations[0],
            "patient_id": patient_id,
            "processing_time_ms": processing_time,
            "algorithm_version": "face_recognition_v1.3.0",
            "request_id": request_id,
            "created_at": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in template extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Template extraction failed: {str(e)}")

@app.post("/biometric/match", response_model=BiometricMatchResult)
async def match_biometric(
    request: Request,
    match_request: BiometricMatchRequest,
    token_data: dict = Depends(verify_jwt_token)
):
    """Match biometric template against database"""
    start_time_match = time.time()
    request_id = request.state.request_id
    
    try:
        # Decrypt incoming template
        encrypted_template = base64.b64decode(match_request.template_data.encode())
        decrypted_template = cipher_suite.decrypt(encrypted_template)
        template_data = json.loads(decrypted_template.decode())
        incoming_encoding = np.array(template_data["encoding"])
        
        best_match_patient = None
        best_confidence = 0.0
        
        # Get all stored templates from SQLite
        conn = sqlite3.connect('medid_biometric.db')
        cursor = conn.cursor()
        cursor.execute("SELECT patient_id, encrypted_template FROM biometric_templates")
        stored_templates = cursor.fetchall()
        conn.close()
        
        # Compare against all stored templates
        for patient_id, stored_template_b64 in stored_templates:
            try:
                # Decrypt stored template
                stored_encrypted = base64.b64decode(stored_template_b64.encode())
                stored_decrypted = cipher_suite.decrypt(stored_encrypted)
                stored_data = json.loads(stored_decrypted.decode())
                stored_encoding = np.array(stored_data["encoding"])
                
                # Calculate face distance (lower is better)
                distance = face_recognition.face_distance([stored_encoding], incoming_encoding)[0]
                confidence = 1.0 - distance  # Convert to confidence score
                
                if confidence > best_confidence and confidence >= match_request.threshold:
                    best_confidence = confidence
                    best_match_patient = patient_id
                    
            except Exception as e:
                logger.warning(f"Error processing template for patient {patient_id}: {e}")
                continue
        
        processing_time = int((time.time() - start_time_match) * 1000)
        
        result = BiometricMatchResult(
            patient_id=best_match_patient,
            confidence=best_confidence,
            match_found=best_match_patient is not None,
            processing_time_ms=processing_time,
            request_id=request_id
        )
        
        logger.info(f"Biometric match completed: {result.match_found} (confidence: {result.confidence:.3f})")
        
        return result
        
    except Exception as e:
        logger.error(f"Error during biometric matching: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Biometric matching failed: {str(e)}")

@app.post("/biometric/liveness-check", response_model=LivenessCheckResult)
async def check_liveness(
    request: Request,
    file: UploadFile = File(...),
    token_data: dict = Depends(verify_jwt_token)
):
    """Perform liveness detection on uploaded image"""
    start_time_liveness = time.time()
    request_id = request.state.request_id
    
    try:
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        
        # Convert to RGB if necessary
        if len(image_array.shape) == 3:
            image_rgb = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
        else:
            image_rgb = image_array
        
        # Perform liveness checks
        checks_passed = []
        checks_failed = []
        
        # Check 1: Image quality and resolution
        height, width = image_rgb.shape[:2]
        if width >= 200 and height >= 200:
            checks_passed.append("resolution_check")
        else:
            checks_failed.append("resolution_check")
        
        # Check 2: Face detection
        face_locations = face_recognition.face_locations(image_rgb)
        if len(face_locations) == 1:
            checks_passed.append("single_face_check")
        else:
            checks_failed.append("single_face_check")
        
        # Check 3: Image sharpness
        gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        if variance > 100:
            checks_passed.append("sharpness_check")
        else:
            checks_failed.append("sharpness_check")
        
        # Check 4: Color distribution
        color_variance = np.var(image_rgb)
        if color_variance > 1000:
            checks_passed.append("color_variance_check")
        else:
            checks_failed.append("color_variance_check")
        
        # Calculate overall confidence
        total_checks = len(checks_passed) + len(checks_failed)
        confidence = len(checks_passed) / total_checks if total_checks > 0 else 0
        
        # Determine if live (at least 3 out of 4 checks should pass)
        is_live = len(checks_passed) >= 3
        
        processing_time = int((time.time() - start_time_liveness) * 1000)
        
        logger.info(f"Liveness check completed: {is_live} (confidence: {confidence:.3f})")
        
        return LivenessCheckResult(
            is_live=is_live,
            confidence=confidence,
            checks_passed=checks_passed,
            checks_failed=checks_failed,
            processing_time_ms=processing_time,
            request_id=request_id
        )
        
    except Exception as e:
        logger.error(f"Error during liveness check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Liveness check failed: {str(e)}")

@app.get("/demo/token")
async def get_demo_token():
    """Generate a demo JWT token for testing"""
    payload = {
        'user_id': 'demo_doctor',
        'role': 'doctor',
        'hospital': 'demo_hospital',
        'exp': datetime.now() + timedelta(hours=1)
    }
    
    token = jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": 3600,
        "user_info": {
            "user_id": payload['user_id'],
            "role": payload['role'],
            "hospital": payload['hospital']
        }
    }

@app.get("/demo/stats")
async def get_demo_stats():
    """Get demo statistics"""
    try:
        conn = sqlite3.connect('medid_biometric.db')
        cursor = conn.cursor()
        
        # Count templates
        cursor.execute("SELECT COUNT(*) FROM biometric_templates")
        template_count = cursor.fetchone()[0]
        
        # Get recent templates
        cursor.execute("SELECT patient_id, quality_score, created_at FROM biometric_templates ORDER BY created_at DESC LIMIT 5")
        recent_templates = cursor.fetchall()
        
        conn.close()
        
        return {
            "total_templates": template_count,
            "recent_templates": [
                {
                    "patient_id": row[0],
                    "quality_score": row[1], 
                    "created_at": row[2]
                } for row in recent_templates
            ],
            "service_uptime": time.time() - start_time,
            "database_type": "SQLite (Demo)",
            "status": "healthy"
        }
        
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8001,
        log_level="info",
        access_log=True
    )