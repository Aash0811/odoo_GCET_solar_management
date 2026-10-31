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
  ChevronRight,
  Bell,
  Shield,
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

  const currentNavItem = navItems.find((item) => location.pathname.startsWith(item.path));

  return (
    <div className="min-h-screen bg-[#FAF6F9] flex flex-col md:flex-row text-[#241621]">
      {/* Sidebar for Desktop in #714B67 Odoo Palette */}
      <aside className="hidden md:flex flex-col w-64 bg-[#22151F] text-slate-100 shadow-2xl border-r border-[#382433] shrink-0 select-none">
        {/* Brand Logo Header */}
        <div className="p-5 flex items-center gap-3 border-b border-[#382433]/80 bg-[#1A0F17]/60">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#f09e38] via-[#e28418] to-[#714b67] flex items-center justify-center shadow-lg shadow-[#714b67]/40 ring-2 ring-[#714b67]/30">
              <Sun className="w-6 h-6 text-white animate-pulse" />
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#22151F]"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-extrabold tracking-tight text-white">SunPower</h1>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#714b67] text-[#f5edf3] tracking-wider uppercase">
                Odoo
              </span>
            </div>
            <p className="text-[10px] font-medium text-[#dabed3]/80 flex items-center gap-1 mt-0.5">
              <span>Solar Suite</span>
              <span className="text-[#f09e38]">•</span>
              <span className="text-[9px] text-[#b886ad]">v2.6 Enterprise</span>
            </p>
          </div>
        </div>

        {/* Demo Role Switcher Badge */}
        <div className="px-4 py-3.5 bg-[#2B1B27] border-b border-[#382433]/70">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] font-bold tracking-wider text-[#dabed3] uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#f09e38] animate-bounce" /> Persona Switcher
            </label>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#f09e38]/20 text-[#f09e38] font-bold uppercase">
              1-Click
            </span>
          </div>
          <select
            value={role || 'ADMIN'}
            onChange={(e) => handleRoleChange(e.target.value)}
            className="w-full text-xs font-semibold bg-[#1A0F17] border border-[#5C3B53] text-white rounded-lg p-2.5 focus:ring-2 focus:ring-[#714b67] outline-none shadow-inner cursor-pointer"
          >
            <option value="ADMIN">ADMIN (Managing Director)</option>
            <option value="SALESMAN">SALESMAN (Lead Pipeline)</option>
            <option value="WAREHOUSE">WAREHOUSE (Stock & Serials)</option>
            <option value="TECHNICIAN">TECHNICIAN (Mobile Form)</option>
            <option value="SUPPORT">SUPPORT (Warranty Desk)</option>
            <option value="CUSTOMER">CUSTOMER (Client Portal)</option>
          </select>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#714b67] text-white shadow-lg shadow-[#714b67]/35 ring-1 ring-white/20'
                    : 'text-[#dabed3] hover:bg-[#341F2E] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-[#f09e38]' : 'text-[#b886ad] group-hover:text-[#dabed3]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
              </Link>
            );
          })}
        </nav>

        {/* Current User & Logout */}
        <div className="p-4 border-t border-[#382433] bg-[#1A0F17]/90">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate mr-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#714b67] to-[#f09e38] flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-white/10 shrink-0">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-white truncate">{user?.name || 'Staff User'}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <p className="text-[10px] text-[#f09e38] font-bold uppercase tracking-wider">{role}</p>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-xl text-[#b886ad] hover:text-rose-400 hover:bg-[#341F2E] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar for Desktop & Mobile */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#EBDCE7] px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xs">
          {/* Breadcrumb & Section Info */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-[#F5EDF3] text-[#714B67]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
              <span>SunPower</span>
              <ChevronRight className="w-3 h-3 text-slate-300" />
              <span className="font-bold text-[#714B67] bg-[#F5EDF3] px-2 py-0.5 rounded-md">
                {currentNavItem?.label || 'Overview'}
              </span>
            </div>
            <span className="sm:hidden font-bold text-sm text-[#241621]">
              {currentNavItem?.label || 'SunPower ERP'}
            </span>
          </div>

          {/* Right Header Badges */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5EDF3] border border-[#EBDCE7] text-[11px] font-semibold text-[#714B67]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              PostgreSQL Connected • Scoped
            </div>

            <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-[#f09e38]/15 to-[#714b67]/15 border border-[#f09e38]/30 text-[11px] font-bold text-[#714B67] flex items-center gap-1.5">
              <span className="text-[#f09e38]">●</span> {role} MODE
            </div>
          </div>
        </header>

        {/* Main Content Area with Ambient Lighting */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8 max-w-7xl mx-auto w-full relative">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#22151F]/95 backdrop-blur-md flex flex-col p-5 text-white">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-[#382433]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f09e38] to-[#714b67] flex items-center justify-center">
                <Sun className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white">SunPower Odoo ERP</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-[#dabed3]">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6 p-3 rounded-xl bg-[#2B1B27] border border-[#382433]">
            <label className="text-xs font-bold text-[#dabed3] mb-2 block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#f09e38]" /> Quick Switch Role:
            </label>
            <select
              value={role || 'ADMIN'}
              onChange={(e) => {
                handleRoleChange(e.target.value);
                setMobileMenuOpen(false);
              }}
              className="w-full text-sm bg-[#1A0F17] border border-[#5C3B53] text-white rounded-lg p-2.5"
            >
              <option value="ADMIN">ADMIN</option>
              <option value="SALESMAN">SALESMAN</option>
              <option value="WAREHOUSE">WAREHOUSE</option>
              <option value="TECHNICIAN">TECHNICIAN</option>
              <option value="SUPPORT">SUPPORT</option>
              <option value="CUSTOMER">CUSTOMER</option>
            </select>
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {visibleNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl text-sm font-semibold text-slate-200 bg-[#2B1B27]/70 hover:bg-[#714b67]"
              >
                <item.icon className="w-5 h-5 text-[#f09e38]" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <button
            onClick={logout}
            className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-500/20 text-rose-300 text-sm font-bold border border-rose-500/30"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar for Technician and Customer */}
      {(role === 'TECHNICIAN' || role === 'CUSTOMER') && (
        <div className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-[#EBDCE7] p-2 flex justify-around shadow-2xl z-30">
          {visibleNav.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all ${
                  isActive ? 'text-[#714b67] bg-[#F5EDF3]' : 'text-slate-400 hover:text-slate-600'
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
