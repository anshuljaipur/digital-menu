// assets/js/export.js
// CSV / JSON export helpers. Plain script — attaches to window.IPM.

(function (IPM) {

function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [headers.join(',')];
  rows.forEach((r) => lines.push(headers.map((h) => esc(r[h])).join(',')));
  return lines.join('\n');
}

function exportCSV(rows, filename) {
  download(filename, toCSV(rows), 'text/csv');
}

function exportJSON(data, filename) {
  download(filename, JSON.stringify(data, null, 2), 'application/json');
}

async function exportFullBackup() {
  const stores = ['policies', 'payments', 'companies', 'claims', 'bonuses', 'payoutPlans', 'payoutReceipts', 'settings'];
  const backup = { exportedAt: new Date().toISOString(), app: 'Insurance Portfolio Manager Pro' };
  for (const s of stores) backup[s] = await IPM.Storage.getAll(s);
  download(`ipm-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), 'application/json');
}

function printablePolicy(policy) {
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>${policy.policyNumber}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;color:#1a1d29}
    h1{font-size:20px;border-bottom:2px solid #1e4fd6;padding-bottom:8px}
    table{width:100%;border-collapse:collapse;margin-top:16px}
    td{padding:6px 8px;border-bottom:1px solid #eee;font-size:13px}
    td:first-child{color:#666;width:40%}</style></head><body>
    <h1>${policy.policyName} — ${policy.policyNumber}</h1>
    <table>${Object.entries(policy).map(([k, v]) => `<tr><td>${k}</td><td>${v ?? ''}</td></tr>`).join('')}</table>
    </body></html>`);
  w.document.close();
  w.print();
}

function receiptWindow(title, headerLine, rows, footNote, currency) {
  const w = window.open('', '_blank');
  const fmt = (v) => `${currency}${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  w.document.write(`
    <html><head><title>${title}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:36px;color:#1a1d29;max-width:560px;margin:0 auto}
      .brand{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#888;margin-bottom:4px}
      h1{font-size:20px;border-bottom:2px solid #1e4fd6;padding-bottom:10px;margin:0 0 4px}
      .sub{font-size:12.5px;color:#666;margin-bottom:18px}
      table{width:100%;border-collapse:collapse;margin-top:8px}
      td{padding:8px 4px;border-bottom:1px solid #eee;font-size:13.5px}
      td:first-child{color:#666;width:45%}
      td:last-child{text-align:right;font-weight:600}
      .total-row td{border-top:2px solid #1a1d29;border-bottom:none;font-weight:700;font-size:15px;padding-top:12px}
      .foot{margin-top:26px;font-size:11.5px;color:#999;border-top:1px solid #eee;padding-top:12px}
      @media print{ .no-print{display:none} }
    </style></head><body>
    <div class="brand">Insurance Portfolio Manager Pro</div>
    <h1>${title}</h1>
    <div class="sub">${headerLine}</div>
    <table>${rows.map(([label, value, isTotal]) => `<tr${isTotal ? ' class="total-row"' : ''}><td>${label}</td><td>${value}</td></tr>`).join('')}</table>
    <div class="foot">${footNote}</div>
    </body></html>`);
  w.document.close();
  w.print();
}

// Prints a receipt for a single recorded premium payment.
function printPaymentReceipt(row, settings) {
  const currency = settings?.currency || '₹';
  const dateFmt = settings?.dateFormat || 'DD-MM-YYYY';
  const rows = [
    ['Premium Amount', `${currency}${Number(row.paidAmount || 0).toLocaleString('en-IN')}`],
    ['Late Fee', `${currency}${Number(row.lateFeePaid || 0).toLocaleString('en-IN')}`],
    ['Other Charges / Tax', `${currency}${Number(row.otherChargesPaid || 0).toLocaleString('en-IN')}`],
    ['Total Paid', `${currency}${Number(row.totalPaid || 0).toLocaleString('en-IN')}`, true],
    ['Payment Date', IPM.fmtDate(row.paymentDate, dateFmt)],
    ['Payment Mode', row.paymentMode || '—'],
    ['Transaction ID', row.transactionId || '—'],
    ['Installment #', row.installmentNo],
    ['Original Due Date', IPM.fmtDate(row.dueDate, dateFmt)]
  ];
  receiptWindow(
    'Premium Payment Receipt',
    `${row.policyName} — ${row.policyNumber} (${row.company})<br>Policyholder: ${row.customerName || '—'}`,
    rows,
    'This receipt was generated from your own records in Insurance Portfolio Manager Pro. It is not an official insurer document.',
    currency
  );
}

// Prints a receipt for a recorded payout / survival benefit.
function printPayoutReceipt(row, policy, settings) {
  const currency = settings?.currency || '₹';
  const dateFmt = settings?.dateFormat || 'DD-MM-YYYY';
  const rows = [
    ['Payout Type', row.label + (row.policyYear ? ` (Policy Year ${row.policyYear})` : '')],
    ['Expected Amount', `${currency}${Number(row.expectedAmount || 0).toLocaleString('en-IN')}`],
    ['Amount Received', `${currency}${Number(row.receivedAmount || 0).toLocaleString('en-IN')}`, true],
    ['Received Date', IPM.fmtDate(row.receivedDate, dateFmt)],
    ['Mode', row.mode || '—'],
    ['Reference / Receipt No.', row.referenceNumber || '—'],
    ['Remarks', row.remarks || '—']
  ];
  receiptWindow(
    'Payout Receipt',
    `${policy.policyName} — ${policy.policyNumber} (${policy.company})<br>Policyholder: ${policy.customerName || '—'}`,
    rows,
    'This receipt was generated from your own records in Insurance Portfolio Manager Pro. It is not an official insurer document.',
    currency
  );
}

IPM.toCSV = toCSV;
IPM.exportCSV = exportCSV;
IPM.exportJSON = exportJSON;
IPM.exportFullBackup = exportFullBackup;
IPM.printablePolicy = printablePolicy;
IPM.printPaymentReceipt = printPaymentReceipt;
IPM.printPayoutReceipt = printPayoutReceipt;

})(window.IPM = window.IPM || {});
