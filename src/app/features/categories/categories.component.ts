import { Component, OnInit, signal, inject, computed, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { ICONS } from '../../shared/icons/icon-registry';
import { FinanceService } from '../../core/services/finance.service';
import { BudgetsService } from '../../core/services/budgets.service';
import { Category } from '../../core/models/category.model';
import { Budget } from '../../core/models/budget.model';
import { SkeletonComponent } from '../../shared/components/skeleton.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { CategoryTranslatePipe } from '../../core/pipes/category-translate.pipe';
import { FtSubtleRevealDirective } from '../../shared/directives/ft-subtle-reveal.directive';
import { ToastService } from '../../core/services/toast.service';
import { TranslationService } from '../../core/services/translation.service';
import { FtCurrencyPipe } from '../../core/pipes/ft-currency.pipe';
import { ModalService } from '../../core/services/modal.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog.component';
import { FtModalComponent } from '../../shared/ui/modal/ft-modal.component';
import { categoryMark } from '../../shared/utils/category-mark';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    FtCurrencyPipe,
    SkeletonComponent,
    EmptyStateComponent,
    NgIcon,
    TranslatePipe,
    CategoryTranslatePipe,
    FtSubtleRevealDirective,
    ConfirmDialogComponent,
    FtModalComponent,
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [provideIcons(ICONS)],
})
export class CategoriesComponent implements OnInit {
  private financeService = inject(FinanceService);
  private budgetsService = inject(BudgetsService);
  private toast = inject(ToastService);
  private i18n = inject(TranslationService);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);

  categories = signal<Category[]>([]);
  budgets = signal<Budget[]>([]);
  loading = signal(true);
  error = signal(false);
  activeTab = signal<'all' | 'expense' | 'income'>('all');
  readonly skeletonArray = Array.from({ length: 6 }, (_, i) => i);

  // Budget modal state
  budgetModalOpen = signal(false);
  budgetCategory = signal<Category | null>(null);
  budgetAmount = signal<number | null>(null);
  budgetThreshold = signal<number>(80);
  budgetSaving = signal(false);

  // Confirm dialog state
  confirmVisible = signal(false);
  private pendingDeleteCategory: Category | null = null;

  // Budgets map by categoryId
  budgetMap = computed(() => {
    const map = new Map<string, Budget>();
    for (const b of this.budgets()) {
      map.set(b.categoryId, b);
    }
    return map;
  });

  existingBudgetForModal = computed(() => {
    const cat = this.budgetCategory();
    return cat ? this.budgetMap().get(cat.id) : undefined;
  });

  // Computed collections separated by conceptual kind
  expenseCategories = computed(() =>
    this.categories().filter((c) => c.kind === 'expense')
  );

  incomeCategories = computed(() =>
    this.categories().filter((c) => c.kind === 'income')
  );

  mixedCategories = computed(() =>
    this.categories().filter((c) => c.kind === 'mixed')
  );

  // Totals calculated strictly per kind
  totalExpenses = computed(() =>
    this.expenseCategories().reduce((sum, c) => sum + (c.total || 0), 0)
  );

  totalIncome = computed(() =>
    this.incomeCategories().reduce((sum, c) => sum + (c.total || 0), 0)
  );

  topExpenseCategory = computed(() => {
    const sorted = [...this.expenseCategories()].sort((a, b) => (b.total || 0) - (a.total || 0));
    return sorted[0] ?? { name: '-' };
  });

  topIncomeCategory = computed(() => {
    const sorted = [...this.incomeCategories()].sort((a, b) => (b.total || 0) - (a.total || 0));
    return sorted[0] ?? { name: '-' };
  });

  // Backward compatibility alias for topCategory
  topCategory = computed(() => this.topExpenseCategory());

  ngOnInit(): void {
    this.loadCategories();
    this.loadBudgets();
    this.modalService.categorySaved$.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.loadCategories();
      this.loadBudgets();
    });
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.error.set(false);
    this.financeService.getCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
        this.toast.error(this.i18n.translate('common.toasts.categories_load_failed'));
      },
    });
  }

  private loadBudgets(): void {
    this.budgetsService.getBudgets().subscribe({
      next: (data) => {
        this.budgets.set(data || []);
      },
      error: () => {
        // Non-blocking for category list
      },
    });
  }

  retry(): void {
    this.loadCategories();
    this.loadBudgets();
  }

  getCategoryBudget(categoryId: string): Budget | undefined {
    return this.budgetMap().get(categoryId);
  }

  getBudgetPercentage(budget: Budget): number {
    if (budget.spending?.percentageUsed !== undefined) {
      return Math.round(budget.spending.percentageUsed);
    }
    if (budget.limitAmount > 0) {
      const spent = budget.spending?.spent ?? 0;
      return Math.round((spent / budget.limitAmount) * 100);
    }
    return 0;
  }

  getBudgetSpent(budget: Budget, fallbackTotal = 0): number {
    return budget.spending?.spent ?? fallbackTotal;
  }

  getRemainingBudget(budget: Budget, fallbackTotal = 0): number {
    if (budget.spending?.remaining !== undefined) {
      return budget.spending.remaining;
    }
    return Math.max(0, budget.limitAmount - fallbackTotal);
  }

  getExceededAmount(budget: Budget, fallbackTotal = 0): number {
    const spent = this.getBudgetSpent(budget, fallbackTotal);
    return Math.max(0, spent - budget.limitAmount);
  }

  isBudgetWarning(budget: Budget): boolean {
    const pct = this.getBudgetPercentage(budget);
    const threshold = budget.alertThreshold ?? 80;
    return pct >= threshold && pct <= 100;
  }

  isBudgetExceeded(budget: Budget): boolean {
    return this.getBudgetPercentage(budget) > 100;
  }

  openBudgetModal(cat: Category): void {
    this.budgetCategory.set(cat);
    const existing = this.budgetMap().get(cat.id);
    if (existing) {
      this.budgetAmount.set(existing.limitAmount);
      this.budgetThreshold.set(existing.alertThreshold || 80);
    } else {
      this.budgetAmount.set(null);
      this.budgetThreshold.set(80);
    }
    this.budgetModalOpen.set(true);
  }

  closeBudgetModal(): void {
    this.budgetModalOpen.set(false);
    this.budgetCategory.set(null);
    this.budgetAmount.set(null);
    this.budgetSaving.set(false);
  }

  saveBudget(): void {
    const cat = this.budgetCategory();
    const amount = this.budgetAmount();
    if (!cat || !amount || amount <= 0) {
      return;
    }

    this.budgetSaving.set(true);
    const existing = this.budgetMap().get(cat.id);
    const threshold = this.budgetThreshold() || 80;

    const req$ = existing
      ? this.budgetsService.updateBudget(existing.id, { limitAmount: amount, alertThreshold: threshold })
      : this.budgetsService.createBudget({ categoryId: cat.id, limitAmount: amount, alertThreshold: threshold, period: 'monthly' });

    req$.subscribe({
      next: () => {
        this.budgetSaving.set(false);
        this.closeBudgetModal();
        this.loadBudgets();
        this.toast.success(this.i18n.translate('budgets.saved'));
      },
      error: (err) => {
        this.budgetSaving.set(false);
        this.toast.error(err.error?.message || this.i18n.translate('budgets.save_error'));
      },
    });
  }

  deleteBudget(): void {
    const cat = this.budgetCategory();
    if (!cat) return;
    const existing = this.budgetMap().get(cat.id);
    if (!existing) return;

    this.budgetSaving.set(true);
    this.budgetsService.deleteBudget(existing.id).subscribe({
      next: () => {
        this.budgetSaving.set(false);
        this.closeBudgetModal();
        this.loadBudgets();
        this.toast.success(this.i18n.translate('budgets.deleted'));
      },
      error: (err) => {
        this.budgetSaving.set(false);
        this.toast.error(err.error?.message || this.i18n.translate('budgets.delete_error'));
      },
    });
  }

  setActiveTab(tab: 'all' | 'expense' | 'income'): void {
    this.activeTab.set(tab);
  }

  categoryPercentage(cat: Category): number {
    const base = cat.kind === 'income' ? this.totalIncome() : this.totalExpenses();
    if (!base || base <= 0) return 0;
    return Math.min(((cat.total || 0) / base) * 100, 100);
  }

  percentage(total: number, kind: 'expense' | 'income' | 'mixed' = 'expense'): number {
    const base = kind === 'income' ? this.totalIncome() : this.totalExpenses();
    if (!base || base <= 0) return 0;
    return Math.min((total / base) * 100, 100);
  }

  categoryMark = categoryMark;

  // CRUD Actions
  openCreateForm(kind: 'expense' | 'income' = 'expense'): void {
    this.modalService.openCategoryModal({
      name: '',
      icon: '',
      color: kind === 'income' ? '#10B981' : '#A855F7',
      kind: kind,
    });
  }

  openEditForm(cat: Category): void {
    this.modalService.openCategoryModal(
      {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        kind: cat.kind,
      },
      cat.id
    );
  }

  deleteCategory(cat: Category): void {
    if (cat.isDefault) {
      this.toast.error(this.i18n.translate('common.toasts.category_cannot_delete'));
      return;
    }

    this.pendingDeleteCategory = cat;
    this.confirmVisible.set(true);
  }

  onConfirmDelete(): void {
    const cat = this.pendingDeleteCategory;
    if (!cat) return;

    this.financeService.deleteCategory(cat.id).subscribe({
      next: () => {
        this.loadCategories();
        this.toast.success(this.i18n.translate('common.toasts.category_deleted'));
      },
      error: (err) => {
        this.toast.error(err.error?.message || this.i18n.translate('common.toasts.category_delete_failed'));
      },
    });

    this.confirmVisible.set(false);
    this.pendingDeleteCategory = null;
  }

  onCancelDelete(): void {
    this.confirmVisible.set(false);
    this.pendingDeleteCategory = null;
  }
}
