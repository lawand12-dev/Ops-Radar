# OpsRadar

**Open-source operations intelligence for client-service businesses.**

OpsRadar helps agencies, consultancies, development studios, recruiters, and accounting practices find cash, capacity, and margin risk before it becomes a month-end surprise. Its open core evaluates project, time, and invoice data with transparent rules; AI is optional and never the sole basis for a finding.

> **Transition status:** this is a private transition branch. The reusable open core is ready for contribution, but the repository still contains historical startup material that must be removed and scrubbed from Git history before the repository is made public. See [the public-release gate](docs/OPEN_SOURCE.md#public-release-gate).

## What is useful today

`src/lib/open-core/` is dependency-free TypeScript that evaluates a portable client-service dataset and reports evidence-backed risks:

- overdue receivables;
- billable work that is not marked invoiced;
- project hour-budget burn; and
- estimated delivery margin below a stated policy.

Rules are intentionally explicit. A team can inspect every threshold, change it for its operating model, and verify the evidence behind an alert.

## Scope

OpsRadar is built for businesses that deliver work to clients. It is not a generic dashboard for every business type: inventory, ecommerce, hospitality, and product-led SaaS need different source data and rule packs.

Read [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md) for the data model, scope boundaries, roadmap, and release requirements.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

The full Next.js application currently uses optional hosted services and integrations. Follow `.env.example` for those settings; never commit `.env.local`. The open core itself has no runtime dependencies or network access.

## Commands

```bash
npm run dev             # Start the development server
npm run build           # Create a production build and type-check the project
npm run lint            # Run ESLint
npm run types:supabase  # Regenerate Supabase types for the hosted application
```

## Project structure

```
src/
  app/            # Next.js App Router pages and API routes
  lib/open-core/  # Portable, explainable operations rules
  lib/            # Hosted application, integrations, security, and domain logic
  components/     # Shared UI components
docs/
  OPEN_SOURCE.md  # Scope, roadmap, and pre-public-release gate
```

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request. Do not include customer exports, secrets, or personal data in contributions. Security reports belong in the private channel described in [SECURITY.md](SECURITY.md).

## License

Licensed under [Apache-2.0](LICENSE).
