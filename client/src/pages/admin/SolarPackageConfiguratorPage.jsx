import React, { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../../api';
import {
  Sun,
  Battery,
  Zap,
  Sliders,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Search,
  Layers,
  ArrowUp,
  ArrowDown,
  DollarSign,
  RefreshCw,
  Package,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Save,
  ToggleLeft,
  ToggleRight,
  Copy,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const PACKAGE_TYPES = [
  { value: 'ON_GRID',    label: 'On-Grid (Grid-Tied / Net Metering)' },
  { value: 'OFF_GRID',   label: 'Off-Grid (Battery Energy Storage)' },
  { value: 'HYBRID',     label: 'Hybrid (Grid + Battery Backup)' },
  { value: 'COMMERCIAL', label: 'Commercial / Industrial' },
];

const PRODUCT_CATEGORIES = [
  { value: 'PANEL',     label: 'Solar PV Panel',       color: 'bg-amber-100 text-amber-800' },
  { value: 'INVERTER',  label: 'Inverter',             color: 'bg-purple-100 text-purple-800' },
  { value: 'BATTERY',   label: 'Battery Storage',      color: 'bg-emerald-100 text-emerald-800' },
  { value: 'STRUCTURE', label: 'Mounting Structure',   color: 'bg-blue-100 text-blue-800' },
  { value: 'CABLE',     label: 'Cables & Wiring',      color: 'bg-slate-100 text-slate-700' },
  { value: 'MCBFUSE',   label: 'MCB / ACDB / DCDB',   color: 'bg-rose-100 text-rose-800' },
  { value: 'EARTHING',  label: 'Earthing & Lightning', color: 'bg-teal-100 text-teal-800' },
  { value: 'MISC',      label: 'Misc / Labour',        color: 'bg-gray-100 text-gray-700' },
];

const CAT_COLOR = Object.fromEntries(PRODUCT_CATEGORIES.map(c => [c.value, c.color]));
const CAT_LABEL = Object.fromEntries(PRODUCT_CATEGORIES.map(c => [c.value, c.label]));

const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

// Empty BOM line template
const emptyBomLine = () => ({
  _key: Math.random().toString(36).slice(2),
  productId: '',
  quantityPerKw: 0,
  fixedQuantity: 1,
  qtyMode: 'fixed',   // 'fixed' | 'perKw'
  notes: '',
});

// Empty package form
const emptyPackageForm = () => ({
  name: '',
  description: '',
  type: 'ON_GRID',
  minCapacityKw: 1,
  maxCapacityKw: 10,
  defaultCapacityKw: 3,
  basePrice: '',
  gstRate: 12,
  bomLines: [],
});

// Empty product form
const emptyProductForm = () => ({
  sku: '',
  name: '',
  category: 'PANEL',
  description: '',
  costPrice: '',
  salePrice: '',
  gstRate: 12,
  warrantyYears: 5,
  unit: 'unit',
  stockQty: 0,
  reorderLevel: 5,
});

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function SolarPackageConfiguratorPage() {
  const [activeTab, setActiveTab]           = useState('packages');
  const [loading, setLoading]               = useState(true);
  const [templates, setTemplates]           = useState([]);
  const [products, setProducts]             = useState([]);
  const [toast, setToast]                   = useState({ msg: '', type: 'success' });

  // Package state
  const [filterType, setFilterType]         = useState('ALL');
  const [expandedCard, setExpandedCard]     = useState(null);
  const [packageEditor, setPackageEditor]   = useState(null);  // null | { mode:'create'|'edit', data:... }
  const [pkgSaving, setPkgSaving]           = useState(false);

  // Product / component state
  const [catFilter, setCatFilter]           = useState('ALL');
  const [searchQuery, setSearchQuery]       = useState('');
  const [productEditor, setProductEditor]   = useState(null); // null | { mode:'create'|'edit', data:... }
  const [prodSaving, setProdSaving]         = useState(false);
  const [showInactive, setShowInactive]     = useState(false);

  // ── helpers ──────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tRes, pRes] = await Promise.all([
        inventoryApi.getTemplates(),
        inventoryApi.getProducts(),
      ]);
      setTemplates(tRes.data?.data || []);
      setProducts(pRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load configurator data:', err);
      showToast('Failed to load data. Please refresh.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── derived ──────────────────────────────────────────────
  const filteredTemplates = templates.filter(t =>
    filterType === 'ALL' || t.type === filterType
  );

  const filteredProducts = products.filter(p => {
    if (!showInactive && !p.isActive) return false;
    if (catFilter !== 'ALL' && p.category !== catFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  // ── BOM cost calculator ─────────────────────────────────
  const calcBomCost = (bomLines, defaultKw) => {
    let cost = 0;
    bomLines.forEach(line => {
      const prod = products.find(p => p.id === line.productId);
      if (!prod) return;
      const qty = line.qtyMode === 'perKw'
        ? Number(line.quantityPerKw || 0) * Number(defaultKw || 0)
        : Number(line.fixedQuantity || 0);
      cost += Number(prod.costPrice || 0) * qty;
    });
    return cost;
  };

  // ══════════════════════════════════════════════════════════
  // PACKAGE EDITOR
  // ══════════════════════════════════════════════════════════
  const openCreatePackage = () => {
    setPackageEditor({ mode: 'create', data: emptyPackageForm() });
  };

  const openEditPackage = (template) => {
    // Convert template BOM lines to editor format
    const bomLines = (template.bomLines || []).map(l => ({
      _key: Math.random().toString(36).slice(2),
      productId: l.productId,
      quantityPerKw: Number(l.quantityPerKw || 0),
      fixedQuantity: Number(l.fixedQuantity || 0),
      qtyMode: Number(l.quantityPerKw || 0) > 0 ? 'perKw' : 'fixed',
      notes: l.notes || '',
    }));

    setPackageEditor({
      mode: 'edit',
      templateId: template.id,
      data: {
        name: template.name,
        description: template.description || '',
        type: template.type,
        minCapacityKw: Number(template.minCapacityKw || 1),
        maxCapacityKw: Number(template.maxCapacityKw || 10),
        defaultCapacityKw: Number(template.defaultCapacityKw || 3),
        basePrice: Number(template.basePrice || 0),
        gstRate: Number(template.gstRate || 12),
        bomLines,
      },
    });
  };

  const pf = (field, value) => {
    setPackageEditor(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  };

  // BOM line helpers
  const addBomLine = () => {
    setPackageEditor(prev => ({
      ...prev,
      data: { ...prev.data, bomLines: [...prev.data.bomLines, emptyBomLine()] },
    }));
  };

  const removeBomLine = (key) => {
    setPackageEditor(prev => ({
      ...prev,
      data: { ...prev.data, bomLines: prev.data.bomLines.filter(l => l._key !== key) },
    }));
  };

  const updateBomLine = (key, field, value) => {
    setPackageEditor(prev => ({
      ...prev,
      data: {
        ...prev.data,
        bomLines: prev.data.bomLines.map(l =>
          l._key === key ? { ...l, [field]: value } : l
        ),
      },
    }));
  };

  const moveBomLine = (key, dir) => {
    setPackageEditor(prev => {
      const arr = [...prev.data.bomLines];
      const idx = arr.findIndex(l => l._key === key);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return { ...prev, data: { ...prev.data, bomLines: arr } };
    });
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    setPkgSaving(true);
    const { data, mode, templateId } = packageEditor;

    try {
      const bomLines = data.bomLines
        .filter(l => l.productId)
        .map((l, i) => ({
          productId: l.productId,
          quantityPerKw: l.qtyMode === 'perKw' ? Number(l.quantityPerKw) : 0,
          fixedQuantity: l.qtyMode === 'fixed' ? Number(l.fixedQuantity) : 0,
          sortOrder: i,
          notes: l.notes || null,
        }));

      const payload = {
        name: data.name.trim(),
        description: data.description.trim() || null,
        type: data.type,
        minCapacityKw: Number(data.minCapacityKw),
        maxCapacityKw: Number(data.maxCapacityKw),
        defaultCapacityKw: Number(data.defaultCapacityKw),
        basePrice: Number(data.basePrice),
        gstRate: Number(data.gstRate),
        bomLines,
      };

      if (mode === 'create') {
        await inventoryApi.createTemplate(payload);
        showToast('✅ Solar package created successfully!');
      } else {
        await inventoryApi.updateTemplate(templateId, payload);
        showToast('✅ Package configuration updated!');
      }

      setPackageEditor(null);
      loadData();
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setPkgSaving(false);
    }
  };

  const handleArchivePackage = async (template) => {
    if (!window.confirm(`Archive package "${template.name}"? It will be hidden from quotes.`)) return;
    try {
      await inventoryApi.updateTemplate(template.id, { isActive: false });
      showToast(`Package "${template.name}" archived.`);
      loadData();
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  // ══════════════════════════════════════════════════════════
  // PRODUCT EDITOR
  // ══════════════════════════════════════════════════════════
  const openCreateProduct = () => {
    setProductEditor({ mode: 'create', data: emptyProductForm() });
  };

  const openEditProduct = (p) => {
    setProductEditor({
      mode: 'edit',
      productId: p.id,
      data: {
        sku: p.sku,
        name: p.name,
        category: p.category,
        description: p.description || '',
        costPrice: Number(p.costPrice || 0),
        salePrice: Number(p.salePrice || 0),
        gstRate: Number(p.gstRate || 12),
        warrantyYears: Number(p.warrantyYears || 0),
        unit: p.unit || 'unit',
        stockQty: Number(p.stockQty || 0),
        reorderLevel: Number(p.reorderLevel || 5),
      },
    });
  };

  const ppf = (field, value) => {
    setProductEditor(prev => ({ ...prev, data: { ...prev.data, [field]: value } }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setProdSaving(true);
    const { data, mode, productId } = productEditor;

    try {
      const payload = {
        sku: data.sku.trim().toUpperCase(),
        name: data.name.trim(),
        category: data.category,
        description: data.description.trim() || null,
        costPrice: Number(data.costPrice),
        salePrice: Number(data.salePrice),
        gstRate: Number(data.gstRate),
        warrantyYears: Number(data.warrantyYears),
        unit: data.unit,
        stockQty: Number(data.stockQty),
        reorderLevel: Number(data.reorderLevel),
      };

      if (mode === 'create') {
        await inventoryApi.createProduct(payload);
        showToast('✅ Component added to catalog!');
      } else {
        await inventoryApi.updateProduct(productId, payload);
        showToast('✅ Component updated!');
      }

      setProductEditor(null);
      loadData();
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setProdSaving(false);
    }
  };

  const handleToggleProductActive = async (p) => {
    try {
      await inventoryApi.updateProduct(p.id, { isActive: !p.isActive });
      showToast(p.isActive ? `"${p.name}" deactivated.` : `"${p.name}" reactivated.`);
      loadData();
    } catch (err) {
      showToast('❌ ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-[#714b67] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-[#714b67]">Loading Solar Package Configurator…</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-14">

      {/* ── Toast ── */}
      {toast.msg && (
        <div className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold animate-bounce-short ${
          toast.type === 'error'
            ? 'bg-rose-900 text-white border-rose-500/40'
            : 'bg-[#241621] text-white border-emerald-500/40'
        }`}>
          {toast.type === 'error'
            ? <AlertCircle className="w-4 h-4 text-rose-300" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.msg}
        </div>
      )}

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#241621] via-[#4c3145] to-[#714b67] p-7 text-white shadow-xl border border-white/10">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f09e38]/20 text-[#f09e38] text-xs font-black border border-[#f09e38]/30">
              <Sliders className="w-3.5 h-3.5" /> Technical Configuration Engine
            </div>
            <h1 className="text-2xl font-black tracking-tight">Solar Package &amp; Pricing Configurator</h1>
            <p className="text-xs text-[#dabed3] max-w-xl">
              Create and edit solar packages, assign hardware BOM line-by-line, manage component catalog with live price &amp; margin tracking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={openCreatePackage}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-[#241621] rounded-xl text-xs font-black shadow-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Solar Package
            </button>
            <button
              onClick={openCreateProduct}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition cursor-pointer"
            >
              <Package className="w-4 h-4 text-[#f09e38]" /> Add Component
            </button>
            <button
              onClick={loadData}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#f09e38]/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ── KPI Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Packages', value: templates.length, sub: 'Active templates', color: 'text-[#714b67]' },
          { label: 'PV Panels', value: products.filter(p => p.category === 'PANEL').length + ' models', sub: 'Solar modules', color: 'text-[#f09e38]' },
          { label: 'Inverters', value: products.filter(p => p.category === 'INVERTER').length + ' types', sub: 'Grid / Off-grid', color: 'text-purple-700' },
          { label: 'Battery Banks', value: products.filter(p => p.category === 'BATTERY').length + ' storage', sub: 'Lithium / Tubular', color: 'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="p-4 rounded-2xl bg-white border border-[#EBDCE7] shadow-sm">
            <span className="text-[11px] font-bold text-[#714b67] uppercase tracking-wider">{k.label}</span>
            <p className={`text-2xl font-black mt-1 ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Tab Nav ── */}
      <div className="flex border-b border-[#EBDCE7] gap-6 text-xs font-bold">
        {[
          { key: 'packages', icon: <Layers className="w-4 h-4" />, label: `Solar Packages & BOM (${templates.length})` },
          { key: 'components', icon: <DollarSign className="w-4 h-4" />, label: `Component Catalog (${products.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === tab.key
                ? 'border-[#714b67] text-[#714b67] font-black'
                : 'border-transparent text-slate-500 hover:text-[#714b67]'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          TAB: PACKAGES
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          {/* type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-[#241621]">System Type:</span>
            <div className="flex p-1 rounded-xl bg-white border border-[#EBDCE7] gap-0.5">
              {['ALL', 'ON_GRID', 'OFF_GRID', 'HYBRID', 'COMMERCIAL'].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    filterType === t ? 'bg-[#714b67] text-white shadow-sm' : 'text-slate-600 hover:text-[#714b67]'
                  }`}
                >
                  {t === 'ALL' ? 'All' : t.replace('_', '-')}
                </button>
              ))}
            </div>
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm">
              No packages found. Click <strong>New Solar Package</strong> to create one.
            </div>
          )}

          {/* Package cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTemplates.map(template => {
              const dKw = Number(template.defaultCapacityKw || 3);
              let hwCost = 0;
              (template.bomLines || []).forEach(l => {
                const cost = Number(l.product?.costPrice || 0);
                hwCost += cost * (Number(l.quantityPerKw || 0) * dKw + Number(l.fixedQuantity || 0));
              });
              const base = Number(template.basePrice || 0);
              const gst = base * (Number(template.gstRate || 12) / 100);
              const margin = base > 0 ? (((base - hwCost) / base) * 100).toFixed(1) : 0;
              const isExpanded = expandedCard === template.id;

              return (
                <div key={template.id} className="rounded-3xl bg-white border border-[#EBDCE7] shadow-sm hover:shadow-md transition-shadow">
                  {/* card header */}
                  <div className="p-5 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-black text-[#241621] truncate">{template.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          template.type === 'OFF_GRID' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          template.type === 'HYBRID'   ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                          template.type === 'COMMERCIAL' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          'bg-[#F5EDF3] text-[#714b67] border border-[#EBDCE7]'
                        }`}>
                          {template.type.replace('_', '-')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {template.minCapacityKw} – {template.maxCapacityKw} kW &nbsp;·&nbsp; Default: {template.defaultCapacityKw} kW &nbsp;·&nbsp; {(template.bomLines || []).length} BOM lines
                      </p>
                      {template.description && (
                        <p className="text-[11px] text-slate-600 mt-1 italic line-clamp-1">{template.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openEditPackage(template)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FAF6F9] hover:bg-[#714b67] text-[#714b67] hover:text-white border border-[#EBDCE7] rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setExpandedCard(isExpanded ? null : template.id)}
                        className="p-1.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] hover:bg-slate-100 text-slate-500 transition cursor-pointer"
                        title={isExpanded ? 'Collapse' : 'View BOM'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* pricing strip */}
                  <div className="mx-5 mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-[#FAF6F9] to-white border border-[#EBDCE7] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Base Price (excl. GST)</span>
                      <span className="text-lg font-black text-[#714b67]">₹{fmt(base)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">GST ({template.gstRate || 12}%)</span>
                      <span className="font-bold text-slate-600">₹{fmt(gst)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total (incl. GST)</span>
                      <span className="font-black text-[#241621]">₹{fmt(base + gst)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">BOM Cost / Margin</span>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="font-mono text-slate-600">₹{fmt(hwCost)}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono ${
                          margin >= 30 ? 'bg-emerald-100 text-emerald-800' :
                          margin >= 15 ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>{margin}%</span>
                      </div>
                    </div>
                  </div>

                  {/* expandable BOM preview */}
                  {isExpanded && (
                    <div className="mx-5 mb-5 rounded-2xl border border-[#EBDCE7] overflow-hidden text-xs">
                      <div className="bg-[#FAF6F9] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-[#714b67] border-b border-[#EBDCE7] flex justify-between items-center">
                        <span>Bill of Materials ({dKw} kW base)</span>
                        <button
                          onClick={() => handleArchivePackage(template)}
                          className="flex items-center gap-1 text-rose-500 hover:text-rose-700 font-bold text-[10px] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Archive Package
                        </button>
                      </div>
                      {(template.bomLines || []).length === 0 ? (
                        <p className="px-4 py-3 text-slate-400 italic">No BOM lines — click Edit to add components.</p>
                      ) : (
                        <table className="w-full">
                          <thead>
                            <tr className="text-[10px] text-slate-500 border-b border-[#EBDCE7]">
                              <th className="text-left px-4 py-2">Component</th>
                              <th className="text-left px-4 py-2">Category</th>
                              <th className="text-center px-4 py-2">Qty</th>
                              <th className="text-right px-4 py-2">Unit Cost</th>
                              <th className="text-right px-4 py-2">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#EBDCE7]">
                            {(template.bomLines || []).map((line, i) => {
                              const qty = Number(line.quantityPerKw || 0) > 0
                                ? Number(line.quantityPerKw) * dKw
                                : Number(line.fixedQuantity || 0);
                              const unitCost = Number(line.product?.costPrice || 0);
                              return (
                                <tr key={line.id || i} className="hover:bg-[#FAF6F9]/50">
                                  <td className="px-4 py-2.5">
                                    <span className="font-bold text-[#241621]">{line.product?.name || '—'}</span>
                                    {line.notes && <span className="block text-[10px] text-slate-400">{line.notes}</span>}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CAT_COLOR[line.product?.category] || 'bg-gray-100 text-gray-600'}`}>
                                      {line.product?.category || '—'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-center font-mono">
                                    {qty}
                                    <span className="text-slate-400 text-[10px] ml-1">
                                      {Number(line.quantityPerKw || 0) > 0 ? `(${line.quantityPerKw}/kW)` : 'fixed'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-mono text-slate-600">₹{fmt(unitCost)}</td>
                                  <td className="px-4 py-2.5 text-right font-mono font-bold text-[#241621]">₹{fmt(unitCost * qty)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: COMPONENTS
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'components' && (
        <div className="space-y-4">
          {/* filter bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EBDCE7]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#241621]">Category:</span>
              {['ALL', ...PRODUCT_CATEGORIES.map(c => c.value)].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCatFilter(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    catFilter === cat
                      ? 'bg-[#714b67] text-white'
                      : 'bg-[#FAF6F9] text-slate-600 hover:text-[#714b67] border border-[#EBDCE7]'
                  }`}
                >
                  {cat === 'ALL' ? 'All' : cat}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search SKU or name…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] text-xs outline-none focus:ring-1 focus:ring-[#714b67]"
                />
              </div>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  showInactive ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-[#FAF6F9] text-slate-600 border-[#EBDCE7]'
                }`}
              >
                {showInactive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                Inactive
              </button>
            </div>
          </div>

          {/* products table */}
          <div className="bg-white rounded-3xl border border-[#EBDCE7] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF6F9] text-[#714b67] font-black uppercase text-[10px] border-b border-[#EBDCE7]">
                  <tr>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Component Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Cost (₹)</th>
                    <th className="py-3 px-4 text-right">Sale (₹)</th>
                    <th className="py-3 px-4 text-right">Margin</th>
                    <th className="py-3 px-4 text-center">GST %</th>
                    <th className="py-3 px-4 text-center">Warranty</th>
                    <th className="py-3 px-4 text-center">Stock</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBDCE7] text-slate-700">
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-10 text-center text-slate-400 italic">
                        No components match your filter.
                      </td>
                    </tr>
                  )}
                  {filteredProducts.map(p => {
                    const cost = Number(p.costPrice || 0);
                    const sale = Number(p.salePrice || 0);
                    const margin = sale > 0 ? (((sale - cost) / sale) * 100).toFixed(1) : 0;
                    const lowStock = Number(p.stockQty) <= Number(p.reorderLevel);

                    return (
                      <tr key={p.id} className={`hover:bg-[#FAF6F9]/60 transition ${!p.isActive ? 'opacity-50' : ''}`}>
                        <td className="py-3 px-4 font-mono font-bold text-[#714b67] whitespace-nowrap">{p.sku}</td>
                        <td className="py-3 px-4 font-semibold text-[#241621] max-w-[200px]">
                          <span className="line-clamp-2">{p.name}</span>
                          {p.description && (
                            <span className="block text-[10px] text-slate-400 line-clamp-1">{p.description}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${CAT_COLOR[p.category] || 'bg-gray-100 text-gray-600'}`}>
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">₹{fmt(cost)}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#241621]">₹{fmt(sale)}</td>
                        <td className="py-3 px-4 text-right">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono ${
                            margin >= 30 ? 'bg-emerald-100 text-emerald-800' :
                            margin >= 15 ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>{margin}%</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-600">{p.gstRate ?? 12}%</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-600">
                          {p.warrantyYears ? `${p.warrantyYears} yr` : '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`font-mono font-bold ${lowStock ? 'text-rose-600' : 'text-slate-700'}`}>
                            {p.stockQty ?? 0}
                            {lowStock && <span className="ml-1 text-[9px] text-rose-500">LOW</span>}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            p.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {p.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditProduct(p)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#FAF6F9] hover:bg-[#714b67] text-[#714b67] hover:text-white border border-[#EBDCE7] rounded-lg text-[10px] font-bold transition cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button
                              onClick={() => handleToggleProductActive(p)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                                p.isActive
                                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                              }`}
                            >
                              {p.isActive ? <><ToggleRight className="w-3 h-3" /> Deactivate</> : <><ToggleLeft className="w-3 h-3" /> Activate</>}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: PACKAGE EDITOR (Create / Edit)
      ══════════════════════════════════════════════════════ */}
      {packageEditor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#22151F]/75 backdrop-blur-sm p-4 pt-8 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-[#EBDCE7] text-xs mb-8">
            {/* modal header */}
            <div className="flex items-center justify-between p-5 border-b border-[#EBDCE7]">
              <div>
                <h2 className="text-base font-black text-[#241621]">
                  {packageEditor.mode === 'create' ? '✨ Create New Solar Package' : `✏️ Edit Package: ${packageEditor.data.name}`}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure package info, BOM components, and pricing. All changes save to database.
                </p>
              </div>
              <button onClick={() => setPackageEditor(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="p-5 space-y-5">

              {/* Section 1: Basic Info */}
              <section className="space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-[#714b67]">📋 Package Information</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold text-[#241621] block mb-1">Package Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 5 kW On-Grid Residential Solar"
                      value={packageEditor.data.name}
                      onChange={e => pf('name', e.target.value)}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold text-[#241621] block mb-1">System Type *</label>
                    <select
                      value={packageEditor.data.type}
                      onChange={e => pf('type', e.target.value)}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                    >
                      {PACKAGE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Describe this package for the sales team and customers…"
                    value={packageEditor.data.description}
                    onChange={e => pf('description', e.target.value)}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-medium text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67] resize-none"
                  />
                </div>
              </section>

              {/* Section 2: Capacity & Pricing */}
              <section className="space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-[#714b67]">💰 Capacity &amp; Pricing</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-extrabold text-[#241621] block mb-1">Min Capacity (kW)</label>
                    <input type="number" step="0.5" min="0.5"
                      value={packageEditor.data.minCapacityKw}
                      onChange={e => pf('minCapacityKw', e.target.value)}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold text-[#241621] block mb-1">Default / Base (kW)</label>
                    <input type="number" step="0.5" min="0.5"
                      value={packageEditor.data.defaultCapacityKw}
                      onChange={e => pf('defaultCapacityKw', e.target.value)}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold text-[#241621] block mb-1">Max Capacity (kW)</label>
                    <input type="number" step="0.5" min="0.5"
                      value={packageEditor.data.maxCapacityKw}
                      onChange={e => pf('maxCapacityKw', e.target.value)}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold text-[#241621] block mb-1">Base Selling Price (₹, excl. GST) *</label>
                    <input type="number" required min="0"
                      placeholder="e.g. 195000"
                      value={packageEditor.data.basePrice}
                      onChange={e => pf('basePrice', e.target.value)}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-black text-sm text-[#714b67] bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                    />
                  </div>
                  <div>
                    <label className="font-extrabold text-[#241621] block mb-1">GST Rate (%)</label>
                    <select
                      value={packageEditor.data.gstRate}
                      onChange={e => pf('gstRate', e.target.value)}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                    >
                      {[0, 5, 12, 18, 28].map(r => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* live pricing preview */}
                {(() => {
                  const base = Number(packageEditor.data.basePrice || 0);
                  const gst = base * (Number(packageEditor.data.gstRate || 12) / 100);
                  const dKw = Number(packageEditor.data.defaultCapacityKw || 3);
                  const hwCost = calcBomCost(packageEditor.data.bomLines, dKw);
                  const profit = Math.max(0, base - hwCost);
                  const margin = base > 0 ? ((profit / base) * 100).toFixed(1) : 0;
                  return (
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#241621] to-[#3a2534] text-white flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">BOM Hardware Cost ({dKw} kW)</span>
                        <span className="font-bold text-amber-400">₹{fmt(hwCost)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Base Price</span>
                        <span className="font-bold text-white">₹{fmt(base)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">GST ({packageEditor.data.gstRate}%)</span>
                        <span className="font-bold text-blue-300">₹{fmt(gst)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Total Incl. GST</span>
                        <span className="font-bold text-white">₹{fmt(base + gst)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Gross Profit / Margin</span>
                        <span className="font-bold text-emerald-400">₹{fmt(profit)} ({margin}%)</span>
                      </div>
                    </div>
                  );
                })()}
              </section>

              {/* Section 3: BOM Lines */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-[#714b67]">🔩 Bill of Materials (BOM Lines)</h3>
                  <button
                    type="button"
                    onClick={addBomLine}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f09e38] hover:opacity-90 text-[#241621] rounded-xl text-xs font-black shadow transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                {packageEditor.data.bomLines.length === 0 && (
                  <div className="p-4 rounded-2xl bg-[#FAF6F9] border border-dashed border-[#EBDCE7] text-center text-slate-400 text-xs">
                    No BOM lines yet. Click <strong>Add Line</strong> to assign hardware components.
                  </div>
                )}

                <div className="space-y-2">
                  {packageEditor.data.bomLines.map((line, idx) => {
                    const selProd = products.find(p => p.id === line.productId);
                    const qty = line.qtyMode === 'perKw'
                      ? Number(line.quantityPerKw || 0) * Number(packageEditor.data.defaultCapacityKw || 3)
                      : Number(line.fixedQuantity || 0);
                    const lineCost = qty * Number(selProd?.costPrice || 0);

                    return (
                      <div key={line._key} className="p-3 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-2">
                        <div className="grid grid-cols-12 gap-2 items-end">
                          {/* product select */}
                          <div className="col-span-5">
                            {idx === 0 && <label className="text-[10px] font-bold text-slate-500 block mb-1">Component *</label>}
                            <select
                              value={line.productId}
                              onChange={e => updateBomLine(line._key, 'productId', e.target.value)}
                              className="w-full border border-[#EBDCE7] rounded-xl p-2 font-bold text-xs bg-white focus:ring-1 focus:ring-[#714b67] outline-none"
                            >
                              <option value="">— Select Component —</option>
                              {PRODUCT_CATEGORIES.map(cat => {
                                const catProds = products.filter(p => p.category === cat.value && p.isActive);
                                if (catProds.length === 0) return null;
                                return (
                                  <optgroup key={cat.value} label={cat.label}>
                                    {catProds.map(p => (
                                      <option key={p.id} value={p.id}>
                                        {p.sku} – {p.name} (₹{fmt(p.costPrice)})
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              })}
                            </select>
                          </div>

                          {/* qty mode toggle */}
                          <div className="col-span-2">
                            {idx === 0 && <label className="text-[10px] font-bold text-slate-500 block mb-1">Qty Type</label>}
                            <select
                              value={line.qtyMode}
                              onChange={e => updateBomLine(line._key, 'qtyMode', e.target.value)}
                              className="w-full border border-[#EBDCE7] rounded-xl p-2 font-bold text-xs bg-white focus:ring-1 focus:ring-[#714b67] outline-none"
                            >
                              <option value="fixed">Fixed Qty</option>
                              <option value="perKw">Per kW</option>
                            </select>
                          </div>

                          {/* qty value */}
                          <div className="col-span-2">
                            {idx === 0 && <label className="text-[10px] font-bold text-slate-500 block mb-1">
                              {line.qtyMode === 'perKw' ? 'Qty / kW' : 'Fixed Qty'}
                            </label>}
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              value={line.qtyMode === 'perKw' ? line.quantityPerKw : line.fixedQuantity}
                              onChange={e => updateBomLine(
                                line._key,
                                line.qtyMode === 'perKw' ? 'quantityPerKw' : 'fixedQuantity',
                                e.target.value
                              )}
                              className="w-full border border-[#EBDCE7] rounded-xl p-2 font-bold text-xs bg-white text-center focus:ring-1 focus:ring-[#714b67] outline-none"
                            />
                          </div>

                          {/* line cost preview */}
                          <div className="col-span-2">
                            {idx === 0 && <label className="text-[10px] font-bold text-slate-500 block mb-1">Line Cost</label>}
                            <div className="p-2 rounded-xl bg-white border border-[#EBDCE7] text-center font-mono font-bold text-[#714b67]">
                              ₹{fmt(lineCost)}
                            </div>
                          </div>

                          {/* actions */}
                          <div className="col-span-1 flex flex-col gap-1 items-center">
                            {idx === 0 && <div className="text-[10px] text-transparent select-none mb-1">·</div>}
                            <button
                              type="button"
                              onClick={() => moveBomLine(line._key, -1)}
                              disabled={idx === 0}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                            ><ArrowUp className="w-3.5 h-3.5" /></button>
                            <button
                              type="button"
                              onClick={() => moveBomLine(line._key, 1)}
                              disabled={idx === packageEditor.data.bomLines.length - 1}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 disabled:opacity-20 cursor-pointer"
                            ><ArrowDown className="w-3.5 h-3.5" /></button>
                            <button
                              type="button"
                              onClick={() => removeBomLine(line._key)}
                              className="p-1 rounded-lg text-rose-400 hover:text-rose-600 cursor-pointer"
                            ><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>

                        {/* notes + category badge row */}
                        <div className="flex items-center gap-2">
                          {selProd && (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${CAT_COLOR[selProd.category] || ''}`}>
                              {selProd.category}
                            </span>
                          )}
                          <input
                            type="text"
                            placeholder="Notes (optional)"
                            value={line.notes}
                            onChange={e => updateBomLine(line._key, 'notes', e.target.value)}
                            className="flex-1 border border-[#EBDCE7] rounded-xl px-2.5 py-1.5 text-[10px] font-medium bg-white focus:ring-1 focus:ring-[#714b67] outline-none"
                          />
                          {selProd && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Unit cost: ₹{fmt(selProd.costPrice)} &nbsp;·&nbsp; Total qty: {qty}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Save buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setPackageEditor(null)}
                  className="px-5 py-2.5 border border-[#EBDCE7] rounded-xl text-xs font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pkgSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#714b67] to-[#8a5d7e] hover:opacity-95 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {pkgSaving ? 'Saving…' : packageEditor.mode === 'create' ? 'Create Package' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL: PRODUCT EDITOR (Create / Edit)
      ══════════════════════════════════════════════════════ */}
      {productEditor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-[#22151F]/75 backdrop-blur-sm p-4 pt-8 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#EBDCE7] text-xs mb-8">
            <div className="flex items-center justify-between p-5 border-b border-[#EBDCE7]">
              <div>
                <h2 className="text-base font-black text-[#241621]">
                  {productEditor.mode === 'create' ? '➕ Add Solar Hardware Component' : `✏️ Edit: ${productEditor.data.name}`}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {productEditor.mode === 'create'
                    ? 'Register new panel, battery, inverter or accessory in the component catalog.'
                    : 'Update component details, pricing and stock levels.'}
                </p>
              </div>
              <button onClick={() => setProductEditor(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BAT-LITHO-100AH"
                    value={productEditor.data.sku}
                    onChange={e => ppf('sku', e.target.value)}
                    disabled={productEditor.mode === 'edit'}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-mono font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67] disabled:opacity-60"
                  />
                  {productEditor.mode === 'edit' && (
                    <p className="text-[10px] text-slate-400 mt-0.5">SKU cannot be changed after creation.</p>
                  )}
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Category *</label>
                  <select
                    value={productEditor.data.category}
                    onChange={e => ppf('category', e.target.value)}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                  >
                    {PRODUCT_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Component Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Waaree 540W Bifacial N-Type Solar Module"
                  value={productEditor.data.name}
                  onChange={e => ppf('name', e.target.value)}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Technical specs, model notes, capacity, etc."
                  value={productEditor.data.description}
                  onChange={e => ppf('description', e.target.value)}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-medium text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Cost Price (₹) *</label>
                  <input
                    type="number"
                    required min="0"
                    placeholder="e.g. 12000"
                    value={productEditor.data.costPrice}
                    onChange={e => ppf('costPrice', e.target.value)}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Sale Price (₹) *</label>
                  <input
                    type="number"
                    required min="0"
                    placeholder="e.g. 16000"
                    value={productEditor.data.salePrice}
                    onChange={e => ppf('salePrice', e.target.value)}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-black text-sm text-[#714b67] bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                  />
                </div>
              </div>

              {/* margin preview */}
              {(() => {
                const cost = Number(productEditor.data.costPrice || 0);
                const sale = Number(productEditor.data.salePrice || 0);
                const margin = sale > 0 ? (((sale - cost) / sale) * 100).toFixed(1) : 0;
                return (
                  <div className="p-3 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] flex items-center justify-between font-mono">
                    <span className="text-slate-600 font-bold">Unit Margin</span>
                    <span className={`font-black ${Number(margin) >= 20 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      ₹{fmt(sale - cost)} &nbsp;({margin}%)
                    </span>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">GST Rate (%)</label>
                  <select
                    value={productEditor.data.gstRate}
                    onChange={e => ppf('gstRate', e.target.value)}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                  >
                    {[0, 5, 12, 18, 28].map(r => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Warranty (Years)</label>
                  <input
                    type="number" min="0"
                    value={productEditor.data.warrantyYears}
                    onChange={e => ppf('warrantyYears', e.target.value)}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Unit of Measure</label>
                  <select
                    value={productEditor.data.unit}
                    onChange={e => ppf('unit', e.target.value)}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                  >
                    {['unit', 'set', 'metre', 'kg', 'lot'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Current Stock Qty</label>
                  <input
                    type="number" min="0"
                    value={productEditor.data.stockQty}
                    onChange={e => ppf('stockQty', e.target.value)}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Reorder Level</label>
                  <input
                    type="number" min="0"
                    value={productEditor.data.reorderLevel}
                    onChange={e => ppf('reorderLevel', e.target.value)}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setProductEditor(null)}
                  className="px-5 py-2.5 border border-[#EBDCE7] rounded-xl text-xs font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={prodSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-[#241621] rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {prodSaving ? 'Saving…' : productEditor.mode === 'create' ? 'Add Component' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
