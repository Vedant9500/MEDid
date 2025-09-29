import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';

const ReportsPage: React.FC = () => {
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Reports & Analytics
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ padding: 2, height: 300, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6">Monthly New Users</Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Chart placeholder
              </Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ padding: 2, height: 300, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6">System Activity Over Time</Typography>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Chart placeholder
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportsPage;
