// assets/js/import.js
// CSV/JSON import parsing with duplicate detection. Plain script — attaches to window.IPM.

(function (IPM) {

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = splitCSVLine(line);
    const row = {};
    headers.forEach((h, i) => row[h.trim()] = cells[i] ?? '');
    return row;
  });
}

function splitCSVLine(line) {
  const out = []; let cur = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

function parseJSON(text) {
  const data = JSON.parse(text);
  return Array.isArray(data) ? data : (data.policies || []);
}

// True backup restore — brings back every store a full backup contains
// (policies, payments, companies, claims, bonuses, payout plans/receipts,
// settings), not just the policies list.
function isFullBackup(text) {
  try {
    const data = JSON.parse(text);
    return !Array.isArray(data) && (data.payments || data.companies || data.exportedAt);
  } catch { return false; }
}

async function restoreFullBackup(text, { replace = false } = {}) {
  const data = JSON.parse(text);
  const stores = ['policies', 'payments', 'companies', 'claims', 'bonuses', 'payoutPlans', 'payoutReceipts'];
  const counts = {};
  for (const s of stores) {
    const records = data[s];
    if (!Array.isArray(records) || !records.length) { counts[s] = 0; continue; }
    if (replace) await IPM.Storage.clear(s);
    await IPM.Storage.bulkPut(s, records);
    counts[s] = records.length;
  }
  if (data.settings && data.settings.length) {
    await IPM.Storage.put('settings', { ...data.settings[0], id: 'app-settings' });
  }
  return counts;
}

async function previewImport(records) {
  const existing = await IPM.Storage.getAll('policies');
  const existingNumbers = new Set(existing.map((p) => p.policyNumber));
  return records.map((r) => ({
    ...r,
    __isDuplicate: existingNumbers.has(r.policyNumber)
  }));
}

async function commitImport(records, { mergeDuplicates = false } = {}) {
  const existing = await IPM.Storage.getAll('policies');
  let imported = 0, skipped = 0, merged = 0;
  for (const r of records) {
    const { __isDuplicate, ...record } = r;
    const dup = existing.find((p) => p.policyNumber === record.policyNumber);
    if (dup) {
      if (mergeDuplicates) { await IPM.Storage.put('policies', { ...dup, ...record, id: dup.id }); merged++; }
      else skipped++;
      continue;
    }
    await IPM.Storage.put('policies', { ...record, id: record.id || IPM.uid() });
    imported++;
  }
  return { imported, skipped, merged };
}

IPM.parseCSV = parseCSV;
IPM.parseJSON = parseJSON;
IPM.isFullBackup = isFullBackup;
IPM.restoreFullBackup = restoreFullBackup;
IPM.previewImport = previewImport;
IPM.commitImport = commitImport;

})(window.IPM = window.IPM || {});
