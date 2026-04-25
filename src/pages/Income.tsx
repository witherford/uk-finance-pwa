import { useFinanceStore } from '../store/useFinanceStore';
import { computeTax, STUDENT_LOAN } from '../lib/uk-tax';
import { Field, Money, PageHeader, StatCard, FrequencySelect, NumInput } from '../components/common';
import { useMemo, useState } from 'react';
import { Frequency, StudentLoanPlan } from '../types';

export function Income() {
  const profile = useFinanceStore(s => s.state.profile);
  const sideIncomes = useFinanceStore(s => s.state.sideIncomes);
  const setProfile = useFinanceStore(s => s.setProfile);
  const addSideIncome = useFinanceStore(s => s.addSideIncome);
  const updateSideIncome = useFinanceStore(s => s.updateSideIncome);
  const deleteSideIncome = useFinanceStore(s => s.deleteSideIncome);

  const tax = useMemo(() => computeTax(profile, sideIncomes), [profile, sideIncomes]);

  const [siName, setSiName] = useState('');
  const [siAmount, setSiAmount] = useState('');
  const [siFreq, setSiFreq] = useState<Frequency>('monthly');
  const [siTaxable, setSiTaxable] = useState(true);

  return (
    <div>
      <PageHeader title="Income & Tax" subtitle="UK 2025/26 bands. Estimates only — verify against gov.uk." />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 card card-pad space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="First name (used on dashboard)">
              <input className="input" value={profile.firstName} onChange={e => setProfile({ firstName: e.target.value })} />
            </Field>
            <Field label="Region">
              <select className="input" value={profile.region} onChange={e => setProfile({ region: e.target.value as any })}>
                <option value="rUK">England / Wales / NI</option>
                <option value="Scotland">Scotland</option>
              </select>
            </Field>
            <Field label="Employment type">
              <select className="input" value={profile.employmentType} onChange={e => setProfile({ employmentType: e.target.value as any })}>
                <option value="PAYE">PAYE (employed)</option>
                <option value="SE">Self-employed</option>
                <option value="Both">Both</option>
              </select>
            </Field>
            <Field label="Tax code">
              <input className="input" value={profile.taxCode} onChange={e => setProfile({ taxCode: e.target.value.toUpperCase() })} />
            </Field>
            <Field label="Annual salary (gross, £)">
              <NumInput value={profile.salary} onChange={n => setProfile({ salary: n })} />
            </Field>
            <Field label="Pension scheme">
              <select className="input" value={profile.pensionScheme} onChange={e => setProfile({ pensionScheme: e.target.value as any })}>
                <option value="none">None</option>
                <option value="relief-at-source">Relief at source</option>
                <option value="net-pay">Net-pay arrangement</option>
                <option value="salary-sacrifice">Salary sacrifice</option>
              </select>
            </Field>
            <Field label="Your pension contribution (%)">
              <NumInput value={profile.pensionPct} onChange={n => setProfile({ pensionPct: n })} step="0.1" />
            </Field>
            <Field label="Employer contribution (%)">
              <NumInput value={profile.employerPensionPct} onChange={n => setProfile({ employerPensionPct: n })} step="0.1" />
            </Field>
            <Field label="Marriage allowance">
              <select className="input" value={profile.marriageAllowance} onChange={e => setProfile({ marriageAllowance: e.target.value as any })}>
                <option value="none">Not applicable</option>
                <option value="transferring">Transferring £1,260 to spouse</option>
                <option value="receiving">Receiving from spouse</option>
              </select>
            </Field>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="font-semibold mb-2">Student loans</div>
            <div className="grid sm:grid-cols-2 gap-2">
              {(Object.keys(STUDENT_LOAN) as Exclude<StudentLoanPlan, 'none'>[]).map(p => {
                const checked = profile.studentLoanPlans.includes(p);
                return (
                  <label key={p} className="flex items-center gap-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                    <input type="checkbox" checked={checked} onChange={e => {
                      const next = e.target.checked
                        ? [...profile.studentLoanPlans, p]
                        : profile.studentLoanPlans.filter(x => x !== p);
                      setProfile({ studentLoanPlans: next });
                    }} />
                    <span>{STUDENT_LOAN[p].label}</span>
                    <span className="ml-auto text-xs text-slate-500">£{STUDENT_LOAN[p].threshold.toLocaleString()} · {(STUDENT_LOAN[p].rate * 100).toFixed(0)}%</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
            <div className="font-semibold mb-2">Side incomes</div>
            <form className="grid sm:grid-cols-5 gap-2 mb-3" onSubmit={e => {
              e.preventDefault();
              if (!siName || !siAmount) return;
              addSideIncome({ name: siName, amount: parseFloat(siAmount), frequency: siFreq, taxable: siTaxable });
              setSiName(''); setSiAmount('');
            }}>
              <input className="input sm:col-span-2" placeholder="Name (e.g. Etsy)" value={siName} onChange={e => setSiName(e.target.value)} />
              <input className="input" type="text" inputMode="decimal" placeholder="Amount £" value={siAmount} onChange={e => { const v = e.target.value; if (v === '' || /^\d*\.?\d*$/.test(v)) setSiAmount(v); }} />
              <FrequencySelect value={siFreq} onChange={setSiFreq} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={siTaxable} onChange={e => setSiTaxable(e.target.checked)} />
                Taxable
              </label>
              <button className="btn-primary sm:col-span-5">Add side income</button>
            </form>
            {sideIncomes.length === 0 ? (
              <div className="text-sm text-slate-500">No side incomes yet.</div>
            ) : (
              <ul className="space-y-2">
                {sideIncomes.map(si => (
                  <li key={si.id} className="grid sm:grid-cols-5 gap-2 items-center">
                    <input className="input sm:col-span-2" value={si.name} onChange={e => updateSideIncome(si.id, { name: e.target.value })} />
                    <NumInput value={si.amount} onChange={n => updateSideIncome(si.id, { amount: n })} step="0.01" />
                    <FrequencySelect value={si.frequency} onChange={(f) => updateSideIncome(si.id, { frequency: f })} />
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={si.taxable} onChange={e => updateSideIncome(si.id, { taxable: e.target.checked })} />
                        Taxable
                      </label>
                      <button className="btn-ghost text-red-500" onClick={() => deleteSideIncome(si.id)}>✕</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <StatCard label="Gross income / yr" value={fmt(tax.gross)} />
          <StatCard label="Income tax / yr" value={fmt(tax.incomeTax)} accent="text-rose-500" />
          <StatCard label="National Insurance / yr" value={fmt(tax.nationalInsurance)} accent="text-rose-500" />
          <StatCard label="Pension contributions / yr" value={fmt(tax.pension)} hint={`+ employer ${fmt(tax.employerPension)}`} />
          {tax.studentLoan > 0 && (
            <StatCard label="Student loan / yr" value={fmt(tax.studentLoan)} hint={tax.studentLoanByPlan.map(s => `${s.plan}: ${fmt(s.amount)}`).join(' · ')} accent="text-amber-500" />
          )}
          <StatCard label="Take-home / yr" value={fmt(tax.takeHome)} hint={`Monthly ${fmt(tax.takeHome / 12)}`} accent="text-emerald-500" />
          <StatCard label="Effective rate" value={(tax.effectiveRate * 100).toFixed(1) + '%'} />
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0);
}
