import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { surveysApi, leadsApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import useDebounce from '../../hooks/useDebounce';
import Pagination from '../../components/common/Pagination';
import {
  Compass,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Phone,
  MapPin,
  Camera,
  Upload,
  ArrowRight,
  RefreshCw,
  Plus,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Zap,
  Sliders,
  RotateCcw,
  Navigation,
  Image as ImageIcon,
  Check,
  X,
  FileSpreadsheet,
  AlertTriangle,
  Search,
} from 'lucide-react';

const ROOF_TYPES = [
  'RCC Flat Roof',
  'Industrial Metal / Trapezoidal Sheet',
  'Sloped Mangalore Tile Roof',
  'Elevated Superstructure (Gazebo / Pergola)',
  'Asbestos Sheet (Special Clamping)',
];

const ROOF_DIRECTIONS = [
  { value: 'South (180° - Optimum)', label: 'South (180° - Optimum Solar Yield)' },
  { value: 'South-West (225°)', label: 'South-West (225° - High Afternoon Yield)' },
  { value: 'South-East (135°)', label: 'South-East (135° - High Morning Yield)' },
  { value: 'East-West Dual Pitch', label: 'East-West (Dual Pitch / Symmetrical)' },
  { value: 'Flat Zero-Azimuth', label: 'Flat Zero-Azimuth (Flush / Ballasted)' },
];

const STRUCTURE_TYPES = [
  'Standard Elevated GI Superstructure (South Tilt)',
  'Ballast Non-Penetrative Concrete Blocks',
  'Trapezoidal Rail-less Rivet Clamps',
  'High-Rise Custom Superstructure (> 8ft Clearance)',
];

export default function SurveysPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [surveys, setSurveys] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [qualifiedLeads, setQualifiedLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'calendar'
  const [toastMessage, setToastMessage] = useState(null);

  // Modals
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [mobileFormSurvey, setMobileFormSurvey] = useState(null);
  const [reviewModalSurvey, setReviewModalSurvey] = useState(null);
  const [submittingForm, setSubmittingForm] = useState(false);

  // Schedule Modal State
  const [scheduleForm, setScheduleForm] = useState({
    leadId: '',
    surveyId: '',
    surveyedById: '',
    scheduledAt: '',
    notes: '',
  });

  // Mobile Survey Form State (for field technician)
  const [surveyFormData, setSurveyFormData] = useState({
    roofType: ROOF_TYPES[0],
    roofAreaSqFt: '',
    shadowFreeArea: true,
    monthlyBill: true,
    gridSuitable: true,
    recommendedKw: 3,
    roofDirection: ROOF_DIRECTIONS[0].value,
    tiltAngle: 15,
    cableDistanceMeters: 25,
    gpsCoordinates: '',
    structureType: STRUCTURE_TYPES[0],
    notes: '',
  });
  const [surveyPhotoFiles, setSurveyPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  // Review Modal State (for Manager / Admin)
  const [reviewForm, setReviewForm] = useState({
    status: 'APPROVED',
    rejectionReason: '',
    notes: '',
  });

  const showToast = (title, msg, type = 'success') => {
    setToastMessage({ title, msg, type });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [surveysRes, techsRes, leadsRes] = await Promise.all([
        surveysApi.list(),
        surveysApi.getTechnicians().catch(() => ({ data: { data: [] } })),
        leadsApi.list({ stage: 'QUALIFIED' }),
      ]);
      setSurveys(surveysRes.data?.data || []);
      setTechnicians(techsRes.data?.data || []);
      setQualifiedLeads(leadsRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load surveys data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // GPS AUTO-DETECTION
  // ─────────────────────────────────────────────────────────────
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = `${pos.coords.latitude.toFixed(5)}° N, ${pos.coords.longitude.toFixed(5)}° E`;
        setSurveyFormData((prev) => ({ ...prev, gpsCoordinates: coords }));
        showToast('GPS Tagged', `Current location captured: ${coords}`);
      },
      (err) => {
        alert('Could not retrieve GPS location: ' + err.message);
      }
    );
  };

  // ─────────────────────────────────────────────────────────────
  // PHOTO UPLOADS
  // ─────────────────────────────────────────────────────────────
  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const combined = [...surveyPhotoFiles, ...files].slice(0, 5);
    setSurveyPhotoFiles(combined);

    const previews = combined.map((f) => URL.createObjectURL(f));
    setPhotoPreviews(previews);
  };

  const handleRemovePhoto = (idx) => {
    const updatedFiles = surveyPhotoFiles.filter((_, i) => i !== idx);
    const updatedPreviews = photoPreviews.filter((_, i) => i !== idx);
    setSurveyPhotoFiles(updatedFiles);
    setPhotoPreviews(updatedPreviews);
  };

  // ─────────────────────────────────────────────────────────────
  // OPEN MOBILE SURVEY FORM (TECHNICIAN)
  // ─────────────────────────────────────────────────────────────
  const handleOpenMobileForm = (survey) => {
    setMobileFormSurvey(survey);
    setSurveyFormData({
      roofType: survey.roofType || ROOF_TYPES[0],
      roofAreaSqFt: survey.roofAreaSqFt || 500,
      shadowFreeArea: survey.shadowFreeArea ?? true,
      monthlyBill: survey.monthlyBill ?? true,
      gridSuitable: survey.gridSuitable ?? true,
      recommendedKw: survey.recommendedKw || survey.lead?.desiredCapacityKw || 3,
      roofDirection: survey.roofDirection || ROOF_DIRECTIONS[0].value,
      tiltAngle: survey.tiltAngle || 15,
      cableDistanceMeters: survey.cableDistanceMeters || 25,
      gpsCoordinates: survey.gpsCoordinates || '',
      structureType: survey.structureType || STRUCTURE_TYPES[0],
      notes: survey.cleanNotes || '',
    });
    setSurveyPhotoFiles([]);
    setPhotoPreviews([]);
  };

  // ─────────────────────────────────────────────────────────────
  // SUBMIT SURVEY FORM
  // ─────────────────────────────────────────────────────────────
  const handleSubmitSurveyForm = async (e) => {
    e.preventDefault();
    if (!mobileFormSurvey) return;
    setSubmittingForm(true);

    try {
      const formData = new FormData();
      formData.append('roofType', surveyFormData.roofType);
      formData.append('roofAreaSqFt', surveyFormData.roofAreaSqFt);
      formData.append('shadowFreeArea', surveyFormData.shadowFreeArea);
      formData.append('monthlyBill', surveyFormData.monthlyBill);
      formData.append('gridSuitable', surveyFormData.gridSuitable);
      formData.append('recommendedKw', surveyFormData.recommendedKw);
      formData.append('roofDirection', surveyFormData.roofDirection);
      formData.append('tiltAngle', surveyFormData.tiltAngle);
      formData.append('cableDistanceMeters', surveyFormData.cableDistanceMeters);
      formData.append('gpsCoordinates', surveyFormData.gpsCoordinates);
      formData.append('structureType', surveyFormData.structureType);
      formData.append('notes', surveyFormData.notes);

      surveyPhotoFiles.forEach((file) => {
        formData.append('photos', file);
      });

      await surveysApi.submit(mobileFormSurvey.id, formData);
      setMobileFormSurvey(null);
      showToast('Survey Submitted', 'Field measurements and photos uploaded. Sent to Manager for approval.');
      loadData();
    } catch (err) {
      alert('Failed to submit survey: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingForm(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // REVIEW SURVEY (MANAGER / ADMIN)
  // ─────────────────────────────────────────────────────────────
  const handleOpenReviewModal = (survey) => {
    setReviewModalSurvey(survey);
    setReviewForm({
      status: 'APPROVED',
      rejectionReason: '',
      notes: '',
    });
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!reviewModalSurvey) return;

    if (reviewForm.status === 'REJECTED' && !reviewForm.rejectionReason.trim()) {
      alert('Rejection reason is mandatory when rejecting a survey.');
      return;
    }

    try {
      await surveysApi.review(reviewModalSurvey.id, reviewForm);
      setReviewModalSurvey(null);
      if (reviewForm.status === 'APPROVED') {
        showToast('Survey Approved ✓', 'Lead is now SURVEY_APPROVED. Quote creation is unlocked!');
      } else if (reviewForm.status === 'RE_SURVEY') {
        showToast('Re-Survey Requested', 'Technician notified to revisit and verify site metrics.', 'warning');
      } else {
        showToast('Survey Rejected', 'Lead marked as Lost with rejection reason.', 'warning');
      }
      loadData();
    } catch (err) {
      alert('Failed to review survey: ' + (err.response?.data?.message || err.message));
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SCHEDULE SURVEY
  // ─────────────────────────────────────────────────────────────
  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    try {
      await surveysApi.schedule(scheduleForm);
      setScheduleModalOpen(false);
      setScheduleForm({ leadId: '', surveyId: '', surveyedById: '', scheduledAt: '', notes: '' });
      showToast('Survey Scheduled', 'Technician assigned and site appointment placed on calendar.');
      loadData();
    } catch (err) {
      alert('Failed to schedule survey: ' + (err.response?.data?.message || err.message));
    }
  };

  // Filtering with Debounce
  const filteredSurveys = surveys.filter((s) => {
    if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      const matchClient = s.lead?.contactName?.toLowerCase().includes(q);
      const matchPhone = s.lead?.phone?.toLowerCase().includes(q);
      const matchAddr = s.lead?.address?.toLowerCase().includes(q);
      const matchTech = s.surveyedBy?.name?.toLowerCase().includes(q);
      if (!matchClient && !matchPhone && !matchAddr && !matchTech) return false;
    }
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterStatus]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REQUESTED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SCHEDULED':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SUBMITTED':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'APPROVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black';
      case 'REJECTED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
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

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#241621] via-[#4c3145] to-[#714b67] p-7 text-white shadow-xl border border-white/10">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f09e38]/20 text-[#f09e38] text-xs font-black border border-[#f09e38]/30">
              <Compass className="w-3.5 h-3.5" /> Module 2: Site Survey &amp; Engineering Studio
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Field Site Survey &amp; Technical Verification
            </h1>
            <p className="text-xs text-[#dabed3] max-w-2xl">
              Auto-created survey tasks on qualification, technician appointment calendar, mobile survey form (direction, tilt, shadow-free area, cable run, photos, GPS), and 3-way managerial approval workflow.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setScheduleModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-[#241621] rounded-xl text-xs font-black shadow-lg transition cursor-pointer"
            >
              <Calendar className="w-4 h-4" /> Schedule Survey Task
            </button>
            <button
              onClick={loadData}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition cursor-pointer"
              title="Refresh Survey Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#f09e38]/15 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 text-xs">
        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <span className="text-[10px] font-black uppercase text-[#714b67] tracking-wider">Total Surveys</span>
          <p className="text-xl font-black text-[#241621] mt-0.5">{surveys.length}</p>
          <p className="text-[10px] text-slate-500">All Project Surveys</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">Awaiting Schedule</span>
          <p className="text-xl font-black text-purple-700 mt-0.5">
            {surveys.filter((s) => s.status === 'REQUESTED').length}
          </p>
          <p className="text-[10px] text-slate-500">Auto-Created on Qualification</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Scheduled / In Field</span>
          <p className="text-xl font-black text-amber-700 mt-0.5">
            {surveys.filter((s) => s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS').length}
          </p>
          <p className="text-[10px] text-slate-500">With Field Technicians</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Submitted for Review</span>
          <p className="text-xl font-black text-indigo-700 mt-0.5">
            {surveys.filter((s) => s.status === 'SUBMITTED').length}
          </p>
          <p className="text-[10px] text-slate-500">Needs Manager Approval</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-[#EBDCE7] shadow-xs">
          <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Approved (Ready to Quote)</span>
          <p className="text-xl font-black text-emerald-700 mt-0.5">
            {surveys.filter((s) => s.status === 'APPROVED').length}
          </p>
          <p className="text-[10px] text-slate-500">Unlocks Quote Creation</p>
        </div>
      </div>

      {/* Controls & Tab Nav */}
      <div className="bg-white p-4 rounded-3xl border border-[#EBDCE7] shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Tab Navigation */}
          <div className="flex p-1 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7]">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#714B67]'
              }`}
            >
              Surveys List &amp; Approvals
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'bg-[#714B67] text-white shadow-xs'
                  : 'text-slate-600 hover:text-[#714B67]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" /> Technician Calendar
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search client, phone, technician…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] text-xs outline-none focus:ring-1 focus:ring-[#714b67]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="p-2 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] font-bold text-xs text-[#241621] outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="REQUESTED">Requested (Auto-Created)</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="SUBMITTED">Submitted (Pending Review)</option>
            <option value="APPROVED">Approved (Ready to Quote)</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="text-[11px] font-bold text-slate-500">
          Showing <span className="text-[#241621] font-black">{filteredSurveys.length}</span> site surveys
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          VIEW 1: SURVEYS LIST & ACTION CARDS
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {filteredSurveys.length === 0 && (
            <div className="p-12 text-center bg-white rounded-3xl border border-[#EBDCE7] text-slate-400 text-xs italic">
              No site surveys found matching your filter criteria.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSurveys
              .slice((currentPage - 1) * pageSize, currentPage * pageSize)
              .map((survey) => {
              const isApproved = survey.status === 'APPROVED';
              const isSubmitted = survey.status === 'SUBMITTED';
              const isScheduled = survey.status === 'SCHEDULED' || survey.status === 'IN_PROGRESS';
              const isRequested = survey.status === 'REQUESTED';

              return (
                <div
                  key={survey.id}
                  className="bg-white rounded-3xl p-5 border border-[#EBDCE7] shadow-xs hover:shadow-md transition space-y-3.5 text-xs relative"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 pb-2 border-b border-[#EBDCE7]">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-[#241621]">
                          {survey.lead?.contactName || 'Valued Homeowner'}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                            survey.status
                          )}`}
                        >
                          {survey.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {survey.lead?.title}
                      </p>
                    </div>

                    {/* Date / Appointment */}
                    <div className="text-right">
                      {survey.scheduledAt ? (
                        <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-slate-700 justify-end">
                          <Calendar className="w-3.5 h-3.5 text-[#f09e38]" />
                          {new Date(survey.scheduledAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      ) : (
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          Auto-Requested
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Client & Assigned Technician */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7]">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-black text-slate-400 block">Site Contact</span>
                      <p className="font-mono font-bold text-[#241621] text-[11px] flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#714B67]" /> {survey.lead?.phone || '—'}
                      </p>
                      {survey.lead?.address && (
                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" /> {survey.lead.address}
                        </p>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-black text-slate-400 block">Assigned Technician</span>
                      <p className="font-bold text-[#241621] text-[11px] flex items-center gap-1">
                        <User className="w-3 h-3 text-[#f09e38]" /> {survey.surveyedBy?.name || 'Unassigned'}
                      </p>
                      {survey.surveyedBy?.phone && (
                        <p className="font-mono text-[10px] text-slate-500">
                          {survey.surveyedBy.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Technical Specifications (When Submitted or Approved) */}
                  {(isSubmitted || isApproved) && (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-[#FAF6F9] to-white border border-[#EBDCE7] space-y-2">
                      <span className="text-[10px] font-black uppercase text-[#714B67] tracking-wider block">
                        Verified Technical Sizing Parameters
                      </span>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[9px]">Roof Type</span>
                          <span className="font-bold text-[#241621]">{survey.roofType || 'RCC Flat'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">Orientation &amp; Tilt</span>
                          <span className="font-bold text-[#241621]">
                            {survey.roofDirection ? survey.roofDirection.split(' ')[0] : 'South'} • {survey.tiltAngle || 15}°
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">Cable Run</span>
                          <span className="font-bold text-emerald-700">
                            {survey.cableDistanceMeters || 25} meters
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">Roof Area</span>
                          <span className="font-bold text-[#241621]">
                            {survey.roofAreaSqFt ? `${survey.roofAreaSqFt} sq.ft` : 'Verified'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">Recommended kW</span>
                          <span className="font-black text-[#714B67] text-xs">
                            {survey.recommendedKw || 3} kW System
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">Site Photos</span>
                          <span className="font-bold text-slate-700 flex items-center gap-1">
                            <Camera className="w-3 h-3 text-[#714B67]" /> {survey.photos?.length || 0} Photos
                          </span>
                        </div>
                      </div>

                      {survey.gpsCoordinates && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono pt-1 border-t border-[#EBDCE7]/50">
                          <Navigation className="w-3 h-3 text-[#714B67]" /> GPS: {survey.gpsCoordinates}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Rejection / Re-Survey Notes */}
                  {survey.rejectionReason && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                      <span className="font-bold block uppercase text-[9px]">Manager Instructions / Note:</span>
                      <span>{survey.rejectionReason}</span>
                    </div>
                  )}

                  {/* Action Buttons based on Role & Workflow State */}
                  <div className="pt-2 border-t border-[#EBDCE7] flex items-center justify-between gap-2 flex-wrap">
                    {/* Schedule / Re-Schedule button */}
                    {(isRequested || isScheduled) && (
                      <button
                        onClick={() => {
                          setScheduleForm({
                            leadId: survey.leadId,
                            surveyId: survey.id,
                            surveyedById: survey.surveyedById || '',
                            scheduledAt: survey.scheduledAt
                              ? new Date(survey.scheduledAt).toISOString().slice(0, 16)
                              : '',
                            notes: survey.cleanNotes || '',
                          });
                          setScheduleModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#FAF6F9] hover:bg-[#714B67] text-[#714B67] hover:text-white border border-[#EBDCE7] font-bold text-xs transition cursor-pointer"
                      >
                        {survey.scheduledAt ? 'Reschedule Appointment' : 'Schedule Appointment'}
                      </button>
                    )}

                    {/* Technician Action: Fill Survey Form */}
                    {(isScheduled || isRequested) && (
                      <button
                        onClick={() => handleOpenMobileForm(survey)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-[#241621] font-black text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Compass className="w-3.5 h-3.5" /> Fill Mobile Survey Form
                      </button>
                    )}

                    {/* Manager Review & Approval */}
                    {isSubmitted && (
                      <button
                        onClick={() => handleOpenReviewModal(survey)}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs shadow-md shadow-[#714B67]/25 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#f09e38]" /> Review &amp; Approve
                      </button>
                    )}

                    {/* Sales Action: Quote Builder Shortcut */}
                    {isApproved && (
                      <button
                        onClick={() => navigate('/sales/quotes')}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Proceed to Quote Builder →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <Pagination
              currentPage={currentPage}
              totalItems={filteredSurveys.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[4, 8, 16, 32]}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          VIEW 2: TECHNICIAN CALENDAR & SCHEDULE
      ══════════════════════════════════════════════════════════ */}
      {activeTab === 'calendar' && (
        <div className="bg-white rounded-3xl p-6 border border-[#EBDCE7] shadow-sm space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#f09e38]" />
              <h2 className="text-base font-black text-[#241621]">Technician Field Appointments</h2>
            </div>
            <span className="text-slate-500 font-semibold">
              {surveys.filter((s) => s.scheduledAt).length} appointments scheduled
            </span>
          </div>

          <div className="divide-y divide-[#EBDCE7]">
            {surveys
              .filter((s) => s.scheduledAt)
              .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
              .map((survey) => (
                <div key={survey.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] flex flex-col items-center justify-center font-bold">
                      <span className="text-[10px] text-slate-400 uppercase">
                        {new Date(survey.scheduledAt).toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                      <span className="text-base font-black text-[#714B67]">
                        {new Date(survey.scheduledAt).getDate()}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-xs text-[#241621]">
                        {survey.lead?.contactName} •{' '}
                        <span className="font-mono text-slate-600">{survey.lead?.phone}</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {survey.lead?.address || 'Site Address TBD'} •{' '}
                        <span className="font-bold text-[#714B67]">{survey.recommendedKw || 3} kW Planned</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(survey.scheduledAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase block font-bold">Technician</span>
                      <span className="font-bold text-[#241621]">{survey.surveyedBy?.name || 'Unassigned'}</span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusBadge(
                        survey.status
                      )}`}
                    >
                      {survey.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 1: MOBILE SURVEY FORM (Field Technician Entry)
      ══════════════════════════════════════════════════════════ */}
      {mobileFormSurvey && (
        <div className="fixed inset-0 bg-[#22151F]/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#EBDCE7] my-8 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621]">
                  Mobile Site Survey Form • Field Engineering
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Customer: <span className="font-black text-[#714B67]">{mobileFormSurvey.lead?.contactName}</span> •{' '}
                  <span className="font-mono">{mobileFormSurvey.lead?.phone}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileFormSurvey(null)}
                className="text-[#b886ad] hover:text-[#241621] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSurveyForm} className="space-y-4 mt-3">
              {/* Roof Type & Direction */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Roof Structure Type *</label>
                  <select
                    value={surveyFormData.roofType}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, roofType: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] font-bold outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    {ROOF_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Azimuth / Orientation *</label>
                  <select
                    value={surveyFormData.roofDirection}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, roofDirection: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] font-bold outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    {ROOF_DIRECTIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Area, Tilt & Recommended kW */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Roof Area (sq.ft) *</label>
                  <input
                    type="number"
                    required
                    min="50"
                    placeholder="e.g. 600"
                    value={surveyFormData.roofAreaSqFt}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, roofAreaSqFt: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] font-bold text-center outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Tilt Angle (Degrees)</label>
                  <input
                    type="number"
                    min="5"
                    max="45"
                    value={surveyFormData.tiltAngle}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, tiltAngle: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] font-bold text-center outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Cable Run to ACDB (m) *</label>
                  <input
                    type="number"
                    required
                    min="5"
                    max="200"
                    placeholder="25"
                    value={surveyFormData.cableDistanceMeters}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, cableDistanceMeters: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] font-bold text-center outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              {/* Recommended Capacity & Structure Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">
                    Recommended System Size (kW) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    value={surveyFormData.recommendedKw}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, recommendedKw: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] font-black text-sm text-[#714B67] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Feeds automatically into Quote Builder capacity sizing.
                  </p>
                </div>

                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Mounting Structure Class</label>
                  <select
                    value={surveyFormData.structureType}
                    onChange={(e) => setSurveyFormData({ ...surveyFormData, structureType: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] font-bold outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    {STRUCTURE_TYPES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* GPS Coordinates with 1-Click Detect */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-extrabold text-[#241621]">GPS Coordinates / Geo-Tag</label>
                  <button
                    type="button"
                    onClick={handleDetectGPS}
                    className="text-[#714B67] hover:underline font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className="w-3 h-3 text-[#f09e38]" /> Auto-Detect Current GPS
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 17.4399° N, 78.4983° E"
                  value={surveyFormData.gpsCoordinates}
                  onChange={(e) => setSurveyFormData({ ...surveyFormData, gpsCoordinates: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-mono text-xs bg-[#FAF6F9] outline-none"
                />
              </div>

              {/* Site Photos Upload (Up to 5 Photos) */}
              <div className="space-y-2">
                <label className="font-extrabold text-[#241621] block">
                  Site Photos (Upload up to 5 photos: Roof view, LT meter, Shading, Inverter wall)
                </label>
                <div className="p-4 rounded-2xl border-2 border-dashed border-[#EBDCE7] bg-[#FAF6F9] text-center space-y-2">
                  <Camera className="w-6 h-6 text-[#714B67] mx-auto" />
                  <p className="text-slate-500 text-[11px]">
                    Drag &amp; drop photos or click to upload from camera/storage
                  </p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#714B67] file:text-white cursor-pointer"
                  />
                </div>

                {/* Photo Previews */}
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-5 gap-2 pt-2">
                    {photoPreviews.map((url, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden border border-[#EBDCE7] group">
                        <img src={url} alt={`Upload ${idx}`} className="w-full h-16 object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 p-0.5 rounded-full bg-rose-600 text-white cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Technical Remarks */}
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Technician Field Remarks</label>
                <textarea
                  rows="2"
                  placeholder="Note roof shading obstacles, earthing pit distance, meter condition..."
                  value={surveyFormData.notes}
                  onChange={(e) => setSurveyFormData({ ...surveyFormData, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] outline-none bg-[#FAF6F9]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setMobileFormSurvey(null)}
                  className="px-4 py-2 rounded-xl border border-[#EBDCE7] font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black shadow-md cursor-pointer disabled:opacity-50"
                >
                  {submittingForm ? 'Uploading & Submitting...' : 'Submit Survey for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 2: MANAGER REVIEW & 3-WAY APPROVAL WORKFLOW
      ══════════════════════════════════════════════════════════ */}
      {reviewModalSurvey && (
        <div className="fixed inset-0 bg-[#22151F]/75 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-[#EBDCE7] my-8 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div>
                <h3 className="text-base font-black text-[#241621]">Managerial Survey Approval Studio</h3>
                <p className="text-[11px] text-slate-500 font-semibold">
                  Client: <span className="font-black text-[#241621]">{reviewModalSurvey.lead?.contactName}</span> •{' '}
                  <span className="font-mono">{reviewModalSurvey.lead?.phone}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalSurvey(null)}
                className="text-[#b886ad] hover:text-[#241621] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-4 mt-3">
              {/* Technical Parameters Verification Table */}
              <div className="p-3.5 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-2">
                <span className="font-black text-[#714B67] uppercase text-[10px] tracking-wider block">
                  Field Measurements Submitted by Technician
                </span>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Roof Structure:</span>
                    <span className="font-bold text-[#241621]">{reviewModalSurvey.roofType || 'RCC Flat'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Azimuth &amp; Tilt:</span>
                    <span className="font-bold text-[#241621]">
                      {reviewModalSurvey.roofDirection || 'South'} • {reviewModalSurvey.tiltAngle || 15}°
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Roof Area &amp; Shadow-Free:</span>
                    <span className="font-bold text-[#241621]">
                      {reviewModalSurvey.roofAreaSqFt || 600} sq.ft (Shadow-Free: Yes)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Cable Distance to ACDB:</span>
                    <span className="font-black text-emerald-700">
                      {reviewModalSurvey.cableDistanceMeters || 25} meters
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Recommended System:</span>
                    <span className="font-black text-[#714B67] text-xs">
                      {reviewModalSurvey.recommendedKw || 3} kW System
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Survey Inspector:</span>
                    <span className="font-bold text-[#241621]">
                      {reviewModalSurvey.surveyedBy?.name || 'Field Technician'}
                    </span>
                  </div>
                </div>

                {reviewModalSurvey.cleanNotes && (
                  <p className="text-[11px] text-slate-600 pt-1 border-t border-[#EBDCE7]/50">
                    <strong>Technician Notes:</strong> {reviewModalSurvey.cleanNotes}
                  </p>
                )}
              </div>

              {/* Photos Gallery */}
              {reviewModalSurvey.photos && reviewModalSurvey.photos.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-extrabold text-[#241621] block">
                    Site Verification Photos ({reviewModalSurvey.photos.length})
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {reviewModalSurvey.photos.map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl overflow-hidden border border-[#EBDCE7] block hover:opacity-90 transition"
                      >
                        <img src={photo.url} alt={photo.caption} className="w-full h-20 object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval Workflow Selector */}
              <div className="space-y-2">
                <label className="font-extrabold text-[#241621] block">Managerial Decision *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: 'APPROVED' })}
                    className={`p-3 rounded-2xl border text-center font-black transition cursor-pointer ${
                      reviewForm.status === 'APPROVED'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30'
                        : 'bg-white border-[#EBDCE7] text-slate-700 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-current" />
                    Approve Survey
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: 'RE_SURVEY' })}
                    className={`p-3 rounded-2xl border text-center font-black transition cursor-pointer ${
                      reviewForm.status === 'RE_SURVEY'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/30'
                        : 'bg-white border-[#EBDCE7] text-slate-700 hover:bg-amber-50'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4 mx-auto mb-1 text-current" />
                    Request Re-Survey
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, status: 'REJECTED' })}
                    className={`p-3 rounded-2xl border text-center font-black transition cursor-pointer ${
                      reviewForm.status === 'REJECTED'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/30'
                        : 'bg-white border-[#EBDCE7] text-slate-700 hover:bg-rose-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4 mx-auto mb-1 text-current" />
                    Reject Survey
                  </button>
                </div>
              </div>

              {/* Instructions / Notes for Technician if Re-Survey or Rejection */}
              {reviewForm.status !== 'APPROVED' && (
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">
                    {reviewForm.status === 'RE_SURVEY' ? 'Instructions for Re-Survey *' : 'Rejection Reason *'}
                  </label>
                  <textarea
                    rows="2"
                    required
                    value={reviewForm.rejectionReason}
                    onChange={(e) => setReviewForm({ ...reviewForm, rejectionReason: e.target.value })}
                    placeholder={
                      reviewForm.status === 'RE_SURVEY'
                        ? 'e.g. Please re-verify the shadow from adjacent water tank between 2 PM and 4 PM.'
                        : 'e.g. Structural load test failed on tiled roof.'
                    }
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setReviewModalSurvey(null)}
                  className="px-4 py-2 rounded-xl border border-[#EBDCE7] font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#714B67] hover:bg-[#5C3B53] text-white font-black shadow-md cursor-pointer"
                >
                  Confirm Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 3: SCHEDULE SURVEY APPOINTMENT
      ══════════════════════════════════════════════════════════ */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7] text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#f09e38]" />
                <h3 className="text-base font-black text-[#241621]">Schedule Field Site Survey</h3>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModalOpen(false)}
                className="text-[#b886ad] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-3.5 mt-3">
              {!scheduleForm.surveyId && (
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">
                    Select Qualified Lead *
                  </label>
                  <select
                    required
                    value={scheduleForm.leadId}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, leadId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-bold"
                  >
                    <option value="">— Choose Lead —</option>
                    {qualifiedLeads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.contactName} • {l.title} ({l.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Assign Field Technician *</label>
                <select
                  required
                  value={scheduleForm.surveyedById}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, surveyedById: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-white font-bold"
                >
                  <option value="">— Select Technician —</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.activeSurveys} active appointments)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Appointment Date &amp; Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={scheduleForm.scheduledAt}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledAt: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] font-bold outline-none"
                />
              </div>

              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Instructions / Roof Access Notes</label>
                <textarea
                  rows="2"
                  placeholder="e.g. Parapet ladder available on 3rd floor. Contact security guard on arrival."
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EBDCE7]">
                <button
                  type="button"
                  onClick={() => setScheduleModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EBDCE7] font-bold text-slate-600 hover:bg-[#FAF6F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] font-black shadow-md cursor-pointer"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

