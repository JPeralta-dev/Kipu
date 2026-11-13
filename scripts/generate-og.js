const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function loadFontBase64(pkg, filename) {
  const pkgDir = path.dirname(require.resolve(`${pkg}/package.json`));
  const fontPath = path.join(pkgDir, 'files', filename);
  return fs.readFileSync(fontPath).toString('base64');
}

function buildFontFaceCss() {
  const fonts = [
    {
      family: 'Space Grotesk',
      weight: 600,
      data: loadFontBase64('@fontsource/space-grotesk', 'space-grotesk-latin-600-normal.woff2'),
    },
    {
      family: 'Space Grotesk',
      weight: 700,
      data: loadFontBase64('@fontsource/space-grotesk', 'space-grotesk-latin-700-normal.woff2'),
    },
    {
      family: 'Inter',
      weight: 400,
      data: loadFontBase64('@fontsource/inter', 'inter-latin-400-normal.woff2'),
    },
    {
      family: 'Inter',
      weight: 500,
      data: loadFontBase64('@fontsource/inter', 'inter-latin-500-normal.woff2'),
    },
    {
      family: 'Inter',
      weight: 600,
      data: loadFontBase64('@fontsource/inter', 'inter-latin-600-normal.woff2'),
    },
    {
      family: 'JetBrains Mono',
      weight: 500,
      data: loadFontBase64('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff2'),
    },
    {
      family: 'JetBrains Mono',
      weight: 600,
      data: loadFontBase64('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-600-normal.woff2'),
    },
    {
      family: 'JetBrains Mono',
      weight: 700,
      data: loadFontBase64('@fontsource/jetbrains-mono', 'jetbrains-mono-latin-700-normal.woff2'),
    },
  ];

  return fonts
    .map(
      (f) => `@font-face {
  font-family: '${f.family}';
  font-style: normal;
  font-weight: ${f.weight};
  font-display: block;
  src: url(data:font/woff2;base64,${f.data}) format('woff2');
}`
    )
    .join('\n');
}

async function createCleanMarkDataUri(browser, markPath) {
  const rawDataUri = 'data:image/png;base64,' + fs.readFileSync(markPath).toString('base64');
  const page = await browser.newPage();
  await page.setViewport({ width: 128, height: 128, deviceScaleFactor: 1 });
  const cleanDataUri = await page.evaluate((src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 128, 128);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });
  }, rawDataUri);
  await page.close();
  return cleanDataUri;
}

function buildOgSvg(markDataUri) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="vault-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#120B1A"/>
      <stop offset="55%" stop-color="#0E0815"/>
      <stop offset="100%" stop-color="#09050F"/>
    </linearGradient>

    <radialGradient id="glow-violet" cx="76%" cy="46%" r="54%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.34"/>
      <stop offset="48%" stop-color="#2A1E35" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#120B1A" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="glow-fuchsia" cx="90%" cy="16%" r="36%">
      <stop offset="0%" stop-color="#D946EF" stop-opacity="0.20"/>
      <stop offset="60%" stop-color="#A855F7" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#120B1A" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="glow-verdant" cx="72%" cy="56%" r="34%">
      <stop offset="0%" stop-color="#06D6A0" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#120B1A" stop-opacity="0"/>
    </radialGradient>

    <linearGradient id="amethyst-pulse" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#D946EF"/>
      <stop offset="55%" stop-color="#A855F7"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </linearGradient>

    <linearGradient id="top-specular" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F3E8FF" stop-opacity="0"/>
      <stop offset="50%" stop-color="#F3E8FF" stop-opacity="0.24"/>
      <stop offset="100%" stop-color="#F3E8FF" stop-opacity="0"/>
    </linearGradient>

    <linearGradient id="chart-fill" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#06D6A0" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#06D6A0" stop-opacity="0"/>
    </linearGradient>

    <radialGradient id="grid-fade" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <mask id="grid-mask">
      <rect x="580" y="36" width="580" height="558" fill="url(#grid-fade)"/>
    </mask>

    <clipPath id="logo-clip-small">
      <rect width="48" height="48" rx="12"/>
    </clipPath>

    <filter id="card-shadow" x="-15%" y="-25%" width="130%" height="165%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#040208" flood-opacity="0.72"/>
    </filter>

    <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <!-- Base Vault Canvas -->
  <rect width="1200" height="630" fill="url(#vault-bg)"/>
  <rect width="1200" height="630" fill="url(#glow-violet)"/>
  <rect width="1200" height="630" fill="url(#glow-fuchsia)"/>
  <rect width="1200" height="630" fill="url(#glow-verdant)"/>

  <!-- Subtle Vault Grid scoped under the right-hand showcase -->
  <g mask="url(#grid-mask)" stroke="#F3E8FF" stroke-opacity="0.045" stroke-width="1">
    <line x1="600" y1="84" x2="1156" y2="84"/>
    <line x1="600" y1="156" x2="1156" y2="156"/>
    <line x1="600" y1="228" x2="1156" y2="228"/>
    <line x1="600" y1="300" x2="1156" y2="300"/>
    <line x1="600" y1="372" x2="1156" y2="372"/>
    <line x1="600" y1="444" x2="1156" y2="444"/>
    <line x1="600" y1="516" x2="1156" y2="516"/>
    <line x1="650" y1="44" x2="650" y2="586"/>
    <line x1="740" y1="44" x2="740" y2="586"/>
    <line x1="830" y1="44" x2="830" y2="586"/>
    <line x1="920" y1="44" x2="920" y2="586"/>
    <line x1="1010" y1="44" x2="1010" y2="586"/>
    <line x1="1100" y1="44" x2="1100" y2="586"/>
  </g>

  <!-- Faint Brand Watermark anchored behind the Glass Vault -->
  <image href="${markDataUri}" x="815" y="135" width="320" height="320" opacity="0.06"/>

  <!-- Outer Inset Glass Frame -->
  <rect x="24" y="24" width="1152" height="582" rx="24" fill="none" stroke="rgba(243, 232, 255, 0.08)" stroke-width="1"/>
  <line x1="160" y1="24.5" x2="1040" y2="24.5" stroke="url(#top-specular)" stroke-width="1.5"/>

  <!-- ================= LEFT COLUMN: BRAND & VALUE PROP ================= -->
  <!-- Brand Lockup + Live Channel Badge -->
  <g transform="translate(68, 64)">
    <g clip-path="url(#logo-clip-small)">
      <rect width="48" height="48" rx="12" fill="#1D1426" stroke="rgba(243, 232, 255, 0.16)" stroke-width="1.5"/>
      <image href="${markDataUri}" x="-5" y="-5" width="58" height="58" preserveAspectRatio="xMidYMid slice"/>
    </g>
    <text x="64" y="34" font-family="'Space Grotesk', system-ui, sans-serif" font-size="32" font-weight="700" fill="#F3E8FF" letter-spacing="-0.03em">Kipu</text>

    <!-- Status Pill -->
    <rect x="154" y="8" width="214" height="32" rx="16" fill="#231730" stroke="rgba(243, 232, 255, 0.14)" stroke-width="1"/>
    <circle cx="174" cy="24" r="6" fill="#06D6A0" fill-opacity="0.22"/>
    <circle cx="174" cy="24" r="3.5" fill="#06D6A0"/>
    <text x="188" y="28.5" font-family="'Inter', system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#F3E8FF" letter-spacing="0.06em">AI + TELEGRAM FINANCE</text>
  </g>

  <!-- Hero Headline (Solid Pale Iris + Lavender Tint, zero gradient text) -->
  <g transform="translate(68, 198)">
    <text font-family="'Space Grotesk', system-ui, sans-serif" font-size="66" font-weight="700" letter-spacing="-0.035em">
      <tspan x="0" y="0" fill="#F3E8FF">Your money,</tspan>
      <tspan x="0" y="70" fill="#F3E8FF">perfectly</tspan>
      <tspan x="0" y="140" fill="#D8B4FE">organized.</tspan>
    </text>
  </g>

  <!-- High-Contrast Frosted Iris Subtitle -->
  <g transform="translate(68, 396)">
    <text font-family="'Inter', system-ui, sans-serif" font-size="22" font-weight="500" fill="#E9D5FF" fill-opacity="0.84" letter-spacing="-0.01em">
      <tspan x="0" y="0">Log expenses via Telegram in 3 seconds.</tspan>
      <tspan x="0" y="32">Real-time budgets, goals &amp; private AI insights.</tspan>
    </text>
  </g>

  <!-- Bottom Action Pill (Single Amethyst Pulse Anchor) + Trust Signals -->
  <g transform="translate(68, 500)">
    <rect width="248" height="52" rx="12" fill="url(#amethyst-pulse)"/>
    <text x="124" y="32" text-anchor="middle" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="16.5" font-weight="700" fill="#120B1A" letter-spacing="-0.02em">kipufinance.online &#8599;</text>

    <!-- Trust Checkmarks -->
    <g transform="translate(268, 8)">
      <path d="M2 10 L6.5 14.5 L15 5" fill="none" stroke="#06D6A0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="22" y="14" font-family="'Inter', system-ui, sans-serif" font-size="15.5" font-weight="600" fill="#F3E8FF">Free forever</text>

      <path d="M2 34 L6.5 38.5 L15 29" fill="none" stroke="#06D6A0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="22" y="38" font-family="'Inter', system-ui, sans-serif" font-size="15.5" font-weight="500" fill="#E9D5FF" fill-opacity="0.78">No bank keys needed</text>
    </g>
  </g>

  <!-- ================= RIGHT COLUMN: THE GLASS VAULT SHOWCASE ================= -->
  <!-- Main Glass Vault Dashboard Card -->
  <g filter="url(#card-shadow)">
    <rect x="636" y="60" width="496" height="414" rx="18" fill="#1D1426" fill-opacity="0.92" stroke="rgba(243, 232, 255, 0.14)" stroke-width="1.5"/>
    <line x1="670" y1="60.75" x2="1098" y2="60.75" stroke="url(#top-specular)" stroke-width="1.5"/>
  </g>

  <!-- Card Header Row -->
  <text x="666" y="98" font-family="'Inter', system-ui, sans-serif" font-size="12" font-weight="600" fill="#E9D5FF" fill-opacity="0.68" letter-spacing="0.07em">TOTAL NET BALANCE &#183; OCT</text>

  <rect x="946" y="78" width="158" height="28" rx="6" fill="rgba(6, 214, 160, 0.14)" stroke="rgba(6, 214, 160, 0.38)" stroke-width="1"/>
  <text x="1025" y="96.5" text-anchor="middle" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="12.5" font-weight="700" fill="#06D6A0">&#9650; +24.8% SAVED</text>

  <!-- Hero KPI Metric (JetBrains Mono) -->
  <text x="666" y="156" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="46" font-weight="700" fill="#F3E8FF" letter-spacing="-0.025em">$12,480.00</text>

  <!-- Income & Expenses Mini-Cards -->
  <g>
    <rect x="666" y="182" width="212" height="66" rx="10" fill="#2A1E35" stroke="rgba(243, 232, 255, 0.08)" stroke-width="1"/>
    <text x="684" y="205" font-family="'Inter', system-ui, sans-serif" font-size="11" font-weight="600" fill="#E9D5FF" fill-opacity="0.58" letter-spacing="0.06em">INCOME</text>
    <text x="684" y="233" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="20" font-weight="700" fill="#06D6A0">+$4,850.00</text>

    <rect x="892" y="182" width="212" height="66" rx="10" fill="#2A1E35" stroke="rgba(243, 232, 255, 0.08)" stroke-width="1"/>
    <text x="910" y="205" font-family="'Inter', system-ui, sans-serif" font-size="11" font-weight="600" fill="#E9D5FF" fill-opacity="0.58" letter-spacing="0.06em">EXPENSES</text>
    <text x="910" y="233" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="20" font-weight="700" fill="#FF6B6B">-$2,140.00</text>
  </g>

  <!-- Cash-Flow Sparkline Area Chart -->
  <g>
    <rect x="666" y="264" width="438" height="100" rx="10" fill="#120B1A" fill-opacity="0.6" stroke="rgba(243, 232, 255, 0.07)" stroke-width="1"/>
    <line x1="682" y1="292" x2="1088" y2="292" stroke="#F3E8FF" stroke-opacity="0.05" stroke-width="1"/>
    <line x1="682" y1="320" x2="1088" y2="320" stroke="#F3E8FF" stroke-opacity="0.05" stroke-width="1"/>
    <line x1="682" y1="348" x2="1088" y2="348" stroke="#F3E8FF" stroke-opacity="0.05" stroke-width="1"/>

    <!-- Budget Baseline Reference Curve -->
    <path d="M 684 338 C 748 332, 796 326, 856 322 C 916 318, 984 312, 1084 304"
          fill="none" stroke="#A855F7" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="5 5"/>

    <!-- Net Cashflow Area + Line -->
    <path d="M 684 344 C 736 338, 774 346, 822 324 C 870 302, 906 318, 954 298 C 1002 278, 1044 286, 1084 276 L 1084 358 L 684 358 Z"
          fill="url(#chart-fill)"/>
    <path d="M 684 344 C 736 338, 774 346, 822 324 C 870 302, 906 318, 954 298 C 1002 278, 1044 286, 1084 276"
          fill="none" stroke="#06D6A0" stroke-width="3.2" stroke-linecap="round"/>

    <circle cx="1084" cy="276" r="5" fill="#06D6A0" filter="url(#dot-glow)"/>
    <circle cx="1084" cy="276" r="2.2" fill="#F3E8FF"/>
  </g>

  <!-- Monthly Budget Progress Bar -->
  <g>
    <text x="666" y="394" font-family="'Inter', system-ui, sans-serif" font-size="13.5" font-weight="600" fill="#F3E8FF">Monthly Budget &#183; 68% used</text>
    <text x="1104" y="394" text-anchor="end" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="13.5" font-weight="600" fill="#06D6A0">$1,460 left</text>
    <rect x="666" y="408" width="438" height="10" rx="5" fill="#2A1E35"/>
    <rect x="666" y="408" width="298" height="10" rx="5" fill="#A855F7"/>
  </g>

  <!-- Floating Overlapping Telegram Instant-Log Card -->
  <g filter="url(#card-shadow)">
    <rect x="590" y="450" width="514" height="110" rx="16" fill="#241832" stroke="rgba(217, 70, 239, 0.48)" stroke-width="1.5"/>
    <line x1="620" y1="450.75" x2="1074" y2="450.75" stroke="url(#top-specular)" stroke-width="1.5"/>

    <!-- Telegram Paper-Plane Icon Badge -->
    <rect x="614" y="479" width="52" height="52" rx="12" fill="rgba(217, 70, 239, 0.14)" stroke="rgba(217, 70, 239, 0.42)" stroke-width="1"/>
    <path d="M651 495 L627 504.2 C625.4 504.8 625.4 505.8 626.7 506.2 L632.8 508.1 L646.8 499.3 C647.5 498.9 648.1 499.1 647.6 499.6 L636.3 509.8 L635.9 515.9 C636.5 515.9 636.8 515.6 637.1 515.3 L640.1 512.4 L646.3 517 C647.4 517.6 648.3 517.3 648.6 515.9 L652.6 496.9 C653 495.2 652 494.6 651 495 Z"
          fill="#E879F9"/>

    <!-- Top Row -->
    <text x="684" y="493" font-family="'Inter', system-ui, sans-serif" font-size="11.5" font-weight="600" fill="#E879F9" letter-spacing="0.06em">TELEGRAM BOT &#183; INSTANT LOG</text>

    <rect x="910" y="475" width="174" height="26" rx="6" fill="rgba(6, 214, 160, 0.14)" stroke="rgba(6, 214, 160, 0.36)" stroke-width="1"/>
    <text x="997" y="492.5" text-anchor="middle" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="11.5" font-weight="600" fill="#06D6A0">&#10003; Categorized by AI</text>

    <!-- Bottom Transaction Row -->
    <text x="684" y="534" font-family="'Space Grotesk', system-ui, sans-serif" font-size="22" font-weight="600" fill="#F3E8FF" letter-spacing="-0.02em">Coffee &amp; Lunch</text>
    <text x="1084" y="534" text-anchor="end" font-family="'JetBrains Mono', ui-monospace, monospace" font-size="22" font-weight="700" fill="#F3E8FF">-$14.50</text>
  </g>
</svg>`;
}

async function main() {
  const markPath = path.resolve(__dirname, '../src/assets/kipu-mark.png');
  const fontCss = buildFontFaceCss();

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const cleanMarkDataUri = await createCleanMarkDataUri(browser, markPath);
    const svg = buildOgSvg(cleanMarkDataUri);

    const svgPath = path.resolve(__dirname, '../src/assets/og/og-image.svg');
    fs.writeFileSync(svgPath, svg, 'utf-8');
    console.log(`Saved SVG: ${svgPath} (${Math.round(Buffer.byteLength(svg) / 1024)} KB)`);

    const pngPath = path.resolve(__dirname, '../src/assets/og/og-image.png');
    console.log('Rendering PNG with Puppeteer...');

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

    await page.setContent(
      `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    ${fontCss}
    html, body { margin: 0; padding: 0; overflow: hidden; background: #09050F; }
  </style>
</head>
<body>${svg}</body>
</html>`,
      { waitUntil: 'networkidle0' }
    );

    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: pngPath, type: 'png', optimizeForSpeed: false });
    await page.close();

    const stat = fs.statSync(pngPath);
    console.log(`Saved PNG: ${pngPath} (${Math.round(stat.size / 1024)} KB)`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
