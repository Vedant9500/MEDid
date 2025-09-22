-- MedID Database Schema
-- Security-first design with field-level encryption
-- PostgreSQL with pgcrypto extension

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CORE PATIENT DATA TABLES
-- =============================================

-- Patients table - core identity and emergency information
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identity fields (partially encrypted/hashed)
    abha_id VARCHAR(100) UNIQUE, -- ABHA ID if available
    name_hash VARCHAR(64), -- SHA-256 hash for searching, not stored plaintext
    dob_encrypted BYTEA, -- AES-256-GCM encrypted date of birth
    gender CHAR(1) CHECK (gender IN ('M', 'F', 'O', 'U')), -- Not encrypted for medical necessity
    
    -- Emergency medical information (encrypted)
    blood_group_encrypted BYTEA, -- AES-256-GCM encrypted
    emergency_summary_encrypted BYTEA, -- Pre-computed emergency summary
    
    -- Biometric reference
    biometric_template_id UUID REFERENCES biometric_templates(id),
    
    -- Consent and legal
    consent_status VARCHAR(20) DEFAULT 'pending' CHECK (consent_status IN ('pending', 'granted', 'revoked', 'expired')),
    data_retention_until DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID, -- Reference to user who created record
    
    -- Encryption metadata
    encryption_key_version INTEGER DEFAULT 1,
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256-GCM'
);

-- Indexes for efficient querying
CREATE INDEX idx_patients_abha_id ON patients(abha_id) WHERE abha_id IS NOT NULL;
CREATE INDEX idx_patients_name_hash ON patients(name_hash);
CREATE INDEX idx_patients_created_at ON patients(created_at);
CREATE INDEX idx_patients_consent_status ON patients(consent_status);

-- =============================================
-- BIOMETRIC TEMPLATES TABLE
-- =============================================

-- Biometric templates - encrypted embeddings and metadata
CREATE TABLE biometric_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Template data (all encrypted)
    template_hash VARCHAR(64) NOT NULL, -- HMAC-SHA256 for fast lookup
    template_encrypted BYTEA NOT NULL, -- AES-256-GCM encrypted embedding vector
    template_salt BYTEA NOT NULL, -- Unique salt for HMAC
    
    -- Algorithm and quality metadata
    algorithm VARCHAR(50) NOT NULL DEFAULT 'face_recognition_v1',
    quality_score DECIMAL(3,2), -- 0.00 to 1.00
    embedding_dimension INTEGER DEFAULT 128,
    
    -- Liveness detection metadata
    liveness_score DECIMAL(3,2), -- 0.00 to 1.00
    liveness_method VARCHAR(50), -- 'blink_detection', 'head_movement', etc.
    
    -- Encryption metadata
    encryption_iv BYTEA NOT NULL, -- Initialization vector for AES-GCM
    encryption_key_version INTEGER DEFAULT 1,
    
    -- Audit trail
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    last_matched_at TIMESTAMP WITH TIME ZONE,
    match_count INTEGER DEFAULT 0
);

-- Indexes for biometric matching
CREATE INDEX idx_biometric_templates_hash ON biometric_templates(template_hash);
CREATE INDEX idx_biometric_templates_algorithm ON biometric_templates(algorithm);
CREATE INDEX idx_biometric_templates_quality ON biometric_templates(quality_score);

-- =============================================
-- HEALTH RECORDS TABLE
-- =============================================

-- Health records - append-only encrypted medical data
CREATE TABLE health_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Record classification
    record_type VARCHAR(50) NOT NULL, -- 'lab_result', 'prescription', 'allergy', 'diagnosis', 'vital_signs'
    record_subtype VARCHAR(100), -- More specific classification
    priority_level VARCHAR(20) DEFAULT 'normal' CHECK (priority_level IN ('low', 'normal', 'high', 'critical')),
    
    -- Encrypted payload
    record_payload_encrypted BYTEA NOT NULL, -- JSON data encrypted with AES-256-GCM
    
    -- Source and provenance
    source_system VARCHAR(100), -- 'hospital_emr', 'lab_system', 'mobile_app'
    source_id VARCHAR(100), -- Original record ID in source system
    healthcare_provider_id UUID, -- Reference to provider
    
    -- Temporal information
    event_timestamp TIMESTAMP WITH TIME ZONE, -- When the medical event occurred
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- When recorded in system
    
    -- Encryption metadata
    encryption_iv BYTEA NOT NULL,
    encryption_key_version INTEGER DEFAULT 1,
    
    -- Verification and integrity
    digital_signature BYTEA, -- Digital signature of encrypted payload
    verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'verified', 'disputed')),
    
    -- Never update - append only for audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL
);

-- Indexes for health records
CREATE INDEX idx_health_records_patient_id ON health_records(patient_id);
CREATE INDEX idx_health_records_type ON health_records(record_type);
CREATE INDEX idx_health_records_priority ON health_records(priority_level);
CREATE INDEX idx_health_records_event_time ON health_records(event_timestamp);
CREATE INDEX idx_health_records_created_at ON health_records(created_at);

-- =============================================
-- CONSENT MANAGEMENT TABLE
-- =============================================

-- Consents - granular permission management
CREATE TABLE consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Consent details
    consent_type VARCHAR(50) NOT NULL, -- 'data_storage', 'emergency_access', 'research', 'sharing'
    scope_description TEXT, -- Human-readable description of what's consented to
    
    -- Permissions granted
    granted_permissions TEXT[], -- Array of specific permissions
    restricted_fields TEXT[], -- Fields explicitly restricted
    
    -- Legal framework
    legal_basis VARCHAR(100), -- 'informed_consent', 'vital_interests', 'legitimate_interest'
    jurisdiction VARCHAR(10), -- 'IN', 'EU', 'US', etc.
    
    -- Temporal validity
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Digital signature and verification
    consent_signature_encrypted BYTEA, -- Encrypted signature data
    signature_method VARCHAR(50), -- 'digital_signature', 'biometric', 'otp'
    witness_id UUID, -- Healthcare provider who witnessed consent
    
    -- Legal document reference
    consent_document_hash VARCHAR(64), -- Hash of consent document
    privacy_policy_version VARCHAR(20),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_consent_dates CHECK (expires_at IS NULL OR expires_at > granted_at),
    CONSTRAINT revoked_after_granted CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

-- Indexes for consent queries
CREATE INDEX idx_consents_patient_id ON consents(patient_id);
CREATE INDEX idx_consents_type ON consents(consent_type);
CREATE INDEX idx_consents_status ON consents(granted_at, expires_at, revoked_at);
CREATE INDEX idx_consents_legal_basis ON consents(legal_basis);

-- =============================================
-- AUDIT AND COMPLIANCE TABLES
-- =============================================

-- Audit log - immutable security and access audit trail
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What happened
    action VARCHAR(100) NOT NULL, -- 'patient_created', 'emergency_access', 'data_export'
    action_category VARCHAR(50), -- 'authentication', 'data_access', 'system_admin'
    resource_type VARCHAR(50), -- 'patient', 'health_record', 'biometric_template'
    resource_id UUID, -- ID of affected resource
    
    -- Who did it
    actor_type VARCHAR(50) NOT NULL, -- 'user', 'device', 'system', 'api_client'
    actor_id UUID, -- User ID, device ID, etc.
    actor_role VARCHAR(50), -- Role at time of action
    
    -- Where and when
    device_id UUID, -- Device used for action
    ip_address INET,
    user_agent TEXT,
    geolocation POINT, -- GPS coordinates if available
    timestamp_utc TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Emergency/break-glass specific
    break_glass_reason TEXT, -- Required for emergency access
    break_glass_authorized_by UUID, -- Who authorized break-glass
    patient_notified BOOLEAN DEFAULT FALSE, -- Whether patient was notified
    
    -- Outcome and details
    outcome VARCHAR(20) DEFAULT 'success' CHECK (outcome IN ('success', 'failure', 'partial')),
    error_code VARCHAR(50), -- If outcome was failure
    details_encrypted BYTEA, -- Additional details, encrypted
    
    -- Data integrity
    previous_audit_hash VARCHAR(64), -- Hash of previous audit entry (blockchain-like)
    current_audit_hash VARCHAR(64) NOT NULL, -- Hash of this entry
    
    -- Compliance tags
    compliance_tags TEXT[], -- ['HIPAA', 'GDPR', 'SOX'] etc.
    retention_until DATE,
    
    -- Immutable - no updates allowed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_type, actor_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp_utc);
CREATE INDEX idx_audit_log_device ON audit_log(device_id);
CREATE INDEX idx_audit_log_break_glass ON audit_log(break_glass_reason) WHERE break_glass_reason IS NOT NULL;
CREATE INDEX idx_audit_log_hash_chain ON audit_log(previous_audit_hash, current_audit_hash);

-- =============================================
-- DEVICE MANAGEMENT TABLE
-- =============================================

-- Devices - registered hospital/EMS devices
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Device identity
    device_name VARCHAR(200) NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- 'mobile', 'tablet', 'desktop', 'scanner'
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    
    -- Organization and location
    organization_id UUID NOT NULL, -- Hospital/EMS organization
    department VARCHAR(100), -- 'emergency', 'cardiology', 'ambulance'
    location_description TEXT,
    physical_location POINT, -- GPS coordinates
    
    -- Security credentials
    device_certificate_pem TEXT NOT NULL, -- X.509 certificate
    certificate_fingerprint VARCHAR(64) NOT NULL UNIQUE,
    public_key_pem TEXT NOT NULL,
    
    -- Device capabilities
    supported_features TEXT[], -- ['facial_recognition', 'fingerprint', 'nfc']
    security_level VARCHAR(20) DEFAULT 'standard' CHECK (security_level IN ('basic', 'standard', 'high', 'hsm')),
    
    -- Status and lifecycle
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
    activated_at TIMESTAMP WITH TIME ZONE,
    last_seen_at TIMESTAMP WITH TIME ZONE,
    certificate_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Compliance and audit
    compliance_level VARCHAR(50), -- 'HIPAA_compliant', 'FIPS_140_2'
    last_security_audit DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL
);

-- Indexes for device management
CREATE INDEX idx_devices_org_id ON devices(organization_id);
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_certificate_fp ON devices(certificate_fingerprint);
CREATE INDEX idx_devices_expires_at ON devices(certificate_expires_at);
CREATE INDEX idx_devices_last_seen ON devices(last_seen_at);

-- =============================================
-- KEY MANAGEMENT TABLE
-- =============================================

-- Encryption keys metadata (actual keys stored in KMS/HSM)
CREATE TABLE encryption_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Key identification
    key_name VARCHAR(100) NOT NULL UNIQUE,
    key_type VARCHAR(50) NOT NULL, -- 'data_encryption', 'signing', 'patient_data', 'biometric'
    algorithm VARCHAR(50) NOT NULL, -- 'AES-256-GCM', 'RSA-2048', 'ECDSA-P256'
    
    -- Key lifecycle
    version INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'rotating', 'deprecated', 'destroyed')),
    
    -- External key references (KMS)
    kms_provider VARCHAR(50), -- 'vault', 'aws_kms', 'azure_keyvault'
    kms_key_id VARCHAR(200), -- External key ID in KMS
    
    -- Security properties
    key_strength INTEGER, -- Key size in bits
    derivation_info JSONB, -- Key derivation parameters
    
    -- Temporal properties
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    rotation_scheduled_at TIMESTAMP WITH TIME ZONE,
    deprecated_at TIMESTAMP WITH TIME ZONE,
    destroyed_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage tracking
    usage_count BIGINT DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Compliance
    compliance_tags TEXT[], -- ['FIPS_140_2', 'Common_Criteria']
    retention_policy VARCHAR(100),
    
    CONSTRAINT version_positive CHECK (version > 0)
);

-- Indexes for key management
CREATE INDEX idx_encryption_keys_name_version ON encryption_keys(key_name, version);
CREATE INDEX idx_encryption_keys_type ON encryption_keys(key_type);
CREATE INDEX idx_encryption_keys_status ON encryption_keys(status);
CREATE INDEX idx_encryption_keys_rotation ON encryption_keys(rotation_scheduled_at) WHERE status = 'active';

-- =============================================
-- ORGANIZATIONS TABLE
-- =============================================

-- Organizations - hospitals, clinics, EMS services
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic information
    name VARCHAR(200) NOT NULL,
    organization_type VARCHAR(50) NOT NULL, -- 'hospital', 'clinic', 'ems', 'lab'
    registration_number VARCHAR(100), -- Government registration
    
    -- Contact information
    address_encrypted BYTEA, -- Encrypted address
    phone_encrypted BYTEA, -- Encrypted phone
    email_encrypted BYTEA, -- Encrypted email
    
    -- Geographic and operational
    service_area GEOGRAPHY, -- Geographic service area
    timezone VARCHAR(50),
    operating_hours JSONB, -- Operating schedule
    
    -- Compliance and certifications
    certifications TEXT[], -- ['HIPAA', 'JCI', 'NABH']
    license_number VARCHAR(100),
    license_expires_at DATE,
    
    -- System integration
    integration_config JSONB, -- Configuration for external systems
    data_retention_policy JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'inactive')),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID
);

-- Indexes for organizations
CREATE INDEX idx_organizations_type ON organizations(organization_type);
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_license_expires ON organizations(license_expires_at);

-- =============================================
-- EMERGENCY ACCESS LOGS
-- =============================================

-- Emergency access sessions - tracks break-glass access
CREATE TABLE emergency_access_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Session identification
    session_token VARCHAR(100) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES patients(id),
    device_id UUID NOT NULL REFERENCES devices(id),
    
    -- Authorization
    authorized_by UUID NOT NULL, -- User who initiated break-glass
    authorization_method VARCHAR(50), -- 'biometric_match', 'override_code', 'supervisor_approval'
    emergency_type VARCHAR(50), -- 'unconscious', 'mass_casualty', 'critical_condition'
    
    -- Access details
    reason TEXT NOT NULL,
    data_accessed TEXT[], -- Array of data types accessed
    access_level VARCHAR(20), -- 'emergency_summary', 'vital_records', 'full_access'
    
    -- Timing
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Patient notification
    patient_notification_sent BOOLEAN DEFAULT FALSE,
    notification_method VARCHAR(50), -- 'sms', 'email', 'abha_notification'
    notification_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Outcome
    session_outcome VARCHAR(50), -- 'successful', 'expired', 'revoked', 'error'
    outcome_reason TEXT,
    
    -- Audit trail reference
    audit_entries UUID[], -- Array of audit_log IDs for this session
    
    CONSTRAINT valid_session_duration CHECK (expires_at > started_at),
    CONSTRAINT ended_after_started CHECK (ended_at IS NULL OR ended_at >= started_at)
);

-- Indexes for emergency access
CREATE INDEX idx_emergency_access_patient ON emergency_access_sessions(patient_id);
CREATE INDEX idx_emergency_access_device ON emergency_access_sessions(device_id);
CREATE INDEX idx_emergency_access_active ON emergency_access_sessions(started_at, expires_at) WHERE ended_at IS NULL;
CREATE INDEX idx_emergency_access_authorized_by ON emergency_access_sessions(authorized_by);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to compute audit hash chain
CREATE OR REPLACE FUNCTION compute_audit_hash(
    p_action VARCHAR,
    p_actor_id UUID,
    p_timestamp TIMESTAMP WITH TIME ZONE,
    p_resource_id UUID,
    p_previous_hash VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
    RETURN encode(
        digest(
            CONCAT(p_action, p_actor_id, p_timestamp, p_resource_id, COALESCE(p_previous_hash, '')),
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically compute audit hash
CREATE OR REPLACE FUNCTION set_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash VARCHAR(64);
BEGIN
    -- Get the hash of the most recent audit entry
    SELECT current_audit_hash INTO prev_hash
    FROM audit_log
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Set the previous hash and compute current hash
    NEW.previous_audit_hash := prev_hash;
    NEW.current_audit_hash := compute_audit_hash(
        NEW.action,
        NEW.actor_id,
        NEW.timestamp_utc,
        NEW.resource_id,
        prev_hash
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_hash_trigger BEFORE INSERT ON audit_log
    FOR EACH ROW EXECUTE FUNCTION set_audit_hash();

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- View for active emergency access sessions
CREATE VIEW active_emergency_sessions AS
SELECT 
    eas.*,
    p.emergency_summary_encrypted,
    d.device_name,
    d.organization_id,
    o.name as organization_name
FROM emergency_access_sessions eas
JOIN patients p ON eas.patient_id = p.id
JOIN devices d ON eas.device_id = d.id
JOIN organizations o ON d.organization_id = o.id
WHERE eas.ended_at IS NULL 
    AND eas.expires_at > NOW()
    AND eas.session_outcome IS NULL;

-- View for patient emergency summary (for authorized emergency access only)
CREATE VIEW patient_emergency_view AS
SELECT 
    p.id,
    p.blood_group_encrypted,
    p.emergency_summary_encrypted,
    p.consent_status,
    bt.quality_score as biometric_quality,
    COUNT(hr.id) as total_records,
    MAX(hr.event_timestamp) as last_medical_event
FROM patients p
LEFT JOIN biometric_templates bt ON p.biometric_template_id = bt.id
LEFT JOIN health_records hr ON p.id = hr.patient_id
WHERE p.consent_status = 'granted'
GROUP BY p.id, p.blood_group_encrypted, p.emergency_summary_encrypted, p.consent_status, bt.quality_score;

-- View for audit compliance reporting
CREATE VIEW audit_compliance_summary AS
SELECT 
    DATE_TRUNC('day', timestamp_utc) as audit_date,
    action_category,
    COUNT(*) as total_actions,
    COUNT(*) FILTER (WHERE outcome = 'success') as successful_actions,
    COUNT(*) FILTER (WHERE outcome = 'failure') as failed_actions,
    COUNT(*) FILTER (WHERE break_glass_reason IS NOT NULL) as break_glass_accesses,
    array_agg(DISTINCT compliance_tags) as compliance_frameworks
FROM audit_log
GROUP BY DATE_TRUNC('day', timestamp_utc), action_category
ORDER BY audit_date DESC;

-- =============================================
-- SECURITY POLICIES AND GRANTS
-- =============================================

-- Create roles for different system components
-- These would be configured during deployment with appropriate passwords

-- Role for the main application backend
-- CREATE ROLE medid_backend_role;

-- Role for the biometric service (limited access)
-- CREATE ROLE medid_biometric_role;

-- Role for audit/reporting (read-only access to audit data)
-- CREATE ROLE medid_audit_role;

-- Grant appropriate permissions (example - would be fully configured in deployment scripts)
-- GRANT SELECT, INSERT, UPDATE ON patients TO medid_backend_role;
-- GRANT SELECT ON biometric_templates TO medid_biometric_role;
-- GRANT SELECT ON audit_log TO medid_audit_role;

-- =============================================
-- DATA INTEGRITY CONSTRAINTS
-- =============================================

-- Ensure audit log integrity (no updates or deletes allowed)
-- This would be enforced by application-level controls and database permissions

-- Ensure biometric template uniqueness per algorithm
-- ALTER TABLE biometric_templates ADD CONSTRAINT unique_template_per_algorithm 
--     EXCLUDE USING gist (template_hash WITH =) WHERE (algorithm = algorithm);

-- Ensure emergency access sessions don't overlap for same patient
-- ALTER TABLE emergency_access_sessions ADD CONSTRAINT no_overlapping_emergency_sessions
--     EXCLUDE USING gist (patient_id WITH =, tsrange(started_at, COALESCE(ended_at, expires_at)) WITH &&);

-- =============================================
-- INITIAL DATA AND CONFIGURATION
-- =============================================

-- Insert default encryption key metadata (actual keys managed by KMS)
INSERT INTO encryption_keys (key_name, key_type, algorithm, version, status, kms_provider) VALUES
('patient-data-key-v1', 'data_encryption', 'AES-256-GCM', 1, 'active', 'vault'),
('biometric-template-key-v1', 'data_encryption', 'AES-256-GCM', 1, 'active', 'vault'),
('audit-signing-key-v1', 'signing', 'ECDSA-P256', 1, 'active', 'vault'),
('emergency-summary-key-v1', 'data_encryption', 'AES-256-GCM', 1, 'active', 'vault');

-- Insert initial audit entry to bootstrap hash chain
INSERT INTO audit_log (action, action_category, actor_type, actor_id, outcome, details_encrypted) VALUES
('system_initialized', 'system_admin', 'system', uuid_generate_v4(), 'success', NULL);

COMMIT;