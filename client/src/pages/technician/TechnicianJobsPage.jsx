import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jobsApi } from '../../api';
import {
  Wrench,
  Calendar,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  ArrowRight,
  Zap,
} from 'lucide-react';

export default function TechnicianJobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobsApi
      .list()
      .then((res) => setJobs(res.data?.data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#714b67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="pb-3 border-b border-[#ebdce6]">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Technician Installation Jobs</h1>
        <p className="text-xs text-slate-500">Assigned solar installations & on-site mobile commissioning forms</p>
      </div>

      <div className="space-y-3">
        {jobs.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No installation jobs assigned.
          </div>
        ) : (
          jobs.map((job) => (
            <div
              key={job.id}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 transition-all hover:border-[#714b67]"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{job.jobNumber}</span>
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
                  <Phone className="w-3.5 h-3.5 text-[#714b67]" /> {job.customer?.phone}
                </p>
                <p className="flex items-center gap-1.5 text-slate-500 line-clamp-2">
                  <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" /> {job.customer?.address || 'Site location'}
                </p>
                <p className="flex items-center gap-1.5 text-slate-500">
                  <Zap className="w-3.5 h-3.5 text-[#f09e38]" /> {job.order?.capacityKw || '3'} kW Rooftop System
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {job.scheduledAt ? new Date(job.scheduledAt).toLocaleDateString() : 'Pending schedule'}
                </span>

                <Link
                  to={`/technician/jobs/${job.id}`}
                  className="px-3 py-1.5 rounded-xl bg-[#714b67] hover:bg-[#5e3d55] text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all shadow-[#714b67]/20"
                >
                  {job.status === 'COMPLETED' ? 'View Certificate' : 'Open Mobile Form'} <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
