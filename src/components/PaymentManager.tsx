import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Category, Frequency, Payment, PaymentKind, SortMode } from '../types';
import { FrequencySelect, Money, Field, Empty, NumInput } from './common';
import { BillHistory } from './BillHistory';
import { ProviderLogo } from './ProviderLogo';
import { annualAmount, freqLabel, isActive } from '../lib/frequency';

export function PaymentManager({ kind, title }: { kind: PaymentKind; title: string }) {
  const state = useFinanceStore(s => s.state);
  const addPayment = useFinanceStore(s => s.addPayment);
  const updatePayment = useFinanceStore(s => s.updatePayment);
  const deletePayment = useFinanceStore(s => s.deletePayment);
  const addCategory = useFinanceStore(s => s.addCategory);
  const updateCategory = useFinanceStore(s => s.updateCategory);
  const deleteCategory = useFinanceStore(s => s.deleteCategory);

  const cats = state.categories.filter(c => c.kind === kind);
  const items = state.payments.filter(p => p.kind === kind);
  const [sort, setSort] = useState<SortMode>('category');
  const [showCats, setShowCats] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...items];
    switch (sort) {
      case 'amount-asc': arr.sort((a, b) => annualAmount(a.amount, a.frequency) - annualAmount(b.amount, b.frequency)); break;
      case 'amount-desc': arr.sort((a, b) => annualAmount(b.amount, b.frequency) - annualAmount(a.amount, a.frequency)); break;
      case 'alpha': arr.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'due-date': arr.sort((a, b) => (a.endDate ?? '9999').localeCompare(b.endDate ?? '9999')); break;
      default: {
        const order = new Map(cats.map((c, i) => [c.id, i]));
        arr.sort((a, b) => (order.get(a.categoryId) ?? 999) - (order.get(b.categoryId) ?? 999));
      }
    }
    return arr;
  }, [items, sort, cats]);

  const grouped = useMemo(() => {
    if (sort !== 'category') return null;
    const map = new Map<string, Payment[]>();
    for (const p of sorted) {
      const k = p.categoryId || '';
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return map;
  }, [sorted, sort]);

  const totalAnnual = items.filter(p => isActive(p)).reduce((s, p) => s + annualAmount(p.amount, p.frequency), 0);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {items.length} {items.length === 1 ? 'item' : 'items'} · <Money value={totalAnnual / 12} /> / mo · <Money value={totalAnnual} /> / yr
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select className="input !w-auto" value={sort} onChange={e => setSort(e.target.value as SortMode)}>
            <option value="category">Sort: Category</option>
            <option value="amount-desc">Sort: Highest first</option>
            <option value="amount-asc">Sort: Lowest first</option>
            <option value="alpha">Sort: A → Z</option>
            <option value="due-date">Sort: End date</option>
          </select>
          <button className="btn-secondary" onClick={() => setShowCats(s => !s)}>Categories</button>
        </div>
      </div>

      {showCats && (
        <CategoryEditor
          kind={kind}
          categories={cats}
          onAdd={(c) => addCategory({ ...c, kind })}
          onUpdate={updateCategory}
          onDelete={deleteCategory}
        />
      )}

      <PaymentForm kind={kind} categories={cats} onAdd={addPayment} />

      {items.length === 0 ? (
        <Empty>No {kind}s yet — add your first above.</Empty>
      ) : grouped ? (
        <div className="space-y-5 mt-5">
          {[...grouped.entries()].map(([catId, list]) => {
            const cat = cats.find(c => c.id === catId);
            return (
              <div key={catId || 'uncat'} className="card">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="w-3 h-3 rounded-full" style={{ background: cat?.color ?? '#94a3b8' }} />
                  <span className="font-semibold">{cat?.name ?? 'Uncategorised'}</span>
                  <span className="ml-auto text-sm text-slate-500 tabular-nums whitespace-nowrap">
                    <Money value={list.reduce((s, p) => s + annualAmount(p.amount, p.frequency), 0) / 12} /> / mo · <Money value={list.reduce((s, p) => s + annualAmount(p.amount, p.frequency), 0)} /> / yr
                  </span>
                </div>
                <PaymentTable items={list} categories={cats} onUpdate={updatePayment} onDelete={deletePayment} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card mt-5">
          <PaymentTable items={sorted} categories={cats} onUpdate={updatePayment} onDelete={deletePayment} />
        </div>
      )}
    </div>
  );
}

function PaymentForm({ kind, categories, onAdd }: { kind: PaymentKind; categories: Category[]; onAdd: (p: Omit<Payment, 'id'>) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [accountRef, setAccountRef] = useState('');
  const [amount, setAmount] = useState(0);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [showMore, setShowMore] = useState(false);

  const reset = () => {
    setName(''); setProvider(''); setAccountRef(''); setAmount(0); setEndDate('');
    setFrequency('monthly');
    setStartDate(new Date().toISOString().slice(0, 10));
    setShowMore(false);
  };

  const kindLabel = kind === 'bill' ? 'bill' : kind === 'debt' ? 'debt' : 'saving';

  if (!open) {
    return (
      <button
        className="card card-pad mb-5 w-full flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-left"
        onClick={() => setOpen(true)}
      >
        <span className="w-10 h-10 rounded-full bg-brand-500 text-white grid place-items-center text-xl shrink-0">+</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Add a new {kindLabel}</div>
          <div className="text-xs text-slate-500">Name, amount, frequency, category — provider & dates optional</div>
        </div>
        <span className="text-slate-400">›</span>
      </button>
    );
  }

  return (
    <form
      className="card card-pad mb-5 space-y-4"
      onSubmit={e => {
        e.preventDefault();
        if (!name || !amount) return;
        onAdd({
          kind, categoryId, name, provider, accountRef,
          amount, frequency, startDate, endDate: endDate || undefined
        });
        reset();
      }}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold">New {kindLabel}</div>
        <button type="button" className="btn-ghost text-slate-500" onClick={() => { reset(); setOpen(false); }} aria-label="Close form">✕</button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <Field label="Name *">
          <input
            autoFocus
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={kind === 'bill' ? 'e.g. Electricity' : kind === 'debt' ? 'e.g. Barclaycard' : 'e.g. Emergency fund'}
            required
          />
        </Field>
        <Field label="Category">
          <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">Uncategorised</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Amount (£) *">
          <NumInput value={amount} onChange={setAmount} step="0.01" placeholder="0.00" />
        </Field>
        <Field label="Frequency">
          <FrequencySelect value={frequency} onChange={setFrequency} />
        </Field>
        <Field label="Start date">
          <input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </Field>
      </section>

      <div>
        <button
          type="button"
          className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
          onClick={() => setShowMore(s => !s)}
          aria-expanded={showMore}
        >
          {showMore ? '− Hide' : '+ More'} details (provider, account ref, end date)
        </button>
      </div>

      {showMore && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-1">
          <Field label="Provider">
            <input className="input" value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. Octopus Energy" />
          </Field>
          <Field label="Account / policy #">
            <input className="input" value={accountRef} onChange={e => setAccountRef(e.target.value)} placeholder="optional" />
          </Field>
          <Field label="End date">
            <input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </Field>
        </section>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button type="button" className="btn-secondary justify-center" onClick={() => { reset(); setOpen(false); }}>Cancel</button>
        <button type="submit" className="btn-primary justify-center" disabled={!name || !amount}>+ Add {kindLabel}</button>
      </div>
    </form>
  );
}

function PaymentTable({ items, categories, onUpdate, onDelete }: {
  items: Payment[];
  categories: Category[];
  onUpdate: (id: string, patch: Partial<Payment>) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      {/* Desktop / tablet: compact editable table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr>
            <th className="table-th">Name</th>
            <th className="table-th">Amount</th>
            <th className="table-th">Frequency</th>
            <th className="table-th">Monthly</th>
            <th className="table-th">Annual</th>
            <th className="table-th">Category</th>
            <th className="table-th">End date</th>
            <th className="table-th"></th>
          </tr></thead>
          <tbody>
            {items.map(p => (
              <PaymentRowDesktop key={p.id} p={p} categories={categories} onUpdate={onUpdate} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: clean card list with expand-to-edit */}
      <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
        {items.map(p => (
          <PaymentRowMobile key={p.id} p={p} categories={categories} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </ul>
    </>
  );
}

function PaymentRowDesktop({ p, categories, onUpdate, onDelete }: {
  p: Payment;
  categories: Category[];
  onUpdate: (id: string, patch: Partial<Payment>) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cat = categories.find(c => c.id === p.categoryId);
  return (
    <>
      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <td className="table-td">
          <button className="text-left w-full flex items-center gap-2" onClick={() => setOpen(o => !o)}>
            <ProviderLogo name={p.provider || p.name} size={24} />
            <span className="min-w-0 flex-1">
              <div className="font-medium truncate">{p.name || <span className="text-slate-400 italic">(unnamed)</span>}</div>
              {(p.provider || p.accountRef) && (
                <div className="text-xs text-slate-500 truncate">{[p.provider, p.accountRef].filter(Boolean).join(' · ')}</div>
              )}
            </span>
          </button>
        </td>
        <td className="table-td tabular-nums"><Money value={p.amount} /></td>
        <td className="table-td text-slate-500">{freqShort(p.frequency)}</td>
        <td className="table-td tabular-nums"><Money value={annualAmount(p.amount, p.frequency) / 12} /></td>
        <td className="table-td tabular-nums"><Money value={annualAmount(p.amount, p.frequency)} /></td>
        <td className="table-td">
          {cat ? <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />{cat.name}</span> : <span className="text-slate-400">—</span>}
        </td>
        <td className="table-td text-slate-500 whitespace-nowrap">{p.endDate ? new Date(p.endDate).toLocaleDateString('en-GB') : '—'}</td>
        <td className="table-td">
          <div className="flex gap-1 justify-end">
            <button className="btn-ghost !px-2 text-slate-500 hover:text-brand-500" onClick={() => setOpen(o => !o)} aria-label="Edit">{open ? '−' : '✎'}</button>
            <button className="btn-ghost !px-2 text-slate-400 hover:text-red-500" onClick={() => onDelete(p.id)} aria-label="Delete">✕</button>
          </div>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={8} className="bg-slate-50 dark:bg-slate-800/40 p-4">
            <PaymentEditFields p={p} categories={categories} onUpdate={onUpdate} />
          </td>
        </tr>
      )}
    </>
  );
}

function PaymentRowMobile({ p, categories, onUpdate, onDelete }: {
  p: Payment;
  categories: Category[];
  onUpdate: (id: string, patch: Partial<Payment>) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const cat = categories.find(c => c.id === p.categoryId);
  return (
    <li className="p-4">
      <button className="w-full flex items-center gap-3 text-left" onClick={() => setOpen(o => !o)}>
        <span className="w-2 h-10 rounded-full shrink-0" style={{ background: cat?.color ?? '#94a3b8' }} />
        <ProviderLogo name={p.provider || p.name} size={32} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold truncate">{p.name || <span className="text-slate-400 italic">(unnamed)</span>}</div>
          <div className="text-xs text-slate-500">
            <Money value={p.amount} /> · {freqShort(p.frequency)}
            {cat && ` · ${cat.name}`}
          </div>
        </div>
        <span className="text-slate-400">{open ? '−' : '›'}</span>
      </button>
      {open && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <PaymentEditFields p={p} categories={categories} onUpdate={onUpdate} />
          <div className="mt-3 flex justify-end">
            <button className="btn-ghost text-red-500 text-sm" onClick={() => onDelete(p.id)}>🗑️ Delete</button>
          </div>
        </div>
      )}
    </li>
  );
}

function PaymentEditFields({ p, categories, onUpdate }: {
  p: Payment;
  categories: Category[];
  onUpdate: (id: string, patch: Partial<Payment>) => void;
}) {
  const isDebt = p.kind === 'debt';
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name"><input className="input" value={p.name} onChange={e => onUpdate(p.id, { name: e.target.value })} /></Field>
        <Field label="Category">
          <select className="input" value={p.categoryId} onChange={e => onUpdate(p.id, { categoryId: e.target.value })}>
            <option value="">Uncategorised</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Amount (£)"><NumInput value={p.amount} onChange={n => onUpdate(p.id, { amount: n })} step="0.01" /></Field>
        <Field label="Frequency"><FrequencySelect value={p.frequency} onChange={f => onUpdate(p.id, { frequency: f })} /></Field>
        <Field label="Start date"><input className="input" type="date" value={p.startDate} onChange={e => onUpdate(p.id, { startDate: e.target.value })} /></Field>
        <Field label="End date"><input className="input" type="date" value={p.endDate ?? ''} onChange={e => onUpdate(p.id, { endDate: e.target.value || undefined })} /></Field>
        <Field label="Provider"><input className="input" value={p.provider} onChange={e => onUpdate(p.id, { provider: e.target.value })} /></Field>
        <Field label="Account / policy #"><input className="input" value={p.accountRef} onChange={e => onUpdate(p.id, { accountRef: e.target.value })} /></Field>
      </div>
      {isDebt && (
        <div className="mt-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
          <div className="font-semibold text-sm mb-2">💳 Debt details — power the Total debt stat and the strategy simulator</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Outstanding balance (£)"><NumInput value={p.balance ?? 0} onChange={n => onUpdate(p.id, { balance: n })} step="0.01" /></Field>
            <Field label="APR %"><NumInput value={p.apr ?? 0} onChange={n => onUpdate(p.id, { apr: n })} step="0.01" /></Field>
            <Field label="Minimum payment (£/mo)"><NumInput value={p.minPayment ?? 0} onChange={n => onUpdate(p.id, { minPayment: n })} step="0.01" /></Field>
            <Field label="Overpayment (£/mo)"><NumInput value={p.overpayment ?? 0} onChange={n => onUpdate(p.id, { overpayment: n })} step="0.01" /></Field>
          </div>
        </div>
      )}
      <BillHistory paymentId={p.id} history={p.history ?? []} />
    </div>
  );
}

function freqShort(f: Frequency): string {
  switch (f) {
    case 'daily': return 'daily';
    case 'weekly': return 'weekly';
    case 'fortnightly': return 'fortnightly';
    case 'monthly': return 'monthly';
    case 'quarterly': return 'quarterly';
    case 'sixmonthly': return '6-monthly';
    case 'yearly': return 'yearly';
    case 'oneoff': return 'one-off';
  }
}

function CategoryEditor({ kind, categories, onAdd, onUpdate, onDelete }: {
  kind: PaymentKind;
  categories: Category[];
  onAdd: (c: Omit<Category, 'id' | 'kind'>) => void;
  onUpdate: (id: string, patch: Partial<Category>) => void;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0ea5e9');
  return (
    <div className="card card-pad mb-5">
      <div className="font-semibold mb-3">{kind === 'bill' ? 'Bill' : kind === 'debt' ? 'Debt' : 'Saving'} categories</div>
      <div className="flex flex-wrap gap-2 mb-3">
        {categories.map(c => (
          <div key={c.id} className="flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-2 py-1">
            <input type="color" value={c.color} onChange={e => onUpdate(c.id, { color: e.target.value })} className="w-5 h-5 rounded-full border-0 bg-transparent" />
            <input className="bg-transparent text-sm focus:outline-none" value={c.name} onChange={e => onUpdate(c.id, { name: e.target.value })} />
            <button className="text-slate-400 hover:text-red-500 text-sm" onClick={() => onDelete(c.id)}>✕</button>
          </div>
        ))}
      </div>
      <form className="flex gap-2 items-center" onSubmit={e => { e.preventDefault(); if (!name) return; onAdd({ name, color }); setName(''); }}>
        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-10 rounded-lg border border-slate-200 dark:border-slate-700" />
        <input className="input" placeholder="New category name" value={name} onChange={e => setName(e.target.value)} />
        <button className="btn-primary">Add</button>
      </form>
    </div>
  );
}
