import {
  Component,
  ElementRef,
  HostListener,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
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
  strandIndex: number; // 0: Gold, 1: Amethyst, 2: Emerald, 3: Coral
  knotType: 'simple' | 'eight' | 'compound' | 'sun';
  yNorm: number; // Normalized vertical height [0, 1]
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

  // Knots metadata based on authentic Andean decimal quipu logic & Kipu's modern capabilities
  readonly knots: QuipuKnot[] = [
    {
      id: 'capture',
      stepNumber: '01',
      title: 'Registro Instantáneo',
      traditionalName: 'Nudo Simple (Yapana)',
      valueBadge: '+ $1,450.00 Sueldo',
      description:
        'Cada movimiento es un nudo preciso. Un mensaje por Telegram, un audio o un archivo bancario se traducen en orden financiero sin esfuerzo manual.',
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
      valueBadge: '65% del presupuesto',
      description:
        'Tus límites no son cadenas, son guías de tranquilidad. Kipu monitorea tus gastos por categoría y te acompaña con serenidad antes de que te pases.',
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
        'Ahorrar para tu fondo de paz o tu próximo viaje. Cada centavo apartado se trenza de forma visual y medible hacia tu libertad financiera.',
      strandIndex: 2,
      knotType: 'compound',
      yNorm: 0.68,
      targetY: 400,
    },
    {
      id: 'peace',
      stepNumber: '04',
      title: 'Soberanía y Privacidad',
      traditionalName: 'Nudo Dorado Solar (Inti Khipu)',
      valueBadge: '100% Tus Datos',
      description:
        'Sin vender tus datos a anunciantes ni exigir tus claves bancarias secretas. Una herramienta noble, calmada y diseñada para devolverte el control.',
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
    knotPoints: { x: number; y: number }[];
  }>({
    d1: '',
    d2: '',
    d3: '',
    dAccent: '',
    knotPoints: [
      { x: 230, y: 130 },
      { x: 230, y: 260 },
      { x: 230, y: 400 },
      { x: 230, y: 520 },
    ],
  });

  // Physics & animation frame tracking
  private rafId: number | null = null;
  private currentPhase = 0;
  private targetPhase = 0;
  private waveAmplitude = 65;
  private currentWiggle = 0;
  private mouseXRatio = 0.5;
  private isBrowser = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    private ngZone: NgZone
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.updateStrands(0);
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
    // Smoothly nudge phase towards selected knot
    const knot = this.knots[index];
    if (knot) {
      this.targetPhase = knot.yNorm * Math.PI * 4;
    }
  }

  onMouseMove(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (rect.width > 0) {
      this.mouseXRatio = (e.clientX - rect.left) / rect.width;
      this.currentWiggle = (this.mouseXRatio - 0.5) * 40;
    }
  }

  onMouseEnter(): void {
    this.isHovered.set(true);
  }

  onMouseLeave(): void {
    this.isHovered.set(false);
    this.currentWiggle = 0;
  }

  private setupScrollObserver(): void {
    const el = this.containerRef()?.nativeElement;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || 800;
      
      // Calculate how far through the element the user has scrolled
      const totalDist = rect.height + windowHeight;
      const progress = Math.min(Math.max((windowHeight - rect.top) / totalDist, 0), 1);
      
      this.scrollProgress.set(progress);
      this.targetPhase = progress * Math.PI * 5;

      // Update active knot based on progress range
      if (progress < 0.25) {
        this.activeKnotIndex.set(0);
      } else if (progress < 0.5) {
        this.activeKnotIndex.set(1);
      } else if (progress < 0.75) {
        this.activeKnotIndex.set(2);
      } else {
        this.activeKnotIndex.set(3);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  private startLoop(): void {
    const loop = () => {
      // Spring/Lerp interpolation for fluid organic feel (12 Principles of Animation)
      const diff = this.targetPhase - this.currentPhase;
      this.currentPhase += diff * 0.08;

      // Idle gentle undulating breathing motion
      const breathing = Math.sin(Date.now() * 0.0018) * 4;

      this.updateStrands(this.currentPhase, breathing + this.currentWiggle);
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  /**
   * Generates mathematical Bézier curves for the braided cords.
   * Simulates a 3-strand Inca braid hanging from the primary cord.
   */
  private updateStrands(phase: number, wiggleOffset = 0): void {
    const width = 460;
    const height = 620;
    const centerX = width / 2;
    const startY = 60; // Just below the horizontal head cord
    const steps = 30;
    const dy = (height - startY) / steps;

    // Amplitude envelope: starts narrow at the top anchor, expands into the rhythmic braid, tightens at the end
    const ampAt = (y: number) => {
      const t = (y - startY) / (height - startY);
      // Soft start and organic tapering
      return Math.sin(t * Math.PI) * this.waveAmplitude * (1 + (t * 0.2));
    };

    // Calculate sample points for the 3 main strands + 1 outer subsidiary thread
    const pointsStrand1: { x: number; y: number }[] = [];
    const pointsStrand2: { x: number; y: number }[] = [];
    const pointsStrand3: { x: number; y: number }[] = [];
    const pointsAccent: { x: number; y: number }[] = [];

    const wavelength = 240; // Frequency of braid turns
    const k = (2 * Math.PI) / wavelength;

    for (let i = 0; i <= steps; i++) {
      const y = startY + i * dy;
      const amp = ampAt(y);
      const wiggle = wiggleOffset * Math.sin((y / height) * Math.PI);

      // Phase offsets for 3-strand braid (120 deg = 2pi / 3 apart)
      const theta = y * k + phase;

      const x1 = centerX + amp * Math.sin(theta) + wiggle;
      const x2 = centerX + amp * Math.sin(theta + (2 * Math.PI) / 3) + wiggle * 0.7;
      const x3 = centerX + amp * Math.sin(theta + (4 * Math.PI) / 3) + wiggle * 0.4;
      const xAccent = centerX + (amp * 1.25) * Math.sin(theta * 0.7 + phase * 0.5) + wiggle * 1.1;

      pointsStrand1.push({ x: x1, y });
      pointsStrand2.push({ x: x2, y });
      pointsStrand3.push({ x: x3, y });
      pointsAccent.push({ x: xAccent, y });
    }

    // Convert sample points to smooth SVG paths via Catmull-Rom or cubic bezier splines
    const d1 = this.pointsToSpline(pointsStrand1);
    const d2 = this.pointsToSpline(pointsStrand2);
    const d3 = this.pointsToSpline(pointsStrand3);
    const dAccent = this.pointsToSpline(pointsAccent);

    // Compute exact (x, y) coordinates for each of the 4 knots along the cords
    const knotPoints = this.knots.map((knot) => {
      const targetY = knot.targetY;
      const amp = ampAt(targetY);
      const theta = targetY * k + phase;
      const wiggle = wiggleOffset * Math.sin((targetY / height) * Math.PI);

      let x = centerX;
      if (knot.strandIndex === 0) {
        x = centerX + amp * Math.sin(theta) + wiggle;
      } else if (knot.strandIndex === 1) {
        x = centerX + amp * Math.sin(theta + (2 * Math.PI) / 3) + wiggle * 0.7;
      } else if (knot.strandIndex === 2) {
        x = centerX + amp * Math.sin(theta + (4 * Math.PI) / 3) + wiggle * 0.4;
      } else {
        x = centerX + amp * 1.25 * Math.sin(theta * 0.7 + phase * 0.5) + wiggle;
      }

      return { x, y: targetY };
    });

    this.strandPaths.set({
      d1,
      d2,
      d3,
      dAccent,
      knotPoints,
    });
  }

  /**
   * Converts an array of points into a smooth SVG bezier spline path.
   */
  private pointsToSpline(points: { x: number; y: number }[]): string {
    if (points.length < 2) return '';

    let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      // Catmull-Rom to Cubic Bezier conversion
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    return path;
  }
}
