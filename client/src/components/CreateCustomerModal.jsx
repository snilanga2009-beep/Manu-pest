import React, { useState, useEffect } from 'react';
import {
  X, Check, CalendarCheck, MapPin, AlertCircle, Building, Users, Phone, Mail, FileText
} from 'lucide-react';
import GpsCoordinatePicker from './GpsCoordinatePicker';
import { createCustomer, getTreatments, getStaff } from '../api';

export const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Daily (Every Day)' },
  { value: 'WEEKLY', label: 'Weekly (Every Week on Preferred Day)' },
  { value: 'FORTNIGHTLY', label: 'Fortnightly (Every 2 Weeks / Bi-Weekly)' },
  { value: 'TWICE A MONTH', label: 'Twice A Month (1st & 15th / Semi-Monthly)' },
  { value: 'MONTHLY', label: 'Monthly (Every Month)' },
  { value: '2 MONTHLY', label: '2 Monthly (Every 2 Months / Bi-Monthly)' },
  { value: '3 MONTHLY', label: '3 Monthly (Quarterly / Every 3 Months)' },
  { value: '4 MONTHLY', label: '4 Monthly (Every 4 Months)' },
  { value: '6 MONTHLY', label: '6 Monthly (Semi-Annually / Twice a Year)' },
  { value: 'ANNUALLY', label: 'Annually (Yearly / Once a Year)' },
];

export function getPreviewScheduledDate(startDateStr, preferredDay) {
  if (!startDateStr) return '';
  const d = new Date(startDateStr + 'T12:00:00Z');
  if (isNaN(d.getTime())) return startDateStr;
  const DAY_MAP = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0 };
  if (preferredDay && DAY_MAP[preferredDay] !== undefined) {
    const target = DAY_MAP[preferredDay];
    const cur = d.getUTCDay();
    const diff = (target - cur + 7) % 7;
    if (diff > 0) {
      d.setUTCDate(d.getUTCDate() + diff);
    }
  }
  return d.toISOString().substring(0, 10);
}

export default function CreateCustomerModal({ isOpen, onClose, onCustomerCreated }) {
  const colomboToday = new Date().toISOString().substring(0, 10);

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    primary_location_name: '',
    address: '',
    location: '',
    latitude: '',
    longitude: '',
    special_instructions: ''
  });

  const [addRecurring, setAddRecurring] = useState(false);
  const [recurringContract, setRecurringContract] = useState({
    treatment_id: '',
    frequency: 'WEEKLY',
    preferred_day: 'MON',
    preferred_time: '09:00',
    duration_minutes: 60,
    technician_id: '',
    salesman_id: '',
    start_date: colomboToday,
    schedule_horizon_months: 3,
    notes: '',
    generate_immediate_job: true
  });

  const [treatments, setTreatments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      getTreatments().then(r => setTreatments(r.treatments || [])).catch(() => {});
      getStaff().then(r => setStaff(r.staff || [])).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      // If user is editing primary_location_name and address was empty, keep them aligned
      if (name === 'primary_location_name' && !prev.address) {
        next.location = value;
      }
      return next;
    });
    if (error) setError(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      primary_location_name: '',
      address: '',
      location: '',
      latitude: '',
      longitude: '',
      special_instructions: ''
    });
    setAddRecurring(false);
    setRecurringContract({
      treatment_id: '',
      frequency: 'WEEKLY',
      preferred_day: 'MON',
      preferred_time: '09:00',
      duration_minutes: 60,
      technician_id: '',
      salesman_id: '',
      start_date: colomboToday,
      schedule_horizon_months: 3,
      notes: '',
      generate_immediate_job: true
    });
    setError(null);
  };

  const handleModalClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Customer Name is required');
      return;
    }

    if (addRecurring && !recurringContract.treatment_id) {
      setError('Please select a Treatment for the recurring contract schedule.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure custom address / location fallback when Google does not show it
      const locName = formData.primary_location_name.trim();
      const addr = formData.address.trim();
      const locArea = formData.location.trim();

      const resolvedPrimaryLocation = locName || addr || `${formData.name.trim()} Main`;
      const resolvedAddress = addr || locName || resolvedPrimaryLocation;
      const resolvedLocation = locArea || locName || resolvedAddress;

      const payload = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        primary_location_name: resolvedPrimaryLocation,
        address: resolvedAddress,
        location: resolvedLocation,
        latitude: formData.latitude ? String(formData.latitude).trim() : null,
        longitude: formData.longitude ? String(formData.longitude).trim() : null,
        special_instructions: formData.special_instructions.trim(),
        recurring_contract: addRecurring ? recurringContract : null
      };

      const res = await createCustomer(payload);
      if (res && (res.success || res.customer)) {
        const createdCust = res.customer || res;
        const jobsMsg = res.total_jobs_generated ? ` and ${res.total_jobs_generated} jobs scheduled on Master Calendar!` : '!';
        alert(`Customer created successfully${jobsMsg}`);
        if (onCustomerCreated) onCustomerCreated(createdCust, res);
        handleModalClose();
      } else {
        throw new Error(res?.error || 'Failed to create customer');
      }
    } catch (err) {
      console.error('Error creating customer:', err);
      setError(err.message || 'Failed to create customer. Please check the fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Add New Customer</h2>
            <p className="text-[11px] text-slate-500">Create client profile & optional master schedule contract</p>
          </div>
          <button
            type="button"
            onClick={handleModalClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-3.5 flex-1 text-xs">
            
            {/* Customer Name */}
            <div>
              <label className="font-semibold text-slate-700">Customer Name *</label>
              <input
                type="text"
                required
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. CEWAS (TANDEM SPEED)"
                className="w-full mt-1 p-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500 font-semibold"
              />
            </div>

            {/* Contact Person & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Contact Person</label>
                <input
                  type="text"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleChange}
                  placeholder="e.g. Mr. Rashika"
                  className="w-full mt-1 p-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 0771234567"
                  className="w-full mt-1 p-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Email & Primary Location Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="customer@email.com"
                  className="w-full mt-1 p-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700">Primary Location Name</label>
                <input
                  type="text"
                  name="primary_location_name"
                  value={formData.primary_location_name}
                  onChange={handleChange}
                  placeholder="e.g. Rathmalana Factory"
                  className="w-full mt-1 p-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Custom Street Address (Useful when Google Maps does not show it) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">
                  Custom Address / Street Address
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  Use if Google Maps does not find location
                </span>
              </div>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. No. 45/2, Station Road, Rathmalana (Custom address)"
                className="w-full mt-1 p-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {/* GPS Coordinate Picker (Town List / Interactive Map / Search / Google Maps URL Paste / Manual) */}
            <GpsCoordinatePicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              locationText={formData.address || formData.primary_location_name || formData.location}
              onChange={({ latitude, longitude, locationName }) => {
                setFormData(prev => ({
                  ...prev,
                  latitude: latitude !== undefined ? latitude : prev.latitude,
                  longitude: longitude !== undefined ? longitude : prev.longitude,
                  location: (!prev.location && locationName) ? locationName : prev.location,
                  primary_location_name: (!prev.primary_location_name && locationName) ? locationName : prev.primary_location_name
                }));
              }}
            />

            {/* Special Instructions */}
            <div>
              <label className="font-semibold text-slate-700">Special Instructions / Duration</label>
              <textarea
                rows={2}
                name="special_instructions"
                value={formData.special_instructions}
                onChange={handleChange}
                placeholder="e.g. Weekdays after 2pm, 2 PCT required"
                className="w-full mt-1 p-2 bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            {/* Optional Recurring Contract Setup */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                <input
                  type="checkbox"
                  checked={addRecurring}
                  onChange={(e) => setAddRecurring(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <span>➕ Set Up Recurring Contract &amp; Master Calendar Schedule</span>
              </label>

              {addRecurring && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700">Treatment *</label>
                      <select
                        required={addRecurring}
                        value={recurringContract.treatment_id}
                        onChange={(e) => setRecurringContract({ ...recurringContract, treatment_id: e.target.value })}
                        className="w-full mt-1 p-2 bg-white rounded-xl border border-slate-300 font-bold text-slate-800"
                      >
                        <option value="">Select Treatment</option>
                        {treatments.map(t => (
                          <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700">Frequency *</label>
                      <select
                        value={recurringContract.frequency}
                        onChange={(e) => setRecurringContract({ ...recurringContract, frequency: e.target.value })}
                        className="w-full mt-1 p-2 bg-white rounded-xl border border-slate-300 font-black text-emerald-800"
                      >
                        {FREQUENCY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700">Start Date</label>
                      <input
                        type="date"
                        value={recurringContract.start_date}
                        onChange={(e) => setRecurringContract({ ...recurringContract, start_date: e.target.value })}
                        className="w-full mt-1 p-2 bg-white rounded-xl border border-slate-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Preferred Day</label>
                      <select
                        value={recurringContract.preferred_day}
                        onChange={(e) => setRecurringContract({ ...recurringContract, preferred_day: e.target.value })}
                        className="w-full mt-1 p-2 bg-white rounded-xl border border-slate-300 font-semibold"
                      >
                        <option value="MON">Monday</option>
                        <option value="TUE">Tuesday</option>
                        <option value="WED">Wednesday</option>
                        <option value="THU">Thursday</option>
                        <option value="FRI">Friday</option>
                        <option value="SAT">Saturday</option>
                        <option value="SUN">Sunday</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700">Time</label>
                      <input
                        type="time"
                        value={recurringContract.preferred_time}
                        onChange={(e) => setRecurringContract({ ...recurringContract, preferred_time: e.target.value })}
                        className="w-full mt-1 p-2 bg-white rounded-xl border border-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="font-semibold text-slate-700">Assign Technician</label>
                      <select
                        value={recurringContract.technician_id}
                        onChange={(e) => setRecurringContract({ ...recurringContract, technician_id: e.target.value })}
                        className="w-full mt-1 p-2 bg-white rounded-xl border border-slate-300"
                      >
                        <option value="">-- Unassigned --</option>
                        {staff.filter(s => s.role === 'TECHNICIAN').map(s => (
                          <option key={s.id} value={s.id}>{s.full_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700">Schedule Horizon</label>
                      <select
                        value={recurringContract.schedule_horizon_months}
                        onChange={(e) => setRecurringContract({ ...recurringContract, schedule_horizon_months: parseInt(e.target.value, 10) })}
                        className="w-full mt-1 p-2 bg-white rounded-xl border border-slate-300 font-semibold"
                      >
                        <option value={0}>First Job Only</option>
                        <option value={1}>Next 1 Month Schedule</option>
                        <option value={3}>Next 3 Months (Recommended)</option>
                        <option value={6}>Next 6 Months</option>
                        <option value={12}>Full Year (12 Months)</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 flex items-center gap-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      First Service Job: <strong>{getPreviewScheduledDate(recurringContract.start_date, recurringContract.preferred_day)}</strong> ({recurringContract.frequency})
                    </span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Fixed Visible Bottom Action Bar */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/90 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleModalClose}
              disabled={loading}
              className="px-4 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer text-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md hover:shadow-lg transition cursor-pointer text-xs flex items-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Creating...' : 'Create Customer'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
