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
    .driver-popover.ft-driver-popover,
    .driver-popover {
      position: fixed !important;
      display: block !important;
      box-sizing: border-box !important;
      visibility: visible !important;
      opacity: 1 !important;
      z-index: 1000000005 !important;
      pointer-events: auto !important;

      background: var(--glass-bg, rgba(29, 20, 38, 0.98)) !important;
      backdrop-filter: blur(24px) !important;
      -webkit-backdrop-filter: blur(24px) !important;
      border: 1px solid rgba(217, 70, 239, 0.35) !important;
      border-radius: var(--radius-lg, 16px) !important;
      color: var(--text-primary, #F3E8FF) !important;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(217, 70, 239, 0.25) !important;
      font-family: var(--font-body, 'Inter', sans-serif) !important;
      padding: 20px !important;
      min-width: 290px !important;
      max-width: 390px !important;
    }

    .ft-driver-popover * {
      box-sizing: border-box !important;
      pointer-events: auto !important;
    }

    .ft-driver-popover .driver-popover-title {
      display: block !important;
      font-family: var(--font-display, 'Space Grotesk', sans-serif) !important;
      font-size: 16px !important;
      font-weight: 700 !important;
      line-height: 1.35 !important;
      color: var(--text-primary, #F3E8FF) !important;
      margin: 0 0 8px !important;
      padding-right: 28px !important;
    }

    .ft-driver-popover .driver-popover-description {
      display: block !important;
      font-family: var(--font-body, 'Inter', sans-serif) !important;
      font-size: 13.5px !important;
      line-height: 1.55 !important;
      color: var(--text-secondary, rgba(243, 232, 255, 0.85)) !important;
      margin: 0 0 16px !important;
    }

    .ft-driver-popover .driver-popover-progress-text {
      font-size: 11px !important;
      font-weight: 700 !important;
      letter-spacing: 0.08em !important;
      text-transform: uppercase !important;
      color: var(--accent-start, #D946EF) !important;
    }

    .ft-driver-popover .driver-popover-navigation-btns {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      margin-left: auto !important;
    }

    .ft-driver-popover .driver-popover-next-btn,
    .ft-driver-popover .driver-popover-prev-btn {
      font-family: var(--font-body, 'Inter', sans-serif) !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      border-radius: var(--radius-sm, 8px) !important;
      padding: 8px 16px !important;
      transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease, background 0.15s ease !important;
      cursor: pointer !important;
      min-height: 36px !important;
      text-shadow: none !important;
      pointer-events: auto !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    .ft-driver-popover .driver-popover-close-btn {
      position: absolute !important;
      top: 14px !important;
      right: 14px !important;
      width: 28px !important;
      height: 28px !important;
      min-height: unset !important;
      padding: 0 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      border-radius: 6px !important;
      background: transparent !important;
      color: var(--text-tertiary, rgba(243, 232, 255, 0.5)) !important;
      font-size: 20px !important;
      line-height: 1 !important;
      cursor: pointer !important;
      border: none !important;
    }

    .ft-driver-popover .driver-popover-close-btn:hover {
      color: var(--text-primary, #F3E8FF) !important;
      background: rgba(255, 255, 255, 0.1) !important;
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

    /* ─── Arrow (Triangular pointer with amethyst glow) ─── */
    .driver-popover-arrow {
      width: 0 !important;
      height: 0 !important;
      background: transparent !important;
      border: 8px solid transparent !important;
      position: absolute !important;
      z-index: 1000000006 !important;
    }

    .driver-popover-arrow-side-bottom {
      border-color: transparent !important;
      border-bottom-color: rgba(29, 20, 38, 0.98) !important;
      bottom: 100% !important;
      filter: drop-shadow(0 -2px 3px rgba(217, 70, 239, 0.5)) !important;
    }

    .driver-popover-arrow-side-top {
      border-color: transparent !important;
      border-top-color: rgba(29, 20, 38, 0.98) !important;
      top: 100% !important;
      filter: drop-shadow(0 2px 3px rgba(217, 70, 239, 0.5)) !important;
    }

    .driver-popover-arrow-side-right {
      border-color: transparent !important;
      border-right-color: rgba(29, 20, 38, 0.98) !important;
      right: 100% !important;
      filter: drop-shadow(-2px 0 3px rgba(217, 70, 239, 0.5)) !important;
    }

    .driver-popover-arrow-side-left {
      border-color: transparent !important;
      border-left-color: rgba(29, 20, 38, 0.98) !important;
      left: 100% !important;
      filter: drop-shadow(2px 0 3px rgba(217, 70, 239, 0.5)) !important;
    }

    .driver-popover-arrow-side-over,
    .driver-popover-arrow-none {
      display: none !important;
    }

    /* ─── Active Highlighted Element (Subtle Spotlight Frame) ─── */
    .driver-active-element {
      position: relative !important;
      z-index: 10002 !important;
      outline: none !important;
      border-radius: var(--radius-md, 12px) !important;
      box-shadow:
        0 0 0 1px rgba(217, 70, 239, 0.75),
        0 0 16px rgba(217, 70, 239, 0.25) !important;
      animation: driver-active-subtle-pulse 2.5s ease-in-out infinite !important;
      pointer-events: auto !important;
      transition: box-shadow 0.25s ease !important;
    }

    @keyframes driver-active-subtle-pulse {
      0%, 100% {
        box-shadow:
          0 0 0 1px rgba(217, 70, 239, 0.55),
          0 0 10px rgba(217, 70, 239, 0.15);
      }
      50% {
        box-shadow:
          0 0 0 1.5px rgba(217, 70, 239, 0.9),
          0 0 20px rgba(217, 70, 239, 0.35);
      }
    }

    /* ─── Transparent SVG Overlay so hole/cutout is 100% visible ─── */
    .driver-overlay {
      background: transparent !important;
      pointer-events: auto !important;
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
      .driver-active-element {
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
      popoverOffset: 14,
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

      const isTargetBody = !step.targetSelector || step.targetSelector === 'body';

      return {
        element: isTargetBody ? undefined : step.targetSelector,
        popover: {
          title,
          description,
          side: isTargetBody ? undefined : (step.tooltipPosition === 'auto' ? undefined : step.tooltipPosition),
          align: 'center',
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
