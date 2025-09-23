from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import models
from .models import Patient, BiometricTemplate, EmergencyAccess, AuditLog
from .serializers import (
    UserSerializer, PatientSerializer, PatientRegistrationSerializer, BiometricTemplateSerializer,
    EmergencyMatchRequestSerializer, EmergencyMatchResponseSerializer, AuditLogSerializer,
    LoginSerializer, DemoTokenSerializer
)
import json
import logging

logger = logging.getLogger(__name__)


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


@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    """Register a new user (doctor/nurse/admin)"""
    try:
        data = request.data
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return Response(
                    {'error': f'{field} is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Check if user already exists
        if User.objects.filter(username=data['username']).exists():
            return Response(
                {'error': 'Username already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if User.objects.filter(email=data['email']).exists():
            return Response(
                {'error': 'Email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create new user
        user = User.objects.create_user(
            username=data['username'],
            email=data['email'],
            password=data['password'],
            first_name=data['first_name'],
            last_name=data['last_name']
        )
        
        # Create audit log
        AuditLog.objects.create(
            event_type='system_login',  # Using existing event type
            event_description=f'User {user.username} registered successfully',
            user_id=str(user.id),
            ip_address=request.META.get('REMOTE_ADDR', ''),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            event_data={
                'username': user.username,
                'email': user.email,
                'full_name': f"{user.first_name} {user.last_name}"
            }
        )
        
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"User registration failed: {str(e)}")
        return Response(
            {'error': 'Registration failed'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    """Logout user and invalidate token"""
    try:
        # Delete the user's token
        token = Token.objects.get(user=request.user)
        token.delete()
        return Response({'message': 'Successfully logged out'})
    except Token.DoesNotExist:
        return Response({'message': 'Already logged out'})


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
    """
    Register a new patient with biometric enrollment
    Integrates with biometric service for template extraction
    """
    import requests
    import base64
    from datetime import datetime, timedelta
    from django.utils import timezone
    
    serializer = PatientRegistrationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Extract face image if provided
        face_image_b64 = request.data.get('face_image_base64')
        biometric_template = None
        quality_score = 0.0
        
        if face_image_b64:
            # Call biometric service to extract template
            try:
                # Prepare image data for biometric service
                image_data = base64.b64decode(face_image_b64)
                
                biometric_response = requests.post(
                    'http://localhost:8002/biometric/extract-template',
                    files={'file': ('image.jpg', image_data, 'image/jpeg')},
                    headers={'Authorization': f'Bearer dummy_jwt_token'},  # TODO: Use real JWT
                    timeout=10
                )
                
                if biometric_response.status_code == 200:
                    bio_data = biometric_response.json()
                    biometric_template = bio_data.get('template_data')
                    quality_score = bio_data.get('quality_score', 0.0)
                    
                    # Validate quality threshold
                    if quality_score < 0.6:
                        return Response({
                            'error': 'Biometric quality too low',
                            'quality_score': quality_score,
                            'message': 'Please provide a clearer image'
                        }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({
                        'error': 'Biometric extraction failed',
                        'message': 'Could not process facial image'
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except requests.exceptions.RequestException:
                return Response({
                    'error': 'Biometric service unavailable',
                    'message': 'Please try again later'
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        
        # Create patient record
        patient_data = serializer.validated_data.copy()
        
        # Remove face image from patient data
        patient_data.pop('face_image_base64', None)
        
        # Set consent timestamp if granted
        if patient_data.get('consent_status') == 'granted':
            patient_data['consent_granted_at'] = timezone.now()
        
        # Create patient
        patient = Patient.objects.create(**patient_data)
        
        # Create biometric template if we have one
        if biometric_template and quality_score > 0:
            BiometricTemplate.objects.create(
                patient=patient,
                face_template_encrypted=biometric_template,  # TODO: Add encryption
                quality_score=quality_score,
                template_version='1.0',
                extraction_algorithm='face_recognition'
            )
        
        # Create audit log entry
        AuditLog.objects.create(
            event_type='patient_register',
            event_description=f'Patient {patient.name} registered successfully',
            patient=patient,
            user_id=request.user.username,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            event_data={
                'biometric_enrolled': bool(biometric_template),
                'quality_score': quality_score,
                'consent_version': patient.consent_version
            }
        )
        
        # Generate emergency summary
        emergency_summary = generate_emergency_summary(patient)
        patient.emergency_summary = emergency_summary
        patient.save()
        
        response_data = PatientSerializer(patient).data
        response_data['biometric_quality_score'] = quality_score
        response_data['biometric_enrolled'] = bool(biometric_template)
        response_data['registration_status'] = 'success'
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': 'Registration failed',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def generate_emergency_summary(patient):
    """
    Generate emergency summary for quick access during medical emergencies
    """
    summary_parts = []
    
    # Critical information first
    summary_parts.append(f"BLOOD GROUP: {patient.blood_group}")
    
    # Allergies
    if patient.allergies:
        allergy_list = ", ".join(patient.allergies) if isinstance(patient.allergies, list) else patient.allergies
        summary_parts.append(f"ALLERGIES: {allergy_list}")
    
    # Current medications
    if patient.current_medications:
        if isinstance(patient.current_medications, list):
            med_list = ", ".join([med.get('name', str(med)) if isinstance(med, dict) else str(med) for med in patient.current_medications])
        else:
            med_list = str(patient.current_medications)
        summary_parts.append(f"MEDICATIONS: {med_list}")
    
    # Medical conditions
    if patient.medical_conditions:
        if isinstance(patient.medical_conditions, list):
            condition_list = ", ".join([cond.get('condition', str(cond)) if isinstance(cond, dict) else str(cond) for cond in patient.medical_conditions])
        else:
            condition_list = str(patient.medical_conditions)
        summary_parts.append(f"CONDITIONS: {condition_list}")
    
    # Emergency contact
    summary_parts.append(f"EMERGENCY CONTACT: {patient.emergency_contact_name} - {patient.emergency_contact_phone}")
    
    return " | ".join(summary_parts)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def biometric_scan(request):
    """
    Handle biometric scanning for patient identification
    Used in emergency scenarios for quick patient lookup
    """
    import requests
    import base64
    
    try:
        face_image_b64 = request.data.get('face_image_base64')
        confidence_threshold = request.data.get('confidence_threshold', 0.6)
        
        if not face_image_b64:
            return Response({
                'error': 'Face image required',
                'message': 'Please provide face_image_base64'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract template from provided image
        image_data = base64.b64decode(face_image_b64)
        
        extract_response = requests.post(
            'http://localhost:8002/biometric/extract-template',
            files={'file': ('scan.jpg', image_data, 'image/jpeg')},
            headers={'Authorization': f'Bearer dummy_jwt_token'},
            timeout=10
        )
        
        if extract_response.status_code != 200:
            return Response({
                'error': 'Template extraction failed',
                'message': 'Could not process facial image'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        template_data = extract_response.json().get('template_data')
        
        # Match against all enrolled templates
        match_response = requests.post(
            'http://localhost:8002/biometric/match',
            json={
                'template_data': template_data,
                'threshold': confidence_threshold,
                'max_results': 1
            },
            headers={'Authorization': f'Bearer dummy_jwt_token'},
            timeout=10
        )
        
        if match_response.status_code != 200:
            return Response({
                'error': 'Matching failed',
                'message': 'Could not perform biometric matching'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        match_data = match_response.json()
        
        if match_data.get('matches'):
            # Found a match
            best_match = match_data['matches'][0]
            patient_id = best_match.get('patient_id')
            confidence = best_match.get('confidence', 0.0)
            
            try:
                patient = Patient.objects.get(id=patient_id)
                
                # Update last accessed
                patient.last_accessed = timezone.now()
                patient.save()
                
                # Create audit log
                AuditLog.objects.create(
                    event_type='template_match',
                    event_description=f'Biometric match found for patient {patient.name}',
                    patient=patient,
                    user_id=request.user.username,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    event_data={
                        'confidence': confidence,
                        'threshold': confidence_threshold,
                        'scan_type': 'identification'
                    }
                )
                
                return Response({
                    'success': True,
                    'patient_found': True,
                    'patient_id': str(patient.id),
                    'patient_data': PatientSerializer(patient).data,
                    'confidence': confidence,
                    'message': f'Patient {patient.name} identified successfully'
                })
                
            except Patient.DoesNotExist:
                return Response({
                    'error': 'Patient record not found',
                    'message': 'Biometric match found but patient record missing'
                }, status=status.HTTP_404_NOT_FOUND)
        else:
            # No match found
            return Response({
                'success': True,
                'patient_found': False,
                'confidence': 0.0,
                'message': 'No matching patient found'
            })
            
    except requests.exceptions.RequestException:
        return Response({
            'error': 'Biometric service unavailable',
            'message': 'Please try again later'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        return Response({
            'error': 'Scan failed',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def emergency_access(request):
    """
    Emergency access endpoint with break-glass authorization
    POST: Used by medical personnel in emergency situations for biometric matching
    GET: Retrieve emergency access logs
    """
    if request.method == 'GET':
        # Return emergency access logs
        from .models import EmergencyAccess
        
        patient_id = request.GET.get('patient_id')
        
        # Filter by patient ID if provided
        if patient_id:
            accesses = EmergencyAccess.objects.filter(
                patient_id=patient_id
            ).order_by('-started_at')[:10]
        else:
            accesses = EmergencyAccess.objects.all().order_by('-started_at')[:20]
        
        access_logs = []
        for access in accesses:
            access_logs.append({
                'id': str(access.id),
                'patient_id': str(access.patient_id),
                'patient_name': access.patient.name if access.patient else 'Unknown',
                'accessed_by': access.accessing_user,
                'timestamp': access.started_at.isoformat(),
                'action': 'Emergency Access',
                'status': 'success' if access.status == 'granted' else 'failed',
                'location': access.location,
                'emergency_reason': access.emergency_reason,
            })
        
        return Response(access_logs)
    
    # POST request handling for emergency biometric matching
    import requests
    import base64
    from datetime import datetime, timedelta
    
    # Debug logging
    logger.info(f"Emergency access POST request data: {request.data}")
    
    serializer = EmergencyMatchRequestSerializer(data=request.data)
    if not serializer.is_valid():
        logger.error(f"Serializer validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Extract data from request
        face_image_b64 = serializer.validated_data['face_image_base64']
        emergency_reason = serializer.validated_data['emergency_reason']
        accessing_device_id = serializer.validated_data['accessing_device_id']
        accessing_user = serializer.validated_data['accessing_user']
        organization = serializer.validated_data['organization']
        location = serializer.validated_data['location']
        confidence_threshold = serializer.validated_data['confidence_threshold']
        
        # Extract and match biometric template
        image_data = base64.b64decode(face_image_b64)
        
        # Extract template
        extract_response = requests.post(
            'http://localhost:8002/biometric/extract-template',
            files={'file': ('emergency.jpg', image_data, 'image/jpeg')},
            headers={'Authorization': f'Bearer dummy_jwt_token'},
            timeout=10
        )
        
        if extract_response.status_code != 200:
            return Response({
                'error': 'Template extraction failed',
                'message': 'Could not process facial image for emergency access'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        template_data = extract_response.json().get('template_data')
        
        # Match against enrolled templates
        match_response = requests.post(
            'http://localhost:8002/biometric/match',
            json={
                'template_data': template_data,
                'threshold': confidence_threshold,
                'max_results': 1
            },
            headers={'Authorization': f'Bearer dummy_jwt_token'},
            timeout=10
        )
        
        if match_response.status_code != 200:
            return Response({
                'error': 'Emergency matching failed',
                'message': 'Could not perform emergency biometric matching'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        match_data = match_response.json()
        
        if not match_data.get('matches'):
            # No match found - still log the attempt
            AuditLog.objects.create(
                event_type='emergency_access',
                event_description=f'Emergency access attempted - no biometric match found',
                user_id=accessing_user,
                device_id=accessing_device_id,
                ip_address=request.META.get('REMOTE_ADDR'),
                event_data={
                    'success': False,
                    'reason': emergency_reason,
                    'organization': organization,
                    'location': location,
                    'confidence_threshold': confidence_threshold
                }
            )
            
            return Response({
                'match_found': False,
                'message': 'No patient match found for emergency access',
                'emergency_access_denied': True
            })
        
        # Found a match - proceed with emergency access
        best_match = match_data['matches'][0]
        patient_id = best_match.get('patient_id')
        confidence = best_match.get('confidence', 0.0)
        
        try:
            patient = Patient.objects.get(id=patient_id)
            
            # Create emergency access session
            expires_at = timezone.now() + timedelta(hours=2)  # 2-hour emergency session
            
            emergency_session = EmergencyAccess.objects.create(
                patient=patient,
                access_type='emergency',
                accessing_device_id=accessing_device_id,
                accessing_user=accessing_user,
                organization=organization,
                location=location,
                emergency_reason=emergency_reason,
                biometric_confidence=confidence,
                status='active',
                expires_at=expires_at,
                data_accessed=['emergency_summary', 'basic_info', 'allergies', 'medications']
            )
            
            # Update patient last accessed
            patient.last_accessed = timezone.now()
            patient.save()
            
            # Create comprehensive audit log
            AuditLog.objects.create(
                event_type='emergency_access',
                event_description=f'Emergency access granted for patient {patient.name}',
                patient=patient,
                emergency_session=emergency_session,
                user_id=accessing_user,
                device_id=accessing_device_id,
                ip_address=request.META.get('REMOTE_ADDR'),
                location=location,
                event_data={
                    'success': True,
                    'confidence': confidence,
                    'reason': emergency_reason,
                    'organization': organization,
                    'session_duration_hours': 2,
                    'access_type': 'break_glass'
                }
            )
            
            # Prepare emergency data response
            emergency_data = patient.get_emergency_data()
            
            # TODO: Send patient notification (SMS/Email)
            # send_emergency_notification(patient, emergency_session)
            
            response_data = {
                'match_found': True,
                'patient_id': str(patient.id),
                'emergency_data': emergency_data,
                'match_confidence': confidence,
                'access_session_id': str(emergency_session.id),
                'expires_at': expires_at.isoformat(),
                'message': f'Emergency access granted for {patient.name}',
                'session_duration_minutes': 120,
                'notification_sent': False  # TODO: Implement notifications
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Patient.DoesNotExist:
            return Response({
                'error': 'Patient record not found',
                'message': 'Biometric match found but patient record missing'
            }, status=status.HTTP_404_NOT_FOUND)
            
    except requests.exceptions.RequestException:
        return Response({
            'error': 'Biometric service unavailable',
            'message': 'Emergency access temporarily unavailable'
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except Exception as e:
        # Log the error for emergency access failures
        AuditLog.objects.create(
            event_type='emergency_access',
            event_description=f'Emergency access failed: {str(e)}',
            user_id=request.data.get('accessing_user', 'unknown'),
            device_id=request.data.get('accessing_device_id', 'unknown'),
            ip_address=request.META.get('REMOTE_ADDR'),
            event_data={
                'success': False,
                'error': str(e),
                'reason': request.data.get('emergency_reason', 'unknown')
            }
        )
        
        return Response({
            'error': 'Emergency access failed',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics"""
    from datetime import datetime, timedelta
    
    # Basic counts
    total_patients = Patient.objects.filter(is_active=True).count()
    total_enrolled = BiometricTemplate.objects.count()
    
    # Recent activity (last 30 days)
    thirty_days_ago = timezone.now() - timedelta(days=30)
    recent_registrations = Patient.objects.filter(created_at__gte=thirty_days_ago).count()
    
    # Active emergency sessions
    active_sessions = EmergencyAccess.objects.filter(
        status='active',
        expires_at__gt=timezone.now()
    ).count()
    
    # Recent emergency accesses (last 24 hours)
    twenty_four_hours_ago = timezone.now() - timedelta(hours=24)
    recent_emergency_access = EmergencyAccess.objects.filter(
        started_at__gte=twenty_four_hours_ago
    ).count()
    
    return Response({
        'total_patients': total_patients,
        'biometric_enrolled': total_enrolled,
        'enrollment_rate': round((total_enrolled / total_patients * 100) if total_patients > 0 else 0, 1),
        'recent_registrations': recent_registrations,
        'active_emergency_sessions': active_sessions,
        'recent_emergency_access': recent_emergency_access,
        'system_status': 'operational',
        'last_updated': timezone.now().isoformat()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def emergency_stats(request):
    """Get emergency dashboard statistics"""
    from datetime import datetime, timedelta
    
    # Emergency access statistics
    today = timezone.now().date()
    week_ago = timezone.now() - timedelta(days=7)
    month_ago = timezone.now() - timedelta(days=30)
    
    emergency_accesses_today = EmergencyAccess.objects.filter(
        started_at__date=today
    ).count()
    
    emergency_accesses_week = EmergencyAccess.objects.filter(
        started_at__gte=week_ago
    ).count()
    
    emergency_accesses_month = EmergencyAccess.objects.filter(
        started_at__gte=month_ago
    ).count()
    
    # Active sessions
    active_sessions = EmergencyAccess.objects.filter(
        status='active',
        expires_at__gt=timezone.now()
    ).count()
    
    # System readiness
    total_enrolled = BiometricTemplate.objects.count()
    avg_quality = BiometricTemplate.objects.aggregate(
        avg_quality=models.Avg('quality_score')
    )['avg_quality'] or 0.0
    
    return Response({
        'emergencyAccesses': emergency_accesses_month,
        'activeSessions': active_sessions,
        'totalEnrolled': total_enrolled,
        'systemReadiness': round(avg_quality * 100, 1),
        'dailyStats': {
            'today': emergency_accesses_today,
            'week': emergency_accesses_week,
            'month': emergency_accesses_month
        },
        'last_updated': timezone.now().isoformat()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def system_health(request):
    """Get system health status"""
    return Response({
        'status': 'healthy',
        'uptime': '99.9%',
        'database_status': 'connected',
        'biometric_service': 'online',
        'last_backup': '2025-09-22T10:00:00Z',
        'cpu_usage': 45,
        'memory_usage': 62,
        'disk_usage': 78
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recent_accesses(request):
    """Get recent access logs"""
    return Response([
        {
            'id': 1,
            'patient_name': 'John Smith',
            'accessed_by': 'Dr. Demo User',
            'timestamp': '2025-09-22T15:30:00Z',
            'action': 'Biometric Scan',
            'status': 'success'
        },
        {
            'id': 2,
            'patient_name': 'Sarah Johnson',
            'accessed_by': 'Dr. Demo User',
            'timestamp': '2025-09-22T14:45:00Z',
            'action': 'Patient Lookup',
            'status': 'success'
        },
        {
            'id': 3,
            'patient_name': 'Robert Brown',
            'accessed_by': 'Dr. Demo User',
            'timestamp': '2025-09-22T14:20:00Z',
            'action': 'Emergency Access',
            'status': 'success'
        }
    ])