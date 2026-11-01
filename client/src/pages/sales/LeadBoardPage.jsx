import React, { useState, useEffect } from 'react';
import { leadsApi, surveysApi, jobsApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import useDebounce from '../../hooks/useDebounce';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  ArrowRight,
  User,
  Zap,
  CheckSquare,
  FileText,
  AlertCircle,
  Archive,
  RefreshCw,
  X,
  FileCheck,
  Send,
  MessageSquare,
  Copy,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  UserCheck,
  UserPlus,
  PhoneCall,
  MessageCircle,
  Globe,
  Tag,
  AlertTriangle,
  History,
  Check,
  XCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
  Layers,
} from 'lucide-react';

const STAGES = [
  { id: 'NEW', title: 'New Leads', accent: '#714B67', badgeBg: 'bg-[#F5EDF3]', badgeText: 'text-[#714B67]' },
  { id: 'CONTACTED', title: 'Contacted', accent: '#00A09D', badgeBg: 'bg-teal-50', badgeText: 'text-teal-700' },
  { id: 'QUALIFIED', title: 'Qualified', accent: '#935F87', badgeBg: 'bg-purple-50', badgeText: 'text-purple-700' },
  { id: 'SURVEY_SCHEDULED', title: 'Survey Booked', accent: '#F09E38', badgeBg: 'bg-amber-50', badgeText: 'text-amber-800' },
  { id: 'SURVEY_DONE', title: 'Survey Done', accent: '#6366F1', badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-700' },
  { id: 'SURVEY_APPROVED', title: 'Survey Approved', accent: '#10B981', badgeBg: 'bg-emerald-50', badgeText: 'text-emerald-700' },
  { id: 'QUOTED', title: 'Quoted', accent: '#0EA5E9', badgeBg: 'bg-sky-50', badgeText: 'text-sky-700' },
  { id: 'WON', title: 'Won', accent: '#059669', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-900' },
  { id: 'LOST', title: 'Lost', accent: '#F43F5E', badgeBg: 'bg-rose-50', badgeText: 'text-rose-700' },
];

const SOURCE_CONFIG = {
  WEB_FORM: { label: 'Web Form', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: Globe },
  WEBSITE_QUOTE_REQUEST: { label: 'Website Quote', color: 'bg-sky-50 text-sky-700 border-sky-200', icon: Globe },
  WHATSAPP: { label: 'WhatsApp', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: MessageCircle },
  PHONE_CALL: { label: 'Phone Call', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: PhoneCall },
  WALK_IN: { label: 'Walk-In', color: 'bg-amber-50 text-amber-800 border-amber-200', icon: User },
  REFERRAL: { label: 'Referral', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Share2 },
  API_CAMPAIGN: { label: 'API / Ad', color: 'bg-slate-100 text-slate-700 border-slate-200', icon: Tag },
  SALES_DIRECT: { label: 'Sales Direct', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: UserCheck },
};

const COMMON_LOST_REASONS = [
  'Price too high / Budget constraints',
  'Customer opted for a competitor',
  'Customer postponed or cancelled solar project',
  'Roof unsuitable: Severe shading from trees / buildings',
  'Roof unsuitable: Structural weakness / Asbestos sheets',
  'DISCOM constraint: Substation capacity full / Net-metering denied',
  'Customer unreachable / Unresponsive after 5+ attempts',
  'Tenant occupied - Landlord NOC refused',
  'Low electricity consumption (< ₹1,500/mo) - ROI not viable',
  'Other / Custom reason',
];

export default function LeadBoardPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [filterStage, setFilterStage] = useState('ALL');
  const [filterSource, setFilterSource] = useState('ALL');
  const [myLeadsOnly, setMyLeadsOnly] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Paginated Kanban State (Reduces data load volume)
  const [columnLimit, setColumnLimit] = useState(5);
  const [kanbanStages, setKanbanStages] = useState({
    NEW: { items: [], total: 0, page: 1, limit: 5, totalPages: 1 },
    CONTACTED: { items: [], total: 0, page: 1, limit: 5, totalPages: 1 },
    QUALIFIED: { items: [], total: 0, page: 1, limit: 5, totalPages: 1 },
    SURVEY_SCHEDULED: { items: [], total: 0, page: 1, limit: 5, totalPages: 1 },
    SURVEY_DONE: { items: [], total: 0, page: 1, limit: 5, totalPages: 1 },
    SURVEY_APPROVED: { items: [], total: 0, page: 1, limit: 5, totalPages: 1 },
    QUOTED: { items: [], total: 0, page: 1, limit: 5, totalPages: 1 },
    WON: { items: [], total: 0, page: 1, limit: 5, totalPages: 1 },
    LOST: { items: [], total: 0, page: 1, limit: 5, totalPages: 1 },
  });
  const [overallTotalCount, setOverallTotalCount] = useState(0);
  const [columnLoading, setColumnLoading] = useState({});

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [checklistModalLead, setChecklistModalLead] = useState(null);
  const [surveyModalLead, setSurveyModalLead] = useState(null);
  const [lostModalLead, setLostModalLead] = useState(null);
  const [reassignModalLead, setReassignModalLead] = useState(null);
  const [activityModalLead, setActivityModalLead] = useState(null);

  // Customer Assignment & Direct Creation Modals
  const [assignCustomerModalLead, setAssignCustomerModalLead] = useState(null);
  const [assignCustomerPassword, setAssignCustomerPassword] = useState('');
  const [createDirectCustomerModalOpen, setCreateDirectCustomerModalOpen] = useState(false);
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState(null);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [submittingCustomer, setSubmittingCustomer] = useState(false);

  // Form states
  const [newLeadForm, setNewLeadForm] = useState({
    title: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    desiredCapacityKw: 3,
    systemType: 'ON_GRID',
    subsidyInterest: true,
    monthlyBillAmount: '',
    source: 'WHATSAPP',
    assignedToId: '',
    notes: '',
  });

  const [checklistForm, setChecklistForm] = useState({
    shadowFreeArea: false,
    monthlyBill: false,
    gridSuitable: false,
    monthlyBillAmount: '',
    desiredCapacityKw: 3,
  });

  const [technicians, setTechnicians] = useState([]);
  const [surveyForm, setSurveyForm] = useState({
    scheduledAt: '',
    surveyedById: '',
    notes: '',
  });

  const [lostForm, setLostForm] = useState({
    selectedPreset: COMMON_LOST_REASONS[0],
    customReason: '',
  });

  const [reassignForm, setReassignForm] = useState({
    targetUserId: '',
  });

  const [activityForm, setActivityForm] = useState({
    type: 'CALL',
    outcome: 'CONNECTED_INTERESTED',
    notes: '',
    followUpAt: '',
  });

  const [directCustomerForm, setDirectCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Hyderabad',
    state: 'Telangana',
    postalCode: '',
    desiredCapacityKw: 3,
    monthlyBillAmount: '',
    password: '',
    createLead: true,
    notes: '',
  });

  const showToast = (title, msg, type = 'success') => {
    setToastMessage({ title, msg, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadData = async (overrideLimit = null) => {
    try {
      setLoading(true);
      const limit = overrideLimit || columnLimit;
      const params = {
        limit,
        search: debouncedSearch?.trim() ? debouncedSearch.trim() : undefined,
        source: filterSource !== 'ALL' ? filterSource : undefined,
        myLeadsOnly: myLeadsOnly ? 'true' : 'false',
      };

      const [kanbanRes, repsRes, techRes] = await Promise.all([
        leadsApi.getKanban(params),
        leadsApi.getSalesReps().catch(() => ({ data: { data: [] } })),
        jobsApi.getTechnicians().catch(() => ({ data: { data: [] } })),
      ]);

      const kanbanData = kanbanRes.data?.data || {};
      if (kanbanData.stages) {
        setKanbanStages(kanbanData.stages);
        setOverallTotalCount(kanbanData.totalCount || 0);

        const flatItems = Object.values(kanbanData.stages).flatMap((s) => s.items || []);
        setLeads(flatItems);
      }
      setSalesReps(repsRes.data?.data || []);
      setTechnicians(techRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load leads kanban:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleColumnPageChange = async (stageId, newPage) => {
    if (newPage < 1) return;
    const current = kanbanStages[stageId];
    if (current && newPage > current.totalPages) return;

    try {
      setColumnLoading((prev) => ({ ...prev, [stageId]: true }));
      const params = {
        stage: stageId,
        page: newPage,
        limit: columnLimit,
        search: debouncedSearch?.trim() ? debouncedSearch.trim() : undefined,
        source: filterSource !== 'ALL' ? filterSource : undefined,
        myLeadsOnly: myLeadsOnly ? 'true' : 'false',
      };

      const res = await leadsApi.getKanban(params);
      const stagePayload = res.data?.data;
      if (stagePayload && stagePayload.stage === stageId) {
        setKanbanStages((prev) => {
          const updated = {
            ...prev,
            [stageId]: {
              items: stagePayload.items || [],
              total: stagePayload.total || 0,
              page: stagePayload.page || 1,
              limit: stagePayload.limit || columnLimit,
              totalPages: stagePayload.totalPages || 1,
            },
          };
          const flatItems = Object.values(updated).flatMap((s) => s.items || []);
          setLeads(flatItems);
          return updated;
        });
      }
    } catch (err) {
      console.error(`Failed to change page for column ${stageId}:`, err);
    } finally {
      setColumnLoading((prev) => ({ ...prev, [stageId]: false }));
    }
  };

  const handleColumnLimitChange = (newLimit) => {
    setColumnLimit(newLimit);
    loadData(newLimit);
  };

  useEffect(() => {
    loadData();
  }, [debouncedSearch, filterSource, myLeadsOnly]);

  const handleOpenAssignCustomer = (lead) => {
    setAssignCustomerModalLead(lead);
    setAssignCustomerPassword(`Solar@${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleGeneratePassword = () => {
    setAssignCustomerPassword(`Solar@${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleSaveAssignCustomer = async (e) => {
    e.preventDefault();
    if (!assignCustomerModalLead) return;
    setSubmittingCustomer(true);
    try {
      const res = await leadsApi.createCustomerAccount(assignCustomerModalLead.id, {
        password: assignCustomerPassword,
        name: assignCustomerModalLead.contactName,
        phone: assignCustomerModalLead.phone,
        email: assignCustomerModalLead.email,
        address: assignCustomerModalLead.address,
      });

      const creds = res.data?.data;
      setAssignCustomerModalLead(null);
      setCreatedCredentialsModal(creds);
      showToast('Customer Created', `Customer credentials assigned for ${assignCustomerModalLead.contactName}.`);
      loadData();
    } catch (err) {
      alert('Failed to assign customer credentials: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingCustomer(false);
    }
  };

  const handleCreateDirectCustomer = async (e) => {
    e.preventDefault();
    setSubmittingCustomer(true);
    try {
      const res = await leadsApi.createCustomerDirect(directCustomerForm);
      const creds = res.data?.data;
      setCreateDirectCustomerModalOpen(false);
      setDirectCustomerForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '',
        desiredCapacityKw: 3,
        monthlyBillAmount: '',
        password: '',
        createLead: true,
        notes: '',
      });
      setCreatedCredentialsModal(creds);
      showToast('Client Registered', 'Customer and pipeline lead created directly.');
      loadData();
    } catch (err) {
      alert('Failed to create customer: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingCustomer(false);
    }
  };

  const handleCopyCredentials = (creds) => {
    if (!creds) return;
    const msg = `*SunPower Solutions - Customer Portal Credentials*\n\nHello ${creds.customerName || 'Customer'},\nYour official SunPower Customer Account has been activated!\n\nCustomer ID: ${creds.customerId}\nPortal Login ID: ${creds.phone || creds.email}\nTemporary Password: ${creds.plainPassword}\nPortal Login URL: http://localhost:5173/login\n\nPlease log in to view your solar layout, survey reports, DISCOM subsidy progress, and track your project in real-time.\n\nThank you,\nSunPower Solutions Technical Sales Team`;

    navigator.clipboard.writeText(msg);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  // ─────────────────────────────────────────────────────────────
  // CREATE LEAD (With Duplicate Detection Toast & Auto-Assign)
  // ─────────────────────────────────────────────────────────────
  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      const res = await leadsApi.create({
        ...newLeadForm,
        desiredCapacityKw: Number(newLeadForm.desiredCapacityKw || 3),
        monthlyBillAmount: newLeadForm.monthlyBillAmount ? Number(newLeadForm.monthlyBillAmount) : null,
      });

      const created = res.data?.data;
      setCreateModalOpen(false);
      setNewLeadForm({
        title: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        desiredCapacityKw: 3,
        systemType: 'ON_GRID',
        subsidyInterest: true,
        monthlyBillAmount: '',
        source: 'WHATSAPP',
        assignedToId: '',
        notes: '',
      });

      if (created?.isDuplicateMerged) {
        showToast('Duplicate Merged', created.mergeMessage || 'Inquiry merged into existing active lead.', 'warning');
      } else {
        showToast('Lead Created', 'New solar enquiry added to pipeline and assigned to sales engineer.');
      }
      loadData();
    } catch (err) {
      alert('Failed to create lead: ' + (err.response?.data?.message || err.message));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // QUALIFICATION CHECKLIST (With Decision "GO" vs "NOT SUITABLE")
  // ─────────────────────────────────────────────────────────────
  const handleOpenChecklist = (lead) => {
    setChecklistModalLead(lead);
    setChecklistForm({
      shadowFreeArea: lead.shadowFreeArea,
      monthlyBill: lead.monthlyBill,
      gridSuitable: lead.gridSuitable,
      monthlyBillAmount: lead.monthlyBillAmount || '',
      desiredCapacityKw: lead.desiredCapacityKw || 3,
    });
  };

  const handleSaveChecklist = async (decision = 'GO') => {
    if (!checklistModalLead) return;
    try {
      const targetId = checklistModalLead.id;

      if (decision === 'NOT_SUITABLE') {
        const reason = prompt(
          'Please enter the specific reason why this site/lead is NOT suitable for solar:',
          'Severe shading from neighbouring structures / Insufficient shadow-free roof area'
        );
        if (!reason) return;

        await leadsApi.updateChecklist(targetId, {
          ...checklistForm,
          decision: 'NOT_SUITABLE',
          lossReason: reason,
        });

        setChecklistModalLead(null);
        showToast('Lead Disqualified', `Lead marked as NOT SUITABLE (Lost): ${reason}`, 'warning');
        loadData();
        return;
      }

      const isQualified =
        Boolean(checklistForm.shadowFreeArea) &&
        Boolean(checklistForm.monthlyBill) &&
        Boolean(checklistForm.gridSuitable);

      if (!isQualified) {
        alert('Cannot mark as GO: All 3 gates (shadow-free area, verified monthly bill, grid suitability) must be checked.');
        return;
      }

      await leadsApi.updateChecklist(targetId, {
        ...checklistForm,
        decision: 'GO',
      });

      setChecklistModalLead(null);
      showToast('Lead Qualified (GO)', 'All 3 technical qualification gates passed. Ready for Site Survey booking!');
      loadData();
    } catch (err) {
      alert('Failed to update checklist: ' + (err.response?.data?.message || err.message));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // STAGE TRANSITIONS & LOST MODAL
  // ─────────────────────────────────────────────────────────────
  const handleOpenLostModal = (lead) => {
    setLostModalLead(lead);
    setLostForm({
      selectedPreset: COMMON_LOST_REASONS[0],
      customReason: '',
    });
  };

  const handleConfirmLost = async (e) => {
    e.preventDefault();
    if (!lostModalLead) return;

    const finalReason =
      lostForm.selectedPreset === 'Other / Custom reason'
        ? lostForm.customReason.trim()
        : lostForm.customReason.trim()
        ? `${lostForm.selectedPreset} - ${lostForm.customReason.trim()}`
        : lostForm.selectedPreset;

    if (!finalReason) {
      alert('Please specify a loss reason before marking this enquiry as lost.');
      return;
    }

    try {
      await leadsApi.updateStage(lostModalLead.id, 'LOST', finalReason);
      setLostModalLead(null);
      showToast('Enquiry Marked Lost', `Lead preserved in lost column: "${finalReason}"`, 'warning');
      loadData();
    } catch (err) {
      alert('Failed to mark lead as lost: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleMoveStage = async (leadId, nextStage) => {
    if (nextStage === 'LOST') {
      const targetLead = leads.find((l) => l.id === leadId);
      if (targetLead) handleOpenLostModal(targetLead);
      return;
    }

    try {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: nextStage } : l))
      );
      await leadsApi.updateStage(leadId, nextStage);
      showToast('Stage Updated', `Lead transitioned to ${nextStage}.`);
      loadData();
    } catch (err) {
      alert('Could not change stage: ' + (err.response?.data?.message || err.message));
      loadData();
    }
  };

  // ─────────────────────────────────────────────────────────────
  // REASSIGN LEAD (Sales Manager / Admin)
  // ─────────────────────────────────────────────────────────────
  const handleOpenReassignModal = (lead) => {
    setReassignModalLead(lead);
    setReassignForm({ targetUserId: lead.assignedToId || (salesReps[0]?.id || '') });
  };

  const handleSaveReassign = async (e) => {
    e.preventDefault();
    if (!reassignModalLead || !reassignForm.targetUserId) return;
    try {
      await leadsApi.reassign(reassignModalLead.id, reassignForm.targetUserId);
      const rep = salesReps.find((r) => r.id === reassignForm.targetUserId);
      setReassignModalLead(null);
      showToast('Lead Reassigned', `Assigned to ${rep?.name || 'Sales Representative'}.`);
      loadData();
    } catch (err) {
      alert('Failed to reassign lead: ' + (err.response?.data?.message || err.message));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // ACTIVITY & CALL LOGGING
  // ─────────────────────────────────────────────────────────────
  const handleOpenActivityModal = (lead) => {
    setActivityModalLead(lead);
    setActivityForm({
      type: 'CALL',
      outcome: 'Connected - Interested in 5kW',
      notes: '',
      followUpAt: '',
    });
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!activityModalLead || !activityForm.notes.trim()) return;
    try {
      await leadsApi.logActivity(activityModalLead.id, activityForm);
      setActivityModalLead(null);
      showToast('Activity Logged', `${activityForm.type} details and notes recorded.`);
      loadData();
    } catch (err) {
      alert('Failed to log activity: ' + (err.response?.data?.message || err.message));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SCHEDULE SITE SURVEY
  // ─────────────────────────────────────────────────────────────
  const handleScheduleSurvey = async (e) => {
    e.preventDefault();
    if (!surveyModalLead) return;
    try {
      await surveysApi.schedule({
        leadId: surveyModalLead.id,
        scheduledAt: surveyForm.scheduledAt,
        surveyedById: surveyForm.surveyedById || null,
        notes: surveyForm.notes,
      });
      setSurveyModalLead(null);
      setSurveyForm({ scheduledAt: '', surveyedById: '', notes: '' });
      showToast('Survey Booked', 'Site survey scheduled. Field technician notified.');
      loadData();
    } catch (err) {
      alert('Failed to schedule survey: ' + (err.response?.data?.message || err.message));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // PAGINATED STAGE DATA GETTERS & TOTALS
  // ─────────────────────────────────────────────────────────────
  const getStageData = (stageId) => {
    return (
      kanbanStages[stageId] || {
        items: [],
        total: 0,
        page: 1,
        limit: columnLimit,
        totalPages: 1,
      }
    );
  };

  const getLeadsByStage = (stageId) => getStageData(stageId).items;

  const totalCardsLoaded = Object.values(kanbanStages).reduce(
    (sum, col) => sum + (col.items ? col.items.length : 0),
    0
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-[100] px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-bold animate-bounce-short ${
            toastMessage.type === 'warning'
              ? 'bg-amber-900 text-white border-amber-500/40'
              : 'bg-[#241621] text-white border-emerald-500/40'
          }`}
        >
          {toastMessage.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <div>
            <p className="font-black text-white">{toastMessage.title}</p>
            <p className="text-[11px] text-[#dabed3]">{toastMessage.msg}</p>
          </div>
        </div>
      )}

      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#241621] via-[#4c3145] to-[#714b67] p-7 text-white shadow-xl border border-white/10">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f09e38]/20 text-[#f09e38] text-xs font-black border border-[#f09e38]/30">
              <Zap className="w-3.5 h-3.5" /> Module 1: CRM &amp; Multi-Channel Enquiry Pipeline
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Lead &amp; Enquiry Management
            </h1>
            <p className="text-xs text-[#dabed3] max-w-2xl">
              Multi-channel capture (Web, WhatsApp, Phone Calls), auto-duplicate merging, round-robin sales assignment, qualification checklist (Go / Not Suitable), and comprehensive lost-reason capture.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setCreateDirectCustomerModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#f09e38]" /> Direct Client Onboard
            </button>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-[#241621] rounded-xl text-xs font-black shadow-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Enquiry Entry
            </button>
            <button
              onClick={loadData}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition cursor-pointer"
              title="Refresh CRM Pipeline"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#f09e38]/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 text-xs">
        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <span className="text-[10px] font-black uppercase text-[#714b67] tracking-wider">Total Active Enquiries</span>
          <p className="text-xl font-black text-[#241621] mt-0.5">
            {(kanbanStages.NEW?.total || 0) +
              (kanbanStages.CONTACTED?.total || 0) +
              (kanbanStages.QUALIFIED?.total || 0) +
              (kanbanStages.SURVEY_SCHEDULED?.total || 0) +
              (kanbanStages.SURVEY_DONE?.total || 0) +
              (kanbanStages.SURVEY_APPROVED?.total || 0) +
              (kanbanStages.QUOTED?.total || 0)}
          </p>
          <p className="text-[10px] text-slate-500">In CRM Funnel</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <span className="text-[10px] font-black uppercase text-teal-700 tracking-wider">New / In Contact</span>
          <p className="text-xl font-black text-teal-700 mt-0.5">
            {(kanbanStages.NEW?.total || 0) + (kanbanStages.CONTACTED?.total || 0)}
          </p>
          <p className="text-[10px] text-slate-500">Awaiting Assessment</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">Qualified (Go)</span>
          <p className="text-xl font-black text-purple-700 mt-0.5">
            {(kanbanStages.QUALIFIED?.total || 0) + (kanbanStages.SURVEY_SCHEDULED?.total || 0)}
          </p>
          <p className="text-[10px] text-slate-500">Passed 3 Technical Gates</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Deals Won</span>
          <p className="text-xl font-black text-emerald-700 mt-0.5">
            {kanbanStages.WON?.total || 0}
          </p>
          <p className="text-[10px] text-slate-500">Converted to Sales Order</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <span className="text-[10px] font-black uppercase text-rose-700 tracking-wider">Lost / Not Suitable</span>
          <p className="text-xl font-black text-rose-700 mt-0.5">
            {kanbanStages.LOST?.total || 0}
          </p>
          <p className="text-[10px] text-slate-500">Reason Captured &amp; Preserved</p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#EBDCE7] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, phone, address…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] text-xs outline-none focus:ring-1 focus:ring-[#714b67]"
            />
          </div>

          {/* Channel Source Filter */}
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className="p-2 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] font-bold text-xs text-[#241621] outline-none"
          >
            <option value="ALL">All Channels</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="WEB_FORM">Web Form</option>
            <option value="PHONE_CALL">Phone Call</option>
            <option value="WALK_IN">Walk-In</option>
            <option value="REFERRAL">Referral</option>
            <option value="API_CAMPAIGN">API / Campaign</option>
          </select>

          {/* Stage Filter */}
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            className="p-2 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] font-bold text-xs text-[#241621] outline-none"
          >
            <option value="ALL">All Stages</option>
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>

          {/* My Leads Toggle */}
          <button
            onClick={() => setMyLeadsOnly(!myLeadsOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center gap-1.5 ${
              myLeadsOnly
                ? 'bg-[#714b67] text-white border-[#714b67]'
                : 'bg-[#FAF6F9] text-slate-700 border-[#EBDCE7] hover:bg-[#F5EDF3]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            {myLeadsOnly ? 'Showing My Assigned Leads' : 'All Sales Team Leads'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Column Page Size / Limit Controls */}
          <div className="flex items-center gap-1.5 bg-[#FAF6F9] border border-[#EBDCE7] rounded-xl px-2.5 py-1 text-xs">
            <span className="text-[11px] font-bold text-slate-500">Per column:</span>
            {[5, 10, 15, 20].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleColumnLimitChange(size)}
                className={`px-2 py-0.5 rounded-lg font-black text-xs transition cursor-pointer ${
                  columnLimit === size
                    ? 'bg-[#714b67] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-[#714b67] hover:bg-[#EBDCE7]/50'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            Showing <span className="text-[#241621] font-black">{totalCardsLoaded}</span> loaded cards of{' '}
            <span className="text-[#241621] font-black">{overallTotalCount}</span> total enquiries
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x select-none">
        {(filterStage === 'ALL' ? STAGES : STAGES.filter((s) => s.id === filterStage)).map((stage) => {
          const stageData = getStageData(stage.id);

          return (
            <div
              key={stage.id}
              className="w-80 flex-shrink-0 flex flex-col rounded-3xl bg-[#FAF6F9]/80 border border-[#EBDCE7] p-3.5 max-h-[780px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#EBDCE7] px-1">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.accent }}
                  />
                  <h3 className="font-extrabold text-xs text-[#241621] tracking-tight">
                    {stage.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${stage.badgeBg} ${stage.badgeText}`}>
                    {stageData.total}
                  </span>
                  {stageData.totalPages > 1 && (
                    <div className="flex items-center bg-white border border-[#EBDCE7] rounded-lg p-0.5 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleColumnPageChange(stage.id, stageData.page - 1)}
                        disabled={stageData.page <= 1 || columnLoading[stage.id]}
                        className="p-1 rounded text-slate-500 hover:text-[#714b67] hover:bg-[#FAF6F9] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      <span className="text-[9px] font-black text-slate-700 px-1 select-none">
                        {stageData.page}/{stageData.totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleColumnPageChange(stage.id, stageData.page + 1)}
                        disabled={stageData.page >= stageData.totalPages || columnLoading[stage.id]}
                        className="p-1 rounded text-slate-500 hover:text-[#714b67] hover:bg-[#FAF6F9] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition"
                        title="Next page"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 relative min-h-[140px]">
                {columnLoading[stage.id] && (
                  <div className="absolute inset-0 bg-[#FAF6F9]/80 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-10">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#EBDCE7] shadow-sm text-[11px] font-bold text-[#714b67]">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#714b67]" />
                      Loading...
                    </div>
                  </div>
                )}
                {stageData.items.length === 0 && !columnLoading[stage.id] && (
                  <div className="h-28 rounded-2xl border-2 border-dashed border-[#EBDCE7] flex items-center justify-center text-slate-400 text-xs italic">
                    No enquiries here
                  </div>
                )}

                {stageData.items.map((lead) => {
                  const srcConfig = SOURCE_CONFIG[lead.source] || SOURCE_CONFIG.WEB_FORM;
                  const SrcIcon = srcConfig.icon;
                  const isFullyQualified =
                    lead.shadowFreeArea && lead.monthlyBill && lead.gridSuitable;

                  return (
                    <div
                      key={lead.id}
                      className="group bg-white rounded-2xl p-4 border border-[#EBDCE7] shadow-xs hover:shadow-md transition space-y-3 relative text-xs"
                    >
                      {/* Card Header & Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-[#241621] text-xs leading-snug truncate">
                            {lead.title}
                          </h4>
                          <p className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                            <User className="w-3 h-3 text-[#714b67]" /> {lead.contactName}
                          </p>
                        </div>

                        {/* Channel Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${srcConfig.color}`}
                        >
                          <SrcIcon className="w-2.5 h-2.5" /> {srcConfig.label}
                        </span>
                      </div>

                      {/* Contact Info & System Spec */}
                      <div className="space-y-1 text-[11px] text-slate-600 bg-[#FAF6F9] p-2.5 rounded-xl border border-[#EBDCE7]/60">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                            <Phone className="w-3 h-3 text-[#714b67]" /> {lead.phone}
                          </span>
                          {lead.desiredCapacityKw && (
                            <span className="font-black text-[#714b67]">
                              {lead.desiredCapacityKw} kW System
                            </span>
                          )}
                        </div>

                        {lead.address && (
                          <p className="flex items-center gap-1.5 text-slate-500 truncate text-[10px]">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {lead.address}
                          </p>
                        )}

                        {lead.monthlyBillAmount && (
                          <p className="text-[10px] text-slate-500 font-medium">
                            Monthly Bill: <span className="font-bold text-[#241621]">₹{Number(lead.monthlyBillAmount).toLocaleString('en-IN')}/mo</span>
                          </p>
                        )}
                      </div>

                      {/* Qualification Gate & Assignee Pill */}
                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-[#EBDCE7]/50">
                        {/* Assignee */}
                        <div className="flex items-center gap-1 text-slate-600">
                          <div className="w-4 h-4 rounded-full bg-[#714b67]/20 text-[#714b67] flex items-center justify-center font-black text-[9px]">
                            {lead.assignedTo?.name ? lead.assignedTo.name[0] : '?'}
                          </div>
                          <span className="font-bold truncate max-w-[110px]">
                            {lead.assignedTo?.name || 'Unassigned'}
                          </span>
                        </div>

                        {/* Qualification Pill */}
                        {isFullyQualified ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-2.5 h-2.5" /> 3/3 Gates (Go)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertCircle className="w-2.5 h-2.5" /> Gates Pending
                          </span>
                        )}
                      </div>

                      {/* Loss Reason Highlight if Stage is LOST */}
                      {lead.stage === 'LOST' && lead.lossReason && (
                        <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[10px]">
                          <span className="font-black uppercase block">Loss Reason:</span>
                          <span className="font-semibold">{lead.lossReason}</span>
                        </div>
                      )}

                      {/* Quick Utility Actions (Call Log, Customer ID, Reassign) */}
                      <div className="grid grid-cols-3 gap-1 pt-1 border-t border-[#EBDCE7]">
                        <button
                          onClick={() => handleOpenActivityModal(lead)}
                          className="py-1 px-1.5 rounded-lg bg-[#FAF6F9] hover:bg-[#714b67] text-[#714b67] hover:text-white border border-[#EBDCE7] font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                          title="Log Call or Add Notes"
                        >
                          <PhoneCall className="w-3 h-3" /> Log Activity
                        </button>

                        <button
                          onClick={() => handleOpenAssignCustomer(lead)}
                          className="py-1 px-1.5 rounded-lg bg-[#FAF6F9] hover:bg-[#714b67] text-[#714b67] hover:text-white border border-[#EBDCE7] font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                          title="Assign Customer ID & Portal Credentials"
                        >
                          <KeyRound className="w-3 h-3 text-[#f09e38]" /> Customer ID
                        </button>

                        <button
                          onClick={() => handleOpenReassignModal(lead)}
                          className="py-1 px-1.5 rounded-lg bg-[#FAF6F9] hover:bg-[#714b67] text-[#714b67] hover:text-white border border-[#EBDCE7] font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                          title="Reassign to Another Sales Rep"
                        >
                          <UserPlus className="w-3 h-3" /> Reassign
                        </button>
                      </div>

                      {/* Main Two-Way Pipeline Action Bar */}
                      <div className="pt-2 border-t border-[#EBDCE7] flex items-center justify-between text-[10px] gap-1 flex-wrap">
                        {/* Checklist Trigger */}
                        <button
                          onClick={() => handleOpenChecklist(lead)}
                          className="flex items-center gap-1 text-[#714B67] font-black hover:underline cursor-pointer"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          {isFullyQualified ? 'Gate: GO ✓' : 'Qualify Checklist'}
                        </button>

                        {/* Stage Progress Shortcuts */}
                        <div className="flex items-center gap-1">
                          {lead.stage === 'NEW' && (
                            <button
                              onClick={() => handleMoveStage(lead.id, 'CONTACTED')}
                              className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-black border border-teal-200 hover:bg-teal-100 cursor-pointer"
                            >
                              Contacted →
                            </button>
                          )}

                          {lead.stage === 'CONTACTED' && (
                            <>
                              <button
                                onClick={() => handleMoveStage(lead.id, 'NEW')}
                                title="Move back to New"
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                              >
                                ← Back
                              </button>
                              <button
                                onClick={() => handleMoveStage(lead.id, 'QUALIFIED')}
                                className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-black border border-purple-200 hover:bg-purple-100 cursor-pointer"
                              >
                                Qualify →
                              </button>
                            </>
                          )}

                          {lead.stage === 'QUALIFIED' && (
                            <>
                              <button
                                onClick={() => handleMoveStage(lead.id, 'CONTACTED')}
                                title="Move back to Contacted"
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                              >
                                ← Back
                              </button>
                              <button
                                onClick={() => {
                                  setSurveyModalLead(lead);
                                  setSurveyForm({ scheduledAt: '', surveyedById: '', notes: '' });
                                }}
                                className="px-2.5 py-0.5 rounded-md bg-[#f09e38] text-white font-black hover:bg-[#d4821a] transition shadow-xs cursor-pointer"
                              >
                                + Book Survey
                              </button>
                            </>
                          )}

                          {lead.stage === 'SURVEY_SCHEDULED' && (
                            <>
                              <button
                                onClick={() => handleMoveStage(lead.id, 'QUALIFIED')}
                                title="Move back to Qualified"
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                              >
                                ← Back
                              </button>
                              <button
                                onClick={() => handleMoveStage(lead.id, 'SURVEY_DONE')}
                                className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-black border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
                              >
                                Survey Done →
                              </button>
                            </>
                          )}

                          {lead.stage === 'SURVEY_DONE' && (
                            <>
                              <button
                                onClick={() => handleMoveStage(lead.id, 'SURVEY_SCHEDULED')}
                                title="Move back to Survey Booked"
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                              >
                                ← Re-book
                              </button>
                              <button
                                onClick={() => handleMoveStage(lead.id, 'SURVEY_APPROVED')}
                                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-black border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                              >
                                Approve ✓
                              </button>
                            </>
                          )}

                          {lead.stage === 'SURVEY_APPROVED' && (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-black flex items-center gap-0.5 border border-emerald-200">
                              <FileCheck className="w-3 h-3 text-emerald-600" /> Ready to Quote
                            </span>
                          )}

                          {lead.stage === 'QUOTED' && (
                            <button
                              onClick={() => handleMoveStage(lead.id, 'WON')}
                              className="px-2 py-0.5 rounded bg-emerald-600 text-white font-black hover:bg-emerald-500 cursor-pointer"
                            >
                              Mark Won ★
                            </button>
                          )}

                          {lead.stage === 'WON' && (
                            <span className="text-emerald-800 font-black bg-emerald-100 px-2 py-0.5 rounded">
                              ✓ Order Won
                            </span>
                          )}

                          {lead.stage === 'LOST' && (
                            <button
                              onClick={() => handleMoveStage(lead.id, 'NEW')}
                              title="Re-activate Lead into Pipeline"
                              className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-black border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                            >
                              ↺ Re-activate
                            </button>
                          )}

                          {/* Universal "Mark Lost" Button on all active stages */}
                          {lead.stage !== 'WON' && lead.stage !== 'LOST' && (
                            <button
                              onClick={() => handleOpenLostModal(lead)}
                              className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-black border border-rose-200 hover:bg-rose-100 cursor-pointer"
                              title="Mark enquiry as Lost with reason capture"
                            >
                              ✕ Lost
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Column Footer Pager */}
              {stageData.totalPages > 1 && (
                <div className="pt-2.5 mt-2 border-t border-[#EBDCE7] flex items-center justify-between text-[11px] font-bold text-slate-500 px-1">
                  <span>
                    {(stageData.page - 1) * stageData.limit + 1}–{Math.min(stageData.page * stageData.limit, stageData.total)} of {stageData.total}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleColumnPageChange(stage.id, stageData.page - 1)}
                      disabled={stageData.page <= 1 || columnLoading[stage.id]}
                      className="px-2 py-0.5 rounded-lg bg-white border border-[#EBDCE7] text-slate-700 font-extrabold hover:bg-[#FAF6F9] hover:text-[#714b67] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition flex items-center gap-0.5"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-3 h-3" /> Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => handleColumnPageChange(stage.id, stageData.page + 1)}
                      disabled={stageData.page >= stageData.totalPages || columnLoading[stage.id]}
                      className="px-2 py-0.5 rounded-lg bg-white border border-[#EBDCE7] text-slate-700 font-extrabold hover:bg-[#FAF6F9] hover:text-[#714b67] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition flex items-center gap-0.5"
                      title="Next Page"
                    >
                      Next <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL 1: NEW ENQUIRY ENTRY (Multi-Channel Capture)
      ══════════════════════════════════════════════════════════ */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#EBDCE7] my-8">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621]">New Lead &amp; Solar Enquiry Entry</h3>
                <p className="text-[11px] text-slate-500">
                  Log inbound calls, WhatsApp messages, or customer referrals directly into the CRM.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-[#b886ad] hover:text-[#241621] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Inquiry Channel / Source *</label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none font-bold bg-[#FAF6F9]"
                  >
                    <option value="WHATSAPP">WhatsApp Message</option>
                    <option value="PHONE_CALL">Direct Phone Call</option>
                    <option value="WEB_FORM">Web Contact Form</option>
                    <option value="WALK_IN">Office Walk-In</option>
                    <option value="REFERRAL">Customer / Partner Referral</option>
                    <option value="API_CAMPAIGN">Social Media Ad / API</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Project Title *</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.title}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, title: e.target.value })}
                    placeholder="e.g. 5kW Rooftop Villa"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Customer / Contact Name *</label>
                  <input
                    type="text"
                    required
                    value={newLeadForm.contactName}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, contactName: e.target.value })}
                    placeholder="e.g. Vikram Reddy"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Mobile Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    placeholder="9876543210 (Auto-deduplicated)"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    placeholder="vikram@example.com"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Site Address / City</label>
                  <input
                    type="text"
                    value={newLeadForm.address}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, address: e.target.value })}
                    placeholder="Jubilee Hills, Hyderabad"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                  />
                </div>
              </div>

              {/* Technical Requirement Spec */}
              <div className="p-3.5 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-3">
                <p className="font-black text-xs text-[#714B67] uppercase tracking-wider">
                  Technical System Requirements
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Capacity (kW)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="100"
                      value={newLeadForm.desiredCapacityKw}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, desiredCapacityKw: e.target.value })}
                      className="w-full p-2 rounded-xl border border-[#EBDCE7] font-bold text-xs bg-white text-center"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">System Type</label>
                    <select
                      value={newLeadForm.systemType}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, systemType: e.target.value })}
                      className="w-full p-2 rounded-xl border border-[#EBDCE7] font-bold text-xs bg-white"
                    >
                      <option value="ON_GRID">On-Grid (Net Metered)</option>
                      <option value="OFF_GRID">Off-Grid (Battery Bank)</option>
                      <option value="HYBRID">Hybrid Storage</option>
                      <option value="COMMERCIAL">Commercial / LT</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Avg. Monthly Bill (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 6500"
                      value={newLeadForm.monthlyBillAmount}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, monthlyBillAmount: e.target.value })}
                      className="w-full p-2 rounded-xl border border-[#EBDCE7] font-bold text-xs bg-white text-center font-mono"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={newLeadForm.subsidyInterest}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, subsidyInterest: e.target.checked })}
                    className="w-4 h-4 rounded text-[#714B67] accent-[#714B67]"
                  />
                  <span className="font-bold text-slate-800">
                    Customer is interested in Central Government Subsidy (PM Surya Ghar ₹78,000)
                  </span>
                </label>
              </div>

              {/* Assignment & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Assign To Sales Engineer</label>
                  <select
                    value={newLeadForm.assignedToId}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, assignedToId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none font-bold bg-[#FAF6F9]"
                  >
                    <option value="">Auto-Assign (Round-Robin by Load)</option>
                    {salesReps.map((rep) => (
                      <option key={rep.id} value={rep.id}>
                        {rep.name} ({rep.activeLeadsCount} active leads)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Inquiry Notes / Customer Remarks</label>
                  <input
                    type="text"
                    value={newLeadForm.notes}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                    placeholder="e.g. Wants 540W Bifacial panels, south facing roof"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs shadow-md shadow-[#714B67]/25 cursor-pointer"
              >
                Log Solar Enquiry (Auto-Deduplicate &amp; Assign)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 2: QUALIFICATION CHECKLIST ("GO" vs "NOT SUITABLE")
      ══════════════════════════════════════════════════════════ */}
      {checklistModalLead && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EBDCE7]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#714B67]" />
                <h3 className="text-base font-black text-[#241621]">Technical Qualification Gatekeepers</h3>
              </div>
              <button onClick={() => setChecklistModalLead(null)} className="text-[#b886ad] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#714B67] mb-4 font-semibold">
              Project: <span className="font-black text-[#241621]">{checklistModalLead.title}</span> ({checklistModalLead.contactName})
            </p>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] hover:bg-[#F5EDF3] transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistForm.shadowFreeArea}
                  onChange={(e) => setChecklistForm({ ...checklistForm, shadowFreeArea: e.target.checked })}
                  className="w-4 h-4 rounded text-[#714B67] accent-[#714B67]"
                />
                <div>
                  <span className="font-black text-[#241621] block">1. Adequate Shadow-Free Roof Area</span>
                  <span className="text-[10px] text-slate-500">Minimum 100 sq.ft per kW free of high parapets, trees, or chimneys</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] hover:bg-[#F5EDF3] transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistForm.monthlyBill}
                  onChange={(e) => setChecklistForm({ ...checklistForm, monthlyBill: e.target.checked })}
                  className="w-4 h-4 rounded text-[#714B67] accent-[#714B67]"
                />
                <div>
                  <span className="font-black text-[#241621] block">2. Monthly Electricity Bill Verified (&gt; ₹2,500/mo)</span>
                  <span className="text-[10px] text-slate-500">Viable economic ROI threshold under DISCOM tariff brackets</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] hover:bg-[#F5EDF3] transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistForm.gridSuitable}
                  onChange={(e) => setChecklistForm({ ...checklistForm, gridSuitable: e.target.checked })}
                  className="w-4 h-4 rounded text-[#714B67] accent-[#714B67]"
                />
                <div>
                  <span className="font-black text-[#241621] block">3. DISCOM Sanctioned Load &amp; Net-Metering Grid Suitable</span>
                  <span className="text-[10px] text-slate-500">Substation transformer capacity available for bi-directional solar export</span>
                </div>
              </label>

              {/* Status Box */}
              {checklistForm.shadowFreeArea && checklistForm.monthlyBill && checklistForm.gridSuitable ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>All 3 gates passed! You may now give a decision of <strong>GO</strong> to qualify this enquiry for a site survey.</span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Gates incomplete. If technical parameters are unviable, choose <strong>NOT SUITABLE</strong> to capture loss reason.</span>
                </div>
              )}

              {/* Two Decision Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveChecklist('NOT_SUITABLE')}
                  className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-xs border border-rose-300 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" /> Decision: NOT SUITABLE
                </button>

                <button
                  type="button"
                  disabled={!checklistForm.shadowFreeArea || !checklistForm.monthlyBill || !checklistForm.gridSuitable}
                  onClick={() => handleSaveChecklist('GO')}
                  className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:opacity-95 text-white font-black text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-white" /> Decision: GO (Qualify)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 3: LOST REASON CAPTURE MODAL
      ══════════════════════════════════════════════════════════ */}
      {lostModalLead && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-[#241621]">Mark Enquiry as Lost</h3>
              </div>
              <button onClick={() => setLostModalLead(null)} className="text-[#b886ad] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 font-semibold">
              Enquiry: <span className="font-black text-[#241621]">{lostModalLead.title}</span> ({lostModalLead.contactName})
            </p>

            <form onSubmit={handleConfirmLost} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Primary Loss Reason *</label>
                <select
                  value={lostForm.selectedPreset}
                  onChange={(e) => setLostForm({ ...lostForm, selectedPreset: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-rose-500 outline-none font-bold bg-[#FAF6F9]"
                >
                  {COMMON_LOST_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Specific Loss Notes &amp; Feedback</label>
                <textarea
                  rows="3"
                  value={lostForm.customReason}
                  onChange={(e) => setLostForm({ ...lostForm, customReason: e.target.value })}
                  placeholder="Detail customer feedback, competitor pricing difference, or specific technical roadblock..."
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
                <strong>Rule:</strong> Enquiries are never erased or deleted from the CRM. This lead will remain archived under the <strong>Lost</strong> column with full history intact.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLostModalLead(null)}
                  className="px-4 py-2 rounded-xl border border-[#EBDCE7] font-bold text-slate-600 hover:bg-[#FAF6F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md shadow-rose-600/30"
                >
                  Confirm &amp; Archive as Lost
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 4: ACTIVITY & CALL LOGGING
      ══════════════════════════════════════════════════════════ */}
      {activityModalLead && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EBDCE7] my-8">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <PhoneCall className="w-5 h-5 text-[#714B67]" />
                <h3 className="text-base font-black text-[#241621]">Log Activity &amp; Discussion Notes</h3>
              </div>
              <button onClick={() => setActivityModalLead(null)} className="text-[#b886ad] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 font-semibold">
              Lead: <span className="font-black text-[#241621]">{activityModalLead.contactName}</span> •{' '}
              <span className="font-mono">{activityModalLead.phone}</span>
            </p>

            <form onSubmit={handleSaveActivity} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Activity Type *</label>
                  <select
                    value={activityForm.type}
                    onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-bold bg-[#FAF6F9]"
                  >
                    <option value="CALL">Phone Call</option>
                    <option value="WHATSAPP">WhatsApp Discussion</option>
                    <option value="NOTE">Internal Technical Note</option>
                    <option value="REMINDER">Follow-Up Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Call / Interaction Outcome</label>
                  <select
                    value={activityForm.outcome}
                    onChange={(e) => setActivityForm({ ...activityForm, outcome: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-bold bg-[#FAF6F9]"
                  >
                    <option value="Connected - Highly Interested">Connected - Highly Interested</option>
                    <option value="Connected - Follow-Up Needed">Connected - Follow-Up Needed</option>
                    <option value="Requested Rooftop Quotation">Requested Rooftop Quotation</option>
                    <option value="Busy / Ringing No Answer">Busy / Ringing No Answer</option>
                    <option value="Left Voicemail / SMS sent">Left Voicemail / SMS sent</option>
                    <option value="Wrong Number / Invalid">Wrong Number / Invalid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Discussion Summary &amp; Customer Requirements *</label>
                <textarea
                  rows="3"
                  required
                  value={activityForm.notes}
                  onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                  placeholder="e.g. Spoke with homeowner. Needs 5kW on-grid system with DCR cells for subsidy. Prefers survey on Saturday 11 AM."
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Schedule Next Follow-Up Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={activityForm.followUpAt}
                  onChange={(e) => setActivityForm({ ...activityForm, followUpAt: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none font-bold"
                />
              </div>

              {/* Existing History Accordion */}
              {activityModalLead.notes && (
                <div className="space-y-1">
                  <span className="font-black text-[#714B67] uppercase text-[10px] block">Contact History &amp; Previous Notes:</span>
                  <div className="max-h-36 overflow-y-auto p-2.5 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] text-[11px] whitespace-pre-wrap font-mono text-slate-700">
                    {activityModalLead.notes}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActivityModalLead(null)}
                  className="px-4 py-2 rounded-xl border border-[#EBDCE7] font-bold text-slate-600 hover:bg-[#FAF6F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#714B67] hover:bg-[#5C3B53] text-white font-black shadow-md shadow-[#714B67]/25"
                >
                  Save Discussion Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 5: REASSIGN LEAD (Sales Manager / Admin)
      ══════════════════════════════════════════════════════════ */}
      {reassignModalLead && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#714B67]" />
                <h3 className="text-base font-black text-[#241621]">Reassign Sales Engineer</h3>
              </div>
              <button onClick={() => setReassignModalLead(null)} className="text-[#b886ad] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 font-semibold">
              Reassign enquiry: <span className="font-black text-[#241621]">{reassignModalLead.title}</span>
            </p>

            <form onSubmit={handleSaveReassign} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Current Assignee</label>
                <div className="p-2.5 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] font-bold text-slate-700">
                  {reassignModalLead.assignedTo?.name || 'Unassigned'}
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Assign To Sales Representative *</label>
                <select
                  required
                  value={reassignForm.targetUserId}
                  onChange={(e) => setReassignForm({ targetUserId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-bold text-xs bg-white focus:ring-2 focus:ring-[#714B67] outline-none"
                >
                  <option value="">— Select Sales Representative —</option>
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name} • {rep.role} ({rep.activeLeadsCount} active leads)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalLead(null)}
                  className="px-4 py-2 rounded-xl border border-[#EBDCE7] font-bold text-slate-600 hover:bg-[#FAF6F9]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#714B67] hover:bg-[#5C3B53] text-white font-black shadow-md shadow-[#714B67]/25"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 6: SCHEDULE SITE SURVEY
      ══════════════════════════════════════════════════════════ */}
      {surveyModalLead && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#f09e38]" />
                <h3 className="text-base font-black text-[#241621]">Schedule Field Site Survey</h3>
              </div>
              <button onClick={() => setSurveyModalLead(null)} className="text-[#b886ad] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#714B67] mb-4 font-semibold">
              Client: <span className="font-black text-[#241621]">{surveyModalLead.contactName}</span> •{' '}
              <span className="font-mono">{surveyModalLead.phone}</span>
            </p>
            <form onSubmit={handleScheduleSurvey} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Survey Date &amp; Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={surveyForm.scheduledAt}
                  onChange={(e) => setSurveyForm({ ...surveyForm, scheduledAt: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none font-bold"
                />
              </div>
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">
                  Assign Technician (Optional / Admin Discretion)
                </label>
                <select
                  value={surveyForm.surveyedById || ''}
                  onChange={(e) => setSurveyForm({ ...surveyForm, surveyedById: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none font-semibold text-xs bg-white cursor-pointer"
                >
                  <option value="">-- Assign Later by Admin Discretion --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      👤 {tech.name} ({tech.phone || 'No phone'}) • {tech.activeSurveysCount || 0} active surveys
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1 font-medium">
                  Leave unassigned to allow Admin to assign a technician later from the Site Surveys desk.
                </p>
              </div>
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Survey Instructions for Field Tech</label>
                <textarea
                  rows="3"
                  value={surveyForm.notes}
                  onChange={(e) => setSurveyForm({ ...surveyForm, notes: e.target.value })}
                  placeholder="Check roof orientation (south facing preferred), parapet shadow, LT meter panel, and earthing pit location."
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-white font-black text-xs shadow-md shadow-[#f09e38]/25 cursor-pointer"
              >
                Confirm &amp; Book Survey
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 7: ASSIGN CUSTOMER ID & PASSWORD
      ══════════════════════════════════════════════════════════ */}
      {assignCustomerModalLead && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#714B67]" />
                <h3 className="text-base font-black text-[#241621]">Assign Customer Portal Access</h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignCustomerModalLead(null)}
                className="text-[#b886ad] hover:text-[#241621] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-3 p-3 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-1">
              <p className="font-black text-[#241621] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#714B67]" /> {assignCustomerModalLead.contactName}
              </p>
              <p className="text-slate-600 flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-[#714B67]" /> {assignCustomerModalLead.phone}
              </p>
              {assignCustomerModalLead.email && (
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#714B67]" /> {assignCustomerModalLead.email}
                </p>
              )}
            </div>

            <form onSubmit={handleSaveAssignCustomer} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-extrabold text-[#241621]">Portal Login Password *</label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-[#714B67] hover:underline font-black text-[10px] cursor-pointer"
                  >
                    Generate New Password
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={assignCustomerPassword}
                  onChange={(e) => setAssignCustomerPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-mono font-bold text-xs bg-[#FAF6F9] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-[11px] space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-[#714B67]" /> Credentials Slip
                </p>
                <p>
                  Upon saving, a Customer account will be generated. The client can log in with their phone number to track solar quotes, CAD designs, and DISCOM net-metering status.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setAssignCustomerModalLead(null)}
                  className="px-4 py-2 rounded-xl border border-[#EBDCE7] font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCustomer}
                  className="px-5 py-2.5 rounded-xl bg-[#714B67] hover:bg-[#5C3B53] text-white font-black shadow-md shadow-[#714B67]/25 cursor-pointer disabled:opacity-50"
                >
                  {submittingCustomer ? 'Activating...' : 'Assign & Activate Portal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 8: DIRECT CLIENT ONBOARDING
      ══════════════════════════════════════════════════════════ */}
      {createDirectCustomerModalOpen && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#EBDCE7] text-xs my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621]">Direct Customer Account Onboarding</h3>
                <p className="text-[11px] text-slate-500">
                  Register a customer immediately and issue portal login credentials.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateDirectCustomerModalOpen(false)}
                className="text-[#b886ad] hover:text-[#241621] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDirectCustomer} className="space-y-3.5 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra"
                    value={directCustomerForm.name}
                    onChange={(e) => setDirectCustomerForm({ ...directCustomerForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-bold bg-[#FAF6F9] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Phone Number (Login ID) *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9849012345"
                    value={directCustomerForm.phone}
                    onChange={(e) => setDirectCustomerForm({ ...directCustomerForm, phone: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-mono font-bold bg-[#FAF6F9] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="ramesh@gmail.com"
                    value={directCustomerForm.email}
                    onChange={(e) => setDirectCustomerForm({ ...directCustomerForm, email: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">City</label>
                  <input
                    type="text"
                    value={directCustomerForm.city}
                    onChange={(e) => setDirectCustomerForm({ ...directCustomerForm, city: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Site Address / Rooftop Location</label>
                <input
                  type="text"
                  placeholder="Plot 42, Road No 10, Banjara Hills"
                  value={directCustomerForm.address}
                  onChange={(e) => setDirectCustomerForm({ ...directCustomerForm, address: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Desired Capacity (kW)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={directCustomerForm.desiredCapacityKw}
                    onChange={(e) => setDirectCustomerForm({ ...directCustomerForm, desiredCapacityKw: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-bold text-center bg-[#FAF6F9]"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Custom Password (Optional)</label>
                  <input
                    type="text"
                    placeholder="Leave blank for auto-generate"
                    value={directCustomerForm.password}
                    onChange={(e) => setDirectCustomerForm({ ...directCustomerForm, password: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-mono bg-[#FAF6F9]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setCreateDirectCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EBDCE7] font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCustomer}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-[#241621] font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submittingCustomer ? 'Registering...' : 'Register & Generate Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 9: CREDENTIALS CONFIRMATION & WHATSAPP COPY SLIP
      ══════════════════════════════════════════════════════════ */}
      {createdCredentialsModal && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-emerald-500/40 text-xs">
            <div className="flex items-center gap-2 pb-3 border-b border-[#EBDCE7]">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#241621]">Customer Credentials Activated</h3>
                <p className="text-[11px] text-slate-500">Copy or share directly with the homeowner</p>
              </div>
            </div>

            <div className="my-4 p-4 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-2.5 font-mono">
              <div className="flex justify-between items-center pb-2 border-b border-[#EBDCE7]/60">
                <span className="text-slate-500 text-[11px]">Customer ID:</span>
                <span className="font-bold text-[#714B67]">{createdCredentialsModal.customerId}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#EBDCE7]/60">
                <span className="text-slate-500 text-[11px]">Login Phone / ID:</span>
                <span className="font-bold text-[#241621]">{createdCredentialsModal.phone}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-[#EBDCE7]/60">
                <span className="text-slate-500 text-[11px]">Temporary Password:</span>
                <span className="font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {createdCredentialsModal.plainPassword}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-[11px]">Portal Login URL:</span>
                <span className="font-bold text-[#714B67]">http://localhost:5173/login</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleCopyCredentials(createdCredentialsModal)}
                className="w-full py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white font-black flex items-center justify-center gap-2 shadow-md cursor-pointer transition"
              >
                <Copy className="w-4 h-4" />
                {copiedNotification ? '✓ Copied to Clipboard!' : 'Copy WhatsApp Ready Credentials Slip'}
              </button>

              <button
                type="button"
                onClick={() => setCreatedCredentialsModal(null)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                Close Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
