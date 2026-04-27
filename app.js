/* ─── Elevare Clocking · app.js (Billing Periods) ────────────────────────── */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, setDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ── Firebase Init ──────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyChC5T5_N27IE4uAkv1MBn7_i35fc-oMzk",
  authDomain: "elevare-clocking-in-system.firebaseapp.com",
  projectId: "elevare-clocking-in-system",
  storageBucket: "elevare-clocking-in-system.firebasestorage.app",
  messagingSenderId: "901215275749",
  appId: "1:901215275749:web:04c3032327e108346f220c"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ── State ──────────────────────────────────────────────────────────────── */
let currentUser  = null;
let allEntries   = [];   // unbilled entries
let allInvoices  = [];   // raised invoices

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

/* ── Login Tabs ─────────────────────────────────────────────────────────── */
document.querySelectorAll('.login-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-signin').hidden   = tab.dataset.tab !== 'signin';
    document.getElementById('tab-register').hidden = tab.dataset.tab !== 'register';
  });
});

/* ── Register ───────────────────────────────────────────────────────────── */
document.getElementById('register-btn').addEventListener('click', async () => {
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errEl    = document.getElementById('reg-error');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Please fill in all fields'; return; }
  if (password.length < 6) { errEl.textContent = 'Password must be at least 6 characters'; return; }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    errEl.textContent = e.code === 'auth/email-already-in-use'
      ? 'Email already registered — try signing in'
      : 'Registration failed: ' + e.message;
  }
});

/* ── Sign In ────────────────────────────────────────────────────────────── */
document.getElementById('signin-btn').addEventListener('click', async () => {
  const email    = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;
  const errEl    = document.getElementById('signin-error');
  errEl.textContent = '';
  if (!email || !password) { errEl.textContent = 'Please fill in all fields'; return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    errEl.textContent = 'Incorrect email or password';
  }
});

/* ── Sign Out ───────────────────────────────────────────────────────────── */
document.getElementById('signout-btn').addEventListener('click', () => signOut(auth));

/* ── Auth State ─────────────────────────────────────────────────────────── */
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app').hidden = false;
    await loadData();
    renderCurrentPeriod();
    document.getElementById('entry-date').value = todayStr();
  } else {
    currentUser = null;
    allEntries  = [];
    allInvoices = [];
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app').hidden = true;
  }
});

/* ── Load Data ──────────────────────────────────────────────────────────── */
async function loadData() {
  try {
    // Load unbilled entries
    const eq = query(collection(db, 'entries'), where('uid', '==', currentUser.uid));
    const es = await getDocs(eq);
    allEntries = es.docs.map(d => ({ id: d.id, ...d.data() }));

    // Load raised invoices
    const iq = query(collection(db, 'invoices'), where('uid', '==', currentUser.uid));
    const is = await getDocs(iq);
    allInvoices = is.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.raisedAt - a.raisedAt);
  } catch (err) {
    showToast('Error loading data', 'error');
  }
}

/* ── Time Helpers ───────────────────────────────────────────────────────── */
function calcHours(dateStr, inTime, outTime) {
  const [ih, im] = inTime.split(':').map(Number);
  const [oh, om] = outTime.split(':').map(Number);
  const inMins   = ih * 60 + im;
  let   outMins  = oh * 60 + om;
  if (outMins <= inMins) outMins += 1440;
  return (outMins - inMins) / 60;
}
function formatHours(h) {
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`;
}
function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Navigation ─────────────────────────────────────────────────────────── */
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`view-${btn.dataset.view}`).classList.add('active');
    if (btn.dataset.view === 'history') renderHistory();
    if (btn.dataset.view === 'invoice') renderInvoiceView();
  });
});

/* ── Log View ───────────────────────────────────────────────────────────── */
const dateInput  = document.getElementById('entry-date');
const inInput    = document.getElementById('clock-in');
const outInput   = document.getElementById('clock-out');
const notesInput = document.getElementById('notes');
const dpPreview  = document.getElementById('duration-preview');
const dpValue    = document.getElementById('dp-value');
const dpRate     = document.getElementById('dp-rate');

[inInput, outInput].forEach(el => el.addEventListener('input', updatePreview));

function updatePreview() {
  if (inInput.value && outInput.value) {
    const h = calcHours(dateInput.value || todayStr(), inInput.value, outInput.value);
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

document.getElementById('entry-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!currentUser) return;
  const date  = dateInput.value;
  const tin   = inInput.value;
  const tout  = outInput.value;
  if (!date || !tin || !tout) return showToast('Please fill date, in & out times', 'error');
  const h = calcHours(date, tin, tout);
  if (h <= 0 || h >= 24) return showToast('Clock-out must be after clock-in', 'error');
  const saveBtn = document.getElementById('save-btn');
  saveBtn.textContent = 'Saving…';
  saveBtn.disabled = true;
  try {
    const entry  = { uid: currentUser.uid, date, in: tin, out: tout, notes: notesInput.value.trim(), createdAt: Date.now() };
    const docRef = await addDoc(collection(db, 'entries'), entry);
    allEntries.push({ id: docRef.id, ...entry });
    showToast('Entry saved ✓', 'success');
    document.getElementById('entry-form').reset();
    dateInput.value = todayStr();
    dpPreview.hidden = true;
    renderCurrentPeriod();
  } catch { showToast('Failed to save', 'error'); }
  finally { saveBtn.textContent = 'Save Entry'; saveBtn.disabled = false; }
});

document.getElementById('clear-btn').addEventListener('click', () => {
  document.getElementById('entry-form').reset();
  dateInput.value = todayStr();
  dpPreview.hidden = true;
});

function renderCurrentPeriod() {
  const rate   = parseFloat(document.getElementById('inv-rate').value) || 15;
  const totalH = allEntries.reduce((s, e) => s + calcHours(e.date, e.in, e.out), 0);
  const el     = document.getElementById('month-summary');
  if (!allEntries.length) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="summary-card"><div class="sc-label">Current period</div><div class="sc-value">${allEntries.length} entries</div></div>
    <div class="summary-card"><div class="sc-label">Total hours</div><div class="sc-value accent">${formatHours(totalH)}</div></div>
    <div class="summary-card"><div class="sc-label">Earnings</div><div class="sc-value">£${(totalH * rate).toFixed(2)}</div></div>`;
}

/* ── History View ───────────────────────────────────────────────────────── */
function renderHistory() {
  const list    = document.getElementById('history-list');
  const rate    = parseFloat(document.getElementById('inv-rate').value) || 15;
  const entries = [...allEntries].sort((a, b) => (b.date + b.in).localeCompare(a.date + a.in));

  if (!entries.length) {
    list.innerHTML = '<div class="empty-state"><span class="es-icon">📋</span>No entries in current period yet.</div>';
    return;
  }
  list.innerHTML = entries.map(e => {
    const h = calcHours(e.date, e.in, e.out);
    return `<div class="history-entry" data-id="${e.id}">
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

/* ── Edit Modal ─────────────────────────────────────────────────────────── */
let editingId = null;

function openEditModal(id) {
  const entry = allEntries.find(e => e.id === id);
  if (!entry) return;
  editingId = id;
  document.getElementById('edit-date').value  = entry.date;
  document.getElementById('edit-in').value    = entry.in;
  document.getElementById('edit-out').value   = entry.out;
  document.getElementById('edit-notes').value = entry.notes || '';
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

document.getElementById('edit-form').addEventListener('submit', async e => {
  e.preventDefault();
  const date  = document.getElementById('edit-date').value;
  const tin   = document.getElementById('edit-in').value;
  const tout  = document.getElementById('edit-out').value;
  const notes = document.getElementById('edit-notes').value.trim();
  if (!date || !tin || !tout) return showToast('Fill all required fields', 'error');
  const h = calcHours(date, tin, tout);
  if (h <= 0 || h >= 24) return showToast('Clock-out must be after clock-in', 'error');
  try {
    await updateDoc(doc(db, 'entries', editingId), { date, in: tin, out: tout, notes });
    const idx = allEntries.findIndex(e => e.id === editingId);
    if (idx !== -1) allEntries[idx] = { ...allEntries[idx], date, in: tin, out: tout, notes };
    closeEditModal(); renderHistory(); renderCurrentPeriod();
    showToast('Entry updated ✓', 'success');
  } catch { showToast('Failed to update', 'error'); }
});

document.getElementById('delete-entry-btn').addEventListener('click', async () => {
  if (!confirm('Delete this entry?')) return;
  try {
    await deleteDoc(doc(db, 'entries', editingId));
    allEntries = allEntries.filter(e => e.id !== editingId);
    closeEditModal(); renderHistory(); renderCurrentPeriod();
    showToast('Entry deleted', 'success');
  } catch { showToast('Failed to delete', 'error'); }
});

/* ── Invoice View ───────────────────────────────────────────────────────── */
function renderInvoiceView() {
  const rate   = parseFloat(document.getElementById('inv-rate').value) || 15;
  const totalH = allEntries.reduce((s, e) => s + calcHours(e.date, e.in, e.out), 0);

  // Current period summary
  document.getElementById('current-period-hours').textContent = formatHours(totalH);
  document.getElementById('current-period-amount').textContent = `£${(totalH * rate).toFixed(2)}`;
  document.getElementById('current-period-count').textContent = `${allEntries.length} entries`;

  // Set default invoice number
  const invNo = document.getElementById('inv-invoice-no');
  if (!invNo.value) {
    invNo.value = `INV-${String(allInvoices.length + 1).padStart(3, '0')}`;
  }

  // Default invoice title to current month
  const invTitle = document.getElementById('inv-title');
  if (!invTitle.value) {
    invTitle.value = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  // Render past invoices
  renderPastInvoices();
}

function renderPastInvoices() {
  const list = document.getElementById('past-invoices-list');
  if (!allInvoices.length) {
    list.innerHTML = '<div class="empty-state"><span class="es-icon">🧾</span>No invoices raised yet.</div>';
    return;
  }
  list.innerHTML = allInvoices.map(inv => `
    <div class="invoice-item" data-id="${inv.id}">
      <div>
        <div class="inv-item-title">${escHtml(inv.title)}</div>
        <div class="inv-item-meta">${inv.invNo} · Raised ${new Date(inv.raisedAt).toLocaleDateString('en-GB')}</div>
      </div>
      <div>
        <div class="inv-item-amount">£${inv.totalAmount.toFixed(2)}</div>
        <div class="inv-item-hours">${formatHours(inv.totalHours)}</div>
        <div class="he-edit-hint">tap to view</div>
      </div>
    </div>`).join('');

  list.querySelectorAll('.invoice-item').forEach(el => {
    el.addEventListener('click', () => viewPastInvoice(el.dataset.id));
  });
}

function viewPastInvoice(id) {
  const inv     = allInvoices.find(i => i.id === id);
  if (!inv) return;
  const preview = document.getElementById('invoice-preview');
  preview.innerHTML = buildInvoiceHTMLFromData(inv);
  preview.hidden = false;
  preview.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ── Raise Invoice ──────────────────────────────────────────────────────── */
document.getElementById('raise-invoice-btn').addEventListener('click', async () => {
  if (!allEntries.length) return showToast('No entries to invoice', 'error');

  const rate    = parseFloat(document.getElementById('inv-rate').value) || 15;
  const title   = document.getElementById('inv-title').value.trim() || new Date().toLocaleDateString('en-GB', { month:'long', year:'numeric' });
  const invNo   = document.getElementById('inv-invoice-no').value.trim() || `INV-${String(allInvoices.length+1).padStart(3,'0')}`;
  const myName  = document.getElementById('inv-your-name').value.trim();
  const client  = document.getElementById('inv-client').value.trim();
  const cAddr   = document.getElementById('inv-client-addr').value.trim();
  const payment = document.getElementById('inv-payment').value.trim();

  const totalH      = allEntries.reduce((s, e) => s + calcHours(e.date, e.in, e.out), 0);
  const totalAmount = totalH * rate;

  if (!confirm(`Raise invoice "${title}" for £${totalAmount.toFixed(2)}?\n\nThis will lock all current entries and start a fresh period.`)) return;

  const btn = document.getElementById('raise-invoice-btn');
  btn.textContent = 'Raising…';
  btn.disabled = true;

  try {
    // Save invoice to Firestore
    const invoiceData = {
      uid: currentUser.uid,
      title, invNo, myName, client, cAddr, payment,
      rate, totalHours: totalH, totalAmount,
      entries: allEntries,
      raisedAt: Date.now()
    };
    const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
    allInvoices.unshift({ id: docRef.id, ...invoiceData });

    // Delete all current entries from Firestore
    await Promise.all(allEntries.map(e => deleteDoc(doc(db, 'entries', e.id))));
    allEntries = [];

    // Reset form fields
    document.getElementById('inv-invoice-no').value = `INV-${String(allInvoices.length+1).padStart(3,'0')}`;
    document.getElementById('inv-title').value = '';
    document.getElementById('invoice-preview').hidden = true;

    renderCurrentPeriod();
    renderInvoiceView();
    showToast(`Invoice "${title}" raised ✓`, 'success');

    // Show the invoice
    const preview = document.getElementById('invoice-preview');
    preview.innerHTML = buildInvoiceHTMLFromData({ ...invoiceData, id: docRef.id });
    preview.hidden = false;
    preview.scrollIntoView({ behavior:'smooth', block:'start' });

  } catch (err) {
    showToast('Failed to raise invoice', 'error');
  } finally {
    btn.textContent = 'Raise & Lock Invoice';
    btn.disabled = false;
  }
});

/* ── Preview Current ────────────────────────────────────────────────────── */
document.getElementById('preview-invoice-btn').addEventListener('click', () => {
  if (!allEntries.length) return showToast('No entries to preview', 'error');
  const rate    = parseFloat(document.getElementById('inv-rate').value) || 15;
  const title   = document.getElementById('inv-title').value.trim() || new Date().toLocaleDateString('en-GB', { month:'long', year:'numeric' });
  const invNo   = document.getElementById('inv-invoice-no').value.trim() || 'INV-001';
  const myName  = document.getElementById('inv-your-name').value.trim();
  const client  = document.getElementById('inv-client').value.trim();
  const cAddr   = document.getElementById('inv-client-addr').value.trim();
  const payment = document.getElementById('inv-payment').value.trim();
  const totalH  = allEntries.reduce((s,e) => s + calcHours(e.date,e.in,e.out), 0);

  const preview = document.getElementById('invoice-preview');
  preview.innerHTML = buildInvoiceHTMLFromData({
    title, invNo, myName, client, cAddr, payment,
    rate, totalHours: totalH, totalAmount: totalH * rate,
    entries: allEntries, raisedAt: Date.now()
  });
  preview.hidden = false;
  preview.scrollIntoView({ behavior:'smooth', block:'start' });
});

/* ── Print ──────────────────────────────────────────────────────────────── */
document.getElementById('print-invoice-btn').addEventListener('click', () => {
  const preview = document.getElementById('invoice-preview');
  if (preview.hidden || !preview.innerHTML) return showToast('Preview an invoice first', 'error');
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice</title>
    <style>body{margin:0;font-family:Georgia,serif;font-size:14px;color:#111}.inv-doc{padding:2.5rem;max-width:800px;margin:auto}.inv-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2rem}.inv-brand{font-family:Arial Black,Arial,sans-serif;font-size:1.6rem;font-weight:900}.inv-meta{text-align:right;font-size:.8rem;color:#555}.inv-meta strong{color:#111}.inv-parties{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin-bottom:2rem}.inv-party-label{font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;color:#999;margin-bottom:.25rem}.inv-party-name{font-weight:700;font-size:1rem}.inv-table{width:100%;border-collapse:collapse;margin-bottom:2rem}.inv-table th{text-align:left;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:#777;border-bottom:2px solid #111;padding:.5rem .75rem}.inv-table td{padding:.6rem .75rem;border-bottom:1px solid #eee;font-size:.85rem;vertical-align:top}.inv-totals{display:flex;justify-content:flex-end}.inv-totals-box{min-width:220px}.inv-total-row{display:flex;justify-content:space-between;padding:.35rem 0;font-size:.85rem}.inv-total-row.grand{border-top:2px solid #111;margin-top:.5rem;padding-top:.75rem;font-weight:700;font-size:1.1rem}.inv-footer{border-top:1px solid #eee;margin-top:2rem;padding-top:1rem;font-size:.75rem;color:#888}</style>
  </head><body>${preview.innerHTML}</body></html>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 400);
});

/* ── Email ──────────────────────────────────────────────────────────────── */
document.getElementById('email-invoice-btn').addEventListener('click', () => {
  const preview = document.getElementById('invoice-preview');
  if (preview.hidden || !preview.innerHTML) return showToast('Preview an invoice first', 'error');

  const rate    = parseFloat(document.getElementById('inv-rate').value) || 15;
  const client  = document.getElementById('inv-client').value.trim() || 'Client';
  const myName  = document.getElementById('inv-your-name').value.trim() || 'Your Name';
  const invNo   = document.getElementById('inv-invoice-no').value.trim() || 'INV-001';
  const title   = document.getElementById('inv-title').value.trim() || 'Invoice';
  const totalH  = allEntries.reduce((s,e) => s + calcHours(e.date,e.in,e.out), 0);
  const lines   = allEntries.sort((a,b) => (a.date+a.in).localeCompare(b.date+b.in)).map(e => {
    const h = calcHours(e.date,e.in,e.out);
    return `  ${formatDate(e.date)}  ${e.in}–${e.out}  (${formatHours(h)})  £${(h*rate).toFixed(2)}\n  ${e.notes||'No notes'}`;
  }).join('\n\n');
  const subject = encodeURIComponent(`Invoice ${invNo} – ${title}`);
  const body    = encodeURIComponent(`Dear ${client},\n\nPlease find below my invoice for ${title}.\n\nInvoice No: ${invNo}\nFrom: ${myName}\n\nTIME LOG\n${'─'.repeat(40)}\n${lines}\n\n${'─'.repeat(40)}\nTotal Hours: ${formatHours(totalH)}\nRate: £${rate}/hr\nTotal Due: £${(totalH*rate).toFixed(2)}\n\nPlease arrange payment at your earliest convenience.\n\nKind regards,\n${myName}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
});

/* ── Build Invoice HTML ─────────────────────────────────────────────────── */
function buildInvoiceHTMLFromData(inv) {
  const today   = new Date(inv.raisedAt).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' });
  const entries = [...(inv.entries || [])].sort((a,b) => (a.date+a.in).localeCompare(b.date+b.in));
  const rows    = entries.map(e => {
    const h = calcHours(e.date, e.in, e.out);
    return `<tr><td>${formatDate(e.date)}</td><td>${e.in}–${e.out}</td><td>${formatHours(h)}</td><td>${escHtml(e.notes||'—')}</td><td style="text-align:right">£${(h*inv.rate).toFixed(2)}</td></tr>`;
  }).join('');
  const cAddr   = (inv.cAddr||'').replace(/\n/g,'<br>');
  const payment = (inv.payment||'').replace(/\n/g,'<br>');
  return `<div class="inv-doc">
    <div class="inv-top">
      <div><div class="inv-brand">${escHtml(inv.myName||'Your Name')}</div><div style="font-size:.8rem;color:#666;margin-top:.25rem">Freelance Invoice</div></div>
      <div class="inv-meta"><div><strong>Invoice No:</strong> ${escHtml(inv.invNo)}</div><div><strong>Date:</strong> ${today}</div><div><strong>Period:</strong> ${escHtml(inv.title)}</div></div>
    </div>
    <div class="inv-parties">
      <div><div class="inv-party-label">From</div><div class="inv-party-name">${escHtml(inv.myName||'Your Name')}</div></div>
      <div><div class="inv-party-label">Bill To</div><div class="inv-party-name">${escHtml(inv.client||'Client')}</div>${cAddr?`<div style="font-size:.8rem;color:#555;margin-top:.2rem">${cAddr}</div>`:''}</div>
    </div>
    <table class="inv-table"><thead><tr><th>Date</th><th>Hours</th><th>Duration</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="inv-totals"><div class="inv-totals-box">
      <div class="inv-total-row"><span>Total Hours</span><span>${formatHours(inv.totalHours)}</span></div>
      <div class="inv-total-row"><span>Rate</span><span>£${inv.rate.toFixed(2)}/hr</span></div>
      <div class="inv-total-row grand"><span>Total Due</span><span>£${inv.totalAmount.toFixed(2)}</span></div>
    </div></div>
    ${payment?`<div class="inv-footer"><strong>Payment Details:</strong> ${payment}</div>`:''}
  </div>`;
}

/* ── Service Worker ─────────────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
