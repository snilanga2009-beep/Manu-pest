// Utility for Full Job Details PDF Download, Print Report, and WhatsApp Share

export function formatJobDateTime(isoOrStr) {
  if (!isoOrStr) return '—';
  const d = new Date(isoOrStr);
  if (isNaN(d.getTime())) return String(isoOrStr);
  const datePart = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
  const timePart = d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  return `${datePart} • ${timePart}`;
}

export function formatJobDuration(startIso, endIso, fallbackMinutes = 60) {
  if (!startIso || !endIso) return `${fallbackMinutes || 60} mins (Scheduled)`;
  const startMs = new Date(startIso).getTime();
  const endMs = new Date(endIso).getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs < startMs) {
    return `${fallbackMinutes || 60} mins`;
  }
  const totalSec = Math.max(1, Math.floor((endMs - startMs) / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Shares full job details via WhatsApp
 */
export function shareJobOnWhatsApp(job, toCustomerPhone = false) {
  if (!job) return;
  const startStr = job.actual_start_time
    ? formatJobDateTime(job.actual_start_time)
    : `${job.scheduled_date || '—'} • ${job.scheduled_time || '09:00'} (Scheduled)`;
  const finishIso = job.actual_end_time || job.completed_at;
  const finishStr = finishIso
    ? formatJobDateTime(finishIso)
    : job.status === 'IN_PROGRESS'
      ? 'In Progress (Working Now)'
      : 'Not Finished Yet';
  const durationStr = finishIso && job.actual_start_time
    ? formatJobDuration(job.actual_start_time, finishIso, job.duration_minutes)
    : `${job.duration_minutes || 60} mins`;

  const vehicleStr = job.vehicle_no || job.vehicle_number || 'Not Assigned';
  const machineStr = job.machine_name || job.machine_type || 'Standard Equipment';
  const crewCount = job.crew_count || 1;

  const lines = [
    `*📋 FULL JOB SERVICE REPORT — ${job.job_code || ''}*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━`,
    `*🏢 Customer:* ${job.customer_name || '—'}`,
    `*👤 Contact Person:* ${job.contact_person || job.customer_name || '—'}`,
    `*📞 Customer Phone:* ${job.customer_phone || '—'}`,
    `*📍 Location:* ${job.location_name || 'Main Site'}`,
    `*🗺️ Address:* ${job.location_address || job.customer_address || '—'}`,
    `*📌 Job Status:* ${job.status || 'SCHEDULED'}`,
    ``,
    `*⏱️ START & FINISH TIME RECORD*`,
    `• *Job Date:* ${job.scheduled_date || '—'}`,
    `• *Scheduled Slot:* ${job.scheduled_time || '09:00'} (${job.duration_minutes || 60} mins)`,
    `• *Actual Start Time:* ${startStr}`,
    `• *Actual Finish Time:* ${finishStr}`,
    `• *Total Work Duration:* ${durationStr}`,
    ``,
    `*👷 DISPATCH, CREW, VEHICLE & MACHINE*`,
    `• *Assigned Technician:* ${job.technician_name || 'Unassigned'}${job.technician_phone ? ` (${job.technician_phone})` : ''}`,
    `• *How Many People (Crew):* ${crewCount} ${Number(crewCount) === 1 ? 'Person' : 'People'}${job.team_members ? ` (Team: ${job.team_members})` : ''}`,
    `• *Vehicle No:* ${vehicleStr}${job.vehicle_type ? ` (${job.vehicle_type})` : ''}`,
    `• *Machine Name:* ${machineStr}`,
    `• *Treatment:* ${job.treatment_code || '—'}${job.treatment_name ? ` — ${job.treatment_name}` : ''}`,
    ``,
    `*📝 TECHNICIAN SERVICE NOTES*`,
    `${job.technician_notes || 'Standard pest control service performed.'}`,
    `• *Customer Sign-Off:* ${job.customer_signature ? '✅ Signed & Verified' : 'Pending'}`
  ];

  const text = encodeURIComponent(lines.join('\n'));

  if (toCustomerPhone && job.customer_phone) {
    let digits = String(job.customer_phone).replace(/\D/g, '');
    if (digits.startsWith('0') && digits.length === 10) {
      digits = '94' + digits.slice(1);
    } else if (digits.length === 9) {
      digits = '94' + digits;
    }
    window.open(`https://wa.me/${digits}?text=${text}`, '_blank', 'noopener,noreferrer');
  } else {
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Opens a clean formatted A4 Print view of the full job details
 */
export function printJobReport(job) {
  if (!job) return;
  const startStr = job.actual_start_time
    ? formatJobDateTime(job.actual_start_time)
    : `${job.scheduled_date || '—'} • ${job.scheduled_time || '09:00'} (Scheduled)`;
  const finishIso = job.actual_end_time || job.completed_at;
  const finishStr = finishIso
    ? formatJobDateTime(finishIso)
    : job.status === 'IN_PROGRESS'
      ? 'In Progress (Working Now)'
      : 'Not Finished Yet';
  const durationStr = finishIso && job.actual_start_time
    ? formatJobDuration(job.actual_start_time, finishIso, job.duration_minutes)
    : `${job.duration_minutes || 60} mins`;

  const vehicleStr = job.vehicle_no || job.vehicle_number || 'Not Assigned';
  const machineStr = job.machine_name || job.machine_type || 'Standard Equipment';
  const crewCount = job.crew_count || 1;

  const escapeHtml = (str) =>
    String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Job Service Report - ${escapeHtml(job.job_code || 'Job')}</title>
  <style>
    * { box-sizing: border-box; font-family: 'Segoe UI', Roboto, Arial, sans-serif; }
    body { margin: 0; padding: 24px; background: #ffffff; color: #0f172a; }
    .report-sheet { max-width: 820px; margin: 0 auto; border: 2px solid #4C1D95; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #3B0764 0%, #5B21B6 65%, #F97316 100%); color: #ffffff; padding: 22px 26px; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 900; letter-spacing: 0.3px; }
    .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; background: #ffffff; color: #3B0764; }
    .content { padding: 22px 26px; }
    .section { margin-bottom: 18px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; background: #f8fafc; }
    .section-title { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.8px; color: #4C1D95; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
    .label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; }
    .val { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 3px; word-break: break-word; }
    .sub { font-size: 11px; color: #475569; margin-top: 2px; }
    .notes-box { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; font-size: 13px; line-height: 1.5; color: #1e293b; min-height: 54px; }
    .sig-box { background: #ffffff; border: 1px dashed #94a3b8; border-radius: 10px; padding: 12px; text-align: center; margin-top: 10px; }
    .sig-box img { max-height: 110px; object-fit: contain; }
    .footer { padding: 12px 26px; background: #f1f5f9; border-top: 1px solid #e2e8f0; font-size: 11px; color: #475569; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 0; }
      .report-sheet { border-width: 1px; }
    }
  </style>
</head>
<body>
  <div class="report-sheet">
    <div class="header">
      <div>
        <h1>FULL JOB SERVICE &amp; OPERATIONS REPORT</h1>
        <p>Job Code: <strong>${escapeHtml(job.job_code || '—')}</strong> &bull; Scheduled Date: <strong>${escapeHtml(job.scheduled_date || '—')}</strong></p>
      </div>
      <div class="badge">${escapeHtml(job.status || 'SCHEDULED')}</div>
    </div>

    <div class="content">
      <div class="section">
        <div class="section-title">1. Job Start, Finish &amp; Work Duration Record</div>
        <div class="grid-3">
          <div class="card">
            <div class="label">Work Start Date &amp; Time</div>
            <div class="val">${escapeHtml(startStr)}</div>
          </div>
          <div class="card">
            <div class="label">Work Finish Date &amp; Time</div>
            <div class="val">${escapeHtml(finishStr)}</div>
          </div>
          <div class="card">
            <div class="label">Total Work Duration</div>
            <div class="val" style="color:#4C1D95;">${escapeHtml(durationStr)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">2. Dispatch, Technician, Crew, Vehicle &amp; Machine Details</div>
        <div class="grid-2">
          <div class="card">
            <div class="label">Assigned Technician</div>
            <div class="val">${escapeHtml(job.technician_name || 'Unassigned')}</div>
            ${job.technician_phone ? `<div class="sub">Phone: ${escapeHtml(job.technician_phone)}</div>` : ''}
          </div>
          <div class="card">
            <div class="label">How Many People Come (Crew Count)</div>
            <div class="val">${escapeHtml(crewCount)} ${Number(crewCount) === 1 ? 'Person' : 'People'}</div>
            ${job.team_members ? `<div class="sub">Team: ${escapeHtml(job.team_members)}</div>` : ''}
          </div>
          <div class="card">
            <div class="label">Vehicle No</div>
            <div class="val">${escapeHtml(vehicleStr)}</div>
            ${job.vehicle_type ? `<div class="sub">Type: ${escapeHtml(job.vehicle_type)}</div>` : ''}
          </div>
          <div class="card">
            <div class="label">Machine Name</div>
            <div class="val">${escapeHtml(machineStr)}</div>
          </div>
          <div class="card">
            <div class="label">Treatment Type</div>
            <div class="val">${escapeHtml(job.treatment_code || '—')}${job.treatment_name ? ` — ${escapeHtml(job.treatment_name)}` : ''}</div>
          </div>
          <div class="card">
            <div class="label">Scheduled Time Slot</div>
            <div class="val">${escapeHtml(job.scheduled_date || '—')} at ${escapeHtml(job.scheduled_time || '09:00')} (${escapeHtml(job.duration_minutes || 60)} mins)</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">3. Customer &amp; Service Location Information</div>
        <div class="grid-2">
          <div class="card">
            <div class="label">Customer Name &amp; Contact</div>
            <div class="val">${escapeHtml(job.customer_name || '—')}</div>
            <div class="sub">Contact: ${escapeHtml(job.contact_person || job.customer_name || '—')} &bull; Phone: ${escapeHtml(job.customer_phone || '—')}</div>
          </div>
          <div class="card">
            <div class="label">Service Site &amp; Address</div>
            <div class="val">${escapeHtml(job.location_name || 'Primary Location')}</div>
            <div class="sub">${escapeHtml(job.location_address || job.customer_address || '—')}</div>
          </div>
        </div>
      </div>

      <div class="section" style="margin-bottom:0;">
        <div class="section-title">4. Technician Service Notes &amp; Customer Digital Signature</div>
        <div class="label" style="margin-bottom:4px;">Technician Field Notes / Findings</div>
        <div class="notes-box">${escapeHtml(job.technician_notes || 'No additional field notes recorded.')}</div>
        ${
          job.customer_signature
            ? `<div class="sig-box">
                <div class="label" style="margin-bottom:6px;">Verified Customer Touch Signature</div>
                <img src="${job.customer_signature}" alt="Customer Signature" />
              </div>`
            : `<div class="sig-box"><div class="label">Customer Signature: Not Captured</div></div>`
        }
      </div>
    </div>

    <div class="footer">
      <span>Pest Control Master Operations System</span>
      <span>Generated: ${escapeHtml(formatJobDateTime(new Date().toISOString()))}</span>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=900,height=850');
  if (!printWin) {
    window.print();
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}

/**
 * Generates and directly downloads a standalone A4 PDF file (.pdf) containing all full job details and signature
 */
export async function downloadJobPdfReport(job) {
  if (!job) return;

  const startStr = job.actual_start_time
    ? formatJobDateTime(job.actual_start_time)
    : `${job.scheduled_date || '—'} • ${job.scheduled_time || '09:00'} (Scheduled)`;
  const finishIso = job.actual_end_time || job.completed_at;
  const finishStr = finishIso
    ? formatJobDateTime(finishIso)
    : job.status === 'IN_PROGRESS'
      ? 'In Progress (Working Now)'
      : 'Not Finished Yet';
  const durationStr = finishIso && job.actual_start_time
    ? formatJobDuration(job.actual_start_time, finishIso, job.duration_minutes)
    : `${job.duration_minutes || 60} mins`;

  const vehicleStr = job.vehicle_no || job.vehicle_number || 'Not Assigned';
  const machineStr = job.machine_name || job.machine_type || 'Standard Equipment';
  const crewCount = `${job.crew_count || 1} ${Number(job.crew_count || 1) === 1 ? 'Person' : 'People'}${job.team_members ? ` (${job.team_members})` : ''}`;

  // Create high-resolution A4 canvas (1240 x 1754 px)
  const width = 1240;
  const height = 1754;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = '#4C1D95';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Header gradient banner
  const grad = ctx.createLinearGradient(36, 36, width - 36, 190);
  grad.addColorStop(0, '#3B0764');
  grad.addColorStop(0.65, '#5B21B6');
  grad.addColorStop(1, '#F97316');
  ctx.fillStyle = grad;
  ctx.fillRect(38, 38, width - 76, 145);

  // Header Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 34px Segoe UI, Arial, sans-serif';
  ctx.fillText('FULL JOB SERVICE & OPERATIONS REPORT', 72, 100);

  ctx.font = 'bold 20px Segoe UI, Arial, sans-serif';
  ctx.fillStyle = '#FDE68A';
  ctx.fillText(`Job Code: ${job.job_code || '—'}   |   Scheduled Date: ${job.scheduled_date || '—'}`, 72, 145);

  // Status Pill in Header
  const statusText = String(job.status || 'SCHEDULED').toUpperCase();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(width - 290, 75, 210, 56);
  ctx.fillStyle = job.status === 'COMPLETED' ? '#047857' : job.status === 'IN_PROGRESS' ? '#D97706' : '#4C1D95';
  ctx.font = 'bold 22px Segoe UI, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(statusText, width - 185, 111);
  ctx.textAlign = 'left';

  // Helper to draw a labeled card box
  const drawCard = (x, y, w, h, label, value, subValue = '', accentColor = '#0F172A') => {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 15px Segoe UI, Arial, sans-serif';
    ctx.fillText(String(label).toUpperCase(), x + 18, y + 30);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 21px Segoe UI, Arial, sans-serif';
    const cleanVal = String(value || '—');
    ctx.fillText(cleanVal.length > 48 ? cleanVal.slice(0, 48) + '...' : cleanVal, x + 18, y + 64);

    if (subValue) {
      ctx.fillStyle = '#475569';
      ctx.font = '600 16px Segoe UI, Arial, sans-serif';
      const cleanSub = String(subValue);
      ctx.fillText(cleanSub.length > 56 ? cleanSub.slice(0, 56) + '...' : cleanSub, x + 18, y + 92);
    }
  };

  const drawSectionHeader = (y, title) => {
    ctx.fillStyle = '#EDE9FE';
    ctx.fillRect(68, y, width - 136, 44);
    ctx.fillStyle = '#4C1D95';
    ctx.font = 'bold 19px Segoe UI, Arial, sans-serif';
    ctx.fillText(title, 86, y + 29);
  };

  // SECTION 1: Start, Finish & Duration
  let curY = 215;
  drawSectionHeader(curY, '1. JOB START, FINISH & REAL-TIME DURATION RECORD');
  curY += 58;
  const col3W = (width - 136 - 32) / 3;
  drawCard(68, curY, col3W, 105, 'Work Start Date & Time', startStr, '', '#047857');
  drawCard(68 + col3W + 16, curY, col3W, 105, 'Work Finish Date & Time', finishStr, '', '#B45309');
  drawCard(68 + (col3W + 16) * 2, curY, col3W, 105, 'Total Work Duration', durationStr, '', '#4C1D95');

  // SECTION 2: Dispatch, Technician, Crew, Vehicle & Machine
  curY += 135;
  drawSectionHeader(curY, '2. DISPATCH, TECHNICIAN, CREW, VEHICLE & MACHINE DETAILS');
  curY += 58;
  const col2W = (width - 136 - 20) / 2;
  drawCard(68, curY, col2W, 110, 'Assigned Technician', job.technician_name || 'Unassigned', job.technician_phone ? `Phone: ${job.technician_phone}` : '');
  drawCard(68 + col2W + 20, curY, col2W, 110, 'How Many People Come (Crew)', crewCount, '');
  curY += 126;
  drawCard(68, curY, col2W, 110, 'Vehicle No', vehicleStr, job.vehicle_type ? `Vehicle Type: ${job.vehicle_type}` : '');
  drawCard(68 + col2W + 20, curY, col2W, 110, 'Machine Name', machineStr, '');
  curY += 126;
  drawCard(
    68,
    curY,
    col2W,
    100,
    'Treatment Type & Service',
    `${job.treatment_code || '—'}${job.treatment_name ? ` — ${job.treatment_name}` : ''}`
  );
  drawCard(
    68 + col2W + 20,
    curY,
    col2W,
    100,
    'Scheduled Slot & Est. Duration',
    `${job.scheduled_date || '—'} at ${job.scheduled_time || '09:00'} (${job.duration_minutes || 60} mins)`
  );

  // SECTION 3: Customer & Location
  curY += 130;
  drawSectionHeader(curY, '3. CUSTOMER & SERVICE LOCATION DETAILS');
  curY += 58;
  drawCard(
    68,
    curY,
    col2W,
    115,
    'Customer & Contact Person',
    job.customer_name || '—',
    `Contact: ${job.contact_person || job.customer_name || '—'}  |  Tel: ${job.customer_phone || '—'}`
  );
  drawCard(
    68 + col2W + 20,
    curY,
    col2W,
    115,
    'Service Location & Address',
    job.location_name || 'Primary Site',
    job.location_address || job.customer_address || '—'
  );

  // SECTION 4: Notes & Customer Signature
  curY += 145;
  drawSectionHeader(curY, '4. TECHNICIAN FIELD NOTES & CUSTOMER DIGITAL SIGNATURE');
  curY += 58;

  // Notes Box
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(68, curY, width - 136, 130);
  ctx.strokeStyle = '#CBD5E1';
  ctx.strokeRect(68, curY, width - 136, 130);
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 15px Segoe UI, Arial, sans-serif';
  ctx.fillText('TECHNICIAN SERVICE NOTES / FINDINGS:', 86, curY + 30);

  ctx.fillStyle = '#0F172A';
  ctx.font = '19px Segoe UI, Arial, sans-serif';
  const notesText = String(job.technician_notes || 'Standard pest control treatment completed as scheduled.');
  const words = notesText.split(/\s+/);
  let line = '';
  let lineY = curY + 65;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    if (ctx.measureText(testLine).width > width - 180 && line.length > 0) {
      ctx.fillText(line, 86, lineY);
      line = words[i] + ' ';
      lineY += 28;
      if (lineY > curY + 120) break;
    } else {
      line = testLine;
    }
  }
  if (line && lineY <= curY + 120) {
    ctx.fillText(line, 86, lineY);
  }

  curY += 150;
  // Signature Box
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(68, curY, width - 136, 210);
  ctx.strokeStyle = '#94A3B8';
  ctx.strokeRect(68, curY, width - 136, 210);
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 15px Segoe UI, Arial, sans-serif';
  ctx.fillText('VERIFIED CUSTOMER TOUCH SIGNATURE:', 86, curY + 32);

  if (job.customer_signature) {
    try {
      await new Promise((resolve) => {
        const sigImg = new Image();
        sigImg.crossOrigin = 'anonymous';
        sigImg.onload = () => {
          const maxW = 460;
          const maxH = 145;
          const scale = Math.min(maxW / (sigImg.width || 300), maxH / (sigImg.height || 120), 1.5);
          const drawW = (sigImg.width || 300) * scale;
          const drawH = (sigImg.height || 120) * scale;
          ctx.drawImage(sigImg, (width - drawW) / 2, curY + 45, drawW, drawH);
          resolve();
        };
        sigImg.onerror = () => resolve();
        sigImg.src = job.customer_signature;
      });
    } catch (e) {
      // ignore signature image load failure
    }
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = 'italic 20px Segoe UI, Arial, sans-serif';
    ctx.fillText('No digital signature recorded for this job.', 86, curY + 115);
  }

  // Footer
  ctx.fillStyle = '#475569';
  ctx.font = 'bold 16px Segoe UI, Arial, sans-serif';
  ctx.fillText(
    `Pest Control Master Operations Suite   •   Report Generated: ${formatJobDateTime(new Date().toISOString())}`,
    68,
    height - 58
  );

  // Convert Canvas to JPEG bytes and wrap inside a standard A4 PDF 1.4 document
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const base64Data = jpegDataUrl.split(',')[1];
  const binaryStr = atob(base64Data);
  const jpegBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    jpegBytes[i] = binaryStr.charCodeAt(i);
  }

  const pdfBytes = buildSinglePageJpegPdf(jpegBytes, width, height);
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Job-Report-${job.job_code || job.id || 'Details'}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function buildSinglePageJpegPdf(jpegBytes, imgWidth, imgHeight) {
  const pageWidthPt = 595.28; // A4 width in pt
  const pageHeightPt = 841.89; // A4 height in pt
  const encoder = new TextEncoder();
  const chunks = [];
  let offset = 0;
  const offsets = [0];

  const pushStr = (str) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    offset += bytes.length;
  };

  const pushBytes = (bytes) => {
    chunks.push(bytes);
    offset += bytes.length;
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // 1: Catalog
  offsets[1] = offset;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2: Pages
  offsets[2] = offset;
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3: Page
  offsets[3] = offset;
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 4 0 R >> >> /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Contents 5 0 R >>\nendobj\n`
  );

  // 4: Image XObject
  offsets[4] = offset;
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushStr('\nendstream\nendobj\n');

  // 5: Content Stream
  const contentStream = `q\n${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm\n/Im0 Do\nQ\n`;
  offsets[5] = offset;
  pushStr(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

  // XRef
  const xrefOffset = offset;
  pushStr('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalLength);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}
