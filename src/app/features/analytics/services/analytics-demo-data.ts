import type {
  AnalyticsSummary,
  MonthlyTrend,
  CategoryBreakdown,
  DailySpending,
  AnalyticsInsight,
  AnalyticsTransaction,
  HourlyActivityResponse,
  WeeklyPatternsResponse,
} from './analytics-api.service';

export const DEMO_ANALYTICS_DATA: {
  summary: AnalyticsSummary;
  trend: MonthlyTrend;
  categoryBreakdown: CategoryBreakdown;
  dailySpending: DailySpending;
  insights: { insights: AnalyticsInsight[] };
  transactions: { transactions: AnalyticsTransaction[] };
  hourlyActivity: HourlyActivityResponse;
  weeklyPatterns: WeeklyPatternsResponse;
} = {
  summary: {
    totalIncome: 4850,
    totalExpenses: 2680,
    netSavings: 2170,
    savingsRate: 44.7,
    incomeChange: 8.5,
    expenseChange: -12.4,
  },
  trend: {
    labels: ['Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre'],
    income: [4200, 4350, 4500, 4600, 4700, 4850],
    expenses: [3100, 2950, 2800, 3050, 2900, 2680],
  },
  categoryBreakdown: {
    categories: [
      { categoryId: 'cat-1', category: 'Vivienda y Servicios', amount: 950, percentage: 35.4, color: '#3B82F6' },
      { categoryId: 'cat-2', category: 'Alimentación y Super', amount: 620, percentage: 23.1, color: '#10B981' },
      { categoryId: 'cat-3', category: 'Transporte y Movilidad', amount: 340, percentage: 12.7, color: '#F59E0B' },
      { categoryId: 'cat-4', category: 'Ocio y Restaurantes', amount: 290, percentage: 10.8, color: '#8B5CF6' },
      { categoryId: 'cat-5', category: 'Suscripciones y Tech', amount: 210, percentage: 7.8, color: '#EC4899' },
      { categoryId: 'cat-6', category: 'Salud y Bienestar', amount: 160, percentage: 6.0, color: '#06B6D4' },
      { categoryId: 'cat-7', category: 'Otros Gastos', amount: 110, percentage: 4.2, color: '#64748B' },
    ],
  },
  dailySpending: {
    days: [
      { label: 'Lun 1', amount: 45 },
      { label: 'Mar 2', amount: 120 },
      { label: 'Mié 3', amount: 65 },
      { label: 'Jue 4', amount: 30 },
      { label: 'Vie 5', amount: 210 },
      { label: 'Sáb 6', amount: 180 },
      { label: 'Dom 7', amount: 95 },
      { label: 'Lun 8', amount: 40 },
      { label: 'Mar 9', amount: 85 },
      { label: 'Mié 10', amount: 110 },
      { label: 'Jue 11', amount: 55 },
      { label: 'Vie 12', amount: 240 },
      { label: 'Sáb 13', amount: 160 },
      { label: 'Dom 14', amount: 75 },
    ],
  },
  insights: {
    insights: [
      {
        type: 'savings',
        message: '¡Excelente tasa de ahorro! Estás ahorrando el 45% de tus ingresos este mes.',
        messageKey: 'insights.good_savings',
        params: { rate: 45 },
        severity: 'low',
        actionable: false,
      },
      {
        type: 'anomaly',
        message: 'Detectamos una optimización de $120 en suscripciones duplicadas.',
        messageKey: 'insights.messages.leak_optimization',
        severity: 'medium',
        actionable: true,
      },
      {
        type: 'trend',
        message: 'Tus gastos de ocio bajaron un 18% respecto a la semana anterior.',
        messageKey: 'insights.mom_decrease',
        params: { percentage: 18 },
        severity: 'low',
        actionable: false,
      },
    ],
  },
  transactions: {
    transactions: [
      {
        id: 'demo-1',
        merchant: 'Nómina Directa Tech Corp',
        amount: 4850,
        type: 'income',
        date: '2026-10-01T08:30:00Z',
        bank: 'Bancolombia',
        category: 'Salario',
        icon: 'trendingUp',
        origin: 'automatic',
      },
      {
        id: 'demo-2',
        merchant: 'Alquiler Apartamento',
        amount: -850,
        type: 'expense',
        date: '2026-10-02T10:00:00Z',
        bank: 'Bancolombia',
        category: 'Vivienda y Servicios',
        icon: 'home',
        origin: 'manual',
      },
      {
        id: 'demo-3',
        merchant: 'Supermercado Éxito / Carulla',
        amount: -185.4,
        type: 'expense',
        date: '2026-10-05T14:20:00Z',
        bank: 'Nu Bank',
        category: 'Alimentación y Super',
        icon: 'shoppingCart',
        origin: 'telegram',
      },
      {
        id: 'demo-4',
        merchant: 'Cena Bistro Palermo',
        amount: -78.5,
        type: 'expense',
        date: '2026-10-06T20:45:00Z',
        bank: 'Nu Bank',
        category: 'Ocio y Restaurantes',
        icon: 'coffee',
        origin: 'telegram',
      },
      {
        id: 'demo-5',
        merchant: 'Uber Viajes',
        amount: -24.0,
        type: 'expense',
        date: '2026-10-07T09:15:00Z',
        bank: 'Nu Bank',
        category: 'Transporte y Movilidad',
        icon: 'truck',
        origin: 'gmail',
      },
      {
        id: 'demo-6',
        merchant: 'Spotify & Netflix',
        amount: -32.0,
        type: 'expense',
        date: '2026-10-08T03:00:00Z',
        bank: 'Bancolombia',
        category: 'Suscripciones y Tech',
        icon: 'tag',
        origin: 'automatic',
      },
    ],
  },
  hourlyActivity: {
    period: 'current-month',
    hours: [
      { hour: 8, income: 4850, expenses: 40 },
      { hour: 10, income: 0, expenses: 850 },
      { hour: 13, income: 0, expenses: 320 },
      { hour: 15, income: 0, expenses: 180 },
      { hour: 19, income: 0, expenses: 450 },
      { hour: 21, income: 0, expenses: 290 },
    ],
  },
  weeklyPatterns: {
    period: 'current-month',
    patterns: [
      { dayOfWeek: 1, categoryId: 'cat-1', category: 'Vivienda', total: 850, count: 1, occurrences: 1, average: 850, averagePerTransaction: 850 },
      { dayOfWeek: 2, categoryId: 'cat-2', category: 'Alimentación', total: 140, count: 2, occurrences: 2, average: 70, averagePerTransaction: 70 },
      { dayOfWeek: 3, categoryId: 'cat-3', category: 'Transporte', total: 60, count: 3, occurrences: 3, average: 20, averagePerTransaction: 20 },
      { dayOfWeek: 4, categoryId: 'cat-2', category: 'Alimentación', total: 95, count: 2, occurrences: 2, average: 47.5, averagePerTransaction: 47.5 },
      { dayOfWeek: 5, categoryId: 'cat-4', category: 'Ocio', total: 280, count: 3, occurrences: 2, average: 140, averagePerTransaction: 93.3 },
      { dayOfWeek: 6, categoryId: 'cat-2', category: 'Alimentación', total: 220, count: 2, occurrences: 2, average: 110, averagePerTransaction: 110 },
      { dayOfWeek: 0, categoryId: 'cat-4', category: 'Ocio', total: 110, count: 1, occurrences: 1, average: 110, averagePerTransaction: 110 },
    ],
  },
};
