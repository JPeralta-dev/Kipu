import {
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

export interface QuipuKnot {
  id: string;
  stepNumber: string;
  title: string;
  traditionalName: string;
  valueBadge: string;
  description: string;
  strandIndex: number; // 0: Gold, 1: Amethyst, 2: Emerald, 3: Silk
  knotType: 'simple' | 'eight' | 'compound' | 'sun';
  yNorm: number;
  targetY: number;
}

@Component({
  selector: 'ft-quipu-braid',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon],
  templateUrl: './quipu-braid.component.html',
  styleUrl: './quipu-braid.component.scss',
})
export class QuipuBraidComponent implements OnInit, OnDestroy {
  readonly containerRef = viewChild<ElementRef<HTMLElement>>('quipuSection');

  // Interactive state
  readonly activeKnotIndex = signal<number>(0);
  readonly scrollProgress = signal<number>(0);
  readonly isInteracting = signal<boolean>(false);
  readonly isHovered = signal<boolean>(false);

  // Knots metadata based on Andean quipu decimal positions
  readonly knots: QuipuKnot[] = [
    {
      id: 'capture',
      stepNumber: '01',
      title: 'Registro Instantáneo',
      traditionalName: 'Nudo Simple (Yapana)',
      valueBadge: '+ $1,450.00 Ingreso',
      description:
        'Cada movimiento es un nudo preciso. Un mensaje en Telegram, un audio o tu extracto bancario se traducen en orden financiero sin fricción.',
      strandIndex: 0,
      knotType: 'simple',
      yNorm: 0.18,
      targetY: 130,
    },
    {
      id: 'budget',
      stepNumber: '02',
      title: 'Límites Conscientes',
      traditionalName: 'Nudo en Ocho (Quipu-khipu)',
      valueBadge: '65% del límite mensual',
      description:
        'Tus límites no son cadenas, son guías de serenidad. Kipu monitorea tus gastos por categoría y te avisa con calma antes de romper la armonía.',
      strandIndex: 1,
      knotType: 'eight',
      yNorm: 0.42,
      targetY: 260,
    },
    {
      id: 'goals',
      stepNumber: '03',
      title: 'Metas Entrelazadas',
      traditionalName: 'Nudo Compuesto (Pajchana)',
      valueBadge: '$4,800 / $6,000 (80%)',
      description:
        'Ahorrar para tu fondo de paz o tu próximo proyecto. Cada aporte se trenza de forma visual y medible hacia tu tranquilidad financiera.',
      strandIndex: 2,
      knotType: 'compound',
      yNorm: 0.68,
      targetY: 400,
    },
    {
      id: 'peace',
      stepNumber: '04',
      title: 'Soberanía y Privacidad',
      traditionalName: 'Nudo Solar (Inti Khipu)',
      valueBadge: '100% Tus Datos',
      description:
        'Sin vender tu información ni pedirte credenciales bancarias. Una tecnología noble, sobria y diseñada para devolverte el control.',
      strandIndex: 0,
      knotType: 'sun',
      yNorm: 0.90,
      targetY: 520,
    },
  ];

  // Animated strands state
  readonly strandPaths = signal<{
    d1: string;
    d2: string;
    d3: string;
    dAccent: string;
    dFineThread: string;
    knotPoints: { x: number; y: number }[];
  }>({
    d1: '',
    d2: '',
    d3: '',
    dAccent: '',
    dFineThread: '',
    knotPoints: [
      { x: 230, y: 130 },
      { x: 230, y: 260 },
      { x: 230, y: 400 },
      { x: 230, y: 520 },
    ],
  });

  // Fluid physics & continuous animation tracking
  private rafId: number | null = null;
  private currentPhase = 0;
  private targetPhase = 0;
  private waveAmplitude = 68;
  private currentWiggle = 0;
  private targetWiggle = 0;
  private isBrowser = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private ngZone: NgZone
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.updateStrands(0, 0);
      this.ngZone.runOutsideAngular(() => {
        this.setupScrollObserver();
        this.startLoop();
      });
    }
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  selectKnot(index: number): void {
    this.activeKnotIndex.set(index);
    const knot = this.knots[index];
    if (knot) {
      this.targetPhase = knot.yNorm * Math.PI * 4;
    }
  }

  onMouseMove(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (rect.width > 0) {
      const mouseXRatio = (e.clientX - rect.left) / rect.width;
      this.targetWiggle = (mouseXRatio - 0.5) * 35;
    }
  }

  onMouseEnter(): void {
    this.isHovered.set(true);
  }

  onMouseLeave(): void {
    this.isHovered.set(false);
    this.targetWiggle = 0;
  }

  private setupScrollObserver(): void {
    const el = this.containerRef()?.nativeElement;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || 800;
      const totalDist = rect.height + windowHeight;
      const progress = Math.min(Math.max((windowHeight - rect.top) / totalDist, 0), 1);
      
      this.scrollProgress.set(progress);
      this.targetPhase = progress * Math.PI * 4.5;

      if (progress < 0.28) {
        this.activeKnotIndex.set(0);
      } else if (progress < 0.52) {
        this.activeKnotIndex.set(1);
      } else if (progress < 0.76) {
        this.activeKnotIndex.set(2);
      } else {
        this.activeKnotIndex.set(3);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  private startLoop(): void {
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Ultra-smooth exponential spring damping for fluid organic motion
      const phaseDiff = this.targetPhase - this.currentPhase;
      this.currentPhase += phaseDiff * (1 - Math.exp(-5.5 * dt));

      const wiggleDiff = this.targetWiggle - this.currentWiggle;
      this.currentWiggle += wiggleDiff * (1 - Math.exp(-8 * dt));

      // Gentle ambient breathing wave (frequencies 0.8Hz and 1.4Hz)
      const t = time * 0.001;
      const ambientBreathing = Math.sin(t * 1.2) * 3.5 + Math.sin(t * 2.1) * 1.5;

      this.updateStrands(this.currentPhase, ambientBreathing + this.currentWiggle);
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * Generates high-density organic Bézier curves for the braided cords.
   * Uses dual-harmonic synthesis so cords look woven rather than mathematical sin-waves.
   */
  private updateStrands(phase: number, wiggleOffset: number): void {
    const width = 460;
    const height = 620;
    const centerX = width / 2;
    const startY = 45;
    const steps = 54; // High density for flawless fluid curves
    const dy = (height - startY) / steps;

    // Organic envelope: gentle top gathering -> rhythmic full braid -> subtle bottom tapering
    const ampAt = (y: number) => {
      const normY = (y - startY) / (height - startY);
      return Math.sin(Math.pow(normY, 0.85) * Math.PI) * this.waveAmplitude * (1 + normY * 0.15);
    };

    const points1: { x: number; y: number }[] = [];
    const points2: { x: number; y: number }[] = [];
    const points3: { x: number; y: number }[] = [];
    const pointsAccent: { x: number; y: number }[] = [];
    const pointsFine: { x: number; y: number }[] = [];

    const wavelength = 230;
    const k = (2 * Math.PI) / wavelength;

    for (let i = 0; i <= steps; i++) {
      const y = startY + i * dy;
      const amp = ampAt(y);
      const wiggle = wiggleOffset * Math.sin((y / height) * Math.PI);

      // Primary harmonic
      const theta = y * k + phase;
      // Secondary harmonic (gives natural rope-twist texture)
      const secondaryHarmonic = Math.sin(theta * 2) * 5;

      const x1 = centerX + amp * Math.sin(theta) + secondaryHarmonic + wiggle;
      const x2 = centerX + amp * Math.sin(theta + (2 * Math.PI) / 3) + secondaryHarmonic * 0.8 + wiggle * 0.7;
      const x3 = centerX + amp * Math.sin(theta + (4 * Math.PI) / 3) + secondaryHarmonic * 0.6 + wiggle * 0.4;
      const xAccent = centerX + (amp * 1.22) * Math.sin(theta * 0.65 + phase * 0.4) + wiggle * 1.1;
      const xFine = centerX + (amp * 0.85) * Math.sin(theta * 1.35 + phase * 0.8) + wiggle * 0.5;

      points1.push({ x: x1, y });
      points2.push({ x: x2, y });
      points3.push({ x: x3, y });
      pointsAccent.push({ x: xAccent, y });
      pointsFine.push({ x: xFine, y });
    }

    const d1 = this.pointsToSpline(points1);
    const d2 = this.pointsToSpline(points2);
    const d3 = this.pointsToSpline(points3);
    const dAccent = this.pointsToSpline(pointsAccent);
    const dFineThread = this.pointsToSpline(pointsFine);

    // Exact (x, y) coordinates for each knot along its designated cord
    const knotPoints = this.knots.map((knot) => {
      const targetY = knot.targetY;
      const amp = ampAt(targetY);
      const theta = targetY * k + phase;
      const secondaryHarmonic = Math.sin(theta * 2) * 5;
      const wiggle = wiggleOffset * Math.sin((targetY / height) * Math.PI);

      let x = centerX;
      if (knot.strandIndex === 0) {
        x = centerX + amp * Math.sin(theta) + secondaryHarmonic + wiggle;
      } else if (knot.strandIndex === 1) {
        x = centerX + amp * Math.sin(theta + (2 * Math.PI) / 3) + secondaryHarmonic * 0.8 + wiggle * 0.7;
      } else if (knot.strandIndex === 2) {
        x = centerX + amp * Math.sin(theta + (4 * Math.PI) / 3) + secondaryHarmonic * 0.6 + wiggle * 0.4;
      } else {
        x = centerX + amp * 1.22 * Math.sin(theta * 0.65 + phase * 0.4) + wiggle;
      }

      return { x, y: targetY };
    });

    this.strandPaths.set({
      d1,
      d2,
      d3,
      dAccent,
      dFineThread,
      knotPoints,
    });
  }

  private pointsToSpline(points: { x: number; y: number }[]): string {
    if (points.length < 2) return '';
    let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    return path;
  }
}
