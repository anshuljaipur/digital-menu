// assets/js/payment.js
// Premium schedule + live status + payment recording. Plain script — attaches to window.IPM.

(function (IPM) {

async function buildPremiumRows(policyId = null) {
  const policies = await IPM.Storage.getAll('policies');
  const payments = await IPM.Storage.getAll('payments');
  const rows = [];

  const targetPolicies = policyId ? policies.filter((p) => p.id === policyId) : policies;

  for (const policy of targetPolicies) {
    const schedule = IPM.generateSchedule(policy);
    schedule.forEach((inst) => {
      const record = payments.find((pay) => pay.policyId === policy.id && pay.installmentNo === inst.installmentNo);
      const status = IPM.installmentStatus(inst, policy.gracePeriodDays, record);
      const paidAmount = record?.paidAmount || 0;
      const lateFeePaid = record?.lateFeePaid || 0;
      const otherChargesPaid = record?.otherChargesPaid || 0;
      rows.push({
        policyId: policy.id,
        policyName: policy.policyName,
        policyNumber: policy.policyNumber,
        customerName: policy.customerName,
        company: policy.company,
        installmentNo: inst.installmentNo,
        dueDate: inst.dueDate,
        dueAmount: inst.dueAmount,
        paidAmount,
        lateFeePaid,
        otherChargesPaid,
        totalPaid: paidAmount + lateFeePaid + otherChargesPaid,
        paymentDate: record?.paymentDate || null,
        paymentMode: record?.paymentMode || null,
        transactionId: record?.transactionId || null,
        remarks: record?.remarks || '',
        status,
        daysLate: status === 'Overdue' || status === 'Late' ? Math.max(0, IPM.daysBetween(inst.dueDate, record?.paymentDate || new Date().toISOString())) : 0
      });
    });
  }
  return rows.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

async function recordPayment(policyId, installmentNo, payload) {
  const payments = await IPM.Storage.getAll('payments');
  const existing = payments.find((p) => p.policyId === policyId && p.installmentNo === installmentNo);
  const record = existing
    ? { ...existing, ...payload }
    : { id: IPM.uid(), policyId, installmentNo, ...payload };
  return IPM.Storage.put('payments', record);
}

async function deletePayment(policyId, installmentNo) {
  const payments = await IPM.Storage.getAll('payments');
  const existing = payments.find((p) => p.policyId === policyId && p.installmentNo === installmentNo);
  if (existing) await IPM.Storage.remove('payments', existing.id);
}

function nextDueDate(rows) {
  const future = rows.filter((r) => r.status === 'Future' || r.status === 'Pending' || r.status === 'Grace');
  return future.length ? future[0].dueDate : null;
}

IPM.buildPremiumRows = buildPremiumRows;
IPM.recordPayment = recordPayment;
IPM.deletePayment = deletePayment;
IPM.nextDueDate = nextDueDate;

})(window.IPM = window.IPM || {});
