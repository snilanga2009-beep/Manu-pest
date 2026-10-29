const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  calculateFirstServiceDate,
  calculateNextServiceDate,
  generateJobCode,
  formatDateColombo,
  generateRecurringScheduleSequence
} = require('../services/recurringEngine');

// List recurring services
router.get('/', (req, res) => {
  const { customer_id, status, frequency, technician_id } = req.query;

  let whereClauses = ['1=1'];
  const params = [];

  if (customer_id) {
    whereClauses.push('r.customer_id = ?');
    params.push(customer_id);
  }
  if (status) {
    whereClauses.push('r.status = ?');
    params.push(status.toUpperCase());
  }
  if (frequency) {
    whereClauses.push('r.frequency = ?');
    params.push(frequency.toUpperCase());
  }
  if (technician_id) {
    whereClauses.push('r.technician_id = ?');
    params.push(technician_id);
  }

  const services = db.prepare(`
    SELECT r.*,
           c.name as customer_name, c.customer_code, c.phone as customer_phone,
           l.location_name, l.address as location_address,
           t.code as treatment_code, t.name as treatment_name, t.color_hex as treatment_color,
           tech.full_name as technician_name,
           sales.full_name as salesman_name
    FROM recurring_services r
    JOIN customers c ON r.customer_id = c.id
    LEFT JOIN customer_locations l ON r.location_id = l.id
    JOIN treatments t ON r.treatment_id = t.id
    LEFT JOIN staff tech ON r.technician_id = tech.id
    LEFT JOIN staff sales ON r.salesman_id = sales.id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY r.next_service_date ASC
  `).all(...params);

  res.json({ success: true, count: services.length, services });
});

// Preview next date calculation
router.get('/calculate-next', (req, res) => {
  const { base_date, frequency, preferred_day, custom_days } = req.query;
  const base = base_date || formatDateColombo(new Date());
  const nextDate = calculateNextServiceDate(
    base,
    frequency || 'MONTHLY',
    preferred_day,
    custom_days ? parseInt(custom_days, 10) : 30
  );
  res.json({ success: true, base_date: base, frequency, preferred_day, next_service_date: nextDate });
});

// Create new recurring service
router.post('/', (req, res) => {
  const {
    customer_id, location_id, treatment_id, frequency, preferred_day,
    preferred_time, duration_minutes, technician_id, salesman_id,
    start_date, notes, generate_immediate_job, schedule_horizon_months = 3
  } = req.body;

  if (!customer_id || !treatment_id || !frequency) {
    return res.status(400).json({ success: false, error: 'customer_id, treatment_id, and frequency are required' });
  }

  const baseDate = start_date || formatDateColombo(new Date());
  const firstServiceDate = calculateFirstServiceDate(baseDate, preferred_day);

  const tx = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO recurring_services (
        customer_id, location_id, treatment_id, frequency, preferred_day,
        preferred_time, duration_minutes, technician_id, salesman_id,
        last_service_date, next_service_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customer_id,
      location_id || null,
      treatment_id,
      frequency.toUpperCase(),
      preferred_day ? preferred_day.toUpperCase().substring(0, 3) : null,
      preferred_time || '09:00',
      duration_minutes || 60,
      technician_id || null,
      salesman_id || null,
      null,
      firstServiceDate,
      notes || ''
    );

    const recurringId = result.lastInsertRowid;
    let createdJobs = [];

    if (generate_immediate_job) {
      const horizon = parseInt(schedule_horizon_months, 10);
      if (horizon === 0) {
        // Generate only first single job on scheduled date
        const jobCode = generateJobCode(firstServiceDate);
        const jobStatus = technician_id ? 'ASSIGNED' : 'TO_BE_DONE';
        const jobRes = db.prepare(`
          INSERT INTO jobs (
            job_code, recurring_service_id, customer_id, location_id, treatment_id,
            technician_id, salesman_id, scheduled_date, scheduled_time, duration_minutes,
            status, technician_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          jobCode,
          recurringId,
          customer_id,
          location_id || null,
          treatment_id,
          technician_id || null,
          salesman_id || null,
          firstServiceDate,
          preferred_time || '09:00',
          duration_minutes || 60,
          jobStatus,
          notes || `First job generated from recurring ${frequency.toUpperCase()} service`
        );
        createdJobs.push({ id: jobRes.lastInsertRowid, job_code: jobCode, scheduled_date: firstServiceDate });
      } else {
        // Generate recurring schedule sequence across requested horizon (e.g. 1, 3, 6, 12 months)
        createdJobs = generateRecurringScheduleSequence(recurringId, {
          horizonMonths: isNaN(horizon) ? 3 : horizon,
          firstDate: firstServiceDate
        });
      }
    }

    return { recurringId, firstServiceDate, createdJobs };
  });

  try {
    const output = tx();
    const created = db.prepare('SELECT * FROM recurring_services WHERE id = ?').get(output.recurringId);
    res.json({
      success: true,
      service: created,
      job: output.createdJobs[0] || null,
      jobs: output.createdJobs,
      total_jobs_generated: output.createdJobs.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update recurring service
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const {
    location_id, treatment_id, frequency, preferred_day, preferred_time,
    duration_minutes, technician_id, salesman_id, next_service_date, status, notes,
    update_future_jobs = false
  } = req.body;

  try {
    const today = formatDateColombo(new Date());

    const tx = db.transaction(() => {
      db.prepare(`
        UPDATE recurring_services SET
          location_id = COALESCE(?, location_id),
          treatment_id = COALESCE(?, treatment_id),
          frequency = COALESCE(?, frequency),
          preferred_day = COALESCE(?, preferred_day),
          preferred_time = COALESCE(?, preferred_time),
          duration_minutes = COALESCE(?, duration_minutes),
          technician_id = COALESCE(?, technician_id),
          salesman_id = COALESCE(?, salesman_id),
          next_service_date = COALESCE(?, next_service_date),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        location_id, treatment_id, frequency ? frequency.toUpperCase() : null,
        preferred_day ? preferred_day.toUpperCase().substring(0, 3) : null,
        preferred_time, duration_minutes,
        technician_id, salesman_id, next_service_date,
        status ? status.toUpperCase() : null, notes, id
      );

      // If requested, sync future uncompleted jobs with the updated technician / time
      if (update_future_jobs) {
        if (technician_id !== undefined) {
          db.prepare(`
            UPDATE jobs SET
              technician_id = ?,
              status = CASE WHEN status = 'TO_BE_DONE' AND ? IS NOT NULL THEN 'ASSIGNED' ELSE status END,
              updated_at = CURRENT_TIMESTAMP
            WHERE recurring_service_id = ?
              AND status IN ('TO_BE_DONE', 'ASSIGNED')
              AND scheduled_date >= ?
          `).run(technician_id || null, technician_id || null, id, today);
        }

        if (preferred_time) {
          db.prepare(`
            UPDATE jobs SET
              scheduled_time = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE recurring_service_id = ?
              AND status IN ('TO_BE_DONE', 'ASSIGNED')
              AND scheduled_date >= ?
          `).run(preferred_time, id, today);
        }
      }
    });

    tx();
    const updated = db.prepare('SELECT * FROM recurring_services WHERE id = ?').get(id);
    res.json({ success: true, service: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate additional schedule jobs for this contract
router.post('/:id/generate-schedule', (req, res) => {
  const { id } = req.params;
  const { horizon_months = 3 } = req.body;

  try {
    const service = db.prepare('SELECT * FROM recurring_services WHERE id = ?').get(id);
    if (!service) return res.status(404).json({ success: false, error: 'Recurring service not found' });

    const createdJobs = generateRecurringScheduleSequence(id, {
      horizonMonths: parseInt(horizon_months, 10) || 3
    });

    res.json({
      success: true,
      message: `Generated ${createdJobs.length} scheduled jobs for the next ${horizon_months} months`,
      jobs: createdJobs,
      count: createdJobs.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel or Delete recurring service
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const { cancel_future_jobs = true } = req.query;

  try {
    const today = formatDateColombo(new Date());

    const tx = db.transaction(() => {
      // Mark as cancelled
      db.prepare(`
        UPDATE recurring_services SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(id);

      if (cancel_future_jobs === 'true' || cancel_future_jobs === true || cancel_future_jobs === '1') {
        db.prepare(`
          UPDATE jobs SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
          WHERE recurring_service_id = ? AND status IN ('TO_BE_DONE', 'ASSIGNED') AND scheduled_date >= ?
        `).run(id, today);
      }
    });

    tx();
    res.json({ success: true, message: 'Recurring contract cancelled successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
