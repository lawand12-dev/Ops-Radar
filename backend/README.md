# OpsRadar Control Plane (Backend)

This is the OpsRadar control plane — a Hono/Bun server that manages n8n workflow projects, AI-assisted workflow generation, monitoring, and event ingestion. It runs separately from the Next.js frontend on Vercel.

## Run

```bash
bun run src/server.ts
```

For development with auto-reload:

```bash
bun --watch src/server.ts
```

## Requirements

- [Bun](https://bun.sh) runtime
- MySQL database (see migrations/)
- Environment variables (copy `.env.example` to `.env` and fill in values)

## Configuration

Copy `.env.example` to `.env` and set the required variables:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description |
|----------|-------------|
| `MYSQL_HOST` | MySQL host |
| `MYSQL_PORT` | MySQL port (default: 3306) |
| `MYSQL_USER` | MySQL user |
| `MYSQL_PASSWORD` | MySQL password |
| `MYSQL_DATABASE` | MySQL database name |
| `N8N_BASE_URL` | n8n instance URL |
| `N8N_API_KEY` | n8n API key |
| `AI_API_KEY` | AI provider API key |
| `AI_BASE_URL` | AI provider base URL |

See `src/config/env.ts` for the full list of supported variables and their defaults.

## Migrations

SQL migrations live in `migrations/`. Run them in order against your MySQL database:

```bash
mysql -u $MYSQL_USER -p $MYSQL_DATABASE < migrations/001_init.sql
mysql -u $MYSQL_USER -p $MYSQL_DATABASE < migrations/002_monitoring_and_audit.sql
# ... continue in order
```
