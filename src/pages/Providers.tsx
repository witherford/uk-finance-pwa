import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, NumInput, PageHeader, Empty } from '../components/common';
import { ProviderLogo } from '../components/ProviderLogo';
import { normaliseProviderName, resolveProvider } from '../lib/providers';
import { Link } from 'react-router-dom';

interface Aggregated {
  name: string;
  key: string;
  uses: { kind: string; ref?: string; link: string }[];
}

export function Providers() {
  const state = useFinanceStore(s => s.state);
  const setOverride = useFinanceStore(s => s.setProviderOverride);

  const aggregated = useMemo<Aggregated[]>(() => {
    const map = new Map<string, Aggregated>();
    const add = (name: string | undefined | null, kind: string, ref: string | undefined, link: string) => {
      const trimmed = (name ?? '').trim();
      if (!trimmed) return;
      const key = normaliseProviderName(trimmed);
      if (!map.has(key)) map.set(key, { name: trimmed, key, uses: [] });
      map.get(key)!.uses.push({ kind, ref, link });
    };

    for (const p of state.payments) {
      if (p.provider) add(p.provider, p.kind === 'bill' ? 'Bill' : p.kind === 'debt' ? 'Debt' : 'Saving', p.accountRef || undefined, `/${p.kind === 'saving' ? 'savings' : p.kind === 'debt' ? 'debts' : 'bills'}`);
    }
    if (state.housing.type === 'mortgage' && state.housing.mortgage?.provider) add(state.housing.mortgage.provider, 'Mortgage', state.housing.mortgage.accountRef, '/bills');
    if (state.housing.type === 'rent' && state.housing.rent?.provider) add(state.housing.rent.provider, 'Rent', state.housing.rent.accountRef, '/bills');
    for (const t of state.housing.tenancyHistory) add(t.provider, 'Past tenancy', undefined, '/bills');
    if (state.councilTax?.council) add(state.councilTax.council, 'Council Tax', state.councilTax.accountRef, '/bills');
    for (const e of state.employers) {
      add(e.name, 'Employer', undefined, '/income');
      if (e.pensionProvider) add(e.pensionProvider, 'Pension', e.pensionAccountRef, '/pension');
    }
    for (const h of state.holidays) {
      if (h.destination) continue;
    }
    for (const s of state.spending) if (s.retailer) add(s.retailer, 'Retailer', undefined, '/spending');

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [state]);

  const [search, setSearch] = useState('');
  const filtered = aggregated.filter(a => a.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Your providers"
        subtitle="Every company you've added across the app, with auto-populated UK contact details. Tap to call, email, or visit their website."
      />

      <div className="card card-pad mb-5 flex items-center gap-3">
        <input className="input" placeholder="Search providers…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Empty>{aggregated.length === 0 ? 'No providers yet — add bills, debts, savings, employers, retailers and they\'ll show up here.' : 'No providers match your search.'}</Empty>
      ) : (
        <ul className="space-y-3">
          {filtered.map(a => (
            <ProviderRow
              key={a.key}
              agg={a}
              override={state.providerOverrides[a.key]}
              onSaveOverride={(o) => setOverride(a.key, o)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ProviderRow({ agg, override, onSaveOverride }: {
  agg: Aggregated;
  override?: { domain?: string; phone?: string; email?: string; notes?: string; name: string };
  onSaveOverride: (o: { domain?: string; phone?: string; email?: string; notes?: string; name: string } | undefined) => void;
}) {
  const overrides: Record<string, any> = override ? { [agg.key]: override } : {};
  const resolved = resolveProvider(agg.name, overrides);
  const [editing, setEditing] = useState(false);
  const [domain, setDomain] = useState(override?.domain ?? '');
  const [phone, setPhone] = useState(override?.phone ?? '');
  const [email, setEmail] = useState(override?.email ?? '');
  const [notes, setNotes] = useState(override?.notes ?? '');

  return (
    <li className="card">
      <div className="card-pad flex flex-wrap gap-3 items-start">
        <ProviderLogo name={agg.name} size={48} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold flex items-center gap-2">
            {agg.name}
            {resolved.source === 'override' && <span className="chip bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">Custom</span>}
            {resolved.source === 'directory' && <span className="chip bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Auto</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-1">
            {agg.uses.map((u, i) => (
              <Link key={i} to={u.link} className="chip bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">
                {u.kind}{u.ref ? ` · ${u.ref}` : ''}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-sm">
            {resolved.domain && (
              <a className="btn-secondary !py-1 !px-3 text-xs" href={`https://${resolved.domain.replace(/^https?:\/\//, '')}`} target="_blank" rel="noopener noreferrer">↗ Website</a>
            )}
            {resolved.phone && <a className="btn-secondary !py-1 !px-3 text-xs" href={`tel:${resolved.phone.replace(/\s+/g, '')}`}>📞 {resolved.phone}</a>}
            {resolved.email && <a className="btn-secondary !py-1 !px-3 text-xs" href={`mailto:${resolved.email}`}>✉ {resolved.email}</a>}
            <button className="btn-ghost !py-1 !px-3 text-xs" onClick={() => setEditing(e => !e)}>{editing ? 'Close' : '✎ Override'}</button>
          </div>
        </div>
      </div>

      {editing && (
        <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800 grid sm:grid-cols-2 gap-3">
          <Field label="Website domain"><input className="input" value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. octopus.energy" /></Field>
          <Field label="Phone"><input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0808 164 1088" /></Field>
          <Field label="Email"><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
          <Field label="Notes"><input className="input" value={notes} onChange={e => setNotes(e.target.value)} /></Field>
          <div className="sm:col-span-2 flex justify-end gap-2">
            {override && <button className="btn-ghost text-red-500" onClick={() => { onSaveOverride(undefined); setEditing(false); }}>Reset to auto</button>}
            <button className="btn-primary" onClick={() => {
              onSaveOverride({ name: agg.name, domain: domain || undefined, phone: phone || undefined, email: email || undefined, notes: notes || undefined });
              setEditing(false);
            }}>Save override</button>
          </div>
        </div>
      )}
    </li>
  );
}
