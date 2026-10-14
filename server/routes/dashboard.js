const express = require('express');
const router = express.Router();
const db = require('../db');
const { formatDateColombo } = require('../services/recurringEngine');

router.get('/', (req, res) => {
  const { date } = req.query;
  const today = date || formatDateColombo(new Date());

  // Calculate tomorrow's date
  const tomorrowObj = new Date(today);
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrow = formatDateColombo(tomorrowObj);

  // Statistics
  const todayStats = db.prepare(`
    SELECT
      COUNT(*) as total_today,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_today,
      SUM(CASE WHEN status IN ('TO_BE_DONE', 'ASSIGNED') THEN 1 ELSE 0 END) as pending_today,
      SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress_today,
      SUM(CASE WHEN status = 'POSTPONED' THEN 1 ELSE 0 END) as postponed_today
    FROM jobs
    WHERE scheduled_date = ?
  `).get(today);

  const tomorrowCount = db.prepare(`
    SELECT COUNT(*) as count FROM jobs WHERE scheduled_date = ?
  `).get(tomorrow).count;

  const overdueCount = db.prepare(`
    SELECT COUNT(*) as count FROM jobs 
    WHERE scheduled_date < ? AND status IN ('TO_BE_DONE', 'ASSIGNED', 'CONFIRMED')
  `).get(today).count;

  const totalPending = db.prepare(`
    SELECT COUNT(*) as count FROM jobs 
    WHERE status IN ('TO_BE_DONE', 'ASSIGNED')
  `).get().count;

  const totalCompleted = db.prepare(`
    SELECT COUNT(*) as count FROM jobs 
    WHERE status = 'COMPLETED'
  `).get().count;

  const totalPostponed = db.prepare(`
    SELECT COUNT(*) as count FROM jobs 
    WHERE status = 'POSTPONED'
  `).get().count;

  const unconfirmedCount = db.prepare(`
    SELECT COUNT(*) as count FROM jobs 
    WHERE scheduled_date >= ? AND customer_confirmation_status = 'UNCONFIRMED'
  `).get(today).count;

  // Base query fragment for rich job details
  const jobSelectFragment = `
    SELECT j.*, 
           c.name as customer_name, c.phone as customer_phone, c.customer_code,
           l.location_name, l.address as location_address, l.latitude, l.longitude,
           t.code as treatment_code, t.name as treatment_name, t.color_hex as treatment_color,
           tech.full_name as technician_name, tech.phone as technician_phone
    FROM jobs j
    JOIN customers c ON j.customer_id = c.id
    LEFT JOIN customer_locations l ON j.location_id = l.id
    JOIN treatments t ON j.treatment_id = t.id
    LEFT JOIN staff tech ON j.technician_id = tech.id
  `;

  // 1. Today's jobs detailed list
  const todayJobs = db.prepare(`
    ${jobSelectFragment}
    WHERE j.scheduled_date = ?
    ORDER BY j.scheduled_time ASC, j.id ASC
  `).all(today);

  // 2. Tomorrow's jobs detailed list
  const tomorrowJobs = db.prepare(`
    ${jobSelectFragment}
    WHERE j.scheduled_date = ?
    ORDER BY j.scheduled_time ASC, j.id ASC
  `).all(tomorrow);

  // 3. Overdue jobs list
  const overdueJobs = db.prepare(`
    ${jobSelectFragment}
    WHERE j.scheduled_date < ? AND j.status IN ('TO_BE_DONE', 'ASSIGNED', 'CONFIRMED')
    ORDER BY j.scheduled_date DESC, j.id DESC
    LIMIT 100
  `).all(today);

  // 4. Pending jobs list
  const pendingJobs = db.prepare(`
    ${jobSelectFragment}
    WHERE j.status IN ('TO_BE_DONE', 'ASSIGNED')
    ORDER BY j.scheduled_date ASC, j.scheduled_time ASC, j.id ASC
    LIMIT 100
  `).all();

  // 5. Completed jobs list
  const completedJobs = db.prepare(`
    ${jobSelectFragment}
    WHERE j.status = 'COMPLETED'
    ORDER BY COALESCE(j.completed_at, j.scheduled_date) DESC, j.id DESC
    LIMIT 100
  `).all();

  // 6. Postponed jobs list
  const postponedJobs = db.prepare(`
    ${jobSelectFragment}
    WHERE j.status = 'POSTPONED'
    ORDER BY j.scheduled_date DESC, j.id DESC
    LIMIT 100
  `).all();

  // 7. Unconfirmed jobs list
  const unconfirmedJobs = db.prepare(`
    ${jobSelectFragment}
    WHERE j.scheduled_date >= ? AND j.customer_confirmation_status = 'UNCONFIRMED'
    ORDER BY j.scheduled_date ASC, j.id ASC
    LIMIT 100
  `).all(today);

  // Next 7 days job count breakdown
  const next7Days = [];
  for (let i = 0; i < 7; i++) {
    const cur = new Date(today);
    cur.setDate(cur.getDate() + i);
    const dateStr = formatDateColombo(cur);
    const count = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE scheduled_date = ?').get(dateStr).count;
    next7Days.push({ date: dateStr, count });
  }

  res.json({
    success: true,
    today,
    tomorrow,
    counters: {
      today_jobs: todayStats.total_today || 0,
      tomorrow_jobs: tomorrowCount,
      pending_jobs: totalPending,
      completed_jobs: totalCompleted,
      overdue_jobs: overdueCount,
      postponed_jobs: totalPostponed,
      unconfirmed_jobs: unconfirmedCount
    },
    today_stats: {
      total: todayStats.total_today || 0,
      completed: todayStats.completed_today || 0,
      pending: todayStats.pending_today || 0,
      in_progress: todayStats.in_progress_today || 0,
      postponed: todayStats.postponed_today || 0
    },
    today_jobs: todayJobs,
    tomorrow_jobs: tomorrowJobs,
    overdue_jobs: overdueJobs,
    pending_jobs: pendingJobs,
    completed_jobs: completedJobs,
    postponed_jobs: postponedJobs,
    unconfirmed_jobs: unconfirmedJobs,
    next_7_days: next7Days
  });
});

module.exports = router;
