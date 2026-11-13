import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  inject,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import type gsap from 'gsap';

interface ParallaxTracker {
  xTo: gsap.QuickToFunc;
  yTo: gsap.QuickToFunc;
  rotTo?: gsap.QuickToFunc;
  shift: number;
  baseRot: number;
}

@Component({
  selector: 'ft-landing-background',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './landing-background.component.html',
  styleUrl: './landing-background.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingBackgroundComponent {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    let ctx: gsap.Context | undefined;
    let destroyed = false;
    let removeMouseMove: (() => void) | undefined;
    let removeFirstMove: (() => void) | undefined;

    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      const initParallax = (firstEvent: MouseEvent): void => {
        if (destroyed) return;
        this.ngZone.runOutsideAngular(async () => {
          const { default: gsapLib } = await import('gsap');
          if (destroyed) return;

          ctx = gsapLib.context(() => {
            const items = Array.from(
              this.el.nativeElement.querySelectorAll<HTMLElement>('[data-depth]')
            );

            const trackers: ParallaxTracker[] = items.map((item) => {
              const depth = Number(item.dataset['depth'] ?? 1);
              const isCircle = item.classList.contains('landing-bg__circle');
              const shift = isCircle ? depth * 14 : depth * 26;
              const xTo = gsapLib.quickTo(item, 'x', { duration: 0.85, ease: 'power3.out' });
              const yTo = gsapLib.quickTo(item, 'y', { duration: 0.85, ease: 'power3.out' });

              let baseRot = 0;
              let rotTo: gsap.QuickToFunc | undefined;
              if (item.hasAttribute('data-index')) {
                const idx = Number(item.dataset['index'] ?? 0);
                baseRot = idx % 2 === 0 ? -8 : 8;
                gsapLib.set(item, { rotation: baseRot });
                rotTo = gsapLib.quickTo(item, 'rotation', { duration: 1.0, ease: 'power3.out' });
              }

              return { xTo, yTo, rotTo, shift, baseRot };
            });

            const onMouseMove = (event: MouseEvent): void => {
              const nx = event.clientX / window.innerWidth - 0.5;
              const ny = event.clientY / window.innerHeight - 0.5;

              for (const tracker of trackers) {
                tracker.xTo(nx * tracker.shift);
                tracker.yTo(ny * tracker.shift);
                if (tracker.rotTo) {
                  tracker.rotTo(tracker.baseRot + nx * 15);
                }
              }
            };

            onMouseMove(firstEvent);
            window.addEventListener('mousemove', onMouseMove, { passive: true });
            removeMouseMove = () => window.removeEventListener('mousemove', onMouseMove);
          }, this.el.nativeElement);
        });
      };

      const onFirstMove = (event: MouseEvent) => initParallax(event);
      window.addEventListener('mousemove', onFirstMove, { once: true, passive: true });
      removeFirstMove = () => window.removeEventListener('mousemove', onFirstMove);
    });

    this.destroyRef.onDestroy(() => {
      destroyed = true;
      removeFirstMove?.();
      removeMouseMove?.();
      ctx?.revert();
    });
  }
}
