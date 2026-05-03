'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

type SessionData = {
  id: string
  agency_name: string
  status: string
  answers: Record<string, unknown>
}

const SECTION_A: { key: string; label: string }[] = [
  { key: 'a1_agency_vertical',       label: 'Agency Type' },
  { key: 'a1_what_company_does',     label: 'What They Do' },
  { key: 'a2_pricing_model',         label: 'Pricing Model' },
  { key: 'a2_main_result_promised',  label: 'Main Result Promised' },
  { key: 'a3_first_result_days',     label: 'Time to First Result' },
  { key: 'a3_intro_to_first_result', label: 'Intro → First Result Flow' },
  { key: 'a4_one_thing_to_protect',  label: 'One Thing to Protect' },
]

const SECTION_B: { key: string; label: string }[] = [
  { key: 'b1_team_size',               label: 'Team Size' },
  { key: 'b1_contractor_mix',          label: 'Contractor Mix' },
  { key: 'b1_key_people',              label: 'Key Team Members' },
  { key: 'b2_heaviest_load_role',      label: 'Heaviest Admin Load Role' },
  { key: 'b2_typical_day',             label: 'Typical Day' },
  { key: 'b3_stuck_locations',         label: 'Where Work Gets Stuck' },
  { key: 'b3_handoff_breaks',          label: 'Most Painful Handoff' },
  { key: 'b4_single_person_knowledge', label: 'Single-Person Knowledge' },
  { key: 'b4_spof_severity',           label: 'Risk if That Person Left' },
]

function AnswerValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {(value as string[]).map((v, i) => (
          <span key={i} className="rounded-md border border-blue-800/50 bg-blue-950/50 px-2 py-0.5 text-xs text-blue-300">
            {v}
          </span>
        ))}
      </div>
    )
  }
  if (!value || value === '') {
    return <span className="text-xs italic text-gray-600">Not answered</span>
  }
  return <p className="whitespace-pre-wrap text-sm text-gray-300">{String(value)}</p>
}

export default function SessionHubPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin-auth')
      .then((r) => r.json())
      .then((d: { authenticated: boolean }) => {
        if (!d.authenticated) {
          router.replace(`/admin/login?redirectTo=/admin/vip-sessions/${id}`)
        } else {
          setAuthed(true)
        }
      })
      .catch(() => router.replace('/admin/login'))
  }, [router, id])

  useEffect(() => {
    if (!authed) return
    fetch(`/api/vip/${id}`)
      .then((r) => r.json())
      .then((d: SessionData) => setSession(d))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [authed, id])

  if (!authed || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A] text-gray-400">
        Session not found.
      </div>
    )
  }

  const clientHasSubmitted =
    session.status === 'client_prefill' || session.status === 'blueprint_ready'

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Image src="/logo.png" alt="OpsRadar" width={32} height={32} className="rounded-lg" />
          <div className="flex-1">
            <Link href="/admin/vip-sessions" className="text-xs text-gray-500 hover:text-gray-300">
              ← All Sessions
            </Link>
            <h1 className="text-xl font-bold text-white">{session.agency_name}</h1>
          </div>
        </div>

        {/* Action buttons — the only two actions on this page */}
        <div className="mb-8 grid grid-cols-2 gap-3">
          <Link
            href={`/admin/deep-audit?id=${id}`}
            className="rounded-xl border border-gray-700 bg-gray-900/60 px-5 py-5 text-center transition hover:border-gray-500 hover:bg-gray-800/60"
          >
            <p className="text-sm font-semibold text-white">Open in Deep-Audit →</p>
            <p className="mt-1 text-xs text-gray-500">Fill all 7 consultant sections</p>
          </Link>
          <Link
            href={`/admin/vip-sessions/${id}/generate`}
            className="rounded-xl border border-blue-700/50 bg-blue-950/30 px-5 py-5 text-center transition hover:bg-blue-950/50"
          >
            <p className="text-sm font-semibold text-blue-300">Generate Blueprint PDF →</p>
            <p className="mt-1 text-xs text-gray-500">Create the 12-section PDF report</p>
          </Link>
        </div>

        {/* Client pre-fill answers — read-only */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30">
          <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Client Pre-Call Answers</h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                clientHasSubmitted
                  ? 'border border-blue-700/50 bg-blue-900/60 text-blue-300'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {clientHasSubmitted ? 'Submitted' : 'Not yet submitted'}
            </span>
          </div>

          {!clientHasSubmitted ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-500">
                The client hasn&apos;t submitted their pre-call form yet.
              </p>
              <p className="mt-2 text-xs text-gray-600">
                Share the link:{' '}
                <span className="font-mono text-blue-500/70">
                  {typeof window !== 'undefined' ? window.location.origin : ''}/vip/{id}
                </span>
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              <div className="px-5 py-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-blue-400">
                  A — Business Snapshot
                </p>
                <div className="space-y-4">
                  {SECTION_A.map(({ key, label }) => (
                    <div key={key}>
                      <p className="mb-1 text-xs font-medium text-gray-400">{label}</p>
                      <AnswerValue value={session.answers[key]} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-5 py-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-blue-400">
                  B — Team &amp; Capacity
                </p>
                <div className="space-y-4">
                  {SECTION_B.map(({ key, label }) => (
                    <div key={key}>
                      <p className="mb-1 text-xs font-medium text-gray-400">{label}</p>
                      <AnswerValue value={session.answers[key]} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-xs text-gray-600">
          Read-only — edit answers in Deep-Audit
        </p>
      </div>
    </div>
  )
}
