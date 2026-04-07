import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export type AuditAccessScope = 'preview' | 'full'

type AuditAccessPayload = {
  type: 'audit-access'
  auditId: string
  scope: AuditAccessScope
  email?: string
  exp: number
  nonce: string
}

const PREVIEW_ACCESS_MAX_AGE_SECONDS = 7 * 24 * 60 * 60
const FULL_ACCESS_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

function getAuditAccessSecret(): string | null {
  return process.env.AUDIT_ACCESS_SECRET || null
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

function scopeAllows(grantedScope: AuditAccessScope, requiredScope: AuditAccessScope): boolean {
  return grantedScope === 'full' || grantedScope === requiredScope
}

function readSignedToken(token: string | undefined): AuditAccessPayload | null {
  if (!token) {
    return null
  }

  const secret = getAuditAccessSecret()
  if (!secret) {
    return null
  }

  const [payloadBase64, signature] = token.split('.')
  if (!payloadBase64 || !signature) {
    return null
  }

  const expected = Buffer.from(signPayload(payloadBase64, secret))
  const received = Buffer.from(signature)
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null
  }

  try {
    const payload = JSON.parse(decode(payloadBase64)) as AuditAccessPayload
    if (
      payload.type !== 'audit-access' ||
      typeof payload.auditId !== 'string' ||
      (payload.scope !== 'preview' && payload.scope !== 'full') ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now()
    ) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function hasAuditAccessSecret(): boolean {
  return Boolean(getAuditAccessSecret())
}

export function extractAuditAccessToken(request: Request): string {
  const authorizationHeader = request.headers.get('authorization')
  if (authorizationHeader?.startsWith('Bearer ')) {
    return authorizationHeader.slice('Bearer '.length).trim().slice(0, 2048)
  }

  return (request.headers.get('x-audit-access-token') ?? '').trim().slice(0, 2048)
}

export function createAuditAccessToken({
  auditId,
  scope,
  email,
  maxAgeSeconds,
}: {
  auditId: string
  scope: AuditAccessScope
  email?: string
  maxAgeSeconds?: number
}): string {
  const secret = getAuditAccessSecret()
  if (!secret) {
    throw new Error('missing audit access secret')
  }

  const ttlSeconds = maxAgeSeconds ?? (
    scope === 'full' ? FULL_ACCESS_MAX_AGE_SECONDS : PREVIEW_ACCESS_MAX_AGE_SECONDS
  )

  const payload: AuditAccessPayload = {
    type: 'audit-access',
    auditId,
    scope,
    email,
    exp: Date.now() + (ttlSeconds * 1000),
    nonce: randomBytes(16).toString('hex'),
  }

  const payloadBase64 = encode(JSON.stringify(payload))
  const signature = signPayload(payloadBase64, secret)
  return `${payloadBase64}.${signature}`
}

export function verifyAuditAccessToken(
  token: string | undefined,
  auditId: string,
  requiredScope: AuditAccessScope = 'preview',
): AuditAccessPayload | null {
  const payload = readSignedToken(token)
  if (!payload || payload.auditId !== auditId || !scopeAllows(payload.scope, requiredScope)) {
    return null
  }

  return payload
}
