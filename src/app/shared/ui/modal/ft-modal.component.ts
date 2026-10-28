/**
 * FtModalComponent — generic modal primitive.
 *
 * Features
 * ────────
 * - Standalone Angular 17, signals-based state
 * - Configurable size: sm | md | lg | xl
 * - Close on backdrop / ESC (both optional, default true)
 * - Focus trap with restore-to-trigger on close
 * - ARIA: role="dialog", aria-modal, aria-labelledby
 * - Body scroll lock while open
 * - Smooth enter/exit animations (fade + scale, 200ms ease-out)
 * - Stacking supported via z-index prop
 *
 * Usage
 * ─────
 *   <ft-modal [open]="show()" (closed)="show.set(false)" titleKey="upgradeModal.title" size="lg">
 *     <ng-container modalBody> ... </ng-container>
 *   </ft-modal>
 */
import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  effect,
  signal,
  computed,
  ElementRef,
  inject,
  viewChild,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon } from '@ng-icons/core';
import { ICONS } from '../../icons/icon-registry';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(',');

@Component({
  selector: 'ft-modal',
  standalone: true,
  imports: [CommonModule, NgIcon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mounted()) {
      <div
        class="ft-modal-overlay"
        [class.ft-modal-overlay--closing]="isClosing()"
        [class.ft-modal-overlay--no-backdrop-close]="!closeOnBackdrop()"
        [style.zIndex]="zIndex()"
        (click)="onBackdropClick($event)"
        (mousedown)="onBackdropMouseDown($event)"
        role="presentation"
      >
        <div
          #dialog
          class="ft-modal"
          [class.ft-modal--sm]="size() === 'sm'"
          [class.ft-modal--md]="size() === 'md'"
          [class.ft-modal--lg]="size() === 'lg'"
          [class.ft-modal--xl]="size() === 'xl'"
          [class.ft-modal--closing]="isClosing()"
          [attr.role]="'dialog'"
          [attr.aria-modal]="true"
          [attr.aria-labelledby]="labelledBy() || null"
          [attr.aria-describedby]="describedBy() || null"
          tabindex="-1"
          (click)="$event.stopPropagation()"
        >
          @if (showHeader()) {
            <header class="ft-modal__header">
              <h2
                [id]="labelledBy()"
                class="ft-modal__title"
              >
                {{ headerTitle() || (headerTitleKey() | translate) }}
              </h2>
              <button
                type="button"
                class="ft-modal__close"
                [attr.aria-label]="'modal.close' | translate"
                (click)="close('close_button')"
              >
                <ng-icon [name]="closeIcon" size="18px" aria-hidden="true" />
              </button>
            </header>
          }

          <div class="ft-modal__body" [id]="describedBy()">
            <ng-content select="[modalBody], [modal-body]"></ng-content>
          </div>

          @if (showFooter()) {
            <footer class="ft-modal__footer">
              <ng-content select="[modalFooter], [modal-footer]"></ng-content>
            </footer>
          }
        </div>
      </div>
    }
  `,
  styleUrls: ['./ft-modal.component.scss'],
})
export class FtModalComponent {
  // ── Inputs ──────────────────────────────────────────────────────
  readonly open = input<boolean>(false);
  readonly size = input<ModalSize>('md');
  readonly closeOnBackdrop = input<boolean>(true);
  readonly closeOnEsc = input<boolean>(true);
  readonly showHeader = input<boolean>(true);
  readonly showFooter = input<boolean>(true);
  readonly headerTitle = input<string>('');
  readonly headerTitleKey = input<string>('');
  readonly describedByKey = input<string>('');
  readonly zIndex = input<number>(1000);

  // ── Outputs ─────────────────────────────────────────────────────
  readonly closed = output<'backdrop' | 'esc' | 'close_button' | 'programmatic'>();

  // ── Internals ───────────────────────────────────────────────────
  readonly mounted = signal(false);   // Controls presence in DOM
  readonly isClosing = signal(false); // Triggers exit animation
  readonly titleId = `ft-modal-title-${Math.random().toString(36).slice(2, 8)}`;
  readonly descId = `ft-modal-desc-${Math.random().toString(36).slice(2, 8)}`;
  readonly closeIcon = ICONS.close;

  private readonly host = inject(ElementRef<HTMLElement>);
  readonly dialog = viewChild<ElementRef<HTMLDivElement>>('dialog');

  // Track element that opened the modal so we can restore focus on close.
  private lastFocused: HTMLElement | null = null;

  // Suppress click-outside-on-mousedown pattern (drag-to-select safety).
  private mouseDownTarget: HTMLElement | null = null;

  readonly labelledBy = computed(() => (this.showHeader() ? this.titleId : ''));
  readonly describedBy = computed(() => (this.describedByKey() ? this.descId : ''));

  constructor() {
    effect(() => {
      const wantsOpen = this.open();
      if (wantsOpen) {
        this.openModal();
      } else if (this.mounted()) {
        this.closeModal('programmatic');
      }
    }, { allowSignalWrites: true });
  }


  // ── Open / close lifecycle ──────────────────────────────────────

  private openModal(): void {
    if (this.mounted()) return;
    this.lastFocused = (document.activeElement as HTMLElement) || null;
    this.lockBodyScroll();
    this.mounted.set(true);
    // Allow mount to render before triggering animation + focus.
    requestAnimationFrame(() => {
      this.trapFocus();
    });
  }

  private closeModal(reason: 'backdrop' | 'esc' | 'close_button' | 'programmatic'): void {
    if (!this.mounted() || this.isClosing()) return;
    this.isClosing.set(true);
    setTimeout(() => {
      this.mounted.set(false);
      this.isClosing.set(false);
      this.unlockBodyScroll();
      this.restoreFocus();
      this.closed.emit(reason);
    }, this.readCloseDuration());
  }

  close(reason: 'backdrop' | 'esc' | 'close_button' | 'programmatic' = 'programmatic'): void {
    if (reason === 'backdrop' && !this.closeOnBackdrop()) return;
    this.closeModal(reason);
  }

  // ── Backdrop interaction ────────────────────────────────────────

  onBackdropClick(_event: MouseEvent): void {
    // Only close if the mousedown started on the backdrop too (avoids
    // closing when the user drags text from inside the modal and releases
    // on the backdrop).
    if (this.mouseDownTarget && this.mouseDownTarget === _event.target) {
      this.close('backdrop');
    }
  }

  onBackdropMouseDown(event: MouseEvent): void {
    this.mouseDownTarget = event.target as HTMLElement;
  }

  // ── Keyboard ────────────────────────────────────────────────────

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: KeyboardEvent): void {
    if (this.mounted() && this.closeOnEsc() && !this.isClosing()) {
      event.preventDefault();
      this.close('esc');
    }
  }

  @HostListener('document:keydown', ['$event'])
  onTab(event: KeyboardEvent): void {
    if (!this.mounted() || this.isClosing() || event.key !== 'Tab') return;
    const dialogEl = this.dialog()?.nativeElement;
    if (!dialogEl) return;

    const focusable = Array.from(
      dialogEl.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

    if (focusable.length === 0) {
      event.preventDefault();
      dialogEl.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // ── Focus + scroll management ───────────────────────────────────

  private trapFocus(): void {
    const dialogEl = this.dialog()?.nativeElement;
    if (!dialogEl) return;
    const focusable = dialogEl.querySelector<HTMLElement>(FOCUSABLE);
    (focusable || dialogEl).focus();
  }

  private restoreFocus(): void {
    if (this.lastFocused && typeof this.lastFocused.focus === 'function') {
      requestAnimationFrame(() => this.lastFocused?.focus());
    }
  }

  private lockBodyScroll(): void {
    if (typeof document === 'undefined') return;
    const scrollY = window.scrollY;
    document.body.dataset['ftModalScroll'] = String(scrollY);
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = '';
    delete document.body.dataset['ftModalScroll'];
  }

  // ── Animation timing ────────────────────────────────────────────

  private readCloseDuration(): number {
    if (typeof document === 'undefined') return 150;
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--modal-close-dur')
      .trim();
    return parseFloat(v) || 150;
  }
}
