import { User, Bell, Lock, CreditCard, Globe, Check } from 'lucide-react';
import { C } from '../_lib/theme';
import { PageHeader } from '../_components/page-header';
import { Card } from '../_components/card';
import { PrimaryButton } from '../_components/buttons';

const sections = [
  { id: 'profile',    label: 'Profile',       icon: User,        active: true  },
  { id: 'notify',     label: 'Notifications', icon: Bell,        active: false },
  { id: 'security',   label: 'Security',      icon: Lock,        active: false },
  { id: 'billing',    label: 'Billing',       icon: CreditCard,  active: false },
  { id: 'workspace',  label: 'Workspace',     icon: Globe,       active: false },
];

const inputBase = {
  background: '#0A0A0B',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: '9px 12px',
  color: C.text,
  fontSize: 13,
  width: '100%',
  outline: 'none',
} as const;

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: C.sub, fontWeight: 500, marginBottom: 6 }}>
        {label}
      </label>
      <input defaultValue={value} style={inputBase} />
      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

function Toggle({ on = false }: { on?: boolean }) {
  return (
    <div
      style={{
        width: 36,
        height: 20,
        borderRadius: 99,
        background: on ? C.accent : 'rgba(255,255,255,0.08)',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }}
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

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Sidebar nav */}
        <Card style={{ flex: '0 0 220px', padding: '12px 10px' }}>
          {sections.map(({ id, label, icon: Icon, active }) => (
            <div
              key={id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                marginBottom: 2,
                cursor: 'pointer',
                background: active ? C.accentMuted : 'transparent',
                color: active ? C.accent : C.sub,
              }}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.6} />
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>{label}</span>
            </div>
          ))}
        </Card>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card title="Profile">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22, paddingBottom: 22, borderBottom: `1px solid ${C.border}` }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #818CF8, #6366F1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                }}
              >
                AK
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>Alex Kim</div>
                <div style={{ fontSize: 12, color: C.sub }}>Agency Owner · Joined Mar 2024</div>
              </div>
              <button
                style={{
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: '7px 13px',
                  color: C.sub,
                  fontSize: 12.5,
                  cursor: 'pointer',
                }}
              >
                Change avatar
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 22 }}>
              <Field label="Full name"   value="Alex Kim" />
              <Field label="Email"       value="alex@opsradar.io" />
              <Field label="Job title"   value="Agency Owner" />
              <Field label="Phone"       value="+1 (555) 0123" />
            </div>

            <PrimaryButton>
              <Check size={14} /> Save changes
            </PrimaryButton>
          </Card>

          <Card title="Notifications">
            {[
              { label: 'New project assigned',     desc: 'Get notified when a project is assigned to you.',      on: true  },
              { label: 'Task mentions',            desc: 'Receive an alert when teammates @-mention you.',        on: true  },
              { label: 'Invoice paid',             desc: 'Email me when a client pays an invoice.',               on: true  },
              { label: 'Weekly digest',            desc: 'Summary of agency performance every Monday.',           on: false },
              { label: 'Marketing & updates',      desc: 'Product news and OpsRadar tips.',                       on: false },
            ].map((n, i, arr) => (
              <div
                key={n.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: i === arr.length - 1 ? 'none' : `1px solid ${C.border}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{n.label}</div>
                  <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2 }}>{n.desc}</div>
                </div>
                <Toggle on={n.on} />
              </div>
            ))}
          </Card>

          <Card title="Workspace">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
              <Field label="Workspace name"  value="OpsRadar Agency" />
              <Field label="Workspace URL"   value="opsradar.app/team-ak" hint="Your team's unique URL" />
              <Field label="Default currency" value="USD ($)" />
              <Field label="Time zone"        value="UTC−05:00 (New York)" />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
