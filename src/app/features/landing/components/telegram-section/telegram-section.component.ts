import {
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import type gsap from 'gsap';
import { TranslatePipe } from '../../../../core/pipes/translate.pipe';
import { environment } from '../../../../../environments/environment';

export interface RegistrationMethod {
  id: string;
  number: string;
  title: string;
  badge?: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'ft-telegram-section',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon, TranslatePipe],
  templateUrl: './telegram-section.component.html',
  styleUrl: './telegram-section.component.scss',
})
export class TelegramSectionComponent {
  readonly telegramBotUrl = environment.telegramBotUrl;
  readonly activeMethod = signal<number>(0);

  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);
  private gsapLib: typeof gsap | null = null;
  private destroyed = false;

  constructor() {
    let ctx: gsap.Context | undefined;
    let observer: IntersectionObserver | undefined;

    const initAnimations = (): void => {
      if (this.destroyed) return;
      this.ngZone.runOutsideAngular(async () => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          return;
        }

        const [{ default: gsapLib }, { ScrollTrigger }] = await Promise.all([
          import('gsap'),
          import('gsap/ScrollTrigger'),
        ]);
        if (this.destroyed) return;

        this.gsapLib = gsapLib;
        gsapLib.registerPlugin(ScrollTrigger);

        ctx = gsapLib.context(() => {
          const tl = gsapLib.timeline({
            defaults: { ease: 'expo.out' },
            scrollTrigger: {
              trigger: '.telegram-section',
              start: 'top 80%',
              once: true,
            },
          });

          tl.fromTo(
            ['.telegram-section__badge', '.telegram-section__title', '.telegram-section__description'],
            { y: 24, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.09 }
          )
            .fromTo(
              '.method-card',
              { x: -20, autoAlpha: 0 },
              { x: 0, autoAlpha: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' },
              '-=0.55'
            )
            .fromTo(
              '.telegram-section__actions',
              { y: 16, autoAlpha: 0 },
              { y: 0, autoAlpha: 1, duration: 0.75 },
              '-=0.5'
            )
            .fromTo(
              '.device-frame',
              { y: 40, autoAlpha: 0, scale: 0.94, rotate: 2 },
              { y: 0, autoAlpha: 1, scale: 1, rotate: 0, duration: 1.15 },
              0.15
            );

          gsapLib.fromTo(
            '.device-frame__image',
            { yPercent: 6 },
            {
              yPercent: -6,
              ease: 'none',
              scrollTrigger: {
                trigger: '.telegram-section',
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.6,
              },
            }
          );
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
          { rootMargin: '250px 0px' }
        );
        observer.observe(this.el.nativeElement);
      } else {
        initAnimations();
      }
    });

    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      observer?.disconnect();
      ctx?.revert();
    });
  }

  selectMethod(index: number): void {
    if (this.activeMethod() === index) return;
    this.activeMethod.set(index);

    this.ngZone.runOutsideAngular(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const img = this.el.nativeElement.querySelector('.device-frame__image');
      if (!img) return;

      const animate = (gsapLib: typeof gsap) => {
        if (this.destroyed) return;
        gsapLib.fromTo(
          img,
          { scale: 0.98, y: 4 },
          { scale: 1, y: 0, duration: 0.45, ease: 'back.out(2)', overwrite: 'auto' }
        );
      };

      if (this.gsapLib) {
        animate(this.gsapLib);
      } else {
        void import('gsap').then(({ default: gsapLib }) => {
          this.gsapLib = gsapLib;
          animate(gsapLib);
        });
      }
    });
  }

  readonly methods: RegistrationMethod[] = [
    {
      id: 'telegram',
      number: '01',
      title: 'KipuBot en Telegram',
      badge: 'El más rápido · 3 seg',
      icon: 'telegram',
      description:
        'Envía un mensaje rápido como "Cena con amigos $24" o una nota de voz. KipuBot detecta el importe, la fecha y la categoría automáticamente.',
    },
    {
      id: 'manual',
      number: '02',
      title: 'A mano en la app',
      icon: 'plus',
      description:
        'Cambia entre gasto o ingreso con un toque. Categorías inmediatas, sin formularios eternos ni campos obligatorios molestos.',
    },
    {
      id: 'bank-import',
      number: '03',
      title: 'Extracto Bancario Seguro',
      icon: 'documentArrowDown',
      description:
        'Arrastra tu extracto en CSV o Excel (.xlsx). Detecta duplicados automáticamente sin comprometer tus contraseñas bancarias.',
    },
  ];
}
