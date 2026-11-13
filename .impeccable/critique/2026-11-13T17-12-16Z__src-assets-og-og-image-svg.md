---
target: src/assets/og/og-image.svg
total_score: 11
max_score: 20
na_heuristics: 3,5,7,9,10
p0_count: 0
p1_count: 3
timestamp: 2026-11-13T17-12-16Z
slug: src-assets-og-og-image-svg
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Static card communicates brand presence, but conveys no live product state or real-time tracking cue |
| 2 | Match System / Real World | 2 | Speaks generic fintech language ("Track expenses, understand patterns") without showing Kipu's core Telegram/AI workflow |
| 3 | User Control and Freedom | n/a | Static Open Graph image; no interactive user controls |
| 4 | Consistency and Standards | 2 | Diverges from `DESIGN.md` typography (`Plus Jakarta Sans` instead of `Space Grotesk`/`Inter`/`JetBrains Mono`) and uses slate grays (`#94A3B8`/`#64748B`) instead of Iris tokens |
| 5 | Error Prevention | n/a | Static social preview asset; no user input or error states |
| 6 | Recognition Rather Than Recall | 2 | Shows two identical `K` logos while hiding any visual preview of the dashboard, budgets, or Telegram bot |
| 7 | Flexibility and Efficiency | n/a | Non-interactive Persuade surface (social link preview) |
| 8 | Aesthetic and Minimalist Design | 3 | Clean dark composition, but wastes the right 40% on a redundant 360×360 logo box and adds a decorative left bar + gradient text |
| 9 | Error Recovery | n/a | Static Open Graph image; no error recovery flows |
| 10 | Help and Documentation | n/a | Non-interactive social preview card |
| **Total** | | **11/20** | **Acceptable (55% — Needs focused redesign)** |

### Design Specificity Verdict

**LLM assessment**: The current `og-image.svg` / `og-image.png` looks clean at first glance, yet it could belong to almost any dark-mode purple SaaS tool if you swapped the `K` icon. It suffers from "logo-in-a-box" syndrome: the top-left already identifies **Kipu**, and the entire right half repeats the exact same `K` emblem inside a `360×360` rounded square instead of proving what Kipu does ("The Glass Vault" personal finance dashboard + instant Telegram bot logging).

**Deterministic scan**: `node .agents/skills/impeccable/scripts/detect.mjs --json src/assets/og/og-image.svg src/index.html` returned `[]` (0 automated HTML/CSS findings). Manual inspection of `scripts/generate-og.js` and `src/assets/og/og-image.png` uncovered the font fallback, `DESIGN.md` token drift, and thumbnail scaling issues.

### Overall Impression

Dark obsidian atmosphere and high-contrast headline are solid starting points, but the card spends half its real estate repeating the logo and fails at thumbnail scale in Telegram and LinkedIn. Replacing the giant `K` box with a crisp Glass Vault dashboard + Telegram Instant Log showcase, true `Space Grotesk` / `Inter` / `JetBrains Mono` typography, and high-contrast Iris/Verdant tokens will make the preview immediately persuasive.

### What's Working

- **Strong 1200×630 canvas discipline**: Standard Open Graph aspect ratio (`1.91:1`) with clear left-to-right reading flow.
- **Dark-first brand alignment**: Uses deep obsidian tones (`#08040E`–`#281446`) that feel cohesive with Kipu's dark mode.

### Priority Issues

- **[P1] Redundant 360×360 Logo Box Instead of Product Proof**: Repeating the `K` emblem on the right wastes ~40% of the card and shows zero UI evidence of Kipu's dashboard, budgets, or Telegram bot.
  - **Fix**: Replace the `360×360` logo box with an authentic "Glass Vault" UI preview (Net Balance KPI, Income/Expenses mini-cards, cash-flow sparkline, budget bar, and an overlapping Telegram Bot Instant Log card).
  - **Suggested command**: `$impeccable bolder`
- **[P1] Unloaded Non-System Fonts Falling Back to Segoe UI / Consolas**: `scripts/generate-og.js` requests `'Plus Jakarta Sans'`, which is neither installed in Puppeteer nor part of `DESIGN.md` (`Space Grotesk`, `Inter`, `JetBrains Mono`).
  - **Fix**: Load WOFF2 fonts directly from `@fontsource/space-grotesk`, `@fontsource/inter`, and `@fontsource/jetbrains-mono` and await `document.fonts.ready` before PNG capture.
  - **Suggested command**: `$impeccable typeset`
- **[P1] Sub-Threshold Thumbnail Legibility & Gray-on-Dark Contrast in Telegram/LinkedIn**: At `~320px` Telegram bubble width, the `23px` `#94A3B8` subtitle and `17px` `#64748B` footer shrink below legible contrast/size, and `og:image` lacks `og:site_name` and a cache-busting `?v=2` query string.
  - **Fix**: Switch secondary copy to `Frosted Iris` (`#E9D5FF`), tighten headline/subtitle sizing for small-preview clarity, add a high-contrast `Amethyst Pulse` domain pill (`kipufinance.online ↗`), and update `src/index.html` + `landing.component.ts` meta tags.
  - **Suggested command**: `$impeccable polish`
- **[P2] Craft-Floor Anti-Patterns (Left Vertical Accent Bar + Gradient Headline Text)**: The 5px left vertical bar (`x=56`) and gradient text on `"perfectly organized."` clash with `craft-floor.md` and `DESIGN.md`'s Pulse Rule (`≤10%` Amethyst Pulse reserved for primary action/metric).
  - **Fix**: Remove the left bar in favor of a subtle 1px inset glass border with a top specular edge, render the headline in solid `Pale Iris` (`#F3E8FF`) and Lavender-Iris (`#D8B4FE`), and reserve `Amethyst Pulse` for the primary CTA pill and budget progress accent.
  - **Suggested command**: `$impeccable distill`

### Persona Red Flags

- **Telegram Scroller ("Casey")**: Sees a small `320px` link card in a chat; the gray subtitle (`#94A3B8`) and footer (`#64748B`) turn blurry, and the big `K` square doesn't explain why Kipu is faster than Excel or a bank app.
- **LinkedIn Evaluator ("Jordan")**: Scanning a feed post sees `"Your money, perfectly organized."` next to an abstract knot logo — cannot tell whether Kipu is a bank, a crypto wallet, or an expense tracker in 2 seconds.

### Minor Observations

- `src/assets/og/og-image.svg` is currently `2.5 MB` because `kipu-mark.png` includes an embedded C2PA metadata payload duplicated twice as base64.
- `og:image` in `src/index.html` and `landing.component.ts` lacks `?v=2` cache-busting and `og:site_name`.

### Questions to Consider

- Does the preview prove Kipu's core differentiator (3-second Telegram logging + calm financial clarity) in under 2 seconds without opening the link?
- Are all numbers rendered in `JetBrains Mono` and all headings in `Space Grotesk` to match the live app?
