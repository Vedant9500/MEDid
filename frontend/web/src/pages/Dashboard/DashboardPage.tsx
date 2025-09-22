import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  LocalHospital,
  PersonAdd,
  Search,
  AdminPanelSettings,
  TrendingUp,
  Security,
  People,
  AccessTime,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Emergency Access',
      description: 'Rapid patient identification for emergency situations',
      icon: LocalHospital,
      color: 'error',
      path: '/emergency',
      urgent: true,
    },
    {
      title: 'Register Patient',
      description: 'Enroll new patient with biometric data',
      icon: PersonAdd,
      color: 'primary',
      path: '/patient/register',
    },
    {
      title: 'Search Patients',
      description: 'Find and view patient records',
      icon: Search,
      color: 'info',
      path: '/patient/search',
    },
    ...(user?.role === 'admin' ? [{
      title: 'Administration',
      description: 'System management and configuration',
      icon: AdminPanelSettings,
      color: 'secondary' as const,
      path: '/admin',
    }] : []),
  ];

  const systemMetrics = [
    { label: 'Total Patients', value: '12,847', trend: '+247', color: 'primary' },
    { label: 'System Uptime', value: '98.7%', trend: '+0.2%', color: 'success' },
    { label: 'Emergency Accesses', value: '1,247', trend: '-23', color: 'warning' },
    { label: 'Security Alerts', value: '3', trend: '-12', color: 'error' },
  ];

  const recentActivity = [
    { type: 'success', icon: PersonAdd, text: 'New patient registered', time: '2 min ago' },
    { type: 'warning', icon: LocalHospital, text: 'Emergency access granted', time: '15 min ago' },
    { type: 'success', icon: CheckCircle, text: 'System backup completed', time: '1 hour ago' },
    { type: 'error', icon: Warning, text: 'Failed login attempt detected', time: '2 hours ago' },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Welcome back, {user?.name}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {user?.role === 'admin' ? 'System Administrator' : 
           user?.role === 'doctor' ? 'Healthcare Provider' : 
           'Staff Member'} • MedID Biometric Health Passport
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={action.title}>
              <Card 
                sx={{ 
                  height: '100%',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 3,
                  },
                  ...(action.urgent && {
                    border: '2px solid',
                    borderColor: 'error.main',
                    animation: 'pulse 2s infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.8 },
                    },
                  }),
                }}
                onClick={() => navigate(action.path)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <IconComponent 
                      sx={{ 
                        fontSize: 32, 
                        color: `${action.color}.main`,
                        mr: 2,
                      }} 
                    />
                    {action.urgent && (
                      <Chip 
                        label="URGENT" 
                        color="error" 
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    )}
                  </Box>
                  <Typography variant="h6" gutterBottom fontWeight="600">
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* System Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {systemMetrics.map((metric) => (
          <Grid item xs={12} sm={6} md={3} key={metric.label}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h4" fontWeight="bold" color={`${metric.color}.main`}>
                {metric.value}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {metric.label}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp sx={{ fontSize: 16, mr: 0.5, color: `${metric.color}.main` }} />
                <Typography variant="body2" color={`${metric.color}.main`}>
                  {metric.trend} vs last month
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Bottom Section */}
      <Grid container spacing={3}>
        {/* System Status */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" gutterBottom>
              System Performance
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Biometric Processing Load
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={75} 
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  75% capacity
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Database Performance
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={60} 
                  color="success"
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Response time: 1.2s avg
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  Security Score
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={95} 
                  color="info"
                  sx={{ height: 8, borderRadius: 4 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  95% - Excellent
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '400px' }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {recentActivity.map((activity, index) => {
                const IconComponent = activity.icon;
                return (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <IconComponent 
                        sx={{ 
                          color: activity.type === 'success' ? 'success.main' :
                                 activity.type === 'warning' ? 'warning.main' :
                                 activity.type === 'error' ? 'error.main' : 'primary.main'
                        }} 
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.text}
                      secondary={activity.time}
                      primaryTypographyProps={{ variant: 'body2' }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;