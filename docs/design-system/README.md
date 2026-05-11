# OpsRadar Design System — Token Quick Reference

This is the one-page lookup for the new design system tokens, primitives,
and conventions. The full rationale, decisions, and migration plan live in
[`docs/superpowers/specs/2026-05-10-design-system-foundations-design.md`](../superpowers/specs/2026-05-10-design-system-foundations-design.md).

All tokens are CSS variables defined in `src/app/globals.css` inside a single
`@theme` block. Tailwind v4 auto-generates utility classes from those tokens.

## Theme switching

Theme is determined by route via middleware (`src/proxy.ts`). Light is default;
dark applies on routes prefixed with `/dashboard`, `/admin`, `/aios`. The
middleware sets `x-theme` on the response; the root layout reads it and renders
`<html data-theme="…">`.

To force a theme in the dev primitives showcase (`/dev/primitives`), use the
`Force light` / `Force dark` buttons or run in DevTools:

```js
document.documentElement.dataset.theme = "dark"; // or "light"
```

## Colors

| Role | CSS variable | Tailwind utility |
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
| Primary hover | `--color-primary-hover` | use in `hover:bg-[var(--color-primary-hover)]` |
| Success | `--color-success` | `text-success bg-success/10` |
| Warn | `--color-warn` | `text-warn bg-warn/10` |
| Danger | `--color-danger` | `text-danger bg-danger/10` |
| Accent ladder (50–950) | `--color-accent-{50…950}` | `bg-accent-600`, `text-accent-300`, etc. |

Light primary = `--color-accent-600` (`#4F46E5`). Dark primary = `--color-accent-400` (`#818CF8`).

## Typography

| Role | Utility | Family | Notes |
|---|---|---|---|
| display | `text-display` | Instrument Serif 400 | Editorial hero |
| h1 | `text-h1` | Instrument Serif 400 | Page titles |
| h2 | `text-h2` | Instrument Serif 400 | Section headings |
| h3 | `text-h3` | Inter Tight 500 | Subsection / card title |
| h4 | `text-h4` | Inter Tight 500 | Small subhead |
| body-lg | `text-body-lg` | Inter Tight 400 | Lede |
| body | `text-body` | Inter Tight 400 | Default |
| body-sm | `text-body-sm` | Inter Tight 400 | Secondary copy |
| caption | `text-caption` | Inter Tight 500 | 11px small text |
| label | `text-label` | Inter Tight 600 | 11px uppercase 0.12em tracking |
| mono | `text-mono` / `font-mono` | JetBrains Mono | Numerics, codes, IDs |

Use `font-serif`, `font-sans`, or `font-mono` to override family.

## Radius

| Token | Value | Default for |
|---|---|---|
| `rounded-sm` | 4px | Chips, small badges |
| `rounded` | **6px (default)** | Buttons, inputs |
| `rounded-md` | 8px | Cards, panels |
| `rounded-lg` | 12px | Modals (Dialog), hero strips |
| `rounded-xl` | 16px | Page containers (rare) |
| `rounded-full` | 9999px | Status dots, avatars, switches |

## Motion

Use the design's duration + easing tokens. No ambient loops, particles, shaders,
or hover transforms beyond 2px.

| Token | Value | Used for |
|---|---|---|
| `--duration-instant` | 100ms | Button press |
| `--duration-fast` | 150ms | Hover (color/border shift) |
| `--duration-base` | 200ms | State change, modal open |
| `--duration-slow` | 300ms | Drawer slide, progress fill |
| `--ease-out` | `cubic-bezier(0.2, 0, 0, 1)` | Default |
| `--ease-emphasis` | `cubic-bezier(0.3, 0, 0.1, 1)` | Status changes |

In Tailwind: `transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]`.

## Focus ring

Single global rule in `globals.css`:

```css
*:focus-visible {
  outline: 2px solid var(--color-accent-500);
  outline-offset: 2px;
}
```

Don't override unless necessary. All primitives inherit this.

## Primitives

All primitives live in `src/components/ui/`. Open `/dev/primitives` in dev
to see every primitive rendered in both themes side-by-side.

| File | Exports |
|---|---|
| `button.tsx` | `Button`, `buttonVariants` |
| `input.tsx` | `Input` |
| `textarea.tsx` | `Textarea` |
| `label.tsx` | `Label` |
| `select.tsx` | `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton` |
| `checkbox.tsx` | `Checkbox` |
| `radio-group.tsx` | `RadioGroup`, `RadioGroupItem` |
| `switch.tsx` | `Switch` |
| `tabs.tsx` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| `tooltip.tsx` | `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider` |
| `dropdown-menu.tsx` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuRadioGroup` |
| `dialog.tsx` | `Dialog`, `DialogClose`, `DialogContent`, `DialogDescription`, `DialogFooter`, `DialogHeader`, `DialogOverlay`, `DialogPortal`, `DialogTitle`, `DialogTrigger` |
| `card.tsx` | `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription`, `CardContent` |
| `accordion.tsx` | `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` |
| `badge.tsx` | `Badge`, `badgeVariants` |
| `separator.tsx` | `Separator` |
| `toast.tsx` | `Toaster`, `toast` |
| `skeleton.tsx` | `Skeleton` |
| `progress.tsx` | `Progress` |
| `status-dot.tsx` | `StatusDot`, `Status` (type) |
| `metric.tsx` | `Metric`, `MetricProps`, `Trend` |
| `data-table.tsx` | `Table`, `THead`, `TR`, `TH`, `TD`, `Density`, `TableProps` |

## Imports

Path alias is `<npm>/*` → `./src/*`. Examples:

```tsx
import { Button } from "<npm>/components/ui/button";
import { Card, CardHeader, CardTitle } from "<npm>/components/ui/card";
import { cn } from "<npm>/lib/utils";
```

## Animation utilities

For Radix popovers/dialogs/etc., use these classes (defined in `globals.css`):

| Class | Triggers on |
|---|---|
| `ds-anim-fade-in` | `[data-state="open"]` — fades in |
| `ds-anim-fade-out` | `[data-state="closed"]` — fades out |
| `ds-anim-zoom-in` | `[data-state="open"]` — fade + 0.96 → 1 scale (centered modal) |
| `ds-anim-zoom-out` | `[data-state="closed"]` — fade + 1 → 0.96 scale |
| `ds-anim-accordion-down` | Accordion content expand |
| `ds-anim-accordion-up` | Accordion content collapse |

## Phase 1 onward

This is the foundation. Page-by-page redesigns happen in Phase 1 (marketing),
Phase 2 (dashboard), Phase 3 (admin/AIOS/chat). Each phase consumes these
tokens and primitives without modifying them.
