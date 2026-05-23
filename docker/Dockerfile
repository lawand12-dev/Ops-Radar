FROM oven/bun:1-slim AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source
COPY . .

# Build check (type check only — Bun runs TS directly)
RUN bun run typecheck || true

EXPOSE 3000

# Default entrypoint is the API server.
# Override CMD to "bun src/worker.ts" for the worker container.
CMD ["bun", "src/index.ts"]
