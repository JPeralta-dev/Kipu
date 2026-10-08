import {
  Component,
  signal,
  inject,
  OnInit,
  computed,
  effect,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { catchError, forkJoin, of } from 'rxjs';

// ─── ECharts ────────────────────────────────────────────────────────────────
import { FtEChartComponent, ChartClickEvent } from '../../../shared/charts';
import { EchartsThemeMapper } from '../../../shared/charts/echarts/echarts-theme.mapper';
import type { EChartsOption } from 'echarts';

// ─── Analytics Components ────────────────────────────────────────────────────
import type { PeriodOption } from '../components/analytics-header/analytics-header.component';
import { AnalyticsKpisComponent } from '../components/analytics-kpis/analytics-kpis.component';
import { AnalyticsFiltersComponent } from '../components/analytics-filters/analytics-filters.component';
import { AnalyticsChartCardComponent } from '../components/analytics-chart-card/analytics-chart-card.component';
import { RecentActivityComponent, ActivityItem } from '../../../features/dashboard/components/recent-activity/recent-activity.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { FtSubtleRevealDirective } from '../../../shared/directives/ft-subtle-reveal.directive';
import { ClickOutsideDirective } from '../../../shared/directives/click-outside.directive';

// ─── Services ───────────────────────────────────────────────────────────────
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { ToastService } from '../../../core/services/toast.service';
import { AnalyticsApiService, AnalyticsSummary, MonthlyTrend, CategoryBreakdown, DailySpending, AnalyticsTransaction, BankInfo, DateRange, HourlyActivityResponse, WeeklyPatternsResponse } from '../services/analytics-api.service';
import { AnalyticsStore } from '../services/analytics.store';
import { ICONS } from '../../../shared/icons/icon-registry';
import { DateRangeService } from '../../../core/services/date-range.service';

// ─── Types ──────────────────────────────────────────────────────────────────
import type { KpiData, MonthStory, CategoryAnalysis } from '../analytics.types';

// ─── Pure helpers ───────────────────────────────────────────────────────────

/** Map backend day abbreviations (Mon–Sun) to i18n keys */
const DAY_KEY_MAP: Record<string, string> = {
  Mon: 'analytics.days.mon',
  Tue: 'analytics.days.tue',
  Wed: 'analytics.days.wed',
  Thu: 'analytics.days.thu',
  Fri: 'analytics.days.fri',
  Sat: 'analytics.days.sat',
  Sun: 'analytics.days.sun',
};

/** Map API summary + trend to KpiData array */
export function mapToKpis(
  summary: AnalyticsSummary | null,
  trend: MonthlyTrend | null,
  currencySymbol: string,
  i18n: TranslationService,
): KpiData[] {
  const t = i18n.translate.bind(i18n);

  // Defensive: detect if summary is wrapped (backend bug) or null
  const hasValidData = summary && typeof summary.totalIncome === 'number';
  if (!hasValidData) {
    return [
      { icon: 'trendingUp', labelKey: 'analytics.totalIncome', value: 0, prefix: currencySymbol, trend: 0 },
      { icon: 'trendingDown', labelKey: 'analytics.totalExpenses', value: 0, prefix: currencySymbol, trend: 0 },
      { icon: 'wallet', labelKey: 'analytics.netSavings', value: 0, prefix: currencySymbol, trend: 0 },
      { icon: 'percent', labelKey: 'analytics.savingsRate', value: 0, suffix: '%', trend: 0 },
    ];
  }

  const lastIncome = trend?.income?.[trend.income.length - 1] ?? 0;
  const prevIncome = trend?.income?.[trend.income.length - 2] ?? lastIncome;
  const lastExpense = trend?.expenses?.[trend.expenses.length - 1] ?? 0;
  const prevExpense = trend?.expenses?.[trend.expenses.length - 2] ?? lastExpense;

  const incomeChange = prevIncome > 0 ? ((lastIncome - prevIncome) / prevIncome) * 100 : 0;
  const expenseChange = prevExpense > 0 ? ((lastExpense - prevExpense) / prevExpense) * 100 : 0;

  return [
    {
      icon: 'trendingUp',
      labelKey: 'analytics.totalIncome',
      value: summary.totalIncome,
      prefix: currencySymbol,
      trend: incomeChange,
    },
    {
      icon: 'trendingDown',
      labelKey: 'analytics.totalExpenses',
      value: summary.totalExpenses,
      prefix: currencySymbol,
      trend: -expenseChange, // expense increase is negative
    },
    {
      icon: 'wallet',
      labelKey: 'analytics.netSavings',
      value: summary.netSavings,
      prefix: currencySymbol,
      trend: summary.savingsRate,
    },
    {
      icon: 'percent',
      labelKey: 'analytics.savingsRate',
      value: Math.max(0, summary.savingsRate),
      suffix: '%',
      trend: summary.savingsRate - 15, // vs 15% target
    },
  ];
}

/** Map API category breakdown to CategoryAnalysis array */
export function mapToCategoryAnalysis(
  breakdown: CategoryBreakdown | null,
  colors: string[],
  i18n: TranslationService,
): CategoryAnalysis[] {
  if (!breakdown?.categories) return [];

  const icons: Record<string, string> = {
    food: 'food', transport: 'car', entertainment: 'gamepad',
    shopping: 'bag', health: 'heart', education: 'book',
    housing: 'home', utilities: 'zap', salary: 'briefcase',
    freelance: 'code', investment: 'trendingUp', other: 'circle',
  };

  return breakdown.categories
    .filter(cat => cat.category) // Skip categories with null/undefined names
    .map((cat, i) => ({
      id: cat.categoryId,
      name: i18n.translate(cat.category),
      icon: (cat as any).icon || icons[cat.category.toLowerCase()] || 'other',
      color: (cat as any).color || colors[i % colors.length],
      total: cat.amount,
      percentage: cat.percentage,
      change: 0, // Would need historical data; placeholder for now
      trend: 'stable' as const,
    }));
}

/** Map API transactions to UI ActivityItem */
export function mapToActivityItems(
  txs: AnalyticsTransaction[],
): ActivityItem[] {
  return txs.map(tx => ({
    id: tx.id,
    description: tx.merchant,
    category: tx.category,
    amount: Math.abs(tx.amount),
    type: tx.type,
    date: tx.date,
    bankName: tx.bank || undefined,
    origin: (tx as any).origin,
  }));
}

/** Generate month story from summary + trend */
export function generateMonthStories(
  summary: AnalyticsSummary | null,
  trend: MonthlyTrend | null,
  i18n: TranslationService,
): MonthStory[] {
  const stories: MonthStory[] = [];
  const hasValidData = summary && typeof summary.savingsRate === 'number';
  if (!hasValidData) {
    stories.push({
      icon: 'info',
      messageKey: 'analytics.story.noData',
      type: 'neutral',
    });
    return stories;
  }

  const t = i18n.translate.bind(i18n);

  if (summary.savingsRate >= 20) {
    stories.push({
      icon: 'star',
      messageKey: 'analytics.story.greatSavings',
      params: { rate: Math.round(summary.savingsRate) },
      type: 'positive',
    });
  } else if (summary.savingsRate < 0) {
    stories.push({
      icon: 'alertTriangle',
      messageKey: 'analytics.story.negativeSavings',
      params: { rate: Math.round(Math.abs(summary.savingsRate)) },
      type: 'negative',
    });
  }

  if (trend?.expenses && trend.expenses.length >= 2) {
    const current = trend.expenses[trend.expenses.length - 1];
    const prev = trend.expenses[trend.expenses.length - 2];
    if (prev > 0 && current > prev * 1.2) {
      stories.push({
        icon: 'trendingUp',
        messageKey: 'analytics.story.spendingSpike',
        params: { amount: Math.round(current) },
        type: 'info',
      });
    }
  }

  if (stories.length === 0) {
    stories.push({
      icon: 'info',
      messageKey: 'analytics.story.noNotableEvents',
      type: 'neutral',
    });
  }

  return stories;
}

// ─── Component ──────────────────────────────────────────────────────────────

@Component({
  selector: 'ft-analytics-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NgIcon,
    FtEChartComponent,
    FtSubtleRevealDirective,
    EmptyStateComponent,
    ClickOutsideDirective,
    TranslatePipe,
    RecentActivityComponent,
    AnalyticsKpisComponent,
    AnalyticsFiltersComponent,
    AnalyticsChartCardComponent,
  ],
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage implements OnInit {
  readonly store = inject(AnalyticsStore);
  private readonly api = inject(AnalyticsApiService);
  private readonly themeMapper = inject(EchartsThemeMapper);
  private readonly currencyService = inject(CurrencyService);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly dateRange = inject(DateRangeService);
  private readonly userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  /** Period options for the header buttons */
  readonly periodOptions: { value: PeriodOption; labelKey: string }[] = [
    { value: '1m', labelKey: 'analytics.period.1m' },
    { value: '3m', labelKey: 'analytics.period.3m' },
    { value: '6m', labelKey: 'analytics.period.6m' },
    { value: '1y', labelKey: 'analytics.period.1y' },
  ];

  // ─── Derived signals from store ─────────────────────────────────────────

  readonly kpis = computed<KpiData[]>(() =>
    mapToKpis(
      this.store.summary(),
      this.store.monthlyTrend(),
      this.currencyService.currencyConfig().symbol,
      this.i18n,
    ),
  );

  readonly categoryAnalysis = computed<CategoryAnalysis[]>(() =>
    mapToCategoryAnalysis(
      this.store.categoryBreakdown(),
      this.themeMapper.categoryColors(),
      this.i18n,
    ),
  );

  readonly activityItems = computed<ActivityItem[]>(() =>
    mapToActivityItems(this.store.transactions()),
  );

  readonly banks = computed<BankInfo[]>(() => this.store.banks());

  /** Pre-computed category names for the filters component (Angular templates can't call .map()) */
  readonly categoryNames = computed<string[]>(() =>
    this.categoryAnalysis().map(c => c.name),
  );

  /** Safe variation value for the header — avoids optional chaining warning and empty-array crash */
  readonly headerVariation = computed<number | null>(() => {
    const kpi = this.kpis();
    return kpi.length > 0 ? kpi[0].trend : null;
  });

  // ─── ECharts options (computed) ─────────────────────────────────────────

  readonly isSingleMonthRange = computed<boolean>(() => {
    const range = this.store.apiParams().range;
    if (!range) return false;
    const diffDays = (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 32;
  });

  readonly trendChartTitle = computed<string>(() => {
    return this.isSingleMonthRange()
      ? (this.i18n.translate('analytics.monthTrend') || 'Evolución del Mes')
      : this.i18n.translate('analytics.monthlyTrends');
  });

  readonly trendChartSubtitle = computed<string>(() => {
    return this.isSingleMonthRange()
      ? (this.i18n.translate('analytics.dailySpendingSubtitle') || 'Ingresos vs Gastos día a día')
      : this.i18n.translate('analytics.incomeVsExpenses');
  });

  readonly trendChartOptions = computed<EChartsOption | undefined>(() => {
    const colors = this.themeMapper.categoryColors();
    const range = this.store.apiParams().range;
    const isSingleMonth = this.isSingleMonthRange();

    // If viewing a single month (or <= 32 days), show daily granularity across the actual date range
    if (isSingleMonth && range) {
      const start = new Date(range.startDate);
      const end = new Date(range.endDate);
      const txs = this.store.transactions();

      const dailyLabels: string[] = [];
      const dailyIncome: number[] = [];
      const dailyExpense: number[] = [];

      const cur = new Date(start);
      // Anchor to noon UTC so toLocaleDateString stays on the correct day across UTC-5 and all timezones
      cur.setUTCHours(12, 0, 0, 0);
      const endLimit = new Date(end);
      endLimit.setUTCHours(23, 59, 59, 999);

      while (cur <= endLimit) {
        const dayKey = cur.toISOString().split('T')[0];
        dailyLabels.push(cur.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }));

        const dayTxs = txs.filter(t => {
          if (!t.date) return false;
          if (t.date.startsWith(dayKey)) return true;
          const tDate = new Date(t.date);
          return tDate.toISOString().split('T')[0] === dayKey;
        });
        const inc = dayTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const exp = dayTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);

        dailyIncome.push(inc);
        dailyExpense.push(exp);

        cur.setUTCDate(cur.getUTCDate() + 1);
      }

      if (dailyLabels.length > 0) {
        return this.themeMapper.buildAreaOption(
          dailyLabels,
          [
            { label: this.i18n.translate('transactions.form.income') || 'Ingresos', data: dailyIncome, color: colors[7] },
            { label: this.i18n.translate('transactions.form.expense') || 'Gastos', data: dailyExpense, color: colors[4] },
          ],
        );
      }
    }

    // Default: monthly trend
    const trend = this.store.monthlyTrend();
    if (!trend || trend.labels.length === 0) return undefined;

    // Transform "YYYY-MM" labels → "Mmm YYYY" (e.g. "2026-09" → "Sep 2026")
    const readableLabels = trend.labels.map(label => {
      const [year, month] = label.split('-');
      if (!year || !month) return label;
      const d = new Date(Date.UTC(+year, +month - 1, 1, 12));
      return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
    });

    return this.themeMapper.buildAreaOption(
      readableLabels,
      [
        { label: this.i18n.translate('transactions.form.income'), data: trend.income, color: colors[7] },
        { label: this.i18n.translate('transactions.form.expense'), data: trend.expenses.map(e => Math.abs(e)), color: colors[4] },
      ],
    );
  });

  readonly donutChartOptions = computed<EChartsOption | undefined>(() => {
    const breakdown = this.store.categoryBreakdown();
    if (!breakdown?.categories || breakdown.categories.length === 0) return undefined;

    const validCategories = breakdown.categories.filter(c => c.category && c.amount > 0);
    if (validCategories.length === 0) return undefined;

    // Group categories beyond top 5 into 'Otros' so donut chart isn't cramped
    const topCount = 5;
    const top = validCategories.slice(0, topCount);
    const rest = validCategories.slice(topCount);
    const defaultColors = this.themeMapper.categoryColors();

    const labels: string[] = top.map(c => this.i18n.translate(c.category));
    const data: number[] = top.map(c => c.amount);
    const colors: string[] = top.map((_, i) => defaultColors[i % defaultColors.length]);

    if (rest.length > 0) {
      const restTotal = rest.reduce((sum, c) => sum + c.amount, 0);
      labels.push(this.i18n.translate('analytics.otherCategories') || 'Otros');
      data.push(restTotal);
      colors.push(defaultColors[5] || '#6E48AA');
    }

    return this.themeMapper.buildDonutOption(labels, data, undefined, colors);
  });

  readonly dailyChartOptions = computed<EChartsOption | undefined>(() => {
    const daily = this.store.dailySpending();
    if (!daily?.days || daily.days.length === 0) return undefined;

    const colors = this.themeMapper.categoryColors();
    return this.themeMapper.buildBarOption(
      daily.days.map(d => this.i18n.translate(DAY_KEY_MAP[d.label] ?? d.label)),
      [{ label: this.i18n.translate('analytics.dailySpending'), data: daily.days.map(d => d.amount), color: colors[2] }],
    );
  });

  // ─── Hourly Activity Chart ──────────────────────────────────────────────

  private readonly _hourlyData = signal<HourlyActivityResponse | null>(null);
  readonly hourlyData = this._hourlyData.asReadonly();

  readonly hourlyChartOptions = computed<EChartsOption | undefined>(() => {
    const data = this._hourlyData();
    if (!data || !data.hours || data.hours.length === 0) return undefined;

    const hours = data.hours.map(h => h.hour);
    const incomeData = data.hours.map(h => h.income);
    const expenseData = data.hours.map(h => h.expenses);

    const maxExpenseHour = expenseData.reduce((maxIdx, val, idx, arr) =>
      val > arr[maxIdx] ? idx : maxIdx, 0);

    // Pass the real currency formatter so the tooltip shows "$5,500.00" not "5.5k"
    return this.themeMapper.buildHourlyBarOptionWithPeak(
      hours,
      incomeData,
      expenseData,
      this.currencyService.currencyConfig().symbol,
      maxExpenseHour,
      (v) => this.currencyService.format(v),
    );
  });

  // ─── Weekly Patterns Chart (with averages) ──────────────────────────────

  private readonly _weeklyPatterns = signal<WeeklyPatternsResponse | null>(null);
  readonly weeklyPatterns = this._weeklyPatterns.asReadonly();

  readonly weeklyPatternsChartOptions = computed<EChartsOption | undefined>(() => {
    const data = this._weeklyPatterns();
    if (!data || !data.patterns || data.patterns.length === 0) return undefined;

    const categoryTotals = new Map<string, number>();
    for (const p of data.patterns) {
      categoryTotals.set(p.category, (categoryTotals.get(p.category) ?? 0) + p.total);
    }

    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    const otherKey = this.i18n.translate('analytics.otherCategories') || 'Otros';

    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const labels = dayOrder.map(d => this.i18n.translate(DAY_KEY_MAP[d] ?? d));

    const datasets: { label: string; data: number[]; color: string }[] = [];
    const colors = this.themeMapper.categoryColors();

    topCategories.forEach((cat, idx) => {
      const dayData = dayOrder.map((_, dayIdx) => {
        const dayOfWeek = dayIdx === 6 ? 0 : dayIdx + 1;
        const pattern = data.patterns.find(p => p.dayOfWeek === dayOfWeek && p.category === cat);
        return pattern?.total ?? 0;
      });

      datasets.push({
        label: this.i18n.translate(cat),
        data: dayData,
        color: colors[idx % colors.length],
      });
    });

    const othersData = dayOrder.map((_, dayIdx) => {
      const dayOfWeek = dayIdx === 6 ? 0 : dayIdx + 1;
      const dayPatterns = data.patterns.filter(p => p.dayOfWeek === dayOfWeek && !topCategories.includes(p.category));
      return dayPatterns.reduce((sum, p) => sum + (p.total ?? 0), 0);
    });

    if (othersData.some(v => v > 0)) {
      datasets.push({
        label: otherKey,
        data: othersData,
        color: colors[5 % colors.length],
      });
    }

    return this.themeMapper.buildWeeklyPatternsStackedOption(labels, datasets);
  });

  // ─── State helpers ──────────────────────────────────────────────────────

  readonly isLoading = computed(() => this.store.loadState() === 'loading');
  readonly isError = computed(() => this.store.loadState() === 'error');
  readonly isNewUser = computed(() => this.store.isNewUser());

  readonly monthOpen = signal(false);
  readonly dailyChartSubtitle = computed<string>(() => {
    const filters = this.store.filters();
    const period = filters.period;
    const thisWeek = this.i18n.translate('analytics.thisWeek');
    if (this.isSingleMonthRange()) {
      return this.i18n.translate('analytics.weekdayAverage') || 'Promedio por día de la semana';
    }
    if (filters.dateRange) {
      const start = new Date(filters.dateRange.startDate);
      const end = new Date(filters.dateRange.endDate);
      const startStr = start.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
      return `${startStr} — ${endStr}`;
    }
    if (period === '90d' || period === '6m' || period === '1y') {
      return thisWeek + ' · ' + this.i18n.translate('analytics.currentWeekNote');
    }
    return thisWeek;
  });

  readonly showCustomDates = signal(false);

  /** Show content layout whenever data is loaded — even with zero values */
  readonly showContent = computed(() => this.store.loadState() === 'ready');

  /** Whether a filter-triggered refetch is in progress (existing data + loading). Avoids full skeleton flash. */
  readonly isRefetching = computed(() => this.isLoading() && this.store.hasData());

  readonly pageState = computed<'loading' | 'error' | 'content'>(() => {
    // Keep content visible during refetch — just show a thin progress bar
    if (this.isLoading() && !this.store.hasData()) return 'loading';
    if (this.isError()) return 'error';
    return 'content';
  });

  readonly errorMessage = computed(() => this.store.error());

  // ─── Filter state (two-way with filters component) ──────────────────────

  /** Map store period to header PeriodOption */
  readonly headerPeriod = computed<PeriodOption>(() => {
    const p = this.store.filters().period;
    if (p === '7d' || p === '30d') return '1m';
    if (p === '90d') return '3m';
    if (p === '1y') return '1y';
    return '6m'; // default
  });

  readonly filterBankId = computed(() => this.store.filters().bankId);

  /** Human-readable date range display */
  readonly dateRangeDisplay = computed<string>(() => {
    const params = this.store.apiParams();
    const range = params.range;
    if (!range) return '';

    const start = new Date(range.startDate);
    const end = new Date(range.endDate);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} — ${endStr}`;
  });

  /** Custom date inputs (derived from store) */
  readonly customStartDate = computed<string>(() => {
    const range = this.store.filters().dateRange;
    return range?.startDate?.split('T')[0] ?? '';
  });

  readonly customEndDate = computed<string>(() => {
    const range = this.store.filters().dateRange;
    return range?.endDate?.split('T')[0] ?? '';
  });

  // ─── Lifecycle ──────────────────────────────────────────────────────────

  constructor() {
    // React to filter changes and reload data
    effect(() => {
      const params = this.store.apiParams();
      this.loadData(params.range, params.bankId, params.type, params.category, params.chartFilterType, params.chartFilterValue);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadBanks();
  }

  // ─── Actions ────────────────────────────────────────────────────────────

  onPeriodChange(period: PeriodOption): void {
    this.showCustomDates.set(false);
    // Map header period to store period
    const storePeriod: '7d' | '30d' | '90d' | '6m' | '1y' =
      period === '1m' ? '30d' :
      period === '3m' ? '90d' :
      period === '1y' ? '1y' : '6m';
    if (period === '1m') {
      this.dateRange.setCurrentMonth();
    }
    this.store.setPeriod(storePeriod);
    // Clear chart filters when changing period
    this.onClearChartFilters();
  }

  onBankChange(bankId: string | null): void {
    this.store.setBankId(bankId);
  }

  onFiltersReset(): void {
    this.showCustomDates.set(false);
    this.dateRange.setCurrentMonth();
    this.store.clearFilters();
  }

  toggleMonthDropdown(): void {
    this.monthOpen.update(v => !v);
  }

  onMonthSelect(month: { start: string; end: string }): void {
    this.showCustomDates.set(false);
    this.dateRange.setMonth(month.start, month.end);
    const startDate = new Date(month.start + 'T00:00:00Z').toISOString();
    const endDate = new Date(month.end + 'T23:59:59Z').toISOString();
    this.store.setDateRange(startDate, endDate);
    this.monthOpen.set(false);
  }

  toggleCustomDates(): void {
    const isCustom = !this.showCustomDates();
    this.showCustomDates.set(isCustom);
    if (!isCustom) {
      this.onPeriodChange('1m');
    }
  }

  /** Handle custom date range from header inputs */
  onCustomDateChange({ start, end }: { start: string; end: string }): void {
    if (start && end) {
      this.dateRange.setMonth(start, end);
      // Convert to UTC ISO strings with proper boundaries
      const startDate = new Date(start + 'T00:00:00Z').toISOString();
      const endDate = new Date(end + 'T23:59:59Z').toISOString();
      this.store.setDateRange(startDate, endDate);
    }
  }

  /** Handle chart click events for drill-down filtering */
  onChartClick(event: ChartClickEvent, chartType: 'category' | 'hourly' | 'weekly'): void {
    const t = this.i18n.translate.bind(this.i18n);

    if (chartType === 'category' && event.name) {
      // Donut/bar click → filter by category name
      // Map display name back to category ID
      const analysis = this.categoryAnalysis();
      const matched = analysis.find(c => c.name === event.name);
      if (matched) {
        this.store.setCrossFilterCategory(matched.id, matched.name);
        this.toast.info(
          t('analytics.filtered', { name: matched.name }),
          t('analytics.clearFilterTip'),
        );
      }
    } else if (chartType === 'hourly' && event.hour !== undefined) {
      // Hourly chart click → filter by hour
      const label = `${event.hour}:00`;
      this.store.setChartFilter({
        type: 'hour',
        value: event.hour,
        label,
      });
      this.toast.info(
        t('analytics.filtered', { name: label }),
        t('analytics.clearFilterTip'),
      );
    } else if (chartType === 'weekly' && event.name) {
      // Weekly patterns click → filter by day
      const dayKeyMapReverse: Record<string, string> = {
        'analytics.days.mon': 'Mon',
        'analytics.days.tue': 'Tue',
        'analytics.days.wed': 'Wed',
        'analytics.days.thu': 'Thu',
        'analytics.days.fri': 'Fri',
        'analytics.days.sat': 'Sat',
        'analytics.days.sun': 'Sun',
      };
      const dayLabel = dayKeyMapReverse[event.name] ?? event.name;
      this.store.setChartFilter({
        type: 'category',
        value: dayLabel,
        label: event.name,
      });
      this.toast.info(
        t('analytics.filtered', { name: event.name }),
        t('analytics.clearFilterTip'),
      );
    }
  }

  /** Clear all chart filters */
  onClearChartFilters(): void {
    this.store.clearChartFilter();
    this.store.clearCrossFilter();
  }

  retry(): void {
    const params = this.store.apiParams();
    this.loadData(params.range, params.bankId, params.type, params.category, params.chartFilterType, params.chartFilterValue);
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private loadBanks(): void {
    this.api.getBanks().pipe(
      catchError(() => of({ banks: [] })),
    ).subscribe({
      next: (res) => this.store.setBanks(res.banks),
    });
  }

  /** Compute the current week's date range (Mon 00:00 – Sun 23:59 UTC) for the daily-spending chart */
  private getCurrentWeekRange(): DateRange {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday, 0, 0, 0));
    const sunday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + (6 - daysSinceMonday), 23, 59, 59));

    return {
      startDate: monday.toISOString(),
      endDate: sunday.toISOString(),
    };
  }

  private loadData(range?: DateRange, bankId?: string, type?: string, category?: string, chartFilterType?: string, chartFilterValue?: string | number): void {
    this.store.setLoading();

    // Daily spending range: use the filter range if it spans <= 32 days, otherwise fallback to current week
    const weekRange = this.getCurrentWeekRange();
    const isShortRange = !!range && (new Date(range.endDate).getTime() - new Date(range.startDate).getTime()) <= 32 * 24 * 60 * 60 * 1000;
    const targetDailyRange = isShortRange ? range : weekRange;

    // Core analytics only — new endpoints load separately
    forkJoin({
      summary: this.api.getSummary(range, bankId, type, category).pipe(catchError(() => of(null))),
      trend: this.api.getMonthlyTrend(range, bankId, type, category).pipe(catchError(() => of(null))),
      categoryBreakdown: this.api.getCategoryBreakdown(range, bankId, type, category).pipe(catchError(() => of(null))),
      dailySpending: this.api.getDailySpending(targetDailyRange, bankId, type, category).pipe(catchError(() => of(null))),
      insights: this.api.getInsights(range, bankId, type, category).pipe(
        catchError(() => of({ insights: [] })),
      ),
      transactions: this.api.getRecentTransactions(range, bankId, type, category, 200).pipe(
        catchError(() => of({ transactions: [] })),
      ),
    }).subscribe({
      next: ({ summary, trend, categoryBreakdown, dailySpending, insights, transactions }) => {
        if (summary) {
          this.store.setSummary(summary);
          // Limit the month dropdown to months where the user has data.
          // If the backend exposes firstTransactionDate, use it; otherwise
          // fall back to the start of the current filter range.
          const firstTxDate = (summary as any).firstTransactionDate;
          if (firstTxDate) {
            this.dateRange.setMinDate(new Date(firstTxDate));
          } else if (range?.startDate) {
            this.dateRange.setMinDate(new Date(range.startDate));
          }
        }
        if (trend) this.store.setMonthlyTrend(trend);
        if (categoryBreakdown) this.store.setCategoryBreakdown(categoryBreakdown);
        if (dailySpending) this.store.setDailySpending(dailySpending);
        if (insights?.insights) this.store.setInsights(insights.insights);
        if (transactions?.transactions) this.store.setTransactions(transactions.transactions);

        this.store.setReady();

        // Load optional charts separately — do not block core analytics
        this.loadOptionalCharts(range, bankId, type, category);
      },
      error: (err) => {
        const msg = err?.message || this.i18n.translate('analytics.errorDesc');
        this.store.setError(msg);
        this.toast.error(msg);
      },
    });
  }

  /** Load new chart endpoints separately — safe to fail without breaking the page */
  private loadOptionalCharts(range?: DateRange, bankId?: string, type?: string, category?: string): void {
    forkJoin({
      hourlyActivity: this.api.getHourlyActivity(range, bankId, type, this.userTimezone).pipe(catchError(() => of(null))),
      weeklyPatterns: this.api.getWeeklyPatterns(range, bankId, type, category, this.userTimezone).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ hourlyActivity, weeklyPatterns }) => {
        // Validate response shape before setting signals (defense against malformed responses)
        if (hourlyActivity && Array.isArray(hourlyActivity.hours)) {
          this._hourlyData.set(hourlyActivity);
        } else {
          this._hourlyData.set(null);
        }
        if (weeklyPatterns && Array.isArray(weeklyPatterns.patterns)) {
          this._weeklyPatterns.set(weeklyPatterns);
        } else {
          this._weeklyPatterns.set(null);
        }
      },
    });
  }
}
