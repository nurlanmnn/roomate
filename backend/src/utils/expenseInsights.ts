import { Expense, IExpense } from '../models/Expense';

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface ExpenseInsights {
  byCategory: CategorySpending[];
  monthlyTrend: Array<{ month: string; amount: number }>;
  predictions: {
    nextMonth: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  totalSpent: number;
  averageMonthly: number;
}

/**
 * Calculate spending insights for a household
 */
export const calculateExpenseInsights = (expenses: IExpense[]): ExpenseInsights => {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  
  // Filter expenses from last 6 months
  const recentExpenses = expenses.filter(
    expense => new Date(expense.date) >= sixMonthsAgo
  );

  // Calculate spending by category
  const categoryMap = new Map<string, { amount: number; count: number }>();
  let totalSpent = 0;

  for (const expense of recentExpenses) {
    const cat = expense.category || 'other';
    const existing = categoryMap.get(cat) || { amount: 0, count: 0 };
    categoryMap.set(cat, {
      amount: existing.amount + expense.totalAmount,
      count: existing.count + 1,
    });
    totalSpent += expense.totalAmount;
  }

  // Convert to array and calculate percentages
  const byCategory: CategorySpending[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalSpent > 0 ? (data.amount / totalSpent) * 100 : 0,
      count: data.count,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Calculate monthly trend (last 6 months)
  const monthlyMap = new Map<string, number>();
  for (const expense of recentExpenses) {
    const expenseDate = new Date(expense.date);
    const monthKey = `${expenseDate.getFullYear()}-${String(expenseDate.getMonth() + 1).padStart(2, '0')}`;
    const existing = monthlyMap.get(monthKey) || 0;
    monthlyMap.set(monthKey, existing + expense.totalAmount);
  }

  // Generate last 6 months (including current)
  const monthlyTrend: Array<{ month: string; amount: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyTrend.push({
      month: monthKey,
      amount: monthlyMap.get(monthKey) || 0,
    });
  }

  // Calculate average monthly spending
  const monthsWithData = monthlyTrend.filter(m => m.amount > 0).length;
  const averageMonthly = monthsWithData > 0 
    ? monthlyTrend.reduce((sum, m) => sum + m.amount, 0) / monthsWithData
    : 0;

  // Simple linear regression for prediction
  // Use last 3 months if available
  const trendData = monthlyTrend.slice(-3).filter(m => m.amount > 0);
  let nextMonthPrediction = averageMonthly;
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';

  if (trendData.length >= 2) {
    // Calculate simple linear trend
    const n = trendData.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    trendData.forEach((data, index) => {
      const x = index + 1;
      const y = data.amount;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next month (x = n + 1)
    nextMonthPrediction = slope * (n + 1) + intercept;
    
    // Ensure prediction is not negative
    if (nextMonthPrediction < 0) {
      nextMonthPrediction = averageMonthly;
    }

    // Determine trend
    if (slope > averageMonthly * 0.1) {
      trend = 'increasing';
    } else if (slope < -averageMonthly * 0.1) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }
  }

  return {
    byCategory,
    monthlyTrend,
    predictions: {
      nextMonth: Math.round(nextMonthPrediction * 100) / 100,
      trend,
    },
    totalSpent,
    averageMonthly: Math.round(averageMonthly * 100) / 100,
  };
};

