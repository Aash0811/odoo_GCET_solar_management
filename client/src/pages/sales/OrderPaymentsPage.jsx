import React, { useState, useEffect } from 'react';
import { ordersApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import useDebounce from '../../hooks/useDebounce';
import Pagination from '../../components/common/Pagination';
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
  Download,
  Bell,
  Coins,
  AlertTriangle,
  Building,
  Check,
  Percent,
  Search,
} from 'lucide-react';

export default function OrderPaymentsPage() {
  const { user, role } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [paymentModalOrder, setPaymentModalOrder] = useState(null);
  const [reminderLoading, setReminderLoading] = useState({});
  const [actionMessage, setActionMessage] = useState('');

  const canRecordPayment = ['ADMIN', 'ACCOUNTANT', 'SALESMAN'].includes(role);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const filteredOrders = orders.filter((order) => {
    if (!debouncedSearch.trim()) return true;
    const q = debouncedSearch.toLowerCase();
    const matchOrderNum = order.orderNumber?.toLowerCase().includes(q);
    const matchCustName = order.customer?.name?.toLowerCase().includes(q);
    const matchCustPhone = order.customer?.phone?.toLowerCase().includes(q);
    const matchQuoteNum = order.quote?.quoteNumber?.toLowerCase().includes(q);
    const matchStatus = order.status?.toLowerCase().includes(q);
    return matchOrderNum || matchCustName || matchCustPhone || matchQuoteNum || matchStatus;
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'DUMMY',
    transactionRef: '',
    notes: 'Advance booking deposit',
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

  const handleOpenPayment = (order, percentage = 0.3) => {
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

  const handleOpenDummyPayment = (order, percentage = 0.3) => {
    setPaymentModalOrder(order);
    const calculatedAmount = Math.round(Number(order.totalAmount) * percentage);
    setPaymentForm({
      amount: calculatedAmount.toString(),
      method: 'DUMMY',
      transactionRef: `DUMMY-PAY-${Date.now().toString().slice(-6)}`,
      notes: `⚡ Instant Dummy Payment (${Math.round(percentage * 100)}% Milestone Simulation)`,
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

      setActionMessage(res.data?.message || 'Payment recorded successfully!');
      setTimeout(() => setActionMessage(''), 5000);
      setPaymentModalOrder(null);
      loadOrders();
    } catch (err) {
      alert('Payment recording failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSendReminder = async (orderId) => {
    setReminderLoading((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await ordersApi.sendReminder(orderId, {
        notes: 'Automated milestone reminder via WhatsApp & Portal notification',
      });
      setActionMessage(res.data?.message || 'Payment reminder sent to customer!');
      setTimeout(() => setActionMessage(''), 5000);
      loadOrders();
    } catch (err) {
      alert('Reminder failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setReminderLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleDownloadReceipt = async (orderId, paymentId, receiptNumber) => {
    try {
      const res = await ordersApi.downloadReceipt(orderId, paymentId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${receiptNumber || 'receipt'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Receipt download failed: ' + (err.response?.data?.message || err.message));
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
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">Sales Orders, Payments & Milestones</h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Rule: Job released only after 30% advance or full payment → Auto-fires Warehouse PickList, Technician Job & Project Costing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#FAF6F9] border border-[#EBDCE7] text-xs font-black text-[#714B67] flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-[#f09e38]" /> Role: <strong className="text-[#241621]">{role}</strong>
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Atomic Transaction Trigger
          </span>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Search & Filter Bar with Debounce */}
      <div className="bg-white p-4 rounded-3xl border border-[#EBDCE7] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search orders by number, client, phone, or status..."
            className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] text-xs font-semibold text-[#241621] outline-none focus:ring-1 focus:ring-[#714B67]"
          />
        </div>

        <div className="text-[11px] font-bold text-slate-500">
          Showing <span className="text-[#241621] font-black">{filteredOrders.length}</span> of {orders.length} orders
        </div>
      </div>

      {/* Orders List */}
      <div className="grid gap-6">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white border border-[#EBDCE7] text-slate-500">
            <Receipt className="w-12 h-12 text-[#714B67]/40 mx-auto mb-3" />
            <h3 className="font-bold text-[#241621] text-base">No Matching Orders</h3>
            <p className="text-xs mt-1">Try adjusting your search criteria or accept a quote to create an order.</p>
          </div>
        ) : (
          filteredOrders
            .slice((currentPage - 1) * pageSize, currentPage * pageSize)
            .map((order) => {
            const totalPaid = Number(order.totalPaid || 0);
            const totalAmount = Number(order.totalAmount || 0);
            const balance = Number(order.outstandingBalance ?? Math.max(0, totalAmount - totalPaid));
            const percentPaid = Math.round((totalPaid / (totalAmount || 1)) * 100);
            const minAdvanceAmount = Number(order.minAdvanceAmount || Math.round(totalAmount * 0.3));
            const isAdvanceMet = order.isAdvanceSatisfied ?? (totalPaid >= minAdvanceAmount);
            const advanceDeficit = Math.max(0, minAdvanceAmount - totalPaid);

            return (
              <div key={order.id} className="p-6 rounded-3xl bg-white border border-[#EBDCE7] shadow-sm hover:shadow-md transition space-y-5">
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#714B67] to-[#935F87] text-white flex items-center justify-center font-bold shadow-md shadow-[#714B67]/20">
                      <Receipt className="w-6 h-6 text-[#f09e38]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-[#241621]">{order.orderNumber}</h2>
                        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#FAF6F9] border border-[#EBDCE7] text-[#714B67]">
                          {order.capacityKw} kW Tier-1
                        </span>
                        {order.quote?.quoteNumber && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Ref Quote: {order.quote.quoteNumber}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 font-medium">
                        Customer: <span className="font-bold text-[#241621]">{order.customer?.name}</span> • {order.customer?.phone} • {order.customer?.address || 'Site Verified'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        order.status === 'CONFIRMED' || order.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {order.status}
                    </span>

                    {/* Send Reminder Action */}
                    <button
                      onClick={() => handleSendReminder(order.id)}
                      disabled={reminderLoading[order.id] || balance === 0}
                      className="px-3 py-1.5 rounded-xl bg-[#FAF6F9] hover:bg-[#F5EDF3] border border-[#EBDCE7] text-[#714B67] font-bold text-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                      title="Send WhatsApp & Email payment milestone reminder to customer"
                    >
                      <Bell className="w-3.5 h-3.5 text-[#f09e38]" />
                      {reminderLoading[order.id] ? 'Sending...' : 'Remind'}
                    </button>

                    {/* Record Payment Actions (Salesman, Accountant, Admin) */}
                    {canRecordPayment && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleOpenDummyPayment(order, isAdvanceMet ? 0.5 : 0.3)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-[#f09e38] hover:opacity-95 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#f09e38]/20 transition cursor-pointer"
                          title="Instant dummy payment simulation without bank transfer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-slate-950" /> ⚡ Instant Dummy Pay
                        </button>

                        <button
                          onClick={() => handleOpenPayment(order, isAdvanceMet ? 0.5 : 0.3)}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#714B67]/25 transition cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-[#f09e38]" /> Record Payment
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3.5 bg-[#FAF6F9] rounded-2xl border border-[#EBDCE7]">
                    <span className="text-slate-500 text-[10px] font-extrabold uppercase block">Contract Value</span>
                    <p className="text-base font-black text-[#241621] mt-0.5">₹{totalAmount.toLocaleString('en-IN')}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">Incl. 18% GST</span>
                  </div>

                  <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200">
                    <span className="text-emerald-700 text-[10px] font-extrabold uppercase block">Total Collected</span>
                    <p className="text-base font-black text-emerald-800 mt-0.5">
                      ₹{totalPaid.toLocaleString('en-IN')} <span className="text-xs font-bold">({percentPaid}%)</span>
                    </p>
                    <span className="text-[10px] text-emerald-700 font-semibold">{order.payments?.length || 0} installments</span>
                  </div>

                  <div className="p-3.5 bg-[#FAF6F9] rounded-2xl border border-[#EBDCE7]">
                    <span className="text-slate-500 text-[10px] font-extrabold uppercase block">Balance Due</span>
                    <p className="text-base font-black text-[#241621] mt-0.5">₹{balance.toLocaleString('en-IN')}</p>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {balance === 0 ? 'Fully Settled' : 'Pending Payments'}
                    </span>
                  </div>

                  <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-200">
                    <span className="text-[#714B67] text-[10px] font-extrabold uppercase block">Min 30% Advance</span>
                    <p className="text-base font-black text-[#714B67] mt-0.5">₹{minAdvanceAmount.toLocaleString('en-IN')}</p>
                    <span className={`text-[10px] font-bold ${isAdvanceMet ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isAdvanceMet ? '✅ Advance Met' : `⚠️ Deficit: ₹${advanceDeficit.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                </div>

                {/* Rule: Minimum Advance Release Gate Status */}
                <div className={`p-3 rounded-2xl border flex items-center justify-between text-xs font-bold ${
                  isAdvanceMet
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}>
                  <div className="flex items-center gap-2">
                    {isAdvanceMet ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span>
                      {isAdvanceMet
                        ? 'Rule Satisfied: Minimum 30% advance received. Order confirmed and operations released.'
                        : `Rule Restriction: Installation job & warehouse delivery held until minimum 30% advance (₹${minAdvanceAmount.toLocaleString('en-IN')}) is recorded.`}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-black">
                    {percentPaid}% of Contract
                  </span>
                </div>

                {/* Payment Schedule & Milestones (Advance, Delivery, Commissioning) */}
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-[#241621] uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#f09e38]" /> Payment Milestones Schedule
                  </h3>

                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    {(order.milestones && order.milestones.length > 0
                      ? order.milestones
                      : [
                          { name: '1. Advance Deposit (30%)', percentage: 30, amount: Math.round(totalAmount * 0.3), status: isAdvanceMet ? 'PAID' : 'PENDING' },
                          { name: '2. On Material Delivery (50%)', percentage: 50, amount: Math.round(totalAmount * 0.5), status: percentPaid >= 80 ? 'PAID' : 'PENDING' },
                          { name: '3. Post-Commissioning (20%)', percentage: 20, amount: totalAmount - Math.round(totalAmount * 0.3) - Math.round(totalAmount * 0.5), status: percentPaid >= 100 ? 'PAID' : 'PENDING' },
                        ]
                    ).map((m, idx) => {
                      const isPaid = m.status === 'PAID';
                      const isPartial = m.status === 'PARTIALLY_PAID';

                      return (
                        <div
                          key={m.id || idx}
                          className={`p-3.5 rounded-2xl border transition ${
                            isPaid
                              ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                              : isPartial
                              ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                              : 'bg-[#FAF6F9] border-[#EBDCE7] text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold mb-1">
                            <span className="text-[11px] font-extrabold">{m.name}</span>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                                isPaid
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isPartial
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {m.status}
                            </span>
                          </div>
                          <p className="font-mono font-black text-sm text-[#241621]">₹{Number(m.amount).toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {m.notes || (idx === 0 ? 'Releases warehouse & crew' : idx === 1 ? 'Due on material dispatch' : 'Due post grid sync')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rule 4 Automatically Spawned Operations */}
                {(order.pickLists?.length > 0 || order.installationJobs?.length > 0 || order.costEntries?.length > 0) && (
                  <div className="p-3.5 bg-gradient-to-r from-[#FAF6F9] via-white to-[#FAF6F9] rounded-2xl border border-[#EBDCE7] flex flex-wrap gap-4 text-xs font-semibold">
                    <span className="text-[10px] font-black uppercase text-[#714B67] self-center">Fired Operations:</span>
                    {order.pickLists?.[0] && (
                      <div className="flex items-center gap-1.5 text-[#241621]">
                        <Boxes className="w-4 h-4 text-[#f09e38]" />
                        <span>Pick List: <strong className="font-mono text-[#714B67]">{order.pickLists[0].pickNumber}</strong> ({order.pickLists[0].status})</span>
                      </div>
                    )}
                    {order.installationJobs?.[0] && (
                      <div className="flex items-center gap-1.5 text-[#241621]">
                        <Wrench className="w-4 h-4 text-[#00A09D]" />
                        <span>
                          Job: <strong className="font-mono text-[#714B67]">{order.installationJobs[0].jobNumber}</strong>{' '}
                          ({order.installationJobs[0].status}){' '}
                          {order.installationJobs[0].scheduledAt && (
                            <span className="text-[10px] text-slate-500 font-normal">
                              · Auto-Scheduled: {new Date(order.installationJobs[0].scheduledAt).toLocaleDateString('en-IN')}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    {order.installationJobs?.[0] && (
                      <div className="flex items-center gap-1.5 text-[#241621]">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>
                          Service Warranty:{' '}
                          <strong className="text-emerald-700 font-bold">
                            Active from {new Date(order.installationJobs[0].scheduledAt).toLocaleDateString('en-IN')}
                          </strong>
                          {order.serialNumbers?.filter((s) => s.warranties?.length > 0).length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black">
                              {order.serialNumbers.filter((s) => s.warranties?.length > 0).length} Items Covered
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-[#241621]">
                      <Coins className="w-4 h-4 text-amber-600" />
                      <span>Project Costing: <strong className="font-mono text-[#714B67]">ESTIMATED_BOM</strong> Initialized</span>
                    </div>
                  </div>
                )}

                {/* Itemized Payment History & Official PDF Receipts */}
                {order.payments && order.payments.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#EBDCE7]">
                    <h3 className="text-xs font-black text-[#241621] uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-[#714B67]" /> Payment Ledger & Official Receipts
                    </h3>

                    <div className="overflow-x-auto rounded-2xl border border-[#EBDCE7]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF6F9] text-[#714B67] font-black text-[10px] uppercase border-b border-[#EBDCE7]">
                          <tr>
                            <th className="py-2 px-3">Receipt #</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Mode</th>
                            <th className="py-2 px-3">Reference / UTR</th>
                            <th className="py-2 px-3 text-right">Amount (₹)</th>
                            <th className="py-2 px-3 text-center">Verification</th>
                            <th className="py-2 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EBDCE7] text-slate-700">
                          {order.payments.map((p) => (
                            <tr key={p.id} className="hover:bg-[#FAF6F9]/50">
                              <td className="py-2 px-3 font-mono font-bold text-[#714B67]">
                                {p.receiptNumber || `REC-${p.id.slice(-6).toUpperCase()}`}
                              </td>
                              <td className="py-2 px-3 text-slate-500">
                                {new Date(p.receivedAt).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 rounded bg-[#FAF6F9] border border-[#EBDCE7] text-[10px] font-bold text-[#241621]">
                                  {p.method}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                                {p.transactionRef || 'N/A'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-[#241621]">
                                ₹{Number(p.amount).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center justify-center gap-1 w-max mx-auto ${
                                  p.status === 'COMPLETED' && p.isVerified !== false
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {p.status === 'COMPLETED' && p.isVerified !== false
                                    ? <><Check className="w-3 h-3 text-emerald-600" /> Verified</>
                                    : 'Pending verification'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => handleDownloadReceipt(order.id, p.id, p.receiptNumber)}
                                  className="px-2.5 py-1 rounded-lg bg-[#FAF6F9] hover:bg-[#F5EDF3] border border-[#EBDCE7] text-[#714B67] font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                                  title="Download Official Branded PDF Payment Receipt"
                                >
                                  <Download className="w-3 h-3" /> Receipt PDF
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {filteredOrders.length > 0 && (
        <div className="p-3 bg-white rounded-2xl border border-[#EBDCE7]">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredOrders.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[3, 5, 10, 20]}
          />
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentModalOrder && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] text-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#714B67]" />
                <div>
                  <h3 className="text-base font-black text-[#241621]">Record Payment & Milestone</h3>
                  <span className="text-[10px] text-slate-500 font-semibold">{paymentModalOrder.orderNumber} • {paymentModalOrder.customer?.name}</span>
                </div>
              </div>
              <button onClick={() => setPaymentModalOrder(null)} className="text-[#b886ad] hover:text-[#714B67] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              <strong>Accountant Verification:</strong> Recording $\ge 30\%$ cumulative advance triggers order confirmation, spawns the warehouse picklist, releases the installation job, and seeds project costing in <strong>one atomic transaction</strong>.
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3.5">
              {/* Quick % buttons */}
              <div>
                <span className="text-[11px] font-bold text-[#b886ad] block mb-1">Milestone Quick Sets:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '30% Advance', pct: 0.3 },
                    { label: '50% Delivery', pct: 0.5 },
                    { label: '20% Final', pct: 0.2 },
                    { label: '100% Full', pct: 1.0 },
                  ].map(({ label, pct }) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        const calculated = Math.round(Number(paymentModalOrder.totalAmount) * pct);
                        setPaymentForm({ ...paymentForm, amount: calculated.toString() });
                      }}
                      className="px-2 py-1.5 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] text-[10px] font-extrabold text-[#714B67] hover:bg-[#F5EDF3] transition text-center cursor-pointer"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Payment Amount (₹)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full p-3 rounded-xl border border-[#EBDCE7] font-black text-lg text-[#241621] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-extrabold text-[#241621] block">Payment Mode</label>
                    <button
                      type="button"
                      onClick={() =>
                        setPaymentForm({
                          ...paymentForm,
                          method: 'DUMMY',
                          transactionRef: `DUMMY-PAY-${Date.now().toString().slice(-6)}`,
                          notes: 'Instant Dummy Payment (Sandbox Simulation)',
                        })
                      }
                      className="text-[9.5px] font-black text-amber-700 hover:underline cursor-pointer"
                    >
                      ⚡ Auto-Dummy
                    </button>
                  </div>
                  <select
                    value={paymentForm.method}
                    onChange={(e) => {
                      const m = e.target.value;
                      setPaymentForm({
                        ...paymentForm,
                        method: m,
                        transactionRef:
                          m === 'DUMMY'
                            ? `DUMMY-PAY-${Date.now().toString().slice(-6)}`
                            : paymentForm.transactionRef,
                        notes:
                          m === 'DUMMY'
                            ? 'Instant Dummy Payment (Sandbox Simulation)'
                            : paymentForm.notes,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    <option value="DUMMY">⚡ Dummy Payment (Instant Simulation)</option>
                    <option value="UPI">UPI / QR Transfer</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CASH">Cash Deposit</option>
                    <option value="CHEQUE">Cheque Deposit</option>
                    <option value="CARD">Debit / Credit Card</option>
                  </select>
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Reference / UTR</label>
                  <input
                    type="text"
                    value={paymentForm.transactionRef}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                    placeholder="UTR / Bank Ref ID"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              {paymentForm.method === 'DUMMY' && (
                <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Dummy Sandbox Active:</strong> Simulates payment without real bank debit. Accountant verification is still required before the order is released.
                  </span>
                </div>
              )}

              {/* Automated Installation & Service Warranty Scheduling Notice (Manual Date Input Removed) */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-emerald-50/90 border border-emerald-200 text-emerald-950 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs text-emerald-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Automatic Installation &amp; Service Warranty Scheduling
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-emerald-200/60 px-2 py-0.5 rounded text-emerald-800">
                    System Automated
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Auto-Scheduled Install:</span>
                    <span className="font-black text-emerald-900">
                      {paymentForm.scheduledInstallDate
                        ? new Date(paymentForm.scheduledInstallDate).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '3 Days from Payment'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Service Warranty Clock:</span>
                    <span className="font-black text-emerald-800">
                      Starts on Installation Date
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-700 italic">
                  Manual date selection removed. The system automatically schedules technician installation and commences full service &amp; hardware warranties tied to this installation date.
                </p>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Accounting Remarks & Ledger Notes</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="e.g. Cleared via HDFC Bank NEFT"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
              >
                Verify & Record Payment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
