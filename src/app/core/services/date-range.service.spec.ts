import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  DateRangeService,
  getThisWeekRange,
  getThisMonthRange,
  getLast30DaysRange,
} from './date-range.service';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';

describe('DateRangeService', () => {
  let service: DateRangeService;
  let mockUserSignal = signal<User | null>(null);

  beforeEach(() => {
    mockUserSignal = signal<User | null>(null);

    TestBed.configureTestingModule({
      providers: [
        DateRangeService,
        {
          provide: AuthService,
          useValue: {
            currentUser: mockUserSignal.asReadonly(),
          },
        },
      ],
    });

    service = TestBed.inject(DateRangeService);
  });

  it('should be created and default to current month', () => {
    expect(service).toBeTruthy();
    expect(service.activePreset()).toBe('this_month');
    expect(service.activeLabel()).toBe('Este mes');
  });

  describe('Pure date calculation helpers', () => {
    it('getThisWeekRange should calculate Sunday to Saturday bounds', () => {
      // Wednesday, Oct 21, 2026
      const wednesday = new Date('2026-10-21T12:00:00Z');
      const range = getThisWeekRange(wednesday);

      // Sunday: Oct 18, 2026; Saturday: Oct 24, 2026
      expect(range.start).toBe('2026-10-18');
      expect(range.end).toBe('2026-10-24');
    });

    it('getThisMonthRange should calculate 1st to last day of calendar month', () => {
      const midMonth = new Date('2026-10-15T12:00:00Z');
      const range = getThisMonthRange(midMonth);

      expect(range.start).toBe('2026-10-01');
      expect(range.end).toBe('2026-10-31');
    });

    it('getLast30DaysRange should calculate 30 days rolling window', () => {
      const date = new Date('2026-10-24T12:00:00Z');
      const range = getLast30DaysRange(date);

      expect(range.end).toBe('2026-10-24');
      expect(range.start).toBe('2026-09-24');
    });
  });

  describe('Presets and activeLabel', () => {
    it('setThisWeek should set dates to current week and activePreset to this_week', () => {
      service.setThisWeek();
      expect(service.activePreset()).toBe('this_week');
      expect(service.activeLabel()).toBe('Esta semana');
    });

    it('setLast30Days should set dates and activePreset to last_30_days', () => {
      service.setLast30Days();
      expect(service.activePreset()).toBe('last_30_days');
      expect(service.activeLabel()).toBe('Últimos 30 días');
    });

    it('setThisMonth should set dates and activePreset to this_month', () => {
      service.setThisMonth();
      expect(service.activePreset()).toBe('this_month');
      expect(service.activeLabel()).toBe('Este mes');
    });

    it('setMonth should set activePreset to month and display custom/month label', () => {
      service.setMonth('2026-09-01', '2026-09-30', 'septiembre de 2026');
      expect(service.activePreset()).toBe('month');
      expect(service.activeLabel()).toBe('septiembre de 2026');
    });
  });

  describe('Account creation date restriction (no phantom 2025 months)', () => {
    it('should constrain availableMonths to user account creation month', () => {
      const now = new Date();
      // Suppose user account was created in the current month
      const userCreatedDate = new Date(now.getFullYear(), now.getMonth(), 5).toISOString();

      mockUserSignal.set({
        id: 'user-1',
        email: 'test@example.com',
        createdAt: userCreatedDate,
      });

      const months = service.availableMonths();
      // Only 1 month should be available: current month
      expect(months.length).toBe(1);
      expect(months[0].start.startsWith(`${now.getFullYear()}-`)).toBeTrue();
    });

    it('should allow months from creation month up to now, but never prior to creation', () => {
      const now = new Date();
      // Account created 2 months ago
      const createdMonth = now.getMonth() - 2;
      const createdYear = now.getFullYear();
      const userCreatedDate = new Date(Date.UTC(createdYear, createdMonth, 10)).toISOString();

      mockUserSignal.set({
        id: 'user-2',
        email: 'test2@example.com',
        createdAt: userCreatedDate,
      });

      const months = service.availableMonths();
      // Expect current month, 1 month ago, 2 months ago = 3 months
      expect(months.length).toBe(3);
    });
  });
});
