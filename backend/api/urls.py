from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('auth/login', views.login, name='login'),
    path('auth/demo-token', views.demo_token, name='demo_token'),
    path('auth/profile', views.get_profile, name='profile'),
    
    # Patient endpoints
    path('patients/search', views.search_patients, name='search_patients'),
    path('patients/<str:patient_id>', views.get_patient, name='get_patient'),
    path('patients/register', views.register_patient, name='register_patient'),
    
    # Biometric endpoints
    path('biometric/scan', views.biometric_scan, name='biometric_scan'),
    
    # Emergency endpoints
    path('emergency/access', views.emergency_access, name='emergency_access'),
    
    # Dashboard endpoints
    path('dashboard/stats', views.dashboard_stats, name='dashboard_stats'),
]