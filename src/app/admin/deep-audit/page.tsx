'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'

const SECTIONS = [
  {
    title: 'Agency Overview',
    fields: [
      { key: 'agency_name', label: 'Agency name', placeholder: 'Acme Marketing Agency' },
      {
        key: 'agency_type',
        label: 'Type of agency',
        placeholder: 'e.g. digital marketing, ops consulting, creative',
      },
      {
        key: 'years_in_business',
        label: 'Years in business',
        placeholder: 'e.g. 3 years',
      },
      {
        key: 'client_count',
        label: 'Active client count',
        placeholder: 'e.g. 12 retainer clients',
      },
    ],
  },
  {
    title: 'Tech Stack',
    fields: [
      {
        key: 'project_management_tool',
        label: 'Project management tool',
        placeholder: 'e.g. Asana, ClickUp, Notion, spreadsheets',
      },
      {
        key: 'crm_tool',
        label: 'CRM / client management',
        placeholder: 'e.g. HubSpot, Pipedrive, none',
      },
      {
        key: 'communication_tool',
        label: 'Team communication',
        placeholder: 'e.g. Slack, Teams, email',
      },
      {
        key: 'invoicing_tool',
        label: 'Invoicing / accounting',
        placeholder: 'e.g. QuickBooks, FreshBooks, Wave',
      },
    ],
  },
  {
    title: 'Operations & Workflows',
    fields: [
      {
        key: 'onboarding_process',
        label: 'Client onboarding process',
        placeholder: 'Describe the steps from signed contract to kickoff…',
        multiline: true,
      },
      {
        key: 'reporting_process',
        label: 'Client reporting process',
        placeholder: 'Manual, automated, or mixed? How often?',
        multiline: true,
      },
      {
        key: 'delivery_workflow',
        label: 'Work delivery workflow',
        placeholder: 'How do deliverables reach clients (email, portal, drive)?',
        multiline: true,
      },
      {
        key: 'handoff_process',
        label: 'Internal handoff process',
        placeholder: 'How does work move between team members?',
        multiline: true,
      },
    ],
  },
  {
    title: 'Revenue & Growth',
    fields: [
      {
        key: 'monthly_revenue',
        label: 'Monthly revenue range',
        placeholder: 'e.g. $20K–$50K/month',
      },
      {
        key: 'revenue_model',
        label: 'Revenue model',
        placeholder: 'e.g. retainer, project-based, hourly, hybrid',
      },
      {
        key: 'biggest_revenue_blocker',
        label: 'Biggest revenue blocker',
        placeholder: 'What is preventing you from growing revenue right now?',
        multiline: true,
      },
      {
        key: 'churn_rate',
        label: 'Client churn rate',
        placeholder: 'e.g. ~5% monthly, 2–3 clients/year',
      },
    ],
  },
  {
    title: 'Team & Capacity',
    fields: [
      {
        key: 'team_size',
        label: 'Full-time team size',
        placeholder: 'e.g. 4 full-time employees',
      },
      {
        key: 'contractor_usage',
        label: 'Contractor / freelancer usage',
        placeholder: 'How many, and what do they do?',
        multiline: true,
      },
      {
        key: 'biggest_capacity_issue',
        label: 'Biggest capacity constraint',
        placeholder: 'Where does throughput break down?',
        multiline: true,
      },
      {
        key: 'hiring_plans',
        label: 'Hiring plans (next 6 months)',
        placeholder: 'Roles and timeline, or "none planned"',
        multiline: true,
      },
    ],
  },
  {
    title: 'Pain Points & Bottlenecks',
    fields: [
      {
        key: 'top_manual_task',
        label: 'Most time-consuming manual task',
        placeholder: 'What eats the most hours each week?',
        multiline: true,
      },
      {
        key: 'automation_wish',
        label: 'Top automation wish',
        placeholder: 'If you could automate one thing overnight, what would it be?',
        multiline: true,
      },
      {
        key: 'biggest_operational_pain',
        label: 'Biggest operational pain',
        placeholder: 'What causes the most stress or errors in operations?',
        multiline: true,
      },
      {
        key: 'tool_frustrations',
        label: 'Tool frustrations',
        placeholder: 'Any tools that slow you down or cause errors?',
        multiline: true,
      },
    ],
  },
  {
    title: 'Vision & Goals',
    fields: [
      {
        key: 'six_month_goal',
        label: '6-month #1 goal',
        placeholder: 'What is the single most important goal for the next 6 months?',
        multiline: true,
      },
      {
        key: 'ideal_outcome',
        label: '12-month ideal outcome',
        placeholder: 'What does success look like for your agency in a year?',
        multiline: true,
      },
      {
        key: 'previous_automation_attempts',
        label: 'Previous automation attempts',
        placeholder: 'Have you tried automating before? What happened?',
        multiline: true,
      },
      {
        key: 'budget_for_automation',
        label: 'Budget for automation / tooling',
        placeholder: 'Approximate monthly or one-time budget',
      },
    ],
  },
]

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key))
type FormState = Record<string, string>

function emptyForm(): FormState {
  return Object.fromEntries(ALL_KEYS.map((k) => [k, '']))
}

type BriefResult = {
  brief: Record<string, unknown>
  confidence_score: number
  gaps: string[]
}

export default function DeepAuditAdminPage() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BriefResult | null>(null)

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/deep-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = (await res.json()) as Record<string, unknown>
      if (!res.ok) {
        setError(
          typeof data.error === 'string'
            ? data.error
            : `Request failed: ${res.status}`,
        )
        return
      }
      setResult({
        brief: (data.brief as Record<string, unknown>) ?? {},
        confidence_score: typeof data.confidence_score === 'number' ? data.confidence_score : 0,
        gaps: Array.isArray(data.gaps) ? (data.gaps as string[]) : [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-1">VIP Deep Audit</h1>
        <p className="text-gray-400 text-sm mb-8">
          Complete all 28 intake questions then submit to generate the automation brief via Claude.
        </p>

        <form onSubmit={handleSubmit} className="space-y-10">
          {SECTIONS.map((section, si) => (
            <div key={si} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-lg font-semibold text-blue-400 mb-5">
                {si + 1}. {section.title}
              </h2>
              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.key}>
                    <label
                      htmlFor={field.key}
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      {field.label}
                    </label>
                    {field.multiline ? (
                      <textarea
                        id={field.key}
                        rows={3}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
                        placeholder={field.placeholder}
                        value={form[field.key] ?? ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        required
                      />
                    ) : (
                      <input
                        id={field.key}
                        type="text"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={field.placeholder}
                        value={form[field.key] ?? ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        required
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-white transition-colors"
          >
            {loading ? 'Generating audit brief…' : 'Generate VIP Audit Brief'}
          </button>
        </form>

        {error && (
          <div className="mt-8 p-4 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div className="mt-10 space-y-6">
            {/* Confidence score + gaps */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-gray-400 text-sm font-medium">Confidence score</span>
                <span
                  className={`text-2xl font-bold ${
                    result.confidence_score >= 75
                      ? 'text-green-400'
                      : result.confidence_score >= 50
                        ? 'text-yellow-400'
                        : 'text-red-400'
                  }`}
                >
                  {result.confidence_score}/100
                </span>
              </div>
              {result.gaps.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">
                    Gaps flagged ({result.gaps.length})
                  </p>
                  <ul className="space-y-1">
                    {result.gaps.map((gap, i) => (
                      <li key={i} className="text-sm text-yellow-300 flex gap-2">
                        <span className="text-yellow-600">⚠</span>
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Full JSON brief */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                Full Brief (JSON)
              </h3>
              <pre className="text-xs text-gray-200 overflow-auto max-h-[600px] whitespace-pre-wrap break-words">
                {JSON.stringify(result.brief, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
