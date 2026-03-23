import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  redirectTo = '/login',
  fallback = null 
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Verifying authentication..." />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }

  // Check role requirements
  if (requiredRole && user?.role !== requiredRole) {
    // Redirect unauthorized users to appropriate page
    const unauthorizedRedirect = user?.role === 'admin' ? '/admin' : 
                              user?.role === 'doctor' ? '/doctor-dashboard' : 
                              '/dashboard';
    
    return (
      <Navigate 
        to={unauthorizedRedirect} 
        replace 
      />
    );
  }

  // Render fallback if provided and user doesn't meet requirements
  if (fallback && requiredRole && user?.role !== requiredRole) {
    return fallback;
  }

  // Render children if all checks pass
  return children;
};

export default ProtectedRoute;
