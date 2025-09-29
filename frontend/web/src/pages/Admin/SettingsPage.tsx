import React from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';

const SettingsPage: React.FC = () => {
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        System Settings
      </Typography>
      <Paper elevation={3} sx={{ padding: 3 }}>
        <Box component="form" noValidate autoComplete="off">
          <FormControlLabel
            control={<Switch />}
            label="Enable Maintenance Mode"
            sx={{ mb: 2, display: 'block' }}
          />
          <TextField
            label="Session Timeout (minutes)"
            type="number"
            defaultValue="30"
            fullWidth
            sx={{ mb: 3 }}
          />
          <Button variant="contained" color="primary">
            Save Settings
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
