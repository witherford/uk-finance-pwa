import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, NumInput, Empty } from './common';
import { Employer, EmploymentKind, PensionScheme } from '../types';
import { WageSlipsList } from './WageSlipsList';

const KINDS: EmploymentKind[] = ['PAYE', 'SE', 'Director', 'Contractor', 'Other'];
const SCHEMES: PensionScheme[] = ['relief-at-source', 'net-pay', 'salary-sacrifice', 'none'];

export function EmployersSection() {
  const employers = useFinanceStore(s => s.state.employers);
  const addEmployer = useFinanceStore(s => s.addEmployer);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<EmploymentKind>('PAYE');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [annual, setAnnual] = useState(0);

  const sorted = [...employers].sort((a, b) => {
    const aCurrent = !a.endDate ? 1 : 0;
    const bCurrent = !b.endDate ? 1 : 0;
    if (aCurrent !== bCurrent) return bCurrent - aCurrent;
    return (b.startDate ?? '').localeCompare(a.startDate ?? '');
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Employers / employment / businesses</div>
        <button className="btn-primary !py-1 text-sm" onClick={() => setOpen(o => !o)}>
          {open ? 'Close' : '+ Add employer'}
        </button>
      </div>

      {open && (
        <form
          className="card card-pad mb-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
          onSubmit={e => {
            e.preventDefault();
            if (!name) return;
            addEmployer({
              name, kind,
              startDate, endDate: endDate || undefined,
              annualRefSalary: annual,
              wageSlips: []
            });
            setName(''); setKind('PAYE'); setStartDate(new Date().toISOString().slice(0, 10)); setEndDate(''); setAnnual(0);
            setOpen(false);
          }}
        >
          <Field label="Name *"><input autoFocus className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Ltd" /></Field>
          <Field label="Kind">
            <select className="input" value={kind} onChange={e => setKind(e.target.value as EmploymentKind)}>
              {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </Field>
          <Field label="Annual reference salary (£)"><NumInput value={annual} onChange={setAnnual} /></Field>
          <Field label="Start date"><input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></Field>
          <Field label="End date (blank = current)"><input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></Field>
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end"><button className="btn-primary">Add employer</button></div>
        </form>
      )}

      {sorted.length === 0 ? (
        <Empty>No employers yet — add your first to start tracking wage slips and pension flow-through.</Empty>
      ) : (
        <ul className="space-y-3">
          {sorted.map(e => <EmployerCard key={e.id} employer={e} />)}
        </ul>
      )}
    </div>
  );
}

function EmployerCard({ employer }: { employer: Employer }) {
  const update = useFinanceStore(s => s.updateEmployer);
  const del = useFinanceStore(s => s.deleteEmployer);
  const [open, setOpen] = useState(false);

  const isCurrent = !employer.endDate;

  return (
    <li className="card">
      <button className="w-full px-4 py-3 text-left flex items-center gap-3" onClick={() => setOpen(o => !o)}>
        <span className={`w-2 h-10 rounded-full shrink-0 ${isCurrent ? 'bg-emerald-500' : 'bg-slate-400'}`} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-2">
            {employer.name}
            {isCurrent && <span className="chip bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Current</span>}
          </div>
          <div className="text-xs text-slate-500">
            {employer.kind} · {employer.startDate}{employer.endDate ? ` → ${employer.endDate}` : ''} ·
            {' '}£{(employer.annualRefSalary || 0).toLocaleString('en-GB')} · {employer.wageSlips.length} wage slip{employer.wageSlips.length === 1 ? '' : 's'}
          </div>
        </div>
        <span className="text-slate-400">{open ? '−' : '›'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Name"><input className="input" value={employer.name} onChange={e => update(employer.id, { name: e.target.value })} /></Field>
            <Field label="Kind">
              <select className="input" value={employer.kind} onChange={e => update(employer.id, { kind: e.target.value as EmploymentKind })}>
                {KINDS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Annual ref salary (£)"><NumInput value={employer.annualRefSalary} onChange={n => update(employer.id, { annualRefSalary: n })} /></Field>
            <Field label="Start date"><input className="input" type="date" value={employer.startDate} onChange={e => update(employer.id, { startDate: e.target.value })} /></Field>
            <Field label="End date (blank = current)"><input className="input" type="date" value={employer.endDate ?? ''} onChange={e => update(employer.id, { endDate: e.target.value || undefined })} /></Field>
            <Field label="Notes"><input className="input" value={employer.notes ?? ''} onChange={e => update(employer.id, { notes: e.target.value })} /></Field>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <div className="font-semibold mb-2 text-sm">Pension at this employer</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Your contribution %"><NumInput value={employer.pensionPct ?? 0} onChange={n => update(employer.id, { pensionPct: n })} step="0.1" /></Field>
              <Field label="Employer contribution %"><NumInput value={employer.employerPensionPct ?? 0} onChange={n => update(employer.id, { employerPensionPct: n })} step="0.1" /></Field>
              <Field label="Scheme">
                <select className="input" value={employer.pensionScheme ?? 'none'} onChange={e => update(employer.id, { pensionScheme: e.target.value as PensionScheme })}>
                  {SCHEMES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Provider"><input className="input" value={employer.pensionProvider ?? ''} onChange={e => update(employer.id, { pensionProvider: e.target.value })} /></Field>
              <Field label="Pension account / policy #"><input className="input" value={employer.pensionAccountRef ?? ''} onChange={e => update(employer.id, { pensionAccountRef: e.target.value })} /></Field>
            </div>
            <div className="text-xs text-slate-500 mt-2">
              These pension details flow into the Pension page automatically when this is the current employer.
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <WageSlipsList employer={employer} />
          </div>

          <div className="flex justify-end pt-2">
            <button className="btn-ghost text-red-500 text-sm" onClick={() => { if (confirm(`Delete ${employer.name} and all its wage slips?`)) del(employer.id); }}>🗑️ Delete employer</button>
          </div>
        </div>
      )}
    </li>
  );
}
