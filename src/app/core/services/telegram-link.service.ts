import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface LinkStatusResponse {
  linked: boolean;
  telegramId: string | null;
}

interface LinkCodeResponse {
  code: string;
  expiresAt: string;
}

export type TelegramLinkState = 'loading' | 'idle' | 'generating' | 'polling' | 'linked' | 'error';

@Injectable({ providedIn: 'root' })
export class TelegramLinkService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api`;

  readonly state = signal<TelegramLinkState>('loading');
  readonly linkCode = signal<string | null>(null);
  readonly telegramId = signal<string | null>(null);
  readonly countdown = signal<number>(0);
  readonly error = signal<string | null>(null);
  readonly justLinked = signal(false);

  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private linkPollTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.checkLinkStatus();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    this.stopLinkPoll();
  }

  checkLinkStatus(): void {
    this.state.set('loading');
    this.http.get<LinkStatusResponse>(`${this.api}/auth/link-status`).subscribe({
      next: (res) => {
        this.telegramId.set(res.telegramId);
        if (res.linked) {
          this.justLinked.set(true);
          this.state.set('linked');
          // Clear the flash after 3s
          setTimeout(() => this.justLinked.set(false), 3000);
        } else {
          this.state.set('idle');
        }
      },
      error: () => {
        this.error.set('settings.telegram.error_link');
        this.state.set('idle');
      },
    });
  }

  generateCode(autoOpen = true): void {
    if (this.state() === 'linked') return;

    this.state.set('generating');
    this.error.set(null);
    this.linkCode.set(null);
    this.justLinked.set(false);
    this.stopCountdown();
    this.stopLinkPoll();

    this.http.post<LinkCodeResponse>(`${this.api}/auth/link-code`, {}).subscribe({
      next: (res) => {
        this.linkCode.set(res.code);
        const expiresAt = new Date(res.expiresAt).getTime();
        this.startCountdown(expiresAt);
        this.startLinkPoll();
        this.state.set('polling');

        if (autoOpen && res.code) {
          this.openTelegramWithCode(res.code);
        }
      },
      error: () => {
        this.error.set('settings.telegram.error_generate');
        this.state.set('idle');
      },
    });
  }

  private startLinkPoll(): void {
    this.linkPollTimer = setInterval(() => {
      this.http.get<LinkStatusResponse>(`${this.api}/auth/link-status`).subscribe({
        next: (res) => {
          if (res.linked) {
            this.telegramId.set(res.telegramId);
            this.linkCode.set(null);
            this.justLinked.set(true);
            this.state.set('linked');
            this.stopCountdown();
            this.stopLinkPoll();
          }
        },
      });
    }, 3000);
  }

  private stopLinkPoll(): void {
    if (this.linkPollTimer) {
      clearInterval(this.linkPollTimer);
      this.linkPollTimer = null;
    }
  }

  private startCountdown(expiresAt: number): void {
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      this.countdown.set(remaining);
      if (remaining <= 0) {
        this.stopCountdown();
        this.stopLinkPoll();
        this.linkCode.set(null);
        this.state.set('idle');
      }
    };
    tick();
    this.countdownTimer = setInterval(tick, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  openTelegram(): void {
    this.openUrl(environment.telegramBotUrl, false);
  }

  openUrl(url: string, isMobile: boolean): void {
    if (typeof window === 'undefined') return;
    if (isMobile) {
      window.location.href = url;
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  openTelegramWithCode(code: string): void {
    if (!code) return;
    const command = `/link ${code}`;
    const message = encodeURIComponent(command);
    const botUsername = environment.telegramBotUrl.split('/').pop() || 'hormigaTrackerBot';

    // Silent safeguard: ensure command is in clipboard in case Telegram suppresses pre-fill on first start
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(command).catch(() => {});
    }

    const isMobile = typeof navigator !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );

    if (isMobile) {
      // Mobile (iOS, iPadOS, Android):
      // Custom scheme opens Telegram directly into the chat with the prefilled message
      const appUrl = `tg://resolve?domain=${botUsername}&text=${message}`;
      const webUrl = `https://t.me/${botUsername}?text=${message}`;

      const clickedAt = Date.now();
      this.openUrl(appUrl, true);

      // Graceful fallback to web URL if Telegram app is not installed
      setTimeout(() => {
        if (Date.now() - clickedAt < 2000) {
          this.openUrl(webUrl, true);
        }
      }, 1500);
    } else {
      // Desktop (PC, Mac, Linux):
      // Opens t.me web landing in a new tab which prompts to launch Telegram Desktop with pre-filled text
      const desktopUrl = `https://t.me/${botUsername}?text=${message}`;
      this.openUrl(desktopUrl, false);
    }
  }
}
