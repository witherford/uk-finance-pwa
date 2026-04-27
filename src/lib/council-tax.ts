import { CouncilTaxInfo } from '../types';

/**
 * Effective monthly cost after applying any single-occupancy discount when the
 * user-entered figure does NOT already include it.
 */
export function effectiveCouncilTaxMonthly(ct: CouncilTaxInfo | undefined): number {
  if (!ct || !ct.monthlyCost || ct.monthlyCost <= 0) return 0;
  if (!ct.singleOccupancyDiscount) return ct.monthlyCost;
  if (ct.costIncludesDiscount) return ct.monthlyCost;
  const pct = (ct.discountPct ?? 25) / 100;
  return Math.max(0, ct.monthlyCost * (1 - pct));
}

/**
 * Council tax is billed across N instalments (10 or 12) per UK council year.
 * For monthly cashflow we average across 12 months: annual / 12.
 */
export function councilTaxAnnual(ct: CouncilTaxInfo | undefined): number {
  if (!ct || !ct.monthlyCost || ct.monthlyCost <= 0) return 0;
  const months = ct.plan === '10-monthly' ? 10 : 12;
  const eff = effectiveCouncilTaxMonthly(ct);
  return eff * months;
}

export function councilTaxMonthlyAveraged(ct: CouncilTaxInfo | undefined): number {
  return councilTaxAnnual(ct) / 12;
}
