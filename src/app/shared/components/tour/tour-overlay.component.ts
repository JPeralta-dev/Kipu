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
import { driver, type Driver, type DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

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
  styles: [`
    .ft-driver-popover.driver-popover {
      background: var(--glass-bg, rgba(29, 20, 38, 0.95)) !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.15)) !important;
      border-radius: var(--radius-md, 14px) !important;
      color: var(--text-primary, #F3E8FF) !important;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6), 0 0 24px rgba(217, 70, 239, 0.2) !important;
      font-family: var(--font-body, 'Inter', sans-serif) !important;
      padding: 18px !important;
      min-width: 280px !important;
      max-width: 380px !important;
      z-index: 1000000001 !important;
      pointer-events: auto !important;
    }

    .ft-driver-popover * {
      pointer-events: auto !important;
    }

    .ft-driver-popover .driver-popover-title {
      font-family: var(--font-display, 'Space Grotesk', sans-serif) !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      line-height: 1.35 !important;
      color: var(--text-primary, #F3E8FF) !important;
      margin: 0 0 8px !important;
    }

    .ft-driver-popover .driver-popover-description {
      font-family: var(--font-body, 'Inter', sans-serif) !important;
      font-size: 13.5px !important;
      line-height: 1.55 !important;
      color: var(--text-secondary, rgba(243, 232, 255, 0.8)) !important;
      margin: 0 0 16px !important;
    }

    .ft-driver-popover .driver-popover-progress-text {
      font-size: 11px !important;
      font-weight: 700 !important;
      letter-spacing: 0.06em !important;
      text-transform: uppercase !important;
      color: var(--accent-start, #D946EF) !important;
    }

    .ft-driver-popover .driver-popover-next-btn,
    .ft-driver-popover .driver-popover-prev-btn,
    .ft-driver-popover .driver-popover-close-btn {
      font-family: var(--font-body, 'Inter', sans-serif) !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      border-radius: var(--radius-sm, 8px) !important;
      padding: 8px 16px !important;
      transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease, background 0.15s ease !important;
      cursor: pointer !important;
      min-height: 38px !important;
      text-shadow: none !important;
      border: 1px solid transparent !important;
      pointer-events: auto !important;
    }

    .ft-driver-popover .driver-popover-next-btn {
      background: linear-gradient(135deg, var(--accent-start, #D946EF), var(--accent-mid, #A855F7)) !important;
      color: #ffffff !important;
      border: none !important;
      box-shadow: 0 0 16px rgba(217, 70, 239, 0.4) !important;
    }
    .ft-driver-popover .driver-popover-next-btn:hover {
      transform: translateY(-1px) !important;
      filter: brightness(1.1) !important;
      box-shadow: 0 0 22px rgba(217, 70, 239, 0.6) !important;
    }
    .ft-driver-popover .driver-popover-next-btn:active {
      transform: scale(0.97) !important;
    }

    .ft-driver-popover .driver-popover-prev-btn {
      background: var(--bg-tertiary, rgba(42, 30, 53, 0.7)) !important;
      color: var(--text-secondary, rgba(243, 232, 255, 0.75)) !important;
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.1)) !important;
    }
    .ft-driver-popover .driver-popover-prev-btn:hover {
      color: var(--text-primary, #F3E8FF) !important;
      background: var(--bg-tertiary, rgba(42, 30, 53, 0.95)) !important;
    }

    .ft-driver-popover .driver-popover-close-btn {
      background: transparent !important;
      color: var(--text-tertiary, rgba(243, 232, 255, 0.45)) !important;
    }
    .ft-driver-popover .driver-popover-close-btn:hover {
      color: var(--text-primary, #F3E8FF) !important;
      background: var(--bg-tertiary, rgba(42, 30, 53, 0.6)) !important;
    }

    .ft-driver-popover .driver-popover-next-btn:focus-visible,
    .ft-driver-popover .driver-popover-prev-btn:focus-visible,
    .ft-driver-popover .driver-popover-close-btn:focus-visible {
      outline: 2px solid var(--accent-start, #D946EF) !important;
      outline-offset: 2px !important;
    }

    .ft-driver-popover .driver-popover-footer {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 10px !important;
    }

    .ft-driver-popover .driver-popover-arrow {
      border-color: var(--glass-border, rgba(255, 255, 255, 0.12)) !important;
      background: var(--glass-bg, rgba(29, 20, 38, 0.95)) !important;
    }

    .driver-highlighted-element {
      border-radius: var(--radius-md, 12px) !important;
      box-shadow:
        0 0 0 2px var(--accent-start, #D946EF),
        0 0 0 6px var(--tour-pulse-glow-mid, rgba(217, 70, 239, 0.35)),
        0 0 35px var(--tour-pulse-glow-dim, rgba(217, 70, 239, 0.2)) !important;
      animation: driver-pulse 2.2s ease-in-out infinite !important;
    }

    @keyframes driver-pulse {
      0%, 100% {
        box-shadow:
          0 0 0 2px var(--accent-start, #D946EF),
          0 0 0 6px var(--tour-pulse-glow-mid, rgba(217, 70, 239, 0.35)),
          0 0 35px var(--tour-pulse-glow-dim, rgba(217, 70, 239, 0.2));
      }
      50% {
        box-shadow:
          0 0 0 2px var(--accent-start, #D946EF),
          0 0 0 12px var(--tour-pulse-glow-strong, rgba(217, 70, 239, 0.55)),
          0 0 45px var(--tour-pulse-glow-bright, rgba(217, 70, 239, 0.3));
      }
    }

    .driver-overlay {
      background: var(--tour-overlay-bg, rgba(18, 11, 26, 0.88)) !important;
      pointer-events: none !important;
    }

    @media (max-width: 640px) {
      .ft-driver-popover.driver-popover {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        top: auto !important;
        border-radius: var(--radius-lg, 16px) var(--radius-lg, 16px) 0 0 !important;
        max-width: none !important;
        width: 100% !important;
        padding-bottom: max(20px, env(safe-area-inset-bottom, 16px)) !important;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .driver-highlighted-element {
        animation: none !important;
      }
      .ft-driver-popover .driver-popover-next-btn,
      .ft-driver-popover .driver-popover-prev-btn,
      .ft-driver-popover .driver-popover-close-btn {
        transition: none !important;
      }
    }
  `],
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
      this.startDriverAt(targetIndex);
    });
  }

  private startDriverAt(stepIndex: number): void {
    if (this.driverInstance) {
      this.driverInstance.destroy();
      this.driverInstance = null;
    }

    const steps = this.mapSteps();
    const totalSteps = steps.length;

    this.driverInstance = driver({
      showProgress: true,
      progressText: '{{current}} / {{total}}',
      steps,
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'ft-driver-popover',
      overlayColor: 'var(--tour-overlay-bg, rgba(18, 11, 26, 0.88))',
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
              this.startDriverAt(nextIdx);
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
              this.startDriverAt(prevIdx);
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

      return {
        element: step.targetSelector,
        popover: {
          title,
          description,
          side: (step.tooltipPosition === 'auto' ? undefined : step.tooltipPosition),
          showButtons: ['next', 'previous', 'close'],
          doneBtnText: this.translation.translate('tour.finish') || 'Entendido',
          nextBtnText: isLastStep
            ? (this.translation.translate('tour.finish') || 'Entendido')
            : (this.translation.translate('tour.next') || 'Siguiente'),
          prevBtnText: this.translation.translate('tour.previous') || 'Atrás',
        },
      } satisfies DriveStep;
    });
  }
}
