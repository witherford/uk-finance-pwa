import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, PageHeader, StatCard, Money, Empty } from '../components/common';
import { Asset } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const TYPES: { value: Asset['type']; label: string; emoji: string }[] = [
  { value: 'cash', label: 'Cash / savings', emoji: '💵' },
  { value: 'investment', label: 'Investments', emoji: '📈' },
  { value: 'pension', label: 'Pension', emoji: '👴' },
  { value: 'property', label: 'Property', emoji: '🏠' },
  { value: 'vehicle', label: 'Vehicle', emoji: '🚗' },
  { value: 'other', label: 'Other', emoji: '📦' }
];

const COLORS = ['#0ea5e9', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6'];

export function NetWorth() {
  const assets = useFinanceStore(s => s.state.assets ?? []);
  const debts = useFinanceStore(s => s.state.payments.filter(p => p.kind === 'debt'));
  const add = useFinanceStore(s => s.addAsset);
  const update = useFinanceStore(s => s.updateAsset);
  const del = useFinanceStore(s => s.deleteAsset);

  const [name, setName] = useState('');
  const [type, setType] = useState<Asset['type']>('cash');
  const [value, setValue] = useState('');

  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  // Treat current bills/debts amount as proxy: sum monthly debt payments × 12 isn't a balance; users add them as assets if they want detail.
  // We additionally let users mark debts as having an outstanding balance via the Debts page (using `amount` per period).
  // For Net Worth, debts contribute negatively if we approximate: number of remaining periods × amount.
  const totalLiabilities = useMemo(() => {
    const now = new Date();
    return debts.reduce((s, d) => {
      if (!d.endDate) return s + d.amount * (d.frequency === 'monthly' ? 12 : 1);
      const end = new Date(d.endDate);
      const months = Math.max(0, (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth()));
      const perMonth = d.frequency === 'monthly' ? d.amount : d.amount * 0;
      return s + perMonth * months;
    }, 0);
  }, [debts]);

  const net = totalAssets - totalLiabilities;

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assets) {
      const t = TYPES.find(t => t.value === a.type)!;
      map.set(t.label, (map.get(t.label) ?? 0) + a.value);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value }));
  }, [assets]);

  return (
    <div>
      <PageHeader title="Net worth" subtitle="Assets minus liabilities. A snapshot of where you stand." />

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Assets" value={fmt(totalAssets)} accent="text-emerald-500" />
        <StatCard label="Liabilities (estimated)" value={fmt(totalLiabilities)} hint="Sum of remaining debt payments" accent="text-rose-500" />
        <StatCard label="Net worth" value={fmt(net)} accent={net < 0 ? 'text-red-600' : 'text-sky-500'} />
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
        <div className="card card-pad">
          <form className="grid sm:grid-cols-4 gap-3 mb-4" onSubmit={e => {
            e.preventDefault();
            if (!name || !value) return;
            add({ name, type, value: parseFloat(value) || 0 });
            setName(''); setValue('');
          }}>
            <Field label="Name"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Emergency fund" /></Field>
            <Field label="Type"><select className="input" value={type} onChange={e => setType(e.target.value as Asset['type'])}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
            </select></Field>
            <Field label="Value £"><input className="input" type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} /></Field>
            <div className="flex items-end"><button className="btn-primary w-full">Add asset</button></div>
          </form>

          {assets.length === 0 ? <Empty>No assets yet.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th className="table-th">Name</th><th className="table-th">Type</th><th className="table-th">Value</th><th className="table-th"></th></tr></thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id}>
                      <td className="table-td"><input className="input !py-1" value={a.name} onChange={e => update(a.id, { name: e.target.value })} /></td>
                      <td className="table-td">
                        <select className="input !py-1" value={a.type} onChange={e => update(a.id, { type: e.target.value as Asset['type'] })}>
                          {TYPES.map(t => <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>)}
                        </select>
                      </td>
                      <td className="table-td"><input className="input !py-1" type="number" step="0.01" value={a.value} onChange={e => update(a.id, { value: parseFloat(e.target.value) || 0 })} /></td>
                      <td className="table-td"><button className="btn-ghost text-red-500" onClick={() => del(a.id)}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card card-pad h-80">
          <div className="font-semibold mb-2">Asset mix</div>
          {assets.length === 0 ? <div className="text-sm text-slate-500">Add assets to see mix.</div> : (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" outerRadius={90}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => fmt(v as number)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0); }
