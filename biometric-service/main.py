# FastAPI Biometric Service Main Application
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
import face_recognition
import cv2
import numpy as np
from PIL import Image
import io
import logging
import os
from datetime import datetime
from cryptography.fernet import Fernet
import base64
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="MedID Biometric Service",
    description="Secure biometric processing service for emergency medical identification",
    version="1.0.0"
)

# Security
security = HTTPBearer()

# Configuration
ENCRYPTION_KEY = os.getenv("BIOMETRIC_ENCRYPTION_KEY", Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY)

# Pydantic models
class BiometricTemplate(BaseModel):
    patient_id: str
    template_data: str  # Base64 encoded encrypted template
    quality_score: float
    created_at: datetime

class BiometricMatchRequest(BaseModel):
    template_data: str  # Base64 encoded encrypted template
    threshold: float = 0.6

class BiometricMatchResult(BaseModel):
    patient_id: Optional[str]
    confidence: float
    match_found: bool
    processing_time_ms: int

class LivenessCheckResult(BaseModel):
    is_live: bool
    confidence: float
    checks_passed: List[str]
    checks_failed: List[str]

# Mock database for development testing
mock_templates_db = {}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "biometric-service",
        "timestamp": datetime.now().isoformat(),
        "face_recognition_available": True
    }

@app.post("/biometric/extract-template")
async def extract_template(
    file: UploadFile = File(...),
    patient_id: str = None,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Extract biometric template from uploaded face image"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        
        # Convert to RGB if necessary
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            image_rgb = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
        else:
            image_rgb = image_array
        
        # Detect faces
        face_locations = face_recognition.face_locations(image_rgb)
        
        if not face_locations:
            raise HTTPException(status_code=422, detail="No face detected in image")
        
        if len(face_locations) > 1:
            raise HTTPException(status_code=422, detail="Multiple faces detected - please use image with single face")
        
        # Extract face encoding (template)
        face_encodings = face_recognition.face_encodings(image_rgb, face_locations)
        
        if not face_encodings:
            raise HTTPException(status_code=422, detail="Could not extract face features")
        
        face_encoding = face_encodings[0]
        
        # Calculate quality score
        quality_score = calculate_image_quality(image_rgb, face_locations[0])
        
        if quality_score < 0.5:
            raise HTTPException(status_code=422, detail=f"Image quality too low: {quality_score:.2f}")
        
        # Encrypt template
        template_json = json.dumps(face_encoding.tolist())
        encrypted_template = cipher_suite.encrypt(template_json.encode())
        template_b64 = base64.b64encode(encrypted_template).decode()
        
        # Store in mock database if patient_id provided
        if patient_id:
            mock_templates_db[patient_id] = {
                "template_data": template_b64,
                "quality_score": quality_score,
                "created_at": datetime.now()
            }
        
        logger.info(f"Template extracted successfully for patient {patient_id}")
        
        return {
            "success": True,
            "template_data": template_b64,
            "quality_score": quality_score,
            "face_location": face_locations[0],
            "patient_id": patient_id,
            "created_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error extracting template: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Template extraction failed: {str(e)}")

@app.post("/biometric/match", response_model=BiometricMatchResult)
async def match_biometric(
    request: BiometricMatchRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Match biometric template against database"""
    start_time = datetime.now()
    
    try:
        # Decrypt incoming template
        encrypted_template = base64.b64decode(request.template_data.encode())
        decrypted_template = cipher_suite.decrypt(encrypted_template)
        incoming_encoding = np.array(json.loads(decrypted_template.decode()))
        
        best_match_patient = None
        best_confidence = 0.0
        
        # Compare against all stored templates
        for patient_id, stored_data in mock_templates_db.items():
            # Decrypt stored template
            stored_encrypted = base64.b64decode(stored_data["template_data"].encode())
            stored_decrypted = cipher_suite.decrypt(stored_encrypted)
            stored_encoding = np.array(json.loads(stored_decrypted.decode()))
            
            # Calculate face distance (lower is better)
            distance = face_recognition.face_distance([stored_encoding], incoming_encoding)[0]
            confidence = 1.0 - distance  # Convert to confidence score
            
            if confidence > best_confidence and confidence >= request.threshold:
                best_confidence = confidence
                best_match_patient = patient_id
        
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)
        
        result = BiometricMatchResult(
            patient_id=best_match_patient,
            confidence=best_confidence,
            match_found=best_match_patient is not None,
            processing_time_ms=processing_time
        )
        
        logger.info(f"Biometric match completed: {result.match_found} (confidence: {result.confidence:.3f})")
        
        return result
        
    except Exception as e:
        logger.error(f"Error during biometric matching: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Biometric matching failed: {str(e)}")

@app.post("/biometric/liveness-check", response_model=LivenessCheckResult)
async def check_liveness(
    file: UploadFile = File(...),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Perform liveness detection on uploaded image"""
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
        
        # Perform basic liveness checks
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
        
        # Check 3: Basic image properties (not a obvious photo of photo)
        # Simple check for image variance (real faces have more variance than photos)
        gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        if variance > 100:  # Threshold for image sharpness
            checks_passed.append("sharpness_check")
        else:
            checks_failed.append("sharpness_check")
        
        # Check 4: Color distribution (real faces have more varied colors)
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
        
        logger.info(f"Liveness check completed: {is_live} (confidence: {confidence:.3f})")
        
        return LivenessCheckResult(
            is_live=is_live,
            confidence=confidence,
            checks_passed=checks_passed,
            checks_failed=checks_failed
        )
        
    except Exception as e:
        logger.error(f"Error during liveness check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Liveness check failed: {str(e)}")

@app.get("/biometric/templates/{patient_id}")
async def get_patient_template(
    patient_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get stored biometric template for patient"""
    if patient_id not in mock_templates_db:
        raise HTTPException(status_code=404, detail="Patient template not found")
    
    template_data = mock_templates_db[patient_id]
    return {
        "patient_id": patient_id,
        "quality_score": template_data["quality_score"],
        "created_at": template_data["created_at"].isoformat(),
        "template_encrypted": True
    }

@app.get("/biometric/templates")
async def list_templates(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """List all stored biometric templates"""
    templates = []
    for patient_id, data in mock_templates_db.items():
        templates.append({
            "patient_id": patient_id,
            "quality_score": data["quality_score"],
            "created_at": data["created_at"].isoformat()
        })
    
    return {
        "total_templates": len(templates),
        "templates": templates
    }

def calculate_image_quality(image_rgb, face_location):
    """Calculate image quality score based on various factors"""
    top, right, bottom, left = face_location
    
    # Extract face region
    face_image = image_rgb[top:bottom, left:right]
    
    # Calculate sharpness using Laplacian variance
    gray_face = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY)
    laplacian_var = cv2.Laplacian(gray_face, cv2.CV_64F).var()
    
    # Normalize sharpness score (0-1)
    sharpness_score = min(laplacian_var / 1000, 1.0)
    
    # Calculate brightness (prefer well-lit faces)
    brightness = np.mean(gray_face) / 255.0
    brightness_score = 1.0 - abs(brightness - 0.5) * 2  # Prefer brightness around 0.5
    
    # Calculate contrast
    contrast = np.std(gray_face) / 255.0
    contrast_score = min(contrast * 2, 1.0)
    
    # Face size score (prefer larger faces)
    face_area = (bottom - top) * (right - left)
    size_score = min(face_area / 10000, 1.0)
    
    # Overall quality score (weighted average)
    quality_score = (
        sharpness_score * 0.4 +
        brightness_score * 0.2 +
        contrast_score * 0.2 +
        size_score * 0.2
    )
    
    return quality_score

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)