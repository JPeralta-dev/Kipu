import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { ActionableInsight, InsightAction, InsightCategory, InsightSeverity } from '../../../../core/models/insight.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { FtCurrencyPipe } from '../../../../core/pipes/ft-currency.pipe';
import { CurrencyService } from '../../../../core/services/currency.service';

export interface FormattedMetric {
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

@Component({
  selector: 'ft-actionable-insight-card',
  standalone: true,
  imports: [CommonModule, NgIcon, TranslatePipe, FtCurrencyPipe],
  templateUrl: './actionable-insight-card.component.html',
  styleUrl: './actionable-insight-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionableInsightCardComponent {
  private readonly currencyService = inject(CurrencyService);

  readonly insight = input.required<ActionableInsight>();

  readonly actionClick = output<{ action: InsightAction; insight: ActionableInsight }>();
  readonly dismiss = output<string>();

  readonly formattedMetrics = computed<FormattedMetric[]>(() => {
    const m = (this.insight().metrics ?? {}) as Record<string, unknown>;
    const list: FormattedMetric[] = [];

    const suggestedMonthly = typeof m['suggestedMonthlySavings'] === 'number' ? m['suggestedMonthlySavings'] : null;
    if (suggestedMonthly != null) {
      list.push({
        label: 'Aporte sugerido',
        value: `${this.currencyService.format(suggestedMonthly)}/mes`,
        variant: 'success',
      });
    }

    const potential = typeof m['potentialSavings'] === 'number' ? m['potentialSavings'] : null;
    if (potential != null) {
      list.push({
        label: 'Ahorro potencial',
        value: this.currencyService.format(potential),
        variant: 'success',
      });
    }

    const months = m['monthsRemaining'];
    if (months != null) {
      list.push({
        label: 'Plazo estimado',
        value: `~${months} meses`,
        variant: 'default',
      });
    }

    const remaining = typeof m['remainingGoalAmount'] === 'number' ? m['remainingGoalAmount'] : null;
    if (remaining != null) {
      list.push({
        label: 'Falta recaudar',
        value: this.currencyService.format(remaining),
        variant: 'default',
      });
    }

    const margin = typeof m['cashMargin'] === 'number' ? m['cashMargin'] : null;
    if (margin != null) {
      list.push({
        label: 'Margen libre',
        value: `${this.currencyService.format(margin)}/mes`,
        variant: 'default',
      });
    }

    const current = typeof m['current'] === 'number' ? m['current'] : null;
    if (current != null) {
      list.push({
        label: 'Actual',
        value: this.currencyService.format(current),
        variant: 'default',
      });
    }

    const target = typeof m['target'] === 'number' ? m['target'] : null;
    if (target != null) {
      list.push({
        label: 'Objetivo',
        value: this.currencyService.format(target),
        variant: 'default',
      });
    }

    const projected = typeof m['projected'] === 'number' ? m['projected'] : null;
    if (projected != null) {
      list.push({
        label: 'Proyectado',
        value: this.currencyService.format(projected),
        variant: 'warning',
      });
    }

    const impactDays = m['impactDays'];
    if (impactDays != null) {
      list.push({
        label: 'Impacto',
        value: `+${impactDays} días`,
        variant: 'warning',
      });
    }

    return list;
  });

  getCategoryIcon(category: InsightCategory): string {
    switch (category) {
      case 'pacing_alert':
        return 'alertTriangle';
      case 'goal_impact':
        return 'clock';
      case 'smart_allocation':
        return 'wallet';
      case 'leak_optimization':
        return 'sparkles' || 'star';
      case 'positive_milestone':
        return 'star';
      case 'spending':
        return 'trendUp';
      case 'savings':
        return 'wallet';
      case 'anomaly':
        return 'warning';
      default:
        return 'info';
    }
  }

  getSeverityClass(severity: InsightSeverity): string {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'severity--high';
      case 'medium':
        return 'severity--medium';
      case 'low':
      default:
        return 'severity--low';
    }
  }

  onAction(action: InsightAction): void {
    this.actionClick.emit({
      action,
      insight: this.insight(),
    });
  }

  onDismiss(): void {
    this.dismiss.emit(this.insight().id);
  }
}
