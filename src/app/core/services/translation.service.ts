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
  'insights.radar.directTracking': 'Seguimiento directo',
  'insights.radar.manageGoal': 'Ver meta',
  'insights.radar.timeElapsed': 'Tiempo transcurrido',
  'insights.radar.pacingProgress': 'Ahorro acumulado',
  'insights.health.fair': 'Estable',
  'insights.health.needs_attention': 'Atención requerida',
  'insights.health.unrated': 'Sin actividad previa',
  'insights.actions.dismiss': 'Descartar',
};

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly STORAGE_KEY = 'flowr_language';
  private readonly TRANSLATIONS_KEY = 'flowr_translations';

  // Lazy-inject HttpClient — only needed for async fetch, not for constructor
  private http = inject(HttpClient, { optional: true });

  private _translations = signal<Record<string, any>>({});
  private _currentLang = signal<Language>(detectBestLanguage());
  private _loaded = signal(false);
  private _isTransitioning = signal(false);

  readonly currentLang = this._currentLang.asReadonly();
  readonly translations = this._translations.asReadonly();
  readonly isLoaded = this._loaded.asReadonly();
  readonly isTransitioning = this._isTransitioning.asReadonly();

  constructor() {
    // Set the `lang` attribute on <html> immediately
    if (typeof document !== 'undefined') {
      document.documentElement.lang = this._currentLang();
    }

    // Try loading from localStorage first (sync, safe, non-blocking)
    const cached = safeGetItem(this.TRANSLATIONS_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          this._translations.set(parsed);
          this._loaded.set(true);
        }
      } catch {
        // Invalid JSON, fall through to async fetch
      }
    }

    // If not cached, fetch async in background
    if (!this._loaded()) {
      this.fetchTranslations();
    }
  }

  /**
   * Initializes translations during APP_INITIALIZER.
   * Guarantees translations are loaded into memory before the app renders.
   */
  async init(): Promise<void> {
    const lang = this._currentLang();
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }

    if (!this._loaded()) {
      await this.fetchTranslations();
    }
  }

  async fetchTranslations(): Promise<void> {
    if (!this.http) return;

    const lang = this._currentLang();
    try {
      const data = await firstValueFrom(
        this.http.get<Record<string, any>>(`/assets/i18n/${lang}.json`)
      );
      if (data && typeof data === 'object') {
        this._translations.set(data);
        this._loaded.set(true);
        safeSetItem(this.TRANSLATIONS_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error(`Failed to load language ${lang}`, error);
      // Fallback: If non-Spanish language failed, fallback to Spanish
      if (lang !== 'es') {
        try {
          const fallback = await firstValueFrom(
            this.http.get<Record<string, any>>('/assets/i18n/es.json')
          );
          if (fallback && typeof fallback === 'object') {
            this._translations.set(fallback);
            this._loaded.set(true);
          }
        } catch {
          // Fallback also failed
        }
      }
    }
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

    const keys = key.split('.');
    let value: any = this._translations();

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }

    let result = typeof value === 'string' ? value : key;

    // Interpolate params: {{ paramName }} — use pre-compiled regex (single pass)
    if (params && typeof result === 'string') {
      result = result.replace(PARAM_REGEX, (match, key: string) => {
        const trimmed = key.trim();
        return trimmed in params ? String(params[trimmed]) : match;
      });
    }

    return result;
  }
}
