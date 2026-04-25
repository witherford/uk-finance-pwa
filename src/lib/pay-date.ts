import { PayDateConfig, PayDateMode, Weekday } from '../types';
import {
  addDays, addMonths, addWeeks, differenceInCalendarDays,
  endOfMonth, isAfter, isBefore, isSameDay, parseISO, startOfDay, startOfMonth, startOfWeek
} from 'date-fns';

export const PAY_DATE_OPTIONS: { value: PayDateMode; label: string; needsDay?: boolean; needsWeekday?: boolean; needsAnchor?: boolean }[] = [
  { value: 'none', label: 'No pay date set' },
  { value: 'fixed-day-of-month', label: 'Same date each month', needsDay: true },
  { value: 'last-working-day-of-month', label: 'Last working day of each month' },
  { value: 'first-working-day-of-month', label: 'First working day of each month' },
  { value: 'weekly', label: 'Weekly on a specific day', needsWeekday: true },
  { value: 'fortnightly', label: 'Fortnightly on a specific day', needsWeekday: true, needsAnchor: true },
  { value: 'last-working-day-of-week', label: 'Last working day of each week' },
  { value: 'first-working-day-of-week', label: 'First working day of each week' },
  { value: 'last-working-day-of-fortnight', label: 'Last working day of each fortnight', needsAnchor: true },
  { value: 'first-working-day-of-fortnight', label: 'First working day of each fortnight', needsAnchor: true }
];

export const WEEKDAY_LABELS: { value: Weekday; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
];

function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}

function rollFromWeekend(d: Date, dir: 'forward' | 'backward' = 'backward'): Date {
  while (isWeekend(d)) d = addDays(d, dir === 'forward' ? 1 : -1);
  return d;
}

function lastWorkingDayOfMonth(year: number, month: number): Date {
  let d = endOfMonth(new Date(year, month, 1));
  while (isWeekend(d)) d = addDays(d, -1);
  return startOfDay(d);
}

function firstWorkingDayOfMonth(year: number, month: number): Date {
  let d = startOfMonth(new Date(year, month, 1));
  while (isWeekend(d)) d = addDays(d, 1);
  return startOfDay(d);
}

function fixedDayOfMonth(year: number, month: number, day: number, dir: 'forward' | 'backward' = 'backward'): Date {
  const eom = endOfMonth(new Date(year, month, 1)).getDate();
  const dom = Math.min(day, eom);
  let d = new Date(year, month, dom);
  if (isWeekend(d)) d = rollFromWeekend(d, dir);
  return startOfDay(d);
}

function startOfWorkWeek(d: Date): Date {
  // ISO week starts Monday
  return startOfWeek(d, { weekStartsOn: 1 });
}

function lastWorkingDayOfWeek(d: Date): Date {
  // The Friday of the work-week containing d
  const start = startOfWorkWeek(d);
  return addDays(start, 4); // Mon=0 ... Fri=4
}

function firstWorkingDayOfWeek(d: Date): Date {
  return startOfWorkWeek(d); // Monday
}

function nextWeekday(from: Date, weekday: Weekday): Date {
  let d = startOfDay(from);
  const cur = d.getDay();
  let diff = (weekday - cur + 7) % 7;
  if (diff === 0) return d;
  return addDays(d, diff);
}

function fortnightAlignedTo(anchor: Date, candidate: Date): boolean {
  // returns true if candidate falls on the same fortnight cadence as anchor
  const days = Math.abs(differenceInCalendarDays(candidate, anchor));
  return days % 14 === 0;
}

/**
 * Returns the pay date that falls on or after `from`. Returns null if mode is 'none' or invalid config.
 */
export function nextPayDate(cfg: PayDateConfig, from: Date = new Date()): Date | null {
  if (!cfg || cfg.mode === 'none') return null;
  const f = startOfDay(from);
  switch (cfg.mode) {
    case 'fixed-day-of-month': {
      const day = cfg.dayOfMonth ?? 25;
      const dir = cfg.rollFromWeekend ?? 'backward';
      let d = fixedDayOfMonth(f.getFullYear(), f.getMonth(), day, dir);
      if (isBefore(d, f)) d = fixedDayOfMonth(f.getFullYear(), f.getMonth() + 1, day, dir);
      return d;
    }
    case 'last-working-day-of-month': {
      let d = lastWorkingDayOfMonth(f.getFullYear(), f.getMonth());
      if (isBefore(d, f)) d = lastWorkingDayOfMonth(f.getFullYear(), f.getMonth() + 1);
      return d;
    }
    case 'first-working-day-of-month': {
      let d = firstWorkingDayOfMonth(f.getFullYear(), f.getMonth());
      if (isBefore(d, f)) d = firstWorkingDayOfMonth(f.getFullYear(), f.getMonth() + 1);
      return d;
    }
    case 'weekly': {
      const wd = (cfg.weekday ?? 5) as Weekday;
      return nextWeekday(f, wd);
    }
    case 'fortnightly': {
      const wd = (cfg.weekday ?? 5) as Weekday;
      const anchor = cfg.anchorDate ? parseISO(cfg.anchorDate) : nextWeekday(f, wd);
      let d = nextWeekday(f, wd);
      // align with anchor on fortnight cadence; if not aligned, add a week
      if (!fortnightAlignedTo(anchor, d)) d = addWeeks(d, 1);
      return d;
    }
    case 'last-working-day-of-week': {
      const fri = lastWorkingDayOfWeek(f);
      return isBefore(fri, f) ? lastWorkingDayOfWeek(addDays(f, 7)) : fri;
    }
    case 'first-working-day-of-week': {
      const mon = firstWorkingDayOfWeek(f);
      return isBefore(mon, f) ? firstWorkingDayOfWeek(addDays(f, 7)) : mon;
    }
    case 'last-working-day-of-fortnight': {
      const anchor = cfg.anchorDate ? parseISO(cfg.anchorDate) : lastWorkingDayOfWeek(f);
      let d = lastWorkingDayOfWeek(f);
      if (isBefore(d, f) || !fortnightAlignedTo(anchor, d)) d = lastWorkingDayOfWeek(addDays(d, 7));
      if (!fortnightAlignedTo(anchor, d)) d = addWeeks(d, 1);
      return d;
    }
    case 'first-working-day-of-fortnight': {
      const anchor = cfg.anchorDate ? parseISO(cfg.anchorDate) : firstWorkingDayOfWeek(f);
      let d = firstWorkingDayOfWeek(f);
      if (isBefore(d, f) || !fortnightAlignedTo(anchor, d)) d = firstWorkingDayOfWeek(addDays(d, 7));
      if (!fortnightAlignedTo(anchor, d)) d = addWeeks(d, 1);
      return d;
    }
  }
}

/**
 * All pay dates within [from, to] inclusive.
 */
export function payDatesInRange(cfg: PayDateConfig, from: Date, to: Date): Date[] {
  if (!cfg || cfg.mode === 'none') return [];
  const out: Date[] = [];
  let d = nextPayDate(cfg, from);
  let safety = 0;
  while (d && !isAfter(d, to) && safety < 400) {
    safety++;
    out.push(d);
    // step forward minimally to find the next one
    let next = nextPayDate(cfg, addDays(d, 1));
    if (!next || (next && isSameDay(next, d))) break;
    d = next;
  }
  return out;
}

export function daysUntilPay(cfg: PayDateConfig, from: Date = new Date()): number | null {
  const d = nextPayDate(cfg, from);
  if (!d) return null;
  return differenceInCalendarDays(d, from);
}
