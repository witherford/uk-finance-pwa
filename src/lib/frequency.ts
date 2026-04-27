import { Frequency, Payment } from '../types';
import { addDays, addMonths, addWeeks, addYears, isAfter, isBefore, parseISO } from 'date-fns';

export const FREQUENCIES: { value: Frequency; label: string; perYear: number }[] = [
  { value: 'daily', label: 'Daily', perYear: 365 },
  { value: 'weekly', label: 'Weekly', perYear: 52 },
  { value: 'fortnightly', label: 'Fortnightly', perYear: 26 },
  { value: 'monthly', label: 'Monthly', perYear: 12 },
  { value: 'quarterly', label: 'Quarterly (3 months)', perYear: 4 },
  { value: 'sixmonthly', label: 'Every 6 months', perYear: 2 },
  { value: 'yearly', label: 'Yearly', perYear: 1 },
  { value: 'oneoff', label: 'One-off', perYear: 0 }
];

export function freqLabel(f: Frequency): string {
  return FREQUENCIES.find(x => x.value === f)?.label ?? f;
}

export function annualAmount(amount: number, freq: Frequency): number {
  const f = FREQUENCIES.find(x => x.value === freq);
  if (!f) return 0;
  return amount * f.perYear;
}

export type PeriodKey = 'daily' | 'weekly' | 'fortnightly' | 'monthly' | 'yearly';

const PERIOD_PER_YEAR: Record<PeriodKey, number> = {
  daily: 365, weekly: 52, fortnightly: 26, monthly: 12, yearly: 1
};

export function convert(amount: number, from: Frequency, to: PeriodKey): number {
  return annualAmount(amount, from) / PERIOD_PER_YEAR[to];
}

export function periodise(annual: number, period: PeriodKey): number {
  return annual / PERIOD_PER_YEAR[period];
}

function step(date: Date, freq: Frequency): Date {
  switch (freq) {
    case 'daily': return addDays(date, 1);
    case 'weekly': return addWeeks(date, 1);
    case 'fortnightly': return addWeeks(date, 2);
    case 'monthly': return addMonths(date, 1);
    case 'quarterly': return addMonths(date, 3);
    case 'sixmonthly': return addMonths(date, 6);
    case 'yearly': return addYears(date, 1);
    case 'oneoff': return addYears(date, 1000);
  }
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

export function expandOccurrences(
  p: Payment | { amount: number; frequency: Frequency; startDate: string; endDate?: string },
  fromDate: Date,
  toDate: Date
): Date[] {
  const out: Date[] = [];
  if (!p || !p.startDate) return out;
  const start = parseISO(p.startDate);
  if (!isValidDate(start)) return out;
  const end = p.endDate ? parseISO(p.endDate) : null;
  if (end && !isValidDate(end)) return out;
  if (!isValidDate(fromDate) || !isValidDate(toDate)) return out;
  if (isAfter(fromDate, toDate)) return out;

  if (p.frequency === 'oneoff') {
    if (!isBefore(start, fromDate) && !isAfter(start, toDate)) out.push(start);
    return out;
  }
  let cur = new Date(start);
  // Hard safety cap — protects against any edge case (bad date math, future bugs)
  // that would otherwise spin the loop forever and crash the tab.
  const MAX_ITER = 10_000;
  let safety = 0;
  // fast-forward
  while (isBefore(cur, fromDate) && safety++ < MAX_ITER) {
    const next = step(cur, p.frequency);
    if (!isValidDate(next) || next.getTime() === cur.getTime()) return out;
    cur = next;
  }
  if (safety >= MAX_ITER) return out;
  safety = 0;
  while (!isAfter(cur, toDate) && safety++ < MAX_ITER) {
    if (end && isAfter(cur, end)) break;
    out.push(new Date(cur));
    const next = step(cur, p.frequency);
    if (!isValidDate(next) || next.getTime() === cur.getTime()) break;
    cur = next;
  }
  return out;
}

export function isActive(p: Payment, on: Date = new Date()): boolean {
  if (!p || !p.startDate) return false;
  const start = parseISO(p.startDate);
  if (!isValidDate(start)) return false;
  if (isAfter(start, on)) return false;
  if (p.endDate) {
    const end = parseISO(p.endDate);
    if (isValidDate(end) && isAfter(on, end)) return false;
  }
  return true;
}
