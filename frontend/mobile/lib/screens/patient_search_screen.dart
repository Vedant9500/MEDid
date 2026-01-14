import 'dart:async';
import 'package:flutter/material.dart';
import '../services/patient_service.dart';
import 'patient_details_screen.dart';

class PatientSearchScreen extends StatefulWidget {
  const PatientSearchScreen({super.key});

  @override
  State<PatientSearchScreen> createState() => _PatientSearchScreenState();
}

class _PatientSearchScreenState extends State<PatientSearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final PatientService _patientService = PatientService();

  List<dynamic> _searchResults = [];
  bool _isLoading = false;
  Timer? _debounce;
  String? _error;

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();

    if (query.isEmpty) {
      setState(() {
        _searchResults = [];
        _error = null;
      });
      return;
    }

    _debounce = Timer(const Duration(milliseconds: 500), () {
      _performSearch(query);
    });
  }

  Future<void> _performSearch(String query) async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final results = await _patientService.searchPatients(query);
      setState(() {
        _searchResults = results;
        _isLoading = false;
        if (results.isEmpty) {
          _error = 'No patients found';
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Search failed. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search Patients'),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
        elevation: 0,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Search by Name, ID, or Phone',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _isLoading
                    ? const Padding(
                        padding: EdgeInsets.all(12.0),
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchController.clear();
                          _onSearchChanged('');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.grey[100],
              ),
            ),
          ),
          Expanded(child: _buildResultsList()),
        ],
      ),
    );
  }

  Widget _buildResultsList() {
    if (_searchResults.isEmpty && !_isLoading && _error == null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.person_search, size: 64, color: Colors.grey[300]),
            const SizedBox(height: 16),
            Text(
              'Start typing to search',
              style: TextStyle(color: Colors.grey[500], fontSize: 16),
            ),
          ],
        ),
      );
    }

    if (_error != null && !_isLoading) {
      return Center(
        child: Text(_error!, style: const TextStyle(color: Colors.grey)),
      );
    }

    return ListView.builder(
      itemCount: _searchResults.length,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemBuilder: (context, index) {
        final patient = _searchResults[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: ListTile(
            contentPadding: const EdgeInsets.all(12),
            leading: CircleAvatar(
              backgroundColor: Colors.blueAccent.withOpacity(0.1),
              child: Text(
                (patient['name'] ?? 'U')[0].toUpperCase(),
                style: const TextStyle(
                  color: Colors.blueAccent,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            title: Text(
              patient['name'] ?? 'Unknown',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 4),
                Text('ID: ${patient['id']?.substring(0, 8)}...'),
                Text('${patient['gender']} • ${patient['blood_group']}'),
              ],
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => PatientDetailsScreen(patient: patient),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
