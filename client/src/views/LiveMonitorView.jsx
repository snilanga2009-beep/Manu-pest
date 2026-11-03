import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity, Play, CheckCircle2, Clock, MapPin, Calendar,
  User, Phone, Navigation, RefreshCw, Search, X, HardHat,
  Users, Truck, Wrench, Timer, Eye, PenTool, Sparkles,
  AlertCircle, Briefcase, ArrowUpRight, Check, Download,
  Printer, Share2, MessageSquare, Filter
} from 'lucide-react';
import { getJobs, getJobById, getStaff } from '../api';
import {
  downloadJobPdfReport,
  printJobReport,
  shareJobOnWhatsApp
} from '../utils/jobExportUtils';

function getColomboTodayStr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function formatDateTimeDisplay(isoOrStr) {
  if (!isoOrStr) return '—';
  const d = new Date(isoOrStr);
  if (isNaN(d.getTime())) return String(isoOrStr);
  const datePart = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
  const timePart = d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  return `${datePart} • ${timePart}`;
}

function formatTimeOnlyDisplay(isoOrDate) {
  if (!isoOrDate) return '—';
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (isNaN(d.getTime())) return String(isoOrDate);
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

function formatElapsedHms(startIso, endMsOrIso) {
  if (!startIso) return '00:00:00';
  const startMs = new Date(startIso).getTime();
  const endMs = typeof endMsOrIso === 'number' ? endMsOrIso : new Date(endMsOrIso || Date.now()).getTime();
  if (isNaN(startMs) || isNaN(endMs)) return '00:00:00';
  const totalSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const secs = String(totalSec % 60).padStart(2, '0');
  return `${hrs}:${mins}:${secs}`;
}

function formatDurationHuman(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) return null;
  const totalSec = Math.max(1, Math.floor((endMs - startMs) / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function calculateProgressInfo(job, nowTick) {
  const durationMins = Number(job?.duration_minutes) || 60;
  const plannedSeconds = Math.max(60, durationMins * 60);

  if (job?.status === 'COMPLETED') {
    const startMs = job.actual_start_time ? new Date(job.actual_start_time).getTime() : NaN;
    const endMs = (job.actual_end_time || job.completed_at) ? new Date(job.actual_end_time || job.completed_at).getTime() : NaN;
    const elapsedSec = (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs)
      ? Math.max(1, Math.floor((endMs - startMs) / 1000))
      : plannedSeconds;
    return {
      percent: 100,
      rawPercent: Math.round((elapsedSec / plannedSeconds) * 100),
      elapsedSec,
      plannedSeconds,
      isOvertime: elapsedSec > plannedSeconds,
      targetFinishDate: !isNaN(startMs) ? new Date(startMs + plannedSeconds * 1000) : null
    };
  }

  if (job?.status === 'IN_PROGRESS') {
    const startIso = job.actual_start_time || job.updated_at || new Date().toISOString();
    const startMs = new Date(startIso).getTime();
    const elapsedSec = !isNaN(startMs) ? Math.max(0, Math.floor((nowTick - startMs) / 1000)) : 0;
    const rawPercent = Math.round((elapsedSec / plannedSeconds) * 100);
    const clampedPercent = Math.min(100, Math.max(4, rawPercent));
    return {
      percent: clampedPercent,
      rawPercent,
      elapsedSec,
      plannedSeconds,
      isOvertime: elapsedSec > plannedSeconds,
      targetFinishDate: !isNaN(startMs) ? new Date(startMs + plannedSeconds * 1000) : null
    };
  }

  return {
    percent: 0,
    rawPercent: 0,
    elapsedSec: 0,
    plannedSeconds,
    isOvertime: false,
    targetFinishDate: null
  };
}

export default function LiveMonitorView({ onSelectJob }) {
  const [selectedDate, setSelectedDate] = useState(() => getColomboTodayStr());
  const [jobs, setJobs] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  // Filter state: 'all' | 'in_progress' | 'completed' | 'waiting'
  const [statusFilter, setStatusFilter] = useState('all');
  // Technician filter: '' = All Technicians, or specific technician id/name key
  const [selectedTechKey, setSelectedTechKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected job for Full Details Modal
  const [detailJob, setDetailJob] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Real-time 1-second clock ticker for live timers & progress bars
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load registered technicians once on mount
  useEffect(() => {
    getStaff({ role: 'TECHNICIAN' })
      .then(res => {
        if (res?.staff) setStaffList(res.staff.filter(s => s && s.is_active !== 0));
      })
      .catch(err => console.warn('[LiveMonitor] Could not load staff list:', err));
  }, []);

  const fetchLiveJobs = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [dateRes, activeRes] = await Promise.all([
        getJobs({ date: selectedDate, limit: 500 }),
        getJobs({ status: 'IN_PROGRESS', limit: 200 })
      ]);

      const dateJobs = dateRes?.jobs || [];
      const activeJobs = activeRes?.jobs || [];

      // Merge any IN_PROGRESS jobs so active field work is always visible on the monitor
      const combinedMap = new Map();
      dateJobs.forEach(j => { if (j) combinedMap.set(j.id, j); });
      activeJobs.forEach(j => { if (j) combinedMap.set(j.id, j); });

      const merged = Array.from(combinedMap.values());
      setJobs(merged);
      setLastUpdated(new Date());

      // Keep open detail modal synced with latest live status/times
      if (detailJob?.id && combinedMap.has(detailJob.id)) {
        setDetailJob(prev => ({ ...prev, ...combinedMap.get(detailJob.id) }));
      }
    } catch (err) {
      console.error('[LiveMonitor] Error fetching live jobs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLiveJobs(false);
  }, [selectedDate]);

  // Auto-poll every 3 seconds for real-time start/finish updates
  useEffect(() => {
    if (!autoRefresh) return;
    const poll = setInterval(() => {
      fetchLiveJobs(true);
    }, 3000);
    return () => clearInterval(poll);
  }, [autoRefresh, selectedDate, detailJob?.id]);

  const handleOpenJobDetails = async (job) => {
    setDetailJob(job);
    setLoadingDetail(true);
    try {
      const res = await getJobById(job.id);
      if (res?.job) {
        setDetailJob(res.job);
      }
    } catch (e) {
      console.warn('Could not fetch extended job details:', e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDownloadPdf = async (job, e) => {
    if (e) e.stopPropagation();
    setDownloadingPdf(true);
    try {
      await downloadJobPdfReport(job);
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Build unified Technician Directory with live real-time stats per technician
  const technicianSummaries = useMemo(() => {
    const map = new Map();

    // Seed from registered staff
    staffList.forEach(tech => {
      const key = `id:${tech.id}`;
      map.set(key, {
        key,
        id: tech.id,
        name: tech.full_name || tech.name || `Tech #${tech.id}`,
        phone: tech.phone || '',
        employee_code: tech.employee_code || '',
        inProgress: [],
        completed: [],
        waiting: [],
        allJobs: []
      });
    });

    // Attach jobs to technicians
    jobs.forEach(job => {
      if (!job || job.status === 'CANCELLED') return;
      let key = '';
      if (job.assigned_technician_id) {
        key = `id:${job.assigned_technician_id}`;
      } else if (job.technician_name) {
        // Try matching by name first
        const existingByName = Array.from(map.values()).find(
          t => t.name.toLowerCase() === String(job.technician_name).toLowerCase()
        );
        key = existingByName ? existingByName.key : `name:${job.technician_name}`;
      } else {
        return;
      }

      if (!map.has(key)) {
        map.set(key, {
          key,
          id: job.assigned_technician_id || null,
          name: job.technician_name || `Tech #${job.assigned_technician_id}`,
          phone: job.technician_phone || '',
          employee_code: '',
          inProgress: [],
          completed: [],
          waiting: [],
          allJobs: []
        });
      }

      const entry = map.get(key);
      if (!entry.phone && job.technician_phone) entry.phone = job.technician_phone;
      entry.allJobs.push(job);
      if (job.status === 'IN_PROGRESS') entry.inProgress.push(job);
      else if (job.status === 'COMPLETED') entry.completed.push(job);
      else entry.waiting.push(job);
    });

    return Array.from(map.values()).sort((a, b) => {
      // Technicians currently IN_PROGRESS come first, then those with jobs today, then alphabetical
      if (b.inProgress.length !== a.inProgress.length) return b.inProgress.length - a.inProgress.length;
      if (b.allJobs.length !== a.allJobs.length) return b.allJobs.length - a.allJobs.length;
      return a.name.localeCompare(b.name);
    });
  }, [staffList, jobs]);

  const selectedTechnicianObj = useMemo(() => {
    if (!selectedTechKey) return null;
    return technicianSummaries.find(t => t.key === selectedTechKey) || null;
  }, [selectedTechKey, technicianSummaries]);

  // Filter jobs by Selected Technician first
  const techFilteredJobs = useMemo(() => {
    if (!selectedTechKey) return jobs;
    return jobs.filter(job => {
      if (!job) return false;
      if (selectedTechKey.startsWith('id:')) {
        const targetId = String(selectedTechKey.replace('id:', ''));
        if (String(job.assigned_technician_id || '') === targetId) return true;
        if (
          selectedTechnicianObj &&
          job.technician_name &&
          job.technician_name.toLowerCase() === selectedTechnicianObj.name.toLowerCase()
        ) {
          return true;
        }
        return false;
      }
      if (selectedTechKey.startsWith('name:')) {
        const targetName = selectedTechKey.replace('name:', '').toLowerCase();
        return String(job.technician_name || '').toLowerCase() === targetName;
      }
      return true;
    });
  }, [jobs, selectedTechKey, selectedTechnicianObj]);

  // Categorized lists (respecting selected technician filter)
  const inProgressJobs = useMemo(() => {
    return techFilteredJobs.filter(j => j && j.status === 'IN_PROGRESS');
  }, [techFilteredJobs]);

  const completedJobs = useMemo(() => {
    return techFilteredJobs
      .filter(j => j && j.status === 'COMPLETED')
      .sort((a, b) => {
        const tA = new Date(a.actual_end_time || a.completed_at || a.updated_at || 0).getTime();
        const tB = new Date(b.actual_end_time || b.completed_at || b.updated_at || 0).getTime();
        return tB - tA;
      });
  }, [techFilteredJobs]);

  const waitingJobs = useMemo(() => {
    return techFilteredJobs.filter(j => j && j.status !== 'IN_PROGRESS' && j.status !== 'COMPLETED' && j.status !== 'CANCELLED');
  }, [techFilteredJobs]);

  const filteredDisplayJobs = useMemo(() => {
    let base = [];
    if (statusFilter === 'in_progress') base = inProgressJobs;
    else if (statusFilter === 'completed') base = completedJobs;
    else if (statusFilter === 'waiting') base = waitingJobs;
    else {
      base = [...inProgressJobs, ...completedJobs, ...waitingJobs];
    }

    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase().trim();
    return base.filter(job => (
      (job.job_code && job.job_code.toLowerCase().includes(q)) ||
      (job.customer_name && job.customer_name.toLowerCase().includes(q)) ||
      (job.technician_name && job.technician_name.toLowerCase().includes(q)) ||
      (job.location_name && job.location_name.toLowerCase().includes(q)) ||
      (job.location_address && job.location_address.toLowerCase().includes(q)) ||
      (job.treatment_code && job.treatment_code.toLowerCase().includes(q)) ||
      (job.vehicle_no && job.vehicle_no.toLowerCase().includes(q)) ||
      (job.vehicle_number && job.vehicle_number.toLowerCase().includes(q))
    ));
  }, [statusFilter, inProgressJobs, completedJobs, waitingJobs, searchQuery]);

  const totalMonitorJobs = inProgressJobs.length + completedJobs.length + waitingJobs.length;
  const overallCompletionRate = totalMonitorJobs > 0
    ? Math.round((completedJobs.length / totalMonitorJobs) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-12 select-none">

      {/* TOP COMMAND HEADER: REAL-TIME LIVE OPERATIONS MONITOR */}
      <div className="bg-gradient-to-br from-[#2E1065] via-[#4C1D95] to-[#1E1B4B] rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-purple-700/50 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-orange-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-black uppercase tracking-widest text-amber-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Real-Time Field Operations Monitor</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Activity className="w-7 h-7 text-[#FF8A00]" />
              <span>Live Job Start, Progress &amp; Finish Monitor</span>
            </h1>
            <p className="text-xs sm:text-sm text-purple-200 font-medium max-w-2xl">
              Select any technician to inspect their live real-time work timer, progress bar, and download PDF / WhatsApp / Print full job reports.
            </p>
          </div>

          {/* Right Controls: Live Clock, Date Picker & Auto-Sync Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Colombo Digital Clock */}
            <div className="px-4 py-2.5 rounded-2xl bg-slate-950/60 border border-white/15 backdrop-blur-md flex items-center gap-2.5">
              <Timer className="w-5 h-5 text-amber-400 animate-pulse" />
              <div>
                <div className="text-[9px] font-black uppercase tracking-wider text-purple-300">Live System Clock</div>
                <div className="font-mono font-black text-sm sm:text-base text-white">
                  {formatTimeOnlyDisplay(new Date(nowTick))}
                </div>
              </div>
            </div>

            {/* Date Selector */}
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 border border-white/20 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-300" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-black text-xs focus:outline-hidden cursor-pointer"
              />
              {selectedDate !== getColomboTodayStr() && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(getColomboTodayStr())}
                  className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-black text-[10px] cursor-pointer"
                >
                  Today
                </button>
              )}
            </div>

            {/* Auto-Refresh Toggle */}
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3.5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-1.5 border transition cursor-pointer ${
                autoRefresh
                  ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200'
                  : 'bg-white/10 border-white/20 text-purple-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-400 animate-ping' : 'bg-slate-400'}`} />
              <span>{autoRefresh ? 'LIVE SYNC ON (3s)' : 'LIVE SYNC PAUSED'}</span>
            </button>

            <button
              type="button"
              onClick={() => fetchLiveJobs(false)}
              className="p-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white border border-white/20 transition cursor-pointer"
              title="Refresh Now"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-300' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards (Clickable Filter Tabs) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5 relative z-10">
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
              statusFilter === 'in_progress'
                ? 'bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white border-amber-300 shadow-lg scale-[1.01]'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
                <span>Live In Progress Now</span>
              </span>
              <Play className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-3xl font-black mt-1.5">{inProgressJobs.length}</div>
            <div className="text-[11px] text-white/80 font-semibold mt-0.5">
              {selectedTechnicianObj ? `${selectedTechnicianObj.name}'s active timer` : 'Active field timers running'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
              statusFilter === 'completed'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-300 shadow-lg scale-[1.01]'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200">
                Finished / Completed
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            </div>
            <div className="text-3xl font-black mt-1.5">{completedJobs.length}</div>
            <div className="text-[11px] text-white/80 font-semibold mt-0.5">
              {overallCompletionRate}% completed on {selectedDate}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('waiting')}
            className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
              statusFilter === 'waiting'
                ? 'bg-white text-[#3B0764] border-white shadow-lg scale-[1.01]'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === 'waiting' ? 'text-[#5B21B6]' : 'text-purple-200'}`}>
                Waiting to Start
              </span>
              <Clock className={`w-4 h-4 ${statusFilter === 'waiting' ? 'text-[#5B21B6]' : 'text-purple-300'}`} />
            </div>
            <div className="text-3xl font-black mt-1.5">{waitingJobs.length}</div>
            <div className={`text-[11px] font-semibold mt-0.5 ${statusFilter === 'waiting' ? 'text-slate-600' : 'text-white/80'}`}>
              Scheduled &amp; ready to start
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-white text-[#3B0764] border-white shadow-lg scale-[1.01]'
                : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${statusFilter === 'all' ? 'text-[#5B21B6]' : 'text-purple-200'}`}>
                All Monitor Jobs
              </span>
              <Activity className={`w-4 h-4 ${statusFilter === 'all' ? 'text-[#F97316]' : 'text-amber-300'}`} />
            </div>
            <div className="text-3xl font-black mt-1.5">{totalMonitorJobs}</div>
            <div className={`text-[11px] font-semibold mt-0.5 ${statusFilter === 'all' ? 'text-slate-600' : 'text-white/80'}`}>
              Updated {formatTimeOnlyDisplay(lastUpdated)}
            </div>
          </button>
        </div>
      </div>

      {/* TECHNICIAN REAL-TIME SELECTOR & LIVE STATUS BAR */}
      <div className="bg-white rounded-3xl border-2 border-purple-100 p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#5B21B6] to-[#F97316] text-white flex items-center justify-center shadow-xs">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <span>Filter by Technician — View Real-Time Field Work</span>
                {selectedTechnicianObj && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-300">
                    Showing: {selectedTechnicianObj.name}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Click any technician below or use the dropdown to monitor their live active job, running timer, and completed jobs.
              </p>
            </div>
          </div>

          {/* Dropdown Selector + Reset Button */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedTechKey}
                onChange={(e) => setSelectedTechKey(e.target.value)}
                className="pl-3.5 pr-8 py-2 rounded-xl bg-purple-50 border border-purple-200 text-xs font-black text-[#3B0764] focus:outline-hidden focus:border-[#6D28D9] cursor-pointer"
              >
                <option value="">👷 All Technicians ({technicianSummaries.length})</option>
                {technicianSummaries.map(tech => (
                  <option key={tech.key} value={tech.key}>
                    {tech.inProgress.length > 0 ? '🔴 [WORKING NOW] ' : ''}
                    {tech.name} — {tech.allJobs.length} Job(s) ({tech.inProgress.length} Live, {tech.completed.length} Done)
                  </option>
                ))}
              </select>
            </div>

            {selectedTechKey && (
              <button
                type="button"
                onClick={() => setSelectedTechKey('')}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                <span>Show All</span>
              </button>
            )}
          </div>
        </div>

        {/* Clickable Technician Cards / Pills */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setSelectedTechKey('')}
            className={`px-4 py-2.5 rounded-2xl border text-left transition shrink-0 cursor-pointer flex items-center gap-2.5 ${
              !selectedTechKey
                ? 'bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] text-white border-[#4C1D95] shadow-md'
                : 'bg-slate-50 hover:bg-purple-50 text-slate-800 border-slate-200'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <div>
              <div className="text-xs font-black">All Technicians</div>
              <div className={`text-[10px] font-bold ${!selectedTechKey ? 'text-purple-200' : 'text-slate-500'}`}>
                {jobs.filter(j => j && j.status === 'IN_PROGRESS').length} Working • {jobs.filter(j => j && j.status === 'COMPLETED').length} Done
              </div>
            </div>
          </button>

          {technicianSummaries.map(tech => {
            const isSelected = selectedTechKey === tech.key;
            const isWorkingNow = tech.inProgress.length > 0;
            const activeJob = tech.inProgress[0] || null;
            const activeTimerStr = activeJob
              ? formatElapsedHms(activeJob.actual_start_time || activeJob.updated_at, nowTick)
              : null;

            return (
              <button
                key={tech.key}
                type="button"
                onClick={() => setSelectedTechKey(isSelected ? '' : tech.key)}
                className={`px-4 py-2.5 rounded-2xl border-2 text-left transition shrink-0 cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white border-amber-300 shadow-md scale-[1.01]'
                    : isWorkingNow
                      ? 'bg-amber-50/90 hover:bg-amber-100/80 text-slate-900 border-amber-400'
                      : 'bg-white hover:bg-purple-50/60 text-slate-800 border-slate-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                  isSelected
                    ? 'bg-white text-[#EA580C]'
                    : isWorkingNow
                      ? 'bg-[#F97316] text-white'
                      : 'bg-purple-100 text-[#4C1D95]'
                }`}>
                  {tech.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black truncate max-w-[140px]">{tech.name}</span>
                    {isWorkingNow && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${
                        isSelected ? 'bg-slate-950 text-amber-300' : 'bg-emerald-600 text-white'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
                        <span>LIVE {activeTimerStr}</span>
                      </span>
                    )}
                  </div>
                  <div className={`text-[10px] font-bold mt-0.5 ${
                    isSelected ? 'text-white/90' : 'text-slate-500'
                  }`}>
                    {tech.inProgress.length > 0 ? `${tech.inProgress.length} Working • ` : ''}
                    {tech.completed.length} Done • {tech.waiting.length} Waiting
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* SELECTED TECHNICIAN LIVE REAL-TIME WORK SPOTLIGHT */}
        {selectedTechnicianObj && (
          <div className={`p-4 rounded-2xl border-2 transition ${
            selectedTechnicianObj.inProgress.length > 0
              ? 'bg-gradient-to-r from-slate-900 via-[#2E1065] to-[#3B0764] text-white border-amber-400'
              : 'bg-purple-50/80 text-slate-900 border-purple-200'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 ${
                  selectedTechnicianObj.inProgress.length > 0
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-[#5B21B6] text-white'
                }`}>
                  {selectedTechnicianObj.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black">{selectedTechnicianObj.name}</h3>
                    {selectedTechnicianObj.phone && (
                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                        selectedTechnicianObj.inProgress.length > 0
                          ? 'bg-white/15 text-amber-200'
                          : 'bg-white text-purple-800 border border-purple-200'
                      }`}>
                        📞 {selectedTechnicianObj.phone}
                      </span>
                    )}
                    {selectedTechnicianObj.inProgress.length > 0 ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                        <span>WORKING IN THE FIELD RIGHT NOW</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black uppercase">
                        No Active Timer Running Right Now
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-1 font-medium ${
                    selectedTechnicianObj.inProgress.length > 0 ? 'text-purple-200' : 'text-slate-600'
                  }`}>
                    Total Assigned on {selectedDate}: <strong>{selectedTechnicianObj.allJobs.length} Jobs</strong> ({selectedTechnicianObj.inProgress.length} Live In Progress, {selectedTechnicianObj.completed.length} Completed, {selectedTechnicianObj.waiting.length} Waiting)
                  </p>
                </div>
              </div>

              {/* If Technician is actively working on a job right now, show instant live summary & View Details button */}
              {selectedTechnicianObj.inProgress[0] && (() => {
                const liveJob = selectedTechnicianObj.inProgress[0];
                const prog = calculateProgressInfo(liveJob, nowTick);
                const startIso = liveJob.actual_start_time || liveJob.updated_at;
                return (
                  <div className="flex flex-wrap items-center gap-3 bg-slate-950/70 p-3 rounded-2xl border border-amber-400/50">
                    <div>
                      <div className="text-[10px] font-black uppercase text-amber-300">
                        Active Job: {liveJob.job_code} — {liveJob.customer_name}
                      </div>
                      <div className="text-[11px] text-purple-200 font-semibold">
                        Started: {formatTimeOnlyDisplay(startIso)} • Progress: {prog.rawPercent}% • Crew: {liveJob.crew_count || 1} People • Vehicle: {liveJob.vehicle_no || liveJob.vehicle_number || '—'}
                      </div>
                    </div>
                    <div className="font-mono font-black text-xl text-amber-300 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40">
                      {formatElapsedHms(startIso, nowTick)}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenJobDetails(liveJob)}
                      className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Open Full Job</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* FILTER BAR & SEARCH */}
      <div className="bg-white rounded-2xl border border-purple-100 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: `All Monitor Feed (${totalMonitorJobs})` },
            { id: 'in_progress', label: `🔴 Live In Progress (${inProgressJobs.length})` },
            { id: 'completed', label: `✅ Finished Jobs (${completedJobs.length})` },
            { id: 'waiting', label: `⏳ Waiting to Start (${waitingJobs.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-[#4C1D95]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customer, tech, job code, vehicle..."
            className="w-full pl-10 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-hidden focus:border-[#6D28D9]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1: DEDICATED REAL-TIME ACTIVE IN-PROGRESS BOARD (IF ANY RUNNING) */}
      {(statusFilter === 'all' || statusFilter === 'in_progress') && inProgressJobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F97316] animate-ping" />
              <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                Live Active Jobs Running Right Now ({inProgressJobs.length})
              </h2>
            </div>
            <span className="text-xs font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              Real-Time Progress &amp; Timer Active
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {inProgressJobs.map(job => {
              const prog = calculateProgressInfo(job, nowTick);
              const startIso = job.actual_start_time || job.updated_at;
              const elapsedStr = formatElapsedHms(startIso, nowTick);
              const vehicleStr = job.vehicle_no || job.vehicle_number || 'Not Assigned';
              const machineStr = job.machine_name || job.machine_type || 'Standard Equipment';

              return (
                <div
                  key={job.id}
                  onClick={() => handleOpenJobDetails(job)}
                  className="bg-gradient-to-br from-slate-900 via-[#2E1065] to-[#3B0764] text-white rounded-3xl p-5 shadow-xl border-2 border-amber-400/80 hover:border-amber-300 transition cursor-pointer space-y-4 relative overflow-hidden"
                >
                  {/* Top Row: Customer, Job Code & Live Timer Pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                          <span>IN PROGRESS</span>
                        </span>
                        <span className="font-mono text-xs text-purple-200 font-bold">{job.job_code}</span>
                        <span className="text-[11px] text-amber-200 font-bold">📅 {job.scheduled_date}</span>
                      </div>
                      <h3 className="text-lg font-black text-white mt-1 truncate">{job.customer_name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-purple-200 truncate mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{job.location_name || job.location_address || 'Customer Site'}</span>
                      </div>
                    </div>

                    {/* Big Real-Time Ticking Timer */}
                    <div className="text-right shrink-0 bg-slate-950/80 px-3.5 py-2 rounded-2xl border border-amber-400/50 shadow-inner">
                      <div className="text-[9px] font-black uppercase tracking-widest text-amber-300 flex items-center justify-end gap-1">
                        <Timer className="w-3 h-3 text-amber-400" />
                        <span>LIVE TIMER</span>
                      </div>
                      <div className="font-mono font-black text-xl sm:text-2xl text-amber-300 tracking-wider">
                        {elapsedStr}
                      </div>
                    </div>
                  </div>

                  {/* Real-Time Progress Bar */}
                  <div className="space-y-1.5 bg-white/10 p-3 rounded-2xl border border-white/15">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-amber-200 uppercase tracking-wider text-[10px]">
                        Real-Time Work Progress ({job.duration_minutes || 60} mins planned)
                      </span>
                      <span className={`font-mono font-black text-xs px-2 py-0.5 rounded-md ${
                        prog.isOvertime ? 'bg-rose-500 text-white' : 'bg-emerald-400 text-slate-950'
                      }`}>
                        {prog.rawPercent}% {prog.isOvertime ? '(OVERTIME)' : ''}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-950/70 rounded-full overflow-hidden p-0.5 border border-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          prog.isOvertime
                            ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500'
                            : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-400'
                        }`}
                        style={{ width: `${prog.percent}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1.5 text-[11px]">
                      <div>
                        <span className="text-purple-300 text-[10px] font-bold block">🟢 Started At:</span>
                        <span className="font-mono font-black text-white">
                          {startIso ? formatDateTimeDisplay(startIso) : `${job.scheduled_date} • ${job.scheduled_time || '09:00'}`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-purple-300 text-[10px] font-bold block">🎯 Est. Target Finish:</span>
                        <span className="font-mono font-black text-amber-300">
                          {prog.targetFinishDate ? formatTimeOnlyDisplay(prog.targetFinishDate) : 'Running'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Technician, Crew, Vehicle No, Machine Name */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                      <div className="text-[9px] text-purple-200 font-bold uppercase">👷 Technician</div>
                      <div className="font-black text-white truncate mt-0.5">{job.technician_name || 'Unassigned'}</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                      <div className="text-[9px] text-purple-200 font-bold uppercase">👥 Crew / People</div>
                      <div className="font-black text-white truncate mt-0.5">{job.crew_count || 1} People</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                      <div className="text-[9px] text-purple-200 font-bold uppercase">🚚 Vehicle No</div>
                      <div className="font-black text-white truncate mt-0.5">{vehicleStr}</div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-2 border border-white/10">
                      <div className="text-[9px] text-purple-200 font-bold uppercase">⚙️ Machine</div>
                      <div className="font-black text-white truncate mt-0.5">{machineStr}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/15 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-white/15 text-amber-200 font-black text-[11px]">
                      🧪 {job.treatment_code}{job.treatment_name ? ` — ${job.treatment_name}` : ''}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleDownloadPdf(job, e)}
                        className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black text-[11px] flex items-center gap-1 transition cursor-pointer"
                        title="Download Full Job PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          shareJobOnWhatsApp(job, false);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/30 hover:bg-emerald-500/45 border border-emerald-400/40 text-emerald-200 font-black text-[11px] flex items-center gap-1 transition cursor-pointer"
                        title="Share Full Job Details on WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenJobDetails(job);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Live Details</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: MAIN MONITOR TABLE / CARDS FOR ALL JOBS (IN PROGRESS, FINISHED, WAITING) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            {statusFilter === 'completed'
              ? `Finished / Completed Jobs (${filteredDisplayJobs.length})`
              : statusFilter === 'in_progress'
                ? `In-Progress Jobs (${filteredDisplayJobs.length})`
                : statusFilter === 'waiting'
                  ? `Waiting to Start Jobs (${filteredDisplayJobs.length})`
                  : `Real-Time Job Operations Feed • ${selectedDate} (${filteredDisplayJobs.length})`}
          </h2>
          <span className="text-xs text-slate-500 font-semibold">
            Click any job to view full details, download PDF, share on WhatsApp, or print
          </span>
        </div>

        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#6D28D9] animate-spin mx-auto" />
            <div className="font-black text-slate-700 text-sm">Loading Live Operations Monitor...</div>
          </div>
        ) : filteredDisplayJobs.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
            <Activity className="w-12 h-12 text-slate-300 mx-auto" />
            <div className="font-black text-slate-800 text-base">No Jobs Matching Current Filter</div>
            <p className="text-xs text-slate-500">
              {selectedTechnicianObj
                ? `No matching jobs for ${selectedTechnicianObj.name} on ${selectedDate}.`
                : 'Try switching the filter tab or selecting another date above.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDisplayJobs.map(job => {
              const isRunning = job.status === 'IN_PROGRESS';
              const isDone = job.status === 'COMPLETED';
              const prog = calculateProgressInfo(job, nowTick);
              const startIso = job.actual_start_time;
              const endIso = job.actual_end_time || job.completed_at;
              const vehicleStr = job.vehicle_no || job.vehicle_number || 'Not Assigned';
              const machineStr = job.machine_name || job.machine_type || 'Standard Equipment';

              return (
                <div
                  key={job.id}
                  onClick={() => handleOpenJobDetails(job)}
                  className={`bg-white rounded-3xl p-4 sm:p-5 shadow-sm hover:shadow-md transition cursor-pointer space-y-3.5 relative overflow-hidden border-2 ${
                    isRunning
                      ? 'border-amber-400 bg-amber-50/10'
                      : isDone
                        ? 'border-emerald-200'
                        : 'border-purple-100'
                  }`}
                >
                  {/* Left Color Strip */}
                  <div
                    className="absolute top-0 left-0 bottom-0 w-1.5"
                    style={{
                      backgroundColor: isRunning
                        ? '#F97316'
                        : isDone
                          ? '#10B981'
                          : (job.treatment_color || '#6D28D9')
                    }}
                  />

                  {/* Header: Customer, Job Code, Date & Status Badge */}
                  <div className="flex items-start justify-between gap-2 pl-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {job.job_code}
                        </span>
                        <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-purple-50 text-[#4C1D95] border border-purple-200">
                          📅 {job.scheduled_date}
                        </span>
                        {job.customer_signature && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            ✍️ SIGNED
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-1 truncate">{job.customer_name}</h3>
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 truncate mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                        <span className="truncate font-medium">{job.location_name || job.location_address || 'Customer Location'}</span>
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shrink-0 flex items-center gap-1 ${
                      isDone
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : isRunning
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {isRunning && <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />}
                      {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      <span>{job.status}</span>
                    </span>
                  </div>

                  {/* Real-Time Progress & Start/Finish Time Box */}
                  <div className={`ml-2 p-3 rounded-2xl border space-y-2 ${
                    isRunning
                      ? 'bg-amber-50/70 border-amber-200'
                      : isDone
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-black uppercase tracking-wider text-slate-600 text-[10px] flex items-center gap-1">
                          <Timer className="w-3.5 h-3.5 text-[#6D28D9]" />
                          <span>
                            {isRunning
                              ? 'Live Progress Running'
                              : isDone
                                ? 'Job Completed (100%)'
                                : `Scheduled (${job.scheduled_time || '09:00'} • ${job.duration_minutes || 60}m)`}
                          </span>
                        </span>
                        <span className="font-mono font-black text-xs text-slate-900">
                          {isRunning
                            ? `${formatElapsedHms(startIso, nowTick)} (${prog.rawPercent}%)`
                            : isDone
                              ? (formatDurationHuman(startIso, endIso) || '100% Done')
                              : '0% (Not Started)'}
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isDone
                              ? 'bg-emerald-500'
                              : isRunning
                                ? 'bg-gradient-to-r from-[#F97316] to-[#6D28D9]'
                                : 'bg-slate-300'
                          }`}
                          style={{ width: `${isDone ? 100 : isRunning ? prog.percent : 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Start Time & Finish Time Grid */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <div className="text-[9px] font-black uppercase text-slate-400">Start Time</div>
                        <div className="font-mono font-black text-slate-900 mt-0.5">
                          {startIso ? formatTimeOnlyDisplay(startIso) : (job.scheduled_time || '09:00')}
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <div className="text-[9px] font-black uppercase text-slate-400">Finish Time</div>
                        <div className="font-mono font-black text-slate-900 mt-0.5">
                          {isDone && endIso
                            ? formatTimeOnlyDisplay(endIso)
                            : isRunning
                              ? (prog.targetFinishDate ? `Est. ${formatTimeOnlyDisplay(prog.targetFinishDate)}` : 'Running...')
                              : 'Pending'}
                        </div>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <div className="text-[9px] font-black uppercase text-slate-400">Work Duration</div>
                        <div className="font-mono font-black text-[#4C1D95] mt-0.5">
                          {isRunning
                            ? formatElapsedHms(startIso, nowTick)
                            : isDone
                              ? (formatDurationHuman(startIso, endIso) || `${job.duration_minutes || 60}m`)
                              : `${job.duration_minutes || 60}m est.`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Technician, Crew Count, Vehicle No & Machine Name */}
                  <div className="pl-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                    <div className="p-2 rounded-xl bg-indigo-50/70 border border-indigo-100">
                      <div className="text-[9px] font-black uppercase text-indigo-600">👷 Technician</div>
                      <div className="font-black text-slate-900 truncate mt-0.5">{job.technician_name || 'Unassigned'}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                      <div className="text-[9px] font-black uppercase text-slate-500">👥 Crew / People</div>
                      <div className="font-black text-slate-900 truncate mt-0.5">{job.crew_count || 1} People</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                      <div className="text-[9px] font-black uppercase text-slate-500">🚚 Vehicle No</div>
                      <div className="font-black text-slate-900 truncate mt-0.5">{vehicleStr}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                      <div className="text-[9px] font-black uppercase text-slate-500">⚙️ Machine</div>
                      <div className="font-black text-slate-900 truncate mt-0.5">{machineStr}</div>
                    </div>
                  </div>

                  {/* Footer Action Bar with Quick PDF, WhatsApp, Print & View Full Details */}
                  <div className="pl-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <span
                      style={{ backgroundColor: `${job.treatment_color || '#6D28D9'}18`, color: job.treatment_color || '#6D28D9' }}
                      className="px-2.5 py-1 rounded-lg font-black text-[11px]"
                    >
                      🧪 {job.treatment_code}{job.treatment_name ? ` — ${job.treatment_name}` : ''}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={(e) => handleDownloadPdf(job, e)}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#4C1D95] border border-purple-200 font-black text-[11px] flex items-center gap-1 transition cursor-pointer"
                        title="Download Full Job Details PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          shareJobOnWhatsApp(job, false);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-black text-[11px] flex items-center gap-1 transition cursor-pointer"
                        title="Share Full Job Details on WhatsApp"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          printJobReport(job);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-black text-[11px] flex items-center gap-1 transition cursor-pointer"
                        title="Print Full Job Details"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenJobDetails(job);
                        }}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition cursor-pointer ${
                          isDone
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : isRunning
                              ? 'bg-[#F97316] hover:bg-[#EA580C] text-white shadow-xs'
                              : 'bg-[#4C1D95] hover:bg-[#3B0764] text-white'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Full Details</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FULL JOB DETAILS MODAL (WITH PDF DOWNLOAD, WHATSAPP SHARE & PRINT) */}
      {detailJob && (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setDetailJob(null)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-purple-200 overflow-hidden my-8 max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Top Header */}
            <div className="bg-gradient-to-r from-[#3B0764] via-[#4C1D95] to-[#2E1065] p-5 text-white space-y-3 shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black bg-white/15 px-2.5 py-0.5 rounded-lg text-amber-300">
                      {detailJob.job_code}
                    </span>
                    <span className="text-xs font-black bg-white/15 px-2.5 py-0.5 rounded-lg text-purple-100">
                      📅 Date: {detailJob.scheduled_date}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      detailJob.status === 'COMPLETED'
                        ? 'bg-emerald-400 text-slate-950'
                        : detailJob.status === 'IN_PROGRESS'
                          ? 'bg-amber-400 text-slate-950 animate-pulse'
                          : 'bg-white/20 text-white'
                    }`}>
                      {detailJob.status}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white mt-1.5">
                    {detailJob.customer_name}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailJob(null)}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Toolbar inside Modal Header: PDF Download, WhatsApp Share, Print */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={(e) => handleDownloadPdf(detailJob, e)}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#EA580C] hover:to-[#C2410C] text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloadingPdf ? 'Generating PDF...' : 'Download Full Details PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => shareJobOnWhatsApp(detailJob, false)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share on WhatsApp</span>
                </button>

                {detailJob.customer_phone && (
                  <button
                    type="button"
                    onClick={() => shareJobOnWhatsApp(detailJob, true)}
                    className="px-3 py-2 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/40 border border-emerald-400/50 text-emerald-100 font-black text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp Customer</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => printJobReport(detailJob)}
                  className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Full Details</span>
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {/* 1. Real-Time / Completed Start & Finish Time Record */}
              <div className={`p-4 rounded-2xl border-2 space-y-3 ${
                detailJob.status === 'COMPLETED'
                  ? 'bg-emerald-50/80 border-emerald-200'
                  : detailJob.status === 'IN_PROGRESS'
                    ? 'bg-amber-50/80 border-amber-300'
                    : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Timer className="w-4 h-4 text-[#6D28D9]" />
                    <span>Job Start, Finish &amp; Real-Time Progress Record</span>
                  </span>
                  <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-900">
                    {detailJob.status === 'COMPLETED'
                      ? '100% Completed'
                      : detailJob.status === 'IN_PROGRESS'
                        ? `Live: ${formatElapsedHms(detailJob.actual_start_time, nowTick)}`
                        : 'Waiting to Start'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-[9px] font-black uppercase text-emerald-700">🟢 Work Start Date &amp; Time</div>
                    <div className="font-mono font-black text-slate-900 text-xs mt-1">
                      {detailJob.actual_start_time
                        ? formatDateTimeDisplay(detailJob.actual_start_time)
                        : `${detailJob.scheduled_date} • ${detailJob.scheduled_time || '09:00'} (Scheduled)`}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-[9px] font-black uppercase text-amber-700">🏁 Work Finish Date &amp; Time</div>
                    <div className="font-mono font-black text-slate-900 text-xs mt-1">
                      {detailJob.actual_end_time || detailJob.completed_at
                        ? formatDateTimeDisplay(detailJob.actual_end_time || detailJob.completed_at)
                        : detailJob.status === 'IN_PROGRESS'
                          ? 'In Progress (Running Now)'
                          : 'Not Finished Yet'}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-[9px] font-black uppercase text-[#5B21B6]">⏱️ Total Work Duration</div>
                    <div className="font-mono font-black text-[#4C1D95] text-sm mt-1">
                      {detailJob.status === 'IN_PROGRESS'
                        ? formatElapsedHms(detailJob.actual_start_time, nowTick)
                        : (formatDurationHuman(detailJob.actual_start_time, detailJob.actual_end_time || detailJob.completed_at) || `${detailJob.duration_minutes || 60} mins`)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Full Dispatch & Resource Details (Technician, How Many People, Vehicle No, Machine Name) */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-[#3B0764] flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#F97316]" />
                  <span>Full Dispatch, Crew, Vehicle &amp; Machine Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-white p-3 rounded-xl border border-purple-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#5B21B6] text-white flex items-center justify-center shrink-0">
                      <HardHat className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase text-slate-400">Assigned Technician</div>
                      <div className="font-black text-slate-900 text-sm truncate">
                        {detailJob.technician_name || 'Unassigned'}
                      </div>
                      {detailJob.technician_phone && (
                        <div className="text-[11px] font-mono text-indigo-700">{detailJob.technician_phone}</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-purple-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase text-slate-400">How Many People Come (Crew)</div>
                      <div className="font-black text-slate-900 text-sm">
                        {detailJob.crew_count || 1} {Number(detailJob.crew_count || 1) === 1 ? 'Person' : 'People'}
                      </div>
                      {detailJob.team_members && (
                        <div className="text-[11px] text-purple-800 font-semibold truncate">Team: {detailJob.team_members}</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-purple-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#F97316] text-white flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase text-slate-400">Vehicle No</div>
                      <div className="font-black text-slate-900 text-sm">
                        {detailJob.vehicle_no || detailJob.vehicle_number || 'Not Assigned'}
                      </div>
                      {detailJob.vehicle_type && (
                        <div className="text-[11px] text-orange-700 font-semibold">{detailJob.vehicle_type}</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-purple-100 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[9px] font-black uppercase text-slate-400">Machine Name</div>
                      <div className="font-black text-slate-900 text-sm">
                        {detailJob.machine_name || detailJob.machine_type || 'Standard Equipment'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Treatment & Scheduled Date/Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="bg-white p-3 rounded-xl border border-purple-100">
                    <div className="text-[9px] font-black uppercase text-slate-400">Treatment Type &amp; Name</div>
                    <div className="font-black text-slate-900 text-xs mt-0.5">
                      {detailJob.treatment_code}{detailJob.treatment_name ? ` — ${detailJob.treatment_name}` : ''}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-purple-100">
                    <div className="text-[9px] font-black uppercase text-slate-400">Scheduled Date &amp; Time</div>
                    <div className="font-black text-slate-900 text-xs mt-0.5">
                      {detailJob.scheduled_date} at {detailJob.scheduled_time || '09:00'} ({detailJob.duration_minutes || 60} mins)
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Customer & Location Details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-700">
                  Customer &amp; Service Location Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-[9px] font-black uppercase text-slate-400">Customer Contact</div>
                    <div className="font-black text-slate-900 text-xs mt-0.5">
                      {detailJob.contact_person || detailJob.customer_name}
                    </div>
                    {detailJob.customer_phone && (
                      <div className="font-mono text-emerald-700 font-bold mt-0.5">{detailJob.customer_phone}</div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-[9px] font-black uppercase text-slate-400">Service Location</div>
                    <div className="font-black text-slate-900 text-xs mt-0.5">
                      {detailJob.location_name || 'Main Location'}
                    </div>
                    <div className="text-slate-600 text-[11px] mt-0.5">
                      {detailJob.location_address || detailJob.customer_address || ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Technician Service Notes & Customer Signature */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                  Service Completion Notes &amp; Customer Sign-Off
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <div className="text-[10px] font-black uppercase text-slate-400">Technician Notes / Findings</div>
                  <p className="text-slate-800 font-medium mt-1 leading-relaxed">
                    {detailJob.technician_notes || 'Standard pest control service treatment recorded.'}
                  </p>
                </div>
                {detailJob.customer_signature ? (
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1.5">
                    <div className="text-[10px] font-black uppercase text-slate-400">Customer Touch Signature</div>
                    <img
                      src={detailJob.customer_signature}
                      alt="Customer Signature"
                      className="max-h-28 object-contain mx-auto border border-slate-100 rounded-lg p-1.5 bg-slate-50"
                    />
                  </div>
                ) : (
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 text-slate-400 italic text-[11px]">
                    Customer digital signature not yet captured.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with PDF Download, WhatsApp Share, Print & Close */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={(e) => handleDownloadPdf(detailJob, e)}
                  className="px-4 py-2 rounded-xl bg-[#4C1D95] hover:bg-[#3B0764] text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => shareJobOnWhatsApp(detailJob, false)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp Share</span>
                </button>

                <button
                  type="button"
                  onClick={() => printJobReport(detailJob)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-black text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDetailJob(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs cursor-pointer transition"
              >
                Close Full Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
