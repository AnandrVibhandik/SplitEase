import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, List, ListItem, ListItemText,
  Divider, CircularProgress, Button, Chip
} from '@mui/material';

const GroupDetails = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupRes, expensesRes] = await Promise.all([
          axios.get(`/api/groups/${id}`),
          axios.get(`/api/groups/${id}/expenses`),
        ]);
        setData(groupRes.data);
        setExpenses(expensesRes.data.expenses || []);
      } catch (err) {
        console.error('Failed to load group', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;
  }

  if (!data) {
    return <Container sx={{ mt: 4 }}><Typography>Group not found.</Typography></Container>;
  }

  const { group, balances } = data;

  // --- NEW: Helper function to convert raw IDs to real names ---
  const getUserName = (userId) => {
    if (!group || !group.members) return userId; // Fallback to ID if no members
    const member = group.members.find((m) => m.user._id === userId);
    return member ? member.user.name : 'Unknown User';
  };
  // -------------------------------------------------------------

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h4" fontWeight={700}>{group.name}</Typography>
        <Button component={Link} to="/expenses/create" variant="contained">Add Expense</Button>
      </Box>
      <Typography color="text.secondary" mb={3}>{group.description}</Typography>

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>Members</Typography>
        <Box display="flex" gap={1} flexWrap="wrap">
          {group.members?.map((m) => (
            <Chip key={m.user._id} label={`${m.user.name}${m.role === 'admin' ? ' (admin)' : ''}`} />
          ))}
        </Box>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>Balances</Typography>
        {(!balances || balances.length === 0) ? (
          <Typography color="text.secondary">Everyone is settled up.</Typography>
        ) : (
          <List dense>
            {balances.map((b, idx) => (
              <ListItem key={idx} disableGutters>
                {/* --- NEW: Wrapped b.from and b.to in the helper function --- */}
                <ListItemText primary={`${getUserName(b.from)} owes ${getUserName(b.to)}: $${b.amount.toFixed(2)}`} />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={2}>Recent Expenses</Typography>
        {expenses.length === 0 ? (
          <Typography color="text.secondary">No expenses yet.</Typography>
        ) : (
          <List>
            {expenses.map((exp, idx) => (
              <React.Fragment key={exp._id}>
                <ListItem disableGutters>
                  <ListItemText
                    primary={exp.description}
                    secondary={`Paid by ${exp.paidBy?.name} • $${exp.amount.toFixed(2)}`}
                  />
                </ListItem>
                {idx < expenses.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Container>
  );
};

export default GroupDetails;