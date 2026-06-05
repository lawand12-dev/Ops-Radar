# OpsRadar

AI operating system for service businesses and agencies. OpsRadar connects the tools a client-time business already uses, surfaces operational leaks, generates automation audits, and builds a company brain that AI employees can use to run approved operations.

## Stack

- **Framework:** Next.js 16, React 19, TypeScript
- **AI:** OpenAI GPT-4o (audit generation + chat)
- **Database:** Supabase (PostgreSQL)
- **Email:** Resend
- **Rate limiting:** Upstash Redis
- **Hosting:** Vercel

## Getting Started

```bash
cd opsradar
npm install
npm run dev       # http://localhost:3000
```

Copy `.env.local.example` to `.env.local` and fill in the required keys before starting.

## Commands

```bash
npm run dev             # Dev server
npm run build           # Production build
npm run lint            # ESLint
npm run types:supabase  # Regenerate Supabase types
```

## Project Structure

```
src/
  app/          # Next.js App Router — pages and API routes
  lib/          # Core logic (audit generation, knowledge retrieval, security)
  components/   # UI components (shadcn-based + custom)
knowledge-base/ # Static knowledge files read at audit time (no embeddings)
docs/           # Design specs and implementation plans
```

## Key Features

- Multi-step audit questionnaire with website intelligence (SSRF-safe scraping)
- File-based knowledge retrieval — no vector DB, no embeddings
- Audit KB feedback loop — qualifying submissions saved to `agency_submissions` and injected into future audits
- PDF report generation
- Admin dashboard (password-protected)
- Cron-based follow-up emails (daily at 10:00 UTC)

## Architecture Notes

See [CLAUDE.md](CLAUDE.md) for detailed architecture, route map, and library descriptions intended for AI coding assistants.
