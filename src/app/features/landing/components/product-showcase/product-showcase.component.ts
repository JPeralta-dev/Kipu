import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';

export type ShowcaseTab = 'budgets' | 'goals' | 'insights' | 'logging';

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
  readonly activeTab = signal<ShowcaseTab>('budgets');
  readonly activeInputMethod = signal<'telegram' | 'manual' | 'import'>('telegram');

  readonly budgets: BudgetPreview[] = [
    {
      category: 'Alimentación & Supermercado',
      icon: 'heroShoppingCart',
      spent: 380,
      limit: 450,
      status: 'normal',
    },
    {
      category: 'Transporte & Movilidad',
      icon: 'heroBolt',
      spent: 65,
      limit: 120,
      status: 'normal',
    },
    {
      category: 'Cafetería & Salidas',
      icon: 'heroHeart',
      spent: 98,
      limit: 90,
      status: 'exceeded',
    },
    {
      category: 'Hogar & Servicios',
      icon: 'heroHome',
      spent: 140,
      limit: 180,
      status: 'normal',
    },
  ];

  readonly goals: GoalPreview[] = [
    {
      title: 'Fondo de Tranquilidad',
      category: 'Seguridad',
      current: 3600,
      target: 5000,
      eta: 'En 3 meses',
      color: '#F59E0B',
    },
    {
      title: 'Viaje a los Andes',
      category: 'Experiencia',
      current: 1200,
      target: 2500,
      eta: 'En 5 meses',
      color: '#C084FC',
    },
    {
      title: 'Nueva Herramienta de Trabajo',
      category: 'Tecnología',
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
