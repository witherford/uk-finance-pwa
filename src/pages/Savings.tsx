import { useState } from 'react';
import { PaymentManager } from '../components/PaymentManager';
import { Field, Money, StatCard, NumInput } from '../components/common';
import { projectSavings } from '../lib/savings';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { PeriodKey } from '../lib/frequency';

export function SavingsPage() {
  const [contribution, setContribution] = useState(200);
  const [period, setPeriod] = useState<PeriodKey>('monthly');
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(4);
  const [start, setStart] = useState(0);

  const projection = projectSavings({ contribution, contributionPeriod: period, years, annualRatePct: rate, startBalance: start });

  return (
    <div className="space-y-6">
      <PaymentManager kind="saving" title="Savings" />

      <div className="card card-pad">
        <h2 className="font-bold text-lg mb-3">📈 Savings projector</h2>
        <p className="text-sm text-slate-500 mb-3">If I save £X every Y for Z years at R% AER, what will I have?</p>
        <div className="grid sm:grid-cols-5 gap-3">
          <Field label="Contribution £"><NumInput value={contribution} onChange={setContribution} /></Field>
          <Field label="Period"><select className="input" value={period} onChange={e => setPeriod(e.target.value as PeriodKey)}>
            <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
          </select></Field>
          <Field label="Years"><NumInput value={years} onChange={setYears} /></Field>
          <Field label="Interest %/yr"><NumInput value={rate} onChange={setRate} step="0.1" /></Field>
          <Field label="Starting balance £"><NumInput value={start} onChange={setStart} /></Field>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 my-4">
          <StatCard label="Final balance" value={fmt(projection.finalBalance)} accent="text-emerald-500" />
          <StatCard label="Total contributed" value={fmt(projection.totalContributions)} />
          <StatCard label="Interest earned" value={fmt(projection.totalInterest)} accent="text-sky-500" />
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <LineChart data={projection.series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="month" tickFormatter={m => `${(m / 12).toFixed(0)}y`} />
              <YAxis tickFormatter={v => `£${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmt(v as number)} labelFormatter={l => `Month ${l}`} />
              <Legend />
              <Line type="monotone" dataKey="balance" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Balance" />
              <Line type="monotone" dataKey="contributions" stroke="#94a3b8" strokeWidth={2} dot={false} name="Contributions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n || 0); }
