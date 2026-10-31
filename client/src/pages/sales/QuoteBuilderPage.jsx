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
  Sun,
  Zap,
  ShieldCheck,
  Calculator,
  Sliders,
  BadgePercent,
  Layers,
  FileCheck2,
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

  // Financial calculations
  const subtotal = bomLines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0);
  const gstAmount = ((subtotal - Number(discountAmount || 0)) * 18) / 100;
  const totalAmount = subtotal - Number(discountAmount || 0) + gstAmount;

  // Estimated PM Surya Ghar Subsidy (Rule 10 preview)
  const estimatedSubsidy = capacityKw >= 3 ? 78000 : capacityKw >= 2 ? 60000 : 30000;
  const netCustomerPayable = Math.max(0, totalAmount - estimatedSubsidy);

  // Approximate panels count (assuming ~540W modules = ~2 panels per kW)
  const approxPanelCount = Math.ceil(capacityKw * 1.85);

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
      alert(`Sales Order ${res.data?.data?.orderNumber} created! Head to Orders & Payments to record advance.`);
      loadData();
    } catch (err) {
      alert('Failed to create order: ' + (err.response?.data?.message || err.message));
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
      {/* Top Banner with Odoo Styling */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">Solar Quotation Studio</h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Rule 2 Strict Gatekeeper (Survey Approved) & Rule 3 Dynamic BOM Sizing Engine
          </p>
        </div>

        {/* Quick capacity preset chips */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-[#b886ad] uppercase">Presets:</span>
          {[3, 5, 8, 10].map((kw) => (
            <button
              key={kw}
              type="button"
              onClick={() => setCapacityKw(kw)}
              className={`px-3 py-1 rounded-xl text-xs font-extrabold transition-all ${
                capacityKw === kw
                  ? 'bg-[#714B67] text-white shadow-md shadow-[#714B67]/30 ring-2 ring-[#f09e38]'
                  : 'bg-white text-[#714B67] border border-[#EBDCE7] hover:bg-[#F5EDF3]'
              }`}
            >
              {kw} kW
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left 7 cols: Interactive Builder Form */}
        <div className="lg:col-span-7 odoo-glass-card p-6 rounded-2xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
            <h2 className="text-sm font-extrabold text-[#241621] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#f09e38]" /> Auto-Configuring Solar Engine
            </h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#f09e38]/15 text-[#d4821a] font-black border border-[#f09e38]/30">
              GST 18% + PM Surya Ghar Ready
            </span>
          </div>

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shadow-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> {successMsg}
            </div>
          )}

          <form onSubmit={handleCreateQuote} className="space-y-5 text-xs">
            {/* Lead Selector (Rule 2) */}
            <div>
              <label className="font-extrabold text-[#241621] mb-1.5 flex items-center justify-between">
                <span>1. Target Customer Lead (Rule 2: Must be Survey Approved)</span>
                <span className="text-[10px] text-[#b886ad] font-semibold">{approvedLeads.length} leads eligible</span>
              </label>

              {approvedLeads.length === 0 ? (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    No leads with <strong className="text-amber-950 font-bold">SURVEY_APPROVED</strong> found. Complete site survey approval in Kanban first!
                  </span>
                </div>
              ) : (
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  required
                  className="w-full p-3 rounded-xl border border-[#EBDCE7] bg-white font-semibold text-[#241621] focus:ring-2 focus:ring-[#714B67] outline-none shadow-xs cursor-pointer"
                >
                  <option value="">-- Choose Approved Lead --</option>
                  {approvedLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.contactName} - {l.title} ({l.phone}) • {l.desiredCapacityKw || 3} kW Planned
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Template Selector & Visual Capacity Slider */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="font-extrabold text-[#241621] mb-1.5 block">
                  2. Solar Package Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-semibold text-[#241621] focus:ring-2 focus:ring-[#714B67] outline-none shadow-xs"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-extrabold text-[#241621]">
                    3. System Capacity: <span className="text-[#714B67] font-black">{capacityKw} kW</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#f09e38] flex items-center gap-1">
                    <Sun className="w-3 h-3 text-[#f09e38]" /> ~{approxPanelCount} PV Modules
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={capacityKw}
                    onChange={(e) => setCapacityKw(Number(e.target.value))}
                    className="w-full h-2 bg-[#EBDCE7] rounded-lg appearance-none cursor-pointer accent-[#714B67]"
                  />
                  <span className="font-black text-sm text-[#714B67] min-w-[3rem] text-right">{capacityKw} kW</span>
                </div>
              </div>
            </div>

            {/* Live Photovoltaic Solar Array Visualizer Widget */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#241621] to-[#382433] text-white shadow-inner space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-white/10 pb-2">
                <span className="font-extrabold flex items-center gap-1.5 text-[#dabed3]">
                  <Layers className="w-4 h-4 text-[#f09e38]" /> Real-Time Solar Array Simulation
                </span>
                <span className="text-[11px] text-[#f09e38] font-bold">
                  {capacityKw} kW Peak • ~{Math.round(capacityKw * 4.3)} kWh/Day Yield
                </span>
              </div>

              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 py-1">
                {Array.from({ length: approxPanelCount }).map((_, i) => (
                  <div
                    key={i}
                    className="solar-cell h-10 rounded-md flex flex-col items-center justify-center border border-sky-400/50 shadow-xs group"
                    title={`Panel #${i + 1}: 540W Mono-PERC Tier 1 Module`}
                  >
                    <div className="w-full h-0.5 bg-sky-300/30 my-auto"></div>
                    <span className="text-[8px] font-mono font-bold text-sky-200">540W</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#dabed3]/80 flex items-center gap-1">
                <span>Calculated for Tier-1 Half-Cut Mono-PERC modules with 25-Year Performance Warranty.</span>
              </p>
            </div>

            {/* Editable BOM Lines Table (Rule 3) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-[#241621] flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-[#714B67]" /> Bill of Materials (BOM) Auto-Expansion
                </span>
                <span className="text-[11px] font-bold text-[#b886ad]">
                  Rule 3: Dynamically scaled by {capacityKw} kW
                </span>
              </div>

              <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 shadow-xs bg-white">
                <div className="bg-[#F5EDF3] p-2.5 grid grid-cols-12 gap-2 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                  <div className="col-span-6">Component Description</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-2 text-right">Unit Rate (₹)</div>
                  <div className="col-span-2 text-right">Line Total (₹)</div>
                </div>

                {bomLines.map((line, idx) => (
                  <div key={idx} className="p-2.5 grid grid-cols-12 gap-2 items-center text-xs hover:bg-[#FAF6F9] transition-colors">
                    <input
                      type="text"
                      value={line.description}
                      onChange={(e) => handleUpdateLine(idx, 'description', e.target.value)}
                      className="col-span-6 p-1.5 rounded-lg border border-transparent hover:border-[#EBDCE7] focus:border-[#714B67] font-semibold text-[#241621] truncate outline-none"
                    />
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => handleUpdateLine(idx, 'quantity', e.target.value)}
                      className="col-span-2 p-1.5 rounded-lg border border-[#EBDCE7] text-right font-bold text-[#241621] focus:ring-1 focus:ring-[#714B67] outline-none"
                    />
                    <input
                      type="number"
                      value={line.unitPrice}
                      onChange={(e) => handleUpdateLine(idx, 'unitPrice', e.target.value)}
                      className="col-span-2 p-1.5 rounded-lg border border-[#EBDCE7] text-right font-semibold text-[#241621] focus:ring-1 focus:ring-[#714B67] outline-none"
                    />
                    <div className="col-span-2 text-right font-black text-[#714B67] pr-1">
                      ₹{line.lineTotal.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subsidy Notice & Discount */}
            <div className="grid sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="font-extrabold text-[#241621] mb-1 block">Government Subsidy Legal Note</label>
                <input
                  type="text"
                  value={subsidyNote}
                  onChange={(e) => setSubsidyNote(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] text-xs focus:ring-2 focus:ring-[#714B67] outline-none"
                />
              </div>
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Special Discount (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] text-xs text-right font-bold text-[#241621] focus:ring-2 focus:ring-[#714B67] outline-none"
                />
              </div>
            </div>

            {/* Commercial Calculation Summary Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F5EDF3] via-[#FAF6F9] to-white border border-[#EBDCE7] space-y-2 text-xs shadow-xs">
              <div className="flex justify-between text-[#714B67] font-semibold">
                <span>Subtotal (Equipment + BOS):</span>
                <span className="font-bold">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[#714B67] font-semibold">
                <span>GST (18% Statutory Rate):</span>
                <span className="font-bold">₹{gstAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-[#241621] pt-1.5 border-t border-[#EBDCE7]">
                <span>Gross Project Cost:</span>
                <span className="text-[#714B67] font-black">₹{totalAmount.toLocaleString()}</span>
              </div>

              {/* PM Surya Ghar subsidy badge */}
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-900 font-bold">
                <div className="flex items-center gap-1.5">
                  <BadgePercent className="w-4 h-4 text-emerald-600" />
                  <span>Estimated PM Surya Ghar Subsidy:</span>
                </div>
                <span className="text-emerald-700 font-black">- ₹{estimatedSubsidy.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-base font-black text-[#241621] pt-2 border-t-2 border-[#714B67]/20">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#f09e38]" /> Estimated Net Customer Investment:
                </span>
                <span className="text-xl text-[#714B67] font-black">₹{netCustomerPayable.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || approvedLeads.length === 0}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#714b67] via-[#855278] to-[#714b67] hover:opacity-95 text-white font-black text-xs shadow-lg shadow-[#714b67]/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <FileCheck2 className="w-4 h-4 text-[#f09e38]" />
              {submitting ? 'Generating PDF Quotation...' : 'Save & Issue Official Quotation (PDFKit)'}
            </button>
          </form>
        </div>

        {/* Right 5 cols: Quotation History & Downloads */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#241621] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#714B67]" /> Recent Quotations ({quotes.length})
            </h2>
            <span className="text-[11px] font-bold text-[#b886ad]">Odoo Certified</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[80vh] pr-1">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-2xl odoo-glass-card space-y-3 text-xs transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-[#714B67] font-mono tracking-wide">{q.quoteNumber}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      q.status === 'CONVERTED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-[#F5EDF3] text-[#714B67] border border-[#EBDCE7]'
                    }`}
                  >
                    {q.status}
                  </span>
                </div>

                <div>
                  <p className="font-extrabold text-sm text-[#241621]">{q.customer?.name}</p>
                  <p className="text-[#714B67] text-[11px] font-medium mt-0.5">
                    {q.capacityKw} kW System • {q.packageTemplate?.name}
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-base font-black text-[#241621]">
                      ₹{Number(q.totalAmount).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-semibold text-[#b886ad]">(Incl. 18% GST)</span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-[#EBDCE7] flex items-center justify-between">
                  <a
                    href={quotesApi.downloadPdfUrl(q.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-[#714B67] font-extrabold hover:text-[#935F87] transition"
                  >
                    <Download className="w-3.5 h-3.5 text-[#f09e38]" /> Download PDF
                  </a>

                  {q.status !== 'CONVERTED' ? (
                    <button
                      onClick={() => handleConvertOrder(q.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] shadow-sm shadow-emerald-600/30 transition cursor-pointer"
                    >
                      Convert to Order <ArrowRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-emerald-700 font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Order Placed
                    </span>
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
