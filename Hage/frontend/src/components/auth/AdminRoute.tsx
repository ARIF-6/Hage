import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('user_role') || localStorage.getItem('profile_role') || 'user';
  const isSuspended = localStorage.getItem('user_suspended') === 'true';

  // If user is suspended, force logout and redirect to login with error
  if (isSuspended) {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    return <Navigate to="/login?error=suspended" replace />;
  }

  // If not logged in, redirect to login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Normal users must NOT see admin pages: redirect immediately to user dashboard
  if (userRole !== 'admin') {
    console.warn('Unauthorized access to admin area blocked for non-admin user.');
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
