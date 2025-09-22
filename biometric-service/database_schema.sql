-- MedID Biometric Service Database Schema
-- Production-ready database structure with security and performance optimizations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enhanced biometric templates table
CREATE TABLE biometric_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(255) NOT NULL,
    encrypted_template TEXT NOT NULL,
    quality_score DECIMAL(4,3) NOT NULL CHECK (quality_score >= 0 AND quality_score <= 1),
    algorithm_version VARCHAR(50) NOT NULL DEFAULT 'face_recognition_v1.3.0',
    template_hash VARCHAR(64) UNIQUE NOT NULL, -- For deduplication
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    
    -- Constraints
    CONSTRAINT valid_quality_score CHECK (quality_score BETWEEN 0 AND 1),
    CONSTRAINT valid_template_data CHECK (length(encrypted_template) > 10)
);

-- Create audit log table for security tracking
CREATE TABLE biometric_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(255),
    operation_type VARCHAR(50) NOT NULL, -- 'extract', 'match', 'verify', 'delete'
    operation_result VARCHAR(20) NOT NULL, -- 'success', 'failure', 'error'
    confidence_score DECIMAL(4,3),
    request_id UUID,
    user_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    processing_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create matching requests table for performance analytics
CREATE TABLE biometric_matching_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID UNIQUE NOT NULL,
    template_hash VARCHAR(64) NOT NULL,
    threshold_used DECIMAL(4,3) NOT NULL,
    matches_found INTEGER DEFAULT 0,
    processing_time_ms INTEGER NOT NULL,
    algorithm_version VARCHAR(50) NOT NULL,
    quality_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system metrics table
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    tags JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_biometric_templates_patient_id ON biometric_templates(patient_id);
CREATE INDEX idx_biometric_templates_created_at ON biometric_templates(created_at);
CREATE INDEX idx_biometric_templates_quality_score ON biometric_templates(quality_score);
CREATE INDEX idx_biometric_templates_active ON biometric_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_biometric_templates_hash ON biometric_templates(template_hash);

CREATE INDEX idx_audit_log_patient_id ON biometric_audit_log(patient_id);
CREATE INDEX idx_audit_log_operation_type ON biometric_audit_log(operation_type);
CREATE INDEX idx_audit_log_created_at ON biometric_audit_log(created_at);
CREATE INDEX idx_audit_log_request_id ON biometric_audit_log(request_id);

CREATE INDEX idx_matching_requests_created_at ON biometric_matching_requests(created_at);
CREATE INDEX idx_matching_requests_template_hash ON biometric_matching_requests(template_hash);

CREATE INDEX idx_system_metrics_name_time ON system_metrics(metric_name, recorded_at);

-- Row-level security policies
ALTER TABLE biometric_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_audit_log ENABLE ROW LEVEL SECURITY;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update timestamps
CREATE TRIGGER update_biometric_templates_updated_at 
    BEFORE UPDATE ON biometric_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate template hash
CREATE OR REPLACE FUNCTION generate_template_hash(template_data TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(template_data, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired templates
CREATE OR REPLACE FUNCTION cleanup_expired_templates()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM biometric_templates 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO biometric_audit_log (
        operation_type, 
        operation_result, 
        metadata
    ) VALUES (
        'cleanup', 
        'success', 
        jsonb_build_object('deleted_count', deleted_count)
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Stored procedure for secure template insertion
CREATE OR REPLACE FUNCTION insert_biometric_template(
    p_patient_id VARCHAR(255),
    p_encrypted_template TEXT,
    p_quality_score DECIMAL(4,3),
    p_algorithm_version VARCHAR(50) DEFAULT 'face_recognition_v1.3.0',
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    template_id UUID;
    template_hash TEXT;
BEGIN
    -- Generate hash for deduplication
    template_hash := generate_template_hash(p_encrypted_template);
    
    -- Insert template
    INSERT INTO biometric_templates (
        patient_id,
        encrypted_template,
        quality_score,
        algorithm_version,
        template_hash,
        expires_at
    ) VALUES (
        p_patient_id,
        p_encrypted_template,
        p_quality_score,
        p_algorithm_version,
        template_hash,
        p_expires_at
    ) RETURNING id INTO template_id;
    
    -- Log the operation
    INSERT INTO biometric_audit_log (
        patient_id,
        operation_type,
        operation_result,
        confidence_score,
        metadata
    ) VALUES (
        p_patient_id,
        'extract',
        'success',
        p_quality_score,
        jsonb_build_object(
            'template_id', template_id,
            'algorithm_version', p_algorithm_version
        )
    );
    
    RETURN template_id;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled cleanup job (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-templates', '0 2 * * *', 'SELECT cleanup_expired_templates();');

-- Views for analytics and monitoring
CREATE VIEW template_quality_stats AS
SELECT 
    algorithm_version,
    COUNT(*) as total_templates,
    AVG(quality_score) as avg_quality,
    MIN(quality_score) as min_quality,
    MAX(quality_score) as max_quality,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY quality_score) as median_quality
FROM biometric_templates 
WHERE is_active = TRUE
GROUP BY algorithm_version;

CREATE VIEW daily_operations_summary AS
SELECT 
    DATE(created_at) as operation_date,
    operation_type,
    operation_result,
    COUNT(*) as operation_count,
    AVG(processing_time_ms) as avg_processing_time_ms
FROM biometric_audit_log
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), operation_type, operation_result
ORDER BY operation_date DESC;

-- Grant permissions for application user
-- GRANT SELECT, INSERT, UPDATE ON biometric_templates TO medid_app_user;
-- GRANT INSERT ON biometric_audit_log TO medid_app_user;
-- GRANT INSERT ON biometric_matching_requests TO medid_app_user;
-- GRANT INSERT ON system_metrics TO medid_app_user;
-- GRANT SELECT ON template_quality_stats TO medid_app_user;
-- GRANT SELECT ON daily_operations_summary TO medid_app_user;