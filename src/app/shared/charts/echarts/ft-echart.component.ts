/**
 * FtEChartComponent — Reusable ECharts wrapper component.
 *
 * Provides a unified interface for all chart types with:
 * - `options` input: ECharts configuration object
 * - `loading` input: Show loading skeleton
 * - `height` input: Container height (default: '250px')
 * - `chartReady` output: Emits ECharts instance on init
 * - ng-content slots for loading, empty, and error states
 *
 * Uses OnPush change detection and lazy ECharts initialization.
 * Handles responsive resize via ResizeObserver.
 */

import {
  Component,
  input,
  output,
  signal,
  ViewChild,
  ContentChild,
  ElementRef,
  OnInit,
  OnDestroy,
  OnChanges,
  AfterContentInit,
  AfterViewInit,
  SimpleChanges,
  ChangeDetectionStrategy,
  inject,
  DestroyRef,
  effect,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import type { EChartsOption } from 'echarts';
import type { EChartsType } from 'echarts/core';

import { registerECharts } from './echarts-module';

/** ECharts state machine */
export type EChartState = 'loading' | 'empty' | 'error' | 'ready';

/** Data emitted when a chart data point is clicked */
export interface ChartClickEvent {
  seriesName?: string;
  dataIndex?: number;
  value?: unknown;
  name?: string;      // Category name (for pie/donut/bar)
  hour?: number;      // Hour value (for hourly charts)
  date?: string;      // Date string (for time-based charts)
}

@Component({
  selector: 'ft-echart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ft-echart-container" [style.height]="height()">
      @if (_state() === 'loading') {
        <ng-content select="[loading]" />
        @if (!_hasLoadingContent()) {
          <div class="ft-echart-skeleton">
            <div class="ft-echart-skeleton-bar"></div>
          </div>
        }
      } @else if (_state() === 'empty') {
        <ng-content select="[empty]" />
        @if (!_hasEmptyContent()) {
          <div class="ft-echart-empty">
            <span>No data available</span>
          </div>
        }
      } @else if (_state() === 'error') {
        <ng-content select="[error]" />
        @if (!_hasErrorContent()) {
          <div class="ft-echart-error">
            <span>Error loading chart</span>
            <button class="ft-echart-retry" (click)="retry()" type="button">
              Retry
            </button>
          </div>
        }
      }
      <!-- Always in DOM so ViewChild resolves; hidden until state === 'ready' -->
      <div
        #chartContainer
        class="ft-echart-canvas"
        [class.ft-echart-canvas--hidden]="_state() !== 'ready'"
        [class.ft-echart-canvas--appear]="_animating()"
      ></div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }

    .ft-echart-container {
      position: relative;
      width: 100%;
      overflow: hidden;
      touch-action: pan-y;
    }

    .ft-echart-canvas {
      width: 100%;
      height: 100%;
      touch-action: pan-y;
    }

    .ft-echart-canvas--hidden {
      display: none;
    }

    .ft-echart-canvas--appear {
      animation: ft-echart-appear 350ms cubic-bezier(0.32, 0.72, 0, 1) both;
    }

    @keyframes ft-echart-appear {
      from {
        opacity: 0;
        transform: scale(0.98) translateY(6px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .ft-echart-canvas--appear {
        animation: none;
        opacity: 1;
        transform: none;
      }
    }

    .ft-echart-skeleton {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      animation: ft-echart-pulse 1.5s ease-in-out infinite;
    }

    .ft-echart-skeleton-bar {
      width: 60%;
      height: 8px;
      border-radius: 4px;
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.04) 25%,
        rgba(255, 255, 255, 0.08) 50%,
        rgba(255, 255, 255, 0.04) 75%
      );
      background-size: 200% 100%;
      animation: ft-echart-shimmer 1.5s ease-in-out infinite;
    }

    .ft-echart-empty,
    .ft-echart-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 8px;
      color: var(--text-tertiary, rgba(243, 232, 255, 0.4));
      font-family: 'Inter', sans-serif;
      font-size: 14px;
    }

    .ft-echart-error {
      color: var(--danger, #FF6B6B);
    }

    .ft-echart-retry {
      margin-top: 8px;
      padding: 6px 16px;
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
      border-radius: 8px;
      background: var(--bg-tertiary, #2A1E35);
      color: var(--text-primary, #F3E8FF);
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      cursor: pointer;
      transition: all 200ms cubic-bezier(0.32, 0.72, 0, 1);
    }

    .ft-echart-retry:hover {
      background: var(--bg-secondary, #1D1426);
      border-color: var(--accent-primary, #9D50BB);
    }

    @keyframes ft-echart-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes ft-echart-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FtEChartComponent implements OnInit, OnDestroy, OnChanges, AfterContentInit, AfterViewInit {
  // ─── Inputs ──────────────────────────────────────────────────────────────

  /** ECharts configuration options */
  options = input<EChartsOption | undefined>(undefined);

  /** Force loading state */
  loading = input<boolean>(false);

  /** Container height */
  height = input<string>('250px');

  // ─── Outputs ─────────────────────────────────────────────────────────────

  /** Emits the ECharts instance when initialization completes */
  chartReady = output<EChartsType>();

  /** Emits when an error occurs */
  chartError = output<Error>();

  /** Emits when a chart data point is clicked (for drill-down filtering) */
  chartClick = output<ChartClickEvent>();

  // ─── State ───────────────────────────────────────────────────────────────

  /** Current chart state */
  readonly state = output<EChartState>();
  readonly _state = signal<EChartState>('loading');

  /** Controls the CSS appear animation — toggled independently from _state so
   *  we can re-trigger the animation on data updates without hiding the canvas. */
  readonly _animating = signal(false);

  // ─── Internal ────────────────────────────────────────────────────────────

  @ViewChild('chartContainer') private containerRef!: ElementRef<HTMLDivElement>;

  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  private chartInstance: EChartsType | null = null;
  private resizeObserver: ResizeObserver | null = null;

  /** Detect if user provided custom slot content */
  private hasLoadingContent = false;
  private hasEmptyContent = false;
  private hasErrorContent = false;

  // Query projected content to detect if user provided custom slots
  @ContentChild('[loading]', { read: ElementRef }) private loadingSlot?: ElementRef;
  @ContentChild('[empty]', { read: ElementRef }) private emptySlot?: ElementRef;
  @ContentChild('[error]', { read: ElementRef }) private errorSlot?: ElementRef;

  /** Expose content detection flags for the template */
  readonly _hasLoadingContent = signal(false);
  readonly _hasEmptyContent = signal(false);
  readonly _hasErrorContent = signal(false);

  constructor() {
    // Sync internal state to output (guarded against destroyed view)
    effect(() => {
      const newState = this._state();
      try {
        this.state.emit(newState);
      } catch {
        // Suppress emit on destroyed view
      }
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.loading()) {
      this._state.set('loading');
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.loading()) return;

    this.initChart();
  }

  ngAfterContentInit(): void {
    // Detect projected ng-content slots and update signals
    this._hasLoadingContent.set(!!this.loadingSlot);
    this._hasEmptyContent.set(!!this.emptySlot);
    this._hasErrorContent.set(!!this.errorSlot);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (changes['loading']) {
      if (this.loading()) {
        this._state.set('loading');
        return;
      } else {
        const opts = this.options();
        if (!opts || this.isEmptyOptions(opts)) {
          this._state.set('empty');
          if (this.chartInstance) this.disposeChart();
          return;
        } else if (!this.chartInstance && this.containerRef) {
          this.initChart();
          return;
        }
      }
    }

    if (changes['options']) {
      const opts = this.options();
      if (opts && !this.isEmptyOptions(opts)) {
        if (this.chartInstance) {
          this.updateChart(opts);
        } else if (this.containerRef) {
          // ViewChild is resolved — initialize chart now
          this.initChart();
        }
        // If containerRef is not yet available, ngAfterViewInit will call initChart()
      } else {
        this._state.set('empty');
        if (this.chartInstance) {
          this.disposeChart();
        }
      }
    }
  }

  ngOnDestroy(): void {
    this.disposeChart();
  }

  /** Retry chart initialization after error */
  retry(): void {
    this._state.set('loading');
    this.disposeChart();
    this.initChart();
  }

  /** Get the raw ECharts instance (for external resize calls) */
  getInstance(): EChartsType | null {
    return this.chartInstance;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private initChart(): void {
    this._initChartAsync().catch((error) => {
      // If component was destroyed during async init, suppress the error
      if (error instanceof Error && error.message?.includes('NG0911')) return;
      // eslint-disable-next-line no-console
      console.error('[FtEChartComponent] initChart: CATCH BLOCK - error type:', error?.constructor?.name);
      console.error('[FtEChartComponent] initChart: error message:', (error as Error)?.message || String(error));
      this._state.set('error');
    });
  }

  private async _initChartAsync(): Promise<void> {
    const opts = this.options();

    // Check for empty data before loading the ECharts bundle
    if (!opts || this.isEmptyOptions(opts)) {
      this._state.set('empty');
      return;
    }

    await registerECharts();
    const { init } = await import('echarts/core');

    if (!this.containerRef) {
      this._state.set('error');
      return;
    }

    // Guard: don't init if container was removed during async load
    if (!this.containerRef.nativeElement?.isConnected) return;

    // Initialize chart
    this.chartInstance = init(this.containerRef.nativeElement);

    this.chartInstance.setOption(opts);

    // Bind click event for drill-down filtering
    this.chartInstance.on('click', (params: unknown) => {
      const p = params as Record<string, unknown>;
      const event: ChartClickEvent = {
        seriesName: p['seriesName'] as string | undefined,
        dataIndex: p['dataIndex'] as number | undefined,
        value: p['value'],
        name: p['name'] as string | undefined,
      };

      // Extract hour from x-axis data (for hourly charts)
      const optsRecord = opts as Record<string, unknown>;
      const xAxisData = optsRecord['xAxis'] as Record<string, unknown> | undefined;
      const data = (xAxisData?.['data'] as string[] | undefined);
      if (data && typeof p['dataIndex'] === 'number') {
        const xValue = data[p['dataIndex'] as number];
        if (typeof xValue === 'string') {
          // Check if it looks like an hour label (e.g., "0", "12", "18:00")
          const hourMatch = xValue.match(/^(\d{1,2})(?::\d{2})?$/);
          if (hourMatch) {
            event.hour = parseInt(hourMatch[1], 10);
          } else {
            event.date = xValue;
          }
        }
      }

      this.chartClick.emit(event);
    });

    // Setup resize observer (guarded)
    this.setupResizeObserver();

    this._state.set('ready');
    // Trigger the appear animation on first init
    this.triggerAppear();
  }

  private updateChart(opts: EChartsOption): void {
    if (!this.chartInstance) return;

    if (this.isEmptyOptions(opts)) {
      this._state.set('empty');
      this.disposeChart();
      return;
    }

    // notMerge: true ensures stale series/labels from the previous filter are
    // fully replaced — prevents ghost x-axis labels bleeding through on change.
    this.chartInstance.setOption(opts, { notMerge: true });
    this._state.set('ready');

    // Re-trigger the appear animation without hiding the canvas.
    // Toggling false → true in consecutive frames forces the browser to
    // restart the CSS keyframe from scratch.
    this.triggerAppear();
  }

  /** Toggle _animating signal to replay the --appear CSS keyframe. */
  private triggerAppear(): void {
    this._animating.set(false);
    requestAnimationFrame(() => {
      this._animating.set(true);
    });
  }

  private isEmptyOptions(opts: EChartsOption): boolean {
    const series = (opts as Record<string, unknown>)['series'];
    if (!series) return true;
    if (Array.isArray(series)) {
      return series.length === 0 || series.every((s: Record<string, unknown>) => {
        const data = s['data'] as unknown[] | undefined;
        return !data || data.length === 0;
      });
    }
    return false;
  }

  private setupResizeObserver(): void {
    if (!this.containerRef?.nativeElement || typeof ResizeObserver === 'undefined') return;

    this.resizeObserver = new ResizeObserver(() => {
      // Guard: only resize if chart and container are still alive
      if (this.chartInstance && !this.chartInstance.isDisposed() && this.containerRef?.nativeElement?.isConnected) {
        this.chartInstance.resize();
      }
    });

    this.resizeObserver.observe(this.containerRef.nativeElement);
    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    });
  }

  private disposeChart(): void {
    if (this.chartInstance) {
      this.chartInstance.dispose();
      this.chartInstance = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}
