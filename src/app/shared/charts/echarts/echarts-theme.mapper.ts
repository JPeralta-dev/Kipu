/**
 * EchartsThemeMapper — CSS Variable → ECharts Theme Mapper.
 *
 * Reads CSS custom properties from the Obsidian Glass design system and maps
 * them to ECharts theme options. Re-evaluates automatically when the system
 * color scheme changes (dark/light mode toggle).
 *
 * Uses `getComputedStyle` to read actual CSS variable values, ensuring fidelity
 * with design tokens. Falls back to hardcoded defaults if a CSS var is missing.
 */

import { Injectable, signal, computed, DestroyRef, inject } from '@angular/core';
import type { EChartsOption } from 'echarts';

/** CSS variable names used by the Obsidian Glass design system */
interface CssVars {
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  gridColor: string;
  bgSecondary: string;
  bgTertiary: string;
  borderColor: string;
  success: string;
  danger: string;
  accentPrimary: string;
  accentMid: string;
  accentEnd: string;
  info: string;
}

/** Default fallback colors when CSS var is undefined */
const DEFAULT_CSS: CssVars = {
  textPrimary: '#F3E8FF',
  textSecondary: 'rgba(243,232,255,0.7)',
  textTertiary: 'rgba(243,232,255,0.4)',
  gridColor: 'rgba(255,255,255,0.06)',
  bgSecondary: '#1D1426',
  bgTertiary: '#2A1E35',
  borderColor: 'rgba(255,255,255,0.08)',
  success: '#06D6A0',
  danger: '#FF6B6B',
  accentPrimary: '#9D50BB',
  accentMid: '#7B42F6',
  accentEnd: '#6E48AA',
  info: '#A78BFA',
};

/** Category chart color palette */
const CATEGORY_COLORS = [
  DEFAULT_CSS.accentPrimary,
  DEFAULT_CSS.accentMid,
  DEFAULT_CSS.accentEnd,
  DEFAULT_CSS.info,
  DEFAULT_CSS.danger,
  '#FF9E7D',
  '#FFD166',
  DEFAULT_CSS.success,
  '#4DA6FF',
  '#A3A3A3',
];

@Injectable({ providedIn: 'root' })
export class EchartsThemeMapper {
  private readonly destroyRef = inject(DestroyRef);

  /** Current CSS variable values (reactive) */
  private readonly cssVars = signal<CssVars>(this.readCssVars());

  /** Computed theme option for ECharts */
  readonly theme = computed<EChartsOption>(() => this.buildTheme(this.cssVars()));

  /** Category color palette (reactive) */
  readonly categoryColors = computed<string[]>(() => {
    const c = this.cssVars();
    return [
      c.accentPrimary,
      c.accentMid,
      c.accentEnd,
      c.info,
      c.danger,
      '#FF9E7D',
      '#FFD166',
      c.success,
      '#4DA6FF',
      '#A3A3A3',
    ];
  });

  constructor() {
    // Listen for system color scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => this.cssVars.set(this.readCssVars());
    mediaQuery.addEventListener('change', handler);
    this.destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', handler));
  }

  /** Force re-read of CSS variables (e.g., after manual theme toggle) */
  refresh(): void {
    this.cssVars.set(this.readCssVars());
  }

  /** Format a number as currency string */
  private formatCurrency(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
    return value.toFixed(0);
  }

  /** Get the color for a series name from the dataset */
  private getSeriesColor(
    datasets: { label: string; data: number[]; color: string }[],
    seriesName: string,
  ): string {
    const ds = datasets.find(d => d.label === seriesName);
    return ds?.color ?? '#A3A3A3';
  }

  /** Read CSS custom properties from :root */
  private readCssVars(): CssVars {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    const get = (name: string, fallback: string): string => {
      const value = style.getPropertyValue(name).trim();
      if (!value) {
        // eslint-disable-next-line no-console
        console.warn(`[EchartsThemeMapper] CSS variable "${name}" not found, using fallback: ${fallback}`);
      }
      return value || fallback;
    };

    return {
      textPrimary: get('--text-primary', DEFAULT_CSS.textPrimary),
      textSecondary: get('--text-secondary', DEFAULT_CSS.textSecondary),
      textTertiary: get('--text-tertiary', DEFAULT_CSS.textTertiary),
      gridColor: get('--chart-grid', DEFAULT_CSS.gridColor),
      bgSecondary: get('--bg-secondary', DEFAULT_CSS.bgSecondary),
      bgTertiary: get('--bg-tertiary', DEFAULT_CSS.bgTertiary),
      borderColor: get('--glass-border', DEFAULT_CSS.borderColor),
      success: get('--success', DEFAULT_CSS.success),
      danger: get('--danger', DEFAULT_CSS.danger),
      accentPrimary: get('--accent-start', DEFAULT_CSS.accentPrimary),
      accentMid: get('--accent-mid', DEFAULT_CSS.accentMid),
      accentEnd: get('--accent-end', DEFAULT_CSS.accentEnd),
      info: get('--info', DEFAULT_CSS.info),
    };
  }

  /** Build ECharts theme option from CSS variables */
  private buildTheme(css: CssVars): EChartsOption {
    return {
      animation: true,
      animationDuration: 600,
      animationEasing: 'cubicOut' as const,
      animationDurationUpdate: 400,
      animationEasingUpdate: 'cubicInOut' as const,
      textStyle: {
        fontFamily: "'Space Grotesk', sans-serif",
        color: css.textPrimary,
      },
      title: {
        textStyle: {
          color: css.textPrimary,
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 600,
        },
        subtextStyle: {
          color: css.textSecondary,
          fontFamily: "'Inter', sans-serif",
        },
      },
      tooltip: {
        backgroundColor: css.bgTertiary,
        borderColor: css.borderColor,
        borderWidth: 1,
        textStyle: {
          color: css.textPrimary,
          fontFamily: "'Inter', sans-serif",
        },
        extraCssText: 'border-radius: 8px; backdrop-filter: blur(12px);',
      },
      legend: {
        textStyle: {
          color: css.textSecondary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
        },
        itemGap: 16,
      },
      grid: {
        top: 40,
        right: 16,
        bottom: 24,
        left: 48,
      },
      xAxis: {
        axisLine: { lineStyle: { color: css.borderColor } },
        axisTick: { lineStyle: { color: css.borderColor } },
        axisLabel: {
          color: css.textTertiary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
        },
        splitLine: { show: false },
      },
      yAxis: {
        axisLine: { lineStyle: { color: css.borderColor } },
        axisTick: { lineStyle: { color: css.borderColor } },
        axisLabel: {
          color: css.textTertiary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
        },
        splitLine: { lineStyle: { color: css.gridColor } },
      },
    };
  }

  /**
   * Get a base ECharts option with theme applied.
   * Merge this with your data-specific options.
   */
  getBaseOption(): EChartsOption {
    return this.theme();
  }

  /**
   * Build a complete ECharts option for a line/area chart.
   */
  buildAreaOption(
    labels: string[],
    datasets: { label: string; data: number[]; color: string }[],
    title?: string,
  ): EChartsOption {
    const css = this.cssVars();
    return {
      ...this.buildTheme(css),
      title: title ? { text: title, left: 'center' } : undefined,
      tooltip: {
        trigger: 'axis',
        confine: true,
        axisPointer: { type: 'line' },
        backgroundColor: css.bgTertiary,
        borderColor: css.borderColor,
        borderWidth: 1,
        textStyle: { color: css.textPrimary, fontFamily: "'Inter', sans-serif" },
        extraCssText: 'border-radius: 8px; backdrop-filter: blur(12px);',
      },
      grid: { top: title ? 50 : 20, right: 16, bottom: 24, left: 48 },
      xAxis: {
        type: 'category',
        data: labels,
        boundaryGap: false,
        axisLabel: { color: css.textTertiary, fontFamily: "'Inter', sans-serif", fontSize: 11 },
        axisLine: { lineStyle: { color: css.borderColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          color: css.textTertiary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
            if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
            return `${value}`;
          },
        },
        splitLine: { lineStyle: { color: css.gridColor } },
      },
      series: datasets.map((ds) => ({
        name: ds.label,
        type: 'line',
        data: ds.data,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 2, color: ds.color },
        itemStyle: { color: ds.color },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: ds.color + '30' },
              { offset: 1, color: ds.color + '00' },
            ],
          },
        },
        emphasis: {
          focus: 'series',
          itemStyle: { borderWidth: 2 },
        },
      })),
    };
  }

  /**
   * Build a complete ECharts option for a bar chart.
   */
  buildBarOption(
    labels: string[],
    datasets: { label: string; data: number[]; color: string }[],
    title?: string,
  ): EChartsOption {
    const css = this.cssVars();
    return {
      ...this.buildTheme(css),
      title: title ? { text: title, left: 'center' } : undefined,
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: css.bgTertiary,
        borderColor: css.borderColor,
        borderWidth: 1,
        textStyle: { color: css.textPrimary, fontFamily: "'Inter', sans-serif" },
        extraCssText: 'border-radius: 8px; backdrop-filter: blur(12px);',
        formatter: (params: unknown) => {
          const items = params as Array<{ seriesName: string; data: number; axisValue: string }>;
          if (!items || items.length === 0) return '';
          const label = items[0].axisValue;
          let html = `<div style="font-weight:600;margin-bottom:6px">${label}</div>`;
          for (const item of items) {
            const formatted = this.formatCurrency(item.data);
            html += `<div style="display:flex;justify-content:space-between;gap:12px">
              <span style="color:${this.getSeriesColor(datasets, item.seriesName)}">●</span>
              <span>${item.seriesName}: ${formatted}</span>
            </div>`;
          }
          return html;
        },
      },
      grid: { top: title ? 50 : 20, right: 16, bottom: 24, left: 48 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: css.textTertiary, fontFamily: "'Inter', sans-serif", fontSize: 11 },
        axisLine: { lineStyle: { color: css.borderColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        minInterval: 1,
        axisLabel: {
          color: css.textTertiary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
            if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
            return `${value}`;
          },
        },
        splitLine: { lineStyle: { color: css.gridColor } },
      },
      series: datasets.map((ds) => ({
        name: ds.label,
        type: 'bar',
        data: ds.data,
        itemStyle: {
          color: ds.color + 'CC',
          borderColor: ds.color,
          borderWidth: 1,
          borderRadius: [6, 6, 0, 0],
        },
        barMaxWidth: 40,
      })),
    };
  }

  /**
   * Build a complete ECharts option for an hourly activity bar chart.
   * Dual series (income/expenses) with rich tooltips.
   */
  buildHourlyBarOption(
    hours: number[],
    incomeData: number[],
    expenseData: number[],
    currencySymbol: string,
  ): EChartsOption {
    const css = this.cssVars();
    const labels = hours.map(h => `${h}:00`);
    return {
      ...this.buildTheme(css),
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: css.bgTertiary,
        borderColor: css.borderColor,
        borderWidth: 1,
        textStyle: { color: css.textPrimary, fontFamily: "'Inter', sans-serif" },
        extraCssText: 'border-radius: 8px; backdrop-filter: blur(12px);',
        formatter: (params: unknown) => {
          const items = params as Array<{ seriesName: string; data: number; axisValue: string }>;
          if (!items || items.length === 0) return '';
          const hour = items[0].axisValue;
          let income = 0;
          let expenses = 0;
          for (const item of items) {
            if (item.seriesName.toLowerCase().includes('income') || item.seriesName.toLowerCase().includes('ingreso')) {
              income = item.data;
            } else {
              expenses = item.data;
            }
          }
          return `<div style="font-weight:600;margin-bottom:6px">${hour}</div>
            <div style="color:${css.success}">● Income: ${currencySymbol}${this.formatCurrency(income)}</div>
            <div style="color:${css.danger}">● Expenses: ${currencySymbol}${this.formatCurrency(expenses)}</div>`;
        },
      },
      grid: { top: 20, right: 16, bottom: 24, left: 48 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          color: css.textTertiary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
          interval: 2, // Show every 3rd label to avoid crowding
        },
        axisLine: { lineStyle: { color: css.borderColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: css.textTertiary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
            if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
            return `${value}`;
          },
        },
        splitLine: { lineStyle: { color: css.gridColor } },
      },
      series: [
        {
          name: 'Income',
          type: 'bar',
          data: incomeData,
          itemStyle: {
            color: css.success + 'CC',
            borderColor: css.success,
            borderWidth: 1,
            borderRadius: [4, 4, 0, 0],
          },
          barMaxWidth: 20,
        },
        {
          name: 'Expenses',
          type: 'bar',
          data: expenseData,
          itemStyle: {
            color: css.danger + 'CC',
            borderColor: css.danger,
            borderWidth: 1,
            borderRadius: [4, 4, 0, 0],
          },
          barMaxWidth: 20,
        },
      ],
    };
  }

  /**
   * Build a complete ECharts option for an hourly activity bar chart with peak hour marking.
   * @param valueFormatter Optional function to format monetary values in the tooltip.
   *   Pass `(v) => currencyService.format(v)` for full currency formatting.
   *   Defaults to the internal abbreviated formatter (e.g. "5.5k").
   */
  buildHourlyBarOptionWithPeak(
    hours: number[],
    incomeData: number[],
    expenseData: number[],
    currencySymbol: string,
    peakHour: number,
    valueFormatter?: (value: number) => string,
  ): EChartsOption {
    const css = this.cssVars();
    const labels = hours.map(h => `${h}:00`);
    // Use the provided formatter if available, fall back to abbreviated internal one.
    const fmt = valueFormatter ?? ((v: number) => `${currencySymbol}${this.formatCurrency(v)}`);

    return {
      ...this.buildTheme(css),
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: css.bgTertiary,
        borderColor: css.borderColor,
        borderWidth: 1,
        textStyle: { color: css.textPrimary, fontFamily: "'Inter', sans-serif" },
        extraCssText: 'border-radius: 8px; backdrop-filter: blur(12px);',
        formatter: (params: unknown) => {
          const items = params as Array<{ seriesName: string; data: number; axisValue: string }>;
          if (!items || items.length === 0) return '';
          const hour = items[0].axisValue;
          let income = 0;
          let expenses = 0;
          for (const item of items) {
            const rawVal = item.data;
            const val = typeof rawVal === 'number' ? rawVal : (rawVal as any)?.value ?? 0;
            if (item.seriesName.toLowerCase().includes('income') || item.seriesName.toLowerCase().includes('ingreso')) {
              income = val;
            } else {
              expenses = val;
            }
          }
          const total = income + expenses;
          return `<div style="font-weight:600;margin-bottom:6px">${hour}</div>
            <div style="color:${css.success}">● Ingresos: ${fmt(income)}</div>
            <div style="color:${css.danger}">● Gastos: ${fmt(expenses)}</div>
            <div style="border-top:1px solid ${css.borderColor};margin-top:6px;padding-top:6px;font-weight:600">
              Total: ${fmt(total)}
            </div>`;
        },
      },
      legend: {
        bottom: 0,
        textStyle: { color: css.textSecondary, fontFamily: "'Inter', sans-serif", fontSize: 11 },
      },
      grid: { top: 20, right: 16, bottom: 40, left: 48 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          color: css.textTertiary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 10,
          interval: 2,
        },
        axisLine: { lineStyle: { color: css.borderColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          color: css.textTertiary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
            if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
            return `${value}`;
          },
        },
        splitLine: { lineStyle: { color: css.gridColor } },
      },
      series: [
        {
          name: 'Ingresos',
          type: 'bar',
          data: incomeData,
          itemStyle: {
            color: css.success + 'CC',
            borderColor: css.success,
            borderWidth: 1,
            borderRadius: [4, 4, 0, 0],
          },
          barMaxWidth: 20,
        },
        {
          name: 'Gastos',
          type: 'bar',
          data: expenseData.map((val, idx) => ({
            value: val,
            itemStyle: idx === peakHour ? {
              color: css.danger,
              borderColor: css.danger,
              borderWidth: 2,
              borderRadius: [4, 4, 0, 0] as [number, number, number, number],
              shadowColor: css.danger + '40',
              shadowBlur: 8,
            } : {
              color: css.danger + 'CC',
              borderColor: css.danger,
              borderWidth: 1,
              borderRadius: [4, 4, 0, 0] as [number, number, number, number],
            },
          })),
          barMaxWidth: 20,
          markPoint: {
            data: [
              {
                name: 'Peak Hour',
                coord: [peakHour, expenseData[peakHour]],
                value: 'Pico',
                symbol: 'pin',
                symbolSize: 40,
                itemStyle: { color: css.danger },
                label: {
                  show: true,
                  formatter: 'Pico',
                  color: '#fff',
                  fontSize: 10,
                },
              },
            ],
          },
        },
      ],
    };

  }

  /**
   * Build a complete ECharts option for a weekly patterns bar chart with averages.
   */
  buildWeeklyPatternsOption(
    labels: string[],
    datasets: { label: string; data: number[]; color: string }[],
    title?: string,
  ): EChartsOption {
    const css = this.cssVars();
    return {
      ...this.buildTheme(css),
      title: title ? { text: title, left: 'center' } : undefined,
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: css.bgTertiary,
        borderColor: css.borderColor,
        borderWidth: 1,
        textStyle: { color: css.textPrimary, fontFamily: "'Inter', sans-serif" },
        extraCssText: 'border-radius: 8px; backdrop-filter: blur(12px);',
        formatter: (params: unknown) => {
          const items = params as Array<{ seriesName: string; data: number; axisValue: string }>;
          if (!items || items.length === 0) return '';
          const day = items[0].axisValue;
          let html = `<div style="font-weight:600;margin-bottom:6px">${day}</div>`;
          for (const item of items) {
            const formatted = this.formatCurrency(item.data);
            html += `<div style="display:flex;justify-content:space-between;gap:12px">
              <span style="color:${this.getSeriesColor(datasets, item.seriesName)}">●</span>
              <span>${item.seriesName}: ${formatted}</span>
            </div>`;
          }
          return html;
        },
      },
      grid: { top: title ? 50 : 20, right: 16, bottom: 24, left: 48 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: css.textTertiary, fontFamily: "'Inter', sans-serif", fontSize: 11 },
        axisLine: { lineStyle: { color: css.borderColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: css.textTertiary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
            if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
            return `${value}`;
          },
        },
        splitLine: { lineStyle: { color: css.gridColor } },
      },
      series: datasets.map((ds) => ({
        name: ds.label,
        type: 'bar',
        data: ds.data,
        itemStyle: {
          color: ds.color + 'CC',
          borderColor: ds.color,
          borderWidth: 1,
          borderRadius: [6, 6, 0, 0],
        },
        barMaxWidth: 40,
      })),
    };
  }

  /**
   * Build a complete ECharts option for a weekly patterns stacked bar chart by category.
   */
  buildWeeklyPatternsStackedOption(
    labels: string[],
    datasets: { label: string; data: number[]; color: string }[],
  ): EChartsOption {
    const css = this.cssVars();
    return {
      ...this.buildTheme(css),
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: css.bgTertiary,
        borderColor: css.borderColor,
        borderWidth: 1,
        textStyle: { color: css.textPrimary, fontFamily: "'Inter', sans-serif" },
        extraCssText: 'border-radius: 8px; backdrop-filter: blur(12px);',
        formatter: (params: unknown) => {
          const items = params as Array<{ seriesName: string; data: number; axisValue: string }>;
          if (!items || items.length === 0) return '';
          const day = items[0].axisValue;
          let html = `<div style="font-weight:600;margin-bottom:6px">${day}</div>`;
          let total = 0;
          for (const item of items) {
            if (item.data > 0) {
              const formatted = this.formatCurrency(item.data);
              html += `<div style="display:flex;justify-content:space-between;gap:12px">
                <span style="color:${this.getSeriesColor(datasets, item.seriesName)}">●</span>
                <span>${item.seriesName}: ${formatted}</span>
              </div>`;
              total += item.data;
            }
          }
          html += `<div style="border-top:1px solid ${css.borderColor};margin-top:6px;padding-top:6px;font-weight:600">
            Total: ${this.formatCurrency(total)}
          </div>`;
          return html;
        },
      },
      legend: {
        type: 'scroll',
        bottom: 0,
        textStyle: { color: css.textSecondary, fontFamily: "'Inter', sans-serif", fontSize: 11 },
      },
      grid: { top: 20, right: 16, bottom: 40, left: 48 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          color: css.textTertiary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
        },
        axisLine: { lineStyle: { color: css.borderColor } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: css.textTertiary,
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          formatter: (value: number) => {
            if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
            if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
            return `${value}`;
          },
        },
        splitLine: { lineStyle: { color: css.gridColor } },
      },
      series: datasets.map(dataset => ({
        name: dataset.label,
        type: 'bar',
        stack: 'total',
        data: dataset.data,
        itemStyle: {
          color: dataset.color,
          borderRadius: [0, 0, 0, 0],
        },
        barMaxWidth: 30,
      })),
    };
  }

  /**
   * Build a complete ECharts option for a donut/pie chart.
   */
  buildDonutOption(
    labels: string[],
    data: number[],
    title?: string,
    customColors?: string[],
  ): EChartsOption {
    const css = this.cssVars();
    const colors = this.categoryColors();
    return {
      ...this.buildTheme(css),
      xAxis: { show: false },
      yAxis: { show: false },
      title: title ? { text: title, left: 'center', top: 'center' } : undefined,
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: css.bgTertiary,
        borderColor: css.borderColor,
        borderWidth: 1,
        textStyle: { color: css.textPrimary, fontFamily: "'Inter', sans-serif" },
        extraCssText: 'border-radius: 8px; backdrop-filter: blur(12px);',
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; percent: number; data?: { count?: number } };
          if (!p || !p.name) return '';
          const pct = p.percent.toFixed(1);
          const count = p.data?.count ?? '';
          const countStr = count ? ` · ${count} txns` : '';
          return `<div style="font-weight:600;margin-bottom:4px">${p.name}</div>
            <div>${this.formatCurrency(p.value)} (${pct}%)${countStr}</div>`;
        },
      },
      legend: {
        type: 'scroll',
        orient: 'vertical',
        right: 12,
        top: 'middle',
        bottom: 12,
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 10,
        textStyle: { color: css.textSecondary, fontFamily: "'Inter', sans-serif", fontSize: 11 },
        pageIconColor: css.textPrimary,
        pageTextStyle: { color: css.textSecondary },
      },
      series: [
        {
          type: 'pie',
          radius: ['48%', '72%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: css.bgSecondary,
            borderWidth: 2,
          },
          label: { show: false },
          emphasis: {
            label: { show: true, fontWeight: 'bold' },
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' },
          },
          data: labels.map((label, i) => ({
            name: label,
            value: data[i],
            itemStyle: {
              color: (customColors && customColors[i]) ? customColors[i] : colors[i % colors.length],
            },
          })),
        },
      ],
    };
  }
}
