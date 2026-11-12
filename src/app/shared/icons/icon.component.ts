import { Component, input, computed } from '@angular/core';

/**
 * Icon map using Lucide SVG paths (MIT license).
 * 24×24 viewBox, stroke-based, inherits currentColor.
 * Style: clean line icons — matches icons8 aesthetic.
 */
const ICONS: Record<string, string> = {
  sparkles: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z',
  wallet: 'M21 12V7H5a2 2 0 010-4h14v4 M3 5v14a2 2 0 002 2h16v-5 M18 12a2 2 0 100 4 2 2 0 000-4z',
  chart: 'M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3',
  'trending-up': 'M22 7l-8.5 8.5-5-5L2 17 M16 7h6v6',
  'trending-down': 'M22 17l-8.5-8.5-5 5L2 7 M16 17h6v-6',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14z M21 21l-4.3-4.3',
  target: 'M12 12m-1 0a1 1 0 100 2 1 1 0 100-2 M12 12m-5 0a5 5 0 100 10 5 5 0 100-10 M12 12m-9 0a9 9 0 100 18 9 9 0 100-18',
  'alert-triangle': 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01',
  party: 'M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z M2 22l2-2 M20 22l-2-2',
  clock: 'M12 6v6l4 2 M22 12a10 10 0 11-20 0 10 10 0 0120 0z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  check: 'M20 6L9 17l-5-5',
  'arrow-up': 'M12 19V5 M5 12l7-7 7 7',
  'arrow-down': 'M12 5v14 M19 12l-7 7-7-7',
  'chevron-left': 'M15 18l-6-6 6-6',
  'chevron-right': 'M9 18l6-6-6-6',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M18 15l-6-6-6 6',
  bolt: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  pencil: 'M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z M15 5l4 4',
  x: 'M18 6L6 18 M6 6l12 12',
  'circle-dollar': 'M12 2a10 10 0 100 20 10 10 0 000-20z M16 8h-6a2 2 0 000 4h4a2 2 0 010 4H8 M12 18v2 M12 4v2',
  'plus-circle': 'M12 8v8 M8 12h8 M22 12a10 10 0 11-20 0 10 10 0 0120 0z',
  plus: 'M12 5v14 M5 12h14',
  tag: 'M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01',
};

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'ft-icon',
  standalone: true,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="ft-icon"
      [class.ft-icon--spin]="spin()"
      aria-hidden="true"
    >
      <path [attr.d]="svgPath()" />
    </svg>
  `,
  styles: [
    `
      :host { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .ft-icon { display: block; }
      .ft-icon--spin { animation: ft-icon-spin 1s linear infinite; }
      @keyframes ft-icon-spin { to { transform: rotate(360deg); } }
    `,
  ],
})
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input<number>(20);
  readonly spin = input<boolean>(false);
  readonly svgPath = computed(() => ICONS[this.name()] ?? ICONS['alert-triangle']);
}
