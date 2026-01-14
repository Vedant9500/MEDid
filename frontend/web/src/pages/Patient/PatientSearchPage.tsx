import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Avatar,
  IconButton,
  Pagination,
  InputAdornment,
} from '@mui/material';
import {
  Search,
  Person,
  LocalHospital,
  Visibility,
  Edit,
  FilterList,
} from '@mui/icons-material';
import apiService from '../../services/api';
import { Patient } from '../../types';
import { useNavigate } from 'react-router-dom';

const PatientSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setPatients([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const results = await apiService.searchPatients(query);
      setPatients(results);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Failed to search patients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) handleSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        Patient Search
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Search and manage patient records securely
      </Typography>

      {/* Search Bar */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Search by patient name or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton>
                  <FilterList />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 600 }}
        />
      </Box>

      {/* Results */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Typography>Loading...</Typography>
        </Box>
      ) : error ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {patients.map((patient) => (
            <Grid item xs={12} md={6} lg={4} key={patient.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      <Person />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight="600">
                        {patient.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {patient.id}
                      </Typography>
                    </Box>
                    <Chip
                      label={patient.is_active ? 'Active' : 'Inactive'}
                      color={patient.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      <strong>Age:</strong> {patient.age || 'N/A'} years
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Blood Type:</strong> {patient.blood_group}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Last Visit:</strong> {patient.last_accessed ? new Date(patient.last_accessed).toLocaleDateString() : 'N/A'}
                    </Typography>
                    <Typography variant="body2" gutterBottom>
                      <strong>Emergency Contact:</strong> {patient.emergency_contact_name}
                    </Typography>
                  </Box>

                  {patient.allergies && patient.allergies.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" gutterBottom>
                        <strong>Allergies:</strong>
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {patient.allergies.map((allergy) => (
                          <Chip
                            key={allergy}
                            label={allergy}
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<Visibility />}
                      fullWidth
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Edit />}
                      fullWidth
                    >
                      Edit
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Pagination count={10} color="primary" />
      </Box>
    </Box>
  );
};

export default PatientSearchPage;