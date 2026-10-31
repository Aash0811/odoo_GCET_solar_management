import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import useDebounce from '../../hooks/useDebounce';
import Pagination from '../../components/common/Pagination';
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
  Shield,
  ShieldCheck,
  Lock,
  Clock,
  QrCode,
  Tag,
  Wand2,
  Sparkles,
  ArrowRight,
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

const PRODUCT_TYPES = [
  { value: 'HARDWARE', label: 'Hardware', color: 'bg-blue-100 text-blue-800' },
  { value: 'SERVICE',  label: 'Service',  color: 'bg-purple-100 text-purple-800' },
  { value: 'PACKAGE',  label: 'Package (Kit)', color: 'bg-amber-100 text-amber-800' },
];

const PRODUCT_CATEGORIES = [
  { value: 'PANEL',     label: 'Solar PV Panel',       color: 'bg-amber-100 text-amber-800' },
  { value: 'INVERTER',  label: 'Inverter',             color: 'bg-purple-100 text-purple-800' },
  { value: 'BATTERY',   label: 'Battery Storage',      color: 'bg-emerald-100 text-emerald-800' },
  { value: 'STRUCTURE', label: 'Mounting Structure',   color: 'bg-blue-100 text-blue-800' },
  { value: 'CABLE',     label: 'Cables & Wiring',      color: 'bg-slate-100 text-slate-700' },
  { value: 'MCBFUSE',   label: 'MCB / ACDB / DCDB',   color: 'bg-rose-100 text-rose-800' },
  { value: 'EARTHING',  label: 'Earthing & Lightning', color: 'bg-teal-100 text-teal-800' },
  { value: 'SERVICE',   label: 'Installation & Labour', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'MISC',      label: 'Misc Hardware',        color: 'bg-gray-100 text-gray-700' },
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
  minCapacityKw: '',
  maxCapacityKw: '',
  defaultCapacityKw: '',
  basePrice: '',
  gstRate: 12,
  bomLines: [],
});

// Empty product form
const emptyProductForm = () => ({
  sku: '',
  name: '',
  category: 'PANEL',
  productType: 'HARDWARE',
  description: '',
  costPrice: '',
  salePrice: '',
  gstRate: 18,
  warrantyYears: 5,
  isSerialTracked: false,
  laborHours: '',
  isSubsidyEligible: true,
  unit: 'unit',
  stockQty: 0,
  reorderLevel: 5,
});

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────
export default function SolarPackageConfiguratorPage() {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === 'ADMIN';
  const isSalesman = role === 'SALESMAN' || isAdmin;

  const [activeTab, setActiveTab]           = useState('packages');
  const [loading, setLoading]               = useState(true);
  const [templates, setTemplates]           = useState([]);
  const [products, setProducts]             = useState([]);
  const [toast, setToast]                   = useState({ msg: '', type: 'success' });

  // Dynamic capacity supply limits state (Admin controls)
  const [capacitySettings, setCapacitySettings] = useState(null);
  const [typeCapacityLimits, setTypeCapacityLimits] = useState({
    ON_GRID: { minKw: '', maxKw: '', defaultKw: '' },
    OFF_GRID: { minKw: '', maxKw: '', defaultKw: '' },
    HYBRID: { minKw: '', maxKw: '', defaultKw: '' },
    COMMERCIAL: { minKw: '', maxKw: '', defaultKw: '' },
  });
  const [packageCapacityRows, setPackageCapacityRows] = useState({});
  const [savingCapacity, setSavingCapacity] = useState(false);

  // Package state
  const [filterType, setFilterType]         = useState('ALL');
  const [expandedCard, setExpandedCard]     = useState(null);
  const [packageEditor, setPackageEditor]   = useState(null);  // null | { mode:'create'|'edit', data:... }
  const [pkgSaving, setPkgSaving]           = useState(false);

  // Product / component state
  const [catFilter, setCatFilter]           = useState('ALL');
  const [searchQuery, setSearchQuery]       = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [productPage, setProductPage]       = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);
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
      const [tRes, pRes, capRes] = await Promise.all([
        inventoryApi.getTemplates(),
        inventoryApi.getProducts(),
        inventoryApi.getCapacitySettings().catch(() => ({ data: { data: null } })),
      ]);
      const loadedTemplates = tRes.data?.data || [];
      setTemplates(loadedTemplates);
      setProducts(pRes.data?.data || []);

      const capData = capRes.data?.data;
      if (capData) {
        setCapacitySettings(capData);
        if (capData.byType) {
          const newTypeLimits = {};
          ['ON_GRID', 'OFF_GRID', 'HYBRID', 'COMMERCIAL'].forEach((t) => {
            if (capData.byType[t]) {
              newTypeLimits[t] = {
                minKw: capData.byType[t].minKw ?? '',
                maxKw: capData.byType[t].maxKw ?? '',
                defaultKw: capData.byType[t].defaultKw ?? '',
              };
            }
          });
          setTypeCapacityLimits((prev) => ({ ...prev, ...newTypeLimits }));
        }
      }

      // Initialize package capacity rows
      const pkgRows = {};
      loadedTemplates.forEach((t) => {
        pkgRows[t.id] = {
          minCapacityKw: t.minCapacityKw ?? '',
          maxCapacityKw: t.maxCapacityKw ?? '',
          defaultCapacityKw: t.defaultCapacityKw ?? '',
        };
      });
      setPackageCapacityRows(pkgRows);
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
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });

  useEffect(() => {
    setProductPage(1);
  }, [debouncedSearch, catFilter, showInactive]);

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
  // DYNAMIC CAPACITY LIMITS (ADMIN SUPPLY CONTROL)
  // ══════════════════════════════════════════════════════════
  const handleTypeLimitChange = (type, field, val) => {
    setTypeCapacityLimits((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: val === '' ? '' : Number(val),
      },
    }));
  };

  const handleSaveTypeCapacity = async (type) => {
    try {
      setSavingCapacity(true);
      const conf = typeCapacityLimits[type];
      if (!conf) return;
      if (Number(conf.minKw) > Number(conf.maxKw)) {
        showToast(`Minimum kW (${conf.minKw}) cannot exceed Maximum kW (${conf.maxKw})!`, 'error');
        return;
      }

      await inventoryApi.updateCapacitySettings({
        typeLimits: [
          {
            type,
            minCapacityKw: Number(conf.minKw),
            maxCapacityKw: Number(conf.maxKw),
            defaultCapacityKw: Number(conf.defaultKw),
          },
        ],
      });

      showToast(`✅ Fixed supply limits for all ${type.replace('_', '-')} systems (${conf.minKw} kW – ${conf.maxKw} kW)!`);
      await loadData();
    } catch (err) {
      showToast('❌ Failed to update supply capacity: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSavingCapacity(false);
    }
  };

  const handlePackageLimitChange = (pkgId, field, val) => {
    setPackageCapacityRows((prev) => ({
      ...prev,
      [pkgId]: {
        ...prev[pkgId],
        [field]: val === '' ? '' : Number(val),
      },
    }));
  };

  const handleSavePackageCapacity = async (pkgId) => {
    try {
      setSavingCapacity(true);
      const conf = packageCapacityRows[pkgId];
      if (!conf) return;
      if (Number(conf.minCapacityKw) > Number(conf.maxCapacityKw)) {
        showToast('Minimum kW cannot exceed Maximum kW!', 'error');
        return;
      }

      await inventoryApi.updateCapacitySettings({
        packageLimits: [
          {
            id: pkgId,
            minCapacityKw: Number(conf.minCapacityKw),
            maxCapacityKw: Number(conf.maxCapacityKw),
            defaultCapacityKw: Number(conf.defaultCapacityKw),
          },
        ],
      });

      showToast('✅ Package supply capacity updated!');
      await loadData();
    } catch (err) {
      showToast('❌ Failed to update package capacity: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSavingCapacity(false);
    }
  };

  const handleBatchSaveAllPackageCapacities = async () => {
    try {
      setSavingCapacity(true);
      const packageLimits = Object.entries(packageCapacityRows).map(([id, conf]) => ({
        id,
        minCapacityKw: Number(conf.minCapacityKw),
        maxCapacityKw: Number(conf.maxCapacityKw),
        defaultCapacityKw: Number(conf.defaultCapacityKw),
      }));

      for (const pl of packageLimits) {
        if (pl.minCapacityKw > pl.maxCapacityKw) {
          showToast(`Invalid limits: Min kW cannot exceed Max kW.`, 'error');
          return;
        }
      }

      await inventoryApi.updateCapacitySettings({ packageLimits });
      showToast('✅ All package supply capacity limits saved and enforced across system!');
      await loadData();
    } catch (err) {
      showToast('❌ Failed to batch save capacities: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSavingCapacity(false);
    }
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
        minCapacityKw: template.minCapacityKw,
        maxCapacityKw: template.maxCapacityKw,
        defaultCapacityKw: template.defaultCapacityKw,
        basePrice: Number(template.basePrice || 0),
        gstRate: Number(template.gstRate || 12),
        bomLines,
      },
    });
  };

  // Salesman package customizer
  const openCustomizePackage = (template) => {
    const bomLines = (template.bomLines || []).map(l => ({
      _key: Math.random().toString(36).slice(2),
      productId: l.productId,
      quantityPerKw: Number(l.quantityPerKw || 0),
      fixedQuantity: Number(l.fixedQuantity || 0),
      qtyMode: Number(l.quantityPerKw || 0) > 0 ? 'perKw' : 'fixed',
      notes: l.notes || '',
    }));

    setPackageEditor({
      mode: 'customize',
      sourceTemplateId: template.id,
      data: {
        name: `Custom - ${template.name}`,
        description: `Customized proposal package tailored by ${user?.name || 'Sales Representative'}.`,
        type: template.type,
        minCapacityKw: template.minCapacityKw,
        maxCapacityKw: template.maxCapacityKw,
        defaultCapacityKw: template.defaultCapacityKw,
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
      const minCapacityKw = Number(data.minCapacityKw);
      const maxCapacityKw = Number(data.maxCapacityKw);
      const defaultCapacityKw = Number(data.defaultCapacityKw);
      if (
        !Number.isFinite(minCapacityKw) ||
        !Number.isFinite(maxCapacityKw) ||
        !Number.isFinite(defaultCapacityKw) ||
        minCapacityKw <= 0 ||
        maxCapacityKw < minCapacityKw ||
        defaultCapacityKw < minCapacityKw ||
        defaultCapacityKw > maxCapacityKw
      ) {
        throw new Error('Set valid positive capacity limits: minimum <= default <= maximum.');
      }
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
        minCapacityKw,
        maxCapacityKw,
        defaultCapacityKw,
        basePrice: Number(data.basePrice),
        gstRate: Number(data.gstRate),
        bomLines,
      };

      if (mode === 'create' || mode === 'customize') {
        const res = await inventoryApi.createTemplate(payload);
        showToast(mode === 'customize' ? '✨ Custom solar package saved to catalogue!' : '✅ Solar package created successfully!');
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

  const handleSaveAndQuote = async (e) => {
    if (e) e.preventDefault();
    setPkgSaving(true);
    const { data } = packageEditor;

    try {
      const minCapacityKw = Number(data.minCapacityKw);
      const maxCapacityKw = Number(data.maxCapacityKw);
      const defaultCapacityKw = Number(data.defaultCapacityKw);
      if (
        !Number.isFinite(minCapacityKw) ||
        !Number.isFinite(maxCapacityKw) ||
        !Number.isFinite(defaultCapacityKw) ||
        minCapacityKw <= 0 ||
        maxCapacityKw < minCapacityKw ||
        defaultCapacityKw < minCapacityKw ||
        defaultCapacityKw > maxCapacityKw
      ) {
        throw new Error('Set valid positive capacity limits: minimum <= default <= maximum.');
      }
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
        minCapacityKw,
        maxCapacityKw,
        defaultCapacityKw,
        basePrice: Number(data.basePrice),
        gstRate: Number(data.gstRate),
        bomLines,
      };

      const res = await inventoryApi.createTemplate(payload);
      showToast('🚀 Custom package saved! Opening in Quotation Studio…');
      setPackageEditor(null);
      loadData();
      const created = res.data?.data;
      setTimeout(() => {
        navigate(`/sales/quotes?templateId=${created?.id || ''}&capacity=${data.defaultCapacityKw}`);
      }, 500);
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
        productType: p.productType || (p.category === 'SERVICE' ? 'SERVICE' : 'HARDWARE'),
        description: p.description || '',
        costPrice: Number(p.costPrice || 0),
        salePrice: Number(p.salePrice || 0),
        gstRate: Number(p.gstRate || 18),
        warrantyYears: Number(p.warrantyYears || 0),
        isSerialTracked: Boolean(p.isSerialTracked),
        laborHours: p.laborHours ? Number(p.laborHours) : '',
        isSubsidyEligible: p.isSubsidyEligible !== false,
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
        productType: data.productType || 'HARDWARE',
        description: data.description ? data.description.trim() : null,
        costPrice: Number(data.costPrice),
        salePrice: Number(data.salePrice),
        gstRate: Number(data.gstRate),
        warrantyYears: Number(data.warrantyYears),
        isSerialTracked: Boolean(data.isSerialTracked),
        laborHours: data.laborHours ? Number(data.laborHours) : null,
        isSubsidyEligible: Boolean(data.isSubsidyEligible),
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
            {isAdmin ? (
              <>
                <button
                  onClick={() => setActiveTab('capacity_limits')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-[#f09e38] hover:opacity-95 text-[#241621] rounded-xl text-xs font-black shadow-lg transition cursor-pointer"
                >
                  <Sliders className="w-4 h-4" /> Dynamic Capacity Limits
                </button>
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
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 text-white font-bold text-xs border border-white/20 shadow-xs">
                <Lock className="w-3.5 h-3.5 text-amber-300" /> Read-Only Catalogue (Cost Prices Hidden)
              </span>
            )}
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
          { key: 'capacity_limits', icon: <Sliders className="w-4 h-4 text-[#f09e38]" />, label: '⚡ Dynamic Capacity Limits (Admin Supply Control)' },
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
                        onClick={() => openCustomizePackage(template)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#f09e38] to-[#e08920] hover:opacity-95 text-[#241621] rounded-xl text-xs font-black shadow-sm transition cursor-pointer"
                        title="Salesman Customizer: Customize with your own products & components"
                      >
                        <Wand2 className="w-3.5 h-3.5" /> Customize
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => openEditPackage(template)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FAF6F9] hover:bg-[#714b67] text-[#714b67] hover:text-white border border-[#EBDCE7] rounded-xl text-xs font-bold transition cursor-pointer"
                          title="Edit Master Template"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                      )}
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
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => openCustomizePackage(template)}
                            className="flex items-center gap-1 text-[#f09e38] hover:text-[#d4821a] font-black text-[10px] cursor-pointer"
                            title="Customize this BOM"
                          >
                            <Sliders className="w-3 h-3" /> Customize Products
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleArchivePackage(template)}
                              className="flex items-center gap-1 text-rose-500 hover:text-rose-700 font-bold text-[10px] cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" /> Archive Package
                            </button>
                          )}
                        </div>
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
                    <th className="py-3 px-4">Component / Service Name</th>
                    <th className="py-3 px-4">Type & Category</th>
                    <th className="py-3 px-4 text-center">Tracking & Flags</th>
                    <th className="py-3 px-4 text-center">Warranty</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Cost (₹)</th>}
                    <th className="py-3 px-4 text-right">Sale (₹)</th>
                    {isAdmin && <th className="py-3 px-4 text-right">Margin</th>}
                    <th className="py-3 px-4 text-center">GST %</th>
                    <th className="py-3 px-4 text-center">Stock</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBDCE7] text-slate-700">
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 12 : 9} className="py-10 text-center text-slate-400 italic">
                        No components match your filter.
                      </td>
                    </tr>
                  )}
                  {filteredProducts
                    .slice((productPage - 1) * productPageSize, productPage * productPageSize)
                    .map(p => {
                    const cost = Number(p.costPrice || 0);
                    const sale = Number(p.salePrice || 0);
                    const margin = sale > 0 ? (((sale - cost) / sale) * 100).toFixed(1) : 0;
                    const lowStock = Number(p.stockQty) <= Number(p.reorderLevel);

                    return (
                      <tr key={p.id} className={`hover:bg-[#FAF6F9]/60 transition ${!p.isActive ? 'opacity-50' : ''}`}>
                        <td className="py-3 px-4 font-mono font-bold text-[#714b67] whitespace-nowrap">{p.sku}</td>
                        <td className="py-3 px-4 font-semibold text-[#241621] max-w-[220px]">
                          <span className="line-clamp-2">{p.name}</span>
                          {p.description && (
                            <span className="block text-[10px] text-slate-400 line-clamp-1">{p.description}</span>
                          )}
                          {p.laborHours && (
                            <span className="inline-block mt-0.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              ⏱️ {p.laborHours}h Labor
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              p.productType === 'SERVICE' ? 'bg-purple-100 text-purple-800' :
                              p.productType === 'PACKAGE' ? 'bg-amber-100 text-amber-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {p.productType || 'HARDWARE'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${CAT_COLOR[p.category] || 'bg-gray-100 text-gray-600'}`}>
                              {p.category}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {p.isSerialTracked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200">
                                <QrCode className="w-3 h-3 text-blue-600" /> Serial Tracked
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Qty Only
                              </span>
                            )}
                            {p.isSubsidyEligible && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                PM Surya Ghar
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700">
                          {p.warrantyYears ? (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-black font-mono">
                              {p.warrantyYears} yr
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right font-mono text-slate-600 font-medium">₹{fmt(cost)}</td>
                        )}
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#241621]">₹{fmt(sale)}</td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono ${
                              margin >= 30 ? 'bg-emerald-100 text-emerald-800' :
                              margin >= 15 ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>{margin}%</span>
                          </td>
                        )}
                        <td className="py-3 px-4 text-center font-bold text-slate-600">{p.gstRate ?? 18}%</td>
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
                        {isAdmin && (
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
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#FAF6F9] border-t border-[#EBDCE7]">
              <Pagination
                currentPage={productPage}
                totalItems={filteredProducts.length}
                pageSize={productPageSize}
                onPageChange={setProductPage}
                onPageSizeChange={(newSize) => {
                  setProductPageSize(newSize);
                  setProductPage(1);
                }}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          TAB: DYNAMIC CAPACITY LIMITS (ADMIN SUPPLY CONTROL)
      ══════════════════════════════════════════════════════ */}
      {activeTab === 'capacity_limits' && (
        <div className="space-y-6">
          {/* Top Supply Control Alert & Policy Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-[#241621] via-[#352031] to-[#241621] text-white border border-[#EBDCE7]/20 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-ping" />
                <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#f09e38]" /> Dynamic System Capacity &amp; Supply Limits
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#f09e38]/20 border border-[#f09e38]/40 text-[#f09e38] text-[10px] font-black uppercase tracking-wider">
                  Admin Authority
                </span>
              </div>
              <p className="text-xs text-[#dabed3] max-w-2xl leading-relaxed">
                Fix the permissible minimum kW and maximum kW solar capacity SunPower Solutions can supply and quote.
                These bounds dynamically configure the salesman quote sliders, preset chips, and quotation validation rules across the system.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-white/10 px-4 py-2.5 rounded-2xl border border-white/15 text-center">
                <span className="text-[10px] uppercase font-bold text-[#dabed3] block">Active Supply Range</span>
                <span className="text-lg font-black text-[#f09e38]">
                  {capacitySettings?.overallMinKw ?? 'Not configured'}{capacitySettings?.overallMinKw != null ? ' kW' : ''} – {capacitySettings?.overallMaxKw ?? 'Not configured'}{capacitySettings?.overallMaxKw != null ? ' kW' : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/sales/quotes')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                title="Open Quotation Studio to test salesman perspective"
              >
                <span>Preview in Quote Studio</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#f09e38]" />
              </button>
            </div>
          </div>

          {/* Section 1: Quick Solar Type Policy Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-black text-[#241621] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#f09e38]" /> 1. Supply Policy by Solar System Type
                </h3>
                <p className="text-xs text-slate-500">
                  Quickly set and enforce uniform Min/Max kW bounds for all packages belonging to a specific solar system technology.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                {
                  type: 'ON_GRID',
                  title: 'On-Grid Solar',
                  badge: 'Grid-Tied / PM Surya Ghar',
                  icon: <Sun className="w-5 h-5 text-amber-500" />,
                  desc: 'Residential net-metered systems eligible for subsidy.',
                  color: 'border-amber-200 bg-amber-50/30',
                },
                {
                  type: 'OFF_GRID',
                  title: 'Off-Grid Solar',
                  badge: 'Battery Storage / Remote',
                  icon: <Battery className="w-5 h-5 text-emerald-500" />,
                  desc: 'Standalone systems with battery bank energy storage.',
                  color: 'border-emerald-200 bg-emerald-50/30',
                },
                {
                  type: 'HYBRID',
                  title: 'Hybrid Solar',
                  badge: 'Grid + Emergency Backup',
                  icon: <Zap className="w-5 h-5 text-blue-500" />,
                  desc: 'Dual grid synchronization with lithium battery reserve.',
                  color: 'border-blue-200 bg-blue-50/30',
                },
                {
                  type: 'COMMERCIAL',
                  title: 'Commercial / Industrial',
                  badge: '3-Phase / High Yield',
                  icon: <Sliders className="w-5 h-5 text-purple-500" />,
                  desc: 'High-voltage commercial rooftops, schools & factories.',
                  color: 'border-purple-200 bg-purple-50/30',
                },
              ].map((card) => {
                const conf = typeCapacityLimits[card.type] || { minKw: '', maxKw: '', defaultKw: '' };
                const count = templates.filter((t) => t.type === card.type).length;

                return (
                  <div
                    key={card.type}
                    className={`rounded-3xl border ${card.color} p-5 bg-white shadow-sm flex flex-col justify-between space-y-4`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-white border border-[#EBDCE7] flex items-center justify-center shadow-xs">
                          {card.icon}
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {count} {count === 1 ? 'Package' : 'Packages'}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-[#241621] mt-2.5">{card.title}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">{card.desc}</p>
                    </div>

                    <div className="space-y-3 bg-[#FAF6F9] p-3.5 rounded-2xl border border-[#EBDCE7]/80">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block uppercase">Min Supply (kW)</label>
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="number"
                              min="0.5"
                              max="100"
                              step="0.5"
                              value={conf.minKw}
                              onChange={(e) => handleTypeLimitChange(card.type, 'minKw', e.target.value)}
                              className="w-full p-1.5 rounded-lg border border-[#EBDCE7] bg-white font-black text-center text-xs text-[#241621] outline-none focus:ring-1 focus:ring-[#714b67]"
                            />
                            <span className="text-[10px] font-bold text-slate-400">kW</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block uppercase">Max Supply (kW)</label>
                          <div className="flex items-center gap-1 mt-1">
                            <input
                              type="number"
                              min="1"
                              max="500"
                              step="1"
                              value={conf.maxKw}
                              onChange={(e) => handleTypeLimitChange(card.type, 'maxKw', e.target.value)}
                              className="w-full p-1.5 rounded-lg border border-[#EBDCE7] bg-white font-black text-center text-xs text-[#241621] outline-none focus:ring-1 focus:ring-[#714b67]"
                            />
                            <span className="text-[10px] font-bold text-slate-400">kW</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block uppercase">Default Recommended (kW)</label>
                        <div className="flex items-center gap-1 mt-1">
                          <input
                            type="number"
                            min={conf.minKw}
                            max={conf.maxKw}
                            step="0.5"
                            value={conf.defaultKw}
                            onChange={(e) => handleTypeLimitChange(card.type, 'defaultKw', e.target.value)}
                            className="w-full p-1.5 rounded-lg border border-[#EBDCE7] bg-white font-bold text-center text-xs text-[#714b67] outline-none focus:ring-1 focus:ring-[#714b67]"
                          />
                          <span className="text-[10px] font-bold text-slate-400">kW</span>
                        </div>
                      </div>

                      {/* Visual supply span bar */}
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1">
                          <span>Span: {conf.minKw} kW</span>
                          <span className="text-[#714b67] font-black">{conf.maxKw} kW</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-[#714b67] rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, Math.max(10, ((conf.maxKw - conf.minKw) / (conf.maxKw || 1)) * 100))}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={savingCapacity}
                      onClick={() => handleSaveTypeCapacity(card.type)}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#714b67] to-[#855278] hover:opacity-95 text-white text-xs font-black shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5 text-[#f09e38]" />
                      <span>Enforce for {card.title}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Granular Package Supply Limits Matrix */}
          <div className="p-6 rounded-3xl bg-white border border-[#EBDCE7] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-sm font-black text-[#241621] flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#714b67]" /> 2. Granular Package Capacity Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Override and fine-tune allowable supply kW bounds on each individual package template.
                </p>
              </div>

              <button
                type="button"
                disabled={savingCapacity || templates.length === 0}
                onClick={handleBatchSaveAllPackageCapacities}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-[#241621] rounded-xl text-xs font-black shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Batch Enforce All Packages
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#EBDCE7] text-[11px] font-black uppercase text-slate-500">
                    <th className="py-2.5 px-3">Solar Package Name</th>
                    <th className="py-2.5 px-3">Technology Type</th>
                    <th className="py-2.5 px-3 text-center">Min Supply (kW)</th>
                    <th className="py-2.5 px-3 text-center">Max Supply (kW)</th>
                    <th className="py-2.5 px-3 text-center">Default (kW)</th>
                    <th className="py-2.5 px-3">Salesman Studio Preview</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBDCE7]/60">
                  {templates.map((tmpl) => {
                    const row = packageCapacityRows[tmpl.id] || {
                      minCapacityKw: tmpl.minCapacityKw,
                      maxCapacityKw: tmpl.maxCapacityKw,
                      defaultCapacityKw: tmpl.defaultCapacityKw,
                    };

                    const min = Number(row.minCapacityKw);
                    const max = Number(row.maxCapacityKw);
                    const isInvalid = min > max;

                    // Preview preset sample
                    const previewPresets = [
                      min,
                      Math.round((min + (max - min) * 0.33) * 2) / 2,
                      Math.round((min + (max - min) * 0.66) * 2) / 2,
                      max,
                    ];

                    return (
                      <tr key={tmpl.id} className="hover:bg-[#FAF6F9]/60 transition">
                        <td className="py-3 px-3">
                          <span className="font-extrabold text-[#241621] block">{tmpl.name}</span>
                          <span className="text-[10px] text-slate-400">ID: {tmpl.id.slice(0, 8)}...</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            tmpl.type === 'OFF_GRID' ? 'bg-emerald-100 text-emerald-800' :
                            tmpl.type === 'HYBRID' ? 'bg-blue-100 text-blue-800' :
                            tmpl.type === 'COMMERCIAL' ? 'bg-purple-100 text-purple-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {tmpl.type.replace('_', '-')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="0.5"
                            max="500"
                            step="0.5"
                            value={row.minCapacityKw}
                            onChange={(e) => handlePackageLimitChange(tmpl.id, 'minCapacityKw', e.target.value)}
                            className={`w-20 p-1.5 rounded-lg border text-center font-black text-xs outline-none ${
                              isInvalid
                                ? 'border-rose-400 bg-rose-50 text-rose-700'
                                : 'border-[#EBDCE7] bg-white text-[#241621] focus:ring-1 focus:ring-[#714b67]'
                            }`}
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            step="1"
                            value={row.maxCapacityKw}
                            onChange={(e) => handlePackageLimitChange(tmpl.id, 'maxCapacityKw', e.target.value)}
                            className={`w-20 p-1.5 rounded-lg border text-center font-black text-xs outline-none ${
                              isInvalid
                                ? 'border-rose-400 bg-rose-50 text-rose-700'
                                : 'border-[#EBDCE7] bg-white text-[#241621] focus:ring-1 focus:ring-[#714b67]'
                            }`}
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            max="500"
                            step="0.5"
                            value={row.defaultCapacityKw}
                            onChange={(e) => handlePackageLimitChange(tmpl.id, 'defaultCapacityKw', e.target.value)}
                            className="w-20 p-1.5 rounded-lg border border-[#EBDCE7] bg-white font-bold text-center text-xs text-[#714b67] outline-none focus:ring-1 focus:ring-[#714b67]"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1">
                            {previewPresets.map((kw, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold text-[10px]"
                              >
                                {kw}kW
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            disabled={savingCapacity || isInvalid}
                            onClick={() => handleSavePackageCapacity(tmpl.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FAF6F9] hover:bg-[#714b67] text-[#714b67] hover:text-white border border-[#EBDCE7] text-xs font-bold transition cursor-pointer disabled:opacity-40"
                          >
                            <Save className="w-3.5 h-3.5" /> Save
                          </button>
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
                <h2 className="text-base font-black text-[#241621] flex items-center gap-2">
                  {packageEditor.mode === 'create' ? (
                    '✨ Create New Solar Package'
                  ) : packageEditor.mode === 'customize' ? (
                    <>
                      <Wand2 className="w-4 h-4 text-[#f09e38]" /> Customize Package: {packageEditor.data.name}
                    </>
                  ) : (
                    `✏️ Edit Package: ${packageEditor.data.name}`
                  )}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {packageEditor.mode === 'customize'
                    ? 'Salesman Customizer: Select, swap, or configure your own hardware & components from the master catalogue for this customer proposal.'
                    : 'Configure package info, BOM components, and pricing. All changes save to database.'}
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

              {/* Save / Customization Action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#EBDCE7]">
                <div className="text-[11px] text-[#714b67] font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#f09e38]" />
                  <span>
                    {packageEditor.mode === 'customize'
                      ? 'Salesman Customizer Mode: Generates a tailored package with your chosen hardware.'
                      : 'Changes will immediately update the package template catalog.'}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setPackageEditor(null)}
                    className="px-4 py-2.5 border border-[#EBDCE7] rounded-xl text-xs font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
                  >
                    Cancel
                  </button>

                  {packageEditor.mode === 'customize' && (
                    <button
                      type="button"
                      onClick={handleSaveAndQuote}
                      disabled={pkgSaving}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#FAF6F9] hover:bg-[#F5EDF3] border border-[#f09e38] text-[#f09e38] hover:text-[#d4821a] rounded-xl text-xs font-black shadow-xs cursor-pointer transition disabled:opacity-50"
                      title="Save this custom package and immediately jump to Quote Studio"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Save &amp; Use in Quote →
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={pkgSaving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#714b67] to-[#8a5d7e] hover:opacity-95 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {pkgSaving
                      ? 'Saving…'
                      : packageEditor.mode === 'create'
                      ? 'Create Package'
                      : packageEditor.mode === 'customize'
                      ? 'Save as Custom Package'
                      : 'Save Changes'}
                  </button>
                </div>
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
                  <label className="font-extrabold text-[#241621] block mb-1">Product Type *</label>
                  <select
                    value={productEditor.data.productType || 'HARDWARE'}
                    onChange={e => ppf('productType', e.target.value)}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                  >
                    {PRODUCT_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Unit of Measure</label>
                  <select
                    value={productEditor.data.unit}
                    onChange={e => ppf('unit', e.target.value)}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                  >
                    {['unit', 'set', 'metre', 'kg', 'lot', 'service'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Component / Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Waaree 540W Bifacial N-Type Solar Module"
                  value={productEditor.data.name}
                  onChange={e => ppf('name', e.target.value)}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9] focus:ring-1 focus:ring-[#714b67]"
                />
              </div>

              {/* Per-component Flags: Serial-Tracked & Subsidy Eligible */}
              <div className="p-3 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-2">
                <span className="text-[10px] font-black uppercase text-[#714b67] tracking-wider block">
                  ⚙️ Component Tracking & Subsidy Flags
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#241621]">
                    <input
                      type="checkbox"
                      checked={Boolean(productEditor.data.isSerialTracked)}
                      onChange={e => ppf('isSerialTracked', e.target.checked)}
                      className="w-4 h-4 rounded text-[#714b67] focus:ring-[#714b67] cursor-pointer"
                    />
                    <span>Serial-Tracked</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-[#241621]">
                    <input
                      type="checkbox"
                      checked={Boolean(productEditor.data.isSubsidyEligible)}
                      onChange={e => ppf('isSubsidyEligible', e.target.checked)}
                      className="w-4 h-4 rounded text-[#714b67] focus:ring-[#714b67] cursor-pointer"
                    />
                    <span>PM Surya Ghar Eligible</span>
                  </label>
                </div>
                <p className="text-[10px] text-slate-500">
                  {productEditor.data.isSerialTracked
                    ? '• Requires individual barcode/QR scan before leaving warehouse (e.g. Inverters, Batteries, PV Panels).'
                    : '• Quantity-only item: dispatches by count or meters (e.g. Cables, Fasteners, Earthing rods).'}
                </p>
              </div>

              {/* Service Labor Hours if Service product */}
              {(productEditor.data.productType === 'SERVICE' || productEditor.data.category === 'SERVICE') && (
                <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                  <label className="font-extrabold text-indigo-950 block mb-1">
                    ⏱️ Standard Labor / Installation Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="e.g. 8 hours"
                    value={productEditor.data.laborHours}
                    onChange={e => ppf('laborHours', e.target.value)}
                    className="w-full border border-indigo-300 rounded-xl p-2.5 outline-none font-bold text-xs bg-white focus:ring-1 focus:ring-indigo-600"
                  />
                  <p className="text-[10px] text-indigo-800 mt-1">
                    Feeds standard crew wage and installation job costing schedules.
                  </p>
                </div>
              )}

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
