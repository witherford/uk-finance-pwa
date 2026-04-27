import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, NumInput, Money } from './common';
import { MortgageInfo, RentInfo, TenancyHistoryEntry, RateType } from '../types';
import { endDateFromYears, endDateFromMonths } from '../lib/agreement';

export function HousingCard() {
  const housing = useFinanceStore(s => s.state.housing);
  const home = useFinanceStore(s => s.state.home);
  const setHousingType = useFinanceStore(s => s.setHousingType);

  return (
    <div className="card card-pad mb-5 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl">🏡</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Mortgage / Rent</div>
          <div className="text-xs text-slate-500">Tracks your housing cost and flows it into your monthly outgoings.</div>
        </div>
        <select
          className="input !w-auto"
          value={housing.type}
          onChange={e => setHousingType(e.target.value as any)}
        >
          <option value="none">— Not set —</option>
          <option value="mortgage">Mortgage</option>
          <option value="rent">Rent</option>
        </select>
      </div>

      {housing.type === 'mortgage' && <MortgageEditor mortgage={housing.mortgage} hasHome={!!home} />}
      {housing.type === 'rent' && <RentEditor rent={housing.rent} history={housing.tenancyHistory} />}
    </div>
  );
}

const MORTGAGE_DEFAULTS: MortgageInfo = {
  costPerMonth: 0, interestRatePct: 0, rateType: 'fixed', provider: '',
  accountRef: '', termYears: 25, startDate: new Date().toISOString().slice(0, 10)
};

function MortgageEditor({ mortgage, hasHome }: { mortgage?: MortgageInfo; hasHome: boolean }) {
  const setMortgage = useFinanceStore(s => s.setMortgage);
  // Merge over defaults so a partial saved mortgage (created by setMortgage with a single
  // patch) always has every field populated when rendered, even after store state mutations.
  const m: MortgageInfo = { ...MORTGAGE_DEFAULTS, ...(mortgage ?? {}) };
  if (!m.startDate) m.startDate = new Date().toISOString().slice(0, 10);
  const autoEnd = endDateFromYears(m.startDate, m.termYears);
  const showEnd = m.endDateOverridden ? (m.endDate ?? '') : (autoEnd ?? '');

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Cost per month (£)"><NumInput value={m.costPerMonth} onChange={n => setMortgage({ costPerMonth: n })} step="0.01" /></Field>
        <Field label="Interest rate (%)"><NumInput value={m.interestRatePct} onChange={n => setMortgage({ interestRatePct: n })} step="0.01" /></Field>
        <Field label="Rate type">
          <select className="input" value={m.rateType} onChange={e => setMortgage({ rateType: e.target.value as RateType })}>
            <option value="fixed">Fixed</option>
            <option value="flexible">Flexible / variable</option>
          </select>
        </Field>
        <Field label="Provider"><input className="input" value={m.provider} onChange={e => setMortgage({ provider: e.target.value })} placeholder="e.g. Halifax" /></Field>
        <Field label="Account / mortgage #"><input className="input" value={m.accountRef} onChange={e => setMortgage({ accountRef: e.target.value })} /></Field>
        <Field label="Mortgage length (years)"><NumInput value={m.termYears} onChange={n => setMortgage({ termYears: Math.round(n) })} step="1" min={1} max={50} /></Field>
        <Field label="Start date"><input className="input" type="date" value={m.startDate} onChange={e => setMortgage({ startDate: e.target.value })} /></Field>
        <Field label="End date">
          <div className="flex gap-2">
            <input
              className="input"
              type="date"
              value={showEnd}
              onChange={e => setMortgage({ endDate: e.target.value, endDateOverridden: true })}
              readOnly={!m.endDateOverridden}
            />
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setMortgage({ endDateOverridden: !m.endDateOverridden, endDate: m.endDateOverridden ? autoEnd : showEnd })}
              title="Override the auto-calculated end date"
            >
              {m.endDateOverridden ? '🔒 Auto' : '✏️ Edit'}
            </button>
          </div>
        </Field>
      </div>
      <Field label="Notes"><input className="input" value={m.notes ?? ''} onChange={e => setMortgage({ notes: e.target.value })} placeholder="Anything worth remembering" /></Field>

      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3 text-sm flex flex-wrap items-center gap-3">
        <span>🏠</span>
        <span className="flex-1 min-w-0">
          {hasHome
            ? 'Your home is tracked in Net worth — open it to log valuations.'
            : 'Your home has been added to Net worth — open it to enter purchase details and valuations.'}
        </span>
        <Link to="/net-worth" className="btn-primary !py-1 !px-3 text-sm">Open Net worth</Link>
      </div>

      <div className="text-sm text-slate-500">
        Monthly cost: <Money value={m.costPerMonth} /> — included in your monthly outgoings on the dashboard and breakdown.
      </div>
    </div>
  );
}

const RENT_DEFAULTS: RentInfo = {
  costPerMonth: 0, rateType: 'fixed', provider: '',
  accountRef: '', termMonths: 12, startDate: new Date().toISOString().slice(0, 10)
};

function RentEditor({ rent, history }: { rent?: RentInfo; history: TenancyHistoryEntry[] }) {
  const setRent = useFinanceStore(s => s.setRent);
  const addTH = useFinanceStore(s => s.addTenancyHistory);
  const updateTH = useFinanceStore(s => s.updateTenancyHistory);
  const deleteTH = useFinanceStore(s => s.deleteTenancyHistory);

  const r: RentInfo = { ...RENT_DEFAULTS, ...(rent ?? {}) };
  if (!r.startDate) r.startDate = new Date().toISOString().slice(0, 10);
  const autoEnd = endDateFromMonths(r.startDate, r.termMonths);
  const showEnd = r.endDateOverridden ? (r.endDate ?? '') : (autoEnd ?? '');

  const [showHistory, setShowHistory] = useState(false);
  const [thProvider, setThProvider] = useState('');
  const [thCost, setThCost] = useState(0);
  const [thStart, setThStart] = useState('');
  const [thMonths, setThMonths] = useState(12);

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Cost per month (£)"><NumInput value={r.costPerMonth} onChange={n => setRent({ costPerMonth: n })} step="0.01" /></Field>
        <Field label="Rate type">
          <select className="input" value={r.rateType} onChange={e => setRent({ rateType: e.target.value as RateType })}>
            <option value="fixed">Fixed</option>
            <option value="flexible">Flexible / variable</option>
          </select>
        </Field>
        <Field label="Provider (landlord / agency)"><input className="input" value={r.provider} onChange={e => setRent({ provider: e.target.value })} /></Field>
        <Field label="Account / reference #"><input className="input" value={r.accountRef} onChange={e => setRent({ accountRef: e.target.value })} /></Field>
        <Field label="Tenancy length (months)"><NumInput value={r.termMonths} onChange={n => setRent({ termMonths: Math.round(n) })} step="1" min={1} max={120} /></Field>
        <Field label="Start date"><input className="input" type="date" value={r.startDate} onChange={e => setRent({ startDate: e.target.value })} /></Field>
        <Field label="End date">
          <div className="flex gap-2">
            <input
              className="input"
              type="date"
              value={showEnd}
              onChange={e => setRent({ endDate: e.target.value, endDateOverridden: true })}
              readOnly={!r.endDateOverridden}
            />
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setRent({ endDateOverridden: !r.endDateOverridden, endDate: r.endDateOverridden ? autoEnd : showEnd })}
            >
              {r.endDateOverridden ? '🔒 Auto' : '✏️ Edit'}
            </button>
          </div>
        </Field>
      </div>
      <Field label="Notes"><input className="input" value={r.notes ?? ''} onChange={e => setRent({ notes: e.target.value })} /></Field>

      <div className="text-sm text-slate-500">
        Monthly cost: <Money value={r.costPerMonth} /> — included in your monthly outgoings.
      </div>

      <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
        <button className="btn-secondary" onClick={() => setShowHistory(s => !s)}>
          📜 {showHistory ? 'Hide' : 'Add'} history ({history.length})
        </button>
      </div>

      {showHistory && (
        <div className="space-y-3">
          <form
            className="card card-pad grid sm:grid-cols-5 gap-3"
            onSubmit={e => {
              e.preventDefault();
              if (!thProvider || !thStart) return;
              const end = endDateFromMonths(thStart, thMonths);
              if (!end) return;
              addTH({ provider: thProvider, costPerMonth: thCost, startDate: thStart, endDate: end, termMonths: thMonths });
              setThProvider(''); setThCost(0); setThStart(''); setThMonths(12);
            }}
          >
            <Field label="Provider"><input className="input" value={thProvider} onChange={e => setThProvider(e.target.value)} /></Field>
            <Field label="Cost / mo (£)"><NumInput value={thCost} onChange={setThCost} step="0.01" /></Field>
            <Field label="Start"><input className="input" type="date" value={thStart} onChange={e => setThStart(e.target.value)} /></Field>
            <Field label="Term (months)"><NumInput value={thMonths} onChange={n => setThMonths(Math.round(n))} step="1" min={1} /></Field>
            <div className="flex items-end"><button className="btn-primary w-full">+ Add</button></div>
          </form>

          {history.length > 0 && (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>
                  <th className="table-th">Provider</th>
                  <th className="table-th">Cost / mo</th>
                  <th className="table-th">Start</th>
                  <th className="table-th">End</th>
                  <th className="table-th">Months</th>
                  <th className="table-th"></th>
                </tr></thead>
                <tbody>
                  {history.map(h => (
                    <tr key={h.id}>
                      <td className="table-td"><input className="input !py-1" value={h.provider} onChange={e => updateTH(h.id, { provider: e.target.value })} /></td>
                      <td className="table-td"><NumInput value={h.costPerMonth} onChange={n => updateTH(h.id, { costPerMonth: n })} step="0.01" /></td>
                      <td className="table-td"><input className="input !py-1" type="date" value={h.startDate} onChange={e => updateTH(h.id, { startDate: e.target.value })} /></td>
                      <td className="table-td"><input className="input !py-1" type="date" value={h.endDate} onChange={e => updateTH(h.id, { endDate: e.target.value })} /></td>
                      <td className="table-td">{h.termMonths}</td>
                      <td className="table-td"><button className="btn-ghost text-red-500" onClick={() => deleteTH(h.id)}>✕</button></td>
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
