// assets/js/policy.js
// Policy CRUD + derived-status computation. Plain script — attaches to window.IPM.

(function (IPM) {

async function listPolicies() {
  return IPM.Storage.getAll('policies');
}

async function getPolicy(id) {
  return IPM.Storage.get('policies', id);
}

async function savePolicy(record) {
  if (!record.customerName || !record.policyNumber) {
    throw new Error('Customer name and policy number are required.');
  }
  const existing = await IPM.Storage.getAll('policies');
  const dupe = existing.find((p) => p.policyNumber === record.policyNumber && p.id !== record.id);
  if (dupe) throw new Error(`Policy number "${record.policyNumber}" already exists.`);
  return IPM.Storage.put('policies', record);
}

async function deletePolicy(record) {
  return IPM.softDelete('policies', record);
}

function derivedStatus(policy) {
  if (['Discontinued', 'Surrendered', 'Claimed', 'Cancelled'].includes(policy.status)) return policy.status;
  if (policy.maturityDate) {
    const days = IPM.daysBetween(new Date().toISOString(), policy.maturityDate);
    if (days < 0) return 'Matured';
  }
  return policy.status || 'Active';
}

function policyIsExpiringSoon(policy, withinDays = 30) {
  if (!policy.maturityDate) return false;
  const days = IPM.daysBetween(new Date().toISOString(), policy.maturityDate);
  return days >= 0 && days <= withinDays;
}

IPM.listPolicies = listPolicies;
IPM.getPolicy = getPolicy;
IPM.savePolicy = savePolicy;
IPM.deletePolicy = deletePolicy;
IPM.derivedStatus = derivedStatus;
IPM.policyIsExpiringSoon = policyIsExpiringSoon;

})(window.IPM = window.IPM || {});
