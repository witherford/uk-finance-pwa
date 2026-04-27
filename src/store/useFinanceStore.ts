import { create } from 'zustand';
import { AppState, DEFAULT_STATE, DEFAULT_PROFILE, Category, Payment, SideIncome, Holiday, YearlyEvent, CalcMemory, Profile, Asset, Budget } from '../types';
import { db, loadVault, saveVault, wipeVault, VaultRecord } from './db';
import { seal, unseal } from './encryption';

type Mutator = (s: AppState) => AppState;

interface UnlockState {
  hasVault: boolean;
  encrypted: boolean;
  unlocked: boolean;
  password?: string;
  bootstrapped: boolean;
  error?: string;
}

interface Store {
  state: AppState;
  unlock: UnlockState;
  bootstrap: () => Promise<void>;
  unlockWith: (password: string) => Promise<boolean>;
  setPassword: (password: string) => Promise<void>;
  removePassword: (currentPassword: string) => Promise<boolean>;
  wipeAll: () => Promise<void>;
  startFresh: () => Promise<void>;
  apply: (m: Mutator) => void;
  setProfile: (p: Partial<Profile>) => void;
  // categories
  addCategory: (c: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  // payments
  addPayment: (p: Omit<Payment, 'id'>) => void;
  updatePayment: (id: string, patch: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  // side incomes
  addSideIncome: (s: Omit<SideIncome, 'id'>) => void;
  updateSideIncome: (id: string, patch: Partial<SideIncome>) => void;
  deleteSideIncome: (id: string) => void;
  // holidays
  addHoliday: (h: Omit<Holiday, 'id'>) => void;
  updateHoliday: (id: string, patch: Partial<Holiday>) => void;
  deleteHoliday: (id: string) => void;
  // yearly events
  addYearlyEvent: (e: Omit<YearlyEvent, 'id'>) => void;
  updateYearlyEvent: (id: string, patch: Partial<YearlyEvent>) => void;
  deleteYearlyEvent: (id: string) => void;
  // calc memory
  addCalcMemory: (m: Omit<CalcMemory, 'id' | 'createdAt'>) => void;
  deleteCalcMemory: (id: string) => void;
  // assets
  addAsset: (a: Omit<Asset, 'id'>) => void;
  updateAsset: (id: string, patch: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  // budgets
  setBudget: (categoryId: string, monthlyLimit: number) => void;
  deleteBudget: (id: string) => void;
  // demo
  loadDemo: () => void;
  // bulk import
  importPayments: (rows: { kind: Payment['kind']; categoryName: string; name: string; provider: string; accountRef: string; amount: number; frequency: Payment['frequency']; startDate: string; endDate?: string; notes?: string }[], mode: 'merge' | 'replace', scopeKind?: Payment['kind']) => void;
  importFullState: (s: AppState) => void;
}

const uid = () => crypto.randomUUID();

function hydrate(parsed: Partial<AppState>): AppState {
  // Deep-merge profile so older saved vaults pick up new fields (payDate, studentLoanPlans, ...).
  const profile: Profile = { ...DEFAULT_PROFILE, ...(parsed.profile ?? {}) };
  if (!profile.payDate || typeof profile.payDate !== 'object') profile.payDate = { mode: 'none' };
  if (!Array.isArray(profile.studentLoanPlans)) profile.studentLoanPlans = [];
  if (!profile.marriageAllowance) profile.marriageAllowance = 'none';
  return {
    ...DEFAULT_STATE,
    ...parsed,
    profile,
    sideIncomes: parsed.sideIncomes ?? [],
    categories: parsed.categories ?? DEFAULT_STATE.categories,
    payments: parsed.payments ?? [],
    holidays: parsed.holidays ?? [],
    yearlyEvents: parsed.yearlyEvents ?? [],
    calcMemory: parsed.calcMemory ?? [],
    assets: parsed.assets ?? [],
    budgets: parsed.budgets ?? []
  };
}

let saveTimer: number | undefined;

function scheduleSave(get: () => Store) {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    const { state, unlock } = get();
    const json = JSON.stringify(state);
    let rec: VaultRecord;
    if (unlock.encrypted && unlock.password) {
      const sealed = await seal(json, unlock.password);
      rec = { id: 'main', encrypted: true, payload: sealed.payload, iv: sealed.iv, salt: sealed.salt, updatedAt: new Date().toISOString() };
    } else {
      rec = { id: 'main', encrypted: false, payload: json, updatedAt: new Date().toISOString() };
    }
    await saveVault(rec);
  }, 600);
}

export const useFinanceStore = create<Store>((set, get) => ({
  state: DEFAULT_STATE,
  unlock: { hasVault: false, encrypted: false, unlocked: false, bootstrapped: false },

  bootstrap: async () => {
    const rec = await loadVault();
    if (!rec) {
      set({ unlock: { hasVault: false, encrypted: false, unlocked: true, bootstrapped: true } });
      // create initial blank vault
      await saveVault({ id: 'main', encrypted: false, payload: JSON.stringify(DEFAULT_STATE), updatedAt: new Date().toISOString() });
      return;
    }
    if (rec.encrypted) {
      set({ unlock: { hasVault: true, encrypted: true, unlocked: false, bootstrapped: true } });
    } else {
      try {
        const parsed = JSON.parse(rec.payload) as AppState;
        set({ state: hydrate(parsed), unlock: { hasVault: true, encrypted: false, unlocked: true, bootstrapped: true } });
      } catch {
        set({ unlock: { hasVault: true, encrypted: false, unlocked: true, bootstrapped: true, error: 'Vault corrupted; starting fresh' } });
      }
    }
  },

  unlockWith: async (password) => {
    const rec = await loadVault();
    if (!rec || !rec.encrypted) return false;
    try {
      const json = await unseal({ payload: rec.payload, iv: rec.iv!, salt: rec.salt! }, password);
      const parsed = JSON.parse(json) as AppState;
      set({ state: hydrate(parsed), unlock: { hasVault: true, encrypted: true, unlocked: true, password, bootstrapped: true } });
      return true;
    } catch {
      set(s => ({ unlock: { ...s.unlock, error: 'Incorrect password' } }));
      return false;
    }
  },

  setPassword: async (password) => {
    set(s => ({ unlock: { ...s.unlock, encrypted: true, password, unlocked: true, hasVault: true } }));
    scheduleSave(get);
  },

  removePassword: async (currentPassword) => {
    const u = get().unlock;
    if (!u.encrypted) return true;
    if (u.password !== currentPassword) return false;
    set(s => ({ unlock: { ...s.unlock, encrypted: false, password: undefined } }));
    scheduleSave(get);
    return true;
  },

  wipeAll: async () => {
    await wipeVault();
    set({ state: DEFAULT_STATE, unlock: { hasVault: false, encrypted: false, unlocked: true, bootstrapped: true } });
    await saveVault({ id: 'main', encrypted: false, payload: JSON.stringify(DEFAULT_STATE), updatedAt: new Date().toISOString() });
  },

  startFresh: async () => {
    await get().wipeAll();
  },

  apply: (m) => {
    set(s => ({ state: m(s.state) }));
    scheduleSave(get);
  },

  setProfile: (p) => get().apply(s => ({ ...s, profile: { ...s.profile, ...p } })),

  addCategory: (c) => get().apply(s => ({ ...s, categories: [...s.categories, { ...c, id: uid() }] })),
  updateCategory: (id, patch) => get().apply(s => ({ ...s, categories: s.categories.map(c => c.id === id ? { ...c, ...patch } : c) })),
  deleteCategory: (id) => get().apply(s => ({
    ...s,
    categories: s.categories.filter(c => c.id !== id),
    payments: s.payments.map(p => p.categoryId === id ? { ...p, categoryId: '' } : p)
  })),

  addPayment: (p) => get().apply(s => ({ ...s, payments: [...s.payments, { ...p, id: uid() }] })),
  updatePayment: (id, patch) => get().apply(s => ({ ...s, payments: s.payments.map(p => p.id === id ? { ...p, ...patch } : p) })),
  deletePayment: (id) => get().apply(s => ({ ...s, payments: s.payments.filter(p => p.id !== id) })),

  addSideIncome: (si) => get().apply(s => ({ ...s, sideIncomes: [...s.sideIncomes, { ...si, id: uid() }] })),
  updateSideIncome: (id, patch) => get().apply(s => ({ ...s, sideIncomes: s.sideIncomes.map(x => x.id === id ? { ...x, ...patch } : x) })),
  deleteSideIncome: (id) => get().apply(s => ({ ...s, sideIncomes: s.sideIncomes.filter(x => x.id !== id) })),

  addHoliday: (h) => get().apply(s => ({ ...s, holidays: [...s.holidays, { ...h, id: uid() }] })),
  updateHoliday: (id, patch) => get().apply(s => ({ ...s, holidays: s.holidays.map(x => x.id === id ? { ...x, ...patch } : x) })),
  deleteHoliday: (id) => get().apply(s => ({ ...s, holidays: s.holidays.filter(x => x.id !== id) })),

  addYearlyEvent: (e) => get().apply(s => ({ ...s, yearlyEvents: [...s.yearlyEvents, { ...e, id: uid() }] })),
  updateYearlyEvent: (id, patch) => get().apply(s => ({ ...s, yearlyEvents: s.yearlyEvents.map(x => x.id === id ? { ...x, ...patch } : x) })),
  deleteYearlyEvent: (id) => get().apply(s => ({ ...s, yearlyEvents: s.yearlyEvents.filter(x => x.id !== id) })),

  addCalcMemory: (m) => get().apply(s => ({ ...s, calcMemory: [{ ...m, id: uid(), createdAt: new Date().toISOString() }, ...s.calcMemory] })),
  deleteCalcMemory: (id) => get().apply(s => ({ ...s, calcMemory: s.calcMemory.filter(m => m.id !== id) })),

  addAsset: (a) => get().apply(s => ({ ...s, assets: [...(s.assets ?? []), { ...a, id: uid() }] })),
  updateAsset: (id, patch) => get().apply(s => ({ ...s, assets: (s.assets ?? []).map(x => x.id === id ? { ...x, ...patch } : x) })),
  deleteAsset: (id) => get().apply(s => ({ ...s, assets: (s.assets ?? []).filter(x => x.id !== id) })),

  setBudget: (categoryId, monthlyLimit) => get().apply(s => {
    const list = s.budgets ?? [];
    const existing = list.find(b => b.categoryId === categoryId);
    if (existing) return { ...s, budgets: list.map(b => b.categoryId === categoryId ? { ...b, monthlyLimit } : b) };
    return { ...s, budgets: [...list, { id: uid(), categoryId, monthlyLimit }] };
  }),
  deleteBudget: (id) => get().apply(s => ({ ...s, budgets: (s.budgets ?? []).filter(b => b.id !== id) })),

  loadDemo: () => get().apply(s => ({
    ...s,
    profile: {
      ...s.profile,
      firstName: s.profile.firstName || 'Alex',
      taxCode: '1257L',
      salary: 42000,
      pensionPct: 5,
      employerPensionPct: 3,
      pensionScheme: 'relief-at-source',
      age: 32,
      retirementAge: 67,
      studentLoanPlans: ['plan2']
    },
    sideIncomes: [
      { id: uid(), name: 'Etsy shop', amount: 120, frequency: 'monthly', taxable: true },
      { id: uid(), name: 'Birthday money', amount: 200, frequency: 'yearly', taxable: false }
    ],
    payments: [
      { id: uid(), kind: 'bill', categoryId: 'cat-housing', name: 'Rent', provider: 'Landlord', accountRef: '', amount: 950, frequency: 'monthly', startDate: '2025-01-01' },
      { id: uid(), kind: 'bill', categoryId: 'cat-utilities', name: 'Electricity', provider: 'Octopus', accountRef: 'AC-1', amount: 78, frequency: 'monthly', startDate: '2025-01-05' },
      { id: uid(), kind: 'bill', categoryId: 'cat-utilities', name: 'Water', provider: 'Thames', accountRef: '', amount: 32, frequency: 'monthly', startDate: '2025-01-10' },
      { id: uid(), kind: 'bill', categoryId: 'cat-subscriptions', name: 'Netflix', provider: 'Netflix', accountRef: '', amount: 12.99, frequency: 'monthly', startDate: '2025-01-08' },
      { id: uid(), kind: 'bill', categoryId: 'cat-subscriptions', name: 'Spotify', provider: 'Spotify', accountRef: '', amount: 11.99, frequency: 'monthly', startDate: '2025-01-12' },
      { id: uid(), kind: 'bill', categoryId: 'cat-insurance', name: 'Car insurance', provider: 'Aviva', accountRef: 'POL-AV-2025', amount: 540, frequency: 'yearly', startDate: '2025-03-01' },
      { id: uid(), kind: 'bill', categoryId: 'cat-transport', name: 'Fuel', provider: '', accountRef: '', amount: 60, frequency: 'weekly', startDate: '2025-01-01' },
      { id: uid(), kind: 'bill', categoryId: 'cat-food', name: 'Groceries', provider: 'Tesco', accountRef: '', amount: 95, frequency: 'weekly', startDate: '2025-01-01' },
      { id: uid(), kind: 'debt', categoryId: 'cat-cc', name: 'Barclaycard', provider: 'Barclays', accountRef: '4000-XXXX', amount: 90, frequency: 'monthly', startDate: '2025-01-20', endDate: '2027-06-20' },
      { id: uid(), kind: 'debt', categoryId: 'cat-loan', name: 'Personal loan', provider: 'Santander', accountRef: 'PL-1', amount: 180, frequency: 'monthly', startDate: '2024-06-01', endDate: '2027-05-01' },
      { id: uid(), kind: 'saving', categoryId: 'cat-emergency', name: 'Emergency fund', provider: 'Marcus', accountRef: 'GS-ISA-1', amount: 150, frequency: 'monthly', startDate: '2025-01-01' },
      { id: uid(), kind: 'saving', categoryId: 'cat-isa', name: 'Stocks & Shares ISA', provider: 'Vanguard', accountRef: '', amount: 200, frequency: 'monthly', startDate: '2025-01-01' }
    ],
    holidays: [
      { id: uid(), name: 'Summer 2026', destination: 'Greece', targetCost: 1800, targetDate: '2026-07-15', savedToDate: 450 }
    ],
    yearlyEvents: [
      { id: uid(), name: 'Mum\'s birthday', type: 'birthday', date: '2025-06-12', recurrence: 'yearly' },
      { id: uid(), name: 'Car service', type: 'service', date: '2025-09-10', recurrence: 'yearly', cost: 180 },
      { id: uid(), name: 'Home insurance renewal', type: 'insurance', date: '2025-11-01', recurrence: 'yearly', cost: 220 }
    ],
    assets: [
      { id: uid(), name: 'Current account', type: 'cash', value: 1850 },
      { id: uid(), name: 'Emergency fund', type: 'cash', value: 4200 },
      { id: uid(), name: 'Stocks & Shares ISA', type: 'investment', value: 12_400 },
      { id: uid(), name: 'Workplace pension', type: 'pension', value: 38_000 },
      { id: uid(), name: 'Car (2019 Golf)', type: 'vehicle', value: 9_500 }
    ],
    budgets: [
      { id: uid(), categoryId: 'cat-food', monthlyLimit: 450 },
      { id: uid(), categoryId: 'cat-transport', monthlyLimit: 320 },
      { id: uid(), categoryId: 'cat-subscriptions', monthlyLimit: 50 }
    ]
  })),

  importPayments: (rows, mode, scopeKind) => get().apply(s => {
    const cats = [...s.categories];
    const findOrCreate = (name: string, kind: Payment['kind']): string => {
      const existing = cats.find(c => c.name.toLowerCase() === name.toLowerCase() && c.kind === kind);
      if (existing) return existing.id;
      const id = uid();
      const palette = ['#0ea5e9', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6', '#e11d48', '#10b981'];
      cats.push({ id, name, color: palette[cats.length % palette.length], kind });
      return id;
    };
    const newPayments: Payment[] = rows.map(r => ({
      id: uid(),
      kind: r.kind, name: r.name, provider: r.provider, accountRef: r.accountRef,
      amount: r.amount, frequency: r.frequency, startDate: r.startDate,
      endDate: r.endDate, notes: r.notes,
      categoryId: findOrCreate(r.categoryName, r.kind)
    }));
    let basePayments: Payment[];
    if (mode === 'replace') {
      // If a scopeKind is given (e.g. 'debt'), only replace that kind — leave others intact.
      basePayments = scopeKind ? s.payments.filter(p => p.kind !== scopeKind) : [];
    } else {
      basePayments = s.payments;
    }
    return {
      ...s,
      categories: cats,
      payments: [...basePayments, ...newPayments]
    };
  }),

  importFullState: (next) => get().apply(() => hydrate(next))
}));
