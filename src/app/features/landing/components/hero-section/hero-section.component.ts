import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import type gsap from 'gsap';
import { HeroVisualComponent } from '../hero-visual/hero-visual.component';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'ft-hero-section',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon, HeroVisualComponent, TranslatePipe],
  templateUrl: './hero-section.component.html',
  styleUrl: './hero-section.component.scss',
})
export class HeroSectionComponent {
  readonly telegramBotUrl = environment.telegramBotUrl;

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    let ctx: gsap.Context | undefined;
    let destroyed = false;
    let removeScrollListener: (() => void) | undefined;

    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      const initScrollParallax = (): void => {
        if (destroyed) return;
        this.ngZone.runOutsideAngular(async () => {
          const [{ default: gsapLib }, { ScrollTrigger }] = await Promise.all([
            import('gsap'),
            import('gsap/ScrollTrigger'),
          ]);
          if (destroyed) return;

          gsapLib.registerPlugin(ScrollTrigger);
          ctx = gsapLib.context(() => {
            gsapLib.to('.hero-visual__product-shot', {
              yPercent: -8,
              ease: 'none',
              scrollTrigger: {
                trigger: '.hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 0.5,
              },
            });
          }, this.el.nativeElement);
        });
      };

      const onFirstScroll = () => initScrollParallax();
      window.addEventListener('scroll', onFirstScroll, { once: true, passive: true });
      removeScrollListener = () => window.removeEventListener('scroll', onFirstScroll);
    });

    this.destroyRef.onDestroy(() => {
      destroyed = true;
      removeScrollListener?.();
      ctx?.revert();
    });
  }
}
