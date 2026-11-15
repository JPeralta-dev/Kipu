import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { LayoutService, NavItem } from '../../../core/services/layout.service';
import { NavItemComponent } from '../../layout/nav-item/nav-item.component';
import { MobileMenuComponent } from '../../layout/mobile-menu/mobile-menu.component';
import { MobileMenuItem } from '../../layout/mobile-menu/mobile-menu.types';
import { ICONS } from '../../../shared/icons/icon-registry';
import { ProfileDropdownComponent } from '../../layout/profile-dropdown/profile-dropdown.component';
import { NotificationsDropdownComponent } from '../../layout/notifications-dropdown/notifications-dropdown.component';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { AuthService } from '../../../core/services/auth.service';
import { FtTourService } from '../../../core/services/tour.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { filter } from 'rxjs';

const NAV_ITEMS: NavItem[] = [
  { label: 'nav.home', path: '/home', icon: 'dashboard' },
  { label: 'nav.transactions', path: '/transactions', icon: 'transactions' },
  { label: 'nav.categories', path: '/categories', icon: 'categories' },
  { label: 'nav.pockets', path: '/pockets', icon: 'wallet' },
  { label: 'nav.goals', path: '/goals', icon: 'goals' },
  { label: 'nav.analytics', path: '/analytics', icon: 'analytics' },
  { label: 'nav.insights', path: '/insights', icon: 'insights' },
];

const NAV_ITEM_LABELS = NAV_ITEMS.map((item) => item.label);

const ROUTE_TITLES: Record<string, string> = {
  '/home': 'nav.home',
  '/dashboard': 'nav.home',
  '/transactions': 'nav.transactions',
  '/transactions/new': 'nav.newTransaction',
  '/categories': 'nav.categories',
  '/pockets': 'nav.pockets',
  '/goals': 'nav.goals',
  '/analytics': 'nav.analytics',
  '/insights': 'nav.insights',
  '/settings': 'nav.settings',
  '/profile': 'nav.profile',
};

const PRIVATE_PATHS = Object.keys(ROUTE_TITLES);

@Component({
  selector: 'ft-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon, NavItemComponent, MobileMenuComponent, ProfileDropdownComponent, NotificationsDropdownComponent, ClickOutsideDirective, TranslatePipe],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
})
export class TopbarComponent {
  private readonly layoutService = inject(LayoutService);
  private readonly authService = inject(AuthService);
  private readonly tourService = inject(FtTourService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly navItems = NAV_ITEMS;
  readonly mobileItems: MobileMenuItem[] = NAV_ITEMS;

  readonly mobileMenuOpen = this.layoutService.mobileMenuOpen;
  readonly isScrolled = this.layoutService.isScrolled;
  readonly currentUser = this.authService.currentUser;
  readonly isAuthenticated = this.authService.isAuthenticated;

  readonly pageTitle = signal<string>('');
  readonly showHomeButton = signal<boolean>(false);
  readonly tourMenuOpen = signal<boolean>(false);

  readonly currentPageTour = computed<{ tourId: string; title: string; desc: string } | null>(() => {
    const url = this.router.url.split('?')[0].split('#')[0];
    if (url === '/transactions') {
      return { tourId: 'transactions-list', title: 'tour.menu.txListTour', desc: 'tour.menu.txListTourDesc' };
    }
    if (url === '/transactions/new') {
      return { tourId: 'new-expense', title: 'tour.menu.txNewTour', desc: 'tour.menu.txNewTourDesc' };
    }
    if (url === '/categories') {
      return { tourId: 'categories', title: 'tour.menu.catTour', desc: 'tour.menu.catTourDesc' };
    }
    if (url === '/analytics' || url === '/insights') {
      return { tourId: 'analytics', title: 'tour.menu.analyticsTour', desc: 'tour.menu.analyticsTourDesc' };
    }
    if (url === '/goals') {
      return { tourId: 'goals', title: 'tour.menu.goalsTour', desc: 'tour.menu.goalsTourDesc' };
    }
    if (url === '/pockets') {
      return { tourId: 'pockets', title: 'tour.menu.pocketsTour', desc: 'tour.menu.pocketsTourDesc' };
    }
    if (url === '/settings' || url === '/profile') {
      return { tourId: 'telegram', title: 'tour.menu.settingsTour', desc: 'tour.menu.settingsTourDesc' };
    }
    return null;
  });

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event: NavigationEnd) => {
        const url = event.urlAfterRedirects.split('?')[0].split('#')[0];
        const title = ROUTE_TITLES[url] ?? '';
        const isNavMatch = title !== '' && NAV_ITEM_LABELS.includes(title);
        this.pageTitle.set(isNavMatch ? '' : title);
        // Show home button only on private routes that are NOT main nav pages
        const isPrivate = PRIVATE_PATHS.some(path => url.startsWith(path));
        const isMainNav = NAV_ITEMS.some(item => url === item.path || url.startsWith(item.path + '/'));
        this.showHomeButton.set(isPrivate && !isMainNav);
      });

    // Initialize on component creation
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    const initTitle = ROUTE_TITLES[currentUrl] ?? '';
    const isInitNavMatch = initTitle !== '' && NAV_ITEM_LABELS.includes(initTitle);
    this.pageTitle.set(isInitNavMatch ? '' : initTitle);
    // Show home button only on private routes that are NOT main nav pages
    const isInitPrivate = PRIVATE_PATHS.some(path => currentUrl.startsWith(path));
    const isInitMainNav = NAV_ITEMS.some(item => currentUrl === item.path || currentUrl.startsWith(item.path + '/'));
    this.showHomeButton.set(isInitPrivate && !isInitMainNav);
  }

  onToggleMenu(): void {
    this.layoutService.toggleMobileMenu();
  }

  toggleTourMenu(): void {
    this.tourMenuOpen.update(v => !v);
  }

  startCurrentPageTour(): void {
    const pt = this.currentPageTour();
    this.tourMenuOpen.set(false);
    if (pt) {
      this.tourService.replayTour(pt.tourId);
    }
  }

  startMainTour(): void {
    this.tourMenuOpen.set(false);
    this.tourService.replayTour('onboarding');
  }

  openFullChecklist(): void {
    this.tourMenuOpen.set(false);
    this.tourService.openTutorialsHub();
  }

  resetAllTours(): void {
    this.tourMenuOpen.set(false);
    this.tourService.resetTour();
    this.tourService.openTutorialsHub();
  }

  onCloseMenu(): void {
    this.layoutService.closeMobileMenu();
  }

  getLogoLink(): string {
    return this.isAuthenticated() ? '/home' : '/';
  }
}
