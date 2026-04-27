export type Frequency =
  | 'daily'
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | 'sixmonthly'
  | 'yearly'
  | 'oneoff';

export type EmploymentType = 'PAYE' | 'SE' | 'Both';
export type PensionScheme = 'relief-at-source' | 'net-pay' | 'salary-sacrifice' | 'none';
export type SortMode = 'category' | 'amount-asc' | 'amount-desc' | 'alpha' | 'due-date';
export type PaymentKind = 'bill' | 'debt' | 'saving';

export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgrad';

export type PayDateMode =
  | 'none'
  | 'fixed-day-of-month'           // e.g. 25th every month (rolls back if month doesn't have it)
  | 'last-working-day-of-month'
  | 'first-working-day-of-month'
  | 'weekly'                        // every week on weekday
  | 'fortnightly'                   // every other week on weekday, anchored
  | 'last-working-day-of-week'      // e.g. Friday usually
  | 'first-working-day-of-week'     // e.g. Monday usually
  | 'last-working-day-of-fortnight'
  | 'first-working-day-of-fortnight';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // Sun..Sat

export interface PayDateConfig {
  mode: PayDateMode;
  dayOfMonth?: number;   // 1..31 for fixed-day-of-month
  weekday?: Weekday;     // for weekly/fortnightly
  anchorDate?: string;   // ISO date — anchor for fortnightly cadence
  rollFromWeekend?: 'forward' | 'backward'; // for fixed-day-of-month if it lands on weekend
}

export interface Profile {
  firstName: string;
  themePref: 'light' | 'dark' | 'system';
  employmentType: EmploymentType;
  taxCode: string;
  salary: number;
  pensionPct: number;
  pensionScheme: PensionScheme;
  employerPensionPct: number;
  age: number;
  retirementAge: number;
  region: 'rUK' | 'Scotland';
  studentLoanPlans: StudentLoanPlan[];
  marriageAllowance: 'none' | 'transferring' | 'receiving';
  payDate: PayDateConfig;
  // Salary modes — `salary` above is the *reference* annual salary.
  actualSalaryMode: 'manual' | 'auto';
  actualSalaryManual?: number;
}

export interface SideIncome {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  taxable: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  kind: PaymentKind;
}

export interface BillHistoryEntry {
  id: string;
  provider: string;
  startDate: string;
  endDate: string;
  paymentCadence: 'monthly' | 'annual';
  amount: number;
  settlementDate?: string;
  settlementAmount?: number;
  notes?: string;
}

export interface Payment {
  id: string;
  kind: PaymentKind;
  categoryId: string;
  name: string;
  provider: string;
  accountRef: string;
  amount: number;
  frequency: Frequency;
  startDate: string; // ISO date
  endDate?: string;
  notes?: string;
  history?: BillHistoryEntry[];
  // Debt-only optional fields (used for total-debt, payoff strategies, overpayments).
  balance?: number;
  apr?: number;
  minPayment?: number;
  overpayment?: number; // extra £/month above the regular payment
}

export interface Holiday {
  id: string;
  name: string;
  destination: string;
  targetCost: number;
  targetDate: string;
  savedToDate: number;
}

export type YearlyEventType = 'birthday' | 'service' | 'insurance' | 'other';

export interface YearlyEvent {
  id: string;
  name: string;
  type: YearlyEventType;
  date: string;
  recurrence: 'once' | 'yearly';
  cost?: number;
  notes?: string;
}

export interface CalcMemory {
  id: string;
  label: string;
  expression: string;
  result: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  type: 'property' | 'cash' | 'investment' | 'pension' | 'vehicle' | 'other';
  value: number;
  notes?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
}

// ---- Housing ----
export type HousingType = 'none' | 'mortgage' | 'rent';
export type RateType = 'fixed' | 'flexible';

export interface MortgageInfo {
  costPerMonth: number;
  interestRatePct: number;
  rateType: RateType;
  provider: string;
  accountRef: string;
  termYears: number;
  startDate: string;
  endDate?: string;
  endDateOverridden?: boolean;
  notes?: string;
}

export interface RentInfo {
  costPerMonth: number;
  rateType: RateType;
  provider: string;
  accountRef: string;
  termMonths: number;
  startDate: string;
  endDate?: string;
  endDateOverridden?: boolean;
  notes?: string;
}

export interface TenancyHistoryEntry {
  id: string;
  provider: string;
  costPerMonth: number;
  startDate: string;
  endDate: string;
  termMonths: number;
  notes?: string;
}

export interface HousingState {
  type: HousingType;
  mortgage?: MortgageInfo;
  rent?: RentInfo;
  tenancyHistory: TenancyHistoryEntry[];
}

export type ValuationSource =
  | 'estate-agent'
  | 'survey'
  | 'self'
  | 'zoopla'
  | 'rightmove'
  | 'land-registry'
  | 'other';

export interface HomeValuation {
  id: string;
  yearMonth: string; // YYYY-MM
  value: number;
  source: ValuationSource;
  notes?: string;
}

export interface HomeRecord {
  purchasePrice: number;
  purchaseYearMonth: string;
  address?: string;
  valuations: HomeValuation[];
}

// ---- Council Tax ----
export type CouncilBand = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I';
export type CouncilPlan = '12-monthly' | '10-monthly';

export interface CouncilTaxInfo {
  council: string;
  band: CouncilBand;
  plan: CouncilPlan;
  accountRef: string;
  monthlyCost: number;
  costIncludesDiscount: boolean;
  singleOccupancyDiscount: boolean;
  discountPct: number;
  yearStartMonth: number; // 1..12, default 4 (April)
  notes?: string;
}

export interface CouncilTaxHistoryEntry {
  id: string;
  council: string;
  band: CouncilBand;
  plan: CouncilPlan;
  monthlyCost: number;
  startDate: string;
  endDate: string;
  notes?: string;
}

// ---- Spending ----
export interface SpendingAttachment {
  id: string;
  filename: string;
  mime: string;
  data: string; // base64 data URL
  bytes: number;
}

export interface SpendingWarranty {
  until?: string;
  provider?: string;
  notes?: string;
}

export interface SpendingEntry {
  id: string;
  name: string;
  amount: number;
  date: string;
  category: string;
  description?: string;
  retailer?: string;
  referenceUrl?: string;
  warranty?: SpendingWarranty;
  attachments: SpendingAttachment[];
}

// ---- Provider overrides ----
export interface ProviderOverride {
  // Keyed in the AppState.providerOverrides map by normalised lowercased name.
  name: string;
  domain?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

// ---- Employment ----
export type EmploymentKind = 'PAYE' | 'SE' | 'Director' | 'Contractor' | 'Other';

export interface WageSlip {
  id: string;
  payDate: string;
  taxCode: string;
  grossPay: number;
  netPay: number;
  ytdGross: number;
  ytdTax: number;
  ytdNi: number;
  incomeTax: number;
  ni: number;
  pension: number;
  studentLoan?: number;
  otherDeductions?: number;
  notes?: string;
}

export interface Employer {
  id: string;
  name: string;
  kind: EmploymentKind;
  startDate: string;
  endDate?: string;
  annualRefSalary: number;
  pensionPct?: number;
  employerPensionPct?: number;
  pensionScheme?: PensionScheme;
  pensionProvider?: string;
  pensionAccountRef?: string;
  notes?: string;
  wageSlips: WageSlip[];
}

export interface AppState {
  profile: Profile;
  sideIncomes: SideIncome[];
  categories: Category[];
  payments: Payment[];
  holidays: Holiday[];
  yearlyEvents: YearlyEvent[];
  calcMemory: CalcMemory[];
  assets: Asset[];
  budgets: Budget[];
  housing: HousingState;
  home?: HomeRecord;
  employers: Employer[];
  councilTax?: CouncilTaxInfo;
  councilTaxHistory: CouncilTaxHistoryEntry[];
  spending: SpendingEntry[];
  spendingMonthlyBudget?: number;
  providerOverrides: Record<string, ProviderOverride>;
  schemaVersion: number;
}

export const DEFAULT_PROFILE: Profile = {
  firstName: '',
  themePref: 'system',
  employmentType: 'PAYE',
  taxCode: '1257L',
  salary: 0,
  pensionPct: 0,
  pensionScheme: 'relief-at-source',
  employerPensionPct: 0,
  age: 30,
  retirementAge: 67,
  region: 'rUK',
  studentLoanPlans: [],
  marriageAllowance: 'none',
  payDate: { mode: 'none' },
  actualSalaryMode: 'manual'
};

export const DEFAULT_STATE: AppState = {
  profile: DEFAULT_PROFILE,
  sideIncomes: [],
  categories: [
    { id: 'cat-housing', name: 'Housing', color: '#0ea5e9', kind: 'bill' },
    { id: 'cat-utilities', name: 'Utilities', color: '#22c55e', kind: 'bill' },
    { id: 'cat-subscriptions', name: 'Subscriptions', color: '#a855f7', kind: 'bill' },
    { id: 'cat-insurance', name: 'Insurance', color: '#f59e0b', kind: 'bill' },
    { id: 'cat-transport', name: 'Transport', color: '#ef4444', kind: 'bill' },
    { id: 'cat-food', name: 'Food & Groceries', color: '#14b8a6', kind: 'bill' },
    { id: 'cat-cc', name: 'Credit card', color: '#e11d48', kind: 'debt' },
    { id: 'cat-loan', name: 'Loan', color: '#dc2626', kind: 'debt' },
    { id: 'cat-emergency', name: 'Emergency fund', color: '#10b981', kind: 'saving' },
    { id: 'cat-isa', name: 'ISA', color: '#06b6d4', kind: 'saving' }
  ],
  payments: [],
  holidays: [],
  yearlyEvents: [],
  calcMemory: [],
  assets: [],
  budgets: [],
  housing: { type: 'none', tenancyHistory: [] },
  employers: [],
  councilTaxHistory: [],
  spending: [],
  providerOverrides: {},
  schemaVersion: 4
};
