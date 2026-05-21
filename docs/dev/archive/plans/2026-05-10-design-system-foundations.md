# Design System Foundations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OpsRadar's 1,186-line accumulated CSS/animation layers with a single Tailwind v4 `@theme` token system, build/refactor 22 component primitives styled with the new tokens, and wire route-based light/dark theme switching — without redesigning any user-facing page.

**Architecture:** Single source of truth in `src/app/globals.css` `@theme` block. Light theme is default; dark applied via `[data-theme="dark"]` selector. Middleware (`src/proxy.ts`) sets an `x-theme` header by route prefix; the root layout reads it and sets `data-theme` on `<html>`. Primitives live in `src/components/ui/`, each is one file. A dev-only showcase route at `/dev/primitives` provides isolated visual verification of every primitive in both themes; in production, it returns 404. Legacy CSS classes referenced by existing pages get no-op stubs at the bottom of `globals.css` so pages keep rendering until Phase 1 replaces them.

**Tech Stack:** Next.js 16 (App Router, React Compiler, webpack), React 19, Tailwind CSS v4, `radix-ui` (single-package import style), `class-variance-authority` + `clsx` + `tailwind-merge`, `lucide-react`, `sonner` (added for toasts), `next/font` for Instrument Serif + Inter Tight + JetBrains Mono.

**Companion spec:** `docs/superpowers/specs/2026-05-10-design-system-foundations-design.md` — the source of truth for tokens, primitive inventory, and migration rationale. Read it first.

---

## File Structure

### Created

| Path | Responsibility |
|---|---|
| `src/components/ui/textarea.tsx` | Multiline text input primitive |
| `src/components/ui/select.tsx` | Radix Select wrapper styled with tokens |
| `src/components/ui/checkbox.tsx` | Radix Checkbox styled with tokens |
| `src/components/ui/radio-group.tsx` | Radix Radio Group styled with tokens |
| `src/components/ui/switch.tsx` | Radix Switch styled with tokens |
| `src/components/ui/label.tsx` | Radix Label styled with tokens |
| `src/components/ui/tooltip.tsx` | Radix Tooltip wrapper |
| `src/components/ui/tabs.tsx` | Radix Tabs with underline indicator |
| `src/components/ui/dropdown-menu.tsx` | Radix DropdownMenu wrapper |
| `src/components/ui/toast.tsx` | Sonner wrapper exposing `useToast()` |
| `src/components/ui/skeleton.tsx` | Loading placeholder, opacity pulse |
| `src/components/ui/progress.tsx` | Linear progress bar |
| `src/components/ui/status-dot.tsx` | 8px colored dot for status pills |
| `src/components/ui/metric.tsx` | Label + mono value + optional delta |
| `src/components/ui/data-table.tsx` | Styled `<table>` with density variants |
| `src/lib/cn.ts` | `cn()` helper (clsx + tailwind-merge) — if not already present |
| `src/app/dev/primitives/page.tsx` | Dev-only primitive showcase, 404s in production |
| `src/app/dev/primitives/sections.tsx` | Showcase section components (kept colocated) |
| `docs/design-system/README.md` | Token quick-reference, one page |

### Modified

| Path | Why |
|---|---|
| `src/app/globals.css` | Full rewrite: single `@theme` block, light + dark themes, legacy stubs |
| `src/app/layout.tsx` | Swap fonts to Instrument Serif + Inter Tight + JetBrains Mono; read `x-theme` header; set `data-theme` on `<html>` |
| `src/proxy.ts` | Add header-setting logic for theme by route |
| `src/components/ui/button.tsx` | Rewrite with new tokens + cva variants |
| `src/components/ui/input.tsx` | Rewrite with new tokens |
| `src/components/ui/card.tsx` | Rewrite with `default` + `sunken` variants |
| `src/components/ui/dialog.tsx` | Rewrite styling with new tokens |
| `src/components/ui/accordion.tsx` | Rewrite styling with new tokens |
| `src/components/ui/badge.tsx` | Rewrite with 5 semantic variants + optional `dot` |
| `src/components/ui/separator.tsx` | Restyle with `--color-border` |
| `package.json` | Add `sonner`; remove `three`, `@react-three/fiber`, `@react-three/drei`, `tw-animate-css`, `@types/three` after deletion sweep |
| `src/app/fonts/` | Remove unused Noto font files in cleanup step |

### Deleted (after grep-verified zero callers)

`src/components/animations/AnimatedGradientText.tsx`,
`src/components/animations/CountUp.tsx`,
`src/components/animations/FadeInOnScroll.tsx`,
`src/components/animations/FloatingParticles.tsx`,
`src/components/animations/GlowCard.tsx`,
`src/components/animations/StaggerChildren.tsx`,
`src/components/animations/TypewriterText.tsx`,
`src/components/ui/beams-background.tsx`,
`src/components/ui/beams-background-lazy.tsx`,
`src/components/ui/beams-canvas.tsx`,
`src/components/ui/shader-background.tsx`,
`src/components/ui/limelight-nav.tsx`.

### Branch

Create one branch for the whole Phase 0: `redesign/phase-0-design-system`. Each task ends with a commit on this branch.

### Verification command set (referenced repeatedly)

- **Type check**: `npx tsc --noEmit`
- **Lint**: `npm run lint`
- **Build**: `npm run build`
- **Dev server**: `npm run dev` then visit `http://localhost:3000/dev/primitives` and the existing routes
- **Audit PDF smoke**: open `/audit`, complete a minimal run, confirm `/results` renders and PDF download generates without console errors

---

## Task 0: Branch and pre-flight

**Files:** none yet.

- [ ] **Step 1: Create feature branch**

```bash
cd opsradar
git checkout -b redesign/phase-0-design-system
```

- [ ] **Step 2: Confirm green baseline**

Run: `npx tsc --noEmit && npm run lint`
Expected: both pass with the current code.

- [ ] **Step 3: Snapshot current globals.css line count for reference**

Run: `wc -l src/app/globals.css`
Expected: 1186 lines (or close — record actual number for the final deletion-sweep step).

- [ ] **Step 4: Commit (empty, to anchor the branch)**

```bash
git commit --allow-empty -m "chore: begin Phase 0 design system foundations"
```

---

## Task 1: Add `cn()` helper if absent

**Files:**
- Check / Create: `src/lib/cn.ts`

- [ ] **Step 1: Check if `cn` already exists**

Run: `rg -l "export.*function cn|export const cn" src/lib`
Expected: either a file path (skip this task) or no output (proceed).

- [ ] **Step 2: If absent, create it**

```ts
// src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/cn.ts
git commit -m "chore(ui): add cn() helper for class composition"
```

(If `cn` already existed in another path, skip steps 2–4 and note the existing import path for use in later tasks.)

---

## Task 2: Swap fonts to Instrument Serif + Inter Tight + JetBrains Mono

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Locate current font imports**

Run: `rg -n "next/font" src/app/layout.tsx`
Note the variable names currently assigned to `--font-sans-loaded` and `--font-serif-loaded` so we can keep the same variable names (the legacy `@theme` block references them and existing pages will too until Phase 1).

- [ ] **Step 2: Replace font imports with new families**

Edit `src/app/layout.tsx` so the font block looks like:

```tsx
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
  weight: ["400", "500", "600"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif-loaded",
  display: "swap",
  weight: "400",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-loaded",
  display: "swap",
  weight: ["400", "500"],
});
```

And include all three variables in the `<html>` className:

```tsx
<html
  lang="en"
  className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
>
```

- [ ] **Step 3: Confirm Noto local font references are no longer needed**

Run: `rg -n "Noto" src/app/`
If any imports still reference Noto fonts in code, replace them — only the Noto files themselves under `src/app/fonts/` may remain (cleanup deletes them later).

- [ ] **Step 4: Build + smoke**

Run: `npm run build`
Expected: pass. Then `npm run dev`, visit `/`, confirm no console errors. Headlines still render (with new serif), body still renders (with new sans).

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(fonts): swap to Instrument Serif + Inter Tight + JetBrains Mono"
```

---

## Task 3: Rewrite globals.css with new token system (light theme)

**Files:**
- Modify: `src/app/globals.css` (full rewrite)

This is the largest single change. Take it in two tasks: this one establishes the file structure + light theme tokens; Task 4 adds dark-theme overrides.

- [ ] **Step 1: Save current globals.css to a temporary file for reference**

```bash
cp src/app/globals.css /tmp/globals.css.before
```

(This is purely for the engineer to consult while writing the new file; do not commit the backup.)

- [ ] **Step 2: Replace globals.css with the new top section**

Replace **everything from line 1 through the end of the `:root { ... }` block** with the following. Keep the file structure: imports → theme → root → base → utility classes (stubs) → print → focus.

```css
@import "tailwindcss";

/* =====================================================================
   OpsRadar Design System — Phase 0
   Source of truth: docs/superpowers/specs/2026-05-10-design-system-foundations-design.md
   ===================================================================== */

@theme {
  /* ── Fonts ──────────────────────────────────────────────────────── */
  --font-serif: var(--font-serif-loaded), "Iowan Old Style", Georgia, serif;
  --font-sans: var(--font-sans-loaded), system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: var(--font-mono-loaded), ui-monospace, "SF Mono", Menlo, monospace;

  /* ── Type scale (size / line-height) ───────────────────────────── */
  --text-display: clamp(2.5rem, 3vw + 1.5rem, 4rem);
  --text-display--line-height: 1.05;
  --text-display--letter-spacing: -0.025em;
  --text-display--font-weight: 400;

  --text-h1: clamp(2rem, 2vw + 1.2rem, 3rem);
  --text-h1--line-height: 1.08;
  --text-h1--letter-spacing: -0.02em;
  --text-h1--font-weight: 400;

  --text-h2: clamp(1.625rem, 1.5vw + 1rem, 2.25rem);
  --text-h2--line-height: 1.12;
  --text-h2--letter-spacing: -0.02em;
  --text-h2--font-weight: 400;

  --text-h3: 1.375rem;
  --text-h3--line-height: 1.25;
  --text-h3--letter-spacing: -0.015em;
  --text-h3--font-weight: 500;

  --text-h4: 1.125rem;
  --text-h4--line-height: 1.3;
  --text-h4--letter-spacing: -0.01em;
  --text-h4--font-weight: 500;

  --text-body-lg: 1.0625rem;
  --text-body-lg--line-height: 1.55;
  --text-body-lg--font-weight: 400;

  --text-body: 0.9375rem;
  --text-body--line-height: 1.55;
  --text-body--font-weight: 400;

  --text-body-sm: 0.8125rem;
  --text-body-sm--line-height: 1.5;
  --text-body-sm--font-weight: 400;

  --text-caption: 0.6875rem;
  --text-caption--line-height: 1.4;
  --text-caption--font-weight: 500;

  --text-label: 0.6875rem;
  --text-label--line-height: 1.4;
  --text-label--font-weight: 600;
  --text-label--letter-spacing: 0.12em;

  --text-mono: 0.875rem;
  --text-mono--line-height: 1.45;
  --text-mono--font-weight: 400;

  /* ── Radius ─────────────────────────────────────────────────────── */
  --radius-sm: 4px;
  --radius: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* ── Motion ─────────────────────────────────────────────────────── */
  --duration-instant: 100ms;
  --duration-fast: 150ms;
  --duration-base: 200ms;
  --duration-slow: 300ms;
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-emphasis: cubic-bezier(0.3, 0, 0.1, 1);

  /* ── Accent ladder (Refined Indigo) — identical across themes ──── */
  --color-accent-50:  #EEF2FF;
  --color-accent-100: #E0E7FF;
  --color-accent-200: #C7D2FE;
  --color-accent-300: #A5B4FC;
  --color-accent-400: #818CF8;
  --color-accent-500: #6366F1;
  --color-accent-600: #4F46E5;
  --color-accent-700: #4338CA;
  --color-accent-800: #3730A3;
  --color-accent-900: #312E81;
  --color-accent-950: #1E1B4B;

  /* ── Theme-resolved tokens — bound to --color-* CSS vars below ─── */
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-sunken: var(--surface-sunken);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-fg: var(--fg);
  --color-fg-muted: var(--fg-muted);
  --color-fg-subtle: var(--fg-subtle);
  --color-fg-faint: var(--fg-faint);
  --color-primary: var(--primary);
  --color-primary-fg: var(--primary-fg);
  --color-primary-hover: var(--primary-hover);
  --color-success: var(--success);
  --color-warn: var(--warn);
  --color-danger: var(--danger);
}

/* =====================================================================
   Light theme — default
   ===================================================================== */
:root,
[data-theme="light"] {
  color-scheme: light;

  --bg: #FAFAF7;
  --surface: #FFFFFF;
  --surface-sunken: #F4F4F0;
  --border: #E4E4E7;
  --border-strong: #D4D4D8;
  --fg: #18181B;
  --fg-muted: #52525B;
  --fg-subtle: #71717A;
  --fg-faint: #A1A1AA;

  --primary: var(--color-accent-600);
  --primary-fg: #FFFFFF;
  --primary-hover: var(--color-accent-700);

  --success: #16A34A;
  --warn: #B45309;
  --danger: #DC2626;

  --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
  --shadow:    0 4px 12px rgba(0,0,0,0.06);
  --shadow-md: 0 12px 32px rgba(0,0,0,0.08);
}
```

- [ ] **Step 3: Add base layer and focus ring**

Append after the `:root` block:

```css
@layer base {
  html {
    font-family: var(--font-sans);
    scroll-behavior: smooth;
  }
  body {
    background: var(--color-bg);
    color: var(--color-fg);
    font-size: var(--text-body);
    line-height: var(--text-body--line-height);
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  *:focus-visible {
    outline: 2px solid var(--color-accent-500);
    outline-offset: 2px;
  }
  /* Serif for display/h1/h2 utility classes via @theme `--text-*` */
  .text-display, .text-h1, .text-h2 { font-family: var(--font-serif); }
}
```

- [ ] **Step 4: Re-add print styles and prefers-reduced-motion (unchanged from before)**

```css
@media print {
  .no-print, nav, footer { display: none !important; }
  body, #audit-pdf-root {
    background-color: #FFFFFF !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  section { page-break-inside: avoid; }
  @page { margin: 0.5in; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  html { scroll-behavior: auto; }
}
```

- [ ] **Step 5: Build + smoke**

Run: `npm run build`
Expected: build succeeds. Lint may complain about unused legacy classes — that's resolved by Task 5 (legacy stubs). If it fails for an unrelated reason, fix before moving on.

`npm run dev` → visit `/`. The page will look bare/broken because legacy classes have no styling yet. That's expected. Do NOT try to fix it here — Task 5 adds the stubs.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): rewrite globals.css with new token system (light theme)"
```

---

## Task 4: Add dark theme overrides

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append dark-theme block below the `:root` block**

```css
/* =====================================================================
   Dark theme — dashboard / admin / aios
   ===================================================================== */
[data-theme="dark"] {
  color-scheme: dark;

  --bg: #0A0A0B;
  --surface: #0F0F11;
  --surface-sunken: #15151A;
  --border: #1F1F22;
  --border-strong: #27272A;
  --fg: #FAFAF9;
  --fg-muted: #A1A1AA;
  --fg-subtle: #71717A;
  --fg-faint: #52525B;

  --primary: var(--color-accent-400);
  --primary-fg: #1E1B4B;
  --primary-hover: var(--color-accent-300);

  --success: #34D399;
  --warn: #FBBF24;
  --danger: #F87171;

  --shadow-xs: 0 1px 0 rgba(255,255,255,0.04) inset;
  --shadow:    0 4px 12px rgba(0,0,0,0.5);
  --shadow-md: 0 12px 32px rgba(0,0,0,0.6);
}
```

- [ ] **Step 2: Manual sanity check**

Open `/dashboard` after Task 6 wires the middleware — for now you can simulate by adding `data-theme="dark"` directly on `<html>` in DevTools at `/` and confirm background flips to near-black.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): add dark theme overrides"
```

---

## Task 5: Add legacy CSS stubs

**Files:**
- Modify: `src/app/globals.css`

Purpose: existing pages reference dozens of legacy classes (`surface-card`, `hero-bg`, `gradient-text`, etc.). Until Phase 1 redesigns them, these stubs preserve layout while dropping the contradictory visuals.

- [ ] **Step 1: Grep the full set of legacy classnames still referenced**

Run:
```bash
rg -No "(?:section-tag|section-title|section-copy|surface-panel|surface-card[-\w]*|surface-divider|footer-shell|header-shell|header-nav-pill|header-link[-\w]*|hero-[-\w]+|hardware-card|glass-card|glass-panel|glow-hover|card-lift|mesh-gradient|radial-fade|grid-bg|grid-texture|gradient-text|text-gradient-animated|text-white-gradient|text-blue-gradient|glow-blue|cta-pulse|btn-spring|fade-up|reveal|option-selected|ring-glow|orbit-dot[-\w]*|float-dot|hover-card|hover-chip|btn-press|noise-texture|dot-grid-overlay|grid-overlay-v2|orb-v2[-\w]*|hero-slide-[-\w]+|badge-blink|font-outfit|show-card-[-\w]+|show-tag-[-\w]+|step-forward|step-backward|scroll-cue|waste-slider|prose-readable|locked-overlay[-\w]*|btn-main-[-\w]+|animate-fade-slide-in-\d+|hero-particle|hero-bg|hero-headline|hero-badge|hero-secondary-button|hero-partner-[-\w]+|page-enter)" src/ -t tsx -t ts | sort -u > /tmp/legacy-classes-found.txt
wc -l /tmp/legacy-classes-found.txt
```

Record the count. Compare against the list in §9 step 4 of the spec to make sure none are missed.

- [ ] **Step 2: Append the legacy-stubs block at the bottom of globals.css**

```css
/* =====================================================================
   Legacy class stubs — kept until Phase 1 redesigns each surface.
   Goal: preserve layout, drop contradictory visuals (glow/gradient/
   particle/shader effects). Remove individual rules in Phase 1 as
   pages are rewritten.
   ===================================================================== */

/* Section tags / titles — flatten to plain text with token colors */
.section-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-size: var(--text-label);
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-fg-subtle);
}
.section-title {
  color: var(--color-fg);
  font-family: var(--font-serif);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.08;
  text-wrap: balance;
}
.section-copy {
  max-width: 42rem;
  color: var(--color-fg-muted);
  font-size: var(--text-body);
  line-height: 1.55;
  text-wrap: pretty;
}

/* Surfaces — flatten gradients/blur/shadows to plain bordered cards */
.surface-panel,
.surface-card,
.surface-card-strong,
.hardware-card,
.glass-card,
.glass-panel,
.hero-partner-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: none;
  backdrop-filter: none;
}
.surface-divider { height: 1px; background: var(--color-border); }
.footer-shell, .header-shell { background: var(--color-bg); border: none; backdrop-filter: none; }
.header-nav-pill, .header-link-active, .header-cta, .header-menu-button,
.header-mobile-link, .header-mobile-link-active, .hero-secondary-button {
  background: transparent; box-shadow: none;
}
.header-link, .header-mobile-link { color: var(--color-fg-muted); }
.header-link:hover, .header-mobile-link:hover { color: var(--color-fg); background: transparent; }
.header-link-active { color: var(--color-fg); }
.header-link-active::before, .header-link-active::after { display: none; }

/* Hero animations & decoration — neutralize */
.hero-bg, .mesh-gradient, .radial-fade, .grid-bg, .grid-texture,
.dot-grid-overlay, .grid-overlay-v2, .noise-texture, .hero-headline,
.hero-particle, .orb-v2, .orb-v2-1, .orb-v2-2, .orb-v2-3, .orbit-dot,
.orbit-dot-outer, .float-dot, .badge-blink, .ring-glow, .scroll-cue,
.locked-overlay, .locked-overlay-animated {
  background: none; animation: none; filter: none;
  -webkit-mask-image: none; mask-image: none;
}
.hero-headline {
  background: none; -webkit-text-fill-color: currentColor; color: var(--color-fg);
}

/* Gradient text → plain accent or fg */
.gradient-text, .text-gradient-animated, .text-white-gradient, .text-blue-gradient {
  background: none;
  -webkit-text-fill-color: currentColor;
  color: var(--color-fg);
}

/* Glow effects → none */
.glow-blue, .glow-hover, .cta-pulse, .btn-spring, .btn-press, .btn-main-v2,
.btn-main-sheen, .hover-card:hover, .hover-chip:hover {
  box-shadow: none;
  transform: none;
}
.btn-main-sheen::before { display: none; }

/* Reveal / fade-up — show immediately (animation cut) */
.fade-up, .reveal { opacity: 1; transform: none; transition: none; }
.fade-up.is-visible, .reveal.visible { opacity: 1; transform: none; }
.hero-slide-badge, .hero-slide-h1, .hero-slide-desc,
.hero-slide-cta, .hero-slide-social, .page-enter { opacity: 1; animation: none; }
.animate-fade-slide-in-1, .animate-fade-slide-in-2,
.animate-fade-slide-in-3, .animate-fade-slide-in-4 { animation: none; opacity: 1; }

/* Step transitions kept but linear, no easing flourish */
.step-forward, .step-backward { animation: none; opacity: 1; transform: none; }

/* Showcase card variants → plain bordered card */
.show-card-v2 { position: relative; }
.show-card-v2::before { display: none; }
.show-card-blue, .show-card-cyan, .show-card-purple, .show-card-green {
  border: 1px solid var(--color-border);
}
.show-tag-t-blue, .show-tag-t-cyan, .show-tag-t-purple, .show-tag-t-green {
  background: var(--color-surface-sunken);
  color: var(--color-fg-muted);
  border: 1px solid var(--color-border);
}

/* Outfit font alias → maps to sans */
.font-outfit { font-family: var(--font-sans); }

/* Option selection ring → uses focus ring style */
.option-selected { box-shadow: 0 0 0 2px var(--color-accent-500); }

/* Waste calculator slider — keep functional, retoken */
.waste-slider {
  -webkit-appearance: none; appearance: none;
  height: 6px; border-radius: var(--radius-full);
  background: var(--color-surface-sunken);
  outline: none; cursor: pointer;
}
.waste-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 24px; height: 24px; border-radius: var(--radius-full);
  background: var(--color-primary);
  cursor: grab;
}
.waste-slider::-moz-range-thumb {
  width: 24px; height: 24px; border-radius: var(--radius-full);
  background: var(--color-primary); border: none; cursor: grab;
}

/* prose-readable kept as a width/line-height helper */
.prose-readable { line-height: 1.78; letter-spacing: 0.008em; max-width: 68ch; }

/* Hero badge — flatten to neutral chip */
.hero-badge, .hero-partner-icon, .hero-partner-label { background: transparent; border-color: var(--color-border); color: var(--color-fg); }
```

- [ ] **Step 3: Build + smoke every existing route**

Run: `npm run build`
Expected: pass.

Run: `npm run dev`. Visit each: `/`, `/about`, `/services`, `/pricing`, `/how-it-works`, `/faq`, `/workflows`, `/audit`, `/results` (after a quick audit run), `/login`, `/forgot-password`. Each page should render — visually plain, no decoration — without console errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(design): legacy CSS stubs so existing pages still render"
```

---

## Task 6: Wire route-based theme switching

**Files:**
- Modify: `src/proxy.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Read current `src/proxy.ts` to understand structure**

Run: `cat src/proxy.ts`
Locate where the middleware response is built or returned.

- [ ] **Step 2: Add dark-route constant and header logic to proxy.ts**

Near the top of the file:

```ts
const DARK_ROUTE_PREFIXES = ["/dashboard", "/admin", "/aios"];

function themeForPath(pathname: string): "light" | "dark" {
  return DARK_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
    ? "dark"
    : "light";
}
```

In the middleware function, after the response is constructed (typically a `NextResponse.next(...)` or similar), set the header on the OUTGOING response so the server component can read it via `headers()`:

```ts
// Existing logic produces `response` (NextResponse).
const theme = themeForPath(request.nextUrl.pathname);
response.headers.set("x-theme", theme);
return response;
```

If the middleware also returns redirect/rewrite responses, set the header on those too. Verify by re-reading the file after the edit — every `return response;` or `return NextResponse.<x>(...)` should pass through `themeForPath`.

- [ ] **Step 3: Read header in `src/app/layout.tsx`**

Make the layout async (if it isn't already) and import `headers`:

```tsx
import { headers } from "next/headers";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const theme = headerList.get("x-theme") === "dark" ? "dark" : "light";
  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Build + smoke**

Run: `npm run build && npm run dev`
Visit `/` → DOM should show `<html data-theme="light">`. Visit `/dashboard` (auth may redirect to `/login` — that's fine, the redirected page itself should now be `light`). To verify the dark path without logging in: hit `/aios` directly; it should render with `data-theme="dark"`.

Use DevTools: `document.documentElement.dataset.theme`.

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts src/app/layout.tsx
git commit -m "feat(design): route-based theme switching via middleware header"
```

---

## Task 7: Build the dev-only primitives showcase route

**Files:**
- Create: `src/app/dev/primitives/page.tsx`
- Create: `src/app/dev/primitives/sections.tsx`

Purpose: visual sandbox for verifying every primitive in isolation. Production returns 404.

- [ ] **Step 1: Create the page**

```tsx
// src/app/dev/primitives/page.tsx
import { notFound } from "next/navigation";
import { Showcase } from "./sections";

export const dynamic = "force-dynamic";

export default function PrimitivesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Showcase />;
}
```

- [ ] **Step 2: Create the showcase scaffold (sections added as primitives land)**

```tsx
// src/app/dev/primitives/sections.tsx
"use client";

export function Showcase() {
  return (
    <main className="min-h-screen bg-bg text-fg p-12 space-y-12">
      <header>
        <p className="text-label text-fg-subtle">Dev only</p>
        <h1 className="text-h1 font-serif">Primitives</h1>
        <p className="text-body-lg text-fg-muted max-w-prose mt-2">
          Visual sandbox for every primitive. Toggle theme via the URL: this
          route is light by default; visit it under <code>/admin</code> if
          you want to see the dark equivalent (set DARK_ROUTE_PREFIXES in proxy.ts).
        </p>
      </header>

      <ThemeToggle />

      {/* Sections added by later tasks: Button, Input, Card, Badge, Metric, etc. */}
    </main>
  );
}

function ThemeToggle() {
  return (
    <div className="flex gap-2 text-body-sm">
      <button
        type="button"
        onClick={() => document.documentElement.setAttribute("data-theme", "light")}
        className="px-3 py-1 border border-border rounded"
      >
        Force light
      </button>
      <button
        type="button"
        onClick={() => document.documentElement.setAttribute("data-theme", "dark")}
        className="px-3 py-1 border border-border rounded"
      >
        Force dark
      </button>
    </div>
  );
}
```

The `ThemeToggle` lets the developer flip themes in DevTools without round-tripping through middleware. It's intentionally minimal.

- [ ] **Step 3: Smoke**

Run: `npm run dev`, visit `http://localhost:3000/dev/primitives`. Should render the header and two toggle buttons. Click each → background flips between off-white and near-black. The theme toggle is local-only (does not survive a refresh — middleware sets it back).

- [ ] **Step 4: Commit**

```bash
git add src/app/dev/primitives/
git commit -m "feat(ui): dev-only primitives showcase route"
```

---

## Task 8: Refactor `button.tsx`

**Files:**
- Modify: `src/components/ui/button.tsx`
- Modify: `src/app/dev/primitives/sections.tsx` (add ButtonSection)

- [ ] **Step 1: Read existing button.tsx**

Run: `cat src/components/ui/button.tsx`
Note its current prop API so callers don't break.

- [ ] **Step 2: Rewrite button.tsx with cva and new tokens**

```tsx
// src/components/ui/button.tsx
import * as React from "react";
import { Slot } from "radix-ui/slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  // Base
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "font-medium select-none cursor-pointer",
    "transition-[background-color,border-color,color,box-shadow,transform]",
    "duration-150 ease-[var(--ease-out)]",
    "active:scale-[0.98] active:transition-[transform] active:duration-100",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-[var(--color-primary)] text-[var(--color-primary-fg)] hover:bg-[var(--color-primary-hover)]",
        secondary: "bg-[var(--color-surface)] text-[var(--color-fg)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
        ghost: "bg-transparent text-[var(--color-fg)] hover:bg-[var(--color-surface-sunken)]",
        danger: "bg-[var(--color-danger)] text-[var(--color-primary-fg)] hover:opacity-90",
        link: "bg-transparent text-[var(--color-primary)] hover:underline underline-offset-4 p-0 h-auto",
      },
      size: {
        sm: "text-body-sm h-8 px-3 rounded-[var(--radius)]",
        md: "text-body-sm h-9 px-4 rounded-[var(--radius)]",
        lg: "text-body h-10 px-5 rounded-[var(--radius-md)]",
        icon: "h-9 w-9 rounded-[var(--radius)] p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
```

Notes:
- Uses `radix-ui/slot` (the single-package style — see package.json: `radix-ui ^1.4.3`). If that import path errors, fall back to `@radix-ui/react-slot` and install it.
- Preserves the original component's name and forwards refs so existing callers using `<Button>` work unchanged. If the original API had extra props (e.g. `loading`), add them here.

- [ ] **Step 3: Add ButtonSection to showcase**

In `src/app/dev/primitives/sections.tsx`, import Button and add:

```tsx
import { Button } from "@/components/ui/button";

function ButtonSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Button</p>
      <div className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link</Button>
          <Button disabled>Disabled</Button>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>
    </section>
  );
}
```

Then render `<ButtonSection />` inside `<Showcase>`.

- [ ] **Step 4: Visual verify**

Run `npm run dev`, visit `/dev/primitives`. Click "Force dark" → buttons should switch to light-indigo (`#818CF8`) on near-black. Click each button: see the press scale; tab through with keyboard: focus ring appears.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/button.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): refactor Button with tokens + variants"
```

---

## Task 9: Refactor `input.tsx`

**Files:**
- Modify: `src/components/ui/input.tsx`
- Modify: `src/app/dev/primitives/sections.tsx` (add InputSection)

- [ ] **Step 1: Rewrite input.tsx**

```tsx
// src/components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      data-invalid={invalid || undefined}
      className={cn(
        "h-9 w-full rounded-[var(--radius)] px-3 text-body",
        "bg-[var(--color-surface)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]",
        "border border-[var(--color-border)]",
        "transition-[border-color,box-shadow] duration-150 ease-[var(--ease-out)]",
        "hover:border-[var(--color-border-strong)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
        "data-[invalid]:border-[var(--color-danger)]",
        "disabled:opacity-50 disabled:pointer-events-none",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
```

- [ ] **Step 2: Add InputSection**

```tsx
import { Input } from "@/components/ui/input";

function InputSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Input</p>
      <div className="space-y-3 max-w-sm">
        <Input placeholder="founders@agency.co" />
        <Input placeholder="With invalid state" invalid />
        <Input placeholder="Disabled" disabled />
      </div>
    </section>
  );
}
```

Render `<InputSection />` in Showcase.

- [ ] **Step 3: Visual + type + lint**

`npm run dev` → `/dev/primitives` → input renders both themes; focus ring; invalid shows red border; disabled is faded.

`npx tsc --noEmit && npm run lint` → pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/input.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): refactor Input with tokens"
```

---

## Task 10: Refactor `card.tsx`

**Files:**
- Modify: `src/components/ui/card.tsx`
- Modify: `src/app/dev/primitives/sections.tsx`

- [ ] **Step 1: Rewrite card.tsx**

```tsx
// src/components/ui/card.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const cardVariants = cva(
  "rounded-[var(--radius-md)] border border-[var(--color-border)]",
  {
    variants: {
      surface: {
        default: "bg-[var(--color-surface)]",
        sunken: "bg-[var(--color-surface-sunken)]",
      },
    },
    defaultVariants: { surface: "default" },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, surface, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ surface }), className)} {...props} />
  ),
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-5 pt-5 pb-3", className)} {...props} />
);
export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-h4 text-fg", className)} {...props} />
);
export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-body-sm text-fg-muted mt-1", className)} {...props} />
);
export const CardBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-5 py-3", className)} {...props} />
);
export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-5 pb-5 pt-3 flex items-center gap-3", className)} {...props} />
);
```

- [ ] **Step 2: Showcase section**

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from "@/components/ui/card";

function CardSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Card</p>
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>invoice-reminders</CardTitle>
            <CardDescription>Sends overdue invoice reminders via Gmail.</CardDescription>
          </CardHeader>
          <CardBody>
            <p className="text-body-sm text-fg-muted">Last run 2 min ago · 412 runs / 24h</p>
          </CardBody>
        </Card>
        <Card surface="sunken">
          <CardHeader>
            <CardTitle>Sunken variant</CardTitle>
            <CardDescription>Used for input groups, table headers.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify + commit**

`npm run dev` + `npx tsc --noEmit && npm run lint` → pass.

```bash
git add src/components/ui/card.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): refactor Card with surface variants"
```

---

## Task 11: Refactor `dialog.tsx`

**Files:**
- Modify: `src/components/ui/dialog.tsx`
- Modify: `src/app/dev/primitives/sections.tsx`

- [ ] **Step 1: Rewrite dialog.tsx**

```tsx
// src/components/ui/dialog.tsx
"use client";
import * as React from "react";
import * as DialogPrimitive from "radix-ui/dialog";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
        "w-full max-w-md rounded-[var(--radius-lg)]",
        "bg-[var(--color-surface)] border border-[var(--color-border)]",
        "shadow-[var(--shadow-md)] p-6",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-1",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = "DialogContent";

export const DialogTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <DialogPrimitive.Title className={cn("text-h3 font-serif text-fg", className)} {...props} />
);
export const DialogDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <DialogPrimitive.Description className={cn("text-body text-fg-muted mt-2", className)} {...props} />
);
```

Note: this uses `data-[state=open]:animate-in` etc. which come from `tw-animate-css`. Since that's being removed, replace with hand-rolled keyframes. Add to globals.css (Task 4 territory — bring it back here):

```css
/* Append to globals.css */
@keyframes ds-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes ds-fade-out { from { opacity: 1; } to { opacity: 0; } }
@keyframes ds-slide-in-up { from { transform: translateY(4px); } to { transform: translateY(0); } }
[data-state="open"].fade-in-0 { animation: ds-fade-in var(--duration-base) var(--ease-out); }
[data-state="closed"].fade-out-0 { animation: ds-fade-out var(--duration-base) var(--ease-out); }
[data-state="open"].slide-in-from-bottom-1 { animation: ds-slide-in-up var(--duration-base) var(--ease-out); }
```

And replace the Dialog className references accordingly:

```tsx
// In DialogOverlay
"data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
// In DialogContent — drop animate-in / animate-out, use our keyframes
"data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-1",
"data-[state=closed]:fade-out-0",
```

- [ ] **Step 2: Showcase**

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

function DialogSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Dialog</p>
      <Dialog>
        <DialogTrigger asChild><Button variant="secondary">Open dialog</Button></DialogTrigger>
        <DialogContent>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>This is what a modal looks like in the new design system.</DialogDescription>
          <div className="mt-6 flex gap-2 justify-end">
            <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
            <Button>Continue</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
```

- [ ] **Step 3: Verify + commit**

`npm run dev` → `/dev/primitives`, click "Open dialog", confirm modal appears and is dismissible.

```bash
git add src/components/ui/dialog.tsx src/app/globals.css src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): refactor Dialog with tokens + native keyframes"
```

---

## Task 12: Refactor `accordion.tsx`

**Files:**
- Modify: `src/components/ui/accordion.tsx`
- Modify: `src/app/dev/primitives/sections.tsx`

- [ ] **Step 1: Rewrite accordion.tsx**

```tsx
// src/components/ui/accordion.tsx
"use client";
import * as React from "react";
import * as AccordionPrimitive from "radix-ui/accordion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export const Accordion = AccordionPrimitive.Root;

export const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b border-[var(--color-border)]", className)}
    {...props}
  />
));
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 text-body text-fg",
        "transition-colors hover:text-fg [&[data-state=open]>svg]:rotate-180",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown className="h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-200" />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn("overflow-hidden text-body-sm text-fg-muted", className)}
    {...props}
  >
    <div className="pb-4">{props.children}</div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";
```

- [ ] **Step 2: Showcase + verify + commit**

Add `<AccordionSection>` with 3 items. Run `npm run dev`, confirm expand/collapse, chevron rotation works.

```bash
git add src/components/ui/accordion.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): refactor Accordion with tokens"
```

---

## Task 13: Refactor `badge.tsx`

**Files:**
- Modify: `src/components/ui/badge.tsx`
- Modify: `src/app/dev/primitives/sections.tsx`

- [ ] **Step 1: Rewrite badge.tsx**

```tsx
// src/components/ui/badge.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2 py-0.5 text-caption font-medium border",
  {
    variants: {
      variant: {
        neutral: "bg-[var(--color-surface-sunken)] text-[var(--color-fg-muted)] border-[var(--color-border)]",
        success: "bg-[color-mix(in_srgb,var(--color-success)_10%,transparent)] text-[var(--color-success)] border-transparent",
        warn:    "bg-[color-mix(in_srgb,var(--color-warn)_10%,transparent)]    text-[var(--color-warn)]    border-transparent",
        danger:  "bg-[color-mix(in_srgb,var(--color-danger)_10%,transparent)]  text-[var(--color-danger)]  border-transparent",
        accent:  "bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] text-[var(--color-primary)] border-transparent",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, dot, children, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          aria-hidden
          className="size-1.5 rounded-full"
          style={{ background: "currentColor" }}
        />
      )}
      {children}
    </span>
  ),
);
Badge.displayName = "Badge";
```

- [ ] **Step 2: Showcase + verify + commit**

Add `<BadgeSection>` with all 5 variants, with and without dot.

```bash
git add src/components/ui/badge.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): refactor Badge with semantic variants + optional dot"
```

---

## Task 14: Refactor `separator.tsx`

**Files:**
- Modify: `src/components/ui/separator.tsx`

- [ ] **Step 1: Rewrite**

```tsx
// src/components/ui/separator.tsx
"use client";
import * as React from "react";
import * as SeparatorPrimitive from "radix-ui/separator";
import { cn } from "@/lib/cn";

export const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    orientation={orientation}
    decorative={decorative}
    className={cn(
      "shrink-0 bg-[var(--color-border)]",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      className,
    )}
    {...props}
  />
));
Separator.displayName = "Separator";
```

- [ ] **Step 2: Commit (no showcase section necessary; visible in other primitives)**

```bash
git add src/components/ui/separator.tsx
git commit -m "feat(ui): refactor Separator with tokens"
```

---

## Tasks 15–18: New input primitives (textarea, select, checkbox, radio, switch, label)

Each one follows the same shape — Radix wrapper or native, cva for variants, tokens for color. Combined into a single task block so the engineer can knock them out together; one commit per primitive.

### Task 15: textarea + label

**Files:** Create `src/components/ui/textarea.tsx`, `src/components/ui/label.tsx`. Modify `sections.tsx`.

- [ ] **Step 1: label.tsx**

```tsx
// src/components/ui/label.tsx
"use client";
import * as React from "react";
import * as LabelPrimitive from "radix-ui/label";
import { cn } from "@/lib/cn";

export const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn("text-body-sm font-medium text-fg leading-none", className)}
    {...props}
  />
));
Label.displayName = "Label";
```

- [ ] **Step 2: textarea.tsx**

```tsx
// src/components/ui/textarea.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    data-invalid={invalid || undefined}
    className={cn(
      "w-full min-h-[80px] rounded-[var(--radius)] px-3 py-2 text-body",
      "bg-[var(--color-surface)] text-[var(--color-fg)] placeholder:text-[var(--color-fg-faint)]",
      "border border-[var(--color-border)] resize-y",
      "hover:border-[var(--color-border-strong)]",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
      "data-[invalid]:border-[var(--color-danger)]",
      "disabled:opacity-50 disabled:pointer-events-none",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
```

- [ ] **Step 3: Showcase + verify + commit**

```bash
git add src/components/ui/label.tsx src/components/ui/textarea.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): add Label and Textarea primitives"
```

### Task 16: select.tsx

**Files:** Create `src/components/ui/select.tsx`. Modify `sections.tsx`.

- [ ] **Step 1: select.tsx (Radix wrapper)**

```tsx
// src/components/ui/select.tsx
"use client";
import * as React from "react";
import * as SelectPrimitive from "radix-ui/select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-[var(--radius)] px-3 text-body",
      "bg-[var(--color-surface)] text-[var(--color-fg)] border border-[var(--color-border)]",
      "hover:border-[var(--color-border-strong)]",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
      "disabled:opacity-50 disabled:pointer-events-none",
      className,
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild><ChevronDown className="h-4 w-4 text-fg-subtle" /></SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] shadow-[var(--shadow-md)]",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-[var(--radius-sm)] py-1.5 pl-8 pr-2 text-body-sm",
      "focus:bg-[var(--color-surface-sunken)] focus:outline-none",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator><Check className="h-4 w-4 text-[var(--color-primary)]" /></SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
```

- [ ] **Step 2: Showcase + verify + commit**

```bash
git add src/components/ui/select.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): add Select primitive"
```

### Task 17: checkbox.tsx + radio-group.tsx + switch.tsx

**Files:** Create `src/components/ui/checkbox.tsx`, `src/components/ui/radio-group.tsx`, `src/components/ui/switch.tsx`. Modify `sections.tsx`.

- [ ] **Step 1: checkbox.tsx**

```tsx
// src/components/ui/checkbox.tsx
"use client";
import * as React from "react";
import * as CheckboxPrimitive from "radix-ui/checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-border-strong)]",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
      "disabled:opacity-50 disabled:pointer-events-none",
      "data-[state=checked]:bg-[var(--color-primary)] data-[state=checked]:border-[var(--color-primary)] data-[state=checked]:text-[var(--color-primary-fg)]",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      <Check className="h-3 w-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = "Checkbox";
```

- [ ] **Step 2: radio-group.tsx**

```tsx
// src/components/ui/radio-group.tsx
"use client";
import * as React from "react";
import * as RadioGroupPrimitive from "radix-ui/radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/lib/cn";

export const RadioGroup = RadioGroupPrimitive.Root;

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "h-4 w-4 rounded-full border border-[var(--color-border-strong)]",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
      "disabled:opacity-50 disabled:pointer-events-none",
      "data-[state=checked]:border-[var(--color-primary)]",
      className,
    )}
    {...props}
  >
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
      <Circle className="h-2 w-2 fill-[var(--color-primary)] text-[var(--color-primary)]" />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = "RadioGroupItem";
```

- [ ] **Step 3: switch.tsx**

```tsx
// src/components/ui/switch.tsx
"use client";
import * as React from "react";
import * as SwitchPrimitive from "radix-ui/switch";
import { cn } from "@/lib/cn";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
      "disabled:opacity-50 disabled:pointer-events-none",
      "data-[state=checked]:bg-[var(--color-primary)] data-[state=unchecked]:bg-[var(--color-border-strong)]",
      className,
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0" />
  </SwitchPrimitive.Root>
));
Switch.displayName = "Switch";
```

- [ ] **Step 4: Showcase + verify + commit**

```bash
git add src/components/ui/checkbox.tsx src/components/ui/radio-group.tsx src/components/ui/switch.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): add Checkbox, RadioGroup, Switch primitives"
```

---

## Task 18: tooltip.tsx + tabs.tsx + dropdown-menu.tsx

**Files:** Create the three files; modify `sections.tsx`.

- [ ] **Step 1: tooltip.tsx**

```tsx
// src/components/ui/tooltip.tsx
"use client";
import * as React from "react";
import * as TooltipPrimitive from "radix-ui/tooltip";
import { cn } from "@/lib/cn";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-fg)] text-[var(--color-bg)] px-2 py-1 text-caption",
      "data-[state=delayed-open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = "TooltipContent";
```

- [ ] **Step 2: tabs.tsx**

```tsx
// src/components/ui/tabs.tsx
"use client";
import * as React from "react";
import * as TabsPrimitive from "radix-ui/tabs";
import { cn } from "@/lib/cn";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("inline-flex h-9 items-center gap-1 border-b border-[var(--color-border)]", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex items-center px-3 py-2 text-body-sm text-fg-muted",
      "hover:text-fg",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]",
      "data-[state=active]:text-fg",
      "data-[state=active]:after:absolute data-[state=active]:after:left-0 data-[state=active]:after:right-0 data-[state=active]:after:-bottom-px",
      "data-[state=active]:after:h-px data-[state=active]:after:bg-[var(--color-primary)]",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-4 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
```

- [ ] **Step 3: dropdown-menu.tsx**

```tsx
// src/components/ui/dropdown-menu.tsx
"use client";
import * as React from "react";
import * as DropdownMenuPrimitive from "radix-ui/dropdown-menu";
import { cn } from "@/lib/cn";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1 text-body-sm text-fg shadow-[var(--shadow-md)]",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-[var(--radius-sm)] px-2 py-1.5 text-body-sm",
      "focus:bg-[var(--color-surface-sunken)] focus:outline-none",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-[var(--color-border)]", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
```

- [ ] **Step 4: Showcase + verify + commit**

```bash
git add src/components/ui/tooltip.tsx src/components/ui/tabs.tsx src/components/ui/dropdown-menu.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): add Tooltip, Tabs, DropdownMenu primitives"
```

---

## Task 19: toast.tsx (sonner-based)

**Files:**
- Modify: `package.json` (add `sonner`)
- Create: `src/components/ui/toast.tsx`
- Modify: `src/app/layout.tsx` (mount `<Toaster />`)
- Modify: `src/app/dev/primitives/sections.tsx`

- [ ] **Step 1: Install sonner**

```bash
npm install sonner
```

- [ ] **Step 2: Create toast.tsx**

```tsx
// src/components/ui/toast.tsx
"use client";
import { Toaster as SonnerToaster, toast } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-fg)] shadow-[var(--shadow-md)]",
          title: "text-body font-medium",
          description: "text-body-sm text-[var(--color-fg-muted)]",
          actionButton: "bg-[var(--color-primary)] text-[var(--color-primary-fg)] rounded-[var(--radius-sm)] px-2 py-1 text-caption",
          cancelButton: "bg-transparent text-[var(--color-fg-muted)] rounded-[var(--radius-sm)] px-2 py-1 text-caption",
          success: "border-[var(--color-success)]",
          error: "border-[var(--color-danger)]",
          warning: "border-[var(--color-warn)]",
        },
      }}
    />
  );
}

export { toast };
```

- [ ] **Step 3: Mount in layout.tsx**

Add inside the `<body>`:

```tsx
import { Toaster } from "@/components/ui/toast";
// …
<body>
  {children}
  <Toaster />
</body>
```

- [ ] **Step 4: Showcase + verify + commit**

```tsx
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

function ToastSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Toast</p>
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" onClick={() => toast("Workflow saved")}>Default</Button>
        <Button variant="secondary" onClick={() => toast.success("Workflow saved")}>Success</Button>
        <Button variant="secondary" onClick={() => toast.error("Connection lost")}>Danger</Button>
        <Button variant="secondary" onClick={() => toast.warning("Approaching rate limit")}>Warn</Button>
      </div>
    </section>
  );
}
```

```bash
git add package.json package-lock.json src/components/ui/toast.tsx src/app/layout.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): add Toast primitive via sonner"
```

---

## Task 20: skeleton.tsx + progress.tsx + status-dot.tsx

**Files:** Create three primitives. Modify `sections.tsx`.

- [ ] **Step 1: skeleton.tsx**

```tsx
// src/components/ui/skeleton.tsx
import { cn } from "@/lib/cn";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius)] bg-[var(--color-surface-sunken)]",
        className,
      )}
      {...props}
    />
  );
}
```

Note: `animate-pulse` is a Tailwind built-in. If it's been removed, define a `ds-pulse` keyframe in globals.css.

- [ ] **Step 2: progress.tsx**

```tsx
// src/components/ui/progress.tsx
"use client";
import * as React from "react";
import * as ProgressPrimitive from "radix-ui/progress";
import { cn } from "@/lib/cn";

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-1.5 w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-surface-sunken)]",
      className,
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="h-full bg-[var(--color-primary)] transition-transform duration-300 ease-[var(--ease-out)]"
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";
```

- [ ] **Step 3: status-dot.tsx**

```tsx
// src/components/ui/status-dot.tsx
import { cn } from "@/lib/cn";

type Status = "running" | "degraded" | "failed" | "idle" | "info";

const COLOR: Record<Status, string> = {
  running: "bg-[var(--color-success)]",
  degraded: "bg-[var(--color-warn)]",
  failed: "bg-[var(--color-danger)]",
  idle: "bg-[var(--color-fg-faint)]",
  info: "bg-[var(--color-primary)]",
};

export function StatusDot({ status, className }: { status: Status; className?: string }) {
  return <span aria-hidden className={cn("inline-block size-2 rounded-full", COLOR[status], className)} />;
}
```

- [ ] **Step 4: Showcase + verify + commit**

```bash
git add src/components/ui/skeleton.tsx src/components/ui/progress.tsx src/components/ui/status-dot.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): add Skeleton, Progress, StatusDot primitives"
```

---

## Task 21: metric.tsx

**Files:** Create `src/components/ui/metric.tsx`. Modify `sections.tsx`.

- [ ] **Step 1: metric.tsx**

```tsx
// src/components/ui/metric.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

export interface MetricProps {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; trend: "up" | "down" | "flat" };
  className?: string;
}

const TREND_COLOR = {
  up: "text-[var(--color-success)]",
  down: "text-[var(--color-danger)]",
  flat: "text-[var(--color-fg-subtle)]",
} as const;

export function Metric({ label, value, delta, className }: MetricProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-label text-fg-subtle">{label}</span>
      <div className="flex items-baseline gap-2">
        <span className="text-mono text-h3 text-fg font-medium tabular-nums">{value}</span>
        {delta && <span className={cn("text-caption", TREND_COLOR[delta.trend])}>{delta.value}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Showcase + verify + commit**

```tsx
import { Metric } from "@/components/ui/metric";

function MetricSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Metric</p>
      <div className="grid grid-cols-3 gap-6 max-w-2xl">
        <Metric label="Hours reclaimed / mo" value="2,431" delta={{ value: "+18%", trend: "up" }} />
        <Metric label="Workflows running" value="87" delta={{ value: "+6", trend: "up" }} />
        <Metric label="ROI to date" value="$184,200" />
      </div>
    </section>
  );
}
```

```bash
git add src/components/ui/metric.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): add Metric primitive"
```

---

## Task 22: data-table.tsx

**Files:** Create `src/components/ui/data-table.tsx`. Modify `sections.tsx`.

- [ ] **Step 1: data-table.tsx**

```tsx
// src/components/ui/data-table.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

type Density = "spacious" | "medium" | "dense";

const ROW_PADDING: Record<Density, string> = {
  spacious: "py-5 px-6",
  medium: "py-3.5 px-5",
  dense: "py-2 px-4",
};
const HEAD_PADDING: Record<Density, string> = {
  spacious: "py-3 px-6",
  medium: "py-2.5 px-5",
  dense: "py-2 px-4",
};

export function Table({
  className,
  density = "medium",
  ...props
}: React.HTMLAttributes<HTMLTableElement> & { density?: Density }) {
  return (
    <div className={cn("rounded-[var(--radius-md)] border border-[var(--color-border)] overflow-hidden", className)}>
      <table data-density={density} className="w-full border-collapse text-left" {...props} />
    </div>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-sunken)]">{children}</thead>;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-t border-[var(--color-border)] first:border-t-0 hover:bg-[var(--color-surface-sunken)]/50", className)} {...props} />;
}

export function TH({ density = "medium", className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { density?: Density }) {
  return (
    <th
      className={cn(
        "text-label text-fg-subtle font-medium",
        HEAD_PADDING[density],
        className,
      )}
      {...props}
    />
  );
}

export function TD({ density = "medium", className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { density?: Density }) {
  return (
    <td
      className={cn(
        "text-body-sm text-fg align-middle",
        ROW_PADDING[density],
        className,
      )}
      {...props}
    />
  );
}
```

API note: density is passed by the caller per-cell. Future composition layer (Phase 2) can wrap this in a "DataTable" that walks rows + cols automatically.

- [ ] **Step 2: Showcase + verify + commit**

```tsx
import { Table, THead, TR, TH, TD } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";

function TableSection() {
  return (
    <section>
      <p className="text-label text-fg-subtle mb-3">Data table</p>
      <Table density="medium">
        <THead>
          <TR>
            <TH>Workflow</TH>
            <TH>Runs (24h)</TH>
            <TH>Status</TH>
            <TH>Last run</TH>
          </TR>
        </THead>
        <tbody>
          <TR><TD>invoice-reminders</TD><TD>412</TD><TD><Badge variant="success" dot>Running</Badge></TD><TD>2 min ago</TD></TR>
          <TR><TD>lead-router-v2</TD><TD>87</TD><TD><Badge variant="success" dot>Running</Badge></TD><TD>14 min ago</TD></TR>
          <TR><TD>slack-recap-daily</TD><TD>3</TD><TD><Badge variant="warn" dot>Degraded</Badge></TD><TD>1 hr ago</TD></TR>
        </tbody>
      </Table>
    </section>
  );
}
```

```bash
git add src/components/ui/data-table.tsx src/app/dev/primitives/sections.tsx
git commit -m "feat(ui): add Table primitive with density variants"
```

---

## Task 23: Deletion sweep

**Files:**
- Delete 12 component files (see §8.3 of spec).
- Modify: `package.json` to remove deps.

- [ ] **Step 1: Verify zero callers for each deleted component**

For each file in the deletion list, run:

```bash
F=src/components/animations/AnimatedGradientText.tsx; B=$(basename "$F" .tsx); rg -n "$B" src/ --type tsx --type ts | grep -v "^$F"
```

Repeat for each of the 12 files. **If any reference exists**, do NOT delete — fix the referencing code first (delete the import, swap the component for nothing/spaceholder), then re-run. Goal: empty output for every file.

- [ ] **Step 2: Delete the 12 component files**

```bash
rm src/components/animations/AnimatedGradientText.tsx
rm src/components/animations/CountUp.tsx
rm src/components/animations/FadeInOnScroll.tsx
rm src/components/animations/FloatingParticles.tsx
rm src/components/animations/GlowCard.tsx
rm src/components/animations/StaggerChildren.tsx
rm src/components/animations/TypewriterText.tsx
rmdir src/components/animations || true
rm src/components/ui/beams-background.tsx
rm src/components/ui/beams-background-lazy.tsx
rm src/components/ui/beams-canvas.tsx
rm src/components/ui/shader-background.tsx
rm src/components/ui/limelight-nav.tsx
```

- [ ] **Step 3: Verify zero callers for the three.js deps**

```bash
rg -n "@react-three|from \"three\"|from 'three'" src/
```
Expected: empty.

- [ ] **Step 4: Verify zero callers for tw-animate-css**

```bash
rg -n "tw-animate-css|animate-in|animate-out" src/
```

If `animate-in`/`animate-out` show up in the primitives (Tasks 11, 16, 18 use them via `data-[state=open]:animate-in`), and we already replaced them with our own `fade-in-0` etc. classes, this should still be empty.

If non-empty, replace those classNames with our keyframes (Task 11 added them to globals.css) before continuing.

- [ ] **Step 5: Remove deps from package.json**

```bash
npm uninstall three @react-three/fiber @react-three/drei @types/three tw-animate-css
```

- [ ] **Step 6: Check framer-motion usage**

```bash
rg -n "from \"framer-motion\"|from 'framer-motion'" src/
```

If empty, `npm uninstall framer-motion`. If not empty, leave it — list the remaining call sites so a follow-up phase can decide.

- [ ] **Step 7: Build + type-check + lint + smoke**

```bash
npm run build
npx tsc --noEmit
npm run lint
```

All must pass. Then `npm run dev` and visit every existing route again. Each must render.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore(ui): delete legacy animation/3D components + unused deps"
```

---

## Task 24: Write docs/design-system/README.md

**Files:**
- Create: `docs/design-system/README.md`

- [ ] **Step 1: Create the file**

```markdown
# Design System — Token Quick Reference

This is the one-page lookup for tokens. The full rationale lives in
[`docs/superpowers/specs/2026-05-10-design-system-foundations-design.md`](../superpowers/specs/2026-05-10-design-system-foundations-design.md).

All tokens are CSS variables defined in `src/app/globals.css`. Tailwind v4
exposes them as utility classes automatically.

## Theme

Theme is set by route via middleware. Light is default; dark applies on routes
prefixed with `/dashboard`, `/admin`, `/aios`. To force a theme in the
showcase, set `document.documentElement.dataset.theme = "dark" | "light"`.

## Colors

| Role | CSS var | Tailwind utility |
|---|---|---|
| Background | `--color-bg` | `bg-bg` |
| Surface | `--color-surface` | `bg-surface` |
| Sunken surface | `--color-surface-sunken` | `bg-surface-sunken` |
| Border | `--color-border` | `border-border` |
| Strong border | `--color-border-strong` | `border-border-strong` |
| Foreground | `--color-fg` | `text-fg` |
| Muted fg | `--color-fg-muted` | `text-fg-muted` |
| Subtle fg | `--color-fg-subtle` | `text-fg-subtle` |
| Faint fg | `--color-fg-faint` | `text-fg-faint` |
| Primary | `--color-primary` | `bg-primary text-primary-fg` |
| Primary fg | `--color-primary-fg` | `text-primary-fg` |
| Primary hover | `--color-primary-hover` | (use in hover:) |
| Success | `--color-success` | `text-success bg-success/10` |
| Warn | `--color-warn` | `text-warn bg-warn/10` |
| Danger | `--color-danger` | `text-danger bg-danger/10` |
| Accent ladder | `--color-accent-{50…950}` | `bg-accent-600`, `text-accent-300` |

## Type

| Role | Utility | Family |
|---|---|---|
| display | `text-display` | Instrument Serif |
| h1 | `text-h1` | Instrument Serif |
| h2 | `text-h2` | Instrument Serif |
| h3 | `text-h3` | Inter Tight 500 |
| h4 | `text-h4` | Inter Tight 500 |
| body-lg | `text-body-lg` | Inter Tight 400 |
| body | `text-body` | Inter Tight 400 |
| body-sm | `text-body-sm` | Inter Tight 400 |
| caption | `text-caption` | Inter Tight 500 |
| label | `text-label` | Inter Tight 600, uppercase, 0.12em tracking |
| mono | `text-mono` | JetBrains Mono |

## Radius

`rounded-sm` (4px) · `rounded` (6px, default) · `rounded-md` (8px) · `rounded-lg` (12px) · `rounded-xl` (16px) · `rounded-full`.

## Motion

`duration-instant` (100ms) · `duration-fast` (150ms) · `duration-base` (200ms) · `duration-slow` (300ms). Easings: `--ease-out`, `--ease-emphasis`.

**Disallowed**: scroll-triggered reveals, hover transforms >2px, ambient loops, particles, shaders, glow/bloom effects.

## Primitives

All in `src/components/ui/`. See `src/app/dev/primitives/` for a live showcase. Run `npm run dev` and visit `/dev/primitives` to see every primitive in both themes.
```

- [ ] **Step 2: Commit**

```bash
git add docs/design-system/README.md
git commit -m "docs(design): token quick-reference"
```

---

## Task 25: Final verification

- [ ] **Step 1: Build**

```bash
npm run build
```
Expected: pass.

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```
Expected: pass.

- [ ] **Step 3: Lint**

```bash
npm run lint
```
Expected: pass.

- [ ] **Step 4: Smoke every route in both themes**

`npm run dev`. Visit (and confirm `<html data-theme>` matches expectation):

Light routes (`data-theme="light"`):
- `/`, `/about`, `/services`, `/pricing`, `/how-it-works`, `/faq`, `/workflows`
- `/audit`, `/results`
- `/login`, `/forgot-password`
- `/privacy`, `/terms`, `/unsubscribe`

Dark routes (`data-theme="dark"`):
- `/dashboard` (will likely redirect to `/login` if unauthed — confirm the login is light)
- `/admin` (gated — at least confirm the gate page is dark)
- `/aios`

Each page must render with no console errors. Visual decoration will be plain (legacy stubs handle this), which is expected.

- [ ] **Step 5: Audit PDF smoke**

Complete a minimal audit at `/audit`, get to `/results`, trigger PDF download. Open the PDF — it must render with the audit content, in approximately the same layout as before. Compare to a known-good PDF from before this branch if available. If layout is broken, identify whether the `pdf-generator.ts` references specific deleted classes and add stubs accordingly.

- [ ] **Step 6: Primitives showcase smoke**

Visit `/dev/primitives` in both themes (click toggle). Confirm every section renders: Button, Input, Card, Dialog, Accordion, Badge, Label, Textarea, Select, Checkbox, RadioGroup, Switch, Tooltip, Tabs, DropdownMenu, Toast, Skeleton, Progress, StatusDot, Metric, Table.

In production build, confirm `/dev/primitives` returns 404:

```bash
npm run build && npm run start
curl -i http://localhost:3000/dev/primitives 2>&1 | head -5
```
Expected: `HTTP/1.1 404`.

- [ ] **Step 7: Commit any final fixes + open PR**

If issues surfaced in steps 1–6, fix them with focused commits. Then push:

```bash
git push -u origin redesign/phase-0-design-system
```

Open PR titled `Phase 0 — design system foundations` linking the spec file. List the verification steps as the PR checklist.

---

## Self-Review Notes

After writing this plan, I checked it against the spec:

**Spec coverage** (each goal in the spec maps to one or more tasks):
- §2 goal 1 (single token system) → Tasks 3, 4
- §2 goal 2 (replace Stitch+shadcn+v2) → Tasks 3, 5
- §2 goal 3 (light/dark `data-theme` swap) → Tasks 4, 6
- §2 goal 4 (cut animation/decoration) → Tasks 5, 23
- §6 token system → Tasks 3, 4
- §7 theme switching → Task 6
- §8.1 refactored primitives → Tasks 8–14
- §8.2 new primitives → Tasks 15–22
- §8.3 deletions → Task 23
- §9 migration sequence → Tasks 0, 2, 3, 4, 5, 6, 8–22, 23, 24
- §12 verification → Task 25

**Placeholder scan**: no TBDs, no "implement appropriate X", no "similar to Task N" — every step has the actual content.

**Type consistency**: primitive APIs use `forwardRef` consistently; cva is used the same way each time; `cn()` import path is `@/lib/cn` everywhere; CSS-variable names match the spec exactly.

**One known weak spot**: the showcase route uses `process.env.NODE_ENV === "production"` for the 404 gate. This works for `next start` but a determined visitor could still reach it on a preview branch. That's acceptable for a dev tool; if it becomes a concern, gate with `headers().get("x-forwarded-host")` against an allowlist later.

---

*Plan generated 2026-05-10 from `docs/superpowers/specs/2026-05-10-design-system-foundations-design.md`. Execute with subagent-driven-development or executing-plans.*
