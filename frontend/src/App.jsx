import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

const ProtectedRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
    if (!user) return <Navigate to="/login" />;
    return children;
};

const ProtectedAdminRoute = ({ children }) => {
    const { user, loading } = useContext(AuthContext);
    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
    if (!user || user.role !== 'admin') return <Navigate to="/" />;
    return children;
};

const AppRoutes = () => {
    const { user } = useContext(AuthContext);

    return (
        <Routes>
            <Route path="/login" element={user ? (user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/" />) : <Login />} />
            <Route path="/" element={<ProtectedRoute>{user?.role === 'admin' ? <Navigate to="/admin" /> : <Dashboard />}</ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
        </Routes>
    );
};

import { ThemeProvider } from './context/ThemeContext';

export default function App() {
    return (
        <AuthProvider>
            <ThemeProvider>
                <Router>
                    <AppRoutes />
                </Router>
            </ThemeProvider>
        </AuthProvider>
    );
}
