const express = require('express');
const router = express.Router();
const db = require('../db');

// List vehicles with optional real-time availability check for a specific date/job
router.get('/vehicles', (req, res) => {
  const { scheduled_date, job_id } = req.query;

  try {
    const vehicles = db.prepare('SELECT * FROM vehicles WHERE is_active = 1 ORDER BY vehicle_number ASC').all();

    let conflictsByVehicleId = {};
    let conflictsByVehicleNo = {};

    if (scheduled_date) {
      let conflictSql = `
        SELECT j.id, j.job_code, j.scheduled_date, j.scheduled_time, j.duration_minutes,
               j.vehicle_id, j.vehicle_no, j.status,
               c.name as customer_name
        FROM jobs j
        JOIN customers c ON j.customer_id = c.id
        WHERE j.scheduled_date = ?
          AND j.status NOT IN ('COMPLETED', 'CANCELLED')
      `;
      const params = [scheduled_date];

      if (job_id) {
        conflictSql += ' AND j.id != ?';
        params.push(job_id);
      }

      const activeJobsOnDate = db.prepare(conflictSql).all(...params);

      for (const j of activeJobsOnDate) {
        if (j.vehicle_id) {
          conflictsByVehicleId[j.vehicle_id] = j;
        }
        if (j.vehicle_no) {
          conflictsByVehicleNo[j.vehicle_no.trim().toUpperCase()] = j;
        }
      }
    }

    const annotatedVehicles = vehicles.map(v => {
      const conflict = scheduled_date
        ? (conflictsByVehicleId[v.id] || conflictsByVehicleNo[v.vehicle_number.trim().toUpperCase()] || null)
        : null;

      return {
        ...v,
        is_available: !conflict,
        conflict_job: conflict ? {
          job_id: conflict.id,
          job_code: conflict.job_code,
          customer_name: conflict.customer_name,
          scheduled_time: conflict.scheduled_time
        } : null
      };
    });

    res.json({ success: true, count: annotatedVehicles.length, vehicles: annotatedVehicles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new vehicle (custom vehicle type & number)
router.post('/vehicles', (req, res) => {
  const { vehicle_number, vehicle_type = 'Van', driver_name = '', notes = '' } = req.body;

  if (!vehicle_number || !vehicle_number.trim()) {
    return res.status(400).json({ success: false, error: 'Vehicle number is required' });
  }

  const cleanNo = vehicle_number.trim().toUpperCase();

  try {
    const existing = db.prepare('SELECT id FROM vehicles WHERE UPPER(vehicle_number) = ?').get(cleanNo);
    if (existing) {
      return res.status(409).json({ success: false, error: `Vehicle '${cleanNo}' already exists in fleet.` });
    }

    const result = db.prepare(`
      INSERT INTO vehicles (vehicle_number, vehicle_type, driver_name, notes)
      VALUES (?, ?, ?, ?)
    `).run(cleanNo, vehicle_type.trim(), driver_name.trim(), notes.trim());

    const created = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, vehicle: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List machines with optional real-time availability check for a specific date/job
router.get('/machines', (req, res) => {
  const { scheduled_date, job_id } = req.query;

  try {
    const machines = db.prepare('SELECT * FROM machines ORDER BY machine_name ASC').all();

    let conflictsByMachineId = {};
    let conflictsByMachineName = {};

    if (scheduled_date) {
      let conflictSql = `
        SELECT j.id, j.job_code, j.scheduled_date, j.scheduled_time, j.duration_minutes,
               j.machine_id, j.machine_name, j.status,
               c.name as customer_name
        FROM jobs j
        JOIN customers c ON j.customer_id = c.id
        WHERE j.scheduled_date = ?
          AND j.status NOT IN ('COMPLETED', 'CANCELLED')
      `;
      const params = [scheduled_date];

      if (job_id) {
        conflictSql += ' AND j.id != ?';
        params.push(job_id);
      }

      const activeJobsOnDate = db.prepare(conflictSql).all(...params);

      for (const j of activeJobsOnDate) {
        if (j.machine_id) {
          conflictsByMachineId[j.machine_id] = j;
        }
        if (j.machine_name) {
          conflictsByMachineName[j.machine_name.trim().toUpperCase()] = j;
        }
      }
    }

    const annotatedMachines = machines.map(m => {
      const isStatusOk = m.status === 'AVAILABLE';
      const conflict = scheduled_date
        ? (conflictsByMachineId[m.id] || conflictsByMachineName[m.machine_name.trim().toUpperCase()] || null)
        : null;

      return {
        ...m,
        is_available: isStatusOk && !conflict,
        conflict_job: conflict ? {
          job_id: conflict.id,
          job_code: conflict.job_code,
          customer_name: conflict.customer_name,
          scheduled_time: conflict.scheduled_time
        } : null
      };
    });

    res.json({ success: true, count: annotatedMachines.length, machines: annotatedMachines });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add new machine
router.post('/machines', (req, res) => {
  const { machine_name, machine_type = 'Equipment', serial_number = '', notes = '' } = req.body;

  if (!machine_name || !machine_name.trim()) {
    return res.status(400).json({ success: false, error: 'Machine name is required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO machines (machine_name, machine_type, serial_number, status, notes)
      VALUES (?, ?, ?, 'AVAILABLE', ?)
    `).run(machine_name.trim(), machine_type.trim(), serial_number.trim(), notes.trim());

    const created = db.prepare('SELECT * FROM machines WHERE id = ?').get(result.lastInsertRowid);
    res.json({ success: true, machine: created });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Real-time quick availability check for vehicle and/or machine
router.get('/check-availability', (req, res) => {
  const { scheduled_date, vehicle_id, vehicle_no, machine_id, machine_name, job_id } = req.query;

  if (!scheduled_date) {
    return res.status(400).json({ success: false, error: 'scheduled_date is required' });
  }

  try {
    let vehicleConflict = null;
    if (vehicle_id || vehicle_no) {
      let vSql = `
        SELECT j.id, j.job_code, j.scheduled_time, c.name as customer_name
        FROM jobs j
        JOIN customers c ON j.customer_id = c.id
        WHERE j.scheduled_date = ?
          AND j.status NOT IN ('COMPLETED', 'CANCELLED')
          AND (j.vehicle_id = ? OR (j.vehicle_no IS NOT NULL AND UPPER(j.vehicle_no) = ?))
      `;
      const vParams = [scheduled_date, vehicle_id || -1, (vehicle_no || '').trim().toUpperCase()];
      if (job_id) {
        vSql += ' AND j.id != ?';
        vParams.push(job_id);
      }
      vehicleConflict = db.prepare(vSql).get(...vParams);
    }

    let machineConflict = null;
    if (machine_id || machine_name) {
      let mSql = `
        SELECT j.id, j.job_code, j.scheduled_time, c.name as customer_name
        FROM jobs j
        JOIN customers c ON j.customer_id = c.id
        WHERE j.scheduled_date = ?
          AND j.status NOT IN ('COMPLETED', 'CANCELLED')
          AND (j.machine_id = ? OR (j.machine_name IS NOT NULL AND UPPER(j.machine_name) = ?))
      `;
      const mParams = [scheduled_date, machine_id || -1, (machine_name || '').trim().toUpperCase()];
      if (job_id) {
        mSql += ' AND j.id != ?';
        mParams.push(job_id);
      }
      machineConflict = db.prepare(mSql).get(...mParams);
    }

    res.json({
      success: true,
      scheduled_date,
      vehicle: {
        is_available: !vehicleConflict,
        conflict: vehicleConflict || null
      },
      machine: {
        is_available: !machineConflict,
        conflict: machineConflict || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
