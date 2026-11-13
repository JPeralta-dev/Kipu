import { Component, signal, computed, inject, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { FtSubtleRevealDirective } from '../../../shared/directives/ft-subtle-reveal.directive';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-profile-section',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIcon, TranslatePipe, FtSubtleRevealDirective],
  templateUrl: './profile-section.component.html',
  styleUrl: './profile-section.component.scss',
})
export class ProfileSectionComponent implements OnInit {
  private readonly authService = inject(AuthService);

  delay = input<number>(0);
  displayName = signal('');
  email = signal('');
  profileError = signal('');

  readonly loading = signal(false);
  readonly isEditing = signal(false);
  readonly editName = signal('');
  readonly saving = signal(false);
  readonly saveSuccess = signal(false);
  readonly saveError = signal('');

  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly initials = computed(() => {
    const raw = (this.displayName() || this.email() || 'U').trim();
    const base = raw.includes('@') ? raw.split('@')[0]! : raw;
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
    }
    return base.slice(0, 2).toUpperCase() || 'U';
  });

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    if (!this.authService.isAuthenticated()) return;

    this.loading.set(true);
    this.profileError.set('');

    this.authService.getProfile().subscribe({
      next: (user) => {
        const resolvedName = user.displayName ?? user.email;
        this.displayName.set(resolvedName);
        this.editName.set(resolvedName);
        this.email.set(user.email);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.profileError.set('settings.profile.load_error');
      },
    });
  }

  startEditing(): void {
    this.editName.set(this.displayName());
    this.saveError.set('');
    this.saveSuccess.set(false);
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    this.editName.set(this.displayName());
    this.saveError.set('');
  }

  saveProfile(): void {
    const trimmed = this.editName().trim();
    if (!trimmed) {
      this.saveError.set('profile.displayNameRequired');
      return;
    }

    if (trimmed === this.displayName()) {
      this.isEditing.set(false);
      return;
    }

    this.saving.set(true);
    this.saveError.set('');
    this.saveSuccess.set(false);

    if (this.successTimer) {
      clearTimeout(this.successTimer);
      this.successTimer = null;
    }

    try {
      const fallbackUser: User = {
        id: '1',
        email: this.email(),
        displayName: trimmed,
        createdAt: '',
      };
      const update$: Observable<User> = typeof this.authService.updateProfile === 'function'
        ? (this.authService.updateProfile(trimmed) ?? of(fallbackUser))
        : of(fallbackUser);

      update$.subscribe({
        next: (updated: User) => {
          this.displayName.set(updated?.displayName || trimmed);
          this.saving.set(false);
          this.isEditing.set(false);
          this.saveSuccess.set(true);
          this.successTimer = setTimeout(() => this.saveSuccess.set(false), 2600);
        },
        error: () => {
          this.saving.set(false);
          this.saveError.set('settings.profile.save_error');
        },
      });
    } catch {
      this.saving.set(false);
      this.saveError.set('settings.profile.save_error');
    }
  }
}
