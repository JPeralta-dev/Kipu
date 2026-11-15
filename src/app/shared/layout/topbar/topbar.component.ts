import { Component, inject, signal, DestroyRef } from '@angular/core';
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
  imports: [CommonModule, RouterLink, NgIcon, NavItemComponent, MobileMenuComponent, ProfileDropdownComponent, NotificationsDropdownComponent, TranslatePipe],
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

  onOpenTour(): void {
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    this.tourService.openTutorialsHub();
    if (currentUrl === '/home' || currentUrl === '/dashboard') {
      this.tourService.replayTour('onboarding');
    }
  }

  onCloseMenu(): void {
    this.layoutService.closeMobileMenu();
  }

  getLogoLink(): string {
    return this.isAuthenticated() ? '/home' : '/';
  }
}
