import { Component, inject, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { forkJoin, of, catchError } from 'rxjs';

import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FtSubtleRevealDirective } from '../../../shared/directives/ft-subtle-reveal.directive';
import { EmptyStateComponent } from '../../../shared/components/empty-state.component';

import { ActionableInsight, FinancialHealthOverview, InsightAction } from '../../../core/models/insight.model';
import { Goal } from '../../../core/models/goal.model';
import { Pocket } from '../../../core/models/pocket.model';

import { InsightsApiService } from '../../../core/services/insights-api.service';
import { GoalsService } from '../../../core/services/goals.service';
import { PocketsService } from '../../../core/services/pockets.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ToastService } from '../../../core/services/toast.service';

import { FinancialHealthHeroComponent } from '../components/financial-health-hero/financial-health-hero.component';
import { ActiveGoalsRadarComponent } from '../components/active-goals-radar/active-goals-radar.component';
import { ActionableInsightCardComponent } from '../components/actionable-insight-card/actionable-insight-card.component';
import { FundPocketModalComponent } from '../components/fund-pocket-modal/fund-pocket-modal.component';

type FilterType = 'all' | 'pacing' | 'goals' | 'opportunities';

@Component({
  selector: 'ft-insights-page',
  standalone: true,
  imports: [
    CommonModule,
    NgIcon,
    TranslatePipe,
    FtSubtleRevealDirective,
    EmptyStateComponent,
    FinancialHealthHeroComponent,
    ActiveGoalsRadarComponent,
    ActionableInsightCardComponent,
    FundPocketModalComponent,
  ],
  templateUrl: './insights.page.html',
  styleUrl: './insights.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsPage implements OnInit {
  private readonly insightsApi = inject(InsightsApiService);
  private readonly goalsService = inject(GoalsService);
  private readonly pocketsService = inject(PocketsService);
  private readonly i18n = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly pageState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly errorMessage = signal<string>('');

  readonly healthOverview = signal<FinancialHealthOverview | null>(null);
  readonly goals = signal<Goal[]>([]);
  readonly pockets = signal<Pocket[]>([]);
  readonly actionableInsights = signal<ActionableInsight[]>([]);

  readonly activeFilter = signal<FilterType>('all');

  readonly isFundModalOpen = signal<boolean>(false);
  readonly modalPocketId = signal<string | null>(null);
  readonly modalSuggestedAmount = signal<number | null>(null);

  readonly filteredInsights = computed(() => {
    const list = this.actionableInsights().filter((i) => !i.isDismissed);
    const filter = this.activeFilter();

    switch (filter) {
      case 'pacing':
        return list.filter((i) => i.category === 'pacing_alert' || i.category === 'spending' || i.category === 'anomaly');
      case 'goals':
        return list.filter((i) => i.category === 'goal_impact' || i.category === 'positive_milestone');
      case 'opportunities':
        return list.filter((i) => i.category === 'smart_allocation' || i.category === 'leak_optimization' || i.category === 'savings');
      case 'all':
      default:
        return list;
    }
  });

  ngOnInit(): void {
    this.loadAllData();
  }

  retry(): void {
    this.loadAllData();
  }

  setFilter(filter: FilterType): void {
    this.activeFilter.set(filter);
  }

  private loadAllData(): void {
    this.pageState.set('loading');

    forkJoin({
      overview: this.insightsApi.getHealthOverview().pipe(
        catchError(() => of(null)),
      ),
      insightsRes: this.insightsApi.getActionableInsights().pipe(
        catchError(() => of({ insights: [] })),
      ),
      goals: this.goalsService.getGoals().pipe(
        catchError(() => of([])),
      ),
      pockets: this.pocketsService.list().pipe(
        catchError(() => of([])),
      ),
    }).subscribe({
      next: (res) => {
        this.healthOverview.set(res.overview);
        const raw = res.insightsRes as any;
        const list = Array.isArray(raw) ? raw : (raw?.insights || []);
        this.actionableInsights.set(list);
        this.goals.set(res.goals || []);
        this.pockets.set(res.pockets || []);
        this.pageState.set('ready');
      },
      error: (err) => {
        this.errorMessage.set(err?.message || this.i18n.translate('insights.errorLoading'));
        this.pageState.set('error');
      },
    });
  }

  handleActionClick(event: { action: InsightAction; insight: ActionableInsight }): void {
    const { action } = event;

    const actionType = action.actionType || (action as any).type;
    switch (actionType) {
      case 'review_category':
      case 'filter_transactions': {
        const queryParams: Record<string, string> = {};
        if (action.payload?.categoryId) {
          queryParams['category'] = action.payload.categoryId;
        }
        if (action.payload?.startDate) {
          queryParams['startDate'] = action.payload.startDate;
        }
        if (action.payload?.endDate) {
          queryParams['endDate'] = action.payload.endDate;
        }
        this.router.navigate(['/transactions'], { queryParams });
        break;
      }

      case 'fund_pocket': {
        this.modalPocketId.set(action.payload?.pocketId || null);
        this.modalSuggestedAmount.set(action.payload?.suggestedAmount || null);
        this.isFundModalOpen.set(true);
        break;
      }

      case 'adjust_goal_limit':
      case 'view_goal': {
        this.router.navigate(['/goals']);
        break;
      }

      case 'dismiss': {
        this.handleDismiss(event.insight.id);
        break;
      }
    }
  }

  handleDismiss(insightId: string): void {
    this.actionableInsights.update((list) =>
      list.map((i) => (i.id === insightId ? { ...i, isDismissed: true } : i)),
    );
  }

  openFundPocketModal(event: { pocketId: string; goalId?: string; suggestedAmount?: number }): void {
    this.modalPocketId.set(event.pocketId);
    this.modalSuggestedAmount.set(event.suggestedAmount || null);
    this.isFundModalOpen.set(true);
  }

  closeFundPocketModal(): void {
    this.isFundModalOpen.set(false);
    this.modalPocketId.set(null);
    this.modalSuggestedAmount.set(null);
  }

  handleConfirmFund(event: { pocketId: string; amount: number }): void {
    const pocket = this.pockets().find((p) => p.id === event.pocketId);
    if (!pocket) return;

    const newBalance = (pocket.currentBalance || 0) + event.amount;

    this.pocketsService.update(pocket.id, { currentBalance: newBalance }).subscribe({
      next: (updated) => {
        this.toast.success(this.i18n.translate('insights.fundModal.success'));
        this.pockets.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        this.closeFundPocketModal();
      },
      error: () => {
        this.toast.error(this.i18n.translate('insights.fundModal.error'));
      },
    });

  }

  navigateToCreateGoal(): void {
    this.router.navigate(['/goals']);
  }
}
