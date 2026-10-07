import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { Notification } from '../models/notification.model';
import { environment } from '../../../environments/environment';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  const mockNotifications: Notification[] = [
    {
      id: '1',
      title: 'Welcome!',
      message: 'Your account is ready.',
      type: 'success',
      read: false,
      viewed: false,
      createdAt: new Date('2024-01-01'),
      actionUrl: null,
    },
    {
      id: '2',
      title: 'New feature',
      message: 'Check out the new dashboard.',
      type: 'info',
      read: true,
      viewed: true,
      createdAt: new Date('2024-01-02'),
      actionUrl: '/dashboard',
    },
    {
      id: '3',
      title: 'Warning',
      message: 'Your budget is almost exceeded.',
      type: 'warning',
      read: false,
      viewed: false,
      createdAt: new Date('2024-01-03'),
      actionUrl: null,
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationService],
    });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(NotificationService);

    // Handle initial load GET request from constructor
    const req = httpMock.expectOne(`${environment.apiUrl}/api/notifications`);
    req.flush({ notifications: [], total: 0 });

    service.setNotifications([...mockNotifications]);
  });

  afterEach(() => {
    service.disconnectStream();
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('notifications signal', () => {
    it('should hold notification items', () => {
      const notifications = service.notifications();
      expect(notifications.length).toBe(3);
      expect(notifications[0].id).toBe('1');
    });

    it('should return readonly signal', () => {
      expect(service.notifications).toBeDefined();
      expect(typeof service.notifications).toBe('function');
    });
  });

  describe('unreadCount computed', () => {
    it('should count unread notifications correctly', () => {
      // items 1 and 3 are unread
      expect(service.unreadCount()).toBe(2);
    });

    it('should update when a notification is marked as read', () => {
      expect(service.unreadCount()).toBe(2);
      service.markAsRead('1');

      const patchReq = httpMock.expectOne(`${environment.apiUrl}/api/notifications/1/viewed`);
      expect(patchReq.request.method).toBe('PATCH');
      patchReq.flush({});

      expect(service.unreadCount()).toBe(1);
    });

    it('should be zero when all are read', () => {
      service.markAsRead('1');
      const patch1 = httpMock.expectOne(`${environment.apiUrl}/api/notifications/1/viewed`);
      patch1.flush({});

      service.markAsRead('3');
      const patch3 = httpMock.expectOne(`${environment.apiUrl}/api/notifications/3/viewed`);
      patch3.flush({});

      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read and make PATCH call', () => {
      const before = service.notifications().find(n => n.id === '1');
      expect(before?.read).toBe(false);

      service.markAsRead('1');

      const patchReq = httpMock.expectOne(`${environment.apiUrl}/api/notifications/1/viewed`);
      expect(patchReq.request.method).toBe('PATCH');
      patchReq.flush({});

      const after = service.notifications().find(n => n.id === '1');
      expect(after?.read).toBe(true);
      expect(after?.viewed).toBe(true);
    });

    it('should not affect other notifications', () => {
      service.markAsRead('1');
      const patchReq = httpMock.expectOne(`${environment.apiUrl}/api/notifications/1/viewed`);
      patchReq.flush({});

      const other = service.notifications().find(n => n.id === '3');
      expect(other?.read).toBe(false);
    });
  });

  describe('dismiss', () => {
    it('should remove a notification from the list and call DELETE', () => {
      const before = service.notifications().length;
      expect(before).toBe(3);

      service.dismiss('1');

      const deleteReq = httpMock.expectOne(`${environment.apiUrl}/api/notifications/1`);
      expect(deleteReq.request.method).toBe('DELETE');
      deleteReq.flush(null);

      expect(service.notifications().length).toBe(before - 1);
      const removed = service.notifications().find(n => n.id === '1');
      expect(removed).toBeUndefined();
    });
  });

  describe('clearAll', () => {
    it('should empty the notification list', () => {
      service.clearAll();
      expect(service.notifications()).toEqual([]);
      expect(service.unreadCount()).toBe(0);
    });
  });
});
