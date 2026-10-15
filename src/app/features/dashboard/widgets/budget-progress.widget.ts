import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ICONS } from '../../../shared/icons/icon-registry';
import { BudgetsService } from '../../../core/services/budgets.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { CategoryTranslatePipe } from '../../../core/pipes/category-translate.pipe';
import { FtCurrencyPipe } from '../../../core/pipes/ft-currency.pipe';
import { Budget } from '../../../core/models/budget.model';

type BudgetsWidgetState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'ft-budget-progress-widget',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NgIcon,
    TranslatePipe,
    CategoryTranslatePipe,
    FtCurrencyPipe,
  ],
  templateUrl: './budget-progress.widget.html',
  styleUrl: './budget-progress.widget.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons(ICONS)],
})
export class BudgetProgressWidget implements OnInit {
  private readonly budgetsService = inject(BudgetsService);
  private readonly currencyService = inject(CurrencyService);

  readonly budgets = signal<Budget[]>([]);
  readonly state = signal<BudgetsWidgetState>('loading');

  readonly totalBudgeted = computed(() =>
    this.budgets().reduce((acc, b) => acc + (b.limitAmount || 0), 0)
  );

  readonly totalSpent = computed(() =>
    this.budgets().reduce((acc, b) => acc + (b.spending?.spent || 0), 0)
  );

  readonly overallPercentage = computed(() => {
    const budgeted = this.totalBudgeted();
    if (budgeted <= 0) return 0;
    return Math.round((this.totalSpent() / budgeted) * 100);
  });

  readonly displayBudgets = computed(() => {
    return [...this.budgets()]
      .sort((a, b) => this.progress(b) - this.progress(a))
      .slice(0, 3);
  });

  ngOnInit(): void {
    this.loadBudgets();
  }

  loadBudgets(): void {
    this.state.set('loading');
    this.budgetsService
      .getBudgets()
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (data) => {
          if (!data || data.length === 0) {
            this.state.set('empty');
          } else {
            this.budgets.set(data);
            this.state.set('ready');
          }
        },
        error: () => {
          this.state.set('error');
        },
      });
  }

  progress(b: Budget): number {
    if (b.spending?.percentageUsed !== undefined) {
      return Math.round(b.spending.percentageUsed);
    }
    if (b.limitAmount > 0) {
      return Math.round(((b.spending?.spent || 0) / b.limitAmount) * 100);
    }
    return 0;
  }

  isWarning(b: Budget): boolean {
    const p = this.progress(b);
    const th = b.alertThreshold || 80;
    return p >= th && p <= 100;
  }

  isExceeded(b: Budget): boolean {
    return this.progress(b) > 100;
  }

  formatCurrency(value: number): string {
    return this.currencyService.format(value);
  }
}
