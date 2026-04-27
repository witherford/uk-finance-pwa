import { PaymentManager } from '../components/PaymentManager';
import { HousingCard } from '../components/HousingCard';
import { CouncilTaxCard } from '../components/CouncilTaxCard';

export function BillsPage() {
  return (
    <>
      <HousingCard />
      <CouncilTaxCard />
      <PaymentManager kind="bill" title="Bills & deductions" />
    </>
  );
}
