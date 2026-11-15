import { Component, input, output, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { tap } from 'rxjs/operators';
import { NavItemComponent } from '../nav-item/nav-item.component';
import { MobileMenuItem } from './mobile-menu.types';
import { ICONS } from '../../../shared/icons/icon-registry';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { FtTourService } from '../../../core/services/tour.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'ft-mobile-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, NavItemComponent, NgIcon, TranslatePipe],
  templateUrl: './mobile-menu.component.html',
  styleUrl: './mobile-menu.component.scss',
})
export class MobileMenuComponent {
  private readonly authService = inject(AuthService);
  private readonly tourService = inject(FtTourService);
  private readonly router = inject(Router);

  items = input.required<MobileMenuItem[]>();
  isOpen = input<boolean>(false);
  user = input<User | null>(null);

  close = output<void>();

  readonly currentUser = this.authService.currentUser;

  // CSS transition state machine
  readonly isVisible = signal(false);
  readonly isDrawerOpen = signal(false);
  readonly isClosing = signal(false);

  constructor() {
    effect(() => {
      const wantsOpen = this.isOpen();
      if (wantsOpen) {
        this.isVisible.set(true);
        requestAnimationFrame(() => this.isDrawerOpen.set(true));
      } else if (this.isVisible()) {
        this.isDrawerOpen.set(false);
        this.isClosing.set(true);
        const closeMs = this.readCloseDuration();
        setTimeout(() => {
          this.isClosing.set(false);
          this.isVisible.set(false);
        }, closeMs);
      }
    }, { allowSignalWrites: true });
  }

  private readCloseDuration(): number {
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue('--panel-close-dur')
      .trim();
    return parseFloat(val) || 350;
  }

  onClose(): void {
    this.close.emit();
  }

  onStartTour(): void {
    this.onClose();
    this.tourService.openTutorialsHub();
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    if (currentUrl === '/home' || currentUrl === '/dashboard') {
      this.tourService.replayTour('onboarding');
    }
  }

  onLogout(): void {
    this.authService.logout().pipe(
      tap(() => this.onClose())
    ).subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}
