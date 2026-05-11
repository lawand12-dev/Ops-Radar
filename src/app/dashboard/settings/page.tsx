import { User, Bell, Lock, CreditCard, Globe, Check } from 'lucide-react';
import { cn } from '<npm>/lib/utils';
import { PageHeader } from '../_components/page-header';
import { Card } from '../_components/card';
import { PrimaryButton } from '../_components/buttons';

const sections = [
  { id: 'profile',   label: 'Profile',       icon: User,       active: true  },
  { id: 'notify',    label: 'Notifications', icon: Bell,       active: false },
  { id: 'security',  label: 'Security',      icon: Lock,       active: false },
  { id: 'billing',   label: 'Billing',       icon: CreditCard, active: false },
  { id: 'workspace', label: 'Workspace',     icon: Globe,      active: false },
];

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-caption font-medium text-[var(--color-fg-muted)]">
        {label}
      </label>
      <input
        defaultValue={value}
        className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-body-sm text-[var(--color-fg)] outline-none transition-colors hover:border-[var(--color-border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-500)]"
      />
      {hint && <div className="mt-1.5 text-[11px] text-[var(--color-fg-subtle)]">{hint}</div>}
    </div>
  );
}

function Toggle({ on = false }: { on?: boolean }) {
  return (
    <div
      className={cn(
        'relative h-5 w-9 cursor-pointer rounded-full transition-colors',
        on ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface-sunken)]',
      )}
    >
      <div
        className={cn(
          'absolute top-0.5 size-4 rounded-full bg-white transition-[left]',
          on ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Workspace, integrations, and access."
      />

      <div className="flex items-start gap-4">
        {/* Sidebar nav */}
        <Card style={{ flex: '0 0 220px' }} className="px-2.5 py-3">
          {sections.map(({ id, label, icon: Icon, active }) => (
            <div
              key={id}
              className={cn(
                'mb-0.5 flex cursor-pointer items-center gap-2.5 rounded-[var(--radius)] px-3 py-2',
                active
                  ? 'bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]'
                  : 'text-[var(--color-fg-muted)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-fg)]',
              )}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.6} />
              <span className={cn('text-body-sm', active ? 'font-semibold' : 'font-normal')}>{label}</span>
            </div>
          ))}
        </Card>

        {/* Main content */}
        <div className="flex flex-1 flex-col gap-3.5">
          <Card title="Profile">
            <div className="mb-5 flex items-center gap-4 border-b border-[var(--color-border)] pb-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-accent-400)] to-[var(--color-accent-600)] text-[20px] font-bold tracking-[0.5px] text-white">
                AK
              </div>
              <div className="flex-1">
                <div className="mb-1 text-[15px] font-semibold text-[var(--color-fg)]">Alex Kim</div>
                <div className="text-caption text-[var(--color-fg-muted)]">Agency owner · Joined Mar 2024</div>
              </div>
              <button
                type="button"
                className="rounded-[var(--radius)] border border-[var(--color-border)] bg-transparent px-3 py-1.5 text-[12.5px] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-fg)]"
              >
                Change avatar
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3.5">
              <Field label="Full name" value="Alex Kim" />
              <Field label="Email"     value="alex@opsradar.io" />
              <Field label="Job title" value="Agency owner" />
              <Field label="Phone"     value="+1 (555) 0123" />
            </div>

            <PrimaryButton>
              <Check size={14} /> Save changes
            </PrimaryButton>
          </Card>

          <Card title="Notifications">
            {[
              { label: 'New project assigned', desc: 'Get notified when a project is assigned to you.', on: true  },
              { label: 'Task mentions',        desc: 'Receive an alert when teammates @-mention you.', on: true  },
              { label: 'Invoice paid',         desc: 'Email me when a client pays an invoice.',        on: true  },
              { label: 'Weekly digest',        desc: 'Summary of agency performance every Monday.',    on: false },
              { label: 'Marketing & updates',  desc: 'Product news and OpsRadar tips.',                on: false },
            ].map((n, i, arr) => (
              <div
                key={n.label}
                className={cn(
                  'flex items-center justify-between py-3',
                  i !== arr.length - 1 && 'border-b border-[var(--color-border)]',
                )}
              >
                <div className="flex-1">
                  <div className="text-body-sm font-medium text-[var(--color-fg)]">{n.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-[var(--color-fg-muted)]">{n.desc}</div>
                </div>
                <Toggle on={n.on} />
              </div>
            ))}
          </Card>

          <Card title="Workspace">
            <div className="grid grid-cols-2 gap-3.5">
              <Field label="Workspace name"   value="OpsRadar Agency" />
              <Field label="Workspace URL"    value="opsradar.app/team-ak" hint="Your team's unique URL" />
              <Field label="Default currency" value="USD ($)" />
              <Field label="Time zone"        value="UTC−05:00 (New York)" />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
