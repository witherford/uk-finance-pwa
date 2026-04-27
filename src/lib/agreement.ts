import { addMonths, addYears, parseISO, isValid } from 'date-fns';

export function endDateFromYears(startISO: string, years: number): string | undefined {
  const d = parseISO(startISO);
  if (!isValid(d) || !isFinite(years) || years <= 0) return undefined;
  const end = addYears(d, Math.round(years));
  return end.toISOString().slice(0, 10);
}

export function endDateFromMonths(startISO: string, months: number): string | undefined {
  const d = parseISO(startISO);
  if (!isValid(d) || !isFinite(months) || months <= 0) return undefined;
  const end = addMonths(d, Math.round(months));
  return end.toISOString().slice(0, 10);
}

export function termFromDates(startISO: string, endISO: string): { months: number; years: number } | null {
  const s = parseISO(startISO);
  const e = parseISO(endISO);
  if (!isValid(s) || !isValid(e)) return null;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return { months, years: months / 12 };
}
