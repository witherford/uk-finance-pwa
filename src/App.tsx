import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
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
import { DebtStrategies } from './pages/DebtStrategies';
import { CommandPalette } from './components/CommandPalette';

export default function App() {
  const bootstrap = useFinanceStore(s => s.bootstrap);
  useEffect(() => { bootstrap(); }, [bootstrap]);

  return (
    <ThemeProvider>
      <PasswordGate />
      <CommandPalette />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="income" element={<Income />} />
          <Route path="bills" element={<BillsPage />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="debts" element={<DebtsPage />} />
          <Route path="debt-strategies" element={<DebtStrategies />} />
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
