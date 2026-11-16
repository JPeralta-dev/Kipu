import {
  Component,
  signal,
  inject,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of, finalize } from 'rxjs';

import { IconComponent } from '../../../shared/icons/icon.component';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { ToastService } from '../../../core/services/toast.service';
import { SubscriptionTier, SubscriptionStatus } from '../../../core/models/user.model';

type PageState = 'loading' | 'ready' | 'error';

interface TierCard {
  id: SubscriptionTier;
  name: string;
  price: string;
  priceAnnual: string;
  annualSavings: string;
  popular: boolean;
  features: string[];
  ctaLabel: string;
  ctaAction: 'none' | 'trial' | 'upgrade';
  highlighted: boolean;
}

@Component({
  selector: 'ft-subscription-page',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './subscription.page.html',
  styleUrl: './subscription.page.scss',
})
export class SubscriptionPage implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly currencyService = inject(CurrencyService);
  private readonly toast = inject(ToastService);

  readonly state = signal<PageState>('loading');
  readonly isAnnual = signal(false);
  readonly actionLoading = signal(false);

  // Trial status
  readonly trialStatus = computed(() => {
    const sub = this.authService.currentSubscription();
    if (!sub) return { status: 'unknown' as const };

    switch (sub.status) {
      case 'active_trial':
        const end = sub.trialEnd ? new Date(sub.trialEnd) : null;
        const now = new Date();
        const daysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))) : 0;
        return {
          status: 'active_trial' as const,
          endDate: end ? end.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
          daysLeft,
        };
      case 'trial_expired':
        return { status: 'trial_expired' as const };
      case 'premium_active':
        const premiumEnd = sub.premiumEnd ? new Date(sub.premiumEnd) : null;
        return {
          status: 'premium_active' as const,
          tier: sub.tier,
          endDate: premiumEnd ? premiumEnd.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '',
        };
      case 'premium_expired':
        return { status: 'premium_expired' as const };
      default:
        return { status: 'no_trial' as const };
    }
  });

  readonly currentTier = computed<SubscriptionTier>(() => this.authService.subscriptionTier());

  readonly tiers = computed<TierCard[]>(() => {
    const annual = this.isAnnual();
    const tier = this.currentTier();
    const trial = this.trialStatus();

    const baseTiers: TierCard[] = [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        priceAnnual: '$0',
        annualSavings: '',
        popular: false,
        features: [
          'Registro de transacciones',
          'Gráficos básicos',
          'Categorías personalizables',
          'Historial completo',
        ],
        ctaLabel: 'Plan actual',
        ctaAction: 'none',
        highlighted: tier === 'free',
      },
      {
        id: 'premium',
        name: 'Premium',
        price: '$14.900/mes',
        priceAnnual: '$119.000/año',
        annualSavings: 'Ahorrá 33%',
        popular: true,
        features: [
          'Todo lo de Free',
          'Insights con IA',
          'Metas de ahorro',
          'Presupuestos inteligentes',
          'Alertas de gasto',
        ],
        ctaLabel: this.getCtaLabel('premium', trial),
        ctaAction: this.getCtaAction('premium', trial),
        highlighted: tier === 'premium',
      },
      {
        id: 'premium_plus',
        name: 'Premium Plus',
        price: '$24.900/mes',
        priceAnnual: '$199.000/año',
        annualSavings: 'Ahorrá 33%',
        popular: false,
        features: [
          'Todo lo de Premium',
          'Chat con IA ilimitado',
          'Integración con Telegram',
          'Exportar PDF/CSV',
          'Soporte prioritario',
        ],
        ctaLabel: this.getCtaLabel('premium_plus', trial),
        ctaAction: this.getCtaAction('premium_plus', trial),
        highlighted: tier === 'premium_plus',
      },
    ];

    // Override prices for annual display
    if (annual) {
      baseTiers[1].price = '$119.000/año';
      baseTiers[1].priceAnnual = '$14.900/mes';
      baseTiers[2].price = '$199.000/año';
      baseTiers[2].priceAnnual = '$24.900/mes';
    }

    return baseTiers;
  });

  ngOnInit(): void {
    this.state.set('ready');
  }

  // ─── CTA helpers ───────────────────────────────────────────────

  private getCtaLabel(tier: SubscriptionTier, trial: ReturnType<SubscriptionPage['trialStatus']>): string {
    if (tier === 'premium') {
      switch (trial.status) {
        case 'active_trial': return `Prueba activa — ${trial.daysLeft} días restantes`;
        case 'trial_expired': return 'Activar Premium — $14.900/mes';
        case 'premium_active': return 'Plan activo';
        case 'premium_expired': return 'Renovar Premium';
        default: return 'Comenzar prueba gratis — 30 días';
      }
    }
    if (tier === 'premium_plus') {
      if (trial.status === 'premium_active' && this.currentTier() === 'premium_plus') return 'Plan activo';
      return 'Mejorar a Plus';
    }
    return '';
  }

  private getCtaAction(tier: SubscriptionTier, trial: ReturnType<SubscriptionPage['trialStatus']>): 'none' | 'trial' | 'upgrade' {
    if (tier === 'premium') {
      switch (trial.status) {
        case 'active_trial': return 'none';
        case 'premium_active': return 'none';
        case 'trial_expired': return 'upgrade';
        case 'premium_expired': return 'upgrade';
        default: return 'trial';
      }
    }
    if (tier === 'premium_plus') {
      if (trial.status === 'premium_active' && this.currentTier() === 'premium_plus') return 'none';
      return 'upgrade';
    }
    return 'none';
  }

  // ─── Actions ───────────────────────────────────────────────────

  startTrial(): void {
    this.actionLoading.set(true);
    this.http.post<{ success: boolean; message?: string }>(
      `${environment.apiUrl}/api/subscription/trial`,
      {},
      { withCredentials: true },
    ).pipe(
      catchError((err) => {
        const msg = err?.error?.message || 'No se pudo activar la prueba. Intenta de nuevo.';
        this.toast.error('Error', msg);
        return of(null);
      }),
      finalize(() => this.actionLoading.set(false)),
    ).subscribe({
      next: (res) => {
        if (res?.success) {
          this.toast.success('¡Prueba activada!', 'Tienes 30 días de Premium gratis');
          // Refresh auth state
          this.authService.initAuthCheck();
        }
      },
    });
  }

  upgradeTier(tier: SubscriptionTier): void {
    this.actionLoading.set(true);
    this.http.patch<{ success: boolean; message?: string }>(
      `${environment.apiUrl}/api/subscription/upgrade`,
      { tier },
      { withCredentials: true },
    ).pipe(
      catchError((err) => {
        const msg = err?.error?.message || 'No se pudo completar la actualización. Intenta de nuevo.';
        this.toast.error('Error', msg);
        return of(null);
      }),
      finalize(() => this.actionLoading.set(false)),
    ).subscribe({
      next: (res) => {
        if (res?.success) {
          this.toast.success('¡Plan actualizado!', `Ahora tienes ${tier === 'premium' ? 'Premium' : 'Premium Plus'}`);
          this.authService.initAuthCheck();
        }
      },
    });
  }

  handleCta(tier: SubscriptionTier): void {
    const trial = this.trialStatus();
    const action = this.getCtaAction(tier, trial);

    if (action === 'trial') {
      this.startTrial();
    } else if (action === 'upgrade') {
      this.upgradeTier(tier);
    }
  }
}
