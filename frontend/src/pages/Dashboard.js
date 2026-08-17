import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Container, Grid, Paper, Typography, Box, CircularProgress, Button, TextField } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 1. Add state for the new input field
  const [joinGroupId, setJoinGroupId] = useState('');

  // 2. Add the function to handle joining
  const handleJoinGroup = async () => {
    if (!joinGroupId.trim()) return;
    try {
      // Send the join request to the backend
      await axios.post(`/api/groups/${joinGroupId}/join`);
      alert('Successfully joined the group!');
      setJoinGroupId(''); // Clear the input field
      
      // Refresh the groups list immediately so the new group appears
      const res = await axios.get('/api/groups');
      setGroups(res.data.groups || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to join group. Please check the ID.');
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await axios.get('/api/groups');
        setGroups(res.data.groups || []);
      } catch (err) {
        console.error('Failed to load groups', err);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={8}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" fontWeight={700} mb={1}>
        Hi {user?.name?.split(' ')[0] || 'there'} 👋
      </Typography>
      <Typography color="text.secondary" mb={4}>
        Here's an overview of your groups.
      </Typography>

      {/* 3. Add the Join Group UI box right above the group grid */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }} elevation={1}>
        <Typography variant="subtitle1" fontWeight={600} sx={{ mr: 2 }}>
          Have an invite code?
        </Typography>
        <TextField 
          size="small" 
          label="Enter Group ID" 
          variant="outlined" 
          value={joinGroupId}
          onChange={(e) => setJoinGroupId(e.target.value)}
          sx={{ flexGrow: 1, minWidth: '200px' }}
        />
        <Button variant="contained" onClick={handleJoinGroup}>
          Join
        </Button>
      </Paper>

      <Grid container spacing={3}>
        {groups.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <Typography mb={2}>You're not part of any groups yet.</Typography>
              <Button component={Link} to="/groups" variant="contained">
                Create a group
              </Button>
            </Paper>
          </Grid>
        )}
        {groups.map((group) => (
          <Grid item xs={12} sm={6} md={4} key={group._id}>
            <Paper
              component={Link}
              to={`/groups/${group._id}`}
              sx={{ p: 3, borderRadius: 3, display: 'block', textDecoration: 'none', color: 'inherit' }}
              elevation={1}
            >
              <Typography variant="h6" fontWeight={600}>{group.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {group.members?.length || 0} members
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default Dashboard;