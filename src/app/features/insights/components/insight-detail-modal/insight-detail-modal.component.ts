import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  inject,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { ActionableInsight, InsightAction, InsightCategory, InsightSeverity } from '../../../../core/models/insight.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CurrencyService } from '../../../../core/services/currency.service';
import { TranslationService } from '../../../../core/services/translation.service';
import { formatInsightMetrics, FormattedMetric } from '../../utils/insight-metrics.util';

@Component({
  selector: 'ft-insight-detail-modal',
  standalone: true,
  imports: [CommonModule, NgIcon, TranslatePipe],
  templateUrl: './insight-detail-modal.component.html',
  styleUrl: './insight-detail-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightDetailModalComponent {
  private readonly currencyService = inject(CurrencyService);
  private readonly translationService = inject(TranslationService);

  readonly isOpen = input<boolean>(false);
  readonly insight = input<ActionableInsight | null>(null);

  readonly close = output<void>();
  readonly actionClick = output<{ action: InsightAction; insight: ActionableInsight }>();
  readonly dismiss = output<string>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }

  readonly formattedMetrics = computed<FormattedMetric[]>(() => {
    // Reactive dependency on current language
    this.translationService.currentLang();
    return formatInsightMetrics(this.insight(), this.currencyService, this.translationService);
  });

  getCategoryIcon(category?: InsightCategory): string {
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

  getSeverityClass(severity?: InsightSeverity): string {
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

  getSeverityLabel(severity?: InsightSeverity): string {
    if (!severity) return '';
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

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.close.emit();
    }
  }

  onAction(action: InsightAction): void {
    const item = this.insight();
    if (!item) return;
    this.actionClick.emit({
      action,
      insight: item,
    });
    this.close.emit();
  }

  onDismiss(): void {
    const item = this.insight();
    if (!item) return;
    this.dismiss.emit(item.id);
    this.close.emit();
  }
}
