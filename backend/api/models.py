from django.db import models
from django.contrib.auth.models import User
import uuid
import json


class Patient(models.Model):
    """
    Enhanced Patient model for MedID biometric health passport system
    """
    BLOOD_GROUP_CHOICES = [
        ('A+', 'A+'), ('A-', 'A-'),
        ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'),
        ('O+', 'O+'), ('O-', 'O-')
    ]
    
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
        ('NP', 'Not Specified')
    ]
    
    CONSENT_STATUS_CHOICES = [
        ('granted', 'Granted'),
        ('revoked', 'Revoked'),
        ('pending', 'Pending'),
        ('expired', 'Expired')
    ]

    # Core Identity
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=2, choices=GENDER_CHOICES)
    blood_group = models.CharField(max_length=3, choices=BLOOD_GROUP_CHOICES)
    
    # Contact Information
    emergency_contact_name = models.CharField(max_length=200)
    emergency_contact_phone = models.CharField(max_length=20)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    
    # Medical Information (encrypted fields for future)
    allergies = models.JSONField(default=list, blank=True)  # List of allergy strings
    current_medications = models.JSONField(default=list, blank=True)  # List of medication objects
    medical_conditions = models.JSONField(default=list, blank=True)  # List of condition objects
    emergency_summary = models.TextField(blank=True)  # Critical emergency info
    
    # ABHA Integration
    abha_id = models.CharField(max_length=20, null=True, blank=True, unique=True)
    
    # Consent Management
    consent_status = models.CharField(max_length=20, choices=CONSENT_STATUS_CHOICES, default='pending')
    consent_granted_at = models.DateTimeField(null=True, blank=True)
    consent_version = models.CharField(max_length=10, default='1.0')
    
    # System Fields
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_accessed = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.name} ({str(self.id)[:8]}...)"
    
    @property
    def age(self):
        """Calculate age from date of birth"""
        from datetime import date
        today = date.today()
        return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
    
    def get_emergency_data(self):
        """Get critical emergency information"""
        return {
            'patient_id': str(self.id),
            'name': self.name,
            'age': self.age,
            'blood_group': self.blood_group,
            'allergies': self.allergies,
            'current_medications': self.current_medications,
            'medical_conditions': self.medical_conditions,
            'emergency_summary': self.emergency_summary,
            'emergency_contact': {
                'name': self.emergency_contact_name,
                'phone': self.emergency_contact_phone
            }
        }


class BiometricTemplate(models.Model):
    """
    Secure biometric template storage
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='biometric_template')
    
    # Encrypted biometric data (base64 encoded encrypted template)
    face_template_encrypted = models.TextField()
    template_version = models.CharField(max_length=10, default='1.0')
    quality_score = models.FloatField()  # 0.0 to 1.0
    
    # Metadata
    extraction_algorithm = models.CharField(max_length=50, default='face_recognition')
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"Biometric Template for {self.patient.name}"


class EmergencyAccess(models.Model):
    """
    Track emergency access sessions for audit and compliance
    """
    ACCESS_TYPE_CHOICES = [
        ('emergency', 'Emergency Medical Access'),
        ('break_glass', 'Break Glass Access'),
        ('authorized', 'Authorized Access')
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('expired', 'Expired'),
        ('terminated', 'Terminated')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    
    # Access Details
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPE_CHOICES)
    accessing_device_id = models.CharField(max_length=100)
    accessing_user = models.CharField(max_length=200)  # Healthcare provider name
    organization = models.CharField(max_length=200)  # Hospital/clinic name
    location = models.CharField(max_length=200)  # Physical location
    
    # Authorization
    emergency_reason = models.TextField()
    biometric_confidence = models.FloatField()  # Matching confidence score
    supervisor_approval = models.CharField(max_length=200, null=True, blank=True)
    
    # Session Management
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)
    
    # Audit Trail
    data_accessed = models.JSONField(default=list)  # List of data fields accessed
    actions_performed = models.JSONField(default=list)  # List of actions taken
    
    def __str__(self):
        return f"Emergency Access: {self.patient.name} - {self.access_type}"


class AuditLog(models.Model):
    """
    Comprehensive audit logging for all system access
    """
    EVENT_TYPES = [
        ('patient_register', 'Patient Registration'),
        ('biometric_enroll', 'Biometric Enrollment'),
        ('emergency_access', 'Emergency Access'),
        ('data_view', 'Data View'),
        ('data_update', 'Data Update'),
        ('consent_change', 'Consent Change'),
        ('system_login', 'System Login'),
        ('template_match', 'Biometric Match'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Event Details
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    event_description = models.TextField()
    
    # Related Entities
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True)
    emergency_session = models.ForeignKey(EmergencyAccess, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Actor Information
    user_id = models.CharField(max_length=100, null=True, blank=True)
    device_id = models.CharField(max_length=100, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)
    
    # Event Context
    request_id = models.CharField(max_length=100, null=True, blank=True)
    session_id = models.CharField(max_length=100, null=True, blank=True)
    location = models.CharField(max_length=200, null=True, blank=True)
    
    # Data
    event_data = models.JSONField(default=dict)  # Additional event-specific data
    
    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.event_type} - {self.timestamp}"
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['patient', 'timestamp']),
            models.Index(fields=['device_id', 'timestamp']),
        ]