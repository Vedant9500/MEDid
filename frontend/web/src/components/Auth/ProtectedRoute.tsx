import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'doctor' | 'staff';
  emergencyOverride?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  emergencyOverride = false 
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          Verifying authentication...
        </Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Emergency override allows access regardless of role
  if (emergencyOverride) {
    return <>{children}</>;
  }

  // Check role-based access
  if (requiredRole) {
    const hasPermission = checkRolePermission(user.role, requiredRole);
    
    if (!hasPermission) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '50vh',
            gap: 2,
            textAlign: 'center',
            p: 3,
          }}
        >
          <Typography variant="h5" color="error">
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary">
            You don't have permission to access this page.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Required role: {requiredRole.toUpperCase()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your role: {user.role.toUpperCase()}
          </Typography>
        </Box>
      );
    }
  }

  return <>{children}</>;
};

// Helper function to check role permissions
function checkRolePermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    admin: 3,
    doctor: 2,
    staff: 1,
  };

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
  const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userLevel >= requiredLevel;
}

export default ProtectedRoute;