import React, { useState, useEffect } from 'react';
import { ordersApi } from '../../api';
import {
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  CreditCard,
  X,
  Boxes,
  Wrench,
  Sparkles,
  ShieldCheck,
  Calendar,
  Wallet,
} from 'lucide-react';

export default function OrderPaymentsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'UPI',
    transactionRef: '',
    notes: 'Advance booking amount',
    scheduledInstallDate: '',
  });

  const loadOrders = async () => {
    try {
      const res = await ordersApi.list();
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleOpenPayment = (order, percentage = 0.2) => {
    setPaymentModalOrder(order);
    const calculatedAmount = Math.round(Number(order.totalAmount) * percentage);
    setPaymentForm({
      amount: calculatedAmount.toString(),
      method: 'UPI',
      transactionRef: `UPI-${Date.now().toString().slice(-6)}`,
      notes: `${Math.round(percentage * 100)}% Milestone Advance payment`,
      scheduledInstallDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    });
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    try {
      const res = await ordersApi.recordPayment(paymentModalOrder.id, {
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        transactionRef: paymentForm.transactionRef,
        notes: paymentForm.notes,
        scheduledInstallDate: paymentForm.scheduledInstallDate,
      });

      alert(res.data?.message || 'Payment recorded successfully! Rule 4 automations executed.');
      setPaymentModalOrder(null);
      loadOrders();
    } catch (err) {
      alert('Payment recording failed: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">Sales Orders & Milestone Payments</h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Rule 4: Order Confirms only after Deposit → Atomically creates Warehouse Pick List & Schedules Installation Job
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#F5EDF3] border border-[#EBDCE7] text-xs font-black text-[#714B67] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#f09e38]" /> Atomic Transaction Engine
          </span>
        </div>
      </div>

      {/* Orders List */}
      <div className="grid gap-4">
        {orders.map((order) => {
          const totalPaid = (order.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
          const balance = Math.max(0, Number(order.totalAmount) - totalPaid);
          const percentPaid = Math.round((totalPaid / Number(order.totalAmount || 1)) * 100);

          return (
            <div key={order.id} className="p-6 rounded-2xl odoo-glass-card space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#714B67] to-[#935F87] text-white flex items-center justify-center font-bold shadow-md shadow-[#714B67]/30">
                    <Receipt className="w-5 h-5 text-[#f09e38]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-[#241621]">{order.orderNumber}</h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF6F9] border border-[#EBDCE7] text-[#714B67]">
                        {order.capacityKw} kW
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">
                      Customer: <span className="font-bold text-[#241621]">{order.customer?.name}</span> ({order.customer?.phone})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      order.status === 'CONFIRMED' || order.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {order.status}
                  </span>

                  {order.status === 'PENDING_PAYMENT' && (
                    <button
                      onClick={() => handleOpenPayment(order, 0.2)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-[#714B67]/25 transition cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-[#f09e38]" /> Record Deposit (Rule 4)
                    </button>
                  )}
                </div>
              </div>

              {/* Order Financials & Rule 4 Links */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-[#FAF6F9] rounded-xl border border-[#EBDCE7]">
                  <span className="text-slate-500 text-[11px] font-semibold block">Total Contract Value</span>
                  <p className="text-base font-black text-[#241621] mt-0.5">₹{Number(order.totalAmount).toLocaleString()}</p>
                </div>
                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <span className="text-emerald-700 text-[11px] font-semibold block">Collected to Date</span>
                  <p className="text-base font-black text-emerald-800 mt-0.5">₹{totalPaid.toLocaleString()} ({percentPaid}%)</p>
                </div>
                <div className="p-3.5 bg-[#FAF6F9] rounded-xl border border-[#EBDCE7]">
                  <span className="text-slate-500 text-[11px] font-semibold block">Balance Outstanding</span>
                  <p className="text-base font-black text-slate-800 mt-0.5">₹{balance.toLocaleString()}</p>
                </div>
                <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200">
                  <span className="text-purple-700 text-[11px] font-semibold block">System kW Sized</span>
                  <p className="text-base font-black text-[#714B67] mt-0.5">{order.capacityKw} kW Tier-1</p>
                </div>
              </div>

              {/* Rule 4 Spawned Automations */}
              {(order.pickLists?.length > 0 || order.installationJobs?.length > 0) && (
                <div className="p-3.5 bg-gradient-to-r from-[#F5EDF3] to-white rounded-xl border border-[#EBDCE7] flex flex-wrap gap-4 text-xs">
                  {order.pickLists?.[0] && (
                    <div className="flex items-center gap-2 text-[#714B67] font-bold">
                      <Boxes className="w-4 h-4 text-[#f09e38]" />
                      Warehouse Pick List: <span className="font-mono font-black">{order.pickLists[0].pickNumber}</span> ({order.pickLists[0].status})
                    </div>
                  )}
                  {order.installationJobs?.[0] && (
                    <div className="flex items-center gap-2 text-[#714B67] font-bold">
                      <Wrench className="w-4 h-4 text-[#00A09D]" />
                      Installation Job: <span className="font-mono font-black">{order.installationJobs[0].jobNumber}</span> ({order.installationJobs[0].status})
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Record Payment Modal */}
      {paymentModalOrder && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] text-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#714B67]" />
                <h3 className="text-base font-black text-[#241621]">Record Payment & Confirm Order</h3>
              </div>
              <button onClick={() => setPaymentModalOrder(null)} className="text-[#b886ad] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Atomic Execution: Recording this payment will immediately trigger <strong className="text-[#714B67]">Rule 4</strong> (create warehouse pick list, spawn technician installation job, and notify logistics).
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              {/* Quick % buttons */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#b886ad]">Quick Set:</span>
                {[0.2, 0.5, 1.0].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      const calculated = Math.round(Number(paymentModalOrder.totalAmount) * pct);
                      setPaymentForm({ ...paymentForm, amount: calculated.toString() });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#FAF6F9] border border-[#EBDCE7] text-[11px] font-extrabold text-[#714B67] hover:bg-[#F5EDF3] cursor-pointer"
                  >
                    {Math.round(pct * 100)}%
                  </button>
                ))}
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Payment Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#EBDCE7] font-black text-base text-[#241621] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Payment Gateway / Mode</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CASH">Cash Deposit</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Transaction Reference</label>
                  <input
                    type="text"
                    value={paymentForm.transactionRef}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                    placeholder="Ref ID / UTR"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Scheduled Installation Date</label>
                <input
                  type="date"
                  value={paymentForm.scheduledInstallDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, scheduledInstallDate: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                Confirm Payment & Execute Rule 4 Automations
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
