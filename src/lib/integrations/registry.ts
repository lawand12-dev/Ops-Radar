import type { ToolName } from '<npm>/lib/integrations';
import { validateStripeKey } from './stripe/adapter';
import { validateHubspotToken } from './hubspot/adapter';
import { validateApolloKey } from './apollo/adapter';
import { validateCalendlyToken } from './calendly/adapter';
import { validateClickupKey } from './clickup/adapter';
import { validateAsanaToken } from './asana/adapter';

export type ToolValidator = (apiKey: string) => Promise<
  | { ok: true; externalAccountId: string }
  | { ok: false; reason: 'invalid_key' | 'permission' | 'network'; message: string }
>;

export type ToolMeta = {
  tool: ToolName;
  displayName: string;
  /** URL of the page in the provider where the customer creates the key. */
  createKeyDocsUrl: string;
  /** Short instructions shown above the paste field in the connect dialog. */
  instructions: string;
  /** Validator used by the /connect route. */
  validate: ToolValidator;
};

const REGISTRY: Partial<Record<ToolName, ToolMeta>> = {
  stripe: {
    tool: 'stripe',
    displayName: 'Stripe',
    createKeyDocsUrl: 'https://dashboard.stripe.com/apikeys',
    instructions:
      'In Stripe, go to Developers → API keys → Create restricted key. ' +
      'Permissions needed: "Read" on Charges, Invoices, Account. ' +
      'Paste the key (starts with rk_ or sk_) below.',
    validate: validateStripeKey,
  },
  hubspot: {
    tool: 'hubspot',
    displayName: 'HubSpot',
    createKeyDocsUrl:
      'https://developers.hubspot.com/docs/api/private-apps#create-a-private-app',
    instructions:
      'In HubSpot, go to Settings → Integrations → Private Apps → Create a private app. ' +
      'Scopes needed: crm.objects.deals.read and crm.objects.contacts.read. ' +
      'Paste the access token (Private App Token) below.',
    validate: validateHubspotToken,
  },
  apollo: {
    tool: 'apollo',
    displayName: 'Apollo',
    createKeyDocsUrl: 'https://developer.apollo.io/keys/',
    instructions:
      'In Apollo, go to Settings → Integrations → API → Create API Key. ' +
      'Copy the key and paste it below.',
    validate: validateApolloKey,
  },
  calendly: {
    tool: 'calendly',
    displayName: 'Calendly',
    createKeyDocsUrl: 'https://calendly.com/integrations/api_webhooks',
    instructions:
      'In Calendly, go to Integrations & apps → API & Webhooks → Personal access tokens → ' +
      'Create new token. Paste the token below.',
    validate: validateCalendlyToken,
  },
  clickup: {
    tool: 'clickup',
    displayName: 'ClickUp',
    createKeyDocsUrl: 'https://app.clickup.com/settings/apps',
    instructions:
      'In ClickUp, go to Settings → Apps → API Token. ' +
      'Copy your personal API token and paste it below.',
    validate: validateClickupKey,
  },
  asana: {
    tool: 'asana',
    displayName: 'Asana',
    createKeyDocsUrl: 'https://app.asana.com/0/my-apps',
    instructions:
      'In Asana, go to My Profile Settings → Apps → Manage developer apps → ' +
      'Personal access token → Create new token. Paste it below.',
    validate: validateAsanaToken,
  },
};

export function getToolMeta(tool: string): ToolMeta | null {
  return REGISTRY[tool as ToolName] ?? null;
}
