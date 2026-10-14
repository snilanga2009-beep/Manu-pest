import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, Clock, CheckCircle2, AlertTriangle,
  PlayCircle, Phone, ArrowRight, User, MapPin, RefreshCw, Zap,
  Smartphone, Settings as SettingsIcon, Plus, Briefcase, UserPlus, Bell
} from 'lucide-react';
import { getDashboardStats, startJob, generateUpcomingJobs } from '../api';

export default function DashboardView({ onSelectJob, onNavigateToTab, onOpenAddCustomer }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [activeScheduleTab, setActiveScheduleTab] = useState('today');

  const loadData = async (date) => {
    setLoading(true);
    try {
      const res = await getDashboardStats(date);
      setData(res);
      if (!selectedDate && res.today) {
        setSelectedDate(res.today);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const handleStartJob = async (jobId, e) => {
    e.stopPropagation();
    try {
      await startJob(jobId);
      loadData(selectedDate);
    } catch (err) {
      alert(`Error starting job: ${err.message}`);
    }
  };

  const handleGenerateUpcoming = async () => {
    setGenLoading(true);
    try {
      const res = await generateUpcomingJobs(14);
      alert(res.message);
      loadData(selectedDate);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setGenLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-500 bg-white rounded-3xl border border-purple-100 p-12 shadow-sm">
        <RefreshCw className="w-8 h-8 animate-spin mb-3 text-[#6D28D9]" />
        <span className="font-black text-[#3B0764] text-sm tracking-wide">Loading Operations Control Dashboard...</span>
      </div>
    );
  }

  const counters = data?.counters || {};
  const stats = data?.today_stats || {};

  // Deterministic list and count resolution
  const todayJobsList = data?.today_jobs || [];
  const tomorrowJobsList = data?.tomorrow_jobs || [];
  const overdueJobsList = data?.overdue_jobs || [];
  const pendingJobsList = data?.pending_jobs || [];
  const completedJobsList = data?.completed_jobs || [];
  const postponedJobsList = data?.postponed_jobs || [];
  const unconfirmedJobsList = data?.unconfirmed_jobs || [];

  const todayCount = counters.today_jobs !== undefined ? counters.today_jobs : todayJobsList.length;
  const tomorrowCount = counters.tomorrow_jobs !== undefined ? counters.tomorrow_jobs : tomorrowJobsList.length;
  const overdueCount = counters.overdue_jobs !== undefined ? counters.overdue_jobs : overdueJobsList.length;
  const pendingCount = counters.pending_jobs !== undefined ? counters.pending_jobs : pendingJobsList.length;
  const completedCount = counters.completed_jobs !== undefined ? counters.completed_jobs : completedJobsList.length;
  const postponedCount = counters.postponed_jobs !== undefined ? counters.postponed_jobs : postponedJobsList.length;
  const unconfirmedCount = counters.unconfirmed_jobs !== undefined ? counters.unconfirmed_jobs : unconfirmedJobsList.length;

  return (
    <div className="w-full space-y-6 pb-16">

      {/* 1. TOP HERO BANNER - ROYAL PURPLE & VIBRANT ORANGE CURVED WAVE + PEST CONTROL MAN */}
      <div className="w-full bg-gradient-to-br from-[#5B21B6] via-[#4C1D95] to-[#2E1065] p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden text-white border border-purple-400/20">
        {/* Top Right Decorative Curved Orange Wave */}
        <div className="absolute top-0 right-0 w-96 h-44 pointer-events-none opacity-90">
          <svg viewBox="0 0 500 150" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M120,0 L500,0 L500,130 C360,140 240,40 120,0 Z"
              fill="url(#dashOrangeGrad)"
            />
            <defs>
              <linearGradient id="dashOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF8A00" />
                <stop offset="50%" stopColor="#F97316" />
                <stop offset="100%" stopColor="#EA580C" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Left Hero Content with Pest Control Man Character */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white p-1 border-3 border-orange-400 shadow-2xl shrink-0 overflow-hidden">
            <img
              src="/pest-tech-man.jpg"
              alt="Pest Control Specialist"
              className="w-full h-full object-cover rounded-xl"
              onError={(e) => {
                e.currentTarget.src = '/pest-login-bg.jpg';
              }}
            />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-300 text-[10px] font-black uppercase tracking-widest mb-2 border border-white/25 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span>Asia/Colombo (GMT+5:30) Live Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2 drop-shadow-xs">
              <span>Operations Control Dashboard</span>
            </h1>
            <p className="text-xs sm:text-sm text-purple-100 mt-1 max-w-2xl font-medium">
              Real-time pest control dispatching, automated technician assignments, SMS alerts and job scheduling.
            </p>
          </div>
        </div>

        {/* Right Controls: Date Picker, Add Customer, Auto-Generate */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white/95 border-2 border-orange-300 px-3.5 py-2.5 rounded-full text-xs font-semibold shadow-md">
            <CalendarIcon className="w-4 h-4 text-orange-500 shrink-0" />
            <input
              type="date"
              value={selectedDate || data?.today || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-[#3B0764] font-black focus:outline-hidden cursor-pointer"
            />
          </div>

          {selectedDate && selectedDate !== data?.today && (
            <button
              type="button"
              onClick={() => setSelectedDate(data?.today || '')}
              className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-black rounded-full border border-white/30 transition cursor-pointer"
              title="Return to today"
            >
              Today
            </button>
          )}

          {onOpenAddCustomer && (
            <button
              type="button"
              onClick={onOpenAddCustomer}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-purple-50 text-[#3B0764] text-xs font-black rounded-full border-2 border-white shadow-md transition transform active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-orange-500" />
              <span>+ Add Customer</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerateUpcoming}
            disabled={genLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#F97316] to-[#FF8A00] hover:from-[#EA580C] hover:to-[#F97316] text-white text-xs font-black rounded-full shadow-lg shadow-orange-950/30 transition transform active:scale-95 disabled:opacity-50 cursor-pointer border border-orange-300/50"
          >
            <Zap className={`w-4 h-4 ${genLoading ? 'animate-spin' : ''}`} />
            <span>{genLoading ? 'Generating...' : 'Auto-Generate Jobs'}</span>
          </button>
        </div>
      </div>

      {/* 2. AUTOMATION LIFECYCLE BANNER - WHITE CARD WITH PURPLE & ORANGE WAVE ACCENTS */}
      <div className="w-full bg-white p-6 rounded-3xl shadow-md border-2 border-purple-100 space-y-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-16 pointer-events-none opacity-85">
          <svg viewBox="0 0 200 100" preserveAspectRatio="none" className="w-full h-full">
            <path d="M50,0 L200,0 L200,85 C135,80 95,25 50,0 Z" fill="#FF8A00" opacity="0.18" />
          </svg>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-600 text-[11px] font-black uppercase tracking-wider mb-1.5 border border-orange-200">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
              Full Auto Operations Engine Active (No Excel Work Needed)
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-[#3B0764]">
              Automated Lifecycle: Customer → Recurring Engine → Technician App → Auto Next Job
            </h2>
          </div>

          {/* Quick Action Navigation Pill Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateToTab && onNavigateToTab('settings')}
              className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-[#4C1D95] font-black text-xs rounded-full border border-purple-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-orange-500" />
              <span>SMS Gateway Settings</span>
            </button>

            <button
              onClick={() => onNavigateToTab && onNavigateToTab('reminders')}
              className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-black text-xs rounded-full border border-orange-200 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-orange-600" />
              <span>Auto Reminders Queue</span>
            </button>

            <button
              onClick={() => onNavigateToTab && onNavigateToTab('settings')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-full border border-slate-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <SettingsIcon className="w-3.5 h-3.5 text-[#6D28D9]" />
              <span>Settings &amp; Users</span>
            </button>

            <button
              onClick={() => onNavigateToTab && onNavigateToTab('jobs')}
              className="px-4 py-2 bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] hover:from-[#3B0764] hover:to-[#5B21B6] text-white font-black text-xs rounded-full transition flex items-center gap-1.5 shadow-md shadow-purple-200 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-300" />
              <span>Manage Jobs</span>
            </button>
          </div>
        </div>

        {/* 5-step visual flow in Purple & Orange */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-purple-100 text-xs relative z-10">
          <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 hover:border-purple-300 transition">
            <span className="text-[10px] text-orange-600 font-black uppercase tracking-wider">Step 1</span>
            <div className="font-black text-[#3B0764] mt-0.5 text-sm">Customer &amp; Sites</div>
            <div className="text-[11px] text-slate-500">Stored in database</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 hover:border-purple-300 transition">
            <span className="text-[10px] text-orange-600 font-black uppercase tracking-wider">Step 2</span>
            <div className="font-black text-[#3B0764] mt-0.5 text-sm">Recurring Service</div>
            <div className="text-[11px] text-slate-500">Daily / Weekly / Monthly</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 hover:border-purple-300 transition">
            <span className="text-[10px] text-orange-600 font-black uppercase tracking-wider">Step 3</span>
            <div className="font-black text-[#3B0764] mt-0.5 text-sm">Auto Scheduling</div>
            <div className="text-[11px] text-slate-500">Deterministic generator</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 hover:border-purple-300 transition">
            <span className="text-[10px] text-orange-600 font-black uppercase tracking-wider">Step 4</span>
            <div className="font-black text-[#3B0764] mt-0.5 text-sm">Technician Mobile</div>
            <div className="text-[11px] text-slate-500">GPS Map, Call &amp; Sign</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-400 shadow-sm">
            <span className="text-[10px] text-orange-700 font-black uppercase tracking-wider">Step 5</span>
            <div className="font-black text-[#3B0764] mt-0.5 text-sm">Auto-Next Job</div>
            <div className="text-[11px] text-orange-700 font-bold">Zero manual effort!</div>
          </div>
        </div>
      </div>

      {/* 3. PRIMARY KPI COUNTERS (7 PURPLE & ORANGE CURVED CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">

        {/* 1. TODAY'S JOBS */}
        <div
          onClick={() => {
            setActiveScheduleTab('today');
            document.getElementById('dashboard-schedule-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden group shadow-md ${
            activeScheduleTab === 'today'
              ? 'bg-orange-50/90 border-2 border-[#F97316] ring-2 ring-orange-400/30'
              : 'bg-white border-2 border-orange-300 hover:border-[#F97316]'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#F97316] to-[#FF8A00]"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-orange-700 uppercase tracking-wider">Today's Jobs</span>
            <div className="w-7 h-7 rounded-xl bg-orange-100 text-orange-600 border border-orange-300 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#3B0764] mt-2 tracking-tight">{todayCount}</div>
          <div className="text-[10px] text-white font-black mt-1.5 bg-gradient-to-r from-[#F97316] to-[#FF8A00] px-2.5 py-0.5 rounded-full inline-block shadow-2xs">
            Scheduled Today
          </div>
        </div>

        {/* 2. TOMORROW'S JOBS */}
        <div
          onClick={() => {
            setActiveScheduleTab('tomorrow');
            document.getElementById('dashboard-schedule-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden group shadow-sm ${
            activeScheduleTab === 'tomorrow'
              ? 'bg-purple-50/90 border-2 border-[#6D28D9] ring-2 ring-purple-300/40 shadow-md'
              : 'bg-white border border-purple-200 hover:border-[#6D28D9]'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4C1D95] to-[#6D28D9]"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-[#4C1D95] uppercase tracking-wider">Tomorrow</span>
            <div className="w-7 h-7 rounded-xl bg-purple-100 text-[#6D28D9] border border-purple-200 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#3B0764] mt-2 tracking-tight">{tomorrowCount}</div>
          <div className="text-[10px] text-[#4C1D95] font-black mt-1.5 bg-purple-100 border border-purple-200 px-2.5 py-0.5 rounded-full inline-block">
            Upcoming Next
          </div>
        </div>

        {/* 3. PENDING JOBS */}
        <div
          onClick={() => {
            setActiveScheduleTab('pending');
            document.getElementById('dashboard-schedule-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden group shadow-sm ${
            activeScheduleTab === 'pending'
              ? 'bg-amber-50/90 border-2 border-amber-500 ring-2 ring-amber-400/40 shadow-md'
              : 'bg-white border border-purple-200 hover:border-amber-400'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Pending</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#3B0764] mt-2 tracking-tight">{pendingCount}</div>
          <div className="text-[10px] text-amber-800 font-black mt-1.5 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full inline-block">
            Action Required
          </div>
        </div>

        {/* 4. COMPLETED JOBS */}
        <div
          onClick={() => {
            setActiveScheduleTab('completed');
            document.getElementById('dashboard-schedule-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden group shadow-sm ${
            activeScheduleTab === 'completed'
              ? 'bg-emerald-50/90 border-2 border-emerald-500 ring-2 ring-emerald-400/40 shadow-md'
              : 'bg-white border border-purple-200 hover:border-emerald-400'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-emerald-500"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">Completed</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#3B0764] mt-2 tracking-tight">{completedCount}</div>
          <div className="text-[10px] text-emerald-800 font-black mt-1.5 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block">
            Total Finished
          </div>
        </div>

        {/* 5. OVERDUE ALERT */}
        <div
          onClick={() => {
            setActiveScheduleTab('overdue');
            document.getElementById('dashboard-schedule-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer relative overflow-hidden group shadow-md ${
            activeScheduleTab === 'overdue'
              ? 'bg-rose-50 border-2 border-rose-600 ring-2 ring-rose-400/40'
              : overdueCount > 0
              ? 'bg-rose-50/50 border-2 border-rose-400 hover:border-rose-600'
              : 'bg-white border-purple-200 hover:border-rose-400'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-rose-600"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span> Overdue
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-2xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-600 mt-2 tracking-tight">{overdueCount}</div>
          <div className="text-[10px] text-white font-black mt-1.5 bg-rose-600 px-2.5 py-0.5 rounded-full inline-block shadow-2xs">
            Needs Attention
          </div>
        </div>

        {/* 6. POSTPONED JOBS */}
        <div
          onClick={() => {
            setActiveScheduleTab('postponed');
            document.getElementById('dashboard-schedule-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden group shadow-sm ${
            activeScheduleTab === 'postponed'
              ? 'bg-purple-50/90 border-2 border-[#6D28D9] ring-2 ring-purple-400/40 shadow-md'
              : 'bg-white border border-purple-200 hover:border-[#6D28D9]'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#6D28D9]"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-[#4C1D95] uppercase tracking-wider">Postponed</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-[#6D28D9] border border-purple-200 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#3B0764] mt-2 tracking-tight">{postponedCount}</div>
          <div className="text-[10px] text-[#4C1D95] font-black mt-1.5 bg-purple-100 border border-purple-200 px-2.5 py-0.5 rounded-full inline-block">
            Rescheduled
          </div>
        </div>

        {/* 7. UNCONFIRMED JOBS */}
        <div
          onClick={() => {
            setActiveScheduleTab('unconfirmed');
            document.getElementById('dashboard-schedule-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 relative overflow-hidden group shadow-sm ${
            activeScheduleTab === 'unconfirmed'
              ? 'bg-orange-50/90 border-2 border-orange-500 ring-2 ring-orange-400/40 shadow-md'
              : 'bg-white border border-purple-200 hover:border-orange-400'
          }`}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-orange-500"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-orange-800 uppercase tracking-wider">Unconfirmed</span>
            <div className="w-7 h-7 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center">
              <Phone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-[#3B0764] mt-2 tracking-tight">{unconfirmedCount}</div>
          <div className="text-[10px] text-orange-800 font-black mt-1.5 bg-orange-100 border border-orange-200 px-2.5 py-0.5 rounded-full inline-block">
            SMS Sent
          </div>
        </div>

      </div>

      {/* 4. TODAY'S PROGRESS BAR */}
      <div className="w-full bg-white p-6 rounded-3xl border border-purple-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="font-black text-[#3B0764] text-sm sm:text-base flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
            <span>Today's Execution Progress ({selectedDate || data?.today})</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Completed: {stats.completed || 0}
            </span>
            <span className="bg-gradient-to-r from-[#F97316] to-[#FF8A00] text-white px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs font-black">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> In Progress: {stats.in_progress || 0}
            </span>
            <span className="bg-purple-50 text-[#4C1D95] border border-purple-200 px-3 py-1 rounded-full flex items-center gap-1.5 font-black">
              <span className="w-2 h-2 rounded-full bg-[#6D28D9]"></span> Pending: {stats.pending || 0}
            </span>
          </div>
        </div>

        {/* Multi-segment progress bar */}
        <div className="w-full h-3.5 bg-purple-50 border border-purple-100 rounded-full overflow-hidden flex p-0.5 shadow-inner">
          {stats.total > 0 ? (
            <>
              <div
                style={{ width: `${((stats.completed || 0) / stats.total) * 100}%` }}
                className="bg-emerald-500 rounded-l-full transition-all duration-500 shadow-2xs"
                title={`Completed: ${stats.completed || 0}`}
              ></div>
              <div
                style={{ width: `${((stats.in_progress || 0) / stats.total) * 100}%` }}
                className="bg-gradient-to-r from-[#F97316] to-[#FF8A00] transition-all duration-500 shadow-2xs"
                title={`In Progress: ${stats.in_progress || 0}`}
              ></div>
              <div
                style={{ width: `${((stats.postponed || 0) / stats.total) * 100}%` }}
                className="bg-[#6D28D9] rounded-r-full transition-all duration-500 shadow-2xs"
                title={`Postponed: ${stats.postponed || 0}`}
              ></div>
            </>
          ) : (
            <div className="w-full bg-purple-100/60 rounded-full"></div>
          )}
        </div>
      </div>

      {/* 5. LIVE OPERATIONS SCHEDULE & RESULTS TABLE */}
      <div id="dashboard-schedule-section" className="w-full bg-white rounded-3xl border-2 border-purple-100 shadow-md overflow-hidden">
        {/* Table Tab Selector Header with all 7 statuses */}
        <div className="p-4 sm:p-5 border-b border-purple-100 bg-purple-50/30 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* 1. TODAY TAB */}
            <button
              type="button"
              onClick={() => setActiveScheduleTab('today')}
              className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeScheduleTab === 'today'
                  ? 'bg-gradient-to-r from-[#F97316] to-[#FF8A00] text-white shadow-md shadow-orange-200'
                  : 'bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-purple-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Today</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeScheduleTab === 'today' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-800'
              }`}>
                {todayCount}
              </span>
            </button>

            {/* 2. TOMORROW TAB */}
            <button
              type="button"
              onClick={() => setActiveScheduleTab('tomorrow')}
              className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeScheduleTab === 'tomorrow'
                  ? 'bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] text-white shadow-md shadow-purple-200'
                  : 'bg-white hover:bg-purple-50 text-slate-700 hover:text-[#4C1D95] border border-purple-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Tomorrow</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeScheduleTab === 'tomorrow' ? 'bg-white text-[#4C1D95]' : 'bg-purple-100 text-purple-800'
              }`}>
                {tomorrowCount}
              </span>
            </button>

            {/* 3. PENDING TAB */}
            <button
              type="button"
              onClick={() => setActiveScheduleTab('pending')}
              className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeScheduleTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                  : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-purple-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeScheduleTab === 'pending' ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-800'
              }`}>
                {pendingCount}
              </span>
            </button>

            {/* 4. OVERDUE TAB */}
            <button
              type="button"
              onClick={() => setActiveScheduleTab('overdue')}
              className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeScheduleTab === 'overdue'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-300'
                  : overdueCount > 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100'
                  : 'bg-white hover:bg-rose-50 text-slate-700 border border-purple-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Overdue</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeScheduleTab === 'overdue' ? 'bg-white text-rose-600' : 'bg-rose-600 text-white'
              }`}>
                {overdueCount}
              </span>
            </button>

            {/* 5. POSTPONED TAB */}
            <button
              type="button"
              onClick={() => setActiveScheduleTab('postponed')}
              className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeScheduleTab === 'postponed'
                  ? 'bg-[#6D28D9] text-white shadow-md shadow-purple-200'
                  : 'bg-white hover:bg-purple-50 text-slate-700 hover:text-[#4C1D95] border border-purple-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Postponed</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeScheduleTab === 'postponed' ? 'bg-white text-[#6D28D9]' : 'bg-purple-100 text-purple-800'
              }`}>
                {postponedCount}
              </span>
            </button>

            {/* 6. UNCONFIRMED TAB */}
            <button
              type="button"
              onClick={() => setActiveScheduleTab('unconfirmed')}
              className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeScheduleTab === 'unconfirmed'
                  ? 'bg-orange-600 text-white shadow-md shadow-orange-200'
                  : 'bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-purple-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Unconfirmed</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeScheduleTab === 'unconfirmed' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-800'
              }`}>
                {unconfirmedCount}
              </span>
            </button>

            {/* 7. COMPLETED TAB */}
            <button
              type="button"
              onClick={() => setActiveScheduleTab('completed')}
              className={`px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeScheduleTab === 'completed'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-purple-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completed</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeScheduleTab === 'completed' ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {completedCount}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                let filterCode = '';
                if (activeScheduleTab === 'pending') filterCode = 'PENDING';
                else if (activeScheduleTab === 'overdue') filterCode = 'OVERDUE';
                else if (activeScheduleTab === 'completed') filterCode = 'COMPLETED';
                else if (activeScheduleTab === 'postponed') filterCode = 'POSTPONED';
                else if (activeScheduleTab === 'unconfirmed') filterCode = 'UNCONFIRMED';

                if (activeScheduleTab === 'unconfirmed') {
                  onNavigateToTab && onNavigateToTab('reminders');
                } else {
                  onNavigateToTab && onNavigateToTab('jobs', { status: filterCode });
                }
              }}
              className="text-xs font-black text-[#4C1D95] hover:text-white bg-purple-50 hover:bg-[#6D28D9] px-4 py-2 rounded-full border border-purple-200 flex items-center gap-1.5 transition cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
            >
              <span>Open Full {activeScheduleTab.toUpperCase()} List in Jobs &rarr;</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Schedule List Content */}
        {(() => {
          let currentList = todayJobsList;
          let activeDateLabel = `Today (${selectedDate || data?.today})`;
          let emptyMessage = `No jobs scheduled for today (${selectedDate || data?.today})`;

          if (activeScheduleTab === 'tomorrow') {
            currentList = tomorrowJobsList;
            activeDateLabel = `Tomorrow (${data?.tomorrow})`;
            emptyMessage = `No jobs scheduled for tomorrow (${data?.tomorrow})`;
          } else if (activeScheduleTab === 'pending') {
            currentList = pendingJobsList;
            activeDateLabel = 'Pending Jobs (Action Required)';
            emptyMessage = 'No pending jobs found. All current jobs are completed or up to date!';
          } else if (activeScheduleTab === 'completed') {
            currentList = completedJobsList;
            activeDateLabel = 'Completed Jobs';
            emptyMessage = 'No completed jobs logged yet.';
          } else if (activeScheduleTab === 'overdue') {
            currentList = overdueJobsList;
            activeDateLabel = 'Overdue Jobs (Immediate Attention)';
            emptyMessage = 'Great! No overdue jobs found. All jobs are on track.';
          } else if (activeScheduleTab === 'postponed') {
            currentList = postponedJobsList;
            activeDateLabel = 'Postponed / Rescheduled Jobs';
            emptyMessage = 'No postponed jobs found.';
          } else if (activeScheduleTab === 'unconfirmed') {
            currentList = unconfirmedJobsList;
            activeDateLabel = 'Unconfirmed Customer Jobs (Awaiting SMS Reply)';
            emptyMessage = 'All upcoming customers have confirmed their service appointments!';
          }

          if (currentList.length === 0) {
            return (
              <div className="p-16 text-center text-slate-500">
                <Clock className="w-10 h-10 mx-auto mb-3 text-purple-300" />
                <div className="text-base font-black text-[#3B0764]">{emptyMessage}</div>
                <p className="text-xs text-slate-500 mt-1">Status: {activeDateLabel}</p>
                <div className="mt-4">
                  <button
                    onClick={handleGenerateUpcoming}
                    className="text-xs px-5 py-2.5 bg-gradient-to-r from-[#F97316] to-[#FF8A00] hover:from-[#EA580C] hover:to-[#F97316] text-white font-black rounded-full transition cursor-pointer shadow-md shadow-orange-200"
                  >
                    Auto-Generate From Recurring Schedule
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gradient-to-r from-[#3B0764] via-[#4C1D95] to-[#5B21B6] text-white font-black uppercase text-[10px] tracking-wider border-b-2 border-orange-400">
                  <tr>
                    <th className="px-5 py-3.5">Date &amp; Time</th>
                    <th className="px-5 py-3.5">Customer &amp; Location</th>
                    <th className="px-5 py-3.5">Treatment</th>
                    <th className="px-5 py-3.5">Technician</th>
                    <th className="px-5 py-3.5">Status &amp; Notes</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-100">
                  {currentList.map(job => (
                    <tr
                      key={job.id}
                      onClick={() => onSelectJob(job.id)}
                      className="hover:bg-purple-50/50 cursor-pointer transition"
                    >
                      {/* Date & Time */}
                      <td className="px-5 py-4 font-black text-[#3B0764] whitespace-nowrap">
                        {activeScheduleTab !== 'today' && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold mb-0.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                            <span>{job.scheduled_date}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-sm">
                          <Clock className="w-3.5 h-3.5 text-orange-500" />
                          <span>{job.scheduled_time || '09:00'}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5 ml-5">{job.duration_minutes || 60} mins</div>
                      </td>

                      {/* Customer & Location */}
                      <td className="px-5 py-4">
                        <div className="font-black text-[#3B0764] text-sm hover:text-orange-600 transition">{job.customer_name}</div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 font-medium">
                          <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                          <span className="truncate max-w-xs">{job.location_name || job.location_address || 'Main Location'}</span>
                        </div>
                      </td>

                      {/* Treatment */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-full text-xs font-black inline-block bg-orange-50 text-orange-700 border border-orange-200">
                          {job.treatment_code || job.treatment_name || 'PEST'}
                        </span>
                      </td>

                      {/* Technician */}
                      <td className="px-5 py-4 whitespace-nowrap text-slate-800">
                        {job.technician_name ? (
                          <div className="flex items-center gap-2 font-bold">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#4C1D95] to-[#F97316] text-white text-[10px] font-black flex items-center justify-center shadow-2xs">
                              {job.technician_name.charAt(0).toUpperCase()}
                            </div>
                            <span>{job.technician_name}</span>
                          </div>
                        ) : (
                          <span className="text-orange-700 font-black italic text-[11px] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Status & Reschedule details */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-black tracking-wide ${
                          job.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                          job.status === 'IN_PROGRESS' ? 'bg-gradient-to-r from-[#F97316] to-[#FF8A00] text-white animate-pulse shadow-2xs' :
                          job.status === 'POSTPONED' ? 'bg-purple-100 text-[#4C1D95] border border-purple-300' :
                          'bg-slate-100 text-slate-800 border border-slate-300'
                        }`}>
                          {job.status}
                        </span>

                        {job.status === 'POSTPONED' && (job.postponed_to_date || job.rescheduled_date) && (
                          <div className="text-[10px] text-[#6D28D9] font-bold mt-1">
                            Rescheduled: {job.postponed_to_date || job.rescheduled_date}
                          </div>
                        )}

                        {job.customer_confirmation_status === 'UNCONFIRMED' && (
                          <div className="text-[10px] text-orange-600 font-bold mt-1">
                            ⚠️ Awaiting Customer SMS Reply
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap space-x-2">
                        {job.customer_phone && (
                          <a
                            href={`tel:${job.customer_phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 bg-purple-50 hover:bg-purple-100 text-[#6D28D9] border border-purple-200 rounded-full inline-flex items-center transition shadow-2xs"
                            title="Call Customer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {job.status === 'TO_BE_DONE' || job.status === 'ASSIGNED' ? (
                          <button
                            onClick={(e) => handleStartJob(job.id, e)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-[#F97316] to-[#FF8A00] hover:from-[#EA580C] hover:to-[#F97316] text-white font-black rounded-full text-xs inline-flex items-center gap-1.5 transition shadow-sm shadow-orange-200 cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5" /> Start
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
