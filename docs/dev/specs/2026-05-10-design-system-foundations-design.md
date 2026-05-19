# Design System Foundations — Phase 0

**Date**: 2026-05-10
**Status**: Approved, ready for implementation planning
**Phase**: 0 of 3 (full-site redesign)
**Owner**: Lawand
**Affects repo**: `opsradar/` (Next.js 16 app)

## 1 · Why this phase exists

OpsRadar's current visual system is the accumulation of three overlapping design eras:
- A Material-3-style "Stitch" token set (surface-container-*, on-surface-*, primary-container).
- A shadcn token set imported via `@import "shadcn/tailwind.css"`.
- A "v2" landing-page rebuild with bespoke hero animations, particle drift, mesh gradients, shader background, and a multi-layer "limelight" nav bloom.

`src/app/globals.css` is 1,186 lines. `--font-serif` and `--font-headline` are declared but both resolve to the same sans variable. Components in `src/components/` reference legacy classes from all three eras simultaneously. The visual surface is electric blue + cyan + heavy motion — chosen for a "tool built by engineers" feel, but no longer matches the product's positioning.

The product is being repositioned as **agency operations infrastructure** — durable, data-first, trust-grade. The redesign reflects that. Phase 0 lays the design-system floor: token system, primitives, theme switching, deletion of the contradictory legacy. Phases 1–3 redesign actual pages on top of this foundation.

This spec covers **only** Phase 0. Pages are not redesigned here.

## 2 · Goals

1. Establish a single, coherent token system as the only source of design truth for Phases 1–3 to build against.
2. Replace the layered "Stitch + shadcn + v2" legacy with one Tailwind v4 `@theme` block.
3. Make light-marketing ↔ dark-dashboard switching a `[data-theme]` attribute swap on `<html>`, not a separate codebase.
4. Cut animation/decoration code that contradicts the new aesthetic, so Phase 1 (marketing redesign) starts from a clean floor.

## 3 · Non-goals

- No page or component visual redesigns in this phase. Tokens, not paintings.
- No new component primitives invented beyond the explicit inventory in §8.
- No changes to API routes, business logic, copy, IA, SEO, or the audit/dashboard data model.
- No new color system for the AI chat assistant — it will inherit like any other component.
- No font-loading optimization work (stays under `next/font`, just swap families).
- No content for the design system docs site (just a one-page README).
- No design-token export to other repos (e.g. `opsradar-chat/`).

## 4 · Aesthetic anchors (decided during brainstorm)

| Anchor | Decision | Why |
|---|---|---|
| Brand personality | Mercury / Ramp — fintech-serious, structured, data-first | Trust-grade infrastructure positioning |
| Surface strategy | Hybrid — light marketing, dark dashboard, shared tokens | Each surface optimized for its job |
| Accent | Refined Indigo (`#4F46E5` on light / `#818CF8` on dark) | Mercury/Stripe energy; calm; premium |
| Typography | Instrument Serif (display/h1/h2) + Inter Tight (body/UI) + JetBrains Mono (numerics) | Editorial sharpness + dense UI workhorse |
| Density | Medium — Ramp pattern, ~14px row padding, ~8 rows visible | Defensible default for both surfaces |
| Motion | Restrained — functional only | Matches the calm aesthetic |
| Token architecture | Tailwind v4 `@theme` only (single source of truth in `globals.css`) | Lowest ceremony; matches shadcn-v4 conventions; runtime swap via `[data-theme]` |

## 5 · Surface contract

Two surfaces share every token except the color theme:

| Aspect | Marketing (light) | Dashboard / Admin / AIOS (dark) |
|---|---|---|
| `<html data-theme>` | `light` | `dark` |
| Routes | `/`, `/about`, `/services`, `/pricing`, `/how-it-works`, `/for/*`, `/faq`, `/workflows`, `/audit`, `/results`, `/login`, `/forgot-password`, `/privacy`, `/terms`, `/unsubscribe` | `/dashboard`, `/dashboard/*`, `/admin`, `/admin/*`, `/aios` |
| Page bg | `--color-bg` (off-white `#FAFAF7`) | `--color-bg` (near-black `#0A0A0B`) |
| Type scale | identical | identical |
| Spacing/radius | identical | identical |
| Density default | spacious | medium |
| Motion | identical (restrained) | identical |

Theme is set by middleware based on the route — no client-side flash. See §9 step 3 for implementation detail.

## 6 · Token system

All tokens live in `src/app/globals.css` inside a single `@theme` block. Light is default; dark overrides via `[data-theme="dark"]` on `<html>`.

### 6.1 Surface palette

**Light** (marketing/audit/auth):
```css
--color-bg: #FAFAF7;            /* warm off-white */
--color-surface: #FFFFFF;        /* elevated cards */
--color-surface-sunken: #F4F4F0; /* inputs, table headers */
--color-border: #E4E4E7;         /* zinc-200 */
--color-border-strong: #D4D4D8;  /* zinc-300 */
--color-fg: #18181B;             /* zinc-900, primary text */
--color-fg-muted: #52525B;       /* zinc-600, body */
--color-fg-subtle: #71717A;      /* zinc-500, captions */
--color-fg-faint: #A1A1AA;       /* zinc-400, placeholder */
```

**Dark** (dashboard/admin/AIOS):
```css
--color-bg: #0A0A0B;
--color-surface: #0F0F11;
--color-surface-sunken: #15151A;
--color-border: #1F1F22;
--color-border-strong: #27272A;
--color-fg: #FAFAF9;
--color-fg-muted: #A1A1AA;
--color-fg-subtle: #71717A;
--color-fg-faint: #52525B;
```

### 6.2 Accent ladder (Refined Indigo)

Full ladder is identical across themes; the *primary* swatch differs:

| Step | Hex | Role |
|---|---|---|
| `--color-accent-50` | `#EEF2FF` | tinted bg (light only) |
| `--color-accent-100` | `#E0E7FF` | tinted bg / fg on dark accent surfaces |
| `--color-accent-300` | `#A5B4FC` | hover state (light primary going lighter) |
| `--color-accent-400` | `#818CF8` | **primary (dark)** |
| `--color-accent-500` | `#6366F1` | focus ring (both themes) |
| `--color-accent-600` | `#4F46E5` | **primary (light)** |
| `--color-accent-700` | `#4338CA` | hover state (light primary going darker) |
| `--color-accent-800` | `#3730A3` | active state (light) / deepest tinted bg (dark) |

Resolved tokens:
- `--color-primary` → light: `var(--color-accent-600)` (`#4F46E5`); dark: `var(--color-accent-400)` (`#818CF8`)
- `--color-primary-fg` → light: `#FFFFFF`; dark: `#1E1B4B`

### 6.3 Semantic colors

| Role | Light | Dark | Used for |
|---|---|---|---|
| success | `#16A34A` | `#34D399` | "running" status, positive deltas |
| warn | `#B45309` | `#FBBF24` | "degraded" status, attention needed |
| danger | `#DC2626` | `#F87171` | "failed" status, destructive actions |
| info | = accent | = accent | Notifications (no separate info color) |

### 6.4 Type scale

11 named roles. **Instrument Serif** for display/h1/h2 (the editorial moments). **Inter Tight** for everything else. **JetBrains Mono** for numerics, IDs, codes.

| Role | Size/line | Tracking | Family | Weight |
|---|---|---|---|---|
| `display` | 54/57 (clamp 40–64) | −0.025em | Instrument Serif | 400 |
| `h1` | 40/43 (clamp 32–48) | −0.02em | Instrument Serif | 400 |
| `h2` | 30/34 (clamp 26–36) | −0.02em | Instrument Serif | 400 |
| `h3` | 22/28 | −0.015em | Inter Tight | 500 |
| `h4` | 18/23 | −0.01em | Inter Tight | 500 |
| `body-lg` | 17/26 | 0 | Inter Tight | 400 |
| `body` | 15/23 | 0 | Inter Tight | 400 |
| `body-sm` | 13/20 | 0 | Inter Tight | 400 |
| `caption` | 11/15 | 0 | Inter Tight | 500 |
| `label` | 11/15 | 0.12em uppercase | Inter Tight | 600 |
| `mono` | 14/20 | 0 | JetBrains Mono | 400 |

Tailwind exposes these as `text-display`, `text-h1`, …, `text-mono` utility classes via `@theme`.

### 6.5 Spacing

Tailwind defaults, 4px base. **No custom scale.** Arbitrary px values (e.g. `p-[7px]`) discouraged but enforcement is deferred to a follow-up.

### 6.6 Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Chips, small badges |
| `--radius` | 6px | **Default** — buttons, inputs |
| `--radius-md` | 8px | Cards, panels |
| `--radius-lg` | 12px | Modals, hero metric strip |
| `--radius-xl` | 16px | Page-scale containers (rare) |
| `--radius-full` | 9999px | Status dots, avatars, pills |

### 6.7 Shadow

Minimal. No colored shadows, no glows.

| Token | Light | Dark |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | `0 1px 0 rgba(255,255,255,0.04)` inset |
| `--shadow` | `0 4px 12px rgba(0,0,0,0.06)` | `0 4px 12px rgba(0,0,0,0.5)` |
| `--shadow-md` | `0 12px 32px rgba(0,0,0,0.08)` | `0 12px 32px rgba(0,0,0,0.6)` |

### 6.8 Motion

| Token | Value | Used for |
|---|---|---|
| `--duration-instant` | 100ms | Button press |
| `--duration-fast` | 150ms | Hover (color/border shift) |
| `--duration-base` | 200ms | State change, modal open |
| `--duration-slow` | 300ms | Drawer slide |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Default |
| `--ease-emphasis` | `cubic-bezier(0.3, 0, 0.1, 1)` | Status changes |

**Allowed properties**: opacity, color, background-color, border-color, transform (max 2px translate / max 0.98 scale).

**Disallowed**: scroll-triggered reveals, hover transforms > 2px, ambient loops, particles, shaders, glow/bloom effects. Any exception requires a code comment explaining the carve-out and a link back to this spec.

### 6.9 Focus ring

```css
*:focus-visible {
  outline: 2px solid var(--color-accent-500);
  outline-offset: 2px;
}
```

Single ring style across both surfaces. Replaces the current cyan ring + ad-hoc border-radius rules.

## 7 · Theme switching

Theme is determined by route on the server side, set via `data-theme` attribute on `<html>` in `src/app/layout.tsx`. Implementation sketch:

```tsx
// src/app/layout.tsx (Next.js 16 — headers() is async)
import { headers } from 'next/headers';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Determine theme from headers set by middleware (no client flash)
  const theme = (await headers()).get('x-theme') ?? 'light';
  return (
    <html lang="en" data-theme={theme} className={...fonts}>
      <body>{children}</body>
    </html>
  );
}
```

Middleware (`src/proxy.ts` — already exists for auth) sets the header:

```ts
// add to existing src/proxy.ts
const isDarkRoute = DARK_ROUTES.some(prefix => pathname.startsWith(prefix));
response.headers.set('x-theme', isDarkRoute ? 'dark' : 'light');
```

No client-side toggle. No `localStorage`. No system-preference detection. The theme is a property of the route.

## 8 · Primitive inventory

Components live in `src/components/ui/`. Each primitive is a single file exporting one or more React components. Built on Radix primitives where applicable; styled with the new tokens via Tailwind utility classes.

### 8.1 Refactor existing (filenames preserved, internals rewritten)

| File | Notes |
|---|---|
| `button.tsx` | Variants: `primary`, `secondary`, `ghost`, `danger`, `link`. Sizes: `sm`, `md`, `lg`, `icon`. |
| `input.tsx` | States: default, focus, disabled, error. |
| `card.tsx` | Surface variants: `default` (= surface), `sunken`. |
| `dialog.tsx` | Radix Dialog. 200ms ease-out fade + 4px translateY. |
| `accordion.tsx` | Radix Accordion. |
| `badge.tsx` | Variants: `neutral`, `success`, `warn`, `danger`, `accent`. Optional leading status dot. |
| `separator.tsx` | Radix Separator. Color = `--color-border`. |

### 8.2 New primitives (Phase 0)

| File | Built on | Notes |
|---|---|---|
| `textarea.tsx` | native | Same states as input. |
| `select.tsx` | Radix Select | Custom-styled trigger + content. |
| `checkbox.tsx` | Radix Checkbox | |
| `radio.tsx` | Radix Radio Group | |
| `switch.tsx` | Radix Switch | |
| `label.tsx` | Radix Label | |
| `tooltip.tsx` | Radix Tooltip | 200ms delay, 100ms fade. |
| `tabs.tsx` | Radix Tabs | Underline indicator, no animated bar. |
| `dropdown-menu.tsx` | Radix DropdownMenu | |
| `toast.tsx` | sonner | Position: top-right, accent variants for success/warn/danger. |
| `skeleton.tsx` | native | Subtle pulse via opacity, 1500ms loop. |
| `progress.tsx` | Radix Progress | Linear bar only. |
| `status-dot.tsx` | native | Filled colored circle, 4 semantic colors. |
| `metric.tsx` | native | Label + mono value + optional delta (semantic-colored). |
| `data-table.tsx` | native + Radix Tabs (for filters) | Wraps `<table>`, supports col-head, row, hover, status column. Density variants: `spacious`, `medium`, `dense`. |

### 8.3 Deleted (after grep confirms zero callers)

**Files**:
- `src/components/animations/AnimatedGradientText.tsx`
- `src/components/animations/CountUp.tsx`
- `src/components/animations/FadeInOnScroll.tsx`
- `src/components/animations/FloatingParticles.tsx`
- `src/components/animations/GlowCard.tsx`
- `src/components/animations/StaggerChildren.tsx`
- `src/components/animations/TypewriterText.tsx`
- `src/components/ui/beams-background.tsx`
- `src/components/ui/beams-background-lazy.tsx`
- `src/components/ui/beams-canvas.tsx`
- `src/components/ui/shader-background.tsx`
- `src/components/ui/limelight-nav.tsx`

**Deps** (after deletion verified): `tw-animate-css`, `@react-three/fiber`, `three`. Possibly `framer-motion` if no remaining callers — verify before removing.

### 8.4 Deferred to later phases

- Chat assistant rebuild (`glowing-ai-chat-assistant.tsx`) — Phase 3
- Site header rebuild (`site-header.tsx`) — Phase 1
- Pricing component restyle (`pricing-component.tsx`) — Phase 1
- Hero banner rebuild (`responsive-hero-banner.tsx`) — Phase 1
- Dashboard shell composition — Phase 2
- Admin tables compositions — Phase 3

## 9 · Migration sequence

Each step is its own commit on a feature branch so it can be reviewed/reverted independently.

1. **Fonts** — add Instrument Serif, Inter Tight, JetBrains Mono via `next/font` in `src/app/layout.tsx`. Keep existing Noto fonts loaded temporarily as fallbacks. CSS-variable names: `--font-serif`, `--font-sans`, `--font-mono`.

2. **Token foundation** — rewrite `src/app/globals.css`. Replace existing `@theme` block with new tokens from §6. Add `[data-theme="dark"]` override block. Keep `@import "tailwindcss";` at top. **Drop** `@import "tw-animate-css";` and `@import "shadcn/tailwind.css";` — inline any shadcn utilities we still use.

3. **Theme switch wiring** — modify `src/proxy.ts` to set `x-theme` header by route. Modify `src/app/layout.tsx` to read header and set `data-theme` on `<html>`. Update existing `color-scheme: dark` rule in `globals.css` to derive from `data-theme`.

4. **Legacy CSS stubs** — at the bottom of `globals.css`, add no-op stubs for every legacy class still referenced by existing pages: `section-tag`, `section-title`, `section-copy`, `surface-panel`, `surface-card`, `surface-card-strong`, `surface-divider`, `footer-shell`, `header-shell`, `header-nav-pill`, `header-link*`, `hero-*`, `hardware-card`, `glass-card`, `glow-hover`, `card-lift`, `mesh-gradient`, `radial-fade`, `grid-bg`, `gradient-text`, `text-gradient-animated`, `text-white-gradient`, `text-blue-gradient`, `glow-blue`, `cta-pulse`, `btn-spring`, `fade-up`, `reveal`, `option-selected`, `ring-glow`, `orbit-dot*`, `float-dot`, `hover-card`, `hover-chip`, `btn-press`, `noise-texture`, `dot-grid-overlay`, `grid-overlay-v2`, `orb-v2*`, `hero-slide-*`, `badge-blink`, `font-outfit`, `show-card-*`, `show-tag-*`, `step-forward`, `step-backward`, `scroll-cue`, `waste-slider`, `prose-readable`, `locked-overlay*`. Stubs should remove the legacy visual treatment but not break layout (e.g. preserve display/positioning, drop colors/shadows/animations). Audit-PDF print rules stay intact.

5. **Primitives** — refactor the 7 existing primitives (§8.1) and add the 15 new ones (§8.2). Each primitive ships in one commit. Each primitive's API documented inline at top of file. Existing imports in `src/app/**` keep working (no breaking changes to existing primitives' prop signatures).

6. **Deletion sweep** — grep-verify zero callers, then remove the 12 deleted components (§8.3) and the 3 deps. Remove legacy CSS stubs from step 4 only for classes confirmed unreferenced.

7. **Docs** — `docs/design-system/README.md`: one page with a token quick-reference table and links back to this spec.

(Step 8 "lint rule banning arbitrary px" — deferred to a follow-up phase, not part of this spec.)

## 10 · Files touched in Phase 0

| Path | Operation |
|---|---|
| `src/app/globals.css` | Full rewrite (~80% deletion + new tokens) |
| `src/app/layout.tsx` | Swap fonts; add `data-theme` from header |
| `src/proxy.ts` | Add theme header logic |
| `src/components/ui/{button,input,card,dialog,accordion,badge,separator}.tsx` | Refactor with new tokens |
| `src/components/ui/{textarea,select,checkbox,radio,switch,label,tooltip,tabs,dropdown-menu,toast,skeleton,progress,status-dot,metric,data-table}.tsx` | New |
| `src/components/animations/*` | Delete (after grep) |
| `src/components/ui/{beams-*,shader-*,limelight-*}.tsx` | Delete (after grep) |
| `tailwind.config.ts` | Slim down or delete (Tailwind v4 mostly uses `@theme`) |
| `package.json` | Remove deps after deletion sweep |
| `docs/design-system/README.md` | New |
| `src/app/fonts/*` | Keep current Noto files until step 1 confirms new fonts load; remove if unused after step 6 |

## 11 · Risks and mitigations

- **The audit funnel `/audit` uses heavy bespoke styling and the audit PDF inlines styles via `pdf-generator.ts`.** Step 4's legacy-CSS stubs keep the audit visually intact. Verification step before merging step 2: regenerate a sample audit PDF and visually compare before/after. The PDF generator should not need touching in Phase 0.
- **`@import "shadcn/tailwind.css"` may collide with the new `@theme` block.** Mitigation: step 2 drops the import and inlines only the parts we use. If shadcn primitives expect specific class names, they must be either renamed or rewritten in step 5.
- **`framer-motion` may have non-obvious callers** (e.g. page transitions). Audit before removing. Likely outcome: keep the package, drop most usage.
- **Theme attribute on `<html>` requires server determination** to avoid flash-of-wrong-theme. The middleware approach in §7 handles this; client-only approaches would flash.
- **`color-scheme: dark` is set on `html` today.** Must move under `[data-theme="dark"]` selector or browsers will misrender form controls in light theme.

## 12 · Verification before considering Phase 0 done

- `npm run build` succeeds with new globals.css and primitives.
- `npm run lint` passes.
- All existing routes (`/`, `/about`, `/services`, `/pricing`, `/how-it-works`, `/for/*`, `/faq`, `/workflows`, `/audit`, `/results`, `/login`, `/forgot-password`, `/privacy`, `/terms`, `/unsubscribe`, `/dashboard`, `/admin`, `/aios`) render without console errors.
- Dashboard routes render with `data-theme="dark"`; marketing routes render with `data-theme="light"`.
- Audit PDF generation produces visually-equivalent output to pre-migration.
- No remaining imports of deleted components anywhere in `src/`.
- Token quick-reference (`docs/design-system/README.md`) lists every public token name.

## 13 · Out of scope (later phases)

- **Phase 1** — Marketing surface redesign: landing, about, services, pricing, how-it-works, for/*, FAQ, workflows, audit funnel, results, auth.
- **Phase 2** — Customer dashboard `/dashboard`: live n8n widgets, tool status, workflow runs, ROI calculator.
- **Phase 3** — Admin back-office, AIOS page, chat assistant rebuild, polish pass.

Each later phase gets its own brainstorm → spec → plan → implementation cycle. None of them touch this token system except through it.

---

*Brainstormed and approved 2026-05-10 in conversation with the user via the superpowers brainstorming skill. Visual companion mockups for surface (light/dark/hybrid), accent color, typography, density, motion, and primitives are saved under `opsradar/.superpowers/brainstorm/`.*
