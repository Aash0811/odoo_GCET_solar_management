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
        text: `Serial ${res.data?.data?.serial} scanned successfully!`,
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
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Warehouse Dispatch & Serial Scan</h1>
        <p className="text-xs text-slate-500">
          Rule 5: 100% serial scanning required before dispatch | Rule 6: Delivery validation generates warranties
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left 4 cols: Pick List Queue */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-sky-600" /> Active Pick Lists ({pickLists.length})
          </h2>

          <div className="space-y-2 overflow-y-auto max-h-[75vh]">
            {pickLists.map((p) => {
              const isSelected = selectedPickList?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => loadDetail(p.id)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-sky-50/80 border-sky-500 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-900">{p.pickNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 truncate">{p.order?.customer?.name}</p>
                  <p className="text-[11px] text-slate-500">Order: {p.order?.orderNumber}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 8 cols: Active Pick List Items & Barcode Scanner */}
        {selectedPickList && (
          <div className="lg:col-span-8 space-y-5">
            {/* Pick List Detail Card */}
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedPickList.pickNumber}</h2>
                  <p className="text-xs text-slate-500">
                    Order: <span className="font-semibold">{selectedPickList.order?.orderNumber}</span> | Client:{' '}
                    <span className="font-semibold">{selectedPickList.order?.customer?.name}</span>
                  </p>
                </div>

                {selectedPickList.status !== 'COMPLETED' && (
                  <button
                    onClick={handleValidateDelivery}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Truck className="w-4 h-4" /> Validate Delivery (Rule 5 & 6)
                  </button>
                )}
              </div>

              {/* Rule 5 Missing Serials Warning Banner */}
              {validationError && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    {validationError.message}
                  </div>
                  <p className="text-[11px] text-rose-700">Scan missing serials before dispatching to site:</p>
                  <ul className="list-disc pl-5 space-y-1 text-rose-800 font-medium text-[11px]">
                    {validationError.missing?.map((m) => (
                      <li key={m.productId}>
                        {m.productName} ({m.sku}): Required {m.required}, Scanned {m.scanned} (Missing {m.missingCount})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Required Equipment</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  <div className="bg-slate-50 p-2.5 grid grid-cols-12 font-bold text-[10px] text-slate-500 uppercase">
                    <div className="col-span-6">Product / Component</div>
                    <div className="col-span-2 text-center">Tracked</div>
                    <div className="col-span-2 text-right">Required</div>
                    <div className="col-span-2 text-right">Scanned</div>
                  </div>

                  {selectedPickList.lines?.map((line) => {
                    const scannedForLine = (selectedPickList.order?.serialNumbers || []).filter(
                      (sn) => sn.productId === line.productId
                    ).length;
                    const isFullyScanned = scannedForLine >= Number(line.requiredQty);

                    return (
                      <div key={line.id} className="p-2.5 grid grid-cols-12 items-center">
                        <div className="col-span-6 font-medium text-slate-800 truncate">
                          {line.product?.name}
                        </div>
                        <div className="col-span-2 text-center">
                          {line.product?.isSerialTracked ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">
                              Serial
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Bulk</span>
                          )}
                        </div>
                        <div className="col-span-2 text-right font-semibold">{Number(line.requiredQty)}</div>
                        <div className="col-span-2 text-right font-bold">
                          {line.product?.isSerialTracked ? (
                            <span className={isFullyScanned ? 'text-emerald-600' : 'text-amber-600'}>
                              {scannedForLine} / {Number(line.requiredQty)}
                            </span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Serial Scanning Station */}
              {selectedPickList.status !== 'COMPLETED' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Scan className="w-4 h-4 text-sky-600" /> Serial Barcode Scan Station
                    </span>

                    <button
                      type="button"
                      onClick={() => setScannerActive(!scannerActive)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        scannerActive
                          ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                          : 'bg-sky-100 text-sky-800 hover:bg-sky-200'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      {scannerActive ? 'Stop Camera' : 'Open Camera Scanner'}
                    </button>
                  </div>

                  {/* Camera Scanner Viewport */}
                  {scannerActive && (
                    <div className="p-3 bg-white rounded-xl border border-slate-300">
                      <div id="reader" className="w-full"></div>
                    </div>
                  )}

                  {/* Manual / Barcode input */}
                  <div className="grid sm:grid-cols-12 gap-2 text-xs">
                    <div className="sm:col-span-5">
                      <label className="text-[11px] text-slate-500 mb-1 block">Item to Scan</label>
                      <select
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
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
                      <label className="text-[11px] text-slate-500 mb-1 block">Serial Number / Barcode</label>
                      <input
                        type="text"
                        value={scannedSerial}
                        onChange={(e) => setScannedSerial(e.target.value)}
                        placeholder="Scan barcode or type serial..."
                        className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2 flex items-end">
                      <button
                        type="button"
                        onClick={() => handleScanSubmit()}
                        className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
                      >
                        Scan
                      </button>
                    </div>
                  </div>

                  {scanMessage.text && (
                    <p
                      className={`text-[11px] font-medium ${
                        scanMessage.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {scanMessage.text}
                    </p>
                  )}
                </div>
              )}

              {/* Scanned Serials List */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Scanned Serial Numbers ({selectedPickList.order?.serialNumbers?.length || 0})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedPickList.order?.serialNumbers || []).map((sn) => (
                    <span
                      key={sn.id}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-mono flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      {sn.serial} <span className="text-[10px] text-slate-400">({sn.product?.sku})</span>
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
