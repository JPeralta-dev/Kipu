import {
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'ft-shared-finance',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon],
  templateUrl: './shared-finance.component.html',
  styleUrl: './shared-finance.component.scss',
})
export class SharedFinanceComponent implements OnInit, OnDestroy {
  readonly stageRef = viewChild<ElementRef<HTMLElement>>('cascadeStage');

  readonly isVisible = signal(false);
  readonly isSettled = signal(false);
  readonly activeHoverCard = signal<number | null>(null);

  private observer: IntersectionObserver | null = null;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.setupIntersectionObserver();
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  toggleSettled(): void {
    this.isSettled.update((v) => !v);
  }

  setHoverCard(index: number | null): void {
    this.activeHoverCard.set(index);
  }

  private setupIntersectionObserver(): void {
    const el = this.stageRef()?.nativeElement;
    if (!el || typeof IntersectionObserver === 'undefined') {
      this.isVisible.set(true);
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.isVisible.set(true);
            this.observer?.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    this.observer.observe(el);
  }
}
