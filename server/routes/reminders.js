const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  formatDateColombo,
  parseDateColombo,
  generateJobsForDueServices,
  generateRecurringScheduleSequence
} = require('../services/recurringEngine');
const {
  DEFAULT_SMS_TEMPLATES,
  getSmsSettings,
  normalizeSriLankaPhone,
  build24hReminderMessage,
  buildArrivalReminderMessage
} = require('../services/smsGateway');

/**
 * Format Sri Lanka phone number for WhatsApp (e.g. 0771234567 -> 94771234567)
 */
function formatWhatsAppPhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('94') && digits.length >= 11) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '94' + digits.substring(1);
  if (digits.length === 9) return '94' + digits;
  return digits;
}

// Get Reminder Queue (Upcoming tomorrow, Today, Overdue, and 30d/14d/7d/1d/0d Milestone Intervals)
router.get('/queue', (req, res) => {
  const today = formatDateColombo(new Date());

  const tomorrowObj = new Date(today);
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrow = formatDateColombo(tomorrowObj);
  const smsSettings = getSmsSettings();

  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || 'localhost:5000';
  const baseUrl = smsSettings.system_url && smsSettings.system_url.trim()
    ? smsSettings.system_url.trim().replace(/\/$/, '')
    : `${protocol}://${host}`;

  // Ensure upcoming 30-day recurring jobs are generated so 30d/14d/7d/1d/0d milestones are populated
  try {
    generateJobsForDueServices(30);

    // If any active recurring service has no future job in the next 30 days, generate its upcoming sequence starting from today/next cycle
    const activeRecWithoutUpcoming = db.prepare(`
      SELECT r.id, r.next_service_date
      FROM recurring_services r
      JOIN customers c ON r.customer_id = c.id
      WHERE r.status = 'ACTIVE' AND c.is_active = 1
        AND NOT EXISTS (
          SELECT 1 FROM jobs j
          WHERE j.recurring_service_id = r.id
            AND j.scheduled_date >= ?
            AND j.status IN ('TO_BE_DONE', 'ASSIGNED', 'CONFIRMED', 'IN_PROGRESS')
        )
      LIMIT 40
    `).all(today);

    for (const rec of activeRecWithoutUpcoming) {
      const startFrom = rec.next_service_date && rec.next_service_date >= today ? rec.next_service_date : today;
      generateRecurringScheduleSequence(rec.id, { horizonMonths: 2, firstDate: startFrom });
    }
  } catch (e) {
    // Non-fatal safeguard
  }

  // Tomorrow's jobs needing 24-hour reminder
  const tomorrowJobs = db.prepare(`
    SELECT j.*, c.name as customer_name, c.phone as customer_phone, c.contact_person,
           l.location_name, l.address as location_address,
           t.code as treatment_code, t.name as treatment_name,
           tech.full_name as technician_name, tech.phone as technician_phone
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN customer_locations l ON j.location_id = l.id
    JOIN treatments t ON j.treatment_id = t.id
    LEFT JOIN staff tech ON j.technician_id = tech.id
    WHERE j.scheduled_date = ? AND j.status IN ('TO_BE_DONE', 'ASSIGNED', 'CONFIRMED')
    ORDER BY j.scheduled_time ASC
  `).all(tomorrow);

  // Today's jobs needing same-day arrival reminder
  const todayJobs = db.prepare(`
    SELECT j.*, c.name as customer_name, c.phone as customer_phone, c.contact_person,
           l.location_name, l.address as location_address,
           t.code as treatment_code, t.name as treatment_name,
           tech.full_name as technician_name, tech.phone as technician_phone
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN customer_locations l ON j.location_id = l.id
    JOIN treatments t ON j.treatment_id = t.id
    LEFT JOIN staff tech ON j.technician_id = tech.id
    WHERE j.scheduled_date = ? AND j.status IN ('TO_BE_DONE', 'ASSIGNED', 'IN_PROGRESS')
    ORDER BY j.scheduled_time ASC
  `).all(today);

  // Overdue jobs needing follow-up
  const overdueJobs = db.prepare(`
    SELECT j.*, c.name as customer_name, c.phone as customer_phone, c.contact_person,
           l.location_name,
           t.code as treatment_code,
           tech.full_name as technician_name
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN customer_locations l ON j.location_id = l.id
    JOIN treatments t ON j.treatment_id = t.id
    LEFT JOIN staff tech ON j.technician_id = tech.id
    WHERE j.scheduled_date < ? AND j.status IN ('TO_BE_DONE', 'ASSIGNED', 'CONFIRMED')
    ORDER BY j.scheduled_date DESC
    LIMIT 15
  `).all(today);

  // Technicians with active jobs today
  const techniciansWithRoutes = db.prepare(`
    SELECT DISTINCT tech.id, tech.full_name, tech.phone, COUNT(j.id) as total_jobs
    FROM jobs j
    JOIN staff tech ON j.technician_id = tech.id
    WHERE j.scheduled_date = ? AND j.status != 'CANCELLED'
    GROUP BY tech.id
  `).all(today);

  // 30d, 14d, 7d, 1d, and Due Date (0d) Milestone Jobs
  const horizon30DateObj = parseDateColombo(today);
  horizon30DateObj.setUTCDate(horizon30DateObj.getUTCDate() + 30);
  const horizon30Date = formatDateColombo(horizon30DateObj);

  const upcoming30JobsRaw = db.prepare(`
    SELECT j.*, c.name as customer_name, c.phone as customer_phone, c.contact_person, c.customer_code,
           l.location_name, l.address as location_address,
           t.code as treatment_code, t.name as treatment_name, t.color_hex as treatment_color,
           tech.full_name as technician_name, tech.phone as technician_phone,
           r.frequency as recurring_frequency
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN customer_locations l ON j.location_id = l.id
    JOIN treatments t ON j.treatment_id = t.id
    LEFT JOIN staff tech ON j.technician_id = tech.id
    LEFT JOIN recurring_services r ON j.recurring_service_id = r.id
    WHERE j.scheduled_date >= ? AND j.scheduled_date <= ?
      AND j.status IN ('TO_BE_DONE', 'ASSIGNED', 'CONFIRMED', 'IN_PROGRESS')
    ORDER BY j.scheduled_date ASC, j.scheduled_time ASC
  `).all(today, horizon30Date);

  const todayMs = parseDateColombo(today).getTime();

  const enrichMilestoneJob = (j) => {
    const jobMs = parseDateColombo(j.scheduled_date).getTime();
    const daysRemaining = Math.max(0, Math.round((jobMs - todayMs) / (1000 * 60 * 60 * 24)));

    let milestoneId = '30d';
    let milestoneLabel = '30 Days Before';
    if (daysRemaining === 0) {
      milestoneId = '0d';
      milestoneLabel = 'Due Date (0 Days)';
    } else if (daysRemaining === 1) {
      milestoneId = '1d';
      milestoneLabel = '1 Day Before';
    } else if (daysRemaining === 2) {
      milestoneId = '2d';
      milestoneLabel = '2 Days Before';
    } else if (daysRemaining <= 7) {
      milestoneId = '7d';
      milestoneLabel = '7 Days Before';
    } else if (daysRemaining <= 14) {
      milestoneId = '14d';
      milestoneLabel = '14 Days Before';
    } else {
      milestoneId = '30d';
      milestoneLabel = '30 Days Before';
    }

    const norm = normalizeSriLankaPhone(j.customer_phone);
    const customMsg = daysRemaining === 0
      ? buildArrivalReminderMessage(j, baseUrl)
      : build24hReminderMessage(j, baseUrl);

    return {
      ...j,
      days_remaining: daysRemaining,
      milestone_id: milestoneId,
      milestone_label: milestoneLabel,
      whatsapp_phone: formatWhatsAppPhone(j.customer_phone),
      whatsapp_message: customMsg,
      sms_phone: norm.isValid ? norm.normalized : null,
      sms_formatted: norm.isValid ? norm.nationalFormat : null,
      sms_operator: norm.isValid ? norm.operator : null,
      sms_is_valid: norm.isValid,
      has_valid_phone: norm.isValid,
      sms_message: customMsg
    };
  };

  const allMilestoneJobs = upcoming30JobsRaw.map(enrichMilestoneJob);
  const milestones = {
    all: allMilestoneJobs,
    '30d': allMilestoneJobs.filter(j => j.milestone_id === '30d'),
    '14d': allMilestoneJobs.filter(j => j.milestone_id === '14d'),
    '7d': allMilestoneJobs.filter(j => j.milestone_id === '7d'),
    '2d': allMilestoneJobs.filter(j => j.milestone_id === '2d'),
    '1d': allMilestoneJobs.filter(j => j.milestone_id === '1d'),
    '0d': allMilestoneJobs.filter(j => j.milestone_id === '0d')
  };

  const milestone_counts = {
    all: milestones.all.length,
    '30d': milestones['30d'].length,
    '14d': milestones['14d'].length,
    '7d': milestones['7d'].length,
    '2d': milestones['2d'].length,
    '1d': milestones['1d'].length,
    '0d': milestones['0d'].length
  };

  res.json({
    success: true,
    today,
    tomorrow,
    counts: {
      tomorrow_reminders: tomorrowJobs.length,
      today_reminders: todayJobs.length,
      overdue_followups: overdueJobs.length,
      active_technicians: techniciansWithRoutes.length
    },
    milestones,
    milestone_counts,
    system_base_url: baseUrl,
    tomorrow_jobs: tomorrowJobs.map(j => {
      const norm = normalizeSriLankaPhone(j.customer_phone);
      const customSmsMsg = build24hReminderMessage(j, baseUrl);
      return {
        ...j,
        whatsapp_phone: formatWhatsAppPhone(j.customer_phone),
        whatsapp_message: customSmsMsg,
        sms_phone: norm.isValid ? norm.normalized : null,
        sms_formatted: norm.isValid ? norm.nationalFormat : null,
        sms_operator: norm.isValid ? norm.operator : null,
        sms_is_valid: norm.isValid,
        has_valid_phone: norm.isValid,
        sms_message: customSmsMsg
      };
    }),
    today_jobs: todayJobs.map(j => {
      const norm = normalizeSriLankaPhone(j.customer_phone);
      const customArrivalMsg = buildArrivalReminderMessage(j, baseUrl);
      return {
        ...j,
        whatsapp_phone: formatWhatsAppPhone(j.customer_phone),
        whatsapp_message: customArrivalMsg,
        sms_phone: norm.isValid ? norm.normalized : null,
        sms_formatted: norm.isValid ? norm.nationalFormat : null,
        sms_operator: norm.isValid ? norm.operator : null,
        sms_is_valid: norm.isValid,
        has_valid_phone: norm.isValid,
        sms_message: customArrivalMsg
      };
    }),
    overdue_jobs: overdueJobs,
    technicians_routes: techniciansWithRoutes,
    sms_settings: {
      provider: smsSettings.provider,
      sender_id: smsSettings.sender_id,
      is_simulation: Boolean(smsSettings.is_simulation),
      is_active: Boolean(smsSettings.is_active),
      template_24h: smsSettings.template_24h,
      template_arrival: smsSettings.template_arrival,
      template_tech_dispatch: smsSettings.template_tech_dispatch,
      template_completion: smsSettings.template_completion,
      custom_note: smsSettings.custom_note || ''
    },
    default_templates: DEFAULT_SMS_TEMPLATES
  });
});

// Generate Technician Route Summary for WhatsApp
router.get('/technician-route/:techId', (req, res) => {
  const { techId } = req.params;
  const today = formatDateColombo(new Date());

  const tech = db.prepare('SELECT * FROM staff WHERE id = ?').get(techId);
  if (!tech) return res.status(404).json({ success: false, error: 'Technician not found' });

  const jobs = db.prepare(`
    SELECT j.*, c.name as customer_name, c.phone as customer_phone,
           l.location_name, l.address as location_address,
           t.code as treatment_code
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN customer_locations l ON j.location_id = l.id
    JOIN treatments t ON j.treatment_id = t.id
    WHERE j.technician_id = ? AND j.scheduled_date = ? AND j.status != 'CANCELLED'
    ORDER BY j.scheduled_time ASC
  `).all(techId, today);

  let message = `Good morning ${tech.full_name}! Here is your pest control service schedule for today (${today}):\n\n`;
  jobs.forEach((j, i) => {
    message += `${i + 1}. [${j.scheduled_time || '09:00'}] ${j.customer_name} (${j.treatment_code})\n`;
    message += `   📍 Location: ${j.location_name || j.location_address || 'Main'}\n`;
    message += `   📞 Client Phone: ${j.customer_phone || 'N/A'}\n`;
    message += `   Status: ${j.status}\n\n`;
  });
  message += `Open your mobile app to navigate and start each job: http://localhost:5000`;

  res.json({
    success: true,
    technician: tech,
    date: today,
    jobCount: jobs.length,
    whatsapp_phone: formatWhatsAppPhone(tech.phone),
    whatsapp_message: message,
    jobs
  });
});

// Log a sent reminder
router.post('/log-sent', (req, res) => {
  const { job_id, channel, recipient_name, recipient_phone } = req.body;
  try {
    db.prepare(`
      INSERT INTO job_logs (job_id, action, notes)
      VALUES (?, 'REMINDER_SENT', ?)
    `).run(job_id, `Automated reminder sent via ${channel || 'WhatsApp'} to ${recipient_name} (${recipient_phone})`);

    res.json({ success: true, message: 'Reminder dispatch recorded' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
