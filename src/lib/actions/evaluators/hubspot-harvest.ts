import { Client as HubspotClient } from '@hubspot/api-client';
import { isDuplicate } from '../dedup';
import type { NewAction, HubSpotHarvestPayload, UserContext } from '../types';

const LOOKBACK_DAYS = 7;

export async function evalHubSpotHarvest(
  ctx: UserContext,
  hubspotApiKey: string,
): Promise<NewAction[]> {
  const hs = new HubspotClient({ accessToken: hubspotApiKey });
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  let contacts: Array<{ id: string; properties: Record<string, string | null> }>;
  try {
    const resp = await hs.crm.contacts.basicApi.getPage(
      100,
      undefined,
      ['createdate', 'email', 'firstname', 'lastname', 'company'],
      undefined,
      undefined,
      false,
    );
    contacts = resp.results.filter((c) => {
      const created = c.properties?.createdate;
      return created && new Date(created) >= since;
    });
  } catch (err) {
    console.warn('[evalHubSpotHarvest] HubSpot fetch failed:', err);
    return [];
  }

  const actions: NewAction[] = [];

  for (const contact of contacts) {
    const companyName = contact.properties?.company;
    if (!companyName) continue;

    const contactId = contact.id;
    const dup = await isDuplicate(ctx.userId, 'hubspot_harvest_sync', 'hubspot_contact_id', contactId);
    if (dup) continue;

    const payload: HubSpotHarvestPayload = {
      hubspot_contact_id: contactId,
      hubspot_company_name: companyName,
      client_email: contact.properties?.email ?? null,
    };
    actions.push({ action_type: 'hubspot_harvest_sync', payload });
  }

  return actions;
}
