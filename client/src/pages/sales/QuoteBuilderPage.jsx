import React, { useState, useEffect } from 'react';
import { quotesApi, inventoryApi, leadsApi, ordersApi } from '../../api';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function QuoteBuilderPage() {
  const [quotes, setQuotes] = useState([]);
  const [approvedLeads, setApprovedLeads] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [capacityKw, setCapacityKw] = useState(3);
  const [subsidyNote, setSubsidyNote] = useState('Eligible for Central PM Surya Ghar subsidy (up to ₹78,000 for 3kW+) subject to Discom net meter commissioning.');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [bomLines, setBomLines] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      const [quotesRes, leadsRes, tmplRes] = await Promise.all([
        quotesApi.list(),
        leadsApi.list({ stage: 'SURVEY_APPROVED' }),
        inventoryApi.getTemplates(),
      ]);
      setQuotes(quotesRes.data?.data || []);
      setApprovedLeads(leadsRes.data?.data || []);
      setTemplates(tmplRes.data?.data || []);
      if (tmplRes.data?.data?.length > 0) {
        setSelectedTemplateId(tmplRes.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load quote builder data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When template or capacityKw changes, auto-expand BOM lines (Rule 3)
  useEffect(() => {
    if (!selectedTemplateId) return;
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (template && template.bomLines) {
      const expanded = template.bomLines.map((bom, idx) => {
        const qty = Math.max(1, Math.ceil(Number(bom.quantityPerKw) * capacityKw + Number(bom.fixedQuantity)));
        const unitPrice = Number(bom.product?.salePrice || 0);
        return {
          productId: bom.productId,
          description: `${bom.product?.name || 'Product'} (${bom.product?.sku || ''})`,
          quantity: qty,
          unitPrice,
          unitCost: Number(bom.product?.costPrice || 0),
          gstRate: Number(bom.product?.gstRate || 18),
          lineTotal: qty * unitPrice,
          sortOrder: idx,
        };
      });
      setBomLines(expanded);
    }
  }, [selectedTemplateId, capacityKw, templates]);

  const handleUpdateLine = (index, field, value) => {
    const updated = [...bomLines];
    updated[index][field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].lineTotal = Number(updated[index].quantity || 0) * Number(updated[index].unitPrice || 0);
    }
    setBomLines(updated);
  };

  const handleRemoveLine = (index) => {
    setBomLines(bomLines.filter((_, i) => i !== index));
  };

  const subtotal = bomLines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0);
  const gstAmount = ((subtotal - Number(discountAmount || 0)) * 18) / 100;
  const totalAmount = subtotal - Number(discountAmount || 0) + gstAmount;

  const handleCreateQuote = async (e) => {
    e.preventDefault();
    if (!selectedLeadId) {
      alert('Please select a survey-approved lead (Rule 2).');
      return;
    }

    setSubmitting(true);
    setSuccessMsg('');
    try {
      const res = await quotesApi.create({
        leadId: selectedLeadId,
        packageTemplateId: selectedTemplateId,
        capacityKw: Number(capacityKw),
        subsidyNote,
        discountAmount: Number(discountAmount),
        customLines: bomLines,
      });

      setSuccessMsg(`Quote ${res.data?.data?.quoteNumber} generated successfully!`);
      loadData();
    } catch (err) {
      alert('Quote generation failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertOrder = async (quoteId) => {
    try {
      const res = await ordersApi.createFromQuote({ quoteId });
      alert(`Sales Order ${res.data?.data?.orderNumber} created! Head to Orders to record payment.`);
      loadData();
    } catch (err) {
      alert('Failed to create order: ' + (err.response?.data?.message || err.message));
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
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Solar Quotation Builder</h1>
        <p className="text-xs text-slate-500">
          Rule 2 (Survey Approved Check) & Rule 3 (Auto-expanding BOM scaled by kW)
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Interactive Builder Form */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" /> Auto-Configuring Quote Engine
          </h2>

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" /> {successMsg}
            </div>
          )}

          <form onSubmit={handleCreateQuote} className="space-y-4 text-xs">
            {/* Lead Selector (Rule 2) */}
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">
                Target Customer Lead (Must have SURVEY_APPROVED)
              </label>
              {approvedLeads.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  No leads with Survey status APPROVED found. Complete a survey in Kanban first to unlock quotation.
                </div>
              ) : (
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-medium"
                >
                  <option value="">-- Choose Approved Lead --</option>
                  {approvedLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.contactName} - {l.title} ({l.phone})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Template Selector & Capacity */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Package Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">System Capacity (1 - 5 kW)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  value={capacityKw}
                  onChange={(e) => setCapacityKw(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
            </div>

            {/* Editable BOM Lines Table (Rule 3) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-slate-700">Auto-Expanded Bill of Materials (BOM)</span>
                <span className="text-[11px] text-slate-400">Scaled automatically by {capacityKw} kW</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                <div className="bg-slate-50 p-2.5 grid grid-cols-12 gap-2 font-bold text-[10px] text-slate-500 uppercase">
                  <div className="col-span-6">Item / Component</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-2 text-right">Rate (₹)</div>
                  <div className="col-span-2 text-right">Total (₹)</div>
                </div>

                {bomLines.map((line, idx) => (
                  <div key={idx} className="p-2 grid grid-cols-12 gap-2 items-center text-xs hover:bg-slate-50/50">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => handleUpdateLine(idx, 'description', e.target.value)}
                      className="col-span-6 p-1 rounded border border-transparent hover:border-slate-300 font-medium truncate"
                    />
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => handleUpdateLine(idx, 'quantity', e.target.value)}
                      className="col-span-2 p-1 rounded border border-slate-200 text-right"
                    />
                    <input
                      type="number"
                      value={line.unitPrice}
                      onChange={(e) => handleUpdateLine(idx, 'unitPrice', e.target.value)}
                      className="col-span-2 p-1 rounded border border-slate-200 text-right"
                    />
                    <div className="col-span-2 text-right font-semibold text-slate-800 pr-1">
                      ₹{line.lineTotal.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subsidy Notice & Discount */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="col-span-2">
                <label className="font-semibold text-slate-700 mb-1 block">Government Subsidy Note</label>
                <input
                  type="text"
                  value={subsidyNote}
                  onChange={(e) => setSubsidyNote(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full p-2 rounded-lg border border-slate-300 text-xs text-right"
                />
              </div>
            </div>

            {/* Calculation Summary Card */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (18%):</span>
                <span>₹{gstAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-sky-700 pt-1 border-t border-slate-200">
                <span>Total Amount:</span>
                <span>₹{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || approvedLeads.length === 0}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? 'Generating PDF & Quote...' : 'Save & Issue Official Quotation'}
            </button>
          </form>
        </div>

        {/* Right 5 cols: Quotation History & Downloads */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Recent Quotations ({quotes.length})</h2>
          <div className="space-y-3 overflow-y-auto max-h-[75vh]">
            {quotes.map((q) => (
              <div key={q.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{q.quoteNumber}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700">
                    {q.status}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{q.customer?.name}</p>
                  <p className="text-slate-500 text-[11px]">{q.capacityKw} kW - {q.packageTemplate?.name}</p>
                  <p className="font-bold text-slate-900 mt-1">₹{Number(q.totalAmount).toLocaleString()}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={quotesApi.downloadPdfUrl(q.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-sky-600 font-semibold hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF Document
                  </a>

                  {q.status !== 'CONVERTED' && (
                    <button
                      onClick={() => handleConvertOrder(q.id)}
                      className="flex items-center gap-1 text-emerald-600 font-bold hover:underline"
                    >
                      Convert to Order <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
