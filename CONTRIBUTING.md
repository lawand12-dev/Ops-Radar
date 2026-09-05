# Contributing to OpsRadar

Thanks for improving OpsRadar. The project is becoming an open-source operations intelligence tool for client-service businesses.

## Before you start

- Read the [open-source scope](docs/OPEN_SOURCE.md).
- Search existing issues and discussions before opening a new one.
- Do not include real client data, API keys, access tokens, exported production records, or personally identifiable information in issues, pull requests, fixtures, or screenshots.
- Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md); do not create a public issue.

## Good first contributions

- Add or improve a transparent rule in `src/lib/open-core/`.
- Add a documented CSV mapping or anonymized fixture.
- Improve setup, accessibility, or deployment documentation.
- Fix a reproducible bug with a focused regression test.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
npm run lint
npm run build
```

The current application still contains optional integrations and hosted-SaaS surfaces. Their variables are documented in `.env.example`; never commit your `.env.local`.

## Pull requests

Keep pull requests focused. Explain the user problem, implementation trade-offs, and how you verified the change. For changes to operations logic, include the assumptions, thresholds, and a small anonymized example in the PR description.

By contributing, you agree that your contributions are licensed under the [Apache-2.0 License](LICENSE).
