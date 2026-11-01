import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, companyApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
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
  ArrowDownRight,
  Copy,
  ExternalLink,
  Sparkles,
  Zap,
  BarChart3,
  Calendar,
  Layers,
  Building2,
  Users,
  X,
  Save,
  Wallet,
  Receipt,
  Search,
  Filter,
  Check,
  RefreshCw,
  Camera,
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
  const { user, role } = useAuth();
  const isAdmin = role === 'ADMIN';
  const isAccountant = role === 'ACCOUNTANT';

  const [timeframe, setTimeframe] = useState('month');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  // P&L Ledger filters
  const [plFilter, setPlFilter] = useState('ALL'); // 'ALL' | 'PROFIT' | 'LOSS'
  const [plSearch, setPlSearch] = useState('');

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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchStats = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await dashboardApi.getStats(timeframe);
      setData(res.data?.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      if (!isBackground) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats(false);
  }, [timeframe]);

  // Periodic Auto-refresh (Updates telemetry, KPIs, and graphs automatically every 10 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      fetchStats(true);
    }, 10000);
    return () => clearInterval(timer);
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
  const allJobCostings = data?.jobCostings || [];
  const lossJobs = allJobCostings.filter((j) => j.isLossMaking);
  const expiringWarranties = data?.expiringWarranties || [];
  const openTickets = data?.openTicketsWithAge || [];

  // Filtered P&L job list
  const filteredJobCostings = allJobCostings.filter((job) => {
    if (plFilter === 'PROFIT' && job.isLossMaking) return false;
    if (plFilter === 'LOSS' && !job.isLossMaking) return false;
    if (plSearch.trim()) {
      const q = plSearch.toLowerCase();
      const matchOrder = (job.orderNumber || '').toLowerCase().includes(q);
      const matchCustomer = (job.customerName || '').toLowerCase().includes(q);
      if (!matchOrder && !matchCustomer) return false;
    }
    return true;
  });

  return (
    <div className="min-h-full space-y-7 bg-slate-50/80 p-1 sm:p-2">
      {/* Top Header & Executive Controls */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/70 p-5 sm:p-7 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">Executive Solar Suite</h1>
            {isAccountant && (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-[#714b67] border border-purple-200 flex items-center gap-1.5 shadow-xs">
                <Receipt className="w-3.5 h-3.5 text-[#714b67]" /> Accountant P&amp;L Audit Mode
              </span>
            )}
            {isAdmin && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-900 text-white">
                Admin Full Access
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2 max-w-2xl leading-relaxed">
            Real-time Financial Telemetry: Commercial Pipeline • Profit &amp; Loss Audits • Direct BOM &amp; Labor Margins
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

          {/* Live Telemetry Auto-updating Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">Live Sync (10s)</span>
            <button
              onClick={() => fetchStats(false)}
              title="Refresh telemetry now"
              className="ml-1 p-0.5 hover:text-emerald-950 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleDownloadCsv}
            disabled={downloadingCsv}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" /> {downloadingCsv ? 'Downloading...' : 'Export P&L CSV'}
          </button>

          {/* Direct link to Finance Costing & Invoices */}
          <Link
            to="/finance/costing"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black shadow-xs transition cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" /> Costing Ledger
          </Link>

          <Link
            to="/finance/invoices"
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black shadow-xs transition cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-blue-600" /> Invoices &amp; GST
          </Link>

          {/* User Management Button - Admin Only */}
          {isAdmin && (
            <Link
              to="/admin/users"
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black shadow-xs transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-purple-600" /> Manage Team &amp; Roles
            </Link>
          )}

          {/* Company Profile Settings Button - Admin Only */}
          {isAdmin && (
            <button
              onClick={handleOpenCompanySettings}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black shadow-xs transition cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-500" /> Company Profile
            </button>
          )}

          {/* Shareable Link Button */}
          <button
            onClick={handleGenerateShareLink}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-slate-900 to-emerald-700 hover:opacity-95 text-white text-xs font-black shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-500" /> Expiring Share Link
          </button>
        </div>
      </div>

      {/* Financial & Operational KPI Cards - 5-Metric Executive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-5">
        {/* 1. Revenue Card */}
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

        {/* 2. Net Profit & Gross Margin Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[168px]">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-emerald-500 to-teal-600"></div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">Net Profit (P&amp;L)</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shadow-xs group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 tracking-tight">
              ₹{(kpis.totalNetProfit || 0).toLocaleString('en-IN')}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                {kpis.overallGrossMargin || 0}% Margin
              </span>
              <span className="text-[10px] text-slate-500 font-semibold">
                {kpis.profitableJobsCount || 0} profitable
              </span>
            </div>
          </div>
        </div>

        {/* 3. Direct Job Costs (BOM + Labor) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-lg hover:shadow-slate-200/40 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group min-h-[168px]">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-purple-500 to-indigo-600"></div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-800">Direct Job Costs</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-[#714b67] shadow-xs group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5 text-[#714b67]" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              ₹{(kpis.totalJobCosts || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[10.5px] text-purple-900 font-medium mt-1.5 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200 truncate">
              BOM: ₹{(kpis.totalBOMCost || 0).toLocaleString('en-IN')} • Labor: ₹{(kpis.totalLaborCost || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* 4. Receivables Card */}
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

        {/* 5. Rule 9 Loss-Making Jobs Alert Card */}
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
              Revenue, Costs &amp; Profit ({timeframe === 'today' ? 'Today - Hourly' : timeframe === 'week' ? 'Past 7 Days' : timeframe === 'month' ? 'Past 30 Days' : 'All Time Monthly'})
            </h2>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
              {timeframe} Telemetry
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={`trend-${timeframe}-${data?.charts?.monthlyTrends?.length}`} data={data?.charts?.monthlyTrends || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={11} fontWeight={600} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  fontWeight={600}
                  tickFormatter={(val) => (val >= 100000 ? `₹${(val / 100000).toFixed(1)}L` : val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`)}
                />
                <Tooltip
                  formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', fontWeight: 600 }} />
                <Bar dataKey="revenue" fill="#0F766E" name="Billed Revenue" radius={[6, 6, 0, 0]} />
                <Bar dataKey="collections" fill="#10B981" name="Collections Received" radius={[6, 6, 0, 0]} />
                <Bar dataKey="directCosts" fill="#714B67" name="Direct Costs" radius={[6, 6, 0, 0]} />
                <Bar dataKey="netProfit" fill="#F59E0B" name="Net Profit" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 space-y-5 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Sales Funnel Conversion Velocity ({timeframe === 'today' ? 'Today' : timeframe === 'week' ? 'This Week' : timeframe === 'month' ? 'This Month' : 'All Time'})
            </h2>
            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-[#f09e38]/30 uppercase">
              {timeframe} Pipeline
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart key={`funnel-${timeframe}-${data?.charts?.leadsByStage?.length}`} data={data?.charts?.leadsByStage || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" stroke="#64748B" fontSize={11} fontWeight={600} allowDecimals={false} />
                <YAxis type="category" dataKey="stage" width={115} stroke="#64748B" fontSize={10} fontWeight={600} />
                <Tooltip contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '12px', color: '#fff' }} />
                <Bar dataKey="count" fill="#F59E0B" name="Leads Count" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Executive Order Profit & Loss (P&L) Commercial Ledger */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-purple-50 text-[#714b67] border border-purple-200">
                <Receipt className="w-4 h-4 text-[#714b67]" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Order Profit &amp; Loss (P&amp;L) Ledger
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                    {timeframe} ({allJobCostings.length} Orders)
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Detailed job costing breakdown: Equipment BOM, technician labor payouts, net profitability, and gross margin per order.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Filter Tabs: ALL / PROFIT / LOSS */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <button
                onClick={() => setPlFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  plFilter === 'ALL' ? 'bg-slate-900 text-white font-black shadow-xs' : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                All Orders ({allJobCostings.length})
              </button>
              <button
                onClick={() => setPlFilter('PROFIT')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  plFilter === 'PROFIT' ? 'bg-emerald-600 text-white font-black shadow-xs' : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                Profitable ({allJobCostings.filter((j) => !j.isLossMaking).length})
              </button>
              <button
                onClick={() => setPlFilter('LOSS')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  plFilter === 'LOSS' ? 'bg-rose-600 text-white font-black shadow-xs' : 'text-slate-600 hover:bg-white/60'
                }`}
              >
                Loss-Making ({lossJobs.length})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order or client..."
                value={plSearch}
                onChange={(e) => setPlSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#714b67] w-48 sm:w-56"
              />
              {plSearch && (
                <button
                  onClick={() => setPlSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* CSV export */}
            <button
              onClick={handleDownloadCsv}
              disabled={downloadingCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
            </button>

            {/* View Cloudinary Evidences Button */}
            <Link
              to="/technician/jobs"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#714b67] text-xs font-bold transition shadow-2xs"
            >
              <Camera className="w-3.5 h-3.5 text-[#714b67]" />
              <span>Commissioning Evidences (Cloudinary)</span>
            </Link>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider">
                <th className="py-3 px-4">Sales Order &amp; Client</th>
                <th className="py-3 px-3 text-right">Capacity</th>
                <th className="py-3 px-3 text-right">Revenue (₹)</th>
                <th className="py-3 px-3 text-right">BOM Costs (₹)</th>
                <th className="py-3 px-3 text-right">Labor Outlay (₹)</th>
                <th className="py-3 px-3 text-right">Direct Costs (₹)</th>
                <th className="py-3 px-3 text-right">Net Profit / (Loss)</th>
                <th className="py-3 px-3 text-right">Margin %</th>
                <th className="py-3 px-4 text-center">P&amp;L Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredJobCostings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No orders matching the selected filter ({plFilter}) or search criteria.
                  </td>
                </tr>
              ) : (
                filteredJobCostings.map((job) => (
                  <tr
                    key={job.orderId}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      job.isLossMaking ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-slate-950 font-mono text-xs">
                          {job.orderNumber}
                        </span>
                        <Link
                          to="/technician/jobs"
                          title="View Site Installation Photos & Cloudinary Evidences"
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-purple-50 hover:bg-purple-100 text-[#714b67] text-[10px] font-bold border border-purple-200 transition"
                        >
                          <Camera className="w-2.5 h-2.5" />
                          <span>Photos</span>
                        </Link>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {job.customerName || 'Direct Customer'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-700">
                      {job.capacityKw} kW
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(job.revenue || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      ₹{Number(job.bomCost || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600">
                      ₹{Number(job.technicianCost || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                      ₹{Number(job.totalCost || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black">
                      {job.isLossMaking ? (
                        <span className="text-rose-600">
                          -₹{Math.abs(Number(job.profit || 0)).toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-emerald-700">
                          +₹{Number(job.profit || 0).toLocaleString('en-IN')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] ${
                          job.isLossMaking
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {job.profitMargin}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {job.isLossMaking ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300">
                          <Flame className="w-3 h-3 text-rose-600" /> LOSS (Rule 9)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-300">
                          <Check className="w-3 h-3 text-emerald-600" /> PROFITABLE
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Table Footer with Aggregates */}
            {filteredJobCostings.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200 text-xs">
                  <td className="py-3 px-4">Ledger Totals ({filteredJobCostings.length} orders)</td>
                  <td className="py-3 px-3 text-right font-mono">
                    {filteredJobCostings.reduce((sum, j) => sum + Number(j.capacityKw || 0), 0).toFixed(1)} kW
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-950">
                    ₹{filteredJobCostings.reduce((sum, j) => sum + Number(j.revenue || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    ₹{filteredJobCostings.reduce((sum, j) => sum + Number(j.bomCost || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">
                    ₹{filteredJobCostings.reduce((sum, j) => sum + Number(j.technicianCost || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-950">
                    ₹{filteredJobCostings.reduce((sum, j) => sum + Number(j.totalCost || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {(() => {
                      const net = filteredJobCostings.reduce((sum, j) => sum + Number(j.profit || 0), 0);
                      return net >= 0 ? (
                        <span className="text-emerald-700">+₹{net.toLocaleString('en-IN')}</span>
                      ) : (
                        <span className="text-rose-600">-₹{Math.abs(net).toLocaleString('en-IN')}</span>
                      );
                    })()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {(() => {
                      const rev = filteredJobCostings.reduce((sum, j) => sum + Number(j.revenue || 0), 0);
                      const net = filteredJobCostings.reduce((sum, j) => sum + Number(j.profit || 0), 0);
                      const margin = rev > 0 ? ((net / rev) * 100).toFixed(1) : '0';
                      return `${margin}%`;
                    })()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-[10px] text-slate-500 font-bold">Ledger Verified</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
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
