import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'

export const CHAT_WIDGET_SESSION_COOKIE = 'opsradar_chat_widget_session'
export const CHAT_WIDGET_SESSION_MAX_AGE = 90 * 24 * 60 * 60

type ChatWidgetSessionPayload = {
  type: 'chat-widget-session'
  visitorId: string
  exp: number
  nonce: string
}

function getChatWidgetSessionSecret(): string | null {
  return process.env.CHAT_WIDGET_SESSION_SECRET || null
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

function isValidVisitorId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,200}$/.test(value)
}

export function hasChatWidgetSessionSecret(): boolean {
  return Boolean(getChatWidgetSessionSecret())
}

export function createChatWidgetSession(visitorId = randomUUID()): { visitorId: string; token: string } {
  const secret = getChatWidgetSessionSecret()
  if (!secret) {
    throw new Error('missing chat widget session secret')
  }

  if (!isValidVisitorId(visitorId)) {
    throw new Error('invalid visitor id')
  }

  const payload: ChatWidgetSessionPayload = {
    type: 'chat-widget-session',
    visitorId,
    exp: Date.now() + (CHAT_WIDGET_SESSION_MAX_AGE * 1000),
    nonce: randomBytes(16).toString('hex'),
  }

  const payloadBase64 = encode(JSON.stringify(payload))
  const signature = signPayload(payloadBase64, secret)
  return { visitorId, token: `${payloadBase64}.${signature}` }
}

export function getChatWidgetSessionVisitorId(token: string | undefined): string | null {
  if (!token) {
    return null
  }

  const secret = getChatWidgetSessionSecret()
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
    const payload = JSON.parse(decode(payloadBase64)) as ChatWidgetSessionPayload
    if (
      payload.type !== 'chat-widget-session' ||
      !isValidVisitorId(payload.visitorId) ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Date.now()
    ) {
      return null
    }

    return payload.visitorId
  } catch {
    return null
  }
}
