import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { leadsApi, inventoryApi } from '../../api';
import { useAuth } from '../../hooks/useAuth';
import {
  SunMedium,
  Zap,
  ShieldCheck,
  Award,
  BadgeCheck,
  TrendingDown,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  ArrowRight,
  BatteryCharging,
  Building2,
  Home,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  UserCheck,
  Clock,
  HelpCircle,
  LogIn,
  Layers,
  Send,
  Search,
  Upload,
  X,
  Menu,
  Calendar,
  Compass,
  CheckSquare,
  Trees,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  FileCheck2,
} from 'lucide-react';

export default function CompanyWebsitePage() {
  const { user, isAuthenticated } = useAuth();

  // Mobile navigation drawer toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Live ERP Packages State
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Calculator State
  const [monthlyBill, setMonthlyBill] = useState(3500);
  const [systemType, setSystemType] = useState('ON_GRID'); // ON_GRID, OFF_GRID, COMMERCIAL
  const [roofType, setRoofType] = useState('RCC_FLAT'); // RCC_FLAT, TIN_SHED, TILE

  // Track Application Modal / Search State
  const [trackPhone, setTrackPhone] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackedLead, setTrackedLead] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [trackModalOpen, setTrackModalOpen] = useState(false);

  // Quote Form State (Comprehensive with all required rooftop solar fields)
  const [quoteForm, setQuoteForm] = useState({
    contactName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Hyderabad',
    desiredCapacityKw: 3,
    systemType: 'ON_GRID',
    monthlyBillAmount: 3500,
    shadowFreeAreaSqFt: 350,
    gridPhase: 'SINGLE_PHASE', // SINGLE_PHASE | THREE_PHASE
    roofType: 'RCC_FLAT',
    subsidyInterest: true,
    preferredSurveyDate: '',
    surveyTimeSlot: 'MORNING', // MORNING | AFTERNOON
    notes: '',
  });

  // Rooftop / Bill Photo upload state
  const [uploadedPhotoPreview, setUploadedPhotoPreview] = useState(null);
  const [uploadedPhotoName, setUploadedPhotoName] = useState('');
  const fileInputRef = useRef(null);

  const [submitting, setSubmitting] = useState(false);
  const [quoteResult, setQuoteResult] = useState(null);
  const [faqOpen, setFaqOpen] = useState(0);

  // Load live ERP Solar Packages
  useEffect(() => {
    setLoadingPackages(true);
    inventoryApi
      .getPublicPackages()
      .then((res) => {
        const pkgs = res.data?.data || [];
        setPackages(pkgs);
      })
      .catch((err) => {
        console.warn('Could not load live packages, using fallback catalog:', err);
      })
      .finally(() => setLoadingPackages(false));
  }, []);

  // Dynamic calculations based on bill & system type
  // Avg electricity rate ~ ₹8.5 / kWh in Telangana/India
  const estimatedUnits = Math.round(monthlyBill / 8.5);
  // 1 kW solar generates ~ 125 units/month
  let recommendedKw = Math.max(1, Math.min(25, Math.round((estimatedUnits / 125) * 2) / 2));
  if (systemType === 'COMMERCIAL' && recommendedKw < 5) recommendedKw = 5;

  // Approximate turnkey cost per kW in India
  let basePricePerKw = 65000;
  if (systemType === 'OFF_GRID') basePricePerKw = 98000; // includes lithium storage
  if (systemType === 'COMMERCIAL') basePricePerKw = 49000; // volume C&I pricing

  const totalEstimatedCost = Math.round(recommendedKw * basePricePerKw);

  // PM Surya Ghar Central Direct Bank Transfer (DBT) Cash Subsidy Scheme:
  // 1 kW: ₹30,000 | 2 kW: ₹60,000 | 3 kW & above: ₹78,000 (Residential On-Grid)
  let subsidyAmount = 0;
  if (systemType === 'ON_GRID') {
    if (recommendedKw >= 3) {
      subsidyAmount = 78000;
    } else if (recommendedKw >= 2) {
      subsidyAmount = 60000;
    } else if (recommendedKw >= 1) {
      subsidyAmount = 30000;
    }
  }

  const netPayableCost = Math.max(0, totalEstimatedCost - subsidyAmount);
  const annualSavings = Math.round(recommendedKw * 125 * 12 * 8.5);
  const paybackYears = netPayableCost > 0 && annualSavings > 0
    ? (netPayableCost / annualSavings).toFixed(1)
    : '2.9';

  // Shadow free area needed (~80-100 sq ft per kW)
  const requiredRoofArea = Math.round(recommendedKw * 85);

  // Environmental impact (~1.2 tons CO2 offset per kW/year, ~18 trees equivalent)
  const co2AvoidedTons = (recommendedKw * 1.25).toFixed(1);
  const treesPlantedEquivalent = Math.round(recommendedKw * 18);

  // Fast Test Data Fill (Helpful for QA & Walkthrough validation)
  const handleFillTestData = (customerPreset = 'ravi') => {
    if (customerPreset === 'ravi') {
      setQuoteForm({
        contactName: 'Ravi Kumar',
        phone: '9000000001',
        email: 'ravikumar@gmail.com',
        address: 'Plot 12, Madhapur, Hyderabad',
        city: 'Hyderabad',
        desiredCapacityKw: 3,
        systemType: 'ON_GRID',
        monthlyBillAmount: 3500,
        shadowFreeAreaSqFt: 350,
        gridPhase: 'SINGLE_PHASE',
        roofType: 'RCC_FLAT',
        subsidyInterest: true,
        preferredSurveyDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
        surveyTimeSlot: 'MORNING',
        notes: 'Wants 3 kW On-Grid with PM Surya Ghar subsidy. Roof area 350 sq ft shadow-free, single-phase grid connection.',
      });
      setMonthlyBill(3500);
      setSystemType('ON_GRID');
      setRoofType('RCC_FLAT');
    } else if (customerPreset === 'sita') {
      setQuoteForm({
        contactName: 'Sita Devi',
        phone: '9000000002',
        email: 'sitadevi@example.com',
        address: 'Flat 402, Jubilee Hills Road No 36',
        city: 'Hyderabad',
        desiredCapacityKw: 1,
        systemType: 'OFF_GRID',
        monthlyBillAmount: 1800,
        shadowFreeAreaSqFt: 150,
        gridPhase: 'SINGLE_PHASE',
        roofType: 'RCC_FLAT',
        subsidyInterest: false,
        preferredSurveyDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        surveyTimeSlot: 'AFTERNOON',
        notes: 'Wants 1 kW Off-Grid system with lithium battery storage for power backup.',
      });
      setMonthlyBill(1800);
      setSystemType('OFF_GRID');
      setRoofType('RCC_FLAT');
    }
  };

  // Handle Photo Upload
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedPhotoName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearPhoto = () => {
    setUploadedPhotoPreview(null);
    setUploadedPhotoName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit Inquiry Form
  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    if (!quoteForm.contactName.trim() || !quoteForm.phone.trim()) {
      alert('Please enter your Name and a valid 10-digit Mobile Number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: `${quoteForm.desiredCapacityKw || recommendedKw} kW ${quoteForm.systemType === 'ON_GRID' ? 'On-Grid' : quoteForm.systemType === 'OFF_GRID' ? 'Off-Grid' : 'Commercial'} Solar Inquiry - ${quoteForm.contactName.trim()}`,
        contactName: quoteForm.contactName.trim(),
        phone: quoteForm.phone.trim(),
        email: quoteForm.email.trim() || null,
        address: `${quoteForm.address.trim()}${quoteForm.city ? `, ${quoteForm.city}` : ''}`,
        source: 'WEBSITE_ROOFTOP_FORM',
        desiredCapacityKw: Number(quoteForm.desiredCapacityKw || recommendedKw),
        monthlyBillAmount: Number(quoteForm.monthlyBillAmount || monthlyBill),
        shadowFreeArea: Boolean(Number(quoteForm.shadowFreeAreaSqFt) >= 100),
        monthlyBill: true,
        gridSuitable: true,
        subsidyInterest: Boolean(quoteForm.subsidyInterest),
        notes: `Roof: ${quoteForm.roofType} (${quoteForm.shadowFreeAreaSqFt} sq.ft shadow-free) | Grid: ${quoteForm.gridPhase} | Preferred Survey: ${quoteForm.preferredSurveyDate || 'Flexible'} (${quoteForm.surveyTimeSlot}) | Subsidy: ${quoteForm.subsidyInterest ? 'Yes' : 'No'}${uploadedPhotoName ? ` | Attached Rooftop File: ${uploadedPhotoName}` : ''}${quoteForm.notes ? ` | Remarks: ${quoteForm.notes}` : ''}`,
      };

      const res = await leadsApi.submitPublicInquiry(payload);
      const leadData = res.data?.data;
      const isDuplicate = Boolean(leadData?.isDuplicateMerged || leadData?.duplicateOfLeadId);

      setQuoteResult({
        lead: leadData,
        isDuplicate,
        name: quoteForm.contactName,
        phone: quoteForm.phone,
        capacity: quoteForm.desiredCapacityKw || recommendedKw,
        systemType: quoteForm.systemType,
        netCost: netPayableCost,
        message: res.data?.message || 'Your rooftop solar inquiry has been received!',
      });

      // Clear form inputs
      setQuoteForm({
        contactName: '',
        phone: '',
        email: '',
        address: '',
        city: 'Hyderabad',
        desiredCapacityKw: 3,
        systemType: 'ON_GRID',
        monthlyBillAmount: 3500,
        shadowFreeAreaSqFt: 350,
        gridPhase: 'SINGLE_PHASE',
        roofType: 'RCC_FLAT',
        subsidyInterest: true,
        preferredSurveyDate: '',
        surveyTimeSlot: 'MORNING',
        notes: '',
      });
      handleClearPhoto();
    } catch (err) {
      alert('Failed to submit quote inquiry: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Execute Track Application Lookup by Phone
  const handleTrackApplication = async (phoneToTrack = trackPhone) => {
    const raw = (phoneToTrack || '').trim();
    if (!raw) {
      setTrackError('Please enter a 10-digit phone number.');
      return;
    }
    setTrackingLoading(true);
    setTrackError('');
    setTrackedLead(null);
    try {
      const res = await leadsApi.trackPublicInquiry(raw);
      setTrackedLead(res.data?.data);
      setTrackModalOpen(true);
    } catch (err) {
      setTrackError(err.response?.data?.message || 'No active solar application found for this phone number.');
      setTrackModalOpen(true);
    } finally {
      setTrackingLoading(false);
    }
  };

  const scrollToSection = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#f09e38] selection:text-white">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. TOP ANNOUNCEMENT BAR */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#714B67] via-[#5C3B53] to-[#241621] text-white text-xs py-2 px-4 shadow-sm border-b border-[#f09e38]/20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="bg-[#f09e38] text-[#241621] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> PM Surya Ghar Scheme
            </span>
            <span className="font-semibold text-slate-200 text-[11px]">
              Direct Bank Transfer (DBT) Subsidy of <strong>₹78,000</strong> credited into your bank account!
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300 text-[11px]">
            <span className="flex items-center gap-1 font-bold">
              <Phone className="w-3 h-3 text-[#f09e38]" /> +91 (800) 890-SOLAR
            </span>
            <span className="hidden md:inline text-white/40">•</span>
            <button
              onClick={() => {
                setTrackPhone('9000000001');
                handleTrackApplication('9000000001');
              }}
              className="text-[#f09e38] hover:text-amber-300 font-bold underline cursor-pointer flex items-center gap-1"
            >
              <Search className="w-3 h-3" /> Track Solar Application
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. MAIN HEADER & NAVIGATION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/website" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#714B67] to-[#f09e38] flex items-center justify-center text-white shadow-md shadow-[#714B67]/20 group-hover:scale-105 transition-transform">
              <SunMedium className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <div className="text-xl font-black text-[#241621] tracking-tight flex items-center gap-1.5">
                SunPower <span className="text-[#f09e38]">Solutions</span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-[#714B67] font-extrabold">
                Rooftop Solar EPC • MNRE Approved Partner
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-600">
            <button onClick={() => scrollToSection('calculator')} className="hover:text-[#714B67] transition cursor-pointer flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-[#f09e38]" /> Solar ROI Calculator
            </button>
            <button onClick={() => scrollToSection('solutions')} className="hover:text-[#714B67] transition cursor-pointer flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-[#714B67]" /> Solar Packages
            </button>
            <button onClick={() => scrollToSection('process')} className="hover:text-[#714B67] transition cursor-pointer flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-teal-600" /> 4-Step EPC Journey
            </button>
            <button onClick={() => setTrackModalOpen(true)} className="hover:text-[#714B67] transition cursor-pointer flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-blue-600" /> Track Application
            </button>
            <button onClick={() => scrollToSection('why-us')} className="hover:text-[#714B67] transition cursor-pointer">
              Why SunPower
            </button>
            <button onClick={() => scrollToSection('faqs')} className="hover:text-[#714B67] transition cursor-pointer">
              FAQs
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to={user?.role === 'CUSTOMER' ? '/customer-portal' : '/sales/leads'}
                className="px-4 py-2.5 rounded-xl bg-[#F5EDF3] text-[#714B67] font-black text-xs hover:bg-[#ebdce7] transition flex items-center gap-1.5 border border-[#ebdce7]"
              >
                <UserCheck className="w-4 h-4 text-[#714B67]" />
                {user?.role === 'CUSTOMER' ? 'Customer Portal' : 'Staff Dashboard'}
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-[#714B67] transition flex items-center gap-1.5 shadow-md shadow-slate-900/20"
              >
                <LogIn className="w-3.5 h-3.5 text-[#f09e38]" /> Client Sign In
              </Link>
            )}

            <button
              onClick={() => scrollToSection('quote-form')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-white font-black text-xs shadow-md shadow-[#f09e38]/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Request Free Quote
            </button>
          </div>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 px-4 py-5 space-y-3 animate-in slide-in-from-top">
            <button onClick={() => scrollToSection('calculator')} className="w-full text-left py-2 text-sm font-bold text-slate-700">
              ⚡ Solar ROI Calculator
            </button>
            <button onClick={() => scrollToSection('solutions')} className="w-full text-left py-2 text-sm font-bold text-slate-700">
              📦 Solar Packages
            </button>
            <button onClick={() => scrollToSection('process')} className="w-full text-left py-2 text-sm font-bold text-slate-700">
              📋 4-Step EPC Process
            </button>
            <button onClick={() => { setMobileMenuOpen(false); setTrackModalOpen(true); }} className="w-full text-left py-2 text-sm font-bold text-blue-700">
              🔍 Track Solar Application
            </button>
            <button onClick={() => scrollToSection('why-us')} className="w-full text-left py-2 text-sm font-bold text-slate-700">
              ⭐ Why SunPower
            </button>
            <button onClick={() => scrollToSection('faqs')} className="w-full text-left py-2 text-sm font-bold text-slate-700">
              ❓ FAQs
            </button>
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs text-center"
              >
                Client Sign In
              </Link>
              <button
                onClick={() => scrollToSection('quote-form')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] text-white font-bold text-xs text-center"
              >
                Request Free Quote
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. HERO BANNER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FAF6F9] via-white to-slate-50 pt-16 pb-20 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5EDF3] border border-[#ebdce7] text-[#714B67] text-xs font-black shadow-2xs">
                <BadgeCheck className="w-4 h-4 text-[#714B67]" />
                MNRE Empanelled Rooftop Solar EPC Partner • Telangana & South India
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#241621] tracking-tight leading-[1.12]">
                Transform Your Roof. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#714B67] via-[#f09e38] to-[#d4821a]">
                  Slash Electricity Bills by 90%.
                </span>
              </h1>

              <p className="text-base text-slate-600 leading-relaxed font-normal max-w-2xl">
                Generate your own clean green power with Tier-1 Mono PERC &amp; TopCon solar modules. SunPower Solutions delivers turnkey engineering, DISCOM net-metering synchronization, and guaranteed <strong>₹78,000 PM Surya Ghar cash subsidy</strong> credited directly to your Aadhaar-linked bank account.
              </p>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-slate-900">25 Years</p>
                    <p className="text-[10px] text-slate-500">Panel Warranty</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-[#f09e38] shrink-0" />
                  <div>
                    <p className="text-xs font-black text-slate-900">₹78,000</p>
                    <p className="text-[10px] text-slate-500">DBT Subsidy</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
                  <TrendingDown className="w-5 h-5 text-teal-600 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-slate-900">2.9 Yrs</p>
                    <p className="text-[10px] text-slate-500">Payback Period</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-[#714B67] shrink-0" />
                  <div>
                    <p className="text-xs font-black text-slate-900">48 Hours</p>
                    <p className="text-[10px] text-slate-500">Fast Installation</p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
                <button
                  onClick={() => scrollToSection('quote-form')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-sm shadow-xl shadow-[#714B67]/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#f09e38]" /> Get Instant Solar Sizing Quote
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => scrollToSection('calculator')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-sm border border-slate-300 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Zap className="w-4 h-4 text-[#f09e38]" /> Calculate Solar ROI
                </button>

                <button
                  onClick={() => setTrackModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-sm border border-amber-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Search className="w-4 h-4 text-[#f09e38]" /> Track Status
                </button>
              </div>
            </div>

            {/* Right Column: Live Telemetry & Model Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl bg-gradient-to-br from-[#241621] to-[#3a2234] text-white p-7 shadow-2xl border border-purple-900/40 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#f09e38]">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white">Live Solar Generation Model</h2>
                      <p className="text-[11px] text-slate-400">Hyderabad & Telangana Irradiance Profile</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                    Tier-1 Active
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-slate-300 font-medium">Daily Peak Solar Irradiance</span>
                    <span className="text-xs font-black text-[#f09e38]">5.2 Sun Hours/Day</span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-slate-300 font-medium">Monthly Generation (per kW)</span>
                    <span className="text-xs font-black text-emerald-400">~ 125 kWh / month</span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-slate-300 font-medium">Net-Metering Export Rate</span>
                    <span className="text-xs font-black text-white">100% Units Banking</span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-slate-300 font-medium">Live Customer Portal</span>
                    <span className="text-xs font-black text-purple-300">Enabled with Phone ID</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#f09e38]/20 to-[#f09e38]/5 border border-[#f09e38]/30 text-xs space-y-1">
                  <p className="text-amber-300 font-black flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#f09e38]" /> End-to-End Digital Workflow
                  </p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Submit your rooftop details below. Our engineering rep will review roof angles, schedule your survey, and activate your personal <strong>Customer Portal Account</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-3xl bg-white border border-slate-200 shadow-sm">
            <div className="text-center p-2">
              <p className="text-3xl font-black text-[#241621]">15+ MW</p>
              <p className="text-xs font-bold text-slate-500 mt-1">Installed Solar Capacity</p>
            </div>
            <div className="text-center p-2 border-l border-slate-100">
              <p className="text-3xl font-black text-[#714B67]">4,250+</p>
              <p className="text-xs font-bold text-slate-500 mt-1">Rooftops Commissioned</p>
            </div>
            <div className="text-center p-2 border-l border-slate-100">
              <p className="text-3xl font-black text-[#f09e38]">₹18.5 Cr+</p>
              <p className="text-xs font-bold text-slate-500 mt-1">Electricity Bills Saved</p>
            </div>
            <div className="text-center p-2 border-l border-slate-100">
              <p className="text-3xl font-black text-emerald-600">99.8%</p>
              <p className="text-xs font-bold text-slate-500 mt-1">DISCOM Net-Meter Sanctions</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. SOLAR SAVINGS CALCULATOR & APPLICATION FORM */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="calculator" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-[#714B67] bg-[#F5EDF3] px-3.5 py-1 rounded-full border border-[#ebdce7]">
              Instant Estimate &amp; ROI Engine
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#241621] tracking-tight">
              Design Your Solar System &amp; Calculate Govt Subsidy
            </h2>
            <p className="text-sm text-slate-600">
              Slide your average monthly electricity bill to calculate required system capacity, central DBT subsidy, annual bill savings, and rooftop area requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Calculator Controls (7 Cols) */}
            <div className="lg:col-span-7 bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-6 shadow-xs">
              {/* Step A: Monthly Electricity Bill Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#241621] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#714B67] text-white flex items-center justify-center text-[10px]">1</span>
                    Average Monthly Electricity Bill
                  </label>
                  <span className="text-lg font-black text-[#714B67] bg-[#F5EDF3] px-3.5 py-1 rounded-xl border border-[#ebdce7]">
                    ₹{monthlyBill.toLocaleString('en-IN')} / month
                  </span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="35000"
                  step="500"
                  value={monthlyBill}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMonthlyBill(val);
                    setQuoteForm((prev) => ({ ...prev, monthlyBillAmount: val }));
                  }}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#714B67]"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-bold">
                  <span>₹1,500</span>
                  <span>₹10,000</span>
                  <span>₹20,000</span>
                  <span>₹35,000+</span>
                </div>
              </div>

              {/* Step B: System Architecture */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#241621] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#714B67] text-white flex items-center justify-center text-[10px]">2</span>
                  Select Solar Architecture
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSystemType('ON_GRID');
                      setQuoteForm((prev) => ({ ...prev, systemType: 'ON_GRID' }));
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      systemType === 'ON_GRID'
                        ? 'bg-white border-[#714B67] ring-2 ring-[#714B67]/20 shadow-md'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-[#241621]">On-Grid Rooftop</span>
                      {systemType === 'ON_GRID' && <Check className="w-4 h-4 text-[#714B67]" />}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Net-metering, highest subsidy (₹78,000), fastest capital payback.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSystemType('OFF_GRID');
                      setQuoteForm((prev) => ({ ...prev, systemType: 'OFF_GRID' }));
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      systemType === 'OFF_GRID'
                        ? 'bg-white border-[#714B67] ring-2 ring-[#714B67]/20 shadow-md'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-[#241621]">Off-Grid / Hybrid</span>
                      {systemType === 'OFF_GRID' && <Check className="w-4 h-4 text-[#714B67]" />}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      LiFePO4 Lithium battery bank for 24x7 uninterrupted power security.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSystemType('COMMERCIAL');
                      setQuoteForm((prev) => ({ ...prev, systemType: 'COMMERCIAL' }));
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      systemType === 'COMMERCIAL'
                        ? 'bg-white border-[#714B67] ring-2 ring-[#714B67]/20 shadow-md'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-[#241621]">Commercial &amp; C&amp;I</span>
                      {systemType === 'COMMERCIAL' && <Check className="w-4 h-4 text-[#714B67]" />}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Bulk scale, 40% accelerated depreciation tax savings.
                    </p>
                  </button>
                </div>
              </div>

              {/* Step C: Roof Type & Area */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-[#241621] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#714B67] text-white flex items-center justify-center text-[10px]">3</span>
                    Roof Mounting Surface
                  </label>
                  <select
                    value={roofType}
                    onChange={(e) => {
                      setRoofType(e.target.value);
                      setQuoteForm((prev) => ({ ...prev, roofType: e.target.value }));
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-[#714B67]"
                  >
                    <option value="RCC_FLAT">RCC Concrete Flat Terrace</option>
                    <option value="TIN_SHED">Industrial Tin / Metal Sheet</option>
                    <option value="TILE">Sloped Clay Tile Roof</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-[#241621] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#714B67] text-white flex items-center justify-center text-[10px]">4</span>
                    Shadow-Free Roof Area
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={quoteForm.shadowFreeAreaSqFt}
                      onChange={(e) => setQuoteForm((prev) => ({ ...prev, shadowFreeAreaSqFt: Number(e.target.value) }))}
                      className="w-full p-2.5 pr-14 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-[#714B67]"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">sq. ft.</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Financial Calculation Output Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <p className="text-[10px] font-black uppercase text-slate-400">System Sizing</p>
                  <p className="text-xl font-black text-[#241621] mt-0.5">{recommendedKw} kW</p>
                  <p className="text-[10px] text-slate-500 font-medium">~ {Math.round(recommendedKw * 125)} Units/mo</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <p className="text-[10px] font-black uppercase text-slate-400">Total System Cost</p>
                  <p className="text-xl font-black text-slate-800 mt-0.5">₹{totalEstimatedCost.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Turnkey EPC</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <p className="text-[10px] font-black uppercase text-emerald-700">Govt Subsidy (DBT)</p>
                  <p className="text-xl font-black text-emerald-800 mt-0.5">
                    {subsidyAmount > 0 ? `₹${subsidyAmount.toLocaleString('en-IN')}` : 'Direct Discom'}
                  </p>
                  <p className="text-[10px] text-emerald-700 font-bold">PM Surya Ghar</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#F5EDF3] border border-[#ebdce7]">
                  <p className="text-[10px] font-black uppercase text-[#714B67]">Net Payable Cost</p>
                  <p className="text-xl font-black text-[#714B67] mt-0.5">₹{netPayableCost.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] text-[#714B67] font-bold">Payback: {paybackYears} Yrs</p>
                </div>
              </div>

              {/* Environmental Carbon Offset Card */}
              <div className="p-3.5 rounded-2xl bg-teal-50/60 border border-teal-200 flex items-center justify-between text-xs text-teal-900">
                <div className="flex items-center gap-2">
                  <Trees className="w-5 h-5 text-teal-600 shrink-0" />
                  <span>
                    Annual Environmental Impact: <strong>{co2AvoidedTons} Metric Tons CO₂ avoided</strong> (~{treesPlantedEquivalent} trees planted).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuoteForm((prev) => ({
                      ...prev,
                      desiredCapacityKw: recommendedKw,
                      monthlyBillAmount: monthlyBill,
                    }));
                    scrollToSection('quote-form');
                  }}
                  className="px-3 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] cursor-pointer"
                >
                  Apply Sizing &rarr;
                </button>
              </div>
            </div>

            {/* Embedded Quote Inquiry Form (5 Cols) */}
            <div id="quote-form" className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-5">
              <div className="pb-3 border-b border-slate-100 flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#f09e38] bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                    Official Quotation &amp; Survey
                  </span>
                  <h3 className="text-xl font-black text-[#241621] mt-1">Book Free Rooftop Survey</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Submit your address to lock in your <strong>₹78,000 Govt Subsidy</strong> allocation.
                  </p>
                </div>

                {/* Quick Test Data Fill Chips */}
                <div className="shrink-0 flex flex-col gap-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleFillTestData('ravi')}
                    className="px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-[#714B67] text-[10px] font-black cursor-pointer"
                    title="Click to pre-fill test customer Ravi Kumar"
                  >
                    ⚡ Fill: Ravi Kumar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFillTestData('sita')}
                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer"
                    title="Click to pre-fill test customer Sita Devi"
                  >
                    ⚡ Fill: Sita Devi
                  </button>
                </div>
              </div>

              {/* Submission Result / Confirmation */}
              {quoteResult ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-emerald-950">
                      {quoteResult.isDuplicate ? 'Inquiry Updated & Merged!' : 'Rooftop Survey Scheduled!'}
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1">
                      {quoteResult.message}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-emerald-200 text-left text-xs space-y-2 text-slate-700">
                    <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                      <span className="text-slate-400 text-[10px] font-black uppercase">Application ID</span>
                      <span className="font-mono font-bold text-[#714B67]">{quoteResult.lead?.id}</span>
                    </div>
                    <p><strong>Customer Name:</strong> {quoteResult.name}</p>
                    <p><strong>Phone / WhatsApp:</strong> {quoteResult.phone}</p>
                    <p><strong>Configured Sizing:</strong> {quoteResult.capacity} kW Solar Plant</p>
                    <p><strong>Estimated Net Investment:</strong> ₹{quoteResult.netCost.toLocaleString('en-IN')}</p>
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                      💡 <strong>What's Next:</strong> Assigned Senior Solar Engineer (<strong>Rahul Sharma</strong>) will review your rooftop orientation and call you within 2 hours.
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleTrackApplication(quoteResult.phone)}
                      className="flex-1 py-2.5 rounded-xl bg-[#714B67] hover:bg-[#5C3B53] text-white font-bold text-xs cursor-pointer"
                    >
                      Track Application Status &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuoteResult(null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleQuoteSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="font-black text-[#241621] block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ravi Kumar"
                      value={quoteForm.contactName}
                      onChange={(e) => setQuoteForm({ ...quoteForm, contactName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#714B67] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-black text-[#241621] block mb-1">Mobile / WhatsApp Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9000000001"
                        value={quoteForm.phone}
                        onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#714B67] outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-black text-[#241621] block mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="name@example.com"
                        value={quoteForm.email}
                        onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#714B67] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-black text-[#241621] block mb-1">Site Address *</label>
                      <input
                        type="text"
                        required
                        placeholder="Plot 12, Madhapur"
                        value={quoteForm.address}
                        onChange={(e) => setQuoteForm({ ...quoteForm, address: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#714B67] outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-black text-[#241621] block mb-1">City / Region</label>
                      <input
                        type="text"
                        placeholder="Hyderabad"
                        value={quoteForm.city}
                        onChange={(e) => setQuoteForm({ ...quoteForm, city: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#714B67] outline-none"
                      />
                    </div>
                  </div>

                  {/* System & Grid Parameters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-black text-[#241621] block mb-1">Desired Capacity (kW)</label>
                      <input
                        type="number"
                        min="1"
                        max="25"
                        step="0.5"
                        value={quoteForm.desiredCapacityKw}
                        onChange={(e) => setQuoteForm({ ...quoteForm, desiredCapacityKw: Number(e.target.value) })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 font-bold outline-none focus:ring-2 focus:ring-[#714B67]"
                      />
                    </div>

                    <div>
                      <label className="font-black text-[#241621] block mb-1">Grid Connection</label>
                      <select
                        value={quoteForm.gridPhase}
                        onChange={(e) => setQuoteForm({ ...quoteForm, gridPhase: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 font-bold bg-white outline-none focus:ring-2 focus:ring-[#714B67]"
                      >
                        <option value="SINGLE_PHASE">Single-Phase (1-Phase)</option>
                        <option value="THREE_PHASE">Three-Phase (3-Phase)</option>
                      </select>
                    </div>
                  </div>

                  {/* Preferred Survey Schedule */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-black text-[#241621] block mb-1">Preferred Survey Date</label>
                      <input
                        type="date"
                        value={quoteForm.preferredSurveyDate}
                        onChange={(e) => setQuoteForm({ ...quoteForm, preferredSurveyDate: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-[#714B67]"
                      />
                    </div>
                    <div>
                      <label className="font-black text-[#241621] block mb-1">Preferred Time Slot</label>
                      <select
                        value={quoteForm.surveyTimeSlot}
                        onChange={(e) => setQuoteForm({ ...quoteForm, surveyTimeSlot: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-[#714B67]"
                      >
                        <option value="MORNING">Morning (10 AM - 1 PM)</option>
                        <option value="AFTERNOON">Afternoon (2 PM - 5 PM)</option>
                      </select>
                    </div>
                  </div>

                  {/* Rooftop / Bill Photo Upload */}
                  <div>
                    <label className="font-black text-[#241621] block mb-1">
                      Upload Rooftop Photo / Electricity Bill (Optional)
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,.pdf"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    {uploadedPhotoPreview ? (
                      <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img
                            src={uploadedPhotoPreview}
                            alt="Upload preview"
                            className="w-8 h-8 rounded-lg object-cover border border-emerald-200"
                          />
                          <span className="font-bold text-emerald-900 truncate text-[11px]">{uploadedPhotoName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearPhoto}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full p-2.5 rounded-xl border border-dashed border-slate-300 hover:border-[#714B67] bg-slate-50 text-slate-600 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
                      >
                        <Upload className="w-4 h-4 text-[#714B67]" />
                        <span>Click to attach terrace photo or recent bill</span>
                      </button>
                    )}
                  </div>

                  {/* Subsidy Checkbox */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="subsidyCheck"
                      checked={quoteForm.subsidyInterest}
                      onChange={(e) => setQuoteForm({ ...quoteForm, subsidyInterest: e.target.checked })}
                      className="w-4 h-4 accent-[#714B67] rounded cursor-pointer"
                    />
                    <label htmlFor="subsidyCheck" className="text-xs font-bold text-[#241621] cursor-pointer">
                      I want PM Surya Ghar direct cash subsidy (up to ₹78,000)
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs shadow-lg shadow-[#714B67]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      'Scheduling Free Rooftop Survey...'
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-[#f09e38]" /> Confirm &amp; Book Free Survey
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 text-center">
                    🔒 Zero spam policy. Inquiry is stored under your account with permanent tracking.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. LIVE SOLAR PACKAGES & ERP BOM SECTION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="solutions" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-[#714B67] bg-[#F5EDF3] px-3.5 py-1 rounded-full border border-[#ebdce7]">
              Certified Ready-Made Packages
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#241621] tracking-tight">
              Pre-Engineered Turnkey Rooftop Packages
            </h2>
            <p className="text-sm text-slate-600">
              Every package comes complete with Bill of Materials (BOM): Tier-1 Modules, Smart Inverter, Galvanized Mounting Structures, AC/DC Protection, Dual Earthing, and Turnkey DISCOM net-metering.
            </p>
          </div>

          {loadingPackages ? (
            <div className="py-12 flex justify-center">
              <div className="w-8 h-8 border-3 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {packages.map((pkg) => {
                const isOffGrid = pkg.type === 'OFF_GRID';
                const is3kw = pkg.defaultCapacityKw === 3 && !isOffGrid;
                return (
                  <div
                    key={pkg.id}
                    className={`rounded-3xl p-6 transition-all flex flex-col justify-between group ${
                      is3kw
                        ? 'bg-white border-2 border-[#714B67] shadow-xl relative'
                        : 'bg-white border border-slate-200 shadow-xs hover:shadow-lg'
                    }`}
                  >
                    {is3kw && (
                      <span className="absolute -top-3 right-6 bg-[#714B67] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md">
                        Most Popular
                      </span>
                    )}

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                            isOffGrid ? 'bg-purple-50 text-[#714B67]' : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {isOffGrid ? <BatteryCharging className="w-6 h-6" /> : <SunMedium className="w-6 h-6" />}
                        </div>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {pkg.minCapacityKw} kW - {pkg.maxCapacityKw} kW
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-[#241621] leading-snug">{pkg.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pkg.description}</p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Standard Capacity</span>
                          <span className="font-extrabold text-sm text-[#714B67]">{pkg.defaultCapacityKw} kW Plant</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Turnkey EPC Cost</span>
                          <span className="font-extrabold text-sm text-[#241621]">₹{Number(pkg.basePrice).toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      {/* Included BOM Highlights */}
                      <div className="space-y-1.5 text-[11px] text-slate-600 pt-1">
                        <p className="font-black text-[#714B67] text-[10px] uppercase">Included In Package BOM:</p>
                        {(pkg.bomLines || []).slice(0, 4).map((bom, bIdx) => (
                          <div key={bIdx} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{bom.product?.name || bom.notes || 'Components included'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-5 border-t border-slate-100 mt-5">
                      <button
                        type="button"
                        onClick={() => {
                          setQuoteForm((prev) => ({
                            ...prev,
                            desiredCapacityKw: pkg.defaultCapacityKw,
                            systemType: pkg.type,
                          }));
                          setSystemType(pkg.type);
                          scrollToSection('quote-form');
                        }}
                        className={`w-full py-2.5 rounded-xl font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 ${
                          is3kw
                            ? 'bg-[#714B67] hover:bg-[#5C3B53] text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                        }`}
                      >
                        Select &amp; Get Quote <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 6. TRANSPARENT 4-STEP EPC WORKFLOW */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="process" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-[#714B67] bg-[#F5EDF3] px-3.5 py-1 rounded-full border border-[#ebdce7]">
              End-to-End Implementation
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#241621] tracking-tight">
              From Inquiry to Solar Generation in 4 Steps
            </h2>
            <p className="text-sm text-slate-600">
              We manage the entire lifecycle with complete digital transparency: 3D shadow analysis, subsidy liaisoning, and customer portal sign-off.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-[#714B67] text-white flex items-center justify-center font-black text-sm shadow-md">
                1
              </div>
              <h3 className="text-base font-black text-[#241621]">1. Online Inquiry</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Submit your monthly bill and roof area. The inquiry is auto-assigned to an engineer and permanently tracked under your phone number.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-[#f09e38] text-white flex items-center justify-center font-black text-sm shadow-md">
                2
              </div>
              <h3 className="text-base font-black text-[#241621]">2. Site Survey &amp; Account</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Field technician visits to measure tilt, azimuth, and cable distances. You receive your secure <strong>Customer Portal Login</strong> credentials.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                3
              </div>
              <h3 className="text-base font-black text-[#241621]">3. Subsidy &amp; Sanctions</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                We submit PM Surya Ghar National Portal registration, net-metering sanctions, and DISCOM feasibility approvals without you visiting any office.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                4
              </div>
              <h3 className="text-base font-black text-[#241621]">4. 48-Hr Install &amp; Warranty</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Our technicians install hot-dip galvanized mounting structures, tier-1 panels, and smart inverters, followed by digital signature handover.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 7. WHY SUNPOWER EPC */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="why-us" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-black uppercase tracking-widest text-[#714B67] bg-[#F5EDF3] px-3.5 py-1 rounded-full border border-[#ebdce7]">
                The SunPower Guarantee
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-[#241621] tracking-tight">
                Engineered for 25+ Years of Peak Energy Yield
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Solar is a 25-year investment. We use only Tier-1 ALMM approved Mono-PERC / TopCon panels, high-grade hot-dip galvanized structures tested for 150 km/h wind gusts, and genuine micro-inverter / string inverter technology.
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Dedicated Customer Portal &amp; ID</h4>
                    <p className="text-[11px] text-slate-500">
                      Track your quote status, survey photos, subsidy document verification, invoices, and raise service tickets directly online.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">Direct PM Surya Ghar Subsidy Assistance</h4>
                    <p className="text-[11px] text-slate-500">
                      We ensure 100% compliance with MNRE guidelines so your ₹78,000 cash subsidy is credited smoothly into your Aadhaar-linked bank account.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">5-Year Comprehensive EPC Workmanship Guarantee</h4>
                    <p className="text-[11px] text-slate-500">
                      Complete coverage on structure stability, AC/DC cabling, earthing resistance, and lightning arrester integrity.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
                <Zap className="w-7 h-7 text-[#f09e38]" />
                <h3 className="text-sm font-black text-[#241621]">TopCon High Efficiency</h3>
                <p className="text-xs text-slate-500">
                  Over 22.4% module conversion efficiency with lower degradation (-0.4% per year) compared to older poly modules.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
                <ShieldCheck className="w-7 h-7 text-[#714B67]" />
                <h3 className="text-sm font-black text-[#241621]">Cyclonic Wind Proof</h3>
                <p className="text-xs text-slate-500">
                  Hot-dip galvanized 80-micron steel structures anchored with chemical fasteners to withstand severe weather.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
                <Layers className="w-7 h-7 text-teal-600" />
                <h3 className="text-sm font-black text-[#241621]">Dual Earthing &amp; Lightning</h3>
                <p className="text-xs text-slate-500">
                  Dedicated chemical earthing pits with copper-bonded rods and Class-I surge protection devices (SPDs).
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-2">
                <Clock className="w-7 h-7 text-indigo-600" />
                <h3 className="text-sm font-black text-[#241621]">24-Hour Service Desk</h3>
                <p className="text-xs text-slate-500">
                  Integrated ticketing system in customer portal. Qualified technicians dispatched within 24 hours of ticket logging.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 8. FAQS ACCORDION */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section id="faqs" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#714B67] bg-[#F5EDF3] px-3.5 py-1 rounded-full border border-[#ebdce7]">
              Got Questions?
            </span>
            <h2 className="text-3xl font-black text-[#241621] tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'How does the PM Surya Ghar Muft Bijli Yojana subsidy work?',
                a: 'Under the PM Surya Ghar scheme, the Central Government provides direct financial assistance: ₹30,000 for 1 kW, ₹60,000 for 2 kW, and ₹78,000 for 3 kW and above. SunPower Solutions submits all necessary drawings, invoices, and plant photos to the national portal. Once the DISCOM installs the net-meter, the subsidy is directly transferred to your Aadhaar-linked bank account within 30-45 days.',
              },
              {
                q: 'How do I receive my Customer ID and Portal Password?',
                a: 'When you submit a quote request on this website, our solar engineering sales representative reviews your property and contacts you via phone or WhatsApp. Once the initial roof details are verified, the sales rep creates your official Customer Account and assigns you a secure Customer ID and Password. You can then log into http://localhost:5173/login to inspect your quotation, survey photos, subsidy filings, and project timeline.',
              },
              {
                q: 'How much shadow-free roof space is required?',
                a: 'As an industry standard, each 1 kW of solar capacity requires approximately 80 to 100 square feet of shadow-free rooftop area. A standard 3 kW residential plant requires about 250 to 300 sq.ft of south-facing or flat roof area.',
              },
              {
                q: 'What happens on cloudy days or during monsoon season?',
                a: 'Solar photovoltaic modules work on daylight irradiance, not just direct sunlight heat. On cloudy days, modules generate approximately 25% to 40% of their peak capacity. With On-Grid Net Metering, any surplus energy you generate during sunny months is credited by the DISCOM, offsetting your power consumption during rainy months.',
              },
              {
                q: 'Can I track my solar application status online without logging in?',
                a: 'Yes! Use the "Track Application" button in the top navigation or enter your 10-digit mobile number at any time to see your current stage (Survey Scheduled, Quote Ready, Installation in Progress).',
              },
            ].map((faq, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setFaqOpen(faqOpen === idx ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-black text-[#241621] hover:text-[#714B67] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {faqOpen === idx ? (
                    <ChevronUp className="w-4 h-4 text-[#714B67] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {faqOpen === idx && (
                  <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 9. BOTTOM CTA STRIP */}
      {/* ───────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-[#714B67] via-[#5C3B53] to-[#241621] text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <span className="bg-[#f09e38] text-[#241621] text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
            Ready to Go Solar?
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Stop Paying High Electricity Bills. Start Generating Today.
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Join thousands of Hyderabad homeowners and businesses enjoying zero power bills and clean renewable energy for the next 25 years.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => scrollToSection('quote-form')}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-[#241621] font-black text-sm shadow-xl shadow-[#f09e38]/30 transition cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Request Free Rooftop Survey
            </button>
            <Link
              to="/login"
              className="px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-sm border border-white/20 transition flex items-center gap-2"
            >
              <LogIn className="w-4 h-4 text-[#f09e38]" /> Client Portal Login
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 10. COMPREHENSIVE FOOTER */}
      {/* ───────────────────────────────────────────────────────────── */}
      <footer className="bg-[#1a0f18] text-slate-400 text-xs py-14 border-t border-purple-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#714B67] to-[#f09e38] flex items-center justify-center text-white">
                <SunMedium className="w-5 h-5 text-amber-200" />
              </div>
              <span className="text-base font-black text-white">SunPower Solutions</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              India's premier certified solar EPC company. Delivering turnkey rooftop and hybrid solar power plants with full MNRE subsidy liaisoning.
            </p>
            <p className="text-[11px] text-slate-500">
              CIN: U40106TG2020PTC145892 • GSTIN: 36AAACS1234F1Z8
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-white tracking-wider">Solar Solutions</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><button onClick={() => { setSystemType('ON_GRID'); scrollToSection('calculator'); }} className="hover:text-white cursor-pointer">Residential On-Grid Solar</button></li>
              <li><button onClick={() => { setSystemType('OFF_GRID'); scrollToSection('calculator'); }} className="hover:text-white cursor-pointer">Hybrid Energy &amp; Battery Storage</button></li>
              <li><button onClick={() => { setSystemType('COMMERCIAL'); scrollToSection('calculator'); }} className="hover:text-white cursor-pointer">Commercial Rooftop Solar</button></li>
              <li><a href="#calculator" onClick={() => scrollToSection('calculator')} className="hover:text-white">PM Surya Ghar Subsidy Guide</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-white tracking-wider">Portals &amp; Access</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link to="/login" className="hover:text-white flex items-center gap-1"><LogIn className="w-3 h-3 text-[#f09e38]" /> Customer Account Sign In</Link></li>
              <li><Link to="/login" className="hover:text-white">Sales &amp; Engineering Portal</Link></li>
              <li><Link to="/shared-dashboard" className="hover:text-white">Executive KPIs &amp; Metrics</Link></li>
              <li><button onClick={() => scrollToSection('quote-form')} className="hover:text-white cursor-pointer">Request Solar Assessment</button></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-white tracking-wider">Corporate Office</h4>
            <p className="text-[11px] flex items-start gap-1.5 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-[#f09e38] shrink-0 mt-0.5" />
              SunPower Towers, Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033
            </p>
            <p className="text-[11px] flex items-center gap-1.5 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-[#f09e38]" /> +91 (800) 890-SOLAR
            </p>
            <p className="text-[11px] flex items-center gap-1.5 text-slate-300">
              <Mail className="w-3.5 h-3.5 text-[#f09e38]" /> contact@sunpowersolutions.in
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <p>© {new Date().getFullYear()} SunPower Solutions Pvt Ltd. All rights reserved.</p>
          <p>MNRE Approved Solar Rooftop EPC Partner • Hyderabad, India</p>
        </div>
      </footer>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 11. INTERACTIVE TRACK APPLICATION MODAL */}
      {/* ───────────────────────────────────────────────────────────── */}
      {trackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 relative">
            <button
              type="button"
              onClick={() => setTrackModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#714B67] flex items-center justify-center">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#241621]">Track Your Solar Application</h3>
                <p className="text-xs text-slate-500">Enter your registered 10-digit mobile number</p>
              </div>
            </div>

            {/* Input Search Form */}
            <div className="flex gap-2">
              <input
                type="tel"
                placeholder="e.g. 9000000001"
                value={trackPhone}
                onChange={(e) => setTrackPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrackApplication()}
                className="flex-1 p-2.5 rounded-xl border border-slate-300 font-mono text-xs font-bold outline-none focus:ring-2 focus:ring-[#714B67]"
              />
              <button
                type="button"
                onClick={() => handleTrackApplication()}
                disabled={trackingLoading}
                className="px-4 py-2.5 rounded-xl bg-[#714B67] hover:bg-[#5C3B53] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {trackingLoading ? 'Checking...' : 'Check Status'}
              </button>
            </div>

            {/* Error Notice */}
            {trackError && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>{trackError}</p>
              </div>
            )}

            {/* Found Application Details Card */}
            {trackedLead && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">Application Ref: {trackedLead.id}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-[#714B67] border border-purple-200">
                    Stage: {trackedLead.stage.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="font-black text-[#241621] text-sm">{trackedLead.contactName}</p>
                  <p className="text-slate-500 text-[11px]">{trackedLead.phone} • {trackedLead.address || 'Hyderabad'}</p>
                  <p className="text-slate-700"><strong>Capacity:</strong> {trackedLead.desiredCapacityKw} kW Plant</p>
                  <p className="text-slate-700"><strong>Assigned Solar Advisor:</strong> {trackedLead.assignedSalesRep} ({trackedLead.assignedRepPhone})</p>
                </div>

                {/* Survey Status if present */}
                {trackedLead.latestSurvey && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <p className="text-[10px] font-black uppercase text-teal-700 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5" /> Roof Survey Status: {trackedLead.latestSurvey.status}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      {trackedLead.latestSurvey.approvedAt ? 'Roof survey completed and approved by engineering.' : 'Roof visit scheduled with field technician.'}
                    </p>
                  </div>
                )}

                {/* Quote Status if present */}
                {trackedLead.latestQuote && (
                  <div className="p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-900 space-y-1">
                    <p className="text-[10px] font-black uppercase flex items-center gap-1">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" /> Quotation Ready: {trackedLead.latestQuote.quoteNumber}
                    </p>
                    <p className="text-[11px] text-slate-700">
                      Amount: <strong>₹{Number(trackedLead.latestQuote.totalAmount).toLocaleString('en-IN')}</strong> ({trackedLead.latestQuote.status})
                    </p>
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <Link
                    to="/login"
                    onClick={() => setTrackModalOpen(false)}
                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] text-white text-center font-bold text-xs shadow-xs"
                  >
                    Open Customer Portal &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
