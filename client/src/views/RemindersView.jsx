import React, { useState, useEffect } from 'react';
import {
  Bell, Send, CheckCircle2, Clock, AlertTriangle, User,
  Calendar, Phone, MessageSquare, Zap, RefreshCw,
  Smartphone, Radio, Layers, Edit3, ShieldAlert,
  Save, RotateCcw, Sparkles, FileText, Search, MapPin
} from 'lucide-react';
import {
  getRemindersQueue,
  getTechnicianRouteReminder,
  logReminderSent,
  runDailyAutomation,
  sendJobSmsReminder,
  bulkSendSmsReminders,
  getSmsLogs,
  sendTechDispatchSms,
  validatePhone,
  saveSmsTemplates,
  sendCustomSms
} from '../api';

const DEFAULT_TEMPLATES_FALLBACK = {
  template_24h: 'PestControl Pro: Reminder that your {TREATMENT} service is scheduled for tomorrow {DATE} at {TIME} ({LOCATION}). Specialist: {TECHNICIAN}. To confirm or reschedule: {LINK} or Call 011-2345678',
  template_arrival: 'PestControl Pro: Our specialist {TECHNICIAN} is en-route for your scheduled {TREATMENT} service today at approx {TIME}. Thank you for choosing PestControl Pro! Hotline: 011-2345678',
  template_tech_dispatch: 'PestControl: Hello {TECHNICIAN}, Job #{JOB_CODE} assigned for {CUSTOMER} on {DATE} at {TIME} ({TREATMENT} @ {LOCATION}). Tap link to open your mobile work panel & start work: {LINK}',
  template_completion: 'PestControl Pro: Your {TREATMENT} service has been completed successfully today. Thank you for partnering with PestControl Pro. Support: 011-2345678',
  custom_note: ''
};

const PLACEHOLDER_CHIPS = [
  { tag: '{CUSTOMER}', label: 'Customer Name' },
  { tag: '{TREATMENT}', label: 'Treatment' },
  { tag: '{DATE}', label: 'Date' },
  { tag: '{TIME}', label: 'Time' },
  { tag: '{LOCATION}', label: 'Location' },
  { tag: '{TECHNICIAN}', label: 'Technician' },
  { tag: '{JOB_CODE}', label: 'Job Code' },
  { tag: '{LINK}', label: 'Confirm/Job Link' },
  { tag: '{HOTLINE}', label: 'Hotline' }
];

const QUICK_CUSTOM_PHRASES = [
  'Please reply YES to confirm your appointment.',
  'Please ensure someone is available at the premises.',
  'Kindly keep pets & food covered during treatment.',
  'For rescheduling, please call our office at 011-2345678.',
  'Our technician will call 30 mins before arrival.'
];

const MILESTONE_TABS = [
  {
    id: 'all',
    label: 'All Milestones',
    sub: '0d – 30d Window',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-200',
    pillClass: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: '30d',
    label: '30 Days Before',
    sub: '15 – 30 Days Ahead',
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    pillClass: 'bg-indigo-100 text-indigo-800 border-indigo-200'
  },
  {
    id: '14d',
    label: '14 Days Before',
    sub: '8 – 14 Days Ahead',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    pillClass: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: '7d',
    label: '7 Days Before',
    sub: '3 – 7 Days Ahead',
    badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
    pillClass: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  {
    id: '2d',
    label: '2 Days Before',
    sub: 'In 2 Days (48h)',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pillClass: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    id: '1d',
    label: '1 Day Before',
    sub: 'Tomorrow (24h)',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-200',
    pillClass: 'bg-amber-100 text-amber-900 border-amber-200'
  },
  {
    id: '0d',
    label: 'Due Date (0 Days)',
    sub: 'Due Today',
    badgeClass: 'bg-orange-100 text-orange-900 border-orange-200',
    pillClass: 'bg-orange-100 text-orange-800 border-orange-200'
  }
];

export default function RemindersView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTechRoute, setSelectedTechRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [runningAuto, setRunningAuto] = useState(false);
  const [autoMessage, setAutoMessage] = useState(null);

  // Top-level Workspace Section Tab ('milestones' | 'tech_routes' | 'overdue' | 'logs')
  const [activeSectionTab, setActiveSectionTab] = useState('milestones');

  // Automated Service Reminders Engine Milestone State ('all' | '30d' | '14d' | '7d' | '2d' | '1d' | '0d')
  const [activeMilestoneTab, setActiveMilestoneTab] = useState('all');
  const [runningDueBatch, setRunningDueBatch] = useState(false);
  const [dueBatchMessage, setDueBatchMessage] = useState(null);

  // Search, Phone Filter & Pagination inside Milestone Customer List
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyValidPhone, setOnlyValidPhone] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(25);

  // Custom Wording & Templates Backend Editor State
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [activeTemplateTab, setActiveTemplateTab] = useState('template_24h');
  const [templatesForm, setTemplatesForm] = useState(DEFAULT_TEMPLATES_FALLBACK);
  const [savingTemplates, setSavingTemplates] = useState(false);
  const [templateSaveMsg, setTemplateSaveMsg] = useState(null);

  // Direct Custom SMS / Notice Modal State
  const [showCustomSmsModal, setShowCustomSmsModal] = useState(false);
  const [customSmsPhone, setCustomSmsPhone] = useState('');
  const [customSmsRecipient, setCustomSmsRecipient] = useState('');
  const [customSmsMessage, setCustomSmsMessage] = useState('PestControl Pro Notice: ');
  const [customSmsPhoneMeta, setCustomSmsPhoneMeta] = useState(null);
  const [sendingCustomSms, setSendingCustomSms] = useState(false);
  const [customSmsResult, setCustomSmsResult] = useState(null);

  // Single Job SMS Modal State (Fully Editable & Validated)
  const [smsJobModal, setSmsJobModal] = useState(null); // { job, reminderType: '24H' | 'ARRIVAL' }
  const [modalPhone, setModalPhone] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalCustomNote, setModalCustomNote] = useState('');
  const [phoneMeta, setPhoneMeta] = useState(null);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState(null);
  const [savingModalTemplate, setSavingModalTemplate] = useState(false);

  // Technician Route SMS Dispatch State
  const [selectedTechSmsRoute, setSelectedTechSmsRoute] = useState(null);
  const [techSmsPhone, setTechSmsPhone] = useState('');
  const [techSmsMessage, setTechSmsMessage] = useState('');
  const [sendingTechSms, setSendingTechSms] = useState(false);
  const [techSmsResult, setTechSmsResult] = useState(null);

  // Bulk SMS Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkCustomTemplate, setBulkCustomTemplate] = useState('');
  const [bulkCustomNote, setBulkCustomNote] = useState('');
  const [runningBulk, setRunningBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  // Quick SMS Logs
  const [recentLogs, setRecentLogs] = useState([]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const [queueRes, logsRes] = await Promise.all([
        getRemindersQueue(),
        getSmsLogs({ limit: 25 })
      ]);
      setData(queueRes);
      if (queueRes?.sms_settings) {
        const s = queueRes.sms_settings;
        const nextTpl = {
          template_24h: s.template_24h || DEFAULT_TEMPLATES_FALLBACK.template_24h,
          template_arrival: s.template_arrival || DEFAULT_TEMPLATES_FALLBACK.template_arrival,
          template_tech_dispatch: s.template_tech_dispatch || DEFAULT_TEMPLATES_FALLBACK.template_tech_dispatch,
          template_completion: s.template_completion || DEFAULT_TEMPLATES_FALLBACK.template_completion,
          custom_note: s.custom_note || ''
        };
        setTemplatesForm(nextTpl);
        setBulkCustomTemplate(nextTpl.template_24h);
        setBulkCustomNote(nextTpl.custom_note);
      }
      if (logsRes.success) {
        setRecentLogs(logsRes.logs || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  // Reset pagination when changing milestone tab or search
  useEffect(() => {
    setVisibleLimit(25);
  }, [activeMilestoneTab, searchQuery, onlyValidPhone]);

  // Validate phone live inside single SMS modal
  useEffect(() => {
    if (modalPhone && modalPhone.length >= 9) {
      validatePhone(modalPhone)
        .then(res => setPhoneMeta(res))
        .catch(() => setPhoneMeta(null));
    } else {
      setPhoneMeta(null);
    }
  }, [modalPhone]);

  // Validate phone live inside custom SMS modal
  useEffect(() => {
    if (customSmsPhone && customSmsPhone.length >= 9) {
      validatePhone(customSmsPhone)
        .then(res => setCustomSmsPhoneMeta(res))
        .catch(() => setCustomSmsPhoneMeta(null));
    } else {
      setCustomSmsPhoneMeta(null);
    }
  }, [customSmsPhone]);

  const handleSaveBackendTemplates = async (e) => {
    if (e) e.preventDefault();
    setSavingTemplates(true);
    setTemplateSaveMsg(null);
    try {
      const res = await saveSmsTemplates(templatesForm);
      if (res.success) {
        setTemplateSaveMsg('Custom SMS wording & templates saved to backend! All queued reminder messages have been updated.');
        setTimeout(() => setTemplateSaveMsg(null), 5000);
        await loadQueue();
      }
    } catch (err) {
      alert(`Error saving custom wording: ${err.message}`);
    } finally {
      setSavingTemplates(false);
    }
  };

  const handleResetDefaultTemplates = async () => {
    const def = data?.default_templates || DEFAULT_TEMPLATES_FALLBACK;
    setTemplatesForm({
      template_24h: def.template_24h,
      template_arrival: def.template_arrival,
      template_tech_dispatch: def.template_tech_dispatch,
      template_completion: def.template_completion,
      custom_note: ''
    });
  };

  const insertPlaceholderIntoTemplate = (tag) => {
    setTemplatesForm(prev => ({
      ...prev,
      [activeTemplateTab]: `${prev[activeTemplateTab] || ''} ${tag}`.trim()
    }));
  };

  const handleSendWhatsApp = async (job, phone, message) => {
    if (!phone) {
      alert('No phone number recorded for this customer.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    try {
      await logReminderSent({
        job_id: job.id,
        channel: 'WhatsApp',
        recipient_name: job.customer_name,
        recipient_phone: phone
      });
      loadQueue();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenSmsModal = (job, reminderType = '24H') => {
    setSmsResult(null);
    setModalCustomNote('');
    const initialPhone = job.customer_phone || '';
    const initialMessage = job.sms_message || (reminderType === 'ARRIVAL'
      ? `PestControl Pro: Our specialist ${job.technician_name || 'Specialist'} is en-route for your scheduled ${job.treatment_code || 'service'} today at approx ${job.scheduled_time || 'today'}. Thank you for choosing PestControl Pro! Hotline: 011-2345678`
      : `PestControl Pro: Reminder that your ${job.treatment_code || 'service'} service is scheduled for ${job.scheduled_date || data?.tomorrow || 'tomorrow'} at ${job.scheduled_time || '09:00 AM'}. Specialist: ${job.technician_name || 'Field Specialist'}. To confirm or reschedule: 011-2345678`);

    setModalPhone(initialPhone);
    setModalMessage(initialMessage);
    setPhoneMeta(job.sms_operator ? { isValid: true, operator: job.sms_operator, nationalFormat: job.sms_formatted } : null);
    setSmsJobModal({ job, reminderType });
  };

  const handleSaveModalWordingToBackend = async () => {
    if (!smsJobModal || !modalMessage.trim()) return;
    setSavingModalTemplate(true);
    try {
      const targetField = smsJobModal.reminderType === 'ARRIVAL' ? 'template_arrival' : 'template_24h';
      const updated = {
        ...templatesForm,
        [targetField]: modalMessage.trim(),
        custom_note: modalCustomNote.trim() || templatesForm.custom_note
      };
      const res = await saveSmsTemplates(updated);
      if (res.success) {
        setTemplatesForm(updated);
        setSmsResult({
          success: true,
          message: `Saved this wording to Backend as default ${smsJobModal.reminderType === 'ARRIVAL' ? 'Arrival Alert' : '24-Hour Reminder'} template!`
        });
        await loadQueue();
      }
    } catch (err) {
      setSmsResult({ success: false, error: err.message });
    } finally {
      setSavingModalTemplate(false);
    }
  };

  const handleDispatchSms = async () => {
    if (!smsJobModal) return;
    if (!modalPhone || !modalPhone.trim()) {
      alert('Please enter a recipient mobile number (e.g. 0771234567)');
      return;
    }
    setSendingSms(true);
    setSmsResult(null);
    try {
      const finalMsg = modalCustomNote.trim()
        ? `${modalMessage.trim()} | ${modalCustomNote.trim()}`
        : modalMessage.trim();

      const res = await sendJobSmsReminder(smsJobModal.job.id, smsJobModal.reminderType, {
        phone: modalPhone.trim(),
        message: finalMsg,
        custom_note: modalCustomNote.trim()
      });
      setSmsResult(res);
      loadQueue();
    } catch (err) {
      setSmsResult({ success: false, error: err.message, message: err.message });
    } finally {
      setSendingSms(false);
    }
  };

  const handleDispatchCustomSms = async (e) => {
    if (e) e.preventDefault();
    if (!customSmsPhone.trim()) {
      alert('Please enter a recipient mobile number');
      return;
    }
    if (!customSmsMessage.trim()) {
      alert('Please enter custom Message Content');
      return;
    }
    setSendingCustomSms(true);
    setCustomSmsResult(null);
    try {
      const res = await sendCustomSms({
        phone: customSmsPhone.trim(),
        recipient_name: customSmsRecipient.trim() || 'Customer',
        message: customSmsMessage.trim()
      });
      setCustomSmsResult(res);
      loadQueue();
    } catch (err) {
      setCustomSmsResult({ success: false, error: err.message, message: err.message });
    } finally {
      setSendingCustomSms(false);
    }
  };

  const handleOpenTechSms = (tech) => {
    setTechSmsResult(null);
    setTechSmsPhone(tech.phone || '');
    setTechSmsMessage(
      tech.sms_route_message ||
      `PestControl Route (${data?.today}): Hi ${tech.full_name}, you have ${tech.total_jobs} jobs scheduled today. View details: ${data?.system_base_url || window.location.origin}/tech`
    );
    setSelectedTechSmsRoute(tech);
  };

  const handleDispatchTechSms = async () => {
    if (!selectedTechSmsRoute) return;
    if (!techSmsPhone || !techSmsPhone.trim()) {
      alert('Technician phone number is required');
      return;
    }
    setSendingTechSms(true);
    setTechSmsResult(null);
    try {
      const res = await sendTechDispatchSms({
        technician_id: selectedTechSmsRoute.id,
        technician_phone: techSmsPhone.trim(),
        technician_name: selectedTechSmsRoute.full_name,
        message: techSmsMessage.trim()
      });
      setTechSmsResult(res);
      loadQueue();
    } catch (err) {
      setTechSmsResult({ success: false, error: err.message, message: err.message });
    } finally {
      setSendingTechSms(false);
    }
  };

  const handleBulkSendSms = async () => {
    const validJobs = (data?.tomorrow_jobs || []).filter(j => j.has_valid_phone || j.sms_is_valid);
    if (validJobs.length === 0) {
      alert("None of tomorrow's scheduled jobs have a valid Sri Lankan phone number on record. Please update customer contacts first.");
      return;
    }
    setRunningBulk(true);
    setBulkResult(null);
    try {
      if (bulkCustomTemplate.trim()) {
        await saveSmsTemplates({
          ...templatesForm,
          template_24h: bulkCustomTemplate.trim(),
          custom_note: bulkCustomNote.trim()
        });
      }

      const res = await bulkSendSmsReminders({
        date: data?.tomorrow,
        reminder_type: '24H',
        job_ids: validJobs.map(j => j.id),
        custom_template: bulkCustomTemplate.trim() || null,
        custom_note: bulkCustomNote.trim() || ''
      });
      setBulkResult(res);
      loadQueue();
    } catch (err) {
      setBulkResult({ success: false, error: err.message, message: err.message });
    } finally {
      setRunningBulk(false);
    }
  };

  const handleViewTechRoute = async (techId) => {
    setLoadingRoute(true);
    try {
      const res = await getTechnicianRouteReminder(techId);
      setSelectedTechRoute(res);
    } catch (e) {
      alert(`Error loading route: ${e.message}`);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleSendTechRouteWhatsApp = (route) => {
    if (!route.whatsapp_phone) {
      alert('Technician does not have a phone number on record.');
      return;
    }
    const url = `https://wa.me/${route.whatsapp_phone}?text=${encodeURIComponent(route.whatsapp_message)}`;
    window.open(url, '_blank');
  };

  const handleTriggerAutomation = async () => {
    setRunningAuto(true);
    setAutoMessage(null);
    try {
      const res = await runDailyAutomation();
      setAutoMessage(`Auto-check complete! ${res.result.generatedJobsCount} new jobs generated, ${res.result.overdueJobsCount} overdue flagged.`);
      loadQueue();
    } catch (e) {
      setAutoMessage(`Error: ${e.message}`);
    } finally {
      setRunningAuto(false);
    }
  };

  const handleRunDueRemindersBatch = async () => {
    setRunningDueBatch(true);
    setDueBatchMessage(null);
    try {
      await runDailyAutomation();
      const milestonesMap = data?.milestones || {};
      const currentMilestoneJobs = milestonesMap[activeMilestoneTab] || milestonesMap.all || [];
      const validIds = currentMilestoneJobs
        .filter(j => j.has_valid_phone || j.sms_is_valid)
        .map(j => j.id);

      if (validIds.length > 0) {
        const res = await bulkSendSmsReminders({
          reminder_type: activeMilestoneTab === '0d' ? 'ARRIVAL' : '24H',
          job_ids: validIds,
          custom_template: activeMilestoneTab === '0d' ? templatesForm.template_arrival : templatesForm.template_24h,
          custom_note: templatesForm.custom_note || ''
        });
        setDueBatchMessage(res.message || `Dispatched due reminders batch for ${validIds.length} customer(s).`);
      } else {
        setDueBatchMessage('Due reminders batch executed and schedule intervals synchronized!');
      }
      await loadQueue();
    } catch (err) {
      setDueBatchMessage(`Batch Error: ${err.message}`);
    } finally {
      setRunningDueBatch(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3 bg-white rounded-3xl border border-purple-100 shadow-xs">
        <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
        <span className="font-bold text-purple-950">Loading Automated Service Reminders Engine...</span>
      </div>
    );
  }

  const counts = data?.counts || {};
  const smsSettings = data?.sms_settings || {};
  const validTomorrowCount = (data?.tomorrow_jobs || []).filter(j => j.has_valid_phone || j.sms_is_valid).length;

  // Filtered Customer List for the Active Milestone Tab
  const rawMilestoneJobs = data?.milestones?.[activeMilestoneTab] || [];
  const filteredMilestoneJobs = rawMilestoneJobs.filter(job => {
    if (onlyValidPhone && !(job.has_valid_phone || job.sms_is_valid)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = (job.customer_name || '').toLowerCase().includes(q);
      const matchPhone = (job.customer_phone || job.sms_formatted || '').toLowerCase().includes(q);
      const matchLoc = (job.location_name || '').toLowerCase().includes(q);
      const matchTreat = (job.treatment_code || job.treatment_name || '').toLowerCase().includes(q);
      const matchCode = (job.job_code || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchLoc && !matchTreat && !matchCode) return false;
    }
    return true;
  });

  const visibleMilestoneJobs = filteredMilestoneJobs.slice(0, visibleLimit);
  const activeTabMeta = MILESTONE_TABS.find(t => t.id === activeMilestoneTab) || MILESTONE_TABS[0];

  return (
    <div className="space-y-5 pb-14">

      {/* 1. CLEAN HERO COMMAND HEADER */}
      <div
        className="p-5 sm:p-6 rounded-3xl shadow-lg relative overflow-hidden text-white border border-purple-400/20"
        style={{
          background: 'linear-gradient(135deg, #2E054E 0%, #4C1D95 55%, #5B21B6 100%)'
        }}
      >
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-orange-500 text-white font-black text-[10px] uppercase tracking-wider shadow-xs">
                <Zap className="w-3 h-3" />
                <span>Automated Service Reminders Engine</span>
              </span>
              <span className="text-[11px] bg-white/15 border border-white/25 text-amber-200 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🇱🇰 Gateway: {smsSettings.provider || 'TEXT_LK'}</span>
                <span>({smsSettings.is_simulation ? 'Simulation' : 'Live'})</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Bell className="w-6 h-6 text-amber-400 shrink-0" />
              <span>Automated Reminders &amp; Custom SMS Dispatch</span>
            </h1>

            <p className="text-xs sm:text-sm text-purple-100 max-w-3xl font-medium">
              Automatic scheduling at <strong>30d, 14d, 7d, 2d, 1d, and Due date</strong> intervals with instant SMS &amp; WhatsApp integration.
            </p>
          </div>

          {/* Primary Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleRunDueRemindersBatch}
              disabled={runningDueBatch}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white font-black text-xs shadow-md transition transform active:scale-95 cursor-pointer disabled:opacity-60 border border-amber-400/50"
              style={{ background: 'linear-gradient(135deg, #FF8A00 0%, #EA580C 100%)' }}
            >
              <Zap className={`w-4 h-4 ${runningDueBatch ? 'animate-spin text-white' : 'text-white'}`} />
              <span>{runningDueBatch ? 'Running Batch...' : 'Run Due Reminders Batch'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCustomSmsResult(null);
                setShowCustomSmsModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-extrabold rounded-2xl transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-amber-300" />
              <span>Send Custom SMS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setBulkResult(null);
                setBulkCustomTemplate(templatesForm.template_24h);
                setBulkCustomNote(templatesForm.custom_note || '');
                setShowBulkModal(true);
              }}
              disabled={!data?.tomorrow_jobs || data.tomorrow_jobs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white border border-white/25 text-xs font-extrabold rounded-2xl transition cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-emerald-300" />
              <span>Bulk Tomorrow ({validTomorrowCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTemplateEditor(!showTemplateEditor)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-extrabold rounded-2xl transition cursor-pointer ${
                showTemplateEditor
                  ? 'bg-white text-purple-950 ring-2 ring-amber-400 shadow-md'
                  : 'bg-purple-900/70 hover:bg-purple-800 text-amber-200 border border-purple-400/30'
              }`}
            >
              <Edit3 className="w-4 h-4 text-amber-400" />
              <span>{showTemplateEditor ? 'Close Wording Editor' : 'SMS Wording Templates'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {(dueBatchMessage || autoMessage) && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{dueBatchMessage || autoMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setDueBatchMessage(null);
              setAutoMessage(null);
            }}
            className="text-emerald-700 hover:underline text-[11px] font-extrabold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. COLLAPSIBLE CUSTOM SMS WORDING & TEMPLATES EDITOR */}
      {showTemplateEditor && (
        <div className="bg-white rounded-3xl border-2 border-purple-200 shadow-lg overflow-hidden">
          <div
            className="p-4 sm:p-5 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ background: 'linear-gradient(90deg, #FAF5FF 0%, #FFF7ED 100%)' }}
          >
            <div>
              <h2 className="font-black text-purple-950 text-sm sm:text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <span>Custom SMS Wording &amp; Default Message Templates (Saved to Backend)</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Customize default <strong className="text-purple-900">Message Content:</strong> wording for Reminder Notices, Arrival Alerts, Technician Dispatch, and Completion SMS.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaultTemplates}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>
              <button
                type="button"
                onClick={handleSaveBackendTemplates}
                disabled={savingTemplates}
                className="px-4 py-2 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md transition cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #FF8A00 0%, #EA580C 100%)' }}
              >
                <Save className="w-4 h-4" />
                <span>{savingTemplates ? 'Saving...' : 'Save Wording to Backend'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveBackendTemplates} className="p-5 space-y-4">
            {templateSaveMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{templateSaveMsg}</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'template_24h', label: '⏰ Advance / 24h Reminder' },
                { id: 'template_arrival', label: '🚗 Due Date Arrival Notice' },
                { id: 'template_tech_dispatch', label: '👷 Technician Dispatch' },
                { id: 'template_completion', label: '✅ Job Completion' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTemplateTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                    activeTemplateTab === tab.id
                      ? 'bg-purple-900 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-purple-50 text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-1.5">
              <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>Click any placeholder tag to insert dynamic job info:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDER_CHIPS.map(chip => (
                  <button
                    key={chip.tag}
                    type="button"
                    onClick={() => insertPlaceholderIntoTemplate(chip.tag)}
                    className="px-2.5 py-1 bg-white hover:bg-orange-50 text-purple-900 hover:text-orange-700 border border-purple-200 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer shadow-2xs"
                  >
                    + {chip.tag} <span className="font-sans font-normal text-slate-500">({chip.label})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">
                  Message Content Template:
                </label>
                <textarea
                  value={templatesForm[activeTemplateTab] || ''}
                  onChange={(e) => setTemplatesForm({ ...templatesForm, [activeTemplateTab]: e.target.value })}
                  rows={4}
                  className="w-full p-3 bg-slate-50 border border-purple-200 rounded-2xl text-xs text-slate-900 font-sans leading-relaxed focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">
                  Extra Custom Note (Appended to reminders):
                </label>
                <textarea
                  value={templatesForm.custom_note || ''}
                  onChange={(e) => setTemplatesForm({ ...templatesForm, custom_note: e.target.value })}
                  rows={4}
                  placeholder="e.g. Please keep pets secured during spray treatment."
                  className="w-full p-3 bg-orange-50/40 border border-orange-200 rounded-2xl text-xs text-slate-900 font-sans leading-relaxed focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 3. CLEAN WORKSPACE NAVIGATION TABS */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            {
              id: 'milestones',
              label: 'Active Reminder Intervals',
              icon: Calendar,
              badge: data?.milestone_counts?.all ?? 0,
              badgeColor: 'bg-purple-100 text-purple-900'
            },
            {
              id: 'tech_routes',
              label: 'Technician Route Dispatch',
              icon: User,
              badge: counts.active_technicians || 0,
              badgeColor: 'bg-indigo-100 text-indigo-800'
            },
            {
              id: 'overdue',
              label: 'Overdue Follow-ups',
              icon: AlertTriangle,
              badge: counts.overdue_followups || 0,
              badgeColor: 'bg-rose-100 text-rose-800'
            },
            {
              id: 'logs',
              label: 'Recent SMS History',
              icon: Radio,
              badge: recentLogs.length,
              badgeColor: 'bg-emerald-100 text-emerald-800'
            }
          ].map(section => {
            const Icon = section.icon;
            const isActive = activeSectionTab === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionTab(section.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{section.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  isActive ? 'bg-white/25 text-white' : section.badgeColor
                }`}>
                  {section.badge}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => loadQueue()}
          className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center gap-1.5 transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: ACTIVE REMINDER INTERVALS (30d, 14d, 7d, 2d, 1d, Due Date 0d)
         ===================================================================== */}
      {activeSectionTab === 'milestones' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Milestone Interval Cards */}
          <div className="p-5 sm:p-6 bg-gradient-to-b from-purple-50/40 to-white border-b border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-700" />
                  <span>Active Reminder Intervals</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Click any milestone tab to view customer list:
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-purple-900 bg-purple-100/80 border border-purple-200 px-3 py-1 rounded-full">
                  {activeTabMeta.label}: <strong>{filteredMilestoneJobs.length}</strong> customer(s)
                </span>
              </div>
            </div>

            {/* 7 Milestone Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {MILESTONE_TABS.map(tab => {
                const count = data?.milestone_counts?.[tab.id] ?? (data?.milestones?.[tab.id]?.length || 0);
                const isSelected = activeMilestoneTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveMilestoneTab(tab.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-gradient-to-br from-[#4C1D95] to-[#6D28D9] text-white border-purple-900 shadow-md scale-[1.02] ring-2 ring-orange-400/70'
                        : 'bg-white hover:bg-purple-50/50 text-slate-800 border-slate-200 hover:border-purple-300 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 w-full">
                      <span className={`text-xs font-black leading-snug ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {tab.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black shrink-0 border ${
                        isSelected ? 'bg-orange-500 text-white border-orange-400' : tab.badgeClass
                      }`}>
                        {count}
                      </span>
                    </div>
                    <div className={`text-[10px] mt-2 font-semibold ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                      {tab.sub}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Search & Quick Filter Bar */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer, phone number, location, or treatment..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOnlyValidPhone(!onlyValidPhone)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer ${
                    onlyValidPhone
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Valid Mobile Only</span>
                </button>

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Customer List Table */}
          {filteredMilestoneJobs.length === 0 ? (
            <div className="p-14 text-center space-y-2">
              <div className="text-slate-400 font-bold text-sm">
                No scheduled customer services found for "{activeTabMeta.label}".
              </div>
              {(searchQuery || onlyValidPhone) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setOnlyValidPhone(false);
                  }}
                  className="px-4 py-2 bg-purple-50 text-purple-800 rounded-xl text-xs font-bold hover:bg-purple-100 transition cursor-pointer"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Milestone &amp; Countdown</th>
                      <th className="px-4 py-3">Service Date &amp; Time</th>
                      <th className="px-4 py-3">Customer &amp; Phone</th>
                      <th className="px-4 py-3">Location &amp; Treatment</th>
                      <th className="px-4 py-3">SMS / WhatsApp Preview</th>
                      <th className="px-4 py-3 text-right">Instant Dispatch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleMilestoneJobs.map(job => {
                      const isValidPhone = Boolean(job.has_valid_phone || job.sms_is_valid);
                      const reminderType = job.days_remaining === 0 ? 'ARRIVAL' : '24H';
                      const msTab = MILESTONE_TABS.find(m => m.id === job.milestone_id) || MILESTONE_TABS[0];

                      return (
                        <tr key={`ms-${job.id}`} className="hover:bg-purple-50/30 transition">
                          {/* Milestone Badge */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${msTab.pillClass}`}>
                              {job.milestone_label}
                            </span>
                            <div className="text-[11px] font-bold text-slate-500 mt-1">
                              {job.days_remaining === 0
                                ? '🔴 Due Today'
                                : job.days_remaining === 1
                                ? '🟠 Tomorrow (1 Day)'
                                : job.days_remaining === 2
                                ? '🟢 In 2 Days'
                                : `⏱️ In ${job.days_remaining} Days`}
                            </div>
                          </td>

                          {/* Date & Time */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="font-black text-slate-900 font-mono text-xs">{job.scheduled_date}</div>
                            <div className="text-[11px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{job.scheduled_time || '09:00'}</span>
                            </div>
                          </td>

                          {/* Customer & Phone */}
                          <td className="px-4 py-3.5">
                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{job.customer_name}</div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span className="font-mono font-semibold text-slate-700">
                                {job.sms_formatted || job.customer_phone || 'No phone'}
                              </span>
                              {job.sms_operator && (
                                <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-1.5 py-0.2 rounded">
                                  {job.sms_operator}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Location & Treatment */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 font-black text-[10px] uppercase">
                                {job.treatment_code}
                              </span>
                              {job.recurring_frequency && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                                  {job.recurring_frequency}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{job.location_name || 'Main Location'}</span>
                            </div>
                          </td>

                          {/* Message Preview */}
                          <td className="px-4 py-3.5 max-w-xs">
                            <div className="text-[11px] text-slate-600 line-clamp-2 font-sans bg-slate-50 p-2 rounded-xl border border-slate-200/80">
                              {job.sms_message}
                            </div>
                          </td>

                          {/* Dispatch Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {job.customer_phone && (
                                <button
                                  type="button"
                                  onClick={() => handleSendWhatsApp(job, job.whatsapp_phone, job.whatsapp_message)}
                                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold rounded-xl text-xs inline-flex items-center gap-1 border border-emerald-200 transition cursor-pointer"
                                  title="Send WhatsApp Reminder"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenSmsModal(job, reminderType)}
                                className={`px-3 py-1.5 font-extrabold rounded-xl text-xs inline-flex items-center gap-1 transition cursor-pointer ${
                                  isValidPhone
                                    ? 'bg-purple-800 hover:bg-purple-900 text-white shadow-2xs'
                                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                                title="Customize & Send SMS"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                                <span>{isValidPhone ? 'Send SMS' : 'Set Phone & SMS'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              {filteredMilestoneJobs.length > visibleLimit && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">
                    Showing <strong>{visibleMilestoneJobs.length}</strong> of <strong>{filteredMilestoneJobs.length}</strong> customers in {activeTabMeta.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setVisibleLimit(prev => prev + 50)}
                      className="px-4 py-2 bg-purple-800 hover:bg-purple-900 text-white font-extrabold rounded-xl transition cursor-pointer shadow-2xs"
                    >
                      Load 50 More
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisibleLimit(filteredMilestoneJobs.length)}
                      className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold rounded-xl transition cursor-pointer"
                    >
                      Show All ({filteredMilestoneJobs.length})
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 2: TECHNICIAN ROUTE DISPATCH
         ===================================================================== */}
      {activeSectionTab === 'tech_routes' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-900 text-base flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" />
                <span>Technician Morning Route Dispatch ({data?.technicians_routes?.length || 0})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Send each technician their complete stop list, client phone numbers, and mobile work panel link via WhatsApp or SMS.
              </p>
            </div>
          </div>

          {data?.technicians_routes?.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No active technician routes scheduled for today ({data?.today}).</div>
          ) : (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.technicians_routes?.map(tech => (
                <div key={tech.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 hover:border-purple-300 transition">
                  <div className="flex items-center justify-between">
                    <div className="font-black text-slate-900 text-sm">{tech.full_name}</div>
                    <span className="text-[11px] font-black bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full">
                      {tech.total_jobs} job(s) today
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-mono font-semibold">{tech.sms_formatted || tech.phone || 'No phone recorded'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleViewTechRoute(tech.id)}
                      className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp Route</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenTechSms(tech)}
                      className="py-2 px-3 bg-purple-800 hover:bg-purple-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-amber-300" />
                      <span>Route SMS</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 3: OVERDUE FOLLOW-UPS
         ===================================================================== */}
      {activeSectionTab === 'overdue' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-black text-rose-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <span>Overdue Service Follow-ups ({data?.overdue_jobs?.length || 0})</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Jobs scheduled prior to today ({data?.today}) that require rescheduling or customer follow-up.
              </p>
            </div>
          </div>

          {!data?.overdue_jobs || data.overdue_jobs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No overdue jobs requiring follow-up.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-50/60 text-rose-900 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Scheduled Date</th>
                    <th className="px-4 py-3">Job Code</th>
                    <th className="px-4 py-3">Customer &amp; Phone</th>
                    <th className="px-4 py-3">Location &amp; Treatment</th>
                    <th className="px-4 py-3">Technician</th>
                    <th className="px-4 py-3 text-right">Follow-Up Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.overdue_jobs.map(job => (
                    <tr key={job.id} className="hover:bg-rose-50/20">
                      <td className="px-4 py-3 font-mono font-black text-rose-700">{job.scheduled_date}</td>
                      <td className="px-4 py-3 font-mono text-slate-700 font-bold">{job.job_code}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{job.customer_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{job.customer_phone || 'No phone'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-black text-purple-800">{job.treatment_code}</span>
                        <span className="text-slate-500 ml-1.5">({job.location_name || 'Main'})</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-semibold">{job.technician_name || 'Unassigned'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenSmsModal(job, '24H')}
                          className="px-3 py-1.5 bg-purple-800 hover:bg-purple-900 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                          <span>Send Follow-up SMS</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          TAB 4: RECENT SMS DELIVERY HISTORY
         ===================================================================== */}
      {activeSectionTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-600" />
                <span>Recent Sri Lanka SMS Delivery History ({recentLogs.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Audit log of simulated and live SMS dispatches sent through {smsSettings.provider || 'TEXT_LK'}.
              </p>
            </div>
          </div>

          {recentLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">No SMS dispatched yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Recipient &amp; Mobile</th>
                    <th className="px-4 py-3">Job Ref</th>
                    <th className="px-4 py-3">Gateway</th>
                    <th className="px-4 py-3">Message Content Sent</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">{l.created_at}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        <div>{l.recipient_name || 'Customer'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{l.phone}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{l.job_code || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 font-semibold">{l.gateway}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-md">{l.message}</td>
                      <td className="px-4 py-3 text-right font-bold whitespace-nowrap">
                        {l.status === 'SENT' && <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px]">● Sent</span>}
                        {l.status === 'SIMULATED' && <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px]">● Simulated</span>}
                        {l.status === 'FAILED' && <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-[10px]">● Failed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SINGLE JOB SMS DISPATCH MODAL */}
      {smsJobModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-purple-200 max-w-lg w-full overflow-hidden my-4">
            <div
              className="p-5 text-white flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #2E054E 0%, #4C1D95 100%)' }}
            >
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>
                    {smsJobModal.reminderType === 'ARRIVAL' ? 'Send Arrival Notice SMS' : 'Send Service Reminder SMS'}
                  </span>
                </h3>
                <span className="text-[11px] text-purple-200">
                  Gateway: {smsSettings.provider || 'TEXT_LK'} ({smsSettings.is_simulation ? 'Simulation Mode' : 'Live Carrier Mode'})
                </span>
              </div>
              <button onClick={() => setSmsJobModal(null)} className="text-purple-200 hover:text-white font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="p-6 text-xs space-y-4">
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Recipient Client:</span>
                  <span className="text-purple-950">{smsJobModal.job.customer_name}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Job Code &amp; Date:</span>
                  <span className="font-mono font-bold text-slate-700">{smsJobModal.job.job_code} ({smsJobModal.job.scheduled_date} @ {smsJobModal.job.scheduled_time || '09:00'})</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Service &amp; Specialist:</span>
                  <span className="font-bold text-orange-600">{smsJobModal.job.treatment_code} — {smsJobModal.job.technician_name || 'Field Specialist'}</span>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">Recipient Mobile Number (Sri Lanka):</label>
                <input
                  type="text"
                  value={modalPhone}
                  onChange={(e) => setModalPhone(e.target.value)}
                  placeholder="e.g. 0771234567 or 94771234567"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
                {phoneMeta && (
                  <div className="mt-1 text-[11px]">
                    {phoneMeta.isValid ? (
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {phoneMeta.nationalFormat} ({phoneMeta.operator})
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> {phoneMeta.error || 'Invalid Sri Lanka number format'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-orange-500" />
                    <span>Message Content: (Editable Custom Wording)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSaveModalWordingToBackend}
                    disabled={savingModalTemplate}
                    className="text-[11px] bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <Save className="w-3 h-3 text-purple-700" />
                    <span>{savingModalTemplate ? 'Saving...' : 'Save Wording to Backend'}</span>
                  </button>
                </div>
                <textarea
                  value={modalMessage}
                  onChange={(e) => setModalMessage(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-purple-50/40 border-2 border-purple-200 rounded-2xl text-slate-900 font-sans text-xs leading-relaxed focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-2">
                <label className="font-extrabold text-orange-950 block text-[11px]">
                  + Add Custom Extra Wording / Instruction (Optional):
                </label>
                <input
                  type="text"
                  value={modalCustomNote}
                  onChange={(e) => setModalCustomNote(e.target.value)}
                  placeholder="Type extra custom note..."
                  className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {QUICK_CUSTOM_PHRASES.map((phrase, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setModalMessage(prev => `${prev.trim()} ${phrase}`)}
                      className="text-[10px] bg-white hover:bg-orange-100 text-slate-700 border border-orange-200 px-2 py-0.5 rounded-lg transition cursor-pointer"
                    >
                      + "{phrase}"
                    </button>
                  ))}
                </div>
              </div>

              {smsResult && (
                <div className={`p-3 rounded-xl text-xs border ${
                  smsResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="font-bold flex items-center gap-1">
                    {smsResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{smsResult.message || (smsResult.success ? 'SMS dispatched successfully' : smsResult.error)}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSmsJobModal(null)}
                  className="px-4 py-2 font-bold text-slate-600 text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleDispatchSms}
                  disabled={sendingSms || !modalPhone.trim()}
                  className="px-5 py-2.5 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #FF8A00 0%, #EA580C 100%)' }}
                >
                  <Send className={`w-3.5 h-3.5 ${sendingSms ? 'animate-spin' : ''}`} />
                  <span>{sendingSms ? 'Sending SMS...' : `Send SMS via ${smsSettings.provider || 'Gateway'}`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEND DIRECT CUSTOM SMS NOTICE MODAL */}
      {showCustomSmsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-purple-200 max-w-lg w-full overflow-hidden my-4">
            <div
              className="p-5 text-white flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #2E054E 0%, #4C1D95 100%)' }}
            >
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>Send Custom SMS / Direct Notice</span>
                </h3>
                <span className="text-[11px] text-purple-200">
                  Send any custom message content to a client or technician mobile number
                </span>
              </div>
              <button onClick={() => setShowCustomSmsModal(false)} className="text-purple-200 hover:text-white font-bold text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleDispatchCustomSms} className="p-6 text-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">Recipient Name:</label>
                  <input
                    type="text"
                    value={customSmsRecipient}
                    onChange={(e) => setCustomSmsRecipient(e.target.value)}
                    placeholder="e.g. Mr. Perera / ABC Hotel"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-800 block mb-1">Mobile Number (Sri Lanka) *:</label>
                  <input
                    type="text"
                    value={customSmsPhone}
                    onChange={(e) => setCustomSmsPhone(e.target.value)}
                    placeholder="0771234567"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs text-slate-800 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              {customSmsPhoneMeta && (
                <div className="text-[11px]">
                  {customSmsPhoneMeta.isValid ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {customSmsPhoneMeta.nationalFormat} ({customSmsPhoneMeta.operator})
                    </span>
                  ) : (
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> {customSmsPhoneMeta.error}
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">Message Content: *</label>
                <textarea
                  value={customSmsMessage}
                  onChange={(e) => setCustomSmsMessage(e.target.value)}
                  rows={4}
                  required
                  placeholder="Type your custom SMS wording here..."
                  className="w-full p-3 bg-purple-50/40 border-2 border-purple-200 rounded-2xl text-slate-900 font-sans text-xs leading-relaxed focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none"
                />
              </div>

              {customSmsResult && (
                <div className={`p-3 rounded-xl text-xs border ${
                  customSmsResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="font-bold flex items-center gap-1">
                    {customSmsResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{customSmsResult.message || customSmsResult.error}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomSmsModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={sendingCustomSms || !customSmsPhone.trim() || !customSmsMessage.trim()}
                  className="px-5 py-2.5 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #FF8A00 0%, #EA580C 100%)' }}
                >
                  <Send className={`w-3.5 h-3.5 ${sendingCustomSms ? 'animate-spin' : ''}`} />
                  <span>{sendingCustomSms ? 'Sending...' : 'Send Custom SMS Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK SEND ALL SMS MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-purple-200 max-w-xl w-full overflow-hidden my-4">
            <div
              className="p-5 text-white flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #2E054E 0%, #4C1D95 100%)' }}
            >
              <div>
                <h3 className="font-black text-base flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Bulk 24-Hour SMS Dispatch (Custom Wording)</span>
                </h3>
                <span className="text-[11px] text-purple-200">
                  Target Date: <strong>{data?.tomorrow}</strong>
                </span>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="text-purple-200 hover:text-white font-bold text-lg cursor-pointer">✕</button>
            </div>

            <div className="p-6 text-xs space-y-4">
              <div className="space-y-1.5">
                <label className="font-extrabold text-slate-800 block">
                  Message Content Template (Sent to All Ready Clients):
                </label>
                <textarea
                  value={bulkCustomTemplate}
                  onChange={(e) => setBulkCustomTemplate(e.target.value)}
                  rows={3}
                  className="w-full p-3 bg-purple-50/40 border-2 border-purple-200 rounded-2xl text-slate-900 font-sans text-xs leading-relaxed focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none"
                />
              </div>

              {bulkResult && (
                <div className={`p-3 rounded-xl text-xs border ${
                  bulkResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="font-bold flex items-center gap-1">
                    {bulkResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
                    <span>{bulkResult.message}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleBulkSendSms}
                  disabled={runningBulk || validTomorrowCount === 0}
                  className="px-5 py-2.5 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #FF8A00 0%, #EA580C 100%)' }}
                >
                  <Send className={`w-3.5 h-3.5 ${runningBulk ? 'animate-spin' : ''}`} />
                  <span>{runningBulk ? 'Dispatching SMS...' : `Dispatch to ${validTomorrowCount} Clients`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TECHNICIAN ROUTE SMS MODAL */}
      {selectedTechSmsRoute && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-purple-200 max-w-md w-full overflow-hidden">
            <div
              className="p-5 text-white flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #2E054E 0%, #4C1D95 100%)' }}
            >
              <div>
                <h3 className="font-black text-base flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-amber-400" />
                  <span>Dispatch Route SMS: {selectedTechSmsRoute.full_name}</span>
                </h3>
              </div>
              <button onClick={() => setSelectedTechSmsRoute(null)} className="text-purple-200 hover:text-white font-bold cursor-pointer">✕</button>
            </div>

            <div className="p-6 text-xs space-y-4">
              <div>
                <label className="font-extrabold text-slate-800 block mb-1">Technician Mobile Number:</label>
                <input
                  type="text"
                  value={techSmsPhone}
                  onChange={(e) => setTechSmsPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">Message Content:</label>
                <textarea
                  value={techSmsMessage}
                  onChange={(e) => setTechSmsMessage(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-purple-50/40 border-2 border-purple-200 rounded-2xl text-slate-900 font-sans text-xs leading-relaxed focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              {techSmsResult && (
                <div className={`p-3 rounded-xl text-xs border ${
                  techSmsResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="font-bold flex items-center gap-1">
                    {techSmsResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{techSmsResult.message || techSmsResult.error}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedTechSmsRoute(null)}
                  className="px-4 py-2 font-bold text-slate-600 text-xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleDispatchTechSms}
                  disabled={sendingTechSms || !techSmsPhone.trim()}
                  className="px-5 py-2.5 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition disabled:opacity-50 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #FF8A00 0%, #EA580C 100%)' }}
                >
                  <Send className={`w-3.5 h-3.5 ${sendingTechSms ? 'animate-spin' : ''}`} />
                  <span>{sendingTechSms ? 'Sending...' : 'Dispatch Route via SMS'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Technician Route Modal WhatsApp Preview */}
      {selectedTechRoute && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-slate-900 text-base">Route Dispatch: {selectedTechRoute.technician?.full_name}</h2>
              <button onClick={() => setSelectedTechRoute(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <div className="text-xs space-y-2">
              <div className="font-semibold text-slate-600">WhatsApp Message Content (Editable):</div>
              <textarea
                value={selectedTechRoute.whatsapp_message || ''}
                onChange={(e) => setSelectedTechRoute({ ...selectedTechRoute, whatsapp_message: e.target.value })}
                rows={7}
                className="w-full bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedTechRoute(null)}
                className="px-4 py-2 font-semibold text-slate-600 text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendTechRouteWhatsApp(selectedTechRoute)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Open in WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
