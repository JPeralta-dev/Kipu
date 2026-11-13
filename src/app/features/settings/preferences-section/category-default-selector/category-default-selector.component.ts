import { Component, DestroyRef, inject, input, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { firstValueFrom, catchError, of } from 'rxjs';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { CategoryTranslatePipe } from '../../../../core/pipes/category-translate.pipe';
import { FtSubtleRevealDirective } from '../../../../shared/directives/ft-subtle-reveal.directive';
import { FinanceService } from '../../../../core/services/finance.service';
import { ModalService } from '../../../../core/services/modal.service';
import { getCategoryIcon } from '../../../../shared/icons/icon-registry';
import type { Category } from '../../../../core/models/category.model';

@Component({
  selector: 'app-category-default-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, TranslatePipe, CategoryTranslatePipe, FtSubtleRevealDirective],
  templateUrl: './category-default-selector.component.html',
  styleUrl: './category-default-selector.component.scss',
})
export class CategoryDefaultSelectorComponent implements OnInit {
  private readonly financeService = inject(FinanceService);
  private readonly modalService = inject(ModalService);
  private readonly destroyRef = inject(DestroyRef);

  delay = input<number>(0);

  readonly categories = signal<Category[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  private _savedId: string | null = null;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    void this.load();
    this.modalService.categorySaved$.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      void this.load();
    });
  }

  get expenseCategories(): Category[] {
    return this.categories().filter((c) => c.kind === 'expense');
  }

  readonly selectedCategory = computed<Category | null>(() => {
    const id = this.selectedId();
    if (!id) return null;
    return this.expenseCategories.find((c) => c.id === id || c.name === id) ?? null;
  });

  readonly selectedIconName = computed<string>(() => {
    const cat = this.selectedCategory();
    return cat ? getCategoryIcon(cat.name) : 'tag';
  });

  get hasChanges(): boolean {
    return this.selectedId() !== (this._savedId ?? null);
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const cats = await firstValueFrom(this.financeService.getCategories());
      const safeCats = cats ?? [];
      this.categories.set(safeCats);

      const pref = await firstValueFrom(
        this.financeService.getDefaultCategory().pipe(
          catchError(() => of({ defaultCategoryId: this.financeService.defaultCategoryId() })),
        ),
      );

      const expenses = safeCats.filter((c) => c.kind === 'expense');
      const rawDefaultId = pref?.defaultCategoryId ?? this.financeService.defaultCategoryId();
      const matched = rawDefaultId
        ? expenses.find((c) => c.id === rawDefaultId || c.name === rawDefaultId)
        : expenses.find((c) => c.isDefault);

      const resolvedId = matched?.id ?? rawDefaultId ?? null;
      this.selectedId.set(resolvedId);
      this._savedId = resolvedId;
    } catch {
      this.error.set('settings.preferences.load_error');
    } finally {
      this.loading.set(false);
    }
  }

  onCategoryChange(nextValue: string): void {
    const nextId = nextValue ? nextValue : null;
    this.selectedId.set(nextId);
    this.success.set(false);
    this.error.set(null);
    if (this.hasChanges) {
      void this.save();
    }
  }

  async save(): Promise<void> {
    const targetId = this.selectedId();
    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);
    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }

    try {
      const res = await firstValueFrom(this.financeService.setDefaultCategory(targetId));
      const saved = res?.defaultCategoryId !== undefined ? res.defaultCategoryId : targetId;
      this._savedId = saved ?? null;
      this.selectedId.set(this._savedId);
      this.success.set(true);
      this.successTimer = setTimeout(() => this.success.set(false), 2600);
    } catch {
      // Even if backend PATCH fails, FinanceService stores the preference locally;
      // surface a localized warning/retry option if needed.
      this.error.set('settings.preferences.save_error');
    } finally {
      this.saving.set(false);
    }
  }
}
