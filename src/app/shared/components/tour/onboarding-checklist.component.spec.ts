import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FtOnboardingChecklistComponent } from './onboarding-checklist.component';
import { FtTourService } from '../../../core/services/tour.service';
import { TelegramLinkService, TelegramLinkState } from '../../../core/services/telegram-link.service';
import { TranslationService } from '../../../core/services/translation.service';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { Router } from '@angular/router';

describe('FtOnboardingChecklistComponent', () => {
  let component: FtOnboardingChecklistComponent;
  let fixture: ComponentFixture<FtOnboardingChecklistComponent>;
  let tourServiceSpy: jasmine.SpyObj<FtTourService>;
  let telegramServiceMock: { state: ReturnType<typeof signal<TelegramLinkState>> };
  let translationServiceMock: { translate: jasmine.Spy };
  let authServiceMock: { currentUser: ReturnType<typeof signal<User | null>> };
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    localStorage.clear();

    tourServiceSpy = jasmine.createSpyObj('FtTourService', [
      'startTour',
      'hasFinishedTour',
    ], {
      lastCompletedTour: signal<{ tourId: string; timestamp: number } | null>(null),
    });
    tourServiceSpy.hasFinishedTour.and.returnValue(false);

    telegramServiceMock = {
      state: signal<TelegramLinkState>('idle'),
    };

    authServiceMock = {
      currentUser: signal<User | null>(null),
    };

    translationServiceMock = {
      translate: jasmine.createSpy('translate').and.callFake((key: string) => key),
    };

    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);

    await TestBed.configureTestingModule({
      imports: [FtOnboardingChecklistComponent],
      providers: [
        { provide: FtTourService, useValue: tourServiceSpy },
        { provide: TelegramLinkService, useValue: telegramServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: TranslationService, useValue: translationServiceMock },
        { provide: Router, useValue: routerSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FtOnboardingChecklistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create and initialize with 4 tasks', () => {
    expect(component).toBeTruthy();
    expect(component.tasks.length).toBe(4);
    expect(component.isCollapsed()).toBe(false);
    expect(component.isDismissed()).toBe(false);
  });

  it('should toggle collapse state and persist', () => {
    component.toggleCollapse();
    expect(component.isCollapsed()).toBe(true);
    expect(localStorage.getItem('kipu_onboarding_checklist_collapsed')).toBe('true');

    component.toggleCollapse();
    expect(component.isCollapsed()).toBe(false);
    expect(localStorage.getItem('kipu_onboarding_checklist_collapsed')).toBe('false');
  });

  it('should dismiss checklist and persist', () => {
    component.dismiss();
    expect(component.isDismissed()).toBe(true);
    expect(localStorage.getItem('kipu_onboarding_checklist_dismissed')).toBe('true');
  });

  it('should toggle task completion manually and update progress', () => {
    expect(component.completedCount()).toBe(0);
    expect(component.progressPercent()).toBe(0);

    component.toggleTask('transaction');
    expect(component.isTaskCompleted('transaction')).toBe(true);
    expect(component.completedCount()).toBe(1);
    expect(component.progressPercent()).toBe(25);

    // Toggle off
    component.toggleTask('transaction');
    expect(component.isTaskCompleted('transaction')).toBe(false);
    expect(component.completedCount()).toBe(0);
  });

  it('should start task mini-tour when requested and collapse checklist', () => {
    const task = component.tasks[0];
    component.startTaskTour(task);

    expect(component.isCollapsed()).toBe(true);
    expect(tourServiceSpy.startTour).toHaveBeenCalledWith(task.tourId);
  });

  it('should mark all completed when all tasks are checked', () => {
    component.tasks.forEach((t) => component.toggleTask(t.id));
    expect(component.isAllCompleted()).toBe(true);
    expect(component.progressPercent()).toBe(100);
  });

  it('should automatically mark task complete and update progress when a tour finishes', () => {
    expect(component.completedCount()).toBe(0);
    expect(component.progressPercent()).toBe(0);

    const signalRef = tourServiceSpy.lastCompletedTour as unknown as ReturnType<typeof signal<{ tourId: string; timestamp: number } | null>>;
    signalRef.set({ tourId: 'new-expense', timestamp: Date.now() });
    TestBed.flushEffects();

    expect(component.isTaskCompleted('transaction')).toBe(true);
    expect(component.completedCount()).toBe(1);
    expect(component.progressPercent()).toBe(25);
  });
});
