import { Injectable, signal, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';

/**
 * Build a UTC date string (YYYY-MM-DD) from year/month/day components.
 * Avoids local-time `new Date(y, m, d)` which shifts by timezone offset.
 */
export function toUTCDateString(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
}

export type DateRangePreset = 'this_week' | 'this_month' | 'last_30_days' | 'month' | 'custom';

/**
 * Return Sunday to Saturday boundary for the reference date's current week.
 */
export function getThisWeekRange(refDate = new Date()): { start: string; end: string } {
  const d = new Date(refDate);
  const day = d.getDay(); // 0 is Sunday, 6 is Saturday
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  const saturday = new Date(d);
  saturday.setDate(d.getDate() + (6 - day));

  return {
    start: toUTCDateString(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()),
    end: toUTCDateString(saturday.getFullYear(), saturday.getMonth(), saturday.getDate()),
  };
}

/**
 * Return first day to last day of the current calendar month.
 */
export function getThisMonthRange(refDate = new Date()): { start: string; end: string } {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(Date.UTC(year, month + 1, 0));

  return {
    start: toUTCDateString(firstDay.getUTCFullYear(), firstDay.getUTCMonth(), firstDay.getUTCDate()),
    end: toUTCDateString(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate()),
  };
}

/**
 * Return 30 days rolling window back from the reference date to today.
 */
export function getLast30DaysRange(refDate = new Date()): { start: string; end: string } {
  const now = new Date(refDate);
  const past = new Date(now);
  past.setDate(now.getDate() - 30);

  return {
    start: toUTCDateString(past.getFullYear(), past.getMonth(), past.getDate()),
    end: toUTCDateString(now.getFullYear(), now.getMonth(), now.getDate()),
  };
}

@Injectable({ providedIn: 'root' })
export class DateRangeService {
  private readonly auth = inject(AuthService, { optional: true });

  readonly startDate = signal('');
  readonly endDate = signal('');
  readonly activePreset = signal<DateRangePreset>('this_month');
  readonly customLabel = signal<string>('');

  /**
   * Optional manual override for earliest date.
   */
  readonly manualMinDate = signal<Date | null>(null);

  /**
   * Earliest date the user has data for.
   * Derived automatically from auth user account creation (user.createdAt)
   * or manualMinDate override. This strictly prevents showing phantom months
   * prior to when the user account existed.
   */
  readonly minDate = computed<Date | null>(() => {
    const manual = this.manualMinDate();
    if (manual) return manual;

    const user = this.auth?.currentUser();
    if (user?.createdAt) {
      const parsed = new Date(user.createdAt);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return null;
  });

  readonly currentMonthLabel = computed(() => {
    const s = this.startDate();
    if (!s) return '';
    const d = new Date(s + 'T12:00:00Z');
    return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  });

  /**
   * Transparent user-facing label representing the currently active selection.
   * Avoids misleading the user into thinking a 30-day rolling window is the calendar month.
   */
  readonly activeLabel = computed(() => {
    const preset = this.activePreset();
    if (preset === 'this_week') return 'Esta semana';
    if (preset === 'this_month') return 'Este mes';
    if (preset === 'last_30_days') return 'Últimos 30 días';
    if (preset === 'month') {
      const custom = this.customLabel();
      return custom || this.currentMonthLabel();
    }
    const s = this.startDate();
    const e = this.endDate();
    if (s && e) {
      return `${s} — ${e}`;
    }
    return this.currentMonthLabel();
  });

  readonly availableMonths = computed(() => {
    const months: { label: string; start: string; end: string }[] = [];
    const now = new Date();
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const min = this.minDate();

    // Determine how many months back we should show.
    // If minDate is set (e.g. user createdAt): strictly bound to account age.
    // If minDate is null: fallback to 12 months max.
    let maxMonthsBack = 12;
    if (min) {
      const minYear = min.getFullYear();
      const minMonth = min.getMonth();
      maxMonthsBack = Math.max(0, (nowYear - minYear) * 12 + (nowMonth - minMonth));
    }

    for (let i = 0; i <= maxMonthsBack; i++) {
      const year = nowYear;
      const month = nowMonth - i;
      // Use noon UTC so toLocaleDateString stays in the same calendar month
      // across all timezones (midnight UTC can roll back to the previous day
      // in UTC-5 or earlier, shifting the label by one month).
      const firstDay = new Date(Date.UTC(year, month, 1, 12, 0, 0));
      const lastDay = new Date(Date.UTC(year, month + 1, 0, 12, 0, 0));
      months.push({
        label: firstDay.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }),
        start: toUTCDateString(firstDay.getUTCFullYear(), firstDay.getUTCMonth(), firstDay.getUTCDate()),
        end: toUTCDateString(lastDay.getUTCFullYear(), lastDay.getUTCMonth(), lastDay.getUTCDate()),
      });
    }
    return months;
  });

  constructor() {
    this.setThisMonth();
  }

  /**
   * Filter from Sunday to Saturday of the current week.
   */
  setThisWeek(): void {
    const range = getThisWeekRange();
    this.startDate.set(range.start);
    this.endDate.set(range.end);
    this.activePreset.set('this_week');
  }

  /**
   * Filter the current calendar month (day 1 to end of month).
   */
  setThisMonth(): void {
    const range = getThisMonthRange();
    this.startDate.set(range.start);
    this.endDate.set(range.end);
    this.activePreset.set('this_month');
  }

  /**
   * Backward-compatible alias for setThisMonth().
   */
  setCurrentMonth(): void {
    this.setThisMonth();
  }

  /**
   * Filter the rolling last 30 days (today - 30 days to today).
   */
  setLast30Days(): void {
    const range = getLast30DaysRange();
    this.startDate.set(range.start);
    this.endDate.set(range.end);
    this.activePreset.set('last_30_days');
  }

  /**
   * Filter a specific historical month.
   */
  setMonth(start: string, end: string, label?: string): void {
    this.startDate.set(start);
    this.endDate.set(end);
    this.activePreset.set('month');
    this.customLabel.set(label ?? '');
  }

  /**
   * Set custom range.
   */
  setCustomRange(start: string, end: string): void {
    this.startDate.set(start);
    this.endDate.set(end);
    this.activePreset.set('custom');
    this.customLabel.set('');
  }

  /**
   * Set manual earliest date override.
   */
  setMinDate(date: Date | null): void {
    this.manualMinDate.set(date);
  }

  clear(): void {
    this.startDate.set('');
    this.endDate.set('');
    this.activePreset.set('custom');
    this.customLabel.set('');
  }

  getApiParams(): { startDate?: string; endDate?: string } {
    const params: { startDate?: string; endDate?: string } = {};
    if (this.startDate()) params.startDate = new Date(this.startDate() + 'T00:00:00Z').toISOString();
    if (this.endDate()) params.endDate = new Date(this.endDate() + 'T23:59:59.999Z').toISOString();
    return params;
  }

  getFilters(): { startDate?: string; endDate?: string } {
    return {
      startDate: this.startDate() ? new Date(this.startDate() + 'T00:00:00Z').toISOString() : undefined,
      endDate: this.endDate() ? new Date(this.endDate() + 'T23:59:59.999Z').toISOString() : undefined,
    };
  }
}
