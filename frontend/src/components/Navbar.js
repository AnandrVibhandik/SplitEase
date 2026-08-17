import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Menu, MenuItem, Avatar, Box, Container, Tooltip } from '@mui/material';
import { AccountCircle, Group, Dashboard, AttachMoney, Logout } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenu = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleLogout = () => { logout(); handleClose(); navigate('/login'); };

  const getInitials = (name) =>
    name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);

  if (!isAuthenticated) return null;

  return (
    <AppBar position="static" elevation={0} sx={{ bgcolor: 'white', color: 'text.primary', borderBottom: '1px solid #e0e0e0' }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ flexGrow: 1, fontWeight: 700, color: 'primary.main', textDecoration: 'none' }}
          >
            SplitEase
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button component={Link} to="/" startIcon={<Dashboard />} color="inherit">
              Dashboard
            </Button>
            <Button component={Link} to="/groups" startIcon={<Group />} color="inherit">
              Groups
            </Button>
            <Button component={Link} to="/expenses" startIcon={<AttachMoney />} color="inherit">
              Expenses
            </Button>

            <Tooltip title="Account">
              <IconButton onClick={handleMenu} size="small" sx={{ ml: 1 }}>
                {user?.avatar ? (
                  <Avatar src={user.avatar} sx={{ width: 36, height: 36 }} />
                ) : (
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
                    {user?.name ? getInitials(user.name) : <AccountCircle />}
                  </Avatar>
                )}
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem
                component={Link}
                to="/profile"
                onClick={handleClose}
              >
                <AccountCircle fontSize="small" sx={{ mr: 1 }} /> Profile
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <Logout fontSize="small" sx={{ mr: 1 }} /> Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
