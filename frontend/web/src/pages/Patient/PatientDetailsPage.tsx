import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Typography,
    Card,
    CardContent,
    Grid,
    Chip,
    Button,
    CircularProgress,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Alert,
} from '@mui/material';
import {
    ArrowBack,
    Person,
    MedicalServices,
    LocalPharmacy,
    Warning,
    Phone,
    Event,
    Bloodtype,
} from '@mui/icons-material';
import apiService from '../../services/api';
import { Patient } from '../../types';

const PatientDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPatient = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const data = await apiService.getPatient(id);
                setPatient(data);
            } catch (err) {
                console.error('Failed to fetch patient details:', err);
                setError('Failed to load patient details. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchPatient();
    }, [id]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !patient) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">{error || 'Patient not found'}</Alert>
                <Button
                    startIcon={<ArrowBack />}
                    onClick={() => navigate('/search')}
                    sx={{ mt: 2 }}
                >
                    Back to Search
                </Button>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button startIcon={<ArrowBack />} onClick={() => navigate('/search')}>
                    Back
                </Button>
                <Typography variant="h4" fontWeight="bold">
                    Patient Details
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Header Card */}
                <Grid item xs={12}>
                    <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Box
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        bgcolor: 'white',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Person sx={{ fontSize: 48, color: 'primary.main' }} />
                                </Box>
                                <Box>
                                    <Typography variant="h5" fontWeight="bold">
                                        {patient.name}
                                    </Typography>
                                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                                        ID: {patient.id}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                        <Chip
                                            label={patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
                                            size="small"
                                            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }}
                                        />
                                        <Chip
                                            label={patient.blood_group}
                                            size="small"
                                            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'inherit' }}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Medical History */}
                <Grid item xs={12} md={8}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                                <MedicalServices sx={{ mr: 1, color: 'primary.main' }} />
                                Clinical Information
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                    Emergency Summary
                                </Typography>
                                <Box
                                    sx={{
                                        p: 2,
                                        bgcolor: '#fff0f0',
                                        border: '1px solid #ffcccc',
                                        borderRadius: 1,
                                    }}
                                >
                                    <Typography variant="body1">
                                        {patient.emergency_summary || 'No emergency summary available.'}
                                    </Typography>
                                </Box>
                            </Box>

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Allergies
                                    </Typography>
                                    {patient.allergies.length > 0 ? (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {patient.allergies.map((allergy) => (
                                                <Chip
                                                    key={allergy}
                                                    label={allergy}
                                                    color="error"
                                                    variant="outlined"
                                                    size="small"
                                                    icon={<Warning fontSize="small" />}
                                                />
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography variant="body2">No known allergies</Typography>
                                    )}
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                        Medical Conditions
                                    </Typography>
                                    {patient.medical_conditions.length > 0 ? (
                                        <List dense disablePadding>
                                            {patient.medical_conditions.map((condition, idx) => (
                                                <ListItem key={idx} disablePadding>
                                                    <ListItemIcon sx={{ minWidth: 28 }}>
                                                        <LocalPharmacy fontSize="small" color="primary" />
                                                    </ListItemIcon>
                                                    <ListItemText primary={condition} />
                                                </ListItem>
                                            ))}
                                        </List>
                                    ) : (
                                        <Typography variant="body2">None recorded</Typography>
                                    )}
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Sidebar Info */}
                <Grid item xs={12} md={4}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Contact Info
                            </Typography>
                            <Divider sx={{ mb: 2 }} />

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="text.secondary">
                                    Emergency Contact
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                    <Phone fontSize="small" sx={{ mr: 1, color: 'success.main' }} />
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">
                                            {patient.emergency_contact_name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {patient.emergency_contact_phone}
                                        </Typography>
                                    </Box>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default PatientDetailsPage;
