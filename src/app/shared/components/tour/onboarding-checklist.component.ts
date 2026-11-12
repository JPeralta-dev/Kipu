import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  untracked,
  ViewEncapsulation,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../../icons/icon.component';
import { FtTourService } from '../../../core/services/tour.service';
import { TelegramLinkService } from '../../../core/services/telegram-link.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

export interface ChecklistTask {
  id: string;
  titleKey: string;
  descKey: string;
  tourId: string;
  route: string;
  icon: string;
}

const CHECKLIST_STORAGE_KEY = 'kipu_onboarding_checklist_tasks';
const CHECKLIST_DISMISSED_KEY = 'kipu_onboarding_checklist_dismissed';
const CHECKLIST_COLLAPSED_KEY = 'kipu_onboarding_checklist_collapsed';

@Component({
  selector: 'ft-onboarding-checklist',
  standalone: true,
  imports: [CommonModule, IconComponent, TranslatePipe],
  template: `
    @if (!isDismissed()) {
      <aside
        class="onboarding-checklist"
        [class.onboarding-checklist--collapsed]="isCollapsed()"
        [class.onboarding-checklist--all-done]="isAllCompleted()"
        [attr.aria-label]="'tour.checklist.title' | translate"
      >
        <!-- COLLAPSED PILL VIEW -->
        @if (isCollapsed()) {
          <button
            type="button"
            class="checklist-pill-btn"
            (click)="toggleCollapse()"
            [attr.aria-label]="'tour.checklist.openGuide' | translate"
          >
            <div class="checklist-pill-btn__sparkle">
              <ft-icon name="sparkles" [size]="15" />
            </div>
            <span class="checklist-pill-btn__label">
              {{ 'tour.checklist.title' | translate }}
            </span>
            <span class="checklist-pill-btn__badge">
              {{ completedCount() }}/{{ tasks.length }}
            </span>
            <div class="checklist-pill-btn__arrow">
              <ft-icon name="chevron-left" [size]="14" />
            </div>
          </button>
        } @else {
          <!-- EXPANDED CARD VIEW -->
          <div class="checklist-card">
            <!-- Header -->
            <header class="checklist-card__header">
              <div class="checklist-card__title-row">
                <div class="checklist-card__sparkle-icon">
                  <ft-icon name="sparkles" [size]="16" />
                </div>
                <div>
                  <h3 class="checklist-card__title">
                    {{ 'tour.checklist.title' | translate }}
                  </h3>
                  <p class="checklist-card__subtitle">
                    {{ 'tour.checklist.subtitle' | translate }}
                  </p>
                </div>
              </div>

              <div class="checklist-card__actions">
                <button
                  type="button"
                  class="icon-btn"
                  (click)="toggleCollapse()"
                  [title]="'tour.checklist.minimize' | translate"
                  [attr.aria-label]="'tour.checklist.minimize' | translate"
                >
                  <ft-icon name="chevron-down" [size]="16" />
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  (click)="dismiss()"
                  [title]="'tour.checklist.hide' | translate"
                  [attr.aria-label]="'tour.checklist.hide' | translate"
                >
                  <ft-icon name="x" [size]="16" />
                </button>
              </div>
            </header>

            <!-- Progress section -->
            <div class="checklist-progress">
              <div class="checklist-progress__meta">
                <span class="checklist-progress__counter">
                  {{ completedCount() }} {{ 'tour.checklist.of' | translate }} {{ tasks.length }} {{ 'tour.checklist.completed' | translate }}
                </span>
                <span class="checklist-progress__percent">{{ progressPercent() }}%</span>
              </div>
              <div class="checklist-progress__track" role="progressbar" [attr.aria-valuenow]="progressPercent()" aria-valuemin="0" aria-valuemax="100">
                <div
                  class="checklist-progress__fill"
                  [style.width.%]="progressPercent()"
                ></div>
              </div>
            </div>

            <!-- Task List -->
            <ul class="checklist-tasks" role="list">
              @for (task of tasks; track task.id) {
                <li
                  class="checklist-task-item"
                  [class.checklist-task-item--done]="isTaskCompleted(task.id)"
                >
                  <button
                    type="button"
                    class="task-check-btn"
                    [class.task-check-btn--checked]="isTaskCompleted(task.id)"
                    (click)="toggleTask(task.id)"
                    [attr.aria-label]="(isTaskCompleted(task.id) ? 'tour.checklist.markPending' : 'tour.checklist.markCompleted') | translate"
                  >
                    @if (isTaskCompleted(task.id)) {
                      <ft-icon name="check" [size]="14" />
                    }
                  </button>

                  <div class="task-details">
                    <span class="task-title">
                      {{ task.titleKey | translate }}
                    </span>
                    <span class="task-desc">
                      {{ task.descKey | translate }}
                    </span>
                  </div>

                  <button
                    type="button"
                    class="task-action-btn"
                    (click)="startTaskTour(task)"
                    [title]="'tour.checklist.startTour' | translate"
                  >
                    <ft-icon [name]="task.icon" [size]="14" />
                    <span>{{ (isTaskCompleted(task.id) ? 'tour.checklist.replayBtn' : 'tour.checklist.tourBtn') | translate }}</span>
                  </button>
                </li>
              }
            </ul>

            <!-- All Done Celebration / Footer -->
            @if (isAllCompleted()) {
              <div class="checklist-congrats">
                <span class="congrats-emoji">🎉</span>
                <p class="congrats-text">
                  {{ 'tour.checklist.allDone' | translate }}
                </p>
                <button type="button" class="congrats-dismiss-btn" (click)="dismiss()">
                  {{ 'tour.checklist.gotIt' | translate }}
                </button>
              </div>
            } @else {
              <footer class="checklist-card__footer">
                <button type="button" class="hide-checklist-link" (click)="dismiss()">
                  {{ 'tour.checklist.hide' | translate }}
                </button>
              </footer>
            }
          </div>
        }
      </aside>
    }
  `,
  styles: [`
    .onboarding-checklist {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9998;
      font-family: var(--font-body, 'Inter', sans-serif);
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
    }

    /* ─── Collapsed Pill ─── */
    .checklist-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: var(--glass-bg, rgba(29, 20, 38, 0.88));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      border-radius: 9999px;
      padding: 10px 18px;
      color: var(--text-primary, #F3E8FF);
      cursor: pointer;
      box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.4));
      transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .checklist-pill-btn:hover {
      transform: translateY(-2px);
      border-color: var(--accent-start, #D946EF);
      box-shadow: 0 8px 30px rgba(217, 70, 239, 0.25);
    }

    .checklist-pill-btn__sparkle {
      color: var(--accent-start, #D946EF);
      display: flex;
      align-items: center;
    }

    .checklist-pill-btn__label {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .checklist-pill-btn__badge {
      font-size: 11px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent-start, #D946EF), var(--accent-mid, #A855F7));
      color: #fff;
      padding: 2px 7px;
      border-radius: 9999px;
      box-shadow: 0 0 12px rgba(217, 70, 239, 0.3);
    }

    .checklist-pill-btn__arrow {
      color: var(--text-tertiary, rgba(243, 232, 255, 0.5));
      display: flex;
      align-items: center;
    }

    /* ─── Expanded Card ─── */
    .checklist-card {
      width: 360px;
      max-width: calc(100vw - 32px);
      background: var(--glass-bg, rgba(29, 20, 38, 0.94));
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
      border-radius: var(--radius-lg, 16px);
      box-shadow: var(--shadow-xl, 0 20px 50px rgba(0, 0, 0, 0.5));
      padding: 20px;
      color: var(--text-primary, #F3E8FF);
      animation: card-appear 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes card-appear {
      from {
        opacity: 0;
        transform: translateY(12px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .checklist-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .checklist-card__title-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .checklist-card__sparkle-icon {
      color: var(--accent-start, #D946EF);
      padding-top: 2px;
    }

    .checklist-card__title {
      font-family: var(--font-display, 'Space Grotesk', sans-serif);
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary, #F3E8FF);
      margin: 0;
      line-height: 1.25;
    }

    .checklist-card__subtitle {
      font-size: 12px;
      color: var(--text-secondary, rgba(243, 232, 255, 0.7));
      margin: 3px 0 0;
    }

    .checklist-card__actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .icon-btn {
      background: transparent;
      border: none;
      color: var(--text-tertiary, rgba(243, 232, 255, 0.45));
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s ease, background 0.15s ease;
    }

    .icon-btn:hover {
      color: var(--text-primary, #F3E8FF);
      background: var(--bg-tertiary, rgba(42, 30, 53, 0.6));
    }

    /* ─── Progress Bar ─── */
    .checklist-progress {
      margin-bottom: 16px;
    }

    .checklist-progress__meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .checklist-progress__counter {
      color: var(--text-secondary, rgba(243, 232, 255, 0.75));
    }

    .checklist-progress__percent {
      color: var(--accent-start, #D946EF);
      font-weight: 700;
    }

    .checklist-progress__track {
      width: 100%;
      height: 6px;
      background: var(--bg-tertiary, rgba(42, 30, 53, 0.6));
      border-radius: 9999px;
      overflow: hidden;
    }

    .checklist-progress__fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-start, #D946EF), var(--accent-mid, #A855F7));
      border-radius: 9999px;
      transition: width 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 0 10px rgba(217, 70, 239, 0.5);
    }

    /* ─── Task List ─── */
    .checklist-tasks {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .checklist-task-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-sm, 10px);
      background: var(--bg-secondary, rgba(29, 20, 38, 0.5));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.06));
      transition: border-color 0.15s ease, background 0.15s ease;
    }

    .checklist-task-item:hover {
      background: var(--bg-tertiary, rgba(42, 30, 53, 0.7));
      border-color: var(--glass-border-hover, rgba(255, 255, 255, 0.16));
    }

    .checklist-task-item--done {
      opacity: 0.65;
    }

    .checklist-task-item--done .task-title {
      text-decoration: line-through;
      color: var(--text-tertiary, rgba(243, 232, 255, 0.45));
    }

    .task-check-btn {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 1.5px solid var(--border-strong, rgba(255, 255, 255, 0.2));
      background: transparent;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-top: 1px;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .task-check-btn--checked {
      background: linear-gradient(135deg, var(--accent-start, #D946EF), var(--accent-mid, #A855F7));
      border-color: transparent;
      box-shadow: 0 0 10px rgba(217, 70, 239, 0.4);
    }

    .task-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .task-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary, #F3E8FF);
      line-height: 1.3;
      overflow-wrap: break-word;
      word-break: break-word;
    }

    .task-desc {
      font-size: 11px;
      color: var(--text-secondary, rgba(243, 232, 255, 0.65));
      line-height: 1.4;
      overflow-wrap: break-word;
      word-break: break-word;
    }

    .task-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-primary, #F3E8FF);
      background: var(--bg-tertiary, rgba(42, 30, 53, 0.8));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1));
      border-radius: 6px;
      padding: 5px 9px;
      cursor: pointer;
      flex-shrink: 0;
      margin-top: 2px;
      transition: all 0.15s ease;
    }

    .task-action-btn:hover {
      background: linear-gradient(135deg, var(--accent-start, #D946EF), var(--accent-mid, #A855F7));
      border-color: transparent;
      transform: translateY(-1px);
      box-shadow: 0 0 12px rgba(217, 70, 239, 0.35);
    }

    /* ─── Celebration & Footer ─── */
    .checklist-congrats {
      margin-top: 16px;
      padding: 14px;
      background: rgba(6, 214, 160, 0.08);
      border: 1px solid rgba(6, 214, 160, 0.25);
      border-radius: 10px;
      text-align: center;
    }

    .congrats-emoji {
      font-size: 22px;
      display: block;
      margin-bottom: 4px;
    }

    .congrats-text {
      font-size: 12px;
      font-weight: 500;
      color: var(--text-primary, #F3E8FF);
      margin: 0 0 10px;
    }

    .congrats-dismiss-btn {
      font-size: 12px;
      font-weight: 600;
      background: linear-gradient(135deg, var(--accent-start, #D946EF), var(--accent-mid, #A855F7));
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
      cursor: pointer;
    }

    .checklist-card__footer {
      margin-top: 14px;
      text-align: center;
    }

    .hide-checklist-link {
      background: transparent;
      border: none;
      font-size: 11px;
      color: var(--text-tertiary, rgba(243, 232, 255, 0.45));
      cursor: pointer;
      transition: color 0.15s ease;
    }

    .hide-checklist-link:hover {
      color: var(--text-secondary, rgba(243, 232, 255, 0.75));
      text-decoration: underline;
    }

    @media (max-width: 480px) {
      .onboarding-checklist {
        bottom: 16px;
        right: 16px;
        left: 16px;
      }
      .checklist-card {
        width: 100%;
        max-width: 100%;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class FtOnboardingChecklistComponent implements OnInit {
  private readonly tourService = inject(FtTourService);
  private readonly telegramService = inject(TelegramLinkService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly tasks: ChecklistTask[] = [
    {
      id: 'transaction',
      titleKey: 'tour.checklist.transaction.title',
      descKey: 'tour.checklist.transaction.desc',
      tourId: 'new-expense',
      route: '/transactions/new',
      icon: 'plus',
    },
    {
      id: 'categories',
      titleKey: 'tour.checklist.categories.title',
      descKey: 'tour.checklist.categories.desc',
      tourId: 'categories',
      route: '/categories',
      icon: 'tag',
    },
    {
      id: 'telegram',
      titleKey: 'tour.checklist.telegram.title',
      descKey: 'tour.checklist.telegram.desc',
      tourId: 'telegram',
      route: '/settings',
      icon: 'bolt',
    },
    {
      id: 'tour',
      titleKey: 'tour.checklist.tour.title',
      descKey: 'tour.checklist.tour.desc',
      tourId: 'onboarding',
      route: '/home',
      icon: 'sparkles',
    },
  ];

  // State
  readonly isCollapsed = signal<boolean>(false);
  readonly isDismissed = signal<boolean>(false);
  readonly completedTasks = signal<Set<string>>(new Set());

  readonly completedCount = computed(() => this.completedTasks().size);
  readonly progressPercent = computed(() =>
    Math.round((this.completedCount() / this.tasks.length) * 100)
  );
  readonly isAllCompleted = computed(
    () => this.completedCount() === this.tasks.length
  );

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      untracked(() => {
        this.restoreState();
        this.checkAutomaticCompletions();
      });
    });

    effect(() => {
      const completed = this.tourService.lastCompletedTour();
      if (completed) {
        untracked(() => {
          this.handleTourCompleted(completed.tourId);
        });
      }
    });

    effect(() => {
      const tgState = this.telegramService.state();
      if (tgState === 'linked') {
        untracked(() => {
          this.markTaskDone('telegram');
        });
      }
    });

    effect(() => {
      const req = this.tourService.checklistOpenRequest();
      if (req > 0) {
        untracked(() => {
          this.reopen();
        });
      }
    });
  }

  ngOnInit(): void {
    this.restoreState();
    this.checkAutomaticCompletions();
  }

  isTaskCompleted(taskId: string): boolean {
    return this.completedTasks().has(taskId);
  }

  private handleTourCompleted(tourId: string): void {
    const task = this.tasks.find((t) => t.tourId === tourId);
    if (task) {
      this.markTaskDone(task.id);
      this.isCollapsed.set(false);
    }
  }

  private markTaskDone(taskId: string): void {
    const current = new Set(this.completedTasks());
    if (!current.has(taskId)) {
      current.add(taskId);
      this.completedTasks.set(current);
      this.persistTasks(current);
    }
  }

  toggleCollapse(): void {
    const next = !this.isCollapsed();
    this.isCollapsed.set(next);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.getStorageKey(CHECKLIST_COLLAPSED_KEY), JSON.stringify(next));
    }
  }

  dismiss(): void {
    this.isDismissed.set(true);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.getStorageKey(CHECKLIST_DISMISSED_KEY), 'true');
    }
  }

  reopen(): void {
    this.isDismissed.set(false);
    this.isCollapsed.set(false);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.getStorageKey(CHECKLIST_DISMISSED_KEY));
      localStorage.setItem(this.getStorageKey(CHECKLIST_COLLAPSED_KEY), 'false');
    }
  }

  toggleTask(taskId: string): void {
    const current = new Set(this.completedTasks());
    if (current.has(taskId)) {
      current.delete(taskId);
    } else {
      current.add(taskId);
    }
    this.completedTasks.set(current);
    this.persistTasks(current);
  }

  startTaskTour(task: ChecklistTask): void {
    // Minimize checklist during tour so it doesn't obstruct popovers
    this.isCollapsed.set(true);
    this.tourService.replayTour(task.tourId);
  }

  private getStorageKey(baseKey: string): string {
    const userId = this.authService.currentUser()?.id;
    return userId ? `${baseKey}_${userId}` : baseKey;
  }

  private checkAutomaticCompletions(): void {
    const current = new Set(this.completedTasks());
    let modified = false;

    // Check if Telegram is linked
    if (this.telegramService.state() === 'linked' && !current.has('telegram')) {
      current.add('telegram');
      modified = true;
    }

    // Check if main tour is completed
    if (this.tourService.hasFinishedTour() && !current.has('tour')) {
      current.add('tour');
      modified = true;
    }

    if (modified) {
      this.completedTasks.set(current);
      this.persistTasks(current);
    }
  }

  private restoreState(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const dismissed = localStorage.getItem(this.getStorageKey(CHECKLIST_DISMISSED_KEY));
      this.isDismissed.set(dismissed === 'true');

      const collapsed = localStorage.getItem(this.getStorageKey(CHECKLIST_COLLAPSED_KEY));
      this.isCollapsed.set(collapsed !== null ? JSON.parse(collapsed) : false);

      const rawTasks = localStorage.getItem(this.getStorageKey(CHECKLIST_STORAGE_KEY));
      if (rawTasks) {
        const parsed = JSON.parse(rawTasks) as string[];
        this.completedTasks.set(new Set(parsed));
      } else {
        this.completedTasks.set(new Set());
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }

  private persistTasks(tasksSet: Set<string>): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        this.getStorageKey(CHECKLIST_STORAGE_KEY),
        JSON.stringify(Array.from(tasksSet))
      );
    } catch {
      // Ignore quota errors
    }
  }
}
