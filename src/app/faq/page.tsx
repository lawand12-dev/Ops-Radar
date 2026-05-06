import type { Metadata } from 'next';
import { CALENDLY_STRATEGY_CALL_URL } from '<npm>/lib/constants';

export const metadata: Metadata = {
  title: 'Questions — OpsRadar',
  description: 'Common questions about OpsRadar: what we build, what it costs, how long it takes, and how the work stays yours.',
};

type FAQ = { q: string; a: string };
type FAQGroup = { title: string; items: FAQ[] };

const GROUPS: FAQGroup[] = [
  {
    title: 'The basics',
    items: [
      {
        q: 'What is OpsRadar exactly?',
        a: "OpsRadar builds the AI Operating System for agencies — paid-media shops, SEO agencies, and full-service teams under 25 people. The Agency Brain, workflows, and Claude interface run around your real operations. The workflows live in your n8n account, not ours. You own them day one."
      },
      {
        q: 'Who is this for?',
        a: "Agencies with 5 to 25 people who are losing hours to manual reporting, client onboarding, pacing alerts, or cross-tool data stitching. If your team is spending Sunday nights building client reports, this is for you."
      },
      {
        q: "Who is this NOT for?",
        a: "Very early one-person shops where the math does not work yet, enterprise agencies with 50+ people that need a larger transformation program, and shops that want shrinkwrap software. This is custom-built, not a product you install."
      },
      {
        q: "Why 'you own it' matters",
        a: "Every workflow we build runs inside your n8n account, on your credentials, on your infrastructure. If OpsRadar ever left, nothing breaks. You keep the code, the logic, and the logs. No vendor lock-in."
      }
    ]
  },
  {
    title: 'Pricing & payment',
    items: [
      {
        q: 'What does it cost?',
        a: "One-time builds range from $3,500 (Starter Build) to $9,500 (Advanced Build). Monthly retainers for ongoing care range from $750 to $3,000/month. We confirm exact scope and payment terms before any build starts."
      },
      {
        q: 'How does payment work?',
        a: "50% upfront after we scope the build together, 50% on delivery. Monthly retainers bill at the start of each month. No long-term lock-in — cancel with 30 days notice."
      },
      {
        q: 'Is a retainer required?',
        a: "No. You can do a one-time build and never add ongoing care. But most agencies add the Care retainer ($750/month) because Meta, Shopify, and ad platforms push breaking API changes every quarter — and someone has to fix them before your Monday morning report fails."
      },
      {
        q: "How is this cheaper than Zapier?",
        a: "Zapier and Make charge per task. Agency reporting workflows run hundreds of times a day. A typical agency Zapier retainer runs $500–$2,000/month. Your own n8n account: flat $20/month, unlimited runs. The build pays for itself in roughly 6 weeks at typical agency hourly rates."
      }
    ]
  },
  {
    title: 'Process & delivery',
    items: [
      {
        q: 'How long does a build take?',
        a: "Single workflows can ship in 3–10 business days when scope is tight and you're responsive. Multi-workflow systems take 2–4 weeks. The whole process from first message to first workflow running: roughly 10 business days."
      },
      {
        q: 'What happens after starting the free audit?',
        a: "The audit is a 3-minute form. You get back real dollar numbers on what specific ops work is costing your agency. If the numbers make sense to you, we book a 15-minute call to scope the exact build. If they don't, no pressure — keep the audit."
      },
      {
        q: "What is required during the build?",
        a: "About 5 minutes of your time, total. You grant API access to the tools you already use (Meta, Google, Slack, etc.), review one proposal, and test the final workflow before it goes live. That's it. No scoping meetings, no back-and-forth on specs."
      },
      {
        q: "What if something breaks?",
        a: "Every build includes a bug-fix window (14 days on Starter, 30 days on Core, 60 days on Advanced). After that, the Care retainer catches breakages before they hit production. Our team monitors the workflows — if Meta's API changes at 3am, we fix it before your Monday morning report fails."
      }
    ]
  },
  {
    title: 'Tools & technical',
    items: [
      {
        q: 'What tools do you work with?',
        a: "Anything with an API or webhook. Most common integrations: Meta Ads, Google Ads, GA4, Triple Whale, Klaviyo, HubSpot, Ahrefs, Semrush, Slack, Notion, Google Sheets, Looker Studio. If your tool isn't listed, it probably still works — ask us in the audit."
      },
      {
        q: 'Why n8n instead of Zapier, Make, or a SaaS tool?',
        a: "Three reasons: (1) flat pricing — $20/month instead of per-task fees that explode at scale. (2) You own it — the workflow lives in your account, not behind someone else's paywall. (3) More powerful — custom logic, AI nodes, branching, self-hosted option. For agencies running reporting at volume, n8n is the only math that works."
      },
      {
        q: 'Can n8n be self-hosted?',
        a: "Yes. You can run n8n on their cloud ($20/month) or self-host it on your own server. We build in either environment. Self-hosting is free but requires a DevOps person. Most agencies just use n8n Cloud."
      },
      {
        q: 'Do you work with my existing automation setup?',
        a: "Yes. If you already have Zapier zaps, Make scenarios, or hand-rolled scripts, we can migrate them to n8n and extend them. Often the migration itself pays for the build through Zapier cost savings alone."
      }
    ]
  }
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#000000] text-white font-body">
      {/* Hero */}
      <section className="relative px-6 pt-24 pb-16 max-w-4xl mx-auto">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/40 mb-5">
          Questions
        </p>
        <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] text-white mb-6 leading-[1.05]">
          Everything prospects ask us.
        </h1>
        <p className="text-[17px] leading-[1.8] text-white/[0.55] max-w-2xl">
          Organized by topic. If you don&apos;t find what you need, the &quot;Book a call&quot; link at the bottom reaches our team directly.
        </p>
      </section>

      {/* Groups */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-20">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-cyan-400/60 mb-8">
              {group.title}
            </p>
            <div className="space-y-0">
              <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
              {group.items.map((item) => (
                <div key={item.q}>
                  <div className="py-8 md:py-10">
                    <h2 className="font-headline text-xl md:text-2xl font-bold tracking-[-0.01em] text-white mb-4 leading-[1.3]">
                      {item.q}
                    </h2>
                    <p className="text-[15px] md:text-base leading-[1.8] text-white/[0.65] max-w-3xl">
                      {item.a}
                    </p>
                  </div>
                  <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-6 overflow-hidden">
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto max-w-2xl h-96 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.08) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-white mb-5 leading-[1.1]">
            Still didn&apos;t find it?
          </h2>
          <p className="text-white/55 mb-10 text-base md:text-lg leading-relaxed">
            Book a free 20-min call. Bring any question — tool stack, workflow idea, budget constraints. No prep needed.
          </p>
          <a
            href={CALENDLY_STRATEGY_CALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-semibold text-sm text-white border border-white/30 hover:border-white/60 hover:bg-white/[0.03] transition-all btn-press"
          >
            Book a free 20-min call
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </section>
    </div>
  );
}
