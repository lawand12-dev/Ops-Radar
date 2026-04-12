import type { Metadata } from "next"

export const metadata: Metadata = {
  title: 'Terms of Service — OpsRadar',
  description: 'Rules of using OpsRadar. Written plainly.',
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-16 md:py-24">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40 mb-4">Legal</p>
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-[-0.03em] mb-3">
          Terms of Service
        </h1>
        <p className="text-white/60 mb-12">Last updated: April 2026</p>

        <div className="space-y-10 text-white/80 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">The deal</h2>
            <p>
              OpsRadar is operated by Lawand Soran ("I", "me"). By using this
              website, you agree to these terms. If you don't agree, don't
              use the site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">What I provide</h2>
            <p>
              This site offers a free AI-powered audit of agency operations,
              educational content about automation, and access to book a
              paid consultation or workflow build. The audit is automated
              software. The paid services are custom engagements we agree on
              in writing before work begins.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">The audit is informational, not advice</h2>
            <p>
              The audit report gives estimated numbers based on your inputs
              and industry benchmarks. It's a decent starting point for
              thinking about your operations. It's not a guarantee that you'll
              save that exact amount. It's not a substitute for professional
              consulting, legal advice, or financial planning.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Acceptable use</h2>
            <p className="mb-3">Don't use OpsRadar to:</p>
            <ul className="space-y-2 list-disc pl-6">
              <li>Attempt to overload, scrape, or reverse-engineer the service</li>
              <li>Submit false or misleading information intentionally</li>
              <li>Use the audit output to harm other people or businesses</li>
              <li>Resell the audit reports as your own product</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Paid services</h2>
            <p>
              If you book a paid build or strategy call, we'll agree on scope,
              price, and timeline in writing before any work begins. Paid
              services are governed by that specific engagement agreement,
              not these general terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">No warranty</h2>
            <p>
              The site and audit are provided "as is." I try to keep everything
              working, but I can't guarantee the site is always available,
              the audit is always accurate, or the output fits your exact
              situation. Use it at your own judgment.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Limitation of liability</h2>
            <p>
              To the maximum extent permitted by law, I'm not liable for any
              indirect, incidental, or consequential damages arising from your
              use of the free audit or this website. If you think I directly
              caused you harm through a paid engagement, that's governed by
              the specific engagement agreement we signed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Intellectual property</h2>
            <p>
              The OpsRadar name, logo, and website content are mine. The audit
              REPORT I generate for you is yours — you can share it, print it,
              quote from it freely. The underlying system and research library
              that produced it stays mine.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Governing law</h2>
            <p>
              These terms are governed by the laws of the Kurdistan Region of
              Iraq. Any disputes will be resolved in good faith through direct
              communication before any formal proceedings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Changes to these terms</h2>
            <p>
              If I update these terms, I'll change the date at the top.
              Material changes will be announced on the homepage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">Contact</h2>
            <p>
              Questions about these terms: <a href="mailto:opsradar.ai@gmail.com" className="text-white underline hover:text-white/80">opsradar.ai@gmail.com</a>
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
