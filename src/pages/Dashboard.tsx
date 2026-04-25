import { useMemo, useRef } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { computeTax } from '../lib/uk-tax';
import { annualAmount, isActive, expandOccurrences } from '../lib/frequency';
import { Money, PageHeader, StatCard } from '../components/common';
import { CalendarMini } from '../components/CalendarMini';
import { addMonths, format } from 'date-fns';
import { captureElementToPng } from '../lib/screenshot';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const state = useFinanceStore(s => s.state);
  const ref = useRef<HTMLDivElement>(null);

  const tax = useMemo(() => computeTax(state.profile, state.sideIncomes), [state.profile, state.sideIncomes]);

  const monthlyOut = useMemo(() => {
    const now = new Date();
    return state.payments.filter(p => isActive(p, now) && p.kind !== 'saving')
      .reduce((s, p) => s + annualAmount(p.amount, p.frequency) / 12, 0);
  }, [state.payments]);

  const monthlySaving = useMemo(() => {
    const now = new Date();
    return state.payments.filter(p => isActive(p, now) && p.kind === 'saving')
      .reduce((s, p) => s + annualAmount(p.amount, p.frequency) / 12, 0);
  }, [state.payments]);

  const monthlyTakeHome = tax.takeHome / 12;
  const remaining = monthlyTakeHome - monthlyOut - monthlySaving;

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
    return list.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 8);
  }, [state]);

  return (
    <div ref={ref}>
      <PageHeader
        title={state.profile.firstName ? `Welcome back, ${state.profile.firstName}` : 'Welcome'}
        subtitle="Your finance dashboard at a glance"
        actions={
          <>
            <button className="btn-secondary" onClick={() => ref.current && captureElementToPng(ref.current, `finance-${format(new Date(), 'yyyy-MM-dd')}.png`)}>
              📸 Snapshot
            </button>
            <Link to="/breakdown" className="btn-primary">Breakdown</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Take-home / mo" value={new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(monthlyTakeHome)} hint={`Annual: £${tax.takeHome.toFixed(0)}`} accent="text-emerald-500" />
        <StatCard label="Outgoings / mo" value={new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(monthlyOut)} hint="Bills + debts" accent="text-rose-500" />
        <StatCard label="Saving / mo" value={new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(monthlySaving)} accent="text-sky-500" />
        <StatCard label="Remaining / mo" value={new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(remaining)} accent={remaining < 0 ? 'text-red-600' : ''} />
      </div>

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
                    <div className="text-xs text-slate-500">{u.meta}</div>
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
        <StatCard label="Income tax / yr" value={new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(tax.incomeTax)} />
        <StatCard label="National Insurance / yr" value={new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(tax.nationalInsurance)} />
        <StatCard label="Pension / yr" value={new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(tax.pension)} hint={`+ employer £${tax.employerPension.toFixed(0)}`} />
      </div>
    </div>
  );
}
