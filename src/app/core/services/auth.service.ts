import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, tap, catchError, of, switchMap, delay } from "rxjs";
import { toObservable } from "@angular/core/rxjs-interop";

import { environment } from "../../../environments/environment";
import { User, SubscriptionTier, SubscriptionStatus } from "../models/user.model";

@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly base = `${environment.apiUrl}/api/auth`;

  // Signal privado como fuente de verdad
  private readonly _userSignal = signal<User | null>(null);

  // Señal de inicialización: true cuando terminó checkSession() o se marcó como lista
  readonly authReady = signal(false);

  private _initStarted = false;

  // Observable que emite cuando authReady pasa a true
  readonly authReady$ = toObservable(this.authReady);

  // Signal público computed para isAuthenticated
  readonly isAuthenticated = computed(() => this._userSignal() !== null);

  // Signal público para el usuario actual
  readonly currentUser = this._userSignal.asReadonly();

  // Observable para backward compatibility
  readonly user$: Observable<User | null> = toObservable(this._userSignal);

  // ── Subscription signals ──────────────────────────────────────────

  readonly currentSubscription = computed(() => this._userSignal()?.subscription ?? null);
  readonly subscriptionTier = computed<SubscriptionTier>(() => this.currentSubscription()?.tier ?? 'free');
  readonly isPremium = computed(() => this.subscriptionTier() !== 'free');
  readonly isTrialActive = computed(() => this.currentSubscription()?.status === 'active_trial');

  /** Check if a required tier is allowed for the current user */
  isTierAllowed(requiredTier: SubscriptionTier): boolean {
    const tierOrder: SubscriptionTier[] = ['free', 'premium', 'premium_plus'];
    const currentIdx = tierOrder.indexOf(this.subscriptionTier());
    const requiredIdx = tierOrder.indexOf(requiredTier);
    return currentIdx >= requiredIdx;
  }

  constructor() {
    // No automatic session check — triggered by route guards on demand
  }

  /**
   * Trigger session check for protected routes.
   * Idempotent: only runs once per app lifecycle.
   * Sets authReady = false before checking, then true when complete.
   */
  initAuthCheck(): void {
    if (this._initStarted) return;
    this._initStarted = true;
    this.authReady.set(false);
    this.checkSession();
  }

  /**
   * Mark auth as ready immediately without HTTP call.
   * Used by public route guards so they don't block navigation.
   */
  markAuthReady(): void {
    this.authReady.set(true);
  }

  /**
   * Check if there's an active Better Auth session via cookie.
   * Called by initAuthCheck() when navigating to protected routes.
   * Uses RxJS delay + retry(1) instead of nested setTimeout to prevent timer leaks.
   */
  private checkSession(): void {
    this.http
      .get<{
        user: { id: string; email: string; name?: string; image?: string; createdAt?: string; subscription?: {
          tier: string; trialStart?: string; trialEnd?: string; premiumStart?: string; premiumEnd?: string; status?: string;
        }};
        session: { id: string; expiresAt: string };
      }>(`${this.base}/get-session?t=${Date.now()}`, { withCredentials: true })
      .pipe(
        catchError((err) => {
          // If first attempt fails, retry once after 500ms delay
          return of(null).pipe(
            delay(500),
            switchMap(() =>
              this.http.get<{
                user: { id: string; email: string; name?: string; image?: string; createdAt?: string; subscription?: {
                  tier: string; trialStart?: string; trialEnd?: string; premiumStart?: string; premiumEnd?: string; status?: string;
                }};
                session: { id: string; expiresAt: string };
              }>(`${this.base}/get-session?t=${Date.now()}`, { withCredentials: true })
                .pipe(catchError(() => of(null)))
            ),
          );
        }),
      )
      .subscribe({
        next: (response) => {
          if (response?.user) {
            this._userSignal.set(this.mapUserFromSession(response.user));
          } else {
            this._userSignal.set(null);
          }
          this.authReady.set(true);
        },
        error: () => {
          this._userSignal.set(null);
          this.authReady.set(true);
        },
      });
  }

  /** Map session user response to User interface (handles optional subscription) */
  private mapUserFromSession(raw: {
    id: string; email: string; name?: string; image?: string; createdAt?: string;
    subscription?: { tier: string; trialStart?: string; trialEnd?: string; premiumStart?: string; premiumEnd?: string; status?: string };
  }): User {
    return {
      id: raw.id,
      email: raw.email,
      displayName: raw.name,
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
      subscription: raw.subscription ? {
        tier: raw.subscription.tier as SubscriptionTier,
        trialStart: raw.subscription.trialStart ?? null,
        trialEnd: raw.subscription.trialEnd ?? null,
        premiumStart: raw.subscription.premiumStart ?? null,
        premiumEnd: raw.subscription.premiumEnd ?? null,
        status: (raw.subscription.status ?? 'no_trial') as SubscriptionStatus,
      } : undefined,
    };
  }

  login(
    email: string,
    password: string,
  ): Observable<User> {
    return this.http
      .post<{
        user: { id: string; email: string; name?: string; createdAt?: string };
        session: { id: string; expiresAt: string };
      }>(`${this.base}/sign-in/email`, { email, password }, { withCredentials: true })
      .pipe(
        tap((res) => {
          this._userSignal.set({
            id: res.user.id,
            email: res.user.email,
            displayName: res.user.name,
            createdAt: res.user.createdAt ? new Date(res.user.createdAt).toISOString() : new Date().toISOString(),
          });
        }),
        switchMap((res) => of({
          id: res.user.id,
          email: res.user.email,
          displayName: res.user.name,
            createdAt: res.user.createdAt ? new Date(res.user.createdAt).toISOString() : new Date().toISOString(),
        })),
      );
  }

  register(
    email: string,
    password: string,
    displayName?: string,
    consent?: { terms: boolean; privacy: boolean },
  ): Observable<User> {
    return this.http
      .post<{
        user: { id: string; email: string; name?: string; createdAt?: string };
        session: { id: string; expiresAt: string };
      }>(`${this.base}/sign-up/email`, {
        email,
        password,
        name: displayName,
        consentTermsAt: consent?.terms ? new Date().toISOString() : undefined,
        consentPrivacyAt: consent?.privacy ? new Date().toISOString() : undefined,
      }, { withCredentials: true })
      .pipe(
        tap((res) => {
          this._userSignal.set({
            id: res.user.id,
            email: res.user.email,
            displayName: res.user.name,
            createdAt: res.user.createdAt ? new Date(res.user.createdAt).toISOString() : new Date().toISOString(),
          });
        }),
        switchMap((res) => of({
          id: res.user.id,
          email: res.user.email,
          displayName: res.user.name,
            createdAt: res.user.createdAt ? new Date(res.user.createdAt).toISOString() : new Date().toISOString(),
        })),
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.base}/sign-out`, {}, { withCredentials: true })
      .pipe(
        tap({
          next: () => {
            this._userSignal.set(null);
            this.router.navigate(["/login"]);
          },
          error: () => {
            // Even if server logout fails, clear local state
            this._userSignal.set(null);
            this.router.navigate(["/login"]);
          },
        }),
      );
  }

  /**
   * Redirect to Google OAuth sign-in.
   *
   * When `scopes` is provided, they are forwarded to Better Auth's
   * `sign-in/social` endpoint so the OAuth consent screen can request
   * extra permissions (e.g. `gmail.readonly` + `gmail.modify` for the
   * "Connect Gmail" linked-accounts flow).
   *
   * Backward compatible: calling without scopes behaves exactly as before.
   */
  signInWithGoogle(scopes?: string[]): void {
    const callbackURL = `${window.location.origin}/dashboard`;

    const body: { provider: 'google'; callbackURL: string; scopes?: string[] } = {
      provider: 'google',
      callbackURL,
    };

    if (scopes && scopes.length > 0) {
      body.scopes = scopes;
    }

    this.http
      .post<{ url: string; redirect: boolean }>(
        `${this.base}/sign-in/social`,
        body,
        { withCredentials: true },
      )
      .subscribe({
        next: (response) => {
          if (response.url) {
            window.location.href = response.url;
          }
        },
        error: (err) => {
          console.error('Google sign-in failed', err);
        },
      });
  }

  clearSession(): void {
    this._userSignal.set(null);
  }

  /** Alias for clearTokens — backward compatibility */
  clearTokens(): void {
    this.clearSession();
  }

  /**
   * Fetch user profile from Better Auth session.
   * Backward-compatible with old API — now uses session state.
   */
  getProfile(): Observable<User> {
    return new Observable<User>((observer) => {
      const current = this._userSignal();
      if (current) {
        observer.next(current);
        observer.complete();
      } else {
        // If no local state, try to refresh from session
        this.http
          .get<{
            user: { id: string; email: string; name?: string; image?: string; createdAt?: string; subscription?: {
              tier: string; trialStart?: string; trialEnd?: string; premiumStart?: string; premiumEnd?: string; status?: string;
            }};
            session: { id: string; expiresAt: string };
          }>(`${this.base}/get-session`, { withCredentials: true })
          .pipe(
            catchError(() => of(null)),
          )
          .subscribe({
            next: (response) => {
              if (response?.user) {
                const user = this.mapUserFromSession(response.user);
                this._userSignal.set(user);
                observer.next(user);
              } else {
                observer.error(new Error("No active session"));
              }
              observer.complete();
            },
          });
      }
    });
  }

  updateProfile(displayName: string): Observable<User> {
    // Better Auth doesn't have a direct profile update endpoint yet
    // This would need a custom endpoint or use the Better Auth API
    const current = this._userSignal();
    if (!current) {
      throw new Error("No user logged in");
    }
    const updated = { ...current, displayName };
    this._userSignal.set(updated);
    return new Observable<User>((observer) => {
      observer.next(updated);
      observer.complete();
    });
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/forget-password`, { email });
  }
}
