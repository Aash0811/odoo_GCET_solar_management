import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Sun,
  LayoutDashboard,
  Kanban,
  FileSpreadsheet,
  Receipt,
  Boxes,
  Wrench,
  HeadphonesIcon,
  BadgePercent,
  Coins,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  UserCheck,
  Sparkles,
} from 'lucide-react';

export default function DashboardLayout() {
  const { user, role, logout, quickSwitchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
    { label: 'Lead Board (Kanban)', path: '/sales/leads', icon: Kanban, roles: ['ADMIN', 'SALESMAN'] },
    { label: 'Quote Builder', path: '/sales/quotes', icon: FileSpreadsheet, roles: ['ADMIN', 'SALESMAN'] },
    { label: 'Orders & Payments', path: '/sales/orders', icon: Receipt, roles: ['ADMIN', 'SALESMAN'] },
    { label: 'Warehouse & Dispatch', path: '/warehouse/dispatch', icon: Boxes, roles: ['ADMIN', 'WAREHOUSE'] },
    { label: 'Installation Jobs', path: '/technician/jobs', icon: Wrench, roles: ['ADMIN', 'TECHNICIAN'] },
    { label: 'Service Desk & Tickets', path: '/support/tickets', icon: HeadphonesIcon, roles: ['ADMIN', 'SUPPORT'] },
    { label: 'Warranty Lookup', path: '/warranty/lookup', icon: ShieldCheck, roles: ['ADMIN', 'SUPPORT', 'SALESMAN'] },
    { label: 'Job Costing & Finance', path: '/finance/costing', icon: Coins, roles: ['ADMIN'] },
    { label: 'Subsidy Tracker', path: '/finance/subsidies', icon: BadgePercent, roles: ['ADMIN', 'SALESMAN', 'SUPPORT'] },
    { label: 'Customer Portal', path: '/customer-portal', icon: UserCheck, roles: ['CUSTOMER'] },
  ];

  const visibleNav = navItems.filter((item) => item.roles.includes(role));

  const handleRoleChange = async (newRole) => {
    await quickSwitchRole(newRole);
    if (newRole === 'CUSTOMER') navigate('/customer-portal');
    else if (newRole === 'TECHNICIAN') navigate('/technician/jobs');
    else if (newRole === 'WAREHOUSE') navigate('/warehouse/dispatch');
    else if (newRole === 'SUPPORT') navigate('/support/tickets');
    else if (newRole === 'SALESMAN') navigate('/sales/leads');
    else navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-100 shadow-xl border-r border-slate-800 shrink-0">
        <div className="p-5 flex items-center gap-3 border-b border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Sun className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              SunPower <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono">ERP</span>
            </h1>
            <p className="text-[11px] text-slate-400">Rooftop Solar Solutions</p>
          </div>
        </div>

        {/* Demo Role Switcher Badge */}
        <div className="px-4 py-3 bg-slate-800/60 border-b border-slate-800">
          <label className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-1 mb-1">
            <Sparkles className="w-3 h-3 text-amber-400" /> Hackathon Demo Switcher
          </label>
          <select
            value={role || 'ADMIN'}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full text-xs font-medium bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500 outline-none"
          >
            <option value="ADMIN">ADMIN (Director)</option>
            <option value="SALESMAN">SALESMAN</option>
            <option value="WAREHOUSE">WAREHOUSE (Stock & Serials)</option>
            <option value="TECHNICIAN">TECHNICIAN (Mobile Form)</option>
            <option value="SUPPORT">SUPPORT (Service Desk)</option>
            <option value="CUSTOMER">CUSTOMER (Portal)</option>
          </select>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Current User & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Staff'}</p>
              <p className="text-[10px] text-sky-400 font-mono uppercase">{role}</p>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-slate-900 text-white p-3 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-sky-400 flex items-center justify-center">
            <Sun className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">SunPower ERP</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 uppercase font-mono">{role}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col p-5">
          <div className="flex justify-between items-center mb-6">
            <span className="text-lg font-bold text-white">Menu & Role Switch</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6">
            <label className="text-xs font-semibold text-slate-400 mb-2 block">Switch Demo Role:</label>
            <select
              value={role || 'ADMIN'}
              onChange={(e) => {
                handleRoleChange(e.target.value);
                setMobileMenuOpen(false);
              }}
              className="w-full text-sm bg-slate-800 border border-slate-700 text-white rounded-lg p-2.5"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="SALESMAN">SALESMAN</option>
              <option value="WAREHOUSE">WAREHOUSE</option>
              <option value="TECHNICIAN">TECHNICIAN</option>
              <option value="SUPPORT">SUPPORT</option>
              <option value="CUSTOMER">CUSTOMER</option>
            </select>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto">
            {visibleNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-lg text-sm font-medium text-slate-200 bg-slate-800/50 hover:bg-slate-800"
              >
                <item.icon className="w-5 h-5 text-sky-400" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <button
            onClick={logout}
            className="mt-4 flex items-center justify-center gap-2 p-3 rounded-lg bg-rose-500/20 text-rose-300 text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar for Technician and Customer */}
      {(role === 'TECHNICIAN' || role === 'CUSTOMER') && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-2 flex justify-around shadow-lg z-30">
          {visibleNav.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] font-medium ${
                  isActive ? 'text-sky-600 font-bold' : 'text-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label.split(' ')[0]}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
