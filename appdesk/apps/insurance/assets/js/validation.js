// assets/js/validation.js
// Form validation helpers. Plain script — attaches to window.IPM.

(function (IPM) {

function required(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return `${label} is required.`;
  }
  return null;
}

function isValidDateOrder(startISO, endISO, startLabel, endLabel) {
  if (!startISO || !endISO) return null;
  if (new Date(endISO) <= new Date(startISO)) {
    return `${endLabel} must be after ${startLabel}.`;
  }
  return null;
}

function isPositiveNumber(value, label) {
  if (value === '' || value === null || value === undefined) return null;
  if (isNaN(Number(value)) || Number(value) < 0) return `${label} must be a positive number.`;
  return null;
}

function isValidPAN(pan) {
  if (!pan) return null;
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase()) ? null : 'PAN format looks invalid (e.g. ABCDE1234F).';
}

function isValidAadhaar(aadhaar) {
  if (!aadhaar) return null;
  return /^\d{12}$/.test(aadhaar.replace(/\s/g, '')) ? null : 'Aadhaar must be 12 digits.';
}

function isValidMobile(mobile) {
  if (!mobile) return null;
  return /^\d{10}$/.test(mobile.replace(/\D/g, '')) ? null : 'Mobile number must be 10 digits.';
}

function runChecks(checks) {
  for (const [fn, ...args] of checks) {
    const err = fn(...args);
    if (err) return err;
  }
  return null;
}

IPM.required = required;
IPM.isValidDateOrder = isValidDateOrder;
IPM.isPositiveNumber = isPositiveNumber;
IPM.isValidPAN = isValidPAN;
IPM.isValidAadhaar = isValidAadhaar;
IPM.isValidMobile = isValidMobile;
IPM.runChecks = runChecks;

})(window.IPM = window.IPM || {});
