/**
 * Development-only console logger. Calls are no-ops in production.
 * Use for diagnostic logging that helps local debugging but should
 * never leak to end-user browsers.
 *
 * Usage:
 *   import { devLog } from '@/lib/dev-log'
 *   devLog('some internal state:', value)
 */

export function devLog(...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log(...args)
  }
}

export function devWarn(...args: unknown[]): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(...args)
  }
}

export function devError(...args: unknown[]): void {
  // Errors are useful in production for debugging via browser
  // error reporting tools, so we leave error-level logging
  // active. Only log/warn are dev-gated.
  console.error(...args)
}
