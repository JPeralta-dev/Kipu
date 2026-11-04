/**
 * FtTourService — onboarding and contextual tour engine.
 *
 * Responsibilities
 * ────────────────
 * - Owns tour definitions (onboarding + feature-specific mini-tours).
 * - Tracks active tour and step via signals.
 * - Supports async tours across routes and waiting for DOM elements.
 * - Persists state to localStorage so the tour resumes gracefully.
 * - Emits analytics events on every state transition.
 * - Exposes methods for Dashboard and Onboarding Checklist triggers.
 */
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import {
  TourStep,
  TourState,
  TourStatus,
  TourDefinition,
  DEFAULT_TOUR_STATE,
} from '../../shared/models/tour.types';
import { FtAnalyticsService } from './analytics.service';
import { OnboardingStep } from '../models/analytics-event.model';

const STORAGE_KEY = 'flowr_onboarding_tour';

export const ONBOARDING_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    titleKey: 'tour.steps.welcome.title',
    descriptionKey: 'tour.steps.welcome.description',
    targetSelector: '.dashboard-header, #dashboard-main, body',
    tooltipPosition: 'bottom',
    route: '/home',
  },
  {
    id: 'categories',
    titleKey: 'tour.steps.categories.title',
    descriptionKey: 'tour.steps.categories.description',
    targetSelector: '[data-tour="categories"], a[routerLink="/categories"], a[href="/categories"]',
    tooltipPosition: 'right',
    actionKey: 'tour.steps.categories.cta',
    actionRoute: '/categories',
    route: '/home',
  },
  {
    id: 'log-expense',
    titleKey: 'tour.steps.logExpense.title',
    descriptionKey: 'tour.steps.logExpense.description',
    targetSelector: 'a[routerLink="/transactions/new"], .quick-btn--primary',
    tooltipPosition: 'bottom',
    actionKey: 'tour.steps.logExpense.cta',
    actionRoute: '/transactions/new',
    route: '/home',
  },
  {
    id: 'telegram',
    titleKey: 'tour.steps.telegram.title',
    descriptionKey: 'tour.steps.telegram.description',
    targetSelector: '[data-tour="telegram-connect"], a[routerLink="/settings"], .topbar__right',
    tooltipPosition: 'left',
    actionKey: 'tour.steps.telegram.cta',
    actionRoute: '/settings',
    route: '/home',
  },
  {
    id: 'done',
    titleKey: 'tour.steps.done.title',
    descriptionKey: 'tour.steps.done.description',
    targetSelector: 'body',
    tooltipPosition: 'auto',
    highlightPadding: 0,
    actionKey: 'tour.steps.done.cta',
    actionRoute: '/transactions/new',
  },
];

export const NEW_EXPENSE_TOUR_STEPS: TourStep[] = [
  {
    id: 'expense-cta',
    titleKey: 'tour.steps.logExpense.title',
    descriptionKey: 'tour.steps.logExpense.description',
    targetSelector: 'a[routerLink="/transactions/new"], .quick-btn--primary',
    tooltipPosition: 'bottom',
    route: '/home',
  },
  {
    id: 'expense-form',
    titleKey: 'tour.steps.logExpense.title',
    descriptionKey: 'tour.steps.logExpense.description',
    targetSelector: '.transaction-form, form, body',
    tooltipPosition: 'top',
    route: '/transactions/new',
    waitForTimeoutMs: 5000,
  },
];

export const CATEGORIES_TOUR_STEPS: TourStep[] = [
  {
    id: 'categories-nav',
    titleKey: 'tour.steps.categories.title',
    descriptionKey: 'tour.steps.categories.description',
    targetSelector: '[data-tour="categories"], a[routerLink="/categories"]',
    tooltipPosition: 'right',
    route: '/home',
  },
  {
    id: 'categories-view',
    titleKey: 'tour.steps.categories.title',
    descriptionKey: 'tour.steps.categories.description',
    targetSelector: '.categories-header, .categories-container, body',
    tooltipPosition: 'bottom',
    route: '/categories',
    waitForTimeoutMs: 5000,
  },
];

export const TELEGRAM_TOUR_STEPS: TourStep[] = [
  {
    id: 'telegram-dashboard',
    titleKey: 'tour.steps.telegram.title',
    descriptionKey: 'tour.steps.telegram.description',
    targetSelector: '[data-tour="telegram-connect"], a[routerLink="/settings"], .topbar__right',
    tooltipPosition: 'left',
    route: '/home',
  },
  {
    id: 'telegram-settings',
    titleKey: 'tour.steps.telegram.title',
    descriptionKey: 'tour.steps.telegram.description',
    targetSelector: 'ft-linked-accounts-section, [data-tour="telegram-card"], body',
    tooltipPosition: 'top',
    route: '/settings',
    waitForTimeoutMs: 5000,
  },
];

@Injectable({ providedIn: 'root' })
export class FtTourService {
  private readonly analytics = inject(FtAnalyticsService);

  // ── Registered Tours Map ──────────────────────────────────────
  private readonly tourRegistry = new Map<string, TourStep[]>([
    ['onboarding', ONBOARDING_TOUR_STEPS],
    ['new-expense', NEW_EXPENSE_TOUR_STEPS],
    ['categories', CATEGORIES_TOUR_STEPS],
    ['telegram', TELEGRAM_TOUR_STEPS],
  ]);

  // ── Reactive state ─────────────────────────────────────────────
  private readonly _activeTourId = signal<string>('onboarding');
  private readonly _isActive = signal(false);
  private readonly _currentStepIndex = signal(0); // 0-based internal
  private readonly _state = signal<TourState>(this.readPersistedState());
  private readonly _isNavigatingStep = signal(false);

  readonly activeTourId = this._activeTourId.asReadonly();
  readonly isActive = this._isActive.asReadonly();
  readonly isNavigatingStep = this._isNavigatingStep.asReadonly();
  readonly currentStepIndex = this._currentStepIndex.asReadonly();
  readonly tourState = this._state.asReadonly();

  /** Current active tour steps */
  get steps(): readonly TourStep[] {
    return this.tourRegistry.get(this._activeTourId()) ?? ONBOARDING_TOUR_STEPS;
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  readonly currentStep = computed<TourStep | null>(() => {
    if (!this._isActive()) return null;
    return this.steps[this._currentStepIndex()] ?? null;
  });

  /** 1-based step number for display ("Step 3 of 5") */
  readonly currentStepNumber = computed(() => this._currentStepIndex() + 1);

  constructor() {
    effect(() => {
      this.persistState(this._state());
    });
  }

  private readonly POSTPONE_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

  // ── Public API ─────────────────────────────────────────────────

  /** Register or override a tour definition */
  registerTour(id: string, steps: TourStep[]): void {
    this.tourRegistry.set(id, steps);
  }

  /** Has the user completed or skipped the main tour before? */
  hasFinishedTour(): boolean {
    const s = this._state();
    return s.status === 'completed' || s.status === 'skipped';
  }

  /** Should the dashboard show a tour trigger card? (legacy) */
  shouldPromptForTour(): boolean {
    return !this.hasFinishedTour();
  }

  /** Returns true when the trigger card should be visible */
  shouldShowTriggerCard(): boolean {
    const s = this._state();
    if (s.status === 'completed' || s.status === 'skipped') return false;
    if (s.status === 'in_progress') return false;
    if (s.status === 'not_started') {
      if (s.postponedAt) {
        const elapsed = Date.now() - s.postponedAt;
        if (elapsed >= this.POSTPONE_COOLDOWN_MS) return true;
        return false;
      }
      return !this.shouldAutoStart();
    }
    return false;
  }

  /** Auto-start should happen ONLY for brand-new users */
  shouldAutoStart(): boolean {
    const s = this._state();
    return s.status === 'not_started' && s.postponedAt === undefined;
  }

  /** Postpone the tour — shows trigger card again after cooldown */
  postpone(): void {
    const s = this._state();
    this._state.set({
      ...s,
      postponedAt: Date.now(),
      status: 'not_started',
      updatedAt: Date.now(),
    });
  }

  /**
   * Start a tour. Supports starting the main onboarding tour or any
   * registered contextual mini-tour (e.g., 'new-expense', 'categories', 'telegram').
   */
  start(tourId = 'onboarding'): void {
    this._activeTourId.set(tourId);
    const s = this._state();

    let resumeStep = 0;
    if (tourId === 'onboarding' && s.status === 'in_progress' && s.activeTourId === 'onboarding') {
      resumeStep = Math.max(0, s.currentStep - 1);
    }

    // Clamp resumeStep within current tour steps length
    const maxIdx = Math.max(0, this.steps.length - 1);
    const targetStep = Math.min(resumeStep, maxIdx);

    this._currentStepIndex.set(targetStep);
    this._isActive.set(true);

    this.updateStatus('in_progress', { activeTourId: tourId });
    this.analytics.trackEvent('onboarding_tour_started', {
      step: this.currentStepNumber() as OnboardingStep,
      step_id: this.steps[targetStep]?.id,
    });
  }

  /** Start a specific contextual tour directly */
  startTour(tourId: string, stepIndex = 0): void {
    this._activeTourId.set(tourId);
    this._currentStepIndex.set(Math.max(0, stepIndex));
    this._isActive.set(true);
    this.updateStatus('in_progress', { activeTourId: tourId });
  }

  setNavigating(isNavigating: boolean): void {
    this._isNavigatingStep.set(isNavigating);
  }

  syncStepIndex(index: number): void {
    this._currentStepIndex.set(index);
    this.updateStatus('in_progress');
    this.analytics.trackEvent('onboarding_tour_step_viewed', {
      step: (index + 1) as OnboardingStep,
      step_id: this.steps[index]?.id,
    });
  }

  stop(): void {
    this._isActive.set(false);
  }

  next(): void {
    const i = this._currentStepIndex();
    if (i >= this.steps.length - 1) {
      this.complete();
      return;
    }
    const nextIdx = i + 1;
    this._currentStepIndex.set(nextIdx);
    this.updateStatus('in_progress');
    this.analytics.trackEvent('onboarding_tour_step_viewed', {
      step: (nextIdx + 1) as OnboardingStep,
      step_id: this.steps[nextIdx]?.id,
    });
  }

  previous(): void {
    const i = this._currentStepIndex();
    if (i <= 0) return;
    const prevIdx = i - 1;
    this._currentStepIndex.set(prevIdx);
    this.analytics.trackEvent('onboarding_tour_step_viewed', {
      step: (prevIdx + 1) as OnboardingStep,
      step_id: this.steps[prevIdx]?.id,
    });
  }

  skip(): void {
    this.updateStatus('skipped');
    this.analytics.trackEvent('onboarding_tour_skipped', {
      step: this.currentStepNumber() as OnboardingStep,
      step_id: this.currentStep()?.id,
    });
    this._isActive.set(false);
  }

  complete(): void {
    this.updateStatus('completed', { completedAt: new Date().toISOString() });
    this.analytics.trackEvent('onboarding_tour_completed', {
      step: this.currentStepNumber() as OnboardingStep,
      step_id: this.currentStep()?.id,
    });
    this._isActive.set(false);
  }

  /** Reset state — used by the "Replay tour" button in settings. */
  resetTour(): void {
    this._state.set({ ...DEFAULT_TOUR_STATE, updatedAt: Date.now(), postponedAt: undefined });
    this._currentStepIndex.set(0);
    this._activeTourId.set('onboarding');
    this._isActive.set(false);
  }

  // ── Persistence ────────────────────────────────────────────────

  private updateStatus(status: TourStatus, extra: Partial<TourState> = {}): void {
    this._state.set({
      ...this._state(),
      ...extra,
      status,
      currentStep: this._currentStepIndex() + 1,
      activeTourId: this._activeTourId(),
      updatedAt: Date.now(),
    });
  }

  private readPersistedState(): TourState {
    if (typeof localStorage === 'undefined') return { ...DEFAULT_TOUR_STATE, updatedAt: Date.now() };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_TOUR_STATE, updatedAt: Date.now() };
      const parsed = JSON.parse(raw) as TourState;
      return { ...DEFAULT_TOUR_STATE, ...parsed };
    } catch {
      return { ...DEFAULT_TOUR_STATE, updatedAt: Date.now() };
    }
  }

  private persistState(state: TourState): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* quota — fine, fresh state next time */ }
  }
}
