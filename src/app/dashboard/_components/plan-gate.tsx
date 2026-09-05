'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { PLAN_LABELS, PLAN_PRICES, type Plan } from '<npm>/lib/tier';

type PlanGateProps = {
  feature: string;
  requiredPlan: Plan;
  /** Optional: blurred placeholder content rendered behind the upgrade prompt. */
  children?: React.ReactNode;
  /** Optional: override the default upgrade copy. */
  description?: string;
};

/**
 * Wraps locked feature content with an upgrade prompt overlay.
 * The children are rendered as a blurred, non-interactive placeholder so the
 * customer sees what they'd unlock, with a Locked / Upgrade card centered on top.
 */
export function PlanGate({ feature, requiredPlan, children, description }: PlanGateProps) {
  const planLabel = PLAN_LABELS[requiredPlan];
  const planPrice = PLAN_PRICES[requiredPlan];

  return (
    <div className="relative">
      {children && (
        <div
          aria-hidden
          className="pointer-events-none select-none opacity-25 blur-[2px]"
        >
          {children}
        </div>
      )}
      <div className={children ? 'absolute inset-0 flex items-center justify-center' : ''}>
        <div className="w-full max-w-sm rounded-[var(--radius-lg,8px)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)]">
            <Lock className="h-5 w-5 text-[var(--color-primary)]" />
          </div>
          <p className="font-medium text-[var(--color-fg)]">
            {planLabel} feature
          </p>
          <p className="mt-1 text-body-sm text-[var(--color-fg-muted)]">
            {description ?? `${feature} is part of the ${planLabel} plan (${planPrice}).`}
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-block rounded-[var(--radius,6px)] bg-[var(--color-primary)] px-4 py-2 text-body-sm font-medium text-white no-underline hover:opacity-90"
          >
            See pricing →
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Convenience: type guard for the dashboard API `upgrade_required` response shape.
 */
export function isUpgradeRequired(
  resp: { status?: string } | null | undefined,
): resp is { status: 'upgrade_required'; required_plan: Plan; required_plan_label: string; required_plan_price: string } {
  return resp?.status === 'upgrade_required';
}
