import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationsDropdownComponent } from './notifications-dropdown.component';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { provideIcons } from '@ng-icons/core';
import { ICONS } from '../../../shared/icons/icon-registry';
import { of } from 'rxjs';

// Mock TranslatePipe
class MockTranslatePipe {
  transform(value: string): string {
    return value;
  }
}

describe('NotificationsDropdownComponent', () => {
  let component: NotificationsDropdownComponent;
  let fixture: ComponentFixture<NotificationsDropdownComponent>;
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsDropdownComponent],
      providers: [
        NotificationService,
        provideIcons(ICONS),
        { provide: TranslatePipe, useClass: MockTranslatePipe },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsDropdownComponent);
    component = fixture.componentInstance;
    notificationService = TestBed.inject(NotificationService);
    notificationService.setNotifications([
      {
        id: '1',
        title: 'notifications.welcome.title',
        message: 'notifications.welcome.message',
        type: 'success',
        read: false,
        viewed: false,
        createdAt: new Date(),
        actionUrl: null,
      },
      {
        id: '2',
        title: 'notifications.feature.title',
        message: 'notifications.feature.message',
        type: 'info',
        read: true,
        viewed: true,
        createdAt: new Date(),
        actionUrl: null,
      },
    ]);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with dropdown closed', () => {
    expect(component.isOpen()).toBe(false);
  });

  it('should toggle dropdown open on toggleDropdown()', () => {
    component.toggleDropdown();
    expect(component.isOpen()).toBe(true);
  });

  it('should close dropdown on closeDropdown()', () => {
    component.toggleDropdown();
    expect(component.isOpen()).toBe(true);
    component.closeDropdown();
    expect(component.isOpen()).toBe(false);
  });

  it('should display unread count from service', () => {
    const count = component.unreadCount();
    expect(count).toBeGreaterThan(0);
  });

  it('should display notifications from service', () => {
    const notifications = component.notifications();
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0].id).toBeDefined();
  });

  it('should mark notification as read when clicked', () => {
    const notif = component.notifications()[0];
    const wasRead = notif.read;

    component.markAsRead(notif);

    const updated = component.notifications().find(n => n.id === notif.id);
    expect(updated?.read).toBe(true);
    if (!wasRead) {
      expect(component.unreadCount()).toBeLessThan(
        notificationService.unreadCount() + 1
      );
    }
  });

  it('should mark all notifications as read when markAllAsRead() is called', () => {
    expect(component.unreadCount()).toBe(1);

    component.markAllAsRead();

    expect(component.unreadCount()).toBe(0);
    expect(component.notifications().every(n => n.read && n.viewed)).toBe(true);
  });

  it('should stop event propagation when markAllAsRead is triggered with event', () => {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');
    spyOn(notificationService, 'markAllAsRead');

    component.markAllAsRead(event);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(notificationService.markAllAsRead).toHaveBeenCalled();
  });

  it('should render mark all as read button when open and unreadCount > 0', () => {
    component.toggleDropdown();
    fixture.detectChanges();

    const markAllBtn = fixture.nativeElement.querySelector('.notifications-dropdown__mark-all');
    expect(markAllBtn).toBeTruthy();

    markAllBtn.click();
    fixture.detectChanges();

    expect(component.unreadCount()).toBe(0);
    const markAllBtnAfter = fixture.nativeElement.querySelector('.notifications-dropdown__mark-all');
    expect(markAllBtnAfter).toBeFalsy();
  });

  it('should dismiss notification when dismiss button clicked', () => {
    const before = component.notifications().length;
    const notifId = component.notifications()[0].id;

    component.dismiss(notifId, new Event('click'));

    const after = component.notifications().length;
    expect(after).toBe(before - 1);
    const removed = component.notifications().find(n => n.id === notifId);
    expect(removed).toBeUndefined();
  });

  it('should return correct type class for notification types', () => {
    expect(component.typeClass('info')).toBe('notification-item--info');
    expect(component.typeClass('success')).toBe('notification-item--success');
    expect(component.typeClass('warning')).toBe('notification-item--warning');
    expect(component.typeClass('error')).toBe('notification-item--error');
  });

  it('should stop propagation on menu click', () => {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');
    component.onMenuClick(event);
    expect(event.stopPropagation).toHaveBeenCalled();
  });
});
