import { useMemo, useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, NumInput, Money } from './common';
import { Employer, WageSlip } from '../types';
import {
  WAGESLIP_HEADERS, WAGESLIP_SAMPLE_ROWS,
  sampleWageSlipsCsv, sampleWageSlipsXlsx, parseWageSlipRows, parseFile,
  backupWageSlipsCsv, backupWageSlipsXlsx, downloadBlob
} from '../lib/import-export';

export function WageSlipsList({ employer }: { employer: Employer }) {
  const addSlip = useFinanceStore(s => s.addWageSlip);
  const updateSlip = useFinanceStore(s => s.updateWageSlip);
  const deleteSlip = useFinanceStore(s => s.deleteWageSlip);
  const importSlips = useFinanceStore(s => s.importWageSlips);

  const [open, setOpen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [preview, setPreview] = useState<{ ok: boolean; reason?: string; slip?: Omit<WageSlip, 'id'> }[] | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [error, setError] = useState<string | null>(null);

  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [taxCode, setTaxCode] = useState('1257L');
  const [grossPay, setGrossPay] = useState(0);
  const [netPay, setNetPay] = useState(0);
  const [ytdGross, setYtdGross] = useState(0);
  const [ytdTax, setYtdTax] = useState(0);
  const [ytdNi, setYtdNi] = useState(0);
  const [incomeTax, setIncomeTax] = useState(0);
  const [ni, setNi] = useState(0);
  const [pension, setPension] = useState(0);
  const [studentLoan, setStudentLoan] = useState(0);
  const [other, setOther] = useState(0);

  const sortedSlips = useMemo(() => [...employer.wageSlips].sort((a, b) => b.payDate.localeCompare(a.payDate)), [employer.wageSlips]);

  const reset = () => {
    setPayDate(new Date().toISOString().slice(0, 10));
    setGrossPay(0); setNetPay(0); setYtdGross(0); setYtdTax(0); setYtdNi(0);
    setIncomeTax(0); setNi(0); setPension(0); setStudentLoan(0); setOther(0);
  };

  const onFile = async (file: File) => {
    setError(null);
    try {
      const rows = await parseFile(file);
      const parsed = parseWageSlipRows(rows);
      setPreview(parsed);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    const valid = preview.filter(p => p.ok && p.slip).map(p => p.slip!);
    if (valid.length === 0) return;
    importSlips(employer.id, valid, mode);
    setPreview(null);
    setShowImport(false);
    alert(`${valid.length} wage slips imported.`);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="font-semibold flex-1 min-w-0">Wage slips ({employer.wageSlips.length})</div>
        <button className="btn-secondary !py-1 text-sm" onClick={() => setOpen(o => !o)}>{open ? 'Close' : '+ Add'}</button>
        <button className="btn-secondary !py-1 text-sm" onClick={() => setShowImport(s => !s)}>📥 Import / export</button>
      </div>

      {open && (
        <form
          className="card card-pad mb-3 space-y-3"
          onSubmit={e => {
            e.preventDefault();
            addSlip(employer.id, {
              payDate, taxCode, grossPay, netPay, ytdGross, ytdTax, ytdNi, incomeTax, ni, pension,
              studentLoan: studentLoan > 0 ? studentLoan : undefined,
              otherDeductions: other > 0 ? other : undefined
            });
            reset();
            setOpen(false);
          }}
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Pay date"><input className="input" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} /></Field>
            <Field label="Tax code"><input className="input" value={taxCode} onChange={e => setTaxCode(e.target.value.toUpperCase())} /></Field>
            <Field label="Gross pay (£)"><NumInput value={grossPay} onChange={setGrossPay} step="0.01" /></Field>
            <Field label="Net pay (£)"><NumInput value={netPay} onChange={setNetPay} step="0.01" /></Field>
            <Field label="YTD gross (£)"><NumInput value={ytdGross} onChange={setYtdGross} step="0.01" /></Field>
            <Field label="YTD tax (£)"><NumInput value={ytdTax} onChange={setYtdTax} step="0.01" /></Field>
            <Field label="YTD NI (£)"><NumInput value={ytdNi} onChange={setYtdNi} step="0.01" /></Field>
            <Field label="Income tax this period (£)"><NumInput value={incomeTax} onChange={setIncomeTax} step="0.01" /></Field>
            <Field label="NI this period (£)"><NumInput value={ni} onChange={setNi} step="0.01" /></Field>
            <Field label="Pension (£)"><NumInput value={pension} onChange={setPension} step="0.01" /></Field>
            <Field label="Student loan (£)"><NumInput value={studentLoan} onChange={setStudentLoan} step="0.01" /></Field>
            <Field label="Other deductions (£)"><NumInput value={other} onChange={setOther} step="0.01" /></Field>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={() => { reset(); setOpen(false); }}>Cancel</button><button className="btn-primary">+ Add wage slip</button></div>
        </form>
      )}

      {showImport && (
        <div className="card card-pad mb-3 space-y-3">
          <div className="flex items-center justify-between"><div className="font-semibold">📥 Wage slips — import / export</div><button className="btn-ghost text-slate-500" onClick={() => { setShowImport(false); setPreview(null); }}>✕</button></div>
          <div className="text-xs text-slate-500">Required: PayDate, Gross, Net, YTDGross. Other columns optional.</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => downloadBlob(new Blob([sampleWageSlipsCsv()], { type: 'text/csv' }), `wage-slips-template.csv`)}>⬇ Template CSV</button>
            <button className="btn-secondary" onClick={() => downloadBlob(sampleWageSlipsXlsx(), 'wage-slips-template.xlsx')}>⬇ Template XLSX</button>
            <button className="btn-secondary" onClick={() => downloadBlob(backupWageSlipsCsv(employer), `${employer.name}-wage-slips.csv`)} disabled={employer.wageSlips.length === 0}>⬇ Export CSV</button>
            <button className="btn-secondary" onClick={() => downloadBlob(backupWageSlipsXlsx(employer), `${employer.name}-wage-slips.xlsx`)} disabled={employer.wageSlips.length === 0}>⬇ Export XLSX</button>
            <button className="btn-ghost text-sm" onClick={() => setShowSample(s => !s)}>{showSample ? '− Hide' : '+ Show'} example rows</button>
          </div>
          {showSample && (
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs"><thead><tr>{WAGESLIP_HEADERS.map(h => <th key={h} className="table-th whitespace-nowrap">{h}</th>)}</tr></thead><tbody>{WAGESLIP_SAMPLE_ROWS.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="table-td whitespace-nowrap">{c}</td>)}</tr>)}</tbody></table>
            </div>
          )}
          <input type="file" accept=".csv,.xlsx,.xls,.tsv,.txt" onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} className="block text-sm" />
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} /> Merge</label>
            <label className="flex items-center gap-2"><input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Replace this employer's slips</label>
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          {preview && (
            <div>
              <div className="font-semibold mb-1 text-sm">Preview — {preview.filter(p => p.ok).length} valid · {preview.filter(p => !p.ok).length} invalid</div>
              <ul className="text-xs max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                {preview.map((p, i) => <li key={i} className={`px-3 py-1.5 ${p.ok ? '' : 'text-red-500 bg-red-50 dark:bg-red-900/10'}`}>{p.ok ? `✓ ${p.slip!.payDate} · gross £${p.slip!.grossPay} · net £${p.slip!.netPay}` : p.reason}</li>)}
              </ul>
              <div className="flex gap-2 mt-2">
                <button className="btn-primary" onClick={confirmImport} disabled={!preview.some(p => p.ok)}>Import {preview.filter(p => p.ok).length}</button>
                <button className="btn-ghost" onClick={() => setPreview(null)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {sortedSlips.length === 0 ? (
        <div className="text-sm text-slate-500">No wage slips yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>
              <th className="table-th">Date</th>
              <th className="table-th">Tax code</th>
              <th className="table-th">Gross</th>
              <th className="table-th">Net</th>
              <th className="table-th">YTD gross</th>
              <th className="table-th">Tax</th>
              <th className="table-th">NI</th>
              <th className="table-th">Pension</th>
              <th className="table-th"></th>
            </tr></thead>
            <tbody>
              {sortedSlips.map(s => (
                <tr key={s.id}>
                  <td className="table-td whitespace-nowrap"><input className="input !py-1" type="date" value={s.payDate} onChange={e => updateSlip(employer.id, s.id, { payDate: e.target.value })} /></td>
                  <td className="table-td"><input className="input !py-1 w-20" value={s.taxCode} onChange={e => updateSlip(employer.id, s.id, { taxCode: e.target.value.toUpperCase() })} /></td>
                  <td className="table-td"><NumInput value={s.grossPay} onChange={n => updateSlip(employer.id, s.id, { grossPay: n })} step="0.01" /></td>
                  <td className="table-td"><NumInput value={s.netPay} onChange={n => updateSlip(employer.id, s.id, { netPay: n })} step="0.01" /></td>
                  <td className="table-td"><NumInput value={s.ytdGross} onChange={n => updateSlip(employer.id, s.id, { ytdGross: n })} step="0.01" /></td>
                  <td className="table-td"><NumInput value={s.incomeTax} onChange={n => updateSlip(employer.id, s.id, { incomeTax: n })} step="0.01" /></td>
                  <td className="table-td"><NumInput value={s.ni} onChange={n => updateSlip(employer.id, s.id, { ni: n })} step="0.01" /></td>
                  <td className="table-td"><NumInput value={s.pension} onChange={n => updateSlip(employer.id, s.id, { pension: n })} step="0.01" /></td>
                  <td className="table-td"><button className="btn-ghost text-red-500" onClick={() => deleteSlip(employer.id, s.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
