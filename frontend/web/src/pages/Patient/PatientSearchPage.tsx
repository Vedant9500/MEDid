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

interface Patient {
  id: string;
  name: string;
  age: number;
  bloodType: string;
  lastVisit: string;
  status: 'active' | 'inactive';
  emergencyContact: string;
  allergies: string[];
}

const PatientSearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients] = useState<Patient[]>([
    {
      id: 'PAT-001247',
      name: 'John Smith',
      age: 45,
      bloodType: 'O+',
      lastVisit: '2024-01-15',
      status: 'active',
      emergencyContact: 'Jane Smith (Wife)',
      allergies: ['Penicillin'],
    },
    {
      id: 'PAT-001246',
      name: 'Sarah Johnson',
      age: 32,
      bloodType: 'A-',
      lastVisit: '2024-01-14',
      status: 'active',
      emergencyContact: 'Mike Johnson (Husband)',
      allergies: [],
    },
    {
      id: 'PAT-001245',
      name: 'Robert Brown',
      age: 67,
      bloodType: 'B+',
      lastVisit: '2024-01-13',
      status: 'active',
      emergencyContact: 'Lisa Brown (Sister)',
      allergies: ['Aspirin', 'Shellfish'],
    },
  ]);

  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <Grid container spacing={3}>
        {filteredPatients.map((patient) => (
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
                    label={patient.status}
                    color={patient.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    <strong>Age:</strong> {patient.age} years
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Blood Type:</strong> {patient.bloodType}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Last Visit:</strong> {patient.lastVisit}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Emergency Contact:</strong> {patient.emergencyContact}
                  </Typography>
                </Box>

                {patient.allergies.length > 0 && (
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

      {/* Pagination */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <Pagination count={10} color="primary" />
      </Box>
    </Box>
  );
};

export default PatientSearchPage;