import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';

const NAV = [
  { to: '/', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/income', label: 'Income & Tax', icon: '💷' },
  { to: '/bills', label: 'Bills', icon: '🧾' },
  { to: '/budgets', label: 'Budgets', icon: '🎯' },
  { to: '/debts', label: 'Debts', icon: '💳' },
  { to: '/debt-strategies', label: 'Debt strategies', icon: '🪜' },
  { to: '/savings', label: 'Savings', icon: '🐖' },
  { to: '/net-worth', label: 'Net worth', icon: '🏦' },
  { to: '/holidays', label: 'Holidays', icon: '✈️' },
  { to: '/yearly', label: 'Yearly events', icon: '🎈' },
  { to: '/pension', label: 'Pension', icon: '👴' },
  { to: '/breakdown', label: 'Breakdown', icon: '📊' },
  { to: '/calendar', label: 'Calendar', icon: '📅' },
  { to: '/calculator', label: 'Calculator', icon: '🧮' },
  { to: '/tools', label: 'UK Tools', icon: '🧰' },
  { to: '/import', label: 'Import / Backup', icon: '📁' },
  { to: '/learn', label: 'Learning centre', icon: '📚' },
  { to: '/settings', label: 'Settings', icon: '⚙️' }
];

export function Layout() {
  const firstName = useFinanceStore(s => s.state.profile.firstName);
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 px-3 sm:px-5 h-14">
          <button
            className="lg:hidden btn-ghost p-2"
            aria-label="Toggle menu"
            onClick={() => setOpen(o => !o)}
          >☰</button>
          <div className="flex items-center gap-2 font-bold">
            <span className="w-7 h-7 rounded-md bg-brand-500 text-white grid place-items-center text-sm">£</span>
            UK Finance
          </div>
          {firstName && <div className="ml-auto text-sm text-slate-500">Hi, {firstName} 👋</div>}
          <button
            className="hidden sm:inline-flex items-center gap-2 px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 ml-3"
            title="Open command palette"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          >
            <span>⌘K</span><span className="text-slate-400">Quick nav</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className={`no-print ${open ? 'block' : 'hidden'} lg:block w-60 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto`}>
          <nav className="p-3 space-y-1">
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-brand-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'}`
                }
              >
                <span>{item.icon}</span>{item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
