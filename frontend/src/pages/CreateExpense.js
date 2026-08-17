import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import {
  Container, Paper, Typography, TextField, MenuItem, Button, Box,
  FormControl, InputLabel, Select, FormControlLabel, Checkbox, CircularProgress,
  RadioGroup, Radio, InputAdornment
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['food', 'transport', 'entertainment', 'utilities', 'rent', 'shopping', 'other'];

const CreateExpense = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [groupId, setGroupId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('other');
  
  // States for splitting
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [splitMode, setSplitMode] = useState('equal'); // 'equal' or 'unequal'
  const [customSplits, setCustomSplits] = useState({}); // Stores unequal amounts like { userId: "10.50" }

  const selectedGroup = groups.find((g) => g._id === groupId);

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

  // When a group is selected, select all members for equal split & initialize unequal splits to 0
  useEffect(() => {
    if (selectedGroup) {
      setSelectedMembers(selectedGroup.members.map((m) => m.user._id));
      
      const initialCustomSplits = {};
      selectedGroup.members.forEach((m) => {
        initialCustomSplits[m.user._id] = '';
      });
      setCustomSplits(initialCustomSplits);
    }
  }, [selectedGroup]);

  const toggleMember = (userId) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCustomSplitChange = (userId, value) => {
    setCustomSplits((prev) => ({ ...prev, [userId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupId || !amount) {
      toast.error('Fill in all fields');
      return;
    }

    let finalSplits = [];
    const totalAmount = parseFloat(amount);

    if (splitMode === 'equal') {
      if (selectedMembers.length === 0) {
        toast.error('Select at least one member to split with');
        return;
      }
      const splitAmount = Number((totalAmount / selectedMembers.length).toFixed(2));
      finalSplits = selectedMembers.map((userId) => ({ user: userId, amount: splitAmount }));

      // Adjust rounding so splits sum exactly to the total
      const diff = Number((totalAmount - splitAmount * selectedMembers.length).toFixed(2));
      if (diff !== 0) finalSplits[0].amount = Number((finalSplits[0].amount + diff).toFixed(2));
    } else {
      // Unequal split logic
      let currentTotal = 0;
      for (const [userId, val] of Object.entries(customSplits)) {
        const numVal = parseFloat(val);
        if (numVal > 0) {
          finalSplits.push({ user: userId, amount: numVal });
          currentTotal += numVal;
        }
      }

      if (finalSplits.length === 0) {
        toast.error('Please enter an amount for at least one member');
        return;
      }

      // Backend requires the exact match, so we validate it before sending
      if (Math.abs(currentTotal - totalAmount) > 0.01) {
        toast.error(`Split amounts ($${currentTotal.toFixed(2)}) must equal the total ($${totalAmount.toFixed(2)})`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await axios.post('/api/expenses', {
        description,
        amount: totalAmount,
        paidBy: user?.id,
        groupId,
        splits: finalSplits,
        category,
      });
      toast.success('Expense added');
      navigate(`/groups/${groupId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>;
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} mb={3}>Add an expense</Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Group</InputLabel>
            <Select value={groupId} label="Group" onChange={(e) => setGroupId(e.target.value)}>
              {groups.map((g) => (
                <MenuItem key={g._id} value={g._id}>{g.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth margin="normal" label="Description"
            value={description} onChange={(e) => setDescription(e.target.value)} required
          />
          <TextField
            fullWidth margin="normal" label="Total Amount" type="number" inputProps={{ step: '0.01', min: 0 }}
            value={amount} onChange={(e) => setAmount(e.target.value)} required
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          />
          <TextField
            fullWidth select margin="normal" label="Category"
            value={category} onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</MenuItem>
            ))}
          </TextField>

          {selectedGroup && (
            <Box mt={3} p={2} sx={{ bgcolor: 'background.default', borderRadius: 2 }}>
              
              {/* --- NEW: Split Toggle --- */}
              <FormControl component="fieldset" fullWidth>
                <RadioGroup 
                  row 
                  value={splitMode} 
                  onChange={(e) => setSplitMode(e.target.value)}
                  sx={{ mb: 2, justifyContent: 'center' }}
                >
                  <FormControlLabel value="equal" control={<Radio />} label="Split Equally" />
                  <FormControlLabel value="unequal" control={<Radio />} label="Split Unequally" />
                </RadioGroup>
              </FormControl>

              <Typography variant="subtitle2" mb={1} color="text.secondary">
                {splitMode === 'equal' ? 'Select members to split with:' : 'Enter exact amounts for members:'}
              </Typography>

              {/* EQUAL SPLIT UI */}
              {splitMode === 'equal' && selectedGroup.members.map((m) => (
                <FormControlLabel
                  key={m.user._id}
                  sx={{ display: 'block', mb: 1 }}
                  control={
                    <Checkbox
                      checked={selectedMembers.includes(m.user._id)}
                      onChange={() => toggleMember(m.user._id)}
                    />
                  }
                  label={m.user.name}
                />
              ))}

              {/* UNEQUAL SPLIT UI */}
              {splitMode === 'unequal' && selectedGroup.members.map((m) => (
                <Box key={m.user._id} display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Typography>{m.user.name}</Typography>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: '0.01', min: 0 }}
                    placeholder="0.00"
                    value={customSplits[m.user._id]}
                    onChange={(e) => handleCustomSplitChange(m.user._id, e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                    sx={{ width: '120px' }}
                  />
                </Box>
              ))}
            </Box>
          )}

          <Button fullWidth type="submit" variant="contained" size="large" disabled={submitting} sx={{ mt: 3 }}>
            {submitting ? 'Adding...' : 'Add Expense'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreateExpense;