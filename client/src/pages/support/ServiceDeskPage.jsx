import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ticketsApi, warrantyApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import useDebounce from '../../hooks/useDebounce';
import Pagination from '../../components/common/Pagination';
import {
  HeadphonesIcon,
  Search,
  ShieldCheck,
  ShieldAlert,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  RefreshCw,
  X,
  Clock,
  Sparkles,
  Zap,
  Receipt,
  User,
  Filter,
  Boxes,
  Calendar,
  ChevronRight,
  ArrowRight,
  Ban,
  Layers,
  Shield,
  Phone,
  Tag,
  Wrench,
  Check,
  ExternalLink,
} from 'lucide-react';

export default function ServiceDeskPage({ initialTab }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Navigation Tabs: 'UNIFIED' | 'WARRANTY' | 'TICKETS'
  const [activeTab, setActiveTab] = useState(() => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('/warranty')) return 'WARRANTY';
    return 'UNIFIED';
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (location.pathname.includes('/warranty')) {
      setActiveTab('WARRANTY');
    }
  }, [initialTab, location.pathname]);

  // ==========================================
  // 1. Service Tickets State
  // ==========================================
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [ticketFilter, setTicketFilter] = useState('');
  const debouncedTicketFilter = useDebounce(ticketFilter, 300);
  const [ticketStatusFilter, setTicketStatusFilter] = useState('ALL');
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPageSize, setTicketPageSize] = useState(5);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // ==========================================
  // 2. Warranty Data & Search State (Rule 8)
  // ==========================================
  const [warranties, setWarranties] = useState([]);
  const [warrantiesLoading, setWarrantiesLoading] = useState(true);
  const [warrantySearch, setWarrantySearch] = useState('');
  const debouncedWarrantyQuery = useDebounce(warrantySearch, 300);
  const [warrantyStatusFilter, setWarrantyStatusFilter] = useState('ALL');
  const [warrantyPage, setWarrantyPage] = useState(1);
  const [warrantyPageSize, setWarrantyPageSize] = useState(5);

  // ==========================================
  // 3. Modals State
  // ==========================================
  // Modal: Raise Ticket for Specific Equipment (from Warranty Row)
  const [raiseTicketModal, setRaiseTicketModal] = useState({
    open: false,
    warranty: null,
    customerId: '',
    customerName: '',
    orderId: '',
    serialNumberId: '',
    serial: '',
    productName: '',
    isWarrantyActive: true,
    title: '',
    description: '',
    priority: 'MEDIUM',
    submitting: false,
  });

  // Modal: Standalone New Ticket
  const [newTicketModal, setNewTicketModal] = useState({
    open: false,
    customerId: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    submitting: false,
  });

  // Modal: Add Line to Selected Ticket
  const [addLineModal, setAddLineModal] = useState(false);
  const [lineForm, setLineForm] = useState({
    type: 'PART',
    description: '',
    serialNumberId: '',
    quantity: 1,
    unitPrice: 3500,
  });

  // Modal: Resolve Ticket & Hardware Replacement Swap
  const [resolveModal, setResolveModal] = useState(false);
  const [resolveForm, setResolveForm] = useState({
    resolutionNotes: 'Components inspected, replaced and recalibrated to factory spec.',
    replacedSerialId: '',
    newSerialString: '',
  });

  // Modal: Void Warranty (Admin only)
  const [voidModal, setVoidModal] = useState({
    open: false,
    warrantyId: '',
    serial: '',
    voidReason: '',
    submitting: false,
  });

  // ==========================================
  // 4. Data Loaders
  // ==========================================
  const loadTickets = async () => {
    try {
      setTicketsLoading(true);
      const res = await ticketsApi.list();
      const list = res.data?.data || [];
      setTickets(list);
      if (selectedTicket) {
        const updated = list.find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      } else if (list.length > 0 && !selectedTicket) {
        setSelectedTicket(list[0]);
      }
    } catch (err) {
      console.error('Failed to load service tickets:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  const loadWarranties = useCallback(async (query = '') => {
    try {
      setWarrantiesLoading(true);
      const res = await warrantyApi.search(query);
      setWarranties(res.data?.data || []);
      setWarrantyPage(1);
    } catch (err) {
      console.error('Failed to search warranties:', err);
    } finally {
      setWarrantiesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    loadWarranties('');
  }, [loadWarranties]);

  // Re-run warranty search on debounced query change
  useEffect(() => {
    loadWarranties(debouncedWarrantyQuery);
  }, [debouncedWarrantyQuery, loadWarranties]);

  // ==========================================
  // 5. Unique Customers list for Ticket Creation
  // ==========================================
  const uniqueCustomers = useMemo(() => {
    const map = new Map();
    warranties.forEach((w) => {
      if (w.customer?.id && !map.has(w.customer.id)) {
        map.set(w.customer.id, w.customer);
      }
    });
    tickets.forEach((t) => {
      if (t.customer?.id && !map.has(t.customer.id)) {
        map.set(t.customer.id, t.customer);
      }
    });
    return Array.from(map.values());
  }, [warranties, tickets]);

  // ==========================================
  // 6. Metrics Summary Calculations
  // ==========================================
  const metrics = useMemo(() => {
    const totalWarranties = warranties.length;
    const activeWarranties = warranties.filter((w) => w.status === 'ACTIVE').length;
    const expiringSoon = warranties.filter((w) => w.status === 'ACTIVE' && w.daysLeft <= 60).length;
    const expiredWarranties = warranties.filter((w) => w.status === 'EXPIRED').length;

    const totalTickets = tickets.length;
    const openTickets = tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length;
    const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVED').length;

    return {
      totalWarranties,
      activeWarranties,
      expiringSoon,
      expiredWarranties,
      totalTickets,
      openTickets,
      resolvedTickets,
    };
  }, [warranties, tickets]);

  // ==========================================
  // 7. Filtered Warranties
  // ==========================================
  const filteredWarranties = useMemo(() => {
    return warranties.filter((w) => {
      if (warrantyStatusFilter === 'ACTIVE') return w.status === 'ACTIVE';
      if (warrantyStatusFilter === 'EXPIRING') return w.status === 'ACTIVE' && w.daysLeft <= 60;
      if (warrantyStatusFilter === 'EXPIRED') return w.status === 'EXPIRED' || w.status === 'VOID';
      return true;
    });
  }, [warranties, warrantyStatusFilter]);

  // ==========================================
  // 8. Filtered Tickets
  // ==========================================
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Status filter
      if (ticketStatusFilter !== 'ALL' && t.status !== ticketStatusFilter) return false;

      // Text search
      if (!debouncedTicketFilter.trim()) return true;
      const q = debouncedTicketFilter.toLowerCase();
      return (
        t.ticketNumber?.toLowerCase().includes(q) ||
        t.title?.toLowerCase().includes(q) ||
        t.customer?.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    });
  }, [tickets, ticketStatusFilter, debouncedTicketFilter]);

  // ==========================================
  // 9. Actions & Handlers
  // ==========================================

  // Open "Raise Ticket for Equipment" Modal
  const handleOpenRaiseTicketForEquipment = (w) => {
    setRaiseTicketModal({
      open: true,
      warranty: w,
      customerId: w.customer?.id || '',
      customerName: w.customer?.name || 'Customer',
      orderId: w.order?.id || '',
      serialNumberId: w.serialNumberId || '',
      serial: w.serial || '',
      productName: w.product?.name || 'Equipment',
      isWarrantyActive: w.status === 'ACTIVE',
      title: `[${w.serial}] Service & Inspection for ${w.product?.name || 'Equipment'}`,
      description: `Customer reported maintenance request for ${w.product?.name} (Serial: ${w.serial}). Onsite diagnosis and component validation scheduled.`,
      priority: 'MEDIUM',
      submitting: false,
    });
  };

  // Submit Ticket for Equipment
  const handleSubmitRaiseTicketForEquipment = async (e) => {
    e.preventDefault();
    setRaiseTicketModal((prev) => ({ ...prev, submitting: true }));

    try {
      // 1. Create the ticket
      const payload = {
        customerId: raiseTicketModal.customerId,
        orderId: raiseTicketModal.orderId || null,
        title: raiseTicketModal.title,
        description: raiseTicketModal.description,
        priority: raiseTicketModal.priority,
      };

      const res = await ticketsApi.create(payload);
      const newTicket = res.data?.data;

      // 2. Automatically link the equipment line under Rule 8
      if (newTicket?.id && raiseTicketModal.serialNumberId) {
        try {
          await ticketsApi.addLine(newTicket.id, {
            type: 'PART',
            description: `Hardware Component Service (${raiseTicketModal.serial})`,
            serialNumberId: raiseTicketModal.serialNumberId,
            quantity: 1,
            unitPrice: raiseTicketModal.isWarrantyActive ? 0 : 3500,
          });
        } catch (lineErr) {
          console.warn('Auto-line linking note:', lineErr);
        }
      }

      alert(`✅ Ticket ${newTicket?.ticketNumber || 'created'} successfully linked to serial ${raiseTicketModal.serial}!`);

      setRaiseTicketModal({ open: false, warranty: null });
      await loadTickets();

      // If we got the new ticket, select it and focus tickets view
      if (newTicket?.id) {
        const fullTicket = await ticketsApi.get(newTicket.id);
        setSelectedTicket(fullTicket.data?.data || newTicket);
        setActiveTab('TICKETS');
      }
    } catch (err) {
      alert('Failed to raise ticket: ' + (err.response?.data?.message || err.message));
    } finally {
      setRaiseTicketModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Submit Standalone New Ticket
  const handleSubmitNewTicket = async (e) => {
    e.preventDefault();
    if (!newTicketModal.customerId) {
      alert('Please select a customer.');
      return;
    }
    setNewTicketModal((prev) => ({ ...prev, submitting: true }));

    try {
      const res = await ticketsApi.create({
        customerId: newTicketModal.customerId,
        title: newTicketModal.title,
        description: newTicketModal.description,
        priority: newTicketModal.priority,
      });

      const created = res.data?.data;
      alert(`✅ Ticket ${created?.ticketNumber || ''} created successfully!`);
      setNewTicketModal({ open: false, customerId: '', title: '', description: '', priority: 'MEDIUM', submitting: false });
      await loadTickets();
      if (created?.id) {
        const full = await ticketsApi.get(created.id);
        setSelectedTicket(full.data?.data || created);
        setActiveTab('TICKETS');
      }
    } catch (err) {
      alert('Failed to create ticket: ' + (err.response?.data?.message || err.message));
    } finally {
      setNewTicketModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Add Line to Selected Ticket (Rule 8)
  const handleAddLine = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      const res = await ticketsApi.addLine(selectedTicket.id, lineForm);
      alert(res.data?.message || 'Line item added!');
      setAddLineModal(false);
      setLineForm({
        type: 'PART',
        description: '',
        serialNumberId: '',
        quantity: 1,
        unitPrice: 3500,
      });
      await loadTickets();
      const tRes = await ticketsApi.get(selectedTicket.id);
      setSelectedTicket(tRes.data?.data);
    } catch (err) {
      alert('Failed to add line: ' + (err.response?.data?.message || err.message));
    }
  };

  // Resolve Ticket (Rule 8 Auto-Invoicing & Serial Replacement Swap)
  const handleResolveTicket = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      const res = await ticketsApi.resolve(selectedTicket.id, resolveForm);
      alert(res.data?.message || 'Ticket resolved and automations executed!');
      setResolveModal(false);
      await loadTickets();
      const tRes = await ticketsApi.get(selectedTicket.id);
      setSelectedTicket(tRes.data?.data);
    } catch (err) {
      alert('Failed to resolve ticket: ' + (err.response?.data?.message || err.message));
    }
  };

  // Void Warranty (Admin only)
  const handleVoidWarranty = async (e) => {
    e.preventDefault();
    if (!voidModal.warrantyId) return;
    setVoidModal((prev) => ({ ...prev, submitting: true }));
    try {
      await warrantyApi.void(voidModal.warrantyId, { voidReason: voidModal.voidReason });
      alert(`Warranty for ${voidModal.serial} has been voided.`);
      setVoidModal({ open: false, warrantyId: '', serial: '', voidReason: '', submitting: false });
      loadWarranties(debouncedWarrantyQuery);
    } catch (err) {
      alert('Failed to void warranty: ' + (err.response?.data?.message || err.message));
    } finally {
      setVoidModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. Page Header & Navigation Tab Bar                      */}
      {/* ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#714B67] to-[#8E5A81] flex items-center justify-center text-white shadow-md shadow-[#714B67]/25">
              <HeadphonesIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#241621] tracking-tight">
                  Solar Service Desk & Universal Warranty
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F5EDF3] text-[#714B67] border border-[#EBDCE7]">
                  Rule 8 Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Centralized equipment lookup, SLA ticket lifecycle management, and automatic in-warranty ₹0 / out-of-warranty invoicing.
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switching Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1 bg-[#F5EDF3] rounded-2xl border border-[#EBDCE7] flex items-center shadow-xs">
            <button
              onClick={() => setActiveTab('UNIFIED')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'UNIFIED'
                  ? 'bg-gradient-to-r from-[#714B67] to-[#8E5A81] text-white shadow-md shadow-[#714B67]/20'
                  : 'text-[#714B67] hover:text-[#241621] hover:bg-white/60'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              ⚡ Unified Hub
            </button>
            <button
              onClick={() => setActiveTab('WARRANTY')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'WARRANTY'
                  ? 'bg-gradient-to-r from-[#714B67] to-[#8E5A81] text-white shadow-md shadow-[#714B67]/20'
                  : 'text-[#714B67] hover:text-[#241621] hover:bg-white/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              🛡️ Warranty Lookup
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {metrics.activeWarranties}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('TICKETS')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'TICKETS'
                  ? 'bg-gradient-to-r from-[#714B67] to-[#8E5A81] text-white shadow-md shadow-[#714B67]/20'
                  : 'text-[#714B67] hover:text-[#241621] hover:bg-white/60'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              🎫 Service Tickets
              {metrics.openTickets > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-amber-950 font-black">
                  {metrics.openTickets}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() =>
              setNewTicketModal({
                open: true,
                customerId: uniqueCustomers[0]?.id || '',
                title: '',
                description: '',
                priority: 'MEDIUM',
                submitting: false,
              })
            }
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#8E5A81] hover:opacity-95 text-white font-black text-xs shadow-md shadow-[#714B67]/20 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + New Ticket
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. Top Metric Cards                                      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Warranties */}
        <div className="p-4 rounded-2xl odoo-glass-card border border-[#EBDCE7] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-[#714B67] uppercase tracking-wider block">
              Active Warranties
            </span>
            <span className="text-2xl font-black text-[#241621] mt-1 block">
              {metrics.activeWarranties}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Free Replacements
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Open Service Tickets */}
        <div className="p-4 rounded-2xl odoo-glass-card border border-[#EBDCE7] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-[#714B67] uppercase tracking-wider block">
              Open Tickets
            </span>
            <span className="text-2xl font-black text-[#241621] mt-1 block">
              {metrics.openTickets}
            </span>
            <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1 mt-0.5">
              <Clock className="w-3.5 h-3.5" /> Under Active SLA
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Expiring Soon */}
        <div className="p-4 rounded-2xl odoo-glass-card border border-[#EBDCE7] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-[#714B67] uppercase tracking-wider block">
              Expiring Soon (≤60d)
            </span>
            <span className="text-2xl font-black text-[#241621] mt-1 block">
              {metrics.expiringSoon}
            </span>
            <span className="text-[11px] text-purple-700 font-bold flex items-center gap-1 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" /> AMC Renewal Ops
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-[#714B67]">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Resolved & Invoiced */}
        <div className="p-4 rounded-2xl odoo-glass-card border border-[#EBDCE7] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-[#714B67] uppercase tracking-wider block">
              Resolved Tickets
            </span>
            <span className="text-2xl font-black text-[#241621] mt-1 block">
              {metrics.resolvedTickets}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Auto Invoicing Executed
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. VIEW 1: UNIFIED ALL-IN-ONE HUB                        */}
      {/* ======================================================== */}
      {activeTab === 'UNIFIED' && (
        <div className="space-y-6">
          {/* Universal Warranty Quick Search (Top Half) */}
          <div className="p-5 rounded-2xl odoo-glass-card border border-[#EBDCE7] space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-black text-[#241621] flex items-center gap-2">
                <Search className="w-4 h-4 text-[#714B67]" /> Universal Warranty Lookup Engine
                <span className="text-[10px] font-bold text-slate-400">
                  (Type customer name, phone, or equipment serial)
                </span>
              </h2>
              <div className="flex items-center gap-1.5 text-xs flex-wrap">
                <span className="text-[#b886ad] font-bold text-[11px]">Quick Samples:</span>
                {['INV3K-HYD-001', 'Sita Devi', 'Vikram Reddy', 'PAN540'].map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setWarrantySearch(chip)}
                    className="px-2.5 py-0.5 rounded-lg bg-[#FAF6F9] border border-[#EBDCE7] text-[11px] font-bold text-[#714B67] hover:bg-[#F5EDF3] cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#b886ad]" />
              <input
                type="text"
                value={warrantySearch}
                onChange={(e) => setWarrantySearch(e.target.value)}
                placeholder="Enter customer name, phone number (e.g. 9876543210), or hardware serial (e.g. INV3K-HYD-001)..."
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] text-xs text-[#241621] font-semibold focus:ring-2 focus:ring-[#714B67] outline-none shadow-xs"
              />
              {warrantySearch && (
                <button
                  type="button"
                  onClick={() => setWarrantySearch('')}
                  className="absolute right-3 top-3 text-[#b886ad] hover:text-[#714B67]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Warranty Result Carousel / Table */}
            <div className="border border-[#EBDCE7] rounded-xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
              <div className="bg-[#F5EDF3] p-2.5 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                <div className="col-span-3">Customer</div>
                <div className="col-span-3">Hardware Serial</div>
                <div className="col-span-3">Equipment / Order</div>
                <div className="col-span-3 text-right">Warranty Status & Action</div>
              </div>

              {warrantiesLoading ? (
                <div className="p-4 text-center text-xs text-slate-400">Loading warranty records...</div>
              ) : filteredWarranties.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No warranties matched your search. Try another serial or customer name.
                </div>
              ) : (
                filteredWarranties
                  .slice((warrantyPage - 1) * warrantyPageSize, warrantyPage * warrantyPageSize)
                  .map((w) => (
                    <div
                      key={w.id}
                      className="p-2.5 grid grid-cols-12 items-center hover:bg-[#FAF6F9] transition-colors"
                    >
                      <div className="col-span-3">
                        <span className="font-extrabold text-[#241621] block truncate">
                          {w.customer?.name || 'Walk-in'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {w.customer?.phone || 'No phone'}
                        </span>
                      </div>

                      <div className="col-span-3">
                        <span className="font-mono font-black text-[#714B67] px-2 py-0.5 rounded-md bg-[#F5EDF3] border border-[#EBDCE7] text-[11px]">
                          {w.serial}
                        </span>
                      </div>

                      <div className="col-span-3">
                        <span className="text-slate-700 font-bold block truncate">
                          {w.product?.name || 'Component'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Order: {w.order?.orderNumber || 'Direct'}
                        </span>
                      </div>

                      <div className="col-span-3 flex items-center justify-end gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                            w.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {w.status === 'ACTIVE' ? (
                            <>
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              {w.daysLeft}d left
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              EXPIRED
                            </>
                          )}
                        </span>

                        <button
                          onClick={() => handleOpenRaiseTicketForEquipment(w)}
                          title="Raise Ticket for this Equipment"
                          className="px-2.5 py-1 rounded-lg bg-[#FAF6F9] hover:bg-[#714B67] text-[#714B67] hover:text-white border border-[#EBDCE7] hover:border-[#714B67] font-black text-[10px] transition cursor-pointer"
                        >
                          + Raise Ticket
                        </button>
                      </div>
                    </div>
                  ))
              )}

              {filteredWarranties.length > 5 && (
                <div className="p-2 bg-[#FAF6F9]">
                  <Pagination
                    currentPage={warrantyPage}
                    totalItems={filteredWarranties.length}
                    pageSize={warrantyPageSize}
                    onPageChange={setWarrantyPage}
                    onPageSizeChange={(size) => {
                      setWarrantyPageSize(size);
                      setWarrantyPage(1);
                    }}
                    pageSizeOptions={[5, 10]}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Service Tickets Split Workbench (Bottom Half) */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left 5 cols: Tickets List */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-[#241621]">Live Service Queue</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F5EDF3] text-[#714B67]">
                    {tickets.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {['ALL', 'NEW', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setTicketStatusFilter(st);
                        setTicketPage(1);
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black cursor-pointer transition ${
                        ticketStatusFilter === st
                          ? 'bg-[#714B67] text-white'
                          : 'bg-[#F5EDF3] text-[#714B67] hover:bg-[#EBDCE7]'
                      }`}
                    >
                      {st === 'ALL' ? 'All' : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ticket Search Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={ticketFilter}
                  onChange={(e) => {
                    setTicketFilter(e.target.value);
                    setTicketPage(1);
                  }}
                  placeholder="Filter tickets by title, customer, or ID..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#EBDCE7] bg-white text-xs text-[#241621] outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <div className="space-y-2.5 overflow-y-auto max-h-[58vh] pr-1">
                {filteredTickets.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-[#EBDCE7] rounded-xl">
                    No tickets match your filter criteria.
                  </div>
                ) : (
                  <>
                    {filteredTickets
                      .slice((ticketPage - 1) * ticketPageSize, ticketPage * ticketPageSize)
                      .map((t) => (
                        <button
                          key={t.id}
                          onClick={async () => {
                            const res = await ticketsApi.get(t.id);
                            setSelectedTicket(res.data?.data);
                          }}
                          className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                            selectedTicket?.id === t.id
                              ? 'bg-gradient-to-r from-[#F5EDF3] to-white border-[#714B67] shadow-md ring-2 ring-[#714B67]/20'
                              : 'bg-white border-[#EBDCE7] hover:border-[#b886ad]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-xs text-[#714B67] font-mono">
                              {t.ticketNumber}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                t.status === 'RESOLVED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : t.status === 'IN_PROGRESS'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <h3 className="text-xs font-black text-[#241621] line-clamp-1">{t.title}</h3>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-[#EBDCE7]/50">
                            <span className="font-bold text-[#241621] flex items-center gap-1">
                              <User className="w-3 h-3 text-[#714B67]" /> {t.customer?.name}
                            </span>
                            <span className="text-[10px] text-[#b886ad] font-mono">
                              {t.ageDays} days old
                            </span>
                          </div>
                        </button>
                      ))}

                    <div className="pt-2">
                      <Pagination
                        currentPage={ticketPage}
                        totalItems={filteredTickets.length}
                        pageSize={ticketPageSize}
                        onPageChange={setTicketPage}
                        onPageSizeChange={(size) => {
                          setTicketPageSize(size);
                          setTicketPage(1);
                        }}
                        pageSizeOptions={[5, 10]}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Right 7 cols: Ticket Resolution & Warranty Line Engine */}
            <div className="lg:col-span-7">
              {selectedTicket ? (
                <div className="odoo-glass-card p-5 rounded-2xl space-y-4 text-xs border border-[#EBDCE7]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EBDCE7]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#b886ad] font-bold">
                          TICKET WORKBENCH
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            selectedTicket.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {selectedTicket.priority} PRIORITY
                        </span>
                      </div>
                      <h2 className="text-base font-black text-[#241621] mt-0.5">
                        {selectedTicket.ticketNumber}: {selectedTicket.title}
                      </h2>
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        Customer:{' '}
                        <span className="font-bold text-[#714B67]">
                          {selectedTicket.customer?.name}
                        </span>{' '}
                        ({selectedTicket.customer?.phone})
                      </p>
                    </div>

                    {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => setAddLineModal(true)}
                          className="px-3 py-1.5 rounded-xl bg-[#FAF6F9] hover:bg-[#F5EDF3] text-[#714B67] border border-[#EBDCE7] font-black cursor-pointer transition text-xs"
                        >
                          + Add Line
                        </button>
                        <button
                          onClick={() => {
                            setResolveForm({
                              resolutionNotes:
                                'Hardware replacement executed and system calibrated to factory specifications.',
                              replacedSerialId: selectedTicket.lines?.[0]?.serialNumberId || '',
                              newSerialString: '',
                            });
                            setResolveModal(true);
                          }}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-600/25 transition cursor-pointer text-xs"
                        >
                          Resolve Ticket
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-slate-800 bg-[#FAF6F9] p-3 rounded-xl border border-[#EBDCE7] italic font-medium">
                    "{selectedTicket.description || 'No complaint notes entered.'}"
                  </p>

                  {/* Billable & Warranty Lines (Rule 8) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-black text-[#241621] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Receipt className="w-3.5 h-3.5 text-[#714B67]" /> Parts & Labour Lines (Rule 8 Auto-Pricing)
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        In-Warranty = ₹0.00 • Expired = Billable
                      </span>
                    </div>

                    <div className="border border-[#EBDCE7] rounded-xl overflow-hidden divide-y divide-[#EBDCE7]/60 bg-white shadow-xs">
                      <div className="bg-[#F5EDF3] p-2 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                        <div className="col-span-6">Description</div>
                        <div className="col-span-3 text-center">Warranty Status</div>
                        <div className="col-span-3 text-right">Price Charged</div>
                      </div>

                      {selectedTicket.lines?.length === 0 ? (
                        <div className="p-4 text-center text-[#b886ad] font-medium">
                          No replacement parts or service labour logged yet.
                        </div>
                      ) : (
                        selectedTicket.lines?.map((line) => (
                          <div
                            key={line.id}
                            className="p-2.5 grid grid-cols-12 items-center hover:bg-[#FAF6F9] transition-colors"
                          >
                            <div className="col-span-6">
                              <span className="font-bold text-[#241621] block">{line.description}</span>
                              {line.serialNumber && (
                                <span className="font-mono text-[10px] text-[#714B67]">
                                  SN: {line.serialNumber.serial}
                                </span>
                              )}
                            </div>
                            <div className="col-span-3 text-center">
                              {line.isWarrantyCovered ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  Covered (Free ₹0)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                  Out of Warranty
                                </span>
                              )}
                            </div>
                            <div className="col-span-3 text-right font-black text-[#714B67]">
                              ₹{Number(line.lineTotal).toLocaleString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Linked Auto-Invoice Banner if Generated */}
                  {selectedTicket.invoices?.length > 0 && (
                    <div className="p-3.5 bg-gradient-to-r from-purple-50 to-white rounded-xl border border-purple-200 flex items-center justify-between text-xs shadow-xs">
                      <div className="flex items-center gap-2.5 text-purple-950">
                        <FileText className="w-5 h-5 text-[#714B67]" />
                        <div>
                          <span className="font-bold text-[10px] text-purple-600 block">
                            AUTOMATIC OUT-OF-WARRANTY INVOICE
                          </span>
                          <span className="font-black text-sm">
                            {selectedTicket.invoices[0].invoiceNumber}
                          </span>
                        </div>
                      </div>
                      <span className="font-black text-base text-[#714B67]">
                        ₹{Number(selectedTicket.invoices[0].totalAmount).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-400 border border-dashed border-[#EBDCE7] rounded-2xl">
                  Select a ticket from the queue or search an equipment above to view details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. VIEW 2: UNIVERSAL WARRANTY LOOKUP (FULL-WIDTH)        */}
      {/* ======================================================== */}
      {activeTab === 'WARRANTY' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl odoo-glass-card border border-[#EBDCE7] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-[#241621] flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#714B67]" /> Deep Warranty Verification Engine
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Search by serial number, customer name, or phone. Verified warranties allow 1-click ticket generation under Rule 8.
                </p>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'ALL', label: `All (${warranties.length})` },
                  { id: 'ACTIVE', label: `Active (${metrics.activeWarranties})` },
                  { id: 'EXPIRING', label: `Expiring Soon (${metrics.expiringSoon})` },
                  { id: 'EXPIRED', label: `Expired (${metrics.expiredWarranties})` },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    onClick={() => {
                      setWarrantyStatusFilter(chip.id);
                      setWarrantyPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      warrantyStatusFilter === chip.id
                        ? 'bg-[#714B67] text-white shadow-xs'
                        : 'bg-[#FAF6F9] text-[#714B67] border border-[#EBDCE7] hover:bg-[#F5EDF3]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#b886ad]" />
                <input
                  type="text"
                  value={warrantySearch}
                  onChange={(e) => setWarrantySearch(e.target.value)}
                  placeholder="Search serial (e.g. INV3K-HYD-001), customer name, or mobile phone..."
                  className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] text-xs text-[#241621] font-semibold focus:ring-2 focus:ring-[#714B67] outline-none"
                />
                {warrantySearch && (
                  <button
                    type="button"
                    onClick={() => setWarrantySearch('')}
                    className="absolute right-3 top-3 text-[#b886ad] hover:text-[#714B67]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Warranties Table */}
            <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
              <div className="bg-[#F5EDF3] p-3.5 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                <div className="col-span-3">Customer & Site</div>
                <div className="col-span-2">Serial Number</div>
                <div className="col-span-3">Hardware Model & Order</div>
                <div className="col-span-2">Coverage Countdown</div>
                <div className="col-span-2 text-right">Rule 8 Actions</div>
              </div>

              {warrantiesLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading warranty database...</div>
              ) : filteredWarranties.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No warranties found matching the criteria.
                </div>
              ) : (
                filteredWarranties
                  .slice((warrantyPage - 1) * warrantyPageSize, warrantyPage * warrantyPageSize)
                  .map((w) => (
                    <div
                      key={w.id}
                      className="p-3.5 grid grid-cols-12 items-center hover:bg-[#FAF6F9] transition-colors"
                    >
                      {/* Customer */}
                      <div className="col-span-3">
                        <span className="font-extrabold text-[#241621] block">{w.customer?.name}</span>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-[#714B67]" /> {w.customer?.phone || 'N/A'}
                        </div>
                        {w.customer?.address && (
                          <span className="text-[10px] text-slate-400 truncate block max-w-[200px]">
                            {w.customer.address}
                          </span>
                        )}
                      </div>

                      {/* Serial Number */}
                      <div className="col-span-2">
                        <span className="font-mono font-black text-[#714B67] px-2 py-1 rounded-md bg-[#F5EDF3] border border-[#EBDCE7] inline-block text-[11px]">
                          {w.serial}
                        </span>
                      </div>

                      {/* Hardware & Order */}
                      <div className="col-span-3">
                        <span className="font-bold text-slate-800 block truncate">
                          {w.product?.name || 'Equipment'}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            {w.product?.category || 'Hardware'}
                          </span>
                          <span className="text-[10px] text-[#714B67] font-mono">
                            {w.order?.orderNumber || 'SO-Direct'}
                          </span>
                        </div>
                      </div>

                      {/* Coverage Countdown */}
                      <div className="col-span-2">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1.5 ${
                            w.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : w.status === 'VOID'
                              ? 'bg-slate-100 text-slate-700 border border-slate-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}
                        >
                          {w.status === 'ACTIVE' ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              ACTIVE ({w.daysLeft}d left)
                            </>
                          ) : w.status === 'VOID' ? (
                            <>
                              <Ban className="w-3.5 h-3.5 text-slate-500" />
                              VOIDED
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                              EXPIRED
                            </>
                          )}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Until: {new Date(w.endDate).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenRaiseTicketForEquipment(w)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#8E5A81] text-white hover:opacity-95 font-black text-[11px] shadow-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Raise Ticket
                        </button>

                        {isAdmin && w.status === 'ACTIVE' && (
                          <button
                            onClick={() =>
                              setVoidModal({
                                open: true,
                                warrantyId: w.id,
                                serial: w.serial,
                                voidReason: '',
                                submitting: false,
                              })
                            }
                            title="Void warranty (Admin only)"
                            className="px-2 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[10px] font-bold cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              )}

              <div className="p-3 bg-[#FAF6F9]">
                <Pagination
                  currentPage={warrantyPage}
                  totalItems={filteredWarranties.length}
                  pageSize={warrantyPageSize}
                  onPageChange={setWarrantyPage}
                  onPageSizeChange={(size) => {
                    setWarrantyPageSize(size);
                    setWarrantyPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20]}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. VIEW 3: SERVICE TICKETS QUEUE (FULL-WIDTH)            */}
      {/* ======================================================== */}
      {activeTab === 'TICKETS' && (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column: Tickets Queue */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-[#241621]">Service Tickets Queue</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F5EDF3] text-[#714B67]">
                  {tickets.length} Total
                </span>
              </div>
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['ALL', 'NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setTicketStatusFilter(st);
                    setTicketPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-black cursor-pointer transition ${
                    ticketStatusFilter === st
                      ? 'bg-[#714B67] text-white'
                      : 'bg-[#F5EDF3] text-[#714B67] hover:bg-[#EBDCE7]'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st}
                </button>
              ))}
            </div>

            {/* Filter Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={ticketFilter}
                onChange={(e) => {
                  setTicketFilter(e.target.value);
                  setTicketPage(1);
                }}
                placeholder="Search ticket #, customer, description..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#EBDCE7] bg-white text-xs text-[#241621] outline-none focus:ring-1 focus:ring-[#714B67]"
              />
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[65vh] pr-1">
              {filteredTickets.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-[#EBDCE7] rounded-xl">
                  No tickets match the selected status or query.
                </div>
              ) : (
                <>
                  {filteredTickets
                    .slice((ticketPage - 1) * ticketPageSize, ticketPage * ticketPageSize)
                    .map((t) => (
                      <button
                        key={t.id}
                        onClick={async () => {
                          const res = await ticketsApi.get(t.id);
                          setSelectedTicket(res.data?.data);
                        }}
                        className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                          selectedTicket?.id === t.id
                            ? 'bg-gradient-to-r from-[#F5EDF3] to-white border-[#714B67] shadow-md ring-2 ring-[#714B67]/20'
                            : 'bg-white border-[#EBDCE7] hover:border-[#b886ad]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-black text-xs text-[#714B67] font-mono">
                            {t.ticketNumber}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              t.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : t.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                        <h3 className="text-xs font-black text-[#241621] line-clamp-1">{t.title}</h3>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-[#EBDCE7]/50">
                          <span className="font-bold text-[#241621] flex items-center gap-1">
                            <User className="w-3 h-3 text-[#714B67]" /> {t.customer?.name}
                          </span>
                          <span className="text-[10px] text-[#b886ad] font-mono">
                            {t.ageDays} days old
                          </span>
                        </div>
                      </button>
                    ))}

                  <div className="pt-2">
                    <Pagination
                      currentPage={ticketPage}
                      totalItems={filteredTickets.length}
                      pageSize={ticketPageSize}
                      onPageChange={setTicketPage}
                      onPageSizeChange={(size) => {
                        setTicketPageSize(size);
                        setTicketPage(1);
                      }}
                      pageSizeOptions={[5, 10, 20]}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Workbench */}
          <div className="lg:col-span-7">
            {selectedTicket ? (
              <div className="odoo-glass-card p-6 rounded-2xl space-y-5 text-xs border border-[#EBDCE7]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EBDCE7]">
                  <div>
                    <span className="text-[10px] font-mono text-[#b886ad] font-bold">
                      TICKET WORKBENCH
                    </span>
                    <h2 className="text-base font-black text-[#241621]">
                      {selectedTicket.ticketNumber}: {selectedTicket.title}
                    </h2>
                    <p className="text-slate-600 text-[11px] mt-0.5">
                      Customer:{' '}
                      <span className="font-bold text-[#714B67]">
                        {selectedTicket.customer?.name}
                      </span>{' '}
                      ({selectedTicket.customer?.phone})
                    </p>
                  </div>

                  {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setAddLineModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-[#FAF6F9] hover:bg-[#F5EDF3] text-[#714B67] border border-[#EBDCE7] font-black cursor-pointer transition text-xs"
                      >
                        + Add Part/Labour
                      </button>
                      <button
                        onClick={() => {
                          setResolveForm({
                            resolutionNotes:
                              'Components inspected, replaced and recalibrated to factory spec.',
                            replacedSerialId: selectedTicket.lines?.[0]?.serialNumberId || '',
                            newSerialString: '',
                          });
                          setResolveModal(true);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-600/25 transition cursor-pointer text-xs"
                      >
                        Resolve Ticket
                      </button>
                    </div>
                  )}
                </div>

                <p className="text-slate-800 bg-[#FAF6F9] p-3.5 rounded-xl border border-[#EBDCE7] italic font-medium">
                  "{selectedTicket.description || 'No complaint notes entered.'}"
                </p>

                {/* Billable & Warranty Lines (Rule 8) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-[#241621] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-[#714B67]" /> Parts & Labour Lines (Rule 8 Auto-Pricing)
                    </h3>
                  </div>

                  <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 bg-white shadow-xs">
                    <div className="bg-[#F5EDF3] p-2.5 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                      <div className="col-span-6">Description</div>
                      <div className="col-span-3 text-center">Warranty Status</div>
                      <div className="col-span-3 text-right">Price Charged</div>
                    </div>

                    {selectedTicket.lines?.length === 0 ? (
                      <div className="p-4 text-center text-[#b886ad] font-medium">
                        No replacement parts or service labour logged.
                      </div>
                    ) : (
                      selectedTicket.lines?.map((line) => (
                        <div
                          key={line.id}
                          className="p-3 grid grid-cols-12 items-center hover:bg-[#FAF6F9] transition-colors"
                        >
                          <div className="col-span-6 font-bold text-[#241621]">
                            {line.description}
                          </div>
                          <div className="col-span-3 text-center">
                            {line.isWarrantyCovered ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Covered (Free ₹0)
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                                Out of Warranty
                              </span>
                            )}
                          </div>
                          <div className="col-span-3 text-right font-black text-[#714B67]">
                            ₹{Number(line.lineTotal).toLocaleString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Linked Invoice if Generated */}
                {selectedTicket.invoices?.length > 0 && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-white rounded-2xl border border-purple-200 flex items-center justify-between text-xs shadow-xs">
                    <div className="flex items-center gap-2.5 text-purple-950">
                      <FileText className="w-5 h-5 text-[#714B67]" />
                      <div>
                        <span className="font-bold text-[10px] text-purple-600 block">
                          AUTOMATIC OUT-OF-WARRANTY INVOICE
                        </span>
                        <span className="font-black text-sm">
                          {selectedTicket.invoices[0].invoiceNumber}
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-base text-[#714B67]">
                      ₹{Number(selectedTicket.invoices[0].totalAmount).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 border border-dashed border-[#EBDCE7] rounded-2xl">
                Select a ticket from the left queue to open the workbench.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODALS                                                */}
      {/* ======================================================== */}

      {/* Modal: Raise Ticket for Specific Equipment (Rule 8 Auto-Detection) */}
      {raiseTicketModal.open && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EBDCE7] text-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#714B67]" />
                <h3 className="text-base font-black text-[#241621]">
                  Raise Ticket for Equipment
                </h3>
              </div>
              <button
                onClick={() => setRaiseTicketModal({ open: false, warranty: null })}
                className="text-[#b886ad] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rule 8 Status Banner */}
            <div
              className={`p-3 rounded-xl mb-3 border font-semibold flex items-center gap-2 ${
                raiseTicketModal.isWarrantyActive
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {raiseTicketModal.isWarrantyActive ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Rule 8 Active Warranty:</strong> Hardware replacement parts will be covered at <strong>₹0.00 (Free)</strong>.
                  </span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Rule 8 Out-of-Warranty:</strong> Hardware replacements will be billed and auto-invoiced to customer upon resolution.
                  </span>
                </>
              )}
            </div>

            <form onSubmit={handleSubmitRaiseTicketForEquipment} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3 bg-[#FAF6F9] p-3 rounded-xl border border-[#EBDCE7]">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Customer</span>
                  <span className="font-extrabold text-[#241621]">{raiseTicketModal.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block uppercase">Hardware Serial</span>
                  <span className="font-mono font-black text-[#714B67]">{raiseTicketModal.serial}</span>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Ticket Title</label>
                <input
                  type="text"
                  required
                  value={raiseTicketModal.title}
                  onChange={(e) =>
                    setRaiseTicketModal((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67] font-semibold"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Priority Level</label>
                <select
                  value={raiseTicketModal.priority}
                  onChange={(e) =>
                    setRaiseTicketModal((prev) => ({ ...prev, priority: e.target.value }))
                  }
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent (System Offline)</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Issue Description</label>
                <textarea
                  rows="3"
                  required
                  value={raiseTicketModal.description}
                  onChange={(e) =>
                    setRaiseTicketModal((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <button
                type="submit"
                disabled={raiseTicketModal.submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#714B67] to-[#8E5A81] hover:opacity-95 text-white font-black text-xs shadow-md shadow-[#714B67]/25 cursor-pointer transition"
              >
                {raiseTicketModal.submitting ? 'Creating Ticket...' : 'Confirm & Open in Service Desk →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Standalone New Ticket */}
      {newTicketModal.open && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] text-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#714B67]" />
                <h3 className="text-base font-black text-[#241621]">Create Service Ticket</h3>
              </div>
              <button
                onClick={() => setNewTicketModal((prev) => ({ ...prev, open: false }))}
                className="text-[#b886ad] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewTicket} className="space-y-3.5">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Customer</label>
                <select
                  required
                  value={newTicketModal.customerId}
                  onChange={(e) =>
                    setNewTicketModal((prev) => ({ ...prev, customerId: e.target.value }))
                  }
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="">-- Select Customer --</option>
                  {uniqueCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone || c.email || 'Customer'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Ticket Subject / Title</label>
                <input
                  type="text"
                  required
                  value={newTicketModal.title}
                  onChange={(e) =>
                    setNewTicketModal((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="e.g. Inverter Error Code E04 after heavy rain"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Priority Level</label>
                <select
                  value={newTicketModal.priority}
                  onChange={(e) =>
                    setNewTicketModal((prev) => ({ ...prev, priority: e.target.value }))
                  }
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Description of Issue</label>
                <textarea
                  rows="3"
                  required
                  value={newTicketModal.description}
                  onChange={(e) =>
                    setNewTicketModal((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Provide complete breakdown notes or customer complaint..."
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <button
                type="submit"
                disabled={newTicketModal.submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#714B67] to-[#8E5A81] hover:opacity-95 text-white font-black text-xs shadow-md shadow-[#714B67]/25 cursor-pointer transition"
              >
                {newTicketModal.submitting ? 'Creating...' : 'Create Ticket'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Line to Ticket */}
      {addLineModal && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] text-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#714B67]" />
                <h3 className="text-base font-black text-[#241621]">Add Service Line</h3>
              </div>
              <button onClick={() => setAddLineModal(false)} className="text-[#b886ad] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-600 mb-3 text-[11px]">
              Rule 8 Enforcement: If linked to an active warranty hardware unit, this line charge is automatically waived to <strong className="text-emerald-700">₹0.00</strong>.
            </p>

            <form onSubmit={handleAddLine} className="space-y-3.5">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Line Type</label>
                <select
                  value={lineForm.type}
                  onChange={(e) => setLineForm({ ...lineForm, type: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="PART">Replacement Component / Spare Part</option>
                  <option value="LABOUR">Field Technician Labour</option>
                  <option value="OTHER">Travel & Transport Fee</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Component / Task Description</label>
                <input
                  type="text"
                  required
                  value={lineForm.description}
                  onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
                  placeholder="e.g. Inverter MPPT Control Board Swap"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Catalog Rate (₹)</label>
                <input
                  type="number"
                  required
                  value={lineForm.unitPrice}
                  onChange={(e) => setLineForm({ ...lineForm, unitPrice: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-bold text-sm outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#714B67] to-[#8E5A81] hover:opacity-95 text-white font-black shadow-md shadow-[#714B67]/25 cursor-pointer"
              >
                Apply Line & Validate Warranty
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve Ticket & Hardware Replacement Swap */}
      {resolveModal && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] text-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-[#241621]">Resolve Ticket & Unit Swap</h3>
              </div>
              <button onClick={() => setResolveModal(false)} className="text-[#b886ad] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 mb-3 text-[11px]">
              Resolving will automatically invoice any billable out-of-warranty lines. If replacing a hardware unit, enter the replacement serial to transfer/start its new warranty!
            </p>

            <form onSubmit={handleResolveTicket} className="space-y-3.5">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Technician Resolution Notes</label>
                <textarea
                  rows="3"
                  required
                  value={resolveForm.resolutionNotes}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolutionNotes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="p-3.5 bg-[#FAF6F9] rounded-2xl border border-[#EBDCE7] space-y-2">
                <span className="font-black text-[#714B67] flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-[#f09e38]" /> Hardware Replacement Serial Swap (Optional)
                </span>
                <input
                  type="text"
                  value={resolveForm.newSerialString}
                  onChange={(e) => setResolveForm({ ...resolveForm, newSerialString: e.target.value })}
                  placeholder="New Serial Number (e.g. INV3K-HYD-NEW99)"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-mono text-xs outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/25 cursor-pointer"
              >
                Confirm Resolution & Execute Automations
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Void Warranty (Admin only) */}
      {voidModal.open && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 text-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-rose-950">Void Warranty Registration</h3>
              </div>
              <button
                onClick={() => setVoidModal({ open: false, warrantyId: '', serial: '', voidReason: '', submitting: false })}
                className="text-[#b886ad] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-600 mb-3 text-[11px]">
              Voiding this warranty for serial <strong className="font-mono text-[#714B67]">{voidModal.serial}</strong> will cancel all manufacturer coverage and force out-of-warranty billing on future service tickets.
            </p>

            <form onSubmit={handleVoidWarranty} className="space-y-3.5">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Reason for Voiding</label>
                <textarea
                  rows="3"
                  required
                  value={voidModal.voidReason}
                  onChange={(e) => setVoidModal((prev) => ({ ...prev, voidReason: e.target.value }))}
                  placeholder="e.g. Unauthorized physical tampering, lightning strike not covered, customer altered cabling..."
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={voidModal.submitting}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-md shadow-rose-600/25 cursor-pointer transition"
              >
                {voidModal.submitting ? 'Voiding...' : 'Confirm Void Warranty'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
