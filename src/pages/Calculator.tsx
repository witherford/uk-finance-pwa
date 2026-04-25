import { useState } from 'react';
import { evaluate } from 'mathjs';
import { useFinanceStore } from '../store/useFinanceStore';
import { PageHeader, Empty } from '../components/common';
import { format, parseISO } from 'date-fns';

export function Calculator() {
  const memory = useFinanceStore(s => s.state.calcMemory);
  const addMem = useFinanceStore(s => s.addCalcMemory);
  const delMem = useFinanceStore(s => s.deleteCalcMemory);

  const [expr, setExpr] = useState('');
  const [label, setLabel] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compute = () => {
    try {
      const r = evaluate(expr || '0');
      setResult(typeof r === 'number' ? r.toString() : String(r));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  };

  const button = (k: string) => (
    <button key={k} className="btn-secondary justify-center text-base !px-0 py-3" onClick={() => setExpr(e => e + k)}>{k}</button>
  );

  const KEYS = ['7','8','9','/','(',')','4','5','6','*','^','%','1','2','3','-','sqrt(','pi','0','.','+',',','sin(','cos('];

  return (
    <div>
      <PageHeader title="Calculator" subtitle="Saveable memory keeps useful figures around" />

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card card-pad">
          <input
            className="input text-2xl font-mono mb-3"
            value={expr}
            onChange={e => setExpr(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') compute(); }}
            placeholder="e.g. (2500 - 600) * 12"
          />
          <div className="grid grid-cols-6 gap-2 mb-3">
            {KEYS.map(button)}
          </div>
          <div className="flex gap-2 mb-3">
            <button className="btn-primary flex-1 justify-center" onClick={compute}>=</button>
            <button className="btn-ghost" onClick={() => { setExpr(''); setResult(null); setError(null); }}>Clear</button>
            <button className="btn-secondary" onClick={() => setExpr(e => e.slice(0, -1))}>⌫</button>
          </div>
          {result !== null && (
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-2xl font-mono">
              = {result}
            </div>
          )}
          {error && <div className="text-sm text-red-500 mt-2">{error}</div>}

          <div className="mt-4 grid sm:grid-cols-3 gap-2">
            <input className="input sm:col-span-2" placeholder="Label this calculation" value={label} onChange={e => setLabel(e.target.value)} />
            <button className="btn-secondary" disabled={!result || !label} onClick={() => {
              if (!result) return;
              addMem({ label, expression: expr, result });
              setLabel('');
            }}>💾 Save to memory</button>
          </div>
        </div>

        <div className="card card-pad">
          <div className="font-semibold mb-2">Memory</div>
          {memory.length === 0 ? <Empty>No saved calculations yet.</Empty> : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {memory.map(m => (
                <li key={m.id} className="py-2 flex items-center gap-3">
                  <button className="text-left flex-1 min-w-0 hover:bg-slate-50 dark:hover:bg-slate-800 rounded p-2 -m-2" onClick={() => { setExpr(m.expression); setResult(m.result); }}>
                    <div className="font-medium truncate">{m.label}</div>
                    <div className="text-xs text-slate-500 font-mono truncate">{m.expression} = {m.result}</div>
                    <div className="text-[10px] text-slate-400">{format(parseISO(m.createdAt), 'd MMM yyyy HH:mm')}</div>
                  </button>
                  <button className="btn-ghost text-red-500" onClick={() => delMem(m.id)}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
