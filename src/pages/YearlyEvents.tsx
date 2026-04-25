import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { Field, PageHeader, Empty } from '../components/common';
import { YearlyEventType } from '../types';

const TYPE_ICONS: Record<YearlyEventType, string> = {
  birthday: '🎂', service: '🔧', insurance: '🛡️', other: '📌'
};

export function YearlyEvents() {
  const items = useFinanceStore(s => s.state.yearlyEvents);
  const add = useFinanceStore(s => s.addYearlyEvent);
  const update = useFinanceStore(s => s.updateYearlyEvent);
  const del = useFinanceStore(s => s.deleteYearlyEvent);

  const [name, setName] = useState('');
  const [type, setType] = useState<YearlyEventType>('birthday');
  const [date, setDate] = useState('');
  const [recurrence, setRecurrence] = useState<'once' | 'yearly'>('yearly');
  const [cost, setCost] = useState('');

  return (
    <div>
      <PageHeader title="Yearly events" subtitle="Birthdays, vehicle servicing, insurance renewals, one-off costs" />
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
