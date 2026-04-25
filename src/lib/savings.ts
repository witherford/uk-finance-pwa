import { PeriodKey } from './frequency';

export interface SavingsProjection {
  months: number;
  finalBalance: number;
  totalContributions: number;
  totalInterest: number;
  series: { month: number; balance: number; contributions: number }[];
}

const PER_YEAR: Record<PeriodKey, number> = {
  daily: 365, weekly: 52, fortnightly: 26, monthly: 12, yearly: 1
};

export function projectSavings(opts: {
  contribution: number;
  contributionPeriod: PeriodKey;
  years: number;
  annualRatePct: number;
  startBalance?: number;
}): SavingsProjection {
  const monthlyContribution = (opts.contribution * PER_YEAR[opts.contributionPeriod]) / 12;
  const monthlyRate = (opts.annualRatePct / 100) / 12;
  const months = Math.round(opts.years * 12);
  let balance = opts.startBalance ?? 0;
  let contributions = opts.startBalance ?? 0;
  const series: SavingsProjection['series'] = [{ month: 0, balance, contributions }];
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    contributions += monthlyContribution;
    series.push({ month: m, balance, contributions });
  }
  return {
    months,
    finalBalance: balance,
    totalContributions: contributions,
    totalInterest: balance - contributions,
    series
  };
}

export function projectPension(opts: {
  currentAge: number;
  retirementAge: number;
  salary: number;
  employeePct: number;
  employerPct: number;
  annualGrowthPct: number;
  startPot?: number;
}): SavingsProjection {
  const years = Math.max(0, opts.retirementAge - opts.currentAge);
  const annualContribution = opts.salary * (opts.employeePct + opts.employerPct) / 100;
  return projectSavings({
    contribution: annualContribution,
    contributionPeriod: 'yearly',
    years,
    annualRatePct: opts.annualGrowthPct,
    startBalance: opts.startPot ?? 0
  });
}
