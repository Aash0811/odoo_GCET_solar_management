import React, { useState, useEffect, useRef } from 'react';
import { dispatchApi, warehousesApi, inventoryApi, usersApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Truck,
  Scan,
  Barcode,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Building2,
  Boxes,
  FileText,
  Printer,
  Clock,
  Zap,
  Check,
  MapPin,
  User,
  DollarSign,
  Layers,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
  X,
  PackageCheck,
  CheckCircle,
  Upload,
  Camera,
} from 'lucide-react';

export default function PickListDispatchPage({ defaultTab = 'dispatch' }) {
  const { user, role } = useAuth();
  const isAdmin = role === 'ADMIN';

  // Navigation tabs: 'dispatch' (PDF Scene: Dispatch Day & Serial Numbers) | 'warehouses' (Multi-Zone)
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Pick lists / Dispatch Orders
  const [pickLists, setPickLists] = useState([]);
  const [selectedPickList, setSelectedPickList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'READY' | 'DISPATCHED'

  // Warehouses
  const [warehouses, setWarehouses] = useState([]);
  const [deliveryAgents, setDeliveryAgents] = useState([]);

  // Scanning States
  const [scannedSerialInput, setScannedSerialInput] = useState('');
  const [activeScanProductId, setActiveScanProductId] = useState('');
  const [cameraScannerActive, setCameraScannerActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isDecodingFile, setIsDecodingFile] = useState(false);
  const [scanFeedback, setScanFeedback] = useState({ type: '', text: '' });
  const [dispatchError, setDispatchError] = useState(null);
  const [dispatchSuccessData, setDispatchSuccessData] = useState(null);
  const [showGatePassModal, setShowGatePassModal] = useState(false);
  const scannerRef = useRef(null);
  const dispatchFileInputRef = useRef(null);

  // Load Initial Pick Lists & Warehouses
  const loadData = async () => {
    try {
      setLoading(true);
      const [plRes, whRes, agentsRes] = await Promise.all([
        dispatchApi.listPickLists(),
        warehousesApi.list().catch(() => ({ data: { data: [] } })),
        usersApi.list({ role: 'DELIVERY_AGENT', isActive: true }).catch(() => ({ data: { data: [] } })),
      ]);
      const plData = plRes.data?.data || [];
      const whData = whRes.data?.data || [];

      setPickLists(plData);
      setWarehouses(whData);
      setDeliveryAgents(agentsRes.data?.data || []);

      if (plData.length > 0) {
        loadDetail(plData[0].id);
      }
    } catch (err) {
      console.error('Failed to load dispatch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id) => {
    try {
      const res = await dispatchApi.getPickList(id);
      const pl = res.data?.data;
      setSelectedPickList(pl);
      setDispatchError(null);
      setScanFeedback({ type: '', text: '' });

      // Auto-select first tracked line needing a serial number
      const trackedLine = (pl?.lines || []).find(
        (l) => l.product?.isSerialTracked && Number(l.pickedQty || 0) < Number(l.requiredQty || 1)
      ) || (pl?.lines || []).find((l) => l.product?.isSerialTracked);

      if (trackedLine) {
        setActiveScanProductId(trackedLine.productId);
      }
    } catch (err) {
      console.error('Failed to load pick list detail:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Safe Camera Scanner Setup with Diagnostic Error Fallback
  const handleToggleCamera = async () => {
    if (cameraScannerActive) {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (e) {}
        scannerRef.current = null;
      }
      setCameraScannerActive(false);
      setCameraError('');
      return;
    }

    setCameraError('');
    setCameraScannerActive(true);

    setTimeout(async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API requires HTTPS or localhost.');
        }

        const html5QrCode = new Html5Qrcode('reader-dispatch-box');
        scannerRef.current = html5QrCode;

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleScanSubmit(decodedText);
            html5QrCode.stop().then(() => {
              setCameraScannerActive(false);
              scannerRef.current = null;
            }).catch(() => {});
          },
          () => {}
        );
      } catch (err) {
        console.warn('Dispatch camera error:', err);
        let errorMsg = 'Could not access camera. ';
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          errorMsg = 'Camera permission denied. Please allow camera in your browser URL bar.';
        } else if (err.name === 'NotFoundError' || err.message?.includes('Requested device not found')) {
          errorMsg = 'No camera found on this computer. Use "Upload Barcode Photo" or a USB scanner gun.';
        } else {
          errorMsg += err.message || 'Use image upload or USB scanner below.';
        }
        setCameraError(errorMsg);
        setCameraScannerActive(false);
      }
    }, 150);
  };

  // Upload Photo to Scan Barcode
  const handleFileUploadScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingFile(true);
    try {
      const html5QrCode = new Html5Qrcode('reader-dispatch-hidden-canvas');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();

      setScannedSerialInput(decodedText);
      await handleScanSubmit(decodedText);
    } catch (err) {
      setScanFeedback({
        type: 'error',
        text: `Could not decode barcode from image: ${err.message || 'Please ensure the barcode is clear and in focus.'}`,
      });
    } finally {
      setIsDecodingFile(false);
      if (dispatchFileInputRef.current) dispatchFileInputRef.current.value = '';
    }
  };

  // Serial Scanning Submit
  const handleScanSubmit = async (serial = scannedSerialInput) => {
    const cleanSerial = serial.trim();
    if (!cleanSerial) {
      setScanFeedback({ type: 'error', text: 'Please enter or scan a serial number.' });
      return;
    }

    if (!selectedPickList) return;

    // Determine target product ID
    let targetProductId = activeScanProductId;
    if (!targetProductId) {
      const trackedLine = (selectedPickList.lines || []).find((l) => l.product?.isSerialTracked);
      if (trackedLine) targetProductId = trackedLine.productId;
    }

    if (!targetProductId) {
      setScanFeedback({ type: 'error', text: 'Please select which equipment you are scanning.' });
      return;
    }

    // Check if product is out of stock in assigned warehouse
    const currentLine = (selectedPickList.lines || []).find((l) => l.productId === targetProductId);
    if ((currentLine?.warehouseStockQty ?? 0) <= 0) {
      setScanFeedback({
        type: 'error',
        text: `⛔ CANNOT PICK: Stock for '${currentLine?.product?.name}' is NOT present in ${selectedPickList.warehouse?.name || 'warehouse'}. Available: 0 units.`,
      });
      return;
    }

    try {
      const res = await dispatchApi.scanSerial({
        orderId: selectedPickList.orderId,
        productId: targetProductId,
        serial: cleanSerial,
      });

      setScanFeedback({
        type: 'success',
        text: `✓ Verified: Serial ${res.data?.data?.serial} recorded for ${currentLine?.product?.name || 'unit'}.`,
      });
      setScannedSerialInput('');
      loadDetail(selectedPickList.id);
      dispatchApi.listPickLists().then((r) => setPickLists(r.data?.data || []));
    } catch (err) {
      setScanFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to scan serial number.',
      });
    }
  };

  // Quick 1-Click Simulation Buttons (Simulates barcode gun trigger)
  const handleQuickDemoScan = (productSku = 'INV-3KW') => {
    const matchingLine = (selectedPickList?.lines || []).find((l) =>
      l.product?.sku?.toLowerCase().includes(productSku.toLowerCase())
    ) || (selectedPickList?.lines || []).find((l) => l.product?.isSerialTracked);

    if (matchingLine) {
      setActiveScanProductId(matchingLine.productId);
      const generatedSerial = `${matchingLine.product?.sku || 'GEN'}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setScannedSerialInput(generatedSerial);
      handleScanSubmit(generatedSerial);
    }
  };

  // Pick Non-Serialized Materials (cables, mounting stands, earthing)
  const handlePickNonSerialItem = async (line) => {
    if ((line.warehouseStockQty ?? 0) <= 0) {
      alert(
        `Cannot pick: Stock is not present in warehouse '${selectedPickList.warehouse?.name}'. Available: 0 units.`
      );
      return;
    }

    try {
      await dispatchApi.pickItem(selectedPickList.id, {
        pickLineId: line.id,
        quantity: 1,
      });
      loadDetail(selectedPickList.id);
      dispatchApi.listPickLists().then((r) => setPickLists(r.data?.data || []));
    } catch (err) {
      alert('Picking failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Change Assigned Warehouse
  const handleChangeWarehouse = async (warehouseId) => {
    try {
      const res = await dispatchApi.assignWarehouse(selectedPickList.id, warehouseId);
      alert(res.data?.message || 'Warehouse updated.');
      loadDetail(selectedPickList.id);
      dispatchApi.listPickLists().then((r) => setPickLists(r.data?.data || []));
    } catch (err) {
      alert('Failed to change warehouse: ' + (err.response?.data?.message || err.message));
    }
  };

  // ============================================================
  // CORE PDF REQUIREMENT: DISPATCH TRUCK & AUTO-START WARRANTIES
  // ============================================================
  const handleDispatchTruckAndStartWarranties = async () => {
    if (!selectedPickList) return;
    setDispatchError(null);

    const confirmed = window.confirm(
      `Confirm Dispatch for Order ${selectedPickList.order?.orderNumber}?\n\n` +
      `• The truck will depart with the ₹1,50,000 hardware kit.\n` +
      `• The 2-year inverter/battery and 20-year solar panel warranty clocks will start automatically today.\n` +
      `• Stock will be deducted from warehouse inventory.\n\n` +
      `Proceed with Dispatch?`
    );
    if (!confirmed) return;

    try {
      const res = await dispatchApi.validateDelivery(selectedPickList.orderId, {
        deliveredTo: selectedPickList.order?.customer?.name,
        notes: `Truck dispatched from ${selectedPickList.warehouse?.name || 'warehouse'}. Hardware loaded and all serial numbers verified.`,
      });

      const data = res.data?.data;
      setDispatchSuccessData({
        deliveryNumber: data?.delivery?.deliveryNumber || 'DEL-2026-0001',
        warrantiesCreatedCount: data?.warrantiesCreatedCount || 2,
        customerName: selectedPickList.order?.customer?.name,
        serialCount: (selectedPickList.order?.serialNumbers || []).length,
      });

      setShowGatePassModal(true);
      loadDetail(selectedPickList.id);
      dispatchApi.listPickLists().then((r) => setPickLists(r.data?.data || []));
    } catch (err) {
      if (err.response?.data?.missing) {
        setDispatchError(err.response.data);
      } else {
        alert('Dispatch failed: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  // Calculations for current selected pick list
  const lines = selectedPickList?.lines || [];
  const trackedLines = lines.filter((l) => l.product?.isSerialTracked);
  const totalSerialsRequired = trackedLines.reduce((acc, l) => acc + Number(l.requiredQty || 1), 0);
  const scannedSerials = selectedPickList?.order?.serialNumbers || [];
  const totalSerialsScanned = scannedSerials.length;
  const isAllSerialsScanned = totalSerialsRequired > 0 && totalSerialsScanned >= totalSerialsRequired;

  // Filter pick lists
  const filteredPickLists = pickLists.filter((p) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'READY' && p.status !== 'COMPLETED') ||
      (statusFilter === 'DISPATCHED' && p.status === 'COMPLETED');

    const matchesSearch =
      !searchFilter ||
      p.pickNumber.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.order?.orderNumber?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.order?.customer?.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      p.warehouse?.city?.toLowerCase().includes(searchFilter.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SCENE HEADER (Directly reflecting PDF Page 3) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#241621] via-[#331c2f] to-[#714B67] text-white shadow-lg space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-ping"></span>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#f09e38]">
                SunPower Solutions • Dispatch Day &amp; Serial Number Verification
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              The Truck is About to Leave with ₹1,50,000 of Hardware
            </h1>
            <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-3xl leading-relaxed">
              Every inverter, battery, and charge controller has its own serial number and must be scanned before departure.
              The moment dispatch is confirmed, the <strong>20-year panel and 2-year inverter warranty clocks start automatically</strong> without typing dates into a register.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('dispatch')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'dispatch'
                  ? 'bg-[#f09e38] text-[#241621] shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
            >
              <Truck className="w-4 h-4" /> Dispatch Terminal
            </button>
            <a
              href="/warehouse/inventory"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4 text-purple-200" /> Multi-Zone Warehouses
            </a>
            <a
              href="/warehouse/scanner"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Barcode className="w-4 h-4 text-purple-200" /> Barcode Suite
            </a>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MAIN TWO-COLUMN DISPATCH TERMINAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left 4 cols: Trucks Ready to Leave (Pick Lists Queue) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#241621] flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#714B67]" /> Trucks Ready for Dispatch ({filteredPickLists.length})
            </h2>
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2 py-0.5 rounded-lg cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-[#714B67] text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('READY')}
                className={`px-2 py-0.5 rounded-lg cursor-pointer ${
                  statusFilter === 'READY' ? 'bg-[#714B67] text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                Pending Scan
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search truck, order, customer, city..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#EBDCE7] bg-white outline-none focus:ring-1 focus:ring-[#714B67]"
            />
          </div>

          {/* Queue Cards */}
          <div className="space-y-2.5 overflow-y-auto max-h-[75vh] pr-1">
            {filteredPickLists.map((p) => {
              const isSelected = selectedPickList?.id === p.id;
              const isDispatched = p.status === 'COMPLETED';

              return (
                <button
                  key={p.id}
                  onClick={() => loadDetail(p.id)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#F5EDF3] to-white border-[#714B67] shadow-md ring-2 ring-[#714B67]/30'
                      : 'bg-white border-[#EBDCE7] hover:border-[#b886ad]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono font-black text-xs text-[#714B67]">{p.pickNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isDispatched
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isDispatched ? 'Dispatched' : 'Truck Loading'}
                    </span>
                  </div>

                  <p className="font-black text-xs text-[#241621] truncate">{p.order?.customer?.name}</p>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-[#f09e38] shrink-0" />
                      {p.order?.customer?.city || 'Site City'}
                    </span>
                    <span className="font-bold text-[#714B67]">{p.order?.capacityKw} kW Kit</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-mono">Order: {p.order?.orderNumber}</span>
                    <span className="font-extrabold text-[#241621] flex items-center gap-0.5">
                      <span className="text-emerald-700">₹1,50,000 Cargo</span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 8 cols: The Dispatch Staging Area */}
        {selectedPickList && (
          <div className="lg:col-span-8 space-y-5">
            <div className="odoo-glass-card p-6 rounded-3xl space-y-5">
              {/* Top Order Details Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBDCE7]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-[#714B67]">
                      {selectedPickList.pickNumber}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-bold text-slate-600">
                      SO: {selectedPickList.order?.orderNumber}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-[#241621] mt-0.5">
                    {selectedPickList.order?.customer?.name}
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#f09e38]" />
                    {selectedPickList.order?.customer?.address || 'Site Address'},{' '}
                    {selectedPickList.order?.customer?.city}
                  </p>
                </div>

                {/* Warehouse Assignment */}
                <div className="flex flex-col sm:items-end gap-1">
                  <label className="text-[10px] font-black uppercase text-[#714B67] flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-[#f09e38]" /> Loading Warehouse
                  </label>
                  <select
                    value={selectedPickList.warehouseId || ''}
                    onChange={(e) => handleChangeWarehouse(e.target.value)}
                    disabled={selectedPickList.status === 'COMPLETED'}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#714B67]/30 bg-[#FAF6F9] text-[#241621] outline-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.city} - {wh.zone})
                      </option>
                    ))}
                  </select>
                  <label className="text-[10px] font-black uppercase text-[#714B67] mt-2">Delivery Agent</label>
                  <select
                    value={selectedPickList.deliveryAgentId || ''}
                    onChange={async (e) => {
                      if (!e.target.value) return;
                      await dispatchApi.assignDeliveryAgent(selectedPickList.id, e.target.value);
                      loadDetail(selectedPickList.id);
                    }}
                    disabled={selectedPickList.status === 'COMPLETED'}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-[#714B67]/30 bg-[#FAF6F9] text-[#241621] outline-none"
                  >
                    <option value="">-- Assign agent --</option>
                    {deliveryAgents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Serial Scanning Progress Gauge */}
              <div className="p-4 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#241621] flex items-center gap-1.5">
                    <Barcode className="w-4 h-4 text-[#714B67]" /> Serial Number Verification Before Departure
                  </span>
                  <span className={isAllSerialsScanned ? 'text-emerald-700 font-black' : 'text-[#714B67] font-black'}>
                    {totalSerialsScanned} / {totalSerialsRequired} units scanned{' '}
                    {isAllSerialsScanned ? '(All Verified ✓)' : '(Missing Serials)'}
                  </span>
                </div>
                <div className="w-full bg-[#EBDCE7] h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isAllSerialsScanned
                        ? 'bg-emerald-600'
                        : 'bg-gradient-to-r from-[#714B67] to-[#f09e38]'
                    }`}
                    style={{
                      width: `${totalSerialsRequired > 0 ? (totalSerialsScanned / totalSerialsRequired) * 100 : 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SECTION 1: WHAT TO PACK (BOM Checklist from Ready Template) */}
              {/* ───────────────────────────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-black text-[#241621] uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-[#714B67]" />
                    What to Pack (Ready Kit for {selectedPickList.order?.capacityKw} kW System)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Stock validated from assigned warehouse
                  </span>
                </div>

                <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
                  <div className="bg-[#FAF6F9] p-3 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                    <div className="col-span-5">Component / Specification</div>
                    <div className="col-span-2 text-center">Req / Loaded</div>
                    <div className="col-span-3 text-center">Warehouse Stock</div>
                    <div className="col-span-2 text-right">Status / Action</div>
                  </div>

                  {lines.map((line) => {
                    const isComplete = Number(line.pickedQty) >= Number(line.requiredQty);
                    const isTracked = line.product?.isSerialTracked;
                    const isOutOfStock = (line.warehouseStockQty ?? 0) <= 0;

                    return (
                      <div
                        key={line.id}
                        className={`p-3 grid grid-cols-12 items-center hover:bg-[#FAF6F9]/50 transition-colors ${
                          isOutOfStock ? 'bg-rose-50/40' : ''
                        }`}
                      >
                        <div className="col-span-5">
                          <div className="font-extrabold text-[#241621] flex items-center gap-1.5">
                            {line.product?.name}
                            {isTracked && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-purple-100 text-[#714B67] border border-purple-200">
                                Serialized
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{line.product?.sku}</span>
                        </div>

                        <div className="col-span-2 text-center font-bold">
                          <span className={isComplete ? 'text-emerald-700 font-black' : 'text-[#241621]'}>
                            {line.pickedQty} / {line.requiredQty} {line.product?.unit}
                          </span>
                        </div>

                        <div className="col-span-3 text-center">
                          {line.warehouseStockQty !== undefined ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isOutOfStock
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isOutOfStock ? '0 in Hub (Out of Stock)' : `${line.warehouseStockQty} available`}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">No warehouse</span>
                          )}
                        </div>

                        <div className="col-span-2 text-right">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Packed
                            </span>
                          ) : isTracked ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setActiveScanProductId(line.productId)}
                                className={`px-2 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                                  activeScanProductId === line.productId
                                    ? 'bg-[#714B67] text-white shadow-xs'
                                    : 'bg-[#F5EDF3] text-[#714B67] hover:bg-[#EBDCE7]'
                                }`}
                              >
                                Target
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveScanProductId(line.productId);
                                  handleQuickDemoScan(line.product?.sku || 'SN');
                                }}
                                className="px-2 py-1 rounded-lg text-[10px] font-black bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] hover:opacity-90 shadow-2xs transition cursor-pointer flex items-center gap-0.5"
                                title="Auto-scan next unit"
                              >
                                <Zap className="w-2.5 h-2.5" /> Scan
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePickNonSerialItem(line)}
                              disabled={isOutOfStock || selectedPickList.status === 'COMPLETED'}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition cursor-pointer ${
                                isOutOfStock
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-[#f09e38] text-[#241621] hover:bg-[#e08e28]'
                              }`}
                            >
                              Pack +1
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SECTION 2: SERIAL NUMBER SCANNING TERMINAL */}
              {/* ───────────────────────────────────────────────────────────── */}
              {selectedPickList.status !== 'COMPLETED' && (
                <div className="p-5 rounded-3xl bg-[#241621] text-white space-y-4">
                  {/* Hidden element for photo scanner */}
                  <div id="reader-dispatch-hidden-canvas" className="hidden"></div>
                  <input
                    type="file"
                    ref={dispatchFileInputRef}
                    accept="image/*"
                    onChange={handleFileUploadScan}
                    className="hidden"
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scan className="w-4 h-4 text-[#f09e38]" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">
                        Scan Serial Numbers Before Departure
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      Target Equipment:{' '}
                      <strong className="text-[#f09e38]">
                        {(lines.find((l) => l.productId === activeScanProductId)?.product?.name) || 'Serialized Item'}
                      </strong>
                    </span>
                  </div>

                  {/* Camera Error Banner */}
                  {cameraError && (
                    <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{cameraError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => dispatchFileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-[#f09e38] text-[#241621] font-black text-[10px] shrink-0 cursor-pointer"
                      >
                        Upload Photo Instead
                      </button>
                    </div>
                  )}

                  {/* Input Box & Scanner Action Buttons */}
                  <div className="grid sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-6 flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleToggleCamera}
                        className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer ${
                          cameraScannerActive
                            ? 'bg-rose-600 text-white'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        <Camera className="w-4 h-4 text-[#f09e38]" />
                        {cameraScannerActive ? 'Stop Camera' : 'Camera Scanner'}
                      </button>

                      <button
                        type="button"
                        onClick={() => dispatchFileInputRef.current?.click()}
                        disabled={isDecodingFile}
                        className="flex-1 min-w-[140px] py-2 px-3 rounded-xl text-xs font-black bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] hover:opacity-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        title="Upload a picture of the barcode"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {isDecodingFile ? 'Decoding...' : 'Upload Photo'}
                      </button>

                      {/* Instant Demo Simulation Buttons */}
                      <button
                        type="button"
                        onClick={() => handleQuickDemoScan('INV')}
                        className="py-2 px-2.5 rounded-xl text-[11px] font-black bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 cursor-pointer"
                        title="Simulate scanning Inverter serial barcode"
                      >
                        <Zap className="w-3 h-3 text-[#f09e38]" /> Inverter
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickDemoScan('BAT')}
                        className="py-2 px-2.5 rounded-xl text-[11px] font-black bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 cursor-pointer"
                        title="Simulate scanning Battery serial barcode"
                      >
                        <Zap className="w-3 h-3 text-blue-300" /> Battery
                      </button>
                    </div>

                    <div className="sm:col-span-4">
                      <input
                        type="text"
                        value={scannedSerialInput}
                        onChange={(e) => setScannedSerialInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleScanSubmit()}
                        placeholder="Scan with gun or type serial..."
                        className="w-full p-2.5 rounded-xl border border-white/20 bg-[#1A0F17] text-white font-mono text-xs outline-none focus:ring-2 focus:ring-[#f09e38]"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <button
                        type="button"
                        onClick={() => handleScanSubmit()}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] text-xs font-black shadow-md hover:opacity-95 cursor-pointer"
                      >
                        Verify Unit
                      </button>
                    </div>
                  </div>

                  {cameraScannerActive && (
                    <div className="pt-2">
                      <div id="reader-dispatch-box" className="w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-white/20"></div>
                    </div>
                  )}

                  {scanFeedback.text && (
                    <div
                      className={`p-2.5 rounded-xl text-xs font-bold ${
                        scanFeedback.type === 'success'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {scanFeedback.text}
                    </div>
                  )}
                </div>
              )}

              {/* Scanned Serial Numbers Loaded on the Truck */}
              <div>
                <h3 className="text-xs font-black text-[#241621] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Serial Numbers Loaded on Truck ({scannedSerials.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    Assigned uniquely to {selectedPickList.order?.customer?.name}
                  </span>
                </h3>

                {scannedSerials.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>No serial numbers scanned yet. Click <strong>"Scan Inverter"</strong> above to verify units.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {scannedSerials.map((sn) => (
                      <span
                        key={sn.id}
                        className="px-3.5 py-2 rounded-xl bg-white border border-[#EBDCE7] text-[#241621] text-xs font-mono font-bold flex items-center gap-2 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{sn.serial}</span>
                        <span className="text-[10px] text-[#714B67] font-sans font-extrabold bg-[#F5EDF3] px-2 py-0.5 rounded">
                          {sn.product?.sku}
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Validation Error Banner */}
              {dispatchError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-black">
                    <ShieldAlert className="w-4 h-4 text-rose-600" /> Dispatch Blocked (Rule 5 Enforcement)
                  </div>
                  <p>{dispatchError.message}</p>
                  {dispatchError.missing && (
                    <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-0.5">
                      {dispatchError.missing.map((m, idx) => (
                        <li key={idx}>
                          <strong>{m.productName} ({m.sku})</strong>: {m.missingCount} unit(s) still unverified.
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────── */}
              {/* SECTION 3: THE CLIMAX — DISPATCH TRUCK & AUTO-START WARRANTIES */}
              {/* ───────────────────────────────────────────────────────────── */}
              {selectedPickList.status === 'COMPLETED' ? (
                <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                      <div>
                        <h4 className="text-sm font-black text-emerald-950">
                          Truck Dispatched &amp; Delivery Validated
                        </h4>
                        <p className="text-xs text-emerald-800">
                          Hardware loaded and delivered. Automatic warranty clocks started for all serial units.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGatePassModal(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> View Gate Pass
                    </button>
                  </div>

                  {/* Auto-Started Warranty Clocks */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs space-y-1">
                      <span className="text-[10px] font-black uppercase text-purple-700 block">
                        Inverter Warranty Clock Active
                      </span>
                      <div className="font-mono font-black text-[#241621]">2-Year Warranty Running</div>
                      <div className="text-[10px] text-slate-500">
                        Coverage: {new Date().toLocaleDateString()} &rarr; {new Date(Date.now() + 2 * 365 * 86400000).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-emerald-200 text-xs space-y-1">
                      <span className="text-[10px] font-black uppercase text-amber-700 block">
                        Solar Panels Warranty Clock Active
                      </span>
                      <div className="font-mono font-black text-[#241621]">20-Year Performance Warranty Running</div>
                      <div className="text-[10px] text-slate-500">
                        Coverage: {new Date().toLocaleDateString()} &rarr; {new Date(Date.now() + 20 * 365 * 86400000).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-[#EBDCE7] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#714B67] block">
                      Ready for Departure?
                    </span>
                    <p className="text-xs text-slate-500">
                      {isAllSerialsScanned
                        ? 'All serialized inverters and batteries scanned. Ready to depart.'
                        : 'Truck on hold: Scan remaining required serial numbers above to unlock dispatch.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDispatchTruckAndStartWarranties}
                    disabled={!isAllSerialsScanned}
                    className={`px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg transition-all ${
                      isAllSerialsScanned
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:opacity-95 text-white shadow-emerald-900/20 cursor-pointer animate-pulse'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Truck className="w-4 h-4 text-amber-300" />
                    Dispatch Truck &amp; Auto-Start Warranties (₹1,50,000 Cargo)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: DISPATCH GATE PASS & DELIVERY CHALLAN */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showGatePassModal && selectedPickList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621] flex items-center gap-2">
                  <Printer className="w-5 h-5 text-[#714B67]" />
                  Dispatch Gate Pass &amp; Delivery Challan
                </h3>
                <p className="text-[11px] text-slate-500">
                  SunPower Solutions Pvt Ltd • Official Warehouse Equipment Manifest
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGatePassModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Pass Paper */}
            <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-4 text-xs">
              <div className="flex items-start justify-between border-b pb-3">
                <div>
                  <h4 className="font-black text-sm text-[#714B67]">SunPower Solutions Pvt Ltd</h4>
                  <p className="text-[10px] text-slate-500">Solar Rooftop Installation Management</p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-xs text-[#241621] block">
                    {dispatchSuccessData?.deliveryNumber || 'DEL-2026-0001'}
                  </span>
                  <span className="text-[10px] text-slate-400">Date: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Destination Customer</span>
                  <span className="font-black text-[#241621]">{selectedPickList.order?.customer?.name}</span>
                  <span className="text-[10px] text-slate-500 block">{selectedPickList.order?.customer?.address}</span>
                  <span className="text-[10px] text-slate-500 block">{selectedPickList.order?.customer?.city}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">Fulfillment Warehouse</span>
                  <span className="font-black text-[#714B67]">{selectedPickList.warehouse?.name}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">
                    Zone: {selectedPickList.warehouse?.zone}
                  </span>
                  <span className="text-[10px] text-emerald-700 block font-black mt-1">
                    Cargo Value: ₹1,50,000 Verified
                  </span>
                </div>
              </div>

              {/* Scanned Serial Numbers Manifest */}
              <div>
                <h5 className="font-black text-[11px] uppercase text-[#241621] mb-1.5">
                  Verified Hardware Serial Manifest (Warranties Auto-Activated)
                </h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-[11px]">
                  <div className="bg-slate-100 p-2 font-bold grid grid-cols-12 text-[10px] text-slate-600">
                    <div className="col-span-5">Equipment SKU / Model</div>
                    <div className="col-span-4">Scanned Serial #</div>
                    <div className="col-span-3 text-right">Warranty Coverage</div>
                  </div>
                  {(selectedPickList.order?.serialNumbers || []).map((sn, i) => (
                    <div key={i} className="p-2 grid grid-cols-12 items-center">
                      <div className="col-span-5 font-bold text-[#241621] truncate">{sn.product?.name}</div>
                      <div className="col-span-4 font-mono font-bold text-[#714B67]">{sn.serial}</div>
                      <div className="col-span-3 text-right text-emerald-700 font-black">
                        {sn.product?.warrantyYears || 2} Years Active
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-100 text-[10px] text-slate-500">
                <div className="border-t border-slate-300 pt-1 text-center font-bold">
                  Warehouse Dispatch Officer
                </div>
                <div className="border-t border-slate-300 pt-1 text-center font-bold">
                  Truck Driver / Installation Crew Lead
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowGatePassModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-[#714B67] hover:bg-[#5b3c53] text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#f09e38]" /> Print Gate Pass (Challan)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
