import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const ADMIN_SESSION_COOKIE = 'opsradar_admin_session'
export const ADMIN_SESSION_MAX_AGE = 7 * 24 * 60 * 60

type AdminSessionPayload = {
  type: 'admin-session'
  exp: number
  nonce: string
}

function getAdminSessionSecret(): string | null {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.OPENAI_API_KEY ||
    null
  )
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function decode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function signPayload(payloadBase64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadBase64).digest('base64url')
}

export function hasAdminSessionSecret(): boolean {
  return Boolean(getAdminSessionSecret())
}

export function createAdminSessionToken(): string {
  const secret = getAdminSessionSecret()
  if (!secret) {
    throw new Error('missing admin session secret')
  }

  const payload: AdminSessionPayload = {
    type: 'admin-session',
    exp: Date.now() + ADMIN_SESSION_MAX_AGE * 1000,
    nonce: randomBytes(16).toString('hex'),
  }

  const payloadBase64 = encode(JSON.stringify(payload))
  const signature = signPayload(payloadBase64, secret)
  return `${payloadBase64}.${signature}`
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token) {
    return false
  }

  const secret = getAdminSessionSecret()
  if (!secret) {
    return false
  }

  const [payloadBase64, signature] = token.split('.')
  if (!payloadBase64 || !signature) {
    return false
  }

  const expected = Buffer.from(signPayload(payloadBase64, secret))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return false
  }

  try {
    const payload = JSON.parse(decode(payloadBase64)) as AdminSessionPayload
    return payload.type === 'admin-session' && typeof payload.exp === 'number' && payload.exp > Date.now()
  } catch {
    return false
  }
}
