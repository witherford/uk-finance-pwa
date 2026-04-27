import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { computeTax } from '../lib/uk-tax';
import { annualAmount, isActive, expandOccurrences, PeriodKey } from '../lib/frequency';
import { nextPayDate, daysUntilPay } from '../lib/pay-date';
import { format, differenceInCalendarDays } from 'date-fns';
import { PageHeader, StatCard } from '../components/common';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { housingMonthly, housingLabel } from '../lib/housing';
import { effectiveSalary } from '../lib/salary';

const PER_YEAR: Record<PeriodKey, number> = { daily: 365, weekly: 52, fortnightly: 26, monthly: 12, yearly: 1 };

export function Breakdown() {
  const state = useFinanceStore(s => s.state);
  const [period, setPeriod] = useState<PeriodKey>('monthly');

  const eff = useMemo(() => effectiveSalary(state.profile, state.employers), [state.profile, state.employers]);
  const tax = useMemo(() => computeTax({ ...state.profile, salary: eff.value }, state.sideIncomes), [state.profile, state.sideIncomes, eff.value]);
  const housingMo = housingMonthly(state.housing);
  const housingKind = housingLabel(state.housing);

  const totals = useMemo(() => {
    const now = new Date();
    const active = state.payments.filter(p => isActive(p, now));
    let bills = 0, debts = 0, savings = 0;
    const byCat = new Map<string, number>();
    for (const p of active) {
      const yr = annualAmount(p.amount, p.frequency);
      if (p.kind === 'bill') bills += yr;
      else if (p.kind === 'debt') debts += yr;
      else savings += yr;
      const cat = state.categories.find(c => c.id === p.categoryId);
      const k = cat?.name ?? 'Uncategorised';
      byCat.set(k, (byCat.get(k) ?? 0) + yr);
    }
    // Add mortgage/rent under a Housing bucket
    if (housingKind && housingMo > 0) {
      bills += housingMo * 12;
      byCat.set(housingKind, (byCat.get(housingKind) ?? 0) + housingMo * 12);
    }
    return { bills, debts, savings, byCat };
  }, [state, housingKind, housingMo]);

  const div = PER_YEAR[period];
  const takeHome = tax.takeHome / div;
  const out = (totals.bills + totals.debts) / div;
  const sav = totals.savings / div;
  const remaining = takeHome - out - sav;

  const pieData = [...totals.byCat.entries()].map(([name, value]) => ({ name, value: value / div }));
  const COLORS = ['#0ea5e9', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6', '#e11d48', '#10b981', '#06b6d4', '#f43f5e'];

  const barData = [
    { name: 'Take-home', value: takeHome },
    { name: 'Bills', value: totals.bills / div },
    { name: 'Debts', value: totals.debts / div },
    { name: 'Savings', value: totals.savings / div },
    { name: 'Remaining', value: remaining }
  ];

  // Pay-cycle insights
  const next = nextPayDate(state.profile.payDate);
  const days = daysUntilPay(state.profile.payDate);
  const today = new Date();
  let outgoingsToPayday = 0;
  if (next) {
    for (const p of state.payments) {
      if (!isActive(p, today)) continue;
      if (p.kind === 'saving') continue;
      const occs = expandOccurrences(p, today, next);
      outgoingsToPayday += occs.length * p.amount;
    }
  }
  const after = next ? nextPayDate(state.profile.payDate, new Date(next.getTime() + 86400000)) : null;
  const cycleDays = next && after ? differenceInCalendarDays(after, next) : 0;

  return (
    <div>
      <PageHeader
        title="Financial breakdown"
        subtitle="Switch period to see your numbers daily, weekly, fortnightly, monthly, or annually"
        actions={
          <select className="input !w-auto" value={period} onChange={e => setPeriod(e.target.value as PeriodKey)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="fortnightly">Fortnightly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
        <StatCard label="Take-home" value={fmt(takeHome)} accent="text-emerald-500" />
        <StatCard label="Bills" value={fmt(totals.bills / div)} accent="text-rose-500" />
        <StatCard label="Debts" value={fmt(totals.debts / div)} accent="text-rose-500" />
        <StatCard label="Savings" value={fmt(sav)} accent="text-sky-500" />
        <StatCard label="Remaining" value={fmt(remaining)} accent={remaining < 0 ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'} />
      </div>

      {next && days != null && (
        <div className="card card-pad mb-5">
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Next pay day</div>
              <div className="text-xl font-bold mt-1">{format(next, 'EEE d MMM')}</div>
              <div className="text-xs text-slate-500">{days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Outgoings before next pay</div>
              <div className="text-xl font-bold mt-1 text-rose-500">{fmt(outgoingsToPayday)}</div>
              <div className="text-xs text-slate-500">Bills + debts due before {format(next, 'd MMM')}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Pay cycle length</div>
              <div className="text-xl font-bold mt-1">{cycleDays} days</div>
              <div className="text-xs text-slate-500">Between this and next pay day</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card card-pad h-80">
          <div className="font-semibold mb-2">Spending by category ({period})</div>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => fmt(v as number)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card card-pad h-80">
          <div className="font-semibold mb-2">Cashflow ({period})</div>
          <ResponsiveContainer>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b833" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={v => `£${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(v: any) => fmt(v as number)} />
              <Bar dataKey="value" fill="#0ea5e9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function fmt(n: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n || 0); }
