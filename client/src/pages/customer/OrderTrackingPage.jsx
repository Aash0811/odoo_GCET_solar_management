import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerPortalApi, ordersApi } from '../../api';
import {
  Truck,
  CheckCircle2,
  Clock,
  Calendar,
  CreditCard,
  Download,
  AlertCircle,
  PackageCheck,
  Wrench,
  ShieldCheck,
  User,
  Phone,
  Layers,
  ChevronRight,
  Boxes,
  Sparkles,
  X,
  Wallet,
  Receipt,
  Check,
} from 'lucide-react';

const ORDER_STAGES = [
  { key: 'CONFIRMED', label: 'Order Confirmed', icon: CheckCircle2, desc: 'Advance payment verified' },
  { key: 'PICKING', label: 'Material Picking', icon: Boxes, desc: 'Hardware & panels packed' },
  { key: 'DISPATCHED', label: 'Dispatched & Transit', icon: Truck, desc: 'Out for site delivery' },
  { key: 'INSTALLATION_IN_PROGRESS', label: 'On-Roof Installation', icon: Wrench, desc: 'Technician crew on site' },
  { key: 'COMPLETED', label: 'Commissioned & Active', icon: ShieldCheck, desc: 'Power tested & handed over' },
];

export default function OrderTrackingPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Customer Dummy Payment Modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payingOrder, setPayingOrder] = useState(null);
  const [payForm, setPayForm] = useState({
    amount: '',
    method: 'DUMMY',
    transactionRef: '',
    notes: 'Customer Portal Dummy Payment',
  });
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccessMessage, setPaySuccessMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await customerPortalApi.getMe();
      const ordList = res.data?.data?.orders || res.data?.orders || [];
      setOrders(ordList);
      if (ordList.length > 0) {
        if (selectedOrder) {
          const updated = ordList.find((o) => o.id === selectedOrder.id) || ordList[0];
          setSelectedOrder(updated);
        } else {
          setSelectedOrder(ordList[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load customer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCustomerPay = (order, targetAmount) => {
    const total = Number(order.totalAmount || 0);
    const paid = (order.payments || [])
      .filter((p) => p.status === 'COMPLETED' && p.isVerified !== false)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const balance = Math.max(0, total - paid);
    const defaultAmount = targetAmount || (paid === 0 ? Math.round(total * 0.3) : balance);

    setPayingOrder(order);
    setPayForm({
      amount: defaultAmount.toString(),
      method: 'DUMMY',
      transactionRef: `DUMMY-CUST-${Date.now().toString().slice(-6)}`,
      notes: 'Customer Portal Payment Submission',
    });
    setPayModalOpen(true);
  };

  const handleCustomerSubmitPay = async (e) => {
    e.preventDefault();
    if (!payingOrder) return;
    setPayLoading(true);
    try {
      const res = await ordersApi.recordPayment(payingOrder.id, {
        amount: Number(payForm.amount),
        method: payForm.method,
        transactionRef: payForm.transactionRef || `DUMMY-${Date.now().toString().slice(-6)}`,
        notes: payForm.notes,
      });

      setPaySuccessMessage(
        res.data?.message || 'Payment submitted for accountant verification.'
      );
      setPayModalOpen(false);
      setTimeout(() => setPaySuccessMessage(''), 6000);
      await loadData();
    } catch (err) {
      alert('Payment processing failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Get index of stage for progress
  const getStageIndex = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return 0;
      case 'PICKING':
      case 'READY_FOR_DISPATCH':
        return 1;
      case 'DISPATCHED':
      case 'DELIVERED':
        return 2;
      case 'INSTALLATION_IN_PROGRESS':
        return 3;
      case 'COMPLETED':
        return 4;
      default:
        return 0;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">Solar Order &amp; Delivery Tracking</h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Real-time status of equipment packing, dispatch, technician schedule, and milestone receipts.
          </p>
        </div>
      </div>

      {paySuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{paySuccessMessage}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-[#EBDCE7] space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#F5EDF3] text-[#714B67] flex items-center justify-center mx-auto">
            <Truck className="w-8 h-8 text-[#f09e38]" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#241621]">No Active Solar Orders</h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Your confirmed orders, equipment shipments, and installation schedules will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Orders Queue - Left 4 cols */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs font-black text-[#714B67] uppercase tracking-wider">
              My Orders ({orders.length})
            </h2>

            <div className="space-y-2.5 overflow-y-auto max-h-[75vh]">
              {orders.map((o) => {
                const isSelected = selectedOrder?.id === o.id;
                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrder(o)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#F5EDF3] to-white border-[#714B67] shadow-md ring-2 ring-[#714B67]/20'
                        : 'bg-white border-[#EBDCE7] hover:border-[#b886ad]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-black text-xs text-[#714B67]">{o.orderNumber}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          o.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-[#EBDCE7]/60 text-xs">
                      <span className="text-[#714B67] font-bold">{o.capacityKw} kW System</span>
                      <span className="font-black text-[#241621]">₹{Number(o.totalAmount).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Order Stepper & Details - Right 8 cols */}
          {selectedOrder && (() => {
            const orderTotal = Number(selectedOrder.totalAmount || 0);
            const orderPaid = (selectedOrder.payments || [])
              .filter((p) => p.status === 'COMPLETED' && p.isVerified !== false)
              .reduce((s, p) => s + Number(p.amount || 0), 0);
            const orderBalance = Math.max(0, orderTotal - orderPaid);
            const minAdvance = Number(selectedOrder.minAdvanceAmount || Math.round(orderTotal * 0.3));
            const isAdvanceMet = orderPaid >= minAdvance;
            const advanceDeficit = Math.max(0, minAdvance - orderPaid);

            return (
              <div className="lg:col-span-8 odoo-glass-card p-6 rounded-3xl space-y-6">
                {/* Order Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EBDCE7]">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-[#241621]">{selectedOrder.orderNumber}</h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f09e38]/15 text-[#d4821a] font-extrabold border border-[#f09e38]/30">
                        {selectedOrder.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Capacity: <strong className="text-[#714B67]">{selectedOrder.capacityKw} kW</strong> • Placed on{' '}
                      {new Date(selectedOrder.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Investment</span>
                    <span className="text-xl font-black text-[#714B67]">
                      ₹{orderTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Customer Payment Action Banner (Sandbox Dummy Gateway) */}
                {orderBalance > 0 && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border border-[#f09e38]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#d4821a]" />
                        <span className="text-xs font-black text-[#241621]">
                          {isAdvanceMet ? 'Outstanding Balance Due: ' : 'Advance Booking Deposit Required: '}
                          <strong className="text-emerald-700 font-mono text-sm">
                            ₹{(isAdvanceMet ? orderBalance : advanceDeficit).toLocaleString('en-IN')}
                          </strong>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {isAdvanceMet
                          ? `Verified collected: ₹${orderPaid.toLocaleString('en-IN')} (${Math.round((orderPaid / (orderTotal || 1)) * 100)}%). Submit the remaining balance for accountant verification.`
                          : `Minimum 30% advance (₹${minAdvance.toLocaleString('en-IN')}) is required to release warehouse picking, hardware packing, and installation schedule.`}
                      </p>
                    </div>

                    <button
                      onClick={() => handleOpenCustomerPay(selectedOrder, isAdvanceMet ? orderBalance : advanceDeficit)}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-[#f09e38] hover:opacity-95 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-[#f09e38]/20 transition cursor-pointer shrink-0"
                    >
                      <CreditCard className="w-4 h-4 text-slate-950" /> ⚡ Pay with Dummy Gateway
                    </button>
                  </div>
                )}

                {/* Visual 5-Stage Stepper */}
                <div className="p-5 bg-white rounded-2xl border border-[#EBDCE7] shadow-xs space-y-4">
                <h3 className="text-xs font-black text-[#714B67] uppercase tracking-wider">
                  Fulfillment &amp; Installation Progress
                </h3>

                <div className="grid grid-cols-5 gap-2 relative">
                  {ORDER_STAGES.map((stg, idx) => {
                    const currentIdx = getStageIndex(selectedOrder.status);
                    const isDone = idx <= currentIdx;
                    const isCurrent = idx === currentIdx;
                    const Icon = stg.icon;

                    return (
                      <div key={stg.key} className="flex flex-col items-center text-center space-y-1.5">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                            isDone
                              ? 'bg-[#714B67] text-white shadow-md shadow-[#714B67]/20 ring-2 ring-[#f09e38]'
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-[11px] font-extrabold block leading-tight ${
                            isDone ? 'text-[#241621]' : 'text-slate-400'
                          }`}
                        >
                          {stg.label}
                        </span>
                        <span className="text-[9px] text-slate-400 leading-tight hidden sm:block">{stg.desc}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedOrder.deliveries?.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-[#EBDCE7] space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-[#714B67] uppercase tracking-wider flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4" /> Delivery timeline
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5EDF3] text-[#714B67] font-black">
                      {selectedOrder.deliveries[0].status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      ['ASSIGNED', 'Assigned', selectedOrder.deliveries[0].createdAt],
                      ['IN_TRANSIT', 'In transit', selectedOrder.deliveries[0].deliveryDate],
                      ['ARRIVED', 'Arrived', selectedOrder.deliveries[0].validatedAt],
                      ['DELIVERED', 'Delivered', selectedOrder.deliveries[0].deliveredAt],
                    ].map(([status, label, timestamp]) => {
                      const statusOrder = ['ASSIGNED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'];
                      const currentIndex = statusOrder.indexOf(selectedOrder.deliveries[0].status);
                      const complete = statusOrder.indexOf(status) <= currentIndex;
                      return (
                        <div key={status} className="space-y-1">
                          <div className={`mx-auto w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                            complete ? 'bg-[#714B67] text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {complete ? '✓' : '•'}
                          </div>
                          <p className={`text-[10px] font-bold ${complete ? 'text-[#241621]' : 'text-slate-400'}`}>{label}</p>
                          {timestamp && (
                            <p className="text-[9px] text-slate-400">
                              {new Date(timestamp).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-[#EBDCE7]/70">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Delivery address</span>
                      <span className="font-bold text-slate-700">{selectedOrder.deliveries[0].deliveryAddress || 'Pending confirmation'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Recipient</span>
                      <span className="font-bold text-slate-700">{selectedOrder.deliveries[0].deliveredTo || 'Pending'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Customer acceptance</span>
                      <span className={`font-bold ${selectedOrder.deliveries[0].customerAccepted ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {selectedOrder.deliveries[0].customerAccepted ? 'Accepted' : 'Awaiting signature'}
                      </span>
                    </div>
                    {selectedOrder.deliveries[0].status === 'DELIVERED' && !selectedOrder.deliveries[0].customerAccepted && (
                      <button
                        type="button"
                        onClick={() => navigate('/customer/acceptance')}
                        className="w-full rounded-xl bg-[#714B67] text-white py-2.5 text-xs font-black hover:bg-[#5e3d55] transition"
                      >
                        Review and sign delivery acceptance
                      </button>
                    )}
                    {selectedOrder.deliveries[0].customerAccepted && (
                      <div className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
                        Delivery acceptance completed on {new Date(selectedOrder.deliveries[0].customerAcceptedAt).toLocaleDateString()}.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Technician Crew & Installation Schedule */}
              {selectedOrder.installationJobs && selectedOrder.installationJobs.length > 0 && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#F5EDF3] to-[#FAF6F9] border border-[#EBDCE7] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#241621] flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-[#714B67]" /> Assigned Technician Installation Crew
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {selectedOrder.installationJobs[0].status}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3 text-xs pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Lead Technician</span>
                      <span className="font-extrabold text-[#241621]">
                        {selectedOrder.installationJobs[0].technician?.name || 'Assigned Crew'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Contact Phone</span>
                      <span className="font-bold text-slate-700">
                        {selectedOrder.installationJobs[0].technician?.phone || '+91 98490 00000'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Scheduled Date</span>
                      <span className="font-extrabold text-[#714B67]">
                        {selectedOrder.installationJobs[0].scheduledAt
                          ? new Date(selectedOrder.installationJobs[0].scheduledAt).toLocaleDateString()
                          : 'Within 3 Business Days'}
                      </span>
                    </div>
                  </div>

                  {selectedOrder.installationJobs?.[0]?.scheduledAt && (
                    <div className="pt-2 border-t border-[#EBDCE7]/80 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-emerald-900 font-extrabold">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Comprehensive Service &amp; Hardware Warranty
                      </span>
                      <span className="font-mono font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        Active from {new Date(selectedOrder.installationJobs[0].scheduledAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Payments & Receipts Ledger */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-[#714B67] uppercase tracking-wider">
                    Payment Milestones &amp; Official Receipts
                  </h3>
                  {orderBalance > 0 && (
                    <button
                      onClick={() => handleOpenCustomerPay(selectedOrder, isAdvanceMet ? orderBalance : advanceDeficit)}
                      className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10.5px] font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" /> ⚡ Pay Online (Dummy Gateway)
                    </button>
                  )}
                </div>

                <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
                  <div className="bg-[#F5EDF3] p-2.5 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                    <div className="col-span-4">Receipt / Milestone</div>
                    <div className="col-span-3 text-center">Payment Mode</div>
                    <div className="col-span-3 text-right">Amount Paid</div>
                    <div className="col-span-2 text-center">Receipt</div>
                  </div>

                  {selectedOrder.payments && selectedOrder.payments.length > 0 ? (
                    selectedOrder.payments.map((pmt) => (
                      <div key={pmt.id} className="p-3 grid grid-cols-12 items-center hover:bg-[#FAF6F9]">
                        <div className="col-span-4 font-extrabold text-[#241621]">
                          {pmt.receiptNumber || 'Advance Payment'}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            {new Date(pmt.receivedAt || pmt.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="col-span-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {pmt.method === 'DUMMY' ? '⚡ DUMMY (Simulated)' : pmt.paymentMethod || pmt.method || 'UPI / Bank Transfer'}
                          </span>
                        </div>
                        <div className="col-span-3 text-right font-black text-emerald-700">
                          ₹{Number(pmt.amount).toLocaleString('en-IN')}
                        </div>
                        <div className="col-span-2 text-center">
                          <a
                            href={ordersApi.downloadReceiptUrl(selectedOrder.id, pmt.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#714B67] hover:underline"
                          >
                            <Download className="w-3 h-3 text-[#f09e38]" /> PDF
                          </a>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400">No payment records found for this order.</div>
                  )}
                </div>
              </div>
            </div>
            );
          })()}
        </div>
      )}

      {/* Customer Payment Modal (Sandbox Dummy Gateway) */}
      {payModalOpen && payingOrder && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] text-xs animate-fade-in">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-amber-500/15 text-[#f09e38] border border-[#f09e38]/30">
                  <CreditCard className="w-5 h-5 text-[#f09e38]" />
                </span>
                <div>
                  <h3 className="text-base font-black text-[#241621]">⚡ Solar Payment Submission</h3>
                  <span className="text-[10px] text-slate-500 font-semibold">
                    {payingOrder.orderNumber} • Sandbox Dummy Simulation
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPayModalOpen(false)}
                className="text-[#b886ad] hover:text-[#714B67] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              <strong>Safe Dummy Payment:</strong> Test your order payment without bank deductions. Submission creates a pending payment for accountant verification; milestones and order release update after approval.
            </p>

            <form onSubmit={handleCustomerSubmitPay} className="space-y-3.5">
              {/* Milestone Quick Sets */}
              <div>
                <span className="text-[11px] font-bold text-[#b886ad] block mb-1">Select Milestone to Pay:</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '30% Advance', pct: 0.3 },
                    { label: '50% Delivery', pct: 0.5 },
                    { label: 'Full Balance', pct: 1.0 },
                  ].map(({ label, pct }) => {
                    const totalAmt = Number(payingOrder.totalAmount || 0);
                    const calc = Math.round(totalAmt * pct);
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setPayForm({ ...payForm, amount: calc.toString() })}
                        className="px-2 py-2 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] text-[10.5px] font-extrabold text-[#714B67] hover:bg-[#F5EDF3] transition text-center cursor-pointer"
                      >
                        <div>{label}</div>
                        <div className="text-[10px] font-mono text-slate-500">₹{calc.toLocaleString('en-IN')}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Payment Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#EBDCE7] font-black text-lg text-[#241621] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Payment Method</label>
                  <select
                    value={payForm.method}
                    onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    <option value="DUMMY">⚡ Dummy Payment (Simulation)</option>
                    <option value="UPI">UPI / QR Code (Simulated)</option>
                    <option value="CARD">Debit / Credit Card (Simulated)</option>
                    <option value="BANK_TRANSFER">Net Banking (Simulated)</option>
                  </select>
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Simulation Reference / UTR</label>
                  <input
                    type="text"
                    value={payForm.transactionRef}
                    onChange={(e) => setPayForm({ ...payForm, transactionRef: e.target.value })}
                    placeholder="DUMMY-REF-..."
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Accountant verification: Triggers order release and makes the payment eligible for receipt download.</span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={payLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {payLoading ? (
                    'Processing...'
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Confirm ₹{Number(payForm.amount || 0).toLocaleString('en-IN')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
