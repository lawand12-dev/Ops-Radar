import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

const ACCESS_CODE_TTL_MS = 10 * 60 * 1000
const SESSION_TTL_MS = 24 * 60 * 60 * 1000

export const CHAT_HISTORY_ACCESS_COOKIE = 'opsradar_chat_history_access'
export const CHAT_HISTORY_ACCESS_MAX_AGE = ACCESS_CODE_TTL_MS / 1000
export const CHAT_HISTORY_SESSION_COOKIE = 'opsradar_chat_history_session'
export const CHAT_HISTORY_SESSION_MAX_AGE = SESSION_TTL_MS / 1000

type AccessPayload = {
  type: 'access'
  email: string
  codeHash: string
  exp: number
  nonce: string
}

type SessionPayload = {
  type: 'session'
  email: string
  exp: number
  nonce: string
}

function getAuthSecret(): string | null {
  return process.env.CHAT_HISTORY_AUTH_SECRET || null
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

function createSignedToken(payload: AccessPayload | SessionPayload): string {
  const secret = getAuthSecret()
  if (!secret) {
    throw new Error('missing chat history auth secret')
  }

  const payloadBase64 = encode(JSON.stringify(payload))
  const signature = signPayload(payloadBase64, secret)
  return `${payloadBase64}.${signature}`
}

function readSignedToken(token: string | undefined): AccessPayload | SessionPayload | null {
  if (!token) {
    return null
  }

  const secret = getAuthSecret()
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
    const payload = JSON.parse(decode(payloadBase64)) as AccessPayload | SessionPayload
    if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
      return null
    }
    return payload
  } catch {
    return null
  }
}

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export function hasChatHistoryAuthSecret(): boolean {
  return Boolean(getAuthSecret())
}

export function createChatHistoryAccess(email: string): { code: string; token: string } {
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
  const token = createSignedToken({
    type: 'access',
    email,
    codeHash: hashCode(code),
    exp: Date.now() + ACCESS_CODE_TTL_MS,
    nonce: randomBytes(16).toString('hex'),
  })

  return { code, token }
}

export function verifyChatHistoryAccessToken(token: string | undefined, email: string, code: string): boolean {
  const payload = readSignedToken(token)
  if (!payload || payload.type !== 'access' || payload.email !== email) {
    return false
  }

  const expected = Buffer.from(payload.codeHash, 'hex')
  const received = Buffer.from(hashCode(code), 'hex')
  return expected.length === received.length && timingSafeEqual(expected, received)
}

export function createChatHistorySessionToken(email: string): string {
  return createSignedToken({
    type: 'session',
    email,
    exp: Date.now() + SESSION_TTL_MS,
    nonce: randomBytes(16).toString('hex'),
  })
}

export function getChatHistorySessionEmail(token: string | undefined): string | null {
  const payload = readSignedToken(token)
  if (!payload || payload.type !== 'session') {
    return null
  }

  return payload.email
}
