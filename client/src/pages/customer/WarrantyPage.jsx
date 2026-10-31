import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerPortalApi } from '../../api';
import {
  ShieldCheck,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle2,
  Barcode,
  Zap,
  Sun,
  Battery,
  Wrench,
  Search,
  FileCheck2,
  Sparkles,
} from 'lucide-react';

export default function WarrantyPage() {
  const navigate = useNavigate();
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await customerPortalApi.getMe();
      const customer = res.data?.data || res.data;
      setWarranties(customer?.warranties || []);
    } catch (err) {
      console.error('Failed to load customer warranties:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredWarranties = warranties.filter(
    (w) =>
      w.productName?.toLowerCase().includes(search.toLowerCase()) ||
      w.serial?.toLowerCase().includes(search.toLowerCase()) ||
      w.productCategory?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">Active Hardware Warranties</h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Rule 6 &amp; 8 Automated Warranty Engine: 100% free parts and technician labor for all covered components.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/customer/tickets/new')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#714B67]/20 cursor-pointer self-start md:self-auto"
        >
          <Wrench className="w-4 h-4 text-[#f09e38]" /> File Warranty Claim
        </button>
      </div>

      {/* Coverage Guarantee Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-50 via-teal-50 to-white border border-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-sm font-black text-emerald-950">SunPower Comprehensive Warranty Guarantee</h2>
            <p className="text-xs text-emerald-800 mt-0.5">
              Under SunPower Solutions policy: If any inverter, battery, or solar module exhibits defects during the
              warranty period, our engineering crew will repair or swap the unit at ₹0 cost to you.
            </p>
          </div>
        </div>

        <span className="px-3 py-1.5 rounded-xl bg-emerald-200/60 text-emerald-950 font-black text-xs border border-emerald-300 self-start md:self-auto whitespace-nowrap">
          ✓ Zero Customer Cost
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by serial number or component name..."
          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-2xl border border-[#EBDCE7] bg-white outline-none focus:ring-2 focus:ring-[#714B67]"
        />
      </div>

      {/* Warranties Grid */}
      {filteredWarranties.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EBDCE7] space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F5EDF3] text-[#714B67] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-[#f09e38]" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#241621]">No Warranties Found</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Active warranties are automatically activated on site delivery validation.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWarranties.map((w) => {
            const isNearExpiry = w.daysLeft < 60 && w.status === 'ACTIVE';
            return (
              <div
                key={w.id}
                className="p-5 rounded-3xl odoo-glass-card border border-[#EBDCE7] space-y-4 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      w.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : w.status === 'EXPIRED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {w.status}
                  </span>
                  <span className="font-mono text-xs font-black text-[#714B67]">{w.daysLeft} Days Left</span>
                </div>

                <div>
                  <h3 className="font-black text-sm text-[#241621] line-clamp-2">{w.productName}</h3>
                  <span className="text-[10px] font-bold text-[#b886ad] uppercase">{w.productCategory}</span>
                </div>

                {/* Serial Chip */}
                <div className="p-3 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#714B67] block">Component Serial Number</span>
                  <div className="flex items-center gap-1.5 font-mono font-black text-xs text-[#241621]">
                    <Barcode className="w-4 h-4 text-[#714B67]" />
                    {w.serial}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#EBDCE7]">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Commenced</span>
                    <span className="font-extrabold text-[#241621]">
                      {new Date(w.startDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Valid Until</span>
                    <span className="font-extrabold text-[#714B67]">
                      {new Date(w.endDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/customer/tickets/new')}
                  className="w-full py-2 rounded-xl bg-white border border-[#EBDCE7] hover:bg-[#F5EDF3] text-[#714B67] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5 text-[#f09e38]" /> Claim Warranty / Service
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

