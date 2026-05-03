'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

type GenerateState = 'idle' | 'generating' | 'done' | 'error'

export default function GenerateBlueprintPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [authed, setAuthed] = useState(false)
  const [agencyName, setAgencyName] = useState('')
  const [state, setState] = useState<GenerateState>('idle')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/admin-auth')
      .then((r) => r.json())
      .then((d: { authenticated: boolean }) => {
        if (!d.authenticated) {
          router.replace(`/admin/login?redirectTo=/admin/vip-sessions/${id}/generate`)
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
      .then((d: { agency_name: string }) => setAgencyName(d.agency_name ?? ''))
      .catch(console.error)
  }, [authed, id])

  async function handleGenerate() {
    setState('generating')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/vip-sessions/${id}/generate`, { method: 'POST' })
      const data = (await res.json()) as { pdf_url?: string; error?: string }
      if (!res.ok || !data.pdf_url) {
        setErrorMsg(data.error ?? `Generation failed (${res.status})`)
        setState('error')
        return
      }
      setPdfUrl(data.pdf_url)
      setState('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
      setState('error')
    }
  }

  async function copyUrl() {
    if (!pdfUrl) return
    await navigator.clipboard.writeText(pdfUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Image src="/logo.png" alt="OpsRadar" width={32} height={32} className="rounded-lg" />
          <div>
            <Link
              href={`/admin/vip-sessions/${id}`}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              ← {agencyName || 'Session'}
            </Link>
            <h1 className="text-xl font-bold text-white">Generate Blueprint PDF</h1>
          </div>
        </div>

        {/* Main card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-8 text-center">
          {state === 'idle' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-blue-700/40 bg-blue-950/30">
                <svg
                  className="h-8 w-8 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-bold text-white">Ready to Generate</h2>
              <p className="mb-2 text-sm text-gray-400">
                Claude will analyse the discovery data and produce a premium 10–15 page PDF
                blueprint for{' '}
                <span className="font-semibold text-white">{agencyName}</span>.
              </p>
              <p className="mb-6 text-xs text-gray-500">This takes 30–60 seconds.</p>
              <button
                onClick={handleGenerate}
                className="rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white transition hover:bg-blue-500"
              >
                Generate Blueprint PDF →
              </button>
            </>
          )}

          {state === 'generating' && (
            <>
              <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <h2 className="mb-2 text-lg font-bold text-white">Generating…</h2>
              <p className="text-sm text-gray-400">Generating analysis with Claude…</p>
              <p className="mt-2 text-xs text-gray-600">Please keep this tab open.</p>
            </>
          )}

          {state === 'done' && pdfUrl && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-green-700/40 bg-green-950/30">
                <svg
                  className="h-8 w-8 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-bold text-white">Blueprint Ready!</h2>
              <p className="mb-6 text-sm text-gray-400">
                The VIP Automation Blueprint for{' '}
                <span className="font-semibold text-white">{agencyName}</span> has been generated.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
                >
                  Download PDF ↓
                </a>
                <button
                  onClick={copyUrl}
                  className="rounded-xl border border-gray-600 px-6 py-3 text-sm font-semibold text-gray-300 transition hover:border-gray-400"
                >
                  {copied ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
              <button
                onClick={() => { setState('idle'); setPdfUrl(null) }}
                className="mt-5 text-xs text-gray-500 hover:text-gray-300"
              >
                Re-generate
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-red-700/40 bg-red-950/30">
                <svg
                  className="h-8 w-8 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-bold text-white">Generation Failed</h2>
              <p className="mb-4 text-sm text-red-400">{errorMsg}</p>
              <button
                onClick={() => setState('idle')}
                className="rounded-xl bg-gray-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-600"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
