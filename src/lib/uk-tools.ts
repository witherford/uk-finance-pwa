// UK Stamp Duty Land Tax (England & NI) bands — 2025/26 reference (post 1 April 2025).
// Always verify against gov.uk.
export interface SDLTOptions {
  price: number;
  firstTimeBuyer: boolean;
  additionalProperty: boolean;
}

const STANDARD_BANDS: { upTo: number; rate: number }[] = [
  { upTo: 125_000, rate: 0 },
  { upTo: 250_000, rate: 0.02 },
  { upTo: 925_000, rate: 0.05 },
  { upTo: 1_500_000, rate: 0.10 },
  { upTo: Infinity, rate: 0.12 }
];

const FTB_BANDS: { upTo: number; rate: number }[] = [
  { upTo: 300_000, rate: 0 },
  { upTo: 500_000, rate: 0.05 },
  { upTo: Infinity, rate: -1 } // FTB relief lost above £500,000 — fall back to standard
];

export function stampDuty(opts: SDLTOptions): { tax: number; effective: number; bands: { from: number; to: number; rate: number; tax: number }[] } {
  const { price, firstTimeBuyer, additionalProperty } = opts;
  const surcharge = additionalProperty ? 0.05 : 0; // 5% surcharge from late 2024
  const useFtb = firstTimeBuyer && price <= 500_000;
  const bands = useFtb ? FTB_BANDS : STANDARD_BANDS;
  let tax = 0;
  let prev = 0;
  const breakdown: { from: number; to: number; rate: number; tax: number }[] = [];
  for (const b of bands) {
    if (b.rate < 0) break;
    const top = Math.min(price, b.upTo);
    const slice = Math.max(0, top - prev);
    const slabTax = slice * (b.rate + surcharge);
    if (slice > 0) breakdown.push({ from: prev, to: top, rate: b.rate + surcharge, tax: slabTax });
    tax += slabTax;
    prev = b.upTo;
    if (price <= b.upTo) break;
  }
  return { tax, effective: price > 0 ? tax / price : 0, bands: breakdown };
}

// Mortgage repayment (capital + interest, monthly)
export function mortgageMonthly(principal: number, annualRatePct: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  const r = (annualRatePct / 100) / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

export function mortgageSchedule(principal: number, annualRatePct: number, years: number) {
  const monthly = mortgageMonthly(principal, annualRatePct, years);
  const r = (annualRatePct / 100) / 12;
  const n = years * 12;
  let balance = principal;
  let totalInterest = 0;
  const series: { month: number; balance: number; interest: number; principal: number }[] = [{ month: 0, balance, interest: 0, principal: 0 }];
  for (let m = 1; m <= n; m++) {
    const interest = balance * r;
    const cap = monthly - interest;
    balance = Math.max(0, balance - cap);
    totalInterest += interest;
    series.push({ month: m, balance, interest, principal: cap });
  }
  return { monthly, totalInterest, totalPaid: monthly * n, series };
}

// Debt payoff strategies
export interface DebtRow {
  id: string;
  name: string;
  balance: number;
  apr: number; // annual %
  minPayment: number;
}

export function payoffPlan(debts: DebtRow[], extraMonthly: number, strategy: 'avalanche' | 'snowball') {
  const list = debts.map(d => ({ ...d }));
  const order = (a: DebtRow, b: DebtRow) =>
    strategy === 'avalanche' ? b.apr - a.apr : a.balance - b.balance;
  const series: { month: number; total: number; perDebt: Record<string, number> }[] = [];
  let month = 0;
  let safety = 0;
  while (list.some(d => d.balance > 0) && safety < 1200) {
    safety++;
    month++;
    list.sort(order);
    let extra = extraMonthly;
    for (const d of list) {
      if (d.balance <= 0) continue;
      const interest = d.balance * (d.apr / 100) / 12;
      let pay = d.minPayment + (extra > 0 ? extra : 0);
      // only the top-priority active debt gets extra
      if (d !== list.find(x => x.balance > 0)) pay = d.minPayment;
      pay = Math.min(pay, d.balance + interest);
      d.balance = Math.max(0, d.balance + interest - pay);
      if (extra > 0 && d === list.find(x => x.balance > 0 || x.balance === 0)) extra = 0;
    }
    const total = list.reduce((s, d) => s + d.balance, 0);
    const perDebt: Record<string, number> = {};
    for (const d of list) perDebt[d.id] = d.balance;
    series.push({ month, total, perDebt });
    if (total === 0) break;
  }
  return { months: month, series };
}
