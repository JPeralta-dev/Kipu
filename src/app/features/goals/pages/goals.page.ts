import {
  Component,
  signal,
  inject,
  OnInit,
  computed,
  DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { NgIcon } from '@ng-icons/core';

import { GoalsService } from '../../../core/services/goals.service';
import { PocketsService } from '../../../core/services/pockets.service';
import { CurrencyService } from '../../../core/services/currency.service';
import { ToastService } from '../../../core/services/toast.service';
import { Goal, CreateGoalDto, UpdateGoalDto } from '../../../core/models/goal.model';
import { PocketResponse } from '../../../core/models/pocket.model';
import { DatepickerComponent } from '../../../shared/ui/datepicker/datepicker.component';
import { FtNumberFormatDirective } from '../../../shared/directives/ft-number-format.directive';

type PageState = 'loading' | 'ready' | 'empty' | 'error';
type ModalMode = 'create' | 'edit' | 'add-amount' | null;

export interface GoalTimeInfo {
  badgeText: string;
  subText: string;
  isExpired: boolean;
  isCompleted: boolean;
}

export interface GoalWithTimeInfo extends Goal {
  timeInfo: GoalTimeInfo;
}

@Component({
  selector: 'ft-goals-page',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, DatepickerComponent, FtNumberFormatDirective],
  templateUrl: './goals.page.html',
  styleUrl: './goals.page.scss',
})
export class GoalsPage implements OnInit {
  private readonly goalsService = inject(GoalsService);
  private readonly pocketsService = inject(PocketsService);
  private readonly currencyService = inject(CurrencyService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly goals = signal<Goal[]>([]);
  readonly pockets = signal<PocketResponse[]>([]);
  readonly state = signal<PageState>('loading');

  readonly goalsWithTimeInfo = computed<GoalWithTimeInfo[]>(() =>
    this.goals().map((g) => ({
      ...g,
      timeInfo: this.getGoalTimeInfo(g),
    })),
  );

  // Modal state
  readonly modalMode = signal<ModalMode>(null);
  readonly selectedGoal = signal<Goal | null>(null);

  // Form fields
  readonly formName = signal('');
  readonly formTargetAmount = signal<number | null>(null);
  readonly formDeadline = signal('');
  readonly formPocketId = signal<string | null>(null);
  readonly formAddAmount = signal<number | null>(null);
  readonly formError = signal('');

  // Confirm delete
  readonly goalToDelete = signal<Goal | null>(null);
  readonly showDeleteConfirm = signal(false);

  readonly currencySymbol = computed(() => this.currencyService.currencyConfig().symbol);

  ngOnInit(): void {
    this.loadGoals();
    this.loadPockets();
  }

  // ─── Load data ─────────────────────────────────────────────────

  loadGoals(): void {
    this.state.set('loading');
    this.goalsService.getGoals().pipe(
      catchError(() => {
        this.state.set('error');
        return of([]);
      }),
    ).subscribe({
      next: (data: Goal[]) => {
        if (!data || data.length === 0) {
          this.state.set('empty');
          this.goals.set([]);
        } else {
          this.goals.set(data);
          this.state.set('ready');
        }
      },
    });
  }

  loadPockets(): void {
    this.pocketsService.list().pipe(
      catchError(() => of([] as PocketResponse[])),
    ).subscribe({
      next: (data: PocketResponse[]) => {
        this.pockets.set(data || []);
      },
    });
  }

  // ─── Progress & Time Helpers ───────────────────────────────────

  progress(goal: Goal): number {
    if (goal.targetAmount <= 0) return 0;
    return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
  }

  remaining(goal: Goal): number {
    return Math.max(0, goal.targetAmount - goal.currentAmount);
  }

  getGoalTimeInfo(goal: Goal): GoalTimeInfo {
    const remaining = this.remaining(goal);
    if (remaining <= 0 || goal.status === 'achieved') {
      return {
        badgeText: '¡Meta alcanzada!',
        subText: 'Objetivo completado con éxito',
        isExpired: false,
        isCompleted: true,
      };
    }

    if (goal.deadline) {
      const now = new Date();
      const deadline = new Date(goal.deadline);
      const isPast = deadline.getTime() < now.getTime();
      const daysLeft = goal.pacing?.daysRemaining ?? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (isPast && daysLeft <= 0) {
        return {
          badgeText: 'Plazo vencido',
          subText: `Faltan ${this.formatCurrency(remaining)} para completar`,
          isExpired: true,
          isCompleted: false,
        };
      }

      if (daysLeft === 0) {
        return {
          badgeText: 'Vence hoy',
          subText: `Faltan ${this.formatCurrency(remaining)} para completar`,
          isExpired: false,
          isCompleted: false,
        };
      }

      const monthsLeft = goal.pacing?.monthsRemaining ?? (daysLeft > 0 ? Math.max(1, Math.ceil(daysLeft / 30.4375)) : 0);
      const suggestedMonthly = goal.pacing?.suggestedMonthlySavings ?? (monthsLeft > 0 ? Math.round(remaining / monthsLeft) : remaining);

      const timeText = daysLeft <= 45
        ? `Quedan ${daysLeft} días`
        : `Quedan ~${monthsLeft} ${monthsLeft === 1 ? 'mes' : 'meses'} (${daysLeft} días)`;

      return {
        badgeText: timeText,
        subText: `Aporte sugerido: ${this.formatCurrency(suggestedMonthly)}/mes`,
        isExpired: false,
        isCompleted: false,
      };
    }

    return {
      badgeText: 'Sin fecha límite',
      subText: `Faltan ${this.formatCurrency(remaining)} para completar`,
      isExpired: false,
      isCompleted: false,
    };
  }

  getPocketName(pocketId?: string | null): string | null {
    if (!pocketId) return null;
    const p = this.pockets().find((item) => item.id === pocketId);
    return p ? p.name : null;
  }

  formatCurrency(value: number): string {
    return this.currencyService.format(value);
  }

  // ─── Modal: Create ─────────────────────────────────────

  openCreateModal(): void {
    this.modalMode.set('create');
    this.formName.set('');
    this.formTargetAmount.set(null);
    this.formDeadline.set('');
    this.formPocketId.set(null);
    this.formError.set('');
  }

  // ─── Modal: Edit ───────────────────────────────────────

  openEditModal(goal: Goal): void {
    this.selectedGoal.set(goal);
    this.modalMode.set('edit');
    this.formName.set(goal.name);
    this.formTargetAmount.set(goal.targetAmount);
    this.formDeadline.set(goal.deadline ? goal.deadline.split('T')[0] : '');
    this.formPocketId.set(goal.pocketId || null);
    this.formError.set('');
  }

  // ─── Modal: Add amount ─────────────────────────────────

  openAddAmountModal(goal: Goal): void {
    this.selectedGoal.set(goal);
    this.modalMode.set('add-amount');
    this.formAddAmount.set(null);
    this.formError.set('');
  }

  closeModal(): void {
    this.modalMode.set(null);
    this.selectedGoal.set(null);
    this.formError.set('');
  }

  // ─── Form submission ───────────────────────────────────

  parseNumber(val: unknown): number {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (!val) return 0;
    const cleaned = String(val).replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  validateForm(): boolean {
    const name = this.formName().trim();
    const targetAmount = this.parseNumber(this.formTargetAmount());

    if (!name) {
      this.formError.set('El nombre es obligatorio');
      return false;
    }
    if (targetAmount <= 0) {
      this.formError.set('El monto objetivo debe ser mayor a 0');
      return false;
    }
    return true;
  }

  onSubmitCreate(): void {
    if (!this.validateForm()) return;

    const pocketId = this.formPocketId();
    const dto: CreateGoalDto = {
      name: this.formName().trim(),
      targetAmount: this.parseNumber(this.formTargetAmount()),
      currentAmount: 0,
      deadline: this.formDeadline() || undefined,
      pocketId: (pocketId && pocketId !== 'null') ? pocketId : undefined,
    };

    this.goalsService.createGoal(dto).pipe(
      catchError((err) => {
        console.error('Error al crear la meta:', err);
        const serverMsg = err?.error?.details?.[0]?.message || err?.error?.message;
        this.formError.set(serverMsg || 'Error al crear la meta. Intentá de nuevo.');
        return of(null);
      }),
    ).subscribe({
      next: (goal) => {
        if (goal) {
          this.toast.success('Meta creada', `"${goal.name}" fue creada exitosamente`);
          this.closeModal();
          this.loadGoals();
        }
      },
    });
  }

  onSubmitEdit(): void {
    if (!this.validateForm()) return;
    const goal = this.selectedGoal();
    if (!goal) return;

    const pocketId = this.formPocketId();
    const dto: UpdateGoalDto = {
      name: this.formName().trim(),
      targetAmount: this.parseNumber(this.formTargetAmount()),
      pocketId: (pocketId && pocketId !== 'null') ? pocketId : undefined,
    };
    if (this.formDeadline()) {
      dto.deadline = this.formDeadline();
    } else {
      dto.deadline = null;
    }

    this.goalsService.updateGoal(goal.id, dto).pipe(
      catchError((err) => {
        console.error('Error al actualizar la meta:', err);
        const serverMsg = err?.error?.details?.[0]?.message || err?.error?.message;
        this.formError.set(serverMsg || 'Error al actualizar la meta. Intentá de nuevo.');
        return of(null);
      }),
    ).subscribe({
      next: (updated) => {
        if (updated) {
          this.toast.success('Meta actualizada', `"${updated.name}" fue actualizada`);
          this.closeModal();
          this.loadGoals();
        }
      },
    });
  }

  onSubmitAddAmount(): void {
    const amount = this.parseNumber(this.formAddAmount());
    const goal = this.selectedGoal();
    if (amount <= 0 || !goal) {
      this.formError.set('Ingresá un monto válido mayor a 0');
      return;
    }

    const dto: UpdateGoalDto = {
      currentAmount: goal.currentAmount + amount,
    };

    this.goalsService.updateGoal(goal.id, dto).pipe(
      catchError((err) => {
        console.error('Error al actualizar el progreso:', err);
        const serverMsg = err?.error?.details?.[0]?.message || err?.error?.message;
        this.formError.set(serverMsg || 'Error al actualizar el progreso. Intentá de nuevo.');
        return of(null);
      }),
    ).subscribe({
      next: (updated) => {
        if (updated) {
          this.toast.success('Progreso actualizado', `Se agregaron ${this.formatCurrency(amount)} a "${updated.name}"`);
          this.closeModal();
          this.loadGoals();
        }
      },
    });
  }

  // ─── Delete ────────────────────────────────────────────

  confirmDelete(goal: Goal): void {
    this.goalToDelete.set(goal);
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.goalToDelete.set(null);
    this.showDeleteConfirm.set(false);
  }

  executeDelete(): void {
    const goal = this.goalToDelete();
    if (!goal) return;

    this.goalsService.deleteGoal(goal.id).pipe(
      catchError(() => {
        this.toast.error('Error', 'No se pudo eliminar la meta');
        return of(null);
      }),
    ).subscribe({
      next: () => {
        this.toast.success('Meta eliminada', `"${goal.name}" fue eliminada`);
        this.cancelDelete();
        this.loadGoals();
      },
    });
  }

  retry(): void {
    this.loadGoals();
  }
}
