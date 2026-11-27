// assets/js/payouts.js
// Tracks money paid OUT to you by a policy — survival benefits, staged
// maturity payouts, bonus payouts — separate from premiums paid IN.
//
// A "payout plan" describes a rule ("₹90,000 every policy anniversary from
// year 7 to year 2031", "₹350,000 every year from 2039 until maturity", or
// a one-time amount on a specific date). This file expands each plan into
// individual dated occurrences (like the premium schedule does for
// installments), matches them against recorded receipts, and reports a
// live status for each.

(function (IPM) {

// ---------- Plan CRUD ----------
async function listPayoutPlans(policyId) {
  const all = await IPM.Storage.getAll('payoutPlans');
  return all.filter((p) => p.policyId === policyId).sort((a, b) => (a.startYear || 0) - (b.startYear || 0));
}

async function savePayoutPlan(record) {
  if (!record.id) record.id = IPM.uid();
  return IPM.Storage.put('payoutPlans', record);
}

async function deletePayoutPlan(id) {
  await IPM.Storage.remove('payoutPlans', id);
  // Also drop any receipts recorded against this plan so the schedule doesn't leave orphaned rows.
  const receipts = await IPM.Storage.getAll('payoutReceipts');
  for (const r of receipts.filter((r) => r.planId === id)) await IPM.Storage.remove('payoutReceipts', r.id);
}

// ---------- Occurrence generation ----------
// Expands one plan into its individual dated occurrences.
function expandPlan(plan, policy) {
  const occurrences = [];

  if (plan.type === 'OneTime') {
    if (plan.oneTimeDate) {
      occurrences.push({ occurrenceKey: `${plan.id}-1`, planId: plan.id, label: plan.label, date: plan.oneTimeDate, amount: Number(plan.amount) || 0 });
    }
    return occurrences;
  }

  // Recurring: one occurrence per policy year, on the commencement-date anniversary.
  if (!policy.commencementDate || !plan.startYear) return occurrences;
  const startYear = Number(plan.startYear);
  let endYear;
  if (plan.endCondition === 'Year' && plan.endYear) {
    endYear = Number(plan.endYear);
  } else if (plan.endCondition === 'Maturity' && policy.maturityDate) {
    const commence = new Date(policy.commencementDate);
    const maturity = new Date(policy.maturityDate);
    endYear = maturity.getFullYear() - commence.getFullYear() + 1;
  } else {
    // "Ongoing" with no known end — cap at 40 years out so the schedule stays finite.
    endYear = startYear + 40;
  }
  if (endYear < startYear) endYear = startYear;

  for (let year = startYear; year <= endYear; year++) {
    occurrences.push({
      occurrenceKey: `${plan.id}-${year}`,
      planId: plan.id,
      label: plan.label,
      policyYear: year,
      date: IPM.addYears(policy.commencementDate, year - 1),
      amount: Number(plan.amount) || 0
    });
  }
  return occurrences;
}

// Merges every plan's occurrences for a policy with any recorded receipts,
// returning rows with a live status: Received / Due / Upcoming.
async function buildPayoutRows(policyId) {
  const policy = await IPM.Storage.get('policies', policyId);
  if (!policy) return [];
  const plans = await listPayoutPlans(policyId);
  const receipts = await IPM.Storage.getAll('payoutReceipts');
  const today = new Date().toISOString().slice(0, 10);
  const rows = [];

  plans.forEach((plan) => {
    expandPlan(plan, policy).forEach((occ) => {
      const receipt = receipts.find((r) => r.occurrenceKey === occ.occurrenceKey);
      let status;
      if (receipt && receipt.receivedAmount > 0) status = 'Received';
      else if (occ.date > today) status = 'Upcoming';
      else status = 'Due';
      rows.push({
        occurrenceKey: occ.occurrenceKey,
        planId: plan.id,
        label: occ.label,
        policyYear: occ.policyYear || null,
        date: occ.date,
        expectedAmount: occ.amount,
        receivedAmount: receipt?.receivedAmount || 0,
        receivedDate: receipt?.receivedDate || null,
        mode: receipt?.mode || null,
        referenceNumber: receipt?.referenceNumber || null,
        remarks: receipt?.remarks || '',
        status
      });
    });
  });

  return rows.sort((a, b) => new Date(a.date) - new Date(b.date));
}

async function recordReceipt(policyId, occurrenceKey, payload) {
  const all = await IPM.Storage.getAll('payoutReceipts');
  const existing = all.find((r) => r.occurrenceKey === occurrenceKey);
  const record = existing
    ? { ...existing, ...payload }
    : { id: IPM.uid(), policyId, occurrenceKey, ...payload };
  return IPM.Storage.put('payoutReceipts', record);
}

async function deleteReceipt(occurrenceKey) {
  const all = await IPM.Storage.getAll('payoutReceipts');
  const existing = all.find((r) => r.occurrenceKey === occurrenceKey);
  if (existing) await IPM.Storage.remove('payoutReceipts', existing.id);
}

// Compounds a principal amount annually from a start date to today at the
// given percentage rate — used to show the running value of a policy that
// was moved to a fixed-return instrument after premiums stopped.
function projectedFixedValue(principal, ratePercent, startDateISO) {
  if (!startDateISO || !ratePercent || !principal) return null;
  const years = (Date.now() - new Date(startDateISO).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (years <= 0) return Number(principal);
  return Number(principal) * Math.pow(1 + (Number(ratePercent) / 100), years);
}

IPM.listPayoutPlans = listPayoutPlans;
IPM.savePayoutPlan = savePayoutPlan;
IPM.deletePayoutPlan = deletePayoutPlan;
IPM.buildPayoutRows = buildPayoutRows;
IPM.recordReceipt = recordReceipt;
IPM.deleteReceipt = deleteReceipt;
IPM.projectedFixedValue = projectedFixedValue;

})(window.IPM = window.IPM || {});
