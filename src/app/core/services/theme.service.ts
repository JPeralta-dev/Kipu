import { Injectable, signal, effect, inject } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'flowr_theme';
  private readonly defaultTheme: Theme = 'dark';

  private _currentTheme = signal<Theme>(this.defaultTheme);
  readonly currentTheme = this._currentTheme.asReadonly();

  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadStoredTheme();

    effect(() => {
      const theme = this._currentTheme();
      this.applyThemeToDOM(theme);
    });
  }

  setTheme(theme: Theme): void {
    this._currentTheme.set(theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
    this.applyThemeToDOM(theme);
  }

  private applyThemeToDOM(theme: Theme): void {
    if (typeof document === 'undefined') return;

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);

    if (theme === 'light') {
      document.body?.classList.add('theme-light');
    } else {
      document.body?.classList.remove('theme-light');
    }
  }

  toggleTheme(_event?: MouseEvent): void {
    const next: Theme = this._currentTheme() === 'dark' ? 'light' : 'dark';

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Instant switch if user prefers reduced motion or SSR
    if (prefersReducedMotion || typeof document === 'undefined') {
      this.setTheme(next);
      return;
    }

    const docEl = document.documentElement;

    // Clear any previous ongoing transition timer if user clicks rapidly
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }

    // 1. Arm all DOM elements with the smooth transition rules
    docEl.classList.add('theme-transitioning');

    // 2. Force layout recalculation so the browser registers the transition rules
    // before the new theme variables and classes are applied
    void docEl.offsetHeight;

    // 3. Apply the new theme synchronously
    this.setTheme(next);

    // 4. Clean up the transition class after the transition finishes (420ms)
    this.transitionTimer = setTimeout(() => {
      docEl.classList.remove('theme-transitioning');
      this.transitionTimer = null;
    }, 420);
  }

  private loadStoredTheme(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    const theme = stored || this.defaultTheme;
    this._currentTheme.set(theme);
    this.applyThemeToDOM(theme);
  }
}
