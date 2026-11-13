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

export interface BudgetPreview {
  category: string;
  icon: string;
  spent: number;
  limit: number;
  status: 'normal' | 'warning' | 'exceeded';
}

export interface GoalPreview {
  title: string;
  category: string;
  icon: string;
  current: number;
  target: number;
  eta: string;
  color: string;
}

@Component({
  selector: 'ft-product-showcase',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon],
  templateUrl: './product-showcase.component.html',
  styleUrl: './product-showcase.component.scss',
})
export class ProductShowcaseComponent {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    let ctx: gsap.Context | undefined;
    let observer: IntersectionObserver | undefined;
    let destroyed = false;

    const initAnimations = (): void => {
      if (destroyed) return;
      this.ngZone.runOutsideAngular(async () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }

        const [{ default: gsapLib }, { ScrollTrigger }] = await Promise.all([
          import('gsap'),
          import('gsap/ScrollTrigger'),
        ]);
        if (destroyed) return;

        gsapLib.registerPlugin(ScrollTrigger);

        ctx = gsapLib.context(() => {
          gsapLib.fromTo(
            ['.showcase__badge', '.showcase__title', '.showcase__subtitle'],
            { y: 28, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.95,
              stagger: 0.1,
              ease: 'expo.out',
              scrollTrigger: {
                trigger: '.showcase__header',
                start: 'top 84%',
                once: true,
              },
            }
          );

          const card1 = this.el.nativeElement.querySelector<HTMLElement>('.deck-card--01');
          const card2 = this.el.nativeElement.querySelector<HTMLElement>('.deck-card--02');
          const card3 = this.el.nativeElement.querySelector<HTMLElement>('.deck-card--03');

          const mm = gsapLib.matchMedia();
          mm.add('(min-width: 860px)', () => {
            if (card1 && card2) {
              gsapLib.to(card1, {
                scale: 0.94,
                opacity: 0.55,
                filter: 'blur(1.5px)',
                ease: 'none',
                scrollTrigger: {
                  trigger: card2,
                  start: 'top 85%',
                  end: 'top 130px',
                  scrub: 0.4,
                },
              });
            }

            if (card2 && card3) {
              gsapLib.to(card2, {
                scale: 0.95,
                opacity: 0.6,
                filter: 'blur(1.5px)',
                ease: 'none',
                scrollTrigger: {
                  trigger: card3,
                  start: 'top 85%',
                  end: 'top 155px',
                  scrub: 0.4,
                },
              });
            }
          });

          for (const card of [card1, card2, card3]) {
            if (!card) continue;

            const narrativeItems = card.querySelectorAll('.deck-card__narrative > *');
            if (narrativeItems.length > 0) {
              gsapLib.fromTo(
                narrativeItems,
                { y: 22, autoAlpha: 0 },
                {
                  y: 0,
                  autoAlpha: 1,
                  stagger: 0.08,
                  duration: 0.85,
                  ease: 'power3.out',
                  scrollTrigger: {
                    trigger: card,
                    start: 'top 82%',
                    once: true,
                  },
                }
              );
            }

            const widgetCard = card.querySelector('.widget-card');
            if (widgetCard) {
              gsapLib.fromTo(
                widgetCard,
                { y: 28, scale: 0.97, autoAlpha: 0 },
                {
                  y: 0,
                  scale: 1,
                  autoAlpha: 1,
                  duration: 0.95,
                  ease: 'expo.out',
                  scrollTrigger: {
                    trigger: card,
                    start: 'top 82%',
                    once: true,
                  },
                }
              );
            }
          }

          if (card1) {
            const budgetBars = card1.querySelectorAll('.budget-progress__bar');
            if (budgetBars.length > 0) {
              gsapLib.fromTo(
                budgetBars,
                { scaleX: 0 },
                {
                  scaleX: 1,
                  duration: 1.15,
                  stagger: 0.1,
                  ease: 'expo.out',
                  scrollTrigger: {
                    trigger: card1,
                    start: 'top 78%',
                    once: true,
                  },
                }
              );
            }
          }

          if (card2) {
            const goalBars = card2.querySelectorAll('.goal-bar__fill');
            if (goalBars.length > 0) {
              gsapLib.fromTo(
                goalBars,
                { scaleX: 0 },
                {
                  scaleX: 1,
                  duration: 1.15,
                  stagger: 0.12,
                  ease: 'expo.out',
                  scrollTrigger: {
                    trigger: card2,
                    start: 'top 78%',
                    once: true,
                  },
                }
              );
            }
          }

          if (card3) {
            const insightBubbles = card3.querySelectorAll('.insight-bubble');
            if (insightBubbles.length > 0) {
              gsapLib.fromTo(
                insightBubbles,
                { x: 24, autoAlpha: 0 },
                {
                  x: 0,
                  autoAlpha: 1,
                  duration: 0.85,
                  stagger: 0.12,
                  ease: 'expo.out',
                  scrollTrigger: {
                    trigger: card3,
                    start: 'top 78%',
                    once: true,
                  },
                }
              );
            }
          }
        }, this.el.nativeElement);
      });
    };

    afterNextRender(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      if (typeof IntersectionObserver !== 'undefined') {
        observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              observer?.disconnect();
              observer = undefined;
              initAnimations();
            }
          },
          { rootMargin: '0px' }
        );
        observer.observe(this.el.nativeElement);
      } else {
        initAnimations();
      }
    });

    this.destroyRef.onDestroy(() => {
      destroyed = true;
      observer?.disconnect();
      ctx?.revert();
    });
  }

  readonly budgets: BudgetPreview[] = [
    {
      category: 'Alimentación & Supermercado',
      icon: 'food',
      spent: 380,
      limit: 450,
      status: 'normal',
    },
    {
      category: 'Transporte & Movilidad',
      icon: 'transport',
      spent: 65,
      limit: 120,
      status: 'normal',
    },
    {
      category: 'Cafetería & Salidas',
      icon: 'entertainment',
      spent: 98,
      limit: 90,
      status: 'exceeded',
    },
    {
      category: 'Hogar & Servicios',
      icon: 'utilities',
      spent: 140,
      limit: 180,
      status: 'normal',
    },
  ];

  readonly goals: GoalPreview[] = [
    {
      title: 'Fondo de Tranquilidad',
      category: 'Seguridad',
      icon: 'shieldCheck',
      current: 3600,
      target: 5000,
      eta: 'En 3 meses',
      color: '#F59E0B',
    },
    {
      title: 'Viaje a los Andes',
      category: 'Experiencia',
      icon: 'globe',
      current: 1200,
      target: 2500,
      eta: 'En 5 meses',
      color: '#C084FC',
    },
    {
      title: 'Equipo de Trabajo',
      category: 'Tecnología',
      icon: 'briefcase',
      current: 1800,
      target: 2000,
      eta: 'Próximo mes (90%)',
      color: '#34D399',
    },
  ];

  getPercent(current: number, target: number): number {
    return Math.min(Math.round((current / target) * 100), 100);
  }
}
