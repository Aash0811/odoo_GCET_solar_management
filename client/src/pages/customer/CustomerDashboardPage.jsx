import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerPortalApi } from '../../api';
import {
  Sun,
  ShieldCheck,
  FileSpreadsheet,
  Truck,
  Boxes,
  HeadphonesIcon,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Download,
  Plus,
  Sparkles,
  Zap,
  ArrowRight,
  BadgePercent,
  Clock,
  Layers,
  MapPin,
  Phone,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function CustomerDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await customerPortalApi.getMe();
      setData(res.data?.data || res.data);
    } catch (err) {
      console.error('Failed to load customer dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const profile = data?.profile || {};
  const quotes = data?.quotes || [];
  const orders = data?.orders || [];
  const warranties = data?.warranties || [];
  const tickets = data?.tickets || [];
  const subsidies = data?.subsidies || [];

  // Active solar job / order
  const activeOrder = orders[0] || null;
  const systemCapacityKw = activeOrder?.capacityKw || quotes[0]?.capacityKw || 3;

  // Real-time Solar Power generation model simulation
  const mockDailyYield = Array.from({ length: 7 }, (_, i) => {
    const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i];
    const generationKwh = Number((systemCapacityKw * 4.3 + (Math.random() * 2 - 1)).toFixed(1));
    return { day, generationKwh, savingsInr: Math.round(generationKwh * 8.5) };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#241621] via-[#382433] to-[#241621] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-pulse"></span>
              <span className="text-xs font-mono font-bold text-[#f09e38] uppercase tracking-wider">
                SunPower Customer Portal
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Welcome back, {profile.name || 'Solar Homeowner'}!
            </h1>
            <p className="text-xs text-[#dabed3]">
              {profile.address || 'Rooftop Solar Site'} {profile.city ? `• ${profile.city}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/customer/quotes')}
              className="px-4 py-2.5 rounded-xl bg-[#f09e38] hover:bg-[#d4821a] text-[#241621] font-black text-xs transition shadow-md cursor-pointer"
            >
              View My Quotations
            </button>
            <button
              type="button"
              onClick={() => navigate('/customer/tickets/new')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition cursor-pointer"
            >
              Service Desk
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* System Size Card */}
        <div
          onClick={() => navigate('/customer/products')}
          className="p-5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs hover:border-[#714B67] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Installed System</span>
            <Sun className="w-5 h-5 text-[#f09e38]" />
          </div>
          <div className="text-2xl font-black text-[#241621]">{systemCapacityKw} kW</div>
          <p className="text-[11px] text-[#714B67] font-semibold mt-1 flex items-center gap-1">
            <span>Tier-1 PV Modules</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Active Warranties Card */}
        <div
          onClick={() => navigate('/customer/warranties')}
          className="p-5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs hover:border-[#714B67] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Active Warranties</span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{warranties.length} Units</div>
          <p className="text-[11px] text-emerald-800 font-semibold mt-1 flex items-center gap-1">
            <span>100% Free Coverage</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* Orders in Progress */}
        <div
          onClick={() => navigate('/customer/orders')}
          className="p-5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs hover:border-[#714B67] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Order Status</span>
            <Truck className="w-5 h-5 text-[#714B67]" />
          </div>
          <div className="text-lg font-black text-[#714B67] truncate">
            {activeOrder?.status?.replace(/_/g, ' ') || 'None Active'}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1">
            <span>Track Delivery</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </p>
        </div>

        {/* PM Surya Ghar Subsidy */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Central Subsidy</span>
            <BadgePercent className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800">
            ₹{systemCapacityKw >= 3 ? '78,000' : '60,000'}
          </div>
          <p className="text-[11px] text-emerald-700 font-bold mt-1">PM Surya Ghar DBT</p>
        </div>
      </div>

      {/* Main Grid: Solar Generation Simulator & Quick Portals */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left 8 cols: Simulated Generation & Daily Yield */}
        <div className="lg:col-span-8 odoo-glass-card p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-[#241621] flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#f09e38]" /> Estimated Solar Generation &amp; Electricity Savings
              </h2>
              <p className="text-xs text-slate-500">
                Weekly generation output based on your {systemCapacityKw} kW rooftop installation.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-[#F5EDF3] text-[#714B67] text-xs font-black">
              ~{Math.round(systemCapacityKw * 4.3 * 30)} kWh / Month
            </span>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockDailyYield}>
                <defs>
                  <linearGradient id="solarYield" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f09e38" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f09e38" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBDCE7" />
                <XAxis dataKey="day" stroke="#714B67" fontSize={11} tickLine={false} />
                <YAxis stroke="#714B67" fontSize={11} tickLine={false} unit=" kWh" />
                <Tooltip
                  formatter={(val) => [`${val} kWh`, 'Solar Generation']}
                  contentStyle={{
                    backgroundColor: '#241621',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '11px',
                  }}
                />
                <Area type="monotone" dataKey="generationKwh" stroke="#f09e38" strokeWidth={3} fill="url(#solarYield)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 4 cols: Dedicated Portal Navigation Cards */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-black text-[#714B67] uppercase tracking-wider">
            Quick Customer Access
          </h2>

          <div
            onClick={() => navigate('/customer/quotes')}
            className="p-4 rounded-2xl bg-white border border-[#EBDCE7] hover:border-[#714B67] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EDF3] text-[#714B67] flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-[#f09e38]" />
              </div>
              <div>
                <h3 className="font-black text-xs text-[#241621]">My Quotations</h3>
                <p className="text-[10px] text-slate-500">Review BOM &amp; accept</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#714B67] group-hover:translate-x-1 transition-all" />
          </div>

          <div
            onClick={() => navigate('/customer/orders')}
            className="p-4 rounded-2xl bg-white border border-[#EBDCE7] hover:border-[#714B67] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EDF3] text-[#714B67] flex items-center justify-center">
                <Truck className="w-5 h-5 text-[#714B67]" />
              </div>
              <div>
                <h3 className="font-black text-xs text-[#241621]">Order &amp; Dispatch</h3>
                <p className="text-[10px] text-slate-500">Packing &amp; technician status</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#714B67] group-hover:translate-x-1 transition-all" />
          </div>

          <div
            onClick={() => navigate('/customer/products')}
            className="p-4 rounded-2xl bg-white border border-[#EBDCE7] hover:border-[#714B67] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EDF3] text-[#714B67] flex items-center justify-center">
                <Boxes className="w-5 h-5 text-[#714B67]" />
              </div>
              <div>
                <h3 className="font-black text-xs text-[#241621]">Installed Equipment</h3>
                <p className="text-[10px] text-slate-500">Hardware &amp; serial numbers</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#714B67] group-hover:translate-x-1 transition-all" />
          </div>

          <div
            onClick={() => navigate('/customer/warranties')}
            className="p-4 rounded-2xl bg-white border border-[#EBDCE7] hover:border-[#714B67] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EDF3] text-[#714B67] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-black text-xs text-[#241621]">Active Warranties</h3>
                <p className="text-[10px] text-slate-500">Component guarantee dates</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#714B67] group-hover:translate-x-1 transition-all" />
          </div>

          <div
            onClick={() => navigate('/customer/acceptance')}
            className="p-4 rounded-2xl bg-white border border-[#EBDCE7] hover:border-[#714B67] transition-all cursor-pointer flex items-center justify-between group shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F5EDF3] text-[#714B67] flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-[#f09e38]" />
              </div>
              <div>
                <h3 className="font-black text-xs text-[#241621]">Digital Handover Acceptance</h3>
                <p className="text-[10px] text-slate-500">Sign off &amp; get certificate</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#714B67] group-hover:translate-x-1 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}
