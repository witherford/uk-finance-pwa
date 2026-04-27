import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import {
  DEBT_HEADERS, DEBT_SAMPLE_ROWS,
  ParsedDebtRow, parseDebtRows, parseFile,
  sampleDebtsCsv, sampleDebtsXlsx,
  backupDebtsCsv, backupDebtsXlsx,
  downloadBlob
} from '../lib/import-export';

export function DebtImport() {
  const state = useFinanceStore(s => s.state);
  const importPayments = useFinanceStore(s => s.importPayments);
  const debtCount = state.payments.filter(p => p.kind === 'debt').length;

  const [open, setOpen] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [preview, setPreview] = useState<ParsedDebtRow[] | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    try {
      const rows = await parseFile(file);
      const parsed = parseDebtRows(rows);
      setPreview(parsed);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    const valid = preview.filter(r => r.ok && r.payment).map(r => r.payment!);
    if (valid.length === 0) return;
    // We ask the store to do a *debt-scoped* replace if the user picked replace, by
    // first removing existing debts and then adding the new ones. Since the store's
    // importPayments only knows merge|replace at the global level, we approximate with merge:
    importPayments(valid, 'merge');
    if (mode === 'replace') {
      // Manually delete previous debts (those not in the freshly imported set).
      // We've just merged new debts in, but we still have the old ones — wipe by ids.
      const newSet = new Set(valid.map(v => v.name + '|' + v.amount));
      const stale = state.payments.filter(p => p.kind === 'debt' && !newSet.has(p.name + '|' + p.amount));
      stale.forEach(p => useFinanceStore.getState().deletePayment(p.id));
    }
    setPreview(null);
    setOpen(false);
    alert(`${valid.length} debts imported.`);
  };

  if (!open) {
    return (
      <div className="card card-pad mb-5 flex flex-wrap items-center gap-3">
        <span className="text-2xl">📥</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Import / export debts</div>
          <div className="text-xs text-slate-500">
            Bulk add from CSV / XLSX, or download your {debtCount} debt{debtCount === 1 ? '' : 's'} as a backup.
          </div>
        </div>
        <button className="btn-secondary" onClick={() => downloadBlob(new Blob([sampleDebtsCsv()], { type: 'text/csv' }), 'debts-template.csv')}>📄 Template CSV</button>
        <button className="btn-secondary" onClick={() => downloadBlob(sampleDebtsXlsx(), 'debts-template.xlsx')}>📄 Template XLSX</button>
        <button className="btn-primary" onClick={() => setOpen(true)}>Import / export</button>
      </div>
    );
  }

  return (
    <div className="card card-pad mb-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">📥 Import / export debts</div>
        <button className="btn-ghost text-slate-500" onClick={() => { setOpen(false); setPreview(null); setError(null); }} aria-label="Close">✕</button>
      </div>

      <section>
        <div className="text-sm font-semibold mb-1">1. Get the template</div>
        <p className="text-xs text-slate-500 mb-2">
          Open the template in Excel / Numbers / Google Sheets, fill in your debts, save it, then upload below.
          Required columns: <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">Name</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">Amount</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 rounded">Frequency</code>.
          Other columns are optional.
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          <button className="btn-secondary" onClick={() => downloadBlob(new Blob([sampleDebtsCsv()], { type: 'text/csv' }), 'debts-template.csv')}>⬇ Template CSV</button>
          <button className="btn-secondary" onClick={() => downloadBlob(sampleDebtsXlsx(), 'debts-template.xlsx')}>⬇ Template XLSX</button>
          <button className="btn-ghost text-sm" onClick={() => setShowSample(s => !s)}>
            {showSample ? '− Hide' : '+ Show'} example rows
          </button>
        </div>
        {showSample && (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="w-full text-xs">
              <thead><tr>{DEBT_HEADERS.map(h => <th key={h} className="table-th whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{DEBT_SAMPLE_ROWS.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className="table-td whitespace-nowrap">{c}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <div className="text-[11px] text-slate-500 mt-2 space-y-0.5">
          <div><strong>Frequency</strong> values: <code>daily</code>, <code>weekly</code>, <code>fortnightly</code>, <code>monthly</code>, <code>quarterly</code>, <code>sixmonthly</code>, <code>yearly</code>, <code>oneoff</code>.</div>
          <div><strong>Dates</strong> in <code>YYYY-MM-DD</code> format. <strong>Amount</strong> = the regular payment (not the balance).</div>
          <div><strong>Balance / APR / MinPayment</strong> are optional — they get appended to Notes for reference.</div>
        </div>
      </section>

      <section>
        <div className="text-sm font-semibold mb-1">2. Upload your file</div>
        <input
          type="file"
          accept=".csv,.xlsx,.xls,.tsv,.txt"
          onChange={e => e.target.files?.[0] && onFile(e.target.files[0])}
          className="block text-sm"
        />
        <div className="flex items-center gap-3 mt-2 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} /> Merge with existing debts</label>
          <label className="flex items-center gap-2"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace all my debts</label>
        </div>
        {error && <div className="text-sm text-red-500 mt-2">{error}</div>}

        {preview && (
          <div className="mt-4">
            <div className="font-semibold mb-1 text-sm">
              Preview — {preview.filter(p => p.ok).length} valid · {preview.filter(p => !p.ok).length} invalid
            </div>
            <ul className="text-xs max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              {preview.map((p, i) => (
                <li key={i} className={`px-3 py-1.5 ${p.ok ? '' : 'text-red-500 bg-red-50 dark:bg-red-900/10'}`}>
                  {p.ok ? `✓ ${p.payment!.name} · £${p.payment!.amount} ${p.payment!.frequency} · ${p.payment!.categoryName}${p.payment!.notes ? ` (${p.payment!.notes})` : ''}` : p.reason}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button className="btn-primary" onClick={confirmImport} disabled={!preview.some(p => p.ok)}>
                Import {preview.filter(p => p.ok).length} debt{preview.filter(p => p.ok).length === 1 ? '' : 's'}
              </button>
              <button className="btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="pt-3 border-t border-slate-200 dark:border-slate-800">
        <div className="text-sm font-semibold mb-2">3. Or back up your existing debts</div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary" onClick={() => downloadBlob(backupDebtsCsv(state), `debts-${new Date().toISOString().slice(0, 10)}.csv`)} disabled={debtCount === 0}>
            ⬇ Export CSV
          </button>
          <button className="btn-secondary" onClick={() => downloadBlob(backupDebtsXlsx(state), `debts-${new Date().toISOString().slice(0, 10)}.xlsx`)} disabled={debtCount === 0}>
            ⬇ Export XLSX
          </button>
          {debtCount === 0 && <span className="text-xs text-slate-500 self-center">No debts to export yet.</span>}
        </div>
      </section>
    </div>
  );
}
