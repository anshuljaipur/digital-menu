// assets/js/notification.js
// Toast notifications + confirm dialog. Plain script — attaches to window.IPM.

(function (IPM) {

let container = null;

function ensureContainer() {
  if (container) return container;
  container = document.createElement('div');
  container.className = 'toast-stack';
  document.body.appendChild(container);
  return container;
}

function toast(message, type = 'info', timeout = 3200) {
  const stack = ensureContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-dot"></span><span>${message}</span>`;
  stack.appendChild(el);
  requestAnimationFrame(() => el.classList.add('toast-in'));
  setTimeout(() => {
    el.classList.remove('toast-in');
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 250);
  }, timeout);
}

function confirmDialog(message, okLabel = 'Delete', danger = true) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-box">
        <p>${message}</p>
        <div class="confirm-actions">
          <button class="btn btn-ghost" data-action="cancel">Cancel</button>
          <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="ok">${okLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    overlay.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
        resolve(action === 'ok');
      } else if (e.target === overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
        resolve(false);
      }
    });
  });
}

IPM.toast = toast;
IPM.confirmDialog = confirmDialog;

})(window.IPM = window.IPM || {});
