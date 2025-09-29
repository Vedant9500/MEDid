import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';

const mockLogs = [
  { timestamp: '2023-10-27 10:00:00', user: 'admin@example.com', action: 'User Login', details: 'Successful login from IP 192.168.1.1' },
  { timestamp: '2023-10-27 10:05:12', user: 'jane.smith@example.com', action: 'Update Profile', details: 'Changed phone number' },
  { timestamp: '2023-10-27 11:30:45', user: 'admin@example.com', action: 'Suspend User', details: 'Suspended user peter.jones@example.com' },
];

const AuditLogsPage: React.FC = () => {
  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Audit Logs
      </Typography>
      <Paper sx={{ padding: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField fullWidth label="Filter by User" variant="outlined" />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Filter by Date</InputLabel>
              <Select label="Filter by Date" defaultValue="">
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="last7">Last 7 Days</MenuItem>
                <MenuItem value="last30">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Details</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockLogs.map((log, index) => (
              <TableRow key={index}>
                <TableCell>{log.timestamp}</TableCell>
                <TableCell>{log.user}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Add Grid for layout
import { Grid } from '@mui/material';

export default AuditLogsPage;
