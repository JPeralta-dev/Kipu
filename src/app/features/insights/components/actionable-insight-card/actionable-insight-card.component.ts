import { Component, ChangeDetectionStrategy, input, output, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { ActionableInsight, InsightAction, InsightCategory, InsightSeverity } from '../../../../core/models/insight.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CurrencyService } from '../../../../core/services/currency.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { formatInsightMetrics, FormattedMetric } from '../../utils/insight-metrics.util';

@Component({
  selector: 'ft-actionable-insight-card',
  standalone: true,
  imports: [CommonModule, NgIcon, TranslatePipe],
  templateUrl: './actionable-insight-card.component.html',
  styleUrl: './actionable-insight-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionableInsightCardComponent {
  private readonly currencyService = inject(CurrencyService);
  private readonly translationService = inject(TranslationService);

  readonly insight = input.required<ActionableInsight>();

  readonly cardClick = output<ActionableInsight>();
  readonly actionClick = output<{ action: InsightAction; insight: ActionableInsight }>();
  readonly dismiss = output<string>();

  readonly formattedMetrics = computed<FormattedMetric[]>(() => {
    // Reactive dependency on current language
    this.translationService.currentLang();
    return formatInsightMetrics(this.insight(), this.currencyService, this.translationService);
  });

  /** Single key highlight to show compactly in the card footer if present */
  readonly highlightMetric = computed<FormattedMetric | null>(() => {
    const list = this.formattedMetrics();
    if (list.length === 0) return null;
    // Prefer success or warning metrics as primary teaser
    const highlighted = list.find((m) => m.variant === 'success' || m.variant === 'warning');
    return highlighted || list[0];
  });

  readonly actionCount = computed<number>(() => {
    return this.insight().actions?.length || 0;
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
        return 'sparkles';
      case 'positive_milestone':
        return 'star';
      case 'spending':
        return 'trendUp';
      case 'savings':
        return 'wallet';
      case 'anomaly':
        return 'warning';
      default:
        return 'insights';
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

  getSeverityLabel(severity: InsightSeverity): string {
    const key = 'insights.severity.' + severity;
    const translated = this.translationService.translate(key);
    if (translated && translated !== key && !translated.startsWith('insights.')) {
      return translated;
    }
    switch (severity) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low':
      default: return 'Baja';
    }
  }

  getMetricLabel(m: FormattedMetric): string {
    const translated = this.translationService.translate(m.labelKey);
    if (translated && translated !== m.labelKey && !translated.startsWith('insights.')) {
      return translated;
    }
    return m.label;
  }

  onCardClick(): void {
    this.cardClick.emit(this.insight());
  }

  onDismiss(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.dismiss.emit(this.insight().id);
  }
}
