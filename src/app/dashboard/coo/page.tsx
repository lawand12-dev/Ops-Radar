import { CooShell } from './_components/coo-shell';

export default function CooPage() {
  return (
    <div className="flex h-[calc(100vh-120px)] flex-col gap-3.5">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
        <div className="text-body-sm text-[var(--color-fg-muted)]">
          Dashboard /{' '}
          <span className="font-semibold text-[var(--color-fg)]">COO</span>
        </div>
      </div>

      <div className="mb-1">
        <h1 className="font-serif text-[22px] font-normal leading-[1.2] tracking-[-0.02em] text-[var(--color-fg)]">
          Your AI COO
        </h1>
        <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
          Ask anything about your agency — answered with your live data.
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <CooShell />
      </div>
    </div>
  );
}
