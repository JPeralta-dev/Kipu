export type LegacyInsightType = 'warning' | 'info' | 'success' | 'trend';
export type InsightSeverity = 'low' | 'medium' | 'high' | 'critical';

export type InsightCategory =
  | 'goal_impact'         // "Si gastas en X, tu meta Y se retrasa"
  | 'pacing_alert'        // "Llevas el 70% de tus insumos en 10 días"
  | 'smart_allocation'    // "Nuevo ingreso detectado: sugerencia de apartado"
  | 'leak_optimization'   // "Suscripciones o gastos hormiga detectados"
  | 'positive_milestone'  // "¡Excelente! Meta al 60%"
  | 'spending'
  | 'savings'
  | 'anomaly';

export type InsightActionType =
  | 'fund_pocket'             // Abre modal o acción para transferir dinero a un bolsillo
  | 'adjust_goal_limit'       // Abre modal para calibrar la meta
  | 'filter_transactions'     // Navega a transacciones filtradas por categoría/fecha
  | 'simulate_savings'        // Abre simulador de impacto
  | 'dismiss'
  | 'review_category'
  | 'view_goal'
  | 'allocate_pocket'
  | 'create_pocket';                // Ocultar insight

export interface InsightAction {
  id: string;
  label: string;
  actionType: InsightActionType;
  isPrimary: boolean;
  payload?: {
    goalId?: string;
    pocketId?: string;
    categoryId?: string;
    suggestedAmount?: number;
    startDate?: string;
    endDate?: string;
  };
}

export interface InsightMetrics {
  current?: number;
  target?: number;
  projected?: number;
  impactDays?: number;
  currency?: string;
  percentage?: number;
}

export interface ActionableInsight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  message: string;
  relatedGoalId?: string;
  relatedPocketId?: string;
  relatedCategoryId?: string;
  metrics?: InsightMetrics;
  actions?: InsightAction[];
  createdAt: string;
  isDismissed?: boolean;
}

export interface FinancialHealthOverview {
  healthScore: number;                // 0 a 100
  healthLevel: 'critical' | 'fair' | 'good' | 'excellent' | 'needs_attention';
  summaryHeadline: string;
  goalsSummary: {
    totalGoals: number;
    onTrack: number;
    atRisk: number;
    critical: number;
    achieved: number;
  };
    savingsMetrics: {
    totalSaved?: number;
    targetTotal?: number;
    overallProgressPercent?: number;
    monthlySavingsRate: number;
    targetSavingsRate: number;
    netSavedThisMonth: number;
  };
  activePocketsCount?: number;
  monthlySavingsRate?: number;
  projectedSavings?: number;
  insightsCount: {
    highPriority: number;
    opportunities: number;
  };
}

/** Legacy interface kept for 100% strict backward compatibility across existing views and services */
export interface Insight {
  id: string;
  type: 'warning' | 'info' | 'success' | 'trend';
  titleKey: string;
  messageKey: string;
  severity: 'low' | 'medium' | 'high';
  data?: Record<string, number | string>;
}


