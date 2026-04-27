import { PaymentManager } from '../components/PaymentManager';
import { DebtImport } from '../components/DebtImport';

export function DebtsPage() {
  return (
    <>
      <DebtImport />
      <PaymentManager kind="debt" title="Debts" />
    </>
  );
}
