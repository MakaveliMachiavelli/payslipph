/* PayslipPH — app logic. Vanilla JS, no dependencies, no server. */
'use strict';

/* PRO unlock codes. OWNER: change before promoting (see PAYMENTS.md). */
const PRO_CODES = ['PSP-PRO-149-D187-DBDC', 'PSP-PRO-149-DEMO-F287-E339'];
const LS = { draft: 'psp_draft', pro: 'psp_pro', staff: 'psp_staff' };

/* TRAIN monthly withholding tax table (R.A. 10963) */
const TAX_TABLE = [
  { cap: 20832, base: 0, rate: 0, over: 0 },
  { cap: 33332, base: 0, rate: 0.20, over: 20832 },
  { cap: 66666, base: 2500, rate: 0.25, over: 33332 },
  { cap: 166666, base: 10833.33, rate: 0.30, over: 66666 },
  { cap: 666666, base: 40833.33, rate: 0.32, over: 166666 },
  { cap: Infinity, base: 200833.33, rate: 0.35, over: 666666 }
];
const PH_FLOOR = 10000, PH_CAP = 100000; // PhilHealth MSC bounds (stable in law)

let pro = localStorage.getItem(LS.pro) === '1';

const $ = (id) => document.getElementById(id);
const peso = (n) => '₱' + (Math.round(n * 100) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (id) => Number($(id).value) || 0;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function withholding(taxable) {
  const row = TAX_TABLE.find(b => taxable <= b.cap) || TAX_TABLE[TAX_TABLE.length - 1];
  return row.base + (taxable - row.over) * row.rate;
}

function calc(salary, rates, opts = {}) {
  salary = salary || 0;
  const freq = opts.freq || 'monthly';
  const factor = freq === 'semi' ? 0.5 : 1;
  const baseSalary = salary * factor;
  const hourlyRate = salary / (26 * 8);           // 26 working days × 8h
  const otPay = (opts.otHrs || 0) * hourlyRate * 1.25;
  const allowance = opts.allowance || 0;
  const grossEarnings = baseSalary + otPay + allowance;

  // statutory shares computed on the MONTHLY MSC, scaled by pay factor
  const sss = clamp(salary, rates.sssFloor, rates.sssCap) * (rates.sssPct / 100) * factor;
  const ph = clamp(salary, PH_FLOOR, PH_CAP) * (rates.phPct / 100) * factor;
  const pi = Math.min(salary, rates.piCap) * (rates.piPct / 100) * factor;
  const taxable = Math.max(0, salary - sss / factor - ph / factor - pi / factor);
  const tax = withholding(taxable) * factor;
  const lates = opts.lates || 0, vale = opts.vale || 0;
  const ded = sss + ph + pi + tax + lates + vale;
  const net = grossEarnings - ded;

  // employer cost (ER shares + ECC)
  const erSss = (clamp(salary, rates.sssFloor, rates.sssCap) * 0.095 + 30) * factor;
  const erPh = ph;
  const erPi = Math.min(salary, rates.piCap) * 0.02 * factor;
  const totalErCost = grossEarnings + erSss + erPh + erPi;

  return { salary, freq, factor, baseSalary, otPay, allowance, grossEarnings,
           sss, ph, pi, tax, lates, vale, ded, net, taxable,
           erSss, erPh, erPi, totalErCost };
}

function rates() {
  return {
    sssPct: num('rSss'), phPct: num('rPh'), piPct: num('rPi'), piCap: num('rPiCap'),
    sssFloor: num('rSssFloor'), sssCap: num('rSssCap')
  };
}

function render() {
  const salary = num('eSalary');
  const months = clamp(num('eMonths'), 0, 12);
  const opts = { freq: $('payFreq') ? $('payFreq').value : 'monthly',
    otHrs: num('eOtHrs'), allowance: num('eAllowance'), lates: num('eLate'), vale: num('eVale') };
  const c = calc(salary, rates(), opts);
  const th13mo = salary / 12;
  const th13yr = salary * months / 12;

  $('oGross').textContent = peso(c.grossEarnings);
  const erEl = $('oErCost');
  if (erEl) erEl.textContent = peso(c.totalErCost);
  $('oDed').textContent = peso(c.ded);
  $('oNet').textContent = peso(c.net);
  $('o13').textContent = peso(th13mo);
  $('o13Year').textContent = `13th month for ${months} month(s) worked: ${peso(th13yr)} · statutory bases: SSS ${peso(c.sss)}, PhilHealth ${peso(c.ph)}, Pag-IBIG ${peso(c.pi)}, taxable ${peso(c.taxable)}`;

  $('p_co').textContent = $('eCo').value || 'Your Company Name';
  $('p_period').textContent = 'Period: ' + ($('ePeriod').value || '—');
  $('p_date').textContent = 'Date: ' + new Date().toISOString().slice(0, 10);
  $('p_name').textContent = $('eName').value || '—';
  $('p_pos').textContent = $('ePos').value || '—';
  $('p_basic').textContent = peso(c.baseSalary);
  const otEl = $('p_ot');
  if (otEl) { otEl.parentElement.style.display = c.otPay > 0 ? '' : 'none'; otEl.textContent = peso(c.otPay); }
  const alEl = $('p_allow');
  if (alEl) { alEl.parentElement.style.display = c.allowance > 0 ? '' : 'none'; alEl.textContent = peso(c.allowance); }
  const lateEl = $('p_late'), valeEl = $('p_vale');
  if (lateEl) { lateEl.parentElement.style.display = c.lates > 0 ? '' : 'none'; lateEl.textContent = peso(c.lates); }
  if (valeEl) { valeEl.parentElement.style.display = c.vale > 0 ? '' : 'none'; valeEl.textContent = peso(c.vale); }
  $('p_13').textContent = peso(th13mo);
  $('p_sss').textContent = peso(c.sss);
  $('p_ph').textContent = peso(c.ph);
  $('p_pi').textContent = peso(c.pi);
  $('p_tax').textContent = peso(c.tax);
  $('p_gross').textContent = peso(c.grossEarnings + th13mo * c.factor);
  $('p_ded').textContent = peso(c.ded);
  $('p_net').textContent = peso(c.net + th13mo * c.factor);
  const erFoot = $('p_er');
  if (erFoot) erFoot.textContent = 'Employer total cost this period (incl. ER shares + ECC): ' + peso(c.totalErCost);

  saveDraft();
}

function saveDraft() {
  try {
    localStorage.setItem(LS.draft, JSON.stringify({
      f: ['eName', 'ePos', 'ePeriod', 'eCo', 'eSalary', 'eMonths'].map(id => $(id).value),
      r: ['rSss', 'rPh', 'rPi', 'rPiCap', 'rSssFloor', 'rSssCap'].map(id => $(id).value)
    }));
  } catch (e) {}
}
function loadDraft() {
  try {
    const d = JSON.parse(localStorage.getItem(LS.draft) || 'null');
    if (!d) return;
    ['eName', 'ePos', 'ePeriod', 'eCo', 'eSalary', 'eMonths'].forEach((id, i) => $(id).value = d.f[i] ?? $(id).value);
    ['rSss', 'rPh', 'rPi', 'rPiCap', 'rSssFloor', 'rSssCap'].forEach((id, i) => $(id).value = d.r[i] ?? $(id).value);
  } catch (e) {}
}

function applyPro() {
  $('proBadge').classList.toggle('hidden', !pro);
  $('saveEmpBtn').classList.toggle('hidden', !pro);
  $('batchBtn').classList.toggle('hidden', !pro);
}

/* staff (PRO) */
function getStaff() { try { return JSON.parse(localStorage.getItem(LS.staff) || '[]'); } catch (e) { return []; } }
function renderStaff() {
  const list = getStaff();
  $('batchBody').innerHTML = list.length ? list.map((s, i) => {
    const c = calc(s.salary, rates());
    return `<tr><td>${s.name}</td><td>${s.pos || ''}</td><td class="r">${peso(s.salary)}</td><td class="r">${peso(c.net)}</td>` +
      `<td><button class="x-btn" data-si="${i}">✕</button></td></tr>`;
  }).join('') : '<tr><td colspan="5" style="color:#667085">No employees saved yet.</td></tr>';
}
function batchPrint() {
  const staff = getStaff();
  if (!staff.length) { alert('Save at least one employee first.'); return; }
  const box = $('batchDocs');
  box.innerHTML = '';
  staff.forEach(s => {
    const clone = $('doc').cloneNode(true);
    const c = calc(s.salary, rates());
    clone.querySelector('#p_name').textContent = s.name;
    clone.querySelector('#p_pos').textContent = s.pos || '';
    clone.querySelector('#p_basic').textContent = peso(c.salary);
    clone.querySelector('#p_13').textContent = peso(c.salary / 12);
    clone.querySelector('#p_sss').textContent = peso(c.sss);
    clone.querySelector('#p_ph').textContent = peso(c.ph);
    clone.querySelector('#p_pi').textContent = peso(c.pi);
    clone.querySelector('#p_tax').textContent = peso(c.tax);
    clone.querySelector('#p_gross').textContent = peso(c.salary + c.salary / 12);
    clone.querySelector('#p_ded').textContent = peso(c.ded);
    clone.querySelector('#p_net').textContent = peso(c.net + c.salary / 12);
    box.appendChild(clone);
  });
  document.body.classList.add('batch-printing');
  window.print();
  setTimeout(() => document.body.classList.remove('batch-printing'), 500);
}
function payrollCsv() {
  const staff = getStaff();
  const rows = [['Name', 'Position', 'Basic', 'SSS', 'PhilHealth', 'Pag-IBIG', 'Withholding tax', 'Total deductions', 'Net pay']]
    .concat(staff.map(s => {
      const c = calc(s.salary, rates());
      return [s.name, s.pos, s.salary.toFixed(2), c.sss.toFixed(2), c.ph.toFixed(2), c.pi.toFixed(2),
        c.tax.toFixed(2), c.ded.toFixed(2), c.net.toFixed(2)];
    }));
  const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  a.download = 'payslipph-payroll.csv';
  a.click();
}

document.addEventListener('DOMContentLoaded', () => {
  loadDraft();
  applyPro();

  ['eName', 'ePos', 'ePeriod', 'eCo', 'eSalary', 'eMonths', 'rSss', 'rPh', 'rPi', 'rPiCap', 'rSssFloor', 'rSssCap', 'payFreq', 'eOtHrs', 'eAllowance', 'eLate', 'eVale']
    .forEach(id => $(id).addEventListener('input', render));

  $('printBtn').addEventListener('click', () => window.print());

  // pro modal
  const openPay = () => { $('payModal').classList.remove('hidden'); $('codeMsg').textContent = ''; };
  $('proBtn').addEventListener('click', openPay);
  $('proBtn2').addEventListener('click', openPay);
  $('payClose').addEventListener('click', () => $('payModal').classList.add('hidden'));
  $('codeBtn').addEventListener('click', () => {
    const code = $('codeInput').value.trim().toUpperCase();
    if (PRO_CODES.map(c => c.toUpperCase()).includes(code)) {
      pro = true; localStorage.setItem(LS.pro, '1'); applyPro();
      $('codeMsg').textContent = '✓ PRO unlocked — staff list, batch payslips and CSV export active.';
      $('codeMsg').className = 'code-msg ok';
      setTimeout(() => $('payModal').classList.add('hidden'), 1500);
    } else {
      $('codeMsg').textContent = 'Invalid code — check your GCash confirmation.';
      $('codeMsg').className = 'code-msg bad';
    }
  });
  $('codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('codeBtn').click(); });

  // staff
  $('saveEmpBtn').addEventListener('click', () => {
    const name = $('eName').value.trim();
    if (!name) { alert('Enter the employee name first.'); return; }
    const staff = getStaff().filter(s => s.name !== name);
    staff.push({ name, pos: $('ePos').value.trim(), salary: num('eSalary') });
    localStorage.setItem(LS.staff, JSON.stringify(staff));
    alert('Saved: ' + name);
  });
  $('batchBtn').addEventListener('click', () => { renderStaff(); $('batchModal').classList.remove('hidden'); });
  $('batchClose').addEventListener('click', () => $('batchModal').classList.add('hidden'));
  $('batchBody').addEventListener('click', e => {
    const btn = e.target.closest('button[data-si]'); if (!btn) return;
    const staff = getStaff(); staff.splice(+btn.dataset.si, 1);
    localStorage.setItem(LS.staff, JSON.stringify(staff)); renderStaff();
  });
  $('batchPrint').addEventListener('click', batchPrint);
  $('batchCsv').addEventListener('click', payrollCsv);

  document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); }));

  render();
});
