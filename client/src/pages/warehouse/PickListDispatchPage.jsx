import React, { useState, useEffect, useRef } from 'react';
import { dispatchApi } from '../../api';
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
} from 'lucide-react';

export default function PickListDispatchPage() {
  const [pickLists, setPickLists] = useState([]);
  const [selectedPickList, setSelectedPickList] = useState(null);
  const [loading, setLoading] = useState(true);

  // Scanning states
  const [scannedSerial, setScannedSerial] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanMessage, setScanMessage] = useState({ type: '', text: '' });
  const [validationError, setValidationError] = useState(null);
  const scannerRef = useRef(null);

  const loadPickLists = async () => {
    try {
      const res = await dispatchApi.listPickLists();
      setPickLists(res.data?.data || []);
      if (!selectedPickList && res.data?.data?.length > 0) {
        loadDetail(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load pick lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (id) => {
    try {
      const res = await dispatchApi.getPickList(id);
      setSelectedPickList(res.data?.data);
      setValidationError(null);
      setScanMessage({ type: '', text: '' });
      // auto-select first serial tracked item
      const trackedLine = (res.data?.data?.lines || []).find((l) => l.product?.isSerialTracked);
      if (trackedLine) setSelectedProductId(trackedLine.productId);
    } catch (err) {
      console.error('Failed to load pick list detail:', err);
    }
  };

  useEffect(() => {
    loadPickLists();
  }, []);

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
        (error) => {
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
  }, [scannerActive, selectedProductId]);

  const handleScanSubmit = async (serialToScan = scannedSerial) => {
    if (!serialToScan || !selectedProductId) {
      alert('Please enter or scan a serial number and select a product.');
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
        text: `✓ Serial ${res.data?.data?.serial} scanned and verified!`,
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
    const trackedLine = (selectedPickList?.lines || []).find((l) => l.productId === selectedProductId);
    const sku = trackedLine?.product?.sku || 'GEN';
    const randomSerial = `${sku}-DEMO-${Math.floor(1000 + Math.random() * 9000)}`;
    setScannedSerial(randomSerial);
    handleScanSubmit(randomSerial);
  };

  const handleValidateDelivery = async () => {
    setValidationError(null);
    try {
      const res = await dispatchApi.validateDelivery(selectedPickList.orderId, {
        deliveredTo: selectedPickList.order?.customer?.name,
        notes: 'Warehouse materials validated & dispatched to site.',
      });

      alert(`Delivery validated successfully! ${res.data?.data?.warrantiesCreatedCount} active warranties generated.`);
      loadDetail(selectedPickList.id);
      loadPickLists();
    } catch (err) {
      if (err.response?.data?.missing) {
        setValidationError(err.response.data);
      } else {
        alert('Validation failed: ' + (err.response?.data?.message || err.message));
      }
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
  const scanProgressPercent = totalSerialRequired > 0 ? Math.min(100, Math.round((totalSerialScanned / totalSerialRequired) * 100)) : 100;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">Warehouse Dispatch & Serial Scanner</h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Rule 5: 100% Barcode/QR scan required • Rule 6: Atomic auto-creation of active warranties on delivery
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#F5EDF3] border border-[#EBDCE7] text-xs font-black text-[#714B67] flex items-center gap-1.5">
            <Barcode className="w-3.5 h-3.5 text-[#f09e38]" /> High-Speed Serial Engine
          </span>
        </div>
      </div>

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
                    Order Ref: <span className="font-bold text-[#714B67]">{selectedPickList.order?.orderNumber}</span> | Client:{' '}
                    <span className="font-bold text-[#241621]">{selectedPickList.order?.customer?.name}</span>
                  </p>
                </div>

                {selectedPickList.status !== 'COMPLETED' && (
                  <button
                    onClick={handleValidateDelivery}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-[#714B67]/30 transition-all cursor-pointer"
                  >
                    <Truck className="w-4 h-4 text-[#f09e38]" /> Validate Delivery (Rule 5 & 6)
                  </button>
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

              {/* Rule 5 Missing Serials Warning Banner */}
              {validationError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-black text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    {validationError.message}
                  </div>
                  <p className="text-[11px] text-rose-700 font-medium">
                    Strict Rule 5 Enforcement: Missing serial numbers must be verified before stock release:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-rose-900 font-bold text-[11px]">
                    {validationError.missing?.map((m) => (
                      <li key={m.productId}>
                        {m.productName} ({m.sku}): Needs {m.required}, Scanned {m.scanned} (Deficit: {m.missingCount})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Equipment Breakdown Table */}
              <div>
                <h3 className="text-xs font-black text-[#714B67] uppercase tracking-wider mb-2.5">
                  Equipment Manifest & Tracking Requirements
                </h3>
                <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
                  <div className="bg-[#F5EDF3] p-2.5 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                    <div className="col-span-6">Component / SKU</div>
                    <div className="col-span-2 text-center">Tracking</div>
                    <div className="col-span-2 text-right">Required</div>
                    <div className="col-span-2 text-right">Scanned Status</div>
                  </div>

                  {selectedPickList.lines?.map((line) => {
                    const scannedForLine = (selectedPickList.order?.serialNumbers || []).filter(
                      (sn) => sn.productId === line.productId
                    ).length;
                    const isFullyScanned = scannedForLine >= Number(line.requiredQty);

                    return (
                      <div key={line.id} className="p-3 grid grid-cols-12 items-center hover:bg-[#FAF6F9] transition-colors">
                        <div className="col-span-6 font-extrabold text-[#241621] truncate">
                          {line.product?.name}
                          <span className="block text-[10px] font-mono text-slate-400 font-normal">{line.product?.sku}</span>
                        </div>
                        <div className="col-span-2 text-center">
                          {line.product?.isSerialTracked ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#F5EDF3] text-[#714B67] border border-[#dabed3]">
                              Serial Tracked
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">Bulk Qty</span>
                          )}
                        </div>
                        <div className="col-span-2 text-right font-bold text-slate-700">{Number(line.requiredQty)}</div>
                        <div className="col-span-2 text-right font-black">
                          {line.product?.isSerialTracked ? (
                            <span className={isFullyScanned ? 'text-emerald-600' : 'text-[#f09e38]'}>
                              {scannedForLine} / {Number(line.requiredQty)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">N/A</span>
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
                        className="px-3 py-1 rounded-lg text-xs font-black bg-[#f09e38] hover:bg-[#d4821a] text-[#241621] transition shadow-xs cursor-pointer flex items-center gap-1"
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
                              {l.product?.name} ({l.product?.sku})
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
                        className="w-full p-2.5 rounded-xl border border-white/20 bg-[#1A0F17] text-white font-mono text-xs outline-none focus:ring-2 focus:ring-[#f09e38]"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <button
                        type="button"
                        onClick={() => handleScanSubmit()}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] font-black text-xs shadow-md transition-all cursor-pointer hover:opacity-95"
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
    </div>
  );
}
