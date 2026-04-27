import { differenceInDays, isValid, parseISO } from 'date-fns';
import { Employer, Profile, WageSlip } from '../types';

/**
 * Returns the start of the current UK tax year (6 April).
 */
export function taxYearStart(d: Date = new Date()): Date {
  const y = d.getMonth() < 3 || (d.getMonth() === 3 && d.getDate() < 6) ? d.getFullYear() - 1 : d.getFullYear();
  return new Date(y, 3, 6); // April = month 3
}

/**
 * Annualise YTD gross from a wage slip into a full-year figure based on days elapsed since 6 April.
 * Returns null if the slip date is invalid or YTD is non-positive.
 */
export function annualiseFromSlip(slip: WageSlip): number | null {
  if (!slip || !slip.payDate || typeof slip.payDate !== 'string') return null;
  let d: Date;
  try { d = parseISO(slip.payDate); } catch { return null; }
  if (!isValid(d) || !slip.ytdGross || slip.ytdGross <= 0) return null;
  const start = taxYearStart(d);
  const days = differenceInDays(d, start);
  if (days <= 0) return null;
  // Project: ytdGross / days * 365
  return (slip.ytdGross / days) * 365;
}

export function currentEmployer(employers: Employer[], on: Date = new Date()): Employer | undefined {
  const t = on.toISOString().slice(0, 10);
  // Pick the employer with no endDate, or the latest one whose dates contain `on`.
  const ongoing = employers.find(e => !e.endDate && e.startDate && e.startDate <= t);
  if (ongoing) return ongoing;
  return employers
    .filter(e => e.startDate && e.startDate <= t && (!e.endDate || e.endDate >= t))
    .sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? ''))[0];
}

export function latestSlip(employers: Employer[]): { slip: WageSlip; employer: Employer } | null {
  let best: { slip: WageSlip; employer: Employer } | null = null;
  for (const e of employers) {
    for (const s of e.wageSlips ?? []) {
      // Skip malformed slips (e.g. an import that left payDate empty) — they would crash downstream parseISO.
      if (!s || !s.payDate || typeof s.payDate !== 'string') continue;
      if (!best || s.payDate > best.slip.payDate) best = { slip: s, employer: e };
    }
  }
  return best;
}

/**
 * Returns the salary the rest of the app should use for tax calculations.
 * - manual: user typed `actualSalaryManual`, falls back to reference salary if empty
 * - auto: annualise YTD from latest wage slip; falls back to reference salary
 */
export function effectiveSalary(profile: Profile, employers: Employer[]): { value: number; source: 'manual' | 'auto' | 'reference'; meta?: string } {
  if (profile.actualSalaryMode === 'manual' && profile.actualSalaryManual && profile.actualSalaryManual > 0) {
    return { value: profile.actualSalaryManual, source: 'manual' };
  }
  if (profile.actualSalaryMode === 'auto') {
    const ls = latestSlip(employers);
    if (ls) {
      const annual = annualiseFromSlip(ls.slip);
      if (annual && annual > 0) {
        return { value: annual, source: 'auto', meta: `${ls.employer.name} · slip ${ls.slip.payDate}` };
      }
    }
  }
  return { value: profile.salary || 0, source: 'reference' };
}
