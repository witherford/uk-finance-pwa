import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AppState, Frequency, Payment, PaymentKind, WageSlip, Employer, YearlyEvent, YearlyEventType } from '../types';

export const SAMPLE_HEADERS = [
  'Kind', 'Category', 'Name', 'Provider', 'AccountRef',
  'Amount', 'Frequency', 'StartDate', 'EndDate', 'Notes'
];

// Debt-specific (Kind is implicit). Amount = monthly payment. Optional Balance, APR, MinPayment columns.
export const DEBT_HEADERS = [
  'Name', 'Category', 'Provider', 'AccountRef',
  'Amount', 'Frequency', 'StartDate', 'EndDate',
  'Balance', 'APR', 'MinPayment', 'Notes'
];

export const DEBT_SAMPLE_ROWS: string[][] = [
  ['Barclaycard',     'Credit card', 'Barclays',     '4000-1234-XXXX-9876', '75.00',  'monthly', '2025-01-20', '2027-06-20', '2400.00', '22.9', '50.00',  'Minimum + £25 over'],
  ['Personal loan',   'Loan',        'Santander',    'PL-001',              '180.00', 'monthly', '2024-06-01', '2027-05-01', '5800.00', '6.9',  '180.00', 'Fixed-term loan'],
  ['Car finance',     'Loan',        'BMW Finance',  'BMW-CF-7',            '295.00', 'monthly', '2024-01-15', '2028-01-15', '12500.00','9.4',  '295.00', 'PCP — balloon £8500 at end'],
  ['Klarna',          'Credit card', 'Klarna',       'K-9911',              '50.00',  'monthly', '2025-02-10', '2025-08-10', '300.00',  '0',    '50.00',  'Pay-in-3 plan'],
  ['Overdraft',       'Loan',        'Lloyds',       '00-00-00 / 12345678', '40.00',  'monthly', '2025-01-01', '',           '500.00',  '39.9', '40.00',  'Arranged overdraft'],
  ['Student loan',    'Loan',        'SLC',          'SLC-987654',          '0.00',   'monthly', '2018-09-01', '',           '24800.00','7.3',  '0.00',   'Plan 2 — auto via PAYE']
];

export const SAMPLE_ROWS: string[][] = [
  ['bill', 'Utilities', 'Electricity', 'Octopus Energy', 'ACC-12345', '85.00', 'monthly', '2025-01-01', '', 'Direct debit'],
  ['bill', 'Housing', 'Rent', 'Landlord', '', '1200.00', 'monthly', '2025-01-01', '2026-12-31', ''],
  ['debt', 'Credit card', 'Barclaycard', 'Barclays', '4000-XXXX', '75.00', 'monthly', '2025-01-20', '2027-06-20', ''],
  ['saving', 'Emergency fund', 'Easy access ISA', 'Marcus', 'GS-ISA-1', '200.00', 'monthly', '2025-01-01', '', '']
];

export function sampleCsv(): string {
  return Papa.unparse([SAMPLE_HEADERS, ...SAMPLE_ROWS]);
}

export function sampleXlsx(): Blob {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([SAMPLE_HEADERS, ...SAMPLE_ROWS]);
  XLSX.utils.book_append_sheet(wb, ws, 'Payments');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function sampleDebtsCsv(): string {
  return Papa.unparse([DEBT_HEADERS, ...DEBT_SAMPLE_ROWS]);
}

export function sampleDebtsXlsx(): Blob {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([DEBT_HEADERS, ...DEBT_SAMPLE_ROWS]);
  XLSX.utils.book_append_sheet(wb, ws, 'Debts');
  // helpful column widths
  (ws as any)['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 9 }, { wch: 11 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 6 }, { wch: 11 }, { wch: 30 }];
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export interface ParsedDebtRow {
  ok: boolean;
  reason?: string;
  payment?: Omit<Payment, 'id'> & { categoryName: string };
}

export function parseDebtRows(rows: Record<string, string>[]): ParsedDebtRow[] {
  return rows.map((r, i) => {
    const freq = String(r.Frequency ?? 'monthly').toLowerCase().trim() as Frequency;
    if (!VALID_FREQ.includes(freq)) return { ok: false, reason: `Row ${i + 2}: invalid Frequency "${r.Frequency}"` };
    const amount = parseFloat(String(r.Amount ?? '0'));
    if (!isFinite(amount)) return { ok: false, reason: `Row ${i + 2}: invalid Amount` };
    const name = String(r.Name ?? '').trim();
    if (!name) return { ok: false, reason: `Row ${i + 2}: missing Name` };

    const startDate = normaliseDate(r.StartDate) ?? new Date().toISOString().slice(0, 10);
    const endDateRaw = r.EndDate;
    const endDate = endDateRaw ? normaliseDate(endDateRaw) : null;
    if (endDateRaw && endDate === null) return { ok: false, reason: `Row ${i + 2}: invalid EndDate "${r.EndDate}" (use YYYY-MM-DD)` };

    // Optional debt-specific extras roll into Notes.
    const extras: string[] = [];
    const bal = parseFloat(String(r.Balance ?? ''));
    const apr = parseFloat(String(r.APR ?? ''));
    const minP = parseFloat(String(r.MinPayment ?? ''));
    if (isFinite(bal) && bal > 0) extras.push(`Balance £${bal.toLocaleString('en-GB')}`);
    if (isFinite(apr) && apr > 0) extras.push(`APR ${apr}%`);
    if (isFinite(minP) && minP > 0) extras.push(`Min £${minP.toFixed(2)}`);
    const userNotes = String(r.Notes ?? '').trim();
    const notes = [extras.join(' · '), userNotes].filter(Boolean).join(' — ') || undefined;

    return {
      ok: true,
      payment: {
        kind: 'debt',
        categoryId: '',
        categoryName: String(r.Category ?? '').trim() || 'Loan',
        name,
        provider: String(r.Provider ?? '').trim(),
        accountRef: String(r.AccountRef ?? '').trim(),
        amount,
        frequency: freq,
        startDate,
        endDate: endDate || undefined,
        notes
      }
    };
  });
}

export function backupDebtsCsv(state: AppState): Blob {
  const rows = state.payments.filter(p => p.kind === 'debt').map(p => {
    const cat = state.categories.find(c => c.id === p.categoryId)?.name ?? '';
    return [p.name, cat, p.provider, p.accountRef, p.amount, p.frequency, p.startDate, p.endDate ?? '', '', '', '', p.notes ?? ''];
  });
  return new Blob([Papa.unparse([DEBT_HEADERS, ...rows])], { type: 'text/csv' });
}

export function backupDebtsXlsx(state: AppState): Blob {
  const rows = state.payments.filter(p => p.kind === 'debt').map(p => {
    const cat = state.categories.find(c => c.id === p.categoryId)?.name ?? '';
    return { Name: p.name, Category: cat, Provider: p.provider, AccountRef: p.accountRef, Amount: p.amount, Frequency: p.frequency, StartDate: p.startDate, EndDate: p.endDate ?? '', Balance: '', APR: '', MinPayment: '', Notes: p.notes ?? '' };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { header: DEBT_HEADERS as any }), 'Debts');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const VALID_KINDS: PaymentKind[] = ['bill', 'debt', 'saving'];
const VALID_FREQ: Frequency[] = ['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'sixmonthly', 'yearly', 'oneoff'];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normaliseDate(input: unknown): string | null {
  if (input == null) return null;
  // Excel can pass a Date object, a serial number, or a string back.
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return input.toISOString().slice(0, 10);
  }
  if (typeof input === 'number') {
    // Excel serial date (days since 1899-12-30)
    if (!isFinite(input) || input <= 0) return null;
    const ms = (input - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  const s = String(input).trim();
  if (!s) return null;
  if (ISO_DATE_RE.test(s)) {
    const d = new Date(s + 'T00:00:00');
    return isNaN(d.getTime()) ? null : s;
  }
  // Try a few common formats (UK DD/MM/YYYY, US MM/DD/YYYY)
  const dmy = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const [_, a, b, y] = dmy;
    const yyyy = y.length === 2 ? '20' + y : y;
    // Assume DD/MM/YYYY (UK). If month > 12 try US.
    let day = parseInt(a, 10), mon = parseInt(b, 10);
    if (mon > 12 && day <= 12) { [day, mon] = [mon, day]; }
    if (mon < 1 || mon > 12 || day < 1 || day > 31) return null;
    const iso = `${yyyy}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d.getTime()) ? null : iso;
  }
  // Last resort
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export interface ParsedRow {
  ok: boolean;
  reason?: string;
  payment?: Omit<Payment, 'id'> & { categoryName: string };
}

export function parseRows(rows: Record<string, string>[]): ParsedRow[] {
  return rows.map((r, i) => {
    const kind = String(r.Kind ?? '').toLowerCase().trim() as PaymentKind;
    const freq = (String(r.Frequency ?? 'monthly')).toLowerCase().trim() as Frequency;
    if (!VALID_KINDS.includes(kind)) return { ok: false, reason: `Row ${i + 2}: invalid Kind "${r.Kind}"` };
    if (!VALID_FREQ.includes(freq)) return { ok: false, reason: `Row ${i + 2}: invalid Frequency "${r.Frequency}"` };
    const amount = parseFloat(String(r.Amount ?? '0'));
    if (!isFinite(amount)) return { ok: false, reason: `Row ${i + 2}: invalid Amount` };
    const name = String(r.Name ?? '').trim();
    if (!name) return { ok: false, reason: `Row ${i + 2}: missing Name` };
    const startDate = normaliseDate(r.StartDate) ?? new Date().toISOString().slice(0, 10);
    const endDateRaw = r.EndDate;
    const endDate = endDateRaw ? normaliseDate(endDateRaw) : null;
    if (endDateRaw && endDate === null) return { ok: false, reason: `Row ${i + 2}: invalid EndDate "${r.EndDate}" (use YYYY-MM-DD)` };
    return {
      ok: true,
      payment: {
        kind,
        categoryId: '',
        categoryName: String(r.Category ?? '').trim() || 'Uncategorised',
        name,
        provider: String(r.Provider ?? '').trim(),
        accountRef: String(r.AccountRef ?? '').trim(),
        amount,
        frequency: freq,
        startDate,
        endDate: endDate || undefined,
        notes: String(r.Notes ?? '').trim() || undefined
      }
    };
  });
}

export async function parseFile(file: File): Promise<Record<string, string>[]> {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    const text = await file.text();
    const r = Papa.parse(text, { header: true, skipEmptyLines: true });
    return r.data as Record<string, string>[];
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    // Coerce everything to strings so downstream parsers don't have to deal with
    // a mix of Date objects, numeric serials and strings.
    return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '', raw: false });
  }
  if (ext === 'json') {
    return [];
  }
  throw new Error('Unsupported file type: ' + ext);
}

export function backupJson(state: AppState): Blob {
  return new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
}

export function backupCsv(state: AppState): Blob {
  const rows = state.payments.map(p => {
    const cat = state.categories.find(c => c.id === p.categoryId)?.name ?? '';
    return [p.kind, cat, p.name, p.provider, p.accountRef, p.amount, p.frequency, p.startDate, p.endDate ?? '', p.notes ?? ''];
  });
  return new Blob([Papa.unparse([SAMPLE_HEADERS, ...rows])], { type: 'text/csv' });
}

export function backupXlsx(state: AppState): Blob {
  const wb = XLSX.utils.book_new();
  const paymentsRows = state.payments.map(p => {
    const cat = state.categories.find(c => c.id === p.categoryId)?.name ?? '';
    return { Kind: p.kind, Category: cat, Name: p.name, Provider: p.provider, AccountRef: p.accountRef, Amount: p.amount, Frequency: p.frequency, StartDate: p.startDate, EndDate: p.endDate ?? '', Notes: p.notes ?? '' };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsRows), 'Payments');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.categories), 'Categories');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.sideIncomes), 'SideIncomes');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.holidays), 'Holidays');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.yearlyEvents), 'YearlyEvents');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([state.profile]), 'Profile');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// =====================================================================
// Wage slips (CSV / XLSX)
// =====================================================================
export const WAGESLIP_HEADERS = [
  'PayDate', 'TaxCode', 'Gross', 'Net', 'YTDGross', 'YTDTax', 'YTDNi',
  'IncomeTax', 'NI', 'Pension', 'StudentLoan', 'OtherDeductions', 'Notes'
];
export const WAGESLIP_SAMPLE_ROWS: string[][] = [
  ['2025-04-30', '1257L', '3500.00', '2725.00', '3500.00',  '425.00',  '232.00', '425.00', '232.00', '175.00', '0',     '0', 'April pay'],
  ['2025-05-31', '1257L', '3500.00', '2725.00', '7000.00',  '850.00',  '464.00', '425.00', '232.00', '175.00', '0',     '0', ''],
  ['2025-06-30', '1257L', '3500.00', '2705.00', '10500.00', '1275.00', '696.00', '425.00', '232.00', '175.00', '20.00', '0', 'Plan 2 student loan starts'],
  ['2025-07-31', '1257L', '3700.00', '2845.00', '14200.00', '1735.00', '936.00', '460.00', '240.00', '185.00', '20.00', '0', 'Pay rise this month']
];

export function sampleWageSlipsCsv(): string { return Papa.unparse([WAGESLIP_HEADERS, ...WAGESLIP_SAMPLE_ROWS]); }
export function sampleWageSlipsXlsx(): Blob {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([WAGESLIP_HEADERS, ...WAGESLIP_SAMPLE_ROWS]), 'WageSlips');
  return new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export interface ParsedWageSlipRow {
  ok: boolean;
  reason?: string;
  slip?: Omit<WageSlip, 'id'>;
}

export function parseWageSlipRows(rows: Record<string, string>[]): ParsedWageSlipRow[] {
  return rows.map((r, i) => {
    const payDate = normaliseDate(r.PayDate);
    if (!payDate) return { ok: false, reason: `Row ${i + 2}: invalid PayDate "${r.PayDate}"` };
    const num = (k: string) => parseFloat(String(r[k] ?? '0'));
    const grossPay = num('Gross');
    const netPay = num('Net');
    const ytdGross = num('YTDGross');
    if (!isFinite(grossPay) || !isFinite(netPay) || !isFinite(ytdGross)) return { ok: false, reason: `Row ${i + 2}: invalid numeric fields` };
    return {
      ok: true,
      slip: {
        payDate,
        taxCode: String(r.TaxCode ?? '').trim() || '1257L',
        grossPay, netPay, ytdGross,
        ytdTax: num('YTDTax'), ytdNi: num('YTDNi'),
        incomeTax: num('IncomeTax'), ni: num('NI'), pension: num('Pension'),
        studentLoan: num('StudentLoan') > 0 ? num('StudentLoan') : undefined,
        otherDeductions: num('OtherDeductions') > 0 ? num('OtherDeductions') : undefined,
        notes: String(r.Notes ?? '').trim() || undefined
      }
    };
  });
}

export function backupWageSlipsCsv(employer: Employer): Blob {
  const rows = employer.wageSlips.map(s => [
    s.payDate, s.taxCode, s.grossPay, s.netPay, s.ytdGross, s.ytdTax, s.ytdNi,
    s.incomeTax, s.ni, s.pension, s.studentLoan ?? '', s.otherDeductions ?? '', s.notes ?? ''
  ]);
  return new Blob([Papa.unparse([WAGESLIP_HEADERS, ...rows])], { type: 'text/csv' });
}

export function backupWageSlipsXlsx(employer: Employer): Blob {
  const rows = employer.wageSlips.map(s => ({
    PayDate: s.payDate, TaxCode: s.taxCode, Gross: s.grossPay, Net: s.netPay, YTDGross: s.ytdGross, YTDTax: s.ytdTax, YTDNi: s.ytdNi,
    IncomeTax: s.incomeTax, NI: s.ni, Pension: s.pension, StudentLoan: s.studentLoan ?? '', OtherDeductions: s.otherDeductions ?? '', Notes: s.notes ?? ''
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { header: WAGESLIP_HEADERS as any }), 'WageSlips');
  return new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// =====================================================================
// Yearly events (CSV / XLSX)
// =====================================================================
export const YE_HEADERS = ['Name', 'Type', 'Date', 'Recurrence', 'Cost', 'Notes'];
export const YE_SAMPLE_ROWS: string[][] = [
  ['Mum’s birthday',       'birthday',  '2025-06-12', 'yearly', '50',     'Card + flowers'],
  ['Car service',          'service',   '2025-09-10', 'yearly', '180',    'Annual service'],
  ['Home insurance renew', 'insurance', '2025-11-01', 'yearly', '220',    'Combined buildings + contents'],
  ['One-off vet bill',     'other',     '2025-08-15', 'once',   '450',    '']
];

export function sampleYearlyEventsCsv(): string { return Papa.unparse([YE_HEADERS, ...YE_SAMPLE_ROWS]); }
export function sampleYearlyEventsXlsx(): Blob {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([YE_HEADERS, ...YE_SAMPLE_ROWS]), 'YearlyEvents');
  return new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const VALID_YE_TYPES: YearlyEventType[] = ['birthday', 'service', 'insurance', 'other'];

export interface ParsedYERow {
  ok: boolean;
  reason?: string;
  event?: Omit<YearlyEvent, 'id'>;
}

export function parseYearlyEventRows(rows: Record<string, string>[]): ParsedYERow[] {
  return rows.map((r, i) => {
    const name = String(r.Name ?? '').trim();
    if (!name) return { ok: false, reason: `Row ${i + 2}: missing Name` };
    const date = normaliseDate(r.Date);
    if (!date) return { ok: false, reason: `Row ${i + 2}: invalid Date "${r.Date}"` };
    const type = String(r.Type ?? 'other').toLowerCase().trim() as YearlyEventType;
    if (!VALID_YE_TYPES.includes(type)) return { ok: false, reason: `Row ${i + 2}: invalid Type "${r.Type}"` };
    const recurrence = String(r.Recurrence ?? 'yearly').toLowerCase().trim();
    if (recurrence !== 'yearly' && recurrence !== 'once') return { ok: false, reason: `Row ${i + 2}: invalid Recurrence "${r.Recurrence}" (use 'yearly' or 'once')` };
    const costRaw = String(r.Cost ?? '').trim();
    const cost = costRaw ? parseFloat(costRaw) : undefined;
    return {
      ok: true,
      event: { name, type, date, recurrence: recurrence as 'yearly' | 'once', cost: cost && isFinite(cost) ? cost : undefined, notes: String(r.Notes ?? '').trim() || undefined }
    };
  });
}

export function backupYearlyEventsCsv(state: AppState): Blob {
  const rows = state.yearlyEvents.map(e => [e.name, e.type, e.date, e.recurrence, e.cost ?? '', e.notes ?? '']);
  return new Blob([Papa.unparse([YE_HEADERS, ...rows])], { type: 'text/csv' });
}

export function backupYearlyEventsXlsx(state: AppState): Blob {
  const rows = state.yearlyEvents.map(e => ({ Name: e.name, Type: e.type, Date: e.date, Recurrence: e.recurrence, Cost: e.cost ?? '', Notes: e.notes ?? '' }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows, { header: YE_HEADERS as any }), 'YearlyEvents');
  return new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// =====================================================================
// Combined single-file backup (.xlsx with sheet per entity)
// =====================================================================
export function combinedXlsx(state: AppState): Blob {
  const wb = XLSX.utils.book_new();

  // Profile (single row, flattened)
  const profileFlat = {
    ...state.profile,
    studentLoanPlans: (state.profile.studentLoanPlans ?? []).join(','),
    payDate_mode: state.profile.payDate?.mode ?? 'none',
    payDate_dayOfMonth: state.profile.payDate?.dayOfMonth ?? '',
    payDate_weekday: state.profile.payDate?.weekday ?? '',
    payDate_anchorDate: state.profile.payDate?.anchorDate ?? '',
    payDate_rollFromWeekend: state.profile.payDate?.rollFromWeekend ?? ''
  } as any;
  delete profileFlat.payDate;
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([profileFlat]), 'Profile');

  // Categories
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.categories), 'Categories');

  // Payments (bills + debts + savings)
  const payments = state.payments.map(p => ({
    Id: p.id, Kind: p.kind, CategoryId: p.categoryId,
    CategoryName: state.categories.find(c => c.id === p.categoryId)?.name ?? '',
    Name: p.name, Provider: p.provider, AccountRef: p.accountRef,
    Amount: p.amount, Frequency: p.frequency, StartDate: p.startDate,
    EndDate: p.endDate ?? '', Notes: p.notes ?? ''
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payments), 'Payments');

  // Bill history (flattened with PaymentId column)
  const billHist: any[] = [];
  for (const p of state.payments) for (const h of p.history ?? []) {
    billHist.push({
      PaymentId: p.id, BillName: p.name, Provider: h.provider, StartDate: h.startDate, EndDate: h.endDate,
      Cadence: h.paymentCadence, Amount: h.amount,
      SettlementDate: h.settlementDate ?? '', SettlementAmount: h.settlementAmount ?? '',
      Notes: h.notes ?? ''
    });
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(billHist.length ? billHist : [{ PaymentId: '' }]), 'Bill_history');

  // Side incomes
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.sideIncomes.length ? state.sideIncomes : [{ id: '' }]), 'Side_incomes');

  // Holidays
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.holidays.length ? state.holidays : [{ id: '' }]), 'Holidays');

  // Yearly events
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.yearlyEvents.length ? state.yearlyEvents : [{ id: '' }]), 'Yearly_events');

  // Calculator memory
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.calcMemory.length ? state.calcMemory : [{ id: '' }]), 'Calc_memory');

  // Assets
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.assets.length ? state.assets : [{ id: '' }]), 'Assets');

  // Budgets
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.budgets.length ? state.budgets : [{ id: '' }]), 'Budgets');

  // Housing
  if (state.housing.mortgage) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Type: state.housing.type, ...state.housing.mortgage }]), 'Mortgage');
  if (state.housing.rent) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Type: state.housing.type, ...state.housing.rent }]), 'Rent');
  if (state.housing.tenancyHistory.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(state.housing.tenancyHistory), 'Tenancy_history');

  // Home + valuations
  if (state.home) {
    const { valuations, ...rest } = state.home;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([rest]), 'Home');
    if (valuations.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(valuations), 'Home_valuations');
  }

  // Employers (with WageSlips on a separate sheet)
  if (state.employers.length) {
    const empRows = state.employers.map(e => {
      const { wageSlips, ...rest } = e;
      return { ...rest, WageSlipCount: wageSlips.length };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empRows), 'Employers');
    const allSlips: any[] = [];
    for (const e of state.employers) {
      for (const s of e.wageSlips) allSlips.push({ EmployerId: e.id, EmployerName: e.name, ...s });
    }
    if (allSlips.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allSlips), 'Wage_slips');
  }

  // Meta
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
    schemaVersion: state.schemaVersion,
    exportedAt: new Date().toISOString(),
    appVersion: 'uk-finance-pwa'
  }]), 'Meta');

  return new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
