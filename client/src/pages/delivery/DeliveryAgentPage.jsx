import React, { useEffect, useState } from 'react';
import { deliveryAgentApi } from '../../api';
import { CheckCircle2, MapPin, Phone, PackageCheck, ScanLine, Truck } from 'lucide-react';

export default function DeliveryAgentPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [scanInputs, setScanInputs] = useState({});
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
        [pickList.id]: { type: 'error', text: 'Scan every serialized product before confirming handover.' },
      }));
      return;
    }
    if (!form.recipientName?.trim() || !form.addressConfirmed) {
      setError('Enter the recipient name and confirm the registered delivery address before handover.');
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
        notes: 'Confirmed by delivery agent at customer site.',
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

  const updateStatus = async (delivery, status) => {
    try {
      const form = handoffForms[delivery.id] || {};
      await deliveryAgentApi.updateStatus(delivery.orderId, {
        status,
        latitude: form.latitude,
        longitude: form.longitude,
      });
      await loadDeliveries();
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message);
    }
  };

  const captureLocation = (pickListId) => {
    if (!navigator.geolocation) {
      setLocationStatus((previous) => ({ ...previous, [pickListId]: 'Location is not supported by this browser.' }));
      return;
    }
    setLocationStatus((previous) => ({ ...previous, [pickListId]: 'Requesting location permission...' }));
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
        setLocationStatus((previous) => ({ ...previous, [pickListId]: 'Location captured.' }));
      },
      () => setLocationStatus((previous) => ({ ...previous, [pickListId]: 'Location unavailable; address confirmation is still required.' })),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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
        throw new Error(`Serial ${expected.serial} was already scanned.`);
      }
      setVerifiedSerials((previous) => ({
        ...previous,
        [pickList.id]: [...current, expected],
      }));
      setScanInputs((previous) => ({ ...previous, [pickList.id]: '' }));
      setScanMessages((previous) => ({
        ...previous,
        [pickList.id]: { type: 'success', text: `Verified ${expected.serial}.` },
      }));
    } catch (requestError) {
      setScanMessages((previous) => ({
        ...previous,
        [pickList.id]: { type: 'error', text: requestError.response?.data?.message || requestError.message },
      }));
    }
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
      <div className="odoo-hero-gradient relative overflow-hidden rounded-3xl p-6 text-white shadow-xl shadow-[#714b67]/15">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#f09e38]/20 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
            <Truck className="h-7 w-7 text-[#f09e38]" />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#f6d5a5]">Logistics workspace</p>
            <h1 className="text-xl font-black tracking-tight">Assigned Deliveries</h1>
            <p className="mt-1 text-xs text-[#f5edf3]/80">Move verified solar equipment safely to every customer.</p>
          </div>
        </div>
      </div>
      {error && <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-rose-500" />{error}</div>}
      {deliveries.length === 0 ? (
        <div className="ui-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#f5edf3]">
            <PackageCheck className="h-8 w-8 text-[#714b67]" />
          </div>
          <h2 className="text-sm font-black text-[#241621]">All clear for now</h2>
          <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">No completed warehouse pick lists are currently assigned to you.</p>
        </div>
      ) : deliveries.map((delivery) => (
        <article key={delivery.id} className="ui-card ui-card-interactive p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#935f87]">Pick list</p>
              <p className="mt-1 font-black text-[#241621]">{delivery.pickNumber}</p>
              <p className="text-xs text-slate-500">Order {delivery.order?.orderNumber}</p>
            </div>
            <div className="text-right">
              <PackageCheck className="ml-auto h-7 w-7 text-[#714b67]" />
              <span className="mt-1 inline-flex rounded-full bg-[#f5edf3] px-2.5 py-1 text-[10px] font-black tracking-wide text-[#714B67]">
                {delivery.order?.deliveries?.[0]?.status || deliveryStatuses[delivery.id] || 'ASSIGNED'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#faf6f9] px-3 py-2 text-[11px] text-slate-500">
            <span className="font-black text-[#714B67]">Assigned</span>
            <span>→</span>
            <span className={delivery.order?.deliveries?.[0]?.deliveryDate ? 'font-semibold text-[#714B67]' : ''}>In transit</span>
            <span>→</span>
            <span className={delivery.order?.deliveries?.[0]?.validatedAt ? 'font-semibold text-[#714B67]' : ''}>Arrived</span>
            <span>→</span>
            <span className={delivery.order?.deliveries?.[0]?.deliveredAt ? 'font-semibold text-emerald-700' : ''}>Delivered</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500">
            {[
              ['Departed', delivery.order?.deliveries?.[0]?.deliveryDate],
              ['Arrived', delivery.order?.deliveries?.[0]?.validatedAt],
              ['Delivered', delivery.order?.deliveries?.[0]?.deliveredAt],
            ].map(([label, timestamp]) => (
              <div key={label}>
                <span className="block font-semibold">{label}</span>
                <span>{timestamp ? new Date(timestamp).toLocaleString() : 'Pending'}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[#ebdce7] bg-white p-4 text-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#935f87]">Customer destination</p>
            <p className="mt-1 font-black text-[#241621]">{delivery.order?.customer?.name}</p>
            <div className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
              <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-[#714b67]" />{delivery.order?.customer?.phone}</p>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#714b67]" />{delivery.order?.customer?.city || 'Customer address'}</p>
            </div>
            <p className="mt-2 border-t border-[#ebdce7] pt-2 text-xs text-slate-500">{delivery.order?.customer?.address || 'No registered address'}</p>
          </div>
          <div className="space-y-3 rounded-2xl border border-[#ebdce7] bg-[#fffaff] p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#935f87]">Customer handover details</p>
            <input
              value={handoffForms[delivery.id]?.recipientName || ''}
              onChange={(event) => setHandoffForms((previous) => ({
                ...previous,
                [delivery.id]: { ...(previous[delivery.id] || {}), recipientName: event.target.value },
              }))}
              placeholder="Recipient name"
              className="ui-input w-full shadow-sm"
            />
            <label className="flex items-start gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={Boolean(handoffForms[delivery.id]?.addressConfirmed)}
                onChange={(event) => setHandoffForms((previous) => ({
                  ...previous,
                  [delivery.id]: { ...(previous[delivery.id] || {}), addressConfirmed: event.target.checked },
                }))}
                className="mt-0.5 h-4 w-4 accent-[#714b67]"
              />
              <span className="leading-relaxed">I confirm I am at the registered customer address shown above.</span>
            </label>
            <button
              type="button"
              onClick={() => captureLocation(delivery.id)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d9bfd2] bg-gradient-to-r from-[#fffaff] to-[#f5edf3] px-4 py-2.5 text-xs font-extrabold text-[#714b67] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#714b67] hover:shadow-md active:translate-y-0"
            >
              <MapPin className="h-4 w-4" /> Capture current GPS location
            </button>
            <div className="flex gap-2">
              {[
                ['IN_TRANSIT', 'Mark in transit', 'ASSIGNED'],
                ['ARRIVED', 'Mark arrived', 'IN_TRANSIT'],
              ].map(([status, label, requiredStatus]) => (
                <button
                  type="button"
                  key={status}
                  onClick={() => updateStatus(delivery, status)}
                  disabled={(delivery.order?.deliveries?.[0]?.status || deliveryStatuses[delivery.id] || 'ASSIGNED') !== requiredStatus}
                  className={`rounded-xl px-4 py-2.5 text-xs font-extrabold transition-all ${
                    status === 'IN_TRANSIT'
                      ? 'bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] shadow-md shadow-[#f09e38]/20 hover:-translate-y-0.5'
                      : 'bg-gradient-to-r from-[#714b67] to-[#5e3d55] text-white shadow-md shadow-[#714b67]/20 hover:-translate-y-0.5'
                  } disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none`}
                >
                  {label}
                </button>
              ))}
            </div>
            {locationStatus[delivery.id] && (
              <p className="text-[11px] text-slate-500">{locationStatus[delivery.id]}</p>
            )}
          </div>
          {(delivery.order?.serialNumbers || []).length > 0 && (
            <div className="rounded-2xl border border-[#ebdce6] bg-[#FAF6F9] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ScanLine className="w-4 h-4 text-[#714b67]" /> Verify loaded serials
                </p>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#714b67] shadow-sm">
                  {(verifiedSerials[delivery.id] || []).length}/{delivery.order.serialNumbers.length}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#ebdce7]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#f09e38] to-[#714b67] transition-all duration-500"
                  style={{ width: `${Math.min(100, ((verifiedSerials[delivery.id] || []).length / delivery.order.serialNumbers.length) * 100)}%` }}
                />
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  verifySerial(delivery);
                }}
                className="flex gap-2"
              >
                <input
                  value={scanInputs[delivery.id] || ''}
                  onChange={(event) => setScanInputs((previous) => ({ ...previous, [delivery.id]: event.target.value }))}
                  placeholder="Scan serial barcode"
                  className="ui-input min-w-0 flex-1"
                />
                <button type="submit" className="rounded-xl bg-gradient-to-r from-[#714b67] to-[#5e3d55] px-4 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#714b67]/20 transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0">
                  <ScanLine className="mr-1 inline h-3.5 w-3.5" /> Verify
                </button>
              </form>
              {scanMessages[delivery.id] && (
                <p className={`text-xs font-semibold ${scanMessages[delivery.id].type === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {scanMessages[delivery.id].text}
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => confirmDelivery(delivery)}
            disabled={
              busyId === delivery.id ||
              (delivery.order?.deliveries?.[0]?.status || deliveryStatuses[delivery.id] || 'ASSIGNED') !== 'ARRIVED' ||
              (delivery.order?.serialNumbers?.length > 0 &&
                (verifiedSerials[delivery.id] || []).length !== delivery.order.serialNumbers.length)
            }
            className="w-full rounded-xl bg-gradient-to-r from-[#714b67] via-[#714b67] to-[#5e3d55] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#714b67]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:from-slate-300 disabled:via-slate-300 disabled:to-slate-400 disabled:text-slate-500 disabled:shadow-none"
          >
            <CheckCircle2 className="inline w-4 h-4 mr-2" />
            {busyId === delivery.id
              ? 'Confirming...'
              : (delivery.order?.deliveries?.[0]?.status || deliveryStatuses[delivery.id] || 'ASSIGNED') !== 'ARRIVED'
                ? 'Mark arrived before handover'
                : 'Confirm customer handover'}
          </button>
        </article>
      ))}
    </div>
  );
}
