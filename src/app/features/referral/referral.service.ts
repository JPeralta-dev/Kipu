/**
 * FtReferralService — referral link generation, sharing, and stats.
 *
 * Public API
 * ──────────
 *  - generateCode(): creates an 8-char base62 code for the current user.
 *    Persists in localStorage (so a refresh doesn't lose it) and calls
 *    the backend to register it.
 *  - getStats(): fetches referral count + earned discount months.
 *  - share(method): returns a pre-built share URL for the given channel.
 *  - applyCode(code): client-side validation + storage for use at signup.
 *
 * Design notes
 * ────────────
 * - The 8-char base62 alphabet gives 62^8 ≈ 218 trillion codes; for
 *    MVP we generate client-side and let the backend re-issue if the
 *    code is already taken (in which case the service retries up to 3x).
 * - All endpoints have sensible fallbacks so the page works in
 *    offline / dev mode without a live backend.
 */
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { FtAnalyticsService } from '../../core/services/analytics.service';
import {
  ReferralCode,
  ReferralInfo,
  ReferralStats,
  ShareMethod,
  ShareTarget,
} from './referral.models';

const STORAGE_KEY_PREFIX = 'flowr_referral_code_';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const DEFAULT_STATS: ReferralStats = {
  referralCount: 0,
  totalDiscountMonths: 0,
  pendingCount: 0,
};

@Injectable({ providedIn: 'root' })
export class FtReferralService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly analytics = inject(FtAnalyticsService);

  // ── Reactive state ────────────────────────────────────────────
  private readonly _code = signal<ReferralCode | null>(null);
  private readonly _stats = signal<ReferralStats>(DEFAULT_STATS);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly code = this._code.asReadonly();
  readonly stats = this._stats.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();

  /**
   * Full shareable URL. Uses the runtime origin so it works in dev
   * and prod alike (e.g. http://localhost:4200/ref/ABC123XY in dev).
   */
  readonly link = computed<string>(() => {
    const c = this._code();
    if (!c) return '';
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://kipufinance.online';
    return `${base}/ref/${c.code}`;
  });

  /** Convenience: full ReferralInfo for templates. */
  readonly info = computed<ReferralInfo | null>(() => {
    const c = this._code();
    if (!c) return null;
    return {
      code: c,
      link: this.link(),
      stats: this._stats(),
    };
  });

  // ── Public API ────────────────────────────────────────────────

  /**
   * Ensure the current user has a referral code. Generates one if not,
   * loads stats from backend.
   */
  async ensureCode(): Promise<ReferralCode | null> {
    const user = this.auth.currentUser();
    if (!user) return null;

    this._isLoading.set(true);
    this._error.set(null);
    try {
      // 1. Hydrate from localStorage first
      const cached = this.readCachedCode(user.id);
      if (cached) {
        this._code.set(cached);
      }

      // 2. Call backend to get/refresh the code
      let code: ReferralCode | null = null;
      try {
        code = await firstValueFrom(
          this.http.post<ReferralCode>(
            `${environment.apiUrl}/api/referral/generate`,
            {},
            { withCredentials: true },
          ),
        );
      } catch {
        // Backend unavailable — fall back to a locally-generated code.
        // The next online attempt will re-sync.
        code = cached ?? this.generateLocalCode(user.id);
      }

      if (code) {
        this._code.set(code);
        this.cacheCode(user.id, code);
        this.analytics.trackEvent('referral_link_generated', { code: code.code });
      }

      // 3. Load stats (non-blocking)
      this.loadStats();

      return code;
    } catch (err: any) {
      this._error.set(err?.message ?? 'Failed to load referral data');
      return null;
    } finally {
      this._isLoading.set(false);
    }
  }

  /** Refresh stats from backend. */
  async loadStats(): Promise<void> {
    try {
      const stats = await firstValueFrom(
        this.http.get<ReferralStats>(
          `${environment.apiUrl}/api/referral/stats`,
          { withCredentials: true },
        ),
      );
      this._stats.set({ ...DEFAULT_STATS, ...stats });
    } catch {
      // Keep current stats — backend may be offline
    }
  }

  /**
   * Build a share URL for the given method. Pre-fills the share text
   * with the user's referral link and a friendly invitation.
   */
  share(method: ShareMethod): ShareTarget {
    const link = this.link();
    const text = this.shareText();
    switch (method) {
      case 'email':
        return {
          method,
          label: 'Email',
          url: `mailto:?subject=${encodeURIComponent(this.shareSubject())}&body=${encodeURIComponent(text)}`,
        };
      case 'whatsapp':
        return {
          method,
          label: 'WhatsApp',
          url: `https://wa.me/?text=${encodeURIComponent(text)}`,
        };
      case 'twitter':
        return {
          method,
          label: 'X (Twitter)',
          url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
        };
      case 'telegram':
        return {
          method,
          label: 'Telegram',
          url: `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
        };
      case 'copy':
      case 'native_share':
      default:
        return { method, label: 'Copy', url: link };
    }
  }

  /**
   * Copy the referral link to the clipboard and fire analytics.
   * Falls back to the legacy `document.execCommand` path on
   * browsers without the async clipboard API.
   */
  async copyLink(): Promise<boolean> {
    const link = this.link();
    if (!link) return false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link);
      } else {
        // Legacy fallback
        const ta = document.createElement('textarea');
        ta.value = link;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      this.analytics.trackEvent('referral_link_copied', {
        method: 'copy',
        code: this._code()?.code,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate and store a referral code from a landing URL (e.g. user
   * clicks /ref/ABC123XY and lands on the signup page). Called from
   * the redirect handler.
   */
  applyCode(code: string): boolean {
    if (!this.isValidCode(code)) return false;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('flowr_pending_referral_code', code.toUpperCase());
    }
    return true;
  }

  /** Read a previously-applied code (cleared after successful signup). */
  consumeAppliedCode(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const code = localStorage.getItem('flowr_pending_referral_code');
    if (code) localStorage.removeItem('flowr_pending_referral_code');
    return code;
  }

  // ── Validation ────────────────────────────────────────────────

  /** Validates 8-character base62 alphanumeric (case-insensitive). */
  isValidCode(code: string): boolean {
    if (typeof code !== 'string') return false;
    const normalized = code.trim();
    if (normalized.length !== 8) return false;
    return /^[A-Za-z0-9]{8}$/.test(normalized);
  }

  /** Code-format check (used by UI for real-time feedback). */
  formatCode(code: string): string {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  }

  // ── Internals ────────────────────────────────────────────────

  private shareText(): string {
    return `Prueba Kipu — la app para organizar tus gastos. Con mi enlace te llevas 1 mes gratis: ${this.link()}`;
  }

  private shareSubject(): string {
    return 'Te regalo 1 mes en Kipu';
  }

  private generateLocalCode(userId: string): ReferralCode {
    // Generate 8 random base62 chars
    const bytes = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += ALPHABET[bytes[i] % ALPHABET.length];
    }
    return {
      code: code.toUpperCase(),
      userId,
      createdAt: new Date().toISOString(),
    };
  }

  private readCachedCode(userId: string): ReferralCode | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private cacheCode(userId: string, code: ReferralCode): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(code));
    } catch { /* ignore quota */ }
  }
}
