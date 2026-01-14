import React, { useState, useRef } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Alert,
  Paper,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import {
  Person,
  CameraAlt,
  Security,
  CheckCircle,
  Warning,
  Add,
  Delete,
  Save,
  Cancel,
  Refresh,
  PersonAdd,
  Fingerprint,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Webcam from 'react-webcam';
import { useSnackbar } from 'notistack';

import { Patient, MedicalRecord, Medication } from '../../types';
import apiService from '../../services/api';

// Validation schema
const patientSchema = yup.object().shape({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  date_of_birth: yup.string().required('Date of birth is required'),
  gender: yup.string().required('Gender is required'),
  blood_group: yup.string().required('Blood group is required'),
  emergency_contact_phone: yup.string().required('Emergency contact is required').min(10, 'Valid phone number required'),
  emergency_contact_name: yup.string().required('Emergency contact name is required'),
  consentGranted: yup.boolean().oneOf([true], 'Consent must be granted to proceed'),
});

interface RegistrationData extends Omit<Partial<Patient>, 'gender'> {
  gender?: string;
  consentGranted?: boolean;
  biometricTemplate?: string;
  qualityScore?: number;
}

const steps = [
  'Personal Information',
  'Medical History',
  'Biometric Enrollment',
  'Review & Submit'
];

const PatientRegistrationPage: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const { enqueueSnackbar } = useSnackbar();

  const [activeStep, setActiveStep] = useState(0);
  const [registrationData, setRegistrationData] = useState<RegistrationData>({});
  const [medicalHistory, setMedicalHistory] = useState<MedicalRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [biometricQuality, setBiometricQuality] = useState<any>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form handling
  const {
    control,
    handleSubmit,
    formState: { errors },
    getValues,
    watch,
  } = useForm<RegistrationData>({
    resolver: yupResolver(patientSchema),
    defaultValues: {
      name: '',
      date_of_birth: '',
      gender: '',
      blood_group: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      consentGranted: false,
      ...registrationData,
    },
  });

  // Check camera on mount
  React.useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => setHasCamera(true))
      .catch(() => setHasCamera(false));
  }, []);

  const nextStep = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handlePersonalInfoSubmit = (data: RegistrationData) => {
    setRegistrationData({ ...registrationData, ...data });
    nextStep();
  };

  const handleBiometricCapture = async () => {
    if (!webcamRef.current) return;

    setIsCapturing(true);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new (Error as any)('Failed to capture image');
      }

      // Convert to File
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], 'enrollment.jpg', { type: 'image/jpeg' });

      // Extract biometric template
      const result = await apiService.extractBiometricTemplate(file);

      if (result.success) {
        setRegistrationData(prev => ({
          ...prev,
          biometricTemplate: result.template_data,
          qualityScore: result.quality_score,
        }));

        setBiometricQuality({ overall_quality: result.quality_score });

        enqueueSnackbar('Biometric template captured successfully!', { variant: 'success' });
        nextStep();
      } else {
        throw new (Error as any)('Failed to extract biometric template');
      }

    } catch (error) {
      enqueueSnackbar(
        `Biometric capture failed: ${apiService.handleApiError(error)}`,
        { variant: 'error' }
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const addMedicalRecord = () => {
    const newRecord: MedicalRecord = {
      id: `temp-${Date.now()}`,
      type: 'diagnosis',
      description: '',
      date: new Date(),
      doctor: '',
      severity: 'low',
      status: 'active',
    };
    setMedicalHistory([...medicalHistory, newRecord]);
  };

  const updateMedicalRecord = (index: number, field: keyof MedicalRecord, value: any) => {
    const updated = [...medicalHistory];
    updated[index] = { ...updated[index], [field]: value };
    setMedicalHistory(updated);
  };

  const removeMedicalRecord = (index: number) => {
    setMedicalHistory(medicalHistory.filter((_, i) => i !== index));
  };

  const addMedication = () => {
    const newMedication: Medication = {
      id: `temp-${Date.now()}`,
      name: '',
      dosage: '',
      frequency: '',
      startDate: new Date(),
      prescribedBy: '',
    };
    setMedications([...medications, newMedication]);
  };

  const updateMedication = (index: number, field: keyof Medication, value: any) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const addAllergy = (allergy: string) => {
    if (allergy.trim() && !allergies.includes(allergy.trim())) {
      setAllergies([...allergies, allergy.trim()]);
    }
  };

  const removeAllergy = (index: number) => {
    setAllergies(allergies.filter((_, i) => i !== index));
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const finalData: Partial<Patient> = {
        ...registrationData,
        medicalHistory,
        medications,
        allergies,
        biometricEnrolled: !!registrationData.biometricTemplate,
      } as unknown as Partial<Patient>;

      // Remove non-patient fields
      delete (finalData as any).consentGranted;
      delete (finalData as any).biometricTemplate;
      delete (finalData as any).qualityScore;

      const newPatient = await apiService.createPatient(finalData);

      enqueueSnackbar(
        `Patient ${newPatient.name} registered successfully!`,
        { variant: 'success' }
      );

      // Reset form
      setActiveStep(0);
      setRegistrationData({});
      setMedicalHistory([]);
      setMedications([]);
      setAllergies([]);
      setBiometricQuality(null);

    } catch (error) {
      enqueueSnackbar(
        `Registration failed: ${apiService.handleApiError(error)}`,
        { variant: 'error' }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderPersonalInfoForm = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Personal Information
        </Typography>

        <form onSubmit={handleSubmit(handlePersonalInfoSubmit)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Full Name"
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="date_of_birth"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Date of Birth"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    error={!!errors.date_of_birth}
                    helperText={errors.date_of_birth?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Gender</InputLabel>
                <Controller
                  name="gender"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} value={field.value || ''} label="Gender" error={!!errors.gender}>
                      <MenuItem value="M">Male</MenuItem>
                      <MenuItem value="F">Female</MenuItem>
                      <MenuItem value="O">Other</MenuItem>
                      <MenuItem value="U">Prefer not to say</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Blood Group</InputLabel>
                <Controller
                  name="blood_group"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} value={field.value || ''} label="Blood Group" error={!!errors.blood_group}>
                      <MenuItem value="A+">A+</MenuItem>
                      <MenuItem value="A-">A-</MenuItem>
                      <MenuItem value="B+">B+</MenuItem>
                      <MenuItem value="B-">B-</MenuItem>
                      <MenuItem value="AB+">AB+</MenuItem>
                      <MenuItem value="AB-">AB-</MenuItem>
                      <MenuItem value="O+">O+</MenuItem>
                      <MenuItem value="O-">O-</MenuItem>
                    </Select>
                  )}
                />
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="emergency_contact_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Emergency Contact Name"
                    placeholder="John Doe"
                    error={!!errors.emergency_contact_name}
                    helperText={errors.emergency_contact_name?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="emergency_contact_phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Emergency Contact Phone"
                    placeholder="+1-555-0123"
                    error={!!errors.emergency_contact_phone}
                    helperText={errors.emergency_contact_phone?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Controller
                name="consentGranted"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Checkbox
                        {...field}
                        checked={field.value || false}
                        color="primary"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        I consent to the collection and storage of my biometric data for emergency medical identification purposes.
                        I understand that this data will be encrypted and used only for legitimate medical emergencies.
                      </Typography>
                    }
                  />
                )}
              />
              {errors.consentGranted && (
                <Typography variant="caption" color="error">
                  {errors.consentGranted.message}
                </Typography>
              )}
            </Grid>
          </Grid>

          <Box display="flex" justifyContent="end" mt={3}>
            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<Person />}
            >
              Continue to Medical History
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );

  const renderMedicalHistoryForm = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Medical History & Medications
        </Typography>

        {/* Allergies Section */}
        <Box mb={4}>
          <Typography variant="subtitle1" gutterBottom>
            Allergies
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {allergies.map((allergy, index) => (
              <Chip
                key={index}
                label={allergy}
                onDelete={() => removeAllergy(index)}
                color="warning"
                variant="outlined"
              />
            ))}
          </Box>
          <TextField
            placeholder="Add allergy and press Enter"
            size="small"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                addAllergy((e.target as HTMLInputElement).value);
                (e.target as HTMLInputElement).value = '';
              }
            }}
          />
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Medical Records Section */}
        <Box mb={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1">Medical Records</Typography>
            <Button
              onClick={addMedicalRecord}
              startIcon={<Add />}
              variant="outlined"
              size="small"
            >
              Add Record
            </Button>
          </Box>

          {medicalHistory.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {medicalHistory.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select
                          value={record.type}
                          onChange={(e) => updateMedicalRecord(index, 'type', e.target.value)}
                          size="small"
                        >
                          <MenuItem value="diagnosis">Diagnosis</MenuItem>
                          <MenuItem value="procedure">Procedure</MenuItem>
                          <MenuItem value="allergy">Allergy</MenuItem>
                          <MenuItem value="vital_signs">Vital Signs</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={record.description}
                          onChange={(e) => updateMedicalRecord(index, 'description', e.target.value)}
                          size="small"
                          fullWidth
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={record.severity}
                          onChange={(e) => updateMedicalRecord(index, 'severity', e.target.value)}
                          size="small"
                        >
                          <MenuItem value="low">Low</MenuItem>
                          <MenuItem value="medium">Medium</MenuItem>
                          <MenuItem value="high">High</MenuItem>
                          <MenuItem value="critical">Critical</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={record.status}
                          onChange={(e) => updateMedicalRecord(index, 'status', e.target.value)}
                          size="small"
                        >
                          <MenuItem value="active">Active</MenuItem>
                          <MenuItem value="resolved">Resolved</MenuItem>
                          <MenuItem value="chronic">Chronic</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => removeMedicalRecord(index)}
                          color="error"
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        <Box display="flex" justifyContent="space-between" mt={3}>
          <Button onClick={prevStep} startIcon={<Cancel />}>
            Back
          </Button>
          <Button
            onClick={nextStep}
            variant="contained"
            size="large"
            startIcon={<Fingerprint />}
          >
            Continue to Biometric Enrollment
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  const renderBiometricForm = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Biometric Enrollment
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          Your facial biometric will be encrypted and stored securely for emergency medical identification.
        </Alert>

        {hasCamera === false ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            Camera access is required for biometric enrollment. Please allow camera permissions.
          </Alert>
        ) : hasCamera === null ? (
          <Box display="flex" justifyContent="center" py={4}>
            <Typography>Requesting camera access...</Typography>
          </Box>
        ) : (
          <Box>
            <Paper
              elevation={2}
              sx={{
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 3,
                aspectRatio: '4/3',
                background: '#000',
              }}
            >
              <Webcam
                ref={webcamRef}
                audio={false}
                width="100%"
                height="100%"
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  width: 640,
                  height: 480,
                  facingMode: 'user',
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />

              {isCapturing && (
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  bgcolor="rgba(0,0,0,0.7)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexDirection="column"
                  color="white"
                >
                  <Typography variant="h6" mb={2}>
                    Processing biometric data...
                  </Typography>
                  <LinearProgress sx={{ width: '80%' }} />
                </Box>
              )}
            </Paper>

            {biometricQuality && (
              <Alert severity="success" sx={{ mb: 2 }}>
                <Typography variant="subtitle2">
                  Biometric template captured successfully!
                </Typography>
                <Typography variant="caption">
                  Quality Score: {(biometricQuality.overall_quality * 100).toFixed(1)}%
                </Typography>
              </Alert>
            )}

            <Box display="flex" justifyContent="center" gap={2} mb={3}>
              <Button
                onClick={handleBiometricCapture}
                disabled={isCapturing}
                variant="contained"
                size="large"
                startIcon={<CameraAlt />}
              >
                {isCapturing ? 'Processing...' : 'Capture Biometric'}
              </Button>
            </Box>
          </Box>
        )}

        <Box display="flex" justifyContent="space-between" mt={3}>
          <Button onClick={prevStep} startIcon={<Cancel />}>
            Back
          </Button>
          {registrationData.biometricTemplate && (
            <Button
              onClick={nextStep}
              variant="contained"
              size="large"
              startIcon={<CheckCircle />}
            >
              Review Registration
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );

  const renderReviewForm = () => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Review Registration
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Personal Information
              </Typography>
              <Typography variant="body2">Name: {registrationData.name}</Typography>
              <Typography variant="body2">DOB: {registrationData.date_of_birth || registrationData.dateOfBirth}</Typography>
              <Typography variant="body2">Gender: {registrationData.gender}</Typography>
              <Typography variant="body2">Blood Group: {registrationData.blood_group}</Typography>
              <Typography variant="body2">Emergency Contact: {registrationData.emergency_contact_name} - {registrationData.emergency_contact_phone}</Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                Medical Data
              </Typography>
              <Typography variant="body2">Allergies: {allergies.length}</Typography>
              <Typography variant="body2">Medical Records: {medicalHistory.length}</Typography>
              <Typography variant="body2">Medications: {medications.length}</Typography>
              <Typography variant="body2">
                Biometric: {registrationData.biometricTemplate ? 'Enrolled' : 'Not enrolled'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="space-between" mt={4}>
          <Button onClick={prevStep} startIcon={<Cancel />}>
            Back
          </Button>
          <Button
            onClick={handleFinalSubmit}
            disabled={submitting}
            variant="contained"
            size="large"
            startIcon={submitting ? undefined : <Save />}
            color="success"
          >
            {submitting ? 'Registering...' : 'Complete Registration'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box display="flex" alignItems="center" mb={4}>
          <PersonAdd sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Box>
            <Typography variant="h3" fontWeight="bold">
              Patient Registration
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Register new patients for secure biometric emergency access
            </Typography>
          </Box>
        </Box>
      </motion.div>

      {/* Stepper */}
      <Box mb={4}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeStep === 0 && renderPersonalInfoForm()}
          {activeStep === 1 && renderMedicalHistoryForm()}
          {activeStep === 2 && renderBiometricForm()}
          {activeStep === 3 && renderReviewForm()}
        </motion.div>
      </AnimatePresence>
    </Container>
  );
};

export default PatientRegistrationPage;