/**
 * v1 seed catalog of Composio triggers + actions the COO compiler may pick from.
 *
 * Purpose: keep the LLM honest — it can only emit trigger/action slugs that
 * exist in this list. Lindy 2.0 lesson: "put the agent on rails." This is the
 * rail.
 *
 * Growth path: when we add toolkit coverage, extend these arrays. Eventually
 * we'll query Composio's `triggers.listTypes()` + `actions.listEnum()` per
 * connected toolkit at compile time, but a hand-curated v1 keeps the LLM
 * focused on the actions that actually compose well into customer-grade
 * automations (vs. the long-tail of niche API actions).
 */

export const COMPOSIO_TRIGGER_CATALOG = [
  { toolkit: 'hubspot', slug: 'HUBSPOT_CONTACT_CREATED_TRIGGER', description: 'New HubSpot contact created' },
  { toolkit: 'hubspot', slug: 'HUBSPOT_DEAL_STAGE_UPDATED_TRIGGER', description: 'HubSpot deal stage changed (e.g. moved to closed-won)' },
  { toolkit: 'slack', slug: 'SLACK_CHANNEL_MESSAGE_RECEIVED', description: 'New message posted to a Slack channel' },
  { toolkit: 'slack', slug: 'SLACK_DIRECT_MESSAGE_RECEIVED', description: 'New Slack direct message received' },
  { toolkit: 'notion', slug: 'NOTION_PAGE_CREATED', description: 'New Notion page created' },
  { toolkit: 'notion', slug: 'NOTION_PAGE_PROPERTIES_UPDATED', description: 'Notion page properties changed' },
  { toolkit: 'gmail', slug: 'GMAIL_NEW_GMAIL_MESSAGE', description: 'New Gmail message received (polls every ~15min)' },
  { toolkit: 'gmail', slug: 'GMAIL_EMAIL_SENT_TRIGGER', description: 'Email sent from connected Gmail account' },
  // TODO(composio-triggers): Stripe trigger slugs aren't yet enumerated in
  // Composio docs. When confirmed, add: invoice paid, charge failed,
  // subscription updated, etc. See docs/strategy/automations-architecture-2026.md §4.
] as const

export const COMPOSIO_ACTION_CATALOG = [
  { toolkit: 'slack', action_slug: 'SLACK_SEND_MESSAGE', description: 'Send a Slack message to a channel or user' },
  { toolkit: 'gmail', action_slug: 'GMAIL_SEND_EMAIL', description: 'Send a Gmail email' },
  { toolkit: 'gmail', action_slug: 'GMAIL_CREATE_DRAFT', description: 'Create a Gmail draft (for owner to review)' },
  { toolkit: 'notion', action_slug: 'NOTION_INSERT_ROW_DATABASE', description: 'Insert a row into a Notion database' },
  { toolkit: 'notion', action_slug: 'NOTION_CREATE_PAGE', description: 'Create a new Notion page' },
  { toolkit: 'hubspot', action_slug: 'HUBSPOT_CREATE_NOTE', description: 'Create a note in HubSpot' },
  { toolkit: 'hubspot', action_slug: 'HUBSPOT_UPDATE_DEAL', description: 'Update a HubSpot deal' },
] as const

export type ComposioTriggerCatalogEntry = (typeof COMPOSIO_TRIGGER_CATALOG)[number]
export type ComposioActionCatalogEntry = (typeof COMPOSIO_ACTION_CATALOG)[number]
