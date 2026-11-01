import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import {
  Wrench,
  Calendar,
  MapPin,
  Phone,
  ArrowRight,
  Zap,
  RefreshCw,
  UserCheck,
  User,
  AlertCircle,
  CheckCircle2,
  Filter,
  ShieldCheck,
} from 'lucide-react';

export default function TechnicianJobsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'ADMIN';

  const [jobs, setJobs] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'UNASSIGNED', 'ASSIGNED'
  const [assigningJobId, setAssigningJobId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [jobsRes, techRes] = await Promise.all([
        jobsApi.list(),
        isAdmin ? jobsApi.getTechnicians() : Promise.resolve({ data: { data: [] } }),
      ]);
      setJobs(jobsRes.data?.data || []);
      setTechnicians(techRes.data?.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load installation jobs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isAdmin]);

  const showToast = (text) => {
    setToastMessage(text);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleAssignTechnician = async (jobId, technicianId) => {
    if (!technicianId) return;
    setAssigningJobId(jobId);
    try {
      const res = await jobsApi.updateProgress(jobId, { technicianId });
      const updatedJob = res.data?.data;
      const techName =
        updatedJob?.technician?.name ||
        technicians.find((t) => t.id === technicianId)?.name ||
        'Technician';

      showToast(`Job ${updatedJob?.jobNumber || ''} successfully assigned to ${techName} by Admin.`);

      // Update state in place
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, technicianId, technician: updatedJob.technician } : j))
      );
    } catch (err) {
      alert('Failed to assign technician: ' + (err.response?.data?.message || err.message));
    } finally {
      setAssigningJobId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#714b67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const unassignedJobs = jobs.filter((j) => !j.technicianId && !j.technician);
  const assignedJobs = jobs.filter((j) => j.technicianId || j.technician);

  const filteredJobs = jobs.filter((j) => {
    if (filterType === 'UNASSIGNED') return !j.technicianId && !j.technician;
    if (filterType === 'ASSIGNED') return j.technicianId || j.technician;
    return true;
  });

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-16">
      {/* Header */}
      <div className="pb-3 border-b border-[#ebdce6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#714b67]" /> Installation Jobs &amp; Technician Allocation
          </h1>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Admin assigns technicians directly; auto-assignment strategy disabled.'
              : 'Assigned solar installations & on-site mobile commissioning forms.'}
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Assignment Filters */}
      {isAdmin && (
        <div className="flex gap-2 overflow-x-auto text-xs font-bold pb-1">
          <button
            type="button"
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-[#714b67] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Jobs ({jobs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('UNASSIGNED')}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer ${
              filterType === 'UNASSIGNED'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <AlertCircle className="w-3 h-3" />
            <span>Unassigned ({unassignedJobs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('ASSIGNED')}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              filterType === 'ASSIGNED'
                ? 'bg-[#714b67] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Assigned ({assignedJobs.length})
          </button>
        </div>
      )}

      {error ? (
        <div className="p-6 text-center bg-white rounded-2xl border border-red-200 shadow-sm">
          <p className="text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={loadData}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#714b67] text-white text-xs font-bold hover:bg-[#5e3d55]"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              {filterType === 'UNASSIGNED'
                ? 'Great! All installation jobs are currently assigned to technicians.'
                : 'No installation jobs found in this category.'}
            </div>
          ) : (
            filteredJobs.map((job) => {
              const isAssigned = Boolean(job.technician || job.technicianId);
              const isAssigning = assigningJobId === job.id;

              return (
                <div
                  key={job.id}
                  className={`p-5 bg-white rounded-2xl border shadow-sm space-y-3.5 transition-all hover:border-[#714b67] ${
                    !isAssigned ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/15' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">{job.jobNumber}</span>
                      <span className="text-[10px] font-bold text-[#714b67] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {job.order?.orderNumber || 'Solar Order'}
                      </span>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        job.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : job.status === 'IN_PROGRESS'
                          ? 'bg-purple-100 text-[#714b67]'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-slate-900 text-sm">{job.customer?.name}</p>
                    <p className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-[#714b67]" /> {job.customer?.phone || 'No phone'}
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-500 line-clamp-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {job.customer?.address || 'Site location'}
                    </p>
                    <p className="flex items-center gap-1.5 text-slate-500">
                      <Zap className="w-3.5 h-3.5 text-[#f09e38]" /> {job.confirmedKw || job.order?.capacityKw || '3'} kW Rooftop System
                    </p>
                  </div>

                  {/* Technician Assignment Section */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Technician Allocation
                      </span>
                      {isAssigned ? (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Assigned
                        </span>
                      ) : (
                        <span className="text-[10px] font-black text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600" /> Needs Admin Assignment
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <User className={`w-4 h-4 ${isAssigned ? 'text-[#714b67]' : 'text-slate-400'}`} />
                      <div className="text-xs min-w-0 flex-1">
                        {isAssigned ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900">{job.technician?.name || 'Assigned Technician'}</span>
                            {job.technician?.phone && (
                              <span className="text-[10px] text-slate-500 font-mono">({job.technician.phone})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-amber-900 italic">
                            No technician assigned yet. Admin must assign a technician below.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Admin Assignment Dropdown Control */}
                    {isAdmin && (
                      <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-700 shrink-0">
                          {isAssigned ? 'Reassign to:' : 'Assign Technician:'}
                        </label>
                        <select
                          disabled={isAssigning}
                          value={job.technicianId || job.technician?.id || ''}
                          onChange={(e) => handleAssignTechnician(job.id, e.target.value)}
                          className="min-w-0 flex-1 p-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold outline-none focus:ring-1 focus:ring-[#714b67]"
                        >
                          <option value="">— Choose Technician —</option>
                          {technicians.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.phone || t.email})
                            </option>
                          ))}
                        </select>
                        {isAssigning && (
                          <span className="text-[10px] text-[#714b67] font-bold animate-pulse">
                            Saving...
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer & Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-[#f09e38]" />
                      {job.scheduledAt ? new Date(job.scheduledAt).toLocaleDateString() : 'Pending schedule'}
                    </span>

                    <Link
                      to={`/technician/jobs/${job.id}`}
                      className="px-3.5 py-1.5 rounded-xl bg-[#714b67] hover:bg-[#5e3d55] text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all shadow-[#714b67]/20"
                    >
                      {job.status === 'COMPLETED' ? 'View Certificate & Matrix' : 'Open Mobile Form'}{' '}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
