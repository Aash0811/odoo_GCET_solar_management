import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import DashboardLayout from '../layouts/DashboardLayout';

// Pages
import LoginPage from '../pages/auth/LoginPage';
import SharedDashboardPage from '../pages/public/SharedDashboardPage';
import CompanyWebsitePage from '../pages/public/CompanyWebsitePage';
import SharedQuoteViewPage from '../pages/public/SharedQuoteViewPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import UserManagementPage from '../pages/admin/UserManagementPage';
import LeadBoardPage from '../pages/sales/LeadBoardPage';
import QuoteBuilderPage from '../pages/sales/QuoteBuilderPage';
import OrderPaymentsPage from '../pages/sales/OrderPaymentsPage';
import PickListDispatchPage from '../pages/warehouse/PickListDispatchPage';
import DeliveryAgentPage from '../pages/delivery/DeliveryAgentPage';
import InventoryPage from '../pages/warehouse/InventoryPage';
import SerialScannerPage from '../pages/warehouse/SerialScannerPage';
import TechnicianJobsPage from '../pages/technician/TechnicianJobsPage';
import MobileInstallFormPage from '../pages/technician/MobileInstallFormPage';
import ServiceDeskPage from '../pages/support/ServiceDeskPage';
import FinancePage from '../pages/finance/FinancePage';
import CustomerPortalPage from '../pages/customer/CustomerPortalPage';
import CustomerDashboardPage from '../pages/customer/CustomerDashboardPage';
import QuotePage from '../pages/customer/QuotePage';
import OrderTrackingPage from '../pages/customer/OrderTrackingPage';
import InstalledProductsPage from '../pages/customer/InstalledProductsPage';
import WarrantyPage from '../pages/customer/WarrantyPage';
import AcceptancePage from '../pages/customer/AcceptancePage';
import RaiseTicketPage from '../pages/customer/RaiseTicketPage';
import SolarPackageConfiguratorPage from '../pages/admin/SolarPackageConfiguratorPage';
import SurveysPage from '../pages/operations/SurveysPage';
import { useAuth } from '../hooks/useAuth';

function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (role === 'CUSTOMER') return <Navigate to="/customer-portal" replace />;
  if (role === 'TECHNICIAN') return <Navigate to="/technician/jobs" replace />;
  if (role === 'WAREHOUSE') return <Navigate to="/warehouse/dispatch" replace />;
  if (role === 'DELIVERY_AGENT') return <Navigate to="/delivery/assigned" replace />;
  if (role === 'SUPPORT') return <Navigate to="/support/tickets" replace />;
  if (role === 'SALESMAN') return <Navigate to="/sales/leads" replace />;
  return <Navigate to="/admin/dashboard" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root Application - Defaults to Login / Role Dashboard */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/app" element={<RootRedirect />} />

      {/* Side Pages: Company Website, Shared Dashboard & Public Shared Quotation */}
      <Route path="/website" element={<CompanyWebsitePage />} />
      <Route path="/company-website" element={<CompanyWebsitePage />} />
      <Route path="/shared-dashboard" element={<SharedDashboardPage />} />
      <Route path="/shared-quote/:token" element={<SharedQuoteViewPage />} />

      {/* Protected Routes inside DashboardLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Admin & Accountant Executive Dashboard & Finance routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'ACCOUNTANT']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/finance/costing" element={<FinancePage defaultTab="costing" />} />
            <Route path="/finance/payouts" element={<FinancePage defaultTab="payouts" />} />
            <Route path="/finance/invoices" element={<FinancePage defaultTab="invoices" />} />
          </Route>

          {/* Admin only: User Management */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/users" element={<UserManagementPage />} />
          </Route>

          {/* Master Product & Package Catalogue contains internal cost and margin data. */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/packages" element={<SolarPackageConfiguratorPage />} />
          </Route>

          {/* Sales Quotation Studio (Admin and Salesman) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALESMAN']} />}>
            <Route path="/sales/quotes" element={<QuoteBuilderPage />} />
          </Route>

          {/* Sales & Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALESMAN']} />}>
            <Route path="/sales/leads" element={<LeadBoardPage />} />
          </Route>

          {/* Orders & Payments (Admin, Salesman, Accountant) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SALESMAN', 'ACCOUNTANT']} />}>
            <Route path="/sales/orders" element={<OrderPaymentsPage />} />
          </Route>

          {/* Site Survey Operations (Admin, Technician) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'TECHNICIAN']} />}>
            <Route path="/operations/surveys" element={<SurveysPage />} />
          </Route>

          {/* Warehouse routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE']} />}>
            <Route path="/warehouse/dispatch" element={<PickListDispatchPage />} />
            <Route path="/warehouse/inventory" element={<InventoryPage />} />
            <Route path="/warehouse/scanner" element={<SerialScannerPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'DELIVERY_AGENT']} />}>
            <Route path="/delivery/assigned" element={<DeliveryAgentPage />} />
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

          {/* Customer Portal & Dedicated Pages */}
          <Route element={<ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']} />}>
            <Route path="/customer-portal" element={<CustomerPortalPage />} />
            <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
            <Route path="/customer/quotes" element={<QuotePage />} />
            <Route path="/customer/orders" element={<OrderTrackingPage />} />
            <Route path="/customer/products" element={<InstalledProductsPage />} />
            <Route path="/customer/warranties" element={<WarrantyPage />} />
            <Route path="/customer/acceptance" element={<AcceptancePage />} />
            <Route path="/customer/tickets/new" element={<RaiseTicketPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
