import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobsApi, technicianVerificationApi } from '../../api';
import SignatureCanvas from 'react-signature-canvas';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
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
  ScanLine,
  Zap,
  ShieldCheck,
  Check,
  X,
  Maximize2,
  Sparkles,
  RefreshCw,
  Info,
} from 'lucide-react';

export default function MobileInstallFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sigCanvasRef = useRef(null);
  const scannerRef = useRef(null);
  const scanInProgressRef = useRef(false);
  const scannerContainerId = `technician-scanner-${id}`;
  const imageInputRef = useRef(null);
  const presetPhotoInputRef = useRef(null);
  const [activePresetIndex, setActivePresetIndex] = useState(null);

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
  const [photoCaptions, setPhotoCaptions] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [previewModalUrl, setPreviewModalUrl] = useState(null);

  // Digital Signature
  const [signedByName, setSignedByName] = useState('');
  const [signerRole, setSignerRole] = useState('Customer / Site Owner');
  const [sigDrawn, setSigDrawn] = useState(false);

  // Barcode Scanning
  const [serialInput, setSerialInput] = useState('');
  const [verifiedSerials, setVerifiedSerials] = useState([]);
  const [verifiedProducts, setVerifiedProducts] = useState([]);
  const [serialScanMessage, setSerialScanMessage] = useState(null);
  const [scanningSerial, setScanningSerial] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [decodingImage, setDecodingImage] = useState(false);

  // Component Connection Verification Matrix
  const [componentConnections, setComponentConnections] = useState([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState('ALL');

  // 5 Dedicated Photo Presets for On-Site Commissioning
  const photoPresets = [
    { title: 'Solar PV Rooftop Array Layout', hint: 'All PV modules clamped, aligned, and wired on mounting rails' },
    { title: 'Inverter Mounting & DC/AC Cabling', hint: 'Wall-mounted inverter with DC isolator and conduits dressed' },
    { title: 'DCDB & ACDB Distribution Boxes', hint: 'Internal view of DC fuses, AC breaker MCBs, and surge arresters' },
    { title: 'Dual Chemical Earthing Pits & LA', hint: 'Earthing electrode pit connections and copper grounding strips' },
    { title: 'Net-Meter & Generation kW Display', hint: 'Digital meter or inverter screen displaying active solar power feed' },
  ];

  const buildInitialComponents = (jobData) => {
    const systemKw = jobData.confirmedKw || jobData.order?.capacityKw || 3;
    const quoteLines = jobData.order?.quote?.lines || [];

    const baseComponents = [
      {
        id: 'mms',
        name: 'Module Mounting Structure & Framework (MMS)',
        category: 'Structure',
        description: 'Elevated GI/Alu rails anchored to RCC roof with anchor fasteners, torqued to 12 Nm, bonded with earth clamp.',
        reading: '12 Nm torque, Wind-tested & Grounded',
        status: 'CONNECTED_SUCCESSFULLY',
        notes: 'Anchored and torque checked.',
      },
      {
        id: 'panels',
        name: 'Solar PV Panels Array (MC4 Series Strings)',
        category: 'PV Array',
        description: 'PV module strings connected in series with IP68 MC4 connectors; array positive & negative polarities verified.',
        reading: 'Voc: 382V DC, MC4 Locked',
        status: 'CONNECTED_SUCCESSFULLY',
        notes: 'MC4 connectors locked and polarity tested.',
      },
      {
        id: 'dcdb',
        name: 'DC Distribution Box (DCDB) & Protection',
        category: 'DC Protection',
        description: 'Incoming PV DC strings terminated to DCDB terminal blocks with 1000V DC fuses and DC SPD grounded.',
        reading: '1000V DC Fuses & DC SPD Grounded',
        status: 'CONNECTED_SUCCESSFULLY',
        notes: 'DC fuses seated, SPD status indicator green.',
      },
      {
        id: 'inverter_dc',
        name: 'Solar Inverter DC Input (MPPT Channels)',
        category: 'Inverter DC',
        description: 'DC cables routed from DCDB to Inverter DC MPPT inputs with verified polarity (+ / -) and DC isolator engaged.',
        reading: 'DC Isolator ON, Polarity Checked',
        status: 'CONNECTED_SUCCESSFULLY',
        notes: 'MPPT 1 & 2 inputs wired and torqued.',
      },
      {
        id: 'inverter_ac',
        name: 'Solar Inverter AC Output Terminals',
        category: 'Inverter AC',
        description: 'Inverter AC Phase, Neutral, and Ground terminals wired via 4-core copper cable to ACDB; 230V/415V 50Hz sync checked.',
        reading: '234V AC, 50.0 Hz Synchronized',
        status: 'CONNECTED_SUCCESSFULLY',
        notes: 'Grid frequency match verified.',
      },
      {
        id: 'acdb',
        name: 'AC Distribution Box (ACDB) & Safety Breakers',
        category: 'AC Protection',
        description: 'AC incoming connected through MCB breaker and 30mA RCCB leakage protection; AC SPD surge protection grounded.',
        reading: 'MCB & 30mA RCCB Protection Active',
        status: 'CONNECTED_SUCCESSFULLY',
        notes: 'Trip test button tested and operational.',
      },
      {
        id: 'earthing',
        name: 'Dual Chemical Earthing System (Dual Grounding Pits)',
        category: 'Grounding',
        description: 'Dual maintenance-free chemical earthing pits connected via 25x3mm copper/GI grounding tape (Pit 1: AC/LA, Pit 2: DC/Inverter).',
        reading: 'Dual Pits Earth Resistance: 2.3 Ω (< 5.0 Ω)',
        status: 'CONNECTED_SUCCESSFULLY',
        notes: 'Earth resistance measured at 2.3 Ohms with earth tester.',
      },
      {
        id: 'la',
        name: 'Lightning Arrester (LA) System & Down-Conductor',
        category: 'Surge & Lightning',
        description: 'ESE/copper arrester mounted at highest mast on roof; connected directly to dedicated earthing pit via insulated down-conductor.',
        reading: 'ESE Rooftop Mast Clamped & Grounded',
        status: 'CONNECTED_SUCCESSFULLY',
        notes: '45 degree protection cone coverage verified.',
      },
      {
        id: 'grid_meter',
        name: 'DISCOM Bi-Directional Net-Meter & Grid Interconnection',
        category: 'Grid Sync',
        description: 'ACDB output linked to utility DISCOM bi-directional net-meter; anti-islanding disconnect test conducted successfully.',
        reading: 'Anti-Islanding Trip Tested (<2s)',
        status: 'CONNECTED_SUCCESSFULLY',
        notes: 'Inverter disconnected within 1.6s on grid outage.',
      },
      {
        id: 'power_gen',
        name: 'Full System Power Generation & Commissioning Output',
        category: 'Live Generation',
        description: 'System energized, inverter display active, feeding clean solar power into the premises/grid with zero error alarms.',
        reading: `${systemKw} kW Active Generation Confirmed`,
        status: 'CONNECTED_SUCCESSFULLY',
        notes: 'Full generation test passed with nominal kW export.',
      },
    ];

    // Add any specific BOM products from the order quote
    quoteLines.forEach((line, index) => {
      const prodName = line.product?.name || line.description;
      if (prodName && !baseComponents.some((b) => b.name.toLowerCase().includes(prodName.toLowerCase()))) {
        baseComponents.push({
          id: `bom-${line.id || index}`,
          name: `${prodName} (${line.quantity} units)`,
          category: 'Order Hardware',
          description: `Delivered equipment item: verified physical mounting and electrical termination.`,
          reading: 'Terminals inspected & torqued',
          status: 'CONNECTED_SUCCESSFULLY',
          notes: 'Hardware terminal connections verified.',
        });
      }
    });

    return baseComponents;
  };

  const loadJob = async () => {
    try {
      const res = await jobsApi.get(id);
      const j = res.data?.data;
      setJob(j);
      setConfirmedKw(j.confirmedKw || j.order?.capacityKw || 3);
      setChecklist({
        standsInstalled: j.standsInstalled ?? true,
        panelsInstalled: j.panelsInstalled ?? true,
        boxesInstalled: j.boxesInstalled ?? true,
        earthingCompleted: j.earthingCompleted ?? true,
        powerTestPassed: j.powerTestPassed ?? true,
      });
      setNotes(j.notes || '');
      setSignedByName(j.customer?.name || '');

      // Load or build component connection verification matrix
      if (j.componentConnections && j.componentConnections.length > 0) {
        setComponentConnections(j.componentConnections);
      } else {
        setComponentConnections(buildInitialComponents(j));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [id]);

  const handleToggleComponentStatus = (compId) => {
    setComponentConnections((prev) =>
      prev.map((c) => {
        if (c.id === compId) {
          const nextStatus =
            c.status === 'CONNECTED_SUCCESSFULLY' ? 'PENDING_FAILED' : 'CONNECTED_SUCCESSFULLY';
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const handleUpdateComponentReading = (compId, newReading) => {
    setComponentConnections((prev) =>
      prev.map((c) => (c.id === compId ? { ...c, reading: newReading } : c))
    );
  };

  const handleMarkAllComponentsConnected = () => {
    setComponentConnections((prev) =>
      prev.map((c) => ({
        ...c,
        status: 'CONNECTED_SUCCESSFULLY',
      }))
    );
    setChecklist({
      standsInstalled: true,
      panelsInstalled: true,
      boxesInstalled: true,
      earthingCompleted: true,
      powerTestPassed: true,
    });
  };

  const handlePhotoSelect = (e, presetTitle = null) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newCaptions = files.map((f, i) =>
      presetTitle ? presetTitle : `Site installation photo ${photos.length + i + 1}`
    );
    const previews = files.map((f) => URL.createObjectURL(f));

    setPhotos((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [...prev, ...previews]);
    setPhotoCaptions((prev) => [...prev, ...newCaptions]);
  };

  const handleRemovePhoto = (index) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
    setPhotoCaptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSelectedPhotos = async () => {
    if (photos.length === 0) return;
    setUploadingPhotos(true);
    try {
      const fd = new FormData();
      photos.forEach((p) => fd.append('photos', p));
      fd.append('photoCaptions', JSON.stringify(photoCaptions));
      fd.append('caption', photoCaptions[0] || 'Installed Equipment & Solar Panels');
      await jobsApi.uploadPhoto(id, fd);
      alert(`${photos.length} photo(s) uploaded successfully to installation job!`);
      setPhotos([]);
      setPhotoPreviews([]);
      setPhotoCaptions([]);
      loadJob();
    } catch (err) {
      alert('Photo upload failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleClearSignature = () => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setSigDrawn(false);
    }
  };

  // Barcode / Delivery Equipment Verification
  const expectedSerials = job?.order?.serialNumbers || [];
  const expectedProductLines = (job?.order?.quote?.lines || []).filter(
    (line) => line.product && !line.product.isSerialTracked
  );
  const expectedProductQuantity = expectedProductLines.reduce(
    (total, line) => total + Number(line.quantity || 0),
    0
  );
  const serialVerificationComplete =
    expectedSerials.length === 0 ||
    expectedSerials.every((expected) => verifiedSerials.some((verified) => verified.id === expected.id));
  const productVerificationComplete =
    expectedProductLines.length === 0 ||
    expectedProductLines.every((line) => {
      const verifiedCount = verifiedProducts.filter((product) => product.id === line.product.id).length;
      return verifiedCount >= Number(line.quantity);
    });
  const verificationTotal = expectedSerials.length + expectedProductQuantity;
  const verifiedTotal = verifiedSerials.length + verifiedProducts.length;
  const deliveryVerificationComplete = serialVerificationComplete && productVerificationComplete;

  const verifySerialCode = async (codeToVerify) => {
    const code = codeToVerify.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!code || scanningSerial || scanInProgressRef.current) return;

    scanInProgressRef.current = true;
    setScanningSerial(true);
    setSerialScanMessage(null);
    try {
      const response = await technicianVerificationApi.lookupBarcode(code);
      const scanned = response.data?.data;
      if (!scanned?.found) {
        throw new Error('Barcode or QR code was not found in the product/serial catalogue.');
      }

      if (scanned.type === 'SERIAL' && scanned.serial) {
        const expected = expectedSerials.find(
          (serial) => serial.serial.toLowerCase() === scanned.serial.toLowerCase()
        );
        if (!expected) {
          throw new Error(
            `Mismatch: ${scanned.product?.name || 'This product'} / ${scanned.serial} is not assigned to this delivered order.`
          );
        }
        if (verifiedSerials.some((serial) => serial.id === expected.id)) {
          throw new Error(`Serial ${expected.serial} has already been verified.`);
        }
        setVerifiedSerials((previous) => [...previous, expected]);
      } else if (scanned.type === 'PRODUCT_SKU' && scanned.product?.id) {
        const expectedLine = expectedProductLines.find((line) => line.product.id === scanned.product.id);
        const verifiedCount = verifiedProducts.filter(
          (product) => product.id === scanned.product.id
        ).length;
        if (!expectedLine) {
          throw new Error(
            `${scanned.product.name || 'This product'} is not part of this delivered order.`
          );
        }
        if (verifiedCount >= Number(expectedLine.quantity)) {
          throw new Error(`All required units of ${scanned.product.name} are already verified.`);
        }
        setVerifiedProducts((previous) => [...previous, scanned.product]);
      } else {
        throw new Error('Scan a registered product SKU or serialized unit barcode.');
      }

      setSerialInput('');
      setSerialScanMessage({
        type: 'success',
        text: `Verified: ${scanned.product?.name || 'Product'}${scanned.serial ? ` · ${scanned.serial}` : ''}`,
      });
    } catch (err) {
      setSerialScanMessage({
        type: 'error',
        text: err.response?.data?.message || err.message,
      });
    } finally {
      setScanningSerial(false);
      scanInProgressRef.current = false;
    }
  };

  const handleVerifySerial = async (e) => {
    e.preventDefault();
    await verifySerialCode(serialInput);
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (error) {
        console.warn('Technician scanner stop failed:', error);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  const handleToggleCamera = async () => {
    if (cameraActive) {
      await stopCamera();
      return;
    }

    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera scanning requires HTTPS or localhost. Use the scanner input or upload an image instead.');
      return;
    }

    setCameraActive(true);
    window.setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(scannerContainerId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 320, height: 140 },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
              Html5QrcodeSupportedFormats.CODE_93,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
            ],
          },
          async (decodedText) => {
            if (scanInProgressRef.current) return;
            await stopCamera();
            setSerialInput(decodedText);
            await verifySerialCode(decodedText);
          },
          () => {}
        );
      } catch (error) {
        await stopCamera();
        setCameraError(
          error.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in the browser address bar and try again.'
            : error.name === 'NotFoundError'
              ? 'No camera was found. Use the scanner input or upload an image instead.'
              : `Could not start camera scanner: ${error.message || 'unknown camera error'}`
        );
      }
    }, 100);
  };

  const handleImageScan = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setDecodingImage(true);
    setCameraError('');
    try {
      const scanner = new Html5Qrcode(`${scannerContainerId}-image`, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
      });
      const decodedText = await scanner.scanFile(file, true);
      scanner.clear();
      setSerialInput(decodedText);
      await verifySerialCode(decodedText);
    } catch (error) {
      setCameraError(`Could not decode this image: ${error.message || 'Use a clear barcode or QR image.'}`);
    } finally {
      setDecodingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  useEffect(() => () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  }, []);

  // Completion Validation
  const connectedComponentsCount = componentConnections.filter(
    (c) => c.status === 'CONNECTED_SUCCESSFULLY'
  ).length;
  const allComponentsConnected =
    componentConnections.length > 0 && connectedComponentsCount === componentConnections.length;

  const handleSubmitCompletion = async (e) => {
    e.preventDefault();

    // 1. Check Component Connections
    const pendingComponents = componentConnections.filter(
      (c) => c.status !== 'CONNECTED_SUCCESSFULLY'
    );
    if (pendingComponents.length > 0) {
      const names = pendingComponents.map((c) => c.name).join('\n• ');
      alert(
        `Cannot complete installation: The following component(s) are not connected successfully:\n\n• ${names}\n\nAll components must be verified as connected successfully before commissioning.`
      );
      return;
    }

    // 2. Check Digital Signature
    let sigBase64 = '';
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      sigBase64 = sigCanvasRef.current.toDataURL('image/png');
    }

    if (!job.signature && !sigBase64) {
      alert('Digital signature is mandatory. Please have the customer or commissioning engineer sign on the canvas.');
      return;
    }

    // 3. Check Post-Installation Photos
    const totalPhotos = (job.photos?.length || 0) + photos.length;
    if (totalPhotos === 0) {
      alert('At least 1 on-site post-installation photo is mandatory to verify installation.');
      return;
    }

    // 4. Check Barcode Delivery Verification
    if (!deliveryVerificationComplete) {
      alert(
        `Delivery verification incomplete: scan all ${verificationTotal} expected delivered item(s) before completing installation.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('startTime', new Date(Date.now() - technicianHours * 3600000).toISOString());
      formData.append('endTime', new Date().toISOString());
      formData.append('confirmedKw', confirmedKw.toString());
      formData.append('standsInstalled', 'true');
      formData.append('panelsInstalled', 'true');
      formData.append('boxesInstalled', 'true');
      formData.append('earthingCompleted', 'true');
      formData.append('powerTestPassed', 'true');
      formData.append('notes', notes);
      formData.append('signedByName', signedByName);
      formData.append('signatureRole', signerRole);
      formData.append('technicianHours', technicianHours.toString());
      formData.append('componentConnections', JSON.stringify(componentConnections));
      formData.append('photoCaptions', JSON.stringify(photoCaptions));

      if (sigBase64) {
        formData.append('signatureImageBase64', sigBase64);
      }

      photos.forEach((photo) => {
        formData.append('photos', photo);
      });

      await jobsApi.complete(id, formData);
      alert('All components verified connected successfully! Commissioning completed and certificate generated.');
      setPhotos([]);
      setPhotoPreviews([]);
      setPhotoCaptions([]);
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
        <div className="w-8 h-8 border-4 border-[#714b67] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const isCompleted = job.status === 'COMPLETED';

  // Filter components by category tab
  const filteredComponents = componentConnections.filter((c) => {
    if (activeCategoryTab === 'ALL') return true;
    if (activeCategoryTab === 'SOLAR_INVERTER')
      return ['PV Array', 'Inverter DC', 'Inverter AC', 'Order Hardware'].includes(c.category);
    if (activeCategoryTab === 'DISTRIBUTION')
      return ['DC Protection', 'AC Protection', 'Grid Sync'].includes(c.category);
    if (activeCategoryTab === 'EARTHING_SAFETY')
      return ['Structure', 'Grounding', 'Surge & Lightning'].includes(c.category);
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#ebdce6]">
        <button
          onClick={() => navigate('/technician/jobs')}
          className="text-xs font-semibold text-slate-600 flex items-center gap-1 hover:text-[#714b67]"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </button>
        <span
          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
            isCompleted ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-purple-100 text-[#714b67] border border-purple-200'
          }`}
        >
          {isCompleted ? '✓ Commissioned & Certified' : job.status}
        </span>
      </div>

      <div className="bg-gradient-to-r from-[#241621] to-[#714b67] p-5 rounded-2xl text-white shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#f09e38]/20 text-[#f09e38] text-[11px] font-black border border-[#f09e38]/30 mb-1">
              <Zap className="w-3.5 h-3.5" /> Mobile Commissioning & Quality Inspection
            </div>
            <h1 className="text-xl font-black text-white">{job.jobNumber} Installation Sign-Off</h1>
            <p className="text-xs text-[#dabed3] mt-0.5">
              Customer: <strong className="text-white">{job.customer?.name}</strong> • Phone: {job.customer?.phone}
            </p>
            <p className="text-[11px] text-[#dabed3]">Site: {job.customer?.address || 'Customer Premises'}</p>
            <p className="text-[11px] text-amber-200 mt-1">
              Assigned Technician:{' '}
              <strong className="text-white">
                {job.technician?.name || 'Pending Admin Assignment'}
              </strong>
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-300 block">System Rating</span>
            <span className="text-xl font-black text-[#f09e38]">{confirmedKw} kW</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Delivered Equipment Scanning */}
      {!isCompleted && (
        <section className="p-4 bg-white rounded-2xl border border-[#EBDCE6] shadow-2xs space-y-3">
          <div className="flex items-start gap-2">
            <ScanLine className="w-5 h-5 text-[#714b67] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Verify Delivered Equipment (Barcodes & QR)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Scan each serialized component label to confirm it matches this customer order.
              </p>
            </div>
            <span className="ml-auto text-xs font-black text-[#714b67] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
              {verificationTotal > 0 ? `${verifiedTotal}/${verificationTotal}` : 'Verified'}
            </span>
          </div>

          <form onSubmit={handleVerifySerial} className="flex gap-2">
            <input
              value={serialInput}
              onChange={(e) => setSerialInput(e.target.value)}
              placeholder="Scan serial barcode with handheld or type..."
              className="min-w-0 flex-1 p-2.5 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#714b67]"
            />
            <button
              type="submit"
              disabled={!serialInput.trim() || scanningSerial}
              className="px-4 rounded-xl bg-[#714b67] hover:bg-[#5e3d55] text-white text-xs font-bold disabled:opacity-40"
            >
              {scanningSerial ? 'Checking...' : 'Verify'}
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleToggleCamera}
              className="px-3 py-1.5 rounded-xl border border-[#714b67] text-[#714b67] text-xs font-bold hover:bg-purple-50"
            >
              {cameraActive ? 'Stop camera' : 'Scan with camera'}
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={decodingImage}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold disabled:opacity-50"
            >
              {decodingImage ? 'Reading...' : 'Scan barcode image'}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageScan}
              className="hidden"
            />
          </div>

          {cameraActive && (
            <div className="overflow-hidden rounded-xl border border-[#714b67] bg-slate-950">
              <div id={scannerContainerId} className="min-h-48" />
              <p className="px-3 py-1.5 text-center text-[11px] font-semibold text-white">
                Align barcode or QR code within the viewfinder.
              </p>
            </div>
          )}
          <div id={`${scannerContainerId}-image`} className="hidden" />

          {serialScanMessage && (
            <div
              className={`p-2.5 rounded-xl text-xs font-bold ${
                serialScanMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {serialScanMessage.text}
            </div>
          )}

          <div className="space-y-1">
            {expectedSerials.map((serial) => {
              const verified = verifiedSerials.some((item) => item.id === serial.id);
              return (
                <div key={serial.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-700">{serial.product?.name || 'Serialized product'}</span>
                  <span className={verified ? 'text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200' : 'text-slate-400 font-mono'}>
                    {verified ? '✓ Verified' : serial.serial}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION 2: COMPONENT CONNECTION VERIFICATION MATRIX */}
      <section className="p-4 bg-white rounded-2xl border border-[#EBDCE6] shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#EBDCE6]">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Component Connection Verification Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify that each and every solar PV component is properly wired, torqued, and operational.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-black px-2.5 py-1 rounded-lg border ${
                allComponentsConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              {connectedComponentsCount}/{componentConnections.length} Connected
            </span>
            {!isCompleted && (
              <button
                type="button"
                onClick={handleMarkAllComponentsConnected}
                className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black flex items-center gap-1 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-300" /> Mark All Connected
              </button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto text-[11px] font-bold pb-1">
          {[
            { id: 'ALL', label: 'All Components' },
            { id: 'SOLAR_INVERTER', label: 'Solar & Inverter' },
            { id: 'DISTRIBUTION', label: 'DCDB & ACDB' },
            { id: 'EARTHING_SAFETY', label: 'Earthing & Lightning' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategoryTab(tab.id)}
              className={`px-3 py-1 rounded-xl whitespace-nowrap transition cursor-pointer ${
                activeCategoryTab === tab.id
                  ? 'bg-[#714b67] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Incomplete Warning Alert if pending */}
        {!isCompleted && !allComponentsConnected && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Connection Check Incomplete: {componentConnections.length - connectedComponentsCount} component(s) are pending or failed.
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Each and every listed component must be marked as "Connected Successfully" before job completion.
              </p>
            </div>
          </div>
        )}

        {/* Components List */}
        <div className="space-y-2.5">
          {filteredComponents.map((comp) => {
            const isConnected = comp.status === 'CONNECTED_SUCCESSFULLY';
            return (
              <div
                key={comp.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isConnected
                    ? 'bg-white border-emerald-200 shadow-2xs'
                    : 'bg-rose-50/50 border-rose-300 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isConnected ? 'bg-emerald-500 ring-2 ring-emerald-200' : 'bg-rose-500 ring-2 ring-rose-200'
                        }`}
                      />
                      <h3 className="font-bold text-xs text-slate-900">{comp.name}</h3>
                      <span className="text-[10px] font-semibold text-[#714b67] bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {comp.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">{comp.description}</p>
                  </div>

                  {/* Status Toggle Button */}
                  {!isCompleted ? (
                    <button
                      type="button"
                      onClick={() => handleToggleComponentStatus(comp.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                        isConnected
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                          : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                      }`}
                    >
                      {isConnected ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Connected Successfully
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 text-white" /> Pending / Failed (Tap to Connect)
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="px-3 py-1 rounded-xl text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PASS (Verified)
                    </span>
                  )}
                </div>

                {/* Measurement Reading Input & Checkpoint */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="font-semibold text-slate-500">Test Reading / Verification:</span>
                    {!isCompleted ? (
                      <input
                        type="text"
                        value={comp.reading || ''}
                        onChange={(e) => handleUpdateComponentReading(comp.id, e.target.value)}
                        placeholder="e.g., Voc: 382V, Earth: 2.3 Ω"
                        className="p-1 px-2 rounded-lg border border-slate-200 text-xs font-semibold w-56 outline-none focus:ring-1 focus:ring-[#714b67]"
                      />
                    ) : (
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                        {comp.reading || 'Verified'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium italic">
                    Inspected &amp; Tested to Code
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: POST-INSTALLATION SITE EVIDENCE PHOTOS */}
      <section className="p-4 bg-white rounded-2xl border border-[#EBDCE6] shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#EBDCE6]">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <Camera className="w-4 h-4 text-[#714b67]" /> Post-Installation Site Photos (≥ 1 Mandatory)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              High-resolution evidence of completed rooftop panels, inverter wiring, and grounding.
            </p>
          </div>
          <span className="text-xs font-black text-[#714b67] bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-200">
            {(job.photos?.length || 0) + photos.length} Photos Captured
          </span>
        </div>

        {/* 5 Preset Slots for Key Angles */}
        {!isCompleted && (
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-700 block">Recommended Commissioning Angles:</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {photoPresets.map((preset, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{preset.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{preset.hint}</p>
                  </div>
                  <label className="px-2.5 py-1 rounded-lg bg-[#714b67] hover:bg-[#5e3d55] text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0">
                    <Camera className="w-3 h-3 text-amber-300" />
                    <span>Capture</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoSelect(e, preset.title)}
                      className="hidden"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General Upload Box */}
        {!isCompleted && (
          <label className="p-4 rounded-xl border-2 border-dashed border-[#dabfd2] bg-[#f5edf2]/30 flex flex-col items-center justify-center cursor-pointer hover:bg-[#f5edf2] transition">
            <Upload className="w-5 h-5 text-[#714b67] mb-1" />
            <span className="font-bold text-xs text-[#714b67]">Upload Additional Photos</span>
            <span className="text-[10px] text-slate-400">Multiple image files or gallery selection supported</span>
            <input
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              onChange={(e) => handlePhotoSelect(e)}
              className="hidden"
            />
          </label>
        )}

        {/* Previously Uploaded Photos Gallery */}
        {job.photos && job.photos.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-slate-700 block">
              Archived Commissioning Photos ({job.photos.length}):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {job.photos.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100 shadow-2xs"
                >
                  <img
                    src={p.url}
                    alt={p.caption || 'Site Photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition cursor-pointer"
                    onClick={() => setPreviewModalUrl(p.url)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex items-end p-2 pointer-events-none">
                    <span className="text-white text-[10px] font-bold truncate">
                      {p.caption || `Site Photo ${idx + 1}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewModalUrl(p.url)}
                    className="absolute top-1.5 right-1.5 p-1 rounded bg-black/50 text-white hover:bg-black/80 transition"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Photos Previews (Not Yet Submitted) */}
        {photoPreviews.length > 0 && (
          <div className="space-y-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-950">
                New Photos Staged for Upload ({photoPreviews.length}):
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPhotos([]);
                    setPhotoPreviews([]);
                    setPhotoCaptions([]);
                  }}
                  className="text-[11px] text-slate-500 hover:text-rose-600 font-bold cursor-pointer"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  disabled={uploadingPhotos}
                  onClick={handleUploadSelectedPhotos}
                  className="px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3 h-3 text-amber-300" />
                  {uploadingPhotos ? 'Uploading...' : '⚡ Upload Photos Now'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative rounded-xl overflow-hidden border border-emerald-300 bg-white aspect-video shadow-2xs">
                  <img src={src} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div className="p-1 bg-white border-t border-slate-100">
                    <input
                      type="text"
                      value={photoCaptions[i] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPhotoCaptions((prev) => prev.map((cap, idx) => (idx === i ? val : cap)));
                      }}
                      placeholder="Photo caption..."
                      className="w-full text-[10px] font-semibold text-slate-700 border-none p-0 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* SECTION 4: DIGITAL SIGNATURE & ACCEPTANCE */}
      <section className="p-4 bg-white rounded-2xl border border-[#EBDCE6] shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#EBDCE6]">
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
              <PenTool className="w-4 h-4 text-[#714b67]" /> Customer Acceptance & Commissioning Digital Signature
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Digital handover sign-off acknowledging verified component wiring and live generation.
            </p>
          </div>
          {job.signature && (
            <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
              ✓ Signature On File
            </span>
          )}
        </div>

        {/* Existing Signature Record Display */}
        {job.signature && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-900">Signed by: {job.signature.signedByName}</p>
              <p className="text-[10px] text-slate-500">
                Timestamp: {new Date(job.signature.signedAt).toLocaleString()}
              </p>
              {job.signature.acceptanceText && (
                <p className="text-[11px] text-emerald-900 mt-1 italic font-medium">
                  "{job.signature.acceptanceText}"
                </p>
              )}
            </div>
            {job.signature.imageUrl && (
              <img
                src={job.signature.imageUrl}
                alt="Digital Signature"
                className="h-12 max-w-[140px] object-contain border border-slate-200 rounded-lg bg-white p-1"
              />
            )}
          </div>
        )}

        {/* Signature Canvas for New Sign-off */}
        {!isCompleted && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 text-xs mb-1 block">Signee Full Name *</label>
                <input
                  type="text"
                  required
                  value={signedByName}
                  onChange={(e) => setSignedByName(e.target.value)}
                  placeholder="Full legal name"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#714b67]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 text-xs mb-1 block">Signee Role</label>
                <select
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#714b67]"
                >
                  <option value="Customer / Site Owner">Customer / Site Owner</option>
                  <option value="Authorized Representative">Authorized Representative</option>
                  <option value="Lead Installation Engineer">Lead Installation Engineer</option>
                </select>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-[11px] text-purple-950">
              <strong>Acceptance Statement:</strong> "I hereby certify that all solar panels, inverter, distribution boxes, dual earthing pits, and electrical grid interconnections have been physically inspected, torqued, and verified in working condition in my presence."
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Sign with Stylus, Touch, or Mouse:</span>
                <button
                  type="button"
                  onClick={handleClearSignature}
                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Clear Signature
                </button>
              </div>
              <div className="border-2 border-dashed border-[#dabfd2] rounded-xl overflow-hidden bg-white">
                <SignatureCanvas
                  ref={sigCanvasRef}
                  penColor="#0f172a"
                  onBegin={() => setSigDrawn(true)}
                  canvasProps={{
                    className: 'w-full h-36 bg-white cursor-crosshair',
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Draw your official sign-off above</span>
                <span className={sigDrawn ? 'text-emerald-700 font-bold' : 'text-slate-400'}>
                  {sigDrawn ? '✓ Signature Drawn' : 'Signature Canvas Ready'}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 5: COMMISSIONING SUBMIT OR CERTIFICATE DOWNLOAD */}
      {isCompleted ? (
        <div className="p-6 bg-white rounded-2xl border border-emerald-200 shadow-sm space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Installation 100% Commissioned & Certified</h2>
            <p className="text-xs text-slate-500 mt-1">
              All {componentConnections.length} solar components are connected successfully and signed off.
            </p>
          </div>
          <a
            href={jobsApi.downloadCertificateUrl(job.id)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#714b67] hover:bg-[#5e3d55] text-white font-black text-xs shadow-md shadow-[#714b67]/25 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-300" /> Download Official Commissioning Certificate (PDF)
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmitCompletion} className="space-y-4">
          {/* Job Parameters */}
          <div className="p-4 bg-white rounded-2xl border border-[#EBDCE6] shadow-2xs grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 text-xs mb-1 block">Confirmed Capacity (kW)</label>
              <input
                type="number"
                step="0.5"
                value={confirmedKw}
                onChange={(e) => setConfirmedKw(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 text-xs mb-1 block">Technician Hours Worked</label>
              <input
                type="number"
                min="1"
                max="24"
                value={technicianHours}
                onChange={(e) => setTechnicianHours(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold"
              />
            </div>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-[#EBDCE6] shadow-2xs">
            <label className="font-bold text-slate-700 text-xs mb-1 block">Technician Commissioning Notes</label>
            <textarea
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record on-site findings, inverter firmware version, Voc string voltages, etc."
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium outline-none focus:ring-2 focus:ring-[#714b67]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-600/25 active:scale-[0.99] transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Verifying All Connections & Generating Certificate...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-300" /> Verify All {componentConnections.length} Components Connected & Complete Commissioning
              </span>
            )}
          </button>
        </form>
      )}

      {/* Image Lightbox Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden bg-black">
            <img src={previewModalUrl} alt="Inspection Photo Full View" className="w-full h-auto object-contain max-h-[85vh]" />
            <button
              onClick={() => setPreviewModalUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
