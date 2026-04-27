import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, PageHeader, Empty } from '../components/common';
import { YearlyEventType } from '../types';
import {
  YE_HEADERS, YE_SAMPLE_ROWS,
  sampleYearlyEventsCsv, sampleYearlyEventsXlsx,
  parseYearlyEventRows, parseFile,
  backupYearlyEventsCsv, backupYearlyEventsXlsx, downloadBlob, ParsedYERow
} from '../lib/import-export';

const TYPE_ICONS: Record<YearlyEventType, string> = {
  birthday: '🎂', service: '🔧', insurance: '🛡️', other: '📌'
};

export function YearlyEvents() {
  const state = useFinanceStore(s => s.state);
  const items = state.yearlyEvents;
  const add = useFinanceStore(s => s.addYearlyEvent);
  const update = useFinanceStore(s => s.updateYearlyEvent);
  const del = useFinanceStore(s => s.deleteYearlyEvent);
  const importYE = useFinanceStore(s => s.importYearlyEvents);

  const [showIO, setShowIO] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [preview, setPreview] = useState<ParsedYERow[] | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [error, setError] = useState<string | null>(null);

  const onFile = async (f: File) => {
    setError(null);
    try {
      const rows = await parseFile(f);
      setPreview(parseYearlyEventRows(rows));
    } catch (e) { setError((e as Error).message); }
  };
  const confirmImport = () => {
    if (!preview) return;
    const valid = preview.filter(p => p.ok && p.event).map(p => p.event!);
    if (valid.length === 0) return;
    importYE(valid, mode);
    setPreview(null); setShowIO(false);
    alert(`${valid.length} events imported.`);
  };

  const [name, setName] = useState('');
  const [type, setType] = useState<YearlyEventType>('birthday');
  const [date, setDate] = useState('');
  const [recurrence, setRecurrence] = useState<'once' | 'yearly'>('yearly');
  const [cost, setCost] = useState('');

  return (
    <div>
      <PageHeader
        title="Yearly events"
        subtitle="Birthdays, vehicle servicing, insurance renewals, one-off costs"
        actions={<button className="btn-secondary" onClick={() => setShowIO(s => !s)}>📥 Import / export</button>}
      />

      {showIO && (
        <div className="card card-pad mb-5 space-y-3">
          <div className="flex items-center justify-between"><div className="font-semibold">📥 Yearly events — import / export</div><button className="btn-ghost text-slate-500" onClick={() => { setShowIO(false); setPreview(null); }}>✕</button></div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => downloadBlob(new Blob([sampleYearlyEventsCsv()], { type: 'text/csv' }), 'yearly-events-template.csv')}>⬇ Template CSV</button>
            <button className="btn-secondary" onClick={() => downloadBlob(sampleYearlyEventsXlsx(), 'yearly-events-template.xlsx')}>⬇ Template XLSX</button>
            <button className="btn-secondary" onClick={() => downloadBlob(backupYearlyEventsCsv(state), 'yearly-events.csv')} disabled={items.length === 0}>⬇ Export CSV</button>
            <button className="btn-secondary" onClick={() => downloadBlob(backupYearlyEventsXlsx(state), 'yearly-events.xlsx')} disabled={items.length === 0}>⬇ Export XLSX</button>
            <button className="btn-ghost text-sm" onClick={() => setShowSample(s => !s)}>{showSample ? '− Hide' : '+ Show'} example rows</button>
          </div>
          {showSample && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs"><thead><tr>{YE_HEADERS.map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead><tbody>{YE_SAMPLE_ROWS.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="table-td">{c}</td>)}</tr>)}</tbody></table>
            </div>
          )}
          <div className="text-[11px] text-slate-500">
            <strong>Type</strong>: birthday / service / insurance / other. <strong>Recurrence</strong>: yearly / once. <strong>Date</strong>: YYYY-MM-DD.
          </div>
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
                {preview.map((p, i) => <li key={i} className={`px-3 py-1.5 ${p.ok ? '' : 'text-red-500 bg-red-50 dark:bg-red-900/10'}`}>{p.ok ? `✓ ${p.event!.name} · ${p.event!.type} · ${p.event!.date} · ${p.event!.recurrence}` : p.reason}</li>)}
              </ul>
              <div className="flex gap-2 mt-2">
                <button className="btn-primary" onClick={confirmImport} disabled={!preview.some(p => p.ok)}>Import {preview.filter(p => p.ok).length}</button>
                <button className="btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      <form className="card card-pad mb-5 grid sm:grid-cols-6 gap-3" onSubmit={e => {
        e.preventDefault();
        if (!name || !date) return;
        add({ name, type, date, recurrence, cost: cost ? parseFloat(cost) : undefined });
        setName(''); setDate(''); setCost('');
      }}>
        <Field label="Name"><input className="input" value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Type"><select className="input" value={type} onChange={e => setType(e.target.value as YearlyEventType)}>
          <option value="birthday">Birthday</option>
          <option value="service">Service</option>
          <option value="insurance">Insurance</option>
          <option value="other">Other</option>
        </select></Field>
        <Field label="Date"><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Repeats"><select className="input" value={recurrence} onChange={e => setRecurrence(e.target.value as any)}>
          <option value="yearly">Yearly</option><option value="once">Once</option>
        </select></Field>
        <Field label="Cost £ (optional)"><input className="input" type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} /></Field>
        <div className="flex items-end"><button className="btn-primary w-full">Add</button></div>
      </form>

      {items.length === 0 ? <Empty>No events yet.</Empty> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>
              <th className="table-th"></th>
              <th className="table-th">Name</th>
              <th className="table-th">Type</th>
              <th className="table-th">Date</th>
              <th className="table-th">Repeats</th>
              <th className="table-th">Cost</th>
              <th className="table-th"></th>
            </tr></thead>
            <tbody>
              {items.map(e => (
                <tr key={e.id}>
                  <td className="table-td text-xl">{TYPE_ICONS[e.type]}</td>
                  <td className="table-td"><input className="input !py-1" value={e.name} onChange={ev => update(e.id, { name: ev.target.value })} /></td>
                  <td className="table-td">
                    <select className="input !py-1" value={e.type} onChange={ev => update(e.id, { type: ev.target.value as YearlyEventType })}>
                      <option value="birthday">Birthday</option>
                      <option value="service">Service</option>
                      <option value="insurance">Insurance</option>
                      <option value="other">Other</option>
                    </select>
                  </td>
                  <td className="table-td"><input className="input !py-1" type="date" value={e.date} onChange={ev => update(e.id, { date: ev.target.value })} /></td>
                  <td className="table-td">
                    <select className="input !py-1" value={e.recurrence} onChange={ev => update(e.id, { recurrence: ev.target.value as any })}>
                      <option value="yearly">Yearly</option><option value="once">Once</option>
                    </select>
                  </td>
                  <td className="table-td"><input className="input !py-1" type="number" step="0.01" value={e.cost ?? ''} onChange={ev => update(e.id, { cost: ev.target.value ? parseFloat(ev.target.value) : undefined })} /></td>
                  <td className="table-td"><button className="btn-ghost text-red-500" onClick={() => del(e.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
