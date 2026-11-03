import React, { useState, useEffect } from 'react';
import {
  Smartphone, Check, AlertCircle, Send, X, RefreshCw, CheckCircle2, Lock, Phone, HardHat, Briefcase
} from 'lucide-react';
import { saveTechSession } from '../services/offlineStorage';

export default function TechLoginModal({ isOpen = true, onSuccess, onLoginSuccess, onClose, initialRole = 'TECHNICIAN' }) {
  const [loginRole, setLoginRole] = useState(initialRole || 'TECHNICIAN');
  const [step, setStep] = useState(1); // 1: Enter phone, 2: Enter OTP
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [smsFeedback, setSmsFeedback] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen && isOpen !== undefined) return null;

  // Step 1: Strictly verify registered phone & send SMS OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanDigits = String(phone || '').replace(/\D/g, '');
    if (cleanDigits.length < 9) {
      setError('Please enter a valid 9 or 10-digit Sri Lankan mobile number.');
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
        throw new Error('Unable to reach verification server.');
      }

      if (!res.ok || !data || !data.success) {
        setOtpSent(false);
        setOtpCode('');
        setStep(1);
        throw new Error(data?.error || 'This phone number is not registered. OTP code was NOT sent.');
      }

      setOtpSent(true);
      setStep(2);
      setCountdown(60);
      setSmsFeedback({
        message: data.message || `1-Time OTP Code sent to ${phone}!`,
        debugCode: data.debugCode
      });
      if (data.debugCode) {
        setOtpCode(data.debugCode);
      }
    } catch (err) {
      setOtpSent(false);
      setOtpCode('');
      setStep(1);
      setError(err.message || 'Failed to verify phone number. OTP was NOT sent.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Strictly Verify SMS OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpSent) {
      setStep(1);
      return;
    }
    if (!otpCode || otpCode.trim().length < 6) {
      setError('Please enter the 6-digit verification code received via SMS.');
      return;
    }

    setLoading(true);
    setError(null);
    const cleanDigits = String(phone || '').replace(/\D/g, '');

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
        throw new Error(data?.error || 'Invalid or expired verification code.');
      }

      const finalRole = loginRole === 'MANAGER' ? 'MANAGER' : 'TECHNICIAN';
      const sessionUser = {
        ...data.technician,
        role: finalRole,
        appMode: finalRole === 'MANAGER' ? 'MANAGER_APP' : 'TECH_APP'
      };

      await saveTechSession({
        token: data.token,
        technician: sessionUser,
        phone: sessionUser.phone,
        role: finalRole
      });

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(sessionUser));
      if (finalRole === 'MANAGER') {
        localStorage.removeItem('tech_preferred_id');
      } else {
        localStorage.setItem('tech_preferred_id', String(sessionUser.id));
      }

      if (onSuccess) {
        onSuccess(sessionUser, data.token);
      } else if (onLoginSuccess) {
        onLoginSuccess(sessionUser, data.token);
      }
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const isManager = loginRole === 'MANAGER';

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden flex flex-col relative">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Header Banner */}
        <div className="p-6 bg-gradient-to-br from-[#5B21B6] via-[#4C1D95] to-[#2E1065] text-white text-center relative overflow-hidden">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white p-1 border-2 border-orange-400 flex items-center justify-center shadow-lg mb-2.5 overflow-hidden">
            <img
              src="/pest-tech-man.jpg"
              alt="Pest Control"
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h2 className="text-lg font-black tracking-tight">
            {isManager ? 'Manager 1-Time SMS Login' : 'Technician 1-Time SMS Login'}
          </h2>
          <p className="text-xs text-purple-200 font-semibold mt-0.5">
            Registered staff phone numbers only
          </p>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Role Switcher */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1">
            <button
              type="button"
              onClick={() => {
                setLoginRole('TECHNICIAN');
                setStep(1);
                setOtpSent(false);
                setOtpCode('');
                setError(null);
              }}
              className={`py-2 px-2.5 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                !isManager ? 'bg-[#F97316] text-white shadow-xs' : 'text-slate-600 hover:bg-white'
              }`}
            >
              <HardHat className="w-3.5 h-3.5 shrink-0" />
              <span>Technician</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginRole('MANAGER');
                setStep(1);
                setOtpSent(false);
                setOtpCode('');
                setError(null);
              }}
              className={`py-2 px-2.5 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition cursor-pointer ${
                isManager ? 'bg-[#5B21B6] text-white shadow-xs' : 'text-slate-600 hover:bg-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 shrink-0" />
              <span>Manager</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form noValidate onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-orange-500" />
                  <span>{isManager ? 'Registered Manager Phone *' : 'Registered Technician Phone *'}</span>
                </label>
                <input
                  type="text"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setOtpSent(false);
                    setError(null);
                  }}
                  placeholder={isManager ? 'e.g. 0777183981' : 'e.g. 0729744526'}
                  autoFocus
                  className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 focus:bg-white focus:border-[#6D28D9] focus:outline-hidden font-mono font-black text-sm tracking-wider text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] hover:from-[#3B0764] hover:to-[#5B21B6] text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md shadow-purple-200 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Verify Phone &amp; Send OTP</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form noValidate onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Enter 6-Digit SMS OTP Code</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="• • • • • •"
                  autoFocus
                  className="w-full py-3.5 bg-slate-50 text-slate-900 text-center text-2xl tracking-[0.5em] rounded-2xl border-2 border-emerald-300 focus:bg-white focus:border-emerald-500 focus:outline-hidden font-mono font-black"
                />
              </div>

              {smsFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{smsFeedback.message}</span>
                  </div>
                  {smsFeedback.debugCode && (
                    <span className="font-mono font-black text-emerald-900 bg-emerald-200 px-2 py-0.5 rounded-md border border-emerald-400">
                      {smsFeedback.debugCode}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-slate-500 hover:text-slate-800 font-bold underline cursor-pointer"
                >
                  Change Phone Number
                </button>
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={countdown > 0 || loading}
                  className="text-[#6D28D9] hover:text-[#4C1D95] font-black disabled:text-slate-400 cursor-pointer"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full py-3.5 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-black text-xs uppercase tracking-wider rounded-full shadow-md shadow-orange-200 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Verify &amp; Sign In</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
