import { NextRequest, NextResponse } from 'next/server'

function normalizeOrigin(origin: string): string | null {
  try {
    return new URL(origin).origin
  } catch {
    return null
  }
}

function getAllowedOrigins(request: NextRequest): Set<string> {
  const configuredOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeOrigin)
    .filter((value): value is string => Boolean(value))

  if (configuredOrigins.length > 0) {
    return new Set(configuredOrigins)
  }

  return new Set([request.nextUrl.origin])
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const originHeader = request.headers.get('origin')
  if (!originHeader) {
    return NextResponse.next()
  }

  const requestOrigin = normalizeOrigin(originHeader)
  const allowedOrigins = getAllowedOrigins(request)

  if (!requestOrigin || !allowedOrigins.has(requestOrigin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
