import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { PageHeader, Empty } from '../components/common';
import { backupCsv, backupJson, backupXlsx, combinedXlsx, downloadBlob, parseFile, parseRows, sampleCsv, sampleXlsx, SAMPLE_HEADERS, SAMPLE_ROWS } from '../lib/import-export';
import { AppState } from '../types';

export function ImportExport() {
  const state = useFinanceStore(s => s.state);
  const importPayments = useFinanceStore(s => s.importPayments);
  const importFullState = useFinanceStore(s => s.importFullState);

  const [preview, setPreview] = useState<{ ok: boolean; reason?: string; payment?: any }[] | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    try {
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (parsed && parsed.payments) {
          if (confirm('Replace your entire vault with this JSON backup?')) {
            importFullState(parsed as AppState);
            alert('Backup restored.');
          }
          return;
        }
        setError('Unrecognised JSON shape');
        return;
      }
      const rows = await parseFile(file);
      const parsed = parseRows(rows);
      setPreview(parsed);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    const valid = preview.filter(r => r.ok && r.payment).map(r => r.payment!);
    importPayments(valid, mode);
    setPreview(null);
    alert(`${valid.length} rows imported.`);
  };

  return (
    <div>
      <PageHeader title="Import & Backup" subtitle="Bring your data in from a spreadsheet, or back it up to your device" />

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card card-pad">
          <div className="font-semibold mb-2">📥 Import</div>
          <p className="text-sm text-slate-500 mb-3">Use the sample below as a template. Required columns: <code>Kind, Name, Amount, Frequency</code>.</p>
          <div className="flex gap-2 mb-3">
            <button className="btn-secondary" onClick={() => downloadBlob(new Blob([sampleCsv()], { type: 'text/csv' }), 'sample.csv')}>Download sample CSV</button>
            <button className="btn-secondary" onClick={() => downloadBlob(sampleXlsx(), 'sample.xlsx')}>Download sample XLSX</button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 mb-3">
            <table className="w-full text-xs">
              <thead><tr>{SAMPLE_HEADERS.map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
              <tbody>{SAMPLE_ROWS.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="table-td">{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <input type="file" accept=".csv,.xlsx,.xls,.tsv,.txt,.json" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} className="block" />
          <div className="flex items-center gap-3 mt-3">
            <label className="text-sm flex items-center gap-2"><input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} /> Merge</label>
            <label className="text-sm flex items-center gap-2"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace</label>
          </div>
          {error && <div className="text-sm text-red-500 mt-2">{error}</div>}

          {preview && (
            <div className="mt-4">
              <div className="font-semibold mb-2">Preview ({preview.filter(p => p.ok).length} valid / {preview.length} total)</div>
              <ul className="text-xs max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {preview.map((p, i) => (
                  <li key={i} className={`py-1 ${p.ok ? '' : 'text-red-500'}`}>
                    {p.ok ? `✓ ${p.payment.kind} · ${p.payment.name} · £${p.payment.amount} ${p.payment.frequency}` : p.reason}
                  </li>
                ))}
              </ul>
              <button className="btn-primary mt-3" onClick={confirmImport}>Import {preview.filter(p => p.ok).length} rows</button>
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="font-semibold mb-2">💾 Backup</div>
          <p className="text-sm text-slate-500 mb-3">Download a copy of your data to your device. Backups stay on your device — nothing is uploaded.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={() => downloadBlob(combinedXlsx(state), `finance-backup-${Date.now()}.xlsx`)}>📦 Full backup (XLSX, all data)</button>
            <button className="btn-secondary" onClick={() => downloadBlob(backupJson(state), `finance-backup-${Date.now()}.json`)}>JSON (loss-less)</button>
            <button className="btn-secondary" onClick={() => downloadBlob(backupCsv(state), `payments-${Date.now()}.csv`)}>Payments CSV</button>
            <button className="btn-secondary" onClick={() => downloadBlob(backupXlsx(state), `finance-classic-${Date.now()}.xlsx`)}>Classic XLSX</button>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            The full XLSX backup has a sheet per entity (Profile, Payments, Bill_history, Mortgage, Rent,
            Tenancy_history, Home, Home_valuations, Holidays, Yearly_events, Categories, Side_incomes,
            Assets, Budgets, Calc_memory, Employers, Wage_slips, Meta). To restore, drop a JSON backup
            into the Import area on the left.
          </div>
        </div>
      </div>
    </div>
  );
}
