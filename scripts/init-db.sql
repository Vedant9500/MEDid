-- Initialize pgcrypto extension and test encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Test encryption functions
DO $$
BEGIN
    -- Test basic encryption/decryption
    IF encrypt('test_data', 'test_key', 'aes') IS NULL THEN
        RAISE EXCEPTION 'Encryption functions not working';
    END IF;
    
    RAISE NOTICE 'pgcrypto extension successfully installed and tested';
END $$;

-- Create test encryption key (for development only)
INSERT INTO encryption_keys (id, key_name, encrypted_key, created_at, is_active) 
VALUES (
    uuid_generate_v4(),
    'dev_master_key',
    pgp_sym_encrypt('dev_master_encryption_key_2024', 'dev_key_encryption_password'),
    NOW(),
    true
) ON CONFLICT DO NOTHING;

-- Create initial test data
INSERT INTO patients (id, encrypted_name, encrypted_date_of_birth, encrypted_emergency_contact, created_at)
VALUES (
    uuid_generate_v4(),
    encrypt('John Doe', 'dev_master_encryption_key_2024', 'aes'),
    encrypt('1985-06-15', 'dev_master_encryption_key_2024', 'aes'), 
    encrypt('+1-555-0123', 'dev_master_encryption_key_2024', 'aes'),
    NOW()
) ON CONFLICT DO NOTHING;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO medid_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO medid_user;

RAISE NOTICE 'Database initialization completed successfully';