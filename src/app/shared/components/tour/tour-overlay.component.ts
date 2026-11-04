import {
  Component,
  ChangeDetectionStrategy,
  inject,
  effect,
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
      background: var(--glass-bg, rgba(29, 20, 38, 0.95));
      backdrop-filter: blur(var(--glass-blur, 20px));
      -webkit-backdrop-filter: blur(var(--glass-blur, 20px));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.12));
      border-radius: var(--radius-md, 14px);
      color: var(--text-primary, #F3E8FF);
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55), 0 0 24px rgba(217, 70, 239, 0.15);
      font-family: var(--font-body, 'Inter', sans-serif);
      padding: 18px;
      min-width: 280px;
      max-width: 380px;
      z-index: 100002;
    }

    .ft-driver-popover .driver-popover-title {
      font-family: var(--font-display, 'Space Grotesk', sans-serif);
      font-size: 16px;
      font-weight: 700;
      line-height: 1.35;
      color: var(--text-primary, #F3E8FF);
      margin: 0 0 8px;
    }

    .ft-driver-popover .driver-popover-description {
      font-family: var(--font-body, 'Inter', sans-serif);
      font-size: 13.5px;
      line-height: 1.55;
      color: var(--text-secondary, rgba(243, 232, 255, 0.8));
      margin: 0 0 16px;
    }

    .ft-driver-popover .driver-popover-progress-text {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--accent-start, #D946EF);
    }

    .ft-driver-popover .driver-popover-next-btn,
    .ft-driver-popover .driver-popover-prev-btn,
    .ft-driver-popover .driver-popover-close-btn {
      font-family: var(--font-body, 'Inter', sans-serif);
      font-size: 13px;
      font-weight: 600;
      border-radius: var(--radius-sm, 8px);
      padding: 8px 16px;
      transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease, background 0.15s ease;
      cursor: pointer;
      min-height: 38px;
      text-shadow: none;
      border: 1px solid transparent;
    }

    .ft-driver-popover .driver-popover-next-btn {
      background: linear-gradient(135deg, var(--accent-start, #D946EF), var(--accent-mid, #A855F7));
      color: #ffffff;
      border: none;
      box-shadow: 0 0 16px rgba(217, 70, 239, 0.4);
    }
    .ft-driver-popover .driver-popover-next-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.1);
      box-shadow: 0 0 22px rgba(217, 70, 239, 0.6);
    }
    .ft-driver-popover .driver-popover-next-btn:active {
      transform: scale(0.97);
    }

    .ft-driver-popover .driver-popover-prev-btn {
      background: var(--bg-tertiary, rgba(42, 30, 53, 0.6));
      color: var(--text-secondary, rgba(243, 232, 255, 0.7));
      border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
    }
    .ft-driver-popover .driver-popover-prev-btn:hover {
      color: var(--text-primary, #F3E8FF);
      background: var(--bg-tertiary, rgba(42, 30, 53, 0.9));
    }

    .ft-driver-popover .driver-popover-close-btn {
      background: transparent;
      color: var(--text-tertiary, rgba(243, 232, 255, 0.45));
    }
    .ft-driver-popover .driver-popover-close-btn:hover {
      color: var(--text-primary, #F3E8FF);
      background: var(--bg-tertiary, rgba(42, 30, 53, 0.6));
    }

    .ft-driver-popover .driver-popover-next-btn:focus-visible,
    .ft-driver-popover .driver-popover-prev-btn:focus-visible,
    .ft-driver-popover .driver-popover-close-btn:focus-visible {
      outline: 2px solid var(--accent-start, #D946EF);
      outline-offset: 2px;
    }

    .ft-driver-popover .driver-popover-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .ft-driver-popover .driver-popover-arrow {
      border-color: var(--glass-border, rgba(255, 255, 255, 0.12));
      background: var(--glass-bg, rgba(29, 20, 38, 0.95));
    }

    .driver-highlighted-element {
      border-radius: var(--radius-md, 12px) !important;
      box-shadow:
        0 0 0 2px var(--accent-start, #D946EF),
        0 0 0 6px var(--tour-pulse-glow-mid, rgba(217, 70, 239, 0.35)),
        0 0 35px var(--tour-pulse-glow-dim, rgba(217, 70, 239, 0.2)) !important;
      animation: driver-pulse 2.2s ease-in-out infinite;
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
      background: var(--tour-overlay-bg, rgba(18, 11, 26, 0.88));
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
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
  private isProcessingTransition = false;

  constructor() {
    effect(() => {
      if (this.tour.isActive()) {
        const startIdx = this.tour.currentStepIndex();
        this.zone.runOutsideAngular(() => void this.navigateToStep(startIdx));
      } else {
        this.zone.runOutsideAngular(() => this.destroyDriver());
      }
    });

    this.destroyRef.onDestroy(() => {
      this.destroyDriver();
    });
  }

  private async navigateToStep(targetIndex: number): Promise<void> {
    if (this.isProcessingTransition) return;
    this.isProcessingTransition = true;

    const targetStep = this.tour.steps[targetIndex];
    if (!targetStep) {
      this.isProcessingTransition = false;
      return;
    }

    this.zone.run(() => this.tour.setNavigating(true));

    // Temporarily destroy active driver before route unload
    if (this.driverInstance) {
      this.driverInstance.destroy();
      this.driverInstance = null;
    }

    // Check if target step requires navigation to another route
    const currentRoute = this.router.url.split('?')[0].split('#')[0];
    if (targetStep.route && currentRoute !== targetStep.route) {
      try {
        await this.zone.run(() => this.router.navigateByUrl(targetStep.route!));
      } catch (err) {
        console.warn(`[FtTourOverlay] Navigation failed to ${targetStep.route}:`, err);
      }
    }

    // Wait for the target element to exist in the DOM
    if (targetStep.targetSelector && targetStep.targetSelector !== 'body') {
      try {
        await waitForElement(targetStep.targetSelector, targetStep.waitForTimeoutMs ?? 5000);
        // Settle tick for Angular change detection and transitions
        await new Promise((r) => setTimeout(r, 120));
      } catch (err) {
        console.warn(`[FtTourOverlay] Target "${targetStep.targetSelector}" not found in time:`, err);
      }
    }

    this.zone.run(() => {
      this.tour.setNavigating(false);
      this.tour.syncStepIndex(targetIndex);
    });

    // Mount and drive the tour at targetIndex
    this.zone.runOutsideAngular(() => {
      this.initDriverAndDrive(targetIndex);
    });

    this.isProcessingTransition = false;
  }

  private initDriverAndDrive(startIndex: number): void {
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

      onHighlightStarted: (_element, _step, _opts) => {
        const idx = this.driverInstance?.getActiveIndex();
        if (idx !== undefined && idx >= 0) {
          this.tour.syncStepIndex(idx);
        }
      },

      onCloseClick: () => {
        const currentIdx = this.tour.currentStepIndex();
        this.destroyDriver();
        if (currentIdx >= totalSteps - 1) {
          this.zone.run(() => this.tour.complete());
        } else {
          this.zone.run(() => this.tour.skip());
        }
      },

      onDestroyed: () => {
        this.driverInstance = null;
      },

      onNextClick: async (_element, _step, _opts) => {
        if (this.isProcessingTransition) return;
        const currentIdx = this.tour.currentStepIndex();
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

        // Multi-page async step: navigate and re-target
        const currentRoute = this.router.url.split('?')[0].split('#')[0];
        if (nextStep.route && currentRoute !== nextStep.route) {
          await this.navigateToStep(nextIdx);
        } else {
          // In-page step: smooth transition
          this.driverInstance?.moveNext();
        }
      },

      onPrevClick: async (_element, _step, _opts) => {
        if (this.isProcessingTransition) return;
        const currentIdx = this.tour.currentStepIndex();
        if (currentIdx <= 0) return;

        const prevIdx = currentIdx - 1;
        const prevStep = this.tour.steps[prevIdx];

        if (!prevStep) return;

        const currentRoute = this.router.url.split('?')[0].split('#')[0];
        if (prevStep.route && currentRoute !== prevStep.route) {
          await this.navigateToStep(prevIdx);
        } else {
          this.driverInstance?.movePrevious();
        }
      },
    });

    try {
      this.driverInstance.drive(startIndex);
    } catch (err) {
      console.warn('[FtTourOverlay] Driver failed to start:', err);
      this.zone.run(() => this.tour.skip());
      this.driverInstance = null;
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
