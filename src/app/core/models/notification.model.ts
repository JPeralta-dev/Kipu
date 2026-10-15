export type NotificationType = 'info' | 'success' | 'warning' | 'error' | string;

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  viewed?: boolean;
  createdAt: Date;
  actionUrl?: string | null;
  metadata?: Record<string, unknown>;
}
