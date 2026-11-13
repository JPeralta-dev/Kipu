import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

export type ChannelOrigin = 'whatsapp' | 'telegram' | 'gmail' | 'manual' | null | undefined;

interface ChannelConfig {
  icon: string;
  labelKey: string;
  color: string;
}

const CHANNEL_CONFIG: Record<string, ChannelConfig> = {
  whatsapp: {
    icon: 'whatsapp',
    labelKey: 'channels.whatsapp',
    color: '#25D366',
  },
  telegram: {
    icon: 'telegram',
    labelKey: 'channels.telegram',
    color: '#0088cc',
  },
  gmail: {
    icon: 'mail',
    labelKey: 'channels.gmail',
    color: '#EA4335',
  },
  manual: {
    icon: 'edit',
    labelKey: 'channels.manual',
    color: 'var(--text-tertiary)',
  },
};

@Component({
  selector: 'ft-channel-badge',
  standalone: true,
  imports: [CommonModule, NgIcon, TranslatePipe],
  template: `
    @if (config()) {
      <span
        class="channel-badge"
        role="img"
        [attr.aria-label]="'channels.from' | translate:{ channel: config()!.labelKey | translate }"
        [title]="config()!.labelKey | translate"
      >
        <ng-icon [name]="config()!.icon" [size]="iconSize()" [style.color]="config()!.color" aria-hidden="true" />
        @if (showLabel()) {
          <span class="channel-badge__label">{{ config()!.labelKey | translate }}</span>
        }
      </span>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
    }

    .channel-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-secondary);
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      transition: all var(--duration-fast) var(--ease-out);

      &:hover {
        background: var(--bg-tertiary);
        border-color: var(--border-default);
      }
    }

    .channel-badge__label {
      white-space: nowrap;
    }
  `],
})
export class ChannelBadgeComponent {
  origin = input<ChannelOrigin>('manual');
  iconSize = input<string>('14px');
  showLabel = input<boolean>(true);

  readonly config = computed<ChannelConfig | null>(() => {
    const origin = this.origin();
    if (!origin) return null;
    return CHANNEL_CONFIG[origin] || null;
  });
}
