import { Component, HostListener, inject, AfterViewInit, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { TopbarComponent } from './shared/layout/topbar/topbar.component';
import { CommandPaletteComponent } from './shared/ui/command-palette/command-palette.component';
import { ToastContainerComponent } from './shared/ui/toast/toast.component';
import { CategoryModalComponent } from './shared/ui/category-modal/category-modal.component';
import { FtConsentBannerComponent } from './shared/components/consent-banner.component';
import { FtUpgradeModalComponent } from './shared/ui/upgrade-modal/upgrade-modal.component';
import { FtTourOverlayComponent } from './shared/components/tour/tour-overlay.component';
import { CommandService } from './core/services/command.service';
import { AuthService } from './core/services/auth.service';
import { FtAnalyticsService } from './core/services/analytics.service';
import { TranslationService } from './core/services/translation.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, TopbarComponent, CommandPaletteComponent, ToastContainerComponent, CategoryModalComponent, FtConsentBannerComponent, FtUpgradeModalComponent, FtTourOverlayComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  host: {
    '[class.lang-switching]': 'translationService.isTransitioning()',
  },
})
export class AppComponent implements AfterViewInit {
  private commandService = inject(CommandService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private analytics = inject(FtAnalyticsService);
  private destroyRef = inject(DestroyRef);

  translationService = inject(TranslationService);

  // Rutas públicas donde no se muestra el topbar privado
  private readonly publicRoutes = ['', 'login', 'register'];

  readonly showTopbar = signal(false);
  readonly isLandingRoute = signal(false);

  ngAfterViewInit(): void {
    // Boot analytics (idempotent — re-hydrates queue and consent).
    this.analytics.init();

    // Register global commands
    this.commandService.register([
      { id: 'nav-dashboard', label: 'Go to Dashboard', icon: 'dashboard', shortcut: 'G D', group: 'Navigation', action: () => this.router.navigate(['/dashboard']) },
      { id: 'nav-transactions', label: 'Go to Transactions', icon: 'transactions', shortcut: 'G T', group: 'Navigation', action: () => this.router.navigate(['/transactions']) },
      { id: 'nav-categories', label: 'Go to Categories', icon: 'categories', shortcut: 'G C', group: 'Navigation', action: () => this.router.navigate(['/categories']) },
      { id: 'nav-analytics', label: 'Go to Analytics', icon: 'analytics', shortcut: 'G A', group: 'Navigation', action: () => this.router.navigate(['/analytics']) },
      { id: 'action-new-transaction', label: 'New Transaction', icon: 'plus', shortcut: 'N', group: 'Actions', action: () => this.router.navigate(['/transactions/new']) },
    ]);

    // Listen to route changes to update topbar visibility
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((event) => {
      const nav = event as NavigationEnd;
      this.updateShellVisibility();
      // Track page views for analytics (deferred so it doesn't block render).
      setTimeout(() => this.analytics.trackPageView(nav.urlAfterRedirects), 0);
    });

    // Initial check
    this.updateShellVisibility();
  }

  private updateShellVisibility(): void {
    const rawUrl = this.router.url.split('?')[0].split('#')[0];
    const currentUrl = rawUrl.replace(/^\//, '');
    const isPublicRoute = this.publicRoutes.includes(currentUrl);
    this.showTopbar.set(!isPublicRoute && this.authService.isAuthenticated());
    this.isLandingRoute.set(currentUrl === '');
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // ⌘K or Ctrl+K to open command palette
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.commandService.toggle();
    }
  }
}
