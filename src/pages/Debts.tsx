import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { PaymentManager } from '../components/PaymentManager';
import { DebtImport } from '../components/DebtImport';
import { Field, NumInput, PageHeader, StatCard, Money } from '../components/common';
import { payoffPlan } from '../lib/uk-tools';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Payment } from '../types';

export function DebtsPage() {
  const debts = useFinanceStore(s => s.state.payments.filter(p => p.kind === 'debt'));

  const totalBalance = debts.filter(d => (d.balance ?? 0) > 0).reduce((s, d) => s + (d.balance ?? 0), 0);
  const totalMonthly = debts.reduce((s, d) => s + (d.amount || 0), 0);
  const totalOverpayment = debts.reduce((s, d) => s + (d.overpayment ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Debts"
        subtitle="All your debts in one place — track balances, APR, minimum payments, overpayments, and run a payoff strategy on any debt."
      />

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total outstanding" value={fmt(totalBalance)} accent="text-rose-500" hint={debts.some(d => (d.balance ?? 0) > 0) ? undefined : 'Add Balance to each debt to see this'} />
        <StatCard label="Monthly payments" value={fmt(totalMonthly)} />
        <StatCard label="Overpayments / mo" value={fmt(totalOverpayment)} accent="text-emerald-500" />
      </div>

      <DebtImport />

      <PayoffStrategy debts={debts} totalOverpayment={totalOverpayment} />

      <PaymentManager kind="debt" title="Your debts" />
    </>
  );
}

function PayoffStrategy({ debts, totalOverpayment }: { debts: Payment[]; totalOverpayment: number }) {
  const [debtId, setDebtId] = useState<'all' | string>('all');
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const [extra, setExtra] = useState<number>(totalOverpayment);

  const usable = debts.filter(d => (d.balance ?? 0) > 0 && (d.minPayment ?? 0) > 0);
  const targets = debtId === 'all' ? usable : usable.filter(d => d.id === debtId);

  const plan = useMemo(() => {
    if (targets.length === 0) return null;
    return payoffPlan(
      targets.map(d => ({ id: d.id, name: d.name, balance: d.balance!, apr: d.apr ?? 0, minPayment: d.minPayment! })),
      extra,
      strategy
    );
  }, [targets, extra, strategy]);

  return (
    <div className="card card-pad mb-5">
      <div className="font-semibold mb-1">🪜 Payoff strategy simulator</div>
      <p className="text-xs text-slate-500 mb-3">
        Pick a debt (or all of them), choose a strategy, and any extra you'd throw at it on top of minimum payments. Add Balance, APR and Min payment to your debts below to enable this.
      </p>

      {usable.length === 0 ? (
        <div className="text-sm text-slate-500">No debts have all of Balance, APR, and Min payment set yet — fill those in below to run the simulator.</div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Debt">
              <select className="input" value={debtId} onChange={e => setDebtId(e.target.value as any)}>
                <option value="all">All my debts ({usable.length})</option>
                {usable.map(d => <option key={d.id} value={d.id}>{d.name}{d.apr ? ` · ${d.apr}% APR` : ''}{d.balance ? ` · £${d.balance.toFixed(0)}` : ''}</option>)}
              </select>
            </Field>
            <Field label="Strategy">
              <select className="input" value={strategy} onChange={e => setStrategy(e.target.value as any)}>
                <option value="avalanche">Avalanche — highest APR first (cheaper)</option>
                <option value="snowball">Snowball — smallest balance first (motivating)</option>
              </select>
            </Field>
            <Field label="Extra £/month on top of minimums">
              <NumInput value={extra} onChange={setExtra} step="1" />
            </Field>
          </div>

          {plan && (
            <>
              <div className="grid sm:grid-cols-3 gap-3 mt-4">
                <StatCard label="Months to debt-free" value={String(plan.months)} accent="text-emerald-500" />
                <StatCard label="Years" value={(plan.months / 12).toFixed(1)} />
                <StatCard label="Final extra throw" value={fmt(extra)} hint="Above minimums" />
              </div>
              <div className="h-72 mt-4">
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
            </>
          )}
        </>
      )}
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0); }
