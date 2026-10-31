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
  DollarSign,
  Briefcase,
  Layers,
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
        // Axios returns response with body in res.data, backend returns { success: true, data: { companyName, expiresAt, stats } }
        const payload = res.data?.data || res.data;
        setData(payload);
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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-medium text-slate-300">Decrypting secure executive dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 max-w-md w-full space-y-4">
          <Lock className="w-12 h-12 text-rose-400 mx-auto" />
          <h1 className="text-lg font-bold text-white">Link Expired or Invalid</h1>
          <p className="text-xs text-rose-300">{error}</p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-block px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white rounded-lg transition"
            >
              Back to ERP Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const payload = data?.data || data || {};
  const { companyName = 'SunPower Solutions Pvt Ltd', expiresAt, stats } = payload;
  const {
    kpis = {},
    charts = {},
    jobCostings = [],
    openTicketsWithAge = [],
  } = stats || {};

  const formattedExpiry = expiresAt
    ? new Date(expiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Active';

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
            <p className="text-xs text-[#dabfd2]/70 mt-0.5">
              Executive Solar Operations Overview • Token valid until {formattedExpiry}
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
            <p className="text-[11px] font-medium text-[#dabfd2] uppercase tracking-wider">Outstanding Balance</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">₹{Number(kpis.totalOutstanding || 0).toLocaleString()}</p>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
              <Receipt className="w-3.5 h-3.5 text-amber-400" /> {kpis.ordersCount || 0} Invoiced Orders
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
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {kpis.openTicketsCount || 0} Active Tickets
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

        {/* Detailed Sections: Job Costings & Open Tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Installation Profitability Table */}
          <div className="lg:col-span-2 bg-[#241621] border border-[#3a2534] p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#f09e38]" />
                <h3 className="text-sm font-bold text-white">Rooftop Solar Installations & Profitability</h3>
              </div>
              <span className="text-[10px] text-[#dabfd2]">{jobCostings.length} Recorded Projects</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="text-[10px] uppercase text-[#dabfd2] border-b border-[#3a2534] bg-[#2a1b27]">
                  <tr>
                    <th className="py-2.5 px-3">Order</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Capacity</th>
                    <th className="py-2.5 px-3 text-right">Revenue</th>
                    <th className="py-2.5 px-3 text-right">Total Cost</th>
                    <th className="py-2.5 px-3 text-right">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#3a2534]">
                  {jobCostings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        No installation costings recorded yet.
                      </td>
                    </tr>
                  ) : (
                    jobCostings.slice(0, 6).map((job) => (
                      <tr key={job.orderId} className="hover:bg-[#2d1e2a]/60">
                        <td className="py-2.5 px-3 font-mono font-semibold text-white">{job.orderNumber}</td>
                        <td className="py-2.5 px-3">{job.customerName}</td>
                        <td className="py-2.5 px-3">{job.capacityKw} kW</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-mono">
                          ₹{Number(job.revenue).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400 font-mono">
                          ₹{Number(job.totalCost).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              job.isLossMaking
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {job.profitMargin}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Service Tickets */}
          <div className="bg-[#241621] border border-[#3a2534] p-5 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#714b67]" />
                <h3 className="text-sm font-bold text-white">Active Service Desk</h3>
              </div>
              <span className="text-[10px] text-[#dabfd2]">{openTicketsWithAge.length} Open</span>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-72">
              {openTicketsWithAge.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Zero pending service tickets.</p>
              ) : (
                openTicketsWithAge.map((t) => (
                  <div key={t.id} className="p-3 bg-[#1e121b] border border-[#3a2534] rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold text-[#f09e38]">{t.ticketNumber}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#714b67]/30 text-[#dabfd2]">
                        {t.status}
                      </span>
                    </div>
                    <p className="text-xs text-white font-medium line-clamp-1">{t.title}</p>
                    <p className="text-[10px] text-slate-400">Customer: {t.customerName}</p>
                  </div>
                ))
              )}
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
