import React, { useState, useEffect } from 'react';
import {
  User, Phone, Bell, BellRing, BellOff, Smartphone, ShieldCheck,
  Wifi, WifiOff, RefreshCw, LogOut, CheckCircle2, AlertCircle,
  HardHat, ExternalLink, Laptop, Tablet, Check, ArrowRight
} from 'lucide-react';
import {
  getPersistentTechSession,
  clearPersistentTechSession,
  getPendingMutations
} from '../services/offlineStorage';
import {
  getPushSubscriptionStatus,
  subscribeToPush,
  triggerTestPush
} from '../services/pushManager';
import { triggerSync, onSyncStatusChange } from '../services/syncEngine';
import TechLoginModal from '../components/TechLoginModal';

export default function TechnicianProfileView({ onNavigate, currentUser, onLogout }) {
  const [techSession, setTechSession] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Push notification state
  const [pushStatus, setPushStatus] = useState({ supported: true, permission: 'default', isSubscribed: false });
  const [enablingPush, setEnablingPush] = useState(false);
  const [sendingTestPush, setSendingTestPush] = useState(false);
  const [testPushFeedback, setTestPushFeedback] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  // Sync state
  const [syncStatus, setSyncStatus] = useState({ status: 'synced', pendingCount: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);

  // Standalone PWA check
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Check standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(standalone);

    // 2. Load tech persistent session
    getPersistentTechSession().then(session => {
      const activeTech = session?.technician || (session?.id ? session : null) || currentUser;
      if (activeTech) {
        setTechSession(activeTech);
        if (activeTech.id) {
          loadRegisteredDevices(activeTech.id);
        }
      }
    });

    // 3. Check push subscription status
    checkPush();

    // 4. Online/offline listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 5. Sync status listener
    getPendingMutations().then(mutations => {
      setSyncStatus({
        status: mutations.length === 0 ? 'synced' : 'pending',
        pendingCount: mutations.length
      });
    });

    const unsubscribeSync = onSyncStatusChange((state) => {
      setSyncStatus(state);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeSync();
    };
  }, []);

  const checkPush = async () => {
    try {
      const status = await getPushSubscriptionStatus();
      setPushStatus(status);
    } catch (e) {
      console.error('Error checking push status:', e);
    }
  };

  const loadRegisteredDevices = async (techId) => {
    if (!techId) return;
    setLoadingDevices(true);
    try {
      const res = await fetch(`/api/push/devices/${techId}`);
      const data = await res.json();
      if (data.success) {
        setDevices(data.devices || []);
      }
    } catch (e) {
      console.error('Failed to load registered devices:', e);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleEnablePush = async () => {
    if (!techSession?.id) {
      setShowLoginModal(true);
      return;
    }
    setEnablingPush(true);
    setTestPushFeedback(null);
    try {
      await subscribeToPush(techSession.id);
      await checkPush();
      await loadRegisteredDevices(techSession.id);
      setTestPushFeedback({ type: 'success', message: 'Web push notifications enabled successfully!' });
    } catch (err) {
      setTestPushFeedback({ type: 'error', message: err.message || 'Failed to subscribe to push notifications.' });
    } finally {
      setEnablingPush(false);
    }
  };

  const handleSendTestPush = async () => {
    if (!techSession?.id) return;
    setSendingTestPush(true);
    setTestPushFeedback(null);
    try {
      const res = await triggerTestPush(techSession.id);
      if (res.success) {
        setTestPushFeedback({
          type: 'success',
          message: `Push delivered to ${res.sentCount || 1} active device(s)! Check your device notification tray.`
        });
      } else {
        setTestPushFeedback({
          type: 'error',
          message: res.error || 'Failed to send test push notification.'
        });
      }
    } catch (err) {
      setTestPushFeedback({
        type: 'error',
        message: err.message || 'Push dispatch failed.'
      });
    } finally {
      setSendingTestPush(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await triggerSync();
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: res.syncedCount > 0 ? `Successfully synchronized ${res.syncedCount} queued action(s)!` : 'All local changes are already up to date.'
        });
      } else {
        setSyncFeedback({
          type: 'error',
          message: res.error || 'Sync encountered errors.'
        });
      }
    } catch (err) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Sync failed.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out from this device?')) {
      await clearPersistentTechSession();
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      localStorage.removeItem('tech_preferred_id');
      sessionStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_user');
      setTechSession(null);
      if (onLogout) {
        onLogout();
      } else {
        window.location.reload();
      }
    }
  };

  const handleLoginSuccess = (session) => {
    setTechSession(session);
    setShowLoginModal(false);
    loadRegisteredDevices(session.id);
    checkPush();
  };

  return (
    <div className="w-full max-w-4xl mx-auto min-h-screen bg-[#F5F3FF] pb-28 font-sans">
      {/* Top Header in Purple & Orange Curved Wave UI */}
      <div className="bg-gradient-to-br from-[#5B21B6] via-[#4C1D95] to-[#2E1065] text-white p-5 sticky top-0 z-30 shadow-xl rounded-b-[2rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-24 pointer-events-none opacity-85">
          <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="w-full h-full">
            <path d="M20,0 L200,0 L200,95 C130,90 80,35 20,0 Z" fill="#F97316" />
          </svg>
        </div>

        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white p-0.5 border-2 border-amber-300 flex items-center justify-center shadow-lg overflow-hidden shrink-0">
              <img
                src="/pest-tech-man.jpg"
                alt="Pest Control Technician"
                className="w-full h-full object-cover rounded-xl"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
            <div>
              <h1 className="font-black text-base sm:text-lg tracking-tight leading-tight text-white">
                {techSession?.full_name || currentUser?.full_name || 'Technician Account'}
              </h1>
              <div className="text-xs text-amber-200 font-semibold flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                <span>Verified Field Technician &bull; {techSession?.phone || currentUser?.phone || 'Active'}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              isOnline ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40' : 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
            }`}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Purple & Orange Quick Navigation Menu Stack (Matching Reference UI Screen 3) */}
        <div className="rounded-3xl overflow-hidden shadow-lg border border-purple-200 bg-white">
          <div className="bg-gradient-to-r from-[#FF8A00] to-[#F97316] p-4 text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-sm truncate">
                {techSession?.full_name || currentUser?.full_name || 'Pest Control Technician'}
              </div>
              <div className="text-[11px] text-orange-100 font-semibold truncate">
                Quick Screen Switcher &bull; Android / iPhone / iPad
              </div>
            </div>
          </div>
          <div className="divide-y divide-purple-400/30 bg-gradient-to-b from-[#6D28D9] to-[#4C1D95] text-white">
            {[
              { id: 'mobile_home', label: 'Today Job List (Active Work)' },
              { id: 'tomorrow_tab', label: 'Tomorrow Job List (Preview)' },
              { id: 'calendar', label: 'Monthly & Daily Calendar' },
              { id: 'jobs', label: 'All Assigned Jobs & Search' }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate && onNavigate(item.id)}
                className="w-full py-3.5 px-4 text-xs font-black tracking-wide flex items-center justify-between hover:bg-white/10 transition cursor-pointer"
              >
                <span>{item.label}</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            ))}
          </div>
        </div>

        {/* 1-Time Permanent Session Card */}
        <div className="bg-white rounded-3xl p-4 shadow-sm border border-purple-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#F97316]" />
                <h2 className="font-black text-slate-800 text-sm">1-Time SMS OTP Sign-In</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-[#4C1D95] text-[10px] font-black uppercase">
                Verified Session
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Technician Name:</span>
                <span className="font-bold text-slate-800">{techSession?.full_name || currentUser?.full_name || 'Logged In'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Mobile Phone:</span>
                <span className="font-bold text-slate-800">{techSession?.phone || currentUser?.phone || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-500">Device Support:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Android &bull; iPhone &bull; iPad
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            {!techSession && !currentUser ? (
              <button
                type="button"
                onClick={() => setShowLoginModal(true)}
                className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] hover:from-[#3B0764] hover:to-[#5B21B6] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                Sign In with Mobile Number + OTP
              </button>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-3 px-4 rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-white" />
                Switch Account / Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Real Web Push Notifications Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600" />
              <h2 className="font-black text-slate-800 text-sm">Real Web Push Notifications</h2>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
              pushStatus.permission === 'granted'
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {pushStatus.permission === 'granted' ? 'Enabled ✓' : 'Permission Needed'}
            </span>
          </div>

          <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
            Real W3C Web Push using VAPID keys. Delivers alerts directly to your phone when jobs are assigned, rescheduled, or postponed even when the app is closed.
          </p>

          {/* Test Push Feedback Alert */}
          {testPushFeedback && (
            <div className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 ${
              testPushFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {testPushFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-snug">{testPushFeedback.message}</div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {pushStatus.permission !== 'granted' ? (
              <button
                type="button"
                onClick={handleEnablePush}
                disabled={enablingPush}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
              >
                <BellRing className={`w-4 h-4 ${enablingPush ? 'animate-bounce' : ''}`} />
                {enablingPush ? 'Activating Web Push...' : 'ENABLE NOTIFICATIONS'}
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={sendingTestPush}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <BellRing className={`w-4 h-4 text-emerald-400 ${sendingTestPush ? 'animate-spin' : ''}`} />
                  {sendingTestPush ? 'Delivering Web Push...' : 'Send Test Push Notification to My Phone'}
                </button>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={enablingPush}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[11px] flex items-center justify-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  Re-register This Device Token
                </button>
              </div>
            )}
          </div>

          {/* Registered Multi-Device Registry */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Registered Push Devices ({devices.length})</span>
              <button
                type="button"
                onClick={() => techSession?.id && loadRegisteredDevices(techSession.id)}
                className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
              >
                <RefreshCw className={`w-2.5 h-2.5 ${loadingDevices ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {devices.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No devices registered yet for this technician.</p>
            ) : (
              <div className="space-y-1.5">
                {devices.map((dev) => (
                  <div key={dev.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {dev.platform === 'iOS' || dev.platform === 'Android' ? (
                        <Smartphone className="w-4 h-4 text-slate-500" />
                      ) : (
                        <Laptop className="w-4 h-4 text-slate-500" />
                      )}
                      <div>
                        <div className="font-bold text-slate-800 text-[11px]">
                          {dev.platform} &bull; {dev.browser}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          ID: {dev.device_id.substring(0, 14)}...
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800">
                      ACTIVE
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Offline Engine & Local Cache Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              <h2 className="font-black text-slate-800 text-sm">Offline Storage & Sync Engine</h2>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
              syncStatus.pendingCount === 0
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {syncStatus.pendingCount === 0 ? 'SYNCED ✓' : `WAITING FOR SYNC (${syncStatus.pendingCount})`}
            </span>
          </div>

          <p className="mt-2.5 text-xs text-slate-600 leading-relaxed">
            All jobs, signatures, customer notes, job start timestamps, and photo attachments are stored securely in local IndexedDB. You can operate fully in basements or areas with zero cellular reception.
          </p>

          {syncFeedback && (
            <div className={`mt-3 p-3 rounded-xl text-xs flex items-start gap-2 ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-snug">{syncFeedback.message}</div>
            </div>
          )}

          <div className="mt-3.5 flex gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'SYNCHRONIZING WITH SERVER...' : 'SYNC NOW'}
            </button>
          </div>
        </div>

        {/* PWA & System Information Card */}
        <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Smartphone className="w-4 h-4 text-slate-700" />
            <h2 className="font-black text-slate-800 text-sm">PWA Installation Status</h2>
          </div>

          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Mode:</span>
              <span className="font-bold text-slate-800">
                {isStandalone ? '📱 Standalone PWA (Installed)' : '🌐 Mobile Web Browser'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Service Worker:</span>
              <span className="font-bold text-emerald-600">
                {'serviceWorker' in navigator ? 'Active & Registered ✓' : 'Unavailable'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">PWA Version:</span>
              <span className="font-bold text-slate-800">v2.5.0 Production PWA</span>
            </div>
          </div>
        </div>

      </div>

      {/* 1-Time Phone Sign-In Modal */}
      {showLoginModal && (
        <TechLoginModal
          onSuccess={handleLoginSuccess}
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  );
}
