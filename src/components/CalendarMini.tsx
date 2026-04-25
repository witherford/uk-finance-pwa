import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { expandOccurrences } from '../lib/frequency';
import { payDatesInRange } from '../lib/pay-date';

export function CalendarMini() {
  const state = useFinanceStore(s => s.state);
  const [cursor, setCursor] = useState(new Date());

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { color?: string; label: string }[]>();
    const push = (d: Date, label: string, color?: string) => {
      const k = format(d, 'yyyy-MM-dd');
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push({ color, label });
    };
    for (const p of state.payments) {
      const cat = state.categories.find(c => c.id === p.categoryId);
      for (const d of expandOccurrences(p, gridStart, gridEnd)) {
        push(d, p.name, cat?.color);
      }
    }
    for (const e of state.yearlyEvents) {
      const ev = parseISO(e.date);
      const inThisYear = new Date(cursor.getFullYear(), ev.getMonth(), ev.getDate());
      if (inThisYear >= gridStart && inThisYear <= gridEnd) push(inThisYear, e.name);
    }
    for (const d of payDatesInRange(state.profile.payDate, gridStart, gridEnd)) {
      push(d, '💷 Pay day', '#22c55e');
    }
    return map;
  }, [state, gridStart, gridEnd, cursor]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button className="btn-ghost" onClick={() => setCursor(c => subMonths(c, 1))}>‹</button>
        <div className="font-semibold">{format(cursor, 'MMMM yyyy')}</div>
        <button className="btn-ghost" onClick={() => setCursor(c => addMonths(c, 1))}>›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-center text-slate-500 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const k = format(d, 'yyyy-MM-dd');
          const events = eventsByDay.get(k) ?? [];
          const today = isSameDay(d, new Date());
          return (
            <div key={k} className={`aspect-square rounded-md border text-xs p-1 flex flex-col gap-0.5 ${isSameMonth(d, cursor) ? 'border-slate-200 dark:border-slate-800' : 'border-transparent text-slate-400'} ${today ? 'ring-2 ring-brand-500' : ''}`}>
              <div className="font-semibold">{format(d, 'd')}</div>
              <div className="flex flex-wrap gap-0.5">
                {events.slice(0, 3).map((e, i) => (
                  <span key={i} title={e.label} className="w-1.5 h-1.5 rounded-full" style={{ background: e.color ?? '#0ea5e9' }} />
                ))}
                {events.length > 3 && <span className="text-[10px] text-slate-500">+{events.length - 3}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
