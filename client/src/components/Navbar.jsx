import React, { useState, useEffect, useRef } from 'react';
import {
  Search, Bell, Smartphone, Monitor, Zap,
  UserCheck, Shield, ChevronDown, CheckCircle2,
  Calendar, MapPin, Phone, AlertCircle, UserPlus,
  Edit3, Sparkles, Building, LogOut, User
} from 'lucide-react';
import { globalSearch, runDailyAutomation, getNotifications, markAllNotificationsRead } from '../api';
import BrandingSettingsModal, { getSavedBranding, fetchServerBranding, PresetLogoIcon } from './BrandingSettingsModal';

export default function Navbar({
  currentRole,
  onRoleChange,
  isMobileView,
  onToggleMobileView,
  onSelectCustomer,
  onSelectJob,
  onRefreshDashboard,
  onOpenAddCustomer,
  currentUser,
  onLogout,
  onSwitchUser
}) {
  const [branding, setBranding] = useState(getSavedBranding());
  const [showBrandingModal, setShowBrandingModal] = useState(false);

  useEffect(() => {
    fetchServerBranding().then(b => { if (b) setBranding(b); });
    const handleBrandingChange = (e) => setBranding(e.detail || getSavedBranding());
    window.addEventListener('branding-updated', handleBrandingChange);
    return () => window.removeEventListener('branding-updated', handleBrandingChange);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationMessage, setAutomationMessage] = useState(null);

  const searchRef = useRef(null);
  const notifRef = useRef(null);

  // Load notifications
  const loadNotifications = async () => {
    try {
      const res = await getNotifications({ role: currentRole });
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentRole]);

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await globalSearch(searchQuery);
        setSearchResults(res.results);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRunAutomation = async () => {
    setAutomationLoading(true);
    setAutomationMessage(null);
    try {
      const res = await runDailyAutomation();
      setAutomationMessage(`Automation complete: ${res.result.generatedJobsCount} jobs created, ${res.result.overdueJobsCount} overdue flagged.`);
      if (onRefreshDashboard) onRefreshDashboard();
      loadNotifications();
      setTimeout(() => setAutomationMessage(null), 5000);
    } catch (err) {
      setAutomationMessage(`Error: ${err.message}`);
    } finally {
      setAutomationLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    loadNotifications();
  };

  const roles = [
    { id: 'ADMIN', label: 'Admin (All Access)' },
    { id: 'MANAGER', label: 'Operations Manager' },
    { id: 'SUPERVISOR', label: 'Field Supervisor' },
    { id: 'TECHNICIAN', label: 'Technician View' },
    { id: 'SALESMAN', label: 'Salesman View' }
  ];

  return (
    <header className="bg-gradient-to-r from-[#3B0764] via-[#4C1D95] to-[#2E1065] border-b border-purple-800/60 sticky top-0 z-30 shadow-lg relative">
      {/* Top Vibrant Orange Accent Line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#FF8A00] via-[#F97316] to-[#A855F7]" />

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">

          {/* Left Brand - Company Logo, Pest Control Man Avatar & Heading Name */}
          <div
            onClick={() => setShowBrandingModal(true)}
            className="flex items-center gap-3 cursor-pointer group p-1 -ml-1 rounded-2xl hover:bg-white/10 transition"
            title="Click to customize Company Name & Logo"
          >
            <div className="w-11 h-11 rounded-2xl bg-white border-2 border-orange-400 shadow-md flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-all p-0.5 relative">
              {branding.logoType === 'custom' && branding.customLogoUrl ? (
                <img src={branding.customLogoUrl} alt="Logo" className="w-full h-full object-contain rounded-xl" />
              ) : (
                <img
                  src="/pest-tech-man.jpg"
                  alt="Pest Control"
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition shadow">
                <Edit3 className="w-2.5 h-2.5" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white tracking-tight text-base sm:text-lg flex items-center gap-1.5 leading-tight group-hover:text-amber-300 transition">
                  {branding.name || 'Ceylon Pest Solutions'}
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-gradient-to-r from-[#F97316] to-[#FF8A00] text-white font-black uppercase shrink-0 shadow-xs">
                  SL v2026
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-purple-200 font-semibold">
                <span className="text-amber-300 font-bold truncate max-w-[200px]">
                  {branding.subheading || 'Master Operations Suite'}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1 text-purple-100">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  <span>Colombo</span>
                </span>
              </div>
            </div>
          </div>

          {/* Center Global Search */}
          <div className="hidden md:block flex-1 max-w-md lg:max-w-lg relative" ref={searchRef}>
            <div className="relative">
              <Search className="w-4 h-4 text-purple-200 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim() && setShowSearchDropdown(true)}
                placeholder="Global Search (Customer, Phone, Location, Job ID)..."
                className="w-full bg-white/15 hover:bg-white/20 focus:bg-white text-white focus:text-slate-900 placeholder:text-purple-200 focus:placeholder:text-slate-400 text-xs sm:text-sm pl-10 pr-4 py-2 rounded-full border border-white/20 focus:border-orange-400 focus:outline-hidden transition font-semibold"
              />
            </div>

            {/* Instant Search Dropdown */}
            {showSearchDropdown && searchResults && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-purple-100 max-h-96 overflow-y-auto z-50 p-2 text-xs">
                {searchResults.customers?.length > 0 && (
                  <div className="mb-2">
                    <div className="px-3 py-1 font-black text-purple-700 uppercase text-[10px] tracking-wider">Customers</div>
                    {searchResults.customers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          if (onSelectCustomer) onSelectCustomer(c.id);
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-purple-50 flex items-center justify-between text-slate-800 transition cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <div className="text-[11px] text-slate-500">{c.location || 'No location'} &bull; {c.phone || 'No phone'}</div>
                        </div>
                        <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-mono font-bold">{c.customer_code}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.jobs?.length > 0 && (
                  <div className="mb-2">
                    <div className="px-3 py-1 font-black text-orange-600 uppercase text-[10px] tracking-wider">Jobs</div>
                    {searchResults.jobs.map(j => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => {
                          if (onSelectJob) onSelectJob(j.id);
                          setShowSearchDropdown(false);
                          setSearchQuery('');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-orange-50 flex items-center justify-between text-slate-800 transition cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{j.job_code} &bull; <span className="font-black">{j.customer_name}</span></div>
                          <div className="text-[11px] text-slate-500">{j.scheduled_date} &bull; {j.treatment_code}</div>
                        </div>
                        <span className="text-[10px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md font-bold">{j.status}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.customers?.length === 0 && searchResults.jobs?.length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Icons & Role Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Global Add Customer Button */}
            {!isMobileView && onOpenAddCustomer && (
              <button
                onClick={onOpenAddCustomer}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#F97316] to-[#FF8A00] hover:from-[#EA580C] hover:to-[#F97316] text-white text-xs font-black rounded-full shadow-md shadow-orange-500/25 transition transform active:scale-95 cursor-pointer"
                title="Add New Customer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">+ Add Customer</span>
              </button>
            )}

            {/* Run Daily Automation Trigger */}
            {!isMobileView && (
              <button
                onClick={handleRunAutomation}
                disabled={automationLoading}
                title="Run Daily Recurring Engine & Check Overdue Jobs"
                className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-full border border-white/20 transition cursor-pointer"
              >
                <Zap className={`w-3.5 h-3.5 ${automationLoading ? 'animate-spin text-amber-300' : 'text-amber-300'}`} />
                <span>{automationLoading ? 'Processing...' : 'Run Automation'}</span>
              </button>
            )}

            {/* View Mode Toggle: Desktop <-> Mobile */}
            <button
              onClick={onToggleMobileView}
              title={isMobileView ? "Switch to Desktop Admin Portal" : "Switch to Mobile Technician App View"}
              className={`flex items-center gap-1 sm:gap-1.5 px-3 py-2 text-xs font-black rounded-full border transition cursor-pointer ${
                isMobileView
                  ? 'bg-gradient-to-r from-[#F97316] to-[#FF8A00] text-white border-orange-400 shadow-sm'
                  : 'bg-white/15 hover:bg-white/25 text-white border-white/25'
              }`}
            >
              {isMobileView ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5 text-amber-300" />}
              <span className="hidden sm:inline">{isMobileView ? 'Desktop Admin' : 'Technician App'}</span>
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 rounded-full text-purple-100 hover:text-white hover:bg-white/15 transition cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-pulse border border-purple-900">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-purple-100 p-3 z-50 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-black text-[#3B0764]">Notifications ({unreadCount} new)</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-orange-600 hover:underline text-[11px] font-bold">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto mt-2 space-y-2">
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-slate-400">No notifications</div>
                    ) : (
                      notifications.slice(0, 10).map(n => (
                        <div key={n.id} className={`p-2.5 rounded-xl border ${n.is_read ? 'bg-slate-50 border-slate-100' : 'bg-purple-50/70 border-purple-200'} transition`}>
                          <div className="font-bold text-slate-900">{n.title}</div>
                          <div className="text-[11px] text-slate-600 mt-0.5">{n.message}</div>
                          <div className="text-[9px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Badge & Sign Out */}
            {currentUser && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 text-xs text-white">
                  <span className="text-sm">🛡️</span>
                  <span className="font-black text-white">{currentUser.full_name}</span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-[#F97316] to-[#FF8A00] text-white shadow-2xs">
                    Operations Control
                  </span>
                </div>

                {/* Prominent Sign Out Pill Button */}
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out to Login Page"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-black text-xs transition shadow-md cursor-pointer active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Automation message toast */}
        {automationMessage && (
          <div className="py-2 px-3 bg-orange-500 text-white text-xs font-bold flex items-center gap-2 rounded-t-xl">
            <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
            <span>{automationMessage}</span>
          </div>
        )}
      </div>

      {/* Company Branding & Logo Settings Modal */}
      <BrandingSettingsModal
        isOpen={showBrandingModal}
        onClose={() => setShowBrandingModal(false)}
      />
    </header>
  );
}
