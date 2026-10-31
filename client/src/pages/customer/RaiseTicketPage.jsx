import React, { useState, useEffect } from 'react';
import { customerPortalApi } from '../../api';
import {
  HeadphonesIcon,
  AlertCircle,
  CheckCircle2,
  Clock,
  Wrench,
  Zap,
  Send,
  Plus,
  ShieldCheck,
  Barcode,
  Search,
  MessageSquare,
} from 'lucide-react';

export default function RaiseTicketPage() {
  const [customerData, setCustomerData] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'HIGH',
    orderId: '',
    productId: '',
    serial: '',
    faultCategory: 'INVERTER_FAULT',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await customerPortalApi.getMe();
      const c = res.data?.data || res.data;
      setCustomerData(c);
      setTickets(c?.tickets || []);

      if (c?.orders?.length > 0 && !ticketForm.orderId) {
        setTicketForm((prev) => ({
          ...prev,
          orderId: c.orders[0].id,
        }));
      }
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    if (!ticketForm.title.trim() || !ticketForm.description.trim()) {
      alert('Please provide a title and detailed description of the issue.');
      return;
    }

    setSubmitting(true);
    setSuccessMessage('');
    try {
      const fullDesc = `[Issue Type: ${ticketForm.faultCategory}]${ticketForm.serial ? ` [Serial: ${ticketForm.serial}]` : ''}\n\n${ticketForm.description}`;

      const res = await customerPortalApi.raiseTicket({
        title: ticketForm.title.trim(),
        description: fullDesc,
        priority: ticketForm.priority,
        orderId: ticketForm.orderId || undefined,
      });

      setSuccessMessage(
        `Ticket ${res.data?.data?.ticketNumber || 'created'} registered successfully! Our service engineer has been notified.`
      );
      setTicketForm({
        title: '',
        description: '',
        priority: 'HIGH',
        orderId: customerData?.orders?.[0]?.id || '',
        productId: '',
        serial: '',
        faultCategory: 'INVERTER_FAULT',
      });
      loadData();
    } catch (err) {
      alert('Failed to submit ticket: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Combine equipment for serial dropdown
  const equipmentOptions = customerData?.warranties || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">Service Desk &amp; Defect Support</h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Log inverter error codes, power trip events, or request in-warranty hardware replacements.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {successMessage}
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left 6 cols: Raise New Service Ticket Form */}
        <div className="lg:col-span-6 odoo-glass-card p-6 rounded-3xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
            <h2 className="text-sm font-black text-[#241621] flex items-center gap-2">
              <HeadphonesIcon className="w-4 h-4 text-[#714B67]" />
              Raise Service or Repair Ticket
            </h2>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-black border border-emerald-200">
              In-Warranty: Free Service
            </span>
          </div>

          <form onSubmit={handleTicketSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-extrabold text-[#241621] mb-1 block">Issue Summary / Title *</label>
              <input
                type="text"
                required
                value={ticketForm.title}
                onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                placeholder="e.g. Inverter showing fault code E04, zero power generation"
                className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Category of Fault</label>
                <select
                  value={ticketForm.faultCategory}
                  onChange={(e) => setTicketForm({ ...ticketForm, faultCategory: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="INVERTER_FAULT">Inverter Error Code / Trip</option>
                  <option value="ZERO_GENERATION">Zero Power Generation</option>
                  <option value="BATTERY_NOT_CHARGING">Battery Storage Issue</option>
                  <option value="EARTHING_LEAKAGE">Earthing / Shock Hazard</option>
                  <option value="PHYSICAL_DAMAGE">Panel Crack / Physical Damage</option>
                  <option value="GRID_NET_METER">Net Meter / Discom Sync</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Priority Level</label>
                <select
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="LOW">Low (General Query)</option>
                  <option value="MEDIUM">Medium (Performance Drop)</option>
                  <option value="HIGH">High (Zero Power)</option>
                  <option value="URGENT">Urgent (Safety / Spark)</option>
                </select>
              </div>
            </div>

            {/* Affected Component / Serial selector */}
            {equipmentOptions.length > 0 && (
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">
                  Affected Component Serial Number (Optional)
                </label>
                <select
                  value={ticketForm.serial}
                  onChange={(e) => setTicketForm({ ...ticketForm, serial: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-mono outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="">-- Choose Hardware Serial --</option>
                  {equipmentOptions.map((eq) => (
                    <option key={eq.id} value={eq.serial}>
                      {eq.productName} ({eq.serial}) • {eq.daysLeft} days warranty
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="font-extrabold text-[#241621] mb-1 block">
                Detailed Symptoms &amp; Fault Description *
              </label>
              <textarea
                rows="4"
                required
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                placeholder="Describe what happened: weather conditions (heavy rain/lightning), LCD screen error codes, circuit breaker trip status, etc."
                className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs shadow-md shadow-[#714B67]/25 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-[#f09e38]" />
              {submitting ? 'Registering Ticket...' : 'Submit Support Ticket'}
            </button>
          </form>
        </div>

        {/* Right 6 cols: Ticket History & Status */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#241621] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#714B67]" />
              My Service Tickets ({tickets.length})
            </h2>
            <span className="text-[11px] text-slate-400 font-semibold">24-Hour SLA</span>
          </div>

          {tickets.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-[#EBDCE7] space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="font-black text-sm text-[#241621]">All Systems Operational</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No active complaints or repair tickets logged.
              </p>
            </div>
          ) : (
            <div className="space-y-3 overflow-y-auto max-h-[78vh]">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-3xl bg-white border border-[#EBDCE7] space-y-3 shadow-xs hover:border-[#b886ad] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-[#714B67]">{t.ticketNumber}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        t.status === 'RESOLVED' || t.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.status === 'IN_PROGRESS'
                          ? 'bg-purple-100 text-[#714B67]'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-sm text-[#241621]">{t.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1">{t.description}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-500">
                    <span>Reported: {new Date(t.reportedAt || t.createdAt).toLocaleDateString()}</span>
                    <span
                      className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-md ${
                        t.priority === 'URGENT' || t.priority === 'HIGH'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Priority: {t.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

