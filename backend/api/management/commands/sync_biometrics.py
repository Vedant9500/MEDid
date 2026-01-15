import json
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from cryptography.fernet import Fernet
from api.models import BiometricTemplate

class Command(BaseCommand):
    help = 'Syncs all biometric templates to the Biometric Service (for Mock/Lite mode)'

    def handle(self, *args, **options):
        self.stdout.write('Starting biometric synchronization...')
        
        templates = BiometricTemplate.objects.all()
        count = templates.count()
        self.stdout.write(f'Found {count} templates to sync')
        
        cipher_suite = Fernet(settings.BIOMETRIC_ENCRYPTION_KEY)
        success_count = 0
        
        for template in templates:
            try:
                # 1. Decrypt the face_template_encrypted field
                # This gives us a JSON string: "{\"embedding\": ...}"
                encrypted_blob = template.face_template_encrypted
                decrypted_json_str = cipher_suite.decrypt(encrypted_blob.encode()).decode()
                
                # 2. Parse the JSON to get the inner dictionary
                inner_data = json.loads(decrypted_json_str)
                
                # 3. Extract the 'template_data' which is the base64 encoded string 
                # that the service expects. Wait, let's double check the storage format.
                # In views.py:
                # encrypted_template = cipher_suite.encrypt(template_json.encode())
                # template_b64 = base64.b64encode(encrypted_template).decode()
                # 
                # AND THEN:
                # biometric_template = encrypt_template(json.dumps(raw_template))
                # where raw_template IS template_b64.
                #
                # So inner_data IS the template_b64 string (if json.dumps was just a string)
                # OR it's a dict if json.dumps was a dict.
                # views.py: encrypt_template(json.dumps(raw_template))
                # raw_template = bio_data.get('template_data') -> This is a STRING (b64)
                # So json.dumps("string") -> "\"string\""
                # So inner_data is just the string.
                
                raw_template_b64 = inner_data
                
                # 4. Send to service
                response = requests.post(
                    f"{settings.BIOMETRIC_SERVICE_URL}/internal/enroll",
                    json={
                        'patient_id': str(template.patient.id),
                        'encrypted_template': raw_template_b64
                    },
                    timeout=5
                )
                
                if response.status_code == 200:
                    success_count += 1
                    self.stdout.write(self.style.SUCCESS(f'Synced patient {template.patient.id}'))
                else:
                    self.stdout.write(self.style.ERROR(f'Failed to sync {template.patient.id}: {response.text}'))
                    
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error processing {template.id}: {e}'))
                
        self.stdout.write(self.style.SUCCESS(f'Successfully synced {success_count}/{count} templates'))
