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
} from 'lucide-react';

const STAGES = [
  { id: 'NEW', title: 'New Leads', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { id: 'CONTACTED', title: 'Contacted', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'QUALIFIED', title: 'Qualified', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'SURVEY_SCHEDULED', title: 'Survey Booked', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'SURVEY_DONE', title: 'Survey Done', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'SURVEY_APPROVED', title: 'Survey Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'QUOTED', title: 'Quoted', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'WON', title: 'Won', color: 'bg-green-100 text-green-800 border-green-300' },
  { id: 'LOST', title: 'Lost', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export default function LeadBoardPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

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
      await leadsApi.updateChecklist(checklistModalLead.id, checklistForm);
      setChecklistModalLead(null);
      loadLeads();
    } catch (err) {
      alert('Failed to update checklist: ' + (err.response?.data?.message || err.message));
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

  const handleArchive = async (id) => {
    if (confirm('Archive this lead? (Rule 1: Leads are soft-archived, never hard deleted)')) {
      await leadsApi.archive(id);
      loadLeads();
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
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Solar Lead Pipeline (Kanban)</h1>
          <p className="text-xs text-slate-500">
            Stages: Enquiry → Contacted → Qualified → Survey → Quote → Won
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
        {STAGES.map((stage) => {
          const stageLeads = leads.filter((l) => l.stage === stage.id);
          return (
            <div key={stage.id} className="w-72 shrink-0 bg-slate-100/80 rounded-xl p-3 border border-slate-200 flex flex-col max-h-[75vh]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold text-slate-800">{stage.title}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-600 shadow-xs">
                  {stageLeads.length}
                </span>
              </div>

              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {stageLeads.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-slate-300 text-center text-[11px] text-slate-400">
                    No leads in stage
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <h2 className="text-xs font-bold text-slate-900 line-clamp-1">{lead.title}</h2>
                        <button
                          onClick={() => handleArchive(lead.id)}
                          title="Soft Archive"
                          className="text-slate-400 hover:text-rose-500"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <p className="font-semibold text-slate-800">{lead.contactName}</p>
                        <p className="flex items-center gap-1 text-slate-500">
                          <Phone className="w-3 h-3 text-sky-500" /> {lead.phone}
                        </p>
                        {lead.desiredCapacityKw && (
                          <p className="flex items-center gap-1 text-amber-600 font-medium">
                            <Zap className="w-3 h-3" /> {lead.desiredCapacityKw} kW System
                          </p>
                        )}
                      </div>

                      {/* Qualification Checklist Badge */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                        <button
                          onClick={() => handleOpenChecklist(lead)}
                          className="flex items-center gap-1 text-purple-600 font-semibold hover:underline"
                        >
                          <CheckSquare className="w-3 h-3" />
                          Checklist: {lead.shadowFreeArea && lead.monthlyBill && lead.gridSuitable ? '100%' : 'Pending'}
                        </button>

                        {lead.stage === 'QUALIFIED' && (
                          <button
                            onClick={() => {
                              setSurveyModalLead(lead);
                              setSurveyForm({ scheduledAt: '', notes: '' });
                            }}
                            className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-bold hover:bg-amber-100"
                          >
                            + Survey
                          </button>
                        )}

                        {lead.stage === 'SURVEY_APPROVED' && (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <FileCheck className="w-3 h-3" /> Ready for Quote
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Lead Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">New Solar Enquiry</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Project Title</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.title}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, title: e.target.value })}
                  placeholder="e.g. 5kW Rooftop Villa"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Customer Name</label>
                <input
                  type="text"
                  required
                  value={newLeadForm.contactName}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, contactName: e.target.value })}
                  placeholder="e.g. Vikram Reddy"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 mb-1 block">Target kW</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newLeadForm.desiredCapacityKw}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, desiredCapacityKw: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Site Address</label>
                <input
                  type="text"
                  value={newLeadForm.address}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, address: e.target.value })}
                  placeholder="Plot/Flat address"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full mt-3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold"
              >
                Create Lead
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Qualification Checklist Modal */}
      {checklistModalLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Lead Qualification Checklist</h3>
              <button onClick={() => setChecklistModalLead(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Lead: <span className="font-semibold text-slate-800">{checklistModalLead.title}</span>
            </p>
            <form onSubmit={handleSaveChecklist} className="space-y-3 text-xs">
              <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistForm.shadowFreeArea}
                  onChange={(e) => setChecklistForm({ ...checklistForm, shadowFreeArea: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-600"
                />
                <span className="font-medium text-slate-800">1. Adequate Shadow-Free Roof Area</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistForm.monthlyBill}
                  onChange={(e) => setChecklistForm({ ...checklistForm, monthlyBill: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-600"
                />
                <span className="font-medium text-slate-800">2. Monthly Bill verified (above threshold)</span>
              </label>

              <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklistForm.gridSuitable}
                  onChange={(e) => setChecklistForm({ ...checklistForm, gridSuitable: e.target.checked })}
                  className="w-4 h-4 rounded text-sky-600"
                />
                <span className="font-medium text-slate-800">3. Grid / Discom Sanctioned Load Suitable</span>
              </label>

              <button
                type="submit"
                className="w-full mt-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold"
              >
                Save Qualification Status
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Survey Modal */}
      {surveyModalLead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-slate-900">Schedule Site Survey</h3>
              <button onClick={() => setSurveyModalLead(null)} className="text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Scheduling for: <span className="font-semibold text-slate-800">{surveyModalLead.contactName}</span>
            </p>
            <form onSubmit={handleScheduleSurvey} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Survey Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={surveyForm.scheduledAt}
                  onChange={(e) => setSurveyForm({ ...surveyForm, scheduledAt: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 mb-1 block">Survey Instructions</label>
                <textarea
                  rows="3"
                  value={surveyForm.notes}
                  onChange={(e) => setSurveyForm({ ...surveyForm, notes: e.target.value })}
                  placeholder="Check roof orientation, parapet height, and meter board distance."
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>
              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold"
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
