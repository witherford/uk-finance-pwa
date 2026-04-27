import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, NumInput, Money } from './common';
import { CouncilBand, CouncilPlan, CouncilTaxInfo } from '../types';
import { effectiveCouncilTaxMonthly, councilTaxAnnual } from '../lib/council-tax';
import { ProviderLogo } from './ProviderLogo';
import { CouncilTaxImport } from './CouncilTaxImport';

const BANDS: CouncilBand[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export function CouncilTaxCard() {
  const ct = useFinanceStore(s => s.state.councilTax);
  const setCT = useFinanceStore(s => s.setCouncilTax);
  const history = useFinanceStore(s => s.state.councilTaxHistory);
  const addH = useFinanceStore(s => s.addCouncilTaxHistory);
  const updateH = useFinanceStore(s => s.updateCouncilTaxHistory);
  const deleteH = useFinanceStore(s => s.deleteCouncilTaxHistory);

  const [showHistory, setShowHistory] = useState(false);
  const [showIO, setShowIO] = useState(false);

  const CT_DEFAULTS: CouncilTaxInfo = {
    council: '', band: 'D', plan: '12-monthly', accountRef: '',
    monthlyCost: 0, costIncludesDiscount: false,
    singleOccupancyDiscount: false, discountPct: 25,
    yearStartMonth: 4
  };
  // Merge live data over defaults so partial saved data never crashes downstream callers.
  const c: CouncilTaxInfo = { ...CT_DEFAULTS, ...(ct ?? {}) };
  const eff = effectiveCouncilTaxMonthly(c);
  const annual = councilTaxAnnual(c);

  // history form
  const [hCouncil, setHCouncil] = useState('');
  const [hBand, setHBand] = useState<CouncilBand>('D');
  const [hPlan, setHPlan] = useState<CouncilPlan>('12-monthly');
  const [hCost, setHCost] = useState(0);
  const [hStart, setHStart] = useState('');
  const [hEnd, setHEnd] = useState('');

  return (
    <div className="card card-pad mb-5 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <ProviderLogo name={c.council || 'Council Tax'} size={32} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold">🏛️ Council Tax</div>
          <div className="text-xs text-slate-500">UK council tax with banded billing, optional single-occupancy discount, history tracking and CSV/XLSX import.</div>
        </div>
        <button className="btn-secondary" onClick={() => setShowIO(s => !s)}>📥 Import / export</button>
      </div>

      {showIO && <CouncilTaxImport onClose={() => setShowIO(false)} />}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Council">
          <input className="input" value={c.council} onChange={e => setCT({ council: e.target.value })} placeholder="e.g. Bristol City Council" />
        </Field>
        <Field label="Band">
          <select className="input" value={c.band} onChange={e => setCT({ band: e.target.value as CouncilBand })}>
            {BANDS.map(b => <option key={b} value={b}>Band {b}</option>)}
          </select>
        </Field>
        <Field label="Payment plan">
          <select className="input" value={c.plan} onChange={e => setCT({ plan: e.target.value as CouncilPlan })}>
            <option value="12-monthly">12 monthly instalments</option>
            <option value="10-monthly">10 monthly instalments (Apr–Jan)</option>
          </select>
        </Field>
        <Field label="Account / reference number"><input className="input" value={c.accountRef} onChange={e => setCT({ accountRef: e.target.value })} /></Field>
        <Field label="Monthly cost as billed (£)"><NumInput value={c.monthlyCost} onChange={n => setCT({ monthlyCost: n })} step="0.01" /></Field>
        <Field label="Year starts (month, default Apr)"><NumInput value={c.yearStartMonth} onChange={n => setCT({ yearStartMonth: Math.max(1, Math.min(12, Math.round(n) || 4)) })} min={1} max={12} /></Field>
      </div>

      <div className="card card-pad bg-slate-50 dark:bg-slate-800/30 space-y-3">
        <div className="font-semibold text-sm">Discounts</div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={c.singleOccupancyDiscount} onChange={e => setCT({ singleOccupancyDiscount: e.target.checked })} /> Single-occupancy discount applies</label>
          {c.singleOccupancyDiscount && (
            <Field label="Discount %">
              <NumInput value={c.discountPct} onChange={n => setCT({ discountPct: n })} step="1" min={0} max={100} />
            </Field>
          )}
        </div>
        {c.singleOccupancyDiscount && (
          <div className="flex flex-col gap-1.5 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={c.costIncludesDiscount === true} onChange={() => setCT({ costIncludesDiscount: true })} /> The monthly cost above already includes the discount</label>
            <label className="flex items-center gap-2"><input type="radio" checked={c.costIncludesDiscount === false} onChange={() => setCT({ costIncludesDiscount: false })} /> No — apply the discount on top of the cost above</label>
          </div>
        )}
      </div>

      <Field label="Notes"><input className="input" value={c.notes ?? ''} onChange={e => setCT({ notes: e.target.value })} /></Field>

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <Stat label="Effective monthly" value={<Money value={eff} />} />
        <Stat label={`Annual (× ${c.plan === '10-monthly' ? '10' : '12'})`} value={<Money value={annual} />} />
        <Stat label="Averaged over 12 mo" value={<Money value={annual / 12} />} hint="Used in dashboard outgoings" />
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <button className="btn-secondary" onClick={() => setShowHistory(s => !s)}>📜 {showHistory ? 'Hide' : 'Show'} history ({history.length})</button>
      </div>

      {showHistory && (
        <div className="space-y-3">
          <form
            className="card card-pad grid sm:grid-cols-6 gap-3"
            onSubmit={e => {
              e.preventDefault();
              if (!hCouncil || !hStart || !hEnd) return;
              addH({ council: hCouncil, band: hBand, plan: hPlan, monthlyCost: hCost, startDate: hStart, endDate: hEnd });
              setHCouncil(''); setHBand('D'); setHPlan('12-monthly'); setHCost(0); setHStart(''); setHEnd('');
            }}
          >
            <Field label="Council"><input className="input" value={hCouncil} onChange={e => setHCouncil(e.target.value)} /></Field>
            <Field label="Band"><select className="input" value={hBand} onChange={e => setHBand(e.target.value as CouncilBand)}>{BANDS.map(b => <option key={b} value={b}>{b}</option>)}</select></Field>
            <Field label="Plan"><select className="input" value={hPlan} onChange={e => setHPlan(e.target.value as CouncilPlan)}><option value="12-monthly">12-monthly</option><option value="10-monthly">10-monthly</option></select></Field>
            <Field label="Monthly £"><NumInput value={hCost} onChange={setHCost} step="0.01" /></Field>
            <Field label="Start"><input className="input" type="date" value={hStart} onChange={e => setHStart(e.target.value)} /></Field>
            <Field label="End"><input className="input" type="date" value={hEnd} onChange={e => setHEnd(e.target.value)} /></Field>
            <div className="sm:col-span-6 flex justify-end"><button className="btn-primary">+ Add history</button></div>
          </form>

          {history.length > 0 && (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th className="table-th">Council</th><th className="table-th">Band</th><th className="table-th">Plan</th><th className="table-th">Monthly</th><th className="table-th">Period</th><th className="table-th"></th></tr></thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td className="table-td"><input className="input !py-1" value={h.council} onChange={e => updateH(h.id, { council: e.target.value })} /></td>
                      <td className="table-td"><select className="input !py-1" value={h.band} onChange={e => updateH(h.id, { band: e.target.value as CouncilBand })}>{BANDS.map(b => <option key={b} value={b}>{b}</option>)}</select></td>
                      <td className="table-td"><select className="input !py-1" value={h.plan} onChange={e => updateH(h.id, { plan: e.target.value as CouncilPlan })}><option value="12-monthly">12</option><option value="10-monthly">10</option></select></td>
                      <td className="table-td"><NumInput value={h.monthlyCost} onChange={n => updateH(h.id, { monthlyCost: n })} step="0.01" /></td>
                      <td className="table-td whitespace-nowrap"><input className="input !py-1 inline-block w-32 mr-1" type="date" value={h.startDate} onChange={e => updateH(h.id, { startDate: e.target.value })} />→<input className="input !py-1 inline-block w-32 ml-1" type="date" value={h.endDate} onChange={e => updateH(h.id, { endDate: e.target.value })} /></td>
                      <td className="table-td"><button className="btn-ghost text-red-500" onClick={() => deleteH(h.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
      <div className="text-base font-bold mt-1 tabular-nums">{value}</div>
      {hint && <div className="text-[10px] text-slate-500">{hint}</div>}
    </div>
  );
}
