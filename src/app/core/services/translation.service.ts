import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export type Language = 'es' | 'en' | 'fr';

export const SUPPORTED_LANGUAGES: Language[] = ['es', 'en', 'fr'];
export const DEFAULT_LANG: Language = 'es';

// Pre-compiled regex for {{ paramName }} interpolation — avoids re-compilation on every call
const PARAM_REGEX = /\{\{\s*(\w+)\s*\}\}/g;

/**
 * Safe localStorage wrapper that will never throw in Safari Private Browsing,
 * restricted iframe environments, or when storage quota is exceeded.
 */
export function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Quota, security, or private browsing restriction
  }
  return null;
}

export function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Quota, security, or private browsing restriction
  }
}

/**
 * Resolves the best initial language:
 * 1. Stored user preference (localStorage)
 * 2. Browser languages (navigator.languages / navigator.language) — case-insensitive
 * 3. Fallback: Spanish
 */
export function detectBestLanguage(): Language {
  // 1. Explicit user preference
  const stored = safeGetItem('flowr_language') as Language | null;
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) return stored;

  // 2. Browser preference (inspect navigator.languages first for Safari/iOS)
  try {
    if (typeof navigator !== 'undefined') {
      const navLangs = navigator.languages && navigator.languages.length > 0
        ? navigator.languages
        : [navigator.language || ''];

      for (const raw of navLangs) {
        if (!raw) continue;
        const code = raw.slice(0, 2).toLowerCase() as Language;
        if (SUPPORTED_LANGUAGES.includes(code)) return code;
      }
    }
  } catch {
    // SSR or restricted environment — fall through
  }

  // 3. Default
  return DEFAULT_LANG;
}

const FALLBACK_TRANSLATIONS: Record<string, string> = {
  'auth.createAccount': 'Crear cuenta',
  'auth.signIn': 'Iniciar sesión',
  'theme.toggle': 'Cambiar tema',
  'nav.home': 'Inicio',
  'nav.dashboard': 'Inicio',
  'nav.transactions': 'Transacciones',
  'nav.categories': 'Categorías',
  'nav.pockets': 'Bolsillos',
  'nav.goals': 'Metas',
  'nav.analytics': 'Análisis',
  'nav.insights': 'Insights',
  'nav.settings': 'Configuración',
  'landing.heroBadge': 'Categorización Inteligente',
  'landing.heroTitle': 'Tu dinero, <br />perfectamente organizado',
  'landing.heroSubtitle': 'Rastrea, analiza y optimiza tus gastos con información en tiempo real. Conecta tus cuentas o usa nuestro bot de Telegram para registrar al instante.',
  'landing.getStarted': 'Comenzar',
  'landing.telegramBot': 'Bot de Telegram',
  'landing.tryTelegramBot': 'o prueba nuestro bot de Telegram',
  'landing.trustFree': 'Gratis para siempre',
  'landing.trustNoCard': 'Sin tarjeta de crédito',
  'landing.trustEncrypted': 'Encriptado',
  'landing.cta.button': 'Comienza tu prueba gratis de 30 días',
  'dashboard.greeting_morning': 'Buenos días',
  'dashboard.greeting_afternoon': 'Buenas tardes',
  'dashboard.greeting_evening': 'Buenas noches',
  'dashboard.greetingSubtitle': 'Aquí tienes tu resumen financiero de este mes.',
  'dashboard.newTransaction': 'Nueva Transacción',
  'dashboard.manageCategories': 'Categorías',
  'dashboard.viewAnalytics': 'Ver Analytics',
  'dashboard.mainIndicators': 'Indicadores Principales',
  'dashboard.totalBalance': 'Balance Total',
  'dashboard.monthlyIncome': 'Ingreso Mensual',
  'dashboard.monthlyExpenses': 'Gastos Mensuales',
  'dashboard.savingsRate': 'Tasa de Ahorro',
  'dashboard.savingsRateTooltip': 'Porcentaje de tus ingresos que estás ahorrando este mes',
  'dashboard.positiveBalance': 'Balance positivo',
  'dashboard.noBalance': 'Sin balance',
  'dashboard.positiveFlow': 'Flujo positivo',
  'dashboard.periodOutflows': 'Salidas del período',
  'dashboard.onTrack': 'En camino',
  'dashboard.couldImprove': 'Podría mejorar',
  'dashboard.monthlyOverview': 'Resumen Mensual',
  'dashboard.last6Months': 'Últimos 6 meses',
  'dashboard.noChartData': 'Sin datos de gráfico aún',
  'dashboard.chartError': 'Error al cargar gráfico',
  'dashboard.retry': 'Reintentar',
  'dashboard.errorTitle': 'Algo salió mal',
  'dashboard.errorDesc': 'No pudimos cargar los datos del dashboard. Intenta nuevamente.',
  'dashboard.welcomeBanner': 'Comienza tu viaje financiero',
  'dashboard.welcomeSubtitle': 'Comienza a rastrear tus finanzas agregando tu primera transacción.',
  'dashboard.addTransaction': 'Agregar transacción',
  'transactions.form.income': 'Ingreso',
  'transactions.form.expense': 'Gasto',
  'common.toasts.dashboard_load_failed': 'Error al cargar los datos del dashboard. Intentá de nuevo.',
  'common.toasts.dashboard_load_failed_short': 'Error al cargar los datos del dashboard.',
  'tour.triggerCard.title': '¿Sos nuevo por acá?',
  'tour.triggerCard.description': 'Un tour de 30 segundos por tu centro de control financiero.',
  'tour.triggerCard.start': 'Mostrame',
  'tour.triggerCard.later': 'Ahora no',
  'analytics.consent.message': 'Usamos cookies y herramientas de análisis para entender cómo mejoramos Kipu. Vos decidís.',
  'analytics.consent.learnMore': 'Política de cookies',
  'analytics.consent.accept': 'Aceptar',
  'analytics.consent.decline': 'Rechazar',
  'insights.radar.directTracking': 'Seguimiento directo',
  'insights.radar.manageGoal': 'Ver meta',
  'insights.radar.timeElapsed': 'Tiempo transcurrido',
  'insights.radar.pacingProgress': 'Ahorro acumulado',
  'insights.health.fair': 'Estable',
  'insights.health.needs_attention': 'Atención requerida',
  'insights.health.unrated': 'Sin actividad previa',
  'insights.actions.dismiss': 'Descartar',
  'tour.checklist.title': 'Primeros pasos en Kipu',
  'tour.checklist.subtitle': 'Lo esencial para dominar tus finanzas',
  'tour.checklist.of': 'de',
  'tour.checklist.completed': 'completados',
  'tour.checklist.startTour': 'Ver tutorial interactivo',
  'tour.checklist.tourBtn': 'Tour',
  'tour.checklist.replayBtn': 'Repetir',
  'tour.checklist.allDone': '¡Excelente! Ya configuraste lo más importante de Kipu.',
  'tour.checklist.gotIt': 'Cerrar guía',
  'tour.checklist.hide': 'Ocultar esta guía',
  'tour.checklist.minimize': 'Minimizar guía',
  'tour.checklist.openGuide': 'Abrir guía de primeros pasos',
  'tour.checklist.markPending': 'Marcar como pendiente',
  'tour.checklist.markCompleted': 'Marcar como completado',
  'tour.checklist.transaction.title': 'Registrar tu primer movimiento',
  'tour.checklist.transaction.desc': 'Carga un gasto o ingreso manual para activar tus métricas',
  'tour.checklist.categories.title': 'Personalizar tus categorías',
  'tour.checklist.categories.desc': 'Organiza cómo se clasifican tus gastos e ingresos',
  'tour.checklist.telegram.title': 'Vincular bot de Telegram',
  'tour.checklist.telegram.desc': 'Registra transacciones en segundos desde cualquier chat',
  'tour.checklist.tour.title': 'Completar tour por Kipu',
  'tour.checklist.tour.desc': 'Conoce en detalle el centro de control financiero',
};

const FALLBACK_TRANSLATIONS_BY_LANG: Record<Language, Record<string, string>> = {
  es: FALLBACK_TRANSLATIONS,
  en: {
    'auth.createAccount': 'Create account',
    'auth.signIn': 'Sign in',
    'theme.toggle': 'Toggle theme',
    'nav.home': 'Home',
    'nav.dashboard': 'Dashboard',
    'nav.transactions': 'Transactions',
    'nav.categories': 'Categories',
    'nav.pockets': 'Pockets',
    'nav.goals': 'Goals',
    'nav.analytics': 'Analytics',
    'nav.insights': 'Insights',
    'nav.settings': 'Settings',
    'landing.heroBadge': 'Smart Categorization',
    'landing.heroTitle': 'Your money, <br />perfectly organized',
    'landing.heroSubtitle': 'Track, analyze, and optimize your spending with real-time insights. Connect your accounts or use our Telegram bot for instant logging.',
    'landing.getStarted': 'Get Started',
    'landing.telegramBot': 'Telegram Bot',
    'landing.tryTelegramBot': 'or try our Telegram bot',
    'landing.trustFree': 'Free forever',
    'landing.trustNoCard': 'No credit card',
    'landing.trustEncrypted': 'Encrypted',
    'landing.cta.button': 'Start your 30-day free trial',
    'dashboard.greeting_morning': 'Good morning',
    'dashboard.greeting_afternoon': 'Good afternoon',
    'dashboard.greeting_evening': 'Good evening',
    'dashboard.greetingSubtitle': "Here's your financial overview for this month.",
    'dashboard.newTransaction': 'New Transaction',
    'dashboard.manageCategories': 'Manage Categories',
    'dashboard.viewAnalytics': 'View Analytics',
    'dashboard.mainIndicators': 'Key Indicators',
    'dashboard.totalBalance': 'Total Balance',
    'dashboard.monthlyIncome': 'Monthly Income',
    'dashboard.monthlyExpenses': 'Monthly Expenses',
    'dashboard.savingsRate': 'Savings Rate',
    'dashboard.savingsRateTooltip': "Percentage of your income you're saving this month",
    'dashboard.positiveBalance': 'Positive balance',
    'dashboard.noBalance': 'No balance',
    'dashboard.positiveFlow': 'Positive cashflow',
    'dashboard.periodOutflows': 'Period outflows',
    'dashboard.onTrack': 'On track',
    'dashboard.couldImprove': 'Could improve',
    'dashboard.monthlyOverview': 'Monthly Overview',
    'dashboard.last6Months': 'Last 6 months',
    'dashboard.noChartData': 'No chart data yet',
    'dashboard.chartError': 'Error loading chart',
    'dashboard.retry': 'Retry',
    'dashboard.errorTitle': 'Something went wrong',
    'dashboard.errorDesc': "We couldn't load your dashboard data. Please try again.",
    'dashboard.welcomeBanner': 'Start your financial journey',
    'dashboard.welcomeSubtitle': 'Start tracking your finances by adding your first transaction.',
    'dashboard.addTransaction': 'Add transaction',
    'transactions.form.income': 'Income',
    'transactions.form.expense': 'Expense',
    'common.toasts.dashboard_load_failed': 'Failed to load dashboard data. Please try again.',
    'common.toasts.dashboard_load_failed_short': 'Failed to load dashboard data.',
    'tour.triggerCard.title': 'New around here?',
    'tour.triggerCard.description': 'Take a 30-second tour of your financial command center.',
    'tour.triggerCard.start': 'Show me around',
    'tour.triggerCard.later': 'Not now',
    'analytics.consent.message': "We use cookies and analytics tools to understand how to improve Kipu. It's your call.",
    'analytics.consent.learnMore': 'Cookie Policy',
    'analytics.consent.accept': 'Accept',
    'analytics.consent.decline': 'Decline',
    'tour.checklist.title': 'Getting started with Kipu',
    'tour.checklist.subtitle': 'The essentials to master your finances',
    'tour.checklist.of': 'of',
    'tour.checklist.completed': 'completed',
    'tour.checklist.startTour': 'View interactive tutorial',
    'tour.checklist.tourBtn': 'Tour',
    'tour.checklist.replayBtn': 'Replay',
    'tour.checklist.allDone': 'Awesome! You have configured the essentials of Kipu.',
    'tour.checklist.gotIt': 'Close guide',
    'tour.checklist.hide': 'Hide this guide',
    'tour.checklist.minimize': 'Minimize guide',
    'tour.checklist.openGuide': 'Open getting started guide',
    'tour.checklist.markPending': 'Mark as pending',
    'tour.checklist.markCompleted': 'Mark as completed',
    'tour.checklist.transaction.title': 'Log your first transaction',
    'tour.checklist.transaction.desc': 'Add a manual expense or income to activate your metrics',
    'tour.checklist.categories.title': 'Customize your categories',
    'tour.checklist.categories.desc': 'Organize how your income and expenses are tracked',
    'tour.checklist.telegram.title': 'Connect Telegram bot',
    'tour.checklist.telegram.desc': 'Log transactions in seconds from any chat',
    'tour.checklist.tour.title': 'Take the full Kipu tour',
    'tour.checklist.tour.desc': 'Explore key features across the control center',
  },
  fr: {
    'tour.checklist.title': 'Premiers pas sur Kipu',
    'tour.checklist.subtitle': "L'essentiel pour maîtriser vos finances",
    'tour.checklist.of': 'sur',
    'tour.checklist.completed': 'complétés',
    'tour.checklist.startTour': 'Voir le tutoriel interactif',
    'tour.checklist.tourBtn': 'Tour',
    'tour.checklist.replayBtn': 'Revoir',
    'tour.checklist.allDone': "Super ! Vous avez configuré l'essentiel de Kipu.",
    'tour.checklist.gotIt': 'Fermer le guide',
    'tour.checklist.hide': 'Masquer ce guide',
    'tour.checklist.minimize': 'Réduire le guide',
    'tour.checklist.openGuide': 'Ouvrir le guide de démarrage',
    'tour.checklist.markPending': 'Marquer comme en attente',
    'tour.checklist.markCompleted': 'Marquer comme terminé',
    'tour.checklist.transaction.title': 'Enregistrer votre premier mouvement',
    'tour.checklist.transaction.desc': 'Ajoutez une dépense ou un revenu manuel pour activer vos indicateurs',
    'tour.checklist.categories.title': 'Personnaliser vos catégories',
    'tour.checklist.categories.desc': 'Organisez le suivi de vos revenus et dépenses',
    'tour.checklist.telegram.title': 'Connecter le bot Telegram',
    'tour.checklist.telegram.desc': 'Enregistrez des transactions en quelques secondes depuis un chat',
    'tour.checklist.tour.title': 'Suivre le tour complet de Kipu',
    'tour.checklist.tour.desc': 'Explorez les fonctionnalités clés du centre de contrôle',
  },
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly STORAGE_KEY = 'flowr_language';
  private readonly TRANSLATIONS_KEY = 'flowr_translations';

  // Lazy-inject HttpClient — only needed for async fetch of non-default languages
  private http = inject(HttpClient, { optional: true });

  private _translations = signal<Record<string, any>>({});
  private _currentLang = signal<Language>(detectBestLanguage());
  private _loaded = signal(true);
  private _isTransitioning = signal(false);
  private flatCache = new Map<string, string>();
  private pendingFetch: Promise<void> | null = null;
  private pendingLang: Language | null = null;
  private deferredScheduled = false;

  readonly currentLang = this._currentLang.asReadonly();
  readonly translations = this._translations.asReadonly();
  readonly isLoaded = this._loaded.asReadonly();
  readonly isTransitioning = this._isTransitioning.asReadonly();

  constructor() {
    const lang = this._currentLang();
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }

    this.preloadFallbackCache(lang);

    const cached = safeGetItem(`${this.TRANSLATIONS_KEY}_${lang}`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          this.applyTranslations(parsed);
          return;
        }
      } catch {
        // Invalid JSON, fall through to async fetch
      }
    }

    this.scheduleDeferredFetch();
  }

  private scheduleDeferredFetch(): void {
    if (this.deferredScheduled || typeof window === 'undefined') return;
    const lang = this._currentLang();
    const path = window.location.pathname;
    if ((path !== '/' && path !== '/home') || lang === 'fr') {
      this.deferredScheduled = true;
      void this.fetchTranslations();
      return;
    }

    this.deferredScheduled = true;
    const events: Array<keyof WindowEventMap> = ['scroll', 'pointerdown', 'keydown', 'touchstart'];
    const trigger = () => {
      for (const ev of events) {
        window.removeEventListener(ev, trigger);
      }
      void this.fetchTranslations();
    };
    for (const ev of events) {
      window.addEventListener(ev, trigger, { once: true, passive: true });
    }
  }

  private preloadFallbackCache(lang: Language): void {
    const fallbacks = FALLBACK_TRANSLATIONS_BY_LANG[lang] ?? FALLBACK_TRANSLATIONS;
    for (const [k, v] of Object.entries(FALLBACK_TRANSLATIONS)) {
      this.flatCache.set(k, fallbacks[k] ?? v);
    }
    for (const [k, v] of Object.entries(fallbacks)) {
      this.flatCache.set(k, v);
    }
  }

  private applyTranslations(data: Record<string, any>): void {
    this.flatCache.clear();
    this._translations.set(data);
    this._loaded.set(true);
  }

  /**
   * Initializes translations during APP_INITIALIZER.
   * Uses inline above-the-fold fallbacks synchronously so bootstrap never blocks,
   * while streaming the full translation dictionary in the background.
   */
  async init(): Promise<void> {
    const lang = this._currentLang();
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }

    if (Object.keys(this._translations()).length === 0) {
      this.scheduleDeferredFetch();
    }
    return;
  }

  async fetchTranslations(): Promise<void> {
    const lang = this._currentLang();

    if (!this.http) return;
    if (this.pendingFetch && this.pendingLang === lang) {
      return this.pendingFetch;
    }

    this.pendingLang = lang;
    this.pendingFetch = (async () => {
      try {
        const data = await firstValueFrom(
          this.http!.get<Record<string, any>>(`/assets/i18n/${lang}.json`)
        );
        if (data && typeof data === 'object' && this._currentLang() === lang) {
          this.applyTranslations(data);
          safeSetItem(`${this.TRANSLATIONS_KEY}_${lang}`, JSON.stringify(data));
        }
      } catch (error) {
        console.error(`Failed to load language ${lang}`, error);
        if (this._currentLang() === lang) {
          this.preloadFallbackCache(lang);
          this._loaded.set(true);
        }
      } finally {
        if (this.pendingLang === lang) {
          this.pendingFetch = null;
          this.pendingLang = null;
        }
      }
    })();

    return this.pendingFetch;
  }

  /**
   * Switches the active language with a brief CSS transition.
   * Sets `isTransitioning` → fetches new translations → clears transition.
   * The global `.lang-switching` class drives the visual fade crossfade.
   */
  async setLanguage(lang: Language): Promise<void> {
    if (lang === this._currentLang()) return;

    // Trigger transition state
    this._isTransitioning.set(true);

    this._currentLang.set(lang);
    safeSetItem(this.STORAGE_KEY, lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }

    // Small delay so the CSS transition starts before text swaps
    await new Promise((r) => setTimeout(r, 50));

    await this.fetchTranslations();

    // Release transition — CSS will animate text back in
    await new Promise((r) => setTimeout(r, 30));
    this._isTransitioning.set(false);
  }

  translate(key: string, params?: Record<string, number | string>): string {
    // Null/undefined/empty guard — never crash on invalid keys
    if (!key || typeof key !== 'string') return '';
    if (!this._loaded()) return key;

    // Read signal unconditionally so Angular tracks changes when async i18n JSON arrives
    const translations = this._translations();
    let result = this.flatCache.get(key);
    if (result === undefined) {
      const keys = key.split('.');
      let value: any = translations;

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          value = undefined;
          break;
        }
      }

      const lang = this._currentLang();
      result =
        typeof value === 'string'
          ? value
          : (FALLBACK_TRANSLATIONS_BY_LANG[lang]?.[key] ?? FALLBACK_TRANSLATIONS[key] ?? key);
      this.flatCache.set(key, result);
    }

    // Interpolate params: {{ paramName }} — use pre-compiled regex (single pass)
    if (params && typeof result === 'string') {
      result = result.replace(PARAM_REGEX, (match, paramKey: string) => {
        const trimmed = paramKey.trim();
        return trimmed in params ? String(params[trimmed]) : match;
      });
    }

    return result;
  }
}
