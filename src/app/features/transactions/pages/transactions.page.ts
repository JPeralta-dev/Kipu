import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { ICONS } from '../../../shared/icons/icon-registry';

import { TransactionTableComponent } from '../components/transaction-table/transaction-table.component';
import { SmartImportModalComponent } from '../components/smart-import-modal/smart-import-modal.component';
import { TransactionRowData } from '../transaction.types';
import { SmartCommitResult } from '../../../core/models/smart-import.model';
import { FinanceService } from '../../../core/services/finance.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog.component';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { TranslationService } from '../../../core/services/translation.service';
import { DateRangeService } from '../../../core/services/date-range.service';
import { ClickOutsideDirective } from '../../../shared/directives/click-outside.directive';

type TransactionsState = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'ft-transactions-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TransactionTableComponent, EmptyStateComponent, ConfirmDialogComponent, TranslatePipe, FormsModule, NgIcon, ClickOutsideDirective, SmartImportModalComponent],
  templateUrl: './transactions.page.html',
  styleUrl: './transactions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPage implements OnInit {
  private readonly financeService = inject(FinanceService);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject(TranslationService);
  private readonly router = inject(Router);
  readonly dateRange = inject(DateRangeService);

  readonly transactions = signal<TransactionRowData[]>([]);
  readonly state = signal<TransactionsState>('loading');
  readonly monthOpen = signal(false);
  readonly bulkDeleting = signal(false);
  readonly showImportModal = signal(false);

  /** Confirm dialog state for bulk delete */
  readonly showDeleteConfirm = signal(false);
  readonly pendingDeleteIds = signal<string[]>([]);
  private deletedTransactionCount = 0;

  readonly deleteConfirmMessage = computed(() => {
    const count = this.pendingDeleteIds().length;
    const key = 'transactions.deleteConfirmMessage';
    const translated = this.i18n.translate(key, { count });
    if (translated !== key) return translated;
    return `Are you sure you want to permanently delete ${count} transaction${count > 1 ? 's' : ''}? This cannot be undone.`;
  });

  ngOnInit(): void {
    this.loadData();
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isEditing = target && (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    );

    if (event.key === 'Escape') {
      if (this.monthOpen()) {
        this.monthOpen.set(false);
        event.preventDefault();
      } else if (this.showDeleteConfirm()) {
        this.onCancelDelete();
        event.preventDefault();
      }
      return;
    }

    if (isEditing) return;

    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      this.router.navigate(['/transactions/new']);
    } else if (event.key === '/') {
      const searchInput = document.querySelector<HTMLInputElement>('.tx-filters__input');
      if (searchInput) {
        event.preventDefault();
        searchInput.focus();
      }
    }
  }

  private loadData(): void {
    this.state.set('loading');

    const filters: any = { sortBy: 'date', sortDir: 'desc', ...this.dateRange.getFilters() };

    this.financeService.getTransactions(filters)
      .pipe(catchError(() => {
        this.state.set('error');
        this.toast.error(this.i18n.translate('common.toasts.transactions_load_failed'));
        return of([]);
      }))
      .subscribe({
        next: (data) => {
          if (!data || data.length === 0) {
            this.state.set('empty');
            this.transactions.set([]);
            return;
          }

          this.transactions.set(data.map(t => ({
            id: t.id,
            description: t.description,
            category: t.category,
            amount: t.amount,
            type: t.type,
            date: t.date,
            bankName: t.bank?.name,
            bankLogoUrl: t.bank?.logoUrl,
          })));
          this.state.set('ready');
        },
      });
  }

  onMonthSelect(month: { start: string; end: string }): void {
    this.dateRange.setMonth(month.start, month.end);
    this.monthOpen.set(false);
    this.loadData();
  }

  toggleMonthDropdown(): void {
    this.monthOpen.update(v => !v);
  }

  onSelect(id: string): void {
    this.router.navigate(['/transactions', id]);
  }

  onBulkDelete(ids: string[]): void {
    this.pendingDeleteIds.set(ids);
    this.showDeleteConfirm.set(true);
  }

  onConfirmDelete(): void {
    this.showDeleteConfirm.set(false);
    const ids = this.pendingDeleteIds();
    this.deletedTransactionCount = ids.length;
    this.bulkDeleting.set(true);
    forkJoin(ids.map(id => this.financeService.deleteTransaction(id).pipe(catchError(() => of(null)))))
      .subscribe(() => {
        this.bulkDeleting.set(false);
        this.pendingDeleteIds.set([]);
        this.loadData();
        const msg = this.i18n.translate(
          'transactions.deletedCount',
          { count: this.deletedTransactionCount },
        );
        const displayMsg = msg === 'transactions.deletedCount'
          ? `${this.deletedTransactionCount} transaction${this.deletedTransactionCount > 1 ? 's' : ''} deleted`
          : msg;
        this.toast.success(displayMsg);
      });
  }

  onCancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.pendingDeleteIds.set([]);
  }

  retry(): void {
    this.loadData();
  }

  openImportModal(): void {
    this.showImportModal.set(true);
  }

  onImportSuccess(result: SmartCommitResult): void {
    this.showImportModal.set(false);
    this.toast.success(`¡${result.importedCount} transacciones importadas con éxito!`);
    this.loadData();
  }
}
