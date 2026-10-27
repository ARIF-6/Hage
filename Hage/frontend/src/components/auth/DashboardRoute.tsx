import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { hasUserPurchasedPlan } from '../../store/subscriptionRules';

interface DashboardRouteProps {
  children: React.ReactNode;
}

export function DashboardRoute({ children }: DashboardRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('user_role') || localStorage.getItem('profile_role') || 'user';
  const isSuspended = localStorage.getItem('user_suspended') === 'true';

  // 1. Unauthenticated users must log in first
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Suspended users are locked out
  if (isSuspended) {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    return <Navigate to="/login?error=suspended" replace />;
  }

  // 3. Super Admins bypass subscription requirements
  if (userRole === 'admin') {
    return <>{children}</>;
  }

  // 4. Strict Paywall Enforcement:
  // If user has not purchased a plan, only allow access to subscription purchase and support
  const isPaid = hasUserPurchasedPlan();
  const isAllowedUnpaidPath =
    location.pathname === '/dashboard/subscription' ||
    location.pathname === '/dashboard/support';

  if (!isPaid && !isAllowedUnpaidPath) {
    console.warn(`[PAYWALL] Access blocked to "${location.pathname}". Subscription fee payment required.`);
    return <Navigate to="/dashboard/subscription?purchase_required=true" replace />;
  }

  return <>{children}</>;
}
