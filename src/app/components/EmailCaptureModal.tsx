'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '<npm>/components/ui/dialog'
import { Input } from '<npm>/components/ui/input'
import { Button } from '<npm>/components/ui/button'
import HoneypotField from './HoneypotField'
import { getAbuseProtectionPayload } from '../../lib/abuse-protection'

export type LeadInfo = {
  name: string
  email: string
  company: string
  websiteUrl: string
  companyWebsite: string
  startedAt: number
}

interface EmailCaptureModalProps {
  onSubmit: (lead: LeadInfo) => void
  onClose: () => void
}

export default function EmailCaptureModal({ onSubmit, onClose }: EmailCaptureModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [startedAt] = useState(() => Date.now())

  const isValid =
    name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    company.trim().length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      websiteUrl: websiteUrl.trim(),
      ...getAbuseProtectionPayload(startedAt, companyWebsite),
    })
  }

  const inputClass =
    'bg-surface-container border-outline-variant/20 text-on-surface placeholder:text-on-surface-variant/40 focus-visible:border-primary/40 focus-visible:ring-primary/20 h-11 rounded-xl px-4'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md bg-surface-container border-outline-variant/10 p-0 overflow-hidden gap-0"
      >
        {/* Top accent line */}
        <div
          className="h-[2px] w-full rounded-t-xl shrink-0"
          style={{ background: 'linear-gradient(90deg, #adc6ff, #a78bfa, #4cd7f6)' }}
        />

        <div className="p-8 pt-6">
          <DialogHeader className="mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/10 text-secondary text-[11px] font-medium tracking-wide mb-4 w-fit">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              YOUR AUDIT IS READY
            </div>
            <DialogTitle className="font-headline text-2xl font-bold tracking-tight text-on-surface">
              Where should we send your report?
            </DialogTitle>
            <DialogDescription className="text-sm text-on-surface-variant leading-relaxed">
              Enter your details to generate and deliver your personalized automation audit.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <HoneypotField value={companyWebsite} onChange={setCompanyWebsite} />

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Your Name
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                autoFocus
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Work Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@youragency.com"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Company Name
              </label>
              <Input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Agency"
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                Website
                <span className="text-on-surface-variant/40"> (optional, improves accuracy)</span>
              </label>
              <Input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://youragency.com"
                className={inputClass}
              />
            </div>

            <Button
              type="submit"
              disabled={!isValid}
              className="w-full h-12 rounded-full font-semibold text-sm mt-2 btn-spring shadow-[0_0_20px_rgba(173,198,255,0.25)] gap-2"
            >
              Generate My Free Audit
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </form>

          <p className="mt-4 text-center text-[11px] text-on-surface-variant/40 leading-relaxed">
            No spam. We use your email to send your report and occasional automation tips.
            Unsubscribe anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
