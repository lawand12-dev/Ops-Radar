import type { Metadata } from "next"

export const metadata: Metadata = {
  title: 'Privacy Policy — OpsRadar',
  description: 'How OpsRadar handles your data. Written honestly by Lawand, the founder.',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Legal</p>
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-3">
          Privacy Policy
        </h1>
        <p className="text-white/60 mb-12">Last updated: April 2026</p>

        <div className="space-y-10 text-white/80 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">The short version</h2>
            <p>
              I'm Lawand, the founder and only operator of OpsRadar. When you
              use this site, I collect the minimum data needed to give you
              useful output. I don't sell your data. I don't share it with
              advertisers. I don't have a marketing team to leak it to. If you
              want me to delete everything I have on you, email me and I'll
              do it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">What I collect</h2>
            <p className="mb-3">When you complete an audit, I collect:</p>
            <ul className="space-y-2 list-disc pl-6">
              <li>Your name, work email, and company name (you type these in Step 1)</li>
              <li>Your answers to the audit questions</li>
              <li>Your website URL if you provide one</li>
              <li>Your IP address (standard web server logs, for rate limiting)</li>
              <li>Page views via Vercel Analytics (no cookies, no personal profile)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Why I collect it</h2>
            <ul className="space-y-2 list-disc pl-6">
              <li>Your name/email/company: to send you the audit report and follow up about it</li>
              <li>Your audit answers: to generate your personalized report</li>
              <li>Your website URL: to make the audit more specific to your actual stack</li>
              <li>Your IP: to prevent abuse and rate-limit the AI endpoint</li>
              <li>Analytics: to know which pages prospects find useful</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Where your data lives</h2>
            <p>
              Your audit data is stored in Supabase (US-based PostgreSQL database).
              Emails are sent through Resend. Rate limiting uses Upstash Redis.
              The site is hosted on Vercel. Analytics is Vercel Analytics —
              cookieless and privacy-friendly. I do not use Google Analytics,
              Facebook Pixel, or any other tracking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Who I share it with</h2>
            <p>
              Nobody, except the subprocessors listed above (Supabase, Resend,
              Vercel, Upstash) who help me run the service. I don't sell your
              data. I don't share it with advertisers. I don't have partners.
              I don't have investors. It's just me.
            </p>
            <p className="mt-3">
              Your audit inputs ARE sent to OpenAI's API to generate the report
              itself. OpenAI processes the text and returns the audit. They
              have their own privacy policy which you can read at openai.com/privacy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">How long I keep it</h2>
            <p>
              Audit records are retained indefinitely so you can return to your
              results URL. If you want your data deleted, email me and I'll
              remove it within 7 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Your rights</h2>
            <p className="mb-3">
              If you're in the EU (GDPR) or California (CCPA), you have the
              right to:
            </p>
            <ul className="space-y-2 list-disc pl-6">
              <li>Know what data I have about you</li>
              <li>Correct it if it's wrong</li>
              <li>Delete it entirely</li>
              <li>Export it in a readable format</li>
              <li>Opt out of follow-up emails (every email has an unsubscribe link)</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email me at opsradar.ai@gmail.com.
              No form to fill out. I'll reply personally within 3 business days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Cookies</h2>
            <p>
              OpsRadar uses no tracking cookies. There's a small localStorage
              entry for your theme preference (light/dark mode) — that's it.
              No advertising pixels, no third-party trackers, no fingerprinting.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Changes to this policy</h2>
            <p>
              If I change anything material, I'll update the "Last updated"
              date at the top and note what changed. I won't silently expand
              what I collect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Contact</h2>
            <p>
              Questions, concerns, or data requests: <a href="mailto:opsradar.ai@gmail.com" className="text-white underline hover:text-white/80">opsradar.ai@gmail.com</a>
            </p>
            <p className="mt-3">
              — Lawand Soran, Founder, OpsRadar
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
