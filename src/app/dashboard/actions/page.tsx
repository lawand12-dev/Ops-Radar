import { ActionsFeed } from './_components/actions-feed';

export default function ActionsPage() {
  return (
    <>
      <div className="mb-7">
        <h1 className="mb-1.5 font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Actions
        </h1>
        <p className="text-body-sm leading-[1.5] text-[var(--color-fg-muted)]">
          AI-detected triggers that need your attention or approval. Auto-actions execute immediately with a 30-minute undo window.
        </p>
      </div>
      <ActionsFeed />
    </>
  );
}
