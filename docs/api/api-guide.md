# MedID API Documentation

## Overview
The MedID API provides secure, HIPAA-compliant endpoints for biometric health passport functionality. All endpoints implement field-level encryption, comprehensive audit logging, and role-based access controls.

## Quick Start

### Authentication
```bash
# Device authentication (mutual TLS)
curl -X POST https://api.medid.example.com/v1/emergency/match \
  --cert device.crt \
  --key device.key \
  -H "Content-Type: application/json" \
  -d '{"face_image_base64": "...", "device_id": "device-001", ...}'

# User authentication (JWT)
curl -X GET https://api.medid.example.com/v1/patients/12345 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Rate Limits
- **Emergency Access**: 100 requests/minute per device
- **Patient Registration**: 10 requests/minute per device
- **General API**: 1000 requests/hour per user

## Core Workflows

### 1. Patient Registration Flow
```mermaid
sequenceDiagram
    participant Mobile as Mobile App
    participant API as MedID API
    participant Bio as Biometric Service
    participant DB as Database
    
    Mobile->>API: POST /v1/patients
    API->>Bio: Extract facial features
    Bio->>Bio: Liveness detection
    Bio->>Bio: Generate encrypted template
    Bio-->>API: Template + quality score
    API->>DB: Store encrypted patient data
    API-->>Mobile: Patient ID + registration status
```

### 2. Emergency Access Flow
```mermaid
sequenceDiagram
    participant Device as Hospital Device
    participant API as MedID API
    participant Bio as Biometric Service
    participant Audit as Audit Service
    participant SMS as SMS Gateway
    
    Device->>API: POST /v1/emergency/match
    API->>Bio: Match biometric template
    Bio-->>API: Match result + confidence
    API->>Audit: Log emergency access
    API->>SMS: Notify patient
    API-->>Device: Emergency medical data
```

## Security Features

### Encryption
- **Transport**: TLS 1.3 with perfect forward secrecy
- **At Rest**: AES-256-GCM with envelope encryption
- **Field Level**: PHI encrypted at column level
- **Key Management**: HSM-backed key rotation

### Authentication Layers
1. **Device Authentication**: X.509 mutual TLS
2. **User Authentication**: OAuth2 + TOTP 2FA
3. **API Authorization**: JWT with role-based scopes
4. **Break-glass Access**: Emergency override with audit

### Audit Trail
Every API call generates audit entries including:
- Actor identification (user/device)
- Action performed and outcome
- Data accessed or modified
- Timestamp and location
- Break-glass justification (if applicable)

## API Endpoints

### Patient Management
- `POST /v1/patients` - Register new patient
- `GET /v1/patients/{id}` - Retrieve patient info
- `PATCH /v1/patients/{id}` - Update patient data
- `DELETE /v1/patients/{id}` - Soft delete (with retention)

### Emergency Access
- `POST /v1/emergency/match` - Emergency biometric match
- `GET /v1/emergency/sessions/{id}` - Session details
- `DELETE /v1/emergency/sessions/{id}` - End session

### Biometric Operations
- `POST /v1/biometrics/templates` - Extract biometric template
- `POST /v1/biometrics/match` - Perform biometric matching
- `GET /v1/biometrics/quality` - Check image quality

### Health Records
- `GET /v1/patients/{id}/records` - Retrieve health records
- `POST /v1/patients/{id}/records` - Add new record
- `GET /v1/patients/{id}/emergency-summary` - Emergency summary

### Audit & Compliance
- `GET /v1/audit/logs` - System audit logs
- `GET /v1/audit/emergency-access` - Emergency access audit
- `GET /v1/compliance/reports` - Compliance reports

### Device Management
- `GET /v1/devices` - List registered devices
- `POST /v1/devices` - Register new device
- `PATCH /v1/devices/{id}` - Update device status

### Consent Management
- `GET /v1/patients/{id}/consents` - Patient consents
- `POST /v1/patients/{id}/consents` - Record consent
- `DELETE /v1/patients/{id}/consents/{id}` - Revoke consent

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Resource not found
- `409` - Conflict (e.g., patient already exists)
- `429` - Rate limit exceeded
- `500` - Internal server error

### Error Response Format
```json
{
  "error": "BIOMETRIC_MATCH_FAILED",
  "message": "No biometric match found above threshold",
  "details": {
    "highest_confidence": 0.73,
    "threshold_required": 0.85,
    "suggestions": [
      "Ensure good lighting",
      "Position face directly toward camera",
      "Remove glasses if possible"
    ]
  },
  "request_id": "req_12345",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Emergency Access Details

### Break-Glass Authorization
Emergency access bypasses normal consent requirements but requires:

1. **Valid Emergency**: Medical emergency requiring immediate access
2. **Device Authentication**: Registered hospital device with valid certificate
3. **Biometric Match**: Facial recognition confidence > 85%
4. **Justification**: Detailed reason for emergency access
5. **Healthcare Provider**: Licensed provider authorization

### Emergency Data Fields
Available during break-glass access:
- Blood group and Rh factor
- Critical allergies (drug, food, environmental)
- Current medications and dosages
- Life-threatening medical conditions
- Emergency contact information
- DNR/advance directive status

### Patient Notification
Patients are notified within 15 minutes via:
- SMS to registered mobile number
- ABHA app notification (if available)
- Email to registered address
- Family emergency contact (if patient unreachable)

## Biometric Processing

### Supported Algorithms
- **Primary**: face_recognition (dlib-based)
- **Secondary**: InsightFace (ArcFace)
- **Liveness**: Blink detection + head movement
- **Quality**: NFIQ2-based quality scoring

### Image Requirements
- **Format**: JPEG, PNG, WEBP
- **Size**: 640x480 minimum, 1920x1080 maximum
- **Quality**: NFIQ score > 70
- **Conditions**: Good lighting, front-facing, no obstructions

### Template Storage
- Templates encrypted with AES-256-GCM
- Unique IV per template
- HMAC index for fast matching
- No raw images stored

## Compliance & Regulatory

### HIPAA Compliance
- Business Associate Agreements (BAA)
- Audit trails for all PHI access
- Encryption at rest and in transit
- Access controls and user authentication
- Breach notification procedures

### GDPR Compliance
- Right to access personal data
- Right to rectification
- Right to erasure ("right to be forgotten")
- Data portability
- Consent management

### Aadhaar Compliance
- No storage of Aadhaar numbers
- Use ABHA ID for patient identification
- UIDAI authentication APIs for verification
- Legal basis documentation

## SDK and Integration

### Python SDK Example
```python
from medid_sdk import MedIDClient

# Initialize client with device certificate
client = MedIDClient(
    base_url="https://api.medid.example.com/v1",
    cert_file="device.crt",
    key_file="device.key"
)

# Emergency access
result = client.emergency_match(
    face_image=image_bytes,
    device_id="device-001",
    emergency_type="unconscious",
    reason="Patient unconscious, need allergy info",
    provider_id="dr-smith-001"
)

if result.match_found:
    emergency_data = result.emergency_data
    print(f"Allergies: {emergency_data.allergies}")
    print(f"Blood Group: {emergency_data.blood_group}")
```

### JavaScript SDK Example
```javascript
import { MedIDClient } from '@medid/sdk';

const client = new MedIDClient({
  baseURL: 'https://api.medid.example.com/v1',
  deviceCert: deviceCertificate,
  deviceKey: devicePrivateKey
});

// Patient registration
const registration = await client.registerPatient({
  name: 'John Doe',
  faceImage: imageBase64,
  bloodGroup: 'A+',
  allergies: ['penicillin'],
  consentGranted: true
});

console.log(`Patient registered: ${registration.patientId}`);
```

## Testing

### Test Environment
- **Base URL**: `https://staging-api.medid.example.com/v1`
- **Test Certificates**: Available in developer portal
- **Sample Data**: Synthetic patient records provided
- **Rate Limits**: Relaxed for testing (10x production limits)

### Test Scenarios
1. **Successful Registration**: Valid biometric, complete data
2. **Poor Quality Image**: Low lighting, blurry image
3. **Duplicate Registration**: Existing biometric template
4. **Emergency Access**: Unconscious patient scenario
5. **Failed Match**: No biometric match found
6. **Rate Limiting**: Exceed request limits
7. **Invalid Certificate**: Expired or invalid device cert

## Performance

### Response Time SLAs
- **Emergency Match**: < 2 seconds (99th percentile)
- **Patient Registration**: < 5 seconds
- **Biometric Extraction**: < 1 second
- **API Queries**: < 500ms

### Throughput Limits
- **Emergency Access**: 1000 requests/minute (system-wide)
- **Registrations**: 100 requests/minute per device
- **API Calls**: 10,000 requests/minute (system-wide)

### Monitoring
Real-time metrics available at:
- Response times and error rates
- Biometric match success rates
- System resource utilization
- Security events and anomalies

---

For additional support, contact our developer relations team at dev-support@medid.example.com or visit our developer portal at https://developers.medid.example.com