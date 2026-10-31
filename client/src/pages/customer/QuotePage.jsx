import React, { useState, useEffect } from 'react';
import { customerPortalApi, quotesApi } from '../../api';
import {
  FileSpreadsheet,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Zap,
  BadgePercent,
  Plus,
  ShieldCheck,
  AlertCircle,
  X,
  Send,
  Eye,
  FileCheck2,
  Camera,
  Upload,
  Image,
} from 'lucide-react';

export default function QuotePage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);

  // Acceptance & Rejection Modals
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [signeeName, setSigneeName] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Request Quote Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqForm, setReqForm] = useState({
    desiredCapacityKw: 3,
    monthlyBillAmount: 4500,
    roofType: 'RCC Concrete Flat',
    address: '',
    notes: 'Rooftop solar enquiry under PM Surya Ghar Subsidy scheme.',
  });
  const [submittingReq, setSubmittingReq] = useState(false);

  // Rooftop Photo Upload State
  const [selectedRoofPhotos, setSelectedRoofPhotos] = useState([]);
  const [roofPhotoPreviews, setRoofPhotoPreviews] = useState([]);
  const [roofPhotoCaption, setRoofPhotoCaption] = useState('');
  const [uploadingRoofPhotos, setUploadingRoofPhotos] = useState(false);
  const [reqRoofPhotos, setReqRoofPhotos] = useState([]);
  const [reqRoofPreviews, setReqRoofPreviews] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await customerPortalApi.getMe();
      const qList = res.data?.data?.quotes || res.data?.quotes || [];
      setQuotes(qList);
      if (qList.length > 0 && !selectedQuote) {
        setSelectedQuote(qList[0]);
      }
    } catch (err) {
      console.error('Failed to load quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAcceptQuote = async (e) => {
    e.preventDefault();
    if (!selectedQuote) return;
    setSubmittingAction(true);
    try {
      await quotesApi.accept(selectedQuote.id, {
        notes: actionNotes || 'Accepted digitally via Customer Portal',
        signedByName: signeeName || 'Homeowner',
      });
      alert(`Quote ${selectedQuote.quoteNumber} accepted! Our team is preparing your Sales Order.`);
      setShowAcceptModal(false);
      setActionNotes('');
      loadData();
    } catch (err) {
      alert('Acceptance failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRejectQuote = async (e) => {
    e.preventDefault();
    if (!selectedQuote) return;
    setSubmittingAction(true);
    try {
      await quotesApi.reject(selectedQuote.id, {
        notes: actionNotes || 'Revision requested by customer',
      });
      alert(`Feedback recorded for Quote ${selectedQuote.quoteNumber}. Our sales team will reach out with an updated revision.`);
      setShowRejectModal(false);
      setActionNotes('');
      loadData();
    } catch (err) {
      alert('Rejection failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleSelectQuoteRoofPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedRoofPhotos((prev) => [...prev, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setRoofPhotoPreviews((prev) => [...prev, ...previews]);
  };

  const handleUploadQuoteRoofPhotos = async () => {
    if (!selectedQuote || selectedRoofPhotos.length === 0) return;
    setUploadingRoofPhotos(true);
    try {
      const fd = new FormData();
      selectedRoofPhotos.forEach((f) => fd.append('photos', f));
      if (roofPhotoCaption) fd.append('caption', roofPhotoCaption);
      fd.append('phase', 'ROOF_CONDITION');

      await quotesApi.uploadPhotos(selectedQuote.id, fd);
      alert(`${selectedRoofPhotos.length} rooftop photo(s) uploaded successfully!`);
      setSelectedRoofPhotos([]);
      setRoofPhotoPreviews([]);
      setRoofPhotoCaption('');
      await loadData();
    } catch (err) {
      alert('Rooftop photo upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingRoofPhotos(false);
    }
  };

  const handleRequestQuoteSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReq(true);
    try {
      const res = await customerPortalApi.requestQuote({
        name: 'Portal Customer',
        phone: 'Registered Mobile',
        address: reqForm.address,
        desiredCapacityKw: Number(reqForm.desiredCapacityKw),
        monthlyBillAmount: Number(reqForm.monthlyBillAmount),
        source: 'CUSTOMER_PORTAL',
        notes: `${reqForm.roofType}. ${reqForm.notes}`,
      });

      const quoteId = res.data?.data?.quoteId || res.data?.data?.id;
      if (quoteId && reqRoofPhotos.length > 0) {
        try {
          const fd = new FormData();
          reqRoofPhotos.forEach((f) => fd.append('photos', f));
          fd.append('caption', `Homeowner roof request - ${reqForm.roofType}`);
          fd.append('phase', 'ROOF_CONDITION');
          await quotesApi.uploadPhotos(quoteId, fd);
        } catch (photoErr) {
          console.warn('Photos could not be attached immediately:', photoErr);
        }
      }

      alert('Your solar quotation request has been submitted with roof details! Our survey engineer will reach out.');
      setShowRequestModal(false);
      setReqRoofPhotos([]);
      setReqRoofPreviews([]);
      loadData();
    } catch (err) {
      alert('Request failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingReq(false);
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">My Solar Quotations &amp; Proposals</h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Review detailed Bill of Materials (BOM), central subsidy calculations, and digitally accept your solar proposal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#714B67]/20 cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4 text-[#f09e38]" /> Request New Quotation
        </button>
      </div>

      {quotes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EBDCE7] space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F5EDF3] text-[#714B67] flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-8 h-8 text-[#f09e38]" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#241621]">No Quotations Found</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Once our team completes your roof site survey, your official solar quotation will appear here.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[#714B67] text-white text-xs font-bold hover:bg-[#5e3c54]"
          >
            Request a 3 kW Solar System Quote
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Quotes List - Left 4 cols */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-black text-[#714B67] uppercase tracking-wider">
              Available Proposals ({quotes.length})
            </h2>

            <div className="space-y-2.5 overflow-y-auto max-h-[75vh]">
              {quotes.map((q) => {
                const isSelected = selectedQuote?.id === q.id;
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuote(q)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#F5EDF3] to-white border-[#714B67] shadow-md ring-2 ring-[#714B67]/20'
                        : 'bg-white border-[#EBDCE7] hover:border-[#b886ad]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-black text-xs text-[#714B67]">{q.quoteNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          q.status === 'ACCEPTED' || q.status === 'CONVERTED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : q.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>

                    <p className="font-extrabold text-sm text-[#241621]">{q.packageTemplate?.name || 'Solar Package'}</p>
                    <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-[#EBDCE7]/60 text-xs">
                      <span className="text-[#714B67] font-bold">{q.capacityKw} kW System</span>
                      <span className="font-black text-[#241621]">
                        Net: ₹{Number(q.netPayable || q.totalAmount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quote Detailed Breakdown - Right 8 cols */}
          {selectedQuote && (
            <div className="lg:col-span-8 odoo-glass-card p-6 rounded-3xl space-y-6">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBDCE7]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-[#241621]">{selectedQuote.quoteNumber}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#F5EDF3] text-[#714B67]">
                      v{selectedQuote.version || 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedQuote.packageTemplate?.name} • Sized for {selectedQuote.capacityKw} kW Peak Yield
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={quotesApi.downloadPdfUrl(selectedQuote.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-white border border-[#EBDCE7] hover:bg-[#F5EDF3] text-[#714B67] font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-[#f09e38]" /> Official PDF
                  </a>

                  {selectedQuote.status === 'SENT' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowAcceptModal(true)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Accept Proposal
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRejectModal(true)}
                        className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs cursor-pointer"
                      >
                        Request Changes
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Status Alert */}
              {selectedQuote.status === 'ACCEPTED' && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  Proposal accepted! Sales Order is confirmed and equipment picking has commenced.
                </div>
              )}

              {/* Bill of Materials (BOM) Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-black text-[#714B67] uppercase tracking-wider">
                  Engineered Bill of Materials (BOM)
                </h3>
                <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
                  <div className="bg-[#F5EDF3] p-2.5 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                    <div className="col-span-7">Component Description</div>
                    <div className="col-span-2 text-center">Quantity</div>
                    <div className="col-span-3 text-right">Line Total (₹)</div>
                  </div>

                  {selectedQuote.lines?.map((line, idx) => (
                    <div key={line.id || idx} className="p-3 grid grid-cols-12 items-center hover:bg-[#FAF6F9]">
                      <div className="col-span-7 font-extrabold text-[#241621]">
                        {line.description}
                        {line.product?.category && (
                          <span className="block text-[10px] text-[#b886ad] font-mono">{line.product.category}</span>
                        )}
                      </div>
                      <div className="col-span-2 text-center font-bold text-slate-700">{Number(line.quantity)}</div>
                      <div className="col-span-3 text-right font-black text-[#714B67]">
                        ₹{Number(line.lineTotal).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculation Summary Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#F5EDF3] to-white border border-[#EBDCE7] space-y-2.5 text-xs shadow-xs">
                <div className="flex justify-between text-slate-600">
                  <span>System Hardware &amp; Installation BOS:</span>
                  <span className="font-bold">₹{Number(selectedQuote.subtotal).toLocaleString()}</span>
                </div>

                {Number(selectedQuote.discountAmount) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Special Promotional Discount:</span>
                    <span>- ₹{Number(selectedQuote.discountAmount).toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Statutory GST (18%):</span>
                  <span className="font-bold">₹{Number(selectedQuote.gstAmount).toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-sm font-black text-[#241621] pt-2 border-t border-[#EBDCE7]">
                  <span>Total System Investment (Gross):</span>
                  <span className="text-[#714B67]">₹{Number(selectedQuote.totalAmount).toLocaleString()}</span>
                </div>

                {/* Central PM Surya Ghar Subsidy Benefit */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between font-extrabold">
                  <div className="flex items-center gap-1.5">
                    <BadgePercent className="w-4 h-4 text-emerald-600" />
                    <span>Central PM Surya Ghar DBT Subsidy Benefit:</span>
                  </div>
                  <span className="text-emerald-700 text-sm font-black">
                    - ₹{Number(selectedQuote.subsidyAmount || 78000).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t-2 border-[#714B67]/20">
                  <div>
                    <span className="text-sm font-black text-[#241621] block">Net Customer Payable:</span>
                    <span className="text-[10px] text-slate-400">Direct benefit transfer credited post net meter installation</span>
                  </div>
                  <span className="text-2xl font-black text-[#714B67]">
                    ₹{Number(selectedQuote.netPayable || selectedQuote.totalAmount).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Rooftop Condition & Property Photos Section */}
              <div className="space-y-3 pt-3 border-t border-[#EBDCE7]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-[#714B67] uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#714B67]" />
                    Rooftop &amp; Property Photos ({selectedQuote.photos?.length || 0})
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    Upload images to help engineers verify shading and structure
                  </span>
                </div>

                {/* Existing Photos Grid */}
                {selectedQuote.photos && selectedQuote.photos.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {selectedQuote.photos.map((p, i) => (
                      <div key={p.id || i} className="group relative rounded-xl overflow-hidden border border-[#EBDCE7] aspect-square bg-slate-50 shadow-2xs">
                        <img src={p.url} alt={p.caption || 'Rooftop photo'} className="w-full h-full object-cover" />
                        {p.caption && (
                          <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 text-white text-[9px] p-1 truncate">
                            {p.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No rooftop photos uploaded yet for this quote.</p>
                )}

                {/* Upload New Roof Photos Dropzone */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#FAF6F9] to-white border border-dashed border-[#dabfd2] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-[#241621] flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5 text-[#714B67]" /> Add Photos of Your Rooftop
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Take a photo of your terrace, electricity meter, or obstacles (JPG/PNG, up to 10MB)
                      </p>
                    </div>

                    <label className="px-3 py-1.5 rounded-xl bg-white border border-[#EBDCE7] hover:bg-[#F5EDF3] text-[#714B67] font-black text-[11px] flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0 self-start sm:self-auto">
                      <Camera className="w-3.5 h-3.5 text-[#f09e38]" /> Select / Snap Photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleSelectQuoteRoofPhotos}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Previews of newly selected photos */}
                  {roofPhotoPreviews.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-[#EBDCE7]">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold text-[#714B67]">
                          Selected ({roofPhotoPreviews.length} photos):
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRoofPhotos([]);
                              setRoofPhotoPreviews([]);
                            }}
                            className="text-[10px] text-slate-500 hover:text-rose-600 font-bold cursor-pointer"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            disabled={uploadingRoofPhotos}
                            onClick={handleUploadQuoteRoofPhotos}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            {uploadingRoofPhotos ? 'Uploading...' : '⚡ Upload Roof Photos'}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {roofPhotoPreviews.map((src, idx) => (
                          <img
                            key={idx}
                            src={src}
                            alt="Roof Preview"
                            className="w-16 h-16 rounded-xl object-cover border border-emerald-300 ring-1 ring-emerald-400 shrink-0"
                          />
                        ))}
                      </div>

                      <input
                        type="text"
                        placeholder="Optional caption (e.g. 'South-facing unobstructed RCC roof')"
                        value={roofPhotoCaption}
                        onChange={(e) => setRoofPhotoCaption(e.target.value)}
                        className="w-full p-2 rounded-xl border border-[#EBDCE7] bg-white text-[11px] outline-none focus:ring-1 focus:ring-[#714B67]"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ACCEPT QUOTE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showAcceptModal && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621] flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Accept Solar Quotation
                </h3>
                <p className="text-[11px] text-slate-500">{selectedQuote.quoteNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <span className="font-extrabold block">Ready to start generating solar power?</span>
              <p className="text-[11px] text-emerald-800">
                By accepting this proposal, you confirm your order for the {selectedQuote.capacityKw} kW system with net
                payable of ₹{Number(selectedQuote.netPayable || selectedQuote.totalAmount).toLocaleString()}.
              </p>
            </div>

            <form onSubmit={handleAcceptQuote} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Full Signee Name *</label>
                <input
                  type="text"
                  required
                  value={signeeName}
                  onChange={(e) => setSigneeName(e.target.value)}
                  placeholder="e.g. Anand Sharma (Property Owner)"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Acceptance Notes (Optional)</label>
                <input
                  type="text"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Confirmed for installation next week"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black shadow-md cursor-pointer hover:opacity-95 disabled:opacity-50"
                >
                  {submittingAction ? 'Processing...' : 'Confirm Acceptance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: REJECT / REVISE QUOTE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showRejectModal && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621]">Request Proposal Revision</h3>
                <p className="text-[11px] text-slate-500">{selectedQuote.quoteNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectQuote} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">What changes would you like? *</label>
                <textarea
                  rows="3"
                  required
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="e.g. Please change to 5 kW system with battery backup, or provide higher tier panels"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submittingAction ? 'Submitting...' : 'Send Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: REQUEST NEW QUOTATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621] flex items-center gap-1.5">
                  <Sparkles className="w-5 h-5 text-[#f09e38]" /> Request Solar Quotation
                </h3>
                <p className="text-[11px] text-slate-500">Government PM Surya Ghar Subsidy Ready</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRequestQuoteSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Desired Capacity (kW) *</label>
                  <select
                    value={reqForm.desiredCapacityKw}
                    onChange={(e) => setReqForm({ ...reqForm, desiredCapacityKw: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((kw) => (
                      <option key={kw} value={kw}>
                        {kw} kW System
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Monthly Electric Bill (₹)</label>
                  <input
                    type="number"
                    value={reqForm.monthlyBillAmount}
                    onChange={(e) => setReqForm({ ...reqForm, monthlyBillAmount: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Roof Construction Type</label>
                <select
                  value={reqForm.roofType}
                  onChange={(e) => setReqForm({ ...reqForm, roofType: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="RCC Concrete Flat">RCC Concrete Flat Roof</option>
                  <option value="Tiled / Slanted Roof">Tiled / Slanted Roof</option>
                  <option value="Metal Sheet Shed">Metal Sheet Industrial Shed</option>
                  <option value="Elevated Rooftop">Elevated Structure Roof</option>
                </select>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Installation Site Address</label>
                <input
                  type="text"
                  value={reqForm.address}
                  onChange={(e) => setReqForm({ ...reqForm, address: e.target.value })}
                  placeholder="Plot/Flat, Street, City"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              {/* Rooftop Photos Selector */}
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#f09e38]" /> Attach Rooftop Photos (Optional)
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">Helps engineer customize BOM</span>
                </label>
                <label className="p-3 rounded-xl border border-dashed border-[#dabfd2] bg-[#FAF6F9] hover:bg-[#F5EDF3] flex items-center justify-center gap-2 cursor-pointer transition">
                  <Upload className="w-4 h-4 text-[#714B67]" />
                  <span className="text-[11px] font-bold text-[#714B67]">
                    {reqRoofPhotos.length > 0 ? `${reqRoofPhotos.length} photo(s) selected` : 'Select or Snap Rooftop Photos'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setReqRoofPhotos(files);
                      setReqRoofPreviews(files.map((f) => URL.createObjectURL(f)));
                    }}
                    className="hidden"
                  />
                </label>
                {reqRoofPreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pt-2">
                    {reqRoofPreviews.map((src, i) => (
                      <img key={i} src={src} alt="Roof" className="w-12 h-12 rounded-lg object-cover border border-[#EBDCE7] shrink-0" />
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-5 py-2 rounded-xl bg-[#714B67] hover:bg-[#5b3c53] text-white font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submittingReq ? 'Submitting...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

