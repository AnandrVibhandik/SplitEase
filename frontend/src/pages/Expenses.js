import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Container, Typography, Box, Paper, List, ListItem, ListItemText,
  Divider, CircularProgress, Button, Chip
} from '@mui/material';

const Expenses = () => {
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const groupsRes = await axios.get('/api/groups');
        const groupList = groupsRes.data.groups || [];
        setGroups(groupList);

        const expenseLists = await Promise.all(
          groupList.map((g) => axios.get(`/api/groups/${g._id}/expenses`).then((r) => r.data.expenses || []))
        );
        setExpenses(expenseLists.flat().sort((a, b) => new Date(b.date) - new Date(a.date)));
      } catch (err) {
        console.error('Failed to load expenses', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={700}>All Expenses</Typography>
        <Button component={Link} to="/expenses/create" variant="contained" disabled={groups.length === 0}>
          Add Expense
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>
      ) : expenses.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary">No expenses yet.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 3 }}>
          <List>
            {expenses.map((exp, idx) => (
              <React.Fragment key={exp._id}>
                <ListItem disableGutters sx={{ px: 3 }}>
                  <ListItemText
                    primary={exp.description}
                    secondary={`Paid by ${exp.paidBy?.name} • ${new Date(exp.date).toLocaleDateString()}`}
                  />
                  <Chip label={`$${exp.amount.toFixed(2)}`} color="primary" variant="outlined" />
                </ListItem>
                {idx < expenses.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Container>
  );
};

export default Expenses;
