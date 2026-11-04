/**
 * Tour types — shared contracts for the onboarding tour system.
 *
 * A Tour is a sequence of TourSteps. Each step points at a CSS
 * selector for the highlighted target and carries its own content
 * (title, description, optional CTA).
 */

export type TourTooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface TourStep {
  /** Stable identifier (used for analytics + persistence) */
  id: string;
  /** Translation key for the step title */
  titleKey: string;
  /** Translation key for the step body */
  descriptionKey: string;
  /** CSS selector of the target element to highlight. Use 'body' for full-screen steps. */
  targetSelector: string;
  /** Preferred tooltip position relative to the target */
  tooltipPosition?: TourTooltipPosition;
  /** Optional CTA button (translation key) */
  actionKey?: string;
  /** Optional route to navigate to when CTA is clicked */
  actionRoute?: string;
  /** Optional target route where this step element exists (auto-navigates if different) */
  route?: string;
  /** Max milliseconds to wait for the target selector to appear in DOM (default: 4000) */
  waitForTimeoutMs?: number;
  /** If true, advance automatically after the action is taken */
  autoAdvanceAfterAction?: boolean;
  /** Optional padding around the highlighted target (px) */
  highlightPadding?: number;
}

export type TourStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface TourState {
  status: TourStatus;
  currentStep: number; // 1-based, 0 = not started
  completedAt: string | null;
  updatedAt: number;
  postponedAt?: number;
  activeTourId?: string;
}

export interface TourDefinition {
  id: string;
  titleKey?: string;
  steps: TourStep[];
}

export const DEFAULT_TOUR_STATE: TourState = {
  status: 'not_started',
  currentStep: 1,
  completedAt: null,
  updatedAt: 0,
  postponedAt: undefined,
  activeTourId: 'onboarding',
};
