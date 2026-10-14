import React, { useState, useEffect } from 'react';
import {
  BarChart3, FileSpreadsheet, Download, Printer, Filter,
  Calendar, User, CheckCircle2, AlertTriangle, Clock, Eye,
  ExternalLink, X, Phone, MapPin, FileText, Check, Copy,
  MessageSquare, Camera, PenTool, ArrowRight, Shield, Sparkles, RefreshCw
} from 'lucide-react';
import { getReport, getStaff, getJobById } from '../api';

export default function ReportsView({ onSelectJob }) {
  const [reportType, setReportType] = useState('daily');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().substring(0, 10));
  const [selectedTechId, setSelectedTechId] = useState('');
  const [staff, setStaff] = useState([]);

  // Modal State for viewing full job details
  const [selectedJobModal, setSelectedJobModal] = useState(null);
  const [jobModalLoading, setJobModalLoading] = useState(false);
  const [modalCopied, setModalCopied] = useState(false);

  const reportTabs = [
    { id: 'daily', label: 'Daily Job Report' },
    { id: 'weekly', label: 'Weekly Job Report' },
    { id: 'monthly', label: 'Monthly Job Report' },
    { id: 'technician', label: 'Technician Report' },
    { id: 'customer_history', label: 'Customer History' },
    { id: 'treatment', label: 'Treatment Report' },
    { id: 'pending', label: 'Pending Jobs' },
    { id: 'overdue', label: 'Overdue Jobs' },
    { id: 'postponed', label: 'Postponed Jobs' }
  ];

  useEffect(() => {
    getStaff({ role: 'TECHNICIAN' }).then(r => setStaff(r.staff || []));
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await getReport(reportType, {
        date: selectedDate,
        technician_id: selectedTechId || undefined
      });
      setReportData(res.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportType, selectedDate, selectedTechId]);

  const handleOpenJobModal = async (jobIdOrCode) => {
    setJobModalLoading(true);
    setSelectedJobModal({ id: jobIdOrCode, job_code: jobIdOrCode });
    try {
      const res = await getJobById(jobIdOrCode);
      if (res && res.job) {
        setSelectedJobModal({
          ...res.job,
          photos: res.photos || [],
          logs: res.logs || []
        });
      } else if (res) {
        setSelectedJobModal(res);
      }
    } catch (err) {
      console.error('Failed to load full job details:', err);
    } finally {
      setJobModalLoading(false);
    }
  };

  const handleExportCsv = () => {
    const url = `/api/reports/${reportType}/export/csv?date=${selectedDate}&technician_id=${selectedTechId}`;
    window.open(url, '_blank');
  };

  const handleExportExcel = () => {
    const url = `/api/reports/${reportType}/export/excel?date=${selectedDate}&technician_id=${selectedTechId}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const copyJobCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setModalCopied(true);
    setTimeout(() => setModalCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-16">

      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border-2 border-purple-100 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print relative overflow-hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#3B0764] tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#6D28D9]" />
            <span>Operations Reporting &amp; Export Engine</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit-ready operational summaries, technician performances, multi-format exports, and interactive job inspection.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-full shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-full shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-[#4C1D95] text-xs font-black rounded-full border border-purple-200 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Report Tabs Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-purple-100 shadow-xs flex flex-wrap gap-1 text-xs no-print">
        {reportTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`px-3.5 py-2 rounded-xl font-black transition cursor-pointer ${
              reportType === tab.id
                ? 'bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] text-white shadow-sm'
                : 'text-slate-600 hover:bg-purple-50 hover:text-[#4C1D95]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Parameters */}
      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-purple-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-hidden cursor-pointer"
            />
          </div>

          {reportType === 'technician' && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <User className="w-4 h-4 text-orange-500" />
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="bg-transparent text-slate-800 font-bold focus:outline-hidden cursor-pointer"
              >
                <option value="">All Technicians</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="font-bold text-slate-600 flex items-center gap-2">
          <span>Total Records:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-[#4C1D95] font-black text-xs">
            {reportData.length}
          </span>
        </div>
      </div>

      {/* Report Table Card */}
      <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-md overflow-hidden">
        <div className="p-5 border-b border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-purple-50/40">
          <div>
            <h2 className="font-black text-base sm:text-lg text-[#3B0764] uppercase tracking-wide">
              {reportTabs.find(t => t.id === reportType)?.label || 'Operations Report'}
            </h2>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">
              Target Date: {selectedDate} | Timezone: Asia/Colombo (GMT+5:30)
            </div>
          </div>
          <div className="text-xs font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 self-start sm:self-auto">
            💡 Click any Job Code or Row to View Full Job Details
          </div>
        </div>

        {/* Report Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gradient-to-r from-[#3B0764] via-[#4C1D95] to-[#5B21B6] text-white font-black uppercase text-[10px] tracking-wider border-b-2 border-orange-400">
              <tr>
                <th className="px-4 py-3.5">Job Code</th>
                <th className="px-4 py-3.5">Date &amp; Time</th>
                <th className="px-4 py-3.5">Customer Name</th>
                <th className="px-4 py-3.5">Location</th>
                <th className="px-4 py-3.5">Treatment</th>
                <th className="px-4 py-3.5">Technician</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Notes</th>
                <th className="px-4 py-3.5 text-right no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-100">
              {reportData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-purple-300" />
                    <div className="font-black text-slate-600">No records found for the selected report filters.</div>
                  </td>
                </tr>
              ) : (
                reportData.map(r => (
                  <tr
                    key={r.id}
                    onClick={() => handleOpenJobModal(r.id || r.job_code)}
                    className="hover:bg-purple-50/60 cursor-pointer transition group"
                  >
                    {/* Clickable Job Code Button */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenJobModal(r.id || r.job_code);
                        }}
                        className="px-2.5 py-1 bg-purple-100 hover:bg-orange-100 text-[#4C1D95] hover:text-orange-700 font-mono font-black text-xs rounded-lg border border-purple-200 hover:border-orange-300 transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                        title="Click to view full job details"
                      >
                        <span>{r.job_code}</span>
                        <Eye className="w-3 h-3 text-purple-500 group-hover:text-orange-600 shrink-0" />
                      </button>
                    </td>

                    {/* Date & Time */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900">{r.scheduled_date}</div>
                      <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-orange-500" />
                        <span>{r.scheduled_time || '09:00'}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <div className="font-black text-[#3B0764] text-xs hover:text-orange-600 transition">
                        {r.customer_name}
                      </div>
                      {r.customer_phone && (
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {r.customer_phone}
                        </div>
                      )}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                        <span className="truncate max-w-[140px]">{r.location_name || '-'}</span>
                      </div>
                    </td>

                    {/* Treatment */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-[#4C1D95] border border-purple-200 inline-block">
                        {r.treatment_code}
                      </span>
                    </td>

                    {/* Technician */}
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      <div className="font-bold text-xs">{r.technician_name || 'Unassigned'}</div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide inline-block shadow-2xs ${
                        r.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        r.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        r.status === 'POSTPONED' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
                        r.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}>
                        {r.status}
                      </span>
                    </td>

                    {/* Notes */}
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {r.technician_notes || '-'}
                    </td>

                    {/* Action Button Column */}
                    <td className="px-4 py-3 text-right whitespace-nowrap no-print">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenJobModal(r.id || r.job_code);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-[#4C1D95] to-[#6D28D9] hover:from-[#3B0764] hover:to-[#5B21B6] text-white text-[11px] font-black rounded-full shadow-xs transition flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Job</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULL JOB DETAILS MODAL (POPUP) */}
      {selectedJobModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in"
          onClick={() => setSelectedJobModal(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border-2 border-purple-200 text-slate-900 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-[#3B0764] via-[#4C1D95] to-[#5B21B6] text-white flex items-center justify-between gap-4 sticky top-0 z-20 border-b-2 border-orange-400">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-lg sm:text-xl tracking-tight text-white">
                      {selectedJobModal.job_code || `JOB #${selectedJobModal.id}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyJobCode(selectedJobModal.job_code)}
                      className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer"
                      title="Copy Job Code"
                    >
                      {modalCopied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-xs text-purple-200 mt-0.5 flex items-center gap-2">
                    <span>Full Job Operations Specification</span>
                    <span>•</span>
                    <span className="text-amber-300 font-bold">{selectedJobModal.treatment_name || selectedJobModal.treatment_code}</span>
                  </div>
                </div>
              </div>

              {/* Status Badge & Close Button */}
              <div className="flex items-center gap-2.5">
                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase ${
                  selectedJobModal.status === 'COMPLETED' ? 'bg-emerald-500 text-white' :
                  selectedJobModal.status === 'IN_PROGRESS' ? 'bg-orange-500 text-white animate-pulse' :
                  selectedJobModal.status === 'POSTPONED' ? 'bg-purple-800 text-white' :
                  'bg-white text-[#3B0764]'
                }`}>
                  {selectedJobModal.status || 'PENDING'}
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedJobModal(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-6">

              {jobModalLoading && (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                  <RefreshCw className="w-7 h-7 text-purple-600 animate-spin mb-2" />
                  <span className="font-black text-sm text-[#3B0764]">Loading full job specification...</span>
                </div>
              )}

              {/* Quick Actions Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100">
                <div className="text-xs font-bold text-[#4C1D95] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-orange-500" />
                  <span>Interactive Quick Actions:</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedJobModal.customer_phone && (
                    <a
                      href={`tel:${selectedJobModal.customer_phone}`}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-full flex items-center gap-1.5 shadow-xs transition"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Client</span>
                    </a>
                  )}

                  {selectedJobModal.customer_phone && (
                    <a
                      href={`https://wa.me/${selectedJobModal.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello, regarding Job ${selectedJobModal.job_code || ''} for Pest Control service.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-full flex items-center gap-1.5 shadow-xs transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {onSelectJob && selectedJobModal.id && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = selectedJobModal.id;
                        setSelectedJobModal(null);
                        onSelectJob(targetId);
                      }}
                      className="px-4 py-1.5 bg-gradient-to-r from-[#F97316] to-[#FF8A00] hover:from-[#EA580C] hover:to-[#F97316] text-white text-xs font-black rounded-full flex items-center gap-1.5 shadow-md shadow-orange-200 transition cursor-pointer"
                    >
                      <span>Open in Jobs Manager</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* 2-Column Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">

                {/* 1. Customer Details Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="text-[10px] uppercase font-black tracking-wider text-purple-700 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-orange-500" /> Customer Information
                  </span>
                  <div className="font-black text-slate-900 text-base">{selectedJobModal.customer_name}</div>
                  <div className="space-y-1 text-slate-600">
                    <div><strong className="text-slate-800">Customer Code:</strong> {selectedJobModal.customer_code || '-'}</div>
                    <div><strong className="text-slate-800">Contact Person:</strong> {selectedJobModal.contact_person || '-'}</div>
                    <div><strong className="text-slate-800">Phone:</strong> <span className="font-mono text-purple-700 font-bold">{selectedJobModal.customer_phone || '-'}</span></div>
                    <div><strong className="text-slate-800">Address:</strong> {selectedJobModal.customer_address || selectedJobModal.location_address || '-'}</div>
                    {selectedJobModal.special_instructions && (
                      <div className="p-2 mt-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-medium">
                        <strong>Special Instructions:</strong> {selectedJobModal.special_instructions}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Location & Site Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="text-[10px] uppercase font-black tracking-wider text-purple-700 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" /> Service Location &amp; Branch
                  </span>
                  <div className="font-black text-slate-900 text-base">{selectedJobModal.location_name || 'Primary Branch'}</div>
                  <div className="space-y-1 text-slate-600">
                    <div><strong className="text-slate-800">Site Address:</strong> {selectedJobModal.location_address || selectedJobModal.address || '-'}</div>
                    {selectedJobModal.latitude && selectedJobModal.longitude && (
                      <div>
                        <strong className="text-slate-800">GPS Coordinates:</strong>{' '}
                        <a
                          href={`https://maps.google.com/?q=${selectedJobModal.latitude},${selectedJobModal.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-emerald-700 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          <span>{selectedJobModal.latitude}, {selectedJobModal.longitude}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                    <div>
                      <strong className="text-slate-800">Confirmation Status:</strong>{' '}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        selectedJobModal.customer_confirmation_status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedJobModal.customer_confirmation_status || 'UNCONFIRMED'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* 3. Schedule & Treatment Specification */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-3 text-xs">
                <span className="text-[10px] uppercase font-black tracking-wider text-[#4C1D95] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-orange-500" /> Treatment &amp; Schedule Details
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-bold block">Scheduled Date</span>
                    <strong className="text-slate-900 text-sm font-black">{selectedJobModal.scheduled_date || '-'}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-bold block">Scheduled Time</span>
                    <strong className="text-slate-900 text-sm font-black">{selectedJobModal.scheduled_time || '09:00'}</strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-bold block">Estimated Duration</span>
                    <strong className="text-slate-900 text-sm font-black">{selectedJobModal.duration_minutes || 60} mins</strong>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-purple-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-bold block">Crew Count</span>
                    <strong className="text-slate-900 text-sm font-black">{selectedJobModal.crew_count || 1} Person(s)</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 bg-white rounded-xl border border-purple-100">
                    <strong className="text-slate-800 block mb-1">Treatment Type:</strong>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-100 text-[#4C1D95]">
                        {selectedJobModal.treatment_code || '-'}
                      </span>
                      <span className="font-bold text-slate-700">{selectedJobModal.treatment_name || '-'}</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-purple-100">
                    <strong className="text-slate-800 block mb-1">Assigned Technician:</strong>
                    <div className="font-black text-[#3B0764] text-sm">
                      {selectedJobModal.technician_name || 'Unassigned'}
                    </div>
                    {selectedJobModal.technician_phone && (
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {selectedJobModal.technician_phone}
                      </div>
                    )}
                  </div>
                </div>

                {selectedJobModal.workers_info && (
                  <div className="p-3 bg-white rounded-xl border border-purple-100 text-slate-700">
                    <strong className="text-slate-900 block mb-0.5">Crew Members / Workers:</strong>
                    {selectedJobModal.workers_info}
                  </div>
                )}
              </div>

              {/* 4. Execution Timings & Notes */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Execution Notes &amp; History
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <strong className="text-slate-800 block mb-0.5">Actual Start Time:</strong>
                    <div className="font-mono text-slate-700">{selectedJobModal.actual_start_time || 'Not started'}</div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <strong className="text-slate-800 block mb-0.5">Completed Time:</strong>
                    <div className="font-mono text-slate-700">{selectedJobModal.completed_at || selectedJobModal.actual_end_time || 'Not completed'}</div>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <strong className="text-slate-800 block mb-1">Technician Notes:</strong>
                  <p className="text-slate-700 italic">
                    {selectedJobModal.technician_notes || 'No field notes provided.'}
                  </p>
                </div>

                {selectedJobModal.reschedule_reason && (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
                    <strong className="block font-black mb-0.5">Reschedule Reason:</strong>
                    {selectedJobModal.reschedule_reason}
                  </div>
                )}
              </div>

              {/* 5. Customer Signature if present */}
              {selectedJobModal.customer_signature && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-700 flex items-center gap-1">
                    <PenTool className="w-3.5 h-3.5 text-emerald-600" /> Verified Customer Signature
                  </span>
                  <div className="border border-slate-200 bg-slate-50 p-3 rounded-xl max-w-sm mx-auto flex items-center justify-center">
                    <img
                      src={selectedJobModal.customer_signature}
                      alt="Customer Signature"
                      className="max-h-28 object-contain"
                    />
                  </div>
                </div>
              )}

              {/* 6. Job Photos Gallery */}
              {Array.isArray(selectedJobModal.photos) && selectedJobModal.photos.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-700 flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-emerald-600" /> Completion Job Evidence Photos ({selectedJobModal.photos.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {selectedJobModal.photos.map((p, idx) => {
                      const url = typeof p === 'string' ? p : p.file_path || p.photo_url || p.url;
                      if (!url) return null;
                      return (
                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                          <img
                            src={url}
                            alt={`Photo ${idx + 1}`}
                            className="w-full h-32 object-cover hover:scale-105 transition cursor-pointer"
                            onClick={() => window.open(url, '_blank')}
                          />
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-1 right-1 bg-black/70 hover:bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" /> View
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 7. Audit Trail Logs */}
              {Array.isArray(selectedJobModal.logs) && selectedJobModal.logs.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-600 block">
                    Action History &amp; Audit Logs ({selectedJobModal.logs.length})
                  </span>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedJobModal.logs.map((l, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                        <div>
                          <strong className="text-purple-700 font-mono uppercase text-[10px]">{l.action}</strong>
                          <span className="text-slate-600 ml-1.5">{l.notes || ''}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{l.timestamp || l.created_at}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-10">
              <div className="text-xs text-slate-500 font-medium">
                Pest Control Master Operations Suite • Audit Trail Recorded
              </div>

              <div className="flex items-center gap-2">
                {onSelectJob && selectedJobModal.id && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = selectedJobModal.id;
                      setSelectedJobModal(null);
                      onSelectJob(targetId);
                    }}
                    className="px-4 py-2 bg-[#4C1D95] hover:bg-[#3B0764] text-white text-xs font-black rounded-full transition cursor-pointer flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Manage in Jobs Tab</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedJobModal(null)}
                  className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black rounded-full transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
