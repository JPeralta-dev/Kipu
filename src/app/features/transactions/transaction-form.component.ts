import { Component, OnInit, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { ICONS, getCategoryIcon } from '../../shared/icons/icon-registry';
import { FinanceService } from '../../core/services/finance.service';
import { BankService } from '../../core/services/bank.service';
import { ModalService } from '../../core/services/modal.service';
import { Category } from '../../core/models/category.model';
import type { BankSummary } from '../../core/models/bank.model';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { CategoryTranslatePipe } from '../../core/pipes/category-translate.pipe';
import { FtSubtleRevealDirective } from '../../shared/directives/ft-subtle-reveal.directive';
import { CurrencyService } from '../../core/services/currency.service';
import { CategorySelectComponent } from '../../shared/ui/category-select/category-select.component';
import { BankSelectComponent } from '../../shared/ui/bank-select/bank-select.component';
import { FtNumberFormatDirective } from '../../shared/directives/ft-number-format.directive';

interface CategoryOption extends Category {
  iconKey: string;
}

@Component({
  selector: 'ft-transaction-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    NgIcon,
    TranslatePipe,
    CategoryTranslatePipe,
    FtSubtleRevealDirective,
    CategorySelectComponent,
    BankSelectComponent,
    FtNumberFormatDirective,
  ],
  templateUrl: './transaction-form.component.html',
  styleUrl: './transaction-form.component.scss',
})
export class TransactionFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private financeService = inject(FinanceService);
  private bankService = inject(BankService);
  private modalService = inject(ModalService);
  private destroyRef = inject(DestroyRef);
  readonly currencySymbol = inject(CurrencyService).currencyConfig().symbol;

  // State
  readonly isEdit = signal(false);
  readonly submitting = signal(false);
  readonly loadingEdit = signal(false);
  readonly successMsg = signal('');
  readonly errorMsg = signal('');
  readonly categories = signal<CategoryOption[]>([]);
  readonly banks = signal<BankSummary[]>([]);
  readonly selectedType = signal<'income' | 'expense'>('expense');
  readonly defaultCategoryId = signal<string | null>(null);

  // Filtered categories based on selected type
  readonly filteredCategories = computed(() => {
    const type = this.selectedType();
    if (type === 'income') {
      return this.categories().filter(c => c.kind === 'income' || c.kind === 'mixed');
    }
    return this.categories().filter(c => c.kind === 'expense' || c.kind === 'mixed');
  });

  private txId: string | null = null;

  form = this.fb.group({
    type: ['expense', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    description: ['', [Validators.required, Validators.maxLength(140)]],
    category: ['', Validators.required],
    bank: [''], // optional
    date: [new Date().toISOString().split('T')[0], Validators.required],
  });

  ngOnInit(): void {
    this.checkEditMode();
    this.loadCategories();
    this.loadDefaultCategory();
    this.loadBanks();
    this.modalService.categorySaved$.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(() => {
      this.loadCategories();
    });
  }

  private loadCategories(): void {
    this.financeService.getCategories().pipe(
      catchError(() => {
        this.categories.set([]);
        return of([]);
      })
    ).subscribe({
      next: (cats) => {
        const options: CategoryOption[] = cats.map(cat => ({
          ...cat,
          iconKey: getCategoryIcon(cat.name),
        }));
        this.categories.set(options);
        this.applyDefaultCategoryIfNeeded();
      },
    });
  }

  private loadDefaultCategory(): void {
    if (this.isEdit()) return;
    this.financeService.getDefaultCategory().pipe(
      catchError(() => of({ defaultCategoryId: null })),
    ).subscribe({
      next: (pref) => {
        this.defaultCategoryId.set(pref?.defaultCategoryId ?? null);
        this.applyDefaultCategoryIfNeeded();
      },
    });
  }

  private applyDefaultCategoryIfNeeded(): void {
    if (this.isEdit() || this.selectedType() !== 'expense') return;
    const currentVal = this.form.get('category')?.value;
    if (currentVal) return;

    const defId = this.defaultCategoryId() ?? this.financeService.defaultCategoryId();
    const cats = this.categories();
    if (!cats.length) return;

    const matched = defId
      ? cats.find(c => (c.id === defId || c.name === defId) && (c.kind === 'expense' || c.kind === 'mixed'))
      : cats.find(c => c.isDefault && (c.kind === 'expense' || c.kind === 'mixed'));

    if (matched) {
      this.form.get('category')?.setValue(matched.name);
    }
  }

  private loadBanks(): void {
    this.bankService.getBanks().pipe(
      catchError(() => {
        this.banks.set([]);
        return of([]);
      })
    ).subscribe({
      next: (banks) => this.banks.set(banks),
    });
  }

  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.txId = id;
      this.loadingEdit.set(true);

      this.financeService.getTransactionById(id).pipe(
        catchError((err: HttpErrorResponse) => {
          this.loadingEdit.set(false);
          if (err.status === 0) {
            this.errorMsg.set('connection_error');
          } else if (err.status === 400) {
            this.errorMsg.set('invalid_id');
          } else if (err.status === 404) {
            this.errorMsg.set('not_found');
          } else {
            this.errorMsg.set('server_error');
          }
          return of(null);
        })
      ).subscribe({
        next: (tx: any) => {
          if (!tx) return;
          this.selectedType.set(tx.type);
          this.form.patchValue({
            type: tx.type,
            amount: tx.amount,
            description: tx.description,
            category: tx.category?.id ?? tx.category ?? '',
            bank: tx.bank?.id ?? '',
            date: tx.date?.split('T')[0] ?? '',
          });
          this.loadingEdit.set(false);
        },
      });
    }
  }

  setType(type: 'income' | 'expense'): void {
    this.selectedType.set(type);
    this.form.get('type')?.setValue(type);
    this.form.get('category')?.setValue('');
    if (type === 'expense') {
      this.applyDefaultCategoryIfNeeded();
    }
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  }

  getErrorMessage(field: string): string {
    const ctrl = this.form.get(field);
    if (!ctrl || !ctrl.errors) return '';
    if (ctrl.errors['required']) return 'required';
    if (ctrl.errors['min']) return 'min_value';
    if (ctrl.errors['maxlength']) return 'max_length';
    return '';
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.successMsg.set('');
    this.errorMsg.set('');

    const raw = this.form.value;
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const isToday = raw.date === todayStr;
    const dateToSubmit = isToday ? now.toISOString() : new Date(raw.date + 'T12:00:00Z').toISOString();

    const payload: any = {
      type: raw.type as 'income' | 'expense',
      amount: Number(raw.amount),
      description: raw.description!,
      category: raw.category!,
      date: dateToSubmit,
    };
    if (raw.bank) payload.bank = raw.bank;

    const request = this.isEdit()
      ? this.financeService.updateTransaction(this.txId!, payload)
      : this.financeService.createTransaction(payload);

    request.pipe(
      catchError((err: HttpErrorResponse) => {
        this.submitting.set(false);
        if (err.status === 0) {
          this.errorMsg.set('connection_error');
        } else if (err.status === 400) {
          this.errorMsg.set('invalid_data');
        } else if (err.status === 404) {
          this.errorMsg.set('not_found');
        } else {
          this.errorMsg.set('server_error');
        }
        return of(null);
      })
    ).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMsg.set(this.isEdit() ? 'updated' : 'created');
        setTimeout(() => this.router.navigate(['/transactions']), 900);
      },
    });
  }

  onDelete(): void {
    if (!this.txId || this.submitting()) return;
    this.submitting.set(true);
    this.financeService.deleteTransaction(this.txId).pipe(
      catchError(() => {
        this.submitting.set(false);
        this.errorMsg.set('server_error');
        return of(null);
      })
    ).subscribe(() => {
      this.router.navigate(['/transactions']);
    });
  }

  onAddCategoryFromForm(): void {
    this.modalService.openCategoryModal({
      name: '',
      icon: '',
      color: '#A855F7',
      kind: this.selectedType(),
    });
  }

  onAddBankFromForm(): void {
    // Open bank creation flow — for now, just reload banks
    this.loadBanks();
  }
}
