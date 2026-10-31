import React, { useState, useEffect } from 'react';
import { ticketsApi, warrantyApi, inventoryApi } from '../../api';
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
} from 'lucide-react';

export default function ServiceDeskPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search Warranty States (Rule 8)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

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
    resolutionNotes: 'Components replaced and recalibrated.',
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

  const handleSearchWarranty = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await warrantyApi.search(searchQuery.trim());
      setSearchResults(res.data?.data || []);
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
      // reload detail
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
      alert(res.data?.message || 'Ticket resolved!');
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
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Service Desk & Warranty Lookup</h1>
        <p className="text-xs text-slate-500">
          Rule 8: Instant warranty check (Active/Expired + days left) | In-warranty parts=0 vs Expired invoice generation
        </p>
      </div>

      {/* Real-time Warranty Search Bar (Rule 8) */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchWarranty} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Lookup by customer name, phone (9876543210), or serial number (INV3K-SN-001)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
          >
            {searching ? 'Searching...' : 'Lookup'}
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 mt-3 text-xs">
            <div className="bg-slate-50 p-2.5 grid grid-cols-12 font-bold text-[10px] text-slate-500 uppercase">
              <div className="col-span-3">Customer</div>
              <div className="col-span-3">Serial Number</div>
              <div className="col-span-3">Product</div>
              <div className="col-span-3 text-right">Warranty Status</div>
            </div>
            {searchResults.map((w) => (
              <div key={w.id} className="p-2.5 grid grid-cols-12 items-center">
                <div className="col-span-3 font-semibold text-slate-900 truncate">{w.customer?.name}</div>
                <div className="col-span-3 font-mono font-bold text-slate-700">{w.serial}</div>
                <div className="col-span-3 text-slate-500 truncate">{w.product?.name}</div>
                <div className="col-span-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      w.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {w.status === 'ACTIVE' ? `ACTIVE (${w.daysLeft}d left)` : `EXPIRED (${w.expiredDaysAgo}d ago)`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tickets List & Detail Split View */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left 5 cols: Tickets List */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900">Active Service Tickets ({tickets.length})</h2>
          <div className="space-y-2.5 overflow-y-auto max-h-[70vh]">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={async () => {
                  const res = await ticketsApi.get(t.id);
                  setSelectedTicket(res.data?.data);
                }}
                className={`w-full p-4 rounded-xl border text-left transition-all ${
                  selectedTicket?.id === t.id
                    ? 'bg-sky-50/80 border-sky-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">{t.ticketNumber}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    t.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t.status}
                  </span>
                </div>
                <h3 className="text-xs font-semibold text-slate-800 line-clamp-1">{t.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Customer: <span className="font-medium text-slate-700">{t.customer?.name}</span> ({t.ageDays} days old)
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Right 7 cols: Ticket Resolution & Warranty Line Engine */}
        {selectedTicket && (
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-mono text-slate-400">TICKET DETAILS</span>
                <h2 className="text-base font-bold text-slate-900">{selectedTicket.ticketNumber}: {selectedTicket.title}</h2>
                <p className="text-slate-500 text-[11px]">Customer: {selectedTicket.customer?.name} ({selectedTicket.customer?.phone})</p>
              </div>

              {selectedTicket.status !== 'RESOLVED' && selectedTicket.status !== 'CLOSED' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setAddLineModal(true)}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold"
                  >
                    + Add Line
                  </button>
                  <button
                    onClick={() => {
                      setResolveForm({
                        resolutionNotes: 'Repaired and recalibrated components.',
                        replacedSerialId: selectedTicket.lines?.[0]?.serialNumberId || '',
                        newSerialString: '',
                      });
                      setResolveModal(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  >
                    Resolve Ticket
                  </button>
                </div>
              )}
            </div>

            <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
              "{selectedTicket.description || 'No description provided.'}"
            </p>

            {/* Billable & Warranty Lines (Rule 8) */}
            <div>
              <h3 className="font-bold text-slate-900 mb-2 uppercase tracking-wider text-[11px]">
                Parts & Labour Lines (Rule 8 Auto-Pricing)
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                <div className="bg-slate-50 p-2.5 grid grid-cols-12 font-bold text-[10px] text-slate-500 uppercase">
                  <div className="col-span-6">Description</div>
                  <div className="col-span-3 text-center">Warranty Status</div>
                  <div className="col-span-3 text-right">Price Charged</div>
                </div>

                {selectedTicket.lines?.length === 0 ? (
                  <div className="p-4 text-center text-slate-400">No parts or labour lines added.</div>
                ) : (
                  selectedTicket.lines?.map((line) => (
                    <div key={line.id} className="p-2.5 grid grid-cols-12 items-center">
                      <div className="col-span-6 font-medium text-slate-800">
                        {line.description}
                      </div>
                      <div className="col-span-3 text-center">
                        {line.isWarrantyCovered ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Covered (Free)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Out of Warranty
                          </span>
                        )}
                      </div>
                      <div className="col-span-3 text-right font-bold text-slate-900">
                        ₹{Number(line.lineTotal).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Linked Invoice if Generated */}
            {selectedTicket.invoices?.length > 0 && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-purple-900">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Auto-Generated Invoice: <span className="font-bold">{selectedTicket.invoices[0].invoiceNumber}</span>
                </div>
                <span className="font-bold text-purple-800">₹{Number(selectedTicket.invoices[0].totalAmount).toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Line Modal */}
      {addLineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Add Service Line</h3>
              <button onClick={() => setAddLineModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-500 mb-3 text-[11px]">
              Rule 8: If this line links to an active warranty serial, the charge will automatically be ₹0.00.
            </p>

            <form onSubmit={handleAddLine} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Line Type</label>
                <select
                  value={lineForm.type}
                  onChange={(e) => setLineForm({ ...lineForm, type: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="PART">Replacement Part / Component</option>
                  <option value="LABOUR">Technician Service Labour</option>
                  <option value="OTHER">Other / Travel</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Description</label>
                <input
                  type="text"
                  required
                  value={lineForm.description}
                  onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
                  placeholder="e.g. Inverter Relay Board Replacement"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Standard Part Price (₹)</label>
                <input
                  type="number"
                  required
                  value={lineForm.unitPrice}
                  onChange={(e) => setLineForm({ ...lineForm, unitPrice: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
              >
                Add Line (Apply Warranty Rule)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Resolve Ticket Modal (Rule 8 Serial Swap) */}
      {resolveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Resolve Ticket & Unit Swap</h3>
              <button onClick={() => setResolveModal(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-500 mb-3 text-[11px]">
              Resolving will automatically invoice any out-of-warranty lines. If replacing a hardware unit, enter the new serial to start its new warranty!
            </p>

            <form onSubmit={handleResolveTicket} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Resolution Notes</label>
                <textarea
                  rows="3"
                  required
                  value={resolveForm.resolutionNotes}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolutionNotes: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 space-y-2">
                <span className="font-bold text-sky-900 flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Unit Replacement Serial Swap (Optional)
                </span>
                <input
                  type="text"
                  value={resolveForm.newSerialString}
                  onChange={(e) => setResolveForm({ ...resolveForm, newSerialString: e.target.value })}
                  placeholder="New Serial Number (e.g. INV3K-SN-NEW)"
                  className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
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
