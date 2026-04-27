import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, NumInput, Money, Empty } from './common';
import { ValuationSource, HomeRecord } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

const SOURCES: { value: ValuationSource; label: string }[] = [
  { value: 'estate-agent', label: 'Estate agent' },
  { value: 'survey', label: 'Survey' },
  { value: 'self', label: 'Self-estimate' },
  { value: 'zoopla', label: 'Zoopla' },
  { value: 'rightmove', label: 'Rightmove' },
  { value: 'land-registry', label: 'Land Registry' },
  { value: 'other', label: 'Other' }
];

function YearMonthInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input className="input" type="month" value={value} onChange={e => onChange(e.target.value)} />;
}

function thisMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function HomeValuations() {
  const home = useFinanceStore(s => s.state.home);
  const housingType = useFinanceStore(s => s.state.housing.type);
  const setHome = useFinanceStore(s => s.setHome);
  const addValuation = useFinanceStore(s => s.addValuation);
  const updateValuation = useFinanceStore(s => s.updateValuation);
  const deleteValuation = useFinanceStore(s => s.deleteValuation);

  const [setupPrice, setSetupPrice] = useState(0);
  const [setupYM, setSetupYM] = useState(thisMonth());
  const [setupAddr, setSetupAddr] = useState('');

  const [vYM, setVYM] = useState(thisMonth());
  const [vValue, setVValue] = useState(0);
  const [vSource, setVSource] = useState<ValuationSource>('self');
  const [vNotes, setVNotes] = useState('');

  // IMPORTANT: All hooks must run on every render, in the same order, to avoid
  // React error #310 ("rendered more hooks than during the previous render").
  // So compute these BEFORE any early return.
  const sortedValuations = useMemo(
    () => [...(home?.valuations ?? [])].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)),
    [home?.valuations]
  );

  if (housingType !== 'mortgage') return null;

  if (!home) {
    return (
      <div id="home" className="card card-pad mb-5">
        <div className="font-semibold mb-2">🏠 Set up your home record</div>
        <p className="text-sm text-slate-500 mb-3">
          Because your housing is set to Mortgage, you can track your property's value here.
          Enter the purchase price and date to get started.
        </p>
        <form
          className="grid sm:grid-cols-3 gap-3"
          onSubmit={e => {
            e.preventDefault();
            if (setupPrice <= 0 || !setupYM) return;
            const rec: HomeRecord = { purchasePrice: setupPrice, purchaseYearMonth: setupYM, address: setupAddr || undefined, valuations: [] };
            setHome(rec);
            setSetupPrice(0); setSetupYM(thisMonth()); setSetupAddr('');
          }}
        >
          <Field label="Purchase price (£)"><NumInput value={setupPrice} onChange={setSetupPrice} step="1" /></Field>
          <Field label="Purchase month"><YearMonthInput value={setupYM} onChange={setSetupYM} /></Field>
          <Field label="Address (optional)"><input className="input" value={setupAddr} onChange={e => setSetupAddr(e.target.value)} /></Field>
          <div className="sm:col-span-3 flex justify-end"><button className="btn-primary">Set up home</button></div>
        </form>
      </div>
    );
  }

  const latest = sortedValuations[sortedValuations.length - 1];
  const series = sortedValuations.map(v => ({ x: v.yearMonth, value: v.value, source: v.source }));
  // Prepend purchase as starting point
  const seriesWithPurchase = [{ x: home.purchaseYearMonth, value: home.purchasePrice, source: 'purchase' }, ...series];
  const change = latest ? latest.value - home.purchasePrice : 0;
  const changePct = home.purchasePrice > 0 && latest ? (change / home.purchasePrice) * 100 : 0;

  return (
    <div id="home" className="space-y-5">
      <div className="card card-pad">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-semibold">🏠 Home</div>
            <div className="text-xs text-slate-500">{home.address ?? 'No address set'}</div>
          </div>
          <button className="btn-ghost text-red-500 text-sm" onClick={() => { if (confirm('Remove home record? Valuations will be lost.')) setHome(undefined); }}>Remove</button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Purchase price" value={fmt(home.purchasePrice)} />
          <Stat label="Purchase month" value={home.purchaseYearMonth} />
          <Stat label="Latest valuation" value={latest ? fmt(latest.value) : '—'} hint={latest ? latest.yearMonth : 'add one below'} />
          <Stat label="Change since purchase" value={latest ? `${change >= 0 ? '+' : ''}${fmt(change)}` : '—'} hint={latest ? `${changePct.toFixed(1)}%` : ''} accent={change >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
        </div>

        <div className="mt-4">
          <Field label="Address">
            <input className="input" value={home.address ?? ''} onChange={e => setHome({ ...home, address: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="card card-pad">
        <div className="font-semibold mb-2">Add valuation</div>
        <form
          className="grid sm:grid-cols-5 gap-3"
          onSubmit={e => {
            e.preventDefault();
            if (vValue <= 0 || !vYM) return;
            addValuation({ yearMonth: vYM, value: vValue, source: vSource, notes: vNotes || undefined });
            setVValue(0); setVYM(thisMonth()); setVSource('self'); setVNotes('');
          }}
        >
          <Field label="Month"><YearMonthInput value={vYM} onChange={setVYM} /></Field>
          <Field label="Value (£)"><NumInput value={vValue} onChange={setVValue} step="1" /></Field>
          <Field label="Source">
            <select className="input" value={vSource} onChange={e => setVSource(e.target.value as ValuationSource)}>
              {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
          <Field label="Notes"><input className="input" value={vNotes} onChange={e => setVNotes(e.target.value)} /></Field>
          <div className="flex items-end"><button className="btn-primary w-full">+ Add</button></div>
        </form>
      </div>

      {sortedValuations.length === 0 ? (
        <Empty>No valuations recorded yet — add one above.</Empty>
      ) : (
        <>
          <div className="card card-pad h-72">
            <div className="font-semibold mb-2">Value over time</div>
            <ResponsiveContainer>
              <LineChart data={seriesWithPurchase}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
                <XAxis dataKey="x" />
                <YAxis tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => fmt(v as number)} />
                <ReferenceLine y={home.purchasePrice} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Purchase', position: 'right', fill: '#94a3b8', fontSize: 10 }} />
                <Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className="table-th">Month</th><th className="table-th">Value</th><th className="table-th">Source</th><th className="table-th">Notes</th><th className="table-th"></th></tr></thead>
              <tbody>
                {sortedValuations.map(v => (
                  <tr key={v.id}>
                    <td className="table-td"><YearMonthInput value={v.yearMonth} onChange={ym => updateValuation(v.id, { yearMonth: ym })} /></td>
                    <td className="table-td"><NumInput value={v.value} onChange={n => updateValuation(v.id, { value: n })} /></td>
                    <td className="table-td">
                      <select className="input !py-1" value={v.source} onChange={e => updateValuation(v.id, { source: e.target.value as ValuationSource })}>
                        {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </td>
                    <td className="table-td"><input className="input !py-1" value={v.notes ?? ''} onChange={e => updateValuation(v.id, { notes: e.target.value })} /></td>
                    <td className="table-td"><button className="btn-ghost text-red-500" onClick={() => deleteValuation(v.id)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
      <div className={`text-lg font-bold mt-0.5 ${accent ?? ''}`}>{value}</div>
      {hint && <div className="text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0); }
