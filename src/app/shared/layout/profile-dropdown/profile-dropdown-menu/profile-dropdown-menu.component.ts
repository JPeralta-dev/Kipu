import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { ICONS } from '../../../../shared/icons/icon-registry';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { FtTourService } from '../../../../core/services/tour.service';
import type { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-profile-dropdown-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon, TranslatePipe],
  templateUrl: './profile-dropdown-menu.component.html',
  styleUrl: './profile-dropdown-menu.component.scss',
})
export class ProfileDropdownMenuComponent {
  private readonly tourService = inject(FtTourService);
  private readonly router = inject(Router);

  user = input.required<User | null>();
  initials = input.required<string>();
  displayName = input.required<string>();
  isLoggingOut = input.required<boolean>();

  closed = output<void>();
  logoutRequested = output<void>();

  onMenuClick(event: Event): void {
    event.stopPropagation();
  }

  onClose(): void {
    this.closed.emit();
  }

  onLogout(): void {
    this.logoutRequested.emit();
  }

  onOpenTutorials(): void {
    this.onClose();
    this.tourService.openTutorialsHub();
    const currentUrl = this.router.url.split('?')[0].split('#')[0];
    if (currentUrl === '/home' || currentUrl === '/dashboard') {
      this.tourService.replayTour('onboarding');
    }
  }
}
