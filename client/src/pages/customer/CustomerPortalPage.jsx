import React, { useState, useEffect, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { customerPortalApi, quotesApi, jobsApi } from '../../api';
import {
  Sun,
  ShieldCheck,
  FileText,
  Clock,
  Wrench,
  HeadphonesIcon,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Download,
  Plus,
  Send,
  Sparkles,
  User,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  BadgePercent,
  Check,
} from 'lucide-react';

export default function CustomerPortalPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, equipment, tickets, quotes, subsidy

  // Raise Ticket Modal
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    orderId: '',
  });
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Digital Acceptance Modal
  const [signingJob, setSigningJob] = useState(null);
  const [signerName, setSignerName] = useState('');
  const sigCanvas = useRef(null);
  const [signingLoading, setSigningLoading] = useState(false);

  useEffect(() => {
    loadPortalData();
  }, []);

  const loadPortalData = async () => {
    try {
      setLoading(true);
      const res = await customerPortalApi.getMe();
      setData(res.data);
    } catch (err) {
      console.error('Error loading customer portal:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseTicket = async (e) => {
    e.preventDefault();
    if (!ticketForm.title || !ticketForm.description) {
      alert('Please enter ticket subject and description.');
      return;
    }
    try {
      setSubmittingTicket(true);
      await customerPortalApi.raiseTicket(ticketForm);
      alert('Your service ticket has been submitted! Our support team has been dispatched.');
      setShowTicketModal(false);
      setTicketForm({ title: '', description: '', priority: 'MEDIUM', orderId: '' });
      loadPortalData();
    } catch (err) {
      alert('Error raising ticket: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSignAcceptance = async () => {
    if (!signerName.trim()) {
      alert('Please enter your full name as the signee.');
      return;
    }
    if (sigCanvas.current.isEmpty()) {
      alert('Please provide your digital signature on the signature pad.');
      return;
    }

    try {
      setSigningLoading(true);
      const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      await customerPortalApi.signJob(signingJob.id, {
        signedByName: signerName,
        signatureImage: signatureDataUrl,
        acceptanceText: 'I hereby confirm the rooftop solar system is successfully installed, tested, and operational.',
      });

      alert('Installation Acceptance signed successfully!');
      setSigningJob(null);
      loadPortalData();
    } catch (err) {
      alert('Error submitting signature: ' + (err.response?.data?.message || err.message));
    } finally {
      setSigningLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-medium text-slate-600">Connecting to your solar account...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-md mx-auto p-6 text-center">
        <p className="text-sm text-slate-500">No customer records linked to this account.</p>
      </div>
    );
  }

  const { profile, quotes = [], orders = [], warranties = [], tickets = [], subsidies = [] } = data;
  const activeOrder = orders[0];
  const activeJob = activeOrder?.installationJobs?.[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold">
              <Sun className="w-3.5 h-3.5" /> Rooftop Solar Client Portal
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{profile.name}</h1>
            <p className="text-xs text-slate-300 flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-sky-400" /> {profile.city || profile.address}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTicketModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/30 transition"
            >
              <HeadphonesIcon className="w-4 h-4" /> Raise Support Ticket
            </button>
          </div>
        </div>

        {/* Subtle background glow */}
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-sky-500/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sun className="w-4 h-4" /> System & Order Status
        </button>

        <button
          onClick={() => setActiveTab('equipment')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'equipment'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Warranties ({warranties.length})
        </button>

        <button
          onClick={() => setActiveTab('quotes')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'quotes'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> Quotations ({quotes.length})
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'tickets'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" /> Service Requests ({tickets.length})
        </button>

        <button
          onClick={() => setActiveTab('subsidy')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'subsidy'
              ? 'border-sky-500 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BadgePercent className="w-4 h-4" /> Subsidy Tracker
        </button>
      </div>

      {/* TAB: OVERVIEW & ACTIVE ORDER */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {activeOrder ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{activeOrder.orderNumber}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 uppercase">
                      {activeOrder.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rooftop System Capacity: <strong className="text-slate-800">{activeOrder.capacityKw} kW</strong>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Total Contract Value</p>
                  <p className="text-lg font-bold text-slate-900">₹{Number(activeOrder.totalAmount).toLocaleString()}</p>
                </div>
              </div>

              {/* Progress Milestones Tracker */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Project Timeline</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Advance Payment', status: activeOrder.advancePaid ? 'DONE' : 'PENDING' },
                    {
                      label: 'Equipment Dispatched',
                      status: ['IN_PROGRESS', 'INSTALLED', 'DELIVERED', 'COMPLETED'].includes(activeOrder.status)
                        ? 'DONE'
                        : 'PENDING',
                    },
                    {
                      label: 'Rooftop Installation',
                      status: activeJob?.status === 'COMPLETED' ? 'DONE' : activeJob ? 'IN_PROGRESS' : 'PENDING',
                    },
                    {
                      label: 'Commissioning & Cert.',
                      status: activeJob?.status === 'COMPLETED' ? 'DONE' : 'PENDING',
                    },
                  ].map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs ${
                        step.status === 'DONE'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : step.status === 'IN_PROGRESS'
                          ? 'bg-sky-50 border-sky-200 text-sky-900'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Step {idx + 1}</span>
                        {step.status === 'DONE' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <p className="font-semibold text-xs">{step.label}</p>
                      <p className="text-[10px] mt-1 font-medium capitalize opacity-80">{step.status.toLowerCase()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Installation Job & Digital Acceptance Section */}
              {activeJob && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Assigned Installation Job
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Technician: <strong className="text-slate-800">{activeJob.technician?.name || 'Assigned'}</strong>{' '}
                        {activeJob.technician?.phone && `(${activeJob.technician.phone})`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeJob.status === 'COMPLETED' && (
                        <a
                          href={jobsApi.downloadCertificateUrl(activeJob.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold rounded-lg shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5 text-sky-600" /> Download Certificate
                        </a>
                      )}

                      {!activeJob.signature && activeJob.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setSigningJob(activeJob);
                            setSignerName(profile.name);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Sign Acceptance
                        </button>
                      )}

                      {activeJob.signature && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Acceptance Signed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
              <Sun className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-800">No active installation order yet.</p>
              <p className="text-xs text-slate-500">
                Check out your approved quotation under the Quotations tab to proceed with the advance deposit.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB: WARRANTIES */}
      {activeTab === 'equipment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Covered Components & Serial Numbers</h2>
            <span className="text-xs text-slate-500">{warranties.length} tracked items</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warranties.length === 0 ? (
              <p className="col-span-full p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
                Warranties will activate automatically once equipment is dispatched and verified.
              </p>
            ) : (
              warranties.map((w) => (
                <div key={w.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-sky-600">{w.productCategory}</span>
                      <h3 className="font-bold text-sm text-slate-900 mt-0.5">{w.productName}</h3>
                      <p className="font-mono text-xs text-slate-500 mt-1">Serial: {w.serial}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        w.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : w.status === 'VOID'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Remaining Coverage:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {w.daysLeft} days left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: QUOTATIONS */}
      {activeTab === 'quotes' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800">Your Solar System Proposals</h2>
          <div className="space-y-3">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{q.quoteNumber}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        q.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : q.status === 'SENT'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {q.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    System: {q.packageTemplate?.name || `${q.capacityKw} kW Custom Package`}
                  </p>
                  <p className="text-xs text-slate-500">
                    Gross: ₹{Number(q.totalAmount).toLocaleString()} • Estimated Subsidy: ₹
                    {Number(q.subsidyEstimate || 0).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={quotesApi.downloadPdfUrl(q.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Proposal PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: TICKETS */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Support & Maintenance History</h2>
            <button
              onClick={() => setShowTicketModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> New Ticket
            </button>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <p className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
                No tickets reported. Your system is running smoothly!
              </p>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-slate-400">{t.ticketNumber}</span>
                      <h3 className="font-bold text-sm text-slate-900 mt-0.5">{t.title}</h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.status === 'RESOLVED' || t.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : t.status === 'IN_PROGRESS'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{t.description}</p>
                  <p className="text-[10px] text-slate-400">Reported on: {new Date(t.reportedAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: SUBSIDY TRACKER */}
      {activeTab === 'subsidy' && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800">PM Surya Ghar Subsidy Status</h2>
          {subsidies.length === 0 ? (
            <p className="p-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200 text-xs">
              Subsidy filing commences immediately after commissioning and Discom net meter inspection.
            </p>
          ) : (
            subsidies.map((s) => (
              <div key={s.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Government Portal Application Number</p>
                    <p className="font-mono text-base font-bold text-slate-900">{s.applicationNumber || 'In Progress'}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                    {s.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Expected Disbursal</span>
                    <span className="font-bold text-slate-900">₹{Number(s.expectedAmount || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Amount Received</span>
                    <span className="font-bold text-emerald-600">₹{Number(s.receivedAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Raise Ticket */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">Raise Service or Maintenance Request</h2>
            <form onSubmit={handleRaiseTicket} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Issue Subject *</label>
                <input
                  type="text"
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Inverter displaying error code 04"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description *</label>
                <textarea
                  rows="3"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Describe what you observed, weather conditions, or breaker trip status..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Urgency</label>
                <select
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none"
                >
                  <option value="LOW">Low - General query or cleaning</option>
                  <option value="MEDIUM">Medium - Partial power reduction</option>
                  <option value="HIGH">High - Inverter shutdown</option>
                  <option value="URGENT">Urgent - Spark or electrical hazard</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold shadow-sm"
                >
                  {submittingTicket ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sign Digital Acceptance */}
      {signingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Sign Installation Completion</h2>
              <p className="text-xs text-slate-500 mt-1">
                Draw your digital signature to confirm successful handover of your rooftop solar plant.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Signatory Name</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-700">Digital Signature Pad</label>
                  <button
                    type="button"
                    onClick={() => sigCanvas.current?.clear()}
                    className="text-[11px] text-rose-500 hover:underline"
                  >
                    Clear
                  </button>
                </div>
                <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50 touch-none">
                  <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    canvasProps={{ width: 380, height: 160, className: 'sigCanvas w-full h-40 bg-white' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSigningJob(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignAcceptance}
                disabled={signingLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                {signingLoading ? 'Saving...' : 'Confirm & Accept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
