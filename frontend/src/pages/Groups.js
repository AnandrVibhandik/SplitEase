import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, Grid, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, CircularProgress, IconButton, Tooltip
} from '@mui/material';
import { Add, ContentCopy } from '@mui/icons-material';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

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

  useEffect(() => { fetchGroups(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await axios.post('/api/groups', form);
      toast.success('Group created');
      setOpen(false);
      setForm({ name: '', description: '' });
      fetchGroups();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  // NEW FUNCTION: Handles copying the ID without triggering the Link navigation
  const handleCopyId = (e, id) => {
    e.preventDefault(); // Prevents the browser from following the link
    e.stopPropagation(); // Stops the click from bubbling up to the Paper component
    navigator.clipboard.writeText(id);
    toast.success('Invite code copied to clipboard!');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700}>Your Groups</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          New Group
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group._id}>
              <Paper
                component={Link}
                to={`/groups/${group._id}`}
                sx={{ 
                  p: 3, 
                  borderRadius: 3, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: '100%', 
                  textDecoration: 'none', 
                  color: 'inherit',
                  position: 'relative' // Needed for absolute positioning of the copy button
                }}
              >
                <Typography variant="h6" fontWeight={600}>{group.name}</Typography>
                <Typography variant="body2" color="text.secondary" mb={2} sx={{ flexGrow: 1 }}>
                  {group.description || 'No description'}
                </Typography>
                
                {/* --- NEW INVITE CODE SECTION --- */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    mt: 'auto',
                    pt: 1,
                    borderTop: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Invite Code:
                    </Typography>
                    <Typography variant="body2" fontWeight="bold">
                      {group._id}
                    </Typography>
                  </Box>
                  <Tooltip title="Copy Invite Code">
                    <IconButton onClick={(e) => handleCopyId(e, group._id)} size="small" color="primary">
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                {/* ------------------------------- */}

              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Create a new group</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth margin="normal" label="Group name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            fullWidth margin="normal" label="Description" multiline rows={2}
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Groups;