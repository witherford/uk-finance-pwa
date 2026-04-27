import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import {
  CT_HEADERS, CT_SAMPLE_ROWS,
  ParsedCouncilTaxRow, parseCouncilTaxRows, parseFile,
  sampleCouncilTaxCsv, sampleCouncilTaxXlsx,
  backupCouncilTaxHistoryCsv, backupCouncilTaxHistoryXlsx,
  downloadBlob
} from '../lib/import-export';

export function CouncilTaxImport({ onClose }: { onClose: () => void }) {
  const state = useFinanceStore(s => s.state);
  const importCT = useFinanceStore(s => s.importCouncilTaxHistory);

  const [showSample, setShowSample] = useState(false);
  const [preview, setPreview] = useState<ParsedCouncilTaxRow[] | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [error, setError] = useState<string | null>(null);

  const onFile = async (f: File) => {
    setError(null);
    try {
      const rows = await parseFile(f);
      setPreview(parseCouncilTaxRows(rows));
    } catch (e) { setError((e as Error).message); }
  };
  const confirmImport = () => {
    if (!preview) return;
    const valid = preview.filter(p => p.ok && p.entry).map(p => p.entry!);
    if (valid.length === 0) return;
    importCT(valid, mode);
    setPreview(null);
    onClose();
    alert(`${valid.length} council-tax rows imported.`);
  };

  return (
    <div className="card card-pad space-y-3">
      <div className="flex items-center justify-between"><div className="font-semibold">📥 Council Tax history — import / export</div><button className="btn-ghost text-slate-500" onClick={onClose}>✕</button></div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => downloadBlob(new Blob([sampleCouncilTaxCsv()], { type: 'text/csv' }), 'council-tax-history-template.csv')}>⬇ Template CSV</button>
        <button className="btn-secondary" onClick={() => downloadBlob(sampleCouncilTaxXlsx(), 'council-tax-history-template.xlsx')}>⬇ Template XLSX</button>
        <button className="btn-secondary" onClick={() => downloadBlob(backupCouncilTaxHistoryCsv(state), 'council-tax-history.csv')} disabled={state.councilTaxHistory.length === 0}>⬇ Export CSV</button>
        <button className="btn-secondary" onClick={() => downloadBlob(backupCouncilTaxHistoryXlsx(state), 'council-tax-history.xlsx')} disabled={state.councilTaxHistory.length === 0}>⬇ Export XLSX</button>
        <button className="btn-ghost text-sm" onClick={() => setShowSample(s => !s)}>{showSample ? '− Hide' : '+ Show'} example rows</button>
      </div>
      {showSample && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs"><thead><tr>{CT_HEADERS.map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead><tbody>{CT_SAMPLE_ROWS.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="table-td">{c}</td>)}</tr>)}</tbody></table>
        </div>
      )}
      <div className="text-[11px] text-slate-500"><strong>Band</strong>: A–I. <strong>Plan</strong>: 10-monthly or 12-monthly. <strong>Dates</strong>: YYYY-MM-DD.</div>
      <input type="file" accept=".csv,.xlsx,.xls,.tsv,.txt" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} className="block text-sm" />
      <div className="flex items-center gap-3 text-sm">
        <label className="flex items-center gap-2"><input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} /> Merge</label>
        <label className="flex items-center gap-2"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace all</label>
      </div>
      {error && <div className="text-sm text-red-500">{error}</div>}
      {preview && (
        <div>
          <div className="font-semibold mb-1 text-sm">Preview — {preview.filter(p => p.ok).length} valid · {preview.filter(p => !p.ok).length} invalid</div>
          <ul className="text-xs max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
            {preview.map((p, i) => <li key={i} className={`px-3 py-1.5 ${p.ok ? '' : 'text-red-500 bg-red-50 dark:bg-red-900/10'}`}>{p.ok ? `✓ ${p.entry!.council} · Band ${p.entry!.band} · ${p.entry!.plan} · £${p.entry!.monthlyCost} (${p.entry!.startDate} → ${p.entry!.endDate})` : p.reason}</li>)}
          </ul>
          <div className="flex gap-2 mt-2">
            <button className="btn-primary" onClick={confirmImport} disabled={!preview.some(p => p.ok)}>Import {preview.filter(p => p.ok).length}</button>
            <button className="btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
