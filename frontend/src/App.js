import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import Expenses from './pages/Expenses';
import CreateExpense from './pages/CreateExpense';
import Profile from './pages/Profile';

const theme = createTheme({
  palette: {
    primary: { main: '#5B6ABF' },
    secondary: { main: '#FF6B6B' },
    background: { default: '#f5f7fa' },
  },
  typography: { fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif' },
  shape: { borderRadius: 12 },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Navbar />
          <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#363636', color: '#fff' } }} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/groups" element={<PrivateRoute><Groups /></PrivateRoute>} />
            <Route path="/groups/:id" element={<PrivateRoute><GroupDetails /></PrivateRoute>} />
            <Route path="/expenses" element={<PrivateRoute><Expenses /></PrivateRoute>} />
            <Route path="/expenses/create" element={<PrivateRoute><CreateExpense /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
