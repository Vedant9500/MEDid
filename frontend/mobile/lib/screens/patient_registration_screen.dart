import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class PatientRegistrationScreen extends StatefulWidget {
  final List<CameraDescription> cameras;

  const PatientRegistrationScreen({super.key, required this.cameras});

  @override
  State<PatientRegistrationScreen> createState() => _PatientRegistrationScreenState();
}

class _PatientRegistrationScreenState extends State<PatientRegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  late CameraController _cameraController;
  late Future<void> _initializeControllerFuture;
  
  // Form fields
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _ageController = TextEditingController();
  final _historyController = TextEditingController();
  
  XFile? _capturedImage;

  @override
  void initState() {
    super.initState();
    // Initialize first available camera
    _cameraController = CameraController(
      widget.cameras.first,
      ResolutionPreset.medium,
    );
    _initializeControllerFuture = _cameraController.initialize();
  }

  @override
  void dispose() {
    _cameraController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _ageController.dispose();
    _historyController.dispose();
    super.dispose();
  }

  Future<void> _takePicture() async {
    try {
      await _initializeControllerFuture;
      final image = await _cameraController.takePicture();
      setState(() {
        _capturedImage = image;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error taking picture: $e')),
      );
    }
  }

  void _retakePicture() {
    setState(() {
      _capturedImage = null;
    });
  }

  Future<void> _submitRegistration() async {
    if (_capturedImage == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please capture a face photo first')),
      );
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    try {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Processing Registration...')),
      );

      final bytes = await _capturedImage!.readAsBytes();
      final base64Image = base64Encode(bytes);

      // TODO: Move API call to a proper Service class
      final token = await Provider.of<AuthProvider>(context, listen: false).getToken();
      
      final response = await http.post(
        Uri.parse(ApiConfig.patientRegister),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Token $token', // Django Token Auth
        },
        body: jsonEncode({
          'name': '${_firstNameController.text} ${_lastNameController.text}',
          'date_of_birth': '1990-01-01', // TODO: Add Date Picker
          'gender': 'M', // TODO: Add Dropdown
          'blood_group': 'O+', // TODO: Add Dropdown
          'emergency_contact_name': 'Unknown',
          'emergency_contact_phone': '0000000000',
          'consent_status': 'granted',
          'face_image_base64': base64Image,
        }),
      );

      if (response.statusCode == 201) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Patient Registered Successfully!')),
          );
          // Clear form
          _firstNameController.clear();
          _lastNameController.clear();
          _ageController.clear();
          _retakePicture();
        }
      } else {
        throw Exception('Failed: ${response.body}');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Patient Registration')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // --- FORM SECTION ---
              const Text('Patient Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _firstNameController,
                      decoration: const InputDecoration(labelText: 'First Name'),
                      validator: (v) => v!.isEmpty ? 'Required' : null,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      controller: _lastNameController,
                      decoration: const InputDecoration(labelText: 'Last Name'),
                      validator: (v) => v!.isEmpty ? 'Required' : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _ageController,
                decoration: const InputDecoration(labelText: 'Age'),
                keyboardType: TextInputType.number,
                 validator: (v) => v!.isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _historyController,
                decoration: const InputDecoration(labelText: 'Medical History (Optional)'),
                maxLines: 3,
              ),
              const SizedBox(height: 24),
              
              // --- CAMERA SECTION ---
              const Text('Biometric Capture', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                height: 300,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(12),
                  color: Colors.black12,
                ),
                child: _capturedImage != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: kIsWeb 
                          ? Image.network(_capturedImage!.path, fit: BoxFit.cover)
                          : Image.network(_capturedImage!.path, fit: BoxFit.cover), // NOTE: On mobile use FileImage(File(path))
                      )
                    : FutureBuilder<void>(
                        future: _initializeControllerFuture,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState == ConnectionState.done) {
                            return ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: CameraPreview(_cameraController),
                            );
                          } else {
                            return const Center(child: CircularProgressIndicator());
                          }
                        },
                      ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _capturedImage == null ? _takePicture : _retakePicture,
                      icon: Icon(_capturedImage == null ? Icons.camera_alt : Icons.refresh),
                      label: Text(_capturedImage == null ? 'Capture Face' : 'Retake'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _capturedImage == null ? Colors.blue : Colors.orange,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: _submitRegistration,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('Register Patient', style: TextStyle(fontSize: 18)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
