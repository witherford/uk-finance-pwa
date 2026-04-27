import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AppState, Frequency, Payment, PaymentKind } from '../types';

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
