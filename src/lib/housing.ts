import { HousingState } from '../types';

export function housingMonthly(housing: HousingState): number {
  if (!housing) return 0;
  if (housing.type === 'mortgage') return housing.mortgage?.costPerMonth ?? 0;
  if (housing.type === 'rent') return housing.rent?.costPerMonth ?? 0;
  return 0;
}

export function housingLabel(housing: HousingState): string | null {
  if (housing.type === 'mortgage') return 'Mortgage';
  if (housing.type === 'rent') return 'Rent';
  return null;
}
