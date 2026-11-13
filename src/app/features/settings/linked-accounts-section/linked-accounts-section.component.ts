import {
  Component, inject, input, signal, computed, ChangeDetectionStrategy, OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FtSubtleRevealDirective } from '../../../shared/directives/ft-subtle-reveal.directive';
import { TelegramLinkService } from '../../../core/services/telegram-link.service';
import { AuthService } from '../../../core/services/auth.service';
import { GmailLinkService } from '../../../core/services/gmail-link.service';
import { TranslationService } from '../../../core/services/translation.service';
import {
  LinkedChannelCardComponent,
  LinkedChannelState,
  LinkedChannelRecentItem,
} from './linked-channel-card/linked-channel-card.component';

const FIRST_GMAIL_CONNECT_FLAG = 'ft.gmail.firstConnected';

@Component({
  selector: 'app-linked-accounts-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NgIcon,
    TranslatePipe,
    FtSubtleRevealDirective,
    LinkedChannelCardComponent,
  ],
  templateUrl: './linked-accounts-section.component.html',
  styleUrl: './linked-accounts-section.component.scss',
})
export class LinkedAccountsSectionComponent implements OnInit {
  readonly svc = inject(TelegramLinkService);
  private readonly auth = inject(AuthService);
  protected readonly gmail = inject(GmailLinkService);
  protected readonly translationService = inject(TranslationService);

  delay = input<number>(0);

  // ── State signals ───────────────────────────────────────────────
  /** Gmail pre-OAuth state — 'connecting' shows the spinner button. */
  readonly gmailConnecting = signal(false);

  /** Derived state for the Gmail card. */
  readonly gmailState = computed<LinkedChannelState>(() => {
    if (this.gmailConnecting()) return 'connecting';
    return this.gmail.state() === 'connected' ? 'connected' : 'disconnected';
  });

  /** Telegram card state — reuses the existing service signals. */
  readonly telegramState = computed<LinkedChannelState>(() => {
    if (this.svc.state() === 'loading') return 'connecting';
    return this.svc.state() === 'linked' ? 'connected' : 'disconnected';
  });

  /** Whether the connected state was reached for the FIRST time. */
  readonly telegramFirstConnect = computed(() => this.svc.justLinked());
  readonly gmailFirstConnectVisible = computed(
    () => this.gmail.isFirstConnect() && this.gmail.state() === 'connected',
  );

  // ── Gmail connect (Better Auth OAuth with extended scopes) ────
  private readonly GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
  ];

  // ── Telegram helpers ──────────────────────────────────────────
  get countdownMinutes(): number {
    return Math.floor(this.svc.countdown() / 60);
  }
  get countdownSeconds(): number {
    return this.svc.countdown() % 60;
  }

  ngOnInit(): void {
    this.plantFirstConnectFlagIfMissing();
  }

  private plantFirstConnectFlagIfMissing(): void {
    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage.getItem(FIRST_GMAIL_CONNECT_FLAG) === null) {
        window.localStorage.setItem(FIRST_GMAIL_CONNECT_FLAG, 'pending');
      }
    } catch {
      /* localStorage may be blocked */
    }
  }

  // ── Gmail actions ─────────────────────────────────────────────
  /** Two-step confirmation guard for Gmail disconnect. */
  readonly gmailDisconnectConfirm = signal(false);
  /** Two-step confirmation guard for Telegram disconnect. */
  readonly telegramDisconnectConfirm = signal(false);

  connectGmail(): void {
    if (this.gmailConnecting() || this.gmail.state() === 'connected') return;
    this.gmailConnecting.set(true);
    this.auth.signInWithGoogle(this.GMAIL_SCOPES);
  }

  onGmailSync(): void {
    this.gmail.syncNow();
  }

  onGmailDisconnect(): void {
    this.gmailDisconnectConfirm.set(true);
  }

  confirmGmailDisconnect(): void {
    this.gmail.markDisconnected();
    this.gmailDisconnectConfirm.set(false);
  }

  cancelGmailDisconnect(): void {
    this.gmailDisconnectConfirm.set(false);
  }

  // ── Telegram actions ──────────────────────────────────────────
  readonly codeCopied = signal(false);
  readonly commandCopied = signal(false);

  copyCode(code: string): void {
    if (!code || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(code).then(() => {
      this.codeCopied.set(true);
      setTimeout(() => this.codeCopied.set(false), 2500);
    }).catch(() => {});
  }

  copyCommand(code: string): void {
    if (!code || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(`/link ${code}`).then(() => {
      this.commandCopied.set(true);
      setTimeout(() => this.commandCopied.set(false), 2500);
    }).catch(() => {});
  }

  openTelegramFlow(code: string): void {
    this.copyCommand(code);
    this.svc.openTelegramWithCode(code);
  }

  onTelegramDisconnect(): void {
    this.telegramDisconnectConfirm.set(true);
  }

  confirmTelegramDisconnect(): void {
    if (typeof this.svc.unlink === 'function') {
      this.svc.unlink();
    } else if (typeof this.svc.markDisconnected === 'function') {
      this.svc.markDisconnected();
    }
    this.telegramDisconnectConfirm.set(false);
  }

  cancelTelegramDisconnect(): void {
    this.telegramDisconnectConfirm.set(false);
  }

  onTelegramConnect(): void {
    if (this.svc.state() === 'generating') return;
    this.svc.generateCode();
  }

  // ── Recent imports mapping (Gmail → card) ─────────────────────
  readonly gmailRecent = computed<LinkedChannelRecentItem[]>(() => {
    return this.gmail.lastTransactions().slice(0, 3).map((tx) => ({
      id: tx.id,
      iconKey: 'bank' as const,
      primary: tx.bankName,
      secondary: this.formatRelativeDate(tx.receivedAt),
      amount: this.formatAmount(tx.amount, tx.currency),
    }));
  });

  readonly gmailConnectedStatus = computed(() => {
    const email = this.gmail.email()?.trim();
    // Never expose raw numeric OAuth accountId (e.g. 105102440865768224116); only display valid email addresses
    if (!email || !email.includes('@')) return 'settings.gmail.no_email';
    return this.translateInterpolate('settings.gmail.connected_status', { email });
  });

  readonly gmailLastSync = computed(() => {
    const when = this.gmail.lastSyncAt();
    if (!when) return '';
    const formatted = this.formatRelativeDate(when);
    return this.translateInterpolate('settings.gmail.last_sync', { when: formatted });
  });

  readonly telegramConnectedStatus = computed(() => {
    const id = this.svc.telegramId()?.trim();
    // Never expose raw numeric Telegram chat/user IDs; only display non-numeric @handles
    if (!id || /^\d+$/.test(id)) return 'settings.telegram.already_linked';
    return this.translateInterpolate('settings.telegram.connected_status', { handle: id });
  });

  // ── WhatsApp / SMS: placeholders (future) ─────────────────────
  readonly whatsappState: LinkedChannelState = 'disconnected';
  readonly smsState: LinkedChannelState = 'disconnected';

  // ── Private helpers ───────────────────────────────────────────
  private translateInterpolate(key: string, params: Record<string, string>): string {
    return this.translationService.translate(key, params);
  }

  private formatRelativeDate(iso: string): string {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diff = Date.now() - then;
    const min = Math.floor(diff / 60_000);
    const lang = typeof this.translationService.currentLang === 'function'
      ? (this.translationService.currentLang() || 'es')
      : 'es';

    try {
      const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto', style: 'short' });
      if (min < 1) return rtf.format(0, 'second');
      if (min < 60) return rtf.format(-min, 'minute');
      const hr = Math.floor(min / 60);
      if (hr < 24) return rtf.format(-hr, 'hour');
      const day = Math.floor(hr / 24);
      if (day < 7) return rtf.format(-day, 'day');
    } catch {
      if (min < 1) return 'just now';
      if (min < 60) return `${min}m`;
    }
    return new Date(iso).toLocaleDateString(lang);
  }

  private formatAmount(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'USD',
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${amount} ${currency}`;
    }
  }
}
