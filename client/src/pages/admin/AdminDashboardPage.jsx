import React, { useState, useEffect } from 'react';
import { dashboardApi } from '../../api';
import {
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  Download,
  Share2,
  CheckCircle2,
  ShieldAlert,
  Flame,
  ArrowUpRight,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

export default function AdminDashboardPage() {
  const [timeframe, setTimeframe] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getStats(timeframe);
      setData(res.data?.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  const handleGenerateShareLink = async () => {
    try {
      const res = await dashboardApi.createShareLink({ expiresInDays: 7 });
      const fullUrl = `${window.location.origin}/shared-dashboard?token=${res.data.data.token}`;
      setShareLink(fullUrl);
      setShareModalOpen(true);
    } catch (err) {
      alert('Failed to generate shareable link: ' + (err.response?.data?.message || err.message));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const unfinishedJobs = data?.unfinishedJobs || [];
  const lossJobs = (data?.jobCostings || []).filter((j) => j.isLossMaking);
  const expiringWarranties = data?.expiringWarranties || [];
  const openTickets = data?.openTicketsWithAge || [];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time solar project performance, finance & operations</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Timeframe Filter */}
          <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
            {['today', 'week', 'month', 'all'].map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-md capitalize transition-all ${
                  timeframe === t ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <a
            href={dashboardApi.exportCsvUrl()}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </a>

          {/* Shareable Link Button */}
          <button
            onClick={handleGenerateShareLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Share2 className="w-3.5 h-3.5" /> Share Read-Only Link
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Revenue</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              ₹{(kpis.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3" /> Collections: ₹{(kpis.totalCollections || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Outstanding</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">
              ₹{(kpis.totalOutstanding || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Pending client collections</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Lead Conversion</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{kpis.conversionRate || 0}%</div>
            <p className="text-[11px] text-slate-500 mt-1">
              {kpis.newLeads || 0} active leads / {kpis.ordersCount || 0} orders
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Loss-Making Jobs</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-xl font-bold ${kpis.lossMakingJobsCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {kpis.lossMakingJobsCount || 0} Jobs
            </div>
            <p className="text-[11px] text-rose-500 font-medium mt-1">Flagged below cost margin</p>
          </div>
        </div>
      </div>

      {/* Recharts Trends */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Revenue vs Collections (Monthly INR)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="revenue" fill="#0284c7" name="Billed Revenue" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collections" fill="#10b981" name="Received Collections" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-4">Leads by Sales Funnel Stage</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.leadsByStage || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                <YAxis type="category" dataKey="stage" width={110} stroke="#94a3b8" fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" name="Leads" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operational Sections: Stuck Jobs & Loss-making jobs */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Unfinished / Stuck Jobs with Exact Stuck Step */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Unfinished Jobs & Stuck Step ({unfinishedJobs.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-60">
            {unfinishedJobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">All jobs completed on schedule!</p>
            ) : (
              unfinishedJobs.map((job) => (
                <div key={job.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{job.jobNumber}</span> - {job.customerName}
                    <div className="text-[11px] text-amber-600 font-medium mt-0.5">⚠️ {job.stuckStep}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 font-semibold uppercase">
                    {job.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Flagged Loss-Making Jobs */}
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <Flame className="w-4 h-4" /> Loss-Making Orders Flagged ({lossJobs.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-60">
            {lossJobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No loss-making projects recorded.</p>
            ) : (
              lossJobs.map((job) => (
                <div key={job.orderId} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-800">{job.orderNumber}</span> ({job.customerName})
                    <div className="text-[11px] text-slate-500">
                      Revenue: ₹{job.revenue.toLocaleString()} | Costs: ₹{job.totalCost.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-600 font-mono">
                      -₹{Math.abs(job.profit).toLocaleString()} ({job.profitMargin}%)
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Warranties Expiring in 60 Days & Open Tickets with Age */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-purple-600" />
            Warranties Expiring in 60 Days ({expiringWarranties.length})
          </h2>
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-52">
            {expiringWarranties.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No warranties expiring within 60 days.</p>
            ) : (
              expiringWarranties.map((w) => (
                <div key={w.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{w.serialNumber?.serial}</span> - {w.customer?.name}
                    <p className="text-[10px] text-slate-500">{w.serialNumber?.product?.name}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">
                    {w.daysLeft} days left
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Open Support Tickets with Age ({openTickets.length})
          </h2>
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-52">
            {openTickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">All service tickets resolved.</p>
            ) : (
              openTickets.map((t) => (
                <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{t.ticketNumber}</span>: {t.title}
                    <p className="text-[10px] text-slate-500">Customer: {t.customerName}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700">
                    {t.ageDays} days old
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Shareable Link Modal */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-sky-600" /> Shareable Read-Only Link
              </h3>
              <button onClick={() => setShareModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              This cryptographic token provides read-only executive view access for 7 days without login.
            </p>

            <div className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg mb-4">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="bg-transparent text-xs text-slate-800 flex-1 outline-none font-mono truncate"
              />
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 rounded bg-sky-600 text-white text-xs font-semibold flex items-center gap-1 hover:bg-sky-500"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <a
                href={shareLink}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open Preview
              </a>
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
