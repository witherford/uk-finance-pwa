import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { AppState, Frequency, Payment, PaymentKind } from '../types';

export const SAMPLE_HEADERS = [
  'Kind', 'Category', 'Name', 'Provider', 'AccountRef',
  'Amount', 'Frequency', 'StartDate', 'EndDate', 'Notes'
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
