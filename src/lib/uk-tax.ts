import { Profile, SideIncome, StudentLoanPlan } from '../types';
import { annualAmount } from './frequency';

// Student loan thresholds & rates 2025/26 (rough public figures for guidance only).
export const STUDENT_LOAN: Record<Exclude<StudentLoanPlan, 'none'>, { threshold: number; rate: number; label: string }> = {
  plan1:    { threshold: 26_065, rate: 0.09, label: 'Plan 1 (started 1998–2012)' },
  plan2:    { threshold: 28_470, rate: 0.09, label: 'Plan 2 (started 2012–2023)' },
  plan4:    { threshold: 32_745, rate: 0.09, label: 'Plan 4 (Scotland)' },
  plan5:    { threshold: 25_000, rate: 0.09, label: 'Plan 5 (started 2023+)' },
  postgrad: { threshold: 21_000, rate: 0.06, label: 'Postgraduate Loan' }
};

export const MARRIAGE_ALLOWANCE = 1_260;

// 2025/26 tax year reference values (rUK + Scotland).
// All figures are guidance only, verify against gov.uk before relying on them.
export const BANDS = {
  personalAllowance: 12_570,
  paTaperStart: 100_000, // £1 PA loss per £2 over
  rUK: {
    basic: { upTo: 50_270, rate: 0.20 },
    higher: { upTo: 125_140, rate: 0.40 },
    additional: { rate: 0.45 }
  },
  scotland: {
    starter: { upTo: 14_876, rate: 0.19 },
    basic: { upTo: 26_561, rate: 0.20 },
    intermediate: { upTo: 43_662, rate: 0.21 },
    higher: { upTo: 75_000, rate: 0.42 },
    advanced: { upTo: 125_140, rate: 0.45 },
    top: { rate: 0.48 }
  },
  niClass1: {
    primaryThreshold: 12_570,
    upperEarningsLimit: 50_270,
    mainRate: 0.08,
    upperRate: 0.02
  },
  niClass2: { smallProfitsThreshold: 6_725, weekly: 3.45, weeksPerYear: 52 }, // Class 2 voluntary above SPT for 25/26
  niClass4: {
    lowerProfitsLimit: 12_570,
    upperProfitsLimit: 50_270,
    mainRate: 0.06,
    upperRate: 0.02
  }
} as const;

export interface TaxCodeInfo {
  raw: string;
  region: 'rUK' | 'Scotland' | 'Wales';
  personalAllowance: number;
  flatRate?: number; // BR/D0/D1/0T/NT
  noTax?: boolean; // NT
  isKCode?: boolean;
  kAddition?: number;
  nonCumulative?: boolean; // W1/M1/X
}

export function parseTaxCode(input: string, region: 'rUK' | 'Scotland' = 'rUK'): TaxCodeInfo {
  const code = (input || '').toUpperCase().trim();
  let region2: TaxCodeInfo['region'] = region;
  let body = code;
  if (body.startsWith('S')) { region2 = 'Scotland'; body = body.slice(1); }
  else if (body.startsWith('C')) { region2 = 'Wales'; body = body.slice(1); }

  const nonCumulative = / ?(W1|M1|X)$/.test(body);
  body = body.replace(/ ?(W1|M1|X)$/, '');

  const info: TaxCodeInfo = {
    raw: code,
    region: region2,
    personalAllowance: BANDS.personalAllowance,
    nonCumulative
  };

  if (body === 'BR') return { ...info, personalAllowance: 0, flatRate: 0.20 };
  if (body === 'D0') return { ...info, personalAllowance: 0, flatRate: 0.40 };
  if (body === 'D1') return { ...info, personalAllowance: 0, flatRate: 0.45 };
  if (body === '0T') return { ...info, personalAllowance: 0 };
  if (body === 'NT') return { ...info, personalAllowance: 0, noTax: true };

  // K codes: e.g. K475 -> add 4750 + 9 to taxable income, PA = 0
  const kMatch = body.match(/^K(\d+)$/);
  if (kMatch) {
    const n = parseInt(kMatch[1], 10);
    return { ...info, personalAllowance: 0, isKCode: true, kAddition: n * 10 + 9 };
  }

  // Standard suffix: digits + L/M/N/T
  const std = body.match(/^(\d+)([LMNT])?$/);
  if (std) {
    const n = parseInt(std[1], 10);
    return { ...info, personalAllowance: n * 10 + 9 };
  }
  return info;
}

function tieredTax(taxable: number, region: 'rUK' | 'Scotland' | 'Wales'): number {
  if (taxable <= 0) return 0;
  if (region === 'Scotland') {
    const b = BANDS.scotland;
    const tiers = [
      { upTo: b.starter.upTo, rate: b.starter.rate },
      { upTo: b.basic.upTo, rate: b.basic.rate },
      { upTo: b.intermediate.upTo, rate: b.intermediate.rate },
      { upTo: b.higher.upTo, rate: b.higher.rate },
      { upTo: b.advanced.upTo, rate: b.advanced.rate },
      { upTo: Infinity, rate: b.top.rate }
    ];
    let prev = 0, tax = 0, remaining = taxable;
    for (const t of tiers) {
      const slice = Math.min(remaining, t.upTo - prev);
      if (slice > 0) { tax += slice * t.rate; remaining -= slice; }
      prev = t.upTo;
      if (remaining <= 0) break;
    }
    return tax;
  }
  // rUK / Wales
  const b = BANDS.rUK;
  const tiers = [
    { upTo: b.basic.upTo, rate: b.basic.rate },
    { upTo: b.higher.upTo, rate: b.higher.rate },
    { upTo: Infinity, rate: b.additional.rate }
  ];
  let prev = 0, tax = 0, remaining = taxable;
  for (const t of tiers) {
    const slice = Math.min(remaining, t.upTo - prev);
    if (slice > 0) { tax += slice * t.rate; remaining -= slice; }
    prev = t.upTo;
    if (remaining <= 0) break;
  }
  return tax;
}

export function paAfterTaper(pa: number, totalIncome: number): number {
  if (totalIncome <= BANDS.paTaperStart) return pa;
  const reduction = Math.floor((totalIncome - BANDS.paTaperStart) / 2);
  return Math.max(0, pa - reduction);
}

export interface TaxResult {
  gross: number;
  taxableIncome: number;
  incomeTax: number;
  nationalInsurance: number;
  pension: number;
  employerPension: number;
  studentLoan: number;
  studentLoanByPlan: { plan: StudentLoanPlan; amount: number }[];
  takeHome: number;
  effectiveRate: number;
}

export function computeStudentLoan(plans: StudentLoanPlan[], salary: number): { total: number; perPlan: { plan: StudentLoanPlan; amount: number }[] } {
  const perPlan: { plan: StudentLoanPlan; amount: number }[] = [];
  let total = 0;
  for (const p of plans) {
    if (p === 'none') continue;
    const meta = STUDENT_LOAN[p];
    const amt = Math.max(0, (salary - meta.threshold)) * meta.rate;
    perPlan.push({ plan: p, amount: amt });
    total += amt;
  }
  return { total, perPlan };
}

export function computeTax(profile: Profile, sideIncomes: SideIncome[]): TaxResult {
  const salary = Math.max(0, profile.salary || 0);
  const sideTaxable = sideIncomes
    .filter(s => s.taxable)
    .reduce((sum, s) => sum + annualAmount(s.amount, s.frequency), 0);
  const sideUntaxed = sideIncomes
    .filter(s => !s.taxable)
    .reduce((sum, s) => sum + annualAmount(s.amount, s.frequency), 0);

  const grossAll = salary + sideTaxable + sideUntaxed;

  // Pension
  const pensionEmployee = (profile.pensionPct || 0) / 100 * salary;
  const employerPension = (profile.employerPensionPct || 0) / 100 * salary;

  let salaryForTax = salary;
  if (profile.pensionScheme === 'salary-sacrifice' || profile.pensionScheme === 'net-pay') {
    salaryForTax = salary - pensionEmployee;
  }

  const tc = parseTaxCode(profile.taxCode, profile.region);
  const region = tc.region === 'Wales' ? 'rUK' : tc.region;

  let taxable: number;
  let pa = paAfterTaper(tc.personalAllowance, salaryForTax + sideTaxable);
  // Marriage allowance: transferring spouse gives up £1,260 of PA; receiving spouse gets a tax reducer.
  if (profile.marriageAllowance === 'transferring') pa = Math.max(0, pa - MARRIAGE_ALLOWANCE);

  const sl = computeStudentLoan(profile.studentLoanPlans || [], salary);

  if (tc.noTax) {
    return {
      gross: grossAll, taxableIncome: 0, incomeTax: 0,
      nationalInsurance: 0, pension: pensionEmployee, employerPension,
      studentLoan: sl.total, studentLoanByPlan: sl.perPlan,
      takeHome: grossAll - pensionEmployee - sl.total, effectiveRate: 0
    };
  }
  if (tc.flatRate !== undefined) {
    taxable = salaryForTax + sideTaxable;
  } else if (tc.isKCode) {
    taxable = salaryForTax + sideTaxable + (tc.kAddition || 0);
  } else {
    taxable = Math.max(0, salaryForTax + sideTaxable - pa);
  }

  let incomeTax = tc.flatRate !== undefined
    ? Math.max(0, salaryForTax + sideTaxable) * tc.flatRate
    : tieredTax(taxable, region);

  // Marriage allowance receiver: tax reducer worth 20% of £1,260 (basic-rate only).
  if (profile.marriageAllowance === 'receiving') {
    incomeTax = Math.max(0, incomeTax - MARRIAGE_ALLOWANCE * 0.20);
  }

  // Salary-sacrifice / net-pay already reduced taxable; relief-at-source: basic-rate relief is
  // claimed by pension provider — for simplicity here, we don't model the higher-rate top-up.

  // NI
  let ni = 0;
  if (profile.employmentType === 'PAYE' || profile.employmentType === 'Both') {
    const niBand = BANDS.niClass1;
    const sBase = profile.pensionScheme === 'salary-sacrifice' ? salaryForTax : salary;
    if (sBase > niBand.primaryThreshold) {
      const upper = Math.min(sBase, niBand.upperEarningsLimit) - niBand.primaryThreshold;
      ni += upper * niBand.mainRate;
      if (sBase > niBand.upperEarningsLimit) {
        ni += (sBase - niBand.upperEarningsLimit) * niBand.upperRate;
      }
    }
  }
  if (profile.employmentType === 'SE' || profile.employmentType === 'Both') {
    const c4 = BANDS.niClass4;
    const profits = profile.employmentType === 'SE' ? salary : 0; // treat salary as SE profits when SE
    if (profits > c4.lowerProfitsLimit) {
      const upper = Math.min(profits, c4.upperProfitsLimit) - c4.lowerProfitsLimit;
      ni += upper * c4.mainRate;
      if (profits > c4.upperProfitsLimit) {
        ni += (profits - c4.upperProfitsLimit) * c4.upperRate;
      }
    }
  }

  const takeHome = grossAll - incomeTax - ni - pensionEmployee - sl.total;
  const effectiveRate = grossAll > 0 ? (incomeTax + ni + sl.total) / grossAll : 0;
  return {
    gross: grossAll,
    taxableIncome: taxable,
    incomeTax,
    nationalInsurance: ni,
    pension: pensionEmployee,
    employerPension,
    studentLoan: sl.total,
    studentLoanByPlan: sl.perPlan,
    takeHome,
    effectiveRate
  };
}
