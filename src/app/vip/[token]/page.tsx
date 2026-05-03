'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

type FormState = {
  a1_agency_vertical: string
  a1_what_company_does: string
  a2_pricing_model: string
  a2_main_result_promised: string
  a3_first_result_days: string
  a3_intro_to_first_result: string
  a4_one_thing_to_protect: string
  b1_team_size: string
  b1_contractor_mix: string
  b1_key_people: string
  b2_heaviest_load_role: string
  b2_typical_day: string
  b3_stuck_locations: string[]
  b3_handoff_breaks: string
  b4_spof_severity: string
  b4_single_person_knowledge: string
}

function emptyForm(): FormState {
  return {
    a1_agency_vertical: '', a1_what_company_does: '',
    a2_pricing_model: '', a2_main_result_promised: '',
    a3_first_result_days: '', a3_intro_to_first_result: '',
    a4_one_thing_to_protect: '',
    b1_team_size: '', b1_contractor_mix: '', b1_key_people: '',
    b2_heaviest_load_role: '', b2_typical_day: '',
    b3_stuck_locations: [], b3_handoff_breaks: '',
    b4_spof_severity: '', b4_single_person_knowledge: '',
  }
}

function Label({ children, helper }: { children: ReactNode; helper?: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-medium text-gray-100">{children}</p>
      {helper && <p className="mt-1 text-xs italic text-blue-300/80">{helper}</p>}
    </div>
  )
}

function LongText({
  value, onChange, placeholder, rows = 3,
}: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      rows={rows}
      className="w-full resize-y rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:border-blue-500 focus:outline-none"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function RadioGroup({
  options, value, onChange,
}: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
            value === opt
              ? 'border-blue-500 bg-blue-950/60 text-blue-200 ring-1 ring-blue-500/40'
              : 'border-gray-700/60 bg-gray-800/40 text-gray-200 hover:border-gray-600'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )
}

function ChipGroup({
  options, value, onChange,
}: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const sel = value.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(sel ? value.filter((v) => v !== opt) : [...value, opt])}
            className={`rounded-md border px-2.5 py-1 text-xs transition ${
              sel
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-600'
            }`}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function FieldBlock({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-5">{children}</div>
}

export default function VipPrecallForm() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()

  const [agencyName, setAgencyName] = useState('')
  const [form, setForm] = useState<FormState>(emptyForm())
  const [status, setStatus] = useState<'loading' | 'ready' | 'not_found' | 'already_submitted'>('loading')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/vip/${token}`)
      .then((r) => {
        if (r.status === 404) { setStatus('not_found'); return null }
        return r.json()
      })
      .then((d) => {
        if (!d) return
        const row = d as { agency_name: string; status: string; answers: Partial<FormState> }
        if (row.status === 'client_prefill' || row.status === 'blueprint_ready') {
          setStatus('already_submitted'); return
        }
        setAgencyName(row.agency_name ?? '')
        setForm((prev) => ({ ...prev, ...(row.answers as Partial<FormState>) }))
        setStatus('ready')
      })
      .catch(() => setStatus('not_found'))
  }, [token])

  function setScalar(key: keyof FormState, value: string) {
    const next = { ...form, [key]: value }
    setForm(next)
    scheduleAutoSave(next)
  }

  function setArray(key: keyof FormState, value: string[]) {
    const next = { ...form, [key]: value }
    setForm(next)
    scheduleAutoSave(next)
  }

  function scheduleAutoSave(nextForm: FormState) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => autoSave(nextForm), 800)
  }

  async function autoSave(f: FormState) {
    setSaveState('saving')
    try {
      await fetch(`/api/vip/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: f }),
      })
      setSaveState('saved')
    } catch {
      setSaveState('idle')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch(`/api/vip/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: form, submit: true }),
      })
      if (res.ok) router.replace(`/vip/${token}/confirmation`)
    } finally {
      setSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (status === 'not_found') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] text-center">
        <p className="text-lg font-semibold text-white">Link not found</p>
        <p className="mt-2 text-sm text-gray-400">This link may be expired or invalid.</p>
      </div>
    )
  }

  if (status === 'already_submitted') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] text-center">
        <p className="text-lg font-semibold text-white">Already submitted</p>
        <p className="mt-2 text-sm text-gray-400">Your answers have been received. See you on the call!</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <Image src="/logo.png" alt="OpsRadar" width={44} height={44} className="mx-auto mb-4 rounded-xl" />
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">OpsRadar VIP</p>
          <h1 className="mt-2 text-3xl font-bold text-white">Pre-Call Discovery</h1>
          <p className="mt-2 text-sm text-gray-400">For <span className="font-semibold text-white">{agencyName}</span></p>
          <p className="mt-3 text-sm text-gray-500">
            Takes ~10 minutes. Your consultant will review these before your strategy call.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-blue-400">
              A — Business Snapshot
            </h2>
            <div className="space-y-5">
              <FieldBlock>
                <Label helper="e.g. Paid media agency, SEO agency, Full-service marketing agency">
                  What type of agency are you?
                </Label>
                <RadioGroup
                  options={['Paid media', 'SEO', 'Content / creative', 'Full-service', 'Web / dev', 'Other']}
                  value={form.a1_agency_vertical}
                  onChange={(v) => setScalar('a1_agency_vertical', v)}
                />
              </FieldBlock>
              <FieldBlock>
                <Label>Describe what your agency does in 2-3 sentences</Label>
                <LongText
                  value={form.a1_what_company_does}
                  onChange={(v) => setScalar('a1_what_company_does', v)}
                  placeholder="We help e-commerce brands scale their paid social..."
                />
              </FieldBlock>
              <FieldBlock>
                <Label>How do you charge clients?</Label>
                <RadioGroup
                  options={['Monthly retainer', 'Project-based', '% of ad spend', 'Performance / revenue share', 'Mixed']}
                  value={form.a2_pricing_model}
                  onChange={(v) => setScalar('a2_pricing_model', v)}
                />
              </FieldBlock>
              <FieldBlock>
                <Label>What is the main result you promise clients?</Label>
                <LongText
                  value={form.a2_main_result_promised}
                  onChange={(v) => setScalar('a2_main_result_promised', v)}
                  placeholder="Increase qualified leads by 30% in 90 days..."
                  rows={2}
                />
              </FieldBlock>
              <FieldBlock>
                <Label>How long until a new client sees their first result?</Label>
                <RadioGroup
                  options={['Under 2 weeks', '2-4 weeks', '1-2 months', '2-3 months', '3+ months']}
                  value={form.a3_first_result_days}
                  onChange={(v) => setScalar('a3_first_result_days', v)}
                />
              </FieldBlock>
              <FieldBlock>
                <Label helper="Walk us through the first 30 days from signed contract to first deliverable">
                  What happens from intro call to first result?
                </Label>
                <LongText
                  value={form.a3_intro_to_first_result}
                  onChange={(v) => setScalar('a3_intro_to_first_result', v)}
                  placeholder="Signed → onboarding call → access gathering → strategy doc → first ads live..."
                  rows={4}
                />
              </FieldBlock>
              <FieldBlock>
                <Label helper="What is one thing that must never break — the process you cannot automate because it's your competitive edge?">
                  One thing you must protect
                </Label>
                <LongText
                  value={form.a4_one_thing_to_protect}
                  onChange={(v) => setScalar('a4_one_thing_to_protect', v)}
                  placeholder="The personal relationship with each client..."
                  rows={2}
                />
              </FieldBlock>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-blue-400">
              B — Team &amp; Capacity
            </h2>
            <div className="space-y-5">
              <FieldBlock>
                <Label>Team size (full-time employees)</Label>
                <RadioGroup
                  options={['Just me', '2-3', '4-7', '8-15', '16-30', '30+']}
                  value={form.b1_team_size}
                  onChange={(v) => setScalar('b1_team_size', v)}
                />
              </FieldBlock>
              <FieldBlock>
                <Label>Do you use contractors or freelancers?</Label>
                <RadioGroup
                  options={['No contractors', 'A few occasional', 'Mix of staff + contractors', 'Mostly contractors']}
                  value={form.b1_contractor_mix}
                  onChange={(v) => setScalar('b1_contractor_mix', v)}
                />
              </FieldBlock>
              <FieldBlock>
                <Label helper="Name, role, and what they own day-to-day (one line each)">
                  List your key team members
                </Label>
                <LongText
                  value={form.b1_key_people}
                  onChange={(v) => setScalar('b1_key_people', v)}
                  placeholder="Sarah — Account manager, owns client comms and reporting&#10;James — Media buyer, owns all paid campaigns"
                  rows={5}
                />
              </FieldBlock>
              <FieldBlock>
                <Label helper="Who spends the most hours on things that don't directly serve clients?">
                  Which role carries the heaviest admin load?
                </Label>
                <LongText
                  value={form.b2_heaviest_load_role}
                  onChange={(v) => setScalar('b2_heaviest_load_role', v)}
                  placeholder="Account managers — they spend 3 hours a day pulling data..."
                  rows={2}
                />
              </FieldBlock>
              <FieldBlock>
                <Label helper="Walk through what a typical day looks like for the person doing the most repetitive work">
                  Typical day for that person
                </Label>
                <LongText
                  value={form.b2_typical_day}
                  onChange={(v) => setScalar('b2_typical_day', v)}
                  placeholder="9am — checks Slack and email for client requests&#10;10am — pulls ad data from Meta and Google..."
                  rows={5}
                />
              </FieldBlock>
              <FieldBlock>
                <Label>Where does work get stuck most often? (select all that apply)</Label>
                <ChipGroup
                  options={[
                    'Waiting for client approval', 'Waiting for assets from client',
                    'Handoff between team members', 'Missing information',
                    "Tool doesn't connect to another", 'Manual data entry',
                    'CEO bottleneck', 'Unclear ownership',
                  ]}
                  value={form.b3_stuck_locations}
                  onChange={(v) => setArray('b3_stuck_locations', v)}
                />
              </FieldBlock>
              <FieldBlock>
                <Label>Describe the most painful handoff or bottleneck in your team right now</Label>
                <LongText
                  value={form.b3_handoff_breaks}
                  onChange={(v) => setScalar('b3_handoff_breaks', v)}
                  placeholder="When a campaign goes live, the account manager doesn't know until..."
                  rows={3}
                />
              </FieldBlock>
              <FieldBlock>
                <Label helper="If one person left tomorrow, what knowledge would disappear with them?">
                  What knowledge lives only in one person's head?
                </Label>
                <LongText
                  value={form.b4_single_person_knowledge}
                  onChange={(v) => setScalar('b4_single_person_knowledge', v)}
                  placeholder="Our media buyer knows exactly how each client's campaigns are structured..."
                  rows={3}
                />
              </FieldBlock>
              <FieldBlock>
                <Label>How bad would it be if that person left tomorrow?</Label>
                <RadioGroup
                  options={['Annoying but manageable', 'Significant disruption', 'Would hurt client delivery', 'Could be catastrophic']}
                  value={form.b4_spof_severity}
                  onChange={(v) => setScalar('b4_spof_severity', v)}
                />
              </FieldBlock>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-800 pt-6">
            <span className="text-xs text-gray-500">
              {saveState === 'saving' && 'Saving…'}
              {saveState === 'saved' && 'Saved ✓'}
            </span>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
            >
              {submitting ? 'Submitting…' : 'Submit My Answers →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
