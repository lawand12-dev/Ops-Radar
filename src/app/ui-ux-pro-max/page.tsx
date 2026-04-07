import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BarChart3,
  Database,
  ExternalLink,
  GitBranch,
  LayoutTemplate,
  Package,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Type,
} from "lucide-react";
import { getUiSkillLandingData } from "<npm>/lib/ui-skill-data";

export const metadata: Metadata = {
  title: "UI UX Pro Max",
  description:
    "A real product landing page for the UI UX Pro Max design intelligence toolkit, powered by live catalog data from the repository.",
};

const GITHUB_URL = "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill";
const NPM_URL = "https://www.npmjs.com/package/uipro-cli";

const CATALOG_ICONS: Record<string, LucideIcon> = {
  styles: Sparkles,
  colors: Palette,
  type: Type,
  landing: LayoutTemplate,
  charts: BarChart3,
  ux: ShieldCheck,
};

const COMMANDS = [
  {
    label: "Search styles",
    command: 'python3 src/ui-ux-pro-max/scripts/search.py "wellness app" --domain style',
  },
  {
    label: "Search landing patterns",
    command: 'python3 src/ui-ux-pro-max/scripts/search.py "developer tool" --domain landing',
  },
  {
    label: "Install the skill",
    command: "uipro init --ai claude",
  },
];

function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
          <span className="h-2 w-2 rounded-full bg-[#ff9a5f] shadow-[0_0_18px_rgba(255,154,95,0.7)]" />
          {eyebrow}
        </span>
        <h2 className="mt-5 max-w-4xl font-headline text-4xl font-extrabold tracking-tight text-white md:text-5xl">
          {title}
        </h2>
      </div>
      <p className="max-w-2xl text-base leading-8 text-slate-300">{copy}</p>
    </div>
  );
}

function ExternalButton({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={[
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5",
        secondary
          ? "border border-white/12 bg-white/5 text-slate-100 hover:border-white/20 hover:bg-white/7"
          : "bg-[linear-gradient(135deg,#4f7bff,#6f95ff)] text-slate-950 shadow-[0_24px_44px_-26px_rgba(79,123,255,0.85)]",
      ].join(" ")}
    >
      {children}
    </a>
  );
}

export default async function UiUxProMaxPage() {
  const data = await getUiSkillLandingData();
  const allStacks = data.stackNames;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08101d] text-slate-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(circle at 14% 12%, rgba(79,123,255,0.22), transparent 28%), radial-gradient(circle at 86% 16%, rgba(255,154,95,0.18), transparent 30%), radial-gradient(circle at 70% 70%, rgba(79,123,255,0.12), transparent 26%), linear-gradient(180deg, #08101d 0%, #0a1220 46%, #090f18 100%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "linear-gradient(180deg, rgba(255,255,255,0.7), transparent 92%)",
        }}
      />

      <header className="sticky top-4 z-40 mx-auto mt-4 w-[min(1180px,calc(100%-24px))] rounded-[26px] border border-white/10 bg-slate-950/60 px-4 py-4 backdrop-blur-2xl shadow-[0_30px_70px_-44px_rgba(2,6,23,0.9)] md:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-3 text-white">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(79,123,255,0.22),rgba(255,154,95,0.2))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <Package className="h-5 w-5 text-[#dbe6ff]" />
              </span>
              <span>
                <span className="block font-headline text-lg font-extrabold tracking-tight">
                  UI UX Pro Max
                </span>
                <span className="block text-sm text-slate-400">
                  Live route powered by repo data
                </span>
              </span>
            </Link>
          </div>

          <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <a href="#artifact" className="rounded-xl px-3 py-2 hover:bg-white/5 hover:text-white">
              Artifact
            </a>
            <a href="#catalog" className="rounded-xl px-3 py-2 hover:bg-white/5 hover:text-white">
              Catalog
            </a>
            <a href="#styles" className="rounded-xl px-3 py-2 hover:bg-white/5 hover:text-white">
              Styles
            </a>
            <a href="#workflow" className="rounded-xl px-3 py-2 hover:bg-white/5 hover:text-white">
              Workflow
            </a>
            <ExternalButton href={NPM_URL}>Open npm</ExternalButton>
          </nav>
        </div>
      </header>

      <div className="relative z-10 mx-auto w-[min(1180px,calc(100%-24px))] px-1 pb-24 pt-10 md:px-2 md:pt-16">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,24,39,0.92),rgba(11,18,32,0.88))] p-7 shadow-[0_36px_90px_-44px_rgba(2,6,23,0.88)] md:p-9">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">
              <span className="h-2 w-2 rounded-full bg-[#ff9a5f] shadow-[0_0_18px_rgba(255,154,95,0.7)]" />
              Real entry point, not another screenshot
            </span>

            <h1 className="mt-6 font-headline text-5xl font-extrabold tracking-tight text-white md:text-7xl md:leading-[0.95]">
              UI UX Pro Max
              <span className="mt-2 block bg-[linear-gradient(92deg,#4f7bff_0%,#89a8ff_58%,#ff9a5f_100%)] bg-clip-text text-transparent">
                Design Intelligence
              </span>
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">
              This page is backed by the current CSV dataset inside the repository. It exposes the
              actual catalog shape, featured style directions, landing patterns, and installation flow
              instead of relying on a frozen marketing export.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
                <ExternalButton href={GITHUB_URL}>
                  GitHub
                  <GitBranch className="h-4 w-4" />
                </ExternalButton>
              <ExternalButton href={NPM_URL} secondary>
                npm package
                <ExternalLink className="h-4 w-4" />
              </ExternalButton>
            </div>

            <div className="mt-8 rounded-[24px] border border-white/10 bg-[#090f18] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Install command
                  </p>
                  <code className="mt-2 block overflow-x-auto rounded-2xl bg-white/[0.03] px-4 py-3 font-mono text-sm text-[#dbe7ff]">
                    <span className="mr-2 text-[#ff9a5f]">$</span>
                    uipro init --ai claude
                  </code>
                </div>
                <div className="rounded-full border border-[#ff9a5f]/20 bg-[#ff9a5f]/10 px-4 py-2 text-sm font-semibold text-[#ffb185]">
                  {formatCount(data.totalEntries)} indexed entries surfaced on this route
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {data.catalog.slice(0, 4).map((item) => (
                <div
                  key={item.key}
                  className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_22px_40px_-34px_rgba(2,6,23,0.8)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {item.label}
                  </p>
                  <strong className="mt-3 block text-3xl font-headline font-extrabold text-white">
                    {formatCount(item.count)}
                  </strong>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <aside
            id="artifact"
            className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.94),rgba(13,19,32,0.94))] p-5 shadow-[0_36px_90px_-44px_rgba(2,6,23,0.88)] md:p-6"
          >
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-[#101827]">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff9a5f]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#4f7bff]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#4ade80]" />
                </div>
                <span className="text-sm font-semibold text-slate-200">Recommended Design System</span>
                <span className="text-xs uppercase tracking-[0.18em] text-slate-500">live shape</span>
              </div>

              <div className="space-y-4 p-4">
                <div className="rounded-[20px] border border-white/10 bg-[#0a111d] p-4">
                  <div className="flex items-start gap-3">
                    <TerminalSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#ff9a5f]" />
                    <code className="font-mono text-sm leading-7 text-[#dbe7ff]">
                      build a trust-first landing page for a developer tool with clear hierarchy,
                      accessible contrast, and a real artifact panel above the fold
                    </code>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
                  <h2 className="font-headline text-2xl font-extrabold text-white">
                    Show the product answer immediately.
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    The route is intentionally built around proof: current counts, real style and
                    pattern names from the dataset, and the actual CLI/search workflow users adopt.
                  </p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Pattern
                      </p>
                      <strong className="mt-2 block text-base text-white">
                        {data.featuredPatterns[0]?.name ?? "Hero + Social Proof"}
                      </strong>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Style
                      </p>
                      <strong className="mt-2 block text-base text-white">
                        {data.featuredStyles[0]?.name ?? "Soft UI Evolution"}
                      </strong>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Catalog
                      </p>
                      <strong className="mt-2 block text-base text-white">
                        {formatCount(data.totalEntries)} entries available
                      </strong>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Frameworks
                      </p>
                      <strong className="mt-2 block text-base text-white">
                        {allStacks.length} stack guides included
                      </strong>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className="h-10 w-10 rounded-2xl border border-white/10 bg-[#e8b4b8]" />
                    <span className="h-10 w-10 rounded-2xl border border-white/10 bg-[#a8d5ba]" />
                    <span className="h-10 w-10 rounded-2xl border border-white/10 bg-[#d4af37]" />
                    <span className="h-10 w-10 rounded-2xl border border-white/10 bg-[#fff5f5]" />
                    <span className="h-10 w-10 rounded-2xl border border-white/10 bg-[#2d3436]" />
                    <p className="max-w-xs text-sm leading-6 text-slate-400">
                      Example artifact presentation stays practical: pattern, palette, typography,
                      and what to avoid.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {allStacks.slice(0, 8).map((stack) => (
                <span
                  key={stack}
                  className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-300"
                >
                  {stack}
                </span>
              ))}
            </div>
          </aside>
        </section>

        <section id="catalog" className="pt-24">
          <SectionHeading
            eyebrow="Catalog"
            title="Current dataset, surfaced from the repo."
            copy="These cards are rendered from the actual CSV source of truth under design-libraries/ui-skill/src/ui-ux-pro-max/data, so the route stays aligned with the package contents."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.catalog.map((item) => {
              const Icon = CATALOG_ICONS[item.key] ?? Database;

              return (
                <article
                  key={item.key}
                  className="group rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(12,18,31,0.88))] p-6 shadow-[0_30px_70px_-48px_rgba(2,6,23,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-[#9eb8ff]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-[#4f7bff]/15 bg-[#4f7bff]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#a9beff]">
                      {item.key}
                    </span>
                  </div>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {item.label}
                  </p>
                  <strong className="mt-3 block font-headline text-5xl font-extrabold tracking-tight text-white">
                    {formatCount(item.count)}
                  </strong>
                  <p className="mt-4 text-base leading-7 text-slate-300">{item.detail}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="styles" className="pt-24">
          <SectionHeading
            eyebrow="Featured styles"
            title="Named directions pulled from styles.csv."
            copy="The page no longer speaks in generic adjectives only. It references actual style entries from the dataset and surfaces practical fields like best fit, performance, and accessibility."
          />

          <div className="grid gap-4 xl:grid-cols-2">
            {data.featuredStyles.map((style) => (
              <article
                key={style.name}
                className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,24,39,0.9),rgba(10,16,29,0.9))] p-6 shadow-[0_30px_70px_-48px_rgba(2,6,23,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-[#ff9a5f]/18 bg-[#ff9a5f]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb78d]">
                    {style.kind}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    {style.performance}
                  </span>
                </div>

                <h3 className="mt-5 font-headline text-3xl font-extrabold tracking-tight text-white">
                  {style.name}
                </h3>
                <p className="mt-4 text-base leading-7 text-slate-300">{style.bestFor}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Performance
                    </p>
                    <strong className="mt-2 block text-white">{style.performance}</strong>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Accessibility
                    </p>
                    <strong className="mt-2 block text-white">{style.accessibility}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="pt-24">
          <SectionHeading
            eyebrow="Landing patterns"
            title="Real structural patterns from landing.csv."
            copy="These are not invented labels for this page. They come from the landing pattern dataset, which is what makes the route useful as a product surface rather than a single mockup."
          />

          <div className="grid gap-4 xl:grid-cols-2">
            {data.featuredPatterns.map((pattern) => (
              <article
                key={pattern.name}
                className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,24,39,0.9),rgba(10,16,29,0.9))] p-6 shadow-[0_30px_70px_-48px_rgba(2,6,23,0.9)] transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20"
              >
                <div className="flex items-center gap-3 text-[#9eb8ff]">
                  <LayoutTemplate className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    CTA placement
                  </span>
                </div>
                <h3 className="mt-4 font-headline text-3xl font-extrabold tracking-tight text-white">
                  {pattern.name}
                </h3>
                <p className="mt-3 text-base leading-7 text-slate-300">{pattern.cta}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {pattern.sections.map((section) => (
                    <span
                      key={section}
                      className="inline-flex min-h-10 items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-300"
                    >
                      {section}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="workflow" className="pt-24">
          <SectionHeading
            eyebrow="Workflow"
            title="Concrete commands and stack coverage."
            copy="The route closes the gap between marketing and implementation: it shows how the catalog is queried, how it installs, and which stacks are explicitly covered."
          />

          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,24,39,0.92),rgba(9,15,24,0.94))] p-6 shadow-[0_30px_70px_-48px_rgba(2,6,23,0.9)]">
              <div className="flex items-center gap-3">
                <Search className="h-5 w-5 text-[#ff9a5f]" />
                <h3 className="font-headline text-2xl font-extrabold text-white">
                  Commands that map to the package
                </h3>
              </div>

              <div className="mt-6 space-y-4">
                {COMMANDS.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[22px] border border-white/10 bg-[#090f18] p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                      {item.label}
                    </p>
                    <code className="mt-3 block overflow-x-auto font-mono text-sm leading-7 text-[#dbe7ff]">
                      <span className="mr-2 text-[#ff9a5f]">$</span>
                      {item.command}
                    </code>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,24,39,0.92),rgba(9,15,24,0.94))] p-6 shadow-[0_30px_70px_-48px_rgba(2,6,23,0.9)]">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-[#4f7bff]" />
                <h3 className="font-headline text-2xl font-extrabold text-white">
                  Stack guides detected from /data/stacks
                </h3>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {allStacks.map((stack) => (
                  <span
                    key={stack}
                    className="inline-flex min-h-10 items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-200"
                  >
                    {stack}
                  </span>
                ))}
              </div>

              <div className="mt-6 rounded-[22px] border border-[#4f7bff]/18 bg-[#4f7bff]/10 p-4 text-sm leading-7 text-[#dbe7ff]">
                Source of truth stays in{" "}
                <code className="rounded bg-slate-950/40 px-2 py-1 font-mono text-xs">
                  design-libraries/ui-skill/src/ui-ux-pro-max
                </code>
                . This route reads that data server-side, so counts stay aligned without another manual screenshot refresh.
              </div>
            </div>
          </div>
        </section>

        <section className="pt-24">
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(79,123,255,0.14),transparent_40%),linear-gradient(180deg,rgba(16,24,39,0.96),rgba(9,15,24,0.96))] p-7 shadow-[0_36px_90px_-44px_rgba(2,6,23,0.88)] md:p-9">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                  <ArrowRight className="h-3.5 w-3.5 text-[#ff9a5f]" />
                  Next move
                </span>
                <h2 className="mt-5 font-headline text-4xl font-extrabold tracking-tight text-white md:text-5xl">
                  This route can now replace the isolated preview.
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-300">
                  The landing page is now a real application route backed by repository data. The next step, if you want,
                  is to attach interactive search or expose a lightweight JSON endpoint for the catalog.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <ExternalButton href={GITHUB_URL}>
                  View package repo
                  <GitBranch className="h-4 w-4" />
                </ExternalButton>
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-5 text-sm font-semibold text-slate-100 transition-transform duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/7"
                >
                  Back to OpsRadar
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
