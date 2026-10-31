import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';

// Pages
import LoginPage from '../pages/auth/LoginPage';
import SharedDashboardPage from '../pages/public/SharedDashboardPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import LeadBoardPage from '../pages/sales/LeadBoardPage';
import QuoteBuilderPage from '../pages/sales/QuoteBuilderPage';
import OrderPaymentsPage from '../pages/sales/OrderPaymentsPage';
import PickListDispatchPage from '../pages/warehouse/PickListDispatchPage';
import TechnicianJobsPage from '../pages/technician/TechnicianJobsPage';
import MobileInstallFormPage from '../pages/technician/MobileInstallFormPage';
import ServiceDeskPage from '../pages/support/ServiceDeskPage';
import FinancePage from '../pages/finance/FinancePage';
import CustomerPortalPage from '../pages/customer/CustomerPortalPage';
import SolarPackageConfiguratorPage from '../pages/admin/SolarPackageConfiguratorPage';
import { useAuth } from '../hooks/useAuth';

function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (role === 'CUSTOMER') return <Navigate to="/customer-portal" replace />;
  if (role === 'TECHNICIAN') return <Navigate to="/technician/jobs" replace />;
  if (role === 'WAREHOUSE') return <Navigate to="/warehouse/dispatch" replace />;
  if (role === 'SUPPORT') return <Navigate to="/support/tickets" replace />;
  if (role === 'SALESMAN') return <Navigate to="/sales/leads" replace />;
  return <Navigate to="/admin/dashboard" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/shared-dashboard" element={<SharedDashboardPage />} />

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />

      {/* Protected Routes inside DashboardLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/packages" element={<SolarPackageConfiguratorPage />} />
            <Route path="/finance/costing" element={<FinancePage defaultTab="costing" />} />
            <Route path="/finance/payouts" element={<FinancePage defaultTab="payouts" />} />
            <Route path="/finance/invoices" element={<FinancePage defaultTab="invoices" />} />
          </Route>

          {/* Sales Quotation Studio (Salesman only) */}
          <Route element={<ProtectedRoute allowedRoles={['SALESMAN']} />}>
            <Route path="/sales/quotes" element={<QuoteBuilderPage />} />
          </Route>

          {/* Sales & Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALESMAN']} />}>
            <Route path="/sales/leads" element={<LeadBoardPage />} />
            <Route path="/sales/orders" element={<OrderPaymentsPage />} />
          </Route>

          {/* Warehouse routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE']} />}>
            <Route path="/warehouse/dispatch" element={<PickListDispatchPage />} />
          </Route>

          {/* Technician routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN']} />}>
            <Route path="/technician/jobs" element={<TechnicianJobsPage />} />
            <Route path="/technician/jobs/:id" element={<MobileInstallFormPage />} />
          </Route>

          {/* Support & Service routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPPORT']} />}>
            <Route path="/support/tickets" element={<ServiceDeskPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPPORT', 'SALESMAN']} />}>
            <Route path="/warranty/lookup" element={<ServiceDeskPage />} />
            <Route path="/finance/subsidies" element={<FinancePage defaultTab="subsidies" />} />
          </Route>

          {/* Customer Portal route */}
          <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
            <Route path="/customer-portal" element={<CustomerPortalPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
