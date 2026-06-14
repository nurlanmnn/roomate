import { expensesApi, Expense } from '../api/expensesApi';
import { settlementsApi, Settlement } from '../api/settlementsApi';
import { dedupedFetch, prefetch, setCached } from './queryCache';

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

export type BalanceHistoryExpensesSnapshot = {
  expenses: Expense[];
  total: number;
};

/** Expenses only — avoids the heavy /balances pass used by the full expenses list. */
export const balanceHistoryExpensesKey = (householdId: string) =>
  `expenses:${householdId}:balanceHistory`;

export type SettlementsAllSnapshot = {
  settlements: Settlement[];
  total: number;
};

/** Invalidated by existing `invalidateCache('settlements:${householdId}')` prefixes. */
export const balanceHistorySettlementsKey = (householdId: string) =>
  `settlements:${householdId}:balanceHistory:all`;

const BALANCE_HISTORY_FETCH_PAGE = 80;

const balanceHistoryInflightKey = (householdId: string) => `balanceHistory:inflight:${householdId}`;

type PartialListener = (expenses: Expense[], settlements: Settlement[]) => void;
const partialListeners = new Map<string, Set<PartialListener>>();
const latestPartial = new Map<string, { expenses: Expense[]; settlements: Settlement[] }>();

const emitPartial = (householdId: string, expenses: Expense[], settlements: Settlement[]) => {
  latestPartial.set(householdId, { expenses, settlements });
  partialListeners.get(householdId)?.forEach((fn) => fn(expenses, settlements));
};

const registerPartialListener = (householdId: string, listener: PartialListener): (() => void) => {
  const snap = latestPartial.get(householdId);
  if (snap) listener(snap.expenses, snap.settlements);
  let set = partialListeners.get(householdId);
  if (!set) {
    set = new Set();
    partialListeners.set(householdId, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) {
      partialListeners.delete(householdId);
    }
  };
};

const clearPartialState = (householdId: string) => {
  latestPartial.delete(householdId);
  partialListeners.delete(householdId);
};

async function fetchAllExpensesPaginated(
  householdId: string,
  onPage?: (accumulated: Expense[]) => void
): Promise<Expense[]> {
  const first = await expensesApi.getExpenses(householdId, {
    limit: BALANCE_HISTORY_FETCH_PAGE,
    skip: 0,
  });
  if (Array.isArray(first)) {
    onPage?.(first);
    return first;
  }

  const all = [...first.items];
  onPage?.(all);
  let skip = all.length;
  while (skip < first.total) {
    const page = await expensesApi.getExpenses(householdId, {
      limit: BALANCE_HISTORY_FETCH_PAGE,
      skip,
    });
    if (Array.isArray(page)) break;
    all.push(...page.items);
    onPage?.(all);
    skip += page.items.length;
    if (page.items.length === 0) break;
  }
  return all;
}

async function fetchAllSettlementsPaginated(
  householdId: string,
  onPage?: (accumulated: Settlement[]) => void
): Promise<Settlement[]> {
  const first = await settlementsApi.getSettlements(householdId, {
    limit: BALANCE_HISTORY_FETCH_PAGE,
    skip: 0,
  });
  if (Array.isArray(first)) {
    onPage?.(first);
    return first;
  }

  const all = [...first.items];
  onPage?.(all);
  let skip = all.length;
  while (skip < first.total) {
    const page = await settlementsApi.getSettlements(householdId, {
      limit: BALANCE_HISTORY_FETCH_PAGE,
      skip,
    });
    if (Array.isArray(page)) break;
    all.push(...page.items);
    onPage?.(all);
    skip += page.items.length;
    if (page.items.length === 0) break;
  }
  return all;
}

async function fetchBalanceHistoryCore(
  householdId: string
): Promise<[BalanceHistoryExpensesSnapshot, SettlementsAllSnapshot]> {
  let expenses: Expense[] = [];
  let settlements: Settlement[] = [];

  try {
    const [finalExpenses, finalSettlements] = await Promise.all([
      fetchAllExpensesPaginated(householdId, (partial) => {
        expenses = partial;
        emitPartial(householdId, expenses, settlements);
      }),
      fetchAllSettlementsPaginated(householdId, (partial) => {
        settlements = partial;
        emitPartial(householdId, expenses, settlements);
      }),
    ]);

    const expSnap: BalanceHistoryExpensesSnapshot = {
      expenses: finalExpenses,
      total: finalExpenses.length,
    };
    const setSnap: SettlementsAllSnapshot = {
      settlements: finalSettlements,
      total: finalSettlements.length,
    };

    setCached(balanceHistoryExpensesKey(householdId), expSnap);
    setCached(balanceHistorySettlementsKey(householdId), setSnap);

    return [expSnap, setSnap];
  } finally {
    clearPartialState(householdId);
  }
}

/** @deprecated Use fetchAllSettlementsPaginated via core loader; kept for any external callers. */
export async function fetchAllSettlementsSnapshot(householdId: string): Promise<SettlementsAllSnapshot> {
  const settlements = await fetchAllSettlementsPaginated(householdId);
  return { settlements, total: settlements.length };
}

/** Warm cache before navigating to Balance History (dedupes with in-flight fetches). */
export function prefetchBalanceHistoryData(householdId: string): void {
  prefetch(balanceHistoryInflightKey(householdId), () => fetchBalanceHistoryCore(householdId));
}

export function revalidateBalanceHistoryData(
  householdId: string,
  onPartial?: PartialListener
): Promise<[BalanceHistoryExpensesSnapshot, SettlementsAllSnapshot]> {
  const unregister = onPartial ? registerPartialListener(householdId, onPartial) : undefined;
  return dedupedFetch(balanceHistoryInflightKey(householdId), () =>
    fetchBalanceHistoryCore(householdId)
  ).finally(() => {
    unregister?.();
  });
}
