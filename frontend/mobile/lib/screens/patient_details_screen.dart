import 'package:flutter/material.dart';

class PatientDetailsScreen extends StatelessWidget {
  final Map<String, dynamic> patient;

  const PatientDetailsScreen({super.key, required this.patient});

  @override
  Widget build(BuildContext context) {
    // Decrypted data is already provided by the backend search endpoint

    // Check if we have the full structure or flat structure from search
    // The backend search view returns a list of patient summaries usually,
    // but our new search endpoint might return full details or we might need to fetch details.
    // For this implementation, let's assume the search returns sufficient info or we display what we have.

    return Scaffold(
      appBar: AppBar(
        title: const Text('Patient Details'),
        backgroundColor: Colors.blueAccent,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeaderCard(),
            const SizedBox(height: 16),
            _buildSectionTitle('Medical Information'),
            _buildInfoCard(
              title: 'Allergies',
              content: _formatList(patient['allergies']),
              icon: Icons.warning_amber_rounded,
              color: Colors.orange,
            ),
            _buildInfoCard(
              title: 'Current Medications',
              content: _formatList(patient['current_medications']),
              icon: Icons.medication,
              color: Colors.blue,
            ),
            _buildInfoCard(
              title: 'Medical Conditions',
              content: _formatList(patient['medical_conditions']),
              icon: Icons.local_hospital,
              color: Colors.red,
            ),
            const SizedBox(height: 16),
            _buildSectionTitle('Emergency Summary'),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.redAccent),
              ),
              child: Text(
                patient['emergency_summary'] ??
                    'No emergency summary available.',
                style: const TextStyle(fontSize: 16, height: 1.5),
              ),
            ),
            const SizedBox(height: 24),
            _buildSectionTitle('Emergency Contact'),
            _buildInfoCard(
              title: patient['emergency_contact_name'] ?? 'N/A',
              content: patient['emergency_contact_phone'] ?? 'N/A',
              icon: Icons.phone_in_talk,
              color: Colors.green,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            CircleAvatar(
              radius: 40,
              backgroundColor: Colors.blueAccent.withOpacity(0.2),
              child: Text(
                (patient['name'] ?? 'U')[0].toUpperCase(),
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: Colors.blueAccent,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    patient['name'] ?? 'Unknown',
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text('ID: ${patient['id']?.substring(0, 8) ?? 'N/A'}...'),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      _buildTag(patient['gender'] ?? 'N/A', Colors.grey),
                      const SizedBox(width: 8),
                      _buildTag(
                        patient['blood_group'] ?? 'N/A',
                        Colors.redAccent,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8.0),
      child: Text(
        title,
        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
      ),
    );
  }

  Widget _buildInfoCard({
    required String title,
    required String content,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          content.isEmpty ? 'None' : content,
          style: const TextStyle(fontSize: 15),
        ),
      ),
    );
  }

  Widget _buildTag(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color.withOpacity(0.9),
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  String _formatList(dynamic list) {
    if (list == null) return 'None';
    if (list is List) return list.join(', ');
    if (list is String) return list;
    return 'None';
  }
}
