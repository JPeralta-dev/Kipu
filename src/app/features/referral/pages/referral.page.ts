/**
 * FtReferralPageComponent — full-page referral hub.
 *
 * Path: /referral (premium+ only).
 *
 * Shows the user's unique referral link, copy-to-clipboard button, share
 * buttons for email/WhatsApp/Twitter/Telegram, and live stats. Uses
 * glass-morphism design tokens consistent with the rest of the app.
 */
import {
  Component,
  ChangeDetectionStrategy,
  inject,
  OnInit,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { RouterLink } from '@angular/router';
import { FtReferralService } from '../referral.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { FtAnalyticsService } from '../../../core/services/analytics.service';
import { ICONS } from '../../../shared/icons/icon-registry';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { ShareMethod } from '../referral.models';
import { FtSubtleRevealDirective } from '../../../shared/directives/ft-subtle-reveal.directive';

@Component({
  selector: 'ft-referral-page',
  standalone: true,
  imports: [CommonModule, NgIcon, RouterLink, TranslatePipe, FtSubtleRevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './referral.page.html',
  styleUrl: './referral.page.scss',
})
export class ReferralPage implements OnInit {
  protected readonly referral = inject(FtReferralService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly analytics = inject(FtAnalyticsService);

  // Heroicons
  readonly iconLink = ICONS.link;
  readonly iconCopy = ICONS.list;
  readonly iconCheck = ICONS.check;
  readonly iconShare = ICONS.telegram;
  readonly iconUserGroup = ICONS.userGroup;
  readonly iconGift = ICONS.star;
  readonly iconClose = ICONS.close;

  readonly copyState = signal<'idle' | 'copied'>('idle');

  readonly shareMethods: ShareMethod[] = ['email', 'whatsapp', 'twitter', 'telegram'];

  /** Friendly stats block. */
  readonly displayStats = computed(() => {
    const s = this.referral.stats();
    return {
      count: s.referralCount,
      months: s.totalDiscountMonths,
      pending: s.pendingCount,
    };
  });

  ngOnInit(): void {
    this.referral.ensureCode();
  }

  async copyLink(): Promise<void> {
    const ok = await this.referral.copyLink();
    if (ok) {
      this.copyState.set('copied');
      this.toast.success('Link copiado', 'Tu link de referido está en el portapapeles.');
      setTimeout(() => this.copyState.set('idle'), 2000);
    } else {
      this.toast.error('Error', 'No pudimos copiar el enlace. Prueba seleccionarlo manualmente.');
    }
  }

  share(method: ShareMethod): void {
    const target = this.referral.share(method);
    this.analytics.trackEvent('referral_link_shared', { method, code: this.referral.code()?.code });
    if (method === 'copy') {
      this.copyLink();
      return;
    }
    // Open in new tab for web shares; mailto: opens in same window which is fine
    window.open(target.url, method === 'email' ? '_self' : '_blank', 'noopener,noreferrer');
  }
}
