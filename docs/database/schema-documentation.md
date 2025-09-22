# MedID Database Schema Documentation

## Overview
This document describes the database schema for the MedID biometric health passport system. The schema is designed with security-first principles, implementing field-level encryption, audit trails, and compliance with healthcare data protection regulations.

## Security Principles

### 1. Field-Level Encryption
- All PHI (Protected Health Information) is encrypted at the column level
- Uses AES-256-GCM with unique IVs per record
- Envelope encryption with KMS-managed keys
- No raw biometric data stored

### 2. Audit Trail
- Immutable append-only audit log
- Hash chain for tamper detection
- Comprehensive logging of all data access
- Break-glass emergency access tracking

### 3. Data Minimization
- Only essential data stored
- Hashed identifiers where possible
- Automatic data retention policies
- Consent-based data storage

## Core Tables

### patients
Primary patient identity and emergency information table.

**Key Security Features:**
- `name_hash`: SHA-256 hash for searching without storing plaintext names
- `dob_encrypted`: Encrypted date of birth using AES-256-GCM
- `blood_group_encrypted`: Encrypted blood type for emergency access
- `emergency_summary_encrypted`: Pre-computed encrypted summary for rapid emergency access

**Privacy Considerations:**
- No plaintext PII stored
- ABHA ID stored only with explicit consent
- Retention policies enforced through `data_retention_until`

```sql
-- Example emergency data retrieval (pseudocode)
SELECT emergency_summary_encrypted, blood_group_encrypted 
FROM patients 
WHERE biometric_template_id = matched_template_id 
  AND consent_status = 'granted';
```

### biometric_templates
Encrypted biometric embeddings and matching metadata.

**Security Features:**
- `template_encrypted`: AES-256-GCM encrypted facial recognition embeddings
- `template_hash`: HMAC-SHA256 for fast matching without decryption
- `template_salt`: Unique salt prevents rainbow table attacks
- No raw biometric images stored

**Matching Process:**
1. Extract embedding from new image
2. Compute HMAC with stored salt
3. Find candidate matches using hash
4. Decrypt only candidate templates for cosine similarity
5. Return match if above threshold

### health_records
Append-only encrypted medical records.

**Features:**
- Immutable once written (append-only)
- All medical data encrypted in `record_payload_encrypted`
- Digital signatures for integrity verification
- Comprehensive provenance tracking

### audit_log
Immutable security and access audit trail.

**Security Features:**
- Blockchain-like hash chain for tamper detection
- All emergency access logged with break-glass reason
- Patient notification tracking
- Comprehensive actor and device attribution

**Hash Chain Implementation:**
```sql
-- Each audit entry references the hash of the previous entry
current_hash = SHA256(action + actor_id + timestamp + resource_id + previous_hash)
```

## Encryption Strategy

### Envelope Encryption
```
Medical Data → Encrypt with DEK → Store Encrypted Data
DEK → Encrypt with KEK → Store Encrypted DEK  
KEK → Stored in HSM/KMS
```

### Key Management
- Data Encryption Keys (DEKs) per record type
- Key Encryption Keys (KEKs) in HSM/Vault
- Automatic key rotation
- Version tracking for key lifecycle

### Encryption Fields
Every encrypted field includes:
- `encryption_iv`: Unique initialization vector
- `encryption_key_version`: Key version for rotation
- `encryption_algorithm`: Algorithm identifier

## Emergency Access (Break-Glass)

### emergency_access_sessions
Tracks all emergency break-glass access events.

**Process Flow:**
1. Device requests emergency access with biometric match
2. System validates device certificate and match threshold
3. Creates emergency session with mandatory reason
4. Logs all access to audit trail
5. Notifies patient via SMS/ABHA
6. Session auto-expires after time limit

**Security Controls:**
- All emergency access requires break-glass reason
- Patient notification mandatory
- Time-limited sessions
- Comprehensive audit trail
- Post-facto review process

## Consent Management

### consents
Granular consent tracking with legal compliance.

**Features:**
- Specific permission scopes
- Digital signatures
- Legal basis tracking
- Expiration and revocation support
- Jurisdiction-specific compliance

**Consent Types:**
- `data_storage`: Permission to store health data
- `emergency_access`: Break-glass emergency access
- `research`: De-identified research participation
- `sharing`: Inter-provider data sharing

## Device Security

### devices
Registered and certified medical devices.

**Security Features:**
- X.509 certificate-based authentication
- Device capability verification
- Geographic and organizational restrictions
- Certificate expiration tracking
- Security compliance levels

## Compliance and Regulatory

### Data Protection
- **GDPR**: Right to be forgotten, consent management
- **HIPAA**: PHI encryption, audit trails, access controls
- **Aadhaar**: No storage of Aadhaar numbers, UIDAI compliance

### Audit and Reporting
- Immutable audit trails
- Compliance reporting views
- Retention policy enforcement
- Cross-border data transfer logging

## Performance Considerations

### Indexing Strategy
- Hash-based indexes for encrypted field lookup
- Temporal indexes for audit queries
- Geospatial indexes for device location
- Partial indexes for active records only

### Query Optimization
- Pre-computed emergency summaries
- Materialized views for reporting
- Connection pooling for encrypted queries
- Caching of non-sensitive metadata

## Security Views

### patient_emergency_view
Optimized view for emergency access with necessary joins and filters.

### active_emergency_sessions
Real-time view of ongoing emergency access sessions.

### audit_compliance_summary
Aggregated compliance reporting for regulatory requirements.

## Deployment Security

### Database Configuration
- TLS encryption for all connections
- Certificate-based client authentication
- Connection limits and rate limiting
- Database-level encryption at rest

### Access Controls
- Role-based database permissions
- Principle of least privilege
- Service account isolation
- Regular permission audits

## Backup and Recovery

### Encrypted Backups
- Point-in-time recovery capability
- Encrypted backup storage
- Cross-region replication
- Compliance with data residency requirements

### Key Recovery
- HSM-based key backup
- Multi-person key recovery process
- Audit trail for key recovery events
- Testing of recovery procedures

## Monitoring and Alerting

### Security Metrics
- Failed authentication attempts
- Unusual access patterns
- Break-glass usage frequency
- Key rotation events

### Performance Metrics
- Query response times
- Encryption/decryption latency
- Database connection health
- Storage utilization

---

This schema provides a robust foundation for secure healthcare data management while enabling rapid emergency access when needed.