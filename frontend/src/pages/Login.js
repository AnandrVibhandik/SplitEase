import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Paper, TextField, Button, Typography, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(form.email, form.password);
    setSubmitting(false);
    if (result.success) navigate('/');
  };

  return (
    <Container maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={2} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" fontWeight={700} textAlign="center" mb={3}>
          Welcome back
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth margin="normal" label="Email" name="email" type="email"
            value={form.email} onChange={handleChange} required
          />
          <TextField
            fullWidth margin="normal" label="Password" name="password" type="password"
            value={form.password} onChange={handleChange} required
          />
          <Button fullWidth type="submit" variant="contained" size="large" disabled={submitting} sx={{ mt: 3 }}>
            {submitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </Box>
        <Typography textAlign="center" mt={2} variant="body2">
          Don't have an account? <Link to="/register">Register</Link>
        </Typography>
      </Paper>
    </Container>
  );
};

export default Login;
