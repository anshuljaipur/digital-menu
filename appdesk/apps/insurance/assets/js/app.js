// assets/js/app.js
// Boots on every page: applies theme, wires the sidebar, sets active nav.
// Plain script — attaches to window.IPM and self-initializes on DOMContentLoaded.

(function (IPM) {

async function initShell() {
  const settings = await IPM.getSettings();
  applyTheme(settings.theme, settings.darkMode, settings.customColor);
  highlightActiveLink();
  buildBottomNav();
  registerServiceWorker();
  wireSidebarToggle();
  wireThemeControls(settings);
  await renderAlertBadge();
  wireQuickSearch();
  return settings;
}

function applyTheme(themeKey, darkMode, customColor) {
  const theme = IPM.THEMES[themeKey] || IPM.THEMES.corporateBlue;
  const root = document.documentElement;
  const primary = customColor || theme.primary;
  root.style.setProperty('--color-primary', primary);
  root.style.setProperty('--color-primary-dark', customColor ? shade(customColor, -20) : theme.primaryDark);
  root.style.setProperty('--color-accent', customColor ? shade(customColor, 15) : theme.accent);
  root.dataset.theme = themeKey;
  root.dataset.mode = darkMode ? 'dark' : 'light';
}

// Lightens (positive percent) or darkens (negative percent) a hex color.
function shade(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${(0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1)}`;
}

function highlightActiveLink() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  IPM.qsa('.nav-link').forEach((a) => {
    const href = a.getAttribute('href');
    if (href === page) a.classList.add('active');
  });
}

// Mobile bottom tab bar (hidden on desktop by CSS).
function buildBottomNav() {
  if (IPM.qs('.bottom-nav')) return;
  const page = window.location.pathname.split('/').pop() || 'dashboard.html';
  const items = [
    ['dashboard.html', '🏠', 'Home'],
    ['policies.html', '📄', 'Policies'],
    ['payment-tracker.html', '💳', 'Premiums'],
    ['calendar.html', '📅', 'Calendar']
  ];
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.setAttribute('aria-label', 'Main');
  nav.innerHTML = items.map(([href, icon, label]) =>
    `<a href="${href}" class="${href === page ? 'active' : ''}"><span class="bn-icon">${icon}</span>${label}</a>`
  ).join('') + `<button type="button" id="bnMore"><span class="bn-icon">☰</span>More</button>`;
  document.body.appendChild(nav);
  IPM.qs('#bnMore').addEventListener('click', () => IPM.qs('#menuToggle')?.click());
}

// Offline support + "install app". Only works over http(s), e.g. GitHub Pages.
function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('Service worker not registered', e));
  }
}

function wireSidebarToggle() {
  const btn = IPM.qs('#menuToggle');
  const sidebar = IPM.qs('.sidebar');
  const scrim = IPM.qs('.scrim');
  if (!btn || !sidebar) return;
  const open = () => { sidebar.classList.add('open'); scrim?.classList.add('show'); };
  const close = () => { sidebar.classList.remove('open'); scrim?.classList.remove('show'); };
  btn.addEventListener('click', () => sidebar.classList.contains('open') ? close() : open());
  scrim?.addEventListener('click', close);
  IPM.qsa('.nav-link').forEach((a) => a.addEventListener('click', close));
}

function wireThemeControls(settings) {
  const darkToggle = IPM.qs('#darkModeToggle');
  if (darkToggle) {
    darkToggle.checked = !!settings.darkMode;
    darkToggle.addEventListener('change', async () => {
      const s = await IPM.saveSettings({ darkMode: darkToggle.checked });
      applyTheme(s.theme, s.darkMode, s.customColor);
    });
  }
  IPM.qsa('[data-theme-pick]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const s = await IPM.saveSettings({ theme: btn.dataset.themePick, customColor: null });
      applyTheme(s.theme, s.darkMode, s.customColor);
    });
  });
}

async function renderAlertBadge() {
  const badge = IPM.qs('#alertBadge');
  if (!badge) return;
  const policies = await IPM.Storage.getAll('policies');
  const today = new Date();
  let count = 0;
  policies.forEach((p) => {
    if (!p.maturityDate) return;
    const days = Math.round((new Date(p.maturityDate) - today) / 86400000);
    if (days >= 0 && days <= 30) count++;
    if (p.status === 'Grace' || p.status === 'Lapsed') count++;
  });
  if (count > 0) { badge.textContent = count; badge.hidden = false; } else { badge.hidden = true; }
}

function wireQuickSearch() {
  const input = IPM.qs('#globalSearch');
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      input?.focus();
    }
  });
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      window.location.href = `policies.html?q=${encodeURIComponent(input.value.trim())}`;
    }
  });
}

IPM.initShell = initShell;
IPM.applyTheme = applyTheme;
IPM.shadeColor = shade;

document.addEventListener('DOMContentLoaded', initShell);

})(window.IPM = window.IPM || {});
