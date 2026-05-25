import { withSentryConfig } from '@sentry/nextjs';
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const rootDir = dirname(fileURLToPath(import.meta.url))
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"}`,
  "connect-src 'self'",
].join('; ')

const nextConfig: NextConfig = {
  outputFileTracingRoot: resolve(rootDir),
  outputFileTracingIncludes: {
    // Anthropic Agent Skills — bundle the skills/ tree (everything else in
    // knowledge-base/ is legacy / archive and intentionally excluded so the
    // serverless function stays small).
    '/api/dashboard/coo': ['./knowledge-base/skills/**/*'],
    '/api/dashboard/agents': ['./knowledge-base/skills/**/*'],
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
      { source: '/dashboard/workflow-health',       destination: '/dashboard/automations',  permanent: true },
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
