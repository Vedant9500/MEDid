import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class PatientService {
  final _storage = const FlutterSecureStorage();

  Future<Map<String, dynamic>> registerPatient({
    required String name,
    required String dateOfBirth,
    required String gender,
    required String bloodGroup,
    required String emergencyContactName,
    required String emergencyContactPhone,
    required String faceImageBase64,
  }) async {
    try {
      final token = await _storage.read(key: 'jwt_token');

      final response = await http.post(
        Uri.parse(ApiConfig.patientRegister),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Token $token',
        },
        body: jsonEncode({
          'name': name,
          'date_of_birth': dateOfBirth,
          'gender': gender,
          'blood_group': bloodGroup,
          'emergency_contact_name': emergencyContactName,
          'emergency_contact_phone': emergencyContactPhone,
          'consent_status': 'granted',
          'face_image_base64': faceImageBase64,
        }),
      );

      if (response.statusCode == 201) {
        return {'success': true, 'data': jsonDecode(response.body)};
      } else {
        return {
          'success': false,
          'message': 'Failed to register: ${response.body}',
        };
      }
    } catch (e) {
      return {'success': false, 'message': 'Connection error: $e'};
    }
  }
}
