import React, { useState, useEffect } from 'react';
import {
  Phone, Smartphone, ShieldCheck, CheckCircle2, AlertTriangle,
  Send, RefreshCw, Sparkles, Key, ArrowRight, Lock, Check
} from 'lucide-react';
import { savePersistentTechSession } from '../services/offlineStorage';
import { getSavedBranding, fetchServerBranding, PresetLogoIcon } from '../components/BrandingSettingsModal';

export default function TechnicianLoginView({ onLoginSuccess }) {
  const [branding, setBranding] = useState(() => getSavedBranding());
  const [step, setStep] = useState(1); // 1: Enter Phone, 2: Enter OTP
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
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

    // Save to IndexedDB permanent store
    await savePersistentTechSession({
      token,
      technician: techUser,
      phone: technician.phone
    });

    // Save to localStorage for instant synchronous boot
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(techUser));
    localStorage.setItem('tech_preferred_id', String(technician.id));
    localStorage.setItem('tech_session', JSON.stringify(techUser));

    if (onLoginSuccess) {
      onLoginSuccess(techUser, token);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden select-none font-sans">
      {/* Pest Control Ambient Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 pointer-events-none"
        style={{ backgroundImage: `url('/pest-login-bg.jpg')` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-slate-900/90 to-slate-950/95 pointer-events-none" />
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md mx-auto relative z-10 flex-1 flex flex-col justify-center py-4 space-y-5">
        {/* Top App Branding Header */}
        <div className="text-center space-y-2.5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-tr from-red-600 via-rose-600 to-red-700 shadow-2xl shadow-red-600/30 p-1 flex items-center justify-center border-2 border-white/20">
            {branding?.customLogoUrl ? (
              <img src={branding.customLogoUrl} alt="Logo" className="w-full h-full object-contain rounded-2xl bg-white p-1" />
            ) : branding?.appIconUrl ? (
              <img src={branding.appIconUrl} alt="Icon" className="w-full h-full object-cover rounded-2xl" />
            ) : branding?.presetId ? (
              <PresetLogoIcon id={branding.presetId} className="w-10 h-10 text-white" />
            ) : (
              <Smartphone className="w-9 h-9 text-white" />
            )}
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-300 text-[10px] font-black uppercase tracking-wider mb-1.5 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>PWA Mobile App • 1-Time SMS OTP Login</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Technician Mobile App
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">
              {branding?.companyName || branding?.name || 'Ceylon Pest Management'} &bull; Sign in with your mobile phone &amp; 1-time SMS OTP code
            </p>
          </div>
        </div>

        {/* Main Mobile Login Card */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4">
          {/* Step Switcher Tabs: 1. Phone Number | 2. 1-Time SMS OTP */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError(null);
              }}
              className={`py-2 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                step === 1
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
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
              className={`py-2 px-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                step === 2
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Key className="w-3.5 h-3.5 shrink-0" />
              <span>2. SMS OTP Code</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs font-bold flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
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
                <div className="text-[11px] text-emerald-700 font-mono bg-emerald-100/80 p-1.5 rounded-xl text-center mt-1 border border-emerald-200">
                  1-Time OTP Code: <strong className="text-emerald-950 font-black text-sm tracking-widest">{smsFeedback.debugCode}</strong>
                </div>
              )}
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: ENTER TECHNICIAN PHONE NUMBER */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Technician Mobile Phone Number *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-red-600" />
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXX or 94XXXXXXXX"
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:outline-hidden focus:border-red-500 focus:bg-white transition font-mono tracking-wide"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 pl-1">
                  Enter your registered technician mobile number to receive a 6-digit 1-time SMS OTP code.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Sending 1-Time SMS OTP...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>Get 1-Time SMS OTP Code</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-[11px] font-bold text-slate-500 hover:text-emerald-600 underline cursor-pointer"
                >
                  Already received a 6-digit OTP code? Enter it here &rarr;
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: ENTER PHONE + 6-DIGIT 1-TIME SMS OTP CODE */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
                    Technician Mobile Number
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setError(null);
                    }}
                    className="text-[11px] text-red-600 font-bold hover:underline cursor-pointer"
                  >
                    Change Number
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    inputMode="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-hidden focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  6-Digit 1-Time SMS OTP Code *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtpCode(val);
                  }}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full py-3.5 px-4 text-center tracking-[0.5em] font-mono text-2xl font-black bg-slate-50 border-2 border-emerald-300 rounded-2xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Verifying OTP Code...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Verify OTP &amp; Open Technician App</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
                >
                  &larr; Back
                </button>
                {countdown > 0 ? (
                  <span className="text-[11px] text-slate-400 font-medium">
                    Resend SMS in <strong className="text-slate-700 font-black">{countdown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="text-xs text-red-600 font-black hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Resend 1-Time OTP</span>
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Footer Info */}
        <div className="text-center pb-2 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>1-Time SMS Verification • Permanent Device Session</span>
          </div>
          <p className="text-slate-500 text-[10px]">
            Supports Android &amp; iPhone PWA • Offline Sync Enabled
          </p>
        </div>
      </div>
    </div>
  );
}
