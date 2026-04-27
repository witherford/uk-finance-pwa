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
    const freq = (r.Frequency || 'monthly').toString().toLowerCase().trim() as Frequency;
    if (!VALID_FREQ.includes(freq)) return { ok: false, reason: `Row ${i + 2}: invalid Frequency "${r.Frequency}"` };
    const amount = parseFloat(r.Amount || '0');
    if (!isFinite(amount)) return { ok: false, reason: `Row ${i + 2}: invalid Amount` };
    const name = (r.Name || '').toString().trim();
    if (!name) return { ok: false, reason: `Row ${i + 2}: missing Name` };

    // Roll Balance/APR/MinPayment into Notes if provided (existing model has no native fields).
    const extras: string[] = [];
    if (r.Balance && parseFloat(r.Balance) > 0) extras.push(`Balance £${parseFloat(r.Balance).toLocaleString('en-GB')}`);
    if (r.APR && parseFloat(r.APR) > 0) extras.push(`APR ${parseFloat(r.APR)}%`);
    if (r.MinPayment && parseFloat(r.MinPayment) > 0) extras.push(`Min £${parseFloat(r.MinPayment).toFixed(2)}`);
    const notes = [extras.join(' · '), r.Notes || ''].filter(Boolean).join(' — ') || undefined;

    return {
      ok: true,
      payment: {
        kind: 'debt',
        categoryId: '',
        categoryName: r.Category || 'Loan',
        name,
        provider: r.Provider || '',
        accountRef: r.AccountRef || '',
        amount,
        frequency: freq,
        startDate: r.StartDate || new Date().toISOString().slice(0, 10),
        endDate: r.EndDate || undefined,
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

export interface ParsedRow {
  ok: boolean;
  reason?: string;
  payment?: Omit<Payment, 'id'> & { categoryName: string };
}

export function parseRows(rows: Record<string, string>[]): ParsedRow[] {
  return rows.map((r, i) => {
    const kind = (r.Kind || '').toLowerCase().trim() as PaymentKind;
    const freq = (r.Frequency || 'monthly').toLowerCase().trim() as Frequency;
    if (!VALID_KINDS.includes(kind)) return { ok: false, reason: `Row ${i + 2}: invalid Kind "${r.Kind}"` };
    if (!VALID_FREQ.includes(freq)) return { ok: false, reason: `Row ${i + 2}: invalid Frequency "${r.Frequency}"` };
    const amount = parseFloat(r.Amount || '0');
    if (!isFinite(amount)) return { ok: false, reason: `Row ${i + 2}: invalid Amount` };
    if (!r.Name) return { ok: false, reason: `Row ${i + 2}: missing Name` };
    return {
      ok: true,
      payment: {
        kind,
        categoryId: '',
        categoryName: r.Category || 'Uncategorised',
        name: r.Name,
        provider: r.Provider || '',
        accountRef: r.AccountRef || '',
        amount,
        frequency: freq,
        startDate: r.StartDate || new Date().toISOString().slice(0, 10),
        endDate: r.EndDate || undefined,
        notes: r.Notes || undefined
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
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
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
