import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { FinancialHealthOverview } from '../../../../core/models/insight.model';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { FtCurrencyPipe } from '../../../../core/pipes/ft-currency.pipe';

@Component({
  selector: 'ft-financial-health-hero',
  standalone: true,
  imports: [CommonModule, NgIcon, TranslatePipe, FtCurrencyPipe],
  templateUrl: './financial-health-hero.component.html',
  styleUrl: './financial-health-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialHealthHeroComponent {
  readonly overview = input<FinancialHealthOverview | null>(null);

  readonly score = computed(() => this.overview()?.healthScore ?? 0);
  readonly level = computed(() => this.overview()?.healthLevel ?? (this.score() === 0 ? 'needs_attention' : 'fair'));
  readonly headline = computed(() => this.overview()?.summaryHeadline ?? '');

  readonly goalsSummary = computed(() => this.overview()?.goalsSummary ?? {
    totalGoals: 0,
    onTrack: 0,
    atRisk: 0,
    critical: 0,
    achieved: 0,
  });

  readonly savingsMetrics = computed(() => {
    const sm = this.overview()?.savingsMetrics;
    const ov = this.overview() as any;
    return {
      monthlySavingsRate: sm?.monthlySavingsRate ?? ov?.monthlySavingsRate ?? 0,
      targetSavingsRate: sm?.targetSavingsRate ?? 20,
      netSavedThisMonth: sm?.netSavedThisMonth ?? (ov?.projectedSavings ?? 0),
    };
  });

  readonly strokeDashoffset = computed(() => {
    // Circle circumference = 2 * PI * r = 2 * 3.14159 * 42 ~= 264
    const circumference = 264;
    const progress = Math.min(Math.max(this.score(), 0), 100);
    return circumference - (circumference * progress) / 100;
  });
}
