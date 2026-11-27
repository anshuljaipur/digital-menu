// assets/js/firebase-store.js
// Cloud storage backend (Firebase Auth + Firestore). Exposes IPM.cloud with
// the same getAll/put/remove/clear/bulkPut shape as the local store, so the
// rest of the app doesn't care where data lives. Inactive unless
// config/firebase-config.js is filled in.
//
// Data layout: users/{uid}/{store}/{recordId}  (one doc per record)

(function (IPM) {

const cfg = window.IPM_FIREBASE_CONFIG;
const configured = !!(cfg && cfg.apiKey && cfg.projectId);

const WRITE_WAIT_MS = 2500;   // don't hang the UI waiting for server ack while offline
const BATCH_SIZE = 400;       // Firestore batch limit is 500

let db = null, auth = null, currentUser = null, readyPromise = null;
const cache = {};    // store -> Map(id -> record)
const loading = {};  // store -> Promise

// ---------- UI helpers (login screen, blocking errors, error banner) ----------
function whenBody(fn) {
  if (document.body) fn(); else document.addEventListener('DOMContentLoaded', fn);
}

function showBlocking(title, message) {
  whenBody(() => {
    let el = document.getElementById('authOverlay');
    if (el) el.remove();
    el = document.createElement('div');
    el.id = 'authOverlay';
    el.className = 'auth-overlay';
    el.innerHTML = `<div class="auth-card"><div class="brand-mark">IP</div><h2>${title}</h2><p>${message}</p><button class="btn btn-primary" id="authRetry">Retry</button></div>`;
    document.body.appendChild(el);
    document.getElementById('authRetry').addEventListener('click', () => location.reload());
  });
}

function showLogin() {
  whenBody(() => {
    if (document.getElementById('authOverlay')) return;
    const el = document.createElement('div');
    el.id = 'authOverlay';
    el.className = 'auth-overlay';
    el.innerHTML = `
      <form class="auth-card" id="authForm" novalidate>
        <div class="brand-mark">IP</div>
        <h2>Sign in</h2>
        <p>Your portfolio is private to your account.</p>
        <input type="email" id="authEmail" placeholder="Email" autocomplete="username">
        <input type="password" id="authPass" placeholder="Password" autocomplete="current-password">
        <div id="authError" class="auth-error"></div>
        <button type="submit" class="btn btn-primary" id="authSubmit">Sign in</button>
      </form>`;
    document.body.appendChild(el);
    const form = document.getElementById('authForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = document.getElementById('authError');
      const btn = document.getElementById('authSubmit');
      const email = document.getElementById('authEmail').value.trim();
      const pass = document.getElementById('authPass').value;
      if (!email || !pass) { err.textContent = 'Enter your email and password.'; return; }
      err.textContent = ''; btn.disabled = true; btn.textContent = 'Signing in…';
      try {
        await auth.signInWithEmailAndPassword(email, pass);
      } catch (ex) {
        const bad = ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'];
        err.textContent = bad.includes(ex.code) ? 'Incorrect email or password.'
          : ex.code === 'auth/too-many-requests' ? 'Too many attempts — wait a few minutes and try again.'
          : ex.code === 'auth/network-request-failed' ? 'No connection — sign-in needs internet the first time.'
          : (ex.message || 'Sign-in failed.');
        btn.disabled = false; btn.textContent = 'Sign in';
      }
    });
  });
}

function hideLogin() {
  const el = document.getElementById('authOverlay');
  if (el) el.remove();
}

function reportCloudError(err) {
  console.error('Cloud storage error:', err);
  const msg = err && err.code === 'permission-denied'
    ? 'Cloud access denied — check that firestore.rules is published and you are signed in to the right account.'
    : `Cloud sync problem: ${(err && err.message) || err}`;
  whenBody(() => {
    let b = document.getElementById('cloudErrorBanner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'cloudErrorBanner';
      b.className = 'cloud-error-banner';
      document.body.appendChild(b);
    }
    b.textContent = msg;
  });
}

// ---------- Readiness: SDK present → auth state known → signed in ----------
function ready() {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise((resolve) => {
    if (typeof firebase === 'undefined') {
      showBlocking('Can’t reach Firebase', 'The Firebase libraries didn’t load. Check your internet connection — after one successful load the app also works offline.');
      return;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(cfg);
      auth = firebase.auth();
      db = firebase.firestore();
      db.enablePersistence({ synchronizeTabs: true }).catch(() => { /* unsupported browser / private mode: runs online-only */ });
    } catch (e) {
      showBlocking('Firebase setup problem', (e && e.message) || 'Could not initialise Firebase — check config/firebase-config.js.');
      return;
    }
    auth.onAuthStateChanged((user) => {
      if (user) { currentUser = user; hideLogin(); resolve(user); }
      else { currentUser = null; showLogin(); }
    });
  });
  return readyPromise;
}

function col(store) {
  return db.collection('users').doc(currentUser.uid).collection(store);
}

// Waits for the server to acknowledge a write, but not forever: offline,
// Firestore keeps the write queued locally and syncs later, so the UI
// shouldn't hang. Errors (e.g. permission-denied) still surface.
function guarded(promise) {
  promise.catch(reportCloudError);
  return Promise.race([promise, new Promise((r) => setTimeout(r, WRITE_WAIT_MS))]);
}

async function load(store) {
  if (cache[store]) return cache[store];
  if (!loading[store]) {
    loading[store] = col(store).get().then((snap) => {
      const m = new Map();
      snap.forEach((d) => m.set(d.id, d.data()));
      cache[store] = m;
      return m;
    }).catch((err) => { delete loading[store]; reportCloudError(err); throw err; });
  }
  return loading[store];
}

function clean(record) {
  return JSON.parse(JSON.stringify(record)); // Firestore rejects undefined values
}

const cloud = {
  enabled: configured,
  user: () => currentUser,
  ready,

  async getAll(store) {
    await ready();
    return Array.from((await load(store)).values());
  },

  async put(store, record) {
    await ready();
    const m = await load(store);
    const data = clean(record);
    m.set(data.id, data);
    await guarded(col(store).doc(data.id).set(data));
    return record;
  },

  async bulkPut(store, records) {
    await ready();
    const m = await load(store);
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = db.batch();
      records.slice(i, i + BATCH_SIZE).forEach((r) => {
        const data = clean(r);
        m.set(data.id, data);
        batch.set(col(store).doc(data.id), data);
      });
      await guarded(batch.commit());
    }
    return records;
  },

  async remove(store, id) {
    await ready();
    const m = await load(store);
    m.delete(id);
    await guarded(col(store).doc(id).delete());
    return true;
  },

  async clear(store) {
    await ready();
    const m = await load(store);
    const ids = Array.from(m.keys());
    m.clear();
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = db.batch();
      ids.slice(i, i + BATCH_SIZE).forEach((id) => batch.delete(col(store).doc(id)));
      await guarded(batch.commit());
    }
    return true;
  },

  async signOut() {
    await ready();
    await auth.signOut();
    location.reload();
  }
};

IPM.cloud = cloud;

})(window.IPM = window.IPM || {});
