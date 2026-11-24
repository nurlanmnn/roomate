import { expensesApi, Expense } from '../api/expensesApi';

/** Same shape as ExpensesScreen’s full snapshot so both share `expenses:${id}:full`. */
export type ExpensesFullSnapshot = {
  expenses: Expense[];
  total: number;
  balances: import('../api/expensesApi').PairwiseBalance[];
  mode: true;
};

export const expensesFullCacheKey = (householdId: string) => `expenses:${householdId}:full`;

export async function fetchExpensesFullSnapshot(householdId: string): Promise<ExpensesFullSnapshot> {
  const [expensesRaw, balancesData] = await Promise.all([
    expensesApi.getExpenses(householdId),
    expensesApi.getBalances(householdId),
  ]);
  let nextExpenses: Expense[];
  let nextTotal: number;
  if (Array.isArray(expensesRaw)) {
    nextExpenses = expensesRaw;
    nextTotal = expensesRaw.length;
  } else {
    nextExpenses = expensesRaw.items;
    nextTotal = expensesRaw.total;
  }
  return {
    expenses: nextExpenses,
    total: nextTotal,
    balances: balancesData,
    mode: true,
  };
}
