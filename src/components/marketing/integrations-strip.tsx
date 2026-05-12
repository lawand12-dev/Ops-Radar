/**
 * "Connects with" tool strip below the hero visual.
 * Plain wordmarks in muted gray — credibility without a logo bar.
 */
export function IntegrationsStrip() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-[var(--color-fg-subtle)]">
      <span className="font-mono uppercase tracking-[0.08em] text-[var(--color-fg-faint)]">
        connects with
      </span>
      {TOOLS.map((t) => (
        <span
          key={t}
          className="font-medium text-[var(--color-fg-muted)] tracking-tight"
        >
          {t}
        </span>
      ))}
    </div>
  );
}

const TOOLS = [
  "Stripe",
  "HubSpot",
  "Slack",
  "Meta Ads",
  "Google Ads",
  "Notion",
];
