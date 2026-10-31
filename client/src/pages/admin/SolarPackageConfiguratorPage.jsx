import React, { useState, useEffect } from 'react';
import { inventoryApi } from '../../api';
import {
  Sun,
  Battery,
  Zap,
  Sliders,
  Plus,
  Edit2,
  Check,
  X,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Package,
} from 'lucide-react';

export default function SolarPackageConfiguratorPage() {
  const [activeTab, setActiveTab] = useState('packages'); // 'packages' | 'components'
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [products, setProducts] = useState([]);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'ON_GRID' | 'OFF_GRID'
  const [componentCategory, setComponentCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Package Configuration Modal
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreatingPackage, setIsCreatingPackage] = useState(false);
  const [packageModalOpen, setPackageModalOpen] = useState(false);
  const [packageSubmitting, setPackageSubmitting] = useState(false);

  // Form State for Package
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    type: 'ON_GRID',
    minCapacityKw: 1,
    maxCapacityKw: 10,
    defaultCapacityKw: 3,
    basePrice: 195000,
    selectedPanelId: '',
    panelQtyPerKw: 2,
    selectedInverterId: '',
    inverterQty: 1,
    selectedBatteryId: '',
    batteryQty: 0,
    selectedStructureId: '',
    structureQtyPerKw: 1,
  });

  // Price Edit Modal for Products
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    costPrice: '',
    salePrice: '',
    warrantyYears: '',
  });
  const [productSubmitting, setProductSubmitting] = useState(false);

  // New Product Modal
  const [newProductModalOpen, setNewProductModalOpen] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    sku: '',
    name: '',
    category: 'PANEL',
    costPrice: '',
    salePrice: '',
    warrantyYears: 5,
    unit: 'unit',
  });
  const [newProductSubmitting, setNewProductSubmitting] = useState(false);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadData = async () => {
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered lists
  const filteredTemplates = templates.filter((t) => {
    if (filterType === 'ALL') return true;
    return t.type === filterType;
  });

  const filteredProducts = products.filter((p) => {
    const matchesCat = componentCategory === 'ALL' || p.category === componentCategory;
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Separate components by category for easy selection
  const panelProducts = products.filter((p) => p.category === 'PANEL');
  const inverterProducts = products.filter((p) => p.category === 'INVERTER');
  const batteryProducts = products.filter((p) => p.category === 'BATTERY');
  const structureProducts = products.filter((p) => p.category === 'STRUCTURE');

  // Open Edit Package Modal
  const handleOpenEditPackage = (template) => {
    setIsCreatingPackage(false);
    setEditingTemplate(template);

    // Extract current component assignments from BOM lines
    const panelLine = template.bomLines?.find((l) => l.product?.category === 'PANEL');
    const inverterLine = template.bomLines?.find((l) => l.product?.category === 'INVERTER');
    const batteryLine = template.bomLines?.find((l) => l.product?.category === 'BATTERY');
    const structureLine = template.bomLines?.find((l) => l.product?.category === 'STRUCTURE');

    setPackageForm({
      name: template.name,
      description: template.description || '',
      type: template.type,
      minCapacityKw: Number(template.minCapacityKw || 1),
      maxCapacityKw: Number(template.maxCapacityKw || 10),
      defaultCapacityKw: Number(template.defaultCapacityKw || 3),
      basePrice: Number(template.basePrice || 0),
      selectedPanelId: panelLine?.productId || panelProducts[0]?.id || '',
      panelQtyPerKw: Number(panelLine?.quantityPerKw || 2),
      selectedInverterId: inverterLine?.productId || inverterProducts[0]?.id || '',
      inverterQty: Number(inverterLine?.fixedQuantity || 1),
      selectedBatteryId: batteryLine?.productId || '',
      batteryQty: Number(batteryLine?.fixedQuantity || 0),
      selectedStructureId: structureLine?.productId || structureProducts[0]?.id || '',
      structureQtyPerKw: Number(structureLine?.quantityPerKw || 1),
    });

    setPackageModalOpen(true);
  };

  const handleOpenCreatePackage = () => {
    setIsCreatingPackage(true);
    setEditingTemplate(null);
    setPackageForm({
      name: '',
      description: '',
      type: 'ON_GRID',
      minCapacityKw: 1,
      maxCapacityKw: 10,
      defaultCapacityKw: 3,
      basePrice: 195000,
      selectedPanelId: panelProducts[0]?.id || '',
      panelQtyPerKw: 2,
      selectedInverterId: inverterProducts[0]?.id || '',
      inverterQty: 1,
      selectedBatteryId: '',
      batteryQty: 0,
      selectedStructureId: structureProducts[0]?.id || '',
      structureQtyPerKw: 1,
    });
    setPackageModalOpen(true);
  };

  // Calculate live package hardware cost and margin based on assigned components
  const calculatePackageTelemetry = (form) => {
    const defaultKw = Number(form.defaultCapacityKw || 3);
    let totalCost = 0;

    const panel = products.find((p) => p.id === form.selectedPanelId);
    if (panel) {
      totalCost += Number(panel.costPrice) * Number(form.panelQtyPerKw || 0) * defaultKw;
    }

    const inverter = products.find((p) => p.id === form.selectedInverterId);
    if (inverter) {
      totalCost += Number(inverter.costPrice) * Number(form.inverterQty || 0);
    }

    const battery = products.find((p) => p.id === form.selectedBatteryId);
    if (battery && Number(form.batteryQty || 0) > 0) {
      totalCost += Number(battery.costPrice) * Number(form.batteryQty || 0);
    }

    const structure = products.find((p) => p.id === form.selectedStructureId);
    if (structure) {
      totalCost += Number(structure.costPrice) * Number(form.structureQtyPerKw || 0) * defaultKw;
    }

    const retailPrice = Number(form.basePrice || 0);
    const profit = Math.max(0, retailPrice - totalCost);
    const margin = retailPrice > 0 ? ((profit / retailPrice) * 100).toFixed(1) : 0;

    return { totalCost, retailPrice, profit, margin };
  };

  const currentTelemetry = calculatePackageTelemetry(packageForm);

  const handleSavePackage = async (e) => {
    e.preventDefault();
    setPackageSubmitting(true);
    try {
      // Build BOM lines array
      const bomLines = [];

      // Solar Panel
      if (packageForm.selectedPanelId) {
        bomLines.push({
          productId: packageForm.selectedPanelId,
          quantityPerKw: Number(packageForm.panelQtyPerKw),
          fixedQuantity: 0,
          notes: 'Solar PV Modules',
        });
      }

      // Inverter
      if (packageForm.selectedInverterId) {
        bomLines.push({
          productId: packageForm.selectedInverterId,
          quantityPerKw: 0,
          fixedQuantity: Number(packageForm.inverterQty),
          notes: 'Solar Inverter Unit',
        });
      }

      // Battery Storage (for Off-Grid / Hybrid)
      if (packageForm.selectedBatteryId && Number(packageForm.batteryQty) > 0) {
        bomLines.push({
          productId: packageForm.selectedBatteryId,
          quantityPerKw: 0,
          fixedQuantity: Number(packageForm.batteryQty),
          notes: 'Battery Storage Bank',
        });
      }

      // Structure
      if (packageForm.selectedStructureId) {
        bomLines.push({
          productId: packageForm.selectedStructureId,
          quantityPerKw: Number(packageForm.structureQtyPerKw),
          fixedQuantity: 0,
          notes: 'Rooftop Mounting Structure',
        });
      }

      const payload = {
        name: packageForm.name,
        description: packageForm.description,
        type: packageForm.type,
        minCapacityKw: Number(packageForm.minCapacityKw),
        maxCapacityKw: Number(packageForm.maxCapacityKw),
        defaultCapacityKw: Number(packageForm.defaultCapacityKw),
        basePrice: Number(packageForm.basePrice),
        bomLines,
      };

      if (isCreatingPackage) {
        await inventoryApi.createTemplate(payload);
        showToast('Solar package configuration created successfully!');
      } else {
        await inventoryApi.updateTemplate(editingTemplate.id, payload);
        showToast('Solar package configuration updated successfully!');
      }

      setPackageModalOpen(false);
      loadData();
    } catch (err) {
      alert('Error saving package: ' + (err.response?.data?.message || err.message));
    } finally {
      setPackageSubmitting(false);
    }
  };

  // Open Edit Product Price Modal
  const handleOpenEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      costPrice: Number(product.costPrice),
      salePrice: Number(product.salePrice),
      warrantyYears: Number(product.warrantyYears || 0),
    });
  };

  const handleSaveProductPrice = async (e) => {
    e.preventDefault();
    setProductSubmitting(true);
    try {
      await inventoryApi.updateProduct(editingProduct.id, {
        costPrice: Number(productForm.costPrice),
        salePrice: Number(productForm.salePrice),
        warrantyYears: Number(productForm.warrantyYears),
      });

      showToast(`Pricing updated for ${editingProduct.name}!`);
      setEditingProduct(null);
      loadData();
    } catch (err) {
      alert('Error updating component price: ' + (err.response?.data?.message || err.message));
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleCreateNewProduct = async (e) => {
    e.preventDefault();
    setNewProductSubmitting(true);
    try {
      await inventoryApi.createProduct({
        ...newProductForm,
        costPrice: Number(newProductForm.costPrice),
        salePrice: Number(newProductForm.salePrice),
        warrantyYears: Number(newProductForm.warrantyYears || 0),
      });

      showToast(`Component ${newProductForm.sku} added to catalog!`);
      setNewProductModalOpen(false);
      setNewProductForm({
        sku: '',
        name: '',
        category: 'PANEL',
        costPrice: '',
        salePrice: '',
        warrantyYears: 5,
        unit: 'unit',
      });
      loadData();
    } catch (err) {
      alert('Error creating product: ' + (err.response?.data?.message || err.message));
    } finally {
      setNewProductSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-[#714b67] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-semibold text-[#714b67]">Loading Solar Packages & Pricing Engine...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#241621] text-white px-4 py-3 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-center gap-2.5 animate-bounce-short">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Actions in Odoo Palette */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#241621] via-[#4c3145] to-[#714b67] p-7 text-white shadow-xl border border-white/10">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f09e38]/20 text-[#f09e38] text-xs font-black border border-[#f09e38]/30">
              <Sliders className="w-3.5 h-3.5" /> Technical Configuration Engine
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Solar Package & Pricing Configurator
            </h1>
            <p className="text-xs text-[#dabed3] max-w-xl">
              Dynamically assign solar panels, battery storage banks (on-grid, off-grid), mounting structures, and manage live component prices.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenCreatePackage}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-[#241621] rounded-xl text-xs font-black shadow-lg shadow-[#f09e38]/30 transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#241621]" /> New Solar Package
            </button>
            <button
              onClick={() => setNewProductModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition cursor-pointer"
            >
              <Package className="w-4 h-4 text-[#f09e38]" /> Add Component
            </button>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#f09e38]/15 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Metric Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl odoo-glass-card border border-[#EBDCE7] bg-white">
          <span className="text-[11px] font-bold text-[#714b67] uppercase tracking-wider">Packages Configured</span>
          <p className="text-2xl font-black text-[#241621] mt-1">{templates.length}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">On-Grid & Off-Grid Systems</p>
        </div>

        <div className="p-4 rounded-2xl odoo-glass-card border border-[#EBDCE7] bg-white">
          <span className="text-[11px] font-bold text-[#714b67] uppercase tracking-wider">Solar PV Modules</span>
          <p className="text-2xl font-black text-[#f09e38] mt-1">{panelProducts.length} Models</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Mono PERC & Bifacial Tech</p>
        </div>

        <div className="p-4 rounded-2xl odoo-glass-card border border-[#EBDCE7] bg-white">
          <span className="text-[11px] font-bold text-[#714b67] uppercase tracking-wider">Battery Systems</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">{batteryProducts.length} Storage</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Lithium LiFePO4 & Tubular</p>
        </div>

        <div className="p-4 rounded-2xl odoo-glass-card border border-[#EBDCE7] bg-white">
          <span className="text-[11px] font-bold text-[#714b67] uppercase tracking-wider">Inverter Options</span>
          <p className="text-2xl font-black text-purple-700 mt-1">{inverterProducts.length} Inverters</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Single & Three-Phase Units</p>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-[#EBDCE7] gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('packages')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'packages'
              ? 'border-[#714b67] text-[#714b67] font-black'
              : 'border-transparent text-slate-500 hover:text-[#714b67]'
          }`}
        >
          <Layers className="w-4 h-4" /> Solar Packages & BOM Assignment ({templates.length})
        </button>

        <button
          onClick={() => setActiveTab('components')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === 'components'
              ? 'border-[#714b67] text-[#714b67] font-black'
              : 'border-transparent text-slate-500 hover:text-[#714b67]'
          }`}
        >
          <DollarSign className="w-4 h-4" /> Component Catalog & Price Management ({products.length})
        </button>
      </div>

      {/* VIEW 1: SOLAR PACKAGES */}
      {activeTab === 'packages' && (
        <div className="space-y-4">
          {/* Sub-filter by Package Type */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#241621]">System Type:</span>
              <div className="flex p-1 rounded-xl bg-white border border-[#EBDCE7]">
                {['ALL', 'ON_GRID', 'OFF_GRID'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      filterType === type
                        ? 'bg-[#714b67] text-white shadow-xs'
                        : 'text-slate-600 hover:text-[#714b67]'
                    }`}
                  >
                    {type === 'ALL' ? 'All Packages' : type.replace('_', '-')}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={loadData}
              className="p-2 rounded-xl border border-[#EBDCE7] bg-white text-slate-600 hover:text-[#714b67] hover:bg-[#FAF6F9] transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Package Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTemplates.map((template) => {
              const panelLine = template.bomLines?.find((l) => l.product?.category === 'PANEL');
              const inverterLine = template.bomLines?.find((l) => l.product?.category === 'INVERTER');
              const batteryLine = template.bomLines?.find((l) => l.product?.category === 'BATTERY');
              const structureLine = template.bomLines?.find((l) => l.product?.category === 'STRUCTURE');

              // Calculate BOM hardware cost
              const defaultKw = Number(template.defaultCapacityKw || 3);
              let totalCost = 0;
              template.bomLines?.forEach((line) => {
                const cost = Number(line.product?.costPrice || 0);
                const qtyPerKw = Number(line.quantityPerKw || 0);
                const fixed = Number(line.fixedQuantity || 0);
                totalCost += cost * (qtyPerKw * defaultKw + fixed);
              });

              const basePrice = Number(template.basePrice || 0);
              const margin = basePrice > 0 ? (((basePrice - totalCost) / basePrice) * 100).toFixed(1) : 0;

              return (
                <div
                  key={template.id}
                  className="rounded-3xl odoo-glass-card bg-white border border-[#EBDCE7] p-6 space-y-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-[#EBDCE7] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-[#241621]">{template.name}</h3>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            template.type === 'OFF_GRID'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-[#F5EDF3] text-[#714b67] border border-[#EBDCE7]'
                          }`}
                        >
                          {template.type.replace('_', '-')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">
                        Capacity: {template.minCapacityKw} kW to {template.maxCapacityKw} kW (Default: {template.defaultCapacityKw} kW)
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenEditPackage(template)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF6F9] hover:bg-[#714b67] text-[#714b67] hover:text-white border border-[#EBDCE7] rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Configure BOM
                    </button>
                  </div>

                  {/* Assigned Technical Components */}
                  <div className="space-y-2.5 text-xs">
                    <p className="text-[11px] font-black uppercase tracking-wider text-[#714b67]">
                      Assigned System Hardware
                    </p>

                    {/* Solar PV Modules */}
                    <div className="p-3 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4 text-[#f09e38]" />
                        <div>
                          <span className="font-bold text-[#241621]">
                            {panelLine?.product?.name || 'No panel assigned'}
                          </span>
                          <p className="text-[10px] text-slate-500">
                            {panelLine ? `${panelLine.quantityPerKw} modules per kW (${Number(panelLine.quantityPerKw) * defaultKw} total)` : '-'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        {panelLine?.product?.salePrice ? `₹${Number(panelLine.product.salePrice).toLocaleString()}/unit` : '-'}
                      </span>
                    </div>

                    {/* Inverter */}
                    <div className="p-3 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-purple-600" />
                        <div>
                          <span className="font-bold text-[#241621]">
                            {inverterLine?.product?.name || 'No inverter assigned'}
                          </span>
                          <p className="text-[10px] text-slate-500">
                            {inverterLine ? `${inverterLine.fixedQuantity} unit fixed` : '-'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        {inverterLine?.product?.salePrice ? `₹${Number(inverterLine.product.salePrice).toLocaleString()}` : '-'}
                      </span>
                    </div>

                    {/* Battery Storage (Highlight if Off-grid or present) */}
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        batteryLine
                          ? 'bg-emerald-50/70 border-emerald-200'
                          : 'bg-[#FAF6F9] border-[#EBDCE7] opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Battery className={`w-4 h-4 ${batteryLine ? 'text-emerald-600' : 'text-slate-400'}`} />
                        <div>
                          <span className={`font-bold ${batteryLine ? 'text-emerald-950' : 'text-slate-600'}`}>
                            {batteryLine?.product?.name || 'No battery assigned (Grid-Tied)'}
                          </span>
                          <p className="text-[10px] text-slate-500">
                            {batteryLine ? `${batteryLine.fixedQuantity} battery bank units` : 'Direct net-metered'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-emerald-800">
                        {batteryLine?.product?.salePrice ? `₹${Number(batteryLine.product.salePrice).toLocaleString()}/ea` : '-'}
                      </span>
                    </div>

                    {/* Mounting Structure */}
                    <div className="p-3 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[#714b67]" />
                        <div>
                          <span className="font-bold text-[#241621]">
                            {structureLine?.product?.name || 'Standard Rooftop Structure'}
                          </span>
                          <p className="text-[10px] text-slate-500">
                            {structureLine ? `${structureLine.quantityPerKw} kW structure rating` : '-'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        {structureLine?.product?.salePrice ? `₹${Number(structureLine.product.salePrice).toLocaleString()}/kW` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Pricing & Telemetry Footer */}
                  <div className="pt-3 border-t border-[#EBDCE7] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Retail Base Price</span>
                      <span className="text-lg font-black text-[#714b67]">₹{basePrice.toLocaleString()}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Est. BOM Cost / Margin</span>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs font-mono text-slate-600 font-semibold">₹{totalCost.toLocaleString()}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {margin}% Margin
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: COMPONENT CATALOG & LIVE PRICING */}
      {activeTab === 'components' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#EBDCE7]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#241621]">Category:</span>
              {['ALL', 'PANEL', 'INVERTER', 'BATTERY', 'STRUCTURE', 'BOS'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setComponentCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    componentCategory === cat
                      ? 'bg-[#714b67] text-white'
                      : 'bg-[#FAF6F9] text-slate-600 hover:text-[#714b67] border border-[#EBDCE7]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search SKU or component..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] text-xs outline-none focus:ring-1 focus:ring-[#714b67]"
              />
            </div>
          </div>

          {/* Components Table */}
          <div className="bg-white rounded-3xl border border-[#EBDCE7] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF6F9] text-[#714b67] font-black uppercase text-[10px] border-b border-[#EBDCE7]">
                  <tr>
                    <th className="py-3 px-4">SKU / Code</th>
                    <th className="py-3 px-4">Component Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Cost Price (₹)</th>
                    <th className="py-3 px-4 text-right">Sale Price (₹)</th>
                    <th className="py-3 px-4 text-right">Margin</th>
                    <th className="py-3 px-4 text-center">Warranty</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBDCE7] text-slate-700">
                  {filteredProducts.map((p) => {
                    const cost = Number(p.costPrice || 0);
                    const sale = Number(p.salePrice || 0);
                    const margin = sale > 0 ? (((sale - cost) / sale) * 100).toFixed(1) : 0;

                    return (
                      <tr key={p.id} className="hover:bg-[#FAF6F9]/60 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#714b67]">{p.sku}</td>
                        <td className="py-3.5 px-4 font-semibold text-[#241621]">{p.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FAF6F9] text-slate-600 border border-[#EBDCE7]">
                            {p.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          ₹{cost.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#241621]">
                          ₹{sale.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black font-mono ${
                              margin >= 30
                                ? 'bg-emerald-100 text-emerald-800'
                                : margin >= 15
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {margin}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                          {p.warrantyYears ? `${p.warrantyYears} yrs` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-[#FAF6F9] hover:bg-[#714b67] text-[#714b67] hover:text-white border border-[#EBDCE7] rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" /> Edit Price
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

      {/* MODAL: CONFIGURE PACKAGE & ASSIGN BOM */}
      {packageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#22151F]/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#EBDCE7] space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h2 className="text-base font-black text-[#241621]">
                  {isCreatingPackage ? 'Create New Solar Package' : `Configure Package: ${packageForm.name}`}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Assign solar modules, inverter rating, battery bank systems, and retail package pricing
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPackageModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePackage} className="space-y-4">
              {/* Basic Package Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Package Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5 kW Commercial On-Grid Solar"
                    value={packageForm.name}
                    onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Package Type *</label>
                  <select
                    value={packageForm.type}
                    onChange={(e) => setPackageForm({ ...packageForm, type: e.target.value })}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                  >
                    <option value="ON_GRID">ON_GRID (Grid-Tied, Net Metering)</option>
                    <option value="OFF_GRID">OFF_GRID (Battery Energy Storage)</option>
                    <option value="PANEL_SET">PANEL_SET (Modules & Structure Only)</option>
                    <option value="INSTALLATION">INSTALLATION (Services Only)</option>
                  </select>
                </div>
              </div>

              {/* Capacity & Price */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Min Capacity (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={packageForm.minCapacityKw}
                    onChange={(e) => setPackageForm({ ...packageForm, minCapacityKw: e.target.value })}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Default Capacity (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={packageForm.defaultCapacityKw}
                    onChange={(e) => setPackageForm({ ...packageForm, defaultCapacityKw: e.target.value })}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Max Capacity (kW)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={packageForm.maxCapacityKw}
                    onChange={(e) => setPackageForm({ ...packageForm, maxCapacityKw: e.target.value })}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Base Package Selling Price (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="195000"
                  value={packageForm.basePrice}
                  onChange={(e) => setPackageForm({ ...packageForm, basePrice: e.target.value })}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-black text-sm text-[#714b67] bg-[#FAF6F9]"
                />
              </div>

              {/* DYNAMIC BOM ASSIGNMENTS */}
              <div className="p-4 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-3.5">
                <p className="font-black text-xs text-[#714b67] uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" /> Dynamically Assigned Hardware Components
                </p>

                {/* 1. Solar Panels */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5 text-[#f09e38]" /> Solar PV Module Model *
                    </label>
                    <select
                      value={packageForm.selectedPanelId}
                      onChange={(e) => setPackageForm({ ...packageForm, selectedPanelId: e.target.value })}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2 font-bold text-xs bg-white"
                    >
                      {panelProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name} (₹{Number(p.salePrice).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Qty per kW</label>
                    <input
                      type="number"
                      step="0.5"
                      value={packageForm.panelQtyPerKw}
                      onChange={(e) => setPackageForm({ ...packageForm, panelQtyPerKw: e.target.value })}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2 font-bold text-xs bg-white text-center"
                    />
                  </div>
                </div>

                {/* 2. Inverter */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-purple-600" /> Inverter System Model *
                    </label>
                    <select
                      value={packageForm.selectedInverterId}
                      onChange={(e) => setPackageForm({ ...packageForm, selectedInverterId: e.target.value })}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2 font-bold text-xs bg-white"
                    >
                      {inverterProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name} (₹{Number(p.salePrice).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Fixed Units</label>
                    <input
                      type="number"
                      value={packageForm.inverterQty}
                      onChange={(e) => setPackageForm({ ...packageForm, inverterQty: e.target.value })}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2 font-bold text-xs bg-white text-center"
                    />
                  </div>
                </div>

                {/* 3. Battery System (Especially prominent for Off-Grid) */}
                <div
                  className={`p-3 rounded-xl border ${
                    packageForm.type === 'OFF_GRID'
                      ? 'bg-emerald-50/80 border-emerald-300'
                      : 'bg-white border-[#EBDCE7]'
                  }`}
                >
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="font-bold text-slate-800 block mb-1 flex items-center gap-1">
                        <Battery className="w-3.5 h-3.5 text-emerald-600" /> Battery Storage Bank (Off-Grid / Hybrid)
                      </label>
                      <select
                        value={packageForm.selectedBatteryId}
                        onChange={(e) => setPackageForm({ ...packageForm, selectedBatteryId: e.target.value })}
                        className="w-full border border-[#EBDCE7] rounded-xl p-2 font-bold text-xs bg-white"
                      >
                        <option value="">-- No Battery Bank (Pure Grid-Tied) --</option>
                        {batteryProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} - {p.name} (₹{Number(p.salePrice).toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">Battery Units</label>
                      <input
                        type="number"
                        value={packageForm.batteryQty}
                        onChange={(e) => setPackageForm({ ...packageForm, batteryQty: e.target.value })}
                        className="w-full border border-[#EBDCE7] rounded-xl p-2 font-bold text-xs bg-white text-center"
                      />
                    </div>
                  </div>
                  {packageForm.type === 'OFF_GRID' && !packageForm.selectedBatteryId && (
                    <p className="text-[10px] text-amber-700 font-bold mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Note: Off-Grid packages require battery storage bank assignment.
                    </p>
                  )}
                </div>

                {/* 4. Mounting Structure */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-[#714b67]" /> Mounting Structure Model
                    </label>
                    <select
                      value={packageForm.selectedStructureId}
                      onChange={(e) => setPackageForm({ ...packageForm, selectedStructureId: e.target.value })}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2 font-bold text-xs bg-white"
                    >
                      {structureProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Structure per kW</label>
                    <input
                      type="number"
                      step="0.5"
                      value={packageForm.structureQtyPerKw}
                      onChange={(e) => setPackageForm({ ...packageForm, structureQtyPerKw: e.target.value })}
                      className="w-full border border-[#EBDCE7] rounded-xl p-2 font-bold text-xs bg-white text-center"
                    />
                  </div>
                </div>
              </div>

              {/* LIVE TELEMETRY BANNER */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#241621] to-[#3a2534] text-white flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">Calculated Hardware Cost ({packageForm.defaultCapacityKw} kW)</span>
                  <span className="font-bold text-amber-400">₹{currentTelemetry.totalCost.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Retail Selling Price</span>
                  <span className="font-bold text-white">₹{currentTelemetry.retailPrice.toLocaleString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Gross Profit / Margin</span>
                  <span className="font-bold text-emerald-400">
                    ₹{currentTelemetry.profit.toLocaleString()} ({currentTelemetry.margin}%)
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setPackageModalOpen(false)}
                  className="px-4 py-2 border border-[#EBDCE7] rounded-xl text-xs font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={packageSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#714b67] to-[#8a5d7e] hover:opacity-95 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {packageSubmitting ? 'Saving Configuration...' : 'Save Package & Assign BOM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT COMPONENT PRICING */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#22151F]/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h2 className="text-base font-black text-[#241621]">Edit Component Pricing</h2>
                <p className="text-[11px] text-slate-500 font-mono">
                  {editingProduct.sku} • {editingProduct.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductPrice} className="space-y-3.5">
              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Component Cost Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={productForm.costPrice}
                  onChange={(e) => setProductForm({ ...productForm, costPrice: e.target.value })}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Selling / Retail Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={productForm.salePrice}
                  onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-black text-sm text-[#714b67] bg-[#FAF6F9]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Warranty Period (Years)</label>
                <input
                  type="number"
                  value={productForm.warrantyYears}
                  onChange={(e) => setProductForm({ ...productForm, warrantyYears: e.target.value })}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                />
              </div>

              {/* Instant Margin Preview */}
              {(() => {
                const cost = Number(productForm.costPrice || 0);
                const sale = Number(productForm.salePrice || 0);
                const margin = sale > 0 ? (((sale - cost) / sale) * 100).toFixed(1) : 0;
                return (
                  <div className="p-3 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] flex items-center justify-between font-mono">
                    <span className="text-slate-600 font-bold">Calculated Unit Margin:</span>
                    <span className="font-black text-[#714b67]">
                      ₹{(sale - cost).toLocaleString()} ({margin}%)
                    </span>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-[#EBDCE7] rounded-xl text-xs font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={productSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#714b67] to-[#8a5d7e] hover:opacity-95 text-white rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {productSubmitting ? 'Updating Price...' : 'Save New Price'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD COMPONENT TO CATALOG */}
      {newProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#22151F]/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h2 className="text-base font-black text-[#241621]">Add Solar Hardware Component</h2>
                <p className="text-[11px] text-slate-500">Register new panel, battery, or inverter into catalog</p>
              </div>
              <button
                type="button"
                onClick={() => setNewProductModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProduct} className="space-y-3.5">
              <div>
                <label className="font-extrabold text-[#241621] block mb-1">SKU / Item Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BAT-48V-200AH"
                  value={newProductForm.sku}
                  onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Component Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lithium LiFePO4 48V 200Ah High-Capacity Storage"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Component Category *</label>
                <select
                  value={newProductForm.category}
                  onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                >
                  <option value="PANEL">PANEL (Solar PV Modules)</option>
                  <option value="INVERTER">INVERTER (On-Grid / Off-Grid / Hybrid)</option>
                  <option value="BATTERY">BATTERY (Lithium / Tubular Storage)</option>
                  <option value="STRUCTURE">STRUCTURE (Mounting Hardware)</option>
                  <option value="BOS">BOS (Balance of System / ACDB / DCDB)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Cost Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="50000"
                    value={newProductForm.costPrice}
                    onChange={(e) => setNewProductForm({ ...newProductForm, costPrice: e.target.value })}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] block mb-1">Sale Price (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="72000"
                    value={newProductForm.salePrice}
                    onChange={(e) => setNewProductForm({ ...newProductForm, salePrice: e.target.value })}
                    className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] block mb-1">Warranty (Years)</label>
                <input
                  type="number"
                  value={newProductForm.warrantyYears}
                  onChange={(e) => setNewProductForm({ ...newProductForm, warrantyYears: e.target.value })}
                  className="w-full border border-[#EBDCE7] rounded-xl p-2.5 outline-none font-bold text-xs bg-[#FAF6F9]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setNewProductModalOpen(false)}
                  className="px-4 py-2 border border-[#EBDCE7] rounded-xl text-xs font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newProductSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-[#241621] rounded-xl text-xs font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {newProductSubmitting ? 'Adding...' : 'Add Component'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

