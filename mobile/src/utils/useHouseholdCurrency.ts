import { useHousehold } from '../context/HouseholdContext';

/**
 * Returns the ISO 4217 currency code of the currently selected household.
 *
 * We gate the picker + the update endpoint on "no expenses or settlements yet",
 * so every piece of money the user sees on screen belongs to a household with a
 * single, stable currency. Returns `'USD'` as a safe default when no household
 * is selected or when an older cached household record is missing the field.
 */
export const useHouseholdCurrency = (): string => {
  const { selectedHousehold } = useHousehold();
  return selectedHousehold?.currency || 'USD';
};
