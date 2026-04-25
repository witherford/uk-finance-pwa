import { useMemo, useState } from 'react';
import { Field, PageHeader, StatCard } from '../components/common';
import { payoffPlan } from '../lib/uk-tools';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

interface Row { id: string; name: string; balance: number; apr: number; minPayment: number; }

const uid = () => crypto.randomUUID();

export function DebtStrategies() {
  const [rows, setRows] = useState<Row[]>([
    { id: uid(), name: 'Credit card', balance: 2400, apr: 22.9, minPayment: 60 },
    { id: uid(), name: 'Personal loan', balance: 5800, apr: 6.9, minPayment: 180 }
  ]);
  const [extra, setExtra] = useState(100);
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');

  const plan = useMemo(() => payoffPlan(rows, extra, strategy), [rows, extra, strategy]);

  const update = (id: string, patch: Partial<Row>) => setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r));
  const del = (id: string) => setRows(rs => rs.filter(r => r.id !== id));
  const add = () => setRows(rs => [...rs, { id: uid(), name: 'New debt', balance: 1000, apr: 10, minPayment: 25 }]);

  const totalBalance = rows.reduce((s, r) => s + r.balance, 0);
  const totalMin = rows.reduce((s, r) => s + r.minPayment, 0);
  const totalMonthly = totalMin + extra;

  return (
    <div>
      <PageHeader title="Debt payoff strategies" subtitle="Compare Avalanche (highest APR first) vs Snowball (smallest balance first)" />

      <div className="card card-pad mb-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="table-th">Name</th><th className="table-th">Balance</th><th className="table-th">APR %</th><th className="table-th">Min payment / mo</th><th className="table-th"></th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="table-td"><input className="input !py-1" value={r.name} onChange={e => update(r.id, { name: e.target.value })} /></td>
                  <td className="table-td"><input className="input !py-1" type="number" value={r.balance} onChange={e => update(r.id, { balance: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="table-td"><input className="input !py-1" type="number" step="0.1" value={r.apr} onChange={e => update(r.id, { apr: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="table-td"><input className="input !py-1" type="number" value={r.minPayment} onChange={e => update(r.id, { minPayment: parseFloat(e.target.value) || 0 })} /></td>
                  <td className="table-td"><button className="btn-ghost text-red-500" onClick={() => del(r.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn-secondary mt-3" onClick={add}>+ Add debt</button>

        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <Field label="Extra £/month on top of minimums">
            <input className="input" type="number" value={extra} onChange={e => setExtra(parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Strategy">
            <select className="input" value={strategy} onChange={e => setStrategy(e.target.value as any)}>
              <option value="avalanche">Avalanche — highest APR first (cheaper)</option>
              <option value="snowball">Snowball — smallest balance first (motivating)</option>
            </select>
          </Field>
          <Field label="Total monthly throw">
            <input className="input" disabled value={fmt(totalMonthly)} />
          </Field>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total balance" value={fmt(totalBalance)} accent="text-rose-500" />
        <StatCard label="Months to debt-free" value={String(plan.months)} accent="text-emerald-500" />
        <StatCard label="Approx years" value={(plan.months / 12).toFixed(1)} />
      </div>

      <div className="card card-pad h-80">
        <ResponsiveContainer>
          <LineChart data={plan.series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
            <XAxis dataKey="month" tickFormatter={m => `${(m / 12).toFixed(0)}y`} />
            <YAxis tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: any) => fmt(v as number)} labelFormatter={l => `Month ${l}`} />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} dot={false} name="Total debt" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0); }
