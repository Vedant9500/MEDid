# MedID Biometric Service

Production-ready secure biometric processing service for emergency medical identification. This service provides face recognition capabilities for patient identification in medical emergency situations.

## Features

### 🔒 Security
- Environment-based encryption keys (no hardcoded secrets)
- Enhanced JWT validation with expiration checking
- PostgreSQL database with connection pooling
- Comprehensive input validation and error handling
- Audit logging for security compliance
- Row-level security policies

### 📊 Performance
- Async/await patterns throughout
- Connection pooling for database operations
- Thread pool execution for CPU-intensive tasks
- LRU caching for frequently accessed templates
- Image preprocessing with CLAHE enhancement
- Prometheus metrics for monitoring

### 🧪 Quality
- Enhanced quality assessment with multiple metrics
- Template deduplication using hashes
- Algorithm versioning for future upgrades
- Comprehensive error handling
- Request tracing with unique IDs

## Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Docker & Docker Compose (recommended)

### Environment Setup
1. Copy `.env.example` to `.env`
2. Generate secure encryption key:
   ```bash
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   ```
3. Generate JWT secret:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

### Docker Deployment (Recommended)
```bash
# Build the service
docker build -t medid-biometric:latest .

# Run with docker-compose
docker-compose up -d
```

### Native Installation
```bash
# Install dependencies
pip install -r requirements.txt

# Setup database
psql -U postgres -d medid_production -f database_schema.sql

# Run the service
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

## API Endpoints

### Health Check
```http
GET /health
```

### Biometric Template Extraction
```http
POST /biometric/extract-template
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

{
  "file": "<image_file>",
  "patient_id": "optional_patient_id"
}
```

### Template Matching
```http
POST /biometric/match
Content-Type: application/json
Authorization: Bearer <jwt_token>

{
  "template_data": "<base64_encrypted_template>",
  "threshold": 0.6,
  "max_results": 1
}
```

### Liveness Detection
```http
POST /biometric/liveness-check
Content-Type: multipart/form-data
Authorization: Bearer <jwt_token>

{
  "file": "<image_file>"
}
```

### Prometheus Metrics
```http
GET /metrics
```

## Configuration

### Environment Variables
- `BIOMETRIC_ENCRYPTION_KEY` - Encryption key for biometric templates (required)
- `JWT_SECRET` - Secret key for JWT token validation (required)
- `DATABASE_URL` - PostgreSQL connection string
- `MIN_IMAGE_QUALITY` - Minimum image quality threshold (default: 0.5)
- `MAX_IMAGE_SIZE` - Maximum image file size in bytes (default: 5MB)

### Quality Thresholds
- Image quality assessment includes sharpness, brightness, contrast, size, noise, and eye region analysis
- Configurable minimum quality threshold prevents low-quality template extraction
- Face size validation ensures adequate resolution for recognition

## Monitoring

### Metrics Available
- `biometric_template_extractions_total` - Total template extractions
- `biometric_matching_requests_total` - Total matching requests
- `biometric_processing_seconds` - Processing time distribution
- `biometric_errors_total` - Error rates by type

### Health Checks
The `/health` endpoint provides comprehensive dependency status including:
- Database connectivity
- Face recognition library status
- Service uptime
- Memory and performance metrics

## Security Features

### Encryption
- All biometric templates encrypted using Fernet (AES-256)
- Environment-based key management
- Secure key rotation support

### Authentication
- JWT-based authentication with expiration validation
- Request tracing with unique request IDs
- Comprehensive audit logging

### Data Protection
- Row-level security in database
- Input validation and sanitization
- Error handling without information leakage

## Performance Optimizations

### Image Processing
- CLAHE enhancement for better face recognition
- Efficient preprocessing pipeline
- Thread pool for CPU-intensive operations

### Database
- Connection pooling (5-20 connections)
- Indexed queries for fast template retrieval
- Automated cleanup of expired templates

### Caching
- LRU cache for frequently accessed templates
- Redis support for distributed caching
- Template deduplication using hashes

## Development

### Testing
```bash
# Run tests
pytest tests/ -v --cov=main

# Load testing
artillery run load-test.yml
```

### Code Quality
- Type hints throughout codebase
- Comprehensive error handling
- Structured logging
- Security-first design

## Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete production deployment instructions including:
- Docker configuration
- Database setup
- Security hardening
- Monitoring setup
- Scaling considerations

## Support

For issues, questions, or contributions:
1. Check the deployment guide for common issues
2. Review logs for detailed error messages
3. Monitor metrics for performance insights
4. Contact the development team with request ID for faster support

## License

This biometric service is part of the MedID emergency medical identification system.