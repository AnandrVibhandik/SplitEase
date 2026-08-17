import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Container, Paper, Typography, Avatar, Box, Button, List, ListItem,
  ListItemText, TextField, CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, logout } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`/api/users/${user.id}`);
        setFriends(res.data.user.friends || []);
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchProfile();
  }, [user]);

  const handleSearch = async (value) => {
    setSearch(value);
    if (value.length < 2) { setResults([]); return; }
    try {
      const res = await axios.get('/api/users/search', { params: { query: value } });
      setResults(res.data.users || []);
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const addFriend = async (friendId) => {
    try {
      await axios.post('/api/users/friends', { friendId });
      setResults((prev) => prev.filter((u) => u._id !== friendId));
    } catch (err) {
      console.error('Failed to add friend', err);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 3, mb: 3, textAlign: 'center' }}>
        <Avatar sx={{ width: 72, height: 72, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}>
          {user?.name?.[0]}
        </Avatar>
        <Typography variant="h6" fontWeight={700}>{user?.name}</Typography>
        <Typography color="text.secondary" mb={2}>{user?.email}</Typography>
        <Button variant="outlined" color="error" onClick={logout}>Logout</Button>
      </Paper>

      <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>Friends</Typography>
        {friends.length === 0 ? (
          <Typography color="text.secondary">No friends added yet.</Typography>
        ) : (
          <List dense>
            {friends.map((f) => (
              <ListItem key={f._id} disableGutters>
                <ListItemText primary={f.name} secondary={f.email} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>Add friends</Typography>
        <TextField
          fullWidth label="Search by name or email"
          value={search} onChange={(e) => handleSearch(e.target.value)}
        />
        <List dense>
          {results.map((u) => (
            <ListItem
              key={u._id}
              disableGutters
              secondaryAction={<Button size="small" onClick={() => addFriend(u._id)}>Add</Button>}
            >
              <ListItemText primary={u.name} secondary={u.email} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default Profile;
