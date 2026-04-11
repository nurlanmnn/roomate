import mongoose from 'mongoose';
import { Expense } from '../models/Expense';
import type { CategorySpending, ExpenseInsights } from './expenseInsights';
import { buildInsightsFromAggregates } from './expenseInsights';

function normalizeCategory(raw: string | null | undefined): string {
  const s = (raw ?? '').trim();
  return s.length > 0 ? s : 'Uncategorized';
}

function rowsToCategorySpending(
  rows: { _id: unknown; amount: number; count?: number }[]
): CategorySpending[] {
  const mapped = rows.map((r) => ({
    category: normalizeCategory(typeof r._id === 'string' ? r._id : r._id == null ? null : String(r._id)),
    amount: r.amount,
    count: r.count ?? 0,
  }));
  const totalAmount = mapped.reduce((s, r) => s + r.amount, 0);
  return mapped
    .map((r) => ({
      category: r.category,
      amount: r.amount,
      percentage: totalAmount > 0 ? (r.amount / totalAmount) * 100 : 0,
      count: r.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface HomeExpenseSummary {
  expenseCount: number;
  calendarMonthTotal: number;
  categoryTotals: {
    week: CategorySpending[];
    month: CategorySpending[];
    year: CategorySpending[];
    all: CategorySpending[];
  };
  insights: ExpenseInsights;
}

/**
 * Single aggregation pass for dashboard: counts, calendar-month total, category breakdowns, insights.
 */
export async function computeHomeExpenseSummary(
  householdId: string
): Promise<HomeExpenseSummary> {
  const oid = new mongoose.Types.ObjectId(householdId);
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  const d7 = new Date(y, m, d - 7);
  const d30 = new Date(y, m, d - 30);
  const d365 = new Date(y, m, d - 365);
  const monthStart = new Date(y, m, 1);
  const sixMonthsAgo = new Date(y, m - 6, 1);

  const [facet] = await Expense.aggregate([
    { $match: { householdId: oid } },
    {
      $facet: {
        expenseCount: [{ $count: 'n' }],
        calendarMonthTotal: [
          { $match: { date: { $gte: monthStart } } },
          { $group: { _id: null, t: { $sum: '$totalAmount' } } },
        ],
        week: [
          { $match: { date: { $gte: d7 } } },
          { $group: { _id: '$category', amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        ],
        month: [
          { $match: { date: { $gte: d30 } } },
          { $group: { _id: '$category', amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        ],
        year: [
          { $match: { date: { $gte: d365 } } },
          { $group: { _id: '$category', amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        ],
        all: [
          { $group: { _id: '$category', amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        ],
        sixMonthByMonth: [
          { $match: { date: { $gte: sixMonthsAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
              amount: { $sum: '$totalAmount' },
            },
          },
        ],
        sixMonthByCategory: [
          { $match: { date: { $gte: sixMonthsAgo } } },
          { $group: { _id: '$category', amount: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
        ],
      },
    },
  ]);

  const expenseCount = facet?.expenseCount?.[0]?.n ?? 0;
  const calendarMonthTotal = facet?.calendarMonthTotal?.[0]?.t ?? 0;

  const categoryTotals = {
    week: rowsToCategorySpending(facet?.week ?? []),
    month: rowsToCategorySpending(facet?.month ?? []),
    year: rowsToCategorySpending(facet?.year ?? []),
    all: rowsToCategorySpending(facet?.all ?? []),
  };

  const monthAmountMap = new Map<string, number>();
  for (const row of facet?.sixMonthByMonth ?? []) {
    if (row._id) monthAmountMap.set(row._id, row.amount);
  }

  const monthlyTrend: Array<{ month: string; amount: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    monthlyTrend.push({
      month: monthKey,
      amount: monthAmountMap.get(monthKey) || 0,
    });
  }

  const byCategorySixMonth = rowsToCategorySpending(facet?.sixMonthByCategory ?? []);
  const totalSpent = byCategorySixMonth.reduce((s, c) => s + c.amount, 0);

  const insights = buildInsightsFromAggregates({
    byCategory: byCategorySixMonth,
    monthlyTrend,
    totalSpent,
  });

  return {
    expenseCount,
    calendarMonthTotal,
    categoryTotals,
    insights,
  };
}
