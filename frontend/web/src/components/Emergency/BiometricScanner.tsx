import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
  LinearProgress,
  Chip,
  Grid,
  Divider,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CameraAlt,
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Info,
  Person,
  AccessTime,
  Security,
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from 'notistack';

import { BiometricMatchResult, LivenessCheckResult, Patient } from '../../types';
import apiService from '../../services/api';

interface BiometricScannerProps {
  onScanComplete: (result: BiometricMatchResult) => void;
  onPatientFound: (patient: Patient) => void;
  isEmergencyMode?: boolean;
}

interface QualityIndicator {
  metric: string;
  value: number;
  threshold: number;
  status: 'good' | 'warning' | 'poor';
}

const BiometricScanner: React.FC<BiometricScannerProps> = ({
  onScanComplete,
  onPatientFound,
  isEmergencyMode = false,
}) => {
  const webcamRef = useRef<Webcam>(null);
  const { enqueueSnackbar } = useSnackbar();

  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [qualityIndicators, setQualityIndicators] = useState<QualityIndicator[]>([]);
  const [livenessResult, setLivenessResult] = useState<LivenessCheckResult | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [continuousMode, setContinuousMode] = useState(false);

  // Request camera permission on mount
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => setHasPermission(true))
      .catch(() => setHasPermission(false));
  }, []);

  // Simulate quality analysis from webcam stream
  const analyzeImageQuality = useCallback((imageSrc: string): QualityIndicator[] => {
    // In real implementation, this would analyze the actual image
    const simulatedQuality = [
      {
        metric: 'Resolution',
        value: 85 + Math.random() * 15,
        threshold: 80,
        status: 'good' as const,
      },
      {
        metric: 'Lighting',
        value: 70 + Math.random() * 30,
        threshold: 60,
        status: Math.random() > 0.3 ? 'good' : 'warning' as const,
      },
      {
        metric: 'Focus',
        value: 75 + Math.random() * 25,
        threshold: 70,
        status: Math.random() > 0.2 ? 'good' : 'poor' as const,
      },
      {
        metric: 'Face Detection',
        value: 90 + Math.random() * 10,
        threshold: 85,
        status: 'good' as const,
      },
    ];

    return simulatedQuality.map(indicator => ({
      ...indicator,
      status: indicator.value >= indicator.threshold ? 'good' : 
              indicator.value >= indicator.threshold * 0.8 ? 'warning' : 'poor'
    }));
  }, []);

  const captureAndProcess = useCallback(async () => {
    if (!webcamRef.current) return;

    setIsScanning(true);
    setScanProgress(0);

    try {
      // Capture image
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new (globalThis.Error)('Failed to capture image from camera');
      }

      // Step 1: Quality Analysis (20%)
      setScanProgress(20);
      const quality = analyzeImageQuality(imageSrc);
      setQualityIndicators(quality);

      // Check if quality is sufficient
      const averageQuality = quality.reduce((sum, q) => sum + q.value, 0) / quality.length;
      if (averageQuality < 70) {
        throw new (globalThis.Error)('Image quality too low. Please ensure good lighting and focus.');
      }

      // Step 2: Liveness Detection (40%)
      setScanProgress(40);
      // Convert base64 to File for liveness check
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      const file = new File([blob], 'biometric-scan.jpg', { type: 'image/jpeg' });
      
      const livenessCheck = await apiService.checkLiveness(file);
      setLivenessResult(livenessCheck);

      if (!livenessCheck.isLive && !isEmergencyMode) {
        throw new (globalThis.Error)('Liveness check failed. Please use a live image.');
      }

      // Step 3: Emergency Access Request (if in emergency mode)
      setScanProgress(60);
      
      if (isEmergencyMode) {
        // Use emergency access endpoint for break-glass access
        const emergencyData = {
          face_image_base64: imageSrc.split(',')[1], // Remove data:image/jpeg;base64, prefix
          emergency_reason: 'Medical emergency - patient identification required',
          accessing_device_id: 'EMERGENCY_DEVICE_001',
          accessing_user: 'Emergency Medical Staff',
          organization: 'Emergency Department',
          location: 'Emergency Room',
          confidence_threshold: 0.5 // Lower threshold for emergencies
        };

        setScanProgress(80);
        const emergencyResult = await apiService.requestEmergencyAccess(
          '', // patient_id not needed for biometric matching
          emergencyData.emergency_reason,
          'emergency',
          emergencyData.location
        );

        setScanProgress(100);

        if (emergencyResult.match_found) {
          const matchResult: BiometricMatchResult = {
            matchFound: true,
            patientId: emergencyResult.patient_id,
            confidence: emergencyResult.match_confidence,
            emergencyData: emergencyResult.emergency_data
          };

          setLastScanTime(new Date());
          onScanComplete(matchResult);

          // Create patient object from emergency data
          const patient: Patient = {
            id: emergencyResult.patient_id,
            name: emergencyResult.emergency_data.name,
            blood_group: emergencyResult.emergency_data.blood_group,
            gender: 'NP' as const, // Default value since emergency data may not include gender
            emergency_contact_name: emergencyResult.emergency_data.emergency_contact?.name || '',
            emergency_contact_phone: emergencyResult.emergency_data.emergency_contact?.phone || '',
            allergies: emergencyResult.emergency_data.allergies || [],
            current_medications: emergencyResult.emergency_data.current_medications || [],
            medical_conditions: emergencyResult.emergency_data.medical_conditions || [],
            emergency_summary: emergencyResult.emergency_data.emergency_summary || '',
            consent_status: 'granted' as const,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          onPatientFound(patient);
          
          enqueueSnackbar(
            `EMERGENCY ACCESS: ${patient.name} identified (${(emergencyResult.match_confidence * 100).toFixed(1)}% confidence)`,
            { variant: 'success' }
          );
        } else {
          enqueueSnackbar('No matching patient found in emergency database', { variant: 'warning' });
        }

      } else {
        // Standard biometric scan (non-emergency)
        setScanProgress(60);
        const templateResult = await apiService.extractBiometricTemplate(file);

        if (!templateResult.success) {
          throw new (globalThis.Error)('Failed to extract biometric template');
        }

        setScanProgress(80);
        const matchResult = await apiService.matchBiometric(
          templateResult.template_data,
          0.6 // Standard threshold
        );

        setScanProgress(100);

        setLastScanTime(new Date());
        onScanComplete(matchResult);

        if (matchResult.matchFound && matchResult.patientId) {
          try {
            const patient = await apiService.getPatient(matchResult.patientId);
            onPatientFound(patient);
            
            enqueueSnackbar(
              `Patient identified: ${patient.name} (${(matchResult.confidence * 100).toFixed(1)}% confidence)`,
              { variant: 'success' }
            );
          } catch (error) {
            enqueueSnackbar('Patient identified but details could not be loaded', { variant: 'warning' });
          }
        } else {
          enqueueSnackbar('No matching patient found in database', { variant: 'info' });
        }
      }

    } catch (error) {
      console.error('Biometric scan error:', error);
      enqueueSnackbar(
        error instanceof globalThis.Error ? (error as any).message : 'Scan failed',
        { variant: 'error' }
      );
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  }, [onScanComplete, onPatientFound, isEmergencyMode, enqueueSnackbar, analyzeImageQuality]);

  const getQualityColor = (status: string) => {
    switch (status) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      case 'poor': return 'error';
      default: return 'default';
    }
  };

  const getQualityIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle fontSize="small" />;
      case 'warning': return <Warning fontSize="small" />;
      case 'poor': return <Error fontSize="small" />;
      default: return <Info fontSize="small" />;
    }
  };

  if (hasPermission === false) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            Camera access is required for biometric scanning. Please allow camera permissions and refresh the page.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (hasPermission === null) {
    return (
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" py={4}>
            <CircularProgress />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Requesting camera access...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" component="h2">
              🔬 Biometric Scanner
            </Typography>
            
            <Box display="flex" gap={1}>
              {isEmergencyMode && (
                <Chip
                  icon={<Security />}
                  label="Emergency Mode"
                  color="error"
                  variant="outlined"
                  size="small"
                />
              )}
              
              <Tooltip title="Refresh Camera">
                <IconButton
                  onClick={() => window.location.reload()}
                  size="small"
                >
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Camera View */}
          <Paper
            elevation={2}
            sx={{
              position: 'relative',
              borderRadius: 2,
              overflow: 'hidden',
              mb: 2,
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

            {/* Scan Overlay */}
            <AnimatePresence>
              {isScanning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: 'white',
                  }}
                >
                  <CircularProgress color="primary" size={60} />
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Processing...
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={scanProgress}
                    sx={{ mt: 2, width: '80%' }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Paper>

          {/* Action Buttons */}
          <Box display="flex" gap={2} mb={2}>
            <Button
              variant="contained"
              onClick={captureAndProcess}
              disabled={isScanning}
              startIcon={<CameraAlt />}
              fullWidth
              size="large"
              sx={{
                background: isEmergencyMode
                  ? 'linear-gradient(45deg, #f44336 30%, #ff5722 90%)'
                  : 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
              }}
            >
              {isScanning ? 'Processing...' : 'Scan Patient'}
            </Button>
          </Box>

          {/* Quality Indicators */}
          {qualityIndicators.length > 0 && (
            <Box mb={2}>
              <Typography variant="subtitle2" gutterBottom>
                Image Quality Analysis
              </Typography>
              <Grid container spacing={1}>
                {qualityIndicators.map((indicator, index) => (
                  <Grid item xs={6} sm={3} key={index}>
                    <Paper
                      elevation={1}
                      sx={{
                        p: 1,
                        textAlign: 'center',
                        border: `2px solid`,
                        borderColor: `${getQualityColor(indicator.status)}.main`,
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="center" mb={0.5}>
                        {getQualityIcon(indicator.status)}
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                          {indicator.metric}
                        </Typography>
                      </Box>
                      <Typography variant="h6" color={`${getQualityColor(indicator.status)}.main`}>
                        {indicator.value.toFixed(0)}%
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Liveness Check Result */}
          {livenessResult && (
            <Box mb={2}>
              <Alert
                severity={livenessResult.isLive ? 'success' : 'warning'}
                icon={livenessResult.isLive ? <CheckCircle /> : <Warning />}
              >
                <Typography variant="subtitle2">
                  Liveness Detection: {livenessResult.isLive ? 'Live Person' : 'Potential Spoof'}
                </Typography>
                <Typography variant="caption">
                  Confidence: {(livenessResult.confidence * 100).toFixed(1)}% | 
                  Processing: {livenessResult.processingTimeMs}ms
                </Typography>
              </Alert>
            </Box>
          )}

          {/* Last Scan Info */}
          {lastScanTime && (
            <Box display="flex" alignItems="center" justifyContent="center" mt={2}>
              <AccessTime fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Last scan: {lastScanTime.toLocaleTimeString()}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BiometricScanner;