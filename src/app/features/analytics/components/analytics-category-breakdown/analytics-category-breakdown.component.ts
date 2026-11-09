import { Component, input, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { FtSubtleRevealDirective } from '../../../../shared/directives/ft-subtle-reveal.directive';
import { CurrencyService } from '../../../../core/services/currency.service';
import type { CategoryAnalysis } from '../../analytics.types';
import { AnalyticsStore } from '../../services/analytics.store';

@Component({
  selector: 'ft-analytics-category-breakdown',
  standalone: true,
  imports: [CommonModule, NgIcon, TranslatePipe, FtSubtleRevealDirective],
  templateUrl: './analytics-category-breakdown.component.html',
  styleUrl: './analytics-category-breakdown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsCategoryBreakdownComponent {
  readonly store = inject(AnalyticsStore);
  private readonly currencyService = inject(CurrencyService);

  categories = input.required<CategoryAnalysis[]>();
  loading = input(false);
  max = input(7);

  formatAmount(amount: number): string {
    return this.currencyService.format(amount);
  }

  onCategoryClick(categoryId: string, categoryName: string): void {
    const current = this.store.crossFilter().categoryId;
    if (current === categoryId) {
      this.store.clearCrossFilter();
    } else {
      this.store.setCrossFilterCategory(categoryId, categoryName);
    }
  }
}
