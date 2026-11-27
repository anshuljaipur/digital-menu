// assets/js/reports.js
// Report aggregations for the Reports page. Plain script — attaches to window.IPM.

(function (IPM) {

function annualize(policy) {
  const amt = Number(policy.premiumAmount) || 0;
  const mult = { Monthly: 12, Quarterly: 4, 'Half Yearly': 2, Yearly: 1, 'Single Premium': 0 };
  return amt * (mult[policy.premiumFrequency] ?? 1);
}

async function companyWiseReport() {
  const policies = await IPM.Storage.getAll('policies');
  const map = {};
  policies.forEach((p) => {
    const key = p.company || 'Unknown';
    if (!map[key]) map[key] = { company: key, policies: 0, sumAssured: 0, annualPremium: 0 };
    map[key].policies++;
    map[key].sumAssured += Number(p.sumAssured) || 0;
    map[key].annualPremium += annualize(p);
  });
  return Object.values(map);
}

async function policyTypeReport() {
  const policies = await IPM.Storage.getAll('policies');
  const map = {};
  policies.forEach((p) => {
    const key = p.category || p.policyType || 'Other';
    if (!map[key]) map[key] = { category: key, policies: 0, sumAssured: 0 };
    map[key].policies++;
    map[key].sumAssured += Number(p.sumAssured) || 0;
  });
  return Object.values(map);
}

async function pendingPremiumReport() {
  const rows = await IPM.buildPremiumRows();
  return rows.filter((r) => ['Pending', 'Overdue', 'Grace', 'Missed'].includes(r.status));
}

async function upcomingPremiumReport(days = 30) {
  const rows = await IPM.buildPremiumRows();
  const today = new Date();
  return rows.filter((r) => {
    const d = Math.round((new Date(r.dueDate) - today) / 86400000);
    return d >= 0 && d <= days;
  });
}

async function lapsedReport() {
  const policies = await IPM.Storage.getAll('policies');
  return policies.filter((p) => p.status === 'Lapsed');
}

async function gracePolicyReport() {
  const policies = await IPM.Storage.getAll('policies');
  return policies.filter((p) => p.status === 'Grace');
}

async function maturityReport() {
  const policies = await IPM.Storage.getAll('policies');
  return policies.filter((p) => p.maturityDate).sort((a, b) => new Date(a.maturityDate) - new Date(b.maturityDate));
}

async function agentWiseReport() {
  const policies = await IPM.Storage.getAll('policies');
  const map = {};
  policies.forEach((p) => {
    const key = p.agentName || 'Direct';
    if (!map[key]) map[key] = { agent: key, policies: 0, annualPremium: 0 };
    map[key].policies++;
    map[key].annualPremium += annualize(p);
  });
  return Object.values(map);
}

IPM.annualize = annualize;
IPM.companyWiseReport = companyWiseReport;
IPM.policyTypeReport = policyTypeReport;
IPM.pendingPremiumReport = pendingPremiumReport;
IPM.upcomingPremiumReport = upcomingPremiumReport;
IPM.lapsedReport = lapsedReport;
IPM.gracePolicyReport = gracePolicyReport;
IPM.maturityReport = maturityReport;
IPM.agentWiseReport = agentWiseReport;

})(window.IPM = window.IPM || {});
