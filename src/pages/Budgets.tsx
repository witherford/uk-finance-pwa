import { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { PageHeader, Empty } from '../components/common';
import { annualAmount, isActive } from '../lib/frequency';

export function Budgets() {
  const state = useFinanceStore(s => s.state);
  const setBudget = useFinanceStore(s => s.setBudget);
  const deleteBudget = useFinanceStore(s => s.deleteBudget);

  const billCats = state.categories.filter(c => c.kind === 'bill');

  const monthlyByCat = useMemo(() => {
    const now = new Date();
    const map = new Map<string, number>();
    for (const p of state.payments.filter(p => p.kind === 'bill' && isActive(p, now))) {
      const m = annualAmount(p.amount, p.frequency) / 12;
      map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + m);
    }
    return map;
  }, [state.payments]);

  const totalBudget = (state.budgets ?? []).reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpend = [...monthlyByCat.values()].reduce((s, v) => s + v, 0);

  return (
    <div>
      <PageHeader title="Monthly budgets" subtitle="Set monthly limits per bill category and watch progress" />

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <Stat label="Total budget" value={fmt(totalBudget)} />
        <Stat label="Currently committed" value={fmt(totalSpend)} accent={totalSpend > totalBudget && totalBudget > 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'} />
        <Stat label="Headroom" value={fmt(totalBudget - totalSpend)} />
      </div>

      {billCats.length === 0 ? <Empty>Add some bill categories first.</Empty> : (
        <div className="card divide-y divide-slate-100 dark:divide-slate-800">
          {billCats.map(c => {
            const budget = (state.budgets ?? []).find(b => b.categoryId === c.id);
            const spent = monthlyByCat.get(c.id) ?? 0;
            const limit = budget?.monthlyLimit ?? 0;
            const pct = limit > 0 ? Math.min(150, (spent / limit) * 100) : 0;
            const over = limit > 0 && spent > limit;
            return (
              <div key={c.id} className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="flex items-center gap-2 sm:w-48">
                  <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                  <span className="font-medium">{c.name}</span>
                </div>
                <div className="flex-1">
                  <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full ${over ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: Math.min(100, pct) + '%' }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>{fmt(spent)} committed{limit > 0 ? ` of ${fmt(limit)}` : ''}</span>
                    <span>{limit > 0 ? `${(spent / limit * 100).toFixed(0)}%` : 'No limit set'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="input !w-32"
                    type="number"
                    step="10"
                    placeholder="Monthly £"
                    value={budget?.monthlyLimit ?? ''}
                    onChange={e => setBudget(c.id, parseFloat(e.target.value) || 0)}
                  />
                  {budget && <button className="btn-ghost text-red-500" onClick={() => deleteBudget(budget.id)}>✕</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card card-pad">
      <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ?? ''}`}>{value}</div>
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0); }
