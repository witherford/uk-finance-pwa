import { PaymentManager } from '../components/PaymentManager';
import { HousingCard } from '../components/HousingCard';

export function BillsPage() {
  return (
    <>
      <HousingCard />
      <PaymentManager kind="bill" title="Bills & deductions" />
    </>
  );
}
