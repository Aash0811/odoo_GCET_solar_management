import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerPortalApi } from '../../api';
import {
  Boxes,
  ShieldCheck,
  Zap,
  Barcode,
  Calendar,
  AlertCircle,
  Wrench,
  Search,
  ExternalLink,
  Sun,
  Battery,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

export default function InstalledProductsPage() {
  const navigate = useNavigate();
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await customerPortalApi.getMe();
      const customer = res.data?.data || res.data;

      // Extract all serials / installed equipment from warranties & serial numbers
      const serials = customer?.serialNumbers || [];
      const warranties = customer?.warranties || [];

      // Combine warranties & serials
      const equipment = serials.map((sn) => {
        const warranty = warranties.find((w) => w.serial === sn.serial);
        return {
          id: sn.id,
          serial: sn.serial,
          name: sn.product?.name || 'Solar Hardware',
          sku: sn.product?.sku || 'GEN',
          category: sn.product?.category || 'EQUIPMENT',
          status: sn.status || 'INSTALLED',
          installedAt: sn.installedAt || sn.deliveredAt || sn.createdAt,
          warrantyYears: sn.product?.warrantyYears || 5,
          warrantyStatus: warranty?.status || 'ACTIVE',
          daysLeft: warranty?.daysLeft || 0,
        };
      });

      // If no direct serial numbers, extract from warranties
      if (equipment.length === 0 && warranties.length > 0) {
        const fromWarranties = warranties.map((w, idx) => ({
          id: w.id || `eq-${idx}`,
          serial: w.serial,
          name: w.productName || 'Solar Equipment',
          sku: w.serial?.split('-')[0] || 'SOLAR',
          category: w.productCategory || 'HARDWARE',
          status: 'INSTALLED',
          installedAt: w.startDate,
          warrantyYears: 5,
          warrantyStatus: w.status,
          daysLeft: w.daysLeft,
        }));
        setEquipmentList(fromWarranties);
      } else {
        setEquipmentList(equipment);
      }
    } catch (err) {
      console.error('Failed to load installed equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getCategoryIcon = (category) => {
    switch (category?.toUpperCase()) {
      case 'PANEL':
        return Sun;
      case 'INVERTER':
        return Zap;
      case 'BATTERY':
        return Battery;
      default:
        return Sliders;
    }
  };

  const filteredEquipment = equipmentList.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">Installed Solar Hardware Equipment</h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Verified equipment manifest on your roof: panels, inverters, storage batteries, and barcoded units.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/customer/tickets/new')}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#714B67]/20 cursor-pointer self-start md:self-auto"
        >
          <Wrench className="w-4 h-4 text-[#f09e38]" /> Report Hardware Issue
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#EBDCE7] shadow-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by serial number or component..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#EBDCE7] outline-none focus:ring-1 focus:ring-[#714B67]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'PANEL', 'INVERTER', 'BATTERY', 'STRUCTURE', 'BOS'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-[#714B67] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Cards Grid */}
      {filteredEquipment.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EBDCE7] space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F5EDF3] text-[#714B67] flex items-center justify-center mx-auto">
            <Boxes className="w-8 h-8 text-[#f09e38]" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#241621]">No Hardware Equipment Found</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Once materials are dispatched and installed at your rooftop, your verified components will be cataloged here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEquipment.map((eq) => {
            const Icon = getCategoryIcon(eq.category);
            return (
              <div
                key={eq.id}
                className="p-5 rounded-3xl odoo-glass-card border border-[#EBDCE7] space-y-4 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#F5EDF3] text-[#714B67] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-5 h-5 text-[#f09e38]" />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      eq.warrantyStatus === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {eq.warrantyStatus} Warranty
                  </span>
                </div>

                <div>
                  <h3 className="font-black text-sm text-[#241621] line-clamp-2">{eq.name}</h3>
                  <span className="text-[10px] font-mono text-slate-400">{eq.sku}</span>
                </div>

                {/* Serial Barcode Chip */}
                <div className="p-3 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-1">
                  <span className="text-[9px] uppercase font-bold text-[#714B67] block tracking-wider">
                    Official Serial / Barcode
                  </span>
                  <div className="flex items-center gap-2 font-mono font-black text-xs text-[#241621]">
                    <Barcode className="w-4 h-4 text-[#714B67]" />
                    {eq.serial}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#EBDCE7]">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Installed Date</span>
                    <span className="font-extrabold text-[#241621]">
                      {eq.installedAt ? new Date(eq.installedAt).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Warranty Left</span>
                    <span className="font-extrabold text-emerald-700">{eq.daysLeft} Days</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/customer/tickets/new')}
                  className="w-full py-2 rounded-xl bg-white border border-[#EBDCE7] hover:bg-[#F5EDF3] text-[#714B67] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5 text-[#f09e38]" /> Report Component Issue
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

