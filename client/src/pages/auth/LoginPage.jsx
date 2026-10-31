import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Sun, ShieldCheck, Zap, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login, quickSwitchRole } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('admin@sunpower.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const demoRoles = [
    { role: 'ADMIN', name: 'Director', email: 'admin@sunpower.com', path: '/admin/dashboard' },
    { role: 'SALESMAN', name: 'Sales Lead', email: 'sales@sunpower.com', path: '/sales/leads' },
    { role: 'WAREHOUSE', name: 'Stock & Serials', email: 'warehouse@sunpower.com', path: '/warehouse/dispatch' },
    { role: 'TECHNICIAN', name: 'Mobile Form', email: 'tech@sunpower.com', path: '/technician/jobs' },
    { role: 'SUPPORT', name: 'Service Desk', email: 'support@sunpower.com', path: '/support/tickets' },
    { role: 'CUSTOMER', name: 'Customer Portal', email: 'customer@sunpower.com', path: '/customer-portal' },
  ];

  const handleManualLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(identifier, password);
      if (user.role === 'CUSTOMER') navigate('/customer-portal');
      else if (user.role === 'TECHNICIAN') navigate('/technician/jobs');
      else if (user.role === 'WAREHOUSE') navigate('/warehouse/dispatch');
      else if (user.role === 'SUPPORT') navigate('/support/tickets');
      else if (user.role === 'SALESMAN') navigate('/sales/leads');
      else navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (demo) => {
    setSubmitting(true);
    setError('');
    try {
      await quickSwitchRole(demo.role);
      navigate(demo.path);
    } catch (err) {
      setError('Quick login failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#241621] via-[#3a2534] to-[#1c111a] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-[#4c3145] bg-[#241621]/95 backdrop-blur-xl">
        {/* Left Side: Branding & Quick Demo Logins */}
        <div className="p-8 bg-gradient-to-br from-[#241621] via-[#4c3145]/40 to-[#241621] border-r border-[#3a2534] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#f09e38] to-[#714b67] flex items-center justify-center shadow-lg shadow-[#714b67]/30">
                <Sun className="w-7 h-7 text-white animate-spin-slow" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">SunPower Solutions</h1>
                <p className="text-xs text-[#f09e38] font-medium">Solar Installation ERP</p>
              </div>
            </div>

            <p className="text-[#dabfd2] text-xs leading-relaxed mb-6">
              End-to-end rooftop solar lifecycle: <br />
              <span className="text-white font-medium">Enquiry → Survey → Quote → Order → Serial Scan → Install → Warranty → Support</span>
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f09e38] uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> 1-Click Persona Logins:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {demoRoles.map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleQuickLogin(demo)}
                    disabled={submitting}
                    className="p-2.5 rounded-xl border border-[#5e3d55] bg-[#3a2534]/60 hover:bg-[#714b67] hover:border-[#dabfd2]/50 transition-all text-left group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[11px] font-bold text-white">{demo.role}</span>
                      <ArrowRight className="w-3 h-3 text-[#aa789c] group-hover:text-[#f09e38] transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <span className="text-[10px] text-[#dabfd2]">{demo.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#3a2534] flex items-center gap-2 text-[11px] text-[#dabfd2]/80">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PostgreSQL Multi-tenant companyId scoped</span>
          </div>
        </div>

        {/* Right Side: Standard Login Form */}
        <div className="p-8 flex flex-col justify-center bg-[#1c111a]/80">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Sign In to Portal</h2>
            <p className="text-xs text-[#dabfd2] mt-1">Use phone or email with your password</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#dabfd2] mb-1.5">Email or Phone Number</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@sunpower.com or 9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#2e1d2b] border border-[#5e3d55] text-white text-xs placeholder:text-[#aa789c] focus:outline-none focus:ring-2 focus:ring-[#714b67] focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#dabfd2] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#2e1d2b] border border-[#5e3d55] text-white text-xs placeholder:text-[#aa789c] focus:outline-none focus:ring-2 focus:ring-[#714b67] focus:border-transparent transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-[#714b67] hover:bg-[#5e3d55] shadow-lg shadow-[#714b67]/30 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-[#dabfd2]/70">
            Default demo password: <code className="text-[#f09e38] bg-[#2e1d2b] px-1.5 py-0.5 rounded border border-[#5e3d55]">password123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
