// Authentic Brand Icon SVGs
const brandTelegram = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="width:var(--ng-icon__size, 1em);height:var(--ng-icon__size, 1em)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.05-.2s-.16-.04-.23-.02c-.1.02-1.63 1.04-4.61 3.05-.44.3-.83.45-1.18.44-.39-.01-1.14-.22-1.7-.4-.69-.22-1.23-.34-1.18-.72.03-.2.3-.4.82-.61 3.22-1.4 5.37-2.33 6.45-2.77 3.07-1.28 3.71-1.5 4.12-1.51.09 0 .3.02.43.13.11.09.14.22.16.31-.01.07.01.24 0 .39z"/></svg>';
const brandWhatsapp = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="width:var(--ng-icon__size, 1em);height:var(--ng-icon__size, 1em)"><path d="M17.472 14.382c-.301-.15-1.78-.878-2.056-.978-.276-.101-.477-.15-.678.15-.2.301-.778.978-.954 1.179-.175.2-.351.226-.652.075s-1.271-.468-2.422-1.494c-.895-.798-1.5-1.784-1.676-2.085-.175-.301-.019-.464.132-.614.136-.135.301-.351.452-.527.15-.175.2-.301.301-.501.1-.2.05-.376-.025-.527-.075-.15-.678-1.631-.93-2.236-.245-.589-.494-.509-.678-.518-.175-.009-.376-.009-.577-.009s-.527.075-.803.376c-.276.301-1.054 1.029-1.054 2.51s1.079 2.911 1.23 3.112c.15.2 2.123 3.242 5.144 4.547.719.31 1.28.496 1.718.635.722.23 1.379.198 1.9-.12.58-.354 1.78-1.082 2.032-2.128.251-1.045.251-1.942.176-2.128-.075-.187-.276-.288-.577-.438zM12.04 2C6.527 2 2.04 6.48 2.04 12c0 1.99.58 3.85 1.588 5.42L2 22l4.757-1.547A9.957 9.957 0 0 0 12.04 22c5.513 0 9.99-4.48 9.99-10s-4.477-10-9.99-10z"/></svg>';
const brandGmail = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="width:var(--ng-icon__size, 1em);height:var(--ng-icon__size, 1em)"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>';
const brandSms = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="width:var(--ng-icon__size, 1em);height:var(--ng-icon__size, 1em)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 9H7v-2h10v2zm-4 4H7v-2h6v2zm4-8H7V5h10v2z"/></svg>';
const iconCopy = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:var(--ng-icon__size, 1em);height:var(--ng-icon__size, 1em)"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

/**
 * Icon Registry — Centralized icon mapping for the Obsidian Glass design system.
 * Maps categories, nav items, and UI elements to Heroicons SVG components.
 *
 * Using @ng-icons/heroicons v26 (outline)
 * Note: v26 uses 'hero' prefix without 'Outline' suffix
 */

import {
  heroHome,
  heroSquares2x2,
  heroCreditCard,
  heroTag,
  heroChartBar,
  heroBell,
  heroCalendar,
  heroMagnifyingGlass,
  heroPlus,
  heroArrowTrendingUp,
  heroArrowTrendingDown,
  heroWallet,
  heroBanknotes,
  heroShoppingBag,
  heroShoppingCart,
  heroBuildingLibrary,
  heroBolt,
  heroHeart,
  heroCircleStack,
  heroArrowPath,
  heroEllipsisHorizontal,
  heroXMark,
  heroBars3,
  heroChevronLeft,
  heroChevronRight,
  heroCheck,
  heroExclamationTriangle,
  heroInformationCircle,
  heroFunnel,
  heroArrowUp,
  heroArrowDown,
  heroArrowRight,
  heroClipboardDocumentList,
  heroCog6Tooth,
  heroUser,
  heroArrowRightOnRectangle,
  heroQuestionMarkCircle,
  heroPaperAirplane,
  heroSun,
  heroMoon,
  heroPencilSquare,
  heroGlobeAlt,
  heroClock,
  heroLockClosed,
  heroShieldCheck,
  heroChatBubbleLeftRight,
  heroUserGroup,
  heroCurrencyDollar,
  heroEnvelope,
  heroDocumentText,
  heroCodeBracket,
  heroBuildingOffice,
  heroChevronDown,
  heroChevronUp,
  heroStar,
  heroBookOpen,
  heroBriefcase,
  heroLink,
  heroLightBulb,
  heroArrowDownOnSquareStack,
  heroTrash,
  heroFlag,
  heroSparkles,
  heroArrowUpTray,
} from '@ng-icons/heroicons/outline';

// ─── Icon Map ────────────────────────────────────────────────────────────────

export const ICONS = {
  // Navigation
  home: heroHome,
  dashboard: heroSquares2x2,
  transactions: heroCreditCard,
  categories: heroTag,
  analytics: heroChartBar,
  insights: heroLightBulb,
  goals: heroFlag,
  settings: heroCog6Tooth,
  logout: heroArrowRightOnRectangle,

  // UI Actions
  plus: heroPlus,
  search: heroMagnifyingGlass,
  bell: heroBell,
  close: heroXMark,
  menu: heroBars3,
  chevronLeft: heroChevronLeft,
  chevronRight: heroChevronRight,
  check: heroCheck,
  warning: heroExclamationTriangle,
  info: heroInformationCircle,
  filter: heroFunnel,
  arrowUp: heroArrowUp,
  arrowDown: heroArrowDown,
  arrowRight: heroArrowRight,
  ellipsis: heroEllipsisHorizontal,

  // Finance / Categories
  wallet: heroWallet,
  income: heroBanknotes,
  expense: heroShoppingCart,
  food: heroShoppingBag,
  transport: heroBolt,
  entertainment: heroHeart,
  shopping: heroShoppingBag,
  health: heroHeart,
  rent: heroBuildingLibrary,
  salary: heroBanknotes,
  freelance: heroCircleStack,
  utilities: heroBolt,
  subscription: heroArrowPath,
  other: heroEllipsisHorizontal,

  // Trends
  trendUp: heroArrowTrendingUp,
  trendDown: heroArrowTrendingDown,

  // Analytics
  chart: heroChartBar,
  trendingUp: heroArrowTrendingUp,
  trendingDown: heroArrowTrendingDown,
  percent: heroBanknotes,
  calendar: heroCalendar,
  chevronDown: heroChevronDown,
  chevronUp: heroChevronUp,

  // Insights
  star: heroStar,
  alertTriangle: heroExclamationTriangle,
  repeat: heroArrowPath,
  // Category fallbacks
  book: heroBookOpen,
  briefcase: heroBriefcase,
  circle: heroCircleStack,
  car: heroBolt,
  gamepad: heroStar,
  bag: heroShoppingBag,
  zap: heroBolt,
  code: heroCodeBracket,

  // Profile
  user: heroUser,
  help: heroQuestionMarkCircle,
  list: heroClipboardDocumentList,

  // Communication & Channels
  telegram: brandTelegram,
  gmail: brandGmail,
  whatsapp: brandWhatsapp,
  sms: brandSms,
  copy: iconCopy,

  // Theme
  sun: heroSun,
  moon: heroMoon,

  // Actions
  edit: heroPencilSquare,

  // Language / i18n
  globe: heroGlobeAlt,

  // Misc
  clock: heroClock,
  lockClosed: heroLockClosed,
  shieldCheck: heroShieldCheck,
  chatBubble: heroChatBubbleLeftRight,
  userGroup: heroUserGroup,

  // Hero background art
  currencyDollar: heroCurrencyDollar,

  // Footer
  envelope: heroEnvelope,
  documentText: heroDocumentText,
  codeBracket: heroCodeBracket,
  buildingOffice: heroBuildingOffice,
  link: heroLink,

  // Data management
  documentArrowDown: heroArrowDownOnSquareStack,
  trash: heroTrash,
  sparkles: heroSparkles,
  upload: heroArrowUpTray,
};

// ─── Category Icon Mapping ───────────────────────────────────────────────────

export const CATEGORY_ICONS: Record<string, keyof typeof ICONS> = {
  Income: 'income',
  Food: 'food',
  Transport: 'transport',
  Entertainment: 'entertainment',
  Shopping: 'shopping',
  Health: 'health',
  Rent: 'rent',
  Salary: 'salary',
  Freelance: 'freelance',
  Utilities: 'utilities',
  Subscription: 'subscription',
  Other: 'other',
};

export function getCategoryIcon(category: string): keyof typeof ICONS {
  return CATEGORY_ICONS[category] ?? 'other';
}
