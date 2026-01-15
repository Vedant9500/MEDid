import os
import django
import sys
# Add the project root to the python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medid_backend.settings')
django.setup()

from api.models import Patient, BiometricTemplate
from django.utils import timezone
from cryptography.fernet import Fernet
from django.conf import settings
import json
import base64

def create_data():
    # Create patient
    p, created = Patient.objects.get_or_create(
        name="Test Emergency Patient",
        defaults={
            'date_of_birth': "1990-01-01",
            'gender': "M",
            'blood_group': "O+",
            'emergency_contact_name': "Mom",
            'emergency_contact_phone': "555-0199",
            'allergies_encrypted': '',
            'current_medications_encrypted': '',
            'medical_conditions_encrypted': '',
            'emergency_summary_encrypted': ''
        }
    )
    print(f"Patient created: {p.id}")

    # Create dummy encrypted template
    cipher = Fernet(settings.BIOMETRIC_ENCRYPTION_KEY)
    
    # The 'raw' template the service sees is a base64 string.
    dummy_service_template = "dummy_base64_template_from_service"
    
    # Backend stores: Encrypt(JSON(dummy_service_template))
    stored_data = json.dumps(dummy_service_template)
    encrypted_stored = cipher.encrypt(stored_data.encode()).decode()
    
    bt, created = BiometricTemplate.objects.get_or_create(
        patient=p,
        defaults={
            'face_template_encrypted': encrypted_stored,
            'quality_score': 0.99,
            'extraction_algorithm': 'face_recognition',
            'template_version': '1.0'
        }
    )
    print(f"Template created: {bt.id}")

if __name__ == "__main__":
    create_data()
