import { TestBed, fakeAsync } from '@angular/core/testing';
import { FtTourService } from './tour.service';
import { FtAnalyticsService } from './analytics.service';
import { TourStep } from '../../shared/models/tour.types';

describe('FtTourService', () => {
  let service: FtTourService;
  let analyticsMock: jasmine.SpyObj<FtAnalyticsService>;

  beforeEach(() => {
    localStorage.clear();
    analyticsMock = jasmine.createSpyObj<FtAnalyticsService>('FtAnalyticsService', ['trackEvent']);
    TestBed.configureTestingModule({
      providers: [
        { provide: FtAnalyticsService, useValue: analyticsMock },
      ],
    });
    service = TestBed.inject(FtTourService);
  });

  it('should expose 5 onboarding steps', () => {
    expect(service.totalSteps).toBe(5);
    expect(service.steps.length).toBe(5);
  });

  it('should not be active by default', () => {
    expect(service.isActive()).toBe(false);
    expect(service.shouldPromptForTour()).toBe(true);
  });

  it('should auto-start for brand new users', () => {
    expect(service.shouldAutoStart()).toBe(true);
    expect(service.shouldShowTriggerCard()).toBe(false);
  });

  it('should not auto-start after postpone', () => {
    service.postpone();
    expect(service.shouldAutoStart()).toBe(false);
    expect(service.shouldShowTriggerCard()).toBe(false);
  });

  it('should show trigger card after postpone cooldown', fakeAsync(() => {
    service.postpone();
    // Advance time past the 1-hour cooldown
    const future = Date.now() + 60 * 60 * 1000 + 1;
    jasmine.clock().mockDate(new Date(future));
    expect(service.shouldShowTriggerCard()).toBe(true);
  }));

  it('should not show trigger card while tour is active', () => {
    service.start();
    expect(service.shouldShowTriggerCard()).toBe(false);
  });

  it('should not show trigger card after completion', () => {
    service.start();
    for (let i = 0; i < 4; i++) service.next();
    service.next(); // completes
    expect(service.shouldShowTriggerCard()).toBe(false);
  });

  it('should not show trigger card after skip', () => {
    service.start();
    service.skip();
    expect(service.shouldShowTriggerCard()).toBe(false);
  });

  it('should start the tour at step 1 and fire analytics', () => {
    service.start();
    expect(service.isActive()).toBe(true);
    expect(service.currentStepNumber()).toBe(1);
    expect(analyticsMock.trackEvent).toHaveBeenCalledWith(
      'onboarding_tour_started',
      jasmine.objectContaining({ step: 1 }),
    );
  });

  it('should advance to the next step on next()', () => {
    service.start();
    service.next();
    expect(service.currentStepNumber()).toBe(2);
    expect(analyticsMock.trackEvent).toHaveBeenCalledWith(
      'onboarding_tour_step_viewed',
      jasmine.objectContaining({ step: 2 }),
    );
  });

  it('should go back on previous() but not below 1', () => {
    service.start();
    service.next();
    service.previous();
    expect(service.currentStepNumber()).toBe(1);
    service.previous();
    expect(service.currentStepNumber()).toBe(1); // clamped
  });

  it('should complete on next() from the last step', () => {
    service.start();
    for (let i = 0; i < 4; i++) service.next();
    expect(service.currentStepNumber()).toBe(5);
    service.next();
    expect(service.isActive()).toBe(false);
    expect(analyticsMock.trackEvent).toHaveBeenCalledWith('onboarding_tour_completed', jasmine.any(Object));
    expect(service.tourState().status).toBe('completed');
  });

  it('should skip and persist skipped state', () => {
    service.start();
    service.next();
    service.skip();
    expect(service.isActive()).toBe(false);
    expect(service.tourState().status).toBe('skipped');
    expect(service.hasFinishedTour()).toBe(true);
  });

  it('should postpone without marking as skipped', () => {
    service.postpone();
    expect(service.tourState().status).toBe('not_started');
    expect(service.hasFinishedTour()).toBe(false);
    expect(service.tourState().postponedAt).toBeDefined();
  });

  it('should resume from the last step on start() when status is in_progress', () => {
    service.start();
    service.next();
    service.next();
    service.stop();
    const fresh = TestBed.inject(FtTourService);
    fresh.start();
    expect(fresh.currentStepNumber()).toBe(3);
  });

  it('should reset on resetTour() including postponedAt', () => {
    service.start();
    service.skip();
    service.resetTour();
    expect(service.tourState().status).toBe('not_started');
    expect(service.hasFinishedTour()).toBe(false);
    expect(service.tourState().postponedAt).toBeUndefined();
    expect(service.shouldAutoStart()).toBe(true);
  });

  it('shouldAutoStart returns false after start() is called', () => {
    expect(service.shouldAutoStart()).toBe(true);
    service.start();
    expect(service.shouldAutoStart()).toBe(false);
  });

  it('should set postponedAt on postpone()', () => {
    service.postpone();
    expect(service.tourState().postponedAt).toBeGreaterThan(0);
  });

  it('should support starting contextual mini-tours', () => {
    service.startTour('categories');
    expect(service.activeTourId()).toBe('categories');
    expect(service.isActive()).toBe(true);
    expect(service.steps.length).toBe(2);
    expect(service.currentStepNumber()).toBe(1);
  });

  it('should allow registering custom tours dynamically', () => {
    const customSteps: TourStep[] = [
      {
        id: 'step-1',
        titleKey: 'custom.title',
        descriptionKey: 'custom.desc',
        targetSelector: 'body',
      },
    ];
    service.registerTour('custom-tour', customSteps);
    service.startTour('custom-tour');
    expect(service.activeTourId()).toBe('custom-tour');
    expect(service.totalSteps).toBe(1);
  });
});
