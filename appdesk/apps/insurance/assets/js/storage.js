// assets/js/storage.js
// IndexedDB storage layer with automatic LocalStorage fallback. Plain
// script (no ES modules) — attaches everything to window.IPM.

(function (IPM) {

const STORES = ['policies', 'payments', 'companies', 'claims', 'bonuses', 'payoutPlans', 'payoutReceipts', 'notifications', 'recycleBin', 'settings'];

let dbPromise = null;
let useLocalStorageFallback = false;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (!('indexedDB' in window)) { useLocalStorageFallback = true; resolve(null); return; }
    let req;
    try {
      req = indexedDB.open(IPM.DB_NAME, IPM.DB_VERSION);
    } catch (e) {
      useLocalStorageFallback = true; resolve(null); return;
    }
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      STORES.forEach((name) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' });
        }
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = () => { useLocalStorageFallback = true; resolve(null); };
  });
  return dbPromise;
}

function lsKey(store) { return `ipm_${store}`; }

function lsGetAll(store) {
  try { return JSON.parse(localStorage.getItem(lsKey(store)) || '[]'); }
  catch { return []; }
}
function lsSetAll(store, arr) { localStorage.setItem(lsKey(store), JSON.stringify(arr)); }

const LocalStore = {
  async getAll(store) {
    const db = await openDB();
    if (!db || useLocalStorageFallback) return lsGetAll(store);
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve(lsGetAll(store));
    });
  },

  async get(store, id) {
    const all = await this.getAll(store);
    return all.find((r) => r.id === id) || null;
  },

  async put(store, record) {
    if (!record.id) record.id = IPM.uid();
    record.updatedAt = new Date().toISOString();
    const db = await openDB();
    if (!db || useLocalStorageFallback) {
      const all = lsGetAll(store);
      const idx = all.findIndex((r) => r.id === record.id);
      if (idx >= 0) all[idx] = record; else all.push(record);
      lsSetAll(store, all);
      return record;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => {
        console.error('IndexedDB write failed, switching to localStorage for the rest of this session.', tx.error);
        useLocalStorageFallback = true;
        const all = lsGetAll(store);
        const idx = all.findIndex((r) => r.id === record.id);
        if (idx >= 0) all[idx] = record; else all.push(record);
        lsSetAll(store, all);
        resolve(record);
      };
    });
  },

  async bulkPut(store, records) {
    for (const r of records) await this.put(store, r);
    return records;
  },

  async remove(store, id) {
    const db = await openDB();
    if (!db || useLocalStorageFallback) {
      lsSetAll(store, lsGetAll(store).filter((r) => r.id !== id));
      return true;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        console.error('IndexedDB delete failed, switching to localStorage for the rest of this session.', tx.error);
        useLocalStorageFallback = true;
        lsSetAll(store, lsGetAll(store).filter((r) => r.id !== id));
        resolve(true);
      };
    });
  },

  async clear(store) {
    const db = await openDB();
    if (!db || useLocalStorageFallback) { lsSetAll(store, []); return; }
    return new Promise((resolve) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        console.error('IndexedDB clear failed, switching to localStorage for the rest of this session.', tx.error);
        useLocalStorageFallback = true;
        lsSetAll(store, []);
        resolve(true);
      };
    });
  }
};

// Router: every page talks to `Storage`; it forwards to Firebase when
// config/firebase-config.js is filled in, otherwise to this browser's
// IndexedDB (LocalStore).
const backend = () => (IPM.cloud && IPM.cloud.enabled ? IPM.cloud : LocalStore);

const Storage = {
  getAll: (store) => backend().getAll(store),
  async get(store, id) {
    const all = await this.getAll(store);
    return all.find((r) => r.id === id) || null;
  },
  async put(store, record) {
    if (!record.id) record.id = IPM.uid();
    record.updatedAt = new Date().toISOString();
    return backend().put(store, record);
  },
  async bulkPut(store, records) {
    records.forEach((r) => { if (!r.id) r.id = IPM.uid(); });
    return backend().bulkPut(store, records);
  },
  remove: (store, id) => backend().remove(store, id),
  clear: (store) => backend().clear(store)
};

async function softDelete(store, record) {
  await Storage.put('recycleBin', { ...record, id: IPM.uid(), originalId: record.id, originalStore: store, deletedAt: new Date().toISOString() });
  await Storage.remove(store, record.id);
}
async function restoreFromBin(binId) {
  const bin = await Storage.get('recycleBin', binId);
  if (!bin) return null;
  const { id, originalId, originalStore, deletedAt, ...rest } = bin;
  const restored = { ...rest, id: originalId };
  await Storage.put(originalStore, restored);
  await Storage.remove('recycleBin', binId);
  return restored;
}

async function getSettings() {
  const all = await Storage.getAll('settings');
  return all[0] || { id: 'app-settings', currency: '₹', dateFormat: 'DD-MM-YYYY', theme: 'corporateBlue', darkMode: false, reminderDays: 7, defaultGrace: 15, autoBackup: false, sound: true };
}
async function saveSettings(patch) {
  const current = await getSettings();
  const merged = { ...current, ...patch, id: 'app-settings' };
  await Storage.put('settings', merged);
  return merged;
}

// Adds the 14 demo policies + sample companies. Only ever runs when the
// user explicitly asks for it (Settings → Load Sample Data) — never
// automatically, so a personal, empty portfolio always stays empty.
async function seedSampleData() {
  const companies = IPM.DEFAULT_COMPANIES.map((c) => ({ id: IPM.uid(), ...c }));
  await Storage.bulkPut('companies', companies);

  const names = ['Rohan Mehta', 'Priya Sharma', 'Arjun Nair', 'Sneha Kapoor', 'Vikram Singh', 'Anita Desai'];
  const nominees = ['Meera Mehta', 'Raj Sharma', 'Kavita Nair', 'Amit Kapoor', 'Sunita Singh', 'Karan Desai'];
  const today = new Date();
  const policies = [];

  for (let i = 0; i < 14; i++) {
    const company = companies[i % companies.length];
    const category = IPM.POLICY_CATEGORIES[i % IPM.POLICY_CATEGORIES.length];
    const freq = IPM.PREMIUM_FREQUENCIES[i % 4];
    const issue = new Date(today.getFullYear() - (2 + (i % 6)), i % 12, (i % 27) + 1);
    const term = 10 + (i % 3) * 5;
    const maturity = new Date(issue); maturity.setFullYear(maturity.getFullYear() + term);
    const sumAssured = [300000, 500000, 750000, 1000000, 1500000, 2500000][i % 6];
    const premium = Math.round(sumAssured * (0.02 + (i % 5) * 0.005));
    const statusPool = ['Active', 'Active', 'Active', 'Grace', 'Lapsed', 'Matured', 'Paid'];

    policies.push({
      id: IPM.uid(),
      policyName: `${category} Plan ${1000 + i}`,
      policyNumber: `POL${2020 + (i % 6)}${String(1000 + i)}`,
      company: company.name,
      branch: `${company.short} Branch ${1 + (i % 4)}`,
      advisor: 'Direct',
      agentName: ['Suresh Kumar', 'Deepa Rao', 'Manoj Verma'][i % 3],
      agentMobile: `98${String(10000000 + i * 137).slice(0, 8)}`,
      agentEmail: `agent${i % 3}@example.com`,
      customerName: names[i % names.length],
      nominee: nominees[i % nominees.length],
      relationship: ['Spouse', 'Parent', 'Child'][i % 3],
      gender: i % 2 === 0 ? 'Male' : 'Female',
      policyType: category,
      category,
      issueDate: issue.toISOString().slice(0, 10),
      commencementDate: issue.toISOString().slice(0, 10),
      maturityDate: maturity.toISOString().slice(0, 10),
      policyTerm: term,
      premiumPayingTerm: term,
      premiumFrequency: freq,
      premiumAmount: premium,
      gst: Math.round(premium * 0.18),
      lateFee: 0,
      gracePeriodDays: category.includes('Health') ? 7 : category.includes('Vehicle') ? 0 : 15,
      sumAssured,
      bonusType: 'Simple Reversionary Bonus',
      bonusRate: 4.5,
      currentFundValue: category === 'ULIP' ? Math.round(sumAssured * 0.6) : 0,
      maturityOutcome: 'Not Yet Matured',
      discontinuationType: 'None',
      status: statusPool[i % statusPool.length],
      notes: '',
      createdAt: new Date().toISOString()
    });
  }
  await Storage.bulkPut('policies', policies);
  return policies.length;
}

// Wipes every data store (policies, payments, companies, claims, bonuses,
// payouts, recycle bin). Appearance/currency/date-format preferences in
// Settings are left untouched since those aren't "data" to wipe.
async function wipeAllData() {
  const dataStores = ['policies', 'payments', 'companies', 'claims', 'bonuses', 'payoutPlans', 'payoutReceipts', 'notifications', 'recycleBin'];
  for (const s of dataStores) await Storage.clear(s);
}

IPM.Storage = Storage;
IPM.LocalStore = LocalStore;
IPM.softDelete = softDelete;
IPM.restoreFromBin = restoreFromBin;
IPM.getSettings = getSettings;
IPM.saveSettings = saveSettings;
IPM.seedSampleData = seedSampleData;
IPM.wipeAllData = wipeAllData;

})(window.IPM = window.IPM || {});
