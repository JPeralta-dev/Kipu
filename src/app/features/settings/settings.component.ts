import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { FtSubtleRevealDirective } from '../../shared/directives/ft-subtle-reveal.directive';
import { AuthService } from '../../core/services/auth.service';
import { UserDataService } from '../../core/services/user-data.service';
import { finalize } from 'rxjs';
import { ProfileSectionComponent } from './profile-section/profile-section.component';
import { PreferencesSectionComponent } from './preferences-section/preferences-section.component';
import { LinkedAccountsSectionComponent } from './linked-accounts-section/linked-accounts-section.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NgIcon,
    TranslatePipe,
    FtSubtleRevealDirective,
    ProfileSectionComponent,
    PreferencesSectionComponent,
    LinkedAccountsSectionComponent,
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private readonly authService = inject(AuthService);
  private readonly userDataService = inject(UserDataService);
  private readonly router = inject(Router);

  logoutLoading = signal(false);
  confirmLogout = signal(false);
  logoutError = signal('');

  /** Data management */
  exportLoading = signal(false);
  exportSuccess = signal(false);
  exportError = signal('');
  confirmDelete = signal(false);
  deleteLoading = signal(false);
  deleteError = signal('');
  deleteConfirmText = signal('');

  /** Toggle confirmation and move focus to the Cancel button. */
  onRequestSignOut(): void {
    this.confirmLogout.set(true);
    setTimeout(() => {
      const cancelBtn = document.querySelector<HTMLElement>(
        '.logout-confirm .btn-cancel',
      );
      cancelBtn?.focus();
    });
  }

  onSignOut(): void {
    this.logoutLoading.set(true);
    this.logoutError.set('');

    this.authService.logout().pipe(
      finalize(() => {
        this.logoutLoading.set(false);
      }),
    ).subscribe({
      next: () => {
        this.confirmLogout.set(false);
        this.router.navigate(['/login']);
      },
      error: () => {
        this.logoutError.set('settings.session.sign_out_error');
      },
    });
  }

  // ── Data Management (GDPR) ──────────────────────────────────────────

  onExportData(): void {
    this.exportLoading.set(true);
    this.exportError.set('');
    this.exportSuccess.set(false);

    this.userDataService.exportData().pipe(
      finalize(() => this.exportLoading.set(false)),
    ).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `flowr-export-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.exportSuccess.set(true);
      },
      error: () => {
        this.exportError.set('settings.data.export_error');
      },
    });
  }

  onRequestDelete(): void {
    this.confirmDelete.set(true);
    this.deleteError.set('');
    this.deleteConfirmText.set('');
  }

  onCancelDelete(): void {
    this.confirmDelete.set(false);
    this.deleteError.set('');
    this.deleteConfirmText.set('');
  }

  onConfirmDelete(): void {
    const confirmVal = this.deleteConfirmText().trim().toLowerCase();
    if (confirmVal !== 'delete' && confirmVal !== 'eliminar' && confirmVal !== 'supprimer') {
      this.deleteError.set('settings.data.delete_confirm_mismatch');
      return;
    }

    this.deleteLoading.set(true);
    this.deleteError.set('');

    this.userDataService.deleteAccount().pipe(
      finalize(() => this.deleteLoading.set(false)),
    ).subscribe({
      next: () => {
        this.authService.clearSession();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.deleteError.set('settings.data.delete_error');
      },
    });
  }
}
