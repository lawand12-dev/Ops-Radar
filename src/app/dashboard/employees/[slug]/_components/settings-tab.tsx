'use client'

// Settings tab — config surface for one employee.
//
// Built-in employees   → read-only banner + a few non-editable fields.
//                        (Spec says only autonomy + schedule are editable; we
//                         show those as labeled values for now — the editable
//                         form lands in a later sub-task alongside the PATCH
//                         endpoint.)
// Custom employees     → editable form: name, role, emoji, persona, system
//                        prompt, schedule_cron, model, max_steps. Plus Archive.
//
// The PATCH/archive endpoints aren't built yet — we POST/PATCH the planned
// URLs and surface whatever the server says (currently a 404). That's
// intentional: this tab ships UI-complete so the next sub-task is just
// "build the route handlers".

import { useState } from 'react'
import { Loader2, AlertTriangle, Save, Trash2 } from 'lucide-react'
import type { Employee } from '<npm>/lib/employees/types'

const MODEL_OPTIONS = [
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.5',
  'gpt-4.1-nano',
  'o3',
  'o4-mini',
] as const

type ModelOption = (typeof MODEL_OPTIONS)[number]

function describeCron(cron: string | null): string {
  if (!cron) return 'Chat-only (no schedule)'
  const trimmed = cron.trim()
  // Tiny pattern recognizer — agency cron expressions are short and conventional.
  if (trimmed === '0 8 * * *') return 'Every day at 08:00 UTC'
  if (trimmed === '0 9 * * *') return 'Every day at 09:00 UTC'
  if (trimmed === '0 6 * * *') return 'Every day at 06:00 UTC'
  if (trimmed === '0 7 * * *') return 'Every day at 07:00 UTC'
  if (trimmed === '0 8 * * 1') return 'Every Monday at 08:00 UTC'
  if (trimmed === '0 9 * * 1') return 'Every Monday at 09:00 UTC'
  if (trimmed === '0 10 * * *') return 'Every day at 10:00 UTC'
  if (trimmed === '0 12 * * 1') return 'Every Monday at 12:00 UTC'
  if (/^0 \d{1,2} \* \* \*$/.test(trimmed)) {
    const hour = trimmed.split(' ')[1]
    return `Every day at ${hour.padStart(2, '0')}:00 UTC`
  }
  return 'Custom cron'
}

export function SettingsTab({ employee }: { employee: Employee }) {
  if (employee.origin === 'built_in') {
    return <BuiltInSettings employee={employee} />
  }
  return <CustomSettings employee={employee} />
}

function BuiltInSettings({ employee }: { employee: Employee }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-sunken)] px-4 py-3">
        <AlertTriangle
          size={14}
          className="mt-0.5 shrink-0 text-amber-400"
        />
        <div>
          <p className="text-body-sm font-medium text-[var(--color-fg)]">
            Pre-hired employee — config is fixed by OpsRadar
          </p>
          <p className="mt-0.5 text-caption text-[var(--color-fg-muted)]">
            We maintain the persona, prompt, and tool surface for built-in
            specialists so they stay in sync with playbook updates. Autonomy
            and schedule are adjustable per-customer in a later release.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ReadOnlyField label="Status" value={employee.status} />
        <ReadOnlyField label="Autonomy" value={employee.autonomy} />
        <ReadOnlyField
          label="Schedule"
          value={employee.runtime.cronSchedule ?? '—'}
          hint={describeCron(employee.runtime.cronSchedule)}
        />
        <ReadOnlyField label="Model" value={employee.runtime.model} />
      </div>
    </div>
  )
}

function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="text-caption font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {label}
      </div>
      <div className="mt-1 font-mono text-body text-[var(--color-fg)]">
        {value}
      </div>
      {hint && (
        <div className="mt-1 text-caption text-[var(--color-fg-muted)]">
          {hint}
        </div>
      )}
    </div>
  )
}

type Toast = { kind: 'success' | 'error'; message: string } | null

function CustomSettings({ employee }: { employee: Employee }) {
  const [name, setName] = useState(employee.display.name)
  const [role, setRole] = useState(employee.display.role)
  const [emoji, setEmoji] = useState(employee.display.emoji)
  const [persona, setPersona] = useState(
    employee.display.personaSummary ?? '',
  )
  const [systemPrompt, setSystemPrompt] = useState(
    employee.runtime.systemPrompt,
  )
  const [cron, setCron] = useState(employee.runtime.cronSchedule ?? '')
  const [model, setModel] = useState<ModelOption>(
    (MODEL_OPTIONS as readonly string[]).includes(employee.runtime.model)
      ? (employee.runtime.model as ModelOption)
      : 'gpt-5.4',
  )
  const [maxSteps, setMaxSteps] = useState(employee.runtime.maxSteps)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [toast, setToast] = useState<Toast>(null)

  async function save() {
    setSaving(true)
    setToast(null)
    try {
      const res = await fetch(`/api/dashboard/employees/${employee.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          role,
          emoji,
          persona_summary: persona,
          system_prompt: systemPrompt,
          schedule_cron: cron.trim() === '' ? null : cron.trim(),
          model_slug: model,
          max_steps: maxSteps,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        setToast({
          kind: 'error',
          message:
            res.status === 404
              ? 'Save endpoint not built yet — coming in the next sub-task.'
              : (data.error ?? `Save failed (${res.status}).`),
        })
        return
      }
      setToast({ kind: 'success', message: 'Saved.' })
    } catch {
      setToast({ kind: 'error', message: 'Network error.' })
    } finally {
      setSaving(false)
    }
  }

  async function archive() {
    const confirmed = window.confirm(
      `Archive ${employee.display.name}? They'll stop running and disappear from your team list. You can recreate them later if needed.`,
    )
    if (!confirmed) return
    setArchiving(true)
    setToast(null)
    try {
      const res = await fetch(
        `/api/dashboard/employees/${employee.slug}/archive`,
        { method: 'POST' },
      )
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string
        }
        setToast({
          kind: 'error',
          message:
            res.status === 404
              ? 'Archive endpoint not built yet — coming in the next sub-task.'
              : (data.error ?? `Archive failed (${res.status}).`),
        })
        return
      }
      setToast({
        kind: 'success',
        message: `${employee.display.name} archived.`,
      })
    } catch {
      setToast({ kind: 'error', message: 'Network error.' })
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {toast && (
        <div
          role="status"
          className={`rounded-[var(--radius-lg)] border px-4 py-3 text-body-sm ${
            toast.kind === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
              : 'border-amber-500/40 bg-amber-950/30 text-amber-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      <Section title="Identity">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-input"
            />
          </Field>
          <Field label="Role">
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="text-input"
            />
          </Field>
          <Field label="Emoji" hint="A single character.">
            <input
              value={emoji}
              maxLength={4}
              onChange={(e) => setEmoji(e.target.value)}
              className="text-input"
            />
          </Field>
        </div>
        <Field label="Persona summary" hint="1–2 sentences in plain English.">
          <textarea
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            rows={3}
            className="text-input resize-none"
          />
        </Field>
      </Section>

      <Section title="Behavior">
        <Field
          label="System prompt"
          hint="Establish identity, responsibilities, decision-making style, and what to write to the brain."
        >
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={12}
            className="text-input resize-none font-mono text-[12px] leading-[1.55]"
            style={{ maxHeight: '480px', overflowY: 'auto' }}
          />
        </Field>
      </Section>

      <Section title="Runtime">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label="Schedule (cron)"
            hint={describeCron(cron.trim() === '' ? null : cron.trim())}
          >
            <input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="0 8 * * *"
              className="text-input font-mono"
            />
          </Field>
          <Field label="Model">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ModelOption)}
              className="text-input"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Max steps per run" hint="Between 5 and 50.">
            <input
              type="number"
              min={5}
              max={50}
              value={maxSteps}
              onChange={(e) => setMaxSteps(Number(e.target.value))}
              className="text-input"
            />
          </Field>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <button
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-body-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Save size={13} />
          )}
          Save changes
        </button>
        <button
          onClick={() => void archive()}
          disabled={archiving}
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-red-500/40 bg-red-950/20 px-4 text-body-sm font-medium text-red-300 transition-colors hover:bg-red-950/40 disabled:opacity-50"
        >
          {archiving ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Trash2 size={13} />
          )}
          Archive employee
        </button>
      </div>

      <style jsx>{`
        :global(.text-input) {
          width: 100%;
          border-radius: var(--radius);
          border: 1px solid var(--color-border);
          background: var(--color-surface-sunken);
          color: var(--color-fg);
          font-size: 13px;
          line-height: 1.5;
          padding: 8px 10px;
          outline: none;
          transition: border-color 0.12s;
        }
        :global(.text-input:focus) {
          border-color: var(--color-primary);
        }
        :global(.text-input::placeholder) {
          color: var(--color-fg-subtle);
        }
      `}</style>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="text-caption font-mono uppercase tracking-wider text-[var(--color-fg-subtle)]">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-caption text-[var(--color-fg-muted)]">
        {label}
      </span>
      {children}
      {hint && (
        <span className="text-[11px] text-[var(--color-fg-subtle)]">
          {hint}
        </span>
      )}
    </label>
  )
}
