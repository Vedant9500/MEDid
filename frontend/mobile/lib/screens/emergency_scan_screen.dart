import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'dart:convert';
import '../services/patient_service.dart';

class EmergencyScanScreen extends StatefulWidget {
  final List<CameraDescription> cameras;

  const EmergencyScanScreen({super.key, required this.cameras});

  @override
  State<EmergencyScanScreen> createState() => _EmergencyScanScreenState();
}

class _EmergencyScanScreenState extends State<EmergencyScanScreen> {
  late CameraController _cameraController;
  late Future<void> _initializeControllerFuture;
  bool _isProcessing = false;
  Map<String, dynamic>? _matchResult;

  @override
  void initState() {
    super.initState();
    if (widget.cameras.isNotEmpty) {
      _cameraController = CameraController(
        widget.cameras.first,
        ResolutionPreset.medium,
      );
      _initializeControllerFuture = _cameraController.initialize();
    }
  }

  @override
  void dispose() {
    if (widget.cameras.isNotEmpty) {
      _cameraController.dispose();
    }
    super.dispose();
  }

  Future<void> _performScan() async {
    setState(() {
      _isProcessing = true;
      _matchResult = null;
    });

    try {
      await _initializeControllerFuture;
      final image = await _cameraController.takePicture();
      final bytes = await image.readAsBytes();
      final base64Image = base64Encode(bytes);

      final patientService = PatientService();
      final result = await patientService.biometricScan(base64Image);

      setState(() {
        _matchResult = result;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error during scan: $e')));
      }
    } finally {
      if (mounted) {
        setState(() {
          _isProcessing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Emergency Biometric Scan')),
      body: Column(
        children: [
          Expanded(
            flex: 2,
            child: Container(
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.red, width: 2),
                borderRadius: BorderRadius.circular(16),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: widget.cameras.isEmpty
                    ? const Center(child: Text('No camera found'))
                    : FutureBuilder<void>(
                        future: _initializeControllerFuture,
                        builder: (context, snapshot) {
                          if (snapshot.connectionState ==
                              ConnectionState.done) {
                            return CameraPreview(_cameraController);
                          } else {
                            return const Center(
                              child: CircularProgressIndicator(),
                            );
                          }
                        },
                      ),
              ),
            ),
          ),
          if (_isProcessing)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Column(
                children: [
                  CircularProgressIndicator(color: Colors.red),
                  SizedBox(height: 8),
                  Text('Matching face against database...'),
                ],
              ),
            ),
          if (_matchResult != null) _buildResultSection(),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: ElevatedButton.icon(
              onPressed: _isProcessing ? null : _performScan,
              icon: const Icon(Icons.emergency),
              label: const Text('START EMERGENCY SCAN'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 60),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildResultSection() {
    if (_matchResult!['success'] == false ||
        _matchResult!['patient_found'] == false) {
      return Container(
        padding: const EdgeInsets.all(16),
        margin: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.orange.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.orange),
        ),
        child: const Row(
          children: [
            Icon(Icons.warning, color: Colors.orange),
            SizedBox(width: 12),
            Expanded(child: Text('No patient found in the database.')),
          ],
        ),
      );
    }

    final patientData = _matchResult!['patient_data'];
    return Expanded(
      flex: 3,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'MATCH FOUND',
              style: TextStyle(
                color: Colors.green,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            const Divider(),
            _buildInfoRow('Name', patientData['name'] ?? 'N/A'),
            _buildInfoRow('Blood Group', patientData['blood_group'] ?? 'N/A'),
            _buildInfoRow('Age', (patientData['age'] ?? 'N/A').toString()),
            const SizedBox(height: 16),
            const Text(
              'EMERGENCY SUMMARY',
              style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red),
            ),
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(top: 8),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.withOpacity(0.3)),
              ),
              child: Text(
                patientData['emergency_summary'] ??
                    'No emergency summary available.',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildInfoRow(
              'Emergency Contact',
              patientData['emergency_contact_name'] ?? 'N/A',
            ),
            _buildInfoRow(
              'Contact Phone',
              patientData['emergency_contact_phone'] ?? 'N/A',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
