import React, { useState, useEffect } from 'react';
import {
  Bell, Send, CheckCircle2, Clock, AlertTriangle, User,
  Calendar, Phone, MessageSquare, Zap, ExternalLink, RefreshCw,
  Smartphone, Radio, ListFilter, Check, DollarSign, Layers, Edit3, ShieldAlert,
  Save, RotateCcw, PlusCircle, Sparkles, FileText
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

export default function RemindersView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTechRoute, setSelectedTechRoute] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [runningAuto, setRunningAuto] = useState(false);
  const [autoMessage, setAutoMessage] = useState(null);

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
        getSmsLogs({ limit: 15 })
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
      // Save custom template to backend if user modified it
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

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-purple-600" /> Loading automated reminder queue...
      </div>
    );
  }

  const counts = data?.counts || {};
  const smsSettings = data?.sms_settings || {};
  const validTomorrowCount = (data?.tomorrow_jobs || []).filter(j => j.has_valid_phone || j.sms_is_valid).length;

  return (
    <div className="space-y-6 pb-12">

      {/* Royal Purple & Vibrant Orange Header */}
      <div
        className="p-5 sm:p-6 rounded-3xl shadow-xl relative overflow-hidden text-white"
        style={{
          background: 'linear-gradient(135deg, #2E054E 0%, #4C1D95 55%, #5B21B6 100%)',
          boxShadow: '0 14px 34px rgba(59, 7, 100, 0.22)'
        }}
      >
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0"
                style={{ background: 'linear-gradient(135deg, #FF8A00 0%, #F97316 100%)' }}
              >
                <Bell className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Automated Reminders & Custom SMS Dispatch
              </h1>
              <span className="text-[10px] bg-white/15 border border-white/25 text-amber-200 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span>🇱🇰 Gateway: {smsSettings.provider || 'TEXT_LK'}</span>
                <span>({smsSettings.is_simulation ? 'Simulation' : 'Live'})</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-purple-200 mt-1.5">
              Customize your SMS wording & notice templates in the backend, edit <strong className="text-amber-300">Message Content:</strong> before sending, or dispatch custom notices to any client.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Customize SMS Wording Button */}
            <button
              onClick={() => setShowTemplateEditor(!showTemplateEditor)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer ${
                showTemplateEditor
                  ? 'bg-white text-purple-950 ring-2 ring-amber-400'
                  : 'bg-purple-800/80 hover:bg-purple-700 text-white border border-purple-400/30'
              }`}
            >
              <Edit3 className="w-4 h-4 text-amber-400" />
              <span>{showTemplateEditor ? 'Hide Wording Editor' : 'Custom SMS Wording (Backend)'}</span>
            </button>

            {/* Send Custom SMS Notice Button */}
            <button
              onClick={() => {
                setCustomSmsResult(null);
                setShowCustomSmsModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-white text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #FF8A00 0%, #EA580C 100%)' }}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send Custom SMS Notice</span>
            </button>

            {/* Bulk Send All SMS Button */}
            <button
              onClick={() => {
                setBulkResult(null);
                setBulkCustomTemplate(templatesForm.template_24h);
                setBulkCustomNote(templatesForm.custom_note || '');
                setShowBulkModal(true);
              }}
              disabled={!data?.tomorrow_jobs || data.tomorrow_jobs.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white border border-white/25 text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-amber-300" />
              <span>Bulk Send Tomorrow ({validTomorrowCount} Ready)</span>
            </button>

            <button
              onClick={handleTriggerAutomation}
              disabled={runningAuto}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer"
            >
              <Zap className={`w-4 h-4 ${runningAuto ? 'animate-spin text-amber-300' : ''}`} />
              <span>{runningAuto ? 'Checking...' : 'Auto Engine'}</span>
            </button>
          </div>
        </div>
      </div>

      {autoMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{autoMessage}</span>
        </div>
      )}

      {/* CUSTOM SMS WORDING & TEMPLATES EDITOR PANEL (SAVES TO BACKEND) */}
      {showTemplateEditor && (
        <div className="bg-white rounded-3xl border-2 border-purple-200 shadow-lg overflow-hidden">
          <div
            className="p-4 sm:p-5 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ background: 'linear-gradient(90deg, #FAF5FF 0%, #FFF7ED 100%)' }}
          >
            <div>
              <h2 className="font-black text-purple-950 text-sm sm:text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <span>Custom SMS Wording & Default Message Content Templates (Backend)</span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Customize the default <strong className="text-purple-900">Message Content:</strong> wording for Reminder Notices, Arrival Alerts, Technician Dispatch, and Completion SMS. Saved directly to the backend database.
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
                <span>{savingTemplates ? 'Saving to Backend...' : 'Save Custom Wording to Backend'}</span>
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

            {/* Template Type Selector Tabs */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'template_24h', label: '⏰ 24-Hour Reminder Notice' },
                { id: 'template_arrival', label: '🚗 Today Arrival Notice' },
                { id: 'template_tech_dispatch', label: '👷 Technician Job Dispatch' },
                { id: 'template_completion', label: '✅ Job Completion Notice' }
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

            {/* Dynamic Placeholder Chips */}
            <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-1.5">
              <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>Click any tag below to insert dynamic job data into your custom Message Content:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDER_CHIPS.map(chip => (
                  <button
                    key={chip.tag}
                    type="button"
                    onClick={() => insertPlaceholderIntoTemplate(chip.tag)}
                    className="px-2.5 py-1 bg-white hover:bg-orange-50 text-purple-900 hover:text-orange-700 border border-purple-200 rounded-lg text-[11px] font-mono font-bold transition cursor-pointer shadow-2xs"
                    title={`Insert ${chip.label}`}
                  >
                    + {chip.tag} <span className="font-sans font-normal text-slate-500">({chip.label})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Active Template Textarea */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">
                  Message Content Template ({
                    activeTemplateTab === 'template_24h' ? '24-Hour Reminder Notice' :
                    activeTemplateTab === 'template_arrival' ? 'Same-Day Arrival Notice' :
                    activeTemplateTab === 'template_tech_dispatch' ? 'Technician Dispatch SMS' :
                    'Job Completion SMS'
                  }):
                </label>
                <textarea
                  value={templatesForm[activeTemplateTab] || ''}
                  onChange={(e) => setTemplatesForm({ ...templatesForm, [activeTemplateTab]: e.target.value })}
                  rows={4}
                  placeholder="Enter your custom SMS message wording here..."
                  className="w-full p-3 bg-slate-50 border border-purple-200 rounded-2xl text-xs text-slate-900 font-sans leading-relaxed focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none"
                />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>You can write in English, Sinhala, or Tamil + include any custom contact numbers.</span>
                  <span>Length: {(templatesForm[activeTemplateTab] || '').length} chars</span>
                </div>
              </div>

              {/* Custom Note / Extra Text Appended to All Reminders */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">
                  Extra Custom Note / Wording (Optional — appended to reminders):
                </label>
                <textarea
                  value={templatesForm.custom_note || ''}
                  onChange={(e) => setTemplatesForm({ ...templatesForm, custom_note: e.target.value })}
                  rows={4}
                  placeholder="e.g. Please keep pets secured during spray treatment. Emergency Hotline: 077-1234567"
                  className="w-full p-3 bg-orange-50/40 border border-orange-200 rounded-2xl text-xs text-slate-900 font-sans leading-relaxed focus:ring-2 focus:ring-orange-500 focus:bg-white focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 block">
                  Any text entered here is automatically added to your SMS reminders unless cleared.
                </span>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Queue Counter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Tomorrow's Alerts (24h)</span>
          <div className="text-2xl font-black text-purple-800 mt-0.5">{counts.tomorrow_reminders || 0}</div>
          <span className="text-[11px] text-slate-500 mt-0.5">Upcoming services</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Today's Arrival Alerts</span>
          <div className="text-2xl font-black text-orange-600 mt-0.5">{counts.today_reminders || 0}</div>
          <span className="text-[11px] text-slate-500 mt-0.5">Technicians on route</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Active Technicians</span>
          <div className="text-2xl font-black text-indigo-600 mt-0.5">{counts.active_technicians || 0}</div>
          <span className="text-[11px] text-slate-500 mt-0.5">Routes scheduled today</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Overdue Follow-ups
          </span>
          <div className="text-2xl font-black text-rose-600 mt-0.5">{counts.overdue_followups || 0}</div>
          <span className="text-[11px] text-rose-500 mt-0.5">Needs customer contact</span>
        </div>
      </div>

      {/* Section 1: 24-Hour Upcoming Service Client Reminders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-700" />
              <span>Upcoming Tomorrow: 24-Hour Client Reminders ({data?.tomorrow_jobs?.length || 0})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Scheduled for {data?.tomorrow}. Click <strong>Customize & Send SMS</strong> on any job to edit <code>Message Content:</code> before sending.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowTemplateEditor(true);
                setActiveTemplateTab('template_24h');
              }}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition border border-purple-200 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-orange-500" />
              <span>Edit 24h Wording</span>
            </button>

            {data?.tomorrow_jobs?.length > 0 && (
              <button
                onClick={() => {
                  setBulkResult(null);
                  setBulkCustomTemplate(templatesForm.template_24h);
                  setBulkCustomNote(templatesForm.custom_note || '');
                  setShowBulkModal(true);
                }}
                className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-lg text-xs flex items-center gap-1.5 transition border border-orange-200 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Bulk Send ({validTomorrowCount} Ready) via SMS</span>
              </button>
            )}
          </div>
        </div>

        {data?.tomorrow_jobs?.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No jobs scheduled for tomorrow ({data?.tomorrow}).</div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Client & Contact</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Treatment</th>
                  <th className="px-4 py-2.5">Message Preview</th>
                  <th className="px-4 py-2.5 text-right">Dispatch Channels</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.tomorrow_jobs?.map(job => {
                  const isValidPhone = Boolean(job.has_valid_phone || job.sms_is_valid);
                  return (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{job.scheduled_time || '09:00'}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{job.customer_name}</div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{job.sms_formatted || job.customer_phone || 'No phone'}</span>
                          {job.sms_operator && (
                            <span className="text-[9px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded">
                              {job.sms_operator}
                            </span>
                          )}
                          {job.contact_person && <span className="text-slate-400">({job.contact_person})</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{job.location_name || 'Main Location'}</td>
                      <td className="px-4 py-3 font-bold text-purple-800">{job.treatment_code}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-[11px] text-slate-600 line-clamp-2 font-sans bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                          {job.sms_message}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {job.customer_phone && (
                            <button
                              onClick={() => handleSendWhatsApp(job, job.whatsapp_phone, job.whatsapp_message)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs inline-flex items-center gap-1 border border-emerald-200 transition cursor-pointer"
                              title="Open WhatsApp chat"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenSmsModal(job, '24H')}
                            className={`px-3 py-1.5 font-bold rounded-lg text-xs inline-flex items-center gap-1 transition cursor-pointer ${
                              isValidPhone
                                ? 'bg-purple-800 hover:bg-purple-900 text-white shadow-2xs'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                            title="Edit Message Content & Send SMS"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                            <span>{isValidPhone ? 'Customize & Send SMS' : 'Enter Phone & SMS'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Today's Arrival Alerts */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span>Today's Arrival Alerts ({data?.today_jobs?.length || 0})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Notify customers when specialist is heading to their premises today ({data?.today}).</p>
          </div>
          <button
            onClick={() => {
              setShowTemplateEditor(true);
              setActiveTemplateTab('template_arrival');
            }}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold rounded-lg text-xs flex items-center gap-1.5 transition border border-purple-200 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5 text-orange-500" />
            <span>Edit Arrival Wording</span>
          </button>
        </div>

        {data?.today_jobs?.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No jobs scheduled for today ({data?.today}).</div>
        ) : (
          <div className="divide-y divide-slate-100 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2.5">Time</th>
                  <th className="px-4 py-2.5">Client & Contact</th>
                  <th className="px-4 py-2.5">Location</th>
                  <th className="px-4 py-2.5">Treatment</th>
                  <th className="px-4 py-2.5">Message Preview</th>
                  <th className="px-4 py-2.5 text-right">Dispatch Channels</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.today_jobs?.map(job => {
                  const isValidPhone = Boolean(job.has_valid_phone || job.sms_is_valid);
                  return (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{job.scheduled_time || '09:00'}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{job.customer_name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span className="font-mono">{job.sms_formatted || job.customer_phone || 'No phone'}</span>
                          {job.sms_operator && (
                            <span className="text-[9px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded">
                              {job.sms_operator}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{job.location_name || 'Main Location'}</td>
                      <td className="px-4 py-3 font-bold text-purple-800">{job.treatment_code}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-[11px] text-slate-600 line-clamp-2 font-sans bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                          {job.sms_message}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {job.customer_phone && (
                            <button
                              onClick={() => handleSendWhatsApp(job, job.whatsapp_phone, job.whatsapp_message)}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-xs inline-flex items-center gap-1 border border-emerald-200 transition cursor-pointer"
                              title="Open WhatsApp chat"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenSmsModal(job, 'ARRIVAL')}
                            className={`px-3 py-1.5 font-bold rounded-lg text-xs inline-flex items-center gap-1 transition cursor-pointer ${
                              isValidPhone
                                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-2xs'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                            title="Edit Message Content & Send Arrival SMS"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{isValidPhone ? 'Customize & Send Arrival SMS' : 'Enter Phone & SMS'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 3: Technician Daily Route Reminders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Technician Morning Route Dispatch ({data?.technicians_routes?.length || 0})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Send each technician their complete stop list, client phone numbers, and navigation details via WhatsApp or custom SMS.</p>
          </div>
        </div>

        {data?.technicians_routes?.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">No active technician routes today.</div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data?.technicians_routes?.map(tech => (
              <div key={tech.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 text-sm">{tech.full_name}</div>
                  <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                    {tech.total_jobs} job(s) today
                  </span>
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono">{tech.sms_formatted || tech.phone || 'No phone'}</span>
                  {tech.sms_operator && (
                    <span className="text-[9px] bg-slate-200 text-slate-700 font-semibold px-1 py-0.2 rounded">
                      {tech.sms_operator}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleViewTechRoute(tech.id)}
                    className="py-2 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                    title="Send Route via WhatsApp"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    onClick={() => handleOpenTechSms(tech)}
                    className="py-2 px-2 bg-purple-800 hover:bg-purple-900 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                    title="Customize & Send Route via SMS"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-amber-300" />
                    <span>Custom SMS</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 4: Recent SMS Delivery History Quick Audit */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600" />
            <span>Recent Sri Lanka SMS Activity ({recentLogs.length})</span>
          </h3>
          <button
            onClick={() => loadQueue()}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">No SMS dispatched yet today.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Customer & Mobile</th>
                  <th className="px-4 py-2">Job Ref</th>
                  <th className="px-4 py-2">Provider</th>
                  <th className="px-4 py-2">Message Content Sent</th>
                  <th className="px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px] whitespace-nowrap">{l.created_at}</td>
                    <td className="px-4 py-2.5 font-bold text-slate-900">
                      <div>{l.recipient_name || 'Customer'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{l.phone}</div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{l.job_code || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600 font-semibold">{l.gateway}</td>
                    <td className="px-4 py-2.5 text-slate-700 max-w-md">{l.message}</td>
                    <td className="px-4 py-2.5 text-right font-bold">
                      {l.status === 'SENT' && <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px]">● Sent</span>}
                      {l.status === 'SIMULATED' && <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-[10px]">● Simulated</span>}
                      {l.status === 'FAILED' && <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-[10px]">● Failed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SINGLE JOB SMS DISPATCH MODAL (CUSTOM MESSAGE CONTENT & SAVE TO BACKEND) */}
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
                    {smsJobModal.reminderType === 'ARRIVAL' ? 'Send Arrival Notice SMS' : 'Send 24h Reminder Notice SMS'}
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
                  <span>Job Code & Date:</span>
                  <span className="font-mono font-bold text-slate-700">{smsJobModal.job.job_code} ({smsJobModal.job.scheduled_date} @ {smsJobModal.job.scheduled_time || '09:00'})</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Service & Specialist:</span>
                  <span className="font-bold text-orange-600">{smsJobModal.job.treatment_code} — {smsJobModal.job.technician_name || 'Field Specialist'}</span>
                </div>
              </div>

              {/* Editable Mobile Number */}
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

              {/* Editable Message Content */}
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
                    title="Save this wording to the backend as default template"
                  >
                    <Save className="w-3 h-3 text-purple-700" />
                    <span>{savingModalTemplate ? 'Saving...' : 'Save Wording to Backend'}</span>
                  </button>
                </div>
                <textarea
                  value={modalMessage}
                  onChange={(e) => setModalMessage(e.target.value)}
                  rows={4}
                  placeholder="Type or customize the exact SMS Message Content here..."
                  className="w-full p-3 bg-purple-50/40 border-2 border-purple-200 rounded-2xl text-slate-900 font-sans text-xs leading-relaxed focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Est. Cost: <strong>Rs. 0.35 LKR</strong></span>
                  <span>Char count: {(modalMessage + (modalCustomNote ? ` | ${modalCustomNote}` : '')).length} ({Math.ceil((modalMessage.length + modalCustomNote.length) / 160) || 1} SMS segment)</span>
                </div>
              </div>

              {/* Quick Add Custom Text / Note */}
              <div className="p-3 bg-orange-50/60 border border-orange-200 rounded-2xl space-y-2">
                <label className="font-extrabold text-orange-950 block text-[11px]">
                  + Add Custom Extra Wording / Special Instruction (Optional):
                </label>
                <input
                  type="text"
                  value={modalCustomNote}
                  onChange={(e) => setModalCustomNote(e.target.value)}
                  placeholder="Type extra custom note (e.g. Please keep gate unlocked / Call 077-1234567)..."
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
                  {smsResult.messageText && (
                    <div className="text-[11px] text-slate-600 mt-1 bg-white/80 p-2 rounded-lg border border-emerald-100">
                      <strong>Sent Content:</strong> {smsResult.messageText}
                    </div>
                  )}
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
                  <span>{sendingSms ? 'Sending SMS...' : `Send Custom SMS via ${smsSettings.provider || 'Gateway'}`}</span>
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
              {/* Quick Fill from Today/Tomorrow Clients */}
              {((data?.tomorrow_jobs?.length > 0) || (data?.today_jobs?.length > 0)) && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Quick Select Scheduled Client (Optional):</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const all = [...(data?.tomorrow_jobs || []), ...(data?.today_jobs || [])];
                      const found = all.find(j => String(j.id) === val);
                      if (found) {
                        setCustomSmsPhone(found.customer_phone || '');
                        setCustomSmsRecipient(found.customer_name || '');
                        setCustomSmsMessage(found.sms_message || `PestControl Pro Notice for ${found.customer_name}: `);
                      }
                    }}
                    defaultValue=""
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                  >
                    <option value="">-- Choose a client from today/tomorrow queue or type below --</option>
                    {[...(data?.tomorrow_jobs || []), ...(data?.today_jobs || [])].map(j => (
                      <option key={j.id} value={j.id}>
                        {j.customer_name} ({j.customer_phone || 'No phone'}) — {j.scheduled_date}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                <div className="flex flex-wrap gap-1 mt-2">
                  {QUICK_CUSTOM_PHRASES.map((phrase, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomSmsMessage(prev => `${prev.trim()} ${phrase}`)}
                      className="text-[10px] bg-slate-100 hover:bg-orange-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-lg transition cursor-pointer"
                    >
                      + "{phrase}"
                    </button>
                  ))}
                </div>
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

      {/* BULK SEND ALL SMS MODAL (WITH CUSTOM MESSAGE CONTENT TEMPLATE) */}
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
              {(() => {
                const validList = (data?.tomorrow_jobs || []).filter(j => j.has_valid_phone || j.sms_is_valid);
                const invalidList = (data?.tomorrow_jobs || []).filter(j => !(j.has_valid_phone || j.sms_is_valid));

                return (
                  <>
                    <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-950 space-y-1">
                      <div className="font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Layers className="w-4 h-4 text-purple-700" />
                          <span>{data?.tomorrow_jobs?.length || 0} Total Clients Scheduled</span>
                        </span>
                        <span className="text-[11px] font-mono bg-purple-200 text-purple-950 px-2.5 py-0.5 rounded-full font-bold">
                          {validList.length} Ready for SMS
                        </span>
                      </div>
                    </div>

                    {/* Editable Bulk Message Content Template */}
                    <div className="space-y-1.5">
                      <label className="font-extrabold text-slate-800 block">
                        Message Content Template (Saved to Backend & Sent to All Ready Clients):
                      </label>
                      <textarea
                        value={bulkCustomTemplate}
                        onChange={(e) => setBulkCustomTemplate(e.target.value)}
                        rows={3}
                        className="w-full p-3 bg-purple-50/40 border-2 border-purple-200 rounded-2xl text-slate-900 font-sans text-xs leading-relaxed focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1">
                        {PLACEHOLDER_CHIPS.map(chip => (
                          <button
                            key={chip.tag}
                            type="button"
                            onClick={() => setBulkCustomTemplate(prev => `${prev} ${chip.tag}`.trim())}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-purple-100 text-purple-900 rounded text-[10px] font-mono font-bold cursor-pointer"
                          >
                            +{chip.tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-extrabold text-slate-800 block">
                        Extra Custom Note / Wording to Append (Optional):
                      </label>
                      <input
                        type="text"
                        value={bulkCustomNote}
                        onChange={(e) => setBulkCustomNote(e.target.value)}
                        placeholder="e.g. Please call 011-2345678 if you need to reschedule."
                        className="w-full px-3 py-2 bg-orange-50/40 border border-orange-200 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>

                    {invalidList.length > 0 && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                        <span><strong>{invalidList.length} client(s)</strong> have missing or invalid phone numbers and will be skipped.</span>
                      </div>
                    )}

                    <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                      {data?.tomorrow_jobs?.map((j, idx) => {
                        const valid = Boolean(j.has_valid_phone || j.sms_is_valid);
                        return (
                          <div key={j.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50">
                            <div>
                              <span className="font-bold text-slate-800">{idx + 1}. {j.customer_name}</span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-slate-500 font-mono text-[10px]">{j.sms_formatted || j.customer_phone || 'No phone recorded'}</span>
                                {valid ? (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">Ready</span>
                                ) : (
                                  <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">No mobile</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                              {j.treatment_code} @ {j.scheduled_time || '09:00'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

              {bulkResult && (
                <div className={`p-3 rounded-xl text-xs space-y-1 border ${
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
                  <span>{runningBulk ? 'Dispatching SMS...' : `Save Wording & Dispatch to ${validTomorrowCount} Clients`}</span>
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
                <span className="text-[11px] text-purple-200">
                  {selectedTechSmsRoute.total_jobs} stops assigned today
                </span>
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
                  placeholder="e.g. 0771234567"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-800 block mb-1">Message Content: (Editable Route Summary)</label>
                <textarea
                  value={techSmsMessage}
                  onChange={(e) => setTechSmsMessage(e.target.value)}
                  rows={4}
                  className="w-full p-3 bg-purple-50/40 border-2 border-purple-200 rounded-2xl text-slate-900 font-sans text-xs leading-relaxed focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>Est. Cost: <strong>Rs. 0.35 LKR</strong></span>
                  <span>Char count: {techSmsMessage.length}</span>
                </div>
              </div>

              {techSmsResult && (
                <div className={`p-3 rounded-xl text-xs border ${
                  techSmsResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}>
                  <div className="font-bold flex items-center gap-1">
                    {techSmsResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{techSmsResult.message || (techSmsResult.success ? 'Route SMS sent successfully' : techSmsResult.error)}</span>
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
                  <span>{sendingTechSms ? 'Sending Route SMS...' : 'Dispatch Route via SMS'}</span>
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
