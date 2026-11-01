import React, { useState, useEffect } from 'react';
import { usersApi, warehousesApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import {
  Users,
  UserPlus,
  Shield,
  Briefcase,
  Wrench,
  Building2,
  Receipt,
  HeadphonesIcon,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  KeyRound,
  MapPin,
  X,
  Phone,
  Mail,
  RefreshCw,
  Clock,
  Sliders,
  Check,
  ChevronDown,
} from 'lucide-react';

const ROLE_CONFIG = {
  ADMIN: {
    label: 'Director / Admin',
    badge: 'bg-purple-100 text-purple-900 border-purple-200',
    icon: Shield,
    color: '#714B67',
  },
  SALESMAN: {
    label: 'Sales Executive',
    badge: 'bg-blue-100 text-blue-900 border-blue-200',
    icon: Briefcase,
    color: '#2563eb',
  },
  WAREHOUSE: {
    label: 'Warehouse Head',
    badge: 'bg-amber-100 text-amber-900 border-amber-200',
    icon: Building2,
    color: '#d97706',
  },
  TECHNICIAN: {
    label: 'Field Technician',
    badge: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    icon: Wrench,
    color: '#059669',
  },
  ACCOUNTANT: {
    label: 'Accountant',
    badge: 'bg-indigo-100 text-indigo-900 border-indigo-200',
    icon: Receipt,
    color: '#4f46e5',
  },
  SUPPORT: {
    label: 'Support Desk',
    badge: 'bg-rose-100 text-rose-900 border-rose-200',
    icon: HeadphonesIcon,
    color: '#e11d48',
  },
  CUSTOMER: {
    label: 'Customer / Client',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    icon: UserCheck,
    color: '#64748b',
  },
};

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal: Create User
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'SALESMAN',
    warehouseIds: [],
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Modal: Edit User
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'SALESMAN',
    isActive: true,
    newPassword: '',
    warehouseIds: [],
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');

  // Load users & warehouses
  const loadData = async () => {
    try {
      setLoading(true);
      const [usersRes, whRes] = await Promise.all([
        usersApi.list({ role: roleFilter !== 'ALL' ? roleFilter : undefined, search }),
        warehousesApi.list().catch(() => ({ data: { data: [] } })),
      ]);
      setUsers(usersRes.data?.data || []);
      setWarehouses(whRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load user management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter]);

  // Handle live search
  const filteredUsers = users.filter((u) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.isActive) ||
      (statusFilter === 'INACTIVE' && !u.isActive);

    const matchesSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
      (u.phone && u.phone.includes(search));

    return matchesStatus && matchesSearch;
  });

  // Create User Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError('');
    try {
      const res = await usersApi.create({
        name: createForm.name,
        email: createForm.email || undefined,
        phone: createForm.phone || undefined,
        password: createForm.password,
        role: createForm.role,
        warehouseIds: createForm.warehouseIds,
      });

      alert(res.data?.message || 'User created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'SALESMAN',
        warehouseIds: [],
      });
      loadData();
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit User Modal
  const handleOpenEdit = (targetUser) => {
    setEditingUser(targetUser);
    setEditForm({
      name: targetUser.name,
      email: targetUser.email || '',
      phone: targetUser.phone || '',
      role: targetUser.role,
      isActive: targetUser.isActive,
      newPassword: '',
      warehouseIds: (targetUser.managedWarehouses || []).map((w) => w.id),
    });
    setEditError('');
    setShowEditModal(true);
  };

  // Edit User Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSubmitting(true);
    setEditError('');
    try {
      const res = await usersApi.update(editingUser.id, {
        name: editForm.name,
        email: editForm.email || null,
        phone: editForm.phone || null,
        role: editForm.role,
        isActive: editForm.isActive,
        password: editForm.newPassword || undefined,
        warehouseIds: editForm.warehouseIds,
      });

      alert(res.data?.message || 'User updated successfully!');
      setShowEditModal(false);
      loadData();
    } catch (err) {
      setEditError(err.response?.data?.message || err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  // Quick Inline Role Change
  const handleQuickRoleChange = async (targetUser, newRole) => {
    if (targetUser.role === newRole) return;
    if (targetUser.id === currentUser?.id) {
      alert('You cannot change your own role.');
      return;
    }

    const confirmed = window.confirm(
      `Change role of '${targetUser.name}' from ${targetUser.role} to ${newRole}?`
    );
    if (!confirmed) return;

    try {
      const res = await usersApi.changeRole(targetUser.id, newRole);
      alert(res.data?.message || 'Role updated successfully!');
      loadData();
    } catch (err) {
      alert('Failed to change role: ' + (err.response?.data?.message || err.message));
    }
  };

  // Delete User
  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      alert('You cannot delete your own admin account.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete user '${targetUser.name}' (${targetUser.role})?\n\n` +
      `• If this user has created commercial orders/quotes, they will be archived and deactivated to maintain audit integrity.\n` +
      `• Any assigned warehouses or jobs will be safely unlinked.\n\n` +
      `Proceed?`
    );
    if (!confirmed) return;

    try {
      const res = await usersApi.delete(targetUser.id);
      alert(res.data?.message || 'User deleted successfully.');
      loadData();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Warehouse selection toggler for Create/Edit modals
  const toggleWarehouseSelection = (whId, isEdit = false) => {
    if (isEdit) {
      setEditForm((prev) => ({
        ...prev,
        warehouseIds: prev.warehouseIds.includes(whId)
          ? prev.warehouseIds.filter((id) => id !== whId)
          : [...prev.warehouseIds, whId],
      }));
    } else {
      setCreateForm((prev) => ({
        ...prev,
        warehouseIds: prev.warehouseIds.includes(whId)
          ? prev.warehouseIds.filter((id) => id !== whId)
          : [...prev.warehouseIds, whId],
      }));
    }
  };

  // Stats Counters
  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const salesCount = users.filter((u) => u.role === 'SALESMAN').length;
  const whCount = users.filter((u) => u.role === 'WAREHOUSE').length;
  const techCount = users.filter((u) => u.role === 'TECHNICIAN').length;
  const accountantCount = users.filter((u) => u.role === 'ACCOUNTANT').length;
  const supportCount = users.filter((u) => u.role === 'SUPPORT').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#714B67] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">
              User &amp; Access Control Management
            </h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Admin Authority • Create Users • Assign Roles &amp; Multi-Zone Warehouses • Change Roles • Delete / Archive
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowCreateModal(true);
            setCreateError('');
          }}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs flex items-center gap-2 shadow-md shadow-[#714B67]/20 cursor-pointer self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4 text-[#f09e38]" /> Add New Team Member
        </button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase">All Users</span>
            <Users className="w-3.5 h-3.5 text-[#714B67]" />
          </div>
          <div className="text-xl font-black text-[#241621]">{totalCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase text-purple-700">Admins</span>
            <Shield className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-black text-purple-900">{adminCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase text-blue-700">Salesmen</span>
            <Briefcase className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-900">{salesCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase text-amber-700">Warehouse</span>
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900">{whCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase text-emerald-700">Technicians</span>
            <Wrench className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-900">{techCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase text-indigo-700">Finance &amp; Support</span>
            <Receipt className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-900">{accountantCount + supportCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
        {/* Role Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <span className="text-[11px] font-black text-[#714B67] mr-1 uppercase">Role:</span>
          {['ALL', 'ADMIN', 'SALESMAN', 'WAREHOUSE', 'DELIVERY_AGENT', 'TECHNICIAN', 'ACCOUNTANT', 'SUPPORT', 'CUSTOMER'].map(
            (r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  roleFilter === r
                    ? 'bg-[#714B67] text-white shadow-xs'
                    : 'bg-[#FAF6F9] text-slate-600 hover:bg-[#F5EDF3]'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : ROLE_CONFIG[r]?.label || r}
              </button>
            )
          )}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2 self-end lg:self-auto w-full lg:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] text-xs font-bold text-[#241621] outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Deactivated Only</option>
          </select>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] outline-none focus:ring-1 focus:ring-[#714B67]"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-8 h-8 border-3 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-[#EBDCE7] text-slate-400 space-y-2">
          <Users className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-600">No users found matching your filters.</p>
          <p className="text-xs">Try adjusting your role or search filters, or add a new team member.</p>
        </div>
      ) : (
        <div className="border border-[#EBDCE7] rounded-3xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
          {/* Table Header */}
          <div className="bg-[#F5EDF3] p-3.5 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
            <div className="col-span-3">User &amp; Contact</div>
            <div className="col-span-3">Role &amp; Permissions</div>
            <div className="col-span-2">Assigned Warehouses</div>
            <div className="col-span-2">Activity / Workload</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {/* Table Rows */}
          {filteredUsers.map((u) => {
            const roleConf = ROLE_CONFIG[u.role] || ROLE_CONFIG.CUSTOMER;
            const RoleIcon = roleConf.icon;
            const isSelf = u.id === currentUser?.id;

            return (
              <div
                key={u.id}
                className={`p-3.5 grid grid-cols-12 items-center hover:bg-[#FAF6F9] transition-colors ${
                  !u.isActive ? 'bg-slate-50/70 opacity-70' : ''
                }`}
              >
                {/* 1. User & Contact */}
                <div className="col-span-3 flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0 shadow-xs"
                    style={{ backgroundColor: roleConf.color }}
                  >
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-[#241621] text-xs flex items-center gap-1.5">
                      <span className="truncate">{u.name}</span>
                      {isSelf && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-[#714B67] text-white">
                          You
                        </span>
                      )}
                    </div>
                    {u.email && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {u.email}
                      </span>
                    )}
                    {u.phone && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                        <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" /> {u.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Role with 1-Click Role Switcher */}
                <div className="col-span-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black border ${roleConf.badge}`}
                    >
                      <RoleIcon className="w-3 h-3" />
                      {roleConf.label}
                    </span>

                    {/* Quick Inline Role Switcher (Admin control) */}
                    {!isSelf && (
                      <select
                        value={u.role}
                        onChange={(e) => handleQuickRoleChange(u, e.target.value)}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-600 cursor-pointer outline-none hover:border-[#714B67]"
                        title="Change role"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="SALESMAN">SALESMAN</option>
                        <option value="WAREHOUSE">WAREHOUSE</option>
                        <option value="DELIVERY_AGENT">DELIVERY AGENT</option>
                        <option value="TECHNICIAN">TECHNICIAN</option>
                        <option value="ACCOUNTANT">ACCOUNTANT</option>
                        <option value="SUPPORT">SUPPORT</option>
                        <option value="CUSTOMER">CUSTOMER</option>
                      </select>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                    ></span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {u.isActive ? 'Active Staff' : 'Deactivated / Suspended'}
                    </span>
                  </div>
                </div>

                {/* 3. Assigned Warehouses (Zone Manager) */}
                <div className="col-span-2">
                  {u.managedWarehouses && u.managedWarehouses.length > 0 ? (
                    <div className="space-y-1">
                      {u.managedWarehouses.map((wh) => (
                        <span
                          key={wh.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF6F9] border border-[#EBDCE7] text-[10px] font-bold text-[#714B67] mr-1 mb-1"
                        >
                          <Building2 className="w-2.5 h-2.5 text-[#f09e38]" />
                          {wh.city} ({wh.zone})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">None assigned</span>
                  )}
                </div>

                {/* 4. Activity / Workload */}
                <div className="col-span-2 text-[11px] space-y-0.5 text-slate-600">
                  {u.role === 'SALESMAN' && (
                    <>
                      <div>Leads: <strong className="text-[#241621]">{u._count?.assignedLeads || 0}</strong></div>
                      <div>Quotes: <strong className="text-[#714B67]">{u._count?.createdQuotes || 0}</strong></div>
                    </>
                  )}
                  {u.role === 'TECHNICIAN' && (
                    <>
                      <div>Jobs: <strong className="text-emerald-700">{u._count?.assignedJobs || 0}</strong></div>
                    </>
                  )}
                  {u.role === 'SUPPORT' && (
                    <>
                      <div>Tickets: <strong className="text-rose-700">{u._count?.assignedTickets || 0}</strong></div>
                    </>
                  )}
                  {u.role === 'WAREHOUSE' && (
                    <>
                      <div>Managed Hubs: <strong className="text-amber-700">{u._count?.managedWarehouses || 0}</strong></div>
                    </>
                  )}
                  {['ADMIN', 'ACCOUNTANT', 'CUSTOMER'].includes(u.role) && (
                    <div className="text-[10px] text-slate-400">
                      Orders: <strong className="text-[#241621]">{u._count?.createdOrders || 0}</strong>
                    </div>
                  )}
                  {u.lastLoginAt && (
                    <div className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(u.lastLoginAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* 5. Actions */}
                <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(u)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                    title="Edit user profile, role, password, and warehouse assignments"
                  >
                    <Edit2 className="w-3 h-3 text-slate-500" /> Edit
                  </button>

                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u)}
                      className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition"
                      title="Delete / Archive user"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: CREATE NEW USER */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621] flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-[#714B67]" />
                  Add New Team Member
                </h3>
                <p className="text-[11px] text-slate-500">
                  Create a new staff account, designate role permissions, and assign warehouse management.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Email Address</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="ramesh@sunpowersolutions.com"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Mobile Phone</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+91 98490 55555"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Assigned Role *</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    <option value="SALESMAN">SALESMAN (Quotes, Leads, Surveys)</option>
                    <option value="WAREHOUSE">WAREHOUSE (Stock Inward, Picking, Transf.)</option>
                    <option value="DELIVERY_AGENT">DELIVERY AGENT (Customer Deliveries)</option>
                    <option value="TECHNICIAN">TECHNICIAN (Installation Jobs, Photos)</option>
                    <option value="ACCOUNTANT">ACCOUNTANT (Finance, Payments, Invoices)</option>
                    <option value="SUPPORT">SUPPORT (Tickets, Warranties)</option>
                    <option value="ADMIN">ADMIN (Full System Director Access)</option>
                    <option value="CUSTOMER">CUSTOMER (Client Portal View)</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Initial Password *</label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              {/* Warehouse Assignments (For WAREHOUSE or ADMIN roles) */}
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block flex items-center justify-between">
                  <span>Assign Multi-Zone Warehouses (Zone Manager)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                </label>
                <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] space-y-1.5">
                  {warehouses.length === 0 ? (
                    <p className="text-slate-400 text-[11px]">No warehouses configured yet.</p>
                  ) : (
                    warehouses.map((wh) => {
                      const isChecked = createForm.warehouseIds.includes(wh.id);
                      return (
                        <label
                          key={wh.id}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleWarehouseSelection(wh.id, false)}
                            className="w-4 h-4 rounded text-[#714B67] focus:ring-[#714B67]"
                          />
                          <span className="font-extrabold text-[#241621]">{wh.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({wh.city} - {wh.zone})
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {createSubmitting ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* MODAL: EDIT USER & CHANGE ROLE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621] flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-[#714B67]" />
                  Edit User &amp; Assign Role
                </h3>
                <p className="text-[11px] text-slate-500">
                  Update personal profile, role permissions, warehouse assignments, or reset password.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Email Address</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Mobile Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Change Role *</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    disabled={editingUser.id === currentUser?.id}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67] disabled:bg-slate-100"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="SALESMAN">SALESMAN</option>
                    <option value="WAREHOUSE">WAREHOUSE</option>
                    <option value="DELIVERY_AGENT">DELIVERY AGENT</option>
                    <option value="TECHNICIAN">TECHNICIAN</option>
                    <option value="ACCOUNTANT">ACCOUNTANT</option>
                    <option value="SUPPORT">SUPPORT</option>
                    <option value="CUSTOMER">CUSTOMER</option>
                  </select>
                  {editingUser.id === currentUser?.id && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Cannot change own Admin role.
                    </span>
                  )}
                </div>

                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Reset Password</label>
                  <input
                    type="password"
                    value={editForm.newPassword}
                    onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                    placeholder="Leave blank to keep current"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              {/* Warehouse Assignments */}
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">
                  Assigned Warehouses (Zone Manager Authority)
                </label>
                <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] space-y-1.5">
                  {warehouses.length === 0 ? (
                    <p className="text-slate-400 text-[11px]">No warehouses configured yet.</p>
                  ) : (
                    warehouses.map((wh) => {
                      const isChecked = editForm.warehouseIds.includes(wh.id);
                      return (
                        <label
                          key={wh.id}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleWarehouseSelection(wh.id, true)}
                            className="w-4 h-4 rounded text-[#714B67] focus:ring-[#714B67]"
                          />
                          <span className="font-extrabold text-[#241621]">{wh.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({wh.city} - {wh.zone})
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  disabled={editingUser.id === currentUser?.id}
                  className="w-4 h-4 rounded text-[#714B67] focus:ring-[#714B67]"
                />
                <label htmlFor="editIsActive" className="font-bold text-[#241621]">
                  Account Active (Allow Login)
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#714B67] hover:bg-[#5b3c53] text-white font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving Changes...' : 'Save User Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
