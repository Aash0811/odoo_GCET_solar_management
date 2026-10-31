import React, { useState, useEffect, useCallback } from 'react';
import { ticketsApi, warrantyApi } from '../../api';
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
} from 'lucide-react';

export default function ServiceDeskPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search Warranty States (Rule 8) with Debouncing
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedWarrantyQuery = useDebounce(searchQuery, 350);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [warrantyPage, setWarrantyPage] = useState(1);
  const [warrantyPageSize, setWarrantyPageSize] = useState(5);

  // Tickets Filter & Pagination
  const [ticketFilter, setTicketFilter] = useState('');
  const debouncedTicketFilter = useDebounce(ticketFilter, 300);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPageSize, setTicketPageSize] = useState(5);

  // Selected Ticket & Actions
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [addLineModal, setAddLineModal] = useState(false);
  const [resolveModal, setResolveModal] = useState(false);

  // Line form
  const [lineForm, setLineForm] = useState({
    type: 'PART',
    description: '',
    serialNumberId: '',
    quantity: 1,
    unitPrice: 3500,
  });

  // Resolve form (Rule 8 unit replacement swap)
  const [resolveForm, setResolveForm] = useState({
    resolutionNotes: 'Components inspected, replaced and recalibrated to factory spec.',
    replacedSerialId: '',
    newSerialString: '',
  });

  const loadTickets = async () => {
    try {
      const res = await ticketsApi.list();
      setTickets(res.data?.data || []);
      if (selectedTicket) {
        const updated = (res.data?.data || []).find((t) => t.id === selectedTicket.id);
        if (updated) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  // Debounced auto-search for warranty
  useEffect(() => {
    const runSearch = async () => {
      const trimmed = debouncedWarrantyQuery.trim();
      if (!trimmed) {
        setSearchResults([]);
        setSearching(false);
        return;
      }
      setSearching(true);
      try {
        const res = await warrantyApi.search(trimmed);
        setSearchResults(res.data?.data || []);
        setWarrantyPage(1);
      } catch (err) {
        console.error('Warranty search failed:', err);
      } finally {
        setSearching(false);
      }
    };
    runSearch();
  }, [debouncedWarrantyQuery]);

  const handleSearchWarranty = async (e) => {
    if (e) e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    setSearching(true);
    try {
      const res = await warrantyApi.search(trimmed);
      setSearchResults(res.data?.data || []);
      setWarrantyPage(1);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddLine = async (e) => {
    e.preventDefault();
    try {
      const res = await ticketsApi.addLine(selectedTicket.id, lineForm);
      alert(res.data?.message || 'Line added!');
      setAddLineModal(false);
      loadTickets();
      const tRes = await ticketsApi.get(selectedTicket.id);
      setSelectedTicket(tRes.data?.data);
    } catch (err) {
      alert('Failed to add line: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleResolveTicket = async (e) => {
    e.preventDefault();
    try {
      const res = await ticketsApi.resolve(selectedTicket.id, resolveForm);
      alert(res.data?.message || 'Ticket resolved and automations executed!');
      setResolveModal(false);
      loadTickets();
      const tRes = await ticketsApi.get(selectedTicket.id);
      setSelectedTicket(tRes.data?.data);
    } catch (err) {
      alert('Failed to resolve ticket: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#714B67] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">Solar Service Desk & Warranty Engine</h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Rule 8: Instant Warranty Validation • In-Warranty Free Replacement (₹0.00) vs Expired Invoice Generation
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#F5EDF3] border border-[#EBDCE7] text-xs font-black text-[#714B67] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" /> Automated SLA Manager
          </span>
        </div>
      </div>

      {/* Real-time Warranty Search Bar (Rule 8) */}
      <div className="p-6 rounded-2xl odoo-glass-card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-[#241621] flex items-center gap-2">
            <Search className="w-4 h-4 text-[#714B67]" /> Universal Warranty Lookup Engine (Rule 8)
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#b886ad] font-bold">Quick Search:</span>
            {['INV3K-SN-001', 'Vikram Reddy'].map((demo) => (
              <button
                key={demo}
                type="button"
                onClick={() => {
                  setSearchQuery(demo);
                }}
                className="px-2.5 py-0.5 rounded-md bg-[#FAF6F9] border border-[#EBDCE7] text-[11px] font-bold text-[#714B67] hover:bg-[#F5EDF3] cursor-pointer"
              >
                {demo}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSearchWarranty} className="flex gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-[#b886ad]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter customer name, phone number (e.g. 9876543210), or hardware serial (e.g. INV3K-SN-001)..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] text-xs text-[#241621] font-semibold focus:ring-2 focus:ring-[#714B67] outline-none shadow-xs"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs shadow-md shadow-[#714B67]/25 transition cursor-pointer"
          >
            {searching ? 'Checking...' : 'Check Warranty'}
          </button>
        </form>

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 mt-3 text-xs bg-white shadow-xs">
            <div className="bg-[#F5EDF3] p-3 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
              <div className="col-span-3">Customer</div>
              <div className="col-span-3">Serial Number</div>
              <div className="col-span-3">Equipment</div>
              <div className="col-span-3 text-right">Warranty Status</div>
            </div>
            {searchResults
              .slice((warrantyPage - 1) * warrantyPageSize, warrantyPage * warrantyPageSize)
              .map((w) => (
                <div key={w.id} className="p-3 grid grid-cols-12 items-center hover:bg-[#FAF6F9] transition-colors">
                  <div className="col-span-3 font-extrabold text-[#241621] truncate">{w.customer?.name}</div>
                  <div className="col-span-3 font-mono font-black text-[#714B67]">{w.serial}</div>
                  <div className="col-span-3 text-slate-600 truncate font-medium">{w.product?.name}</div>
                  <div className="col-span-3 text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-black inline-flex items-center gap-1.5 ${
                        w.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {w.status === 'ACTIVE' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          ACTIVE ({w.daysLeft} days remaining)
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                          EXPIRED ({w.expiredDaysAgo} days ago)
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            <div className="p-2 bg-[#FAF6F9]">
              <Pagination
                currentPage={warrantyPage}
                totalItems={searchResults.length}
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
        )}
      </div>

      {/* Tickets List & Detail Split View */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left 5 cols: Tickets List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#241621]">Service Tickets ({tickets.length})</h2>
            <span className="text-[11px] font-bold text-[#b886ad]">Solar Support Desk</span>
          </div>

          {/* Quick Ticket Filter with Debounce */}
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

          <div className="space-y-2.5 overflow-y-auto max-h-[64vh] pr-1">
            {(() => {
              const filteredTickets = tickets.filter((t) => {
                if (!debouncedTicketFilter.trim()) return true;
                const q = debouncedTicketFilter.toLowerCase();
                return (
                  t.ticketNumber?.toLowerCase().includes(q) ||
                  t.title?.toLowerCase().includes(q) ||
                  t.customer?.name?.toLowerCase().includes(q) ||
                  t.status?.toLowerCase().includes(q)
                );
              });

              if (filteredTickets.length === 0) {
                return (
                  <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-[#EBDCE7] rounded-xl">
                    No tickets match your filter criteria.
                  </div>
                );
              }

              const paginatedTickets = filteredTickets.slice(
                (ticketPage - 1) * ticketPageSize,
                ticketPage * ticketPageSize
              );

              return (
                <>
                  {paginatedTickets.map((t) => (
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
                        <span className="font-black text-xs text-[#714B67] font-mono">{t.ticketNumber}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            t.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
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
                        <span className="text-[10px] text-[#b886ad] font-mono">{t.ageDays} days old</span>
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
              );
            })()}
          </div>
        </div>

        {/* Right 7 cols: Ticket Resolution & Warranty Line Engine */}
        {selectedTicket && (
          <div className="lg:col-span-7 odoo-glass-card p-6 rounded-2xl space-y-5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#EBDCE7]">
              <div>
                <span className="text-[10px] font-mono text-[#b886ad] font-bold">TICKET WORKBENCH</span>
                <h2 className="text-base font-black text-[#241621]">
                  {selectedTicket.ticketNumber}: {selectedTicket.title}
                </h2>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Customer: <span className="font-bold text-[#714B67]">{selectedTicket.customer?.name}</span> ({selectedTicket.customer?.phone})
                </p>
              </div>

              {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddLineModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#FAF6F9] hover:bg-[#F5EDF3] text-[#714B67] border border-[#EBDCE7] font-black cursor-pointer transition"
                  >
                    + Add Part/Labour
                  </button>
                  <button
                    onClick={() => {
                      setResolveForm({
                        resolutionNotes: 'Hardware replacement executed and system tested at peak sun hours.',
                        replacedSerialId: selectedTicket.lines?.[0]?.serialNumberId || '',
                        newSerialString: '',
                      });
                      setResolveModal(true);
                    }}
                    className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow-md shadow-emerald-600/25 transition cursor-pointer"
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
              <h3 className="font-black text-[#241621] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#714B67]" /> Parts & Labour Lines (Rule 8 Auto-Pricing)
              </h3>
              <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 bg-white shadow-xs">
                <div className="bg-[#F5EDF3] p-2.5 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-3 text-center">Warranty Status</div>
                  <div className="col-span-3 text-right">Price Charged</div>
                </div>

                {selectedTicket.lines?.length === 0 ? (
                  <div className="p-4 text-center text-[#b886ad] font-medium">No replacement parts or service labour logged.</div>
                ) : (
                  selectedTicket.lines?.map((line) => (
                    <div key={line.id} className="p-3 grid grid-cols-12 items-center hover:bg-[#FAF6F9] transition-colors">
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
                    <span className="font-bold text-[10px] text-purple-600 block">AUTOMATIC OUT-OF-WARRANTY INVOICE</span>
                    <span className="font-black text-sm">{selectedTicket.invoices[0].invoiceNumber}</span>
                  </div>
                </div>
                <span className="font-black text-base text-[#714B67]">
                  ₹{Number(selectedTicket.invoices[0].totalAmount).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Line Modal */}
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
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black shadow-md shadow-[#714B67]/25 cursor-pointer"
              >
                Apply Line & Check Warranty Coverage
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Ticket Modal (Rule 8 Serial Swap) */}
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
                  placeholder="New Serial Number (e.g. INV3K-SN-NEW99)"
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
    </div>
  );
}
