// assets/js/dashboard.js
// Populates the dashboard: summary cards, charts, tables. Plain script.

(function (IPM) {

async function renderDashboard() {
  const settings = await IPM.getSettings();
  const policies = await IPM.Storage.getAll('policies');
  const rows = await IPM.buildPremiumRows();
  const alerts = await IPM.buildAlerts();

  const stats = computeStats(policies, rows, settings);
  renderCards(stats, settings);
  renderCharts(policies, rows);
  renderUpcomingTable(rows, settings);
  renderAlertsList(alerts);
  renderRecentPayments(rows, settings);
}

function computeStats(policies, rows, settings) {
  const active = policies.filter((p) => IPM.derivedStatus(p) === 'Active').length;
  const grace = policies.filter((p) => IPM.derivedStatus(p) === 'Grace').length;
  const lapsed = policies.filter((p) => IPM.derivedStatus(p) === 'Lapsed').length;
  const matured = policies.filter((p) => IPM.derivedStatus(p) === 'Matured').length;
  const claimed = policies.filter((p) => p.status === 'Claimed').length;
  const totalSumAssured = policies.reduce((s, p) => s + (Number(p.sumAssured) || 0), 0);
  const totalAnnualPremium = policies.reduce((s, p) => s + IPM.annualize(p), 0);
  const pendingAmt = rows.filter((r) => ['Pending', 'Overdue', 'Grace'].includes(r.status)).reduce((s, r) => s + r.dueAmount, 0);
  const paidAmt = rows.filter((r) => IPM.isPaidLike(r.status)).reduce((s, r) => s + r.totalPaid, 0);
  const premiumCounts = IPM.countByStatus(rows);
  const dueThisMonth = rows.filter((r) => {
    const d = new Date(r.dueDate), n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;
  const healthCoverage = policies.filter((p) => (p.category || '').includes('Health') || (p.category || '').includes('Critical')).reduce((s, p) => s + (Number(p.sumAssured) || 0), 0);
  const termCoverage = policies.filter((p) => (p.category || '').includes('Term') || (p.category || '').includes('Life')).reduce((s, p) => s + (Number(p.sumAssured) || 0), 0);
  const investmentValue = policies.reduce((s, p) => s + (Number(p.currentFundValue) || 0), 0);
  const expiringSoon = policies.filter((p) => IPM.policyIsExpiringSoon(p)).length;

  return {
    totalPolicies: policies.length, active, grace, lapsed, matured, claimed,
    totalSumAssured, totalAnnualPremium, pendingAmt, paidAmt, dueThisMonth,
    healthCoverage, termCoverage, investmentValue, expiringSoon, premiumCounts,
    inactive: policies.length - active
  };
}

function card(label, value, icon, accentClass = '', href = null) {
  const tag = href ? 'a' : 'div';
  const hrefAttr = href ? ` href="${href}"` : '';
  return `<${tag} class="stat-card ${accentClass}"${hrefAttr}>
    <div class="stat-icon">${icon}</div>
    <div class="stat-body"><span class="stat-value">${value}</span><span class="stat-label">${label}</span></div>
  </${tag}>`;
}

function renderCards(s, settings) {
  const el = IPM.qs('#statCards');
  if (!el) return;
  el.innerHTML = [
    card('Total Policies', s.totalPolicies, '📄', '', 'policies.html'),
    card('Total Sum Assured', IPM.fmtMoney(s.totalSumAssured, settings.currency), '🛡️', 'accent-blue', 'policies.html?sort=sumAssured'),
    card('Total Annual Premium', IPM.fmtMoney(s.totalAnnualPremium, settings.currency), '💳', 'accent-blue', 'policies.html?sort=premiumAmount'),
    card('Premiums Paid', `${s.premiumCounts.paid} / ${s.premiumCounts.total}`, '✔️', 'accent-green', 'payment-tracker.html?filter=paid'),
    card('Premiums Due', s.premiumCounts.due, '🔔', 'accent-orange', 'payment-tracker.html?filter=pendingAll'),
    card('Due This Month', s.dueThisMonth, '📅', 'accent-orange', 'payment-tracker.html?filter=dueThisMonth'),
    card('Premium Pending', IPM.fmtMoney(s.pendingAmt, settings.currency), '⏳', 'accent-orange', 'payment-tracker.html?filter=pendingAll'),
    card('Total Paid (incl. fees)', IPM.fmtMoney(s.paidAmt, settings.currency), '✅', 'accent-green', 'payment-tracker.html?filter=paid'),
    card('Active Policies', s.active, '🟢', 'accent-green', 'policies.html?status=Active'),
    card('Grace Period', s.grace, '🟠', 'accent-orange', 'policies.html?status=Grace'),
    card('Lapsed Policies', s.lapsed, '🔴', 'accent-red', 'policies.html?status=Lapsed'),
    card('Matured Policies', s.matured, '🏁', 'accent-blue', 'policies.html?status=Matured'),
    card('Health Coverage', IPM.fmtMoney(s.healthCoverage, settings.currency), '🏥', '', 'policies.html?type=health'),
    card('Term Coverage', IPM.fmtMoney(s.termCoverage, settings.currency), '🧬', '', 'policies.html?type=term'),
    card('Investment Value', IPM.fmtMoney(s.investmentValue, settings.currency), '📈', 'accent-blue', 'policies.html?type=ulip'),
    card('Expiring in 30 Days', s.expiringSoon, '⚠️', 'accent-orange', 'policies.html?expiring=30')
  ].join('');
}

function renderCharts(policies, rows) {
  const statusCanvas = IPM.qs('#statusChart');
  if (statusCanvas) {
    const byStatus = {};
    policies.forEach((p) => { const st = IPM.derivedStatus(p); byStatus[st] = (byStatus[st] || 0) + 1; });
    const data = Object.entries(byStatus).map(([k, v]) => ({ label: k, value: v }));
    IPM.drawDonut(statusCanvas, data, data.map((d) => IPM.STATUS_COLORS[d.label] || '#999'));
    renderLegend('#statusLegend', data, (l) => IPM.STATUS_COLORS[l] || '#999');
  }

  const companyCanvas = IPM.qs('#companyChart');
  if (companyCanvas) {
    const byCompany = {};
    policies.forEach((p) => { byCompany[p.company] = (byCompany[p.company] || 0) + 1; });
    const entries = Object.entries(byCompany).slice(0, 6);
    IPM.drawBar(companyCanvas, entries.map(([k]) => k.split(' ')[0]), entries.map(([, v]) => v), '#2f6fed');
  }

  const trendCanvas = IPM.qs('#premiumTrendChart');
  if (trendCanvas) {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('en-IN', { month: 'short' }), y: d.getFullYear(), m: d.getMonth() });
    }
    const values = months.map(({ y, m }) => rows.filter((r) => {
      const dd = new Date(r.dueDate);
      return dd.getFullYear() === y && dd.getMonth() === m && IPM.isPaidLike(r.status);
    }).reduce((s, r) => s + r.paidAmount, 0));
    IPM.drawBar(trendCanvas, months.map((m) => m.label), values, '#1a9c6b');
  }
}

function renderLegend(sel, data, colorFn) {
  const el = IPM.qs(sel);
  if (!el) return;
  el.innerHTML = data.map((d) => `<div class="legend-item"><span class="dot" style="background:${colorFn(d.label)}"></span>${IPM.escapeHtml(d.label)} (${d.value})</div>`).join('');
}

function renderUpcomingTable(rows, settings) {
  const el = IPM.qs('#upcomingTable tbody');
  if (!el) return;
  const upcoming = rows.filter((r) => ['Future', 'Pending', 'Grace', 'Overdue'].includes(r.status)).slice(0, 8);
  el.innerHTML = upcoming.map((r) => `
    <tr>
      <td>${IPM.escapeHtml(r.policyNumber)}</td>
      <td>${IPM.escapeHtml(r.customerName)}</td>
      <td>${IPM.fmtDate(r.dueDate, settings.dateFormat)}</td>
      <td>${IPM.fmtMoney(r.dueAmount, settings.currency)}</td>
      <td><span class="status-pill" style="--pill-color:${IPM.STATUS_COLORS[r.status] || '#999'}">${r.status}</span></td>
    </tr>`).join('') || `<tr><td colspan="5" class="empty-row">No upcoming premiums 🎉</td></tr>`;
}

function renderRecentPayments(rows, settings) {
  const el = IPM.qs('#recentPaymentsTable tbody');
  if (!el) return;
  const recent = rows.filter((r) => IPM.isPaidLike(r.status)).sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).slice(0, 6);
  el.innerHTML = recent.map((r) => `
    <tr>
      <td>${IPM.escapeHtml(r.policyNumber)}</td>
      <td>${IPM.fmtMoney(r.totalPaid, settings.currency)}</td>
      <td>${IPM.fmtDate(r.paymentDate, settings.dateFormat)}</td>
      <td>${IPM.escapeHtml(r.paymentMode || '—')}</td>
    </tr>`).join('') || `<tr><td colspan="4" class="empty-row">No payments recorded yet</td></tr>`;
}

function renderAlertsList(alerts) {
  const el = IPM.qs('#alertsList');
  if (!el) return;
  el.innerHTML = alerts.slice(0, 8).map((a) => `
    <div class="alert-item alert-${a.level}">
      <span class="alert-type">${a.type}</span>
      <span class="alert-text">${IPM.escapeHtml(a.text)}</span>
    </div>`).join('') || `<div class="empty-row">No active alerts</div>`;
}

document.addEventListener('DOMContentLoaded', renderDashboard);

})(window.IPM = window.IPM || {});
