import { Ionicons } from '@expo/vector-icons';

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'groceries', name: 'Groceries', icon: 'basket-outline', color: '#22C55E' },
  { id: 'utilities', name: 'Utilities', icon: 'flash-outline', color: '#3B82F6' },
  { id: 'rent', name: 'Rent', icon: 'home-outline', color: '#8B5CF6' },
  { id: 'food', name: 'Food & Dining', icon: 'restaurant-outline', color: '#F59E0B' },
  { id: 'transportation', name: 'Transportation', icon: 'car-outline', color: '#6366F1' },
  { id: 'entertainment', name: 'Entertainment', icon: 'film-outline', color: '#EC4899' },
  { id: 'shopping', name: 'Shopping', icon: 'bag-outline', color: '#14B8A6' },
  { id: 'healthcare', name: 'Healthcare', icon: 'medical-outline', color: '#EF4444' },
  { id: 'education', name: 'Education', icon: 'school-outline', color: '#06B6D4' },
  { id: 'subscriptions', name: 'Subscriptions', icon: 'card-outline', color: '#F97316' },
  { id: 'bills', name: 'Bills', icon: 'document-text-outline', color: '#84CC16' },
  { id: 'other', name: 'Other', icon: 'ellipse-outline', color: '#64748B' },
];

export const getCategoryById = (id: string): ExpenseCategory | undefined => {
  return EXPENSE_CATEGORIES.find(cat => cat.id === id);
};

export const getCategoryByName = (name: string): ExpenseCategory | undefined => {
  return EXPENSE_CATEGORIES.find(cat => 
    cat.name.toLowerCase() === name.toLowerCase()
  );
};

