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
    '/api/chat': ['./knowledge-base/**/*'],
    '/api/generate-audit': ['./knowledge-base/**/*'],
  },
  images: {
    domains: [],
  },
  async redirects() {
    return [
      { source: '/dashboard/settings/integrations', destination: '/dashboard/integrations', permanent: true },
      { source: '/dashboard/workflow-health',       destination: '/dashboard/automations',  permanent: true },
      { source: '/dashboard/clients',               destination: '/dashboard',              permanent: true },
      { source: '/dashboard/financials',            destination: '/dashboard/business',     permanent: true },
      { source: '/dashboard/projects',              destination: '/dashboard',              permanent: true },
      { source: '/dashboard/reports',               destination: '/dashboard',              permanent: true },
      { source: '/dashboard/tasks',                 destination: '/dashboard',              permanent: true },
      { source: '/dashboard/team',                  destination: '/dashboard',              permanent: true },
      { source: '/dashboard/time-tracking',         destination: '/dashboard',              permanent: true },
      { source: '/dashboard/settings',              destination: '/dashboard/integrations', permanent: true },
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

export default nextConfig
