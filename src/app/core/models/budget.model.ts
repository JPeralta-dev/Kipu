export interface BudgetCategorySummary {
  id: string;
  name: string;
  icon?: string;
  color?: string;
}

export interface BudgetSpending {
  spent: number;
  limitAmount: number;
  remaining: number;
  percentageUsed: number;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  category?: BudgetCategorySummary;
  categoryName?: string;
  limitAmount: number;
  period?: 'monthly' | 'weekly';
  alertThreshold: number;
  spending?: BudgetSpending;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateBudgetDto {
  categoryId: string;
  limitAmount: number;
  period?: 'monthly' | 'weekly';
  alertThreshold?: number;
}

export interface UpdateBudgetDto {
  limitAmount?: number;
  alertThreshold?: number;
}

export interface BudgetAlert {
  budgetId: string;
  categoryId: string;
  category?: BudgetCategorySummary;
  limitAmount: number;
  spent: number;
  percentageUsed: number;
  alertThreshold: number;
  message: string;
}
