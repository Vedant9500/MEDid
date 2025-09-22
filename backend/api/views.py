from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from .models import Patient, BiometricRecord
from .serializers import (
    UserSerializer, PatientSerializer, BiometricRecordSerializer,
    LoginSerializer, DemoTokenSerializer
)
import json


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login endpoint for authentication"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        # Check for demo credentials
        if email == 'demo@medid.com' and password == 'demo123':
            # Create or get demo user
            demo_user, created = User.objects.get_or_create(
                username='demo',
                defaults={
                    'email': 'demo@medid.com',
                    'first_name': 'Dr. Demo',
                    'last_name': 'User'
                }
            )
            if created:
                demo_user.set_password('demo123')
                demo_user.save()
            
            token, created = Token.objects.get_or_create(user=demo_user)
            return Response({
                'access_token': token.key,
                'user': {
                    'id': demo_user.id,
                    'email': demo_user.email,
                    'name': f"{demo_user.first_name} {demo_user.last_name}".strip(),
                    'role': 'doctor',
                    'hospital': 'Demo General Hospital',
                    'permissions': ['patient:read', 'patient:write', 'emergency:access'],
                    'lastLogin': demo_user.last_login.isoformat() if demo_user.last_login else None
                }
            })
        
        # Try regular authentication
        try:
            user = User.objects.get(email=email)
            user = authenticate(username=user.username, password=password)
            if user:
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    'access_token': token.key,
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'name': f"{user.first_name} {user.last_name}".strip(),
                        'role': 'doctor',
                        'hospital': 'General Hospital',
                        'permissions': ['patient:read', 'patient:write', 'emergency:access'],
                        'lastLogin': user.last_login.isoformat() if user.last_login else None
                    }
                })
        except User.DoesNotExist:
            pass
    
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET'])
@permission_classes([AllowAny])
def demo_token(request):
    """Demo token endpoint for testing"""
    # Create or get demo user
    demo_user, created = User.objects.get_or_create(
        username='demo',
        defaults={
            'email': 'demo@medid.com',
            'first_name': 'Dr. Demo',
            'last_name': 'User'
        }
    )
    
    token, created = Token.objects.get_or_create(user=demo_user)
    
    return Response({
        'access_token': token.key,
        'user_info': {
            'user_id': demo_user.id,
            'role': 'doctor',
            'hospital': 'Demo General Hospital'
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """Get user profile"""
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_patients(request):
    """Search patients endpoint"""
    query = request.GET.get('q', '')
    
    # Create sample patients if none exist
    if Patient.objects.count() == 0:
        sample_patients = [
            Patient(id='P001', name='John Smith', age=45, blood_type='A+', emergency_contact='Jane Smith (Wife)', status='active'),
            Patient(id='P002', name='Sarah Johnson', age=32, blood_type='O-', emergency_contact='Mike Johnson (Husband)', status='active'),
            Patient(id='P003', name='Robert Brown', age=28, blood_type='B+', emergency_contact='Lisa Brown (Sister)', status='active'),
        ]
        Patient.objects.bulk_create(sample_patients)
    
    patients = Patient.objects.filter(name__icontains=query) if query else Patient.objects.all()
    serializer = PatientSerializer(patients, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_patient(request, patient_id):
    """Get specific patient details"""
    patient = get_object_or_404(Patient, id=patient_id)
    serializer = PatientSerializer(patient)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def register_patient(request):
    """Register a new patient"""
    serializer = PatientSerializer(data=request.data)
    if serializer.is_valid():
        patient = serializer.save()
        return Response(PatientSerializer(patient).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def biometric_scan(request):
    """Handle biometric scanning"""
    # This would integrate with the biometric service
    # For now, return a mock response
    return Response({
        'success': True,
        'patient_id': 'P001',
        'confidence': 0.95,
        'message': 'Patient identified successfully'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def emergency_access(request):
    """Emergency access endpoint"""
    return Response({
        'access_granted': True,
        'emergency_token': 'emergency_access_token',
        'message': 'Emergency access granted'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics"""
    patient_count = Patient.objects.count()
    return Response({
        'total_patients': patient_count,
        'active_sessions': 5,
        'emergency_cases': 2,
        'system_status': 'operational'
    })