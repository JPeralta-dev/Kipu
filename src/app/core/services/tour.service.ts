/**
 * FtTourService — onboarding and contextual tour engine.
 *
 * Responsibilities
 * ────────────────
 * - Owns tour definitions (onboarding + feature-specific multi-step tours).
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
  DEFAULT_TOUR_STATE,
} from '../../shared/models/tour.types';
import { FtAnalyticsService } from './analytics.service';
import { OnboardingStep } from '../models/analytics-event.model';

const STORAGE_KEY = 'flowr_onboarding_tour';

export const ONBOARDING_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    titleKey: 'tour.steps.welcome.title',
    defaultTitle: '¡Bienvenido a Kipu!',
    descriptionKey: 'tour.steps.welcome.description',
    defaultDescription: 'Tu nuevo centro de control financiero inteligente. Aquí tienes el panorama completo de tu dinero en tiempo real.',
    targetSelector: '.dashboard-header__welcome, .dashboard-header',
    tooltipPosition: 'bottom',
    route: '/home',
  },
  {
    id: 'kpis',
    titleKey: 'tour.steps.kpis.title',
    defaultTitle: 'Tus Indicadores Clave',
    descriptionKey: 'tour.steps.kpis.description',
    defaultDescription: 'En estas tarjetas ves tu balance neto, ingresos del mes, gastos y tu capacidad de ahorro calculada automáticamente.',
    targetSelector: '[data-tour="dashboard-kpis"], .kpi-card--hero, .dashboard-kpis',
    tooltipPosition: 'bottom',
    route: '/home',
  },
  {
    id: 'newTransactionBtn',
    titleKey: 'tour.steps.newTransactionBtn.title',
    defaultTitle: 'Carga rápida de gastos',
    descriptionKey: 'tour.steps.newTransactionBtn.description',
    defaultDescription: 'Haz clic en "Nueva Transacción" para registrar cualquier gasto o ingreso en menos de 10 segundos.',
    targetSelector: '[data-tour="quick-transaction"], a[routerLink="/transactions/new"]',
    tooltipPosition: 'bottom',
    route: '/home',
  },
  {
    id: 'categoriesBtn',
    titleKey: 'tour.steps.categoriesBtn.title',
    defaultTitle: 'Tus Categorías',
    descriptionKey: 'tour.steps.categoriesBtn.description',
    defaultDescription: 'Organiza tus consumos a tu manera: comida, transporte, servicios o suscripciones.',
    targetSelector: '[data-tour="quick-categories"], a[routerLink="/categories"]',
    tooltipPosition: 'bottom',
    route: '/home',
  },
  {
    id: 'telegramNav',
    titleKey: 'tour.steps.telegramNav.title',
    defaultTitle: 'Integración con Telegram',
    descriptionKey: 'tour.steps.telegramNav.description',
    defaultDescription: 'En Configuración puedes vincular nuestro bot de Telegram para registrar gastos chateando sin abrir la app.',
    targetSelector: '.topbar__right, a[routerLink="/settings"]',
    tooltipPosition: 'left',
    route: '/home',
  },
  {
    id: 'done',
    titleKey: 'tour.steps.done.title',
    defaultTitle: '✅ ¡Todo listo para empezar!',
    descriptionKey: 'tour.steps.done.description',
    defaultDescription: 'Ya conoces lo esencial de Kipu. ¡El control total de tus finanzas está en tus manos!',
    targetSelector: 'body',
    tooltipPosition: 'auto',
    highlightPadding: 0,
  },
];

export const NEW_EXPENSE_TOUR_STEPS: TourStep[] = [
  {
    id: 'expense-start',
    titleKey: 'tour.steps.newExpense.step1_cta.title',
    defaultTitle: '1. Iniciar registro',
    descriptionKey: 'tour.steps.newExpense.step1_cta.description',
    defaultDescription: 'Presiona el botón "Nueva Transacción" para abrir la pantalla de carga.',
    targetSelector: '[data-tour="quick-transaction"], a[routerLink="/transactions/new"]',
    tooltipPosition: 'bottom',
    route: '/home',
  },
  {
    id: 'expense-type',
    titleKey: 'tour.steps.newExpense.step2_type.title',
    defaultTitle: '2. Tipo de movimiento',
    descriptionKey: 'tour.steps.newExpense.step2_type.description',
    defaultDescription: 'Elige si es un Gasto (por defecto) o un Ingreso que sumará a tu saldo.',
    targetSelector: '.type-toggle',
    tooltipPosition: 'bottom',
    route: '/transactions/new',
    waitForTimeoutMs: 5000,
  },
  {
    id: 'expense-amount',
    titleKey: 'tour.steps.newExpense.step3_amount.title',
    defaultTitle: '3. Ingresa el monto',
    descriptionKey: 'tour.steps.newExpense.step3_amount.description',
    defaultDescription: 'Escribe la cantidad de dinero. Kipu le dará formato automáticamente.',
    targetSelector: '#amount, .currency-wrap',
    tooltipPosition: 'bottom',
    route: '/transactions/new',
    waitForTimeoutMs: 5000,
  },
  {
    id: 'expense-category',
    titleKey: 'tour.steps.newExpense.step4_category.title',
    defaultTitle: '4. Asigna una categoría',
    descriptionKey: 'tour.steps.newExpense.step4_category.description',
    defaultDescription: 'Selecciona la categoría correspondiente para tener tus reportes ordenados.',
    targetSelector: 'ft-category-select, #category',
    tooltipPosition: 'top',
    route: '/transactions/new',
    waitForTimeoutMs: 5000,
  },
  {
    id: 'expense-save',
    titleKey: 'tour.steps.newExpense.step5_save.title',
    defaultTitle: '5. Guardar transacción',
    descriptionKey: 'tour.steps.newExpense.step5_save.description',
    defaultDescription: 'Presiona "Crear transacción" para guardarla y actualizar tu balance al instante.',
    targetSelector: '.btn-submit',
    tooltipPosition: 'top',
    route: '/transactions/new',
    waitForTimeoutMs: 5000,
  },
];

export const CATEGORIES_TOUR_STEPS: TourStep[] = [
  {
    id: 'cat-nav',
    titleKey: 'tour.steps.categories.step1_nav.title',
    defaultTitle: '1. Ir a Categorías',
    descriptionKey: 'tour.steps.categories.step1_nav.description',
    defaultDescription: 'Haz clic en este acceso rápido para abrir la gestión de categorías.',
    targetSelector: '[data-tour="quick-categories"], a[routerLink="/categories"]',
    tooltipPosition: 'bottom',
    route: '/home',
  },
  {
    id: 'cat-create',
    titleKey: 'tour.steps.categories.step2_create.title',
    defaultTitle: '2. Nueva categoría',
    descriptionKey: 'tour.steps.categories.step2_create.description',
    defaultDescription: 'Presiona este botón para crear una categoría con tu propio ícono, color y tipo.',
    targetSelector: '.btn-new, button.btn-new',
    tooltipPosition: 'bottom',
    route: '/categories',
    waitForTimeoutMs: 5000,
  },
  {
    id: 'cat-stats',
    titleKey: 'tour.steps.categories.step3_summary.title',
    defaultTitle: '3. Métricas de categorías',
    descriptionKey: 'tour.steps.categories.step3_summary.description',
    defaultDescription: 'Aquí verás un resumen de cuántas categorías tienes y cuál tiene mayor gasto.',
    targetSelector: '.stats-row, .page-header',
    tooltipPosition: 'bottom',
    route: '/categories',
    waitForTimeoutMs: 5000,
  },
  {
    id: 'cat-cards',
    titleKey: 'tour.steps.categories.step4_manage.title',
    defaultTitle: '4. Administrar tarjetas',
    descriptionKey: 'tour.steps.categories.step4_manage.description',
    defaultDescription: 'Haz clic sobre cualquier categoría para ver su historial o editar sus propiedades.',
    targetSelector: '.cat-grid, .cat-page',
    tooltipPosition: 'top',
    route: '/categories',
    waitForTimeoutMs: 5000,
  },
];

export const TELEGRAM_TOUR_STEPS: TourStep[] = [
  {
    id: 'tg-nav',
    titleKey: 'tour.steps.telegram.step1_nav.title',
    defaultTitle: '1. Configuración',
    descriptionKey: 'tour.steps.telegram.step1_nav.description',
    defaultDescription: 'Ingresa a Configuración desde tu menú de perfil o navegación.',
    targetSelector: '.topbar__right, a[routerLink="/settings"]',
    tooltipPosition: 'left',
    route: '/home',
  },
  {
    id: 'tg-card',
    titleKey: 'tour.steps.telegram.step2_card.title',
    defaultTitle: '2. Vincular Telegram',
    descriptionKey: 'tour.steps.telegram.step2_card.description',
    defaultDescription: 'Ubica la tarjeta de Telegram en la sección de cuentas conectadas.',
    targetSelector: 'app-linked-channel-card:first-child, .accounts-grid, app-linked-accounts-section',
    tooltipPosition: 'top',
    route: '/settings',
    waitForTimeoutMs: 5000,
  },
  {
    id: 'tg-connect',
    titleKey: 'tour.steps.telegram.step3_connect.title',
    defaultTitle: '3. Conectar bot',
    descriptionKey: 'tour.steps.telegram.step3_connect.description',
    defaultDescription: 'Haz clic en "Vincular Telegram" para generar tu código y empezar a registrar gastos enviando un mensaje como "Café $5".',
    targetSelector: '.btn-telegram-direct, app-linked-channel-card .channel-card__btn, app-linked-channel-card',
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
   * registered contextual multi-step tour.
   */
  start(tourId = 'onboarding'): void {
    this._activeTourId.set(tourId);
    const s = this._state();

    let resumeStep = 0;
    if (tourId === 'onboarding' && s.status === 'in_progress' && s.activeTourId === 'onboarding') {
      resumeStep = Math.max(0, s.currentStep - 1);
    }

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

  /** Start a specific contextual tour directly from step 0 */
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

  /** Reset state — used by the "Replay tour" button in settings or profile. */
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
