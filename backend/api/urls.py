from django.urls import path
from . import views

urlpatterns = [
    # Authentication endpoints
    path('auth/login', views.login, name='login'),
    path('auth/register', views.register_user, name='register_user'),
    path('auth/demo-token', views.demo_token, name='demo_token'),
    path('auth/profile', views.get_profile, name='profile'),
    
    # Patient endpoints
    path('patients/search', views.search_patients, name='search_patients'),
    path('patients/<str:patient_id>', views.get_patient, name='get_patient'),
    path('patients/<str:patient_id>/update', views.update_patient, name='update_patient'),
    path('patients/register', views.register_patient, name='register_patient'),
    
    # Biometric endpoints
    path('biometric/extract-template', views.extract_biometric_template, name='extract_template'),
    path('biometric/liveness-check', views.liveness_check, name='liveness_check'),
    path('biometric/scan', views.biometric_scan, name='biometric_scan'),
    
    # Emergency endpoints
    path('emergency/access', views.emergency_access, name='emergency_access'),
    
    # Dashboard endpoints
    path('dashboard/stats', views.dashboard_stats, name='dashboard_stats'),
    path('emergency/stats', views.emergency_stats, name='emergency_stats'),
    path('demo/stats', views.emergency_stats, name='demo_stats'),  # Alias for demo
    path('system/health', views.system_health, name='system_health'),
    path('health', views.system_health, name='health'),  # Alias for health check
    path('system/recent-accesses', views.recent_accesses, name='recent_accesses'),
    
    # Logout endpoint
    path('auth/logout', views.logout_user, name='logout'),
]