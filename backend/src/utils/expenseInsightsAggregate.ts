import mongoose from 'mongoose';
import { Expense } from '../models/Expense';
import type { CategorySpending, ExpenseInsights } from './expenseInsights';
import { buildInsightsFromAggregates } from './expenseInsights';

function normalizeCategory(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s.length > 0 ? s : 'other';
}

interface CategoryRow {
  _id: unknown;
  amount: number;
  count: number;
}

interface MonthRow {
  _id: string | null;
  amount: number;
}

/**
 * Compute the same 6-month spending insights as `calculateExpenseInsights` but
 * via aggregation, so we don't hydrate every expense document into Node just to
 * sum it. Matches the dashboard insights pattern in `expenseHomeSummary`.
 */
export async function computeExpenseInsights(
  householdId: string | mongoose.Types.ObjectId
): Promise<ExpenseInsights> {
  const oid =
    typeof householdId === 'string' ? new mongoose.Types.ObjectId(householdId) : householdId;
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

  const [facet] = await Expense.aggregate([
    { $match: { householdId: oid, date: { $gte: sixMonthsAgo } } },
    {
      $facet: {
        byCategory: [
          { $group: { _id: '$category', amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        ],
        byMonth: [
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
              amount: { $sum: '$totalAmount' },
            },
          },
        ],
      },
    },
  ]);

  const categoryRows: CategoryRow[] = facet?.byCategory ?? [];
  const totalAmount = categoryRows.reduce((s, r) => s + r.amount, 0);
  const byCategory: CategorySpending[] = categoryRows
    .map((r) => ({
      category: normalizeCategory(r._id),
      amount: r.amount,
      percentage: totalAmount > 0 ? (r.amount / totalAmount) * 100 : 0,
      count: r.count ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const monthAmountMap = new Map<string, number>();
  for (const row of (facet?.byMonth ?? []) as MonthRow[]) {
    if (row._id) monthAmountMap.set(row._id, row.amount);
  }

  const monthlyTrend: Array<{ month: string; amount: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    monthlyTrend.push({ month: monthKey, amount: monthAmountMap.get(monthKey) || 0 });
  }

  return buildInsightsFromAggregates({ byCategory, monthlyTrend, totalSpent: totalAmount });
}
