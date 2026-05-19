import Link from "next/link";
import Image from "next/image";
import { CONTACT_EMAIL } from "<npm>/lib/constants";

const FOOTER_NAV = [
  {
    title: "Product",
    links: [
      { label: "The AI COO", href: "/product" },
      { label: "Pricing", href: "/pricing" },
      { label: "Start audit", href: "/audit" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
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
    <footer className="relative overflow-hidden bg-[#020203] border-t border-[rgba(255,255,255,0.08)]">
      {/* Top glare */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          boxShadow: "0 0 40px 12px rgba(255,255,255,0.22), 0 0 120px 60px rgba(255,255,255,0.08)",
        }}
      />

      {/* Bottom glare */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          boxShadow: "0 0 40px 12px rgba(255,255,255,0.22)",
        }}
      />
      <div className="relative mx-auto max-w-7xl px-6 pt-20 pb-12">

        {/* Tagline */}
        <p
          className="text-white max-w-[18ch]"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-h2)",
            lineHeight: "var(--text-h2--line-height)",
            letterSpacing: "var(--text-h2--letter-spacing)",
            fontWeight: 500,
          }}
        >
          The COO your agency never had.
        </p>

        {/* Link grid */}
        <div className="mt-16 grid grid-cols-2 gap-10 md:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 text-white">
              <Image
                src="/logo.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 rounded-md object-cover"
              />
              <span
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "1.0625rem",
                  letterSpacing: "-0.01em",
                  fontWeight: 500,
                }}
              >
                OpsRadar
              </span>
            </Link>
            <p
              className="mt-4 max-w-[22ch]"
              style={{ fontSize: "var(--text-body-sm)", lineHeight: 1.6, color: "#C8CDD8" }}
            >
              The AI COO for marketing agencies. From $750/month.
            </p>
          </div>

          {/* Nav columns */}
          {FOOTER_NAV.map((group) => (
            <div key={group.title}>
              <p
                className="uppercase"
                style={{
                  fontSize: "var(--text-label)",
                  letterSpacing: "var(--text-label--letter-spacing)",
                  fontWeight: 500,
                  color: "#8A8F98",
                }}
              >
                {group.title}
              </p>
              <ul className="mt-4 space-y-3">
                {group.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="transition-colors duration-[var(--duration-fast)] hover:text-white"
                      style={{ fontSize: "var(--text-body-sm)", color: "#C8CDD8" }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-[rgba(255,255,255,0.08)] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p
            style={{ fontSize: "var(--text-caption)", color: "#8A8F98" }}
          >
            © {new Date().getFullYear()} OpsRadar. All rights reserved.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-mono transition-colors hover:text-white"
            style={{ fontSize: "var(--text-caption)", color: "#C8CDD8" }}
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}
