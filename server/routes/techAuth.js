const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { normalizeSriLankaPhone, sendSMS } = require('../services/smsGateway');

/**
 * Strictly extracts the 9-digit Sri Lankan mobile subscriber number (starting with '7').
 * Returns null if the number is not a valid Sri Lankan mobile number.
 */
function extractSriLanka9Digits(rawPhone) {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/\D/g, '');
  if (digits.length === 9 && digits.startsWith('7')) {
    return digits;
  }
  if (digits.length === 10 && digits.startsWith('07')) {
    return digits.slice(1);
  }
  if (digits.length === 11 && digits.startsWith('947')) {
    return digits.slice(2);
  }
  if (digits.length === 13 && digits.startsWith('00947')) {
    return digits.slice(4);
  }
  return null;
}

/**
 * 1. Request SMS OTP for Registered Field Technician or Operations Manager ONLY
 *    (Strictly rejects unregistered or wrong phone numbers — never sends OTP to unknown numbers)
 */
router.post('/request-otp', async (req, res) => {
  const { phone, role } = req.body || {};
  const requestedRole = String(role || 'TECHNICIAN').toUpperCase() === 'MANAGER' ? 'MANAGER' : 'TECHNICIAN';

  if (!phone || !String(phone).trim()) {
    return res.status(400).json({
      success: false,
      error: 'Mobile phone number is required.'
    });
  }

  const input9Digits = extractSriLanka9Digits(phone);
  if (!input9Digits) {
    return res.status(400).json({
      success: false,
      error: `Invalid phone number "${phone}". Please enter a valid 10-digit Sri Lankan mobile number (e.g. 0777183981). OTP was NOT sent.`
    });
  }

  try {
    // Load all active staff
    const allStaff = db.prepare(`
      SELECT * FROM staff
      WHERE is_active = 1
      ORDER BY id ASC
    `).all();

    // Strictly match by role AND exact 9-digit mobile number
    const allowedRoles = requestedRole === 'MANAGER' ? ['MANAGER', 'ADMIN'] : ['TECHNICIAN'];

    const matchedStaff = allStaff.find(t => {
      if (!allowedRoles.includes(String(t.role || '').toUpperCase())) return false;
      const staff9Digits = extractSriLanka9Digits(t.phone);
      return Boolean(staff9Digits && staff9Digits === input9Digits);
    });

    if (!matchedStaff) {
      // Check if this number is registered under a different role to give a clear message
      const otherRoleMatch = allStaff.find(t => {
        const staff9Digits = extractSriLanka9Digits(t.phone);
        return Boolean(staff9Digits && staff9Digits === input9Digits);
      });

      if (otherRoleMatch) {
        const actualRoleLabel = otherRoleMatch.role === 'MANAGER' || otherRoleMatch.role === 'ADMIN' ? 'Manager' : otherRoleMatch.role;
        const targetAppLabel = requestedRole === 'MANAGER' ? 'Manager App' : 'Technician App';
        return res.status(403).json({
          success: false,
          error: `Phone number ${phone} belongs to ${otherRoleMatch.full_name} (${actualRoleLabel}) and is not authorized for ${targetAppLabel}. OTP code was NOT sent.`
        });
      }

      const roleTitle = requestedRole === 'MANAGER' ? 'Operations Manager' : 'Field Technician';
      return res.status(404).json({
        success: false,
        error: `Wrong or unregistered phone number! "${phone}" is not registered as an active ${roleTitle} in the system. OTP code was NOT sent.`
      });
    }

    // Invalidate any previous unverified OTPs for this staff member
    db.prepare(`
      UPDATE otp_verifications
      SET is_verified = 1
      WHERE technician_id = ? AND is_verified = 0
    `).run(matchedStaff.id);

    // Generate 6-digit numeric OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    const localFormattedPhone = `0${input9Digits}`;

    // Save to otp_verifications table
    db.prepare(`
      INSERT INTO otp_verifications (phone, technician_id, otp_code, expires_at, is_verified, attempts)
      VALUES (?, ?, ?, ?, 0, 0)
    `).run(localFormattedPhone, matchedStaff.id, otpCode, expiresAt);

    // Send SMS via active SMS Gateway (Text.lk / Notify.lk)
    const roleLabel = requestedRole === 'MANAGER' ? 'Manager App' : 'Technician App';
    const smsMessage = `Your PestControl Pro ${roleLabel} verification code is: ${otpCode}. Valid for 10 minutes. Do not share this code.`;
    const targetPhone = matchedStaff.phone || localFormattedPhone;

    let smsResult = { success: false };
    try {
      smsResult = await sendSMS({
        to: targetPhone,
        message: smsMessage,
        recipientName: matchedStaff.full_name
      });
    } catch (smsErr) {
      console.warn('[OTP SMS Gateway Warning]:', smsErr.message);
    }

    res.json({
      success: true,
      message: `Verified ${matchedStaff.full_name}! 1-Time OTP sent via SMS to ${localFormattedPhone}`,
      technician: {
        id: matchedStaff.id,
        full_name: matchedStaff.full_name,
        phone: localFormattedPhone,
        role: requestedRole === 'MANAGER' ? 'MANAGER' : 'TECHNICIAN'
      },
      smsStatus: smsResult?.success ? 'DISPATCHED' : 'SIMULATED',
      debugCode: otpCode,
      expiresInSeconds: 600
    });
  } catch (err) {
    console.error('[Request OTP Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. Verify SMS OTP for Registered Field Technician or Operations Manager
 */
router.post('/verify-otp', (req, res) => {
  const { phone, otp_code, device_info, role } = req.body || {};
  const requestedRole = String(role || 'TECHNICIAN').toUpperCase() === 'MANAGER' ? 'MANAGER' : 'TECHNICIAN';

  if (!phone || !otp_code) {
    return res.status(400).json({
      success: false,
      error: 'Registered phone number and 6-digit verification code are required.'
    });
  }

  const input9Digits = extractSriLanka9Digits(phone);
  if (!input9Digits) {
    return res.status(400).json({
      success: false,
      error: 'Invalid Sri Lankan mobile phone number.'
    });
  }

  try {
    const cleanCode = String(otp_code).trim();
    const allowedRoles = requestedRole === 'MANAGER' ? ['MANAGER', 'ADMIN'] : ['TECHNICIAN'];

    // Look for matching unverified OTP record within 10 minutes
    const records = db.prepare(`
      SELECT o.*, t.full_name, t.phone as tech_phone, t.role, t.email, t.is_active
      FROM otp_verifications o
      JOIN staff t ON o.technician_id = t.id
      WHERE o.otp_code = ?
        AND o.is_verified = 0
        AND o.expires_at > datetime('now')
      ORDER BY o.created_at DESC
    `).all(cleanCode);

    const matchedRecord = records.find(r => {
      if (!allowedRoles.includes(String(r.role || '').toUpperCase())) return false;
      const r9 = extractSriLanka9Digits(r.phone);
      const t9 = extractSriLanka9Digits(r.tech_phone);
      return (r9 && r9 === input9Digits) || (t9 && t9 === input9Digits);
    });

    if (!matchedRecord) {
      db.prepare(`
        UPDATE otp_verifications
        SET attempts = attempts + 1
        WHERE phone LIKE ? AND is_verified = 0
      `).run(`%${input9Digits}%`);

      return res.status(400).json({
        success: false,
        error: 'Invalid or expired 6-digit OTP verification code. Please check the code or request a new OTP.'
      });
    }

    if (matchedRecord.is_active !== 1) {
      return res.status(401).json({
        success: false,
        error: 'Staff account has been deactivated. Please contact admin.'
      });
    }

    // Mark OTP verified
    db.prepare('UPDATE otp_verifications SET is_verified = 1 WHERE id = ?').run(matchedRecord.id);

    const finalRole = requestedRole === 'MANAGER' ? 'MANAGER' : 'TECHNICIAN';
    const tokenPrefix = finalRole === 'MANAGER' ? 'mgr' : 'tech';
    const sessionToken = `${tokenPrefix}_${crypto.randomBytes(24).toString('hex')}`;
    const deviceStr = typeof device_info === 'object' ? JSON.stringify(device_info) : (device_info || 'Mobile PWA (SMS Verified)');
    const localFormattedPhone = `0${input9Digits}`;

    db.prepare(`
      INSERT INTO technician_sessions (technician_id, phone, session_token, device_info)
      VALUES (?, ?, ?, ?)
    `).run(matchedRecord.technician_id, localFormattedPhone, sessionToken, deviceStr);

    db.prepare(`
      INSERT INTO user_sessions (user_id, session_token, role, device_info)
      VALUES (?, ?, ?, ?)
    `).run(matchedRecord.technician_id, sessionToken, finalRole, deviceStr);

    const userPayload = {
      id: matchedRecord.technician_id,
      full_name: matchedRecord.full_name,
      phone: localFormattedPhone,
      role: finalRole,
      email: matchedRecord.email
    };

    res.json({
      success: true,
      message: `Verification successful! Welcome back, ${matchedRecord.full_name}.`,
      token: sessionToken,
      technician: userPayload,
      user: userPayload
    });
  } catch (err) {
    console.error('[Verify OTP Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. Direct Phone Number Lookup (Strictly registered staff only)
 */
router.post('/login', (req, res) => {
  const { phone, device_info, role } = req.body || {};
  const requestedRole = String(role || 'TECHNICIAN').toUpperCase() === 'MANAGER' ? 'MANAGER' : 'TECHNICIAN';

  const input9Digits = extractSriLanka9Digits(phone);
  if (!input9Digits) {
    return res.status(400).json({ success: false, error: 'Valid registered mobile phone number is required.' });
  }

  try {
    const allowedRoles = requestedRole === 'MANAGER' ? ['MANAGER', 'ADMIN'] : ['TECHNICIAN'];
    const staffList = db.prepare(`
      SELECT * FROM staff
      WHERE is_active = 1
      ORDER BY id ASC
    `).all();

    const matchedStaff = staffList.find(t => {
      if (!allowedRoles.includes(String(t.role || '').toUpperCase())) return false;
      const t9 = extractSriLanka9Digits(t.phone);
      return Boolean(t9 && t9 === input9Digits);
    });

    if (!matchedStaff) {
      return res.status(404).json({
        success: false,
        error: `Mobile number ${phone} is not registered as an active ${requestedRole === 'MANAGER' ? 'Manager' : 'Technician'}.`
      });
    }

    const finalRole = requestedRole === 'MANAGER' ? 'MANAGER' : 'TECHNICIAN';
    const tokenPrefix = finalRole === 'MANAGER' ? 'mgr' : 'tech';
    const sessionToken = `${tokenPrefix}_${crypto.randomBytes(24).toString('hex')}`;
    const deviceStr = typeof device_info === 'object' ? JSON.stringify(device_info) : (device_info || 'Mobile PWA');
    const localFormattedPhone = `0${input9Digits}`;

    db.prepare(`
      INSERT INTO technician_sessions (technician_id, phone, session_token, device_info)
      VALUES (?, ?, ?, ?)
    `).run(matchedStaff.id, localFormattedPhone, sessionToken, deviceStr);

    db.prepare(`
      INSERT INTO user_sessions (user_id, session_token, role, device_info)
      VALUES (?, ?, ?, ?)
    `).run(matchedStaff.id, sessionToken, finalRole, deviceStr);

    res.json({
      success: true,
      message: `Welcome back, ${matchedStaff.full_name}!`,
      token: sessionToken,
      technician: {
        id: matchedStaff.id,
        full_name: matchedStaff.full_name,
        phone: localFormattedPhone,
        role: finalRole,
        email: matchedStaff.email
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. Verify existing persistent session token
 */
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.replace(/^Bearer\s+/i, '')) || req.query.token;

  if (!token) {
    return res.status(401).json({ success: false, error: 'No session token provided' });
  }

  try {
    const session = db.prepare(`
      SELECT s.*, tech.full_name, tech.phone as tech_phone, tech.role, tech.email, tech.is_active,
             us.role as session_role
      FROM technician_sessions s
      JOIN staff tech ON s.technician_id = tech.id
      LEFT JOIN user_sessions us ON us.session_token = s.session_token
      WHERE s.session_token = ?
    `).get(token);

    if (!session || session.is_active !== 1) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid' });
    }

    db.prepare('UPDATE technician_sessions SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?').run(session.id);

    res.json({
      success: true,
      technician: {
        id: session.technician_id,
        full_name: session.full_name,
        phone: session.tech_phone,
        role: session.session_role || session.role,
        email: session.email
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 5. Logout / Revoke Session
 */
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.replace(/^Bearer\s+/i, '')) || req.body.token;

  if (token) {
    try {
      db.prepare('DELETE FROM technician_sessions WHERE session_token = ?').run(token);
      db.prepare('DELETE FROM user_sessions WHERE session_token = ?').run(token);
    } catch (e) {}
  }

  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
