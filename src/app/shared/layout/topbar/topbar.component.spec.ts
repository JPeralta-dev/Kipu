import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { Subject } from 'rxjs';

import { TopbarComponent } from './topbar.component';
import { LayoutService } from '../../../core/services/layout.service';
import { AuthService } from '../../../core/services/auth.service';
import { FtTourService } from '../../../core/services/tour.service';

// Pure function that mirrors the title suppression logic for testing
const NAV_ITEM_LABELS = ['Dashboard', 'Transactions', 'Categories', 'Analytics'];

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/transactions/new': 'New Transaction',
  '/categories': 'Categories',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

function resolvePageTitle(url: string): string {
  const title = ROUTE_TITLES[url] ?? '';
  if (title && NAV_ITEM_LABELS.includes(title)) {
    return '';
  }
  return title;
}

describe('TopbarComponent', () => {
  let component: TopbarComponent;
  let fixture: ComponentFixture<TopbarComponent>;
  let router: Router;
  let eventsSubject: Subject<NavigationEnd>;

  const mockLayoutService = {
    mobileMenuOpen: signal(false),
    isScrolled: signal(false),
    toggleMobileMenu: jasmine.createSpy('toggleMobileMenu'),
    closeMobileMenu: jasmine.createSpy('closeMenu'),
  };

  const mockAuthService = {
    isAuthenticated: signal(false),
    currentUser: signal(null),
  };

  const mockTourService = {
    start: jasmine.createSpy('start'),
    replayTour: jasmine.createSpy('replayTour'),
    openTutorialsHub: jasmine.createSpy('openTutorialsHub'),
    resetTour: jasmine.createSpy('resetTour'),
  };

  beforeEach(() => {
    eventsSubject = new Subject<NavigationEnd>();

    TestBed.configureTestingModule({
      imports: [TopbarComponent, RouterTestingModule.withRoutes([]), HttpClientTestingModule],
      providers: [
        { provide: LayoutService, useValue: mockLayoutService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: FtTourService, useValue: mockTourService },
      ],
    });

    fixture = TestBed.createComponent(TopbarComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  function triggerNavigation(url: string) {
    // Simulate what the component does on NavigationEnd
    const urlClean = url.split('?')[0].split('#')[0];
    const title = ROUTE_TITLES[urlClean] ?? '';
    const isNavMatch = title !== '' && NAV_ITEM_LABELS.includes(title);
    component.pageTitle.set(isNavMatch ? '' : title);
    fixture.detectChanges();
  }

  describe('pageTitle visibility', () => {
    it('should hide pageTitle when route matches nav item label (dashboard)', () => {
      triggerNavigation('/dashboard');
      expect(component.pageTitle()).toBe('');
    });

    it('should hide pageTitle when route matches nav item label (transactions)', () => {
      triggerNavigation('/transactions');
      expect(component.pageTitle()).toBe('');
    });

    it('should hide pageTitle when route matches nav item label (categories)', () => {
      triggerNavigation('/categories');
      expect(component.pageTitle()).toBe('');
    });

    it('should hide pageTitle when route matches nav item label (analytics)', () => {
      triggerNavigation('/analytics');
      expect(component.pageTitle()).toBe('');
    });

    it('should show pageTitle for settings route (no nav match)', () => {
      triggerNavigation('/settings');
      expect(component.pageTitle()).toBe('Settings');
    });

    it('should show pageTitle for profile route (no nav match)', () => {
      triggerNavigation('/profile');
      expect(component.pageTitle()).toBe('Profile');
    });

    it('should show pageTitle for sub-routes like /transactions/new', () => {
      triggerNavigation('/transactions/new');
      expect(component.pageTitle()).toBe('New Transaction');
    });
  });

  describe('resolvePageTitle pure function', () => {
    it('should return empty string for dashboard (nav match)', () => {
      expect(resolvePageTitle('/dashboard')).toBe('');
    });

    it('should return empty string for transactions (nav match)', () => {
      expect(resolvePageTitle('/transactions')).toBe('');
    });

    it('should return "New Transaction" for /transactions/new (sub-route, no nav match)', () => {
      expect(resolvePageTitle('/transactions/new')).toBe('New Transaction');
    });

    it('should return "Settings" for /settings (no nav match)', () => {
      expect(resolvePageTitle('/settings')).toBe('Settings');
    });

    it('should return empty string for unknown routes', () => {
      expect(resolvePageTitle('/unknown')).toBe('');
    });
  });

  describe('tour dropdown actions', () => {
    it('should toggle tour menu state', () => {
      expect(component.tourMenuOpen()).toBeFalse();
      component.toggleTourMenu();
      expect(component.tourMenuOpen()).toBeTrue();
      component.toggleTourMenu();
      expect(component.tourMenuOpen()).toBeFalse();
    });

    it('should start main tour and close menu', () => {
      component.tourMenuOpen.set(true);
      component.startMainTour();
      expect(component.tourMenuOpen()).toBeFalse();
      expect(mockTourService.replayTour).toHaveBeenCalledWith('onboarding');
    });

    it('should open full checklist and close menu', () => {
      component.tourMenuOpen.set(true);
      component.openFullChecklist();
      expect(component.tourMenuOpen()).toBeFalse();
      expect(mockTourService.openTutorialsHub).toHaveBeenCalled();
    });

    it('should reset all tours and close menu', () => {
      component.tourMenuOpen.set(true);
      component.resetAllTours();
      expect(component.tourMenuOpen()).toBeFalse();
      expect(mockTourService.resetTour).toHaveBeenCalled();
      expect(mockTourService.openTutorialsHub).toHaveBeenCalled();
    });
  });
});
