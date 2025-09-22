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
    email: '',
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
      await login(formData.email, formData.password);
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
      admin: { email: 'demo@medid.com', password: 'demo123' },
      doctor: { email: 'demo@medid.com', password: 'demo123' },
      staff: { email: 'demo@medid.com', password: 'demo123' },
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
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                margin="normal"
                required
                autoComplete="email"
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

            <Divider sx={{ my: 3 }}>
              <Chip label="OR" />
            </Divider>

            {/* Emergency Access */}
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<MedicalServices />}
              onClick={handleEmergencyAccess}
              sx={{ mb: 2 }}
            >
              Emergency Biometric Access
            </Button>
            
            {/* Registration Link */}
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                Don't have an account?{' '}
                <a href="/register" style={{ textDecoration: 'none', color: '#667eea' }}>
                  Sign Up
                </a>
              </Typography>
            </Box>

            {/* Demo Buttons */}
            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Demo Accounts
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                <Button
                  size="small"
                  onClick={() => handleDemoLogin('admin')}
                  sx={{ mx: 0.5 }}
                >
                  Admin
                </Button>
                <Button
                  size="small"
                  onClick={() => handleDemoLogin('doctor')}
                  sx={{ mx: 0.5 }}
                >
                  Doctor
                </Button>
                <Button
                  size="small"
                  onClick={() => handleDemoLogin('staff')}
                  sx={{ mx: 0.5 }}
                >
                  Staff
                </Button>
              </Box>
            </Box>

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