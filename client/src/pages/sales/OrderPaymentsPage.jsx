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

  const handleOpenPayment = (order) => {
    setPaymentModalOrder(order);
    // suggest advance (e.g. 20%)
    const suggestedAdvance = Math.round(Number(order.totalAmount) * 0.2);
    setPaymentForm({
      amount: suggestedAdvance.toString(),
      method: 'UPI',
      transactionRef: `UPI-${Date.now().toString().slice(-6)}`,
      notes: '20% Advance booking confirmation',
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

      alert(res.data?.message || 'Payment recorded!');
      setPaymentModalOrder(null);
      loadOrders();
    } catch (err) {
      alert('Payment recording failed: ' + (err.response?.data?.message || err.message));
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
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sales Orders & Payment Gateways</h1>
        <p className="text-xs text-slate-500">
          Rule 4: Order Confirms only after payment → Automatically triggers Pick List, Install Job & Team Notifications
        </p>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => {
          const totalPaid = (order.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
          const balance = Math.max(0, Number(order.totalAmount) - totalPaid);

          return (
            <div key={order.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{order.orderNumber}</h2>
                    <p className="text-xs text-slate-500">Customer: {order.customer?.name} ({order.customer?.phone})</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    order.status === 'CONFIRMED' || order.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {order.status}
                  </span>

                  {order.status === 'PENDING_PAYMENT' && (
                    <button
                      onClick={() => handleOpenPayment(order)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <CreditCard className="w-3.5 h-3.5" /> Record Payment & Confirm
                    </button>
                  )}
                </div>
              </div>

              {/* Order Financials & Rule 4 Links */}
              <div className="grid sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 text-[11px]">Contract Value</span>
                  <p className="text-base font-bold text-slate-900">₹{Number(order.totalAmount).toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 text-[11px]">Paid to Date</span>
                  <p className="text-base font-bold text-emerald-600">₹{totalPaid.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 text-[11px]">Balance Due</span>
                  <p className="text-base font-bold text-slate-700">₹{balance.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 text-[11px]">System Capacity</span>
                  <p className="text-base font-bold text-sky-700">{order.capacityKw} kW Installed</p>
                </div>
              </div>

              {/* Automations triggered by confirmation */}
              {(order.pickLists?.length > 0 || order.installationJobs?.length > 0) && (
                <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 flex flex-wrap gap-4 text-xs">
                  {order.pickLists?.[0] && (
                    <div className="flex items-center gap-1.5 text-sky-800 font-medium">
                      <Boxes className="w-4 h-4 text-sky-600" />
                      Warehouse Pick List: <span className="font-bold">{order.pickLists[0].pickNumber}</span> ({order.pickLists[0].status})
                    </div>
                  )}
                  {order.installationJobs?.[0] && (
                    <div className="flex items-center gap-1.5 text-sky-800 font-medium">
                      <Wrench className="w-4 h-4 text-sky-600" />
                      Installation Job: <span className="font-bold">{order.installationJobs[0].jobNumber}</span> ({order.installationJobs[0].status})
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Record Payment & Confirm Order</h3>
              <button onClick={() => setPaymentModalOrder(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Recording this payment will atomically execute <span className="font-semibold text-slate-800">Rule 4</span> (generate Warehouse Pick List and schedule Technician Installation).
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Payment Amount (₹)</label>
                <input
                  type="number"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-bold text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Method</label>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Transaction Ref</label>
                  <input
                    type="text"
                    value={paymentForm.transactionRef}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                    placeholder="Ref ID / UTR"
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Scheduled Installation Date</label>
                <input
                  type="date"
                  value={paymentForm.scheduledInstallDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, scheduledInstallDate: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md transition-all"
              >
                Confirm Payment & Trigger Automations
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
