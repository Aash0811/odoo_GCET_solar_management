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
    { role: 'ADMIN', name: 'Director', email: 'admin@sunpower.com', color: 'from-sky-500 to-blue-600', path: '/admin/dashboard' },
    { role: 'SALESMAN', name: 'Sales Lead', email: 'sales@sunpower.com', color: 'from-amber-500 to-orange-600', path: '/sales/leads' },
    { role: 'WAREHOUSE', name: 'Stock & Serials', email: 'warehouse@sunpower.com', color: 'from-emerald-500 to-teal-600', path: '/warehouse/dispatch' },
    { role: 'TECHNICIAN', name: 'Mobile Form', email: 'tech@sunpower.com', color: 'from-purple-500 to-indigo-600', path: '/technician/jobs' },
    { role: 'SUPPORT', name: 'Service Desk', email: 'support@sunpower.com', color: 'from-rose-500 to-pink-600', path: '/support/tickets' },
    { role: 'CUSTOMER', name: 'Customer Portal', email: 'customer@sunpower.com', color: 'from-cyan-500 to-blue-500', path: '/customer-portal' },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid md:grid-cols-2 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl">
        {/* Left Side: Branding & Quick Demo Logins */}
        <div className="p-8 bg-gradient-to-br from-slate-900 via-sky-950/40 to-slate-900 border-r border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/30">
                <Sun className="w-7 h-7 text-white animate-spin-slow" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">SunPower Solutions</h1>
                <p className="text-xs text-sky-400 font-medium">Solar Installation Management ERP</p>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-6">
              End-to-end solar project lifecycle: <br />
              <span className="text-sky-400 font-medium">Enquiry → Survey → Quote → Order → Serial Scan → Install → Warranty → Support</span>
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> 1-Click Hackathon Role Logins:
              </div>
              <div className="grid grid-cols-2 gap-2">
                {demoRoles.map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleQuickLogin(demo)}
                    disabled={submitting}
                    className="p-2.5 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700/80 hover:border-sky-500/50 transition-all text-left group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[11px] font-bold text-white">{demo.role}</span>
                      <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-sky-400 transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <span className="text-[10px] text-slate-400">{demo.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PostgreSQL Multi-tenant companyId scoped</span>
          </div>
        </div>

        {/* Right Side: Standard Login Form */}
        <div className="p-8 flex flex-col justify-center bg-slate-900/60">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Sign In to Portal</h2>
            <p className="text-xs text-slate-400 mt-1">Use phone or email with your password</p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email or Phone Number</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@sunpower.com or 9876543210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/25 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {submitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] text-slate-500">
            Default demo password: <code className="text-amber-400 bg-slate-800 px-1.5 py-0.5 rounded">password123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
