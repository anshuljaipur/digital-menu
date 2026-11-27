// assets/js/search.js
// Generic search + filter + sort helpers. Plain script — attaches to window.IPM.

(function (IPM) {

const SEARCH_FIELDS = [
  'policyNumber', 'customerName', 'company', 'agentName', 'policyType',
  'category', 'nominee', 'premiumAmount', 'status', 'maturityDate', 'agentMobile', 'pan', 'aadhaar'
];

function searchRecords(records, query) {
  if (!query || !query.trim()) return records;
  const q = query.trim().toLowerCase();
  return records.filter((r) =>
    SEARCH_FIELDS.some((f) => String(r[f] ?? '').toLowerCase().includes(q))
  );
}

function filterRecords(records, filters) {
  return records.filter((r) => {
    if (filters.company && r.company !== filters.company) return false;
    if (filters.category && r.category !== filters.category) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.frequency && r.premiumFrequency !== filters.frequency) return false;
    if (filters.minPremium && Number(r.premiumAmount) < Number(filters.minPremium)) return false;
    if (filters.maxPremium && Number(r.premiumAmount) > Number(filters.maxPremium)) return false;
    if (filters.maturityYear && (!r.maturityDate || new Date(r.maturityDate).getFullYear() !== Number(filters.maturityYear))) return false;
    return true;
  });
}

function sortRecords(records, key, dir = 'asc') {
  const sorted = [...records].sort((a, b) => {
    const av = a[key] ?? '', bv = b[key] ?? '';
    if (av < bv) return -1;
    if (av > bv) return 1;
    return 0;
  });
  return dir === 'desc' ? sorted.reverse() : sorted;
}

IPM.searchRecords = searchRecords;
IPM.filterRecords = filterRecords;
IPM.sortRecords = sortRecords;

})(window.IPM = window.IPM || {});
