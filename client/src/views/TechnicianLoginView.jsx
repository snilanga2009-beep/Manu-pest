import React, { useState, useEffect } from 'react';
import {
  Phone, Smartphone, ShieldCheck, CheckCircle2, AlertTriangle,
  Send, RefreshCw, Sparkles, Key, ArrowRight, Lock, Check
} from 'lucide-react';
import { savePersistentTechSession } from '../services/offlineStorage';
import { getSavedBranding, fetchServerBranding } from '../components/BrandingSettingsModal';

export default function TechnicianLoginView({ onLoginSuccess }) {
  const [branding, setBranding] = useState(() => getSavedBranding());
  const [step, setStep] = useState(1); // 1: Enter Phone, 2: Enter OTP
  const [phone, setPhone] = useState('');
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

  // Step 1: Send SMS OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 9) {
      setError('Please enter a valid 9 or 10-digit Sri Lankan mobile phone number (e.g. 0771234567).');
      return;
    }

    setLoading(true);
    setError(null);
    setSmsFeedback(null);

    try {
      const res = await fetch('/api/tech-auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanDigits })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to send SMS verification code.');
      }

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
      setError(err.message || 'Failed to dispatch SMS verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify SMS OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 9) {
      setError('Please enter your registered mobile phone number first.');
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
          device_info: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Invalid or expired 6-digit SMS OTP code.');
      }

      await activateSession(data.technician, data.token);
    } catch (err) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const activateSession = async (technician, token) => {
    const techUser = {
      ...technician,
      role: 'TECHNICIAN'
    };

    if (rememberDevice) {
      await savePersistentTechSession({
        token,
        technician: techUser,
        phone: technician.phone
      });
    }

    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(techUser));
    localStorage.setItem('tech_preferred_id', String(technician.id));
    localStorage.setItem('tech_session', JSON.stringify(techUser));

    if (onLoginSuccess) {
      onLoginSuccess(techUser, token);
    }
  };

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
            <span>{branding?.companyName || 'PEST CONTROL FIELD APP'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-white drop-shadow-sm">
            PEST CONTROL
          </h1>
          <p className="text-xs text-purple-100 font-semibold mt-0.5 max-w-xs">
            Mobile Field Technician Service &amp; Schedule Portal
          </p>

          {/* Pest Control Man Vector Character Image */}
          <div className="relative my-3 sm:my-4 group">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-purple-500 opacity-60 blur-lg" />
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52 rounded-[2.25rem] bg-white p-1.5 shadow-2xl border-4 border-white/80 overflow-hidden mx-auto">
              <img
                src="/pest-tech-man.jpg"
                alt="Pest Control Technician"
                className="w-full h-full object-cover rounded-[1.85rem]"
                onError={(e) => {
                  e.currentTarget.src = '/pest-login-bg.jpg';
                }}
              />
            </div>
            <div className=" -bottom-2.5 left-1/2 -translate-x-1/2 absolute bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg border border-white whitespace-nowrap flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>Verified Tech Portal</span>
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
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                1-Time SMS OTP Sign-In
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#3B0764] mt-1.5">
                Technician Sign In
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Enter your registered mobile number &amp; 1-time SMS OTP code
              </p>
            </div>

            {/* Step Switcher Tabs: 1. Phone Number | 2. 1-Time SMS OTP */}
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
                <span>1. Phone No</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  setError(null);
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  step === 2
                    ? 'bg-gradient-to-r from-[#6D28D9] to-[#4C1D95] text-white shadow-md shadow-purple-500/20'
                    : 'text-purple-900 hover:bg-purple-100/60'
                }`}
              >
                <Key className="w-3.5 h-3.5 shrink-0" />
                <span>2. SMS OTP Code</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {smsFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{smsFeedback.message}</span>
                </div>
                {smsFeedback.debugCode && (
                  <div className="text-[11px] text-emerald-800 font-mono bg-emerald-100/80 p-1.5 rounded-xl text-center mt-1 border border-emerald-200">
                    1-Time OTP Code: <strong className="text-emerald-950 font-black text-sm tracking-widest">{smsFeedback.debugCode}</strong>
                  </div>
                )}
              </div>
            )}

            {step === 1 ? (
              /* STEP 1: ENTER PHONE NUMBER */
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                    Mobile Phone Number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="w-4 h-4 text-orange-500" />
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="077 123 4567"
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 focus:bg-white focus:border-[#6D28D9] focus:outline-hidden text-base font-black text-slate-900 tracking-wide transition"
                    />
                  </div>
                </div>

                {/* Remember Device Checkbox Row matching Reference Login Screen */}
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
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-[#6D28D9] hover:text-[#4C1D95] font-black underline cursor-pointer"
                  >
                    Already have OTP code?
                  </button>
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
                      <span>START &bull; SEND SMS OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* STEP 2: ENTER PHONE + 6-DIGIT 1-TIME SMS OTP CODE */
              <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-600">
                      Mobile Phone Number
                    </label>
                    <button
                      type="button"
                      onClick={handleRequestOtp}
                      disabled={loading || countdown > 0}
                      className="text-[11px] font-black text-orange-600 hover:text-orange-700 disabled:text-slate-400 cursor-pointer"
                    >
                      {countdown > 0 ? `Resend SMS in ${countdown}s` : 'Send / Resend SMS OTP'}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone className="w-4 h-4 text-orange-500" />
                    </div>
                    <input
                      type="tel"
                      inputMode="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="077 123 4567"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl border-2 border-slate-200 focus:bg-white focus:border-[#6D28D9] focus:outline-hidden text-sm font-black text-slate-900 tracking-wide transition"
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
                    required
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
                      <span>VERIFY OTP &amp; SIGN IN</span>
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
            <span>PWA Offline Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
