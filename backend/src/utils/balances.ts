import { IExpense } from '../models/Expense';
import { ISettlement } from '../models/Settlement';

export interface PairwiseBalance {
  fromUserId: string;
  toUserId: string;
  amount: number; // > 0 means from owes to
}

export function computeBalances(
  expenses: IExpense[],
  settlements: ISettlement[]
): PairwiseBalance[] {
  // Track debts: debts[fromUserId][toUserId] = amount owed
  const debts: Record<string, Record<string, number>> = {};

  // Initialize debt tracking for all users
  const allUserIds = new Set<string>();
  
  expenses.forEach(expense => {
    allUserIds.add(expense.paidBy.toString());
    expense.participants.forEach(p => allUserIds.add(p.toString()));
  });
  
  settlements.forEach(settlement => {
    allUserIds.add(settlement.fromUserId.toString());
    allUserIds.add(settlement.toUserId.toString());
  });

  // Initialize debt matrix
  allUserIds.forEach(userId => {
    debts[userId] = {};
    allUserIds.forEach(otherUserId => {
      debts[userId][otherUserId] = 0;
    });
  });

  // Process expenses: each share creates a debt from participant to payer
  expenses.forEach(expense => {
    const paidById = expense.paidBy.toString();
    
    expense.shares.forEach(share => {
      const shareUserId = share.userId.toString();
      if (shareUserId !== paidById) {
        debts[shareUserId][paidById] = (debts[shareUserId][paidById] || 0) + share.amount;
      }
    });
  });

  // Process settlements: reduce debt from fromUserId to toUserId
  settlements.forEach(settlement => {
    const fromId = settlement.fromUserId.toString();
    const toId = settlement.toUserId.toString();
    debts[fromId][toId] = (debts[fromId][toId] || 0) - settlement.amount;
  });

  // Compute net balances for each pair
  const balances: PairwiseBalance[] = [];
  const userIds = Array.from(allUserIds);
  
  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const userIdA = userIds[i];
      const userIdB = userIds[j];
      
      const debtAtoB = debts[userIdA][userIdB] || 0;
      const debtBtoA = debts[userIdB][userIdA] || 0;
      const net = debtAtoB - debtBtoA;
      
      if (Math.abs(net) > 0.01) { // Only include if significant (> 1 cent)
        if (net > 0) {
          balances.push({
            fromUserId: userIdA,
            toUserId: userIdB,
            amount: net,
          });
        } else {
          balances.push({
            fromUserId: userIdB,
            toUserId: userIdA,
            amount: -net,
          });
        }
      }
    }
  }

  return balances;
}

