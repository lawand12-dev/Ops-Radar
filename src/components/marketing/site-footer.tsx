import Link from "next/link";
import { CONTACT_EMAIL } from "<npm>/lib/constants";

const FOOTER_NAV = [
  {
    title: "Product",
    links: [
      { label: "AIOS", href: "/aios" },
      { label: "Audit", href: "/audit" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Services", href: "/services" },
      { label: "How it works", href: "/how-it-works" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Built for",
    links: [
      { label: "Paid media", href: "/for/paid-media" },
      { label: "SEO", href: "/for/seo" },
      { label: "Full-service", href: "/for/full-service" },
      { label: "E-commerce", href: "/for/ecommerce" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Unsubscribe", href: "/unsubscribe" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 text-[var(--color-fg)]">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true" className="text-[var(--color-primary)]">
                <circle cx="11" cy="11" r="10" stroke="currentColor" strokeWidth="1.2" opacity="0.25" />
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
                <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.4" opacity="0.7" />
                <circle cx="11" cy="11" r="1.4" fill="currentColor" />
              </svg>
              <span className="font-serif text-[1.0625rem] tracking-[-0.01em]">OpsRadar</span>
            </Link>
            <p className="mt-4 text-body-sm text-[var(--color-fg-muted)] max-w-xs">
              The operating system for agency operations. Audit, build, and monitor every workflow you already run.
            </p>
          </div>

          {FOOTER_NAV.map((group) => (
            <div key={group.title}>
              <p className="text-label text-[var(--color-fg-subtle)]">{group.title}</p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-body-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-t border-[var(--color-border)] pt-8">
          <p className="text-caption text-[var(--color-fg-subtle)]">
            © {new Date().getFullYear()} OpsRadar. All rights reserved.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-caption text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] font-mono"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
