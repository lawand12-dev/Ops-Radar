# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Next.js Version Warning

This project uses Next.js 16 with React 19 and the React Compiler. APIs and conventions may differ from training data. **Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.** Heed deprecation notices.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (uses --webpack flag)
npm run lint         # ESLint (flat config, next core-web-vitals + typescript)
npm run types:supabase  # Regenerate Supabase types → src/lib/database.types.ts
```

No test runner is currently configured. Playwright is installed as a dev dependency but no test scripts are defined.

## Path Alias

TypeScript paths use `<npm>/*` → `./src/*` (configured in tsconfig.json). Use `<npm>/lib/...`, `<npm>/components/...` etc. in imports.

## Architecture

**OpsRadar** is an AI-powered operations audit tool for agencies. Users complete a multi-step questionnaire about their business, and OpenAI (GPT-4o) generates a detailed automation audit with ROI calculations and implementation blueprints.

### App Routes (`src/app/`)

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/audit` | Multi-step questionnaire form |
| `/results` | Audit results display (free/paid tiers) |
| `/services` | Services offered |
| `/workflows` | Workflow showcase |
| `/pricing` | Pricing page |
| `/about` | About page |
| `/admin` | Admin dashboard (password-protected) |

### API Routes (`src/app/api/`)

- `generate-audit/` — Core endpoint: calls OpenAI to generate the automation audit
- `chat/` — AI chat assistant widget
- `notify/` — Email notifications via Resend on new audits
- `notify-chat-lead/` — Chat lead notifications
- `build-request/` — Automation build request submissions
- `quick-win-onboarding/` — Quick-win onboarding emails
- `audit-step/`, `audit-result/` — Audit persistence endpoints
- `funnel-event/` — Analytics funnel tracking
- `research-preview/` — Website research intelligence preview
- `admin-auth/`, `admin/data/` — Admin authentication and data access
- `chat-conversations/`, `chat-history/` — Chat persistence
- `cron/followups/` — Scheduled follow-up emails
- `unsubscribe/` — Email unsubscribe handling

### Key Libraries (`src/lib/`)

- `prompts.ts` — AI prompt templates for audit generation (system + user prompts)
- `openai.ts` — OpenAI client setup
- `supabase.ts` / `supabase-server.ts` — Client and server Supabase clients
- `database.types.ts` — Auto-generated Supabase types (do not edit manually)
- `website-intel.ts`, `website-research-agent.ts`, `website-visual-intel.ts` — Website analysis pipeline
- `audit-report.ts`, `audit-grounding.ts` — Audit report generation and grounding
- `pdf-generator.ts`, `pdf-color-sanitizer.ts` — PDF report generation
- `rate-limit.ts`, `abuse-protection.ts`, `security.ts` — Security layer (Upstash Redis rate limiting)
- `constants.ts` — Centralized URLs and config (site URL, Calendly, contact email)
- `funnel.ts` — Funnel analytics tracking
- `knowledge-retrieval.ts` — File-based knowledge retrieval: reads `knowledge-base/` categories matched to audit inputs, plus real agency submissions from Supabase
- `agency-submissions.ts` — Quality filter + fire-and-forget save of qualifying audit inputs to `agency_submissions` Supabase table

### Components (`src/components/`)

- `ui/` — Reusable UI components (shadcn-based: button, card, dialog, badge, etc.) plus custom components (chat assistant, pricing, hero banner, shader background, beams)
- `animations/` — Animation components (typewriter, stagger, fade-in, floating particles, glow card, count-up)
- `app/components/` — Page-specific components (email capture modal, FAQ accordion, honeypot field, animated number)

### External Services

- **Supabase** — Database, auth (project ID: `nbdcrmepvwbfbcjqfubr`)
- **OpenAI** — GPT-4o for audit generation and chat
- **Resend** — Transactional emails
- **Upstash Redis** — Rate limiting
- **Vercel** — Hosting, analytics, speed insights
- **Calendly** — Strategy call booking

### Design System

- Dark theme with electric blue (#0066FF) and cyan (#00D4FF) accents
- Fonts: NotoSansDisplay (body) and NotoSerifDisplay (headings), loaded as local fonts
- Tailwind CSS v4 with `tw-animate-css` for animations
- shadcn/ui components with Radix UI primitives
- Three.js via @react-three/fiber for 3D elements
- Framer Motion for page transitions and animations

### Design Libraries Subdir

`design-libraries/ui-skill/` is an embedded AI design toolkit (Antigravity Kit) with searchable databases of UI styles, color palettes, and fonts. It has its own CLAUDE.md with search commands. It is a reference resource, not part of the main app build.

### Security

The app has a Content Security Policy configured in `next.config.ts` and uses security headers on all routes. Admin routes have `no-store` cache headers. Rate limiting uses Upstash Redis.
