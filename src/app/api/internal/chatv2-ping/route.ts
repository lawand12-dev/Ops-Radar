// Internal-only: verifies the chatv2 connection works end-to-end.
// Auth: ADMIN_PASSWORD bearer. Not customer-facing.
import { NextResponse, type NextRequest } from 'next/server';
import { chatV2Fetch } from '<npm>/lib/chatv2/client';
import { ChatV2Error } from '<npm>/lib/chatv2/errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ChatV2HealthBody = {
  status?: string;
  service?: string;
  timestamp?: string;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword === 'changeme') {
    return NextResponse.json({ error: 'misconfigured' }, { status: 500 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${adminPassword}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await chatV2Fetch<ChatV2HealthBody>('/', { timeoutMs: 5_000 });
    return NextResponse.json({ connected: true, chatv2: body });
  } catch (err) {
    if (err instanceof ChatV2Error) {
      return NextResponse.json({
        connected: false,
        status: err.status,
        code: err.code,
        message: err.message,
      });
    }
    return NextResponse.json(
      { connected: false, message: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
