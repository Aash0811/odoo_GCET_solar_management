import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobsApi } from '../../api';
import SignatureCanvas from 'react-signature-canvas';
import {
  Wrench,
  Camera,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Download,
  Upload,
  ArrowLeft,
  PenTool,
} from 'lucide-react';

export default function MobileInstallFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sigCanvasRef = useRef(null);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [checklist, setChecklist] = useState({
    standsInstalled: false,
    panelsInstalled: false,
    boxesInstalled: false,
    earthingCompleted: false,
    powerTestPassed: false,
  });

  const [confirmedKw, setConfirmedKw] = useState(3);
  const [technicianHours, setTechnicianHours] = useState(8);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [signedByName, setSignedByName] = useState('');

  const loadJob = async () => {
    try {
      const res = await jobsApi.get(id);
      const j = res.data?.data;
      setJob(j);
      setConfirmedKw(j.confirmedKw || j.order?.capacityKw || 3);
      setChecklist({
        standsInstalled: j.standsInstalled,
        panelsInstalled: j.panelsInstalled,
        boxesInstalled: j.boxesInstalled,
        earthingCompleted: j.earthingCompleted,
        powerTestPassed: j.powerTestPassed,
      });
      setNotes(j.notes || '');
      setSignedByName(j.customer?.name || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [id]);

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setPhotos([...photos, ...files]);
    const previews = files.map((f) => URL.createObjectURL(f));
    setPhotoPreviews([...photoPreviews, ...previews]);
  };

  const handleClearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
    }
  };

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();

    // Check signature
    let sigBase64 = '';
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      sigBase64 = sigCanvasRef.current.toDataURL('image/png');
    }

    if (!job.signature && !sigBase64) {
      alert('Rule 7 Violation: Customer acceptance signature is mandatory on the canvas.');
      return;
    }

    if (job.photos.length === 0 && photos.length === 0) {
      alert('Rule 7 Violation: At least 1 on-site installation photo is mandatory.');
      return;
    }

    setSubmitting(true);
    try {
      // Use FormData for photos + payload
      const formData = new FormData();
      formData.append('startTime', new Date(Date.now() - technicianHours * 3600000).toISOString());
      formData.append('endTime', new Date().toISOString());
      formData.append('confirmedKw', confirmedKw.toString());
      formData.append('standsInstalled', checklist.standsInstalled.toString());
      formData.append('panelsInstalled', checklist.panelsInstalled.toString());
      formData.append('boxesInstalled', checklist.boxesInstalled.toString());
      formData.append('earthingCompleted', checklist.earthingCompleted.toString());
      formData.append('powerTestPassed', checklist.powerTestPassed.toString());
      formData.append('notes', notes);
      formData.append('signedByName', signedByName);
      formData.append('technicianHours', technicianHours.toString());
      if (sigBase64) formData.append('signatureImageBase64', sigBase64);

      photos.forEach((photo) => {
        formData.append('photos', photo);
      });

      await jobsApi.complete(id, formData);
      alert('Installation verified and marked COMPLETED! Certificate generated.');
      loadJob();
    } catch (err) {
      alert('Completion failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !job) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isCompleted = job.status === 'COMPLETED';

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <button onClick={() => navigate('/technician/jobs')} className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </button>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
          isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {job.status}
        </span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-slate-900">{job.jobNumber} Mobile Commissioning</h1>
        <p className="text-xs text-slate-500">Customer: {job.customer?.name} | {job.customer?.address}</p>
      </div>

      {isCompleted ? (
        <div className="p-6 bg-white rounded-2xl border border-emerald-200 shadow-sm space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Job Verified & Commissioned</h2>
            <p className="text-xs text-slate-500 mt-1">All engineering safety checks passed and customer signed off.</p>
          </div>

          <a
            href={jobsApi.downloadCertificateUrl(job.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md"
          >
            <Download className="w-4 h-4" /> Download Official Certificate (PDF)
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmitCompletion} className="space-y-5 text-xs">
          {/* Engineering Checklist (Rule 7) */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600" /> Mandatory Engineering Checklist (100% Required)
            </h2>

            <div className="space-y-2">
              {[
                { key: 'standsInstalled', label: '1. Module Mounting Structure & Stands Anchored' },
                { key: 'panelsInstalled', label: '2. Solar PV Panels Clamped and Torqued' },
                { key: 'boxesInstalled', label: '3. DCDB & ACDB Distribution Boxes Wired' },
                { key: 'earthingCompleted', label: '4. Dedicated Dual Chemical Earthing Connected' },
                { key: 'powerTestPassed', label: '5. String Voltage & Inverter Power Test Passed' },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={checklist[item.key]}
                    onChange={(e) => setChecklist({ ...checklist, [item.key]: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span className="font-semibold text-slate-800">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Job Parameters */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">Confirmed Capacity (kW)</label>
              <input
                type="number"
                step="0.5"
                value={confirmedKw}
                onChange={(e) => setConfirmedKw(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 mb-1 block">Technician Hours Worked</label>
              <input
                type="number"
                min="1"
                max="24"
                value={technicianHours}
                onChange={(e) => setTechnicianHours(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300"
              />
            </div>
          </div>

          {/* Site Photos Upload (Rule 7) */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-sky-600" /> Site Commissioning Photos (≥ 1 Mandatory)
            </h2>

            <label className="p-4 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center cursor-pointer hover:bg-sky-50">
              <Upload className="w-5 h-5 text-sky-600 mb-1" />
              <span className="font-bold text-sky-700">Tap to Capture / Upload Site Photo</span>
              <span className="text-[10px] text-slate-400">Array view, inverter mounting, or earthing</span>
              <input type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoSelect} className="hidden" />
            </label>

            {photoPreviews.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pt-2">
                {photoPreviews.map((src, i) => (
                  <img key={i} src={src} alt="Preview" className="w-16 h-16 rounded-lg object-cover border border-slate-200 shrink-0" />
                ))}
              </div>
            )}
          </div>

          {/* Customer Signature Canvas (Rule 7) */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <PenTool className="w-4 h-4 text-sky-600" /> Customer Acceptance Signature Canvas
              </h2>
              <button
                type="button"
                onClick={handleClearSignature}
                className="text-[11px] font-semibold text-rose-600 hover:underline"
              >
                Clear Signature
              </button>
            </div>

            <div>
              <label className="font-semibold text-slate-700 mb-1 block">Customer Signee Name</label>
              <input
                type="text"
                required
                value={signedByName}
                onChange={(e) => setSignedByName(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 mb-2"
              />
            </div>

            <div className="border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="#0f172a"
                canvasProps={{
                  className: 'w-full h-36 bg-white cursor-crosshair',
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400 italic text-center">
              Sign above using touch screen or stylus to accept installation.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {submitting ? 'Validating Engineering & Safety...' : 'Verify All Checklist & Complete Installation'}
          </button>
        </form>
      )}
    </div>
  );
}
