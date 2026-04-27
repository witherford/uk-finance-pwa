import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, NumInput, Money } from './common';
import { BillHistoryEntry } from '../types';
import { endDateFromMonths, termFromDates } from '../lib/agreement';
import { format, parseISO, isValid } from 'date-fns';

export function BillHistory({ paymentId, history }: { paymentId: string; history: BillHistoryEntry[] }) {
  const addH = useFinanceStore(s => s.addBillHistory);
  const updateH = useFinanceStore(s => s.updateBillHistory);
  const deleteH = useFinanceStore(s => s.deleteBillHistory);
  const [show, setShow] = useState(false);

  const [provider, setProvider] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [termMonths, setTermMonths] = useState(12);
  const [useTerm, setUseTerm] = useState(true);
  const [cadence, setCadence] = useState<'monthly' | 'annual'>('monthly');
  const [amount, setAmount] = useState(0);
  const [settleDate, setSettleDate] = useState('');
  const [settleAmount, setSettleAmount] = useState(0);
  const [notes, setNotes] = useState('');

  const reset = () => {
    setProvider(''); setStart(''); setEnd(''); setTermMonths(12); setUseTerm(true);
    setCadence('monthly'); setAmount(0); setSettleDate(''); setSettleAmount(0); setNotes('');
  };

  return (
    <div className="mt-4">
      <button type="button" className="btn-secondary" onClick={() => setShow(s => !s)}>
        📜 {show ? 'Hide' : 'Show'} history ({history.length})
      </button>

      {show && (
        <div className="mt-3 space-y-3">
          <form
            className="card card-pad space-y-3"
            onSubmit={e => {
              e.preventDefault();
              if (!provider || !start) return;
              const finalEnd = useTerm
                ? endDateFromMonths(start, termMonths)
                : end;
              if (!finalEnd) return;
              addH(paymentId, {
                provider, startDate: start, endDate: finalEnd,
                paymentCadence: cadence, amount,
                settlementDate: settleDate || undefined,
                settlementAmount: settleAmount > 0 ? settleAmount : undefined,
                notes: notes || undefined
              });
              reset();
            }}
          >
            <div className="font-semibold text-sm">Add past arrangement</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Field label="Provider"><input className="input" value={provider} onChange={e => setProvider(e.target.value)} /></Field>
              <Field label="Start date"><input className="input" type="date" value={start} onChange={e => setStart(e.target.value)} /></Field>
              <Field label="End determined by">
                <select className="input" value={useTerm ? 'term' : 'date'} onChange={e => setUseTerm(e.target.value === 'term')}>
                  <option value="term">Term length (auto end)</option>
                  <option value="date">Specific end date</option>
                </select>
              </Field>
              {useTerm
                ? <Field label="Term (months)"><NumInput value={termMonths} onChange={n => setTermMonths(Math.round(n))} step="1" min={1} /></Field>
                : <Field label="End date"><input className="input" type="date" value={end} onChange={e => setEnd(e.target.value)} /></Field>}
              <Field label="Payment cadence">
                <select className="input" value={cadence} onChange={e => setCadence(e.target.value as any)}>
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                </select>
              </Field>
              <Field label={`Amount per ${cadence === 'monthly' ? 'month' : 'year'} (£)`}>
                <NumInput value={amount} onChange={setAmount} step="0.01" />
              </Field>
              <Field label="Settlement date (optional)"><input className="input" type="date" value={settleDate} onChange={e => setSettleDate(e.target.value)} /></Field>
              <Field label="Settlement amount (£)"><NumInput value={settleAmount} onChange={setSettleAmount} step="0.01" /></Field>
            </div>
            <Field label="Notes"><input className="input" value={notes} onChange={e => setNotes(e.target.value)} /></Field>
            <div className="flex justify-end"><button className="btn-primary">+ Add history</button></div>
          </form>

          {history.length > 0 && (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr>
                  <th className="table-th">Provider</th>
                  <th className="table-th">Period</th>
                  <th className="table-th">Length</th>
                  <th className="table-th">Cadence</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Settled</th>
                  <th className="table-th"></th>
                </tr></thead>
                <tbody>
                  {history.map(h => {
                    const term = termFromDates(h.startDate, h.endDate);
                    return (
                      <tr key={h.id}>
                        <td className="table-td"><input className="input !py-1" value={h.provider} onChange={e => updateH(paymentId, h.id, { provider: e.target.value })} /></td>
                        <td className="table-td whitespace-nowrap">
                          {fmtDate(h.startDate)} → {fmtDate(h.endDate)}
                        </td>
                        <td className="table-td">{term ? `${term.months}m` : '—'}</td>
                        <td className="table-td">
                          <select className="input !py-1" value={h.paymentCadence} onChange={e => updateH(paymentId, h.id, { paymentCadence: e.target.value as any })}>
                            <option value="monthly">monthly</option><option value="annual">annual</option>
                          </select>
                        </td>
                        <td className="table-td"><Money value={h.amount} /></td>
                        <td className="table-td">{h.settlementDate ? `${fmtDate(h.settlementDate)} (${h.settlementAmount ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(h.settlementAmount) : '—'})` : '—'}</td>
                        <td className="table-td"><button className="btn-ghost text-red-500" onClick={() => deleteH(paymentId, h.id)}>✕</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function fmtDate(iso: string): string {
  const d = parseISO(iso);
  return isValid(d) ? format(d, 'd MMM yyyy') : iso;
}
