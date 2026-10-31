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
  Zap,
} from 'lucide-react';

export default function CustomerPortalPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

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
      setData(res.data?.data || res.data);
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
      alert('Your service ticket has been submitted! Our support team has been notified.');
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
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-[#714B67]">Connecting to your clean energy portal...</p>
      </div>
    );
  }

  if (!data || !data.profile) {
    return (
      <div className="max-w-md mx-auto p-8 text-center bg-white rounded-3xl border border-[#EBDCE7] shadow-lg my-12">
        <Sun className="w-12 h-12 text-[#f09e38] mx-auto mb-3 animate-spin" />
        <h2 className="text-base font-black text-[#241621]">SunPower Client Portal</h2>
        <p className="text-xs text-slate-500 mt-1">
          No customer records are currently linked. Switch to the CUSTOMER persona using the top-left dropdown to explore the client view!
        </p>
      </div>
    );
  }

  const { profile, quotes = [], orders = [], warranties = [], tickets = [], subsidies = [] } = data;
  const activeOrder = orders[0];
  const activeJob = activeOrder?.installationJobs?.[0];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Welcome Hero Banner in Luxury Odoo Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#241621] via-[#4c3145] to-[#714b67] p-7 text-white shadow-xl border border-white/10">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f09e38]/20 text-[#f09e38] text-xs font-black border border-[#f09e38]/30">
              <Sun className="w-3.5 h-3.5" /> Rooftop Solar Client Portal
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">{profile.name}</h1>
            <p className="text-xs text-[#dabed3] flex items-center gap-2 font-medium">
              <MapPin className="w-3.5 h-3.5 text-[#f09e38]" /> {profile.city || profile.address} • Phone: {profile.phone}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTicketModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-[#241621] rounded-xl text-xs font-black shadow-lg shadow-[#f09e38]/30 transition cursor-pointer"
            >
              <HeadphonesIcon className="w-4 h-4 text-[#241621]" /> Raise Support Ticket
            </button>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#f09e38]/15 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#EBDCE7] gap-6 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#714b67] text-[#714b67] font-black'
              : 'border-transparent text-slate-500 hover:text-[#714b67]'
          }`}
        >
          <Sun className="w-4 h-4" /> System & Order Status
        </button>

        <button
          onClick={() => setActiveTab('equipment')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'equipment'
              ? 'border-[#714b67] text-[#714b67] font-black'
              : 'border-transparent text-slate-500 hover:text-[#714b67]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Active Warranties ({warranties.length})
        </button>

        <button
          onClick={() => setActiveTab('quotes')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'quotes'
              ? 'border-[#714b67] text-[#714b67] font-black'
              : 'border-transparent text-slate-500 hover:text-[#714b67]'
          }`}
        >
          <FileText className="w-4 h-4" /> Quotations ({quotes.length})
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'tickets'
              ? 'border-[#714b67] text-[#714b67] font-black'
              : 'border-transparent text-slate-500 hover:text-[#714b67]'
          }`}
        >
          <Wrench className="w-4 h-4" /> Service Requests ({tickets.length})
        </button>

        <button
          onClick={() => setActiveTab('subsidy')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'subsidy'
              ? 'border-[#714b67] text-[#714b67] font-black'
              : 'border-transparent text-slate-500 hover:text-[#714b67]'
          }`}
        >
          <BadgePercent className="w-4 h-4" /> PM Surya Ghar Subsidy
        </button>
      </div>

      {/* TAB: OVERVIEW & ACTIVE ORDER */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {activeOrder ? (
            <div className="rounded-3xl odoo-glass-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EBDCE7] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-[#241621]">{activeOrder.orderNumber}</h2>
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-black bg-[#714B67] text-white uppercase tracking-wider shadow-xs">
                      {activeOrder.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    Rooftop System Capacity: <strong className="text-[#714B67] font-black">{activeOrder.capacityKw} kW Tier-1 Grid-Tied</strong>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#b886ad] font-bold">Total Contract Value</p>
                  <p className="text-lg font-black text-[#241621]">₹{Number(activeOrder.totalAmount).toLocaleString()}</p>
                </div>
              </div>

              {/* Progress Milestones Tracker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-wider text-[#714B67] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#f09e38]"></span>
                    Project Commissioning Timeline
                  </p>
                  <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Live Status
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Advance Deposit', status: activeOrder.advancePaid ? 'DONE' : 'PENDING' },
                    {
                      label: 'Hardware Dispatch',
                      status: ['IN_PROGRESS', 'INSTALLED', 'DELIVERED', 'COMPLETED'].includes(activeOrder.status)
                        ? 'DONE'
                        : 'PENDING',
                    },
                    {
                      label: 'Rooftop Install',
                      status: activeJob?.status === 'COMPLETED' ? 'DONE' : activeJob ? 'IN_PROGRESS' : 'PENDING',
                    },
                    {
                      label: 'Commissioning & Cert.',
                      status: activeJob?.status === 'COMPLETED' ? 'DONE' : 'PENDING',
                    },
                  ].map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border text-xs transition-all ${
                        step.status === 'DONE'
                          ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 font-black shadow-xs'
                          : step.status === 'IN_PROGRESS'
                          ? 'bg-[#F5EDF3] border-[#dabed3] text-[#714B67] font-black shadow-xs'
                          : 'bg-white/60 border-[#EBDCE7] text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-black uppercase tracking-wider">Step {idx + 1}</span>
                        {step.status === 'DONE' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-[#f09e38]" />
                        )}
                      </div>
                      <p className="font-black text-xs text-[#241621]">{step.label}</p>
                      <p className="text-[10px] mt-1 font-bold capitalize opacity-80">{step.status.toLowerCase()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Installation Job & Digital Acceptance Section */}
              {activeJob && (
                <div className="p-4 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-black text-[#714B67] uppercase tracking-wide">
                        Assigned Installation Job
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Technician: <strong className="text-slate-900 font-bold">{activeJob.technician?.name || 'Assigned'}</strong>{' '}
                        {activeJob.technician?.phone && `(${activeJob.technician.phone})`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {activeJob.status === 'COMPLETED' && (
                        <a
                          href={jobsApi.downloadCertificateUrl(activeJob.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#EBDCE7] hover:bg-[#F5EDF3] text-[#714B67] text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-[#f09e38]" /> Download Completion Certificate
                        </a>
                      )}

                      {!activeJob.signature && activeJob.status === 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setSigningJob(activeJob);
                            setSignerName(profile.name);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Sign Digital Handover
                        </button>
                      )}

                      {activeJob.signature && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Handover Signed & Certified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="odoo-glass-card p-8 rounded-3xl text-center space-y-2">
              <Sun className="w-8 h-8 text-[#f09e38] mx-auto" />
              <p className="text-sm font-bold text-slate-800">No active installation order yet.</p>
              <p className="text-xs text-slate-500">
                Review your approved proposals under the Quotations tab to authorize deposit and schedule delivery.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB: WARRANTIES */}
      {activeTab === 'equipment' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#241621]">Covered Equipment & Tracked Serials</h2>
            <span className="text-xs font-bold text-[#b886ad]">{warranties.length} hardware warranties</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warranties.length === 0 ? (
              <p className="col-span-full p-8 text-center text-[#b886ad] bg-white rounded-3xl border border-[#EBDCE7] font-semibold text-xs">
                Warranties activate automatically in real-time once warehouse dispatch completes serial barcode verification.
              </p>
            ) : (
              warranties.map((w) => (
                <div key={w.id} className="p-5 rounded-2xl odoo-glass-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-black text-[#714B67]">{w.productCategory}</span>
                      <h3 className="font-black text-sm text-[#241621] mt-0.5">{w.productName}</h3>
                      <p className="font-mono text-xs text-[#714B67] font-bold mt-1">Serial: {w.serial}</p>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        w.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {w.status}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#EBDCE7] flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Coverage Period:</span>
                    <span className="font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                      {w.daysLeft} days remaining
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
          <h2 className="text-sm font-black text-[#241621]">Your Solar System Proposals</h2>
          <div className="space-y-3">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="p-5 rounded-2xl odoo-glass-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-[#714B67] text-sm font-mono">{q.quoteNumber}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#F5EDF3] text-[#714B67] border border-[#EBDCE7]">
                      {q.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-semibold">
                    System: {q.packageTemplate?.name || `${q.capacityKw} kW Custom Package`}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Gross: ₹{Number(q.totalAmount).toLocaleString()} • Central Subsidy: ₹
                    {Number(q.subsidyEstimate || 78000).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={quotesApi.downloadPdfUrl(q.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white text-xs font-black rounded-xl shadow-md transition"
                  >
                    <Download className="w-3.5 h-3.5 text-[#f09e38]" /> Official Quotation PDF
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
            <h2 className="text-sm font-black text-[#241621]">Support & Maintenance History</h2>
            <button
              onClick={() => setShowTicketModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5C3B53] text-white rounded-xl text-xs font-black shadow-md shadow-[#714B67]/25 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#f09e38]" /> New Request
            </button>
          </div>

          <div className="space-y-3">
            {tickets.length === 0 ? (
              <p className="p-8 text-center text-[#b886ad] bg-white rounded-3xl border border-[#EBDCE7] text-xs font-semibold">
                No tickets reported. Your rooftop solar system is performing at peak efficiency!
              </p>
            ) : (
              tickets.map((t) => (
                <div key={t.id} className="p-5 rounded-2xl odoo-glass-card space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-[#b886ad] font-bold">{t.ticketNumber}</span>
                      <h3 className="font-black text-sm text-[#241621] mt-0.5">{t.title}</h3>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        t.status === 'RESOLVED' || t.status === 'CLOSED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{t.description}</p>
                  <p className="text-[10px] text-[#b886ad] font-bold">Reported on: {new Date(t.reportedAt).toLocaleDateString()}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: SUBSIDY TRACKER */}
      {activeTab === 'subsidy' && (
        <div className="space-y-4">
          <h2 className="text-sm font-black text-[#241621]">PM Surya Ghar National Portal Subsidy</h2>
          {subsidies.length === 0 ? (
            <p className="p-8 text-center text-[#b886ad] bg-white rounded-3xl border border-[#EBDCE7] text-xs font-semibold">
              Subsidy filing commences immediately after commissioning and Discom net meter synchronization.
            </p>
          ) : (
            subsidies.map((s) => (
              <div key={s.id} className="p-6 rounded-2xl odoo-glass-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 font-semibold">National Rooftop Portal Ref Number</p>
                    <p className="font-mono text-base font-black text-[#714B67]">{s.applicationNumber || 'MNRE-IN-PROGRESS'}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
                    {s.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-[#EBDCE7]">
                  <div>
                    <span className="text-slate-400 block font-semibold">Expected DBT Grant</span>
                    <span className="font-black text-sm text-[#241621]">₹{Number(s.expectedAmount || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Bank Disbursal</span>
                    <span className="font-black text-sm text-emerald-600">₹{Number(s.receivedAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Raise Ticket */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#22151F]/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] space-y-4 text-xs">
            <h2 className="text-base font-black text-[#241621]">Raise Service Request</h2>
            <form onSubmit={handleRaiseTicket} className="space-y-3.5">
              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Issue Subject *</label>
                <input
                  type="text"
                  value={ticketForm.title}
                  onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#714B67]"
                  placeholder="e.g. Inverter error code 04 or trip"
                  required
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Description *</label>
                <textarea
                  rows="3"
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#714B67]"
                  placeholder="Describe what you observed, indicator lights, or weather..."
                  required
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Urgency</label>
                <select
                  value={ticketForm.priority}
                  onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-semibold"
                >
                  <option value="LOW">Low - General query or cleaning inquiry</option>
                  <option value="MEDIUM">Medium - Partial power generation drop</option>
                  <option value="HIGH">High - Inverter red light indicator</option>
                  <option value="URGENT">Urgent - Complete shutdown / Spark hazard</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTicketModal(false)}
                  className="px-4 py-2 border border-[#EBDCE7] rounded-xl text-xs font-bold text-slate-600 hover:bg-[#FAF6F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket}
                  className="px-5 py-2 bg-[#714B67] hover:bg-[#5C3B53] text-white rounded-xl text-xs font-black shadow-md shadow-[#714B67]/25 cursor-pointer"
                >
                  {submittingTicket ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sign Digital Acceptance */}
      {signingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#22151F]/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] space-y-4 text-xs">
            <div>
              <h2 className="text-base font-black text-[#241621]">Sign Installation Handover</h2>
              <p className="text-xs text-slate-600 mt-1 font-medium">
                Provide your digital signature to confirm successful commissioning and handover of your rooftop solar plant.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Signatory Name</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-extrabold text-[#241621]">Digital Signature Pad</label>
                  <button
                    type="button"
                    onClick={() => sigCanvas.current?.clear()}
                    className="text-[11px] text-rose-500 hover:underline font-bold"
                  >
                    Clear Signature
                  </button>
                </div>
                <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden bg-[#FAF6F9] touch-none">
                  <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    canvasProps={{ width: 380, height: 160, className: 'sigCanvas w-full h-40 bg-white' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSigningJob(null)}
                className="px-4 py-2 border border-[#EBDCE7] rounded-xl text-xs font-bold text-slate-600 hover:bg-[#FAF6F9]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignAcceptance}
                disabled={signingLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
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
