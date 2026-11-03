import React, { useState, useEffect } from 'react';
import {
  Phone, Smartphone, ShieldCheck, CheckCircle2, AlertTriangle,
  Send, RefreshCw, Sparkles, Key, ArrowRight, Lock, Check, HardHat, Briefcase
} from 'lucide-react';
import { savePersistentTechSession } from '../services/offlineStorage';
import { getSavedBranding, fetchServerBranding } from '../components/BrandingSettingsModal';

export default function TechnicianLoginView({ onLoginSuccess, initialRole }) {
  const [branding, setBranding] = useState(() => getSavedBranding());
  const [loginRole, setLoginRole] = useState(() => {
    if (initialRole) return initialRole;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname.toLowerCase();
      if (path.startsWith('/manager') || params.get('role')?.toLowerCase() === 'manager' || params.has('manager')) {
        return 'MANAGER';
      }
    }
    return 'TECHNICIAN';
  });
  const [step, setStep] = useState(1); // 1: Enter Phone, 2: Enter OTP
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifiedStaffPreview, setVerifiedStaffPreview] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [smsFeedback, setSmsFeedback] = useState(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    fetchServerBranding().then(b => { if (b) setBranding(b); });
    const handleBrandingChange = (e) => setBranding(e.detail || getSavedBranding());
    window.addEventListener('branding-updated', handleBrandingChange);
    return () => window.removeEventListener('branding-updated', handleBrandingChange);
  }, []);

  // Timer for OTP resend countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleRoleSwitch = (nextRole) => {
    setLoginRole(nextRole);
    setStep(1);
    setOtpSent(false);
    setVerifiedStaffPreview(null);
    setOtpCode('');
    setError(null);
    setSmsFeedback(null);
  };

  const handlePhoneInput = (val) => {
    setPhone(val);
    setOtpSent(false);
    setVerifiedStaffPreview(null);
    setOtpCode('');
    setSmsFeedback(null);
    if (error) setError(null);
  };

  // Step 1: Strictly verify registered phone number & send SMS OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanDigits = String(phone || '').replace(/\D/g, '');
    if (cleanDigits.length < 9) {
      setError('Please enter a valid 9 or 10-digit Sri Lankan mobile phone number (e.g. 0777183981).');
      setOtpSent(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSmsFeedback(null);

    try {
      const res = await fetch('/api/tech-auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanDigits, role: loginRole })
      });

      const rawText = await res.text();
      let data = null;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error('Unable to reach verification server. Please check your connection.');
      }

      if (!res.ok || !data || !data.success) {
        setOtpSent(false);
        setVerifiedStaffPreview(null);
        setOtpCode('');
        setStep(1);
        throw new Error(
          data?.error ||
          `Phone number "${phone}" is not registered as an active ${loginRole === 'MANAGER' ? 'Manager' : 'Technician'}. OTP code was NOT sent.`
        );
      }

      // Phone is verified as registered in DB! Move to Step 2
      setOtpSent(true);
      setVerifiedStaffPreview(data.technician || null);
      setStep(2);
      setCountdown(60);
      setSmsFeedback({
        message: data.message || `1-Time OTP Code sent to ${phone} via SMS!`,
        debugCode: data.debugCode
      });
      if (data.debugCode) {
        setOtpCode(data.debugCode);
      }
    } catch (err) {
      setOtpSent(false);
      setVerifiedStaffPreview(null);
      setOtpCode('');
      setStep(1);
      setError(err.message || 'Phone verification failed. OTP code was NOT sent.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Strictly Verify SMS OTP against server
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanDigits = String(phone || '').replace(/\D/g, '');
    if (!otpSent || cleanDigits.length < 9) {
      setError('Please verify your registered mobile phone number first.');
      setStep(1);
      return;
    }
    if (!otpCode || otpCode.trim().length < 6) {
      setError('Please enter the 6-digit 1-Time SMS OTP code.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tech-auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanDigits,
          otp_code: otpCode.trim(),
          role: loginRole,
          device_info: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      const rawText = await res.text();
      let data = null;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        throw new Error('Unable to reach verification server.');
      }

      if (!res.ok || !data || !data.success || !data.technician) {
        throw new Error(data?.error || 'Invalid or expired 6-digit SMS OTP code.');
      }

      await activateSession({ ...data.technician, role: loginRole }, data.token);
    } catch (err) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const activateSession = async (userObj, token) => {
    const finalRole = loginRole === 'MANAGER' ? 'MANAGER' : (userObj.role || 'TECHNICIAN');
    const sessionUser = {
      ...userObj,
      role: finalRole,
      appMode: finalRole === 'MANAGER' ? 'MANAGER_APP' : 'TECH_APP'
    };

    if (rememberDevice) {
      await savePersistentTechSession({
        token,
        technician: sessionUser,
        phone: userObj.phone,
        role: finalRole
      });
    }

    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(sessionUser));
    localStorage.setItem('tech_session', JSON.stringify(sessionUser));

    if (finalRole === 'MANAGER') {
      localStorage.removeItem('tech_preferred_id');
    } else {
      localStorage.setItem('tech_preferred_id', String(userObj.id));
    }

    if (onLoginSuccess) {
      onLoginSuccess(sessionUser, token);
    }
  };

  const isManager = loginRole === 'MANAGER';

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-[#5B21B6] via-[#4C1D95] to-[#2E1065] flex flex-col justify-between md:justify-center items-center p-0 md:p-6 relative overflow-x-hidden select-none font-sans">
      {/* Top Curved Orange & Purple Decorative Waves */}
      <div className="absolute top-0 left-0 right-0 h-56 overflow-hidden pointer-events-none">
        <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full">
          <path
            d="M0,0 L500,0 L500,90 C370,150 220,20 0,110 Z"
            fill="url(#orangeGrad)"
            opacity="0.92"
          />
          <defs>
            <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF8A00" />
              <stop offset="50%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Responsive Container for Android, iPhone, and iPad */}
      <div className="w-full max-w-md md:max-w-4xl mx-auto relative z-10 flex-1 md:flex-initial flex flex-col md:grid md:grid-cols-12 md:bg-white/10 md:backdrop-blur-xl md:rounded-[2.75rem] md:border md:border-white/20 md:shadow-2xl overflow-hidden">

        {/* LEFT / TOP HERO PANEL: Pest Control Man Illustration */}
        <div className="md:col-span-5 flex flex-col items-center justify-center px-6 pt-8 pb-5 md:p-8 text-center text-white relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest mb-2 border border-white/30 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
            <span>{branding?.companyName || (isManager ? 'MANAGER OPERATIONS APP' : 'PEST CONTROL FIELD APP')}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-white drop-shadow-sm">
            {isManager ? 'MANAGER APP' : 'PEST CONTROL'}
          </h1>
          <p className="text-xs text-purple-100 font-semibold mt-0.5 max-w-xs">
            {isManager
              ? 'Operations Manager Mobile Schedule, Today & Tomorrow Jobs + Master Calendar'
              : 'Mobile Field Technician Today Work Queue Portal'}
          </p>

          {/* Pest Control Man Vector Character Image */}
          <div className="relative my-3 sm:my-4 group">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-purple-500 opacity-60 blur-lg" />
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-[2.25rem] bg-white p-1.5 shadow-2xl border-4 border-white/80 overflow-hidden mx-auto">
              <img
                src="/pest-tech-man.jpg"
                alt="Pest Control Specialist"
                className="w-full h-full object-cover rounded-[1.85rem]"
                onError={(e) => {
                  e.currentTarget.src = '/pest-login-bg.jpg';
                }}
              />
            </div>
            <div className="-bottom-2.5 left-1/2 -translate-x-1/2 absolute bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg border border-white whitespace-nowrap flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>{isManager ? 'Verified Manager Portal' : 'Verified Tech Portal'}</span>
            </div>
          </div>

          {/* 3 Dots Indicator like Reference Splash UI */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className={`h-2 rounded-full transition-all ${step === 1 ? 'w-6 bg-amber-400' : 'w-2 bg-white/40'}`} />
            <span className={`h-2 rounded-full transition-all ${step === 2 ? 'w-6 bg-amber-400' : 'w-2 bg-white/40'}`} />
            <span className="w-2 h-2 rounded-full bg-white/40" />
          </div>
        </div>

        {/* RIGHT / BOTTOM WHITE CURVED LOGIN CARD */}
        <div className="md:col-span-7 flex-1 bg-white rounded-t-[2.5rem] md:rounded-[2.25rem] p-5 sm:p-7 md:m-3 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          {/* Decorative Orange Wave inside top of white card */}
          <div className="absolute top-0 right-0 w-36 h-20 pointer-events-none opacity-90">
            <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="w-full h-full">
              <path d="M40,0 L200,0 L200,90 C130,85 90,30 40,0 Z" fill="#FF8A00" />
            </svg>
          </div>

          <div className="space-y-4 relative z-10">
            {/* Role Switcher Panel: TECHNICIAN APP vs MANAGER APP */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                Select Mobile App Portal
              </label>
              <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('TECHNICIAN')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    !isManager
                      ? 'bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <HardHat className="w-4 h-4 shrink-0" />
                  <span>Technician App</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('MANAGER')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isManager
                      ? 'bg-gradient-to-r from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] text-white shadow-md shadow-purple-500/25'
                      : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <Briefcase className="w-4 h-4 shrink-0" />
                  <span>Manager App</span>
                </button>
              </div>
            </div>

            <div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                isManager
                  ? 'text-purple-700 bg-purple-50 border-purple-200'
                  : 'text-orange-600 bg-orange-50 border-orange-200'
              }`}>
                {isManager ? 'Manager 1-Time SMS OTP Login' : 'Technician 1-Time SMS OTP Sign-In'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#3B0764] mt-1.5">
                {isManager ? 'Manager App Sign In' : 'Technician Sign In'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isManager
                  ? 'Enter your registered Manager mobile number. OTP is only sent to registered Managers.'
                  : 'Enter your registered Technician mobile number. OTP is only sent to registered Technicians.'}
              </p>
            </div>

            {/* Step Switcher Tabs: 1. Phone Number | 2. 1-Time SMS OTP (Locked until phone verified) */}
            <div className="grid grid-cols-2 p-1.5 bg-purple-50/90 rounded-2xl border border-purple-100 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  step === 1
                    ? 'bg-gradient-to-r from-[#F97316] to-[#FF8A00] text-white shadow-md shadow-orange-500/20'
                    : 'text-purple-900 hover:bg-purple-100/60'
                }`}
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>1. Verify Phone No</span>
              </button>
              <button
                type="button"
                disabled={!otpSent}
                onClick={() => {
                  if (!otpSent) return;
                  setStep(2);
                  setError(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition ${
                  step === 2
                    ? 'bg-gradient-to-r from-[#6D28D9] to-[#4C1D95] text-white shadow-md shadow-purple-500/20 cursor-pointer'
                    : otpSent
                      ? 'text-purple-900 hover:bg-purple-100/60 cursor-pointer'
                      : 'text-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                {otpSent ? <Key className="w-3.5 h-3.5 shrink-0" /> : <Lock className="w-3.5 h-3.5 shrink-0" />}
                <span>2. SMS OTP Code</span>
              </button>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-2.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {smsFeedback && otpSent && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{smsFeedback.message}</span>
                </div>
                {verifiedStaffPreview?.full_name && (
                  <div className="text-[11px] text-emerald-900">
                    Verified Account: <strong>{verifiedStaffPreview.full_name}</strong> ({verifiedStaffPreview.role})
                  </div>
                )}
                {smsFeedback.debugCode && (
                  <div className="text-[11px] text-emerald-800 font-mono bg-emerald-100/80 p-1.5 rounded-xl text-center mt-1 border border-emerald-200">
                    1-Time OTP Code: <strong className="text-emerald-950 font-black text-sm tracking-widest">{smsFeedback.debugCode}</strong>
                  </div>
                )}
              </div>
            )}

            {step === 1 ? (
              /* STEP 1: ENTER & VERIFY REGISTERED PHONE NUMBER */
              <form noValidate onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    {isManager ? 'Registered Manager Mobile Number' : 'Registered Technician Mobile Number'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="w-4 h-4 text-orange-500" />
                    </div>
                    <input
                      type="text"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => handlePhoneInput(e.target.value)}
                      placeholder={isManager ? 'e.g. 0777183981' : 'e.g. 0729744526'}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 focus:bg-white focus:border-[#6D28D9] focus:outline-hidden text-base font-black text-slate-900 tracking-wide transition"
                    />
                  </div>
                </div>

                {/* Remember Device Checkbox Row */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={rememberDevice}
                      onChange={(e) => setRememberDevice(e.target.checked)}
                      className="w-4 h-4 rounded text-[#6D28D9] focus:ring-[#6D28D9]"
                    />
                    <span>Remember Device</span>
                  </label>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    Registered staff numbers only
                  </span>
                </div>

                {/* Primary Pill Action Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] hover:from-[#3B0764] hover:to-[#5B21B6] text-white font-black rounded-full text-sm uppercase tracking-wider shadow-xl shadow-purple-900/25 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>{isManager ? 'VERIFY PHONE & SEND MANAGER OTP' : 'VERIFY PHONE & SEND TECH OTP'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* STEP 2: ENTER 6-DIGIT 1-TIME SMS OTP CODE */
              <form noValidate onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      Verified {isManager ? 'Manager' : 'Technician'} Phone
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setStep(1);
                          setError(null);
                        }}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      >
                        Change Phone
                      </button>
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        disabled={loading || countdown > 0}
                        className="text-[11px] font-black text-orange-600 hover:text-orange-700 disabled:text-slate-400 cursor-pointer"
                      >
                        {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="w-4 h-4 text-emerald-600" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      value={phone}
                      className="w-full pl-11 pr-4 py-3 bg-emerald-50/50 rounded-2xl border-2 border-emerald-200 text-sm font-black text-slate-900 tracking-wide"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
                    1-Time 6-Digit SMS OTP Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • • • •"
                    className="w-full py-3.5 px-4 bg-purple-50/60 rounded-2xl border-2 border-purple-300 focus:bg-white focus:border-[#6D28D9] focus:outline-hidden text-center text-2xl font-mono font-black tracking-[0.45em] text-[#3B0764]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  className="w-full py-4 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-black rounded-full text-sm uppercase tracking-wider shadow-xl shadow-orange-600/25 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{isManager ? 'VERIFY OTP & OPEN MANAGER APP' : 'VERIFY OTP & SIGN IN'}</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Device Compatibility Footer Badge */}
          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span className="flex items-center gap-1 text-purple-700">
              <Smartphone className="w-3.5 h-3.5 text-orange-500" />
              <span>Android &bull; iPhone &bull; iPad</span>
            </span>
            <span>{isManager ? 'Manager App Ready' : 'Technician App Ready'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
