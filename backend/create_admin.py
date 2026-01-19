import os
import django
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'medid_backend.settings')
django.setup()

from django.contrib.auth.models import User

try:
    if not User.objects.filter(username='admin').exists():
        User.objects.create_superuser('admin', 'admin@medid.com', 'password')
        print("Superuser 'admin' created with email 'admin@medid.com' and password 'password'")
    else:
        u = User.objects.get(username='admin')
        u.email = 'admin@medid.com'
        u.set_password('password')
        u.save()
        print("Superuser 'admin' updated with email 'admin@medid.com' and password 'password'")
        
except Exception as e:
    print(f"Error: {e}")
