import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiConfig {
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:8000';
    try {
      if (Platform.isAndroid) return 'http://192.168.31.234:8000';
    } catch (e) {
      // Platform.isAndroid throws on web, but we checked kIsWeb first.
      // Just in case of other errors.
    }
    return 'http://localhost:8000';
  }

  static String get authLogin => '$baseUrl/auth/login';
  static String get patientRegister => '$baseUrl/patients/register';
}
