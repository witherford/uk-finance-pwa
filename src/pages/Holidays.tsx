import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, Money, PageHeader, Empty } from '../components/common';
import { differenceInDays, parseISO } from 'date-fns';

export function Holidays() {
  const holidays = useFinanceStore(s => s.state.holidays);
  const add = useFinanceStore(s => s.addHoliday);
  const update = useFinanceStore(s => s.updateHoliday);
  const del = useFinanceStore(s => s.deleteHoliday);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [targetCost, setTargetCost] = useState('');
  const [targetDate, setTargetDate] = useState('');

  return (
    <div>
      <PageHeader title="Holiday goals" subtitle="Set holiday targets and track savings progress" />
      <form className="card card-pad mb-5 grid sm:grid-cols-5 gap-3" onSubmit={e => {
        e.preventDefault();
        if (!name || !targetDate) return;
        add({ name, destination, targetCost: parseFloat(targetCost) || 0, targetDate, savedToDate: 0 });
        setName(''); setDestination(''); setTargetCost(''); setTargetDate('');
      }}>
        <Field label="Name"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Summer 2026" /></Field>
        <Field label="Destination"><input className="input" value={destination} onChange={e => setDestination(e.target.value)} placeholder="Spain" /></Field>
        <Field label="Target cost £"><input className="input" type="number" step="0.01" value={targetCost} onChange={e => setTargetCost(e.target.value)} /></Field>
        <Field label="Target date"><input className="input" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></Field>
        <div className="flex items-end"><button className="btn-primary w-full">Add holiday</button></div>
      </form>

      {holidays.length === 0 ? <Empty>No holidays yet. Plan your first above ✈️</Empty> : (
        <div className="grid md:grid-cols-2 gap-4">
          {holidays.map(h => {
            const pct = h.targetCost > 0 ? Math.min(100, (h.savedToDate / h.targetCost) * 100) : 0;
            const daysLeft = differenceInDays(parseISO(h.targetDate), new Date());
            return (
              <div key={h.id} className="card card-pad">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">✈️</div>
                  <input className="input flex-1" value={h.name} onChange={e => update(h.id, { name: e.target.value })} />
                  <button className="btn-ghost text-red-500" onClick={() => del(h.id)}>✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <input className="input" placeholder="Destination" value={h.destination} onChange={e => update(h.id, { destination: e.target.value })} />
                  <input className="input" type="date" value={h.targetDate} onChange={e => update(h.id, { targetDate: e.target.value })} />
                  <input className="input" type="number" step="0.01" placeholder="Target £" value={h.targetCost} onChange={e => update(h.id, { targetCost: parseFloat(e.target.value) || 0 })} />
                  <input className="input" type="number" step="0.01" placeholder="Saved £" value={h.savedToDate} onChange={e => update(h.id, { savedToDate: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-brand-500" style={{ width: pct + '%' }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>{pct.toFixed(0)}% saved (<Money value={h.savedToDate} /> of <Money value={h.targetCost} />)</span>
                    <span>{daysLeft >= 0 ? `${daysLeft} days to go` : 'Past'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
