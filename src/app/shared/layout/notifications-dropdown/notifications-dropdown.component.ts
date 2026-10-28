import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { ICONS } from '../../../shared/icons/icon-registry';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../core/models/notification.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'ft-notifications-dropdown',
  standalone: true,
  imports: [CommonModule, NgIcon, ClickOutsideDirective, TranslatePipe],
  templateUrl: './notifications-dropdown.component.html',
  styleUrl: './notifications-dropdown.component.scss',
})
export class NotificationsDropdownComponent {
  private readonly _notificationService = inject(NotificationService);
  readonly isOpen = signal<boolean>(false);
  readonly notifications = this._notificationService.notifications;
  readonly unreadCount = this._notificationService.unreadCount;

  toggleDropdown(): void {
    this.isOpen.update(open => !open);
  }

  closeDropdown(): void {
    this.isOpen.set(false);
  }

  onMenuClick(event: Event): void {
    event.stopPropagation();
  }

  markAsRead(notification: Notification): void {
    this._notificationService.markAsRead(notification.id);
  }

  markAllAsRead(event?: Event): void {
    event?.stopPropagation();
    this._notificationService.markAllAsRead();
  }

  dismiss(id: string, event: Event): void {
    event.stopPropagation();
    this._notificationService.dismiss(id);
  }

  typeClass(type: Notification['type']): string {
    return `notification-item--${type}`;
  }
}
