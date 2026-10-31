import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import SignatureCanvas from 'react-signature-canvas';
import { quotesApi } from '../../api';
import {
  Sun,
  ShieldCheck,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Share2,
  Copy,
  Check,
  X,
  FileText,
  BadgePercent,
  Calendar,
  Lock,
} from 'lucide-react';

export default function SharedQuoteViewPage() {
  const { token } = useParams();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Digital Acceptance Modal
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [acceptNotes, setAcceptNotes] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [actionDoneMsg, setActionDoneMsg] = useState('');
  const sigPad = useRef(null);

  // Rejection Modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  useEffect(() => {
    loadSharedQuote();
  }, [token]);

  const loadSharedQuote = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await quotesApi.getShared(token);
      setQuote(res.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Quotation not found or link has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleAccept = async (e) => {
    e.preventDefault();
    setAccepting(true);
    try {
      let signatureData = null;
      if (sigPad.current && !sigPad.current.isEmpty()) {
        signatureData = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      }

      const res = await quotesApi.acceptShared(token, {
        signature: signatureData,
        notes: acceptNotes ? `${acceptNotes} (Signed by: ${signatureName || 'Customer'})` : `Accepted by: ${signatureName || 'Customer'}`,
      });

      setShowAcceptModal(false);
      setActionDoneMsg('Quotation accepted successfully! Our installation engineering team has been notified.');
      loadSharedQuote();
    } catch (err) {
      alert('Acceptance failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejecting this quote.');
      return;
    }
    setRejecting(true);
    try {
      await quotesApi.rejectShared(token, { reason: rejectReason.trim() });
      setShowRejectModal(false);
      setActionDoneMsg('Quotation has been rejected. Thank you for your feedback.');
      loadSharedQuote();
    } catch (err) {
      alert('Rejection failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF6F9] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-[#FAF6F9] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-rose-200 max-w-md text-center space-y-3 shadow-xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-black text-[#241621]">Invalid or Expired Proposal</h2>
          <p className="text-xs text-slate-500">{error || 'Unable to access quotation.'}</p>
        </div>
      </div>
    );
  }

  const isExpired = quote.validUntil && new Date(quote.validUntil) < new Date();
  const isAccepted = quote.status === 'ACCEPTED' || quote.status === 'CONVERTED';
  const isPendingApproval = quote.status === 'PENDING_APPROVAL';

  return (
    <div className="min-h-screen bg-[#FAF6F9] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Top Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EBDCE7] shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EBDCE7]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#714b67] to-[#f09e38] flex items-center justify-center text-white shadow-md">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-[#714B67] tracking-wider">
                  {quote.company?.name || 'SunPower Solutions Pvt Ltd'}
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-[#241621]">Solar Installation Proposal</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF6F9] hover:bg-[#F5EDF3] text-[#714b67] font-bold text-xs border border-[#EBDCE7] transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Link Copied!' : 'Share Link'}
              </button>
            </div>
          </div>

          {actionDoneMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{actionDoneMsg}</span>
            </div>
          )}

          {/* Key Meta Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7]">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Quote Number</span>
              <p className="font-mono font-black text-[#714b67] text-sm mt-0.5">{quote.quoteNumber}</p>
              <span className="text-[10px] font-bold bg-[#714b67]/10 text-[#714b67] px-1.5 py-0.2 rounded">
                Version v{quote.version}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7]">
              <span className="text-[10px] text-slate-500 font-bold uppercase">System Capacity</span>
              <p className="font-black text-[#241621] text-sm mt-0.5">{quote.capacityKw} kW Peak</p>
              <span className="text-[10px] text-slate-500">{quote.packageTemplate?.name || 'Solar Kit'}</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7]">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Validity Date</span>
              <p className="font-bold text-[#241621] text-xs mt-0.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '30 Days'}
              </p>
              <span className={`text-[10px] font-bold ${isExpired ? 'text-rose-600' : 'text-emerald-700'}`}>
                {isExpired ? 'Expired' : 'Active Proposal'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7]">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Status</span>
              <p className="mt-0.5">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  quote.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                  quote.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                  quote.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                  'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {quote.status}
                </span>
              </p>
            </div>
          </div>

          {/* Client & Company Information */}
          <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Prepared For</span>
              <p className="font-extrabold text-[#241621] text-sm mt-0.5">{quote.customer?.name}</p>
              <p className="text-slate-600">{quote.customer?.phone}</p>
              <p className="text-slate-500">{quote.customer?.address || 'Site Address Verified'}</p>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Issued By</span>
              <p className="font-extrabold text-[#714B67] text-sm mt-0.5">{quote.company?.name || 'SunPower Solutions'}</p>
              <p className="text-slate-600">{quote.company?.phone} • {quote.company?.email}</p>
              <p className="text-slate-500">{quote.company?.address}</p>
            </div>
          </div>

          {/* Itemized Hardware & Service BOM Table */}
          <div className="space-y-3">
            <h2 className="text-sm font-black text-[#241621] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#f09e38]" /> Itemized Equipment & Technical Specifications
            </h2>
            <div className="rounded-2xl border border-[#EBDCE7] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF6F9] text-[#714b67] font-black uppercase text-[10px] border-b border-[#EBDCE7]">
                  <tr>
                    <th className="py-2.5 px-4">#</th>
                    <th className="py-2.5 px-4">Item & Description</th>
                    <th className="py-2.5 px-4 text-center">Quantity</th>
                    <th className="py-2.5 px-4 text-right">Unit Price</th>
                    <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBDCE7] text-slate-700">
                  {(quote.lines || []).map((l, idx) => (
                    <tr key={l.id || idx} className="hover:bg-[#FAF6F9]/50">
                      <td className="py-2.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold text-[#241621]">{l.description}</td>
                      <td className="py-2.5 px-4 text-center font-bold font-mono">{Number(l.quantity)}</td>
                      <td className="py-2.5 px-4 text-right font-mono">₹{Number(l.unitPrice).toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-[#241621]">
                        ₹{Number(l.lineTotal).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Breakdown & Central Subsidy Section */}
          <div className="grid sm:grid-cols-2 gap-6 pt-2">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 text-xs space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                <BadgePercent className="w-4 h-4 text-[#d4821a]" />
                PM Surya Ghar DBT Subsidy
              </div>
              <p className="text-[11px] text-amber-950/80 leading-relaxed">
                {quote.subsidyNote || 'Eligible for Central Government Rooftop Subsidy credited directly into homeowner bank account post Discom net-metering commissioning.'}
              </p>
              <div className="pt-2 border-t border-amber-200/80 flex items-center justify-between font-bold">
                <span className="text-amber-900">Direct Subsidy Benefit:</span>
                <span className="text-emerald-700 font-mono text-sm font-black">
                  - ₹{Number(quote.subsidyAmount || 78000).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs font-semibold">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Hardware & Services):</span>
                <span className="font-mono font-bold">₹{Number(quote.subtotal).toLocaleString('en-IN')}</span>
              </div>
              {Number(quote.discountAmount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Promotional Discount:</span>
                  <span className="font-mono">- ₹{Number(quote.discountAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST (18%):</span>
                <span className="font-mono font-bold">₹{Number(quote.gstAmount).toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-[#EBDCE7] flex justify-between text-base font-black text-[#241621]">
                <span>Total Invoice Value:</span>
                <span className="font-mono text-[#714B67]">₹{Number(quote.totalAmount).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-baseline text-emerald-950 font-black">
                <span className="text-xs">Net Out-of-Pocket Cost (Post Subsidy):</span>
                <span className="text-lg font-mono text-emerald-800">
                  ₹{Number(quote.netPayable || Math.max(0, quote.totalAmount - (quote.subsidyAmount || 78000))).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>

          {/* Terms & Digital Acceptance Footer */}
          <div className="pt-6 border-t border-[#EBDCE7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] text-slate-500 max-w-md">
                <strong>Payment Terms:</strong> {quote.terms || '10% Advance, 80% on Material Dispatch, 10% Post Commissioning.'}
              </p>
              {isAccepted && quote.acceptedAt && (
                <p className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Accepted on {new Date(quote.acceptedAt).toLocaleString('en-IN')} • Digital Record Logged
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {!isAccepted && !isPendingApproval && !isExpired && (
                <>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs transition cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => setShowAcceptModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Accept Quotation Online
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ACCEPTANCE MODAL */}
      {showAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#22151F]/75 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl border border-[#EBDCE7] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621]">Digital Acceptance & Sign-off</h3>
                <p className="text-[11px] text-slate-500">Proposal #{quote.quoteNumber} (v{quote.version})</p>
              </div>
              <button onClick={() => setShowAcceptModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAccept} className="space-y-4">
              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Your Full Name (Signer) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={signatureName}
                  onChange={e => setSignatureName(e.target.value)}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-extrabold text-[#241621]">Digital Signature (Draw below)</label>
                  <button
                    type="button"
                    onClick={() => sigPad.current && sigPad.current.clear()}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold underline"
                  >
                    Clear Signature
                  </button>
                </div>
                <div className="border border-[#EBDCE7] rounded-xl bg-white overflow-hidden">
                  <SignatureCanvas
                    ref={sigPad}
                    penColor="#241621"
                    canvasProps={{ className: 'w-full h-32' }}
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Notes / Preferences (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Please call before dispatch; rooftop access via external staircase"
                  value={acceptNotes}
                  onChange={e => setAcceptNotes(e.target.value)}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-medium text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-normal">
                🔒 By submitting, you confirm acceptance of the proposal total of ₹{Number(quote.totalAmount).toLocaleString('en-IN')}. A timestamped digital acceptance record and IP log will be attached.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(false)}
                  className="px-4 py-2 border border-[#EBDCE7] rounded-xl text-xs font-bold text-slate-600 hover:bg-[#FAF6F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={accepting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md disabled:opacity-50"
                >
                  {accepting ? 'Recording Acceptance...' : 'Confirm & Sign Online'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#22151F]/75 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl border border-[#EBDCE7] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <h3 className="text-base font-black text-[#241621]">Decline Quotation</h3>
              <button onClick={() => setShowRejectModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Reason for Declining *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Price is over budget; want to explore higher capacity system; postponing installation"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-medium text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67] resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 border border-[#EBDCE7] rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow-md disabled:opacity-50"
                >
                  {rejecting ? 'Submitting...' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

