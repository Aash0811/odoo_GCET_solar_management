import React, { useState, useEffect, useRef } from 'react';
import { dispatchApi, inventoryApi, warehousesApi } from '../../api';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  Scan,
  Barcode,
  QrCode,
  Search,
  Download,
  Printer,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  Building2,
  Package,
  Layers,
  ShieldCheck,
  RefreshCw,
  Copy,
  ExternalLink,
  Sliders,
  FileText,
  Upload,
  Camera,
  Keyboard,
  Info,
  Check,
  HelpCircle,
  Eye,
  Plus,
  X,
} from 'lucide-react';

export default function SerialScannerPage() {
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'items' | 'generator' | 'sheet'

  // ============================================================
  // SCANNER STATES
  // ============================================================
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scannedCode, setScannedCode] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [isDecodingFile, setIsDecodingFile] = useState(false);
  const fileInputRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  // ============================================================
  // ITEMS CATALOGUE STATES
  // ============================================================
  const [itemsCatalogue, setItemsCatalogue] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState('ALL');
  const [copiedCode, setCopiedCode] = useState('');
  const [seedingSerials, setSeedingSerials] = useState(false);

  // ============================================================
  // DYNAMIC GENERATOR STATES
  // ============================================================
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [barcodeText, setBarcodeText] = useState('INV-3KW-2026-0042');
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128'); // 'CODE128' | 'CODE39' | 'EAN13' | 'QRCODE'
  const [includeText, setIncludeText] = useState(true);
  const [barcodeWidth, setBarcodeWidth] = useState(2);
  const [barcodeHeight, setBarcodeHeight] = useState(65);
  const [labelSubtitle, setLabelSubtitle] = useState('3 kW Hybrid Solar Inverter');

  // Sheet Generator states
  const [sheetPrefix, setSheetPrefix] = useState('PANEL-550W-2026');
  const [sheetStartNum, setSheetStartNum] = useState(101);
  const [sheetCount, setSheetCount] = useState(12);

  // Serial Registration State
  const [isRegistering, setIsRegistering] = useState(false);
  const [registerMessage, setRegisterMessage] = useState('');

  const svgBarcodeRef = useRef(null);
  const canvasQrRef = useRef(null);

  // Load products & items catalogue
  const loadItemsCatalogue = async () => {
    try {
      setLoadingItems(true);
      const res = await dispatchApi.getItemBarcodes();
      setItemsCatalogue(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load items barcodes catalogue:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    loadItemsCatalogue();

    inventoryApi
      .getProducts()
      .then((res) => {
        const prods = res.data?.data || [];
        setProducts(prods);
        if (prods.length > 0 && !selectedProductId) {
          const firstTracked = prods.find((p) => p.isSerialTracked) || prods[0];
          setSelectedProductId(firstTracked.id);
          const generatedSerial = `${firstTracked.sku}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
          setBarcodeText(generatedSerial);
          setLabelSubtitle(firstTracked.name);
          setSheetPrefix(`${firstTracked.sku}-${new Date().getFullYear()}`);
        }
      })
      .catch((err) => console.error('Failed to load products for barcode generator:', err));
  }, []);

  // Handle Product Selection Change in Generator
  const handleSelectProduct = (productId) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      const generatedSerial = `${prod.sku}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setBarcodeText(generatedSerial);
      setLabelSubtitle(prod.name);
      setSheetPrefix(`${prod.sku}-${new Date().getFullYear()}`);
    }
  };

  // Render Barcode / QR Code Dynamically
  useEffect(() => {
    if (!barcodeText) return;

    if (barcodeFormat === 'QRCODE') {
      if (canvasQrRef.current) {
        QRCode.toCanvas(
          canvasQrRef.current,
          barcodeText,
          {
            width: 180,
            margin: 2,
            color: {
              dark: '#241621',
              light: '#FFFFFF',
            },
          },
          (err) => {
            if (err) console.error('QR code generation error:', err);
          }
        );
      }
    } else {
      if (svgBarcodeRef.current) {
        try {
          JsBarcode(svgBarcodeRef.current, barcodeText, {
            format: barcodeFormat,
            width: Number(barcodeWidth),
            height: Number(barcodeHeight),
            displayValue: includeText,
            font: 'monospace',
            fontOptions: 'bold',
            fontSize: 14,
            textMargin: 4,
            background: '#ffffff',
            lineColor: '#241621',
            margin: 10,
          });
        } catch (err) {
          console.error('Barcode render error:', err);
        }
      }
    }
  }, [barcodeText, barcodeFormat, includeText, barcodeWidth, barcodeHeight, activeTab]);

  // Start Camera with Diagnostic Handling
  const handleToggleCamera = async () => {
    if (cameraActive) {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {}
        html5QrCodeRef.current = null;
      }
      setCameraActive(false);
      setCameraError('');
      return;
    }

    setCameraError('');
    setCameraActive(true);

    setTimeout(async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API is not supported in this browser environment or requires HTTPS/localhost.');
        }

        const html5QrCode = new Html5Qrcode('reader-universal-box');
        html5QrCodeRef.current = html5QrCode;

        const config = {
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
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleExecuteLookup(decodedText);
            html5QrCode.stop().then(() => {
              setCameraActive(false);
              html5QrCodeRef.current = null;
            }).catch(() => {});
          },
          () => {} // per frame silent
        );
      } catch (err) {
        console.warn('Camera start error:', err);
        let errorMsg = 'Could not access camera. ';
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
          errorMsg = 'Camera permission denied. Please click the lock or settings icon in your browser URL bar, allow Camera access, and refresh.';
        } else if (err.name === 'NotFoundError' || err.message?.includes('Requested device not found')) {
          errorMsg = 'No camera found on this computer. Use "Upload Image to Scan" or a USB Barcode Scanner gun below.';
        } else if (err.name === 'NotReadableError') {
          errorMsg = 'Camera is currently in use by another application (e.g. Zoom or Teams). Please close other camera apps.';
        } else {
          errorMsg += err.message || 'Please check browser camera permissions or upload a barcode image instead.';
        }
        setCameraError(errorMsg);
        setCameraActive(false);
      }
    }, 150);
  };

  // Upload Photo / Image to Scan Barcode
  const handleFileUploadScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsDecodingFile(true);
    try {
      const html5QrCode = new Html5Qrcode('reader-hidden-canvas', {
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
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();

      setManualInput(decodedText);
      await handleExecuteLookup(decodedText);
    } catch (err) {
      alert(`Could not decode barcode from image: ${err.message || 'Make sure the image has high contrast, is in focus, and contains a clean 1D or QR barcode.'}`);
    } finally {
      setIsDecodingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Execute Universal Barcode Lookup
  const handleExecuteLookup = async (codeToLookup = manualInput) => {
    const code = codeToLookup.trim();
    if (!code) {
      alert('Please enter or scan a barcode / serial number.');
      return;
    }

    setLookupLoading(true);
    setScannedCode(code);
    try {
      const res = await dispatchApi.lookupBarcode(code);
      const data = res.data?.data;
      setLookupResult(data);

      // Add to recent scan history
      setScanHistory((prev) => [
        {
          code,
          type: data?.type || 'UNKNOWN',
          name: data?.product?.name || 'Raw Barcode',
          timestamp: new Date().toLocaleTimeString(),
          found: data?.found,
        },
        ...prev.filter((p) => p.code !== code).slice(0, 8),
      ]);
    } catch (err) {
      setLookupResult({
        found: false,
        code,
        message: err.response?.data?.message || 'Lookup failed.',
      });
    } finally {
      setLookupLoading(false);
    }
  };

  // Auto-generate more unique serials
  const handleSeedMoreSerials = async () => {
    setSeedingSerials(true);
    try {
      const res = await dispatchApi.seedUniqueCodes({ count: 10 });
      alert(res.data?.message || 'Generated new unique serial barcode numbers!');
      await loadItemsCatalogue();
    } catch (err) {
      alert('Failed to generate serials: ' + (err.response?.data?.message || err.message));
    } finally {
      setSeedingSerials(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  // Download Barcode as SVG
  const handleDownloadSvg = () => {
    if (!svgBarcodeRef.current) return;
    const svgData = new XMLSerializer().serializeToString(svgBarcodeRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `barcode_${barcodeText}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Download Barcode or QR Code as PNG
  const handleDownloadPng = () => {
    if (barcodeFormat === 'QRCODE') {
      if (!canvasQrRef.current) return;
      const url = canvasQrRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode_${barcodeText}.png`;
      link.click();
    } else {
      if (!svgBarcodeRef.current) return;
      const svgElement = svgBarcodeRef.current;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width + 40;
        canvas.height = img.height + 40;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `barcode_${barcodeText}.png`;
        link.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  // Print Single Equipment Label
  const handlePrintLabel = () => {
    window.print();
  };

  // Register Custom Barcode / Serial into Warehouse Inventory
  const handleRegisterSerial = async (silent = false) => {
    if (!barcodeText || !barcodeText.trim()) return;
    setIsRegistering(true);
    setRegisterMessage('');
    try {
      const res = await dispatchApi.registerSerial({
        productId: selectedProductId,
        serial: barcodeText.trim(),
      });
      setRegisterMessage(res.data?.message || 'Registered to inventory!');
      await loadItemsCatalogue();
      if (!silent) {
        setTimeout(() => setRegisterMessage(''), 4000);
      }
    } catch (err) {
      console.error('Failed to register serial:', err);
      if (!silent) {
        alert('Could not register serial: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Auto-Register & Test Scan in one click
  const handleTestScanWithRegister = async () => {
    if (!barcodeText || !barcodeText.trim()) return;
    try {
      await dispatchApi.registerSerial({
        productId: selectedProductId,
        serial: barcodeText.trim(),
      });
    } catch (e) {}
    setManualInput(barcodeText.trim());
    handleExecuteLookup(barcodeText.trim());
    setActiveTab('scanner');
  };

  const categories = ['ALL', ...Array.from(new Set(itemsCatalogue.map((i) => i.category))).filter(Boolean)];
  const filteredItems = itemsCatalogue.filter((item) => {
    const matchesCat = itemCategoryFilter === 'ALL' || item.category === itemCategoryFilter;
    const matchesSearch =
      !itemSearch ||
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      item.sku.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.availableSerials || []).some((s) => s.toLowerCase().includes(itemSearch.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Hidden div for html5-qrcode scanFile processing */}
      <div id="reader-hidden-canvas" className="hidden"></div>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f09e38] animate-pulse"></span>
            <h1 className="text-2xl font-black text-[#241621] tracking-tight">
              Barcode Scanner &amp; Dynamic Barcode Suite
            </h1>
          </div>
          <p className="text-xs text-[#714B67] font-medium mt-0.5">
            Camera &amp; Image Upload Scanner • Unique Item Codes &amp; Serials • Code-128 &amp; QR Code Generator • A4 Sticker Sheets
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-[#F5EDF3] p-1 rounded-xl border border-[#EBDCE7] self-start md:self-auto flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'scanner'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-[#714B67] hover:bg-white/60'
            }`}
          >
            <Scan className="w-3.5 h-3.5" /> Barcode Scanner
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('items');
              loadItemsCatalogue();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'items'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-[#714B67] hover:bg-white/60'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Item Barcodes Catalogue ({itemsCatalogue.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'generator'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-[#714B67] hover:bg-white/60'
            }`}
          >
            <Barcode className="w-3.5 h-3.5" /> Barcode Generator
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sheet')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'sheet'
                ? 'bg-[#714B67] text-white shadow-xs'
                : 'text-[#714B67] hover:bg-white/60'
            }`}
          >
            <Printer className="w-3.5 h-3.5" /> Batch Sticker Sheets
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 1: SCANNER TERMINAL & UNIVERSAL LOOKUP */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'scanner' && (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left 6 cols: Scanner Controls & Inputs */}
          <div className="lg:col-span-6 space-y-4">
            <div className="odoo-glass-card p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-[#241621] flex items-center gap-2">
                  <Scan className="w-5 h-5 text-[#714B67]" />
                  Scan Barcode or Serial Number
                </h2>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span> Scanner Ready
                </span>
              </div>

              {/* Camera Error / Troubleshooting Banner */}
              {cameraError && (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="block font-black">Camera Notice</strong>
                      <p className="text-[11px] leading-relaxed">{cameraError}</p>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-[#714B67] text-white text-[10px] font-black cursor-pointer hover:bg-[#5b3c53]"
                    >
                      📁 Upload Photo of Barcode Instead
                    </button>
                    <button
                      type="button"
                      onClick={() => setCameraError('')}
                      className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Main Input Form with Barcode Gun Wedge Support */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      autoFocus
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleExecuteLookup()}
                      placeholder="Scan with USB gun or type serial / SKU..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#EBDCE7] font-mono text-xs font-bold text-[#241621] outline-none focus:ring-2 focus:ring-[#714B67] bg-white shadow-xs"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExecuteLookup()}
                    disabled={lookupLoading}
                    className="px-5 py-2.5 rounded-xl bg-[#714B67] hover:bg-[#5b3c53] text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {lookupLoading ? 'Checking...' : 'Lookup'}
                  </button>
                </div>

                {/* 3 Scanning Methods: Camera, Upload Photo, Quick Demo */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Camera Scanner Toggle */}
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                      cameraActive
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-[#F5EDF3] text-[#714B67] hover:bg-[#EBDCE7]'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 text-[#f09e38]" />
                    {cameraActive ? 'Stop Camera' : 'Start Camera Scanner'}
                  </button>

                  {/* Upload Image to Scan (NO CAMERA REQUIRED) */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUploadScan}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isDecodingFile}
                    className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] hover:opacity-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Upload an image, sticker, or phone photo of any barcode"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {isDecodingFile ? 'Decoding Photo...' : 'Upload Image to Scan'}
                  </button>

                  {/* View All Barcodes Link */}
                  <button
                    type="button"
                    onClick={() => setActiveTab('items')}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FAF6F9] hover:bg-[#F5EDF3] border border-[#EBDCE7] text-slate-700 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5 text-[#714B67]" /> Browse All Item Codes
                  </button>
                </div>

                {/* Camera Viewport (when active) */}
                {cameraActive && (
                  <div className="p-3 rounded-2xl bg-black/90 border border-white/20 space-y-2">
                    <p className="text-[11px] text-amber-300 font-bold text-center flex items-center justify-center gap-1.5">
                      <Scan className="w-3.5 h-3.5 animate-spin" /> Point camera at 1D Barcode (Code-128) or QR Code
                    </p>
                    <div
                      id="reader-universal-box"
                      className="w-full max-w-xs mx-auto overflow-hidden rounded-xl border border-white/30"
                    ></div>
                  </div>
                )}
              </div>

              {/* Quick Sample Clickers (Instant Verification Test) */}
              <div className="p-3.5 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-2">
                <span className="text-[10px] font-black uppercase text-[#714B67] block">
                  Quick 1-Click Verification Test (Instant Simulation)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setManualInput('INV-5KW-ONGRID');
                      handleExecuteLookup('INV-5KW-ONGRID');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#EBDCE7] text-[11px] font-mono font-bold text-[#714B67] hover:bg-[#F5EDF3] cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-[#f09e38]" /> SKU: INV-5KW-ONGRID
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualInput('BAT-12V-150AH');
                      handleExecuteLookup('BAT-12V-150AH');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#EBDCE7] text-[11px] font-mono font-bold text-blue-700 hover:bg-[#F5EDF3] cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-blue-500" /> SKU: BAT-12V-150AH
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualInput('PAN-540-MONO');
                      handleExecuteLookup('PAN-540-MONO');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#EBDCE7] text-[11px] font-mono font-bold text-emerald-700 hover:bg-[#F5EDF3] cursor-pointer flex items-center gap-1"
                  >
                    <Zap className="w-3 h-3 text-emerald-500" /> SKU: PAN-540-MONO
                  </button>
                </div>
              </div>

              {/* Recent Scan History */}
              {scanHistory.length > 0 && (
                <div className="pt-2 border-t border-[#EBDCE7]">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-2">
                    Recent Scan Session ({scanHistory.length})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {scanHistory.map((h, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setManualInput(h.code);
                          handleExecuteLookup(h.code);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white border border-[#EBDCE7] text-[10px] font-mono font-bold text-[#714B67] hover:bg-[#FAF6F9] cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${h.found ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                        {h.code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hardware Scanner & Camera Guidance */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#FAF6F9] to-white border border-[#EBDCE7] text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-1.5 font-black text-[#714B67]">
                <Keyboard className="w-4 h-4 text-[#f09e38]" />
                How to Scan with Hardware Guns or Mobile Phones
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4">
                <li>
                  <strong>Physical USB/Bluetooth Scanner:</strong> Plug the scanner gun into your computer. It acts as an automatic keyboard wedge — simply pull the trigger on any barcode label.
                </li>
                <li>
                  <strong>Phone / Camera Upload:</strong> If camera permissions are blocked, take a quick photo of the barcode with your phone and click <strong>"Upload Image to Scan"</strong> above.
                </li>
              </ul>
            </div>
          </div>

          {/* Right 6 cols: Live Real-Time Lookup Card */}
          <div className="lg:col-span-6">
            {lookupLoading ? (
              <div className="p-12 text-center rounded-3xl bg-white border border-[#EBDCE7] space-y-3">
                <div className="w-8 h-8 border-3 border-[#714B67] border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-bold text-slate-500">Querying ERP serial telemetry &amp; warehouse inventory...</p>
              </div>
            ) : lookupResult ? (
              <div className="odoo-glass-card p-6 rounded-3xl space-y-5">
                {/* Header status */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#EBDCE7]">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#714B67]">
                      {lookupResult.type === 'SERIAL'
                        ? 'Tracked Unit Serial Number'
                        : lookupResult.type === 'PRODUCT_SKU'
                        ? 'Master Product Catalog Barcode'
                        : 'Unregistered Barcode'}
                    </span>
                    <h3 className="text-xl font-black text-[#241621] font-mono mt-0.5">
                      {lookupResult.serial || lookupResult.sku || lookupResult.code}
                    </h3>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      lookupResult.found
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {lookupResult.status || (lookupResult.found ? 'Registered' : 'Not Found')}
                  </span>
                </div>

                {/* Product Detail */}
                {lookupResult.product && (
                  <div className="p-4 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm text-[#241621]">{lookupResult.product.name}</span>
                      <span className="text-xs font-mono font-bold text-[#714B67]">{lookupResult.product.sku}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-[#EBDCE7]/60">
                      <div>Category: <strong className="text-[#241621]">{lookupResult.product.category}</strong></div>
                      <div>Warranty: <strong className="text-[#714B67]">{lookupResult.product.warrantyYears} Years</strong></div>
                      <div>Price: <strong className="text-[#241621]">₹{Number(lookupResult.product.salePrice).toLocaleString()}</strong></div>
                      <div>Tracking: <strong className="text-purple-700">{lookupResult.product.isSerialTracked ? 'Serial Tracked' : 'Bulk Hardware'}</strong></div>
                    </div>
                  </div>
                )}

                {/* If Serial Unit: Linked Customer, Order, Warranty */}
                {lookupResult.type === 'SERIAL' && (
                  <div className="space-y-3">
                    {lookupResult.order ? (
                      <div className="p-3.5 rounded-2xl border border-slate-200 bg-white text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase">
                          <span>Allocated Sales Order</span>
                          <span className="text-[#714B67]">{lookupResult.order.orderNumber}</span>
                        </div>
                        <div className="font-extrabold text-[#241621]">
                          Customer: {lookupResult.order.customer?.name} ({lookupResult.order.customer?.city})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Capacity: {lookupResult.order.capacityKw} kW • Status: {lookupResult.order.status}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-800">
                        ✓ In-Stock Unit: Available for dispatch in warehouse inventory.
                      </div>
                    )}

                    {lookupResult.warranty && (
                      <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-800 font-black text-xs">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Active Warranty Coverage
                        </div>
                        <div className="text-[10px] text-emerald-700">
                          Valid until: {new Date(lookupResult.warranty.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* If Product SKU: Multi-Zone Warehouse Stock Breakdown */}
                {lookupResult.type === 'PRODUCT_SKU' && lookupResult.warehouseStocks && (
                  <div>
                    <h4 className="text-xs font-black uppercase text-[#714B67] mb-2 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#f09e38]" /> Multi-Zone Warehouse Stock
                    </h4>
                    <div className="border border-[#EBDCE7] rounded-2xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white">
                      {lookupResult.warehouseStocks.map((ws, i) => (
                        <div key={i} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-bold text-[#241621]">{ws.warehouseName}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {ws.city} ({ws.zone})
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                              ws.quantity > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {ws.quantity} units in stock
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions on Found Barcode */}
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBarcodeText(lookupResult.serial || lookupResult.sku || lookupResult.code);
                      if (lookupResult.product?.name) setLabelSubtitle(lookupResult.product.name);
                      setActiveTab('generator');
                    }}
                    className="px-4 py-2 rounded-xl bg-[#714B67] text-white text-xs font-black hover:bg-[#5b3c53] cursor-pointer flex items-center gap-1.5"
                  >
                    <Barcode className="w-3.5 h-3.5 text-[#f09e38]" /> Generate / Print Barcode Sticker
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(lookupResult.serial || lookupResult.sku || lookupResult.code)}
                    className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1"
                  >
                    {copiedCode === (lookupResult.serial || lookupResult.sku || lookupResult.code) ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    {copiedCode === (lookupResult.serial || lookupResult.sku || lookupResult.code) ? 'Copied!' : 'Copy Code'}
                  </button>
                </div>

                {/* Not Found alert */}
                {!lookupResult.found && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3">
                    <div className="flex items-center gap-1.5 font-black">
                      <AlertCircle className="w-4 h-4 text-amber-600" /> Unrecognized Barcode Code
                    </div>
                    <p className="text-[11px] leading-relaxed">{lookupResult.message}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await dispatchApi.registerSerial({ serial: lookupResult.code });
                            handleExecuteLookup(lookupResult.code);
                          } catch (e) {
                            setBarcodeText(lookupResult.code);
                            setActiveTab('generator');
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Register '{lookupResult.code}' to Inventory &amp; Verify Now
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBarcodeText(lookupResult.code);
                          setActiveTab('generator');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#f09e38] text-[#241621] font-black text-xs cursor-pointer hover:bg-[#e08e28]"
                      >
                        Design Label in Generator &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center rounded-3xl bg-white border border-[#EBDCE7] text-slate-400 space-y-2">
                <Scan className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-bold text-slate-600">No Barcode Scanned Yet</p>
                <p className="text-xs">
                  Scan any item barcode, upload a photo of a barcode, or click one of the demo samples above to inspect equipment telemetry and warranties.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 2: ALL ITEMS & UNIQUE BARCODES CATALOGUE */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'items' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7]">
            <div>
              <h2 className="text-base font-black text-[#241621] flex items-center gap-2">
                <Package className="w-5 h-5 text-[#714B67]" />
                All Inventory Items &amp; Unique Barcode Codes
              </h2>
              <p className="text-xs text-[#714B67]">
                Every item in your solar ERP has a designated master barcode (SKU) and unique serialized units for scanner tracking.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSeedMoreSerials}
                disabled={seedingSerials}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] text-white text-xs font-black shadow-xs hover:opacity-95 cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#f09e38]" />
                {seedingSerials ? 'Generating Serials...' : 'Auto-Generate More Unique Serials'}
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black text-[#714B67] uppercase">Category:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setItemCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    itemCategoryFilter === cat
                      ? 'bg-[#714B67] text-white shadow-2xs'
                      : 'bg-white border border-[#EBDCE7] text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Search name, SKU, or serial..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#EBDCE7] bg-white outline-none focus:ring-1 focus:ring-[#714B67]"
              />
            </div>
          </div>

          {/* Items Table */}
          {loadingItems ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="border border-[#EBDCE7] rounded-3xl overflow-hidden divide-y divide-[#EBDCE7]/60 text-xs bg-white shadow-xs">
              <div className="bg-[#F5EDF3] p-3 grid grid-cols-12 font-black text-[10px] text-[#714B67] uppercase tracking-wider">
                <div className="col-span-4">Product / Specification</div>
                <div className="col-span-2">Master Barcode (SKU)</div>
                <div className="col-span-4">In-Stock Serial Codes for Scanner</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {filteredItems.map((item) => (
                <div key={item.id} className="p-3.5 grid grid-cols-12 items-start hover:bg-[#FAF6F9] transition">
                  <div className="col-span-4">
                    <span className="font-black text-[#241621] block text-xs">{item.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600">
                        {item.category}
                      </span>
                      {item.isSerialTracked ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black bg-purple-100 text-[#714B67] border border-purple-200">
                          Serial Tracked ({item.totalSerialsCount || 0})
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Bulk Qty Item</span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <span className="font-mono font-bold text-[#714B67] text-xs block">{item.sku}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(item.sku)}
                      className="text-[10px] text-slate-400 hover:text-[#714B67] cursor-pointer flex items-center gap-1 mt-0.5"
                    >
                      {copiedCode === item.sku ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      {copiedCode === item.sku ? 'Copied' : 'Copy Barcode'}
                    </button>
                  </div>

                  <div className="col-span-4">
                    {item.isSerialTracked ? (
                      item.availableSerials && item.availableSerials.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                            {item.availableSerials.slice(0, 4).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  setManualInput(s);
                                  handleExecuteLookup(s);
                                  setActiveTab('scanner');
                                }}
                                className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-50 text-[#714B67] border border-purple-200 hover:bg-[#714B67] hover:text-white transition cursor-pointer flex items-center gap-1"
                                title="Click to test-scan this serial"
                              >
                                <Zap className="w-2.5 h-2.5 text-[#f09e38]" /> {s}
                              </button>
                            ))}
                            {item.availableSerials.length > 4 && (
                              <span className="text-[10px] text-slate-400 font-bold self-center">
                                +{item.availableSerials.length - 4} more
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 block">
                            Click any serial code above to test-scan it immediately
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
                          No active serials. Click "Auto-Generate More Unique Serials"
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-500 font-medium">
                        Scanned via Master Barcode: <strong className="font-mono text-[#714B67]">{item.sku}</strong>
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 text-right flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const targetCode = item.availableSerials?.[0] || item.sku;
                        setManualInput(targetCode);
                        handleExecuteLookup(targetCode);
                        setActiveTab('scanner');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#714B67] text-white text-[10px] font-black cursor-pointer hover:bg-[#5b3c53] flex items-center gap-1"
                      title="Test scan this item barcode"
                    >
                      <Scan className="w-3 h-3 text-[#f09e38]" /> Test Scan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBarcodeText(item.availableSerials?.[0] || item.sku);
                        setLabelSubtitle(item.name);
                        setActiveTab('generator');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#F5EDF3] text-[#714B67] text-[10px] font-black cursor-pointer hover:bg-[#EBDCE7] flex items-center gap-1"
                      title="Generate printable barcode sticker"
                    >
                      <Barcode className="w-3 h-3" /> Label
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 3: DYNAMIC BARCODE GENERATOR */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'generator' && (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left 6 cols: Generation Controls */}
          <div className="lg:col-span-6 space-y-4">
            <div className="odoo-glass-card p-6 rounded-3xl space-y-4">
              <h2 className="text-base font-black text-[#241621] flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#714B67]" />
                Dynamic Barcode Parameters
              </h2>

              {/* Preset from catalog product */}
              <div>
                <label className="font-extrabold text-[#241621] text-xs mb-1 block">
                  Select Product from Master Catalog
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] text-xs font-semibold outline-none focus:ring-2 focus:ring-[#714B67]"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Barcode Text Input */}
              <div>
                <label className="font-extrabold text-[#241621] text-xs mb-1 block">
                  Serial / Barcode Payload Text *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={barcodeText}
                    onChange={(e) => setBarcodeText(e.target.value)}
                    placeholder="e.g. SN-INV5KW-2026-0001"
                    className="flex-1 p-2.5 rounded-xl border border-[#EBDCE7] font-mono text-xs font-black text-[#714B67] outline-none focus:ring-2 focus:ring-[#714B67]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const rand = Math.floor(1000 + Math.random() * 9000);
                      setBarcodeText(`SN-SOLAR-${new Date().getFullYear()}-${rand}`);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#FAF6F9] border border-[#EBDCE7] hover:bg-[#F5EDF3] text-xs font-black text-[#714B67] cursor-pointer"
                    title="Generate randomized serial"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#f09e38]" /> Random
                  </button>
                </div>
              </div>

              {/* Format Switcher: CODE128 vs QRCODE */}
              <div>
                <label className="font-extrabold text-[#241621] text-xs mb-1 block">Barcode Symbology</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBarcodeFormat('CODE128')}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                      barcodeFormat === 'CODE128'
                        ? 'bg-[#714B67] text-white border-[#714B67] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Barcode className="w-4 h-4" /> Code 128 (1D Barcode)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBarcodeFormat('QRCODE')}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border ${
                      barcodeFormat === 'QRCODE'
                        ? 'bg-[#714B67] text-white border-[#714B67] shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <QrCode className="w-4 h-4" /> QR Code (2D Barcode)
                  </button>
                </div>
              </div>

              {/* Label Title */}
              <div>
                <label className="font-extrabold text-[#241621] text-xs mb-1 block">Label Description Subtitle</label>
                <input
                  type="text"
                  value={labelSubtitle}
                  onChange={(e) => setLabelSubtitle(e.target.value)}
                  placeholder="e.g. 5 kW Three-Phase Inverter"
                  className="w-full p-2.5 rounded-xl border border-[#EBDCE7] text-xs outline-none focus:ring-2 focus:ring-[#714B67]"
                />
              </div>

              {/* 1D Dimension Sliders */}
              {barcodeFormat !== 'QRCODE' && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#EBDCE7]">
                  <div>
                    <label className="font-bold text-[11px] text-slate-500 mb-1 block">
                      Bar Thickness ({barcodeWidth}px)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="1"
                      value={barcodeWidth}
                      onChange={(e) => setBarcodeWidth(e.target.value)}
                      className="w-full accent-[#714B67]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[11px] text-slate-500 mb-1 block">
                      Bar Height ({barcodeHeight}px)
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="120"
                      step="5"
                      value={barcodeHeight}
                      onChange={(e) => setBarcodeHeight(e.target.value)}
                      className="w-full accent-[#714B67]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right 6 cols: Live Sticker Preview & Download */}
          <div className="lg:col-span-6 space-y-4">
            <div className="odoo-glass-card p-6 rounded-3xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE7]">
                <h3 className="text-sm font-black text-[#241621] uppercase tracking-wider">
                  Live Equipment Sticker Preview
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-[#714B67]">
                  {barcodeFormat}
                </span>
              </div>

              {/* The Actual Printable Physical Sticker Preview */}
              <div
                id="printable-single-sticker"
                className="p-5 rounded-2xl border-2 border-dashed border-[#714B67]/30 bg-white shadow-md text-center max-w-sm mx-auto space-y-2"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 text-[9px] font-black uppercase text-slate-400">
                  <span>GCET Solar Management</span>
                  <span className="text-[#f09e38] font-extrabold">QA Passed</span>
                </div>

                <div className="text-xs font-black text-[#241621] leading-tight">
                  {labelSubtitle || 'Solar Equipment'}
                </div>

                {/* Barcode Element */}
                <div className="flex justify-center py-1">
                  {barcodeFormat === 'QRCODE' ? (
                    <canvas ref={canvasQrRef} className="rounded-lg shadow-2xs"></canvas>
                  ) : (
                    <svg ref={svgBarcodeRef} className="max-w-full overflow-hidden"></svg>
                  )}
                </div>

                <div className="text-[9px] font-mono font-bold text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
                  <span>Track ID: {barcodeText}</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Registration Feedback Alert */}
              {registerMessage && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {registerMessage}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-normal">Active in DB</span>
                </div>
              )}

              {/* Action Buttons: Test Scan, Download, Print, Register */}
              <div className="pt-2 flex flex-wrap gap-2 justify-center">
                <button
                  type="button"
                  onClick={handleTestScanWithRegister}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-[#241621] text-xs font-black shadow-md hover:opacity-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Scan className="w-3.5 h-3.5" /> Test Scan this Barcode Now
                </button>

                <button
                  type="button"
                  onClick={() => handleRegisterSerial(false)}
                  disabled={isRegistering}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer shadow-xs flex items-center gap-1.5"
                  title="Save this serial code to warehouse inventory"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isRegistering ? 'Registering...' : 'Save to Inventory DB'}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="px-3.5 py-2 rounded-xl bg-[#714B67] hover:bg-[#5b3c53] text-white text-xs font-black cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> PNG Sticker
                </button>

                {barcodeFormat !== 'QRCODE' && (
                  <button
                    type="button"
                    onClick={handleDownloadSvg}
                    className="px-3.5 py-2 rounded-xl border border-[#EBDCE7] hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> SVG
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePrintLabel}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Label
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB 4: BATCH PRINTABLE STICKER SHEETS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab === 'sheet' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#FAF6F9] border border-[#EBDCE7] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#241621] flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#714B67]" />
                Printable Multi-Barcode Sticker Sheet (A4 Layout)
              </h2>
              <p className="text-xs text-[#714B67]">
                Generate a full printable sheet of sequential barcode labels ready for adhesive sticker paper.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintLabel}
                className="px-5 py-2.5 rounded-xl bg-[#714B67] hover:bg-[#5b3c53] text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#f09e38]" /> Print A4 Sticker Sheet
              </button>
            </div>
          </div>

          {/* Sheet Parameters */}
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="font-extrabold text-[#241621] text-xs mb-1 block">Barcode Prefix *</label>
              <input
                type="text"
                value={sheetPrefix}
                onChange={(e) => setSheetPrefix(e.target.value.toUpperCase())}
                placeholder="e.g. SN-INV5KW-2026"
                className="w-full p-2.5 rounded-xl border border-[#EBDCE7] font-mono text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#714B67]"
              />
            </div>
            <div>
              <label className="font-extrabold text-[#241621] text-xs mb-1 block">Starting Unit Number *</label>
              <input
                type="number"
                value={sheetStartNum}
                onChange={(e) => setSheetStartNum(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[#EBDCE7] text-xs font-bold outline-none focus:ring-2 focus:ring-[#714B67]"
              />
            </div>
            <div>
              <label className="font-extrabold text-[#241621] text-xs mb-1 block">Total Stickers on Sheet</label>
              <select
                value={sheetCount}
                onChange={(e) => setSheetCount(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[#EBDCE7] text-xs font-bold outline-none focus:ring-2 focus:ring-[#714B67]"
              >
                <option value={6}>6 Stickers (2 x 3)</option>
                <option value={12}>12 Stickers (3 x 4)</option>
                <option value={18}>18 Stickers (3 x 6)</option>
                <option value={24}>24 Stickers (3 x 8)</option>
              </select>
            </div>
          </div>

          {/* Rendered Sticker Sheet Grid */}
          <div className="p-6 rounded-3xl bg-white border border-[#EBDCE7] shadow-sm">
            <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: sheetCount }).map((_, idx) => {
                const serialCode = `${sheetPrefix}-${String(Number(sheetStartNum) + idx).padStart(4, '0')}`;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-white text-center space-y-1 hover:border-[#714B67] transition"
                  >
                    <div className="text-[9px] font-black uppercase text-slate-400 flex items-center justify-between border-b pb-1">
                      <span>GCET Solar</span>
                      <span className="text-[#714B67] font-mono">#{idx + 1}</span>
                    </div>
                    <div className="py-1">
                      <BarcodeSvgItem code={serialCode} />
                    </div>
                    <div className="text-[9px] font-mono font-bold text-[#241621]">
                      {serialCode}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper component to render individual barcode SVG in sheets
function BarcodeSvgItem({ code }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: 'CODE128',
          width: 1.2,
          height: 35,
          displayValue: false,
          margin: 2,
        });
      } catch (err) {}
    }
  }, [code]);

  return <svg ref={svgRef} className="max-w-full mx-auto"></svg>;
}
