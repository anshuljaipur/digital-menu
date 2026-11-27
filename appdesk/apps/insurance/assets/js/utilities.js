// assets/js/utilities.js
// Shared helper functions used across every page. Plain script — attaches
// everything to window.IPM. Load this after config/constants.js.

(function (IPM) {

function fmtMoney(amount, currency = '₹') {
  const n = Number(amount) || 0;
  return `${currency}${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function fmtDate(iso, format = 'DD-MM-YYYY') {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  if (format === 'MM-DD-YYYY') return `${mm}-${dd}-${yyyy}`;
  if (format === 'YYYY-MM-DD') return `${yyyy}-${mm}-${dd}`;
  return `${dd}-${mm}-${yyyy}`;
}

function daysBetween(a, b) {
  const MS = 1000 * 60 * 60 * 24;
  return Math.round((new Date(b) - new Date(a)) / MS);
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function addYears(dateStr, years) {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function calcAge(dob) {
  if (!dob) return '—';
  const b = new Date(dob), t = new Date();
  let age = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) age--;
  return age;
}

function generateSchedule(policy) {
  const months = IPM.FREQUENCY_MONTHS[policy.premiumFrequency] ?? 12;
  const schedule = [];
  if (!policy.commencementDate) return schedule;

  if (months === 0) {
    schedule.push({
      installmentNo: 1,
      dueDate: policy.commencementDate,
      dueAmount: Number(policy.premiumAmount) || 0
    });
    return schedule;
  }

  const payingYears = Number(policy.premiumPayingTerm) || Number(policy.policyTerm) || 1;
  const totalInstallments = Math.round((payingYears * 12) / months);
  let due = policy.commencementDate;
  for (let i = 1; i <= totalInstallments; i++) {
    schedule.push({
      installmentNo: i,
      dueDate: due,
      dueAmount: (Number(policy.premiumAmount) || 0) + (Number(policy.gst) || 0)
    });
    due = addMonths(due, months);
  }
  return schedule;
}

function installmentStatus(installment, gracePeriodDays, paymentRecord) {
  if (paymentRecord && paymentRecord.paidAmount > 0) {
    const late = daysBetween(installment.dueDate, paymentRecord.paymentDate) > 0;
    return late ? 'Late' : 'Paid';
  }
  const today = new Date();
  const due = new Date(installment.dueDate);
  const graceEnd = new Date(due); graceEnd.setDate(graceEnd.getDate() + (Number(gracePeriodDays) || 0));

  if (today < due) return 'Future';
  if (today >= due && today <= graceEnd) return 'Grace';
  if (today > graceEnd) return 'Overdue';
  return 'Pending';
}

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

function debounce(fn, wait = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

// "Late" means a payment WAS recorded, just after the due date — treat it
// as paid everywhere an installment's paid/unpaid state matters.
function isPaidLike(status) {
  return status === 'Paid' || status === 'Late';
}

// Counts how many schedule rows fall into "paid" vs "still due" buckets —
// used by the policy detail page, tracker, and dashboard.
function countByStatus(rows) {
  const paid = rows.filter((r) => isPaidLike(r.status)).length;
  const due = rows.length - paid;
  return { paid, due, total: rows.length };
}

IPM.fmtMoney = fmtMoney;
IPM.fmtDate = fmtDate;
IPM.daysBetween = daysBetween;
IPM.addMonths = addMonths;
IPM.addYears = addYears;
IPM.calcAge = calcAge;
IPM.generateSchedule = generateSchedule;
IPM.installmentStatus = installmentStatus;
IPM.isPaidLike = isPaidLike;
IPM.countByStatus = countByStatus;
IPM.uid = uid;
IPM.debounce = debounce;
IPM.qs = qs;
IPM.qsa = qsa;
IPM.escapeHtml = escapeHtml;
IPM.getParam = getParam;

})(window.IPM = window.IPM || {});
