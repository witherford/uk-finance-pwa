import { useEffect, useMemo, useRef, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { computeTax } from '../lib/uk-tax';
import { annualAmount, isActive, expandOccurrences } from '../lib/frequency';
import { payDatesInRange, daysUntilPay, nextPayDate } from '../lib/pay-date';
import { Money, PageHeader, StatCard } from '../components/common';
import { CalendarMini } from '../components/CalendarMini';
import { addMonths, format } from 'date-fns';
import { Link } from 'react-router-dom';
import { housingMonthly, housingLabel } from '../lib/housing';
import { councilTaxMonthlyAveraged } from '../lib/council-tax';
import { effectiveSalary } from '../lib/salary';
import { SnapshotMenu } from '../components/SnapshotMenu';

const PRIVACY_KEY = 'dashboard-privacy';

export function Dashboard() {
  const state = useFinanceStore(s => s.state);
  const ref = useRef<HTMLDivElement>(null);
  // Default = HIDDEN for privacy. User taps eye to reveal; preference is remembered.
  const [hidden, setHidden] = useState<boolean>(() => {
    const saved = localStorage.getItem(PRIVACY_KEY);
    return saved == null ? true : saved === '1';
  });
  useEffect(() => { localStorage.setItem(PRIVACY_KEY, hidden ? '1' : '0'); }, [hidden]);
  const fmtMoney = (n: number) => hidden ? '••••' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n || 0);

  const eff = useMemo(() => effectiveSalary(state.profile, state.employers), [state.profile, state.employers]);
  const tax = useMemo(() => computeTax({ ...state.profile, salary: eff.value }, state.sideIncomes), [state.profile, state.sideIncomes, eff.value]);

  const monthlyHousing = useMemo(() => housingMonthly(state.housing), [state.housing]);
  const housingKind = housingLabel(state.housing);
  const monthlyCouncilTax = useMemo(() => councilTaxMonthlyAveraged(state.councilTax), [state.councilTax]);
  const monthlyOverpayments = useMemo(() => state.payments.filter(p => p.kind === 'debt').reduce((s, p) => s + (p.overpayment ?? 0), 0), [state.payments]);

  const totalDebtBalance = useMemo(() => state.payments
    .filter(p => p.kind === 'debt' && p.balance && p.balance > 0)
    .reduce((s, p) => s + (p.balance ?? 0), 0), [state.payments]);

  // This-month spending
  const monthlySpending = useMemo(() => {
    const now = new Date();
    const ym = now.getFullYear() * 100 + now.getMonth();
    return state.spending.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() * 100 + d.getMonth() === ym;
    }).reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [state.spending]);
  const spendingBudget = state.spendingMonthlyBudget ?? 0;

  const monthlyOut = useMemo(() => {
    const now = new Date();
    const billsAndDebts = state.payments.filter(p => isActive(p, now) && p.kind !== 'saving')
      .reduce((s, p) => s + annualAmount(p.amount, p.frequency) / 12, 0);
    return billsAndDebts + monthlyHousing + monthlyCouncilTax + monthlyOverpayments;
  }, [state.payments, monthlyHousing, monthlyCouncilTax, monthlyOverpayments]);

  const monthlySaving = useMemo(() => {
    const now = new Date();
    return state.payments.filter(p => isActive(p, now) && p.kind === 'saving')
      .reduce((s, p) => s + annualAmount(p.amount, p.frequency) / 12, 0);
  }, [state.payments]);

  const monthlyTakeHome = tax.takeHome / 12;
  const remaining = monthlyTakeHome - monthlyOut - monthlySaving - monthlySpending;

  const upcoming = useMemo(() => {
    const from = new Date();
    const to = addMonths(from, 1);
    type Item = { date: Date; label: string; meta: string; color?: string };
    const list: Item[] = [];
    for (const p of state.payments) {
      const cat = state.categories.find(c => c.id === p.categoryId);
      for (const d of expandOccurrences(p, from, to)) {
        list.push({ date: d, label: p.name, meta: `£${p.amount.toFixed(2)} · ${cat?.name ?? p.kind}`, color: cat?.color });
      }
    }
    for (const e of state.yearlyEvents) {
      const ev = new Date(e.date);
      const thisYear = new Date(from.getFullYear(), ev.getMonth(), ev.getDate());
      if (thisYear >= from && thisYear <= to) list.push({ date: thisYear, label: e.name, meta: e.type });
    }
    for (const d of payDatesInRange(state.profile.payDate, from, to)) {
      list.push({ date: d, label: '💷 Pay day', meta: 'Salary in', color: '#22c55e' });
    }
    return list.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 10);
  }, [state]);

  const next = nextPayDate(state.profile.payDate);
  const daysToPay = daysUntilPay(state.profile.payDate);

  return (
    <div ref={ref}>
      <PageHeader
        title={state.profile.firstName ? `Welcome back, ${state.profile.firstName}` : 'Welcome'}
        subtitle="Your finance dashboard at a glance"
        actions={
          <>
            <button
              className="btn-secondary"
              onClick={() => setHidden(h => !h)}
              title={hidden ? 'Show figures' : 'Hide figures'}
              aria-pressed={!hidden}
              aria-label={hidden ? 'Show figures' : 'Hide figures'}
            >
              {hidden ? '👁️ Show' : '🙈 Hide'}
            </button>
            <SnapshotMenu targetEl={ref} />
            <Link to="/breakdown" className="btn-primary">Breakdown</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <StatCard label="Take-home / mo" value={fmtMoney(monthlyTakeHome)} hint={hidden ? '' : `Annual: ${fmtMoney(tax.takeHome)}`} accent="text-emerald-500" />
        <StatCard label="Outgoings / mo" value={fmtMoney(monthlyOut)} hint="Bills + debts + housing + overpayments" accent="text-rose-500" />
        <StatCard label="Saving / mo" value={fmtMoney(monthlySaving)} accent="text-sky-500" />
        <StatCard label="Remaining / mo" value={fmtMoney(remaining)} accent={remaining < 0 && !hidden ? 'text-red-600' : ''} hint={hidden ? '' : monthlySpending > 0 ? `After ${fmtMoney(monthlySpending)} spending` : undefined} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Total debt" value={fmtMoney(totalDebtBalance)} hint={hidden ? '' : monthlyOverpayments > 0 ? `Overpaying ${fmtMoney(monthlyOverpayments)}/mo` : undefined} accent="text-rose-500" />
        <StatCard
          label="This month's spending"
          value={fmtMoney(monthlySpending)}
          hint={hidden ? '' : spendingBudget > 0 ? `${Math.min(999, Math.round((monthlySpending / spendingBudget) * 100))}% of ${fmtMoney(spendingBudget)} budget` : 'No budget set'}
          accent={spendingBudget > 0 && monthlySpending > spendingBudget && !hidden ? 'text-rose-500' : 'text-amber-500'}
        />
        <StatCard label="Council Tax / mo" value={fmtMoney(monthlyCouncilTax)} hint={hidden ? '' : state.councilTax?.council || 'Not set'} />
      </div>

      {housingKind && monthlyHousing > 0 && (
        <div className="card card-pad mb-5 flex items-center gap-4">
          <div className="text-3xl">🏡</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{housingKind}</div>
            <div className="text-sm text-slate-500">
              {state.housing.type === 'mortgage' ? state.housing.mortgage?.provider : state.housing.rent?.provider}
              {' · '}{fmtMoney(monthlyHousing)} / mo
            </div>
          </div>
          <Link to="/bills" className="btn-ghost text-sm">Manage</Link>
        </div>
      )}

      {next && (
        <div className="card card-pad mb-5 flex items-center gap-4">
          <div className="text-3xl">💷</div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">Next pay day</div>
            <div className="text-sm text-slate-500">{format(next, 'EEEE d MMMM yyyy')}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-500 tabular-nums">{daysToPay === 0 ? 'Today' : `${daysToPay}d`}</div>
            <div className="text-xs text-slate-500">{daysToPay === 0 ? 'pay day' : daysToPay === 1 ? 'tomorrow' : 'to go'}</div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card card-pad">
          <div className="font-semibold mb-3">📅 Next 30 days</div>
          {upcoming.length === 0 ? (
            <div className="text-sm text-slate-500">No upcoming events.</div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {upcoming.map((u, i) => (
                <li key={i} className="py-2 flex items-center gap-3">
                  <span className="w-2 h-8 rounded" style={{ background: u.color ?? '#94a3b8' }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{u.label}</div>
                    <div className={`text-xs text-slate-500 ${hidden ? 'blur-sm select-none' : ''}`}>{u.meta}</div>
                  </div>
                  <div className="text-sm tabular-nums text-slate-600 dark:text-slate-300">{format(u.date, 'EEE d MMM')}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card card-pad">
          <div className="font-semibold mb-3">Calendar</div>
          <CalendarMini />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        <StatCard label="Income tax / yr" value={fmtMoney(tax.incomeTax)} />
        <StatCard label="National Insurance / yr" value={fmtMoney(tax.nationalInsurance)} />
        <StatCard label="Pension / yr" value={fmtMoney(tax.pension)} hint={hidden ? '' : `+ employer ${fmtMoney(tax.employerPension)}`} />
      </div>
    </div>
  );
}
