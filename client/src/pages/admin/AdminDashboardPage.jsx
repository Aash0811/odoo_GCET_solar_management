import React, { useState, useEffect } from 'react';
import { dashboardApi, companyApi } from '../../api';
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
  Sparkles,
  Zap,
  BarChart3,
  Calendar,
  Layers,
  Building2,
  X,
  Save,
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

  // Company Profile Modal State (Single Company Settings)
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: 'SunPower Solutions Pvt Ltd',
    gstNumber: '36AABCS1234F1Z8',
    email: 'info@sunpowersolutions.com',
    phone: '+91 98765 00000',
    address: 'Plot 42, Energy Park, Hyderabad, Telangana 500081',
  });
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);

  const handleOpenCompanySettings = async () => {
    setCompanyModalOpen(true);
    setCompanySaved(false);
    try {
      const res = await companyApi.get();
      if (res.data?.data) {
        setCompanyForm({
          name: res.data.data.name || '',
          gstNumber: res.data.data.gstNumber || '',
          email: res.data.data.email || '',
          phone: res.data.data.phone || '',
          address: res.data.data.address || '',
        });
      }
    } catch (err) {
      console.error('Failed to load company profile:', err);
    }
  };

  const handleSaveCompanySettings = async (e) => {
    e.preventDefault();
    setCompanyLoading(true);
    try {
      await companyApi.update(companyForm);
      setCompanySaved(true);
      setTimeout(() => {
        setCompanySaved(false);
        setCompanyModalOpen(false);
      }, 1500);
    } catch (err) {
      alert('Failed to update company settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setCompanyLoading(false);
    }
  };

  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      const res = await dashboardApi.exportCsv();
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sunpower-solar-audit-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download CSV:', err);
      // Fallback to tokenized URL
      window.open(dashboardApi.exportCsvUrl(), '_blank');
    } finally {
      setDownloadingCsv(false);
    }
  };

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
        <div className="w-10 h-10 border-4 border-[#714b67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const unfinishedJobs = data?.unfinishedJobs || [];
  const lossJobs = (data?.jobCostings || []).filter((j) => j.isLossMaking);
  const expiringWarranties = data?.expiringWarranties || [];
  const openTickets = data?.openTicketsWithAge || [];

  return (
    <div className="min-h-full space-y-7 bg-slate-50/80 p-1 sm:p-2">
      {/* Top Header & Executive Controls */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/70 p-5 sm:p-7 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Executive Solar Suite</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 max-w-2xl leading-relaxed">
            Real-time Telemetry: Commercial Pipeline • Production Warranties • Financial Margin Audits
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Timeframe Filter Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200 shadow-inner">
            {['today', 'week', 'month', 'all'].map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3.5 py-2 rounded-lg capitalize transition-all duration-200 cursor-pointer ${
                  timeframe === t
                    ? 'bg-slate-900 text-white shadow-sm font-black'
                    : 'text-slate-700 hover:bg-white/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" /> {downloadingCsv ? 'Downloading...' : 'CSV Report'}
          </button>

          {/* Company Profile Settings Button */}
          <button
            onClick={handleOpenCompanySettings}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black shadow-xs transition cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-500" /> Company Profile
          </button>

          {/* Shareable Link Button */}
          <button
            onClick={handleGenerateShareLink}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-emerald-700 hover:opacity-95 text-white text-xs font-black shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-500" /> Expiring Share Link
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
        {/* Revenue Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[168px]">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-slate-900 via-emerald-500 to-[#f09e38]"></div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Contracted Gross</span>
            <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shadow-xs group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              ₹{(kpis.totalRevenue || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-emerald-700 font-black flex items-center gap-1 mt-1.5 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-200">
              <ArrowUpRight className="w-3.5 h-3.5" /> ₹{(kpis.totalCollections || 0).toLocaleString('en-IN')} collected
            </p>
          </div>
        </div>

        {/* Outstanding Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[168px]">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-amber-400 to-amber-500"></div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">Receivables</span>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shadow-xs group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              ₹{(kpis.totalOutstanding || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-amber-800 font-bold mt-1.5 bg-amber-50 px-2 py-0.5 rounded-md w-fit border border-amber-200">
              Balance to collect
            </p>
          </div>
        </div>

        {/* Conversion Rate Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[168px]">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Pipeline Win Rate</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shadow-xs group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">{kpis.conversionRate || 0}%</div>
            <p className="text-[11px] text-emerald-800 font-bold mt-1.5 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-200">
              {kpis.newLeads || 0} active / {kpis.ordersCount || 0} converted
            </p>
          </div>
        </div>

        {/* Rule 9 Loss-Making Jobs Alert Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[168px]">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-rose-500 to-rose-600"></div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-700">Rule 9 Cost Audit</span>
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 shadow-xs group-hover:scale-110 transition-transform">
              <Flame className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black ${kpis.lossMakingJobsCount > 0 ? 'text-rose-600' : 'text-slate-900'} tracking-tight`}>
              {kpis.lossMakingJobsCount || 0} Flagged
            </div>
            <p className="text-[11px] text-rose-800 font-bold mt-1.5 bg-rose-50 px-2 py-0.5 rounded-md w-fit border border-rose-200">
              {kpis.lossMakingJobsCount > 0 ? 'Cost Overrun Detected' : 'All Orders Profitable'}
            </p>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts in Odoo Palette */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 space-y-5 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
              Revenue vs Collections (Fiscal INR)
            </h2>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Odoo FinEngine
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} fontWeight={600} />
                <YAxis stroke="#64748B" fontSize={11} fontWeight={600} />
                <Tooltip
                  formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', fontWeight: 600 }} />
                <Bar dataKey="revenue" fill="#0F766E" name="Billed Revenue" radius={[6, 6, 0, 0]} />
                <Bar dataKey="collections" fill="#10B981" name="Collections Received" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 space-y-5 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Sales Funnel Conversion Velocity
            </h2>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-[#f09e38]/30">
              Live Pipeline
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.leadsByStage || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" fontSize={11} fontWeight={600} />
                <YAxis type="category" dataKey="stage" width={110} stroke="#64748B" fontSize={10} fontWeight={600} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                <Bar dataKey="count" fill="#F59E0B" name="Leads Count" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Operational Grids: Unfinished Stuck Jobs & Flagged Loss-making jobs */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
        {/* Unfinished / Stuck Jobs with Exact Step */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Installation Pipeline & Stuck Step ({unfinishedJobs.length})
            </h2>
          </div>
          <div className="divide-y divide-[#EBDCE7]/60 overflow-y-auto max-h-60">
            {unfinishedJobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center font-medium">All installations on schedule!</p>
            ) : (
              unfinishedJobs.map((job) => (
                <div key={job.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-slate-900">{job.jobNumber}</span> - {job.customerName}
                    <div className="text-[11px] text-amber-700 font-bold mt-0.5 flex items-center gap-1">
                      <span>⚠️ Stuck Step:</span> {job.stuckStep}
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-700 font-black uppercase border border-slate-200">
                    {job.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Flagged Loss-Making Jobs (Rule 9) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-rose-600 flex items-center gap-2">
              <Flame className="w-4 h-4" /> Loss-Making Orders (Rule 9 Audit) ({lossJobs.length})
            </h2>
          </div>
          <div className="divide-y divide-[#EBDCE7]/60 overflow-y-auto max-h-60">
            {lossJobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center font-medium">Zero loss-making projects on record.</p>
            ) : (
              lossJobs.map((job) => (
                <div key={job.orderId} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-black text-slate-900">{job.orderNumber}</span> ({job.customerName})
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Revenue: ₹{job.revenue.toLocaleString()} | Costs: ₹{job.totalCost.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 font-mono border border-rose-300">
                      -₹{Math.abs(job.profit).toLocaleString()} ({job.profitMargin}%)
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Warranties Expiring & Support SLA */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 space-y-4 min-w-0">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-700" />
            Warranties Expiring Soon (&lt;60 Days) ({expiringWarranties.length})
          </h2>
          <div className="divide-y divide-[#EBDCE7]/60 overflow-y-auto max-h-52">
            {expiringWarranties.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center font-medium">All warranties active and safe.</p>
            ) : (
              expiringWarranties.map((w) => (
                <div key={w.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-black text-slate-700">{w.serialNumber?.serial}</span> - {w.customer?.name}
                    <p className="text-[10px] text-slate-500 font-medium">{w.serialNumber?.product?.name}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                    {w.daysLeft} days remaining
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 space-y-4 min-w-0">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            Open Service Desk Tickets ({openTickets.length})
          </h2>
          <div className="divide-y divide-[#EBDCE7]/60 overflow-y-auto max-h-52">
            {openTickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center font-medium">Zero pending tickets in queue.</p>
            ) : (
              openTickets.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-black text-slate-900">{t.ticketNumber}</span>: {t.title}
                    <p className="text-[10px] text-slate-500 font-medium">Customer: {t.customerName}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                    {t.ageDays} days open
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Shareable Link Modal in Odoo Theme */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-black text-slate-900">Expiring Executive Share Link</h3>
              </div>
              <button onClick={() => setShareModalOpen(false)} className="text-slate-400 cursor-pointer">
                ✕
              </button>
            </div>
            <p className="text-slate-600 mb-4">
              This cryptographically signed URL grants 7-day read-only executive telemetry to bank officials, investors, and auditors without login credentials.
            </p>

            <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl mb-4">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="bg-transparent text-xs text-slate-900 flex-1 outline-none font-mono truncate font-bold"
              />
              <button
                onClick={copyToClipboard}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-black flex items-center gap-1 hover:bg-slate-800 cursor-pointer transition"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex justify-end gap-2.5">
              <a
                href={shareLink}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-black text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Launch Preview
              </a>
              <button
                onClick={() => setShareModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-slate-900 to-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Profile Settings Modal (Single Company Dedicated Edition) */}
      {companyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-fade-in text-slate-900">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-900">Company Profile & Branding</h3>
                  <p className="text-xs text-slate-700 font-semibold">Single Company Dedicated Configuration</p>
                </div>
              </div>
              <button
                onClick={() => setCompanyModalOpen(false)}
                className="text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {companySaved && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Company profile updated successfully across all PDF quotes, invoices and operations!</span>
              </div>
            )}

            <form onSubmit={handleSaveCompanySettings} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.gstNumber}
                    onChange={(e) => setCompanyForm({ ...companyForm, gstNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Phone *</label>
                  <input
                    type="text"
                    required
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Official Email *</label>
                <input
                  type="email"
                  required
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Headquarters / Operational Address *</label>
                <textarea
                  rows={2}
                  required
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-[11px] text-slate-700">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Single-Company Binding Active:
                </p>
                <p className="text-[10.5px] mt-0.5 text-slate-600">
                  All customer quotes, tax invoices, technician completion certificates, and warehouse dispatches automatically bind to this company.
                </p>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCompanyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={companyLoading}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-slate-900 to-emerald-700 text-white text-xs font-black shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-amber-500" />
                  {companyLoading ? 'Saving...' : 'Save Company Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
