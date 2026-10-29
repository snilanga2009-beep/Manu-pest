const express = require('express');
const router = express.Router();
const db = require('../db');

function handleCalendarRequest(req, res) {
  const { month, start_date, end_date, technician_id, status, treatment_id, frequency, location } = req.query;

  let whereClauses = ['1=1'];
  const params = [];

  let effectiveStart = start_date;
  let effectiveEnd = end_date;

  if (month && !start_date && !end_date) {
    effectiveStart = `${month}-01`;
    effectiveEnd = `${month}-31`;
  }

  if (effectiveStart) {
    whereClauses.push('j.scheduled_date >= ?');
    params.push(effectiveStart);
  }
  if (effectiveEnd) {
    whereClauses.push('j.scheduled_date <= ?');
    params.push(effectiveEnd);
  }
  if (technician_id) {
    whereClauses.push('j.technician_id = ?');
    params.push(technician_id);
  }
  if (status) {
    whereClauses.push('j.status = ?');
    params.push(status.toUpperCase());
  }
  if (treatment_id) {
    whereClauses.push('j.treatment_id = ?');
    params.push(treatment_id);
  }
  if (location) {
    whereClauses.push('(l.location_name LIKE ? OR c.location LIKE ?)');
    params.push(`%${location}%`, `%${location}%`);
  }

  // 1. Calculate frequency breakdown counts across this active period & non-frequency filters
  const freqWhereSql = whereClauses.join(' AND ');
  const freqRows = db.prepare(`
    SELECT UPPER(COALESCE(r.frequency, 'AD-HOC')) as freq, COUNT(*) as cnt
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN customer_locations l ON j.location_id = l.id
    LEFT JOIN recurring_services r ON j.recurring_service_id = r.id
    WHERE ${freqWhereSql}
    GROUP BY UPPER(COALESCE(r.frequency, 'AD-HOC'))
  `).all(...params);

  const frequency_counts = {
    all: 0,
    DAILY: 0,
    WEEKLY: 0,
    FORTNIGHTLY: 0,
    'TWICE A MONTH': 0,
    MONTHLY: 0,
    '2 MONTHLY': 0,
    '3 MONTHLY': 0,
    '4 MONTHLY': 0,
    '6 MONTHLY': 0,
    ANNUALLY: 0,
    'AD-HOC': 0
  };

  let totalAll = 0;
  for (const row of freqRows) {
    frequency_counts[row.freq] = row.cnt;
    totalAll += row.cnt;
  }
  frequency_counts.all = totalAll;

  // 2. Apply frequency filter if requested
  if (frequency && frequency.toUpperCase() !== 'ALL') {
    if (frequency.toUpperCase() === 'AD-HOC') {
      whereClauses.push('j.recurring_service_id IS NULL');
    } else {
      whereClauses.push('UPPER(r.frequency) = ?');
      params.push(frequency.toUpperCase());
    }
  }

  const jobs = db.prepare(`
    SELECT j.id, j.job_code, j.scheduled_date, j.scheduled_time, j.duration_minutes,
           j.status, j.technician_notes, j.recurring_service_id, j.technician_id,
           j.crew_count, j.workers_info,
           j.vehicle_id, j.vehicle_no, j.machine_id, j.machine_name, j.team_members,
           c.name as customer_name, c.customer_code, c.phone as customer_phone,
           l.location_name,
           t.code as treatment_code, t.name as treatment_name, t.color_hex as treatment_color,
           tech.full_name as technician_name,
           r.frequency as recurring_frequency,
           v.vehicle_type, v.vehicle_number,
           m.machine_type
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN customer_locations l ON j.location_id = l.id
    JOIN treatments t ON j.treatment_id = t.id
    LEFT JOIN staff tech ON j.technician_id = tech.id
    LEFT JOIN recurring_services r ON j.recurring_service_id = r.id
    LEFT JOIN vehicles v ON j.vehicle_id = v.id
    LEFT JOIN machines m ON j.machine_id = m.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY j.scheduled_date ASC, j.scheduled_time ASC
  `).all(...params);

  // Group by date for calendar grid rendering
  const eventsByDate = {};
  for (const job of jobs) {
    if (!eventsByDate[job.scheduled_date]) {
      eventsByDate[job.scheduled_date] = [];
    }
    eventsByDate[job.scheduled_date].push(job);
  }

  res.json({
    success: true,
    total: jobs.length,
    events: jobs,
    eventsByDate,
    frequency_counts
  });
}

router.get('/', handleCalendarRequest);
router.get('/events', handleCalendarRequest);

module.exports = router;
