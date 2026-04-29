import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useFinanceStore } from './store/useFinanceStore';
import { ThemeProvider } from './theme/ThemeProvider';
import { Layout } from './components/Layout';
import { PasswordGate } from './components/PasswordGate';
import { Dashboard } from './pages/Dashboard';
import { Income } from './pages/Income';
import { BillsPage } from './pages/Bills';
import { DebtsPage } from './pages/Debts';
import { SavingsPage } from './pages/Savings';
import { Holidays } from './pages/Holidays';
import { YearlyEvents } from './pages/YearlyEvents';
import { Pension } from './pages/Pension';
import { Breakdown } from './pages/Breakdown';
import { CalendarPage } from './pages/Calendar';
import { Calculator } from './pages/Calculator';
import { ImportExport } from './pages/ImportExport';
import { Learn } from './pages/Learn';
import { Settings } from './pages/Settings';
import { NetWorth } from './pages/NetWorth';
import { Budgets } from './pages/Budgets';
import { Tools } from './pages/Tools';
import { Spending } from './pages/Spending';
import { Providers } from './pages/Providers';
import { CommandPalette } from './components/CommandPalette';
import { InstallPrompt } from './components/InstallPrompt';
import { OfflineBadge } from './components/OfflineBadge';
import { UpdateBanner } from './components/UpdateBanner';
import { refreshBankHolidays } from './lib/bank-holidays';

export default function App() {
  const bootstrap = useFinanceStore(s => s.bootstrap);
  useEffect(() => { bootstrap(); }, [bootstrap]);

  // Try to refresh bank holiday data weekly when online (falls back to bundled).
  useEffect(() => { refreshBankHolidays(); }, []);

  // Mobile UX: when a number/date/etc input gains focus, select all so the
  // leading 0 (or any prior value) gets replaced by the first keystroke.
  useEffect(() => {
    const handler = (e: FocusEvent) => {
      const t = e.target as HTMLInputElement;
      if (t && t.tagName === 'INPUT' && ['number', 'text', 'tel'].includes(t.type)) {
        setTimeout(() => { try { t.select(); } catch {} }, 0);
      }
    };
    document.addEventListener('focusin', handler);
    return () => document.removeEventListener('focusin', handler);
  }, []);

  return (
    <ThemeProvider>
      <PasswordGate />
      <CommandPalette />
      <InstallPrompt />
      <OfflineBadge />
      <UpdateBanner />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="income" element={<Income />} />
          <Route path="bills" element={<BillsPage />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="debts" element={<DebtsPage />} />
          <Route path="debt-strategies" element={<Navigate to="/debts" replace />} />
          <Route path="spending" element={<Spending />} />
          <Route path="providers" element={<Providers />} />
          <Route path="savings" element={<SavingsPage />} />
          <Route path="net-worth" element={<NetWorth />} />
          <Route path="holidays" element={<Holidays />} />
          <Route path="yearly" element={<YearlyEvents />} />
          <Route path="pension" element={<Pension />} />
          <Route path="breakdown" element={<Breakdown />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="tools" element={<Tools />} />
          <Route path="import" element={<ImportExport />} />
          <Route path="learn" element={<Learn />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}
