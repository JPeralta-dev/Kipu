/**
 * AnalyticsStore — Signal-based store for analytics state.
 *
 * Manages the analytics dashboard state using Angular signals:
 * - Filter state (date range, bank selection)
 * - Loading/error/ready state machine
 * - Data signals for each analytics domain
 *
 * Uses linkedSignal for derived state and computed for aggregations.
 * All state is immutable — updates create new signal values.
 */

import { Injectable, signal, computed } from '@angular/core';
import { getThisWeekRange, getThisMonthRange } from '../../../core/services/date-range.service';
import type {
  AnalyticsSummary,
  MonthlyTrend,
  CategoryBreakdown,
  DailySpending,
  AnalyticsInsight,
  AnalyticsTransaction,
  BankInfo,
  DateRange,
  OriginBreakdown,
} from './analytics-api.service';

// ─── State Types ────────────────────────────────────────────────────────────

export type AnalyticsLoadState = 'idle' | 'loading' | 'ready' | 'error';

export interface AnalyticsFilterState {
  dateRange: DateRange | null;
  bankId: string | null;
  period: 'this_week' | 'this_month' | '7d' | '30d' | '90d' | '6m' | '1y' | 'custom';
  type: 'all' | 'income' | 'expense';
  category: string | null;
}

/** Cross-filter state from chart click interactions */
export interface ChartFilter {
  type: 'category' | 'hour';
  value: string | number;
  label?: string;
}

// ─── Pure helpers ───────────────────────────────────────────────────────────

/**
 * Derive a UTC DateRange from a period string.
 * Uses UTC methods to avoid timezone boundary shifts.
 */
function deriveDateRangeFromPeriod(period: AnalyticsFilterState['period']): DateRange {
  const now = new Date();

  if (period === 'this_week') {
    const range = getThisWeekRange(now);
    return {
      startDate: new Date(range.start + 'T00:00:00Z').toISOString(),
      endDate: new Date(range.end + 'T23:59:59.999Z').toISOString(),
    };
  }

  if (period === 'this_month') {
    const range = getThisMonthRange(now);
    return {
      startDate: new Date(range.start + 'T00:00:00Z').toISOString(),
      endDate: new Date(range.end + 'T23:59:59.999Z').toISOString(),
    };
  }

  // Anchor to the user's local calendar day (e.g. Sept 30 in Colombia, not Oct 1 UTC)
  const endUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  let daysBack: number;
  switch (period) {
    case '7d': daysBack = 7; break;
    case '30d': daysBack = 30; break;
    case '90d': daysBack = 90; break;
    case '6m': daysBack = 180; break;
    case '1y': daysBack = 365; break;
    default: daysBack = 30;
  }

  const startMs = endUTC - (daysBack * 24 * 60 * 60 * 1000);
  const startDate = new Date(startMs);
  const startUTC = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate(), 0, 0, 0);

  return {
    startDate: new Date(startUTC).toISOString(),
    endDate: new Date(endUTC).toISOString(),
  };
}

// ─── Store ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AnalyticsStore {
  // ─── Filter State ───────────────────────────────────────────────────────

  private readonly _filters = signal<AnalyticsFilterState>({
    dateRange: null,
    bankId: null,
    period: 'this_month',  // Default to current calendar month
    type: 'all',
    category: null,
  });

  readonly filters = this._filters.asReadonly();

  // ─── Cross-Filter State (drill-down selection from charts) ──────────────

  private readonly _crossFilter = signal<{ categoryId?: string; categoryName?: string }>({});
  readonly crossFilter = this._crossFilter.asReadonly();

  /** Whether cross-filter is active */
  readonly hasCrossFilter = computed(() => !!this._crossFilter().categoryId);

  // ─── Chart Filter State (click-to-filter from chart data points) ────────

  private readonly _chartFilter = signal<ChartFilter | null>(null);
  readonly chartFilter = this._chartFilter.asReadonly();

  /** Whether a chart-based filter is active */
  readonly hasChartFilter = computed(() => this._chartFilter() !== null);

  /** Computed API params from current filters */
  readonly apiParams = computed(() => {
    const f = this._filters();
    const cf = this._crossFilter();
    const chF = this._chartFilter();

    // Derive dateRange from period when not explicitly set
    const dateRange = f.dateRange ?? deriveDateRangeFromPeriod(f.period);

    return {
      range: dateRange,
      bankId: f.bankId ?? undefined,
      type: f.type !== 'all' ? f.type : undefined,
      category: cf.categoryId ?? f.category ?? undefined, // crossFilter takes precedence
      chartFilterType: chF?.type,
      chartFilterValue: chF?.value,
    };
  });

  // ─── Load State ─────────────────────────────────────────────────────────

  private readonly _loadState = signal<AnalyticsLoadState>('idle');
  readonly loadState = this._loadState.asReadonly();

  private readonly _error = signal<string | null>(null);
  readonly error = this._error.asReadonly();

  // ─── Data Signals ───────────────────────────────────────────────────────

  private readonly _summary = signal<AnalyticsSummary | null>(null);
  readonly summary = this._summary.asReadonly();

  private readonly _monthlyTrend = signal<MonthlyTrend | null>(null);
  readonly monthlyTrend = this._monthlyTrend.asReadonly();

  private readonly _categoryBreakdown = signal<CategoryBreakdown | null>(null);
  readonly categoryBreakdown = this._categoryBreakdown.asReadonly();

  private readonly _dailySpending = signal<DailySpending | null>(null);
  readonly dailySpending = this._dailySpending.asReadonly();

  private readonly _insights = signal<AnalyticsInsight[]>([]);
  readonly insights = this._insights.asReadonly();

  private readonly _transactions = signal<AnalyticsTransaction[]>([]);
  readonly transactions = this._transactions.asReadonly();

  private readonly _banks = signal<BankInfo[]>([]);
  readonly banks = this._banks.asReadonly();

  // ─── Origin Breakdown Data ──────────────────────────────────────────────

  private readonly _originBreakdown = signal<OriginBreakdown | null>(null);
  readonly originBreakdown = this._originBreakdown.asReadonly();

  // ─── Computed Derived State ─────────────────────────────────────────────

  /** Whether any data has been loaded */
  readonly hasData = computed(() => {
    return (
      this._summary() !== null ||
      this._monthlyTrend() !== null ||
      (this._categoryBreakdown()?.categories?.length ?? 0) > 0
    );
  });

  /** Whether the user is new (no data at all) */
  readonly isNewUser = computed(() => {
    const s = this._summary();
    if (!s) return true; // null = no data = new user
    return s.totalIncome === 0 && s.totalExpenses === 0;
  });

  /** Whether current filters return no data */
  readonly isFilteredEmpty = computed(() => {
    return this._loadState() === 'ready' && !this.hasData();
  });

  // ─── Actions ────────────────────────────────────────────────────────────

  /** Set the date period (7d, 30d, 90d, 6m, 1y) */
  setPeriod(period: AnalyticsFilterState['period']): void {
    this._filters.update(f => ({ ...f, period, dateRange: null }));
  }

  /** Set a custom date range */
  setDateRange(startDate: string, endDate: string): void {
    this._filters.update(f => ({
      ...f,
      period: 'custom',
      dateRange: { startDate, endDate },
    }));
  }

  /** Set the bank filter */
  setBankId(bankId: string | null): void {
    this._filters.update(f => ({ ...f, bankId }));
  }

  /** Set the type filter */
  setType(type: 'all' | 'income' | 'expense'): void {
    this._filters.update(f => ({ ...f, type }));
  }

  /** Set the category filter */
  setCategory(category: string | null): void {
    this._filters.update(f => ({ ...f, category }));
  }

  /** Set cross-filter category (drill-down from chart click) */
  setCrossFilterCategory(categoryId: string, categoryName?: string): void {
    this._crossFilter.set({ categoryId, categoryName });
  }

  /** Clear cross-filter */
  clearCrossFilter(): void {
    this._crossFilter.set({});
  }

  /** Set chart filter (click-to-filter from bar/area/hourly charts). Toggle behavior: clicking same point clears. */
  setChartFilter(chartFilter: ChartFilter): void {
    const current = this._chartFilter();
    if (current && current.type === chartFilter.type && current.value === chartFilter.value) {
      // Toggle off — clicking same point clears filter
      this._chartFilter.set(null);
    } else {
      // Replace filter (no stacking)
      this._chartFilter.set(chartFilter);
    }
  }

  /** Clear chart filter */
  clearChartFilter(): void {
    this._chartFilter.set(null);
  }

  /** Clear all filters to defaults */
  clearFilters(): void {
    this._filters.set({
      dateRange: null,
      bankId: null,
      period: '30d',
      type: 'all',
      category: null,
    });
    this._chartFilter.set(null);
    this._crossFilter.set({});
  }

  /** Set loading state */
  setLoading(): void {
    this._loadState.set('loading');
    this._error.set(null);
  }

  /** Set ready state */
  setReady(): void {
    this._loadState.set('ready');
  }

  /** Set error state */
  setError(message: string): void {
    this._loadState.set('error');
    this._error.set(message);
  }

  /** Update summary data */
  setSummary(data: AnalyticsSummary): void {
    this._summary.set(data);
  }

  /** Update monthly trend data */
  setMonthlyTrend(data: MonthlyTrend): void {
    this._monthlyTrend.set(data);
  }

  /** Update category breakdown data */
  setCategoryBreakdown(data: CategoryBreakdown): void {
    this._categoryBreakdown.set(data);
  }

  /** Update daily spending data */
  setDailySpending(data: DailySpending): void {
    this._dailySpending.set(data);
  }

  /** Update insights data */
  setInsights(data: AnalyticsInsight[]): void {
    this._insights.set(data);
  }

  /** Update transactions data */
  setTransactions(data: AnalyticsTransaction[]): void {
    this._transactions.set(data);
  }

  /** Update banks data */
  setBanks(data: BankInfo[]): void {
    this._banks.set(data);
  }

  /** Update origin breakdown data */
  setOriginBreakdown(data: OriginBreakdown): void {
    this._originBreakdown.set(data);
  }

  /** Reset all data to initial state */
  reset(): void {
    this._summary.set(null);
    this._monthlyTrend.set(null);
    this._categoryBreakdown.set(null);
    this._dailySpending.set(null);
    this._insights.set([]);
    this._transactions.set([]);
    this._originBreakdown.set(null);
    this._loadState.set('idle');
    this._error.set(null);
  }
}
