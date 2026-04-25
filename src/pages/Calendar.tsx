import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { PageHeader } from '../components/common';
import { addMonths, addDays, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, startOfDay } from 'date-fns';
import { expandOccurrences } from '../lib/frequency';
import { buildIcs } from '../lib/ics-export';
import { downloadBlob } from '../lib/import-export';
import { payDatesInRange } from '../lib/pay-date';
import { bankHolidaysInRange, resolveBHRegion } from '../lib/bank-holidays';

type View = 'week' | 'month' | 'quarter' | 'sixmonth' | 'year';

export function CalendarPage() {
  const state = useFinanceStore(s => s.state);
  const [view, setView] = useState<View>('month');
  const [cursor, setCursor] = useState(new Date());

  const range = useMemo(() => {
    const start = startOfDay(cursor);
    if (view === 'week') return { start: startOfWeek(start, { weekStartsOn: 1 }), end: endOfWeek(start, { weekStartsOn: 1 }) };
    if (view === 'month') return { start: startOfWeek(startOfMonth(start), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(start), { weekStartsOn: 1 }) };
    if (view === 'quarter') return { start: startOfMonth(start), end: endOfMonth(addMonths(start, 2)) };
    if (view === 'sixmonth') return { start: startOfMonth(start), end: endOfMonth(addMonths(start, 5)) };
    return { start: startOfMonth(start), end: endOfMonth(addMonths(start, 11)) };
  }, [view, cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { color?: string; label: string; meta: string }[]>();
    const push = (d: Date, label: string, meta: string, color?: string) => {
      const k = format(d, 'yyyy-MM-dd');
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push({ color, label, meta });
    };
    for (const p of state.payments) {
      const cat = state.categories.find(c => c.id === p.categoryId);
      for (const d of expandOccurrences(p, range.start, range.end)) {
        push(d, p.name, `£${p.amount.toFixed(2)} · ${cat?.name ?? p.kind}`, cat?.color);
      }
    }
    for (const e of state.yearlyEvents) {
      const ev = parseISO(e.date);
      const span = view === 'year' ? 1 : 1;
      for (let y = 0; y <= span; y++) {
        const d = new Date(range.start.getFullYear() + y, ev.getMonth(), ev.getDate());
        if (d >= range.start && d <= range.end) push(d, e.name, e.type);
      }
    }
    // Pay days
    for (const d of payDatesInRange(state.profile.payDate, range.start, range.end)) {
      push(d, '💷 Pay day', 'salary', '#22c55e');
    }
    // Bank holidays
    const bhRegion = resolveBHRegion(state.profile.region);
    for (const b of bankHolidaysInRange(bhRegion, range.start, range.end)) {
      push(parseISO(b.date), `🏛️ ${b.title}`, 'Bank holiday', '#f59e0b');
    }
    return map;
  }, [state, range, view]);

  const downloadICS = () => {
    try {
      const ics = buildIcs(state, 12);
      downloadBlob(new Blob([ics], { type: 'text/calendar' }), `finance-${format(new Date(), 'yyyy-MM-dd')}.ics`);
    } catch (e) {
      alert('Failed to build ICS: ' + (e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Upcoming bills, debts, savings, holidays and yearly events"
        actions={
          <>
            <select className="input !w-auto" value={view} onChange={e => setView(e.target.value as View)}>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="sixmonth">6 months</option>
              <option value="year">12 months</option>
            </select>
            <button className="btn-secondary" onClick={() => setCursor(c => view === 'week' ? addDays(c, -7) : addMonths(c, view === 'month' ? -1 : view === 'quarter' ? -3 : view === 'sixmonth' ? -6 : -12))}>‹</button>
            <button className="btn-ghost" onClick={() => setCursor(new Date())}>Today</button>
            <button className="btn-secondary" onClick={() => setCursor(c => view === 'week' ? addDays(c, 7) : addMonths(c, view === 'month' ? 1 : view === 'quarter' ? 3 : view === 'sixmonth' ? 6 : 12))}>›</button>
            <button className="btn-primary" onClick={downloadICS}>📥 Download .ics</button>
          </>
        }
      />

      {view === 'week' && <WeekView start={range.start} eventsByDay={eventsByDay} />}
      {view === 'month' && <MonthView cursor={cursor} eventsByDay={eventsByDay} />}
      {(view === 'quarter' || view === 'sixmonth' || view === 'year') && (
        <MultiMonthView startMonth={cursor} months={view === 'quarter' ? 3 : view === 'sixmonth' ? 6 : 12} eventsByDay={eventsByDay} />
      )}
    </div>
  );
}

function WeekView({ start, eventsByDay }: { start: Date; eventsByDay: Map<string, any[]> }) {
  const days = eachDayOfInterval({ start, end: addDays(start, 6) });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
      {days.map(d => {
        const events = eventsByDay.get(format(d, 'yyyy-MM-dd')) ?? [];
        const today = isSameDay(d, new Date());
        return (
          <div key={d.toISOString()} className={`card card-pad min-h-[160px] ${today ? 'ring-2 ring-brand-500' : ''}`}>
            <div className="text-xs uppercase tracking-wide text-slate-500">{format(d, 'EEE')}</div>
            <div className="font-bold text-lg">{format(d, 'd MMM')}</div>
            <ul className="mt-2 space-y-1">
              {events.map((e, i) => (
                <li key={i} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: e.color ?? '#0ea5e9' }} />
                  <span className="truncate">{e.label}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function MonthView({ cursor, eventsByDay }: { cursor: Date; eventsByDay: Map<string, any[]> }) {
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  return (
    <div>
      <div className="text-xl font-bold mb-2">{format(cursor, 'MMMM yyyy')}</div>
      <div className="grid grid-cols-7 gap-1 text-xs text-slate-500 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="px-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const events = eventsByDay.get(format(d, 'yyyy-MM-dd')) ?? [];
          const today = isSameDay(d, new Date());
          return (
            <div key={d.toISOString()} className={`min-h-[90px] p-1 rounded-md border ${isSameMonth(d, cursor) ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900' : 'border-transparent text-slate-400'} ${today ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="text-xs font-semibold">{format(d, 'd')}</div>
              <div className="space-y-0.5 mt-1">
                {events.slice(0, 3).map((e, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px] truncate">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.color ?? '#0ea5e9' }} />
                    <span className="truncate">{e.label}</span>
                  </div>
                ))}
                {events.length > 3 && <div className="text-[10px] text-slate-500">+{events.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MultiMonthView({ startMonth, months, eventsByDay }: { startMonth: Date; months: number; eventsByDay: Map<string, any[]> }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: months }, (_, i) => {
        const m = addMonths(startOfMonth(startMonth), i);
        const monthStart = startOfMonth(m);
        const monthEnd = endOfMonth(m);
        const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
        return (
          <div key={i} className="card card-pad">
            <div className="font-bold mb-2">{format(m, 'MMMM yyyy')}</div>
            <div className="grid grid-cols-7 gap-0.5 text-[10px]">
              {['M','T','W','T','F','S','S'].map((d, j) => <div key={j} className="text-center text-slate-500">{d}</div>)}
              {days.map(d => {
                const events = eventsByDay.get(format(d, 'yyyy-MM-dd')) ?? [];
                const inMonth = isSameMonth(d, m);
                const today = isSameDay(d, new Date());
                return (
                  <div key={d.toISOString()} className={`aspect-square text-center rounded ${inMonth ? '' : 'text-slate-400'} ${today ? 'bg-brand-500 text-white font-bold' : events.length ? 'bg-brand-100 dark:bg-brand-900/40' : ''}`}>
                    <div>{format(d, 'd')}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
