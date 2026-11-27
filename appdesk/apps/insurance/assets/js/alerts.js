// assets/js/alerts.js
// Derives the alert feed shown on the dashboard and notifications page.
// Plain script — attaches to window.IPM.

(function (IPM) {

async function buildAlerts() {
  const policies = await IPM.Storage.getAll('policies');
  const rows = await IPM.buildPremiumRows();
  const alerts = [];
  const today = new Date().toISOString().slice(0, 10);

  rows.forEach((r) => {
    const days = IPM.daysBetween(today, r.dueDate);
    if (r.status === 'Overdue') {
      alerts.push({ type: 'Overdue', level: 'danger', text: `${r.policyNumber} premium is overdue by ${Math.abs(days)} day(s).`, date: r.dueDate });
    } else if (r.status === 'Grace') {
      alerts.push({ type: 'Grace Ending', level: 'warning', text: `${r.policyNumber} is in grace period — pay before it lapses.`, date: r.dueDate });
    } else if (days === 0) {
      alerts.push({ type: "Today's Due", level: 'warning', text: `${r.policyNumber} premium of ${r.dueAmount} is due today.`, date: r.dueDate });
    } else if (days === 1) {
      alerts.push({ type: 'Tomorrow Due', level: 'info', text: `${r.policyNumber} premium is due tomorrow.`, date: r.dueDate });
    } else if (days > 1 && days <= 7) {
      alerts.push({ type: 'This Week', level: 'info', text: `${r.policyNumber} premium due in ${days} days.`, date: r.dueDate });
    }
  });

  policies.forEach((p) => {
    if (p.maturityDate) {
      const days = IPM.daysBetween(today, p.maturityDate);
      if (days >= 0 && days <= 30) {
        alerts.push({ type: 'Policy Maturing', level: 'info', text: `${p.policyNumber} matures on ${p.maturityDate}.`, date: p.maturityDate });
      }
    }
  });

  return alerts.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 40);
}

IPM.buildAlerts = buildAlerts;

})(window.IPM = window.IPM || {});
