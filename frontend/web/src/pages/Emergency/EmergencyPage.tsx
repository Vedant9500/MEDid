import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Alert,
  Paper,
  Chip,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  Fab,
} from '@mui/material';
import {
  MedicalServices,
  Security,
  Speed,
  AccessTime,
  Person,
  LocalHospital,
  Warning,
  CheckCircle,
  Add,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useSnackbar } from 'notistack';

import { 
  Patient, 
  BiometricMatchResult, 
  EmergencyAccess, 
  SystemHealth,
  EmergencyDashboardState 
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import apiService from '../../services/api';
import BiometricScanner from '../../components/Emergency/BiometricScanner';
import PatientInfoDisplay from '../../components/Emergency/PatientInfoDisplay';

const EmergencyPage: React.FC = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [dashboardState, setDashboardState] = useState<EmergencyDashboardState>({
    currentPatient: undefined,
    isSearching: false,
    searchResults: [],
    recentAccesses: [],
    systemStatus: {
      status: 'healthy',
      service: 'emergency-dashboard',
      version: '1.0.0',
      timestamp: new Date(),
      dependencies: {},
      uptimeSeconds: 0,
    },
  });

  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [emergencyStats, setEmergencyStats] = useState({
    totalScansToday: 0,
    averageResponseTime: 0,
    successfulMatches: 0,
    emergencyAccesses: 0,
  });

  // Load initial data
  useEffect(() => {
    loadSystemHealth();
    loadRecentAccesses();
    loadEmergencyStats();
    
    // Set up periodic health checks
    const healthInterval = setInterval(loadSystemHealth, 30000); // Every 30 seconds
    
    return () => clearInterval(healthInterval);
  }, []);

  const loadSystemHealth = async () => {
    try {
      const health = await apiService.getSystemHealth();
      setDashboardState(prev => ({
        ...prev,
        systemStatus: health,
      }));
    } catch (error) {
      console.error('Failed to load system health:', error);
    }
  };

  const loadRecentAccesses = async () => {
    try {
      const accesses = await apiService.getEmergencyAccessLogs();
      setDashboardState(prev => ({
        ...prev,
        recentAccesses: accesses.slice(0, 10), // Last 10 accesses
      }));
    } catch (error) {
      console.error('Failed to load recent accesses:', error);
    }
  };

  const loadEmergencyStats = async () => {
    try {
      const stats = await apiService.getDemoStats();
      setEmergencyStats({
        totalScansToday: Math.floor(Math.random() * 50) + 10,
        averageResponseTime: stats.service_uptime ? Math.floor(stats.service_uptime * 10) : 1200,
        successfulMatches: Math.floor(Math.random() * 30) + 5,
        emergencyAccesses: dashboardState.recentAccesses.length,
      });
    } catch (error) {
      console.error('Failed to load emergency stats:', error);
    }
  };

  const handleScanComplete = (result: BiometricMatchResult) => {
    setDashboardState(prev => ({
      ...prev,
      searchResults: [result],
      isSearching: false,
    }));

    if (result.matchFound) {
      enqueueSnackbar(
        `Patient identified with ${(result.confidence * 100).toFixed(1)}% confidence`,
        { variant: 'success' }
      );
    } else {
      enqueueSnackbar('No matching patient found in database', { variant: 'warning' });
    }
  };

  const handlePatientFound = (patient: Patient) => {
    setDashboardState(prev => ({
      ...prev,
      currentPatient: patient,
    }));
  };

  const handleEmergencyAccess = async (accessData: Partial<EmergencyAccess>) => {
    try {
      if (!accessData.patientId) return;

      await apiService.requestEmergencyAccess(
        accessData.patientId,
        accessData.accessReason || '',
        accessData.emergencyType || 'other',
        accessData.location || ''
      );

      enqueueSnackbar('Emergency access logged successfully', { variant: 'success' });
      
      // Reload recent accesses
      loadRecentAccesses();
      loadEmergencyStats();
      
    } catch (error) {
      enqueueSnackbar(
        `Failed to log emergency access: ${apiService.handleApiError(error)}`,
        { variant: 'error' }
      );
    }
  };

  const clearCurrentPatient = () => {
    setDashboardState(prev => ({
      ...prev,
      currentPatient: undefined,
      searchResults: [],
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Emergency Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box display="flex" alignItems="center" justifyContent="between" mb={4}>
          <Box display="flex" alignItems="center">
            <MedicalServices 
              sx={{ 
                fontSize: 40, 
                mr: 2, 
                color: 'error.main',
                animation: 'pulse 2s infinite',
              }} 
            />
            <Box>
              <Typography variant="h3" fontWeight="bold" color="error.main">
                Emergency Access Dashboard
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Rapid patient identification for emergency medical situations
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={2}>
            <Chip
              icon={<CheckCircle />}
              label={`System: ${dashboardState.systemStatus.status.toUpperCase()}`}
              color={getStatusColor(dashboardState.systemStatus.status)}
              variant="outlined"
            />
            <Chip
              icon={<Person />}
              label={`Dr. ${user?.name || 'Unknown'}`}
              color="primary"
              variant="outlined"
            />
          </Box>
        </Box>
      </motion.div>

      {/* Emergency Alert */}
      <Alert 
        severity="error" 
        icon={<Security />}
        sx={{ mb: 3, fontWeight: 'bold' }}
      >
        🚨 EMERGENCY MODE ACTIVE - All biometric scans and patient access will be logged for audit compliance
      </Alert>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      {emergencyStats.totalScansToday}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Scans Today
                    </Typography>
                  </Box>
                  <Speed sx={{ fontSize: 40, color: 'primary.main' }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      {emergencyStats.averageResponseTime}ms
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Response Time
                    </Typography>
                  </Box>
                  <AccessTime sx={{ fontSize: 40, color: 'success.main' }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="info.main">
                      {emergencyStats.successfulMatches}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Successful Matches
                    </Typography>
                  </Box>
                  <CheckCircle sx={{ fontSize: 40, color: 'info.main' }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      {emergencyStats.emergencyAccesses}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Emergency Accesses
                    </Typography>
                  </Box>
                  <LocalHospital sx={{ fontSize: 40, color: 'warning.main' }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={4}>
        {/* Biometric Scanner */}
        <Grid item xs={12} lg={5}>
          <BiometricScanner
            onScanComplete={handleScanComplete}
            onPatientFound={handlePatientFound}
            isEmergencyMode={true}
          />
        </Grid>

        {/* Patient Information */}
        <Grid item xs={12} lg={7}>
          {dashboardState.currentPatient ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                <Typography variant="h5" fontWeight="bold">
                  Patient Information
                </Typography>
                <Button
                  variant="outlined"
                  onClick={clearCurrentPatient}
                  sx={{ ml: 2 }}
                >
                  Clear Patient
                </Button>
              </Box>
              <PatientInfoDisplay
                patient={dashboardState.currentPatient}
                isEmergencyMode={true}
                onEmergencyAccess={handleEmergencyAccess}
              />
            </motion.div>
          ) : (
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                bgcolor: 'grey.50',
                border: '2px dashed',
                borderColor: 'grey.300',
                minHeight: 400,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Box>
                <Person sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Patient Selected
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Use the biometric scanner to identify a patient for emergency access
                </Typography>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Recent Emergency Accesses */}
      <Box mt={4}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Recent Emergency Accesses
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Emergency Type</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Accessed By</TableCell>
                <TableCell>Duration</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dashboardState.recentAccesses.length > 0 ? (
                dashboardState.recentAccesses.map((access, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {format(new Date(access.timestamp), 'MMM dd, HH:mm:ss')}
                    </TableCell>
                    <TableCell>{access.patientId}</TableCell>
                    <TableCell>
                      <Chip
                        label={access.emergencyType.replace('_', ' ').toUpperCase()}
                        color="error"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{access.location}</TableCell>
                    <TableCell>{access.accessedBy}</TableCell>
                    <TableCell>{access.duration} min</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No recent emergency accesses
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Floating Action Button for Quick Scan */}
      <Fab
        color="error"
        size="large"
        onClick={() => setScanDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          animation: 'pulse 2s infinite',
        }}
      >
        <MedicalServices />
      </Fab>

      {/* Quick Scan Dialog */}
      <Dialog
        open={scanDialogOpen}
        onClose={() => setScanDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Quick Emergency Scan</DialogTitle>
        <DialogContent>
          <BiometricScanner
            onScanComplete={(result) => {
              handleScanComplete(result);
              setScanDialogOpen(false);
            }}
            onPatientFound={handlePatientFound}
            isEmergencyMode={true}
          />
        </DialogContent>
      </Dialog>
    </Container>
  );
};

export default EmergencyPage;