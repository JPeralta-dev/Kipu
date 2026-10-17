import { Pipe, PipeTransform, inject, ChangeDetectorRef, effect } from '@angular/core';
import { TranslationService } from '../services/translation.service';

const CATEGORY_I18N_MAP: Record<string, Record<string, string>> = {
  'Food': { es: 'Comida', en: 'Food', fr: 'Alimentation' },
  'Transport': { es: 'Transporte', en: 'Transport', fr: 'Transport' },
  'Entertainment': { es: 'Entretenimiento', en: 'Entertainment', fr: 'Divertissement' },
  'Health': { es: 'Salud', en: 'Health', fr: 'Santé' },
  'Education': { es: 'Educación', en: 'Education', fr: 'Éducation' },
  'Shopping': { es: 'Compras', en: 'Shopping', fr: 'Achats' },
  'Services': { es: 'Servicios', en: 'Services', fr: 'Services' },
  'Income': { es: 'Ingresos', en: 'Income', fr: 'Revenus' },
  'Salary': { es: 'Salario', en: 'Salary', fr: 'Salaire' },
  'Freelance': { es: 'Freelance', en: 'Freelance', fr: 'Freelance' },
  'Investment': { es: 'Inversiones', en: 'Investment', fr: 'Investissements' },
  'Other': { es: 'Otros', en: 'Other', fr: 'Autres' },
  'Housing': { es: 'Vivienda', en: 'Housing', fr: 'Logement' },
  'Utilities': { es: 'Servicios públicos', en: 'Utilities', fr: 'Services publics' },
  'Subscriptions': { es: 'Suscripciones', en: 'Subscriptions', fr: 'Abonnements' },
  'Travel': { es: 'Viajes', en: 'Travel', fr: 'Voyages' },
  'Groceries': { es: 'Supermercado', en: 'Groceries', fr: 'Épicerie' },
  'Restaurant': { es: 'Restaurante', en: 'Restaurant', fr: 'Restaurant' },
  'Comida': { es: 'Comida', en: 'Food', fr: 'Alimentation' },
  'Servicios': { es: 'Servicios', en: 'Services', fr: 'Services' },
  'Transporte': { es: 'Transporte', en: 'Transport', fr: 'Transport' },
  'Entretenimiento': { es: 'Entretenimiento', en: 'Entertainment', fr: 'Divertissement' },
};

@Pipe({
  name: 'categoryTranslate',
  standalone: true,
  pure: false,
})
export class CategoryTranslatePipe implements PipeTransform {
  private translationService = inject(TranslationService);
  private cdr = inject(ChangeDetectorRef, { optional: true });

  constructor() {
    // Re-evaluate when language changes
    effect(() => {
      this.translationService.currentLang();
      this.cdr?.markForCheck();
    });
  }

  transform(categoryName: string | undefined | null): string {
    if (!categoryName) return '';

    const lang = this.translationService.currentLang();
    const mapped = CATEGORY_I18N_MAP[categoryName];

    if (mapped && mapped[lang]) {
      return mapped[lang];
    }

    return categoryName;
  }
}
