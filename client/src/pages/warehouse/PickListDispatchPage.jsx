import React, { useState, useEffect, useRef } from 'react';
import { dispatchApi, warehousesApi, inventoryApi } from '../../api';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  Boxes,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Truck,
  Scan,
  ShieldCheck,
  X,
  Keyboard,
  Barcode,
  Sparkles,
  Zap,
  PackageCheck,
  Layers,
  Building2,
  MapPin,
  Plus,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  Search,
  Check,
  Phone,
  User,
  SlidersHorizontal,
} from 'lucide-react';

export default function PickListDispatchPage({ defaultTab = 'dispatch' }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // 'dispatch' | 'warehouses' | 'stock'

  // Pick lists states
  const [pickLists, setPickLists] = useState([]);
  const [selectedPickList, setSelectedPickList] = useState(null);
  const [loading, setLoading] = useState(true);

  // Warehouses states
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedWarehouseDetail, setSelectedWarehouseDetail] = useState(null);
  const [warehouseStockList, setWarehouseStockList] = useState([]);
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [loadingStock, setLoadingStock] = useState(false);

  // Scanning states
  const [scannedSerial, setScannedSerial] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanMessage, setScanMessage] = useState({ type: '', text: '' });
  const [validationError, setValidationError] = useState(null);
  const scannerRef = useRef(null);

  // Modal states: Create Warehouse
  const [showCreateWarehouseModal, setShowCreateWarehouseModal] = useState(false);
  const [newWhName, setNewWhName] = useState('');
  const [newWhCode, setNewWhCode] = useState('');
  const [newWhCity, setNewWhCity] = useState('');
  const [newWhZone, setNewWhZone] = useState('');
  const [newWhAddress, setNewWhAddress] = useState('');
  const [newWhContact, setNewWhContact] = useState('');
  const [newWhPhone, setNewWhPhone] = useState('');
  const [createWhSubmitting, setCreateWhSubmitting] = useState(false);
  const [createWhError, setCreateWhError] = useState('');

  // Modal states: Add / Adjust Stock
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockTargetProduct, setStockTargetProduct] = useState(null);
  const [stockQtyInput, setStockQtyInput] = useState(10);
  const [stockOperation, setStockOperation] = useState('ADD'); // 'ADD' | 'SET'
  const [stockNotes, setStockNotes] = useState('');
  const [stockSubmitting, setStockSubmitting] = useState(false);

  // Load Pick Lists & Warehouses
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [plRes, whRes] = await Promise.all([
        dispatchApi.listPickLists(),
        warehousesApi.list(),
      ]);
      const plData = plRes.data?.data || [];
      const whData = whRes.data?.data || [];

      setPickLists(plData);
      setWarehouses(whData);

      if (whData.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(whData[0].id);
      }

      if (plData.length > 0) {
        loadDetail(plData[0].id);
      }
    } catch (err) {
      console.error('Failed to load initial dispatch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPickLists = async () => {
    try {
      const res = await dispatchApi.listPickLists();
      setPickLists(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await warehousesApi.list();
      setWarehouses(res.data?.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDetail = async (id) => {
    try {
      const res = await dispatchApi.getPickList(id);
      const pl = res.data?.data;
      setSelectedPickList(pl);
      setValidationError(null);
      setScanMessage({ type: '', text: '' });

      // Auto-select first serial tracked item
      const trackedLine = (pl?.lines || []).find((l) => l.product?.isSerialTracked);
      if (trackedLine) setSelectedProductId(trackedLine.productId);
    } catch (err) {
      console.error('Failed to load pick list detail:', err);
    }
  };

  const loadWarehouseStock = async (whId) => {
    if (!whId) return;
    try {
      setLoadingStock(true);
      const [detailRes, stockRes] = await Promise.all([
        warehousesApi.get(whId),
        warehousesApi.getStock(whId, { search: stockSearch }),
      ]);
      setSelectedWarehouseDetail(detailRes.data?.data);
      setWarehouseStockList(stockRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load warehouse stock:', err);
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedWarehouseId) {
      loadWarehouseStock(selectedWarehouseId);
    }
  }, [selectedWarehouseId, stockSearch]);

  // HTML5 Barcode/QR Camera Scanner Setup
  useEffect(() => {
    if (scannerActive) {
      const scanner = new Html5QrcodeScanner('reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      });
      scanner.render(
        (decodedText) => {
          setScannedSerial(decodedText);
          handleScanSubmit(decodedText);
          scanner.clear();
          setScannerActive(false);
        },
        () => {
          // ignore stream scanning frames
        }
      );
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [scannerActive, selectedProductId, selectedPickList]);

  // Check if currently selected product has stock in the assigned warehouse
  const currentSelectedLine = (selectedPickList?.lines || []).find(
    (l) => l.productId === selectedProductId
  );
  const currentLineStockQty = currentSelectedLine?.warehouseStockQty ?? 0;
  const isSelectedLineOutOfStock = currentSelectedLine ? currentLineStockQty <= 0 : false;

  const handleScanSubmit = async (serialToScan = scannedSerial) => {
    if (!serialToScan || !selectedProductId) {
      alert('Please enter or scan a serial number and select a product.');
      return;
    }

    // Client-side guard for immediate feedback
    if (isSelectedLineOutOfStock) {
      const whName = selectedPickList?.warehouse?.name || 'Assigned Warehouse';
      const whCityZone = selectedPickList?.warehouse
        ? `${selectedPickList.warehouse.city} - ${selectedPickList.warehouse.zone}`
        : '';
      setScanMessage({
        type: 'error',
        text: `⛔ CANNOT PICK: Product '${currentSelectedLine?.product?.name}' is NOT PRESENT in warehouse '${whName}' (${whCityZone}). Available: 0 units.`,
      });
      return;
    }

    try {
      const res = await dispatchApi.scanSerial({
        orderId: selectedPickList.orderId,
        productId: selectedProductId,
        serial: serialToScan.trim(),
      });

      setScanMessage({
        type: 'success',
        text: `✓ Serial ${res.data?.data?.serial} scanned and verified from ${selectedPickList?.warehouse?.name || 'warehouse'}!`,
      });
      setScannedSerial('');
      loadDetail(selectedPickList.id);
      loadPickLists();
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to scan serial number.',
      });
    }
  };

  // Quick 1-click test barcode generator for demo speed
  const handleQuickDemoScan = () => {
    if (!selectedProductId) return;
    if (isSelectedLineOutOfStock) {
      alert(
        `Cannot pick: Product is out of stock in warehouse '${selectedPickList?.warehouse?.name}' (${selectedPickList?.warehouse?.city} - ${selectedPickList?.warehouse?.zone}). Available stock: 0.`
      );
      return;
    }
    const trackedLine = (selectedPickList?.lines || []).find((l) => l.productId === selectedProductId);
    const sku = trackedLine?.product?.sku || 'GEN';
    const randomSerial = `${sku}-DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
    setScannedSerial(randomSerial);
    handleScanSubmit(randomSerial);
  };

  // Pick Non-Serial Item
  const handlePickNonSerialItem = async (line) => {
    if (line.warehouseStockQty <= 0) {
      alert(
        `Cannot pick: Stock is not present in warehouse '${selectedPickList?.warehouse?.name}' (${selectedPickList?.warehouse?.city} - ${selectedPickList?.warehouse?.zone}). Available: 0 units.`
      );
      return;
    }

    try {
      await dispatchApi.pickItem(selectedPickList.id, {
        pickLineId: line.id,
        quantity: 1,
      });
      loadDetail(selectedPickList.id);
      loadPickLists();
    } catch (err) {
      alert('Picking failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Change Warehouse on PickList
  const handleChangePickListWarehouse = async (warehouseId) => {
    try {
      const res = await dispatchApi.assignWarehouse(selectedPickList.id, warehouseId);
      alert(res.data?.message || 'Warehouse updated for pick list.');
      loadDetail(selectedPickList.id);
      loadPickLists();
    } catch (err) {
      alert('Failed to change warehouse: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleValidateDelivery = async () => {
    setValidationError(null);
    try {
      const res = await dispatchApi.validateDelivery(selectedPickList.orderId, {
        deliveredTo: selectedPickList.order?.customer?.name,
        notes: `Warehouse materials validated & dispatched to site from ${selectedPickList.warehouse?.name || 'warehouse'}.`,
      });

      alert(
        `Delivery validated successfully! ${res.data?.data?.warrantiesCreatedCount} active warranties generated. Stock deducted from warehouse.`
      );
      loadDetail(selectedPickList.id);
      loadPickLists();
      loadWarehouses();
      if (selectedWarehouseId) loadWarehouseStock(selectedWarehouseId);
    } catch (err) {
      if (err.response?.data?.missing) {
        setValidationError(err.response.data);
      } else {
        alert('Validation failed: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // Create Warehouse Submit
  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    setCreateWhSubmitting(true);
    setCreateWhError('');
    try {
      const res = await warehousesApi.create({
        name: newWhName,
        code: newWhCode,
        city: newWhCity,
        zone: newWhZone,
        address: newWhAddress,
        contactPerson: newWhContact,
        phone: newWhPhone,
      });

      alert(res.data?.message || 'Warehouse created successfully!');
      setShowCreateWarehouseModal(false);
      // Reset form
      setNewWhName('');
      setNewWhCode('');
      setNewWhCity('');
      setNewWhZone('');
      setNewWhAddress('');
      setNewWhContact('');
      setNewWhPhone('');

      loadWarehouses();
      if (res.data?.data?.id) {
        setSelectedWarehouseId(res.data.data.id);
      }
    } catch (err) {
      setCreateWhError(err.response?.data?.message || err.message);
    } finally {
      setCreateWhSubmitting(false);
    }
  };

  // Add / Adjust Stock Submit
  const handleStockUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!stockTargetProduct || !selectedWarehouseId) return;

    setStockSubmitting(true);
    try {
      const res = await warehousesApi.addOrAdjustStock(selectedWarehouseId, {
        productId: stockTargetProduct.productId,
        quantity: Number(stockQtyInput),
        operation: stockOperation,
        notes: stockNotes || undefined,
      });

      alert(res.data?.message || 'Stock updated successfully!');
      setShowStockModal(false);
      setStockNotes('');
      loadWarehouseStock(selectedWarehouseId);
      loadWarehouses();
      if (selectedPickList) loadDetail(selectedPickList.id);
    } catch (err) {
      alert('Failed to update stock: ' + (err.response?.data?.message || err.message));
    } finally {
      setStockSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Calculate overall serial scan fulfillment progress
  const totalSerialRequired = (selectedPickList?.lines || []).reduce(
    (sum, l) => (l.product?.isSerialTracked ? sum + Number(l.requiredQty) : sum),
    0
  );
  const totalSerialScanned = (selectedPickList?.order?.serialNumbers || []).length;
  const scanProgressPercent =
    totalSerialRequired > 0
      ? Math.min(100, Math.round((totalSerialScanned / totalSerialRequired) * 100))
      : 100;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">
              Warehouse &amp; Multi-Zone Stock Management
            </h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Unique City &amp; Zone identification • Real-time warehouse inventory • Strict stock availability check on picking
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-[#F5EDF3] p-1 rounded-xl border border-[#EBDCE7] self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dispatch')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dispatch'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-[#714B67] hover:bg-white/60'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" /> Material Picking &amp; Scanner
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('warehouses')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'warehouses'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-[#714B67] hover:bg-white/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Multi-Zone Warehouses ({warehouses.length})
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: MATERIAL PICKING & SERIAL SCAN TERMINAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'dispatch' && (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left 4 cols: Pick List Queue */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-[#241621] flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#714B67]" /> Active Pick Lists ({pickLists.length})
              </h2>
              <span className="text-[11px] font-bold text-[#b886ad]">Rule 4 Generated</span>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[78vh] pr-1">
              {pickLists.map((p) => {
                const isSelected = selectedPickList?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => loadDetail(p.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#F5EDF3] to-white border-[#714B67] shadow-md ring-2 ring-[#714B67]/20'
                        : 'bg-white border-[#EBDCE7] hover:border-[#b886ad]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-xs text-[#714B67] font-mono">{p.pickNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs font-extrabold text-[#241621] truncate">{p.order?.customer?.name}</p>

                    {/* Assigned Warehouse Badge */}
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#714B67] font-semibold">
                      <Building2 className="w-3 h-3 text-[#f09e38] shrink-0" />
                      <span className="truncate">
                        {p.warehouse ? `${p.warehouse.city} (${p.warehouse.zone})` : 'Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                      <span>Order: {p.order?.orderNumber}</span>
                      <span className="font-bold text-[#714B67]">{p.order?.capacityKw} kW</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 8 cols: Active Pick List Detail & Serial Scan Terminal */}
          {selectedPickList && (
            <div className="lg:col-span-8 space-y-5">
              {/* Pick List Detail Card */}
              <div className="p-6 odoo-glass-card rounded-2xl space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBDCE7]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-[#241621]">{selectedPickList.pickNumber}</h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f09e38]/15 text-[#d4821a] font-extrabold border border-[#f09e38]/30">
                        Site Dispatch
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Order Ref: <span className="font-bold text-[#714B67]">{selectedPickList.order?.orderNumber}</span>{' '}
                      | Client: <span className="font-bold text-[#241621]">{selectedPickList.order?.customer?.name}</span>{' '}
                      {selectedPickList.order?.customer?.city && (
                        <span className="text-[#714B67]">({selectedPickList.order.customer.city})</span>
                      )}
                    </p>
                  </div>

                  {selectedPickList.status !== 'COMPLETED' && (
                    <button
                      onClick={handleValidateDelivery}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-[#714B67]/30 transition-all cursor-pointer"
                    >
                      <Truck className="w-4 h-4 text-[#f09e38]" /> Validate Delivery (Rule 5 &amp; 6)
                    </button>
                  )}
                </div>

                {/* Warehouse Location & Reassignment Bar */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#F5EDF3] to-[#FAF6F9] border border-[#EBDCE7] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#714B67] text-[#f09e38] flex items-center justify-center shrink-0 shadow-xs">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#714B67] block tracking-wide">
                        Assigned Fulfillment Warehouse
                      </span>
                      <span className="font-extrabold text-[#241621]">
                        {selectedPickList.warehouse
                          ? `${selectedPickList.warehouse.name} [City: ${selectedPickList.warehouse.city} | Zone: ${selectedPickList.warehouse.zone}]`
                          : 'No Warehouse Assigned'}
                      </span>
                    </div>
                  </div>

                  {/* Switch Warehouse Dropdown */}
                  {selectedPickList.status !== 'COMPLETED' && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Switch Warehouse:</span>
                      <select
                        value={selectedPickList.warehouseId || ''}
                        onChange={(e) => handleChangePickListWarehouse(e.target.value)}
                        className="p-1.5 text-xs font-semibold rounded-lg border border-[#EBDCE7] bg-white text-[#241621] outline-none cursor-pointer"
                      >
                        {warehouses.map((wh) => (
                          <option key={wh.id} value={wh.id}>
                            {wh.city} ({wh.zone}) - {wh.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Progress bar for serial fulfillment */}
                <div className="p-4 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-[#241621] flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-[#714B67]" /> Serial Scan Fulfillment
                    </span>
                    <span className="font-mono font-black text-[#714B67]">
                      {totalSerialScanned} / {totalSerialRequired} Serials ({scanProgressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#EBDCE7] h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#f09e38] to-[#10b981] transition-all duration-300"
                      style={{ width: `${scanProgressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Missing Serials Warning Banner */}
                {validationError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-2.5">
                    <div className="flex items-center gap-2 font-black text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      {validationError.message}
                    </div>
                    <ul className="list-disc pl-5 space-y-1 text-rose-900 font-bold text-[11px]">
                      {validationError.missing?.map((m) => (
                        <li key={m.productId}>
                          {m.productName} ({m.sku}): Needs {m.required}, Scanned {m.scanned} (Deficit: {m.missingCount})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Equipment Manifest & Warehouse Stock Verification Table */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-black text-[#714B67] uppercase tracking-wider">
                      Equipment Manifest &amp; Warehouse Stock Verification
                    </h3>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      Stock in {selectedPickList.warehouse?.city || 'Warehouse'} ({selectedPickList.warehouse?.zone || 'Zone'})
                    </span>
                  </div>

                  <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
                    <div className="bg-[#F5EDF3] p-2.5 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                      <div className="col-span-4">Component / SKU</div>
                      <div className="col-span-2 text-center">Tracking</div>
                      <div className="col-span-2 text-center">Warehouse Stock</div>
                      <div className="col-span-2 text-right">Required</div>
                      <div className="col-span-2 text-right">Picked / Scanned</div>
                    </div>

                    {selectedPickList.lines?.map((line) => {
                      const scannedForLine = (selectedPickList.order?.serialNumbers || []).filter(
                        (sn) => sn.productId === line.productId
                      ).length;
                      const effectivePicked = line.product?.isSerialTracked
                        ? scannedForLine
                        : Number(line.pickedQty || 0);
                      const isFullyPicked = effectivePicked >= Number(line.requiredQty);
                      const stockAvailable = line.warehouseStockQty ?? 0;
                      const isOutOfStock = stockAvailable <= 0;
                      const isStockDeficient = stockAvailable < Number(line.requiredQty);

                      return (
                        <div
                          key={line.id}
                          className={`p-3 grid grid-cols-12 items-center hover:bg-[#FAF6F9] transition-colors ${
                            isOutOfStock ? 'bg-rose-50/40' : ''
                          }`}
                        >
                          <div className="col-span-4 font-extrabold text-[#241621] truncate">
                            {line.product?.name}
                            <span className="block text-[10px] font-mono text-slate-400 font-normal">
                              {line.product?.sku}
                            </span>
                          </div>

                          <div className="col-span-2 text-center">
                            {line.product?.isSerialTracked ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#F5EDF3] text-[#714B67] border border-[#dabed3]">
                                Serial Tracked
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-slate-500">Bulk Qty</span>
                            )}
                          </div>

                          {/* Warehouse Available Stock Badge */}
                          <div className="col-span-2 text-center">
                            {isOutOfStock ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-black border border-rose-200">
                                <ShieldAlert className="w-3 h-3" /> 0 (Out of Stock)
                              </span>
                            ) : isStockDeficient ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                                {stockAvailable} avail. (Low)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-200">
                                <Check className="w-3 h-3" /> {stockAvailable} In Stock
                              </span>
                            )}
                          </div>

                          <div className="col-span-2 text-right font-bold text-slate-700">
                            {Number(line.requiredQty)}
                          </div>

                          <div className="col-span-2 text-right font-black">
                            {line.product?.isSerialTracked ? (
                              <span className={isFullyPicked ? 'text-emerald-600' : 'text-[#f09e38]'}>
                                {effectivePicked} / {Number(line.requiredQty)}
                              </span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <span className={isFullyPicked ? 'text-emerald-600' : 'text-slate-700'}>
                                  {effectivePicked} / {Number(line.requiredQty)}
                                </span>
                                {selectedPickList.status !== 'COMPLETED' && !isFullyPicked && (
                                  <button
                                    type="button"
                                    onClick={() => handlePickNonSerialItem(line)}
                                    disabled={isOutOfStock}
                                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded shadow-2xs transition cursor-pointer ${
                                      isOutOfStock
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-[#714B67] text-white hover:bg-[#5b3c53]'
                                    }`}
                                    title={isOutOfStock ? 'Cannot pick: stock not present in warehouse' : 'Pick 1 unit'}
                                  >
                                    + Pick
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Serial Scanning Terminal Station */}
                {selectedPickList.status !== 'COMPLETED' && (
                  <div className="p-5 bg-gradient-to-br from-[#241621] to-[#382433] text-white rounded-2xl shadow-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-[#dabed3] flex items-center gap-2">
                        <Scan className="w-4 h-4 text-[#f09e38] animate-pulse" /> Serial Barcode Scanner Terminal
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleQuickDemoScan}
                          disabled={isSelectedLineOutOfStock}
                          className={`px-3 py-1 rounded-lg text-xs font-black transition shadow-xs flex items-center gap-1 ${
                            isSelectedLineOutOfStock
                              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                              : 'bg-[#f09e38] hover:bg-[#d4821a] text-[#241621] cursor-pointer'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5" /> 1-Click Demo Scan
                        </button>

                        <button
                          type="button"
                          onClick={() => setScannerActive(!scannerActive)}
                          className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                            scannerActive
                              ? 'bg-rose-500 text-white hover:bg-rose-600'
                              : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5 text-[#f09e38]" />
                          {scannerActive ? 'Stop Camera' : 'Camera Scanner'}
                        </button>
                      </div>
                    </div>

                    {/* OUT OF STOCK BLOCKING BANNER */}
                    {isSelectedLineOutOfStock && (
                      <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>
                          CANNOT PICK: '{currentSelectedLine?.product?.name}' is NOT PRESENT in warehouse '
                          {selectedPickList?.warehouse?.name}' ({selectedPickList?.warehouse?.city} -{' '}
                          {selectedPickList?.warehouse?.zone}). Available stock: 0. Inward stock before picking.
                        </span>
                      </div>
                    )}

                    {/* Camera Scanner Viewport */}
                    {scannerActive && (
                      <div className="p-3 bg-white rounded-xl border border-slate-300 relative overflow-hidden">
                        <div className="scanner-laser absolute inset-x-0 h-1 bg-red-500 shadow-lg shadow-red-500/80 z-10 pointer-events-none"></div>
                        <div id="reader" className="w-full text-slate-800"></div>
                      </div>
                    )}

                    {/* Scanner Input Controls */}
                    <div className="grid sm:grid-cols-12 gap-3 text-xs">
                      <div className="sm:col-span-5">
                        <label className="text-[11px] text-[#dabed3] font-bold mb-1 block">Component to Verify</label>
                        <select
                          value={selectedProductId}
                          onChange={(e) => setSelectedProductId(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-white/20 bg-[#1A0F17] text-white font-semibold outline-none focus:ring-2 focus:ring-[#f09e38]"
                        >
                          {selectedPickList.lines
                            ?.filter((l) => l.product?.isSerialTracked)
                            .map((l) => (
                              <option key={l.productId} value={l.productId}>
                                {l.product?.name} ({l.product?.sku}) — Stock: {l.warehouseStockQty ?? 0}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="sm:col-span-5">
                        <label className="text-[11px] text-[#dabed3] font-bold mb-1 block">Serial Barcode String</label>
                        <input
                          type="text"
                          value={scannedSerial}
                          onChange={(e) => setScannedSerial(e.target.value)}
                          placeholder="e.g. INV3K-SN-1029 or scan..."
                          disabled={isSelectedLineOutOfStock}
                          className="w-full p-2.5 rounded-xl border border-white/20 bg-[#1A0F17] text-white font-mono text-xs outline-none focus:ring-2 focus:ring-[#f09e38] disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-end">
                        <button
                          type="button"
                          onClick={() => handleScanSubmit()}
                          disabled={isSelectedLineOutOfStock}
                          className={`w-full py-2.5 rounded-xl text-xs font-black shadow-md transition-all ${
                            isSelectedLineOutOfStock
                              ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] cursor-pointer hover:opacity-95'
                          }`}
                        >
                          Verify
                        </button>
                      </div>
                    </div>

                    {scanMessage.text && (
                      <div
                        className={`p-2.5 rounded-xl text-xs font-bold ${
                          scanMessage.type === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {scanMessage.text}
                      </div>
                    )}
                  </div>
                )}

                {/* Scanned Serials Grid */}
                <div>
                  <h3 className="text-xs font-black text-[#241621] uppercase tracking-wider mb-2.5">
                    Verified Serial Units ({selectedPickList.order?.serialNumbers?.length || 0})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(selectedPickList.order?.serialNumbers || []).map((sn) => (
                      <span
                        key={sn.id}
                        className="px-3 py-1.5 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] text-[#241621] text-xs font-mono font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {sn.serial} <span className="text-[10px] text-[#714B67] font-sans">({sn.product?.sku})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: MULTI-ZONE WAREHOUSES & STOCK MANAGEMENT */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'warehouses' && (
        <div className="space-y-6">
          {/* Top Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#714B67]" />
              <div>
                <h2 className="text-base font-black text-[#241621]">
                  Warehouses Identified Uniquely by City &amp; Zone
                </h2>
                <p className="text-xs text-slate-500">
                  Manage multiple warehouses across cities and regional zones, with dedicated stock inventory.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateWarehouseModal(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#714B67]/20 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4 text-[#f09e38]" /> Add New Warehouse (City + Zone)
            </button>
          </div>

          {/* Warehouses Grid Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            {warehouses.map((wh) => {
              const isSelected = selectedWarehouseId === wh.id;
              return (
                <div
                  key={wh.id}
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-br from-[#F5EDF3] to-white border-[#714B67] shadow-md ring-2 ring-[#714B67]/30'
                      : 'bg-white border-[#EBDCE7] hover:border-[#b886ad]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-black text-sm text-[#241621]">{wh.name}</h3>
                      <span className="text-[10px] font-mono font-bold text-[#714B67]">{wh.code}</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        wh.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {wh.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Unique City & Zone Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 my-2.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#714B67]/10 text-[#714B67] text-[11px] font-black flex items-center gap-1 border border-[#714B67]/20">
                      <MapPin className="w-3 h-3 text-[#f09e38]" /> City: {wh.city}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#f09e38]/15 text-[#d4821a] text-[11px] font-black border border-[#f09e38]/30">
                      Zone: {wh.zone}
                    </span>
                  </div>

                  {wh.address && (
                    <p className="text-[11px] text-slate-500 line-clamp-1 mb-2">{wh.address}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#EBDCE7] text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">SKUs in Stock</span>
                      <span className="font-black text-[#241621]">
                        {wh.inStockSkuCount || 0} / {wh.totalSkuCount || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Total Stock Units</span>
                      <span className="font-black text-[#714B67]">{wh.totalUnits || 0}</span>
                    </div>
                  </div>

                  {wh.contactPerson && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" /> {wh.contactPerson}
                      </span>
                      {wh.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {wh.phone}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stock Table for Selected Warehouse */}
          {selectedWarehouseDetail && (
            <div className="odoo-glass-card p-6 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
                <div>
                  <h3 className="text-base font-black text-[#241621] flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[#714B67]" />
                    Stock Inventory at {selectedWarehouseDetail.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    City: <strong className="text-[#714B67]">{selectedWarehouseDetail.city}</strong> • Zone:{' '}
                    <strong className="text-[#f09e38]">{selectedWarehouseDetail.zone}</strong> • Code:{' '}
                    <span className="font-mono">{selectedWarehouseDetail.code}</span>
                  </p>
                </div>

                {/* Stock Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Search SKU or name..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#EBDCE7] bg-white outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              {loadingStock ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
                  <div className="bg-[#F5EDF3] p-3 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                    <div className="col-span-4">Product / SKU</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-2 text-center">Tracking</div>
                    <div className="col-span-2 text-right">Warehouse Stock</div>
                    <div className="col-span-2 text-center">Action</div>
                  </div>

                  {warehouseStockList.map((item) => (
                    <div
                      key={item.productId}
                      className={`p-3 grid grid-cols-12 items-center hover:bg-[#FAF6F9] transition-colors ${
                        item.isOutOfStock ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <div className="col-span-4 font-extrabold text-[#241621]">
                        {item.name}
                        <span className="block text-[10px] font-mono text-slate-400 font-normal">{item.sku}</span>
                      </div>

                      <div className="col-span-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                      </div>

                      <div className="col-span-2 text-center">
                        {item.isSerialTracked ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#F5EDF3] text-[#714B67] border border-[#dabed3]">
                            Serial Tracked
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Bulk Qty</span>
                        )}
                      </div>

                      <div className="col-span-2 text-right">
                        {item.isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-black">
                            0 Units (Out of Stock)
                          </span>
                        ) : (
                          <span className="font-black text-sm text-[#714B67]">
                            {item.warehouseQuantity} {item.unit}
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setStockTargetProduct(item);
                            setStockQtyInput(item.isOutOfStock ? 10 : 5);
                            setStockOperation('ADD');
                            setShowStockModal(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#714B67] hover:bg-[#5b3c53] text-white shadow-2xs transition cursor-pointer"
                        >
                          + Add Stock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE WAREHOUSE (Unique City + Zone) */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showCreateWarehouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621] flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#714B67]" />
                  Add New Multi-Zone Warehouse
                </h3>
                <p className="text-[11px] text-slate-500">
                  Each warehouse is uniquely identified by City and Zone combination.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateWarehouseModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createWhError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {createWhError}
              </div>
            )}

            <form onSubmit={handleCreateWarehouse} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Warehouse Name *</label>
                <input
                  type="text"
                  required
                  value={newWhName}
                  onChange={(e) => setNewWhName(e.target.value)}
                  placeholder="e.g. Pune North Solar Distribution Hub"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Code *</label>
                  <input
                    type="text"
                    required
                    value={newWhCode}
                    onChange={(e) => setNewWhCode(e.target.value.toUpperCase())}
                    placeholder="WH-PUN-01"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-mono uppercase outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">City *</label>
                  <input
                    type="text"
                    required
                    value={newWhCity}
                    onChange={(e) => setNewWhCity(e.target.value)}
                    placeholder="e.g. Pune"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Zone *</label>
                  <input
                    type="text"
                    required
                    value={newWhZone}
                    onChange={(e) => setNewWhZone(e.target.value)}
                    placeholder="Zone-North"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Physical Address</label>
                <input
                  type="text"
                  value={newWhAddress}
                  onChange={(e) => setNewWhAddress(e.target.value)}
                  placeholder="Street, Industrial Area, Pincode"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Manager / Contact</label>
                  <input
                    type="text"
                    value={newWhContact}
                    onChange={(e) => setNewWhContact(e.target.value)}
                    placeholder="Contact person name"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Contact Phone</label>
                  <input
                    type="text"
                    value={newWhPhone}
                    onChange={(e) => setNewWhPhone(e.target.value)}
                    placeholder="+91 98490 12345"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateWarehouseModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createWhSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#714B67] hover:bg-[#5b3c53] text-white font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {createWhSubmitting ? 'Creating...' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: ADD / INWARD STOCK TO WAREHOUSE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showStockModal && stockTargetProduct && selectedWarehouseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621]">Inward Stock / Adjust Inventory</h3>
                <p className="text-[11px] text-slate-500">
                  {selectedWarehouseDetail.name} ({selectedWarehouseDetail.city} - {selectedWarehouseDetail.zone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStockModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-1 text-xs">
              <span className="font-extrabold text-[#241621] block">{stockTargetProduct.name}</span>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>SKU: {stockTargetProduct.sku}</span>
                <span>
                  Current Warehouse Stock:{' '}
                  <strong className="text-[#714B67] font-black">{stockTargetProduct.warehouseQuantity} units</strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleStockUpdateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Operation Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockOperation('ADD')}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer border ${
                      stockOperation === 'ADD'
                        ? 'bg-[#714B67] text-white border-[#714B67] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    + Add / Inward Qty
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockOperation('SET')}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer border ${
                      stockOperation === 'SET'
                        ? 'bg-[#714B67] text-white border-[#714B67] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Set Exact Count
                  </button>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">
                  {stockOperation === 'ADD' ? 'Quantity to Inward *' : 'New Exact Stock Level *'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={stockQtyInput}
                  onChange={(e) => setStockQtyInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-black text-sm text-[#714B67] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Notes / Supplier Reference</label>
                <input
                  type="text"
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  placeholder="e.g. PO-2026-081 Inward shipment or cycle count"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] font-black shadow-md cursor-pointer hover:opacity-95 disabled:opacity-50"
                >
                  {stockSubmitting ? 'Updating...' : 'Confirm Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
