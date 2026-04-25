import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Category, Frequency, Payment, PaymentKind, SortMode } from '../types';
import { FrequencySelect, Money, Field, Empty } from './common';
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
            {items.length} {items.length === 1 ? 'item' : 'items'} · annual total <Money value={totalAnnual} />
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
                  <span className="ml-auto text-sm text-slate-500">
                    <Money value={list.reduce((s, p) => s + annualAmount(p.amount, p.frequency), 0)} /> / yr
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
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [accountRef, setAccountRef] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');

  return (
    <form
      className="card card-pad mb-5 grid gap-3 md:grid-cols-3 lg:grid-cols-4"
      onSubmit={e => {
        e.preventDefault();
        if (!name || !amount) return;
        onAdd({
          kind, categoryId, name, provider, accountRef,
          amount: parseFloat(amount) || 0,
          frequency, startDate, endDate: endDate || undefined
        });
        setName(''); setProvider(''); setAccountRef(''); setAmount(''); setEndDate('');
      }}
    >
      <Field label="Name"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Electricity" /></Field>
      <Field label="Provider"><input className="input" value={provider} onChange={e => setProvider(e.target.value)} placeholder="e.g. Octopus Energy" /></Field>
      <Field label="Account / policy #"><input className="input" value={accountRef} onChange={e => setAccountRef(e.target.value)} /></Field>
      <Field label="Amount (£)"><input className="input" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></Field>
      <Field label="Frequency"><FrequencySelect value={frequency} onChange={setFrequency} /></Field>
      <Field label="Category">
        <select className="input" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
          <option value="">Uncategorised</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Start date"><input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></Field>
      <Field label="End date (optional)"><input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></Field>
      <div className="md:col-span-3 lg:col-span-4 flex justify-end">
        <button className="btn-primary">Add</button>
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr>
          <th className="table-th">Name</th>
          <th className="table-th">Provider</th>
          <th className="table-th">Ref</th>
          <th className="table-th">Amount</th>
          <th className="table-th">Frequency</th>
          <th className="table-th">Annual</th>
          <th className="table-th">End</th>
          <th className="table-th">Category</th>
          <th className="table-th"></th>
        </tr></thead>
        <tbody>
          {items.map(p => (
            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="table-td"><input className="input !py-1" value={p.name} onChange={e => onUpdate(p.id, { name: e.target.value })} /></td>
              <td className="table-td"><input className="input !py-1" value={p.provider} onChange={e => onUpdate(p.id, { provider: e.target.value })} /></td>
              <td className="table-td"><input className="input !py-1" value={p.accountRef} onChange={e => onUpdate(p.id, { accountRef: e.target.value })} /></td>
              <td className="table-td w-24"><input className="input !py-1" type="number" step="0.01" value={p.amount} onChange={e => onUpdate(p.id, { amount: parseFloat(e.target.value) || 0 })} /></td>
              <td className="table-td w-36">
                <FrequencySelect value={p.frequency} onChange={(f) => onUpdate(p.id, { frequency: f })} />
              </td>
              <td className="table-td"><Money value={annualAmount(p.amount, p.frequency)} /></td>
              <td className="table-td"><input className="input !py-1" type="date" value={p.endDate ?? ''} onChange={e => onUpdate(p.id, { endDate: e.target.value || undefined })} /></td>
              <td className="table-td">
                <select className="input !py-1" value={p.categoryId} onChange={e => onUpdate(p.id, { categoryId: e.target.value })}>
                  <option value="">—</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </td>
              <td className="table-td"><button className="btn-ghost text-red-500" onClick={() => onDelete(p.id)}>✕</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
