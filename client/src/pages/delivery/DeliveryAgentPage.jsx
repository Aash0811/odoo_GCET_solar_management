import React, { useEffect, useState } from 'react';
import { deliveryAgentApi } from '../../api';
import {
  CheckCircle2,
  MapPin,
  Phone,
  PackageCheck,
  ScanLine,
  Truck,
  AlertCircle,
  ShieldCheck,
  Check,
  Clock,
  Sparkles,
  ArrowRight,
  Boxes,
  Zap,
} from 'lucide-react';

export default function DeliveryAgentPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [scanInputs, setScanInputs] = useState({});
  const [loadedVanSerials, setLoadedVanSerials] = useState({});
  const [verifiedSerials, setVerifiedSerials] = useState({});
  const [scanMessages, setScanMessages] = useState({});
  const [deliveryStatuses, setDeliveryStatuses] = useState({});
  const [handoffForms, setHandoffForms] = useState({});
  const [locationStatus, setLocationStatus] = useState({});

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await deliveryAgentApi.list();
      setDeliveries(response.data?.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const confirmDelivery = async (pickList) => {
    const serials = verifiedSerials[pickList.id] || [];
    const expectedSerials = pickList.order?.serialNumbers || [];
    const form = handoffForms[pickList.id] || {};
    if (expectedSerials.length > 0 && serials.length !== expectedSerials.length) {
      setScanMessages((previous) => ({
        ...previous,
        [pickList.id]: {
          type: 'error',
          text: `Van Sweep Incomplete: ${expectedSerials.length - serials.length} product(s) still inside the van! Unload & scan all items before customer handover.`,
        },
      }));
      return;
    }
    if (!form.recipientName?.trim() || !form.addressConfirmed) {
      setError('Enter recipient name and confirm the customer address checkbox before handover.');
      return;
    }
    setBusyId(pickList.id);
    setError('');
    try {
      await deliveryAgentApi.confirmDelivery(pickList.orderId, {
        deliveryDate: new Date().toISOString(),
        deliveredTo: form.recipientName.trim(),
        recipientPhone: pickList.order?.customer?.phone,
        deliveryAddress: pickList.order?.customer?.address,
        addressConfirmed: true,
        notes: 'Confirmed by delivery agent at customer site. Delivery van swept 100% empty.',
        verifiedSerials: serials.map((serial) => serial.serial),
        latitude: form.latitude,
        longitude: form.longitude,
      });
      await loadDeliveries();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      setBusyId('');
    }
  };

  const updateStatus = async (delivery, status, extraData = {}) => {
    try {
      setBusyId(delivery.id);
      const form = handoffForms[delivery.id] || {};
      await deliveryAgentApi.updateStatus(delivery.orderId, {
        status,
        latitude: form.latitude,
        longitude: form.longitude,
        ...extraData,
      });
      await loadDeliveries();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    } finally {
      setBusyId('');
    }
  };

  const captureLocation = (pickListId) => {
    if (!navigator.geolocation) {
      setLocationStatus((previous) => ({ ...previous, [pickListId]: 'Location is not supported by this browser.' }));
      return;
    }
    setLocationStatus((previous) => ({ ...previous, [pickListId]: 'Requesting GPS location...' }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setHandoffForms((previous) => ({
          ...previous,
          [pickListId]: {
            ...(previous[pickListId] || {}),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        }));
        setLocationStatus((previous) => ({ ...previous, [pickListId]: 'GPS location captured successfully.' }));
      },
      () => setLocationStatus((previous) => ({ ...previous, [pickListId]: 'Location unavailable; address checkbox still confirms arrival.' })),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Phase 1: Van Loading Scan at Warehouse
  const scanVanLoadingSerial = async (delivery) => {
    const code = (scanInputs[delivery.id] || '').trim();
    if (!code) return;
    try {
      const response = await deliveryAgentApi.lookupBarcode(code);
      const scanned = response.data?.data;
      const expected = (delivery.order?.serialNumbers || []).find(
        (serial) => serial.serial.toLowerCase() === (scanned?.serial || code).toLowerCase()
      );
      if (!scanned?.found || scanned.type !== 'SERIAL' || !expected) {
        throw new Error('This serial number is not assigned to this delivery pick list.');
      }
      const current = loadedVanSerials[delivery.id] || [];
      if (current.some((serial) => serial.id === expected.id)) {
        throw new Error(`Serial ${expected.serial} is already loaded into your van.`);
      }
      setLoadedVanSerials((previous) => ({
        ...previous,
        [delivery.id]: [...current, expected],
      }));
      setScanInputs((previous) => ({ ...previous, [delivery.id]: '' }));
      setScanMessages((previous) => ({
        ...previous,
        [delivery.id]: { type: 'success', text: `Loaded into Van: ${expected.serial} (${expected.product?.name || 'Equipment'})` },
      }));
    } catch (requestError) {
      setScanMessages((previous) => ({
        ...previous,
        [delivery.id]: { type: 'error', text: requestError.response?.data?.message || requestError.message },
      }));
    }
  };

  // Quick load all serials into van (convenience button)
  const quickLoadAllSerials = (delivery) => {
    const expected = delivery.order?.serialNumbers || [];
    setLoadedVanSerials((prev) => ({
      ...prev,
      [delivery.id]: [...expected],
    }));
    setScanMessages((prev) => ({
      ...prev,
      [delivery.id]: { type: 'success', text: `All ${expected.length} serialized equipment units loaded into delivery van!` },
    }));
  };

  // Start journey to customer
  const handleDepartWarehouse = async (delivery) => {
    const loaded = loadedVanSerials[delivery.id] || [];
    const expected = delivery.order?.serialNumbers || [];
    if (expected.length > 0 && loaded.length < expected.length) {
      const confirmDepart = window.confirm(
        `Only ${loaded.length}/${expected.length} serialized products have been scanned into the van. Do you wish to start journey towards the customer now?`
      );
      if (!confirmDepart) return;
    }
    await updateStatus(delivery, 'IN_TRANSIT', {
      loadedVanSerials: loaded.map((s) => s.serial),
    });
  };

  // Phase 3: Customer Site Van Sweep Scan
  const verifySerial = async (pickList) => {
    const code = (scanInputs[pickList.id] || '').trim();
    if (!code) return;
    try {
      const response = await deliveryAgentApi.lookupBarcode(code);
      const scanned = response.data?.data;
      const expected = (pickList.order?.serialNumbers || []).find(
        (serial) => serial.serial.toLowerCase() === (scanned?.serial || code).toLowerCase()
      );
      if (!scanned?.found || scanned.type !== 'SERIAL' || !expected) {
        throw new Error('This serial is not assigned to the selected delivery.');
      }
      const current = verifiedSerials[pickList.id] || [];
      if (current.some((serial) => serial.id === expected.id)) {
        throw new Error(`Serial ${expected.serial} was already scanned out of the van.`);
      }
      setVerifiedSerials((previous) => ({
        ...previous,
        [pickList.id]: [...current, expected],
      }));
      setScanInputs((previous) => ({ ...previous, [pickList.id]: '' }));
      setScanMessages((previous) => ({
        ...previous,
        [pickList.id]: { type: 'success', text: `Unloaded & Verified: ${expected.serial}` },
      }));
    } catch (requestError) {
      setScanMessages((previous) => ({
        ...previous,
        [pickList.id]: { type: 'error', text: requestError.response?.data?.message || requestError.message },
      }));
    }
  };

  // Quick sweep all serials at customer site (convenience button)
  const quickSweepAllSerials = (delivery) => {
    const expected = delivery.order?.serialNumbers || [];
    setVerifiedSerials((prev) => ({
      ...prev,
      [delivery.id]: [...expected],
    }));
    setScanMessages((prev) => ({
      ...prev,
      [delivery.id]: { type: 'success', text: `All ${expected.length} items unloaded from van onto customer premises. Van is 100% empty!` },
    }));
  };

  if (loading) {
    return (
      <div className="ui-page mx-auto max-w-3xl space-y-5">
        <div className="odoo-glass-card flex items-center gap-3 rounded-2xl p-5">
          <div className="h-11 w-11 animate-pulse rounded-2xl bg-[#f5edf3]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-44 animate-pulse rounded bg-[#ebdce7]" />
            <div className="h-3 w-72 max-w-full animate-pulse rounded bg-[#f5edf3]" />
          </div>
        </div>
        {[1, 2].map((item) => (
          <div key={item} className="ui-card space-y-4 p-5">
            <div className="flex justify-between">
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-[#ebdce7]" />
                <div className="h-3 w-24 animate-pulse rounded bg-[#f5edf3]" />
              </div>
              <div className="h-8 w-16 animate-pulse rounded-xl bg-[#f5edf3]" />
            </div>
            <div className="h-16 animate-pulse rounded-xl bg-[#faf6f9]" />
            <div className="h-11 animate-pulse rounded-xl bg-[#faf6f9]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="ui-page mx-auto max-w-3xl space-y-5">
      {/* Hero Header */}
      <div className="odoo-hero-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-[#714b67]/15">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#f09e38]/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Truck className="h-7 w-7 text-[#f09e38]" />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#f6d5a5]">
              Logistics &amp; Van Tracking
            </p>
            <h1 className="text-xl font-black tracking-tight">Delivery Agent Dispatch</h1>
            <p className="mt-1 text-xs text-[#f5edf3]/80">
              Scan-to-load van, transit to customer, and verify 100% empty van sweep upon arrival.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-xs">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="ui-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f5edf3]">
            <PackageCheck className="h-8 w-8 text-[#714b67]" />
          </div>
          <h2 className="text-sm font-black text-[#241621]">All clear for now</h2>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
            No completed warehouse pick lists are currently assigned to you.
          </p>
        </div>
      ) : (
        deliveries.map((delivery) => {
          const currentDelivery = delivery.order?.deliveries?.[0];
          const status = currentDelivery?.status || deliveryStatuses[delivery.id] || 'ASSIGNED';
          const expectedSerials = delivery.order?.serialNumbers || [];
          const loadedSerials = loadedVanSerials[delivery.id] || [];
          const customerUnloadedSerials = verifiedSerials[delivery.id] || [];

          const isVanFullyLoaded = expectedSerials.length === 0 || loadedSerials.length >= expectedSerials.length;
          const isVanSweepComplete = expectedSerials.length === 0 || customerUnloadedSerials.length >= expectedSerials.length;

          return (
            <article key={delivery.id} className="ui-card ui-card-interactive p-5 space-y-4">
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#935f87]">
                    Pick List &amp; Order
                  </p>
                  <p className="mt-1 font-black text-[#241621] font-mono text-base">{delivery.pickNumber}</p>
                  <p className="text-xs text-slate-500 font-mono">Order {delivery.order?.orderNumber}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase ${
                      status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : status === 'ARRIVED'
                        ? 'bg-purple-100 text-purple-800 border border-purple-300'
                        : status === 'IN_TRANSIT'
                        ? 'bg-sky-100 text-sky-800 border border-sky-300 animate-pulse'
                        : 'bg-[#f5edf3] text-[#714B67] border border-[#ebdce7]'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    {status}
                  </span>
                </div>
              </div>

              {/* Lifecycle Breadcrumb */}
              <div className="flex flex-wrap items-center justify-between gap-1 rounded-xl bg-[#faf6f9] px-3.5 py-2.5 text-[11px] text-slate-500 border border-[#ebdce7]">
                <div className="flex items-center gap-1.5">
                  <span className={`font-black ${status === 'ASSIGNED' ? 'text-[#714B67] underline' : 'text-slate-400'}`}>
                    1. Warehouse Load
                  </span>
                  <span>&rarr;</span>
                  <span className={`font-bold ${status === 'IN_TRANSIT' ? 'text-sky-700 font-black underline' : currentDelivery?.deliveryDate ? 'text-slate-700' : 'text-slate-400'}`}>
                    2. In Transit (Van)
                  </span>
                  <span>&rarr;</span>
                  <span className={`font-bold ${status === 'ARRIVED' ? 'text-purple-700 font-black underline' : currentDelivery?.validatedAt ? 'text-slate-700' : 'text-slate-400'}`}>
                    3. Arrived &amp; Van Sweep
                  </span>
                  <span>&rarr;</span>
                  <span className={`font-bold ${status === 'DELIVERED' ? 'text-emerald-700 font-black underline' : currentDelivery?.deliveredAt ? 'text-emerald-600' : 'text-slate-400'}`}>
                    4. Handed to Customer
                  </span>
                </div>
              </div>

              {/* Customer Destination Card */}
              <div className="rounded-2xl border border-[#ebdce7] bg-white p-4 text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#935f87]">
                    Customer Destination
                  </p>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {delivery.order?.capacityKw} kW System
                  </span>
                </div>
                <p className="font-black text-[#241621] text-base">{delivery.order?.customer?.name}</p>
                <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#714b67]" />
                    {delivery.order?.customer?.phone || 'No phone'}
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#714b67]" />
                    {delivery.order?.customer?.city || 'Customer city'}
                  </p>
                </div>
                <p className="border-t border-[#ebdce7] pt-2 text-xs text-slate-500">
                  {delivery.order?.customer?.address || 'No registered address'}
                </p>
              </div>

              {/* ============================================================ */}
              {/* STAGE 1: WAREHOUSE VAN LOADING (STATUS: ASSIGNED)             */}
              {/* ============================================================ */}
              {status === 'ASSIGNED' && (
                <div className="rounded-2xl border-2 border-[#714B67]/30 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-[#714B67] flex items-center gap-1.5">
                        <Boxes className="w-4 h-4 text-[#f09e38]" /> Step 1: Scan Serials to Load Delivery Van
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Scan each product barcode at the warehouse before driving to customer.
                      </p>
                    </div>
                    {expectedSerials.length > 0 && (
                      <span className="rounded-full bg-[#FAF6F9] border border-[#ebdce7] px-2.5 py-1 text-xs font-black text-[#714B67]">
                        Loaded: {loadedSerials.length} / {expectedSerials.length}
                      </span>
                    )}
                  </div>

                  {expectedSerials.length > 0 && (
                    <div className="space-y-2">
                      <div className="h-2 overflow-hidden rounded-full bg-[#ebdce7]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#f09e38] to-[#714b67] transition-all duration-300"
                          style={{
                            width: `${Math.min(100, (loadedSerials.length / expectedSerials.length) * 100)}%`,
                          }}
                        />
                      </div>

                      {/* Expected Serials Checklist */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                        {expectedSerials.map((sn) => {
                          const isLoaded = loadedSerials.some((l) => l.id === sn.id);
                          return (
                            <div
                              key={sn.id}
                              className={`p-2 rounded-xl border flex items-center justify-between ${
                                isLoaded ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                              }`}
                            >
                              <span className="font-mono font-bold text-[11px]">{sn.serial}</span>
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                  isLoaded ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'
                                }`}
                              >
                                {isLoaded ? 'Loaded in Van' : 'Waiting in WH'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Barcode scanner input */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          scanVanLoadingSerial(delivery);
                        }}
                        className="flex gap-2 pt-1"
                      >
                        <input
                          value={scanInputs[delivery.id] || ''}
                          onChange={(e) => setScanInputs((prev) => ({ ...prev, [delivery.id]: e.target.value }))}
                          placeholder="Scan serial barcode into van..."
                          className="ui-input min-w-0 flex-1 text-xs font-mono"
                        />
                        <button
                          type="submit"
                          className="rounded-xl bg-[#714B67] hover:bg-[#5b3c53] px-4 py-2 text-xs font-black text-white cursor-pointer flex items-center gap-1.5"
                        >
                          <ScanLine className="w-3.5 h-3.5" /> Scan In
                        </button>
                        <button
                          type="button"
                          onClick={() => quickLoadAllSerials(delivery)}
                          className="rounded-xl border border-[#ebdce7] hover:bg-[#FAF6F9] px-3 py-2 text-xs font-bold text-[#714B67] cursor-pointer"
                          title="Auto-load all items for test / fast warehouse dispatch"
                        >
                          ⚡ Load All
                        </button>
                      </form>

                      {scanMessages[delivery.id] && (
                        <p
                          className={`text-xs font-semibold ${
                            scanMessages[delivery.id].type === 'success' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {scanMessages[delivery.id].text}
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDepartWarehouse(delivery)}
                    disabled={busyId === delivery.id}
                    className="w-full mt-2 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:from-[#e08e28] hover:to-[#c07212] py-3 text-sm font-extrabold text-[#241621] shadow-md shadow-[#f09e38]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4" />
                    🚚 Confirm Van Loaded &amp; Depart Warehouse (Start Journey)
                  </button>
                </div>
              )}

              {/* ============================================================ */}
              {/* STAGE 2: IN TRANSIT TOWARDS CUSTOMER (STATUS: IN_TRANSIT)     */}
              {/* ============================================================ */}
              {status === 'IN_TRANSIT' && (
                <div className="rounded-2xl border-2 border-sky-300 bg-sky-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-sky-900 flex items-center gap-1.5">
                        <Truck className="w-4 h-4 text-sky-600 animate-pulse" /> Step 2: In Transit Towards Customer
                      </h4>
                      <p className="text-[11px] text-sky-700 mt-0.5">
                        Solar equipment is traveling on your van. Click below when you arrive at customer site.
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-white text-sky-800 border border-sky-200">
                      En Route
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-sky-200 text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">Heading to:</p>
                    <p className="font-mono text-[11px] text-slate-600">
                      {delivery.order?.customer?.address || 'Customer site address'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => updateStatus(delivery, 'ARRIVED')}
                    disabled={busyId === delivery.id}
                    className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 py-3 text-sm font-extrabold text-white shadow-md shadow-sky-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <MapPin className="w-4 h-4" />
                    📍 Arrived at Customer Premises
                  </button>
                </div>
              )}

              {/* ============================================================ */}
              {/* STAGE 3: ARRIVED & VAN SWEEP (STATUS: ARRIVED)               */}
              {/* ============================================================ */}
              {status === 'ARRIVED' && (
                <div className="rounded-2xl border-2 border-purple-300 bg-purple-50/50 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-purple-900 flex items-center gap-1.5">
                        <ScanLine className="w-4 h-4 text-purple-700" /> Step 3: Unload &amp; Van Sweep Verification
                      </h4>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        Scan each item as it is brought out of the van so that <strong>no product is left behind in the vehicle</strong>.
                      </p>
                    </div>
                    {expectedSerials.length > 0 && (
                      <span className="rounded-full bg-white border border-purple-200 px-2.5 py-1 text-xs font-black text-purple-800">
                        Unloaded: {customerUnloadedSerials.length} / {expectedSerials.length}
                      </span>
                    )}
                  </div>

                  {/* Van Sweep Status Alert */}
                  {expectedSerials.length > 0 && (
                    <div
                      className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                        isVanSweepComplete
                          ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                          : 'bg-amber-100 border-amber-300 text-amber-900'
                      }`}
                    >
                      {isVanSweepComplete ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div>
                            <p className="font-black text-emerald-900">🎉 Van Sweep Verified: 100% Accounted For!</p>
                            <p className="text-[11px] font-normal text-emerald-800">
                              0 equipment products left in van. All materials safely placed at customer premises.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                          <div>
                            <p className="font-black text-amber-900">
                              ⚠️ Van Sweep Incomplete: {expectedSerials.length - customerUnloadedSerials.length} Item(s) Still Inside Van!
                            </p>
                            <p className="text-[11px] font-normal text-amber-800">
                              Scan each unloaded product before completing customer handover.
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Unloaded Items Checklist */}
                  {expectedSerials.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {expectedSerials.map((sn) => {
                        const isUnloaded = customerUnloadedSerials.some((u) => u.id === sn.id);
                        return (
                          <div
                            key={sn.id}
                            className={`p-2 rounded-xl border flex items-center justify-between ${
                              isUnloaded
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : 'bg-rose-50 border-rose-300 text-rose-900'
                            }`}
                          >
                            <span className="font-mono font-bold text-[11px]">{sn.serial}</span>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                isUnloaded ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'
                              }`}
                            >
                              {isUnloaded ? 'Unloaded & Verified' : 'Still in Van'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Scan Input for Unloading */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      verifySerial(delivery);
                    }}
                    className="flex gap-2"
                  >
                    <input
                      value={scanInputs[delivery.id] || ''}
                      onChange={(e) => setScanInputs((prev) => ({ ...prev, [delivery.id]: e.target.value }))}
                      placeholder="Scan unloaded product serial..."
                      className="ui-input min-w-0 flex-1 text-xs font-mono"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-purple-700 hover:bg-purple-800 px-4 py-2 text-xs font-black text-white cursor-pointer flex items-center gap-1.5"
                    >
                      <ScanLine className="w-3.5 h-3.5" /> Scan Out
                    </button>
                    <button
                      type="button"
                      onClick={() => quickSweepAllSerials(delivery)}
                      className="rounded-xl border border-purple-300 hover:bg-purple-100/60 px-3 py-2 text-xs font-bold text-purple-800 cursor-pointer"
                      title="Quick sweep all serials for demo"
                    >
                      ⚡ Sweep All
                    </button>
                  </form>

                  {scanMessages[delivery.id] && (
                    <p
                      className={`text-xs font-semibold ${
                        scanMessages[delivery.id].type === 'success' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {scanMessages[delivery.id].text}
                    </p>
                  )}

                  {/* Customer Handover Sign-off Form */}
                  <div className="p-3.5 rounded-xl bg-white border border-purple-200 space-y-2.5 text-xs">
                    <p className="font-black text-slate-800 uppercase text-[10px] tracking-wider">
                      Customer Handover Details
                    </p>
                    <input
                      value={handoffForms[delivery.id]?.recipientName || ''}
                      onChange={(event) =>
                        setHandoffForms((previous) => ({
                          ...previous,
                          [delivery.id]: {
                            ...(previous[delivery.id] || {}),
                            recipientName: event.target.value,
                          },
                        }))
                      }
                      placeholder="Recipient Person Name (e.g. Homeowner)"
                      className="ui-input w-full text-xs font-bold"
                    />

                    <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(handoffForms[delivery.id]?.addressConfirmed)}
                        onChange={(event) =>
                          setHandoffForms((previous) => ({
                            ...previous,
                            [delivery.id]: {
                              ...(previous[delivery.id] || {}),
                              addressConfirmed: event.target.checked,
                            },
                          }))
                        }
                        className="mt-0.5 h-4 w-4 accent-[#714b67]"
                      />
                      <span className="leading-relaxed">
                        I confirm I am standing at the registered customer premises and van is swept empty.
                      </span>
                    </label>

                    <button
                      type="button"
                      onClick={() => captureLocation(delivery.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#ebdce7] bg-[#FAF6F9] px-3 py-1.5 text-xs font-bold text-[#714B67] hover:bg-[#ebdce7] cursor-pointer"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Capture GPS Coordinates
                    </button>
                    {locationStatus[delivery.id] && (
                      <p className="text-[11px] text-slate-500 italic">{locationStatus[delivery.id]}</p>
                    )}
                  </div>

                  {/* Confirm Handover Button */}
                  <button
                    type="button"
                    onClick={() => confirmDelivery(delivery)}
                    disabled={
                      busyId === delivery.id ||
                      !isVanSweepComplete ||
                      !handoffForms[delivery.id]?.recipientName?.trim() ||
                      !handoffForms[delivery.id]?.addressConfirmed
                    }
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400 disabled:text-slate-500 disabled:shadow-none"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {busyId === delivery.id
                      ? 'Confirming Handover...'
                      : !isVanSweepComplete
                      ? '⚠️ Sweep Van Empty Before Handover'
                      : '✅ Confirm Customer Handover (Van Verified 100% Empty)'}
                  </button>
                </div>
              )}

              {/* ============================================================ */}
              {/* STAGE 4: DELIVERED (STATUS: DELIVERED)                        */}
              {/* ============================================================ */}
              {status === 'DELIVERED' && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-black text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Delivery Completed &amp; Van Swept Empty
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Solar panels and inverters successfully delivered to site. Warranties have been created, and the
                    technician team has been notified to proceed with physical installation and commissioning.
                  </p>
                  {currentDelivery?.deliveredTo && (
                    <p className="text-[11px] text-slate-600 font-semibold border-t border-emerald-200/60 pt-1.5">
                      Received by: <strong>{currentDelivery.deliveredTo}</strong> on{' '}
                      {currentDelivery.deliveryDate
                        ? new Date(currentDelivery.deliveryDate).toLocaleString()
                        : new Date().toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </article>
          );
        })
      )}
    </div>
  );
}
