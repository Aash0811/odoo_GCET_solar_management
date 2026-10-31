import React, { useState, useEffect } from 'react';
import {
  Sun,
  Zap,
  Battery,
  Layers,
  ShieldCheck,
  Check,
  Plus,
  Trash2,
  Sliders,
  Wand2,
  RefreshCw,
  X,
  ArrowRight,
  Sparkles,
  Info,
  DollarSign,
  CheckCircle2,
  Search,
  Package,
} from 'lucide-react';

export default function SolarProductCustomizerModal({
  isOpen,
  onClose,
  catalogProducts = [],
  capacityKw = 3,
  setCapacityKw,
  minCapacityKw = 1,
  maxCapacityKw = 25,
  dynamicPresets = [2, 3, 4, 5],
  currentBomLines = [],
  activeSurvey = null,
  selectedLead = null,
  onApplyCustomization,
  activeTabDefault = 'PANEL',
}) {
  const [activeTab, setActiveTab] = useState(activeTabDefault);
  const [draftLines, setDraftLines] = useState([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Custom one-off item state
  const [customDesc, setCustomDesc] = useState('');
  const [customQty, setCustomQty] = useState(1);
  const [customPrice, setCustomPrice] = useState(0);
  const [customCategory, setCustomCategory] = useState('CUSTOM');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(activeTabDefault);
      setDraftLines(JSON.parse(JSON.stringify(currentBomLines || [])));
      const customerName = selectedLead?.contactName || 'Customer';
      setCustomTemplateName(`Custom ${capacityKw}kW Package - ${customerName}`);
      setSaveAsTemplate(false);
      setProductSearch('');
    }
  }, [isOpen, currentBomLines, capacityKw, selectedLead, activeTabDefault]);

  if (!isOpen) return null;

  // Filter catalog products by category
  const panels = catalogProducts.filter(
    (p) => p.category === 'PANEL' || p.sku?.startsWith('PAN-')
  );
  const inverters = catalogProducts.filter(
    (p) => p.category === 'INVERTER' || p.sku?.startsWith('INV-')
  );
  const batteries = catalogProducts.filter(
    (p) => p.category === 'BATTERY' || p.sku?.startsWith('BAT-')
  );
  const structures = catalogProducts.filter(
    (p) => p.category === 'STRUCTURE' || p.sku?.startsWith('STR-')
  );
  const cables = catalogProducts.filter(
    (p) => p.category === 'CABLE' || p.sku?.startsWith('CBL-')
  );
  const bosElectricals = catalogProducts.filter((p) =>
    ['BOS', 'EARTHING', 'SAFETY', 'SERVICE'].includes(p.category) ||
    p.sku?.startsWith('ACDB-') ||
    p.sku?.startsWith('DCDB-') ||
    p.sku?.startsWith('EARTH-') ||
    p.sku?.startsWith('LIGHTNING-') ||
    p.sku?.startsWith('SRV-')
  );

  // Helper: check if product is in draftLines
  const findLineByProductId = (productId) =>
    draftLines.find((l) => l.productId === productId);

  // Helper: check if a category is represented in draftLines
  const findLineByCategory = (categoryKeyword) =>
    draftLines.find((l) => {
      const p = catalogProducts.find((cp) => cp.id === l.productId);
      const cat = p?.category?.toLowerCase() || '';
      const desc = l.description?.toLowerCase() || '';
      return cat.includes(categoryKeyword) || desc.includes(categoryKeyword);
    });

  // Calculate panel count recommendation based on wattage
  const getPanelQtyRecommendation = (product) => {
    let wattage = 540;
    if (product.name?.includes('550') || product.sku?.includes('550')) wattage = 550;
    else if (product.name?.includes('540') || product.sku?.includes('540')) wattage = 540;
    else if (product.name?.includes('330') || product.sku?.includes('330')) wattage = 330;
    else if (product.name?.includes('400') || product.sku?.includes('400')) wattage = 400;

    return Math.max(1, Math.ceil((capacityKw * 1000) / wattage));
  };

  // Select / Swap Solar Panel
  const handleSelectPanel = (panelProd, customQuantity = null) => {
    const qty = customQuantity !== null ? customQuantity : getPanelQtyRecommendation(panelProd);
    const unitPrice = Number(panelProd.salePrice || 0);

    const newLine = {
      productId: panelProd.id,
      description: `${panelProd.name} (${panelProd.sku})`,
      quantity: qty,
      unitPrice,
      unitCost: Number(panelProd.costPrice || 0),
      gstRate: Number(panelProd.gstRate || 18),
      lineTotal: qty * unitPrice,
      sortOrder: 0,
    };

    // Remove any existing panel line and prepend the new one
    const withoutOldPanel = draftLines.filter((l) => {
      const p = catalogProducts.find((cp) => cp.id === l.productId);
      const isPanel =
        p?.category === 'PANEL' ||
        p?.sku?.startsWith('PAN-') ||
        l.description?.toLowerCase().includes('module') ||
        l.description?.toLowerCase().includes('panel');
      return !isPanel;
    });

    setDraftLines([newLine, ...withoutOldPanel]);
  };

  // Select / Swap Solar Inverter
  const handleSelectInverter = (invProd) => {
    const unitPrice = Number(invProd.salePrice || 0);
    const qty = 1;

    const newLine = {
      productId: invProd.id,
      description: `${invProd.name} (${invProd.sku})`,
      quantity: qty,
      unitPrice,
      unitCost: Number(invProd.costPrice || 0),
      gstRate: Number(invProd.gstRate || 18),
      lineTotal: qty * unitPrice,
      sortOrder: 1,
    };

    const withoutOldInverter = draftLines.filter((l) => {
      const p = catalogProducts.find((cp) => cp.id === l.productId);
      const isInverter =
        p?.category === 'INVERTER' ||
        p?.sku?.startsWith('INV-') ||
        l.description?.toLowerCase().includes('inverter');
      return !isInverter;
    });

    // Insert right after panel or at index 1
    const updated = [...withoutOldInverter];
    updated.splice(1, 0, newLine);
    setDraftLines(updated);
  };

  // Select / Swap Battery Storage
  const handleSelectBattery = (batProd, qty = 1) => {
    if (!batProd) {
      // Remove battery from draft
      const withoutBattery = draftLines.filter((l) => {
        const p = catalogProducts.find((cp) => cp.id === l.productId);
        const isBat =
          p?.category === 'BATTERY' ||
          p?.sku?.startsWith('BAT-') ||
          l.description?.toLowerCase().includes('battery');
        return !isBat;
      });
      setDraftLines(withoutBattery);
      return;
    }

    const unitPrice = Number(batProd.salePrice || 0);
    const newLine = {
      productId: batProd.id,
      description: `${batProd.name} (${batProd.sku})`,
      quantity: qty,
      unitPrice,
      unitCost: Number(batProd.costPrice || 0),
      gstRate: Number(batProd.gstRate || 18),
      lineTotal: qty * unitPrice,
      sortOrder: 2,
    };

    const withoutOldBat = draftLines.filter((l) => {
      const p = catalogProducts.find((cp) => cp.id === l.productId);
      const isBat =
        p?.category === 'BATTERY' ||
        p?.sku?.startsWith('BAT-') ||
        l.description?.toLowerCase().includes('battery');
      return !isBat;
    });

    setDraftLines([...withoutOldBat, newLine]);
  };

  // Select / Swap Mounting Structure
  const handleSelectStructure = (strProd) => {
    const unitPrice = Number(strProd.salePrice || 0);
    const qty = Math.max(1, capacityKw);

    const newLine = {
      productId: strProd.id,
      description: `${strProd.name} (${strProd.sku})`,
      quantity: qty,
      unitPrice,
      unitCost: Number(strProd.costPrice || 0),
      gstRate: Number(strProd.gstRate || 18),
      lineTotal: qty * unitPrice,
      sortOrder: 3,
    };

    const withoutOldStr = draftLines.filter((l) => {
      const p = catalogProducts.find((cp) => cp.id === l.productId);
      const isStr =
        p?.category === 'STRUCTURE' ||
        p?.sku?.startsWith('STR-') ||
        l.description?.toLowerCase().includes('structure');
      return !isStr;
    });

    setDraftLines([...withoutOldStr, newLine]);
  };

  // Generic Toggle / Update Product
  const handleToggleProduct = (prod, defaultQty = 1) => {
    const existingIdx = draftLines.findIndex((l) => l.productId === prod.id);
    if (existingIdx >= 0) {
      setDraftLines(draftLines.filter((_, idx) => idx !== existingIdx));
    } else {
      const unitPrice = Number(prod.salePrice || 0);
      const newLine = {
        productId: prod.id,
        description: `${prod.name} (${prod.sku})`,
        quantity: defaultQty,
        unitPrice,
        unitCost: Number(prod.costPrice || 0),
        gstRate: Number(prod.gstRate || 18),
        lineTotal: defaultQty * unitPrice,
        sortOrder: draftLines.length,
      };
      setDraftLines([...draftLines, newLine]);
    }
  };

  // Update specific line in draft
  const handleUpdateDraftLine = (idx, field, value) => {
    const updated = [...draftLines];
    updated[idx][field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      updated[idx].lineTotal =
        Number(updated[idx].quantity || 0) * Number(updated[idx].unitPrice || 0);
    }
    setDraftLines(updated);
  };

  // Remove line from draft
  const handleRemoveDraftLine = (idx) => {
    setDraftLines(draftLines.filter((_, i) => i !== idx));
  };

  // Add custom one-off line
  const handleAddCustomLine = (e) => {
    e.preventDefault();
    if (!customDesc.trim()) return;

    const qty = Math.max(1, Number(customQty) || 1);
    const price = Math.max(0, Number(customPrice) || 0);

    const newLine = {
      productId: null,
      description: customDesc.trim(),
      quantity: qty,
      unitPrice: price,
      unitCost: 0,
      gstRate: 18,
      lineTotal: qty * price,
      sortOrder: draftLines.length,
    };

    setDraftLines([...draftLines, newLine]);
    setCustomDesc('');
    setCustomQty(1);
    setCustomPrice(0);
  };

  // Financials calculation
  const subtotal = draftLines.reduce(
    (sum, line) => sum + Number(line.lineTotal || 0),
    0
  );
  const gstAmount = (subtotal * 18) / 100;
  const grandTotal = subtotal + gstAmount;
  const centralSubsidy =
    capacityKw >= 3 ? 78000 : capacityKw >= 2 ? 60000 : 30000;
  const netPayable = Math.max(0, grandTotal - centralSubsidy);

  // Active items detection
  const activePanelLine = findLineByCategory('panel') || findLineByCategory('module');
  const activeInverterLine = findLineByCategory('inverter');
  const activeBatteryLine = findLineByCategory('battery');
  const activeStructureLine = findLineByCategory('structure');

  const handleApply = () => {
    if (draftLines.length === 0) {
      alert('Please include at least one solar component in the proposal.');
      return;
    }
    onApplyCustomization(
      draftLines,
      saveAsTemplate ? customTemplateName : null
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#22151F]/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#EBDCE7] overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#241621] via-[#382433] to-[#241621] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f09e38] to-[#e08920] flex items-center justify-center shadow-md">
              <Sliders className="w-5 h-5 text-[#241621]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Solar Hardware Customizer for Customer
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#f09e38]/20 border border-[#f09e38]/40 text-[#f09e38] text-[10px] font-black uppercase">
                  Salesman Studio
                </span>
              </div>
              <p className="text-[11px] text-[#dabed3]">
                Tailor solar panels, inverters, battery storage, and mounting hardware for{' '}
                <strong className="text-white font-bold">
                  {selectedLead?.contactName || 'Target Customer'}
                </strong>{' '}
                ({selectedLead?.phone || 'Site Lead'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Dynamic Capacity Quick Picker in Header */}
            <div className="hidden sm:flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/15">
              <span className="text-[10px] font-bold text-[#dabed3]">Supply ({minCapacityKw}–{maxCapacityKw} kW):</span>
              {dynamicPresets.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => {
                    if (setCapacityKw) setCapacityKw(kw);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition ${
                    capacityKw === kw
                      ? 'bg-[#f09e38] text-[#241621] shadow-xs'
                      : 'text-white/80 hover:bg-white/20'
                  }`}
                >
                  {kw}kW
                </button>
              ))}
              <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-white/20">
                <input
                  type="number"
                  min={minCapacityKw}
                  max={maxCapacityKw}
                  step="0.5"
                  value={capacityKw}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (setCapacityKw && !isNaN(val)) setCapacityKw(val);
                  }}
                  className="w-12 px-1 py-0.5 rounded bg-white/20 text-white font-mono font-bold text-center text-[10px] outline-none"
                />
                <span className="text-[9px] text-[#dabed3]">kW</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Survey Telemetry Alert Bar if present */}
        {activeSurvey && (
          <div className="px-5 py-2.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200/80 flex items-center justify-between text-[11px] text-emerald-950 shrink-0">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Site Survey Telemetry:{' '}
                <strong className="text-emerald-900 font-black">
                  {activeSurvey.roofType || 'RCC Flat'} Roof
                </strong>{' '}
                • Cable Run: <strong className="font-mono">{activeSurvey.cableDistanceMeters || 25}m</strong>{' '}
                • Recommended Size: <strong className="text-emerald-900">{activeSurvey.recommendedKw || capacityKw} kW</strong>
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200/50 px-2 py-0.5 rounded">
              Verified by Field Crew
            </span>
          </div>
        )}

        {/* Navigation Category Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#EBDCE7] bg-[#FAF6F9] overflow-x-auto shrink-0">
          {[
            { id: 'PANEL', label: '1. Solar PV Panels', icon: Sun, count: panels.length },
            { id: 'INVERTER', label: '2. Inverter', icon: Zap, count: inverters.length },
            { id: 'BATTERY', label: '3. Battery Storage', icon: Battery, count: batteries.length + 1 },
            { id: 'STRUCTURE', label: '4. Structure & Frame', icon: Layers, count: structures.length },
            { id: 'CABLES_BOS', label: '5. Cables & Electrical BOS', icon: ShieldCheck, count: cables.length + bosElectricals.length },
            { id: 'CUSTOM_ITEM', label: '+ Custom Line Item', icon: Plus },
            { id: 'ALL_ITEMS', label: `Summary (${draftLines.length})`, icon: Package, highlight: true },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2.5 rounded-t-xl font-black text-xs flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#714B67] border-t-2 border-x border-[#EBDCE7] border-t-[#f09e38] shadow-xs'
                    : 'text-slate-600 hover:text-[#714B67] hover:bg-white/60'
                } ${tab.highlight ? 'ml-auto text-[#f09e38]' : ''}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#f09e38]' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-[#714B67]/10 text-[#714B67]' : 'bg-slate-200 text-slate-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Main Content Area: 2 Columns (Products Picker + Live Hardware Cart) */}
        <div className="flex-1 grid md:grid-cols-12 overflow-hidden">
          {/* Left Column: Product Selection Grid */}
          <div className="md:col-span-7 p-4 sm:p-5 overflow-y-auto space-y-4 max-h-[58vh]">
            {/* TAB 1: SOLAR PV PANELS */}
            {activeTab === 'PANEL' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EBDCE7]">
                  <div>
                    <h3 className="text-sm font-black text-[#241621] flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-[#f09e38]" /> Choose Solar PV Module Model
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Select high-efficiency Tier-1 PV modules for {capacityKw} kW installation.
                    </p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    25-Year Performance Warranty
                  </span>
                </div>

                <div className="grid gap-3">
                  {panels.map((panel) => {
                    const isSelected = activePanelLine?.productId === panel.id;
                    const recQty = getPanelQtyRecommendation(panel);
                    const currentQty = isSelected ? activePanelLine.quantity : recQty;

                    return (
                      <div
                        key={panel.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#FAF6F9] to-purple-50/50 border-[#714B67] ring-2 ring-[#714B67]/20 shadow-sm'
                            : 'bg-white border-[#EBDCE7] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-[#241621]">
                                {panel.name}
                              </span>
                              {isSelected && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[9px] flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> Selected for Customer
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                SKU: {panel.sku}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">
                                {panel.warrantyYears || 20}-Yr Warranty
                              </span>
                              <span>•</span>
                              <span>
                                {panel.name.includes('550')
                                  ? 'Bi-facial Dual Glass TOPCon'
                                  : panel.name.includes('540')
                                  ? 'Mono PERC Half-Cut Tier-1'
                                  : 'Polycrystalline'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-black text-[#714B67]">
                              ₹{Number(panel.salePrice || 0).toLocaleString()}
                            </div>
                            <span className="text-[10px] text-slate-400">per module</span>
                          </div>
                        </div>

                        {/* Recommendation & Sizing Bar */}
                        <div className="mt-3 pt-3 border-t border-[#EBDCE7]/60 flex flex-wrap items-center justify-between gap-2">
                          <div className="text-[11px] text-slate-600 flex items-center gap-2">
                            <span>Recommended count for {capacityKw}kW:</span>
                            <span className="font-black text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded">
                              {recQty} Modules
                            </span>
                            <span className="text-[10px] text-slate-400">
                              (~{(recQty * (panel.name.includes('550') ? 550 : panel.name.includes('540') ? 540 : 330) / 1000).toFixed(2)} kWp)
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSelectPanel(panel, recQty)}
                              className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1 ${
                                isSelected
                                  ? 'bg-[#714B67] text-white shadow-xs'
                                  : 'bg-gradient-to-r from-[#f09e38] to-[#e08920] hover:opacity-95 text-[#241621] shadow-xs'
                              }`}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> Active in Proposal
                                </>
                              ) : (
                                <>
                                  <Wand2 className="w-3.5 h-3.5" /> Select this Panel
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: SOLAR INVERTERS */}
            {activeTab === 'INVERTER' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EBDCE7]">
                  <div>
                    <h3 className="text-sm font-black text-[#241621] flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-[#f09e38]" /> Select Inverter & Power Unit
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Grid-tied string inverters, hybrid bidirectional or pure sine wave units.
                    </p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    5-Year Inverter Warranty
                  </span>
                </div>

                <div className="grid gap-3">
                  {inverters.map((inv) => {
                    const isSelected = activeInverterLine?.productId === inv.id;

                    return (
                      <div
                        key={inv.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#FAF6F9] to-purple-50/50 border-[#714B67] ring-2 ring-[#714B67]/20 shadow-sm'
                            : 'bg-white border-[#EBDCE7] hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-[#241621]">
                                {inv.name}
                              </span>
                              {isSelected && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[9px] flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> Active Inverter
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                SKU: {inv.sku}
                              </span>
                              <span>•</span>
                              <span className="text-emerald-700 font-bold">
                                {inv.warrantyYears || 5}-Yr Warranty
                              </span>
                              <span>•</span>
                              <span className="font-bold text-[#714B67]">
                                {inv.name.includes('Hybrid')
                                  ? 'Battery & Grid Hybrid'
                                  : inv.name.includes('Off-Grid')
                                  ? 'Off-Grid Backup'
                                  : 'On-Grid Net Metering'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-sm font-black text-[#714B67]">
                              ₹{Number(inv.salePrice || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[#EBDCE7]/60 flex items-center justify-between">
                          <span className="text-[11px] text-slate-600">
                            Efficiency: <strong>98.4%</strong> • Dual MPPT Trackers
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectInverter(inv)}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? 'bg-[#714B67] text-white shadow-xs'
                                : 'bg-gradient-to-r from-[#f09e38] to-[#e08920] hover:opacity-95 text-[#241621] shadow-xs'
                            }`}
                          >
                            {isSelected ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Current Inverter
                              </>
                            ) : (
                              'Select this Inverter'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: BATTERY STORAGE */}
            {activeTab === 'BATTERY' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EBDCE7]">
                  <div>
                    <h3 className="text-sm font-black text-[#241621] flex items-center gap-1.5">
                      <Battery className="w-4 h-4 text-[#f09e38]" /> Battery Storage (Optional)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Add power backup storage for off-grid or hybrid residential installations.
                    </p>
                  </div>
                </div>

                {/* Option 0: No Battery (Standard On-Grid) */}
                <div
                  className={`p-3.5 rounded-2xl border transition-all ${
                    !activeBatteryLine
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/20'
                      : 'bg-white border-[#EBDCE7]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-extrabold text-xs text-[#241621]">
                        No Battery (Standard On-Grid Net Metering)
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Exports surplus generation directly to DISCOM grid without local storage cost.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectBattery(null)}
                      className={`px-3 py-1.5 rounded-xl font-black text-xs cursor-pointer ${
                        !activeBatteryLine
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {!activeBatteryLine ? '✓ Active Option' : 'Select No Battery'}
                    </button>
                  </div>
                </div>

                {batteries.map((bat) => {
                  const isSelected = activeBatteryLine?.productId === bat.id;

                  return (
                    <div
                      key={bat.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#FAF6F9] to-purple-50/50 border-[#714B67] ring-2 ring-[#714B67]/20 shadow-sm'
                          : 'bg-white border-[#EBDCE7]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="font-extrabold text-xs text-[#241621]">
                            {bat.name}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                              SKU: {bat.sku}
                            </span>
                            <span>•</span>
                            <span className="text-emerald-700 font-bold">
                              {bat.warrantyYears || 3}-Yr Warranty
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-black text-[#714B67]">
                            ₹{Number(bat.salePrice || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-[#EBDCE7]/60 flex items-center justify-between">
                        <span className="text-[11px] text-slate-600">
                          {bat.name.includes('Lithium')
                            ? '6000 Cycles @ 80% DOD • BMS Protection'
                            : 'C10 Tubular Deep Cycle'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSelectBattery(bat, 1)}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-[#714B67] text-white'
                              : 'bg-gradient-to-r from-[#f09e38] to-[#e08920] text-[#241621]'
                          }`}
                        >
                          {isSelected ? '✓ Selected' : 'Add this Battery'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 4: STRUCTURE & FRAMES */}
            {activeTab === 'STRUCTURE' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EBDCE7]">
                  <div>
                    <h3 className="text-sm font-black text-[#241621] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-[#f09e38]" /> Mounting Structure & Framing
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Select structure according to customer rooftop accessibility and wind speed requirements.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {structures.map((str) => {
                    const isSelected = activeStructureLine?.productId === str.id;

                    return (
                      <div
                        key={str.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#FAF6F9] to-purple-50/50 border-[#714B67] ring-2 ring-[#714B67]/20 shadow-sm'
                            : 'bg-white border-[#EBDCE7]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="font-extrabold text-xs text-[#241621]">
                              {str.name}
                            </span>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {str.name.includes('Elevated')
                                ? '8ft+ Clearance: Keeps rooftop 100% usable for terrace activities & gardens'
                                : 'Standard 15°–20° south-facing tilt structure with anchor fasteners'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-[#714B67]">
                              ₹{Number(str.salePrice || 0).toLocaleString()}
                            </div>
                            <span className="text-[9px] text-slate-400">per kW</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[#EBDCE7]/60 flex items-center justify-between">
                          <span className="text-[11px] text-slate-600">
                            Total for {capacityKw} kW:{' '}
                            <strong className="text-[#714B67]">
                              ₹{(Number(str.salePrice || 0) * capacityKw).toLocaleString()}
                            </strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSelectStructure(str)}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#714B67] text-white'
                                : 'bg-gradient-to-r from-[#f09e38] to-[#e08920] text-[#241621]'
                            }`}
                          >
                            {isSelected ? '✓ Current Structure' : 'Select Structure'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 5: CABLES & BOS */}
            {activeTab === 'CABLES_BOS' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#EBDCE7]">
                  <div>
                    <h3 className="text-sm font-black text-[#241621] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#f09e38]" /> Cables & Electrical Protection (BOS)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      TUV certified DC/AC cables, surge distribution boxes, lightning arrestor & earthing.
                    </p>
                  </div>
                </div>

                <div className="grid gap-2.5">
                  {[...cables, ...bosElectricals].map((item) => {
                    const line = findLineByProductId(item.id);
                    const isInProposal = !!line;

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                          isInProposal
                            ? 'bg-purple-50/40 border-[#714B67]/40'
                            : 'bg-white border-[#EBDCE7]'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-xs text-[#241621]">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-2">
                            <span className="font-mono bg-slate-100 px-1 py-0.2 rounded">
                              {item.sku}
                            </span>
                            <span>•</span>
                            <span className="font-bold text-[#714B67]">
                              ₹{Number(item.salePrice || 0).toLocaleString()}
                            </span>
                            {isInProposal && (
                              <span className="text-emerald-700 font-black">
                                (Qty: {line.quantity})
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleToggleProduct(
                              item,
                              item.category === 'CABLE'
                                ? activeSurvey?.cableDistanceMeters || 25
                                : 1
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                            isInProposal
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-[#714B67] hover:bg-[#855278] text-white'
                          }`}
                        >
                          {isInProposal ? 'Remove' : '+ Add to Proposal'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 6: CUSTOM ONE-OFF ITEM */}
            {activeTab === 'CUSTOM_ITEM' && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-[#EBDCE7]">
                  <h3 className="text-sm font-black text-[#241621] flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[#f09e38]" /> Add Custom Product / Service Line
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add customer-specific requirements like elevated walkway, tree trimming, waterproofing, or specialized meters.
                  </p>
                </div>

                <form onSubmit={handleAddCustomLine} className="p-4 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-3">
                  <div>
                    <label className="font-extrabold text-[#241621] block mb-1">
                      Component / Service Description *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3-Meter Heavy Duty GI Terrace Walkway & Handrail"
                      value={customDesc}
                      onChange={(e) => setCustomDesc(e.target.value)}
                      required
                      className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-semibold text-xs outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-extrabold text-[#241621] block mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={customQty}
                        onChange={(e) => setCustomQty(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-[#EBDCE7] bg-white font-bold text-xs outline-none text-right"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-[#241621] block mb-1">Unit Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={customPrice}
                        onChange={(e) => setCustomPrice(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-[#EBDCE7] bg-white font-bold text-xs outline-none text-right text-[#714B67]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-[#714B67] to-[#8a5d7e] hover:opacity-95 text-white font-black rounded-xl text-xs shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add Item to Proposal
                  </button>
                </form>
              </div>
            )}

            {/* TAB 7: ALL ITEMS SUMMARY */}
            {activeTab === 'ALL_ITEMS' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#EBDCE7]">
                  <h3 className="text-sm font-black text-[#241621] flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-[#714B67]" /> Bill of Materials Sizing Review ({draftLines.length} items)
                  </h3>
                </div>

                <div className="space-y-2">
                  {draftLines.map((line, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-[#EBDCE7] bg-white hover:bg-[#FAF6F9] transition flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-[#241621]">{line.description}</div>
                        <div className="text-[10px] text-slate-500">
                          {line.quantity} units × ₹{Number(line.unitPrice || 0).toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-black text-[#714B67] text-xs">
                          ₹{Number(line.lineTotal || 0).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftLine(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Live Proposal Preview & Financial Summary */}
          <div className="md:col-span-5 bg-[#FAF6F9] border-t md:border-t-0 md:border-l border-[#EBDCE7] p-4 sm:p-5 flex flex-col justify-between overflow-y-auto max-h-[58vh]">
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#EBDCE7]">
                <span className="font-black text-xs text-[#241621] uppercase tracking-wider">
                  Configured Proposal
                </span>
                <span className="text-[10px] font-bold text-[#714B67] bg-[#714B67]/10 px-2 py-0.5 rounded">
                  {draftLines.length} Components
                </span>
              </div>

              {/* Mini Item List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {draftLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-white border border-[#EBDCE7] flex items-center justify-between text-[11px]"
                  >
                    <div className="truncate flex-1 pr-2">
                      <span className="font-bold text-[#241621] block truncate">
                        {line.description}
                      </span>
                      <span className="text-[9px] text-slate-500">
                        Qty: {line.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-extrabold text-[#714B67]">
                        ₹{Number(line.lineTotal || 0).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftLine(idx)}
                        className="text-slate-300 hover:text-rose-600 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Box */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Hardware Subtotal (excl. GST):</span>
                  <span className="font-bold font-mono">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>GST (18%):</span>
                  <span className="font-bold font-mono text-slate-700">₹{gstAmount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[#241621] font-black border-t border-[#EBDCE7] pt-1.5">
                  <span>Gross Quotation Amount:</span>
                  <span className="font-black font-mono text-sm text-[#714B67]">
                    ₹{grandTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg">
                  <span className="font-bold">PM Surya Ghar Subsidy:</span>
                  <span className="font-black font-mono">-₹{centralSubsidy.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[#241621] bg-gradient-to-r from-purple-50 to-pink-50 p-2 rounded-xl border border-purple-200">
                  <span className="font-extrabold text-[#714B67]">Net Customer Payable:</span>
                  <span className="font-black text-sm text-emerald-700 font-mono">
                    ₹{netPayable.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Save as Template Option & Action Buttons */}
            <div className="space-y-3 pt-3 border-t border-[#EBDCE7]">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="rounded border-[#EBDCE7] text-[#714B67] focus:ring-[#714B67]"
                  />
                  <span className="font-extrabold text-[#241621] text-[11px]">
                    Save this configuration as reusable Package Template
                  </span>
                </label>

                {saveAsTemplate && (
                  <input
                    type="text"
                    value={customTemplateName}
                    onChange={(e) => setCustomTemplateName(e.target.value)}
                    placeholder="e.g. Customized 3kW Mono-PERC - Ravi Kumar"
                    className="w-full p-2 rounded-xl border border-[#EBDCE7] bg-white font-bold text-xs outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-[#EBDCE7] font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-[#f09e38] via-[#e08920] to-[#d4821a] hover:opacity-95 text-[#241621] font-black text-xs shadow-md shadow-[#f09e38]/25 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Apply to Customer Quote</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

