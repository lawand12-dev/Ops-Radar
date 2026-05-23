// src/app/dashboard/brain/page.tsx
//
// The customer's Brain lives in THEIR Notion workspace, not in OpsRadar's app.
// This page serves two purposes:
//   1. If Notion is connected → invite the customer into their Brain Home page
//      in Notion (opens in a new tab)
//   2. If Notion is not connected → render a clean call-to-action that walks
//      them to /dashboard/integrations to connect Notion
//
// Historical note: this route previously rendered a custom diorization UI
// (living brief + pattern cards + breadcrumb upload). That UI is superseded by
// the customer-owned Notion Brain — the brain is no longer something OpsRadar
// stores, it's something OpsRadar maintains inside the customer's Notion.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUserId } from '<npm>/lib/supabase-ssr';
import { getServerSupabaseClient } from '<npm>/lib/supabase-server';

export const dynamic = 'force-dynamic';

function notionPageUrl(pageId: string): string {
  // Notion's universal URL format: dashes are optional. We strip them so the
  // URL works regardless of the customer's workspace subdomain.
  return `https://www.notion.so/${pageId.replace(/-/g, '')}`;
}

export default async function BrainPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect('/login');
  }

  const supabase = getServerSupabaseClient();
  const { data: workspace } = await supabase
    .from('notion_workspaces')
    .select('workspace_name, databases, backfill_status')
    .eq('user_id', userId)
    .maybeSingle();

  // Brain Home page id is stored under the `__brain_home` slug in the
  // notion_workspaces.databases jsonb column (page ids share the column
  // with database ids — page slugs are `__`-prefixed to avoid collision).
  const databases = (workspace?.databases ?? {}) as Record<string, string | undefined>;
  const brainHomeId = databases['__brain_home'];

  // ----- Not connected (or page not yet provisioned) -----
  if (!brainHomeId) {
    return (
      <>
        <div className="mb-7">
          <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
            Your Company Brain
          </h1>
          <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
            Your Brain lives in your own Notion workspace — the agents update it weekly with insights, patterns, and recommendations.
          </p>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="mb-4 text-[28px]">🧠</div>
          <h2 className="mb-2 text-body font-semibold text-[var(--color-fg)]">
            Connect Notion to provision your Brain
          </h2>
          <p className="mb-4 text-body-sm text-[var(--color-fg-muted)]">
            When you connect Notion, OpsRadar creates a complete company operating system inside your workspace:
          </p>
          <ul className="mb-5 space-y-1.5 text-[12.5px] text-[var(--color-fg-muted)]">
            <li>• 20 databases for clients, KPIs, projects, risks, patterns, and more</li>
            <li>• A curated Brain Home page your AI team refreshes weekly</li>
            <li>• Pre-built playbooks (sales, delivery, hiring, firing-a-client)</li>
            <li>• A &ldquo;How We Work&rdquo; page that teaches the agents your style</li>
            <li>• Everything is yours — exportable, shareable with your team</li>
          </ul>
          <Link
            href="/dashboard/integrations"
            className="inline-block rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90"
          >
            Connect Notion →
          </Link>
        </div>
      </>
    );
  }

  // ----- Connected — invite into Notion -----
  const url = notionPageUrl(brainHomeId);
  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Your Company Brain
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          {workspace?.workspace_name
            ? <>Your Brain lives in your Notion workspace <strong>{workspace.workspace_name}</strong>. It opens in a new tab.</>
            : <>Your Brain lives in your Notion workspace. It opens in a new tab.</>}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
          <div className="mb-4 text-[28px]">🧠</div>
          <h2 className="mb-2 text-body font-semibold text-[var(--color-fg)]">
            Open your Brain Home in Notion
          </h2>
          <p className="mb-5 text-body-sm text-[var(--color-fg-muted)]">
            Your AI team writes weekly KPI snapshots, risk register entries, pattern cards, and a curated home page. You edit your strategic pages (OKRs, playbooks, decisions) directly in Notion. Everything stays in sync.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-[var(--radius)] bg-[var(--color-primary)] px-3 py-1.5 text-[12.5px] font-medium text-white hover:opacity-90"
          >
            Open Brain in Notion ↗
          </a>
        </div>

        {workspace?.backfill_status && workspace.backfill_status !== 'complete' && (
          <div className="rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--color-warn)_30%,transparent)] bg-[color-mix(in_srgb,var(--color-warn)_8%,transparent)] px-3 py-2.5 text-[11.5px] text-[var(--color-warn)]">
            Initial backfill is {workspace.backfill_status} — your Brain will fill up as the agents run this week.
          </div>
        )}
      </div>
    </>
  );
}
