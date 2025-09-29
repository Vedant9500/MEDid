import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Box, Button, Grid, Paper } from '@mui/material';

const AdminPage: React.FC = () => {
  const navigate = useNavigate();

  // Simulate authentication check
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('isAdmin') === 'true';
    if (!isAuthenticated) {
      navigate('/login'); // Redirect to login if not authenticated
    }
  }, [navigate]);

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Administration
      </Typography>
      <Typography variant="body1" gutterBottom>
        Welcome to the admin dashboard. Use the options below to manage the
        application.
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ padding: 2 }}>
            <Typography variant="h6">Manage Users</Typography>
            <Typography variant="body2" gutterBottom>
              Add, edit, or remove users from the system.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/admin/users')}
            >
              Go to User Management
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ padding: 2 }}>
            <Typography variant="h6">View Reports</Typography>
            <Typography variant="body2" gutterBottom>
              Access system reports and analytics.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => navigate('/admin/reports')}
            >
              Go to Reports
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ padding: 2 }}>
            <Typography variant="h6">Audit Logs</Typography>
            <Typography variant="body2" gutterBottom>
              View security and system audit logs.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/admin/audit-logs')}
            >
              View Audit Logs
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper elevation={3} sx={{ padding: 2 }}>
            <Typography variant="h6">System Settings</Typography>
            <Typography variant="body2" gutterBottom>
              Configure global application settings.
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => navigate('/admin/settings')}
            >
              Go to Settings
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminPage;