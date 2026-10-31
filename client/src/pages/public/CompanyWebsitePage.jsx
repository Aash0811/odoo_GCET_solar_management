import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { leadsApi } from '../../api';
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
} from 'lucide-react';

export default function CompanyWebsitePage() {
  const { user, isAuthenticated } = useAuth();

  // Calculator State
  const [monthlyBill, setMonthlyBill] = useState(4500);
  const [systemType, setSystemType] = useState('ON_GRID'); // ON_GRID, OFF_GRID, COMMERCIAL
  const [roofType, setRoofType] = useState('RCC_FLAT'); // RCC_FLAT, TIN_SHED, TILE

  // Quote Form State
  const [quoteForm, setQuoteForm] = useState({
    contactName: '',
    phone: '',
    email: '',
    address: '',
    city: 'Hyderabad',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);

  // Dynamic calculations based on bill & system type
  // Avg unit cost ~ ₹8.5/kWh
  const estimatedUnits = Math.round(monthlyBill / 8.5);
  // 1 kW solar generates ~ 120-130 units/month in India
  let recommendedKw = Math.max(1, Math.min(50, Math.round((estimatedUnits / 125) * 2) / 2));
  if (systemType === 'COMMERCIAL' && recommendedKw < 10) recommendedKw = 10;

  // Approximate cost per kW in India (standard residential On-Grid ~ ₹60,000/kW)
  let basePricePerKw = 62000;
  if (systemType === 'OFF_GRID') basePricePerKw = 95000; // includes lithium battery
  if (systemType === 'COMMERCIAL') basePricePerKw = 48000; // bulk C&I scale

  const totalEstimatedCost = Math.round(recommendedKw * basePricePerKw);

  // PM Surya Ghar Muft Bijli Yojana Central DBT Subsidy scheme:
  // 1 kW: ₹30,000 | 2 kW: ₹60,000 | 3 kW and above: ₹78,000 (for residential on-grid)
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
    : '2.8';

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    if (!quoteForm.contactName.trim() || !quoteForm.phone.trim()) {
      alert('Please enter your Name and Mobile Number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: `${recommendedKw} kW ${systemType === 'ON_GRID' ? 'On-Grid' : systemType === 'OFF_GRID' ? 'Hybrid' : 'Commercial'} Solar Quote - ${quoteForm.contactName.trim()}`,
        contactName: quoteForm.contactName.trim(),
        phone: quoteForm.phone.trim(),
        email: quoteForm.email.trim() || null,
        address: `${quoteForm.address.trim()}${quoteForm.city ? `, ${quoteForm.city}` : ''}`,
        source: 'WEBSITE_QUOTE_REQUEST',
        desiredCapacityKw: Number(recommendedKw),
        monthlyBillAmount: Number(monthlyBill),
        notes: `Roof: ${roofType} | System: ${systemType} | Approx Bill: ₹${monthlyBill}/mo | Remarks: ${quoteForm.notes}`,
        shadowFreeArea: true,
        monthlyBill: true,
        gridSuitable: true,
      };

      const res = await leadsApi.submitPublicInquiry(payload);
      setQuoteSuccess({
        lead: res.data?.data,
        name: quoteForm.contactName,
        phone: quoteForm.phone,
        capacity: recommendedKw,
        systemType,
        netCost: netPayableCost,
      });

      setQuoteForm({
        contactName: '',
        phone: '',
        email: '',
        address: '',
        city: 'Hyderabad',
        notes: '',
      });
    } catch (err) {
      alert('Failed to submit quote inquiry: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-[#f09e38] selection:text-white">
      {/* 1. TOP ANNOUNCEMENT BANNER */}
      <div className="bg-gradient-to-r from-[#714B67] via-[#5C3B53] to-[#241621] text-white text-xs py-2 px-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="bg-[#f09e38] text-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
              Govt Scheme
            </span>
            <span className="font-semibold text-slate-200">
              PM Surya Ghar Muft Bijli Yojana: Direct Bank Subsidy up to <strong>₹78,000</strong> on Rooftop Solar!
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-300 text-[11px]">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#f09e38]" /> +91 (800) 890-SOLAR
            </span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:flex items-center gap-1">
              <Mail className="w-3 h-3 text-[#f09e38]" /> contact@sunpowersolutions.in
            </span>
          </div>
        </div>
      </div>

      {/* 2. STICKY MAIN HEADER & NAVIGATION */}
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
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                  Side Page
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-[#714B67] font-bold">
                Rooftop Solar EPC • MNRE Empanelled
              </p>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-bold text-slate-600">
            <button onClick={() => scrollToSection('calculator')} className="hover:text-[#714B67] transition cursor-pointer">
              Solar Savings Calculator
            </button>
            <button onClick={() => scrollToSection('solutions')} className="hover:text-[#714B67] transition cursor-pointer">
              Solar Packages
            </button>
            <button onClick={() => scrollToSection('process')} className="hover:text-[#714B67] transition cursor-pointer">
              EPC Journey
            </button>
            <button onClick={() => scrollToSection('why-us')} className="hover:text-[#714B67] transition cursor-pointer">
              Why SunPower
            </button>
            <button onClick={() => scrollToSection('faqs')} className="hover:text-[#714B67] transition cursor-pointer">
              FAQs
            </button>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to={user?.role === 'CUSTOMER' ? '/customer-portal' : '/sales/leads'}
                className="px-4 py-2.5 rounded-xl bg-[#F5EDF3] text-[#714B67] font-black text-xs hover:bg-[#ebdce7] transition flex items-center gap-1.5 border border-[#ebdce7]"
              >
                <UserCheck className="w-4 h-4 text-[#714B67]" />
                {user?.role === 'CUSTOMER' ? 'My Customer Portal' : 'Staff Dashboard'}
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-[#714B67] transition flex items-center gap-1.5 shadow-md shadow-slate-900/20"
              >
                <LogIn className="w-3.5 h-3.5 text-[#f09e38]" /> ← Main App (Login)
              </Link>
            )}

            <button
              onClick={() => scrollToSection('quote-form')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-white font-black text-xs shadow-md shadow-[#f09e38]/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" /> Request Quote
            </button>
          </div>
        </div>
      </header>

      {/* 3. HERO BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FAF6F9] via-white to-slate-50 pt-16 pb-20 border-b border-slate-200">
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-amber-100/40 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 rounded-full bg-purple-100/40 blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F5EDF3] border border-[#ebdce7] text-[#714B67] text-xs font-black">
                <BadgeCheck className="w-4 h-4 text-[#714B67]" />
                India's Certified Tier-1 Solar Rooftop EPC Partner
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#241621] tracking-tight leading-[1.12]">
                Switch to Clean Solar. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#714B67] via-[#f09e38] to-[#d4821a]">
                  Slash Electricity Bills by 90%.
                </span>
              </h1>

              <p className="text-base text-slate-600 leading-relaxed font-normal max-w-2xl">
                Convert your empty rooftop into a high-yielding clean energy generator. Get government direct bank transfer (DBT) subsidy of up to <strong>₹78,000</strong>, premium TopCon bi-facial solar panels, and complete DISCOM net-metering liaisoning handled end-to-end.
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
                    <p className="text-[10px] text-slate-500">Govt DBT Subsidy</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
                  <TrendingDown className="w-5 h-5 text-teal-600 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-slate-900">3.2 Yrs</p>
                    <p className="text-[10px] text-slate-500">Payback Period</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-2.5">
                  <UserCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-xs font-black text-slate-900">Dedicated</p>
                    <p className="text-[10px] text-slate-500">Customer Portal</p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
                <button
                  onClick={() => scrollToSection('quote-form')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-sm shadow-xl shadow-[#714B67]/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-[#f09e38]" /> Get Instant Solar Quote
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => scrollToSection('calculator')}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-sm border border-slate-300 flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Zap className="w-4 h-4 text-[#f09e38]" /> Calculate My Savings
                </button>
              </div>
            </div>

            {/* Right Column: Visual Summary Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-3xl bg-gradient-to-br from-[#241621] to-[#3a2234] text-white p-7 shadow-2xl border border-purple-900/40 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#f09e38]">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black text-white">Live Solar Generation Model</h2>
                      <p className="text-[11px] text-slate-400">Based on Hyderabad & Telangana Solar Irradiance</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                    Tier-1 Active
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-slate-300 font-medium">Daily Sun Hours</span>
                    <span className="text-xs font-black text-[#f09e38]">5.2 Peak Hours/Day</span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-slate-300 font-medium">Carbon Offsetting (CO₂)</span>
                    <span className="text-xs font-black text-emerald-400">~ 4.8 Metric Tons/Yr</span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-slate-300 font-medium">Net-Metering Bi-Directional Rate</span>
                    <span className="text-xs font-black text-white">100% Units Banking</span>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-slate-300 font-medium">Portal Access for Homeowners</span>
                    <span className="text-xs font-black text-purple-300">Enabled with Customer ID</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#f09e38]/20 to-[#f09e38]/5 border border-[#f09e38]/30 text-xs">
                  <p className="text-amber-300 font-black mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#f09e38]" /> How Quotations & Customer IDs Work:
                  </p>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Once you submit your quote request below, our solar engineering sales representative will review your roof orientation, call you to confirm technical feasibility, and assign you an official <strong>Customer ID & Password</strong> to track your solar project from design to subsidy credit.
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
              <p className="text-xs font-bold text-slate-500 mt-1">Happy Homes & Businesses</p>
            </div>
            <div className="text-center p-2 border-l border-slate-100">
              <p className="text-3xl font-black text-[#f09e38]">₹18.5 Cr+</p>
              <p className="text-xs font-bold text-slate-500 mt-1">Electricity Bill Savings</p>
            </div>
            <div className="text-center p-2 border-l border-slate-100">
              <p className="text-3xl font-black text-emerald-600">99.8%</p>
              <p className="text-xs font-bold text-slate-500 mt-1">DISCOM Subsidy Approval Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. INTERACTIVE SOLAR CALCULATOR & QUOTE REQUEST SECTION */}
      <section id="calculator" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-[#714B67] bg-[#F5EDF3] px-3 py-1 rounded-full border border-[#ebdce7]">
              Instant Estimate & ROI Calculator
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#241621] tracking-tight">
              Design Your Solar System & Calculate Your Govt Subsidy
            </h2>
            <p className="text-sm text-slate-600">
              Adjust your monthly electricity bill to calculate the ideal rooftop system capacity, estimated central subsidy, and annual savings.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Calculator Controls (7 Cols) */}
            <div className="lg:col-span-7 bg-slate-50 rounded-3xl p-6 sm:p-8 border border-slate-200 space-y-6 shadow-xs">
              {/* Step A: Monthly Electricity Bill Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#241621] uppercase tracking-wider">
                    1. Average Monthly Electricity Bill
                  </label>
                  <span className="text-lg font-black text-[#714B67] bg-[#F5EDF3] px-3 py-1 rounded-xl border border-[#ebdce7]">
                    ₹{monthlyBill.toLocaleString('en-IN')} / month
                  </span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="35000"
                  step="500"
                  value={monthlyBill}
                  onChange={(e) => setMonthlyBill(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#714B67]"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-semibold">
                  <span>₹1,500</span>
                  <span>₹10,000</span>
                  <span>₹20,000</span>
                  <span>₹35,000+</span>
                </div>
              </div>

              {/* Step B: System Architecture */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#241621] uppercase tracking-wider block">
                  2. Select Solar System Architecture
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setSystemType('ON_GRID')}
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
                      Net-metering, highest subsidy (up to ₹78,000), fastest payback.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSystemType('OFF_GRID')}
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
                      With LiFePO4 battery storage for 24x7 power backup during outages.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSystemType('COMMERCIAL')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      systemType === 'COMMERCIAL'
                        ? 'bg-white border-[#714B67] ring-2 ring-[#714B67]/20 shadow-md'
                        : 'bg-white/60 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-[#241621]">Commercial & C&I</span>
                      {systemType === 'COMMERCIAL' && <Check className="w-4 h-4 text-[#714B67]" />}
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Bulk scale, 40% accelerated depreciation tax benefits.
                    </p>
                  </button>
                </div>
              </div>

              {/* Step C: Roof Mounting Style */}
              <div className="space-y-2">
                <label className="text-xs font-black text-[#241621] uppercase tracking-wider block">
                  3. Roof Type
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'RCC_FLAT', label: 'RCC Concrete Flat Roof' },
                    { id: 'TIN_SHED', label: 'Industrial Tin / Metal Shed' },
                    { id: 'TILE', label: 'Sloped Clay Tile Roof' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRoofType(r.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        roofType === r.id
                          ? 'bg-[#714B67] text-white border-[#714B67]'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Financial Calculation Output Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200">
                  <p className="text-[10px] font-black uppercase text-slate-400">Plant Sizing</p>
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
            </div>

            {/* Embedded Quote Inquiry Form (5 Cols) */}
            <div id="quote-form" className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#f09e38] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  Certified Solar Sizing
                </span>
                <h3 className="text-xl font-black text-[#241621] mt-1">Request Official Solar Quotation</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Submit details to receive your customized solar layout. Our sales engineer will review and assign your <strong>Customer ID & Portal Password</strong>.
                </p>
              </div>

              {quoteSuccess ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in fade-in">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-emerald-950">Quote Request Submitted!</h4>
                    <p className="text-xs text-emerald-800 mt-1">
                      Thank you, <strong>{quoteSuccess.name}</strong>! Your {quoteSuccess.capacity} kW solar inquiry has been transferred to our technical team.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-emerald-200 text-left text-xs space-y-1.5 text-slate-700">
                    <p><strong>System Size:</strong> {quoteSuccess.capacity} kW Solar Plant</p>
                    <p><strong>Estimated Net Cost:</strong> ₹{quoteSuccess.netCost.toLocaleString('en-IN')}</p>
                    <p><strong>Next Step:</strong> Senior Sales Engineer will call on <strong>{quoteSuccess.phone}</strong> to confirm roof coordinates and assign your <strong>Customer ID & Portal Password</strong>.</p>
                  </div>

                  <button
                    onClick={() => setQuoteSuccess(null)}
                    className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleQuoteSubmit} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-black text-[#241621] block mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Kumar"
                      value={quoteForm.contactName}
                      onChange={(e) => setQuoteForm({ ...quoteForm, contactName: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#714B67] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-black text-[#241621] block mb-1">Mobile / WhatsApp *</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9811122233"
                        value={quoteForm.phone}
                        onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#714B67] outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-black text-[#241621] block mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="name@gmail.com"
                        value={quoteForm.email}
                        onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#714B67] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-black text-[#241621] block mb-1">Installation Address / Area</label>
                      <input
                        type="text"
                        placeholder="e.g. Jubilee Hills Road No 10"
                        value={quoteForm.address}
                        onChange={(e) => setQuoteForm({ ...quoteForm, address: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#714B67] outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-black text-[#241621] block mb-1">City / Town</label>
                      <input
                        type="text"
                        placeholder="Hyderabad"
                        value={quoteForm.city}
                        onChange={(e) => setQuoteForm({ ...quoteForm, city: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#714B67] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-black text-[#241621] block mb-1">Specific Requirements / Notes</label>
                    <textarea
                      rows="2"
                      placeholder="e.g. Need high elevation structure to use roof space, or battery backup required."
                      value={quoteForm.notes}
                      onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#714B67] outline-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#714B67] to-[#855278] hover:opacity-95 text-white font-black text-xs shadow-lg shadow-[#714B67]/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      'Submitting Quote Inquiry...'
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-[#f09e38]" /> Submit Rooftop Quote Request (Free)
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 text-center">
                    🔒 No spam guarantee. Your details are strictly confidential under SunPower EPC standards.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. SOLAR PACKAGES & SOLUTIONS SECTION */}
      <section id="solutions" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-[#714B67] bg-[#F5EDF3] px-3 py-1 rounded-full border border-[#ebdce7]">
              Engineered Solutions
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#241621] tracking-tight">
              Tailored Rooftop Solar for Every Need
            </h2>
            <p className="text-sm text-slate-600">
              From independent villas and housing societies to industrial manufacturing plants, we provide high-durability turnkey solar systems.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Package 1 */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-xs hover:shadow-xl transition-all space-y-5 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                  <Home className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    Highest Subsidy
                  </span>
                  <h3 className="text-xl font-black text-[#241621] mt-2">Residential On-Grid Solar</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Connect directly to your local state electricity board (TSSPDEL / BESCOM / MSEDCL) with smart bi-directional net metering.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Up to <strong>₹78,000 Direct Cash DBT Subsidy</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Zero battery replacement or maintenance costs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Export surplus power & earn electricity credits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mobile App Wi-Fi generation tracking</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setSystemType('ON_GRID');
                  scrollToSection('calculator');
                }}
                className="w-full py-2.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-black text-xs transition border border-teal-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                Configure On-Grid Sizing <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Package 2 */}
            <div className="bg-white rounded-3xl p-7 border-2 border-[#714B67] shadow-xl space-y-5 flex flex-col justify-between relative group">
              <div className="absolute -top-3.5 right-6 bg-[#714B67] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                24x7 Power Security
              </div>

              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#F5EDF3] border border-[#ebdce7] flex items-center justify-center text-[#714B67]">
                  <BatteryCharging className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#714B67] bg-[#F5EDF3] px-2.5 py-0.5 rounded-full border border-[#ebdce7]">
                    Zero Blackouts
                  </span>
                  <h3 className="text-xl font-black text-[#241621] mt-2">Off-Grid & Hybrid Energy</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Solar paired with cutting-edge Lithium Iron Phosphate (LiFePO4) energy storage for total independence from grid failures.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#714B67] shrink-0" />
                    <span>Instant 10ms microsecond UPS switchover</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#714B67] shrink-0" />
                    <span>High-cycle 6,000+ cycle Lithium Battery bank</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#714B67] shrink-0" />
                    <span>Ideal for farmhouses, villas & unstable grid zones</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#714B67] shrink-0" />
                    <span>10-Year Comprehensive Battery Replacement</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setSystemType('OFF_GRID');
                  scrollToSection('calculator');
                }}
                className="w-full py-2.5 rounded-xl bg-[#714B67] hover:bg-[#5C3B53] text-white font-black text-xs transition shadow-md shadow-[#714B67]/25 flex items-center justify-center gap-1 cursor-pointer"
              >
                Configure Hybrid Sizing <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Package 3 */}
            <div className="bg-white rounded-3xl p-7 border border-slate-200 shadow-xs hover:shadow-xl transition-all space-y-5 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    High Commercial ROI
                  </span>
                  <h3 className="text-xl font-black text-[#241621] mt-2">Commercial & Industrial (C&I)</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Custom EPC solutions for factories, warehouses, schools, hospitals, and office parks with high commercial tariffs.
                  </p>
                </div>

                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span><strong>40% Accelerated Depreciation</strong> in Year 1</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Cuts high peak commercial slab charges</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>CEIG safety approvals & Discom liaison included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Rapid capital payback under 2.5 years</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setSystemType('COMMERCIAL');
                  scrollToSection('calculator');
                }}
                className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-black text-xs transition border border-amber-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                Configure Commercial Sizing <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TRANSPARENT 4-STEP EPC WORKFLOW */}
      <section id="process" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-[#714B67] bg-[#F5EDF3] px-3 py-1 rounded-full border border-[#ebdce7]">
              Hassle-Free Implementation
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#241621] tracking-tight">
              From Inquiry to Solar Generation in 4 Steps
            </h2>
            <p className="text-sm text-slate-600">
              We manage the entire project lifecycle—from roof 3D shadow analysis to government subsidy release.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-[#714B67] text-white flex items-center justify-center font-black text-sm shadow-md">
                1
              </div>
              <h3 className="text-base font-black text-[#241621]">1. Quote & Sizing</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Submit your monthly bill and address. Our solar engineering team runs preliminary generation simulations and sizing.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-[#f09e38] text-white flex items-center justify-center font-black text-sm shadow-md">
                2
              </div>
              <h3 className="text-base font-black text-[#241621]">2. Site Survey & Account</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                A certified field engineer surveys your roof orientation and shadows, while our sales rep assigns your official <strong>Customer ID & Portal Login</strong>.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                3
              </div>
              <h3 className="text-base font-black text-[#241621]">3. DISCOM & Subsidy</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                We submit PM Surya Ghar National Portal registration, net-metering sanctions, and DISCOM feasibility approvals without you visiting any office.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                4
              </div>
              <h3 className="text-base font-black text-[#241621]">4. 48-Hr Install & Sync</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Our technicians install hot-dip galvanized mounting structures, tier-1 panels, and smart inverters, followed by DISCOM meter synchronisation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. WHY SUNPOWER EPC */}
      <section id="why-us" className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <span className="text-xs font-black uppercase tracking-widest text-[#714B67] bg-[#F5EDF3] px-3 py-1 rounded-full border border-[#ebdce7]">
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
                    <h4 className="text-xs font-black text-slate-900">Dedicated Customer Portal & ID</h4>
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
                <h3 className="text-sm font-black text-[#241621]">Dual Earthing & Lightning</h3>
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

      {/* 8. FAQS ACCORDION */}
      <section id="faqs" className="py-20 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#714B67] bg-[#F5EDF3] px-3 py-1 rounded-full border border-[#ebdce7]">
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
                q: 'How much roof space do I need for a rooftop solar system?',
                a: 'As a rule of thumb, each 1 kW of solar capacity requires approximately 80 to 100 square feet of shadow-free rooftop area. A standard 3 kW residential plant requires about 250 to 300 sq.ft of south-facing or flat roof area.',
              },
              {
                q: 'What happens on cloudy days or during monsoon season?',
                a: 'Solar photovoltaic modules work on daylight irradiance, not just direct sunlight heat. On cloudy days, modules generate approximately 25% to 40% of their peak capacity. With On-Grid Net Metering, any surplus energy you generate during sunny months is credited by the DISCOM, offsetting your power consumption during rainy months.',
              },
              {
                q: 'Can I monitor daily electricity generation on my phone?',
                a: 'Yes! All SunPower installations come equipped with Wi-Fi smart inverters that sync hourly generation data to both your mobile phone and your SunPower Customer Portal dashboard.',
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

      {/* 9. BOTTOM CTA STRIP */}
      <section className="bg-gradient-to-r from-[#714B67] via-[#5C3B53] to-[#241621] text-white py-16">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
          <span className="bg-[#f09e38] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
            Ready to Go Solar?
          </span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Stop Paying High Electricity Bills. Start Generating Today.
          </h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Join thousands of homeowners and businesses cutting their carbon footprint and enjoying free solar electricity for the next 25 years.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => scrollToSection('quote-form')}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#f09e38] to-[#d4821a] hover:opacity-95 text-white font-black text-sm shadow-xl shadow-[#f09e38]/30 transition cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Request Free Solar Sizing Quote
            </button>
            <Link
              to="/login"
              className="px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-sm border border-white/20 transition flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" /> Client Portal Login
            </Link>
          </div>
        </div>
      </section>

      {/* 10. COMPREHENSIVE FOOTER */}
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
              India's premier certified solar engineering, procurement, and construction (EPC) company. Delivering turnkey rooftop and hybrid solar power plants with full MNRE subsidy liaisoning.
            </p>
            <p className="text-[11px] text-slate-500">
              CIN: U40106TG2020PTC145892 • GSTIN: 36AAACS1234F1Z8
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-white tracking-wider">Solar Solutions</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><button onClick={() => { setSystemType('ON_GRID'); scrollToSection('calculator'); }} className="hover:text-white cursor-pointer">Residential On-Grid Solar</button></li>
              <li><button onClick={() => { setSystemType('OFF_GRID'); scrollToSection('calculator'); }} className="hover:text-white cursor-pointer">Hybrid Energy & Battery Storage</button></li>
              <li><button onClick={() => { setSystemType('COMMERCIAL'); scrollToSection('calculator'); }} className="hover:text-white cursor-pointer">Commercial Rooftop Solar</button></li>
              <li><a href="#calculator" onClick={() => scrollToSection('calculator')} className="hover:text-white">PM Surya Ghar Subsidy Guide</a></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-white tracking-wider">Portals & Access</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li><Link to="/login" className="hover:text-white flex items-center gap-1"><LogIn className="w-3 h-3 text-[#f09e38]" /> Customer Account Sign In</Link></li>
              <li><Link to="/login" className="hover:text-white">Sales & Engineering Portal</Link></li>
              <li><Link to="/shared-dashboard" className="hover:text-white">Executive KPIs & Metrics</Link></li>
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
          <p>Rule 1: Certified Lead Data Integrity • Designed with Antigravity AI Engine</p>
        </div>
      </footer>
    </div>
  );
}

