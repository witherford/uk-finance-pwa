import { addMonths, addYears, parseISO, isValid } from 'date-fns';

function safeParseISO(iso: string | undefined | null): Date | null {
  if (!iso || typeof iso !== 'string') return null;
  try {
    const d = parseISO(iso);
    return isValid(d) ? d : null;
  } catch { return null; }
}

export function endDateFromYears(startISO: string | undefined, years: number): string | undefined {
  const d = safeParseISO(startISO);
  if (!d || !isFinite(years) || years <= 0) return undefined;
  const end = addYears(d, Math.round(years));
  return end.toISOString().slice(0, 10);
}

export function endDateFromMonths(startISO: string | undefined, months: number): string | undefined {
  const d = safeParseISO(startISO);
  if (!d || !isFinite(months) || months <= 0) return undefined;
  const end = addMonths(d, Math.round(months));
  return end.toISOString().slice(0, 10);
}

export function termFromDates(startISO: string | undefined, endISO: string | undefined): { months: number; years: number } | null {
  const s = safeParseISO(startISO);
  const e = safeParseISO(endISO);
  if (!s || !e) return null;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return { months, years: months / 12 };
}
