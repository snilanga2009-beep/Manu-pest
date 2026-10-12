import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Users, Calendar, Briefcase,
  FileSpreadsheet, BarChart3, Settings, ShieldCheck,
  CheckCircle, Clock, AlertTriangle, Bell, BellRing, Smartphone,
  Zap, ChevronRight, UserPlus, Database, LogOut
} from 'lucide-react';
import { getSmsSettings } from '../api';
import { getSavedBranding, fetchServerBranding, PresetLogoIcon } from './BrandingSettingsModal';

export default function Sidebar({ activeTab, onTabChange, counters = {}, onOpenAddCustomer, currentUser, onLogout, onSwitchUser }) {
  const [branding, setBranding] = useState(getSavedBranding());
  const [smsGatewayInfo, setSmsGatewayInfo] = useState({ provider: 'TEXT_LK', is_active: 1, is_simulation: 1 });

  useEffect(() => {
    fetchServerBranding().then(b => { if (b) setBranding(b); });
    const handleBrandingChange = (e) => setBranding(e.detail || getSavedBranding());
    window.addEventListener('branding-updated', handleBrandingChange);
    return () => window.removeEventListener('branding-updated', handleBrandingChange);
  }, []);

  useEffect(() => {
    getSmsSettings()
      .then(res => {
        if (res.success && res.settings) {
          setSmsGatewayInfo({
            provider: res.settings.provider || 'TEXT_LK',
            is_active: res.settings.is_active,
            is_simulation: res.settings.is_simulation
          });
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      color: 'purple',
      activeGradient: 'from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] shadow-purple-300',
      iconBg: 'bg-purple-50 text-[#6D28D9]',
      description: 'Overview & KPIs'
    },
    {
      id: 'jobs',
      label: 'Jobs & Operations',
      icon: Briefcase,
      badge: counters.today_jobs,
      badgeColor: 'bg-[#F97316] text-white',
      color: 'orange',
      activeGradient: 'from-[#F97316] to-[#EA580C] shadow-orange-200',
      iconBg: 'bg-orange-50 text-orange-600',
      description: 'Daily schedules'
    },
    {
      id: 'reminders',
      label: 'Auto Reminders',
      icon: Bell,
      badge: counters.unconfirmed_jobs ? `${counters.unconfirmed_jobs} alert` : undefined,
      badgeColor: 'bg-purple-600 text-white',
      color: 'purple',
      activeGradient: 'from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] shadow-purple-200',
      iconBg: 'bg-purple-50 text-[#6D28D9]',
      description: 'SMS & WhatsApp'
    },
    {
      id: 'calendar',
      label: 'Schedule Calendar',
      icon: Calendar,
      color: 'orange',
      activeGradient: 'from-[#F97316] to-[#FF8A00] shadow-orange-200',
      iconBg: 'bg-orange-50 text-orange-600',
      description: 'Master timeline'
    },
    {
      id: 'customers',
      label: 'Customers & CRM',
      icon: Users,
      color: 'purple',
      activeGradient: 'from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] shadow-purple-200',
      iconBg: 'bg-purple-50 text-[#6D28D9]',
      description: 'Clients & Sites'
    },
    {
      id: 'reports',
      label: 'Reports & Export',
      icon: BarChart3,
      color: 'orange',
      activeGradient: 'from-[#F97316] to-[#EA580C] shadow-orange-200',
      iconBg: 'bg-orange-50 text-orange-600',
      description: 'Analytics & PDF'
    },
    {
      id: 'backup',
      label: 'Database Backup',
      icon: Database,
      badge: 'Monthly',
      badgeColor: 'bg-purple-100 text-purple-800 border border-purple-200',
      color: 'purple',
      activeGradient: 'from-[#4C1D95] to-[#6D28D9] shadow-purple-200',
      iconBg: 'bg-purple-50 text-[#6D28D9]',
      description: 'Monthly auto-archives'
    },
    {
      id: 'push_settings',
      label: 'Firebase Push Alerts',
      icon: BellRing,
      badge: 'FCM / Push',
      badgeColor: 'bg-orange-100 text-orange-700 border border-orange-200',
      color: 'orange',
      activeGradient: 'from-[#F97316] to-[#EA580C] shadow-orange-200',
      iconBg: 'bg-orange-50 text-orange-600',
      description: 'Firebase & Web Push'
    },
    {
      id: 'settings',
      label: 'Settings & Gateway',
      icon: Settings,
      badge: 'SMS + Users',
      badgeColor: 'bg-purple-100 text-purple-800 border border-purple-200',
      color: 'purple',
      activeGradient: 'from-[#4C1D95] via-[#5B21B6] to-[#6D28D9] shadow-purple-200',
      iconBg: 'bg-purple-50 text-[#6D28D9]',
      description: 'Gateways, Staff & Setup'
    },
  ];

  return (
    <aside className="w-68 bg-white border-r border-purple-100 flex flex-col shrink-0 min-h-[calc(100vh-4rem)] select-none shadow-xs">

      {/* Top Purple & Orange Curved Wave Hero Mini-Card with Pest Control Man */}
      <div className="mx-3.5 mt-3.5 p-3.5 rounded-3xl bg-gradient-to-br from-[#5B21B6] via-[#4C1D95] to-[#2E1065] text-white relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 w-28 h-16 pointer-events-none opacity-90">
          <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="w-full h-full">
            <path d="M30,0 L200,0 L200,90 C130,85 85,25 30,0 Z" fill="#FF8A00" />
          </svg>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white p-0.5 border-2 border-orange-400 shadow-md shrink-0 overflow-hidden">
            <img
              src="/pest-tech-man.jpg"
              alt="Pest Control"
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500 text-white mb-0.5">
              PEST CONTROL
            </span>
            <div className="text-xs font-black text-white truncate">
              {branding.name || 'Operations Control'}
            </div>
            <div className="text-[10px] text-purple-200 font-semibold truncate">
              Master Command Center
            </div>
          </div>
        </div>

        {/* Quick Add Customer Pill Button inside Hero Card */}
        <button
          onClick={onOpenAddCustomer}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-full bg-gradient-to-r from-[#F97316] to-[#FF8A00] hover:from-[#EA580C] hover:to-[#F97316] text-white text-xs font-black shadow-md shadow-orange-950/30 transition transform active:scale-95 group cursor-pointer"
        >
          <UserPlus className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span>+ Add New Customer</span>
        </button>
      </div>

      {/* Navigation List */}
      <div className="p-3.5 flex-1 space-y-1.5 pt-2">
        <div className="px-3 pt-1 pb-1 flex items-center justify-between text-[10px] font-black text-purple-900/60 uppercase tracking-wider">
          <span className="truncate max-w-[140px] text-[#3B0764] font-black">Control Menu</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-[#6D28D9] font-mono font-bold border border-purple-100">v2026</span>
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-semibold transition-all duration-200 group text-left cursor-pointer ${
                isActive
                  ? `bg-gradient-to-r ${item.activeGradient} text-white shadow-md font-bold scale-[1.01]`
                  : 'text-slate-700 hover:bg-purple-50/70 hover:text-[#3B0764]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white backdrop-blur-xs'
                      : `${item.iconBg} shadow-2xs`
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate leading-tight text-xs font-black">{item.label}</div>
                  <div className={`text-[10px] truncate ${isActive ? 'text-white/85' : 'text-slate-400'}`}>
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black shrink-0 ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : item.badgeColor || 'bg-purple-100 text-purple-800'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sri Lanka SMS Gateway Live Indicator Card */}
      <div className="px-3.5 pb-2">
        <div
          onClick={() => onTabChange('settings')}
          className="p-3 rounded-2xl bg-gradient-to-br from-purple-50 via-white to-orange-50/60 border border-purple-200 hover:border-orange-400 transition cursor-pointer shadow-2xs group"
        >
          <div className="flex items-center justify-between text-[11px] font-black text-[#3B0764] mb-1.5">
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-orange-500" /> Sri Lanka SMS Gateway
            </span>
            <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {smsGatewayInfo.is_simulation ? 'Simulation' : 'Live'}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span className="font-mono text-[#6D28D9] font-black">
              {smsGatewayInfo.provider === 'TEXT_LK' ? 'Text.lk (REST v3)' : smsGatewayInfo.provider}
            </span>
            <span className="text-[10px] text-orange-600 group-hover:translate-x-0.5 transition font-black flex items-center">
              Configure <ChevronRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* Live Operations Status Panel */}
      <div className="p-3.5 border border-purple-100 bg-purple-50/40 m-3 rounded-2xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-[#3B0764] uppercase tracking-wider">
            Live Daily Status
          </span>
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-200">
            <div className="text-sm font-black text-orange-600">{counters.today_jobs || 0}</div>
            <div className="text-[9px] font-black text-orange-700 uppercase">Today</div>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-200">
            <div className="text-sm font-black text-[#6D28D9]">{counters.overdue_jobs || 0}</div>
            <div className="text-[9px] font-black text-[#4C1D95] uppercase">Overdue</div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-200">
            <div className="text-sm font-black text-emerald-700">{counters.completed_jobs || 0}</div>
            <div className="text-[9px] font-black text-emerald-600 uppercase">Done</div>
          </div>
        </div>
      </div>

      {/* Current User Profile & Sign Out Action Card */}
      {currentUser && (
        <div className="px-3.5 pb-3">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-orange-50/40 border border-purple-200 shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs bg-gradient-to-tr from-[#4C1D95] to-[#F97316]">
                🛡️
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-[#3B0764] truncate leading-tight">
                  {currentUser.full_name}
                </div>
                <div className="text-[9px] font-black uppercase tracking-wider text-orange-600">
                  Operations Control Dashboard
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1">
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out to Login Page"
                  className="w-full py-2 px-3 rounded-full bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] hover:from-[#3B0764] hover:to-[#5B21B6] text-white text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <LogOut className="w-3 h-3 text-orange-300" />
                  <span>Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </aside>
  );
}
