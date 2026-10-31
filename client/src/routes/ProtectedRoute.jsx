import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to default home for their role
    if (role === 'CUSTOMER') return <Navigate to="/customer-portal" replace />;
    if (role === 'TECHNICIAN') return <Navigate to="/technician/jobs" replace />;
    if (role === 'WAREHOUSE') return <Navigate to="/warehouse/dispatch" replace />;
    if (role === 'SUPPORT') return <Navigate to="/support/tickets" replace />;
    if (role === 'SALESMAN') return <Navigate to="/sales/leads" replace />;
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <Outlet />;
}
