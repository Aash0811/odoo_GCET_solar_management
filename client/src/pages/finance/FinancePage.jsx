import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { financeApi, ordersApi } from '../../api';
import {
  Coins,
  BadgePercent,
  Users,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Download,
  Plus,
  Filter,
  RefreshCw,
  FileText,
  Search,
} from 'lucide-react';

export default function FinancePage({ defaultTab = 'costing' }) {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || defaultTab;
  const [activeTab, setActiveTab] = useState(initialTab);

  // Job Costing State
  const [costings, setCostings] = useState([]);
  const [costingFilter, setCostingFilter] = useState('ALL'); // 'ALL' or 'LOSS_ONLY'
  const [costingLoading, setCostingLoading] = useState(false);

  // Subsidies State
  const [subsidies, setSubsidies] = useState([]);
  const [subsidyLoading, setSubsidyLoading] = useState(false);
  const [editingSubsidy, setEditingSubsidy] = useState(null);
  const [subsidyForm, setSubsidyForm] = useState({
    status: '',
    receivedAmount: '',
    expectedAmount: '',
    documentsSubmitted: false,
    notes: '',
  });

  // Technician Payouts State
  const [payouts, setPayouts] = useState([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  // Invoices State
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Add Cost Entry Modal
  const [showAddCostModal, setShowAddCostModal] = useState(false);
  const [costForm, setCostForm] = useState({
    orderId: '',
    category: 'MATERIALS',
    description: '',
    amount: '',
  });
  const [ordersList, setOrdersList] = useState([]);

  useEffect(() => {
    loadTabContent();
  }, [activeTab, costingFilter]);

  const loadTabContent = async () => {
    try {
      if (activeTab === 'costing') {
        setCostingLoading(true);
        const res = await financeApi.getCosting({
          isLossOnly: costingFilter === 'LOSS_ONLY' ? 'true' : 'false',
        });
        setCostings(res.data?.data || res.data || []);
      } else if (activeTab === 'subsidies') {
        setSubsidyLoading(true);
        const res = await financeApi.getSubsidies();
        setSubsidies(res.data?.data || res.data || []);
      } else if (activeTab === 'payouts') {
        setPayoutsLoading(true);
        const res = await financeApi.getPayouts();
        setPayouts(res.data?.data || res.data || []);
      } else if (activeTab === 'invoices') {
        setInvoicesLoading(true);
        const res = await financeApi.getInvoices();
        setInvoices(res.data?.data || res.data || []);
      }
    } catch (err) {
      console.error('Error fetching finance tab data:', err);
    } finally {
      setCostingLoading(false);
      setSubsidyLoading(false);
      setPayoutsLoading(false);
      setInvoicesLoading(false);
    }
  };

  const handleOpenAddCost = async () => {
    setShowAddCostModal(true);
    try {
      const res = await ordersApi.list();
      setOrdersList(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to load orders for cost form:', err);
    }
  };

  const handleSaveCostEntry = async (e) => {
    e.preventDefault();
    if (!costForm.orderId || !costForm.amount) {
      alert('Order and Amount are required.');
      return;
    }
    try {
      await financeApi.addCostEntry({
        orderId: costForm.orderId,
        category: costForm.category,
        description: costForm.description,
        amount: parseFloat(costForm.amount),
      });
      setShowAddCostModal(false);
      setCostForm({ orderId: '', category: 'MATERIALS', description: '', amount: '' });
      loadTabContent();
    } catch (err) {
      alert('Error saving cost entry: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEditSubsidy = (sub) => {
    setEditingSubsidy(sub);
    setSubsidyForm({
      status: sub.status,
      receivedAmount: sub.receivedAmount || 0,
      expectedAmount: sub.expectedAmount || 0,
      documentsSubmitted: Boolean(sub.documentsSubmitted),
      notes: sub.notes || '',
    });
  };

  const handleSaveSubsidy = async (e) => {
    e.preventDefault();
    if (!editingSubsidy) return;
    try {
      await financeApi.updateSubsidy(editingSubsidy.id, {
        status: subsidyForm.status,
        receivedAmount: parseFloat(subsidyForm.receivedAmount) || 0,
        expectedAmount: parseFloat(subsidyForm.expectedAmount) || 0,
        documentsSubmitted: subsidyForm.documentsSubmitted,
        notes: subsidyForm.notes,
      });
      setEditingSubsidy(null);
      loadTabContent();
    } catch (err) {
      alert('Error updating subsidy: ' + (err.response?.data?.message || err.message));
    }
  };

  // Costing calculations
  const totalRevenue = costings.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const totalProfit = costings.reduce((sum, c) => sum + (c.profit || 0), 0);
  const lossJobsCount = costings.filter((c) => c.isLossMaking).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Coins className="w-7 h-7 text-[#714b67]" />
            Financial Operations & Job Costing
          </h1>
          <p className="text-sm text-slate-500">
            Real-time BOM tracking, technician labour payouts, subsidy disbarment, and tax invoicing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'costing' && (
            <button
              onClick={handleOpenAddCost}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#714b67] hover:bg-[#5e3d55] text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          )}
          <button
            onClick={loadTabContent}
            className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-100 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-[#ebdce6] gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('costing')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'costing'
              ? 'border-[#714b67] text-[#714b67] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" />
          Job Costing (Rule 9)
        </button>

        <button
          onClick={() => setActiveTab('subsidies')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'subsidies'
              ? 'border-[#714b67] text-[#714b67] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BadgePercent className="w-4 h-4" />
          Subsidy Tracker (Rule 10)
        </button>

        <button
          onClick={() => setActiveTab('payouts')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'payouts'
              ? 'border-[#714b67] text-[#714b67] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Technician Payouts
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === 'invoices'
              ? 'border-[#714b67] text-[#714b67] font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          GST Invoices
        </button>
      </div>

      {/* TAB 1: JOB COSTING */}
      {activeTab === 'costing' && (
        <div className="space-y-6">
          {/* Costing KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl odoo-glass-card flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500"></div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Revenue</p>
                <p className="text-2xl font-extrabold text-[#241621] mt-1">₹{totalRevenue.toLocaleString()}</p>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded mt-1 inline-block">
                  Verified Invoiced
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl odoo-glass-card flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-[#714B67] to-[#f09e38]"></div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Net Project Profit</p>
                <p className={`text-2xl font-extrabold mt-1 ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ₹{totalProfit.toLocaleString()}
                </p>
                <span className="text-[10px] font-semibold text-[#714B67] bg-[#F5EDF3] px-2 py-0.5 rounded mt-1 inline-block">
                  After BOM & Labour
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F5EDF3] text-[#714B67] shadow-xs group-hover:scale-110 transition-transform">
                <Coins className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl odoo-glass-card flex items-center justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-rose-500 to-rose-600"></div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Loss-Making Jobs</p>
                <p className="text-2xl font-extrabold text-rose-600 mt-1">{lossJobsCount} Alert(s)</p>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded mt-1 inline-block">
                  Rule 9 Threshold
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 shadow-xs group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Table Header Filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-[#EBDCE7]">
            <div className="text-xs font-bold text-[#714B67] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#f09e38]"></span>
              Formula: Profit = Revenue - BOM Cost - Tech Cost - Extra Costs
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filter:</span>
              <select
                value={costingFilter}
                onChange={(e) => setCostingFilter(e.target.value)}
                className="text-xs font-semibold border border-[#dabed3] rounded-lg px-3 py-1.5 bg-[#FAF6F9] text-[#714B67] outline-none focus:ring-2 focus:ring-[#714b67]"
              >
                <option value="ALL">All Projects ({costings.length})</option>
                <option value="LOSS_ONLY">Loss-Making Only (Rule 9 Flag)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#EBDCE7] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-[#F5EDF3] text-[#714B67] uppercase text-[10px] font-extrabold border-b border-[#EBDCE7]">
                  <tr>
                    <th className="px-4 py-3.5">Order / Customer</th>
                    <th className="px-4 py-3.5">Capacity</th>
                    <th className="px-4 py-3.5 text-right">Revenue</th>
                    <th className="px-4 py-3.5 text-right">BOM Cost</th>
                    <th className="px-4 py-3.5 text-right">Tech Labour</th>
                    <th className="px-4 py-3.5 text-right">Other Costs</th>
                    <th className="px-4 py-3.5 text-right">Total Cost</th>
                    <th className="px-4 py-3.5 text-right">Net Profit</th>
                    <th className="px-4 py-3.5 text-center">Margin / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {costingLoading ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-400">
                        Calculating project cost metrics...
                      </td>
                    </tr>
                  ) : costings.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-8 text-center text-slate-400">
                        No orders match filter criteria.
                      </td>
                    </tr>
                  ) : (
                    costings.map((c) => (
                      <tr
                        key={c.orderId}
                        className={`hover:bg-slate-50 transition ${
                          c.isLossMaking ? 'bg-rose-50/70 border-l-4 border-l-rose-500' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900">{c.orderNumber}</p>
                          <p className="text-[11px] text-slate-500">{c.customerName}</p>
                        </td>
                        <td className="px-4 py-3.5 font-medium">{c.capacityKw} kW</td>
                        <td className="px-4 py-3.5 text-right font-semibold text-slate-900">
                          ₹{c.revenue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-700">
                          ₹{c.bomCost.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-700">
                          ₹{c.technicianCost.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-700">
                          ₹{c.otherCosts.toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                          ₹{c.totalCost.toLocaleString()}
                        </td>
                        <td
                          className={`px-4 py-3.5 text-right font-bold ${
                            c.isLossMaking ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {c.profit < 0 ? `-₹${Math.abs(c.profit).toLocaleString()}` : `₹${c.profit.toLocaleString()}`}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {c.isLossMaking ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              LOSS ({c.profitMargin}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {c.profitMargin}% Margin
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSIDY TRACKER */}
      {activeTab === 'subsidies' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">PM Surya Ghar Subsidy Pipeline</h2>
            <span className="text-xs text-slate-500">Government Portal Disbursal Tracking</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Application #</th>
                    <th className="px-4 py-3">Authority</th>
                    <th className="px-4 py-3 text-right">Expected</th>
                    <th className="px-4 py-3 text-right">Received</th>
                    <th className="px-4 py-3 text-center">Docs Submitted</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subsidyLoading ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400">
                        Loading subsidies...
                      </td>
                    </tr>
                  ) : subsidies.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400">
                        No subsidy applications recorded.
                      </td>
                    </tr>
                  ) : (
                    subsidies.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900">{sub.customer?.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {sub.customer?.phone} • {sub.customer?.city}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-[11px] text-slate-800">
                          {sub.applicationNumber || 'Pending'}
                        </td>
                        <td className="px-4 py-3.5">{sub.authority || 'MNRE'}</td>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                          ₹{Number(sub.expectedAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                          ₹{Number(sub.receivedAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {sub.documentsSubmitted ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                              Yes
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                              Missing Docs
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                              sub.status === 'RECEIVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'APPROVED'
                                ? 'bg-sky-100 text-sky-800'
                                : sub.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleEditSubsidy(sub)}
                            className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded"
                          >
                            Update
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TECHNICIAN PAYOUTS */}
      {activeTab === 'payouts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Technician Labour Hours & Wage Accruals</h2>
            <span className="text-xs text-slate-500">Aggregated from verified TimeEntry records</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payoutsLoading ? (
              <p className="col-span-full p-8 text-center text-slate-400">Loading payout records...</p>
            ) : payouts.length === 0 ? (
              <p className="col-span-full p-8 text-center text-slate-400">No technician labour entries logged.</p>
            ) : (
              payouts.map((p) => (
                <div key={p.technicianId} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{p.name}</h3>
                      <p className="text-[11px] text-slate-500">{p.phone || 'Technician'}</p>
                    </div>
                    <span className="p-2 bg-amber-50 rounded-lg text-amber-600">
                      <Users className="w-5 h-5" />
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-slate-500 text-[10px] uppercase">Hours Logged</p>
                      <p className="font-bold text-slate-900 text-base mt-0.5">{p.totalHours} hrs</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg">
                      <p className="text-slate-500 text-[10px] uppercase">Entries Approved</p>
                      <p className="font-bold text-slate-900 text-base mt-0.5">
                        {p.approvedEntriesCount} / {p.entriesCount}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Total Payable:</span>
                    <span className="text-lg font-bold text-emerald-600">₹{p.totalPayout.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GST INVOICES */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Generated Invoices & PDF Statements</h2>
            <span className="text-xs text-slate-500">Tax invoices for systems & post-warranty service parts</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Invoice #</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3 text-right">Taxable</th>
                    <th className="px-4 py-3 text-right">GST</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoicesLoading ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400">
                        Loading invoices...
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400">
                        No invoices generated.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3.5 font-bold text-slate-900 font-mono text-xs">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-slate-900">{inv.customer?.name}</p>
                          <p className="text-[11px] text-slate-500">{inv.customer?.phone}</p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">
                          {inv.ticket ? `Ticket: ${inv.ticket.ticketNumber}` : inv.order ? `Order: ${inv.order.orderNumber}` : 'General'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-medium text-slate-900">
                          ₹{Number(inv.subtotal || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right text-slate-600">
                          ₹{Number(inv.taxAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                          ₹{Number(inv.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'ISSUED'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <a
                            href={financeApi.downloadInvoiceUrl(inv.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded"
                          >
                            <Download className="w-3.5 h-3.5" /> PDF
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Cost Entry */}
      {showAddCostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-1">Add Job Cost / Incident Expense</h2>
            <p className="text-xs text-slate-500 mb-4">
              Directly deducts from job profitability on the costing sheet.
            </p>

            <form onSubmit={handleSaveCostEntry} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Order *</label>
                <select
                  value={costForm.orderId}
                  onChange={(e) => setCostForm({ ...costForm, orderId: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">-- Choose Sales Order --</option>
                  {ordersList.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} - {o.customer?.name} ({o.capacityKw} kW)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Cost Category</label>
                <select
                  value={costForm.category}
                  onChange={(e) => setCostForm({ ...costForm, category: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none"
                >
                  <option value="MATERIALS">Additional Materials</option>
                  <option value="LABOUR">External Labour</option>
                  <option value="TRANSPORT">Crane / Transport Hire</option>
                  <option value="PERMIT">Discom Net Metering Permit</option>
                  <option value="OTHER">Other Contingency</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={costForm.amount}
                  onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. 5000"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description</label>
                <input
                  type="text"
                  value={costForm.description}
                  onChange={(e) => setCostForm({ ...costForm, description: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none"
                  placeholder="e.g. High-lift boom crane rental for 3rd floor roof"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCostModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Subsidy Application */}
      {editingSubsidy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 mb-1">Update Subsidy Status</h2>
            <p className="text-xs text-slate-500 mb-4">
              Customer: {editingSubsidy.customer?.name} ({editingSubsidy.applicationNumber})
            </p>

            <form onSubmit={handleSaveSubsidy} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Stage Status</label>
                <select
                  value={subsidyForm.status}
                  onChange={(e) => setSubsidyForm({ ...subsidyForm, status: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="SUBMITTED">SUBMITTED</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="RECEIVED">RECEIVED (Disbursed to Client)</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Expected (₹)</label>
                  <input
                    type="number"
                    value={subsidyForm.expectedAmount}
                    onChange={(e) => setSubsidyForm({ ...subsidyForm, expectedAmount: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Received (₹)</label>
                  <input
                    type="number"
                    value={subsidyForm.receivedAmount}
                    onChange={(e) => setSubsidyForm({ ...subsidyForm, receivedAmount: e.target.value })}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="docSub"
                  checked={subsidyForm.documentsSubmitted}
                  onChange={(e) => setSubsidyForm({ ...subsidyForm, documentsSubmitted: e.target.checked })}
                  className="w-4 h-4 text-amber-500 rounded border-slate-300"
                />
                <label htmlFor="docSub" className="text-xs font-medium text-slate-700">
                  All MNRE & Discom documents submitted
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Notes / Discom Ref</label>
                <textarea
                  rows="2"
                  value={subsidyForm.notes}
                  onChange={(e) => setSubsidyForm({ ...subsidyForm, notes: e.target.value })}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 outline-none"
                  placeholder="Inspection date, portal reference, etc."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubsidy(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-semibold shadow-sm"
                >
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
