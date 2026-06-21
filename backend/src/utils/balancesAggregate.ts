import mongoose from 'mongoose';
import { Expense } from '../models/Expense';
import { Settlement } from '../models/Settlement';

export interface BalanceWithSince {
  fromUserId: string;
  toUserId: string;
  amount: number; // > 0 means from owes to
  sinceDate: string | null;
}

interface DebtRow {
  _id: { from: mongoose.Types.ObjectId; to: mongoose.Types.ObjectId };
  amount: number;
  oldest: Date | null;
}

interface SettlementRow {
  _id: { from: mongoose.Types.ObjectId; to: mongoose.Types.ObjectId };
  amount: number;
}

/**
 * Compute pairwise net balances for a household using aggregation pipelines so
 * we never pull every expense/settlement document (and crucially never the
 * base64 `proofImageUrl` blobs) into Node memory just to sum them.
 *
 * Mirrors the semantics of `computeBalances` + the per-balance `sinceDate`
 * (oldest contributing expense for the owed direction).
 */
export async function computeBalancesWithSince(
  householdId: string | mongoose.Types.ObjectId
): Promise<BalanceWithSince[]> {
  const oid =
    typeof householdId === 'string' ? new mongoose.Types.ObjectId(householdId) : householdId;

  const [debtRows, settlementRows] = await Promise.all([
    Expense.aggregate<DebtRow>([
      { $match: { householdId: oid } },
      { $unwind: '$shares' },
      { $match: { $expr: { $ne: ['$shares.userId', '$paidBy'] } } },
      {
        $group: {
          _id: { from: '$shares.userId', to: '$paidBy' },
          amount: { $sum: '$shares.amount' },
          oldest: { $min: { $ifNull: ['$createdAt', '$date'] } },
        },
      },
    ]),
    Settlement.aggregate<SettlementRow>([
      { $match: { householdId: oid } },
      {
        $group: {
          _id: { from: '$fromUserId', to: '$toUserId' },
          amount: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  // debts[from][to] = net amount `from` owes `to` (after settlements).
  const debts: Record<string, Record<string, number>> = {};
  // oldest[from][to] = earliest contributing expense date for that raw direction.
  const oldest: Record<string, Record<string, number>> = {};
  const userIds = new Set<string>();

  const addDebt = (from: string, to: string, amount: number): void => {
    userIds.add(from);
    userIds.add(to);
    debts[from] = debts[from] || {};
    debts[from][to] = (debts[from][to] || 0) + amount;
  };

  for (const row of debtRows) {
    const from = row._id.from.toString();
    const to = row._id.to.toString();
    addDebt(from, to, row.amount);
    if (row.oldest) {
      oldest[from] = oldest[from] || {};
      const t = new Date(row.oldest).getTime();
      if (oldest[from][to] === undefined || t < oldest[from][to]) {
        oldest[from][to] = t;
      }
    }
  }

  for (const row of settlementRows) {
    const from = row._id.from.toString();
    const to = row._id.to.toString();
    addDebt(from, to, -row.amount);
  }

  const ids = Array.from(userIds);
  const balances: BalanceWithSince[] = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i];
      const b = ids[j];
      const debtAtoB = debts[a]?.[b] || 0;
      const debtBtoA = debts[b]?.[a] || 0;
      const net = debtAtoB - debtBtoA;

      if (Math.abs(net) <= 0.01) continue;

      const fromUserId = net > 0 ? a : b;
      const toUserId = net > 0 ? b : a;
      const oldestTime = oldest[fromUserId]?.[toUserId];

      balances.push({
        fromUserId,
        toUserId,
        amount: Math.abs(net),
        sinceDate: oldestTime !== undefined ? new Date(oldestTime).toISOString() : null,
      });
    }
  }

  return balances;
}
