import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AuthGuard({ children, requiredRole }) {
    const { currentUser, userRole } = useAuth();
    const location = useLocation();

    if (!currentUser) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requiredRole) {
        const userRoleLower = userRole?.toLowerCase();
        const hasRole = Array.isArray(requiredRole)
            ? requiredRole.map(r => r.toLowerCase()).includes(userRoleLower)
            : userRoleLower === requiredRole.toLowerCase();

        if (!hasRole) {
            // Redirect to their appropriate home based on role
            if (userRoleLower === 'admin') return <Navigate to="/dashboard" replace />;
            if (userRoleLower === 'scheduler') return <Navigate to="/schedule" replace />;
            if (userRoleLower === 'marketing') return <Navigate to="/marketing-dashboard" replace />;
            return <Navigate to="/tasks" replace />;
        }
    }

    return children;
}
