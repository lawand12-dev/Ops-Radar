/**
 * Dashboard theme — bridge between legacy `C.*` inline-style callers and
 * the Phase 0 design tokens defined in src/app/globals.css.
 *
 * Every value here resolves through `var(--color-*)` so the dashboard
 * inherits the global dark-theme palette automatically (the /dashboard
 * route is gated to `data-theme="dark"` by middleware, see src/proxy.ts).
 *
 * For chart.js (canvas-rendered, can't read CSS variables), use
 * `CHART_COLORS` instead — those are concrete hex values that mirror
 * the dark-theme token palette.
 */

export const C = {
  // Surfaces
  bg:          'var(--color-bg)',
  sidebar:     'var(--color-surface)',
  card:        'var(--color-surface)',
  cardHover:   'var(--color-surface-sunken)',

  // Accents
  accent:      'var(--color-primary)',
  accentMuted: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
  indigo:      'var(--color-primary)',

  // Border + text
  border:      'var(--color-border)',
  text:        'var(--color-fg)',
  sub:         'var(--color-fg-muted)',
  muted:       'var(--color-fg-subtle)',

  // Semantic
  green:       'var(--color-success)',
  greenBg:     'color-mix(in srgb, var(--color-success) 12%, transparent)',
  amber:       'var(--color-warn)',
  amberBg:     'color-mix(in srgb, var(--color-warn) 12%, transparent)',
  red:         'var(--color-danger)',
  redBg:       'color-mix(in srgb, var(--color-danger) 12%, transparent)',

  // Accent variant — kept as indigo too (used by activity feed)
  purple:      'var(--color-primary)',
  purpleBg:    'color-mix(in srgb, var(--color-primary) 12%, transparent)',
};

/**
 * Concrete hex values for chart.js (canvas can't read CSS vars).
 * Mirrors the Phase 0 dark-theme palette in src/app/globals.css.
 */
export const CHART_COLORS = {
  primary:        '#818CF8', // var(--color-primary) on dark
  primaryAlpha35: 'rgba(129,140,248,0.35)',
  primaryAlpha10: 'rgba(129,140,248,0.10)',
  primaryAlpha04: 'rgba(255,255,255,0.04)',

  success:        '#34D399',
  warn:           '#FBBF24',
  danger:         '#F87171',

  fg:             '#FAFAF9',
  fgMuted:        '#A1A1AA',
  fgSubtle:       '#71717A',
  surface:        '#0F0F11',
  surfaceSunken:  '#15151A',
  border:         '#27272A',

  // Doughnut "remaining" slot — subtle on-surface
  trackOnSurface: '#27272A',
};
