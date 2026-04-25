import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const COMMANDS = [
  { label: 'Go to Dashboard', path: '/' },
  { label: 'Go to Income & Tax', path: '/income' },
  { label: 'Go to Bills', path: '/bills' },
  { label: 'Go to Debts', path: '/debts' },
  { label: 'Go to Debt strategies', path: '/debt-strategies' },
  { label: 'Go to Savings', path: '/savings' },
  { label: 'Go to Net worth', path: '/net-worth' },
  { label: 'Go to Budgets', path: '/budgets' },
  { label: 'Go to Holidays', path: '/holidays' },
  { label: 'Go to Yearly events', path: '/yearly' },
  { label: 'Go to Pension', path: '/pension' },
  { label: 'Go to Breakdown', path: '/breakdown' },
  { label: 'Go to Calendar', path: '/calendar' },
  { label: 'Go to Calculator', path: '/calculator' },
  { label: 'Go to UK Tools', path: '/tools' },
  { label: 'Go to Import / Backup', path: '/import' },
  { label: 'Go to Learning centre', path: '/learn' },
  { label: 'Go to Settings', path: '/settings' }
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQ(''); setIdx(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    if (!q) return COMMANDS;
    const ql = q.toLowerCase();
    return COMMANDS.filter(c => c.label.toLowerCase().includes(ql));
  }, [q]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24" onClick={() => setOpen(false)}>
      <div className="card w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          className="input border-0 rounded-b-none text-base"
          placeholder="Type a command…"
          value={q}
          onChange={e => { setQ(e.target.value); setIdx(0); }}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)); }
            if (e.key === 'Enter') {
              const cmd = filtered[idx];
              if (cmd) { navigate(cmd.path); setOpen(false); }
            }
          }}
        />
        <ul className="max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-500">No matches.</li>
          ) : filtered.map((c, i) => (
            <li
              key={c.path}
              className={`px-3 py-2 text-sm cursor-pointer ${i === idx ? 'bg-brand-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              onMouseEnter={() => setIdx(i)}
              onClick={() => { navigate(c.path); setOpen(false); }}
            >
              {c.label}
            </li>
          ))}
        </ul>
        <div className="px-3 py-2 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800 flex justify-between">
          <span>↑↓ to navigate · ⏎ to open · Esc to close</span>
          <span>Ctrl/⌘K</span>
        </div>
      </div>
    </div>
  );
}
