import React, { useState, useEffect } from 'react';
import { warehousesApi, inventoryApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import {
  Building2,
  Boxes,
  MapPin,
  Plus,
  Search,
  User,
  Phone,
  Edit2,
  Trash2,
  ArrowRightLeft,
  ArrowRight,
  Check,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Shield,
  ShieldCheck,
  Lock,
  Layers,
} from 'lucide-react';

export default function InventoryPage() {
  const { user, role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [activeTab, setActiveTab] = useState('warehouses'); // 'warehouses' | 'transfers'

  // Warehouses states
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [selectedWarehouseDetail, setSelectedWarehouseDetail] = useState(null);
  const [warehouseStockList, setWarehouseStockList] = useState([]);
  const [warehouseSearch, setWarehouseSearch] = useState('');
  const [selectedCityFilter, setSelectedCityFilter] = useState('ALL');
  const [stockSearch, setStockSearch] = useState('');
  const [loadingStock, setLoadingStock] = useState(false);
  const [loading, setLoading] = useState(true);

  // Zone Managers list (Loaded strictly for Admin)
  const [managers, setManagers] = useState([]);

  // Stock Transfer Requests states
  const [transfers, setTransfers] = useState([]);
  const [transferFilterStatus, setTransferFilterStatus] = useState('ALL');
  const [transferSearch, setTransferSearch] = useState('');
  const [loadingTransfers, setLoadingTransfers] = useState(false);

  // Modal: Multi-Zone City Setup (Admin Only)
  const [showMultiZoneModal, setShowMultiZoneModal] = useState(false);
  const [multiCity, setMultiCity] = useState('');
  const [multiZones, setMultiZones] = useState([
    { zone: 'Zone 1', name: '', code: '', address: '', contactPerson: '', phone: '', managerId: '' },
  ]);
  const [multiSubmitting, setMultiSubmitting] = useState(false);
  const [multiError, setMultiError] = useState('');

  // Modal: Edit Warehouse & Zone Manager (Admin Only)
  const [showEditWarehouseModal, setShowEditWarehouseModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [editWhName, setEditWhName] = useState('');
  const [editWhCode, setEditWhCode] = useState('');
  const [editWhCity, setEditWhCity] = useState('');
  const [editWhZone, setEditWhZone] = useState('');
  const [editWhAddress, setEditWhAddress] = useState('');
  const [editWhContact, setEditWhContact] = useState('');
  const [editWhPhone, setEditWhPhone] = useState('');
  const [editWhManagerId, setEditWhManagerId] = useState('');
  const [editWhIsActive, setEditWhIsActive] = useState(true);
  const [editWhSubmitting, setEditWhSubmitting] = useState(false);
  const [editWhError, setEditWhError] = useState('');

  // Modal: Add / Adjust Stock
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockTargetProduct, setStockTargetProduct] = useState(null);
  const [stockQtyInput, setStockQtyInput] = useState(10);
  const [stockOperation, setStockOperation] = useState('ADD'); // 'ADD' | 'SET'
  const [stockNotes, setStockNotes] = useState('');
  const [stockSubmitting, setStockSubmitting] = useState(false);

  // Modal: Stock Transfer Request
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferSourceWhId, setTransferSourceWhId] = useState('');
  const [transferDestWhId, setTransferDestWhId] = useState('');
  const [transferProductId, setTransferProductId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [sourceWhStockList, setSourceWhStockList] = useState([]);
  const [loadingSourceStock, setLoadingSourceStock] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const promises = [
        warehousesApi.list(),
        isAdmin ? warehousesApi.getManagers().catch(() => ({ data: { data: [] } })) : Promise.resolve({ data: { data: [] } }),
        warehousesApi.listTransfers().catch(() => ({ data: { data: [] } })),
      ];

      const [whRes, mgrRes, trfRes] = await Promise.all(promises);
      const whData = whRes.data?.data || [];
      const mgrData = mgrRes.data?.data || [];
      const trfData = trfRes.data?.data || [];

      setWarehouses(whData);
      setManagers(mgrData);
      setTransfers(trfData);

      if (whData.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(whData[0].id);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadWarehouses = async () => {
    try {
      const res = await warehousesApi.list();
      const whData = res.data?.data || [];
      setWarehouses(whData);
      if (whData.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(whData[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadTransfers = async () => {
    try {
      setLoadingTransfers(true);
      const res = await warehousesApi.listTransfers();
      setTransfers(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTransfers(false);
    }
  };

  const loadWarehouseStock = async (whId) => {
    if (!whId) return;
    try {
      setLoadingStock(true);
      const [detailRes, stockRes] = await Promise.all([
        warehousesApi.get(whId),
        warehousesApi.getStock(whId, { search: stockSearch }),
      ]);
      setSelectedWarehouseDetail(detailRes.data?.data);
      setWarehouseStockList(stockRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load warehouse stock:', err);
    } finally {
      setLoadingStock(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  useEffect(() => {
    if (selectedWarehouseId) {
      loadWarehouseStock(selectedWarehouseId);
    }
  }, [selectedWarehouseId, stockSearch]);

  // Load source stock when source changes in transfer modal
  useEffect(() => {
    if (transferSourceWhId) {
      setLoadingSourceStock(true);
      warehousesApi
        .getStock(transferSourceWhId)
        .then((res) => {
          setSourceWhStockList(res.data?.data || []);
          if (res.data?.data?.length > 0 && !transferProductId) {
            setTransferProductId(res.data.data[0].productId);
          }
        })
        .catch((err) => console.error(err))
        .finally(() => setLoadingSourceStock(false));
    } else {
      setSourceWhStockList([]);
    }
  }, [transferSourceWhId]);

  // Open Multi-Zone Modal
  const handleOpenMultiZoneModal = (initialCity = '') => {
    if (!isAdmin) {
      alert('Security Policy: Only Administrators have the authority to configure multi-zone warehouses.');
      return;
    }
    setMultiCity(initialCity);
    if (initialCity) {
      // Find existing zones for this city
      const existingInCity = warehouses.filter(
        (w) => w.city.toLowerCase() === initialCity.toLowerCase()
      );
      const nextNum = existingInCity.length + 1;
      setMultiZones([
        {
          zone: `Zone ${nextNum}`,
          name: `${initialCity} Zone ${nextNum} Hub`,
          code: '',
          address: '',
          contactPerson: '',
          phone: '',
          managerId: '',
        },
      ]);
    } else {
      setMultiZones([
        {
          zone: 'Zone 1',
          name: '',
          code: '',
          address: '',
          contactPerson: '',
          phone: '',
          managerId: '',
        },
        {
          zone: 'Zone 2',
          name: '',
          code: '',
          address: '',
          contactPerson: '',
          phone: '',
          managerId: '',
        },
      ]);
    }
    setMultiError('');
    setShowMultiZoneModal(true);
  };

  // Add another zone row to current city
  const handleAddZoneRow = () => {
    const nextIdx = multiZones.length + 1;
    const zoneName = `Zone ${nextIdx}`;
    const hubName = multiCity.trim() ? `${multiCity.trim()} ${zoneName} Hub` : '';
    setMultiZones([
      ...multiZones,
      {
        zone: zoneName,
        name: hubName,
        code: '',
        address: '',
        contactPerson: '',
        phone: '',
        managerId: '',
      },
    ]);
  };

  // Remove zone row
  const handleRemoveZoneRow = (idx) => {
    if (multiZones.length <= 1) return;
    setMultiZones(multiZones.filter((_, i) => i !== idx));
  };

  // Update field in a zone row
  const handleZoneFieldChange = (idx, field, value) => {
    const updated = [...multiZones];
    updated[idx][field] = value;
    setMultiZones(updated);
  };

  // Preset generator for 3 zones
  const handleApplyThreeZonesPreset = () => {
    const c = multiCity.trim() || 'City';
    setMultiZones([
      {
        zone: 'Zone 1',
        name: `${c} North Zone Hub`,
        code: '',
        address: '',
        contactPerson: '',
        phone: '',
        managerId: '',
      },
      {
        zone: 'Zone 2',
        name: `${c} South Zone Hub`,
        code: '',
        address: '',
        contactPerson: '',
        phone: '',
        managerId: '',
      },
      {
        zone: 'Zone 3',
        name: `${c} East Zone Hub`,
        code: '',
        address: '',
        contactPerson: '',
        phone: '',
        managerId: '',
      },
    ]);
  };

  // Submit Multi-Zone Creation
  const handleSubmitMultiZone = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Security Policy: Only Administrators have the authority to create multi-zone warehouses.');
      return;
    }

    if (!multiCity.trim()) {
      setMultiError('City name is required (e.g., Bangalore, Hyderabad, Chennai).');
      return;
    }

    // Validation
    const seen = new Set();
    for (let i = 0; i < multiZones.length; i++) {
      const z = multiZones[i];
      if (!z.zone?.trim()) {
        setMultiError(`Zone #${i + 1} must have a zone name (e.g. Zone 1, Zone 2, North Zone).`);
        return;
      }
      if (!z.address?.trim()) {
        setMultiError(`Zone '${z.zone}' requires a distinct physical address so stock can be dispatched accurately.`);
        return;
      }
      const lower = z.zone.trim().toLowerCase();
      if (seen.has(lower)) {
        setMultiError(`Duplicate zone '${z.zone}' in this city. Every zone variant in '${multiCity}' must have a distinct zone identifier.`);
        return;
      }
      seen.add(lower);
    }

    setMultiSubmitting(true);
    setMultiError('');
    try {
      const payload = {
        city: multiCity.trim(),
        zones: multiZones.map((z) => ({
          zone: z.zone.trim(),
          name: z.name?.trim() || `${multiCity.trim()} ${z.zone.trim()} Hub`,
          code: z.code?.trim() || undefined,
          address: z.address.trim(),
          contactPerson: z.contactPerson?.trim() || undefined,
          phone: z.phone?.trim() || undefined,
          managerId: z.managerId || undefined,
        })),
      };

      const res = await warehousesApi.createMultiZone(payload);
      alert(res.data?.message || 'Multi-zone warehouses created successfully!');
      setShowMultiZoneModal(false);
      await loadWarehouses();
      if (res.data?.data?.[0]?.id) {
        setSelectedWarehouseId(res.data.data[0].id);
      }
    } catch (err) {
      setMultiError(err.response?.data?.message || err.message);
    } finally {
      setMultiSubmitting(false);
    }
  };

  // Open Edit Warehouse (Admin Only)
  const handleOpenEditWarehouse = (wh, e) => {
    e?.stopPropagation();
    if (!isAdmin) {
      alert('Security Policy: Zone Manager assignment and warehouse metadata updates are restricted to Administrators.');
      return;
    }
    setEditingWarehouse(wh);
    setEditWhName(wh.name);
    setEditWhCode(wh.code);
    setEditWhCity(wh.city);
    setEditWhZone(wh.zone);
    setEditWhAddress(wh.address || '');
    setEditWhContact(wh.contactPerson || '');
    setEditWhPhone(wh.phone || '');
    setEditWhManagerId(wh.managerId || wh.manager?.id || '');
    setEditWhIsActive(wh.isActive !== false);
    setEditWhError('');
    setShowEditWarehouseModal(true);
  };

  // Submit Edit Warehouse (Admin Only)
  const handleEditWarehouseSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Security Policy: Only administrators can update warehouse metadata or reassign managers.');
      return;
    }
    if (!editingWarehouse) return;
    setEditWhSubmitting(true);
    setEditWhError('');
    try {
      await warehousesApi.update(editingWarehouse.id, {
        name: editWhName,
        code: editWhCode,
        city: editWhCity,
        zone: editWhZone,
        address: editWhAddress,
        contactPerson: editWhContact,
        phone: editWhPhone,
        managerId: editWhManagerId || null,
        isActive: editWhIsActive,
      });

      alert('Warehouse & Zone Manager updated successfully!');
      setShowEditWarehouseModal(false);
      loadWarehouses();
      if (selectedWarehouseId === editingWarehouse.id) {
        loadWarehouseStock(editingWarehouse.id);
      }
    } catch (err) {
      setEditWhError(err.response?.data?.message || err.message);
    } finally {
      setEditWhSubmitting(false);
    }
  };

  // Delete Warehouse (Admin only)
  const handleDeleteWarehouse = async (wh, e) => {
    e?.stopPropagation();
    if (!isAdmin) {
      alert('Security Policy: Only company administrators have the authority to delete warehouses.');
      return;
    }

    const confirmed = window.confirm(
      `Delete warehouse '${wh.name}' (${wh.city} - ${wh.zone})?\n\nThis will remove the warehouse and its associated stock records. Proceed?`
    );
    if (!confirmed) return;

    try {
      const res = await warehousesApi.delete(wh.id);
      alert(res.data?.message || 'Warehouse deleted successfully.');
      loadWarehouses();
      if (selectedWarehouseId === wh.id) {
        setSelectedWarehouseId('');
        setSelectedWarehouseDetail(null);
      }
    } catch (err) {
      alert('Cannot delete warehouse: ' + (err.response?.data?.message || err.message));
    }
  };

  // Add / Adjust Stock Submit (Admin and Warehouse roles)
  const handleStockUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!stockTargetProduct || !selectedWarehouseId) return;

    setStockSubmitting(true);
    try {
      const res = await warehousesApi.addOrAdjustStock(selectedWarehouseId, {
        productId: stockTargetProduct.productId,
        quantity: Number(stockQtyInput),
        operation: stockOperation,
        notes: stockNotes || undefined,
      });

      alert(res.data?.message || 'Stock updated successfully!');
      setShowStockModal(false);
      setStockNotes('');
      loadWarehouseStock(selectedWarehouseId);
      loadWarehouses();
    } catch (err) {
      alert('Failed to update stock: ' + (err.response?.data?.message || err.message));
    } finally {
      setStockSubmitting(false);
    }
  };

  // Open Transfer Modal
  const handleOpenTransferModal = (targetWh = null, targetProduct = null) => {
    const destId = targetWh ? targetWh.id : selectedWarehouseId || (warehouses[0]?.id || '');
    setTransferDestWhId(destId);

    const otherWh = warehouses.find((w) => w.id !== destId);
    setTransferSourceWhId(otherWh ? otherWh.id : '');

    if (targetProduct) setTransferProductId(targetProduct.productId);
    else setTransferProductId('');

    setTransferQty(5);
    setTransferNotes('');
    setTransferError('');
    setShowTransferModal(true);
  };

  // Transfer Submit
  const handleCreateTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferSourceWhId || !transferDestWhId || !transferProductId || !transferQty) {
      setTransferError('Please select both warehouses, a product, and specify transfer quantity.');
      return;
    }
    if (transferSourceWhId === transferDestWhId) {
      setTransferError('Source and Destination warehouses must be different.');
      return;
    }

    setTransferSubmitting(true);
    setTransferError('');
    try {
      const res = await warehousesApi.requestTransfer({
        fromWarehouseId: transferSourceWhId,
        toWarehouseId: transferDestWhId,
        productId: transferProductId,
        quantity: Number(transferQty),
        notes: transferNotes || undefined,
      });

      alert(res.data?.message || 'Transfer request submitted!');
      setShowTransferModal(false);
      loadTransfers();
      setActiveTab('transfers');
    } catch (err) {
      setTransferError(err.response?.data?.message || err.message);
    } finally {
      setTransferSubmitting(false);
    }
  };

  // Approve Transfer
  const handleApproveTransfer = async (transfer) => {
    const confirmed = window.confirm(
      `Approve transfer of ${transfer.quantity} units of '${transfer.product?.name}' from '${transfer.fromWarehouse?.name}' to '${transfer.toWarehouse?.name}'?`
    );
    if (!confirmed) return;

    try {
      const res = await warehousesApi.approveTransfer(transfer.id);
      alert(res.data?.message || 'Transfer approved and stock moved!');
      loadTransfers();
      loadWarehouses();
      if (selectedWarehouseId) loadWarehouseStock(selectedWarehouseId);
    } catch (err) {
      alert('Approval failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // Reject Transfer
  const handleRejectTransfer = async (transfer) => {
    const reason = window.prompt(
      `Enter reason for rejecting transfer ${transfer.transferNumber}:`,
      'Route mismatch or insufficient stock'
    );
    if (reason === null) return;

    try {
      await warehousesApi.rejectTransfer(transfer.id, { reason });
      alert('Transfer rejected.');
      loadTransfers();
    } catch (err) {
      alert('Rejection failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const distinctCities = Array.from(new Set(warehouses.map((w) => w.city))).filter(Boolean);

  const filteredWarehouses = warehouses.filter((wh) => {
    const matchesCity =
      selectedCityFilter === 'ALL' || wh.city.toLowerCase() === selectedCityFilter.toLowerCase();
    const matchesSearch =
      !warehouseSearch ||
      wh.name.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
      wh.code.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
      wh.city.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
      wh.zone.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
      (wh.address && wh.address.toLowerCase().includes(warehouseSearch.toLowerCase()));
    return matchesCity && matchesSearch;
  });

  // Group filtered warehouses by City
  const cityGroups = {};
  filteredWarehouses.forEach((wh) => {
    const c = wh.city || 'Unassigned City';
    if (!cityGroups[c]) cityGroups[c] = [];
    cityGroups[c].push(wh);
  });

  const filteredTransfers = transfers.filter((t) => {
    const matchesStatus = transferFilterStatus === 'ALL' || t.status === transferFilterStatus;
    const matchesSearch =
      !transferSearch ||
      t.transferNumber.toLowerCase().includes(transferSearch.toLowerCase()) ||
      t.fromWarehouse?.name?.toLowerCase().includes(transferSearch.toLowerCase()) ||
      t.toWarehouse?.name?.toLowerCase().includes(transferSearch.toLowerCase()) ||
      t.product?.name?.toLowerCase().includes(transferSearch.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount = transfers.filter((t) => t.status === 'REQUESTED').length;
  const selectedTransferProductStock = sourceWhStockList.find(
    (s) => s.productId === transferProductId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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
            <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">
              Multi-Zone Warehouse &amp; Inventory Hub
            </h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Dynamic City &amp; Zone variants • Unique Physical Addresses • Designated Zone Managers • Inter-Warehouse Stock Transfers
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('warehouses')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'warehouses'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'bg-[#F5EDF3] text-[#714B67] hover:bg-[#EBDCE7]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Multi-Zone Warehouses ({warehouses.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('transfers');
              loadTransfers();
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'transfers'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'bg-[#F5EDF3] text-[#714B67] hover:bg-[#EBDCE7]'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Stock Transfers
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#f09e38] text-[#241621] text-[10px] font-black">
                {pendingCount}
              </span>
            )}
          </button>
          <a
            href="/warehouse/dispatch"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] font-black text-xs flex items-center gap-1.5 shadow-xs"
          >
            Dispatch Day Station &rarr;
          </a>
        </div>
      </div>

      {/* Security Policy Badge for Non-Admins */}
      {!isAdmin && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#F5EDF3] to-[#FAF6F9] border border-[#EBDCE7] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#714B67]/10 flex items-center justify-center text-[#714B67] shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-[#241621] block">
                Company Admin Authority Restricted
              </span>
              <span className="text-slate-600 text-[11px]">
                Multi-zone city creation, physical addresses, and Zone Manager assignments are strictly managed by Company Administrators. As a warehouse staff member, you have full authority to inward/adjust stock levels and request transfers below.
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-[#714B67]/10 text-[#714B67] border border-[#714B67]/20 shrink-0">
            Role: {role}
          </span>
        </div>
      )}

      {/* TAB 1: MULTI-ZONE WAREHOUSES & STOCK */}
      {activeTab === 'warehouses' && (
        <div className="space-y-6">
          {/* Top Actions & Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-[#714B67] uppercase">Filter City:</span>
              <button
                type="button"
                onClick={() => setSelectedCityFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedCityFilter === 'ALL'
                    ? 'bg-[#714B67] text-white shadow-2xs'
                    : 'bg-white border border-[#EBDCE7] text-slate-600 hover:bg-slate-50'
                }`}
              >
                All Cities ({distinctCities.length})
              </button>
              {distinctCities.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => setSelectedCityFilter(city)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedCityFilter.toLowerCase() === city.toLowerCase()
                      ? 'bg-[#714B67] text-white shadow-2xs'
                      : 'bg-white border border-[#EBDCE7] text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={warehouseSearch}
                  onChange={(e) => setWarehouseSearch(e.target.value)}
                  placeholder="Search hub, zone, address..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#EBDCE7] bg-white outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              {/* Add Multi-Zone City Setup (Admin Only) */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleOpenMultiZoneModal()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#714B67]/20 cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4 text-[#f09e38]" /> Add Multi-Zone City Setup
                </button>
              )}
            </div>
          </div>

          {/* Grouped by City Presentation */}
          {Object.keys(cityGroups).length === 0 ? (
            <div className="p-12 text-center bg-white border border-dashed border-[#EBDCE7] rounded-3xl space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-500">No warehouse variants found matching criteria.</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleOpenMultiZoneModal()}
                  className="px-4 py-2 rounded-xl bg-[#714B67] text-white text-xs font-black cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5 text-[#f09e38]" /> Create First Multi-Zone Setup
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(cityGroups).map(([cityName, cityWhs]) => (
                <div key={cityName} className="space-y-3">
                  {/* City Section Header */}
                  <div className="flex items-center justify-between bg-gradient-to-r from-[#FAF6F9] via-[#F5EDF3] to-white px-4 py-2.5 rounded-2xl border border-[#EBDCE7]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#714B67] text-white flex items-center justify-center font-black text-xs shadow-xs">
                        {cityName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-black text-[#241621] uppercase tracking-wide">
                            City: {cityName}
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#714B67]/10 text-[#714B67] border border-[#714B67]/20">
                            {cityWhs.length} Zone Variant{cityWhs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleOpenMultiZoneModal(cityName)}
                        className="px-3 py-1 rounded-xl bg-white hover:bg-[#F5EDF3] text-[#714B67] border border-[#EBDCE7] font-black text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer transition"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#f09e38]" /> + Add Zone Variant to {cityName}
                      </button>
                    )}
                  </div>

                  {/* Warehouses Grid Cards for this City */}
                  <div className="grid md:grid-cols-3 gap-4">
                    {cityWhs.map((wh) => {
                      const isSelected = selectedWarehouseId === wh.id;
                      return (
                        <div
                          key={wh.id}
                          onClick={() => setSelectedWarehouseId(wh.id)}
                          className={`p-5 rounded-3xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? 'bg-gradient-to-br from-[#F5EDF3] to-white border-[#714B67] shadow-md ring-2 ring-[#714B67]/30'
                              : 'bg-white border-[#EBDCE7] hover:border-[#b886ad]'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div>
                                <h3 className="font-black text-sm text-[#241621]">{wh.name}</h3>
                                <span className="text-[10px] font-mono font-bold text-[#714B67]">{wh.code}</span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  wh.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {wh.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 my-2.5">
                              <span className="px-2.5 py-0.5 rounded-full bg-[#f09e38]/15 text-[#d4821a] text-[11px] font-black border border-[#f09e38]/30">
                                Zone: {wh.zone}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                                {wh.city}
                              </span>
                            </div>

                            {/* Distinct Physical Address Box */}
                            <div className="my-2 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 flex items-start gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#f09e38] shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-[9px] font-black uppercase text-slate-400 block">
                                  Physical Address
                                </span>
                                <span className="line-clamp-2 font-medium">
                                  {wh.address || 'Address pending specification'}
                                </span>
                              </div>
                            </div>

                            {/* Zone Manager Box */}
                            <div className="my-2 p-2.5 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-[#714B67]/10 flex items-center justify-center text-[#714B67] font-black text-xs">
                                  {wh.manager ? wh.manager.name.charAt(0) : <User className="w-3.5 h-3.5" />}
                                </div>
                                <div>
                                  <div className="text-[9px] font-black uppercase text-[#714B67] flex items-center gap-1">
                                    Zone Manager {!isAdmin && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                                  </div>
                                  <div className="font-extrabold text-[#241621] text-[11px]">
                                    {wh.manager ? wh.manager.name : wh.contactPerson || 'Unassigned'}
                                  </div>
                                </div>
                              </div>
                              {wh.manager ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-[#714B67]">
                                  {wh.manager.role}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  No Manager
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#EBDCE7] text-xs">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">SKUs in Stock</span>
                                <span className="font-black text-[#241621]">
                                  {wh.inStockSkuCount || 0} / {wh.totalSkuCount || 0}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block font-semibold">Total Stock Units</span>
                                <span className="font-black text-[#714B67]">{wh.totalUnits || 0}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 text-xs">
                            {/* Edit Zone & Manager (Admin Only) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => handleOpenEditWarehouse(wh, e)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                title="Edit Zone, Physical Address & Manager (Admin Only)"
                              >
                                <Edit2 className="w-3 h-3 text-slate-500" /> Edit
                              </button>
                            )}

                            {/* Request Stock Transfer */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTransferModal(wh);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#F5EDF3] hover:bg-[#EBDCE7] text-[#714B67] font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-[#f09e38]" /> Request Stock
                            </button>

                            {/* Delete Warehouse (Admin Only) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteWarehouse(wh, e)}
                                className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                                title="Delete Warehouse (Admin only)"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stock Inventory Table for Selected Warehouse */}
          {selectedWarehouseDetail && (
            <div className="odoo-glass-card p-6 rounded-3xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
                <div>
                  <h3 className="text-base font-black text-[#241621] flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[#714B67]" />
                    Stock Inventory at {selectedWarehouseDetail.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    City: <strong className="text-[#714B67]">{selectedWarehouseDetail.city}</strong> • Zone:{' '}
                    <strong className="text-[#f09e38]">{selectedWarehouseDetail.zone}</strong> • Address:{' '}
                    <span className="text-[#241621] font-semibold">{selectedWarehouseDetail.address || 'N/A'}</span> • Zone Manager:{' '}
                    <strong className="text-[#241621]">
                      {selectedWarehouseDetail.manager?.name || selectedWarehouseDetail.contactPerson || 'None'}
                    </strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={stockSearch}
                      onChange={(e) => setStockSearch(e.target.value)}
                      placeholder="Search SKU or name..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#EBDCE7] bg-white outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenTransferModal(selectedWarehouseDetail)}
                    className="px-3 py-1.5 rounded-xl bg-[#F5EDF3] hover:bg-[#EBDCE7] text-[#714B67] text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-[#f09e38]" /> Request Transfer
                  </button>
                </div>
              </div>

              {loadingStock ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
                  <div className="bg-[#F5EDF3] p-3 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                    <div className="col-span-4">Product / SKU</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-2 text-center">Tracking</div>
                    <div className="col-span-2 text-right">Warehouse Stock</div>
                    <div className="col-span-2 text-center">Actions</div>
                  </div>

                  {warehouseStockList.map((item) => (
                    <div
                      key={item.productId}
                      className={`p-3 grid grid-cols-12 items-center hover:bg-[#FAF6F9] transition-colors ${
                        item.isOutOfStock ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      <div className="col-span-4 font-extrabold text-[#241621]">
                        {item.name}
                        <span className="block text-[10px] font-mono text-slate-400 font-normal">{item.sku}</span>
                      </div>

                      <div className="col-span-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.category}
                        </span>
                      </div>

                      <div className="col-span-2 text-center">
                        {item.isSerialTracked ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#F5EDF3] text-[#714B67] border border-[#dabed3]">
                            Serial Tracked
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Bulk Qty</span>
                        )}
                      </div>

                      <div className="col-span-2 text-right">
                        {item.isOutOfStock ? (
                          <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-black">
                            0 Units (Out of Stock)
                          </span>
                        ) : (
                          <span className="font-black text-sm text-[#714B67]">
                            {item.warehouseQuantity} {item.unit}
                          </span>
                        )}
                      </div>

                      <div className="col-span-2 text-center flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setStockTargetProduct(item);
                            setStockQtyInput(item.isOutOfStock ? 10 : 5);
                            setStockOperation('ADD');
                            setShowStockModal(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#714B67] hover:bg-[#5b3c53] text-white shadow-2xs transition cursor-pointer"
                        >
                          + Inward
                        </button>
                        {item.isOutOfStock && (
                          <button
                            type="button"
                            onClick={() => handleOpenTransferModal(selectedWarehouseDetail, item)}
                            className="px-2 py-1 text-[10px] font-black rounded-lg bg-[#f09e38] text-[#241621] hover:bg-[#e08e28] shadow-2xs transition cursor-pointer"
                          >
                            Transfer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTER-WAREHOUSE STOCK TRANSFERS */}
      {activeTab === 'transfers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#241621] flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[#714B67]" />
                Inter-Warehouse Stock Transfer Requests
              </h2>
              <p className="text-xs text-[#714B67]">
                Zone managers request stock from sister warehouses. Approvals automatically update stock movements.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={transferSearch}
                  onChange={(e) => setTransferSearch(e.target.value)}
                  placeholder="Search transfer..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#EBDCE7] bg-white outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <button
                type="button"
                onClick={() => handleOpenTransferModal()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-[#714B67]/20 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 text-[#f09e38]" /> Request Transfer
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black text-[#714B67] uppercase">Filter:</span>
            {['ALL', 'REQUESTED', 'COMPLETED', 'REJECTED'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setTransferFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  transferFilterStatus === st
                    ? 'bg-[#714B67] text-white shadow-2xs'
                    : 'bg-white border border-[#EBDCE7] text-slate-600'
                }`}
              >
                {st} {st === 'REQUESTED' && pendingCount > 0 && `(${pendingCount})`}
              </button>
            ))}
          </div>

          {loadingTransfers ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="p-8 text-center bg-white border border-dashed border-[#EBDCE7] rounded-3xl text-xs text-slate-500">
              No transfer requests found.
            </div>
          ) : (
            <div className="border border-[#EBDCE7] rounded-3xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
              <div className="bg-[#F5EDF3] p-3 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                <div className="col-span-2">Transfer No.</div>
                <div className="col-span-3">Source &rarr; Destination</div>
                <div className="col-span-3">Product &amp; Qty</div>
                <div className="col-span-2">Requested By</div>
                <div className="col-span-2 text-right">Status / Actions</div>
              </div>

              {filteredTransfers.map((t) => (
                <div key={t.id} className="p-3 grid grid-cols-12 items-center hover:bg-[#FAF6F9]">
                  <div className="col-span-2 font-mono font-bold text-[#714B67]">
                    {t.transferNumber}
                  </div>

                  <div className="col-span-3">
                    <div className="font-extrabold text-[#241621] flex items-center gap-1.5">
                      <span>{t.fromWarehouse?.name}</span>
                      <ArrowRight className="w-3 h-3 text-[#f09e38]" />
                      <span>{t.toWarehouse?.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {t.fromWarehouse?.city} ({t.fromWarehouse?.zone}) &rarr; {t.toWarehouse?.city} ({t.toWarehouse?.zone})
                    </span>
                  </div>

                  <div className="col-span-3">
                    <span className="font-extrabold text-[#241621] block">{t.product?.name}</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="font-mono text-slate-400">{t.product?.sku}</span>
                      <span className="font-black text-[#714B67] bg-[#F5EDF3] px-1.5 py-0.2 rounded">
                        Qty: {t.quantity} {t.product?.unit || 'units'}
                      </span>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="text-xs font-bold text-[#241621] block">{t.requestedBy?.name || 'Manager'}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(t.requestedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="col-span-2 text-right">
                    {t.status === 'REQUESTED' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApproveTransfer(t)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectTransfer(t)}
                          className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-[10px] cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    ) : t.status === 'COMPLETED' ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" /> Completed
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MULTI-ZONE CITY SETUP MODAL (ADMIN ONLY) */}
      {showMultiZoneModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-3xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#714B67] to-[#f09e38] text-white flex items-center justify-center font-black">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-[#241621]">
                      Multi-Zone City Warehouse Setup
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-[#714B67] flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Admin Only
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Enter a City and dynamically add any number of zone variants with distinct physical addresses and assigned Zone Managers.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMultiZoneModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {multiError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold shrink-0">
                {multiError}
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitMultiZone} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              {/* City Input & Quick Actions */}
              <div className="p-4 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="font-extrabold text-[#241621] mb-1 block">
                      Target City *
                    </label>
                    <input
                      type="text"
                      required
                      value={multiCity}
                      onChange={(e) => setMultiCity(e.target.value)}
                      placeholder="e.g. Bangalore, Hyderabad, Chennai, Pune"
                      className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-bold text-sm text-[#241621] outline-none focus:ring-2 focus:ring-[#714B67]"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      All zone variants created below will be linked under this city with their respective distinct physical addresses.
                    </span>
                  </div>

                  <div className="sm:self-end">
                    <button
                      type="button"
                      onClick={handleApplyThreeZonesPreset}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-[#EBDCE7] text-[#714B67] font-black text-xs cursor-pointer shadow-2xs whitespace-nowrap"
                    >
                      ⚡ Preset: 3 Zones (North, South, East)
                    </button>
                  </div>
                </div>
              </div>

              {/* Zone Variants Repeater */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-black text-[#241621] uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#f09e38]" />
                    Zone Variants for {multiCity || 'this City'} ({multiZones.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddZoneRow}
                    className="px-3 py-1 rounded-xl bg-[#F5EDF3] hover:bg-[#EBDCE7] text-[#714B67] font-black text-xs flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#f09e38]" /> + Add Another Zone Variant
                  </button>
                </div>

                {multiZones.map((zoneItem, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl border border-[#EBDCE7] bg-white shadow-xs space-y-3 relative hover:border-[#b886ad] transition"
                  >
                    {/* Zone Row Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#f09e38] text-[#241621] font-black text-[11px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-extrabold text-[#241621] text-xs">
                          Variant #{idx + 1}: {zoneItem.zone || `Zone ${idx + 1}`}
                        </span>
                      </div>

                      {multiZones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveZoneRow(idx)}
                          className="px-2 py-0.5 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Remove Variant
                        </button>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3">
                      <div>
                        <label className="font-extrabold text-[#241621] mb-1 block">
                          Zone Identifier *
                        </label>
                        <input
                          type="text"
                          required
                          value={zoneItem.zone}
                          onChange={(e) => handleZoneFieldChange(idx, 'zone', e.target.value)}
                          placeholder={`Zone ${idx + 1}`}
                          className="w-full p-2 rounded-xl border border-[#EBDCE7] font-bold text-xs outline-none focus:ring-1 focus:ring-[#714B67]"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-[#241621] mb-1 block">
                          Warehouse / Hub Name
                        </label>
                        <input
                          type="text"
                          value={zoneItem.name}
                          onChange={(e) => handleZoneFieldChange(idx, 'name', e.target.value)}
                          placeholder={multiCity ? `${multiCity} ${zoneItem.zone || `Zone ${idx + 1}`} Hub` : 'e.g. Bangalore North Hub'}
                          className="w-full p-2 rounded-xl border border-[#EBDCE7] text-xs outline-none focus:ring-1 focus:ring-[#714B67]"
                        />
                      </div>

                      <div>
                        <label className="font-extrabold text-[#241621] mb-1 block">
                          Warehouse Code (Optional)
                        </label>
                        <input
                          type="text"
                          value={zoneItem.code}
                          onChange={(e) => handleZoneFieldChange(idx, 'code', e.target.value.toUpperCase())}
                          placeholder="Auto-generated if empty"
                          className="w-full p-2 rounded-xl border border-[#EBDCE7] font-mono uppercase text-xs outline-none focus:ring-1 focus:ring-[#714B67]"
                        />
                      </div>
                    </div>

                    {/* Distinct Physical Address Input (Crucial Requirement) */}
                    <div>
                      <label className="font-extrabold text-[#241621] mb-1 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#f09e38]" />
                        Distinct Physical Address for this Zone *
                      </label>
                      <input
                        type="text"
                        required
                        value={zoneItem.address}
                        onChange={(e) => handleZoneFieldChange(idx, 'address', e.target.value)}
                        placeholder={`e.g. Plot ${10 + idx * 5}, Industrial Area Phase ${idx + 1}, ${multiCity || 'City'}, Pincode`}
                        className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-slate-50/50 text-xs outline-none focus:ring-2 focus:ring-[#714B67]"
                      />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="font-extrabold text-[#241621] mb-1 flex items-center gap-1">
                          <User className="w-3 h-3 text-[#714B67]" />
                          Designated Zone Manager (Admin Only Assignment)
                        </label>
                        <select
                          value={zoneItem.managerId}
                          onChange={(e) => handleZoneFieldChange(idx, 'managerId', e.target.value)}
                          className="w-full p-2 rounded-xl border border-[#EBDCE7] text-xs outline-none focus:ring-1 focus:ring-[#714B67]"
                        >
                          <option value="">-- Select Zone Manager --</option>
                          {managers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.role}) - {m.email || m.phone}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="font-extrabold text-[#241621] mb-1 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          Zone Contact Phone
                        </label>
                        <input
                          type="text"
                          value={zoneItem.phone}
                          onChange={(e) => handleZoneFieldChange(idx, 'phone', e.target.value)}
                          placeholder="+91 98450 00000"
                          className="w-full p-2 rounded-xl border border-[#EBDCE7] text-xs outline-none focus:ring-1 focus:ring-[#714B67]"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Another Zone button at bottom of list */}
                <button
                  type="button"
                  onClick={handleAddZoneRow}
                  className="w-full py-2.5 rounded-2xl border-2 border-dashed border-[#EBDCE7] hover:border-[#714B67] text-[#714B67] font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer bg-white/60 hover:bg-[#FAF6F9] transition"
                >
                  <Plus className="w-4 h-4 text-[#f09e38]" /> Add Another Zone Variant to {multiCity || 'City'}
                </button>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-[#EBDCE7] flex items-center justify-between shrink-0">
                <span className="text-[11px] text-slate-500">
                  Total {multiZones.length} zone warehouse{multiZones.length !== 1 ? 's' : ''} will be created with individual physical addresses.
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMultiZoneModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={multiSubmitting}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {multiSubmitting ? 'Creating Variants...' : `Create All ${multiZones.length} Zone Variants`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WAREHOUSE MODAL (ADMIN ONLY) */}
      {showEditWarehouseModal && editingWarehouse && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#241621]">Edit Warehouse &amp; Zone Manager</h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-[#714B67]">
                    Admin Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">Update physical address, zone variant, or reassign Zone Manager.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditWarehouseModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editWhError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {editWhError}
              </div>
            )}

            <form onSubmit={handleEditWarehouseSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Warehouse Name *</label>
                <input
                  type="text"
                  required
                  value={editWhName}
                  onChange={(e) => setEditWhName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Code *</label>
                  <input
                    type="text"
                    required
                    value={editWhCode}
                    onChange={(e) => setEditWhCode(e.target.value.toUpperCase())}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-mono uppercase outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">City *</label>
                  <input
                    type="text"
                    required
                    value={editWhCity}
                    onChange={(e) => setEditWhCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Zone Variant *</label>
                  <input
                    type="text"
                    required
                    value={editWhZone}
                    onChange={(e) => setEditWhZone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#f09e38]" /> Physical Address
                </label>
                <input
                  type="text"
                  value={editWhAddress}
                  onChange={(e) => setEditWhAddress(e.target.value)}
                  placeholder="Street, Industrial Area, Pincode"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-[#714B67]" /> Designated Zone Manager
                </label>
                <select
                  value={editWhManagerId}
                  onChange={(e) => setEditWhManagerId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="">-- Select Zone Manager --</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role}) - {m.email || m.phone}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Admin Authority: Only administrators have permission to assign or change the designated warehouse manager.
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editWhIsActive"
                  checked={editWhIsActive}
                  onChange={(e) => setEditWhIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#714B67] focus:ring-[#714B67]"
                />
                <label htmlFor="editWhIsActive" className="font-bold text-[#241621]">
                  Active Warehouse
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditWarehouseModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editWhSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#714B67] hover:bg-[#5b3c53] text-white font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {editWhSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK INWARD MODAL */}
      {showStockModal && stockTargetProduct && selectedWarehouseDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621]">Inward Stock / Adjust Inventory</h3>
                <p className="text-[11px] text-slate-500">
                  {selectedWarehouseDetail.name} ({selectedWarehouseDetail.city} - {selectedWarehouseDetail.zone})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStockModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-1 text-xs">
              <span className="font-extrabold text-[#241621] block">{stockTargetProduct.name}</span>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>SKU: {stockTargetProduct.sku}</span>
                <span>
                  Current Stock:{' '}
                  <strong className="text-[#714B67] font-black">
                    {stockTargetProduct.warehouseQuantity} units
                  </strong>
                </span>
              </div>
            </div>

            <form onSubmit={handleStockUpdateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Operation Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockOperation('ADD')}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer border ${
                      stockOperation === 'ADD'
                        ? 'bg-[#714B67] text-white border-[#714B67] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    + Add / Inward Qty
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockOperation('SET')}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer border ${
                      stockOperation === 'SET'
                        ? 'bg-[#714B67] text-white border-[#714B67] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Set Exact Count
                  </button>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">
                  {stockOperation === 'ADD' ? 'Quantity to Inward *' : 'New Exact Stock Level *'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={stockQtyInput}
                  onChange={(e) => setStockQtyInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-black text-sm text-[#714B67] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Notes / Supplier Reference</label>
                <input
                  type="text"
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  placeholder="e.g. PO-2026-081 Inward shipment or cycle count"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={stockSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {stockSubmitting ? 'Updating...' : 'Confirm Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER REQUEST MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-[#EBDCE7] max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621] flex items-center gap-2">
                  <ArrowRightLeft className="w-5 h-5 text-[#714B67]" />
                  Request Stock from Another Warehouse
                </h3>
                <p className="text-[11px] text-slate-500">
                  Select source warehouse, destination warehouse, and product quantity to transfer.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {transferError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                {transferError}
              </div>
            )}

            <form onSubmit={handleCreateTransferSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">
                    Source Warehouse (From) *
                  </label>
                  <select
                    required
                    value={transferSourceWhId}
                    onChange={(e) => setTransferSourceWhId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    <option value="">-- Select Source --</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id} disabled={wh.id === transferDestWhId}>
                        {wh.name} ({wh.city} - {wh.zone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">
                    Destination Warehouse (To) *
                  </label>
                  <select
                    required
                    value={transferDestWhId}
                    onChange={(e) => setTransferDestWhId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    <option value="">-- Select Destination --</option>
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id} disabled={wh.id === transferSourceWhId}>
                        {wh.name} ({wh.city} - {wh.zone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Product to Transfer *</label>
                {loadingSourceStock ? (
                  <div className="p-2.5 text-center text-slate-400">Loading source warehouse stock...</div>
                ) : (
                  <select
                    required
                    value={transferProductId}
                    onChange={(e) => setTransferProductId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    <option value="">-- Select Product --</option>
                    {sourceWhStockList.map((s) => (
                      <option key={s.productId} value={s.productId} disabled={s.warehouseQuantity <= 0}>
                        {s.name} ({s.sku}) — Available: {s.warehouseQuantity} {s.unit}
                      </option>
                    ))}
                  </select>
                )}
                {selectedTransferProductStock && (
                  <p className="text-[11px] text-[#714B67] font-black mt-1">
                    Available in source warehouse: {selectedTransferProductStock.warehouseQuantity}{' '}
                    {selectedTransferProductStock.unit}
                  </p>
                )}
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Quantity to Transfer *</label>
                <input
                  type="number"
                  min="1"
                  max={selectedTransferProductStock ? selectedTransferProductStock.warehouseQuantity : undefined}
                  required
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-black text-sm text-[#714B67] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Notes / Reason for Request</label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Urgent stock needed for installation orders in Zone 1"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] text-white font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {transferSubmitting ? 'Submitting...' : 'Submit Transfer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
