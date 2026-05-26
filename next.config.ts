import { withSentryConfig } from '@sentry/nextjs';
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const rootDir = dirname(fileURLToPath(import.meta.url))
// ─── Content Security Policy ──────────────────────────────────────────────
//
// The page is in a tight CSP by default. Each external service we wire up
// needs explicit allowlisting on the relevant directive. Adding a new
// integration that calls out to third-party domains? Add the domain here.
//
// Allowed third-party origins (and why):
//
//   Nango (OAuth broker)
//     - api.nango.dev               → backend SDK calls + Connect Session ingress
//     - connect.nango.dev           → hosted Connect UI iframe + popup
//
//   Statsig (flags + analytics + session replay)
//     - api.statsig.com             → Node SDK flag fetches (server)
//     - featureassets.org           → client-side feature gate evaluation
//     - prodregistryv2.org          → client event logging
//     - statsigapi.net              → exception + telemetry stream
//     - sessionreplay.statsig.com   → session-replay event stream (just in case)
//
//   Sentry (error tracking)
//     - *.ingest.us.sentry.io       → error event ingestion
//     - *.sentry.io                 → telemetry
//
//   Vercel (analytics + speed insights + live preview feedback)
//     - vitals.vercel-insights.com  → web vitals beacons
//     - vercel.live                 → preview-deploy comment widget (preview only)
//     - va.vercel-scripts.com       → analytics script CDN
//
//   Langfuse (agent observability — server-side, but the SDK may also be
//   bundled into client routes if we ever stream traces from the browser)
//     - cloud.langfuse.com
//
//   Supabase (auth + database, browser SDK)
//     - *.supabase.co               → REST + Realtime websockets
//
const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : '*.supabase.co'

const NANGO_DOMAINS = 'https://api.nango.dev https://connect.nango.dev'
const STATSIG_DOMAINS =
  'https://api.statsig.com https://featureassets.org https://prodregistryv2.org https://statsigapi.net https://sessionreplay.statsig.com'
const SENTRY_DOMAINS = 'https://*.ingest.us.sentry.io https://*.sentry.io'
const VERCEL_DOMAINS =
  'https://vitals.vercel-insights.com https://vercel.live https://va.vercel-scripts.com'
const LANGFUSE_DOMAINS = 'https://cloud.langfuse.com'
const SUPABASE_DOMAINS = `https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  // Frame ancestors stays locked — nobody embeds OpsRadar.
  "frame-ancestors 'none'",
  // We DO embed Nango's Connect UI as a child iframe, hence frame-src below.
  `frame-src 'self' https://connect.nango.dev https://vercel.live`,
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // script-src: 'unsafe-eval' only in dev (Next.js fast refresh needs it).
  // vercel.live is the preview comment widget; va.vercel-scripts.com is analytics.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"} https://vercel.live https://va.vercel-scripts.com`,
  // Workers: blob: required for Statsig session-replay (which compiles its
  // worker from a blob URL at runtime).
  "worker-src 'self' blob:",
  // connect-src: where the browser is allowed to make fetch/WebSocket calls.
  // This is the directive that was blocking everything — every third-party
  // service we use needs its domain listed here.
  [
    "connect-src 'self'",
    NANGO_DOMAINS,
    STATSIG_DOMAINS,
    SENTRY_DOMAINS,
    VERCEL_DOMAINS,
    LANGFUSE_DOMAINS,
    SUPABASE_DOMAINS,
    // Statsig also probes cloudflare-dns.com for DNS-over-HTTPS fallback.
    'https://cloudflare-dns.com',
  ].join(' '),
].join('; ')

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(rootDir),
  outputFileTracingIncludes: {
    // Anthropic Agent Skills — bundle the skills/ tree (everything else in
    // knowledge-base/ is legacy / archive and intentionally excluded so the
    // serverless function stays small).
    '/api/dashboard/employees/**': ['./knowledge-base/skills/**/*'],
    '/api/dashboard/hire/**': ['./knowledge-base/skills/**/*'],
    '/api/cron/**': ['./knowledge-base/skills/**/*'],
  },
  outputFileTracingExcludes: {
    '*': ['./knowledge-base/_archive/**/*'],
  },
  images: {
    domains: [],
  },
  async redirects() {
    return [
      // ── Marketing URL consolidation (Phase C, 2026-05-18) ──────────────
      // /aios + /services merged into canonical /product page.
      { source: '/aios',                            destination: '/product',                permanent: true },
      { source: '/services',                        destination: '/product',                permanent: true },
      // /for/development deprecated — outside marketing-agency ICP.
      { source: '/for/development',                 destination: '/',                       permanent: true },
      // ── Dashboard route renames (legacy) ───────────────────────────────
      { source: '/dashboard/settings/integrations', destination: '/dashboard/integrations', permanent: true },
      { source: '/dashboard/workflow-health',       destination: '/dashboard',              permanent: true },
      { source: '/dashboard/automations',           destination: '/dashboard',              permanent: true },
      { source: '/dashboard/automations/:id*',      destination: '/dashboard',              permanent: true },
      { source: '/dashboard/agents',                destination: '/dashboard',              permanent: true },
      { source: '/dashboard/employees',             destination: '/dashboard',              permanent: true },
      { source: '/dashboard/coo',                   destination: '/dashboard',              permanent: true },
      { source: '/dashboard/coo/:path*',            destination: '/dashboard',              permanent: true },
      { source: '/dashboard/clients',               destination: '/dashboard',              permanent: true },
      { source: '/dashboard/financials',            destination: '/dashboard',              permanent: true },
      // CP-33 — deleted dashboard sections (moved to Notion brain):
      { source: '/dashboard/profitability',         destination: '/dashboard/brain',         permanent: true },
      { source: '/dashboard/scope',                 destination: '/dashboard/brain',         permanent: true },
      { source: '/dashboard/retainer',              destination: '/dashboard/brain',         permanent: true },
      { source: '/dashboard/performance',           destination: '/dashboard/brain',         permanent: true },
      { source: '/dashboard/score',                 destination: '/dashboard/brain',         permanent: true },
      { source: '/dashboard/briefings',             destination: '/dashboard',               permanent: true },
      { source: '/dashboard/business',              destination: '/dashboard/brain',         permanent: true },
      { source: '/dashboard/benchmarks',            destination: '/dashboard/brain',         permanent: true },
      { source: '/dashboard/projects',              destination: '/dashboard',              permanent: true },
      { source: '/dashboard/reports',               destination: '/dashboard',              permanent: true },
      { source: '/dashboard/tasks',                 destination: '/dashboard',              permanent: true },
      { source: '/dashboard/team',                  destination: '/dashboard',              permanent: true },
      { source: '/dashboard/time-tracking',         destination: '/dashboard',              permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
      {
        source: '/results',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ]
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "opsradar-fu",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
