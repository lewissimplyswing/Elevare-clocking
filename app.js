/* ─── TimeClockPro · app.js ───────────────────────────────────────────────── */
'use strict';

/* ── Storage ────────────────────────────────────────────────────────────── */
const STORE_KEY = 'tcp_entries';

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
  catch { return []; }
}

function saveEntries(entries) {
  localStorage.setItem(STORE_KEY, JSON.stringify(entries));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ── Time Helpers ───────────────────────────────────────────────────────── */
function calcHours(dateStr, inTime, outTime) {
  const [ih, im] = inTime.split(':').map(Number);
  const [oh, om] = outTime.split(':').map(Number);
  const inMins  = ih * 60 + im;
  let   outMins = oh * 60 + om;
  if (outMins <= inMins) outMins += 1440; // overnight
  return (outMins - inMins) / 60;
}

function formatHours(h) {
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // "2025-06"
}

function monthLabel(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ── Navigation ─────────────────────────────────────────────────────────── */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
    if (btn.dataset.view === 'history') renderHistory();
    if (btn.dataset.view === 'invoice') populateInvoiceMonths();
  });
});

/* ── Toast ──────────────────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ` ${type}` : '');
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

/* ── Log View ───────────────────────────────────────────────────────────── */
const entryForm   = document.getElementById('entry-form');
const dateInput   = document.getElementById('entry-date');
const inInput     = document.getElementById('clock-in');
const outInput    = document.getElementById('clock-out');
const notesInput  = document.getElementById('notes');
const dpPreview   = document.getElementById('duration-preview');
const dpValue     = document.getElementById('dp-value');
const dpRate      = document.getElementById('dp-rate');

// Default date to today
dateInput.value = todayStr();

// Live duration preview
[inInput, outInput].forEach(el => el.addEventListener('input', updatePreview));

function updatePreview() {
  if (inInput.value && outInput.value) {
    const h = calcHours(dateInput.value, inInput.value, outInput.value);
    if (h > 0 && h < 24) {
      const rate = parseFloat(document.getElementById('inv-rate').value) || 15;
      dpValue.textContent = formatHours(h);
      dpRate.textContent  = `£${(h * rate).toFixed(2)}`;
      dpPreview.hidden = false;
      return;
    }
  }
  dpPreview.hidden = true;
}

entryForm.addEventListener('submit', e => {
  e.preventDefault();
  const date = dateInput.value;
  const tin  = inInput.value;
  const tout = outInput.value;
  if (!date || !tin || !tout) return showToast('Please fill date, in & out times', 'error');
  const h = calcHours(date, tin, tout);
  if (h <= 0 || h >= 24) return showToast('Clock-out must be after clock-in', 'error');

  const entries = loadEntries();
  entries.push({ id: generateId(), date, in: tin, out: tout, notes: notesInput.value.trim() });
  saveEntries(entries);
  showToast('Entry saved ✓', 'success');
  entryForm.reset();
  dateInput.value = todayStr();
  dpPreview.hidden = true;
  renderMonthlySummary();
});

document.getElementById('clear-btn').addEventListener('click', () => {
  entryForm.reset();
  dateInput.value = todayStr();
  dpPreview.hidden = true;
});

/* Month summary on log view */
function renderMonthlySummary() {
  const entries = loadEntries();
  const thisMonth = todayStr().slice(0, 7);
  const rate = parseFloat(document.getElementById('inv-rate').value) || 15;
  const monthEntries = entries.filter(e => monthKey(e.date) === thisMonth);
  const totalH = monthEntries.reduce((s, e) => s + calcHours(e.date, e.in, e.out), 0);
  const el = document.getElementById('month-summary');
  if (monthEntries.length === 0) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="summary-card">
      <div class="sc-label">This month</div>
      <div class="sc-value">${monthEntries.length} entries</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Total hours</div>
      <div class="sc-value accent">${formatHours(totalH)}</div>
    </div>
    <div class="summary-card">
      <div class="sc-label">Earnings</div>
      <div class="sc-value">£${(totalH * rate).toFixed(2)}</div>
    </div>`;
}
renderMonthlySummary();

/* ── History View ───────────────────────────────────────────────────────── */
function getMonths(entries) {
  const keys = [...new Set(entries.map(e => monthKey(e.date)))].sort().reverse();
  return keys;
}

function populateFilterMonths() {
  const entries = loadEntries();
  const months = getMonths(entries);
  const sel = document.getElementById('filter-month');
  const cur = sel.value;
  sel.innerHTML = months.map(k => `<option value="${k}">${monthLabel(k)}</option>`).join('');
  if (cur && months.includes(cur)) sel.value = cur;
}

function renderHistory() {
  populateFilterMonths();
  const sel    = document.getElementById('filter-month');
  const month  = sel.value;
  const entries = loadEntries().filter(e => monthKey(e.date) === month).sort((a, b) => (a.date + a.in).localeCompare(b.date + b.in));
  const rate   = parseFloat(document.getElementById('inv-rate').value) || 15;
  const list   = document.getElementById('history-list');

  if (!entries.length) {
    list.innerHTML = '<div class="empty-state"><span class="es-icon">📋</span>No entries for this month yet.</div>';
    return;
  }

  list.innerHTML = entries.map(e => {
    const h = calcHours(e.date, e.in, e.out);
    return `
      <div class="history-entry" data-id="${e.id}">
        <div>
          <div class="he-date">${formatDate(e.date)}</div>
          <div class="he-times">${e.in} → ${e.out}</div>
          ${e.notes ? `<div class="he-notes">${escHtml(e.notes)}</div>` : ''}
        </div>
        <div>
          <div class="he-duration">${formatHours(h)}</div>
          <div class="he-amount">£${(h * rate).toFixed(2)}</div>
          <div class="he-edit-hint">tap to edit</div>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.history-entry').forEach(el => {
    el.addEventListener('click', () => openEditModal(el.dataset.id));
  });
}

document.getElementById('filter-month').addEventListener('change', renderHistory);

document.getElementById('delete-all-btn').addEventListener('click', () => {
  const month = document.getElementById('filter-month').value;
  if (!month) return;
  if (!confirm(`Delete ALL entries for ${monthLabel(month)}?`)) return;
  const entries = loadEntries().filter(e => monthKey(e.date) !== month);
  saveEntries(entries);
  renderHistory();
  renderMonthlySummary();
  showToast('Month cleared', 'success');
});

/* ── Edit Modal ─────────────────────────────────────────────────────────── */
let editingId = null;

function openEditModal(id) {
  const entry = loadEntries().find(e => e.id === id);
  if (!entry) return;
  editingId = id;
  document.getElementById('edit-date').value  = entry.date;
  document.getElementById('edit-in').value    = entry.in;
  document.getElementById('edit-out').value   = entry.out;
  document.getElementById('edit-notes').value = entry.notes;
  document.getElementById('edit-modal').hidden = false;
}

function closeEditModal() {
  document.getElementById('edit-modal').hidden = true;
  editingId = null;
}

document.getElementById('modal-close').addEventListener('click', closeEditModal);
document.getElementById('edit-modal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeEditModal();
});

document.getElementById('edit-form').addEventListener('submit', e => {
  e.preventDefault();
  const date = document.getElementById('edit-date').value;
  const tin  = document.getElementById('edit-in').value;
  const tout = document.getElementById('edit-out').value;
  const notes = document.getElementById('edit-notes').value.trim();
  if (!date || !tin || !tout) return showToast('Fill all required fields', 'error');
  const h = calcHours(date, tin, tout);
  if (h <= 0 || h >= 24) return showToast('Clock-out must be after clock-in', 'error');

  let entries = loadEntries();
  const idx   = entries.findIndex(e => e.id === editingId);
  if (idx === -1) return;
  entries[idx] = { ...entries[idx], date, in: tin, out: tout, notes };
  saveEntries(entries);
  closeEditModal();
  renderHistory();
  renderMonthlySummary();
  showToast('Entry updated ✓', 'success');
});

document.getElementById('delete-entry-btn').addEventListener('click', () => {
  if (!confirm('Delete this entry?')) return;
  const entries = loadEntries().filter(e => e.id !== editingId);
  saveEntries(entries);
  closeEditModal();
  renderHistory();
  renderMonthlySummary();
  showToast('Entry deleted', 'success');
});

/* ── Invoice View ───────────────────────────────────────────────────────── */
function populateInvoiceMonths() {
  const entries = loadEntries();
  const months  = getMonths(entries);
  const sel = document.getElementById('inv-month');
  sel.innerHTML = months.length
    ? months.map(k => `<option value="${k}">${monthLabel(k)}</option>`).join('')
    : '<option value="">No entries yet</option>';

  // Set a sensible invoice number default
  const invNo = document.getElementById('inv-invoice-no');
  if (!invNo.value) {
    const d = new Date();
    invNo.value = `INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-001`;
  }
}

function buildInvoiceHTML() {
  const month   = document.getElementById('inv-month').value;
  const rate    = parseFloat(document.getElementById('inv-rate').value) || 15;
  const myName  = document.getElementById('inv-your-name').value.trim() || 'Your Name';
  const invNo   = document.getElementById('inv-invoice-no').value.trim() || 'INV-001';
  const client  = document.getElementById('inv-client').value.trim() || 'Client';
  const cAddr   = document.getElementById('inv-client-addr').value.trim().replace(/\n/g, '<br>');
  const payment = document.getElementById('inv-payment').value.trim().replace(/\n/g, '<br>');
  const today   = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const entries = loadEntries()
    .filter(e => monthKey(e.date) === month)
    .sort((a, b) => (a.date + a.in).localeCompare(b.date + b.in));

  if (!entries.length) return null;

  const totalH   = entries.reduce((s, e) => s + calcHours(e.date, e.in, e.out), 0);
  const subtotal = totalH * rate;

  const rows = entries.map(e => {
    const h = calcHours(e.date, e.in, e.out);
    return `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td>${e.in} – ${e.out}</td>
        <td>${formatHours(h)}</td>
        <td>${escHtml(e.notes || '—')}</td>
        <td style="text-align:right">£${(h * rate).toFixed(2)}</td>
      </tr>`;
  }).join('');

  return `
    <div class="inv-doc">
      <div class="inv-top">
        <div>
          <div class="inv-brand">${escHtml(myName)}</div>
          <div style="font-size:.8rem;color:#666;margin-top:.25rem">Freelance Invoice</div>
        </div>
        <div class="inv-meta">
          <div><strong>Invoice No:</strong> ${escHtml(invNo)}</div>
          <div><strong>Date:</strong> ${today}</div>
          <div><strong>Period:</strong> ${monthLabel(month)}</div>
        </div>
      </div>

      <div class="inv-parties">
        <div>
          <div class="inv-party-label">From</div>
          <div class="inv-party-name">${escHtml(myName)}</div>
        </div>
        <div>
          <div class="inv-party-label">Bill To</div>
          <div class="inv-party-name">${escHtml(client)}</div>
          ${cAddr ? `<div style="font-size:.8rem;color:#555;margin-top:.2rem">${cAddr}</div>` : ''}
        </div>
      </div>

      <table class="inv-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Hours</th>
            <th>Duration</th>
            <th>Description</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="inv-totals">
        <div class="inv-totals-box">
          <div class="inv-total-row">
            <span>Total Hours</span>
            <span>${formatHours(totalH)}</span>
          </div>
          <div class="inv-total-row">
            <span>Rate</span>
            <span>£${rate.toFixed(2)}/hr</span>
          </div>
          <div class="inv-total-row grand">
            <span>Total Due</span>
            <span>£${subtotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      ${payment ? `<div class="inv-footer"><strong>Payment Details:</strong> ${payment}</div>` : ''}
    </div>`;
}

document.getElementById('preview-invoice-btn').addEventListener('click', () => {
  const html = buildInvoiceHTML();
  const preview = document.getElementById('invoice-preview');
  if (!html) { showToast('No entries for selected month', 'error'); preview.hidden = true; return; }
  preview.innerHTML = html;
  preview.hidden = false;
  preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Invoice preview ready ✓', 'success');
});

document.getElementById('print-invoice-btn').addEventListener('click', () => {
  const html = buildInvoiceHTML();
  if (!html) return showToast('No entries for selected month', 'error');
  // Open in new window for clean print/PDF
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Invoice</title>
    <style>
      body{margin:0;font-family:Georgia,serif;font-size:14px;color:#111}
      .inv-doc{padding:2.5rem;max-width:800px;margin:auto}
      .inv-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem}
      .inv-brand{font-family:Arial Black,Arial,sans-serif;font-size:1.6rem;font-weight:900}
      .inv-meta{text-align:right;font-size:.8rem;color:#555}
      .inv-meta strong{color:#111}
      .inv-parties{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:2rem}
      .inv-party-label{font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:#999;margin-bottom:.25rem}
      .inv-party-name{font-weight:700;font-size:1rem}
      .inv-table{width:100%;border-collapse:collapse;margin-bottom:2rem}
      .inv-table th{text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:#777;border-bottom:2px solid #111;padding:.5rem .75rem}
      .inv-table td{padding:.6rem .75rem;border-bottom:1px solid #eee;font-size:.85rem;vertical-align:top}
      .inv-totals{display:flex;justify-content:flex-end}
      .inv-totals-box{min-width:220px}
      .inv-total-row{display:flex;justify-content:space-between;padding:.35rem 0;font-size:.85rem}
      .inv-total-row.grand{border-top:2px solid #111;margin-top:.5rem;padding-top:.75rem;font-weight:700;font-size:1.1rem}
      .inv-footer{border-top:1px solid #eee;margin-top:2rem;padding-top:1rem;font-size:.75rem;color:#888}
      @media print{body{print-color-adjust:exact}}
    </style>
  </head><body>${html}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
});

document.getElementById('email-invoice-btn').addEventListener('click', () => {
  const month  = document.getElementById('inv-month').value;
  const rate   = parseFloat(document.getElementById('inv-rate').value) || 15;
  const client = document.getElementById('inv-client').value.trim() || 'Client';
  const myName = document.getElementById('inv-your-name').value.trim() || 'Your Name';
  const invNo  = document.getElementById('inv-invoice-no').value.trim() || 'INV-001';
  const entries = loadEntries().filter(e => monthKey(e.date) === month);
  if (!entries.length) return showToast('No entries for selected month', 'error');

  const totalH   = entries.reduce((s, e) => s + calcHours(e.date, e.in, e.out), 0);
  const subtotal = (totalH * rate).toFixed(2);

  const lines = entries
    .sort((a, b) => (a.date + a.in).localeCompare(b.date + b.in))
    .map(e => {
      const h = calcHours(e.date, e.in, e.out);
      return `  ${formatDate(e.date)}  ${e.in}–${e.out}  (${formatHours(h)})  £${(h * rate).toFixed(2)}\n  ${e.notes || 'No notes'}`;
    }).join('\n\n');

  const subject = encodeURIComponent(`Invoice ${invNo} – ${monthLabel(month)}`);
  const body = encodeURIComponent(
    `Dear ${client},\n\nPlease find below my invoice for ${monthLabel(month)}.\n\nInvoice No: ${invNo}\nFrom: ${myName}\n\n` +
    `TIME LOG\n${'─'.repeat(40)}\n${lines}\n\n${'─'.repeat(40)}\nTotal Hours: ${formatHours(totalH)}\nRate: £${rate}/hr\nTotal Due: £${subtotal}\n\n` +
    `Please arrange payment at your earliest convenience.\n\nKind regards,\n${myName}`
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
});

/* ── Utility ────────────────────────────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── Service Worker Registration ──────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
