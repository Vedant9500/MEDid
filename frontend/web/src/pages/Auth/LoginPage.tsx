import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  InputAdornment,
  IconButton,
  Divider,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  LocalHospital,
  Security,
  MedicalServices,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(formData.username, formData.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmergencyAccess = () => {
    navigate('/emergency');
  };

  const handleDemoLogin = (role: 'admin' | 'doctor' | 'staff') => {
    const demoCredentials = {
      admin: { username: 'admin', password: 'admin123' },
      doctor: { username: 'doctor', password: 'doctor123' },
      staff: { username: 'staff', password: 'staff123' },
    };
    
    const creds = demoCredentials[role];
    setFormData(creds);
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 400, boxShadow: 3 }}>
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <LocalHospital sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
                MedID
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Biometric Health Passport System
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                margin="normal"
                required
                autoComplete="username"
                autoFocus
              />
              
              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                margin="normal"
                required
                autoComplete="current-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={isLoading}
                size="large"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>
            </Box>

            {/* Demo Accounts */}
            <Divider sx={{ my: 3 }}>
              <Chip label="Demo Accounts" size="small" />
            </Divider>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Security />}
                onClick={() => handleDemoLogin('admin')}
                fullWidth
              >
                Admin Demo (admin/admin123)
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LocalHospital />}
                onClick={() => handleDemoLogin('doctor')}
                fullWidth
              >
                Doctor Demo (doctor/doctor123)
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleDemoLogin('staff')}
                fullWidth
              >
                Staff Demo (staff/staff123)
              </Button>
            </Box>

            {/* Emergency Access */}
            <Divider sx={{ my: 3 }}>
              <Chip label="Emergency" size="small" color="error" />
            </Divider>
            
            <Button
              variant="contained"
              color="error"
              fullWidth
              startIcon={<LocalHospital />}
              onClick={handleEmergencyAccess}
              sx={{
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.8 },
                },
              }}
            >
              Emergency Access (No Login Required)
            </Button>

            {/* Footer */}
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 3 }}
            >
              HIPAA Compliant • Secure • Encrypted
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default LoginPage;