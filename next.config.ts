import type { NextConfig } from 'next'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))
const nextConfig: NextConfig = {
  output: 'export',
  outputFileTracingRoot: resolve(rootDir),
  images: {
    unoptimized: true,
  },
}

export default nextConfig
