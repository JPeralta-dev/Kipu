import { ActionableInsight } from '../../../core/models/insight.model';
import { CurrencyService } from '../../../core/services/currency.service';
import { TranslationService } from '../../../core/services/translation.service';

export interface FormattedMetric {
  labelKey: string;
  label: string;
  value: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function formatInsightMetrics(
  insight: ActionableInsight | null | undefined,
  currencyService: CurrencyService,
  translationService?: TranslationService
): FormattedMetric[] {
  if (!insight) return [];
  const m = (insight.metrics ?? {}) as Record<string, unknown>;
  const list: FormattedMetric[] = [];

  const t = (key: string, params?: Record<string, string | number>, fallback = ''): string => {
    if (!translationService) return fallback;
    const res = translationService.translate(key, params);
    if (!res || res === key || res.startsWith('insights.metrics.') || res.includes('insights.')) {
      return fallback;
    }
    return res;
  };

  const perMonth = t('insights.metrics.perMonth', undefined, '/mes');

  const suggestedMonthly = typeof m['suggestedMonthlySavings'] === 'number' ? m['suggestedMonthlySavings'] : null;
  if (suggestedMonthly != null) {
    const key = 'insights.metrics.suggestedMonthlySavings';
    list.push({
      labelKey: key,
      label: t(key, undefined, 'Aporte sugerido'),
      value: `${currencyService.format(suggestedMonthly)}${perMonth}`,
      variant: 'success',
    });
  }

  const potential = typeof m['potentialSavings'] === 'number' ? m['potentialSavings'] : null;
  if (potential != null) {
    const key = 'insights.metrics.potentialSavings';
    list.push({
      labelKey: key,
      label: t(key, undefined, 'Ahorro potencial'),
      value: currencyService.format(potential),
      variant: 'success',
    });
  }

  const rawMonths = m['monthsRemaining'];
  if (typeof rawMonths === 'number' || typeof rawMonths === 'string') {
    const key = 'insights.metrics.monthsRemaining';
    const val = t('insights.metrics.monthsFormat', { count: rawMonths }, `~${rawMonths} meses`);
    list.push({
      labelKey: key,
      label: t(key, undefined, 'Plazo estimado'),
      value: val,
      variant: 'default',
    });
  }

  const remaining = typeof m['remainingGoalAmount'] === 'number' ? m['remainingGoalAmount'] : null;
  if (remaining != null) {
    const key = 'insights.metrics.remainingGoalAmount';
    list.push({
      labelKey: key,
      label: t(key, undefined, 'Falta recaudar'),
      value: currencyService.format(remaining),
      variant: 'default',
    });
  }

  const margin = typeof m['cashMargin'] === 'number' ? m['cashMargin'] : null;
  if (margin != null) {
    const key = 'insights.metrics.cashMargin';
    list.push({
      labelKey: key,
      label: t(key, undefined, 'Margen libre'),
      value: `${currencyService.format(margin)}${perMonth}`,
      variant: 'default',
    });
  }

  const current = typeof m['current'] === 'number' ? m['current'] : null;
  if (current != null) {
    const key = 'insights.metrics.current';
    list.push({
      labelKey: key,
      label: t(key, undefined, 'Actual'),
      value: currencyService.format(current),
      variant: 'default',
    });
  }

  const target = typeof m['target'] === 'number' ? m['target'] : null;
  if (target != null) {
    const key = 'insights.metrics.target';
    list.push({
      labelKey: key,
      label: t(key, undefined, 'Objetivo'),
      value: currencyService.format(target),
      variant: 'default',
    });
  }

  const projected = typeof m['projected'] === 'number' ? m['projected'] : null;
  if (projected != null) {
    const key = 'insights.metrics.projected';
    list.push({
      labelKey: key,
      label: t(key, undefined, 'Proyectado'),
      value: currencyService.format(projected),
      variant: 'warning',
    });
  }

  const rawImpact = m['impactDays'];
  if (typeof rawImpact === 'number' || typeof rawImpact === 'string') {
    const key = 'insights.metrics.impactDays';
    const val = t('insights.metrics.daysFormat', { count: rawImpact }, `+${rawImpact} días`);
    list.push({
      labelKey: key,
      label: t(key, undefined, 'Impacto'),
      value: val,
      variant: 'warning',
    });
  }

  return list;
}
