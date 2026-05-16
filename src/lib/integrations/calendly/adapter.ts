export type CalendlyBookingsData = {
  meetings_booked: number;
  meeting_conversion_pct: number | null;
  period_label: string;
  upcoming: Array<{
    name: string;
    invitee_name: string;
    invitee_email: string;
    start_time: string;
  }>;
};

export type AdapterValidation =
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string };

export async function validateCalendlyToken(token: string): Promise<AdapterValidation> {
  try {
    const res = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) {
      return { ok: false, reason: 'invalid_key', message: 'The token was rejected by Calendly.' };
    }
    if (res.status === 403) {
      return { ok: false, reason: 'permission', message: 'The token lacks required permissions.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, reason: 'network', message: `Calendly returned ${res.status}: ${text}` };
    }
    const body = (await res.json()) as { resource?: { uri?: string } };
    const uri = body?.resource?.uri;
    if (!uri) {
      return { ok: false, reason: 'network', message: 'Calendly response missing user URI.' };
    }
    const externalAccountId = uri.split('/').pop() ?? uri;
    return { ok: true, externalAccountId };
  } catch (err) {
    return {
      ok: false,
      reason: 'network',
      message: err instanceof Error ? err.message : 'Could not reach Calendly.',
    };
  }
}

type CalendlyEvent = { uri: string; name: string; start_time: string; status: string };
type CalendlyInvitee = { name: string; email: string };

async function fetchInvitee(eventUri: string, token: string): Promise<CalendlyInvitee | null> {
  const eventUuid = eventUri.split('/').pop();
  if (!eventUuid) return null;
  try {
    const res = await fetch(
      `https://api.calendly.com/scheduled_events/${eventUuid}/invitees?count=1`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { collection?: CalendlyInvitee[] };
    return data.collection?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchCalendlyBookingsData(token: string): Promise<CalendlyBookingsData> {
  const meRes = await fetch('https://api.calendly.com/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) throw new Error(`Calendly /me failed: ${meRes.status}`);
  const me = (await meRes.json()) as { resource?: { uri?: string } };
  const userUri = me.resource?.uri;
  if (!userUri) throw new Error('Calendly: missing user URI');

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    user: userUri,
    min_start_time: sevenDaysAgo.toISOString(),
    max_start_time: sevenDaysFromNow.toISOString(),
    status: 'active',
    count: '25',
  });

  const eventsRes = await fetch(`https://api.calendly.com/scheduled_events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!eventsRes.ok) throw new Error(`Calendly events fetch failed: ${eventsRes.status}`);
  const eventsData = (await eventsRes.json()) as { collection?: CalendlyEvent[] };
  const events = eventsData.collection ?? [];

  const past = events.filter((e) => new Date(e.start_time) < now);
  const upcomingEvents = events.filter((e) => new Date(e.start_time) >= now).slice(0, 10);

  const upcoming = await Promise.all(
    upcomingEvents.map(async (e) => {
      const invitee = await fetchInvitee(e.uri, token);
      return {
        name: e.name,
        invitee_name: invitee?.name ?? 'Unknown',
        invitee_email: invitee?.email ?? '',
        start_time: e.start_time,
      };
    }),
  );

  return {
    meetings_booked: past.length,
    meeting_conversion_pct: null,
    period_label: 'Last 7 days',
    upcoming,
  };
}
