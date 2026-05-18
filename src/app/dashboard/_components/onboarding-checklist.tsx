// src/app/dashboard/_components/onboarding-checklist.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle, Circle } from 'lucide-react';
import type { OnboardingStatus } from '<npm>/app/api/dashboard/onboarding-status/route';

type ApiResp = OnboardingStatus | { error: string };

const STEPS: Array<{
  key: keyof OnboardingStatus['steps'];
  label: string;
  description: string;
  href: string;
}> = [
  {
    key: 'time_tracking',
    label: 'Connect time tracking',
    description: 'Harvest or Toggl — so we can track hours per client',
    href: '/dashboard/integrations',
  },
  {
    key: 'billing',
    label: 'Connect billing',
    description: 'Stripe — so we can match revenue to clients',
    href: '/dashboard/integrations',
  },
  {
    key: 'blended_rate',
    label: 'Set your blended hourly rate',
    description: 'Your average cost per hour — used for margin calculations',
    href: '/dashboard/settings',
  },
  {
    key: 'first_briefing',
    label: 'Get your first AI briefing',
    description: 'Your COO summary — delivered in under 30 seconds',
    href: '/dashboard',
  },
];

export function OnboardingChecklist() {
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);

  const fetchStatus = useCallback(() => {
    fetch('/api/dashboard/onboarding-status')
      .then((r) => r.json())
      .then((d: ApiResp) => {
        if ('steps' in d) setStatus(d);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Auto-generate first briefing when steps 1-3 complete but briefing not yet done.
  // Fetch-on-effect pattern: state is required to show the "generating…" label
  // and to guard against double-fire across re-renders.
  useEffect(() => {
    if (!status) return;
    const { time_tracking, billing, blended_rate, first_briefing } = status.steps;
    if (time_tracking && billing && blended_rate && !first_briefing && !generatingBriefing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-effect guard, mirrors HealthReportBanner pattern
      setGeneratingBriefing(true);
      fetch('/api/dashboard/briefing', { method: 'POST' })
        .then(() => fetchStatus())
        .catch(() => {})
        .finally(() => setGeneratingBriefing(false));
    }
  }, [status, generatingBriefing, fetchStatus]);

  if (!status || status.complete) return null;

  const doneCount = Object.values(status.steps).filter(Boolean).length;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_6%,var(--color-surface))] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-medium text-[var(--color-fg)]">Get your AI COO up and running</p>
          <p className="text-body-sm text-[var(--color-fg-muted)]">
            {doneCount} of {STEPS.length} steps complete
          </p>
        </div>
        <div className="flex gap-1">
          {STEPS.map((s) => (
            <div
              key={s.key}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                status.steps[s.key]
                  ? 'bg-[var(--color-primary)]'
                  : 'bg-[var(--color-surface-sunken)]'
              }`}
            />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {STEPS.map((step) => {
          const done = status.steps[step.key];
          const isGenerating = step.key === 'first_briefing' && generatingBriefing;
          return (
            <Link
              key={step.key}
              href={step.href}
              className={`flex items-start gap-3 rounded-[var(--radius)] px-3 py-2.5 no-underline transition-colors ${
                done
                  ? 'opacity-50 cursor-default pointer-events-none'
                  : 'hover:bg-[var(--color-surface-sunken)]'
              }`}
            >
              {done ? (
                <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-success)]" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-fg-subtle)]" />
              )}
              <div>
                <p className={`text-body-sm font-medium ${done ? 'text-[var(--color-fg-muted)]' : 'text-[var(--color-fg)]'}`}>
                  {step.label}
                  {isGenerating && (
                    <span className="ml-2 text-label text-[var(--color-fg-subtle)]">generating…</span>
                  )}
                </p>
                {!done && (
                  <p className="text-label text-[var(--color-fg-subtle)]">{step.description}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
