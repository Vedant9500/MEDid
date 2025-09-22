from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Patient, BiometricTemplate, EmergencyAccess, AuditLog


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class PatientSerializer(serializers.ModelSerializer):
    age = serializers.ReadOnlyField()  # Calculated from date_of_birth
    
    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'date_of_birth', 'age', 'gender', 'blood_group',
            'emergency_contact_name', 'emergency_contact_phone', 'phone_number', 'email',
            'allergies', 'current_medications', 'medical_conditions', 'emergency_summary',
            'abha_id', 'consent_status', 'consent_granted_at', 'consent_version',
            'is_active', 'created_at', 'updated_at', 'last_accessed'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_accessed']


class PatientRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for patient registration with validation"""
    face_image_base64 = serializers.CharField(write_only=True, required=False)
    biometric_quality_score = serializers.FloatField(read_only=True)
    
    class Meta:
        model = Patient
        fields = [
            'name', 'date_of_birth', 'gender', 'blood_group',
            'emergency_contact_name', 'emergency_contact_phone', 'phone_number', 'email',
            'allergies', 'current_medications', 'medical_conditions',
            'abha_id', 'consent_status', 'consent_version',
            'face_image_base64', 'biometric_quality_score'
        ]
    
    def validate_consent_status(self, value):
        if value != 'granted':
            raise serializers.ValidationError("Consent must be granted for registration")
        return value


class BiometricTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = BiometricTemplate
        fields = [
            'id', 'patient', 'quality_score', 'template_version',
            'extraction_algorithm', 'created_at', 'last_used'
        ]
        read_only_fields = ['id', 'created_at', 'last_used', 'face_template_encrypted']


class EmergencyAccessSerializer(serializers.ModelSerializer):
    patient_data = PatientSerializer(source='patient', read_only=True)
    
    class Meta:
        model = EmergencyAccess
        fields = [
            'id', 'patient', 'patient_data', 'access_type', 'accessing_device_id',
            'accessing_user', 'organization', 'location', 'emergency_reason',
            'biometric_confidence', 'supervisor_approval', 'status',
            'started_at', 'expires_at', 'ended_at', 'data_accessed', 'actions_performed'
        ]
        read_only_fields = ['id', 'started_at', 'ended_at']


class EmergencyMatchRequestSerializer(serializers.Serializer):
    """Serializer for emergency biometric matching requests"""
    face_image_base64 = serializers.CharField()
    emergency_reason = serializers.CharField(max_length=500)
    accessing_device_id = serializers.CharField(max_length=100)
    accessing_user = serializers.CharField(max_length=200)
    organization = serializers.CharField(max_length=200)
    location = serializers.CharField(max_length=200)
    confidence_threshold = serializers.FloatField(default=0.6, min_value=0.0, max_value=1.0)


class EmergencyMatchResponseSerializer(serializers.Serializer):
    """Serializer for emergency match responses"""
    match_found = serializers.BooleanField()
    patient_id = serializers.UUIDField(required=False)
    emergency_data = serializers.DictField(required=False)
    match_confidence = serializers.FloatField(required=False)
    access_session_id = serializers.UUIDField(required=False)
    expires_at = serializers.DateTimeField(required=False)


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'
        read_only_fields = ['id', 'timestamp']


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class DemoTokenSerializer(serializers.Serializer):
    message = serializers.CharField(default="Demo access granted")