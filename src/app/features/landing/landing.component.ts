import { Component, HostListener, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { NgIcon } from '@ng-icons/core';
import { ICONS } from '../../shared/icons/icon-registry';
import { PublicNavbarComponent } from './components/public-navbar/public-navbar.component';
import { HeroSectionComponent } from './components/hero-section/hero-section.component';
import { QuipuBraidComponent } from './components/quipu-braid/quipu-braid.component';
import { ProductShowcaseComponent } from './components/product-showcase/product-showcase.component';
import { TelegramSectionComponent } from './components/telegram-section/telegram-section.component';
import { FinalCtaComponent } from './components/final-cta/final-cta.component';
import { LandingBackgroundComponent } from './components/landing-background/landing-background.component';
import { FooterComponent } from './components/footer/footer.component';
import { PricingComponent } from './components/pricing/pricing.component';
import { ComparisonTableComponent } from './components/comparison-table/comparison-table.component';
import { TestimonialsComponent } from './components/testimonials/testimonials.component';
import { FaqComponent } from './components/faq/faq.component';
import { TrustSignalsComponent } from './components/trust-signals/trust-signals.component';
import { ResourcesSectionComponent } from './components/resources-section/resources-section.component';
import { FtSubtleRevealDirective } from '../../shared/directives/ft-subtle-reveal.directive';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { TranslationService } from '../../core/services/translation.service';
import { TierCard, TierComparisonRow, Testimonial, FaqItem, TrustBadge } from '../../core/models/tier.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    NgIcon,
    PublicNavbarComponent,
    HeroSectionComponent,
    QuipuBraidComponent,
    ProductShowcaseComponent,
    TelegramSectionComponent,
    FinalCtaComponent,
    LandingBackgroundComponent,
    FooterComponent,
    PricingComponent,
    ComparisonTableComponent,
    TestimonialsComponent,
    FaqComponent,
    TrustSignalsComponent,
    ResourcesSectionComponent,
    FtSubtleRevealDirective,
    TranslatePipe,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent implements OnInit {
  private readonly translationService = inject(TranslationService);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  readonly scrollProgress = signal(0);
  readonly telegramBotUrl = environment.telegramBotUrl;
  readonly pricingEnabled = environment.pricingEnabled;

  /** Public site URL — used as og:url and twitter:url. */
  readonly siteUrl = environment.production
    ? 'https://kipufinance.online'
    : 'http://localhost:4200';

  /** Absolute 1200×630 PNG used by social link-preview crawlers. */
  readonly ogImageUrl = 'https://kipufinance.online/assets/og/og-image.png';

  private scrollTicking = false;

  ngOnInit(): void {
    this.setSeoTags();
  }

  /**
   * Set Open Graph, Twitter Card, description, and keywords meta tags.
   * Values are pulled from the active language's translations so they
   * update when the user switches language.
   */
  private setSeoTags(): void {
    const translations = this.translationService.translations();
    const t = (translations && translations['landing']) ?? {};
    const title = `${t['heroBadge'] ?? 'Kipu'} — ${(t['heroTitle'] ?? 'Your money, perfectly organized').replace(/<[^>]+>/g, '')}`;
    const description = t['heroSubtitle'] ?? 'Track, analyze, and optimize your spending — free forever.';
    const keywords =
      'personal finance, expense tracker, budget app, money management, financial insights, Kipu';
    this.title.setTitle(title);

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: keywords });

    // Open Graph
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: this.siteUrl });
    this.meta.updateTag({ property: 'og:image', content: this.ogImageUrl });
    this.meta.updateTag({ property: 'og:image:secure_url', content: this.ogImageUrl });
    this.meta.updateTag({ property: 'og:image:type', content: 'image/png' });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({ property: 'og:image:alt', content: 'Kipu personal finance tracker' });
    this.meta.updateTag({ property: 'og:locale', content: this.translationService.currentLang() });

    // Twitter Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: this.ogImageUrl });
    this.meta.updateTag({ name: 'twitter:image:alt', content: 'Kipu personal finance tracker' });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    if (!this.scrollTicking) {
      requestAnimationFrame(() => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        this.scrollProgress.set(Math.min(100, Math.max(0, progress)));
        this.scrollTicking = false;
      });
      this.scrollTicking = true;
    }
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Tier cards shared with the subscription page.
   * Prices are USD for the marketing landing — the subscription page
   * localizes the same fields per user currency.
   */
  readonly tiers: TierCard[] = [
    {
      id: 'free',
      nameKey: 'landing.pricing.tiers.free.name',
      taglineKey: 'landing.pricing.tiers.free.tagline',
      price: '$0',
      priceAnnual: 'forever',
      popular: false,
      featureKeys: [
        'landing.pricing.tiers.free.features.transactions',
        'landing.pricing.tiers.free.features.categories',
        'landing.pricing.tiers.free.features.basic_charts',
        'landing.pricing.tiers.free.features.history',
      ],
      ctaKey: 'landing.pricing.tiers.free.cta',
      highlighted: false,
    },
    {
      id: 'premium',
      nameKey: 'landing.pricing.tiers.premium.name',
      taglineKey: 'landing.pricing.tiers.premium.tagline',
      price: '$4.99',
      priceAnnual: '/month',
      annualSavingsKey: 'landing.pricing.save_badge',
      popular: true,
      featureKeys: [
        'landing.pricing.tiers.premium.features.ai_insights',
        'landing.pricing.tiers.premium.features.goals',
        'landing.pricing.tiers.premium.features.budgets',
        'landing.pricing.tiers.premium.features.alerts',
        'landing.pricing.tiers.premium.features.support',
      ],
      ctaKey: 'landing.pricing.tiers.premium.cta',
      highlighted: true,
    },
    {
      id: 'premium_plus',
      nameKey: 'landing.pricing.tiers.premium_plus.name',
      taglineKey: 'landing.pricing.tiers.premium_plus.tagline',
      price: '$8.99',
      priceAnnual: '/month',
      popular: false,
      featureKeys: [
        'landing.pricing.tiers.premium_plus.features.everything_premium',
        'landing.pricing.tiers.premium_plus.features.ai_chat',
        'landing.pricing.tiers.premium_plus.features.telegram',
        'landing.pricing.tiers.premium_plus.features.export',
        'landing.pricing.tiers.premium_plus.features.priority_support',
      ],
      ctaKey: 'landing.pricing.tiers.premium_plus.cta',
      highlighted: false,
    },
  ];

  /** Comparison rows: each feature mapped to per-tier availability. */
  readonly comparisonRows: TierComparisonRow[] = [
    { featureKey: 'landing.comparison.features.transactions', free: true, premium: true, premiumPlus: true },
    { featureKey: 'landing.comparison.features.categories', free: true, premium: true, premiumPlus: true },
    { featureKey: 'landing.comparison.features.basic_charts', free: true, premium: true, premiumPlus: true },
    { featureKey: 'landing.comparison.features.ai_insights', free: false, premium: true, premiumPlus: true },
    { featureKey: 'landing.comparison.features.goals', free: false, premium: true, premiumPlus: true },
    { featureKey: 'landing.comparison.features.budgets', free: false, premium: true, premiumPlus: true },
    { featureKey: 'landing.comparison.features.alerts', free: false, premium: true, premiumPlus: true },
    { featureKey: 'landing.comparison.features.telegram', free: false, premium: false, premiumPlus: true },
    { featureKey: 'landing.comparison.features.export', free: false, premium: false, premiumPlus: true },
    { featureKey: 'landing.comparison.features.priority_support', free: false, premium: false, premiumPlus: true },
  ];

  /** Placeholder testimonials — swappable via the input array. */
  readonly testimonials: Testimonial[] = [
    {
      nameKey: 'landing.testimonials.items.maria.name',
      roleKey: 'landing.testimonials.items.maria.role',
      textKey: 'landing.testimonials.items.maria.text',
      avatarInitials: 'MG',
    },
    {
      nameKey: 'landing.testimonials.items.carlos.name',
      roleKey: 'landing.testimonials.items.carlos.role',
      textKey: 'landing.testimonials.items.carlos.text',
      avatarInitials: 'CR',
    },
    {
      nameKey: 'landing.testimonials.items.ana.name',
      roleKey: 'landing.testimonials.items.ana.role',
      textKey: 'landing.testimonials.items.ana.text',
      avatarInitials: 'AL',
    },
  ];

  /** FAQ items — single-open accordion, all collapsed by default. */
  readonly faqItems: FaqItem[] = [
    {
      questionKey: 'landing.faq.items.pricing.question',
      answerKey: 'landing.faq.items.pricing.answer',
    },
    {
      questionKey: 'landing.faq.items.cancel.question',
      answerKey: 'landing.faq.items.cancel.answer',
    },
    {
      questionKey: 'landing.faq.items.free_trial.question',
      answerKey: 'landing.faq.items.free_trial.answer',
    },
    {
      questionKey: 'landing.faq.items.data_safety.question',
      answerKey: 'landing.faq.items.data_safety.answer',
    },
    {
      questionKey: 'landing.faq.items.telegram.question',
      answerKey: 'landing.faq.items.telegram.answer',
    },
  ];

  /** Trust badges — six security & privacy signals. */
  readonly trustBadges: TrustBadge[] = [
    { icon: 'lockClosed', labelKey: 'landing.trust.badges.encryption.label' },
    { icon: 'shieldCheck', labelKey: 'landing.trust.badges.no_selling.label' },
    { icon: 'circle', labelKey: 'landing.trust.badges.database.label' },
    { icon: 'codeBracket', labelKey: 'landing.trust.badges.open_source.label' },
    { icon: 'check', labelKey: 'landing.trust.badges.data_control.label' },
    { icon: 'globe', labelKey: 'landing.trust.badges.gdpr.label' },
  ];
}
