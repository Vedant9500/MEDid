import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  LocalHospital,
  ExitToApp,
  Settings,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface LayoutProps {
  // No children prop needed when using Outlet
}

const Layout: React.FC<LayoutProps> = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
      case '/dashboard':
        return 'Dashboard';
      case '/emergency':
        return 'Emergency Access';
      case '/patient/register':
        return 'Patient Registration';
      case '/patient/search':
        return 'Patient Search';
      case '/admin':
        return 'Administration';
      case '/profile':
        return 'Profile';
      default:
        return 'MedID';
    }
  };

  const isEmergencyPage = location.pathname === '/emergency';

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar 
        position="static" 
        sx={{ 
          backgroundColor: isEmergencyPage ? '#f44336' : theme.palette.primary.main,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                mr: 3,
              }}
              onClick={() => navigate('/dashboard')}
            >
              <LocalHospital sx={{ mr: 1, fontSize: '2rem' }} />
              <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                MedID
              </Typography>
            </Box>
            
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {getPageTitle()}
            </Typography>
          </Box>

          {isEmergencyPage && (
            <Chip
              label="EMERGENCY MODE"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 'bold',
                mr: 2,
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.7 },
                },
              }}
            />
          )}

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {user && (
              <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
                {user.role === 'admin' ? 'Administrator' : 
                 user.role === 'doctor' ? 'Healthcare Provider' : 
                 'Staff'}: {user.name}
              </Typography>
            )}
            
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              {user?.avatar ? (
                <Avatar src={user.avatar} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
            
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={() => { navigate('/profile'); handleClose(); }}>
                <Settings sx={{ mr: 1 }} />
                Profile Settings
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ExitToApp sx={{ mr: 1 }} />
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        <Outlet />
      </Container>
    </Box>
  );
};

export default Layout;