import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TaskDetail from './pages/TaskDetail';
import PrivateRoute from './components/PrivateRoute';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';

const AppRoutes = () => {
  const { token } = useAuth();
  
  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <Login />} />
      <Route path="/register" element={token ? <Navigate to="/dashboard" /> : <Register />} />
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />
      <Route path="/tasks/:id" element={
        <PrivateRoute>
          <TaskDetail />
        </PrivateRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <Toaster position="top-right" />
          <Navbar />
          <main className="flex-1">
            <AppRoutes />
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
