import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { dashboardApi } from '../../api';
import {
  Sun,
  ShieldCheck,
  TrendingUp,
  Receipt,
  AlertTriangle,
  Clock,
  Wrench,
  CheckCircle2,
  Calendar,
  Lock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
} from 'recharts';

export default function SharedDashboardPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Access token is missing in the URL query (?token=...).');
      setLoading(false);
      return;
    }

    const fetchShared = async () => {
      try {
        setLoading(true);
        const res = await dashboardApi.getShared(token);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'The shared dashboard link has expired or is invalid.');
      } finally {
        setLoading(false);
      }
    };

    fetchShared();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-slate-300">Decrypting secure executive dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 max-w-md w-full space-y-3">
          <Lock className="w-10 h-10 text-rose-400 mx-auto" />
          <h1 className="text-lg font-bold text-white">Link Expired or Invalid</h1>
          <p className="text-xs text-rose-300">{error}</p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg"
            >
              Back to ERP Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { companyName, expiresAt, stats } = data;
  const { kpis = {}, charts = {} } = stats || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8">
      {/* Executive Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#3a2534] pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#f09e38] to-[#714b67] flex items-center justify-center shadow-lg shadow-[#714b67]/30">
            <Sun className="w-7 h-7 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{companyName}</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#714b67]/30 text-[#dabfd2] uppercase tracking-wider">
                Live Read-Only View
              </span>
            </div>
            <p className="text-xs text-[#dabfd2]/70">
              Executive Solar Operations Overview • Token valid until {new Date(expiresAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <Link
          to="/login"
          className="text-xs text-[#f09e38] hover:underline font-semibold flex items-center gap-1 self-start md:self-auto"
        >
          Staff Sign In →
        </Link>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top KPIs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#241621] border border-[#3a2534] p-4 rounded-xl shadow-lg">
            <p className="text-[11px] font-medium text-[#dabfd2] uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-bold text-white mt-1">₹{Number(kpis.totalRevenue || 0).toLocaleString()}</p>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-2 font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> ₹{Number(kpis.totalCollections || 0).toLocaleString()} Collected
            </div>
          </div>

          <div className="bg-[#241621] border border-[#3a2534] p-4 rounded-xl shadow-lg">
            <p className="text-[11px] font-medium text-[#dabfd2] uppercase tracking-wider">Rooftop Installs</p>
            <p className="text-2xl font-bold text-[#dabfd2] mt-1">{kpis.jobsCompleted || 0} Finished</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
              <Clock className="w-3.5 h-3.5 text-[#f09e38]" /> {kpis.jobsInProgress || 0} In Progress
            </div>
          </div>

          <div className="bg-[#241621] border border-[#3a2534] p-4 rounded-xl shadow-lg">
            <p className="text-[11px] font-medium text-[#dabfd2] uppercase tracking-wider">Lead Conversion</p>
            <p className="text-2xl font-bold text-[#f09e38] mt-1">{kpis.conversionRate || 0}%</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {kpis.ordersCount || 0} Confirmed Orders
            </div>
          </div>

          <div className="bg-[#241621] border border-[#3a2534] p-4 rounded-xl shadow-lg">
            <p className="text-[11px] font-medium text-[#dabfd2] uppercase tracking-wider">Open Tickets</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{kpis.openTicketsCount || 0}</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
              <Wrench className="w-3.5 h-3.5 text-slate-400" /> Service Desk Active
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue & Collections Trend */}
          <div className="bg-[#241621] border border-[#3a2534] p-5 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">Monthly Revenue & Collections (INR)</h3>
              <span className="text-[10px] text-[#dabfd2]">Past 6 Months</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthlyTrends || []}>
                  <defs>
                    <linearGradient id="sharedRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#714b67" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#714b67" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sharedCol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00a09d" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#00a09d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3a2534" />
                  <XAxis dataKey="month" stroke="#aa789c" fontSize={11} />
                  <YAxis stroke="#aa789c" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#241621', borderColor: '#5e3d55', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#714b67" fill="url(#sharedRev)" name="Revenue" />
                  <Area
                    type="monotone"
                    dataKey="collections"
                    stroke="#00a09d"
                    fill="url(#sharedCol)"
                    name="Collections"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Lead Funnel by Pipeline Stage */}
          <div className="bg-[#241621] border border-[#3a2534] p-5 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">Leads by Pipeline Stage</h3>
              <span className="text-[10px] text-[#dabfd2]">Current Distribution</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.leadsByStage || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3a2534" />
                  <XAxis dataKey="stage" stroke="#aa789c" fontSize={9} interval={0} angle={-15} textAnchor="end" />
                  <YAxis stroke="#aa789c" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#241621', borderColor: '#5e3d55', borderRadius: '8px', color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#f09e38" radius={[4, 4, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Executive Footer */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <span>SunPower Solutions ERP • Secure Temporary Auditor Portal</span>
          <span>Data refreshed dynamically from PostgreSQL</span>
        </div>
      </div>
    </div>
  );
}
