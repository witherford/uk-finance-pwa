import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, NumInput, PageHeader, StatCard, Money, Empty } from '../components/common';
import { ProviderLogo } from '../components/ProviderLogo';
import { SpendingEntry, SpendingAttachment } from '../types';
import { thisMonthSpending, byCategory, byRetailer, fileToAttachment, SOFT_WARN_BYTES } from '../lib/spending';
import {
  SPENDING_HEADERS, SPENDING_SAMPLE_ROWS,
  ParsedSpendingRow, parseSpendingRows, parseFile,
  sampleSpendingCsv, sampleSpendingXlsx,
  backupSpendingCsv, backupSpendingXlsx, downloadBlob
} from '../lib/import-export';
import { format, parseISO, isValid } from 'date-fns';

export function Spending() {
  const state = useFinanceStore(s => s.state);
  const entries = state.spending;
  const budget = state.spendingMonthlyBudget ?? 0;
  const setBudget = useFinanceStore(s => s.setSpendingMonthlyBudget);
  const add = useFinanceStore(s => s.addSpending);
  const update = useFinanceStore(s => s.updateSpending);
  const del = useFinanceStore(s => s.deleteSpending);
  const importSpending = useFinanceStore(s => s.importSpending);

  const monthSpent = useMemo(() => thisMonthSpending(entries), [entries]);
  const byCat = useMemo(() => byCategory(entries), [entries]);
  const byRet = useMemo(() => byRetailer(entries), [entries]);

  const [showForm, setShowForm] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [filterRet, setFilterRet] = useState<string | null>(null);

  const [showIO, setShowIO] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [preview, setPreview] = useState<ParsedSpendingRow[] | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importError, setImportError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return entries
      .filter(e => !filterCat || e.category === filterCat)
      .filter(e => !filterRet || e.retailer === filterRet)
      .filter(e => !q || [e.name, e.retailer, e.category, e.description].some(x => (x ?? '').toLowerCase().includes(q)))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, filterText, filterCat, filterRet]);

  const onFile = async (f: File) => {
    setImportError(null);
    try {
      const rows = await parseFile(f);
      setPreview(parseSpendingRows(rows));
    } catch (e) { setImportError((e as Error).message); }
  };
  const confirmImport = () => {
    if (!preview) return;
    const valid = preview.filter(p => p.ok && p.entry).map(p => p.entry!);
    if (valid.length === 0) return;
    importSpending(valid, importMode);
    setPreview(null); setShowIO(false);
    alert(`${valid.length} spending rows imported.`);
  };

  return (
    <div>
      <PageHeader
        title="Spending"
        subtitle="Track day-to-day purchases against a monthly budget. Receipts and warranty info supported."
        actions={
          <>
            <button className="btn-secondary" onClick={() => setShowIO(s => !s)}>📥 Import / export</button>
            <button className="btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? 'Close' : '+ Add entry'}</button>
          </>
        }
      />

      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="This month's spending" value={fmt(monthSpent)} accent="text-amber-500" />
        <div className="card card-pad">
          <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Monthly budget</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-slate-500 text-sm">£</span>
            <NumInput value={budget} onChange={n => setBudget(n > 0 ? n : undefined)} />
          </div>
          <div className="text-xs text-slate-500 mt-1">{budget > 0 ? `${Math.min(999, Math.round((monthSpent / budget) * 100))}% used` : 'No budget set'}</div>
        </div>
        <StatCard label="Remaining budget" value={fmt(Math.max(0, budget - monthSpent))} accent={budget > 0 && monthSpent > budget ? 'text-red-600' : 'text-emerald-500'} />
      </div>

      {showForm && <SpendingForm
        onSubmit={(e) => { add(e); setShowForm(false); }}
        onCancel={() => setShowForm(false)}
      />}

      {showIO && (
        <div className="card card-pad mb-5 space-y-3">
          <div className="flex items-center justify-between"><div className="font-semibold">📥 Spending — import / export</div><button className="btn-ghost text-slate-500" onClick={() => { setShowIO(false); setPreview(null); }}>✕</button></div>
          <div className="text-xs text-slate-500">Required: Date, Name, Amount. Other columns optional. Attachments are NOT included in CSV/XLSX — use a JSON or .ukf full backup if you need to keep them.</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => downloadBlob(new Blob([sampleSpendingCsv()], { type: 'text/csv' }), 'spending-template.csv')}>⬇ Template CSV</button>
            <button className="btn-secondary" onClick={() => downloadBlob(sampleSpendingXlsx(), 'spending-template.xlsx')}>⬇ Template XLSX</button>
            <button className="btn-secondary" onClick={() => downloadBlob(backupSpendingCsv(state), 'spending.csv')} disabled={entries.length === 0}>⬇ Export CSV</button>
            <button className="btn-secondary" onClick={() => downloadBlob(backupSpendingXlsx(state), 'spending.xlsx')} disabled={entries.length === 0}>⬇ Export XLSX</button>
            <button className="btn-ghost text-sm" onClick={() => setShowSample(s => !s)}>{showSample ? '− Hide' : '+ Show'} example rows</button>
          </div>
          {showSample && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs"><thead><tr>{SPENDING_HEADERS.map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead><tbody>{SPENDING_SAMPLE_ROWS.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="table-td">{c}</td>)}</tr>)}</tbody></table>
            </div>
          )}
          <input type="file" accept=".csv,.xlsx,.xls,.tsv,.txt" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} className="block text-sm" />
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} /> Merge</label>
            <label className="flex items-center gap-2"><input type="radio" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} /> Replace all</label>
          </div>
          {importError && <div className="text-sm text-red-500">{importError}</div>}
          {preview && (
            <div>
              <div className="font-semibold mb-1 text-sm">Preview — {preview.filter(p => p.ok).length} valid · {preview.filter(p => !p.ok).length} invalid</div>
              <ul className="text-xs max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                {preview.map((p, i) => <li key={i} className={`px-3 py-1.5 ${p.ok ? '' : 'text-red-500 bg-red-50 dark:bg-red-900/10'}`}>{p.ok ? `✓ ${p.entry!.date} · ${p.entry!.name} · £${p.entry!.amount} · ${p.entry!.category}${p.entry!.retailer ? ` @ ${p.entry!.retailer}` : ''}` : p.reason}</li>)}
              </ul>
              <div className="flex gap-2 mt-2">
                <button className="btn-primary" onClick={confirmImport} disabled={!preview.some(p => p.ok)}>Import {preview.filter(p => p.ok).length}</button>
                <button className="btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card card-pad mb-5 flex flex-wrap gap-3 items-center">
        <input className="input flex-1 min-w-[200px]" placeholder="Search name / retailer / category…" value={filterText} onChange={e => setFilterText(e.target.value)} />
        {filterCat && <span className="chip bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">{filterCat} <button onClick={() => setFilterCat(null)} className="ml-1">✕</button></span>}
        {filterRet && <span className="chip bg-brand-100 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300">@ {filterRet} <button onClick={() => setFilterRet(null)} className="ml-1">✕</button></span>}
      </div>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-5">
        <div>
          {filtered.length === 0 ? (
            <Empty>No spending entries{entries.length > 0 ? ' match your filters' : ' yet'}.</Empty>
          ) : (
            <ul className="space-y-2">
              {filtered.map(e => (
                <li key={e.id} className="card card-pad flex flex-wrap gap-3 items-start">
                  <ProviderLogo name={e.retailer || e.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      {e.name}
                      {e.warranty?.until && <span className="chip bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">🛡️ Warranty to {e.warranty.until}</span>}
                    </div>
                    <div className="text-xs text-slate-500">
                      {fmtDate(e.date)}
                      {e.retailer && <> · <button className="hover:underline" onClick={() => setFilterRet(e.retailer!)}>{e.retailer}</button></>}
                      {' · '}<button className="hover:underline" onClick={() => setFilterCat(e.category)}>{e.category}</button>
                    </div>
                    {e.description && <div className="text-xs mt-1 text-slate-600 dark:text-slate-300">{e.description}</div>}
                    {e.referenceUrl && <div className="text-xs mt-1"><a href={e.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 hover:underline">↗ Reference link</a></div>}
                    {e.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {e.attachments.map(a => (
                          <a key={a.id} href={a.data} download={a.filename} className="chip bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700">📎 {a.filename}</a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums"><Money value={e.amount} /></div>
                    <button className="btn-ghost text-red-500 text-sm mt-1" onClick={() => { if (confirm('Delete this entry?')) del(e.id); }}>🗑️</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card card-pad">
            <div className="font-semibold mb-2">Top categories</div>
            {byCat.length === 0 ? <div className="text-sm text-slate-500">No data yet.</div> :
              <ul className="space-y-1 text-sm">
                {byCat.slice(0, 8).map(r => (
                  <li key={r.name} className="flex items-center gap-2">
                    <button className="flex-1 text-left hover:underline" onClick={() => setFilterCat(r.name)}>{r.name}</button>
                    <span className="tabular-nums"><Money value={r.total} /></span>
                  </li>
                ))}
              </ul>
            }
          </div>
          <div className="card card-pad">
            <div className="font-semibold mb-2">Top retailers</div>
            {byRet.length === 0 ? <div className="text-sm text-slate-500">No retailer data yet.</div> :
              <ul className="space-y-1 text-sm">
                {byRet.slice(0, 8).map(r => (
                  <li key={r.name} className="flex items-center gap-2">
                    <ProviderLogo name={r.name} size={20} />
                    <button className="flex-1 text-left hover:underline" onClick={() => setFilterRet(r.name)}>{r.name}</button>
                    <span className="text-xs text-slate-500">×{r.count}</span>
                    <span className="tabular-nums"><Money value={r.total} /></span>
                  </li>
                ))}
              </ul>
            }
          </div>
        </aside>
      </div>
    </div>
  );
}

function SpendingForm({ onSubmit, onCancel }: { onSubmit: (e: Omit<SpendingEntry, 'id'>) => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('');
  const [retailer, setRetailer] = useState('');
  const [description, setDescription] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [warrantyUntil, setWarrantyUntil] = useState('');
  const [warrantyProvider, setWarrantyProvider] = useState('');
  const [warrantyNotes, setWarrantyNotes] = useState('');
  const [attachments, setAttachments] = useState<SpendingAttachment[]>([]);
  const [busy, setBusy] = useState(false);

  const totalBytes = attachments.reduce((s, a) => s + (a.bytes || 0), 0);

  return (
    <form
      className="card card-pad mb-5 space-y-3"
      onSubmit={async e => {
        e.preventDefault();
        if (!name || !date || amount < 0) return;
        const warranty = (warrantyUntil || warrantyProvider || warrantyNotes)
          ? { until: warrantyUntil || undefined, provider: warrantyProvider || undefined, notes: warrantyNotes || undefined }
          : undefined;
        onSubmit({
          name, amount, date,
          category: category || 'Uncategorised',
          retailer: retailer || undefined,
          description: description || undefined,
          referenceUrl: referenceUrl || undefined,
          warranty,
          attachments
        });
      }}
    >
      <div className="font-semibold">New spending entry</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Name *"><input autoFocus className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Bluetooth headphones" required /></Field>
        <Field label="Amount (£) *"><NumInput value={amount} onChange={setAmount} step="0.01" /></Field>
        <Field label="Date *"><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} required /></Field>
        <Field label="Category"><input className="input" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Electronics" /></Field>
        <Field label="Retailer"><input className="input" value={retailer} onChange={e => setRetailer(e.target.value)} placeholder="e.g. Currys" /></Field>
        <Field label="Reference URL"><input className="input" type="url" value={referenceUrl} onChange={e => setReferenceUrl(e.target.value)} placeholder="https://…" /></Field>
        <Field label="Description"><input className="input" value={description} onChange={e => setDescription(e.target.value)} /></Field>
      </div>

      <details className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <summary className="text-sm font-semibold cursor-pointer">🛡️ Warranty</summary>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          <Field label="Warranty until"><input className="input" type="date" value={warrantyUntil} onChange={e => setWarrantyUntil(e.target.value)} /></Field>
          <Field label="Warranty provider"><input className="input" value={warrantyProvider} onChange={e => setWarrantyProvider(e.target.value)} /></Field>
          <Field label="Warranty notes"><input className="input" value={warrantyNotes} onChange={e => setWarrantyNotes(e.target.value)} /></Field>
        </div>
      </details>

      <details className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
        <summary className="text-sm font-semibold cursor-pointer">📎 Attachments / receipts ({attachments.length})</summary>
        <div className="mt-3 space-y-2">
          <input
            type="file"
            multiple
            onChange={async e => {
              const files = e.target.files;
              if (!files) return;
              setBusy(true);
              const next: SpendingAttachment[] = [...attachments];
              for (const f of Array.from(files)) {
                try {
                  const att = await fileToAttachment(f);
                  if (att.bytes > SOFT_WARN_BYTES) {
                    if (!confirm(`${f.name} is ${(f.size / 1024 / 1024).toFixed(1)} MB. Large attachments make backups slow — keep it?`)) continue;
                  }
                  next.push(att);
                } catch (err) {
                  alert((err as Error).message);
                }
              }
              setAttachments(next); setBusy(false);
              e.target.value = '';
            }}
            className="block text-sm"
          />
          {attachments.length > 0 && (
            <ul className="space-y-1 text-sm">
              {attachments.map(a => (
                <li key={a.id} className="flex items-center gap-2">
                  📎 <span className="flex-1 truncate">{a.filename}</span>
                  <span className="text-xs text-slate-500">{(a.bytes / 1024).toFixed(0)} KB</span>
                  <button type="button" className="btn-ghost text-red-500 text-xs" onClick={() => setAttachments(attachments.filter(x => x.id !== a.id))}>✕</button>
                </li>
              ))}
              <li className="text-xs text-slate-500">Total {(totalBytes / 1024).toFixed(0)} KB</li>
            </ul>
          )}
        </div>
      </details>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" disabled={busy || !name || amount < 0}>+ Add entry</button>
      </div>
    </form>
  );
}

function fmt(n: number) { return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 2 }).format(n || 0); }
function fmtDate(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'EEE d MMM yyyy') : iso;
}
