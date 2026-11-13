import {
  Component, ChangeDetectionStrategy, input, output, computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';

export type LinkedChannelState = 'disconnected' | 'connecting' | 'connected';

export interface LinkedChannelRecentItem {
  id: string;
  iconKey: 'bank' | 'wallet' | 'card';
  primary: string;
  secondary: string;
  amount?: string;
}

/**
 * Reusable card for a single "linked channel" (Telegram, Gmail, WhatsApp, ...).
 *
 * Renders one of three visual states:
 * - disconnected  → CTA button
 * - connecting    → disabled button with spinner + shimmering line
 * - connected     → success check (first time only) + green tint + actions + recent
 */
@Component({
  selector: 'app-linked-channel-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgIcon, TranslatePipe],
  templateUrl: './linked-channel-card.component.html',
  styleUrl: './linked-channel-card.component.scss',
})
export class LinkedChannelCardComponent {
  // ── Inputs ────────────────────────────────────────────────────────
  readonly state = input<LinkedChannelState>('disconnected');
  readonly iconKey = input<string>('heroLink');
  readonly iconBgClass = input<string>('default');
  readonly title = input<string>('');
  readonly description = input<string>('');

  /** Status text shown under the title in the connected state. */
  readonly connectedStatus = input<string>('');
  /** Meta line shown under the status (e.g. "Last sync: 15 min ago"). */
  readonly connectedMeta = input<string>('');
  /** Optional extra grey meta line shown under connectedMeta. */
  readonly connectedMetaExtra = input<string>('');

  readonly connectLabel = input<string>('Connect');
  readonly connectingLabel = input<string>('Connecting...');
  readonly syncLabel = input<string>('Sync now');
  readonly disconnectLabel = input<string>('Disconnect');

  readonly isFirstConnect = input<boolean>(false);
  readonly showComingSoon = input<boolean>(false);
  readonly confirmingDisconnect = input<boolean>(false);
  readonly errorMessage = input<string | null>(null);

  readonly recent = input<LinkedChannelRecentItem[]>([]);
  readonly recentTitle = input<string>('Recent imports');

  /**
   * Optional override for the disconnected-state body. When projected
   * via `<ng-content select="[slot=disconnected]">`, the card's own
   * "Connect" button is hidden and the consumer's content is rendered
   * instead.
   */
  readonly hasCustomDisconnected = input<boolean>(false);

  // ── Outputs ───────────────────────────────────────────────────────
  readonly connect = output<void>();
  readonly sync = output<void>();
  readonly disconnect = output<void>();
  readonly confirmDisconnect = output<void>();
  readonly cancelDisconnect = output<void>();

  // ── Computed ──────────────────────────────────────────────────────
  readonly isConnected = computed(() => this.state() === 'connected');
  readonly isConnecting = computed(() => this.state() === 'connecting');
  readonly isDisconnected = computed(() => this.state() === 'disconnected');

  // ── Actions ───────────────────────────────────────────────────────
  onConnect(): void {
    if (!this.isDisconnected() || this.showComingSoon()) return;
    this.connect.emit();
  }
  onSync(): void {
    if (!this.isConnected()) return;
    this.sync.emit();
  }
  onDisconnect(): void {
    if (!this.isConnected()) return;
    this.disconnect.emit();
  }
  onConfirmDisconnect(): void {
    if (!this.isConnected()) return;
    this.confirmDisconnect.emit();
  }
  onCancelDisconnect(): void {
    this.cancelDisconnect.emit();
  }
}
