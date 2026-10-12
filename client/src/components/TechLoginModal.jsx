import React, { useState, useEffect } from 'react';
import {
  Smartphone, Check, AlertCircle, Send, X, RefreshCw, CheckCircle2, Lock, Phone
} from 'lucide-react';
import { saveTechSession } from '../services/offlineStorage';

export default function TechLoginModal({ isOpen = true, onSuccess, onLoginSuccess, onClose }) {
  const [step, setStep] = useState(1); // 1: Enter phone, 2: Enter OTP
  const [phone, setPhone] = useState('');
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

  // Step 1: Send SMS OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 9) {
      setError('Please enter a valid 9 or 10-digit Sri Lankan mobile number.');
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
        message: data.message || `1-Time OTP Code sent to ${phone}!`,
        debugCode: data.debugCode
      });
      if (data.debugCode) {
        setOtpCode(data.debugCode);
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify SMS OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      setError('Please enter the 6-digit verification code received via SMS.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tech-auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, ''),
          otp_code: otpCode.trim(),
          device_info: {
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Invalid or expired verification code.');
      }

      // Save 1-Time Session in IndexedDB & LocalStorage
      await saveTechSession({
        token: data.token,
        technician: data.technician,
        phone: data.technician.phone
      });

      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify({
        ...data.technician,
        role: 'TECHNICIAN'
      }));
      localStorage.setItem('tech_preferred_id', String(data.technician.id));

      if (onSuccess) {
        onSuccess(data.technician, data.token);
      } else if (onLoginSuccess) {
        onLoginSuccess(data.technician, data.token);
      }
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

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
              alt="Pest Control Technician"
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h2 className="text-lg font-black tracking-tight">Technician 1-Time SMS Login</h2>
          <p className="text-xs text-purple-200 font-semibold mt-0.5">
            Enter your mobile phone &amp; 6-digit SMS OTP code
          </p>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-orange-500" />
                  <span>Technician Mobile Number *</span>
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX or 94XXXXXXXX"
                  autoFocus
                  required
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
                    <span>Send 1-Time SMS OTP Code</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
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
                  required
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
                  Change Number
                </button>
                <button
                  type="button"
                  disabled={countdown > 0 || loading}
                  onClick={handleRequestOtp}
                  className="text-emerald-600 hover:underline disabled:text-slate-400 disabled:no-underline font-bold cursor-pointer"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md shadow-emerald-200 disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Verify &amp; Activate App</span>
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
