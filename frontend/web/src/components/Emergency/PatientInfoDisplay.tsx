import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import {
  Person,
  Bloodtype,
  Phone,
  Warning,
  Medication,
  LocalHospital,
  ExpandMore,
  AccessTime,
  Security,
  Add,
  Emergency,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

import { Patient, MedicalRecord, Medication as MedicationType, EmergencyAccess } from '../../types';
import apiService from '../../services/api';

interface PatientInfoDisplayProps {
  patient: Patient;
  isEmergencyMode?: boolean;
  onEmergencyAccess?: (accessData: Partial<EmergencyAccess>) => void;
}

const PatientInfoDisplay: React.FC<PatientInfoDisplayProps> = ({
  patient,
  isEmergencyMode = false,
  onEmergencyAccess,
}) => {
  const [emergencyDialogOpen, setEmergencyDialogOpen] = useState(false);
  const [emergencyType, setEmergencyType] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [emergencyLocation, setEmergencyLocation] = useState('');

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getBloodGroupColor = (bloodGroup: string) => {
    const colors: Record<string, string> = {
      'O+': '#f44336', 'O-': '#d32f2f',
      'A+': '#2196f3', 'A-': '#1976d2',
      'B+': '#4caf50', 'B-': '#388e3c',
      'AB+': '#ff9800', 'AB-': '#f57c00',
    };
    return colors[bloodGroup] || '#757575';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const handleEmergencyAccess = () => {
    if (onEmergencyAccess) {
      onEmergencyAccess({
        patientId: patient.id,
        emergencyType: emergencyType as any,
        accessReason: emergencyReason,
        location: emergencyLocation,
        timestamp: new Date(),
      });
    }
    setEmergencyDialogOpen(false);
  };

  const criticalInfo = patient.medicalHistory?.filter(
    record => record.severity === 'critical' || record.type === 'allergy'
  ) || [];

  const activeMedications = patient.medications?.filter(
    med => !med.endDate || new Date(med.endDate) > new Date()
  ) || [];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card sx={{ height: '100%' }}>
        <CardContent>
          {/* Header */}
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Box display="flex" alignItems="center">
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'primary.main',
                  mr: 2,
                  fontSize: '1.5rem',
                }}
              >
                <Person fontSize="large" />
              </Avatar>
              
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {patient.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Patient ID: {patient.id}
                </Typography>
                <Box display="flex" alignItems="center" gap={1} mt={1}>
                  <Chip
                    icon={<Person />}
                    label={`${calculateAge(patient.dateOfBirth)} years old`}
                    size="small"
                    variant="outlined"
                  />
                  <Chip
                    icon={<Bloodtype />}
                    label={patient.bloodGroup}
                    size="small"
                    sx={{
                      bgcolor: getBloodGroupColor(patient.bloodGroup),
                      color: 'white',
                      fontWeight: 'bold',
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {isEmergencyMode && (
              <Button
                variant="contained"
                color="error"
                startIcon={<Security />}
                onClick={() => setEmergencyDialogOpen(true)}
              >
                Log Emergency Access
              </Button>
            )}
          </Box>

          {/* Critical Alerts */}
          {criticalInfo.length > 0 && (
            <Alert
              severity="error"
              icon={<Warning />}
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                ⚠️ CRITICAL MEDICAL ALERTS
              </Typography>
              {criticalInfo.map((record, index) => (
                <Typography key={index} variant="body2">
                  • {record.description}
                </Typography>
              ))}
            </Alert>
          )}

          {/* Emergency Contact */}
          <Box mb={2}>
            <Typography variant="h6" gutterBottom>
              Emergency Contact
            </Typography>
            <Box display="flex" alignItems="center">
              <Phone sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1">{patient.emergencyContact}</Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Active Medications */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center">
                <Medication sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Active Medications ({activeMedications.length})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {activeMedications.length > 0 ? (
                <List dense>
                  {activeMedications.map((medication, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Medication color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={medication.name}
                        secondary={`${medication.dosage} - ${medication.frequency}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No active medications recorded
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Allergies */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center">
                <Warning sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Allergies ({patient.allergies?.length || 0})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {patient.allergies && patient.allergies.length > 0 ? (
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {patient.allergies.map((allergy, index) => (
                    <Chip
                      key={index}
                      label={allergy}
                      color="warning"
                      size="small"
                      icon={<Warning />}
                    />
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No known allergies
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Medical History */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center">
                <LocalHospital sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Medical History ({patient.medicalHistory?.length || 0})
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
                <List dense>
                  {patient.medicalHistory
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10) // Show last 10 entries
                    .map((record, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Chip
                            label={record.severity}
                            color={getSeverityColor(record.severity || 'low')}
                            size="small"
                          />
                        </ListItemIcon>
                        <ListItemText
                          primary={record.description}
                          secondary={
                            <Box>
                              <Typography variant="caption">
                                {format(new Date(record.date), 'MMM dd, yyyy')} - Dr. {record.doctor}
                              </Typography>
                              <Chip
                                label={record.status}
                                size="small"
                                variant="outlined"
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No medical history available
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Patient Info Footer */}
          <Box mt={3} pt={2} borderTop={1} borderColor="divider">
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Date of Birth
                </Typography>
                <Typography variant="body2">
                  {format(new Date(patient.dateOfBirth), 'MMM dd, yyyy')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Gender
                </Typography>
                <Typography variant="body2">
                  {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Last Updated
                </Typography>
                <Typography variant="body2">
                  {format(new Date(patient.updatedAt), 'MMM dd, yyyy HH:mm')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">
                  Biometric Status
                </Typography>
                <Chip
                  label={patient.biometricEnrolled ? 'Enrolled' : 'Not Enrolled'}
                  color={patient.biometricEnrolled ? 'success' : 'warning'}
                  size="small"
                />
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Emergency Access Dialog */}
      <Dialog
        open={emergencyDialogOpen}
        onClose={() => setEmergencyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <Emergency sx={{ mr: 1 }} />
            Log Emergency Access
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Emergency Type</InputLabel>
              <Select
                value={emergencyType}
                onChange={(e) => setEmergencyType(e.target.value)}
                label="Emergency Type"
              >
                <MenuItem value="cardiac_arrest">Cardiac Arrest</MenuItem>
                <MenuItem value="trauma">Trauma</MenuItem>
                <MenuItem value="unconscious">Unconscious Patient</MenuItem>
                <MenuItem value="allergic_reaction">Allergic Reaction</MenuItem>
                <MenuItem value="other">Other Emergency</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              margin="normal"
              label="Access Reason"
              multiline
              rows={3}
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
              placeholder="Describe the reason for emergency access..."
            />

            <TextField
              fullWidth
              margin="normal"
              label="Location"
              value={emergencyLocation}
              onChange={(e) => setEmergencyLocation(e.target.value)}
              placeholder="ER Room 5, Trauma Bay 2, etc."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmergencyDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleEmergencyAccess}
            variant="contained"
            color="error"
            disabled={!emergencyType || !emergencyReason || !emergencyLocation}
          >
            Log Access
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default PatientInfoDisplay;