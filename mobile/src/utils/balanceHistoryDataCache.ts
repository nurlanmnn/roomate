import { expensesApi, Expense, PairwiseBalance } from '../api/expensesApi';
import { settlementsApi, Settlement } from '../api/settlementsApi';
import { dedupedFetch, prefetch } from './queryCache';

/** Same shape as ExpensesScreen’s full snapshot so both share `expenses:${id}:full`. */
export type ExpensesFullSnapshot = {
  expenses: Expense[];
  total: number;
  balances: PairwiseBalance[];
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

export type SettlementsAllSnapshot = {
  settlements: Settlement[];
  total: number;
};

/** Invalidated by existing `invalidateCache('settlements:${householdId}')` prefixes. */
export const balanceHistorySettlementsKey = (householdId: string) =>
  `settlements:${householdId}:balanceHistory:all`;

export async function fetchAllSettlementsSnapshot(householdId: string): Promise<SettlementsAllSnapshot> {
  const raw = await settlementsApi.getSettlements(householdId);
  const settlements = Array.isArray(raw) ? raw : raw.items;
  return { settlements, total: settlements.length };
}

/** Warm cache before navigating to Balance History (dedupes with in-flight fetches). */
export function prefetchBalanceHistoryData(householdId: string): void {
  prefetch(expensesFullCacheKey(householdId), () => fetchExpensesFullSnapshot(householdId));
  prefetch(balanceHistorySettlementsKey(householdId), () => fetchAllSettlementsSnapshot(householdId));
}

export function revalidateBalanceHistoryData(householdId: string): Promise<[ExpensesFullSnapshot, SettlementsAllSnapshot]> {
  return Promise.all([
    dedupedFetch(expensesFullCacheKey(householdId), () => fetchExpensesFullSnapshot(householdId)),
    dedupedFetch(balanceHistorySettlementsKey(householdId), () => fetchAllSettlementsSnapshot(householdId)),
  ]);
}
