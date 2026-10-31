import React, { useState, useEffect } from 'react';
import { leadsApi, surveysApi } from '../../api';
import {
  Plus,
  CheckCircle2,
  Calendar,
  Archive,
  Phone,
  Mail,
  Zap,
  Clock,
  CheckSquare,
  X,
  FileCheck,
  AlertCircle,
  Search,
  Filter,
  Sparkles,
  ArrowRight,
  User,
  MapPin,
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

export default function LeadBoardPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('ALL');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [checklistModalLead, setChecklistModalLead] = useState(null);
  const [surveyModalLead, setSurveyModalLead] = useState(null);

  // Form states
  const [newLeadForm, setNewLeadForm] = useState({
    title: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    desiredCapacityKw: 3,
  });

  const [checklistForm, setChecklistForm] = useState({
    shadowFreeArea: false,
    monthlyBill: false,
    gridSuitable: false,
    monthlyBillAmount: '',
    desiredCapacityKw: 3,
  });

  const [surveyForm, setSurveyForm] = useState({
    scheduledAt: '',
    notes: '',
  });

  const loadLeads = async () => {
    try {
      const res = await leadsApi.list();
      setLeads(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, []);

  const handleCreateLead = async (e) => {
    e.preventDefault();
    try {
      await leadsApi.create(newLeadForm);
      setCreateModalOpen(false);
      setNewLeadForm({ title: '', contactName: '', phone: '', email: '', address: '', desiredCapacityKw: 3 });
      loadLeads();
    } catch (err) {
      alert('Failed to create lead: ' + (err.response?.data?.message || err.message));
    }
  };

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

  const handleSaveChecklist = async (e) => {
    e.preventDefault();
    try {
      const isQualified =
        Boolean(checklistForm.shadowFreeArea) &&
        Boolean(checklistForm.monthlyBill) &&
        Boolean(checklistForm.gridSuitable);

      // Determine expected stage optimistically
      let predictedStage = checklistModalLead.stage;
      if (isQualified && (predictedStage === 'NEW' || predictedStage === 'CONTACTED')) {
        predictedStage = 'QUALIFIED';
      } else if (!isQualified && predictedStage === 'QUALIFIED') {
        predictedStage = 'CONTACTED';
      }

      const targetId = checklistModalLead.id;

      // Optimistic update so the card moves IMMEDIATELY in the UI
      setLeads((prev) =>
        prev.map((l) =>
          l.id === targetId
            ? {
                ...l,
                ...checklistForm,
                stage: predictedStage,
              }
            : l
        )
      );

      setChecklistModalLead(null);

      const res = await leadsApi.updateChecklist(targetId, checklistForm);
      if (res.data?.data) {
        setLeads((prev) =>
          prev.map((l) => (l.id === targetId ? { ...l, ...res.data.data } : l))
        );
      }
      loadLeads();
    } catch (err) {
      alert('Failed to update checklist: ' + (err.response?.data?.message || err.message));
      loadLeads();
    }
  };

  const handleScheduleSurvey = async (e) => {
    e.preventDefault();
    try {
      await surveysApi.schedule({
        leadId: surveyModalLead.id,
        scheduledAt: surveyForm.scheduledAt,
        notes: surveyForm.notes,
      });
      setSurveyModalLead(null);
      setSurveyForm({ scheduledAt: '', notes: '' });
      loadLeads();
    } catch (err) {
      alert('Failed to schedule survey: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleMoveStage = async (leadId, nextStage) => {
    try {
      // Optimistically move card in UI immediately
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: nextStage } : l))
      );
      const res = await leadsApi.updateStage(leadId, nextStage);
      if (res.data?.data) {
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, ...res.data.data } : l))
        );
      }
      loadLeads();
    } catch (err) {
      alert('Could not change stage: ' + (err.response?.data?.message || err.message));
      loadLeads();
    }
  };

  const handleArchive = async (id) => {
    if (confirm('Soft-archive this lead? (Rule 1: Leads are soft-archived, never hard deleted)')) {
      await leadsApi.archive(id);
      loadLeads();
    }
  };

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery);
    const matchesStage = filterStage === 'ALL' || l.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">Solar Sales Pipeline</h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Rule 1: Never Hard Deleted • 9-Stage Rooftop Pipeline • Qualification Gatekeepers
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#b886ad]" />
            <input
              type="text"
              placeholder="Filter leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-[#EBDCE7] bg-white text-xs text-[#241621] outline-none focus:ring-2 focus:ring-[#714B67] shadow-xs w-44"
            />
          </div>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#714b67] to-[#855278] hover:opacity-95 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-[#714b67]/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#f09e38]" /> New Enquiry
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Horizontal Scroll */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
        {STAGES.map((stage) => {
          const stageLeads = filteredLeads.filter((l) => l.stage === stage.id);
          return (
            <div
              key={stage.id}
              className="w-76 shrink-0 bg-[#F5EDF3]/70 backdrop-blur-md rounded-2xl p-3.5 border border-[#EBDCE7] flex flex-col max-h-[76vh] shadow-xs"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.accent }}></span>
                  <span className="text-xs font-black text-[#241621]">{stage.title}</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${stage.badgeBg} ${stage.badgeText} shadow-xs border border-[#EBDCE7]`}>
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {stageLeads.length === 0 ? (
                  <div className="p-6 rounded-xl border border-dashed border-[#dabed3] text-center text-[11px] text-[#b886ad] font-medium">
                    No leads in this stage
                  </div>
                ) : (
                  stageLeads.map((lead) => {
                    const isFullyQualified = lead.shadowFreeArea && lead.monthlyBill && lead.gridSuitable;
                    return (
                      <div
                        key={lead.id}
                        className="p-4 rounded-xl bg-white border border-[#EBDCE7] shadow-xs hover:shadow-md hover:border-[#b886ad] transition-all space-y-2.5 group relative"
                        style={{ borderLeft: `3px solid ${stage.accent}` }}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <h2 className="text-xs font-black text-[#241621] line-clamp-1 group-hover:text-[#714B67] transition-colors">
                            {lead.title}
                          </h2>
                          <div className="flex items-center gap-1 shrink-0">
                            <select
                              value={lead.stage}
                              onChange={(e) => handleMoveStage(lead.id, e.target.value)}
                              title="Move card forward or backward to any stage"
                              className="text-[9px] font-bold py-0.5 px-1 rounded border border-[#EBDCE7] bg-[#FAF6F9] text-[#714B67] hover:border-[#714B67] cursor-pointer"
                            >
                              {STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.title}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleArchive(lead.id)}
                              title="Soft Archive (Rule 1)"
                              className="text-[#b886ad] hover:text-rose-500 transition-colors p-0.5 cursor-pointer"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 space-y-1">
                          <p className="font-extrabold text-[#241621] flex items-center gap-1">
                            <User className="w-3 h-3 text-[#714B67]" /> {lead.contactName}
                          </p>
                          <p className="flex items-center gap-1 text-slate-500">
                            <Phone className="w-3 h-3 text-[#714B67]" /> {lead.phone}
                          </p>
                          {lead.address && (
                            <p className="flex items-center gap-1 text-slate-400 text-[10px] truncate">
                              <MapPin className="w-3 h-3 text-[#b886ad]" /> {lead.address}
                            </p>
                          )}
                          {lead.desiredCapacityKw && (
                            <div className="flex items-center gap-1 text-[#d4821a] font-black text-[10px] bg-[#f09e38]/15 px-2 py-0.5 rounded-md w-fit mt-1 border border-[#f09e38]/30">
                              <Zap className="w-3 h-3" /> {lead.desiredCapacityKw} kW Rooftop
                            </div>
                          )}
                        </div>

                        {/* Action Bar (Two-Way Stage Controls) */}
                        <div className="pt-2 border-t border-[#EBDCE7] flex items-center justify-between text-[10px] gap-1 flex-wrap">
                          <button
                            onClick={() => handleOpenChecklist(lead)}
                            className="flex items-center gap-1 text-[#714B67] font-bold hover:underline cursor-pointer"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            {isFullyQualified ? (
                              <span className="text-emerald-700 font-black">100% OK</span>
                            ) : (
                              <span>Checklist</span>
                            )}
                          </button>

                          {/* Stage Transition Shortcuts (Forward & Backward) */}
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
                                    setSurveyForm({ scheduledAt: '', notes: '' });
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
                              <>
                                <button
                                  onClick={() => handleMoveStage(lead.id, 'SURVEY_DONE')}
                                  title="Move back to Survey Done"
                                  className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                                >
                                  ← Back
                                </button>
                                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-black flex items-center gap-0.5 border border-emerald-200">
                                  <FileCheck className="w-3 h-3 text-emerald-600" /> Ready to Quote
                                </span>
                              </>
                            )}

                            {lead.stage === 'QUOTED' && (
                              <>
                                <button
                                  onClick={() => handleMoveStage(lead.id, 'SURVEY_APPROVED')}
                                  title="Move back to Survey Approved"
                                  className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                                >
                                  ← Back
                                </button>
                                <button
                                  onClick={() => handleMoveStage(lead.id, 'WON')}
                                  className="px-2 py-0.5 rounded bg-emerald-600 text-white font-black hover:bg-emerald-500 cursor-pointer"
                                >
                                  Mark Won ★
                                </button>
                              </>
                            )}

                            {lead.stage === 'WON' && (
                              <button
                                onClick={() => handleMoveStage(lead.id, 'QUOTED')}
                                title="Re-open Quote"
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
                              >
                                ← Re-open
                              </button>
                            )}

                            {lead.stage === 'LOST' && (
                              <button
                                onClick={() => handleMoveStage(lead.id, 'NEW')}
                                title="Re-activate Lead"
                                className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-black border border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                              >
                                ↺ Re-activate
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Lead Modal in Odoo Theme */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#F5EDF3] flex items-center justify-center text-[#714B67]">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-[#241621]">New Solar Enquiry</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-[#b886ad] hover:text-[#241621] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Project Title / Property</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.title}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, title: e.target.value })}
                  placeholder="e.g. 5kW Rooftop Villa"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                />
              </div>
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Customer Name</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.contactName}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, contactName: e.target.value })}
                  placeholder="e.g. Vikram Reddy"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-[#241621] mb-1 block">Target Capacity (kW)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newLeadForm.desiredCapacityKw}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, desiredCapacityKw: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none font-bold"
                  />
                </div>
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
              <button
                type="submit"
                className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs shadow-md shadow-[#714B67]/25 cursor-pointer"
              >
                Create Lead (Rule 1 Active)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Qualification Checklist Modal */}
      {checklistModalLead && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#714B67]" />
                <h3 className="text-base font-black text-[#241621]">Lead Qualification Checklist</h3>
              </div>
              <button onClick={() => setChecklistModalLead(null)} className="text-[#b886ad] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#714B67] mb-4 font-semibold">
              Project: <span className="font-black text-[#241621]">{checklistModalLead.title}</span>
            </p>
            <form onSubmit={handleSaveChecklist} className="space-y-3 text-xs">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] hover:bg-[#F5EDF3] transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistForm.shadowFreeArea}
                  onChange={(e) => setChecklistForm({ ...checklistForm, shadowFreeArea: e.target.checked })}
                  className="w-4 h-4 rounded text-[#714B67] accent-[#714B67]"
                />
                <span className="font-bold text-[#241621]">1. Adequate Shadow-Free Roof Area</span>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] hover:bg-[#F5EDF3] transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistForm.monthlyBill}
                  onChange={(e) => setChecklistForm({ ...checklistForm, monthlyBill: e.target.checked })}
                  className="w-4 h-4 rounded text-[#714B67] accent-[#714B67]"
                />
                <span className="font-bold text-[#241621]">2. Monthly Power Bill verified (&gt; ₹2,500/mo)</span>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-[#EBDCE7] bg-[#FAF6F9] hover:bg-[#F5EDF3] transition cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistForm.gridSuitable}
                  onChange={(e) => setChecklistForm({ ...checklistForm, gridSuitable: e.target.checked })}
                  className="w-4 h-4 rounded text-[#714B67] accent-[#714B67]"
                />
                <span className="font-bold text-[#241621]">3. Discom Sanctioned Load Suitable for Net-Meter</span>
              </label>

              {checklistForm.shadowFreeArea && checklistForm.monthlyBill && checklistForm.gridSuitable ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>All 3 gates verified! Lead qualifies and moves to <strong>QUALIFIED</strong> stage.</span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Gates incomplete. Lead will automatically move back to <strong>CONTACTED</strong>.</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-3 py-3 rounded-xl bg-[#714B67] hover:bg-[#5C3B53] text-white font-black text-xs shadow-md shadow-[#714B67]/25 cursor-pointer"
              >
                Save Qualification Status
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Survey Modal */}
      {surveyModalLead && (
        <div className="fixed inset-0 bg-[#22151F]/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#EBDCE7]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#EBDCE7]">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#f09e38]" />
                <h3 className="text-base font-black text-[#241621]">Schedule Site Survey</h3>
              </div>
              <button onClick={() => setSurveyModalLead(null)} className="text-[#b886ad] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#714B67] mb-4 font-semibold">
              Client: <span className="font-black text-[#241621]">{surveyModalLead.contactName}</span>
            </p>
            <form onSubmit={handleScheduleSurvey} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Survey Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={surveyForm.scheduledAt}
                  onChange={(e) => setSurveyForm({ ...surveyForm, scheduledAt: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                />
              </div>
              <div>
                <label className="font-extrabold text-[#241621] mb-1 block">Survey Instructions for Field Tech</label>
                <textarea
                  rows="3"
                  value={surveyForm.notes}
                  onChange={(e) => setSurveyForm({ ...surveyForm, notes: e.target.value })}
                  placeholder="Check roof orientation (south facing preferred), parapet shadow, and LT meter panel."
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] focus:ring-2 focus:ring-[#714B67] outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-white font-black text-xs shadow-md shadow-[#f09e38]/25 cursor-pointer"
              >
                Confirm Survey Appointment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
