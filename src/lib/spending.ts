import { SpendingEntry, SpendingAttachment } from '../types';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB hard cap
export const SOFT_WARN_BYTES = 2 * 1024 * 1024;       // 2 MB soft warning

export function thisMonthSpending(entries: SpendingEntry[], on: Date = new Date()): number {
  const ym = on.getFullYear() * 100 + on.getMonth();
  return entries.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() * 100 + d.getMonth() === ym;
  }).reduce((s, e) => s + (e.amount || 0), 0);
}

export function spendingBetween(entries: SpendingEntry[], from: Date, to: Date): SpendingEntry[] {
  const f = from.toISOString().slice(0, 10);
  const t = to.toISOString().slice(0, 10);
  return entries.filter(e => e.date >= f && e.date <= t);
}

export function byCategory(entries: SpendingEntry[]): { name: string; total: number }[] {
  const m = new Map<string, number>();
  for (const e of entries) m.set(e.category || 'Uncategorised', (m.get(e.category || 'Uncategorised') ?? 0) + (e.amount || 0));
  return [...m.entries()].map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total);
}

export function byRetailer(entries: SpendingEntry[]): { name: string; total: number; count: number }[] {
  const m = new Map<string, { total: number; count: number }>();
  for (const e of entries) {
    if (!e.retailer) continue;
    const cur = m.get(e.retailer) ?? { total: 0, count: 0 };
    cur.total += e.amount || 0;
    cur.count += 1;
    m.set(e.retailer, cur);
  }
  return [...m.entries()].map(([name, v]) => ({ name, total: v.total, count: v.count })).sort((a, b) => b.total - a.total);
}

export function monthlyTrend(entries: SpendingEntry[], months = 12): { month: string; total: number }[] {
  const now = new Date();
  const buckets: { month: string; key: number; total: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ month: d.toISOString().slice(0, 7), key: d.getFullYear() * 100 + d.getMonth(), total: 0 });
  }
  for (const e of entries) {
    const d = new Date(e.date);
    const key = d.getFullYear() * 100 + d.getMonth();
    const b = buckets.find(x => x.key === key);
    if (b) b.total += e.amount || 0;
  }
  return buckets.map(b => ({ month: b.month, total: b.total }));
}

export async function fileToAttachment(file: File): Promise<SpendingAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Attachment too large (${(file.size / 1024 / 1024).toFixed(1)} MB > ${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB cap).`);
  }
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Failed to read file'));
    r.readAsDataURL(file);
  });
  return {
    id: crypto.randomUUID(),
    filename: file.name,
    mime: file.type,
    bytes: file.size,
    data
  };
}
