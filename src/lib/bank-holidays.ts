// UK bank holidays (2025-2027). Source: https://www.gov.uk/bank-holidays
// Static bundle so we work offline; we also try to refresh from gov.uk's JSON
// feed on first load and cache the result.

export type BHRegion = 'england-and-wales' | 'scotland' | 'northern-ireland';

export interface BankHoliday {
  date: string;          // ISO yyyy-mm-dd
  title: string;
  region: BHRegion;
  notes?: string;
}

// Hand-curated baseline. Only covers official bank holidays.
const STATIC: BankHoliday[] = [
  // ---- England & Wales 2025 ----
  { date: '2025-01-01', title: 'New Year’s Day', region: 'england-and-wales' },
  { date: '2025-04-18', title: 'Good Friday', region: 'england-and-wales' },
  { date: '2025-04-21', title: 'Easter Monday', region: 'england-and-wales' },
  { date: '2025-05-05', title: 'Early May bank holiday', region: 'england-and-wales' },
  { date: '2025-05-26', title: 'Spring bank holiday', region: 'england-and-wales' },
  { date: '2025-08-25', title: 'Summer bank holiday', region: 'england-and-wales' },
  { date: '2025-12-25', title: 'Christmas Day', region: 'england-and-wales' },
  { date: '2025-12-26', title: 'Boxing Day', region: 'england-and-wales' },
  // ---- England & Wales 2026 ----
  { date: '2026-01-01', title: 'New Year’s Day', region: 'england-and-wales' },
  { date: '2026-04-03', title: 'Good Friday', region: 'england-and-wales' },
  { date: '2026-04-06', title: 'Easter Monday', region: 'england-and-wales' },
  { date: '2026-05-04', title: 'Early May bank holiday', region: 'england-and-wales' },
  { date: '2026-05-25', title: 'Spring bank holiday', region: 'england-and-wales' },
  { date: '2026-08-31', title: 'Summer bank holiday', region: 'england-and-wales' },
  { date: '2026-12-25', title: 'Christmas Day', region: 'england-and-wales' },
  { date: '2026-12-28', title: 'Boxing Day (substitute day)', region: 'england-and-wales', notes: 'Substitute day (26 Dec is Saturday)' },
  // ---- England & Wales 2027 ----
  { date: '2027-01-01', title: 'New Year’s Day', region: 'england-and-wales' },
  { date: '2027-03-26', title: 'Good Friday', region: 'england-and-wales' },
  { date: '2027-03-29', title: 'Easter Monday', region: 'england-and-wales' },
  { date: '2027-05-03', title: 'Early May bank holiday', region: 'england-and-wales' },
  { date: '2027-05-31', title: 'Spring bank holiday', region: 'england-and-wales' },
  { date: '2027-08-30', title: 'Summer bank holiday', region: 'england-and-wales' },
  { date: '2027-12-27', title: 'Christmas Day (substitute)', region: 'england-and-wales' },
  { date: '2027-12-28', title: 'Boxing Day (substitute)', region: 'england-and-wales' },

  // ---- Scotland 2025 ----
  { date: '2025-01-01', title: 'New Year’s Day', region: 'scotland' },
  { date: '2025-01-02', title: '2nd January', region: 'scotland' },
  { date: '2025-04-18', title: 'Good Friday', region: 'scotland' },
  { date: '2025-05-05', title: 'Early May bank holiday', region: 'scotland' },
  { date: '2025-05-26', title: 'Spring bank holiday', region: 'scotland' },
  { date: '2025-08-04', title: 'Summer bank holiday', region: 'scotland' },
  { date: '2025-12-01', title: 'St Andrew’s Day (substitute)', region: 'scotland' },
  { date: '2025-12-25', title: 'Christmas Day', region: 'scotland' },
  { date: '2025-12-26', title: 'Boxing Day', region: 'scotland' },
  // ---- Scotland 2026 ----
  { date: '2026-01-01', title: 'New Year’s Day', region: 'scotland' },
  { date: '2026-01-02', title: '2nd January', region: 'scotland' },
  { date: '2026-04-03', title: 'Good Friday', region: 'scotland' },
  { date: '2026-05-04', title: 'Early May bank holiday', region: 'scotland' },
  { date: '2026-05-25', title: 'Spring bank holiday', region: 'scotland' },
  { date: '2026-08-03', title: 'Summer bank holiday', region: 'scotland' },
  { date: '2026-11-30', title: 'St Andrew’s Day', region: 'scotland' },
  { date: '2026-12-25', title: 'Christmas Day', region: 'scotland' },
  { date: '2026-12-28', title: 'Boxing Day (substitute)', region: 'scotland' },
  // ---- Scotland 2027 ----
  { date: '2027-01-01', title: 'New Year’s Day', region: 'scotland' },
  { date: '2027-01-04', title: '2nd January (substitute)', region: 'scotland' },
  { date: '2027-03-26', title: 'Good Friday', region: 'scotland' },
  { date: '2027-05-03', title: 'Early May bank holiday', region: 'scotland' },
  { date: '2027-05-31', title: 'Spring bank holiday', region: 'scotland' },
  { date: '2027-08-02', title: 'Summer bank holiday', region: 'scotland' },
  { date: '2027-11-30', title: 'St Andrew’s Day', region: 'scotland' },
  { date: '2027-12-27', title: 'Christmas Day (substitute)', region: 'scotland' },
  { date: '2027-12-28', title: 'Boxing Day (substitute)', region: 'scotland' },

  // ---- Northern Ireland 2025 ----
  { date: '2025-01-01', title: 'New Year’s Day', region: 'northern-ireland' },
  { date: '2025-03-17', title: 'St Patrick’s Day', region: 'northern-ireland' },
  { date: '2025-04-18', title: 'Good Friday', region: 'northern-ireland' },
  { date: '2025-04-21', title: 'Easter Monday', region: 'northern-ireland' },
  { date: '2025-05-05', title: 'Early May bank holiday', region: 'northern-ireland' },
  { date: '2025-05-26', title: 'Spring bank holiday', region: 'northern-ireland' },
  { date: '2025-07-14', title: 'Battle of the Boyne (substitute)', region: 'northern-ireland' },
  { date: '2025-08-25', title: 'Summer bank holiday', region: 'northern-ireland' },
  { date: '2025-12-25', title: 'Christmas Day', region: 'northern-ireland' },
  { date: '2025-12-26', title: 'Boxing Day', region: 'northern-ireland' },
  // ---- Northern Ireland 2026 ----
  { date: '2026-01-01', title: 'New Year’s Day', region: 'northern-ireland' },
  { date: '2026-03-17', title: 'St Patrick’s Day', region: 'northern-ireland' },
  { date: '2026-04-03', title: 'Good Friday', region: 'northern-ireland' },
  { date: '2026-04-06', title: 'Easter Monday', region: 'northern-ireland' },
  { date: '2026-05-04', title: 'Early May bank holiday', region: 'northern-ireland' },
  { date: '2026-05-25', title: 'Spring bank holiday', region: 'northern-ireland' },
  { date: '2026-07-13', title: 'Battle of the Boyne (substitute)', region: 'northern-ireland' },
  { date: '2026-08-31', title: 'Summer bank holiday', region: 'northern-ireland' },
  { date: '2026-12-25', title: 'Christmas Day', region: 'northern-ireland' },
  { date: '2026-12-28', title: 'Boxing Day (substitute)', region: 'northern-ireland' },
  // ---- Northern Ireland 2027 ----
  { date: '2027-01-01', title: 'New Year’s Day', region: 'northern-ireland' },
  { date: '2027-03-17', title: 'St Patrick’s Day', region: 'northern-ireland' },
  { date: '2027-03-26', title: 'Good Friday', region: 'northern-ireland' },
  { date: '2027-03-29', title: 'Easter Monday', region: 'northern-ireland' },
  { date: '2027-05-03', title: 'Early May bank holiday', region: 'northern-ireland' },
  { date: '2027-05-31', title: 'Spring bank holiday', region: 'northern-ireland' },
  { date: '2027-07-12', title: 'Battle of the Boyne', region: 'northern-ireland' },
  { date: '2027-08-30', title: 'Summer bank holiday', region: 'northern-ireland' },
  { date: '2027-12-27', title: 'Christmas Day (substitute)', region: 'northern-ireland' },
  { date: '2027-12-28', title: 'Boxing Day (substitute)', region: 'northern-ireland' }
];

const CACHE_KEY = 'bankHolidaysFeed';
const CACHE_TIME_KEY = 'bankHolidaysFetchedAt';
const ONE_WEEK = 7 * 24 * 3600 * 1000;

interface GovFeed {
  'england-and-wales': { events: { date: string; title: string; notes?: string }[] };
  'scotland': { events: { date: string; title: string; notes?: string }[] };
  'northern-ireland': { events: { date: string; title: string; notes?: string }[] };
}

function fromFeed(feed: GovFeed): BankHoliday[] {
  const out: BankHoliday[] = [];
  (Object.keys(feed) as BHRegion[]).forEach(region => {
    for (const e of feed[region]?.events ?? []) {
      out.push({ date: e.date, title: e.title, notes: e.notes, region });
    }
  });
  return out;
}

let cached: BankHoliday[] | null = null;

export function getBankHolidays(): BankHoliday[] {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BankHoliday[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        cached = parsed;
        return parsed;
      }
    }
  } catch {}
  cached = STATIC;
  return STATIC;
}

export async function refreshBankHolidays(): Promise<void> {
  const last = parseInt(localStorage.getItem(CACHE_TIME_KEY) ?? '0', 10);
  if (Date.now() - last < ONE_WEEK) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    const r = await fetch('https://www.gov.uk/bank-holidays.json', { cache: 'force-cache' });
    if (!r.ok) return;
    const feed = (await r.json()) as GovFeed;
    const list = fromFeed(feed);
    if (list.length === 0) return;
    cached = list;
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
    localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
  } catch {
    // offline or CORS — fall back to bundled
  }
}

export function bankHolidaysForRegion(region: BHRegion): BankHoliday[] {
  return getBankHolidays().filter(b => b.region === region);
}

export function bankHolidaysInRange(region: BHRegion, from: Date, to: Date): BankHoliday[] {
  const f = from.toISOString().slice(0, 10);
  const t = to.toISOString().slice(0, 10);
  return bankHolidaysForRegion(region).filter(b => b.date >= f && b.date <= t);
}

export function isBankHoliday(date: Date, region: BHRegion): boolean {
  const iso = date.toISOString().slice(0, 10);
  return bankHolidaysForRegion(region).some(b => b.date === iso);
}

// Map app `profile.region` (rUK | Scotland) to a BHRegion. NI users can pick via setting later.
export function resolveBHRegion(appRegion: 'rUK' | 'Scotland', niOverride?: boolean): BHRegion {
  if (appRegion === 'Scotland') return 'scotland';
  if (niOverride) return 'northern-ireland';
  return 'england-and-wales';
}
