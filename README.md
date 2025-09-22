# MedID - Biometric Health Passport System

## Overview
MedID is a security-first, privacy-preserving biometric health passport system designed for emergency medical situations. It enables instant access to critical patient information through secure facial recognition while maintaining strict data protection standards.

## 🏗️ Architecture

### High-Level Design
```
User Devices → Hospital/EMS Scanning Device → API Gateway → Auth & Consent Service → 
Core Health Record Service (encrypted DB) + Biometric Service (match engine) + 
Audit/Logging + AI Summarizer Service
```

### Core Principles
- **Privacy by Design**: Never store raw biometric data
- **Security First**: End-to-end encryption, strict RBAC
- **Emergency Ready**: Sub-2-second emergency access with break-glass audit
- **Regulatory Compliant**: HIPAA, GDPR, and Aadhaar compliance ready

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+

### Development Setup
```bash
# Clone and setup
git clone <repo-url>
cd medid
docker-compose up -d

# Initialize database
python scripts/init_db.py

# Start services
npm run dev:backend
npm run dev:frontend
```

## 📁 Project Structure

```
medid/
├── backend/                 # Django REST Framework API
│   ├── apps/
│   │   ├── auth/           # Authentication & authorization
│   │   ├── patients/       # Patient management
│   │   ├── biometrics/     # Biometric processing
│   │   ├── records/        # Health records
│   │   ├── emergency/      # Emergency access
│   │   └── audit/          # Audit logging
│   ├── config/             # Django settings
│   └── requirements.txt
├── biometric-service/       # Facial recognition microservice
│   ├── src/
│   │   ├── models/         # ML models
│   │   ├── processing/     # Image processing
│   │   └── matching/       # Template matching
│   └── requirements.txt
├── frontend/
│   ├── mobile/             # Flutter mobile app
│   └── web/                # Web dashboard
├── infrastructure/
│   ├── docker/             # Docker configurations
│   ├── k8s/                # Kubernetes manifests
│   └── terraform/          # Infrastructure as code
├── docs/                   # Documentation
│   ├── api/                # API specifications
│   ├── security/           # Security documentation
│   └── deployment/         # Deployment guides
├── tests/                  # Test suites
│   ├── unit/
│   ├── integration/
│   └── security/
└── scripts/                # Utility scripts
```

## 🔐 Security Features

- **Zero Raw Biometric Storage**: Only encrypted templates stored
- **Envelope Encryption**: Data keys protected by KMS
- **Mutual TLS**: Device authentication via certificates
- **Break-glass Auditing**: All emergency access logged immutably
- **Field-level Encryption**: PHI encrypted at column level
- **Key Rotation**: Automated key management

## 🚨 Emergency Access Flow

1. Hospital device scans patient face
2. Liveness detection validates real person
3. Biometric template extracted and matched
4. Emergency summary retrieved if authorized
5. All access logged to immutable audit trail
6. Patient notified via SMS/ABHA

## 📊 Key Metrics

- **Match Time**: <2 seconds end-to-end
- **Accuracy**: FAR <0.1%, FRR <1%
- **Availability**: 99.9% uptime SLA
- **Security**: Zero-knowledge architecture

## 🛠️ Tech Stack

- **Backend**: Django REST Framework, PostgreSQL, Redis
- **Biometrics**: Python (face_recognition/InsightFace), FastAPI
- **Frontend**: Flutter (mobile), React (web)
- **Security**: HashiCorp Vault, TLS 1.3
- **Infrastructure**: Docker, Kubernetes, Terraform
- **ML**: Hugging Face transformers for AI summarization

## 📋 Development Roadmap

### Sprint 0: Infrastructure (Week 1)
- [ ] Project setup and CI/CD
- [ ] Docker Compose environment
- [ ] Database schema implementation

### Sprint 1: Core Registration (Week 2)
- [ ] Patient registration API
- [ ] Biometric template extraction
- [ ] Basic mobile UI

### Sprint 2: Emergency Matching (Week 3)
- [ ] Facial recognition service
- [ ] Emergency access endpoints
- [ ] Break-glass audit logging

### Sprint 3: AI & Summarization (Week 4)
- [ ] AI summarizer service
- [ ] Emergency summary generation
- [ ] Integration testing

### Sprint 4: Security Hardening (Week 5)
- [ ] Penetration testing
- [ ] Security audit
- [ ] Performance optimization

### Sprint 5: Pilot Preparation (Week 6)
- [ ] Synthetic dataset generation
- [ ] Demo scenarios
- [ ] Documentation completion

## 🏥 Use Cases

1. **Emergency Room**: Unconscious patient → instant allergy/medication info
2. **Ambulance**: Field medic scans → critical condition alerts
3. **Mass Casualty**: Rapid triage with instant medical history
4. **Rural Healthcare**: Limited connectivity with NFC backup

## 📞 Support

- Documentation: `/docs`
- API Reference: `/docs/api`
- Security Guidelines: `/docs/security`
- Deployment Guide: `/docs/deployment`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**⚠️ Important**: This is a prototype system. Ensure full legal and regulatory compliance before production deployment.