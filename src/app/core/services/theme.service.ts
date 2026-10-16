import { Injectable, signal, effect, inject, NgZone } from '@angular/core';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly STORAGE_KEY = 'flowr_theme';
  private readonly defaultTheme: Theme = 'dark';
  private readonly ngZone = inject(NgZone);

  private _currentTheme = signal<Theme>(this.defaultTheme);
  readonly currentTheme = this._currentTheme.asReadonly();

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

  toggleTheme(event?: MouseEvent): void {
    const next: Theme = this._currentTheme() === 'dark' ? 'light' : 'dark';

    // Synchronously update the theme signal and storage
    this._currentTheme.set(next);
    localStorage.setItem(this.STORAGE_KEY, next);

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fallback: If View Transitions API is not supported or reduced motion requested
    if (typeof document === 'undefined' || !('startViewTransition' in document) || prefersReducedMotion) {
      this.applyThemeToDOM(next);
      return;
    }

    // Determine origin coordinates for circular wave expansion
    const x = event?.clientX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
    const y = event?.clientY ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 0);

    const maxX = typeof window !== 'undefined' ? Math.max(x, window.innerWidth - x) : 0;
    const maxY = typeof window !== 'undefined' ? Math.max(y, window.innerHeight - y) : 0;
    const endRadius = Math.hypot(maxX, maxY);

    this.ngZone.runOutsideAngular(() => {
      const transition = (document as any).startViewTransition(() => {
        this.applyThemeToDOM(next);
      });

      transition.ready
        .then(() => {
          try {
            document.documentElement.animate(
              {
                clipPath: [
                  `circle(0px at ${x}px ${y}px)`,
                  `circle(${endRadius}px at ${x}px ${y}px)`
                ]
              },
              {
                duration: 450,
                easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
                pseudoElement: '::view-transition-new(root)'
              }
            );
          } catch {
            // Graceful fallback if pseudoElement animate is not supported
          }
        })
        .catch(() => {
          // Transition was aborted or cancelled
        });
    });
  }

  private loadStoredTheme(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    const theme = stored || this.defaultTheme;
    this._currentTheme.set(theme);
    this.applyThemeToDOM(theme);
  }
}
