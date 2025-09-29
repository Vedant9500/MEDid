import React from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john.doe@example.com', role: 'Patient', status: 'Active' },
  { id: '2', name: 'Jane Smith', email: 'jane.smith@example.com', role: 'Provider', status: 'Active' },
  { id: '3', name: 'Peter Jones', email: 'peter.jones@example.com', role: 'Patient', status: 'Suspended' },
];

const UserManagementPage: React.FC = () => {
  return (
    <Box sx={{ padding: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          User Management
        </Typography>
        <Button variant="contained" color="primary">
          Add New User
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {mockUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.status}</TableCell>
                <TableCell>
                  <Button size="small" sx={{ mr: 1 }}>Edit</Button>
                  <Button size="small" color="warning">Suspend</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default UserManagementPage;
