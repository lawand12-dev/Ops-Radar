'use client'

import { useState } from 'react'
import { ExternalLink, Download, Mail } from 'lucide-react'

type Props = {
  notionUrl: string | null
}

export function BrainOwnershipDoors({ notionUrl }: Props) {
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function handleDownload() {
    setDownloading(true)
    setDownloadError(null)
    try {
      const res = await fetch('/api/dashboard/brain/download')
      if (!res.ok) {
        setDownloadError(`Download failed (${res.status})`)
        setDownloading(false)
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `opsradar-brain-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section>
      <h2 className="mb-3 text-body font-medium text-[var(--color-fg)]">Your three ways in</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Door
          icon={<ExternalLink size={16} />}
          title="Open in Notion"
          body="Daily-driver UI. The 20 DBs + 7 strategic pages live in your workspace."
          cta={notionUrl ? 'Open ↗' : 'Not connected'}
          href={notionUrl ?? undefined}
          external={!!notionUrl}
          ctaMuted={!notionUrl}
          disabled={!notionUrl}
        />
        <Door
          icon={<Download size={16} />}
          title="Download Brain (zip)"
          body="Karpathy-style portable markdown. Take it with you forever — yours to keep."
          cta={downloading ? 'Preparing…' : 'Download'}
          onClick={handleDownload}
          disabled={downloading}
          subtext={downloadError ?? undefined}
        />
        <Door
          icon={<Mail size={16} />}
          title="Weekly email"
          body="Every Sunday 11pm UTC, the full Brain ships to your inbox as a zip."
          cta="Active"
          ctaMuted
        />
      </div>
    </section>
  )
}

type DoorProps = {
  icon: React.ReactNode
  title: string
  body: string
  cta: string
  href?: string
  external?: boolean
  onClick?: () => void
  disabled?: boolean
  ctaMuted?: boolean
  subtext?: string
}

function Door({ icon, title, body, cta, href, external, onClick, disabled, ctaMuted, subtext }: DoorProps) {
  const inner = (
    <>
      <div className="flex items-center gap-2 text-[var(--color-fg-subtle)]">{icon}</div>
      <div className="mt-2 text-body-sm font-semibold text-[var(--color-fg)]">{title}</div>
      <div className="mt-1 text-caption leading-[1.5] text-[var(--color-fg-muted)]">{body}</div>
      <div className={`mt-3 text-body-sm font-medium ${ctaMuted ? 'text-[var(--color-fg-subtle)]' : 'text-[var(--color-primary)]'}`}>
        {cta}
      </div>
      {subtext && <div className="mt-1 text-caption text-[var(--color-danger)]">{subtext}</div>}
    </>
  )

  const className =
    'block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left no-underline transition-colors hover:bg-[var(--color-surface-sunken)] disabled:cursor-not-allowed disabled:opacity-60'

  if (href) {
    return (
      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className={className}>
        {inner}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${className} w-full cursor-pointer`}>
      {inner}
    </button>
  )
}
