import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Lock, User, Phone, Key, Smartphone,
  CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff,
  Sparkles, RefreshCw, Send, Check
} from 'lucide-react';
import { getSavedBranding, fetchServerBranding, PresetLogoIcon } from '../components/BrandingSettingsModal';
import TechnicianLoginView from './TechnicianLoginView';

export default function LoginPortal({ onLoginSuccess, technicianOnly = false }) {
  const isTechOnly = technicianOnly ||
    (typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/tech') ||
      window.location.search.includes('tech') ||
      window.location.search.includes('job')
    ));

  if (isTechOnly) {
    return <TechnicianLoginView onLoginSuccess={onLoginSuccess} />;
  }

  const [branding, setBranding] = useState(getSavedBranding());
  const [selectedRole] = useState('ALL');
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    fetchServerBranding().then(b => { if (b) setBranding(b); });
    const handleBranding = (e) => setBranding(e.detail || getSavedBranding());
    window.addEventListener('branding-updated', handleBranding);
    return () => window.removeEventListener('branding-updated', handleBranding);
  }, []);

  // Handle Password Sign-In
  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) {
      setPasswordError('Please enter your username, phone, or email, and password.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          role: selectedRole !== 'ALL' ? selectedRole : undefined,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (pErr) {
        throw new Error(`Server returned error (${res.status}): Please check backend configuration.`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Login failed. Please check your credentials.');
      }

      if (rememberMe) {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      } else {
        sessionStorage.setItem('auth_token', data.token);
        sessionStorage.setItem('auth_user', JSON.stringify(data.user));
      }

      if (data.user.role === 'TECHNICIAN') {
        localStorage.setItem('tech_preferred_id', String(data.user.id));
      }

      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#5B21B6] via-[#4C1D95] to-[#2E1065] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
      {/* Subtle Pest Control Concept Background Image Layer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none opacity-15 mix-blend-luminosity scale-105"
        style={{ backgroundImage: `url('/pest-login-bg.jpg')` }}
      />

      {/* Top Curved Orange & Purple Decorative Waves */}
      <div className="absolute top-0 left-0 right-0 h-64 overflow-hidden pointer-events-none">
        <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full">
          <path
            d="M0,0 L500,0 L500,95 C370,155 220,20 0,115 Z"
            fill="url(#desktopOrangeWave)"
            opacity="0.92"
          />
          <defs>
            <linearGradient id="desktopOrangeWave" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF8A00" />
              <stop offset="50%" stopColor="#F97316" />
              <stop offset="100%" stopColor="#EA580C" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Bottom Ambient Glows */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Split Desktop & Tablet Container */}
      <div className="w-full max-w-4xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-12 bg-white/10 backdrop-blur-2xl rounded-[2.75rem] border border-white/25 shadow-2xl overflow-hidden">

        {/* LEFT HERO PANEL: Pest Control Man Illustration & Brand Identity */}
        <div className="md:col-span-5 flex flex-col items-center justify-center px-6 py-8 md:p-8 text-center text-white relative">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest mb-2.5 border border-white/30 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
            <span>{branding?.companyName || branding?.name || 'CEYLON PEST MANAGEMENT'}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-white drop-shadow-sm">
            PEST CONTROL
          </h1>
          <p className="text-xs text-purple-100 font-semibold mt-1 max-w-xs">
            Master Operations Control &amp; Scheduling Suite
          </p>

          {/* Pest Control Man Vector Character Image */}
          <div className="relative my-5 group">
            <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-purple-500 opacity-70 blur-lg" />
            <div className="relative w-40 h-40 sm:w-48 sm:h-48 md:w-52 md:h-52 rounded-[2.25rem] bg-white p-1.5 shadow-2xl border-4 border-white/90 overflow-hidden mx-auto">
              <img
                src="/pest-tech-man.jpg"
                alt="Pest Control Specialist"
                className="w-full h-full object-cover rounded-[1.85rem]"
                onError={(e) => {
                  e.currentTarget.src = '/pest-login-bg.jpg';
                }}
              />
            </div>
            <div className="-bottom-3 left-1/2 -translate-x-1/2 absolute bg-gradient-to-r from-[#F97316] to-[#FF8A00] text-white text-[10px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-lg border border-white whitespace-nowrap flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
              <span>Operations Control</span>
            </div>
          </div>

          {/* 3 Dots Indicator matching Reference Splash UI */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="w-6 h-2 rounded-full bg-amber-400" />
            <span className="w-2 h-2 rounded-full bg-white/40" />
            <span className="w-2 h-2 rounded-full bg-white/40" />
          </div>
        </div>

        {/* RIGHT CURVED WHITE LOGIN CARD */}
        <div className="md:col-span-7 bg-white rounded-t-[2.5rem] md:rounded-[2.25rem] p-6 sm:p-8 md:m-3 shadow-2xl flex flex-col justify-between relative overflow-hidden">
          {/* Decorative Orange Wave inside top-right of white card */}
          <div className="absolute top-0 right-0 w-40 h-24 pointer-events-none opacity-95">
            <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="w-full h-full">
              <path d="M40,0 L200,0 L200,90 C130,85 90,30 40,0 Z" fill="#FF8A00" />
            </svg>
          </div>

          <div className="space-y-5 relative z-10">
            <div>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                <Sparkles className="w-3 h-3 text-orange-500" />
                <span>Master Control Portal</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#3B0764] mt-2 tracking-tight">
                Operations Control Dashboard
              </h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Sign in to access schedules, dispatching &amp; operations
              </p>
            </div>

            {/* Highlighted Operations Control Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 via-orange-50/60 to-purple-50 border border-purple-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F97316] to-[#FF8A00] text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-black text-[#3B0764] text-xs sm:text-sm">
                  Operations Control Dashboard
                </div>
                <div className="text-[11px] text-slate-600 font-medium">
                  Authorized Administrator &amp; Operations Manager Access
                </div>
              </div>
            </div>

            <form noValidate onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Username / Phone / Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-orange-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. admin or 0729744526"
                    className="w-full bg-slate-50 text-slate-900 text-sm pl-11 pr-4 py-3.5 rounded-2xl border-2 border-slate-200 focus:bg-white focus:outline-hidden focus:border-[#6D28D9] transition placeholder:text-slate-400 font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-orange-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full bg-slate-50 text-slate-900 text-sm pl-11 pr-11 py-3.5 rounded-2xl border-2 border-slate-200 focus:bg-white focus:outline-hidden focus:border-[#6D28D9] transition placeholder:text-slate-400 font-black"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#6D28D9] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#6D28D9] focus:ring-[#6D28D9] cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
                <span className="text-[11px] font-bold text-purple-700">
                  Secure SSL Session
                </span>
              </div>

              {passwordError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full py-4 px-5 rounded-full bg-gradient-to-r from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] hover:from-[#3B0764] hover:to-[#5B21B6] disabled:opacity-50 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-purple-900/25 flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
              >
                {passwordLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>SIGN IN TO OPERATIONS CONTROL DASHBOARD</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Bar */}
          <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold">
            <span className="flex items-center gap-1.5 text-[#4C1D95]">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
              <span>Desktop &bull; Mobile &bull; Tablet Ready</span>
            </span>
            <span className="text-orange-600 font-black">v2026</span>
          </div>
        </div>

      </div>
    </div>
  );
}
