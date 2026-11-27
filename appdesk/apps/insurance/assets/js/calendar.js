// assets/js/calendar.js
// Month grid + event builder. Plain script — attaches to window.IPM.

(function (IPM) {

async function buildMonthEvents(year, month) {
  const rows = await IPM.buildPremiumRows();
  const policies = await IPM.Storage.getAll('policies');
  const events = {};

  const addEvent = (dateISO, evt) => {
    const d = new Date(dateISO);
    if (d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    if (!events[day]) events[day] = [];
    events[day].push(evt);
  };

  rows.forEach((r) => addEvent(r.dueDate, { kind: 'premium', label: `${r.policyNumber} • Premium`, status: r.status }));
  policies.forEach((p) => {
    if (p.maturityDate) addEvent(p.maturityDate, { kind: 'maturity', label: `${p.policyNumber} • Maturity`, status: 'Matured' });
  });

  return events;
}

function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

IPM.buildMonthEvents = buildMonthEvents;
IPM.monthGrid = monthGrid;

})(window.IPM = window.IPM || {});
