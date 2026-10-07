import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Notification, NotificationType } from '../models/notification.model';
import { environment } from '../../../environments/environment';

interface NotificationApiResponse {
  notifications: Array<{
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    viewed: boolean;
    viewedAt: string | null;
    createdAt: string;
    expiresAt?: string | null;
  }>;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly base = `${environment.apiUrl}/api/notifications`;

  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  readonly unreadCount = computed(() =>
    this._notifications().filter(n => !n.read && !n.viewed).length
  );

  private eventSource: EventSource | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadNotifications();
    this.connectToStream();
  }

  loadNotifications(): void {
    if (!this.http) return;

    this.http.get<NotificationApiResponse>(this.base).subscribe({
      next: (response) => {
        if (response && Array.isArray(response.notifications)) {
          const mapped = response.notifications.map(item => this.mapApiNotification(item));
          this._notifications.set(mapped);
        }
      },
      error: () => {
        // Fallback: keep current local notifications if backend is unreachable
      },
    });
  }

  connectToStream(): void {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
      return; // SSR or environment without EventSource
    }

    if (this.eventSource) return;

    try {
      this.eventSource = new EventSource(`${this.base}/stream`, { withCredentials: true });

      this.eventSource.addEventListener('notification', (event: MessageEvent) => {
        try {
          const raw = JSON.parse(event.data);
          const mapped = this.mapApiNotification(raw);
          this._notifications.update(list => [mapped, ...list.filter(n => n.id !== mapped.id)]);
        } catch {
          // Ignore malformed payloads
        }
      });

      this.eventSource.onerror = () => {
        this.disconnectStream();
        // Exponential reconnect with jitter (attempt after 5s)
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connectToStream();
          }, 5000);
        }
      };
    } catch {
      // EventSource instantiation failure (e.g. cross-origin blocking)
    }
  }

  disconnectStream(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  markAsRead(id: string): void {
    // 1. Optimistic local update
    this._notifications.update(list =>
      list.map(n => (n.id === id ? { ...n, read: true, viewed: true } : n))
    );

    // 2. Call backend PATCH route
    if (this.http) {
      this.http.patch(`${this.base}/${id}/viewed`, {}).subscribe({
        error: () => {
          // Non-blocking: retain optimistic state
        },
      });
    }
  }

  dismiss(id: string): void {
    // 1. Optimistic removal
    this._notifications.update(list => list.filter(n => n.id !== id));

    // 2. Call backend DELETE route
    if (this.http) {
      this.http.delete(`${this.base}/${id}`).subscribe({
        error: () => {
          // Non-blocking
        },
      });
    }
  }

  clearAll(): void {
    this._notifications.set([]);
  }

  /** Helper to set local notifications directly (useful for testing and bootstrapping) */
  setNotifications(notifications: Notification[]): void {
    this._notifications.set(notifications);
  }

  private mapApiNotification(item: {
    id?: string;
    _id?: string;
    type?: string;
    title?: string;
    message?: string;
    viewed?: boolean;
    createdAt?: string | Date;
    metadata?: Record<string, unknown>;
  }): Notification {
    const isViewed = Boolean(item.viewed);
    return {
      id: item.id || (item._id ? String(item._id) : String(Math.random())),
      title: item.title || '',
      message: item.message || '',
      type: this.mapType(item.type),
      read: isViewed,
      viewed: isViewed,
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      actionUrl: typeof item.metadata?.['actionUrl'] === 'string' ? (item.metadata['actionUrl'] as string) : null,
      metadata: item.metadata,
    };
  }

  private mapType(type?: string): NotificationType {
    if (!type) return 'info';
    if (type.includes('error') || type.includes('alert')) return 'warning';
    if (type.includes('success') || type.includes('milestone')) return 'success';
    return 'info';
  }
}
