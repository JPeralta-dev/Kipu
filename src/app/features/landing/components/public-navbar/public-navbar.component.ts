import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { ICONS } from '../../../../shared/icons/icon-registry';
import { ThemeService } from '../../../../core/services/theme.service';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { LanguageDropdownComponent } from '../../../../shared/components/language-dropdown/language-dropdown.component';

@Component({
  selector: 'ft-public-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon, TranslatePipe, LanguageDropdownComponent],
  templateUrl: './public-navbar.component.html',
  styleUrl: './public-navbar.component.scss',
})
export class PublicNavbarComponent {
  readonly themeService = inject(ThemeService);
  readonly mobileMenuOpen = signal(false);

  toggleTheme(event?: MouseEvent): void {
    this.themeService.toggleTheme(event);
  }
}
