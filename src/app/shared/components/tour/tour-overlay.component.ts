import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
  untracked,
  ViewEncapsulation,
  NgZone,
  DestroyRef,
} from '@angular/core';
import { Router } from '@angular/router';
import type { Driver, DriveStep } from 'driver.js';

import { FtTourService } from '../../../core/services/tour.service';
import { TranslationService } from '../../../core/services/translation.service';
import type { TourStep } from '../../models/tour.types';
import { waitForElement } from '../../utils/dom.utils';

@Component({
  selector: 'ft-tour-overlay',
  standalone: true,
  imports: [],
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  styleUrl: './tour-overlay.component.scss',
})
export class FtTourOverlayComponent {
  protected readonly tour = inject(FtTourService);
  private readonly translation = inject(TranslationService);
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private driverInstance: Driver | null = null;

  constructor() {
    effect(() => {
      const active = this.tour.isActive();
      const session = this.tour.sessionKey();

      if (active) {
        // Read currentStepIndex without tracking so this effect DOES NOT re-fire on step change!
        untracked(() => {
          const startIdx = this.tour.currentStepIndex();
          this.zone.runOutsideAngular(() => {
            void this.startOrResumeTour(startIdx);
          });
        });
      } else {
        this.zone.runOutsideAngular(() => this.destroyDriver());
      }
    });

    this.destroyRef.onDestroy(() => {
      this.destroyDriver();
    });
  }

  private async startOrResumeTour(targetIndex: number): Promise<void> {
    const step = this.tour.steps[targetIndex] ?? this.tour.steps[0];
    if (!step) return;

    // Check if initial step requires navigation to another route
    const currentRoute = this.router.url.split('?')[0].split('#')[0];
    if (step.route && currentRoute !== step.route) {
      this.zone.run(() => this.tour.setNavigating(true));
      try {
        await this.zone.run(() => this.router.navigateByUrl(step.route!));
        await waitForElement(step.targetSelector, step.waitForTimeoutMs ?? 5000);
        await new Promise((r) => setTimeout(r, 120));
      } catch (err) {
        console.warn(`[FtTourOverlay] Navigation failed to ${step.route}:`, err);
      } finally {
        this.zone.run(() => this.tour.setNavigating(false));
      }
    } else if (step.targetSelector && step.targetSelector !== 'body') {
      try {
        await waitForElement(step.targetSelector, step.waitForTimeoutMs ?? 4000);
      } catch {
        // Continue with fallback
      }
    }

    this.zone.runOutsideAngular(() => {
      void this.startDriverAt(targetIndex);
    });
  }

  private async startDriverAt(stepIndex: number): Promise<void> {
    if (this.driverInstance) {
      this.driverInstance.destroy();
      this.driverInstance = null;
    }

    const { driver } = await import('driver.js');
    const steps = this.mapSteps();
    const totalSteps = steps.length;

    this.driverInstance = driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      steps,
      stagePadding: 14,
      stageRadius: 14,
      popoverOffset: 16,
      popoverClass: 'ft-driver-popover',
      overlayColor: '#0c0714',
      overlayOpacity: 0.85,
      smoothScroll: true,
      allowClose: true,
      animate: true,
      disableActiveInteraction: false,

      onHighlightStarted: (_element, _step, opts) => {
        const idx = opts.driver.getActiveIndex();
        if (idx !== undefined && idx >= 0) {
          this.zone.run(() => {
            this.tour.syncStepIndex(idx);
          });
        }
      },

      onCloseClick: () => {
        const currentIdx = this.driverInstance?.getActiveIndex() ?? 0;
        this.destroyDriver();
        this.zone.run(() => {
          if (currentIdx >= totalSteps - 1) {
            this.tour.complete();
          } else {
            this.tour.skip();
          }
        });
      },

      onDestroyed: () => {
        this.driverInstance = null;
      },

      onNextClick: (_element, _step, opts) => {
        const currentIdx = opts.driver.getActiveIndex() ?? 0;
        const isLast = currentIdx >= totalSteps - 1;

        if (isLast) {
          this.destroyDriver();
          this.zone.run(() => this.tour.complete());
          return;
        }

        const nextIdx = currentIdx + 1;
        const nextStep = this.tour.steps[nextIdx];

        if (!nextStep) {
          this.destroyDriver();
          this.zone.run(() => this.tour.complete());
          return;
        }

        // Multi-page navigation check
        const currentRoute = this.router.url.split('?')[0].split('#')[0];
        if (nextStep.route && currentRoute !== nextStep.route) {
          opts.driver.destroy();
          this.zone.run(async () => {
            this.tour.setNavigating(true);
            try {
              await this.router.navigateByUrl(nextStep.route!);
              await waitForElement(nextStep.targetSelector, nextStep.waitForTimeoutMs ?? 5000);
              await new Promise((r) => setTimeout(r, 150));
            } catch (err) {
              console.warn(`[FtTourOverlay] Could not locate ${nextStep.targetSelector} on ${nextStep.route}:`, err);
            } finally {
              this.tour.setNavigating(false);
            }

            this.tour.syncStepIndex(nextIdx);
            this.zone.runOutsideAngular(() => {
              void this.startDriverAt(nextIdx);
            });
          });
        } else {
          // In-page navigation: advance directly!
          opts.driver.moveNext();
        }
      },

      onPrevClick: (_element, _step, opts) => {
        const currentIdx = opts.driver.getActiveIndex() ?? 0;
        if (currentIdx <= 0) return;

        const prevIdx = currentIdx - 1;
        const prevStep = this.tour.steps[prevIdx];
        if (!prevStep) return;

        const currentRoute = this.router.url.split('?')[0].split('#')[0];
        if (prevStep.route && currentRoute !== prevStep.route) {
          opts.driver.destroy();
          this.zone.run(async () => {
            this.tour.setNavigating(true);
            try {
              await this.router.navigateByUrl(prevStep.route!);
              await waitForElement(prevStep.targetSelector, prevStep.waitForTimeoutMs ?? 5000);
              await new Promise((r) => setTimeout(r, 150));
            } catch (err) {
              console.warn(`[FtTourOverlay] Could not locate ${prevStep.targetSelector} on ${prevStep.route}:`, err);
            } finally {
              this.tour.setNavigating(false);
            }

            this.tour.syncStepIndex(prevIdx);
            this.zone.runOutsideAngular(() => {
              void this.startDriverAt(prevIdx);
            });
          });
        } else {
          // In-page navigation: go back directly!
          opts.driver.movePrevious();
        }
      },
    });

    try {
      this.driverInstance.drive(stepIndex);
    } catch (err) {
      console.warn('[FtTourOverlay] Driver failed to start:', err);
      this.zone.run(() => this.tour.skip());
      this.destroyDriver();
    }
  }

  private destroyDriver(): void {
    if (this.driverInstance) {
      this.driverInstance.destroy();
      this.driverInstance = null;
    }
  }

  private mapSteps(): DriveStep[] {
    const isLast = (index: number) => index === this.tour.steps.length - 1;

    return this.tour.steps.map((step: TourStep, index: number): DriveStep => {
      const isLastStep = isLast(index);

      // Safe translation with fallback to defaultTitle
      const translatedTitle = this.translation.translate(step.titleKey);
      const title = (translatedTitle && translatedTitle !== step.titleKey)
        ? translatedTitle
        : (step.defaultTitle ?? step.titleKey);

      // Safe translation with fallback to defaultDescription
      const translatedDesc = this.translation.translate(step.descriptionKey);
      const description = (translatedDesc && translatedDesc !== step.descriptionKey)
        ? translatedDesc
        : (step.defaultDescription ?? step.descriptionKey);

      const isTargetBody = !step.targetSelector || step.targetSelector === 'body';

      return {
        element: isTargetBody ? undefined : step.targetSelector,
        popover: {
          title,
          description,
          side: isTargetBody ? undefined : (step.tooltipPosition === 'auto' ? undefined : step.tooltipPosition),
          align: 'center',
          showButtons: ['next', 'previous', 'close'],
          doneBtnText: this.translateWithFallback('tour.finish', 'Entendido'),
          nextBtnText: isLastStep
            ? this.translateWithFallback('tour.finish', 'Entendido')
            : this.translateWithFallback('tour.next', 'Siguiente'),
          prevBtnText: this.translateWithFallback('tour.previous', 'Atrás'),
        },
      } satisfies DriveStep;
    });
  }

  private translateWithFallback(key: string, fallback: string): string {
    const val = this.translation.translate(key);
    return val && val !== key ? val : fallback;
  }
}
