import { createEvents, EventAttributes } from 'ics';
import { AppState } from '../types';
import { expandOccurrences } from './frequency';
import { payDatesInRange } from './pay-date';
import { bankHolidaysInRange, resolveBHRegion } from './bank-holidays';
import { addYears, parseISO } from 'date-fns';

function toIcsDate(d: Date): [number, number, number] {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()];
}

export function buildIcs(state: AppState, monthsAhead = 12): string {
  const from = new Date();
  const to = addYears(from, monthsAhead / 12);
  const events: EventAttributes[] = [];

  for (const p of state.payments) {
    const cat = state.categories.find(c => c.id === p.categoryId)?.name ?? '';
    for (const occ of expandOccurrences(p, from, to)) {
      events.push({
        title: `${p.kind === 'saving' ? '💰' : p.kind === 'debt' ? '💳' : '🧾'} ${p.name} £${p.amount.toFixed(2)}`,
        start: toIcsDate(occ),
        duration: { days: 1 },
        description: `${cat}${p.provider ? ` · ${p.provider}` : ''}${p.accountRef ? ` · ${p.accountRef}` : ''}${p.notes ? `\n${p.notes}` : ''}`,
        categories: [cat || p.kind]
      });
    }
  }

  for (const e of state.yearlyEvents) {
    const base = parseISO(e.date);
    const seeds = e.recurrence === 'yearly'
      ? Array.from({ length: monthsAhead / 12 + 1 }, (_, i) => new Date(from.getFullYear() + i, base.getMonth(), base.getDate()))
      : [base];
    for (const occ of seeds) {
      if (occ < from || occ > to) continue;
      events.push({
        title: `🎈 ${e.name}${e.cost ? ` £${e.cost.toFixed(2)}` : ''}`,
        start: toIcsDate(occ),
        duration: { days: 1 },
        description: e.notes ?? e.type
      });
    }
  }

  for (const h of state.holidays) {
    const d = parseISO(h.targetDate);
    if (d < from || d > to) continue;
    events.push({
      title: `✈️ ${h.name} ${h.destination ? `(${h.destination})` : ''}`,
      start: toIcsDate(d),
      duration: { days: 1 },
      description: `Target £${h.targetCost.toFixed(2)}, saved £${h.savedToDate.toFixed(2)}`
    });
  }

  for (const d of payDatesInRange(state.profile.payDate, from, to)) {
    events.push({
      title: '💷 Pay day',
      start: toIcsDate(d),
      duration: { days: 1 },
      description: 'Salary expected',
      categories: ['salary']
    });
  }

  for (const b of bankHolidaysInRange(resolveBHRegion(state.profile.region), from, to)) {
    events.push({
      title: `🏛️ ${b.title}`,
      start: toIcsDate(parseISO(b.date)),
      duration: { days: 1 },
      description: `UK bank holiday${b.notes ? ` — ${b.notes}` : ''}`,
      categories: ['bank-holiday']
    });
  }

  const { error, value } = createEvents(events);
  if (error || !value) throw error ?? new Error('Failed to build ICS');
  return value;
}
