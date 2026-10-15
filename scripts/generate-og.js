const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function main() {
  const markPath = path.resolve(__dirname, '../src/assets/kipu-mark.png');
  const base64 = fs.readFileSync(markPath).toString('base64');
  const dataUri = 'data:image/png;base64,' + base64;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <!-- Deep atmospheric ambient background -->
    <radialGradient id="bg-glow-right" cx="78%" cy="48%" r="55%">
      <stop offset="0%" stop-color="#281446" stop-opacity="0.75"/>
      <stop offset="45%" stop-color="#120A1E" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#08040E" stop-opacity="1"/>
    </radialGradient>
    <radialGradient id="bg-glow-subtle-left" cx="20%" cy="80%" r="40%">
      <stop offset="0%" stop-color="#1A0D2E" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#08040E" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="logo-aura" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#A855F7" stop-opacity="0.30"/>
      <stop offset="45%" stop-color="#9333EA" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#6B21A8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent-vertical" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E879F9"/>
      <stop offset="35%" stop-color="#C084FC"/>
      <stop offset="100%" stop-color="#7E22CE"/>
    </linearGradient>
    <linearGradient id="title-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#C084FC"/>
      <stop offset="50%" stop-color="#E879F9"/>
      <stop offset="100%" stop-color="#A855F7"/>
    </linearGradient>
    <clipPath id="logo-clip-small">
      <rect width="48" height="48" rx="13" />
    </clipPath>
    <clipPath id="logo-clip-large">
      <rect width="360" height="360" rx="60" />
    </clipPath>
  </defs>

  <!-- Background Base -->
  <rect width="1200" height="630" fill="#08040E"/>
  <rect width="1200" height="630" fill="url(#bg-glow-right)"/>
  <rect width="1200" height="630" fill="url(#bg-glow-subtle-left)"/>

  <!-- Left Accent Architectural Bar (like Sumant's calm editorial style) -->
  <rect x="56" y="68" width="5" height="494" rx="2.5" fill="url(#accent-vertical)"/>

  <!-- Top-Left Brand Lockup -->
  <g transform="translate(86, 72)">
    <!-- Small Brand Mark -->
    <g clip-path="url(#logo-clip-small)">
      <rect width="48" height="48" rx="13" fill="#120A1E" stroke="#A855F7" stroke-width="1" stroke-opacity="0.4"/>
      <image href="${dataUri}" x="-5" y="-5" width="58" height="58" preserveAspectRatio="xMidYMid slice"/>
    </g>
    <!-- Brand Typography -->
    <text x="64" y="34" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="30" font-weight="800" fill="#FFFFFF" letter-spacing="-0.03em">Kipu</text>
  </g>

  <!-- Editorial Headline Section -->
  <g transform="translate(86, 246)">
    <text font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="66" font-weight="800" fill="#FFFFFF" letter-spacing="-0.035em">
      <tspan x="0" dy="0">Your money,</tspan>
      <tspan x="0" dy="76" fill="url(#title-gradient)">perfectly organized.</tspan>
    </text>

    <!-- Subtitle: clear, focused, calm -->
    <text x="0" y="160" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="23" font-weight="400" fill="#94A3B8" letter-spacing="-0.015em">
      Track expenses, understand patterns, and take control.
    </text>
  </g>

  <!-- Bottom Bar: Value Prop & Domain -->
  <g transform="translate(86, 550)">
    <text font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="17" font-weight="500" fill="#64748B" letter-spacing="0.01em">
      Smart Personal Finance · Free Forever
    </text>
  </g>

  <g transform="translate(1114, 550)">
    <text text-anchor="end" font-family="'Plus Jakarta Sans', monospace, sans-serif" font-size="19" font-weight="600" fill="#C084FC" letter-spacing="-0.01em">
      kipufinance.online
    </text>
  </g>

  <!-- Iconic 'K' Emblem (Right Hero Feature) -->
  <!-- Ambient glow backdrop -->
  <circle cx="940" cy="290" r="270" fill="url(#logo-aura)"/>

  <g transform="translate(760, 110)">
    <!-- Container frame -->
    <rect width="360" height="360" rx="60" fill="#0C0717" stroke="#A855F7" stroke-width="1.5" stroke-opacity="0.32"/>
    <g clip-path="url(#logo-clip-large)">
      <image href="${dataUri}" width="360" height="360" preserveAspectRatio="xMidYMid slice"/>
    </g>
  </g>
</svg>`;

  const svgPath = path.resolve(__dirname, '../src/assets/og/og-image.svg');
  fs.writeFileSync(svgPath, svg, 'utf-8');
  console.log('Saved SVG:', svgPath);

  // Render to PNG via Puppeteer
  const pngPath = path.resolve(__dirname, '../src/assets/og/og-image.png');
  console.log('Rendering PNG with Puppeteer...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0;padding:0;overflow:hidden;background:#08040E;">${svg}</body></html>`, {
    waitUntil: 'networkidle0'
  });

  await page.screenshot({ path: pngPath, type: 'png', optimizeForSpeed: false });
  await browser.close();

  const stat = fs.statSync(pngPath);
  console.log(`Saved PNG: ${pngPath} (${Math.round(stat.size / 1024)} KB)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
