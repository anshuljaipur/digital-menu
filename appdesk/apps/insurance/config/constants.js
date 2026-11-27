// config/constants.js
// Central configuration for Insurance Portfolio Manager Pro.
// Plain script (no ES modules) so the app runs by double-clicking any
// HTML file directly — no local server required.

(function (IPM) {

IPM.APP_NAME = 'Insurance Portfolio Manager Pro';
IPM.DB_NAME = 'ipm_pro_db';
IPM.DB_VERSION = 3;

IPM.MATURITY_OUTCOMES = ['Not Yet Matured', 'Continued / Renewed', 'Paid Out at Maturity', 'Converted to Annuity', 'Lapsed Before Maturity'];

IPM.DISCONTINUATION_TYPES = ['None', 'Lapsed - No Value', 'Lapsed - Reinvested Elsewhere', 'Made Paid-up', 'Surrendered', 'Moved to Fixed Return Instrument'];

IPM.PAYOUT_TYPES = ['Survival Benefit', 'Maturity Payout', 'Bonus Payout', 'Partial Withdrawal', 'Loan Disbursement'];

IPM.PAYOUT_PLAN_TYPES = ['Recurring', 'OneTime'];
IPM.PAYOUT_END_CONDITIONS = ['Year', 'Maturity', 'Ongoing'];

IPM.POLICY_CATEGORIES = [
  'Life Insurance', 'Term Insurance', 'Health Insurance', 'Family Floater',
  'Critical Illness', 'Accident Insurance', 'Child Plan', 'Pension Plan',
  'Retirement Plan', 'ULIP', 'Endowment Plan', 'Money Back Plan',
  'Vehicle Insurance', 'Travel Insurance', 'Home Insurance', 'Fire Insurance',
  'Marine Insurance', 'Group Insurance', 'Corporate Insurance', 'Personal Insurance'
];

IPM.PREMIUM_FREQUENCIES = ['Monthly', 'Quarterly', 'Half Yearly', 'Yearly', 'Single Premium'];

IPM.FREQUENCY_MONTHS = {
  'Monthly': 1, 'Quarterly': 3, 'Half Yearly': 6, 'Yearly': 12, 'Single Premium': 0
};

IPM.POLICY_STATUSES = ['Active', 'Paid', 'Grace', 'Lapsed', 'Discontinued', 'Surrendered', 'Matured', 'Claimed', 'Cancelled'];

IPM.PAYMENT_STATUSES = ['Paid', 'Pending', 'Late', 'Grace', 'Missed', 'Overdue', 'Future'];

IPM.PAYMENT_MODES = ['Cheque', 'UPI', 'Bank Transfer', 'Cash', 'Card', 'Auto Debit'];

IPM.BONUS_TYPES = ['Simple Reversionary Bonus', 'Compound Bonus', 'Loyalty Addition', 'Guaranteed Addition', 'Final Additional Bonus'];

IPM.CLAIM_TYPES = ['Hospital', 'Death', 'Accident', 'Critical Illness', 'Maturity', 'Partial Withdrawal', 'Loan'];

IPM.DEFAULT_GRACE_DAYS = {
  'LIC': 30, 'SBI Life': 15, 'HDFC Life': 15, 'ICICI Prudential': 15,
  'Health Policy': 7, 'Vehicle Insurance': 0, 'Default': 15
};

IPM.DEFAULT_COMPANIES = [
  { name: 'LIC of India', short: 'LIC' },
  { name: 'SBI Life Insurance', short: 'SBI Life' },
  { name: 'HDFC Life', short: 'HDFC Life' },
  { name: 'ICICI Prudential', short: 'ICICI Pru' },
  { name: 'Max Life Insurance', short: 'Max Life' },
  { name: 'Bajaj Allianz', short: 'Bajaj Allianz' },
  { name: 'Star Health', short: 'Star Health' },
  { name: 'New India Assurance', short: 'NIA' }
];

IPM.STATUS_COLORS = {
  'Active': '#1a9c6b', 'Paid': '#1a9c6b', 'Grace': '#e8952c', 'Lapsed': '#d9483f',
  'Discontinued': '#8a8f9c', 'Surrendered': '#8a8f9c', 'Matured': '#2f6fed',
  'Claimed': '#7b5fe0', 'Cancelled': '#4a4f5c',
  'Pending': '#e8952c', 'Late': '#e8952c', 'Missed': '#d9483f', 'Overdue': '#d9483f', 'Future': '#6b7280'
};

IPM.THEMES = {
  corporateBlue: { primary: '#1e4fd6', primaryDark: '#13337f', accent: '#2f6fed' },
  professionalGreen: { primary: '#0f7a52', primaryDark: '#0a5138', accent: '#1a9c6b' },
  insuranceOrange: { primary: '#c1590f', primaryDark: '#8a3f0a', accent: '#e8952c' }
};

})(window.IPM = window.IPM || {});
