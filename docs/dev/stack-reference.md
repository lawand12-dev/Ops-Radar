# Stack Reference — exact-version API truth (2026-05-27)

> **Why this exists.** Several tools in OpsRadar's stack post-date or straddle an LLM's training cutoff (Next 16, React 19, Tailwind v4, Vercel AI SDK v6, Nango, Trigger.dev v4, Supabase `ssr` 0.10, Notion SDK v5). A coding agent's default knowledge is *stale* for these — it will confidently emit APIs that were renamed, removed, or inverted. **Read the relevant section before writing code against any of these libraries.** Every version is pinned to `opsradar/package.json` and verified against Context7 + official docs (May 2026).
>
> Path alias (`tsconfig.json`): `<npm>/*` → `./src/*`. Import as `<npm>/lib/...`.

---

## ⚠️ The highest-risk training-data deltas (read this first)

These are the mistakes most likely to ship silently. Each is confirmed live in this repo.

| If you're about to write… | The current/correct API is… | Why it bites |
|---|---|---|
| `tool({ parameters: z.object(...) })` (AI SDK) | `tool({ inputSchema: z.object(...) })` | Schema **silently ignored** → model hallucinates tool args. #1 stale-API mistake. |
| `generateText({ maxSteps: 5 })` | `stopWhen: stepCountIs(5)` | `maxSteps` removed in v5/v6. |
| Supabase `cookies: { get, set, remove }` | `cookies: { getAll, setAll }` | `createServerClient` **throws** without `getAll` → breaks auth app-wide. |
| `notion.databases.query({ database_id })` | `notion.dataSources.query({ data_source_id })` | SDK v5 / API `2025-09-03` "data sources" model — old endpoint removed. |
| Next 16: assume `fetch`/route `GET` is cached | **uncached by default**; opt in with `force-cache` / `force-static` | Inverse of the Next 13 mental model → stale data or missing opt-in. |
| `openai('gpt-x')` expecting Chat Completions | default is `/responses`; use `openai.chat('gpt-x')` | Repo's Groq/DO backups **require** `.chat()` — `/responses` breaks their tool-calling. |
| `import { task } from '@trigger.dev/sdk/v3'` | `from '@trigger.dev/sdk'` | `/v3` subpath deprecated (repo still uses it — don't propagate). |
| `langfuse` `forceFlush()` / `LangfuseSpanProcessor` | repo is **3.x** → `flushAsync()` + `client.trace()` | The OTel pattern is **v4-only**; don't migrate without bumping the package. |
| `import { flag } from '@vercel/flags'` | `from 'flags/next'` | Package renamed to `flags`. |
| `import * as X from '@radix-ui/react-dialog'` | `import { Dialog as X } from 'radix-ui'` | Unified `radix-ui` package; per-primitive packages superseded. |
| Tailwind `@tailwind base/components/utilities` | `@import "tailwindcss";` + `@theme {}` in CSS | v4 is CSS-first; no `tailwind.config.js`. |
| `React.forwardRef(...)` for a new component | `ref` is a plain prop | forwardRef on the deprecation path in React 19. |
| Adding `.default()` to the employee-compiler Zod schema | DON'T | Breaks Groq strict `json_schema` backup (every key must be `required`). |
| Nango: hand-roll OAuth / set `connectionId` / use `userId` filter | `tags.end_user_id` + `listConnections({ tags })` | You can't set the connectionId; the `userId` filter is deprecated. |

---

## 🔧 Live repo footguns surfaced by this research (not yet fixed)

Three of the four found on 2026-05-27 are now fixed; #4 is a standing guardrail.

1. ✅ **FIXED (2026-05-27)** — `next.config.ts` had a deprecated empty `images: { domains: [] }` block; removed (it allowed no remote images either way — behavior-neutral). If remote images are needed later, use `images: { remotePatterns: [{ protocol, hostname }] }`.
2. ✅ **RESOLVED (2026-05-27)** — React Compiler is OFF. The explicit `babel-plugin-react-compiler` direct dep was removed from `package.json` (it's now only `next@16`'s optional transitive peer). `next.config.ts` does NOT set `reactCompiler: true`, so the compiler does **not** run: do **not** strip manual `useMemo`/`useCallback` on the assumption it covers them. To enable later: set `reactCompiler: true` (Next supplies the plugin) + a build/dev test.
3. ✅ **FIXED (2026-05-27)** — all `@trigger.dev/sdk/v3` imports migrated to `@trigger.dev/sdk` (`trigger.config.ts` + `src/trigger/*`). Don't reintroduce the `/v3` subpath in new files.
4. ⚠️ **STANDING GUARDRAIL** — `langfuse@3.x` is the legacy pre-OTel SDK. AI SDK `experimental_telemetry` spans are NOT auto-exported on 3.x; real traces come from explicit `client.trace()` calls. Don't "fix" the apparent disconnect by adding a span processor — that needs `langfuse@4`.

---

# Bleeding-edge core


## next @ 16.2.2

Current stable line is 16.2.x (16.2.4 GA'd ~Apr 2026). This repo pins `^16.2.2`. **The single biggest
trap: this is App-Router-only Next 16 — almost every Next ≤14 / early-15 reflex is now wrong.**

### ⚠️ Training-data deltas (what I'd otherwise get wrong)
- **`params` / `searchParams` are `Promise`s.** In pages/layouts/route handlers you MUST `await` them
  (Server Component) or `use()` them (Client Component). Sync access was removed in 16 (was a temp
  shim in 15). Correct page signature:
  ```tsx
  export default async function Page(props: {
    params: Promise<{ vertical: string }>
    searchParams: Promise<{ [k: string]: string | string[] | undefined }>
  }) {
    const { vertical } = await props.params
    const { sort } = await props.searchParams
  }
  ```
- **`cookies()`, `headers()`, `draftMode()` are async.** `const h = await headers()` — NOT `headers().get(...)`.
  Sync access is fully removed in 16 (escape hatch: cast to `UnsafeUnwrappedHeaders`/`UnsafeUnwrappedCookies`, avoid it).
- **`fetch` is NOT cached by default.** Default is `cache: 'no-store'`-equivalent. To cache you must opt in
  with `fetch(url, { cache: 'force-cache' })` or `{ next: { revalidate: N } }`. (Reverse of the old Next 13 "everything cached" mental model.)
- **Route Handler `GET` is NOT cached by default.** Add `export const dynamic = 'force-static'` to cache a GET. POST/etc never cached.
- **Turbopack is the DEFAULT bundler** for `next dev` AND `next build`. **This repo opts back into webpack**
  via `next dev --webpack` / `next build --webpack` (because `@sentry/nextjs` webpack plugin + custom
  webpack tree-shaking are configured). If a custom webpack config is detected without `--webpack`, the build **fails by design**.
- **`reactCompiler` is a top-level `NextConfig` key, stable but OFF by default.** Enable via
  `reactCompiler: true` in `next.config.ts` (no longer `experimental.reactCompiler`). **NOTE: this repo
  installs `babel-plugin-react-compiler@1.0.0` but `next.config.ts` does NOT set `reactCompiler: true`** —
  so unless wired elsewhere, the compiler may be inert. Don't assume auto-memoization is active here.
- **`middleware.ts` → `proxy.ts`.** Renamed; exported fn is `proxy`. **`proxy.ts` runs on the Node.js
  runtime (not Edge), and the runtime is NOT configurable.** So `fs`/`crypto`/native modules now work in proxy.
  Config flags renamed too: `skipMiddlewareUrlNormalize` → `skipProxyUrlNormalize`.
- **`images.domains` is deprecated** → use `images.remotePatterns: [{ protocol, hostname }]`.
- **`use cache` / `cacheComponents`**: the `'use cache'` directive requires `cacheComponents: true` in
  `next.config.ts` (this unifies PPR + dynamicIO; the old `experimental.dynamicIO`/`experimental.ppr` flags are folded in). Not enabled in this repo.
- Route handler signatures: `export async function GET(req: Request, ctx: { params: Promise<{ id: string }> })` —
  `ctx.params` is a Promise. Use `NextResponse` from `next/server`. Set `export const runtime = 'nodejs'` / `'edge'` and `export const dynamic = 'force-dynamic'` as needed.
- Metadata files are typed functions: `sitemap(): MetadataRoute.Sitemap`, `robots(): MetadataRoute.Robots` from `import type { MetadataRoute } from 'next'`.

### How this repo uses it
- `next.config.ts` (`/opsradar/next.config.ts`): `NextConfig` typed; wraps export in `withSentryConfig(...)`;
  big CSP via `async headers()`; `async redirects()`; `outputFileTracingIncludes/Excludes` for the
  knowledge-base skills tree. **Footgun present:** `images: { domains: [] }` is the deprecated key
  (should migrate to `remotePatterns`). No `reactCompiler`, no `cacheComponents`.
- `src/app/layout.tsx`: `export default async function RootLayout(...)` and `const headerList = await headers()`
  — the correct async-`headers()` pattern. Fonts via `next/font/google` (`Inter_Tight`, `Instrument_Serif`, `JetBrains_Mono`) exposed as CSS vars.
- `src/app/api/dashboard/usage/route.ts`: canonical Next 16 route handler — `export const dynamic = 'force-dynamic'`,
  `export const runtime = 'nodejs'`, `export async function GET()`, returns `NextResponse.json(...)`.
- `src/app/sitemap.ts`, `src/app/robots.ts`: typed `MetadataRoute.*` metadata routes.
- Build/dev scripts force webpack: `"dev": "next dev --webpack"`, `"build": "next build --webpack"`.

### Sources
- https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/upgrading/version-16.mdx
- https://nextjs.org/docs/app/guides/upgrading/version-16
- https://nextjs.org/blog/next-16
- https://nextjs.org/docs/messages/middleware-upgrade-guide
- https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/03-api-reference/05-config/01-next-config-js/cacheComponents.mdx

---

## react @ 19.2.4 + react-dom @ 19.2.4

React 19 is GA; 19.2.x is current. The deltas below are the high-frequency LLM mistakes.

### ⚠️ Training-data deltas (what I'd otherwise get wrong)
- **`ref` is a regular prop now — `forwardRef` is NOT needed** (and is on the deprecation path).
  ```tsx
  function MyInput({ placeholder, ref }: { placeholder?: string; ref?: React.Ref<HTMLInputElement> }) {
    return <input placeholder={placeholder} ref={ref} />
  }
  ```
  Do not wrap new components in `React.forwardRef`. `ref` callbacks may now return a cleanup function.
- **`use()` API** reads a Promise OR context conditionally (can be called inside `if`/loops, unlike hooks):
  `const value = use(promise)`, `const theme = use(ThemeContext)`. Use it to unwrap promises in Client
  Components (e.g. Next 16 `params`/`searchParams` promises passed to a client child).
- **Form Actions + `useActionState`** (NOT the old `useFormState` from react-dom): returns
  `[state, formAction, isPending]`. Reducer signature is `(prevState, formData) => newState`. Wire to `<form action={formAction}>`.
- **`useFormStatus`** (from `react-dom`) gives `{ pending, data, method, action }` to a child *inside* a `<form>`.
- **`useOptimistic`** for optimistic UI; pairs with actions.
- **React Compiler (GA)** auto-memoizes — **stop hand-writing `useMemo`/`useCallback`/`React.memo`** when
  the compiler is on. The `eslint-plugin-react-hooks` "preserve-manual-memoization" lint flags manual memo
  that should be removed. (Caveat for THIS repo: compiler isn't enabled in `next.config.ts`, so manual memo still matters here until that's turned on.)
- `ReactDOM.render` / `hydrate` are gone — `createRoot` / `hydrateRoot` only (Next handles this, but relevant for any custom mount).
- New `<Context>` can be rendered directly as a provider: `<ThemeContext value={...}>` (no `.Provider` needed).
- `forwardRef`, string refs, legacy context, and `propTypes`/`defaultProps` on function components are removed/deprecated.

### How this repo uses it
- `package.json` pins exact `react`/`react-dom` `19.2.4` (not a caret) + `@types/react@^19`, `@types/react-dom@^19`.
- `src/components/ui/toast.tsx`: `"use client"`; uses `React.ComponentProps<typeof SonnerToaster>` (the modern prop-type pattern, not `React.FC`).
- Server Components are the default; `layout.tsx` is an async Server Component. Client components are explicitly `"use client"`.

### Sources
- https://github.com/reactjs/react.dev/blob/main/src/content/blog/2024/12/05/react-19.md
- https://github.com/reactjs/react.dev/blob/main/src/content/reference/react/useActionState.md
- https://github.com/reactjs/react.dev/blob/main/src/content/reference/react-dom/hooks/index.md
- https://github.com/reactjs/react.dev/blob/main/src/content/reference/eslint-plugin-react-hooks/lints/preserve-manual-memoization.md

---

## babel-plugin-react-compiler @ 1.0.0 (React Compiler GA)

### ⚠️ Training-data deltas
- **1.0.0 is the GA release** (no longer `experimental`/RC, no `eslint-plugin-react-compiler` rename churn —
  the lints live in `eslint-plugin-react-hooks`).
- In Next 16 the supported enable path is **`reactCompiler: true` in `next.config.ts`** (top-level, stable key) — Next then wires the babel plugin for you.
  You generally do NOT hand-author a `.babelrc` for this in a Next app.
- The compiler only optimizes code that follows the Rules of React; it bails out (silently, safely) on violations rather than miscompiling.
- With the compiler on, **manual `useMemo`/`useCallback`/`memo` become redundant** and should be removed; keep them only where the compiler bails.

### How this repo uses it
- Installed as a devDependency (`babel-plugin-react-compiler: 1.0.0`) **but `next.config.ts` does NOT set
  `reactCompiler: true`.** Treat the compiler as OFF unless/until that flag is added — i.e. do not strip
  manual memoization in this repo on the assumption the compiler covers it.

### Sources
- https://github.com/vercel/next.js/blob/v16.2.2/docs/01-app/02-guides/upgrading/version-16.mdx (reactCompiler stable, off by default)
- https://react.dev/learn/react-compiler

---

## tailwindcss @ 4 + @tailwindcss/postcss @ 4

Tailwind v4 is a ground-up rewrite. **The biggest trap: there is NO `tailwind.config.js` — config is CSS-first.**

### ⚠️ Training-data deltas
- **One CSS import replaces the three v3 directives.** Use `@import "tailwindcss";` — NOT
  `@tailwind base; @tailwind components; @tailwind utilities;`.
- **No `tailwind.config.js` by default.** Theme tokens are declared in CSS inside `@theme { ... }` as CSS
  custom properties (e.g. `--color-primary`, `--font-sans`, `--text-hero`). These auto-generate utilities
  (`bg-primary`, `text-hero`, etc.) and are also available as plain `var(--...)`.
- **PostCSS plugin moved to its own package**: `@tailwindcss/postcss` (NOT `tailwindcss` as the PostCSS
  plugin, and NOT `autoprefixer`/`postcss-import` — v4 handles import + prefixing internally).
  `postcss.config.mjs` is just `{ plugins: { "@tailwindcss/postcss": {} } }`.
- Content/`content: [...]` globs are auto-detected — you usually don't configure source paths.
- `@layer` usage differs; custom utilities via `@utility`. `theme()` function calls in CSS still work but prefer `var(--token)`.
- Browser target is modern (uses native cascade layers, `@property`, `color-mix()`); no IE/old-Safari support.
- The `tailwind` npm package in deps is a meta/no-op-ish entry; the real engine is `tailwindcss@4` + `@tailwindcss/postcss@4`.

### How this repo uses it
- `src/app/globals.css`: opens with `@import "tailwindcss";` then a large `@theme { ... }` block defining the
  full design system as CSS vars — fonts (`--font-sans`/`--font-serif`/`--font-mono`), a locked type scale
  (`--text-hero`, `--text-display`, `--text-h1..h4`, `--text-body*`, etc. with paired
  `--text-*--line-height`/`--letter-spacing`/`--font-weight`). This IS the Tailwind config.
- `postcss.config.mjs`: `{ plugins: { "@tailwindcss/postcss": {} } }` — the v4 PostCSS wiring, nothing else.
- Components consume tokens both as utilities and raw vars, e.g. `toast.tsx` uses `bg-[var(--color-surface)]`, `rounded-[var(--radius-md)]`.
- Fonts are injected by `next/font` in `layout.tsx` as `--font-sans-loaded` etc., then `@theme` maps `--font-sans` → `var(--font-sans-loaded)`.

### Sources
- https://tailwindcss.com/docs/upgrade-guide
- https://tailwindcss.com/docs/theme (CSS-first `@theme`)
- https://tailwindcss.com/docs/installation/using-postcss (`@tailwindcss/postcss`)

---

## typescript @ 5 + eslint @ 9 + eslint-config-next @ 16.2.1

### ⚠️ Training-data deltas
- **ESLint 9 = flat config only.** Config is `eslint.config.mjs` (NOT `.eslintrc.json`), built with
  `defineConfig([...])` / `globalIgnores([...])` imported from `eslint/config`.
- **`eslint-config-next` ships flat subpath exports**: import `eslint-config-next/core-web-vitals` and
  `eslint-config-next/typescript` and spread them — NOT `{ extends: ["next/core-web-vitals"] }` (the old `.eslintrc` string-extends form).
- `next lint` is being retired in Next 16 — lint via the ESLint CLI directly (`eslint`).
- tsconfig: `"moduleResolution": "bundler"`, `"module": "esnext"`, `"jsx": "react-jsx"`, `"noEmit": true`,
  and the `next` TS plugin (`"plugins": [{ "name": "next" }]`). Path alias is the unusual `<npm>/*` → `./src/*`.

### How this repo uses it
- `eslint.config.mjs`: `defineConfig([ ...nextVitals, ...nextTs, globalIgnores([...]) ])` with
  `import nextVitals from "eslint-config-next/core-web-vitals"` + `import nextTs from "eslint-config-next/typescript"`.
- `package.json` lint script is bare `"lint": "eslint"` (flat-config auto-discovery), not `next lint`.
- `tsconfig.json`: `bundler` resolution, `strict: true`, `next` plugin, `paths: { "<npm>/*": ["./src/*"] }`.

### Sources
- https://nextjs.org/docs/app/api-reference/config/eslint
- https://eslint.org/docs/latest/use/configure/migration-guide (flat config)

---

## radix-ui @ 1.4.3 + shadcn @ 4.1.2

### ⚠️ Training-data deltas
- **Single unified `radix-ui` package** replaces the dozens of `@radix-ui/react-*` packages.
  Import named primitives: `import { Dialog as DialogPrimitive } from "radix-ui"` — NOT
  `import * as DialogPrimitive from "@radix-ui/react-dialog"`. It's tree-shakable, so the unified import doesn't bloat the bundle.
- shadcn's `new-york` style (the current default) generates components using the unified `radix-ui` import.
  Migrate old projects with the shadcn `migrate radix` command; then remove unused `@radix-ui/react-*` deps.
- shadcn CLI is the standalone `shadcn` package (NOT `shadcn-ui`); components are copied into the repo (`src/components/ui/`), not installed as a runtime dep.

### How this repo uses it
- `package.json`: `"radix-ui": "^1.4.3"` (unified) + `"shadcn": "^4.1.2"`; no `@radix-ui/react-*` entries.
- shadcn-style primitives live under `src/components/ui/` (e.g. `toast.tsx`), styled with design-system CSS vars.
- Toasts are delegated to `sonner` (wrapped as `Toaster` in `src/components/ui/toast.tsx`), not a Radix Toast primitive.

### Sources
- https://ui.shadcn.com/docs/changelog/2026-02-radix-ui (unified radix-ui package)
- https://ui.shadcn.com/docs/changelog/2025-06-radix-ui
- https://ui.shadcn.com/docs/cli (`shadcn` CLI)

---

## framer-motion @ 12 + lucide-react @ 1.8

### ⚠️ Training-data deltas
- **`framer-motion` v12**: the package is still importable as `framer-motion`, but the project rebranded to
  **Motion** and the canonical package is now `motion` (`import { motion } from "motion/react"`). v12 keeps
  `framer-motion` working; new code may see either import. React 19 compatible. `motion(Component)` for custom components; `LazyMotion`/`m` for bundle splitting.
- **`lucide-react` @ 1.8**: tree-shakable named icon imports `import { ArrowRight, Sparkles } from "lucide-react"`.
  Don't deep-import (`lucide-react/dist/...`) and don't use the old monolithic default import.

### How this repo uses it
- `package.json`: `"framer-motion": "^12.38.0"`, `"lucide-react": "^1.8.0"`. Imports use the `framer-motion` name.
- `src/app/page.tsx`: `import { ArrowRight, Sparkles } from "lucide-react"` — the correct named-import form.
- Marketing scroll/animation wrappers (e.g. `RevealOnScroll`) sit in `src/components/marketing/`.

### Sources
- https://motion.dev/docs/react (Motion / framer-motion v12)
- https://lucide.dev/guide/packages/lucide-react

---

# AI / Agent layer

## ai @ 6.0.191 (Vercel AI SDK v6)

**What's current.** v6 is the current major. The v5→v6 migration guide
(`ai-sdk.dev/docs/migration-guides/migration-guide-6-0`) is the authority. The `parameters`
→ `inputSchema` rename and `maxSteps` → `stopWhen` happened in **v5** and persist in v6;
an LLM trained on v4-era code gets both wrong.

### ⚠️ Training-data deltas (the dangerous ones)

1. **Tool param key is `inputSchema`, NOT `parameters`.** This is the single most common
   stale-API mistake. v4 used `parameters`. v5/v6 use `inputSchema`. A v4-trained model
   will silently write a tool whose schema is ignored.
   ```ts
   // ❌ v4 (WRONG in v6 — schema silently dropped)
   tool({ description: '...', parameters: z.object({ q: z.string() }), execute })
   // ✅ v6 (correct — matches src/lib/hire/ai-sdk-tools.ts)
   import { tool } from 'ai'
   tool({ description: '...', inputSchema: z.object({ q: z.string() }), execute })
   ```

2. **Multi-step is `stopWhen: stepCountIs(n)`, NOT `maxSteps: n`.** `maxSteps` is removed.
   ```ts
   // ❌ v4              // ✅ v6
   generateText({ ..., maxSteps: 5 })
   import { stepCountIs } from 'ai'
   generateText({ ..., stopWhen: stepCountIs(5) })
   ```
   This repo uses `stopWhen: stepCountIs(3)` in the hire route and
   `stopWhen: stepCountIs(spec.maxSteps ?? 12)` in the agent loop.

3. **UIMessage vs ModelMessage are distinct types.** `useChat` produces `UIMessage[]`
   (rich parts: text / tool-call / tool-result / data parts). Core functions
   (`streamText`/`generateText`) want `ModelMessage[]`. You MUST convert at the route
   boundary with `await convertToModelMessages(messages)` (it's async in v6). A model
   that passes `useChat` messages straight to `streamText` will break on tool turns.
   - Note: this repo's hire route builds `ModelMessage[]` by hand (`{role, content}`)
     because it uses a **bespoke SSE protocol**, not `useChat`. So `convertToModelMessages`
     is not used here — do not add it.

4. **`streamText(...)` is NOT awaited and returns synchronously.** You consume it via
   `result.fullStream` (async iterable), `result.textStream`, or
   `result.toUIMessageStreamResponse()`. `result.usage` is a **Promise** (await it).
   The repo's `streamTextWithFallback` is `async` only because it *probes* the primary
   first; the underlying `streamText` itself is sync.

5. **`fullStream` part shapes changed.** Parts are discriminated by `.type`:
   `'text-delta'` (read `.text`, NOT `.textDelta`), `'tool-call'` (read `.input`, NOT
   `.args`), `'tool-result'` (read `.output`, NOT `.result`), `'error'` (read `.error`).
   The repo's hire route relies on exactly these names:
   ```ts
   for await (const part of result.fullStream) {
     if (part.type === 'text-delta')      send({ delta: part.text })
     else if (part.type === 'tool-call')  toolSteps.push({ name: part.toolName })
     else if (part.type === 'tool-result') sniff(part.output)   // .output, not .result
     else if (part.type === 'error')      handle(part.error)
   }
   ```

6. **`experimental_telemetry` is the (still-experimental) prefix.** v6 has not renamed it
   to stable `telemetry`. Shape: `{ isEnabled: boolean, functionId?: string, metadata?:
   Record<string, AttributeValue> }`. `metadata` rejects `undefined` values — compact the
   object first (the repo's `makeTelemetry` does this).

7. **`generateObject` strict JSON schema now defaults to `true` for OpenAI in v6.** This is
   a live footgun for the repo's Groq backup path: OpenAI strict mode + Groq's gpt-oss
   strict json_schema both require **every** property in `required`. Zod `.default()` marks
   a field optional → Groq rejects with "`required` is required … including every key in
   properties". `src/lib/employees/compile.ts` therefore has **zero `.default()`** in its
   schema by design. Do not "tidy" it by adding defaults. To loosen for OpenAI specifically:
   `providerOptions: { openai: { strictJsonSchema: false } }`.

8. **`toUIMessageStreamResponse()`** is the v6 way to return a streaming `Response` to a
   `useChat` client (replaces v3/v4 `toDataStreamResponse` / `toAIStreamResponse`). The
   repo does NOT use it (custom SSE), but `runAgentStream` returns the raw `streamText`
   result so a future caller could.

### How this repo uses it
- `src/lib/ai/model-provider.ts` — typed wrappers around `generateText` / `generateObject`
  / `streamText`; `Parameters<typeof generateText>[0]` etc. to inherit the SDK arg type and
  swap `model: string` for a real `LanguageModel`.
- `src/lib/agents/loop.ts` — `streamText` + `stepCountIs` + `ToolSet` + `prepareStep`
  (returns `{ activeTools: string[] }` to gate on-demand tools) + `experimental_telemetry`
  + `onError` / `onFinish` callbacks. Stream errors arrive via `onError`, NOT try/catch.
- `src/lib/hire/ai-sdk-tools.ts` — 9 `tool({ description, inputSchema, execute })` defs,
  Zod schemas. Note the deliberate `z.unknown()` on `propose_custom_employee.description`
  to survive weak backup models passing an object instead of a string.

### Sources
- https://ai-sdk.dev/docs/migration-guides/migration-guide-6-0
- https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0 (parameters→inputSchema, maxSteps→stopWhen origin)
- https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
- https://ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages
- https://ai-sdk.dev/docs/ai-sdk-ui/reading-ui-message-streams

---

## @ai-sdk/openai @ 3.0.65 (OpenAI provider v3)

**What's current.** Provider v3, paired with `ai` v6. `createOpenAI({ apiKey, baseURL })`
returns a provider function.

### ⚠️ Training-data deltas

1. **The default `openai(model)` targets the `/responses` API, NOT `/chat/completions`.**
   This flipped in AI SDK 5. v4-trained code assumes the default is Chat Completions — it
   is not. Three explicit selectors:
   ```ts
   const p = createOpenAI({ apiKey })
   p('gpt-5.5')            // → /responses  (the v5+ default)
   p.chat('gpt-5.5')       // → /chat/completions  (classic)
   p.responses('gpt-5.5')  // → /responses  (explicit)
   ```

2. **This repo depends on `.chat()` for OpenAI-compatible backups (Groq / DigitalOcean).**
   `src/lib/ai/model-provider.ts` calls `_groqProvider.chat(modelId)` and
   `_doProvider.chat(modelId)` precisely because Groq does NOT fully implement `/responses`.
   The default `provider(model)` (Responses API) makes Groq reject multi-message tool
   conversations with *"Input contains unsupported content types or unsupported content
   fields."* Verified in prod. **Never "simplify" `.chat(modelId)` to `provider(modelId)`
   on a Groq/DO baseURL — it breaks tool-calling against those providers.**

3. **Provider-defined tools live under `openai.tools.*`** (e.g. `openai.tools.customTool`,
   web search, file search) and require the Responses API model (`openai.responses(...)`).
   Not used in this repo, but a model may hallucinate the old plugin shape.

4. **`providerOptions.openai`** is where OpenAI-specific knobs go (`reasoningEffort`,
   `strictJsonSchema`, `serviceTier`, `promptCacheKey`, `textVerbosity`, …) — NOT top-level
   on `generateText`. v4-trained code sometimes puts these at the call root.

### How this repo uses it
- `createOpenAI({ apiKey })` for the primary OpenAI provider (default Responses API path).
- `createOpenAI({ apiKey, baseURL })` + `.chat(modelId)` for Groq
  (`https://api.groq.com/openai/v1`) and DigitalOcean Gradient backups.
- Providers are lazy singletons gated on env presence (`GROQ_API_KEY`, `DIGITALOCEAN_API_KEY`
  + `AI_DIGITALOCEAN_URL`).

### Sources
- https://ai-sdk.dev/providers/ai-sdk-providers/openai
- https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0 (default → Responses API)

---

## openai @ 6.33.0 (official OpenAI SDK)

**What's current.** SDK v6. The Responses API (`client.responses.create`) is the modern
surface; `client.chat.completions.create` remains supported. As of the file reads, this
repo does **not** import the bare `openai` SDK in the AI hot path — all OpenAI traffic goes
through `@ai-sdk/openai` + the `ai` package wrappers. The dependency is present for any
direct/edge use.

### ⚠️ Training-data deltas
1. **Responses API is the headline surface in v6.** `client.responses.create({ model,
   input, ... })` uses `input` (not `messages`) and returns `output` items, not
   `choices[].message`. A model trained on `chat.completions` will reach for the wrong shape.
2. **Use the AI SDK wrapper here, not this SDK directly.** If you find yourself importing
   `openai` to call the model, you almost certainly want `@ai-sdk/openai` via
   `model-provider.ts` instead, so the fallback + quota tracking apply.

### How this repo uses it
- Indirect / latent. No direct `import OpenAI from 'openai'` in the agent/chat/compile path
  found during the file sweep. Treat any new direct usage as a smell; prefer the wrapper.

### Sources
- https://platform.openai.com/docs/api-reference/responses
- https://github.com/openai/openai-node

---

## @anthropic-ai/sdk @ 0.92.0 (Anthropic TypeScript SDK)

**What's current.** Pre-1.0 but actively maintained; `messages.create` is stable. There is
no `src/lib/anthropic.ts` and no direct import in the agent path — the SDK is installed and
ready (the agent loop's `inferLlmProvider` already routes `claude*` model slugs to the
`'anthropic'` quota bucket) but Claude models are not yet wired into the loop.

### ⚠️ Training-data deltas
1. **Tool schema field is `input_schema` (snake_case), JSON Schema — NOT Zod, NOT
   `inputSchema`.** This is the inverse trap of the AI SDK: the raw Anthropic SDK wants
   `tools: [{ name, description, input_schema: {...jsonschema} }]`. Do not confuse with the
   AI SDK's camelCase `inputSchema`. (Helper `betaZodTool` from
   `@anthropic-ai/sdk/helpers/beta/zod` lets you pass Zod, but it's a beta helper.)
2. **`max_tokens` is required** on `messages.create`.
3. **Model IDs are dated snapshots**, e.g. `claude-sonnet-4-5-20250929`. A model that emits
   `claude-3-5-sonnet-20240620` or `claude-3-opus-20240229` is using stale IDs.
4. **Prompt caching** is via `cache_control: { type: 'ephemeral' }` on a content block (or
   the top-level `cache_control` param). `max_tokens: 0` pre-warms the cache without
   generating. Some caching still rides beta headers depending on feature.
5. **`beta.messages.toolRunner`** is the SDK's built-in agentic tool loop (auto-executes
   tools, supports `stream: true`, returns a `BetaMessageStream`). New since the tool-use
   era; a stale model will hand-roll the loop.

### How this repo uses it
- Not yet. Quota plumbing anticipates it (`inferLlmProvider` in `src/lib/agents/loop.ts`).
  When wired, prefer the AI SDK's `@ai-sdk/anthropic` provider so the fallback + telemetry
  + quota wrappers apply uniformly, rather than this raw SDK.

### Sources
- https://github.com/anthropics/anthropic-sdk-typescript (helpers.md, examples/tools.ts)
- https://docs.claude.com/en/docs/build-with-claude/prompt-caching

---

## @trigger.dev/sdk + @trigger.dev/build + @trigger.dev/react-hooks @ 4.4.6 (Trigger.dev v4)

**What's current.** v4 is GA (since 2025). The repo runs 4.4.6 across SDK/build/react-hooks.

### ⚠️ Training-data deltas (v3 → v4)

1. **Import path: `@trigger.dev/sdk`, NOT `@trigger.dev/sdk/v3`.** The `/v3` subpath is
   **deprecated** in v4 (still works for now). **This repo currently imports the deprecated
   path everywhere**: `trigger.config.ts` (`defineConfig` from `@trigger.dev/sdk/v3`),
   `src/trigger/dispatch-custom-employees.ts` (`logger, schedules, tasks`), and
   `src/trigger/run-custom-employee.ts` (`task, logger, metadata`). It runs, but is on the
   deprecated alias — flag for cleanup, don't propagate to new files. New files should use
   `import { task } from '@trigger.dev/sdk'`.

2. **`handleError` → `catchError` rename.** The error hook is renamed (old name removed in a
   future version). New signature is a single destructured object:
   `catchError({ payload, ctx, task, error, retry, retryAt, retryDelayInMs })`.

3. **Lifecycle hooks take ONE destructured object now.** v3 positional args are gone:
   - `onSuccess({ payload, ctx, task, output })` (was `(payload, output, { ctx })`)
   - `onFailure({ payload, ctx, task, error })`
   - `onStart` deprecated → `onStartAttempt({ payload, ctx, task })`
   The repo's `run: async (payload, { ctx }) => {}` still works (the `run` function keeps the
   2-arg form), but any hook a model adds in v3 positional style will be wrong.

4. **`init` deprecated → middleware + `locals`.** Per-run client setup moves to
   `tasks.middleware(...)` + `locals.create()/set()`. v3-style `init: async () => ({...})`
   then reading `init` off the run context is gone.

5. **Queues must be predefined.** On-demand queue creation in `trigger(data, { queue: {
   name, concurrencyLimit } })` is removed. Define with `const q = queue({ name,
   concurrencyLimit })` and attach to the task, or pass `{ queue: "name" }` referencing a
   predefined queue.

6. **`triggerAndWait` returns a `Result`, not raw output.** `const r = await
   t.triggerAndWait(p); if (r.ok) r.output` — or `r.unwrap()`. v3 code that reads the output
   directly off the awaited value is wrong.

7. **`batchTrigger` handle no longer carries `.runs`.** Retrieve via `batch.retrieve(handle.
   batchId)`. The repo only reads `batchHandle.batchId` (safe). Don't add `.runs` access.

8. **`ctx` removals:** `ctx.attempt.id`, `ctx.attempt.status`, `ctx.task.exportName` gone;
   use `ctx.attempt.number`. The repo only reads `ctx.run.id` (safe).

9. **`toolTask` / `ai.tool()` deprecated** in favor of `schemaTask` + AI SDK `tool()` +
   `ai.toolExecute()`. Not used here.

### Things this repo does that ARE correct for v4
- `schedules.task({ id, cron: "5 * * * *", run })` — correct shape.
- `task({ id, maxDuration, retry, run })` — correct.
- `tasks.batchTrigger<typeof runCustomEmployee>(id, items)` with per-item `{ payload,
  options: { tags } }` — correct fan-out pattern.
- `metadata.set("key", value)` for realtime run metadata (consumed by react-hooks
  `useRealtimeRunsWithTag` in the planned Team Live widget) — correct.
- `defineConfig({ project, dirs: ["./src/trigger"], retries, maxDuration })` — correct
  config shape (only the import subpath is stale).

### How this repo uses it
- `trigger.config.ts` — project `proj_fzucghkouxfijvqirvre`, `dirs: ["./src/trigger"]`,
  global retry (3 attempts, exp backoff), `maxDuration: 3600`.
- `src/trigger/dispatch-custom-employees.ts` — `schedules.task` hourly at `:05`, scans
  `custom_employees`, hand-rolls cron-hour matching, `tasks.batchTrigger` fans out.
- `src/trigger/run-custom-employee.ts` — `task`, synthesizes an `AgentSpec` and calls the
  shared `runAgent` loop; `metadata.set(...)` for the realtime widget; per-task `retry`.

### Sources
- https://trigger.dev/docs/migrating-from-v3
- https://trigger.dev/changelog/trigger-v4-ga
- https://trigger.dev/docs/building-with-ai

---

## langfuse @ 3.38.20 (legacy core SDK, OTel SDK is v4)

**What's current.** **Langfuse rewrote the TS SDK as v4 (OpenTelemetry-based) in
August 2025.** `langfuse@3.x` is the **legacy** core SDK — pre-OTel, with the classic
`new Langfuse()` client + `client.trace()` + `client.flushAsync()` API. **This repo is
intentionally on the legacy 3.x SDK** and uses exactly that legacy API. This is the biggest
"the internet says do it differently" trap in this stack.

### ⚠️ Training-data deltas / version-mismatch traps

1. **Do NOT migrate this repo to the OTel pattern unless you bump to `langfuse@4`.** The
   modern docs (and most 2025 search results) describe v4: `LangfuseSpanProcessor` +
   `@opentelemetry/sdk-node` `NodeSDK` + an `instrumentation.ts`, with
   `experimental_telemetry: { isEnabled: true }` auto-flowing into Langfuse spans. That
   stack is **v4-only**. On 3.x there is no `LangfuseSpanProcessor`.

2. **v3 flush is `flushAsync()`; v4 uses `forceFlush()`.** The repo correctly calls
   `client.flushAsync()`. A v4-trained model will try `forceFlush()` and it won't exist.

3. **The repo's `makeTelemetry()` returns the AI SDK telemetry config
   (`{ isEnabled, functionId, metadata }`), but on 3.x those AI SDK spans are NOT
   auto-exported** to Langfuse (no span processor wired). The actual Langfuse traces come
   from the explicit `client.trace({ name, userId, sessionId, tags, metadata })` calls in
   `startTrace`. The `experimental_telemetry` block is plumbing for a future v4/OTel upgrade
   and is harmless on 3.x. Don't "fix" the apparent disconnect by adding a span processor —
   that requires the v4 SDK.

4. **`new Langfuse({ publicKey, secretKey, baseUrl, flushAt, flushInterval })`** is the v3
   constructor (the repo's). v4 splits config differently and centers on the exporter.

### How this repo uses it (`src/lib/observability/langfuse.ts`)
- Lazy singleton `new Langfuse({...})`; disables (returns null) when keys are unset →
  no-op tracing in dev.
- `startTrace(name, ctx)` → `client.trace({...})` with per-tenant `userId`, `sessionId`
  (= chat session or `agentRunId`), and `tags` (`source:`, `agent:`, `tier:`).
- `flushLangfuse()` → `client.flushAsync()`, called at the end of each Vercel function /
  stream `onFinish` / `finally` so traces survive function freeze.
- `makeTelemetry(ctx)` → AI SDK `experimental_telemetry` config, attached to every
  `generateText` / `streamText` in the agent loop and hire route.

### Sources
- https://www.npmjs.com/package/langfuse (3.x = legacy core)
- https://langfuse.com/docs/observability/sdk/overview (v4 OTel rewrite, Aug 2025)
- https://langfuse.com/docs/integrations/vercel-ai-sdk (LangfuseSpanProcessor — v4 only)
- https://ai-sdk.dev/providers/observability/langfuse

---

## flags @ 4.0.6 (Vercel Flags SDK)

**What's current.** Flags SDK v4. Imports come from `flags/next` (`flag`, `dedupe`). This
is the renamed successor to the old `@vercel/flags` package.

### ⚠️ Training-data deltas

1. **Package is `flags`, import path `flags/next` — NOT `@vercel/flags`.** A model trained
   on the older package will import from `@vercel/flags` (wrong) or the deprecated
   `@vercel/flags/next`. The repo uses `import { flag, dedupe } from 'flags/next'`.

2. **`flag({ key, adapter, defaultValue, identify, description })` returns a CALLABLE.** You
   invoke the exported flag as a function to read it: `if (await agentLoopEnabled()) {...}`.
   A model may treat it as a value/object.

3. **`dedupe(fn)`** memoizes per-request work (the repo wraps `identifyUser` so Statsig user
   resolution runs once per request). Don't call the identify logic directly.

4. **Adapters are pluggable; this repo hand-rolls a `statsigAdapter`** instead of using a
   published `@flags-sdk/statsig`. The adapter contract is `{ decide({ key, defaultValue })
   => Promise<T> }`. Don't replace it with the published adapter without checking the
   `@statsig/statsig-node-core` (`Statsig.newShared`/`shared`/`checkGate`) wiring it depends
   on.

### How this repo uses it (`src/lib/flags/index.ts`)
- One `statsigAdapter<boolean>()` backing ~12 boolean kill-switch flags
  (`customEmployeesEnabled`, `agentLoopEnabled`, `gmailToolkitEnabled`, per-toolkit gates…).
- Fail-open/closed via explicit `defaultValue` per flag when Statsig is unreachable.
- `resolveToolkitFlag(flagKey)` indirection so the toolkit registry can name a kill switch
  by string without editing the flags module.
- Consumed in `src/lib/agents/loop.ts`: `agentLoopEnabled()` master switch +
  `resolveToolkitFlag(entry.killSwitchFlag)` per-toolkit kill switches resolved in parallel.

### Sources
- https://flags-sdk.dev/ (Vercel Flags SDK — `flags` package, `flags/next`)
- Repo: `src/lib/flags/index.ts`

---

## Quick "is this stale?" checklist for a coding agent

| If you're about to write… | Stop. The v6/current API is… |
|---|---|
| `tool({ parameters: ... })` | `tool({ inputSchema: ... })` |
| `generateText({ maxSteps: 5 })` | `stopWhen: stepCountIs(5)` |
| `part.textDelta` / `part.args` / `part.result` in `fullStream` | `part.text` / `part.input` / `part.output` |
| `openai('gpt-x')` expecting Chat Completions | default is `/responses`; use `openai.chat('gpt-x')` for Chat Completions (Groq/DO need this) |
| `import { task } from '@trigger.dev/sdk/v3'` | `from '@trigger.dev/sdk'` |
| `handleError` hook in a task | `catchError` |
| `init: async () => ({...})` in a task | middleware + `locals` |
| `langfuse` `forceFlush()` / `LangfuseSpanProcessor` | this repo is 3.x → `flushAsync()` + `client.trace()` (OTel pattern is v4 only) |
| `import { flag } from '@vercel/flags'` | `from 'flags/next'` |
| Adding `.default()` to the employee compiler Zod schema | DON'T — breaks Groq strict json_schema backup |
| `.chat(modelId)` → "simplify" to `provider(modelId)` on Groq/DO | DON'T — breaks tool-calling (Responses API unsupported there) |

---

# Data / Infra / Integration layer

## @nangohq/node @ 0.70.4 (+ @nangohq/frontend @ 0.70.4)

Nango is the OAuth broker. **Most of this API is absent from training data** — Nango
post-dates many model cutoffs and replaced Composio in this repo on 2026-05-26. Treat the
entire surface as "verify, don't recall".

### ⚠️ Training-data deltas

- **The broker itself.** A model is likely to reach for Composio / Merge / Paragon idioms,
  or to hand-roll OAuth. None of that applies. The only correct client is
  `new Nango({ secretKey })` from `@nangohq/node`.
- **You do NOT choose the connectionId.** When OAuth completes via a Connect Session, Nango
  auto-generates an opaque `connection_id`. There is no way to set it at session-create time.
  You correlate later by **tagging the session** with your own user id and querying by tag.
- **`createConnectSession` uses `tags`, not `userId`.** The recommended pattern is
  `tags: { end_user_id, end_user_email, organization_id }`. The session token is **short-lived
  (~30 min)** and returned at `data.token` — pass it to the frontend `@nangohq/frontend` SDK.
- **`listConnections({ tags })` filters by tag (AND match).** The legacy `userId` param is
  **deprecated** — do not use it. Tag filtering requires ALL provided tags to match.
- **Returned connections carry an `errors[]` array.** A connection with `errors.length > 0`
  is in an auth-broken state — must be treated as "not connected", not proxied through.
  Models won't know this field exists.
- **Proxy = `nango.proxy(...)` or the verb helpers `nango.get/post/patch/put/delete(...)`.**
  Each takes `{ endpoint, providerConfigKey, connectionId, params?, data?, headers?, retries? }`.
  Response is **axios-shaped**: read `res.data`; errors expose `error.response.status`.
- **Webhook verification = `nango.verifyIncomingWebhookRequest(body, headers)`** (boolean).
  Not an HMAC you compute by hand.

### How this repo uses it

`src/lib/nango.ts` is the single integration surface. Key correct-API points:

```ts
import { Nango } from '@nangohq/node'
const nango = new Nango({ secretKey: picked.value.trim() })   // getNango() lazy singleton

// userId → connectionId, source of truth (cached behind L1 Map + L2 Redis):
const { connections } = await nango.listConnections({ tags: { end_user_id: userId } })
const match = connections.find(c =>
  c.provider_config_key === providerConfigKey && (c.errors ?? []).length === 0)
const connectionId = match?.connection_id ?? null

// proxy call (verb helpers, axios-shaped response):
const res = await nango.get({ endpoint, providerConfigKey, connectionId, params, headers })
return res.data as T
```

- `NANGO_TOOLS` maps OpsRadar slugs → Nango provider config keys. **Slugs differ from the
  obvious name**: `gmail → 'google-mail'`, `toggl → 'toggl-track'`, `bamboo_hr → 'bamboohr'`,
  `google_calendar → 'google-calendar'`. Don't guess provider keys — read this map.
- **Key resolution** (`getNango`): `NANGO_SECRET_KEY` (override, always wins) →
  `NANGO_SECRET_KEY_<NANGO_ENV>` → `NANGO_SECRET_KEY_DEV` (only when `NODE_ENV !== production`;
  prod fails fast rather than silently using dev creds). Memory note: the free Nango tier
  exposes ONE secret key → use bare `NANGO_SECRET_KEY` in Vercel.
- **Two-tier cache** for `resolveConnectionId`: L1 in-process Map (5s TTL, absorbs the burst
  of parallel tool calls in one agent loop) + L2 Upstash Redis (60s, cross-instance freshness)
  + in-flight de-dup Map (concurrent callers share one `listConnections` round-trip).
  **Never caches nulls** (a miss right after connect must not stick).
- On a proxied **401/403/404**, `nangoProxy` calls `clearConnectionCache` and re-tags the
  Sentry event as an auth error ("customer needs reconnect") vs infra failure.
- CSP in `next.config.ts` allowlists `api.nango.dev` (backend + ingress) and
  `connect.nango.dev` (the hosted Connect UI iframe, also in `frame-src`).

### Footguns

- `listConnections` `tags` typing is loose in the SDK — the repo casts via
  `as unknown as Parameters<...>[0]`. Expected for 0.70.x.
- Proxy errors are axios errors; status lives at `err.response?.status`. The repo duck-types
  this in `extractHttpStatus` rather than depending on the axios error class.
- Rotating the secret key requires a fresh lambda (the client is cached in `_nango`) → redeploy.

### Sources
- https://github.com/nangohq/nango/blob/master/docs/reference/backend/backend-sdk/node.mdx
- https://github.com/nangohq/nango/blob/master/docs/guides/auth/auth-guide.mdx
- https://github.com/nangohq/nango/blob/master/docs/guides/auth/connection-tags-configuration-metadata.mdx
- https://github.com/nangohq/nango/blob/master/docs/guides/platform/proxy-requests.mdx

---

## @supabase/ssr @ 0.10.3 (+ @supabase/supabase-js @ 2.100.1)

### ⚠️ Training-data deltas — THE BIG ONE

- **`get` / `set` / `remove` cookie methods are REMOVED.** This is the single most common
  stale-code source. Older models emit:
  ```ts
  // ❌ WRONG — deprecated, removed in current @supabase/ssr
  cookies: {
    get(name) { return cookieStore.get(name)?.value },
    set(name, value, options) { cookieStore.set({ name, value, ...options }) },
    remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
  }
  ```
  The **only** supported shape now is `getAll` / `setAll`:
  ```ts
  // ✅ CORRECT
  cookies: {
    getAll() { return cookieStore.getAll() },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) =>
        cookieStore.set(name, value, options))
    },
  }
  ```
  `createServerClient` **throws** if `cookies.getAll` is absent. `setAll` is optional but
  required wherever the client writes refreshed tokens (route handlers, middleware).
- **`createServerClient` `options` is REQUIRED** (unlike `createBrowserClient` where it's
  optional). Second arg is the **anon** key (never the service role key for SSR/auth).
- **`auth.getUser()` vs `auth.getSession()`**: `getUser()` / `getClaims()` hit the auth server
  and return verified identity; `getSession()` reads cookies with no network call. For
  authz decisions use `getUser()`. Models often use `getSession().user` for auth gating — wrong.
- **Lazy session init**: session isn't loaded until the first `getUser()`/`getSession()`.
  Create a **new client per request**; never share across requests.
- Cookie chunking is automatic; default cookie name `sb-{project-ref}-auth-token`;
  default encoding `base64url`.

### How this repo uses it

Three distinct clients — do not conflate:

1. `src/lib/supabase-ssr.ts` — `getSessionSupabaseClient()`. **Cookie-aware, RLS-scoped.**
   Uses `cookies()` from `next/headers`, the correct `getAll`/`setAll` pattern, anon key.
   `setAll` is wrapped in try/catch — when called from a Server Component (read-only cookie
   store) it swallows the error; middleware/route handlers persist cookies via the response.
   ```ts
   const cookieStore = await cookies()
   return createServerClient<Database>(url, key, {
     cookies: { getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) { try { cookiesToSet.forEach(({name,value,options}) =>
                  cookieStore.set(name,value,options)) } catch {} } },
   })
   ```
   - `getActualUserId()` → literal session user (auth/profile/team). Falls back to
     `DEV_CLIENT_ID` only when `NODE_ENV !== production`.
   - `getCurrentUserId()` → **effective** (org-owner) user id for all data-scoping queries,
     so invited team members see the owner's data. Adds one round-trip via `org.ts`.
2. `src/lib/supabase-server.ts` — `getServerSupabaseClient()`. **Service-role, bypasses RLS.**
   Plain `createClient` from `@supabase/supabase-js` with
   `auth: { autoRefreshToken: false, persistSession: false }`. Cached singleton. Falls back to
   anon key with a one-time warning if `SUPABASE_SERVICE_ROLE_KEY` is missing. Used by
   service-role writers (e.g. `usage/track.ts` writing `external_api_usage`).
3. **No `middleware.ts` exists** in this repo. Session refresh is done inside the SSR helper +
   per-route, not in a Next.js middleware. (Memory note: the new `sb_publishable_` key format
   breaks browser-direct auth → all auth ops route through server-side API routes using
   `getSessionSupabaseClient()`.)

### Footguns

- Don't pass the service-role key to `createServerClient` for auth flows — it ignores RLS and
  has no user session.
- Calling `cookieStore.set` from a pure Server Component throws; the repo's try/catch is load-
  bearing, not optional.
- `database.types.ts` is generated (`npm run types:supabase`) — never hand-edit.

### Sources
- https://github.com/supabase/ssr/blob/main/_autodocs/api-reference/createServerClient.md
- https://github.com/supabase/ssr/blob/main/_autodocs/errors.md
- https://github.com/supabase/ssr/blob/main/_autodocs/configuration.md

---

## @upstash/redis @ 1.37.0 + @upstash/ratelimit @ 2.0.8

### ⚠️ Training-data deltas

- **`Redis.fromEnv()`** reads `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. It
  **throws** if they're absent — wrap in try/catch and degrade if you want it optional.
- ratelimit **v2**: `cacheScripts` deprecated and script hashes hardcoded (v2.0.3+) to cut
  cold-start round-trips. `ephemeralCache` defaults to a `new Map()` (in-process block cache);
  pass `ephemeralCache: false` to disable. `analytics` defaults **off**.
- `slidingWindow(limit, window)`'s `reset` is the **start of the next window**, not an exact
  per-identifier reset — don't present it as a precise countdown.

### How this repo uses it

`src/lib/rate-limit.ts`:
```ts
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL,
                          token: process.env.UPSTASH_REDIS_REST_TOKEN })
new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(limit, '1 h'),
                prefix: `ratelimit:${name}` })
```
- Named limiters per route (`dashboard-coo`, `dashboard-hire`, `integrations-connect`, …),
  all `'1 h'` windows. `getLimiters()` lazily builds the map once; returns `null` if Upstash
  isn't configured.
- **Fail-closed vs fail-open** is explicit: `FAIL_CLOSED_ROUTES` (auth, COO, hire, integration
  connect, health-report) return 503 in prod if the limiter is unavailable or Redis errors;
  everything else fails open (availability over strict limiting).
- 429 response carries `X-RateLimit-Remaining` / `X-RateLimit-Reset`; 503 carries `Retry-After: 30`.
- **Separately**, `src/lib/nango.ts` uses `Redis.fromEnv()` (note: different constructor) as the
  L2 connectionId cache, guarded by try/catch so missing creds → `null` → skip L2.

### Footguns

- `new Redis({url,token})` (rate-limit.ts) vs `Redis.fromEnv()` (nango.ts) read the same env
  vars two different ways — both valid; `fromEnv()` is the one that throws on missing vars.
- The sliding-window `reset` value drives the customer-facing reset date — it's window-start,
  good enough for "resets next hour" but not a precise timer.

### Sources
- https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms
- https://upstash.com/docs/redis/sdks/ratelimit-ts/features
- https://github.com/upstash/ratelimit-js/blob/main/README.md

---

## @sentry/nextjs @ 10.53.1

### ⚠️ Training-data deltas

- **`sentry.client.config.ts` is GONE as the client entrypoint.** v8+ moved client init to
  **`instrumentation-client.ts`** (repo root). Older models put browser `Sentry.init` in
  `sentry.client.config.ts` — wrong for v10.
- **Server + edge init moved to `instrumentation.ts`** via `register()`, which conditionally
  imports `sentry.server.config` (nodejs runtime) and `sentry.edge.config` (edge runtime).
  The standalone `sentry.server.config.ts`/`sentry.edge.config.ts` files still exist but are
  **imported by `instrumentation.ts`**, not auto-loaded.
- **New required exports**: `export const onRequestError = Sentry.captureRequestError`
  (in `instrumentation.ts`, captures Server Component/middleware errors) and
  `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart`
  (in `instrumentation-client.ts`, App Router navigation instrumentation). Models won't emit these.
- **`withSentryConfig(nextConfig, options)`** wraps the Next config. In v10 the bundler/build
  options nest under a **`webpack: { ... }`** key (e.g. `automaticVercelMonitors`,
  `treeshake.removeDebugLogging`) — a flatter shape from older docs is stale.
- `enableLogs: true` and `Sentry.replayIntegration()` are the current option names.

### How this repo uses it

- `instrumentation.ts` (root):
  ```ts
  export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') await import('../sentry.server.config')
    if (process.env.NEXT_RUNTIME === 'edge')   await import('../sentry.edge.config')
  }
  export const onRequestError = Sentry.captureRequestError
  ```
- `instrumentation-client.ts` (root): `Sentry.init({ integrations: [Sentry.replayIntegration()],
  tracesSampleRate: 1, replaysSessionSampleRate: 0.1, replaysOnErrorSampleRate: 1, enableLogs: true,
  sendDefaultPii: true })` + `export const onRouterTransitionStart = Sentry.captureRouterTransitionStart`.
- `sentry.server.config.ts` + `sentry.edge.config.ts`: `Sentry.init` with DSN, `tracesSampleRate: 1`,
  `enableLogs: true`, `sendDefaultPii: true`.
- `next.config.ts`: `export default withSentryConfig(nextConfig, { org: 'opsradar-fu',
  project: 'javascript-nextjs', tunnelRoute: '/monitoring', widenClientFileUpload: true,
  webpack: { automaticVercelMonitors: true, treeshake: { removeDebugLogging: true } } })`.
- **Usage pattern**: `src/lib/nango.ts` calls `Sentry.captureException(err, { level, tags, contexts })`
  with structured `tags` (nango_tool, http_status, is_auth_error) — current API, good model.

### Footguns

- `tunnelRoute: '/monitoring'` must not collide with any matcher (there's no middleware here, so safe).
- CSP must allow `*.ingest.us.sentry.io` + `*.sentry.io` (it does, in `next.config.ts`).

### Sources
- https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
- https://docs.sentry.io/platforms/javascript/guides/nextjs/migration/v7-to-v8/
- https://docs.sentry.io/platforms/javascript/guides/nextjs/

---

## @statsig/statsig-node-core @ 0.19 (+ @statsig/react-bindings @ 3.33, session-replay, web-analytics)

### ⚠️ Training-data deltas

- **This is `statsig-node-core` (Rust-backed), NOT the legacy `statsig-node`.** Different
  package, different API. Models trained on the legacy SDK will use `Statsig.initialize(secret)`
  + plain-object users + `Statsig.checkGate(user, gate)` — wrong shape.
- **`StatsigUser` is now a CLASS, not a type/interface**: `new StatsigUser({ userID, email,
  custom })`. Legacy passed a plain `{ userID }` object.
- **Shared-instance lifecycle**: `Statsig.newShared(secret, options)` / `Statsig.shared()` /
  `Statsig.hasShared()`, then `await client.initialize()`. Gate checks are instance methods:
  `client.checkGate(user, key)`, `client.getFeatureGate(...)`.
- Legacy method renames: `get_config()` → `get_dynamic_config()`; `getPrompt` removed;
  `.get()` on DynamicConfig/Experiment/Layer added in 0.10.0+.
- **Client bindings** (`@statsig/react-bindings`): `useClientAsyncInit(sdkKey, user, { plugins })`
  returns `{ client }` → wrap app in `<StatsigProvider client={client}>`. Plugins:
  `new StatsigAutoCapturePlugin()` (web-analytics), `new StatsigSessionReplayPlugin()`.

### How this repo uses it

- `src/lib/flags/index.ts` — server gating via node-core wrapped by Vercel's `flags/next`:
  ```ts
  import { Statsig, StatsigUser } from '@statsig/statsig-node-core'
  const client = Statsig.hasShared() ? Statsig.shared()
    : Statsig.newShared(secret, { environment: process.env.NODE_ENV ?? 'development' })
  await client.initialize()
  // adapter.decide → client.checkGate(new StatsigUser({ userID }), key)
  ```
  - Custom `statsigAdapter()` bridges `flags`'s `flag({ adapter })` to `client.checkGate`.
    Falls back to each flag's `defaultValue` on any error (fail-open for non-critical flags,
    fail-closed kill switches default `false`). `identify()` is `dedupe`-d per request and reads
    the user via the Supabase SSR helper.
  - Booleans are modeled as Statsig **gates**; non-boolean flags would need a dynamic-config adapter.
  - `resolveToolkitFlag(flagKey)` resolves per-toolkit kill switches by gate key; unknown key → allow.
- `src/components/analytics/statsig-provider.tsx` — client analytics + session replay via
  `useClientAsyncInit` + the two plugins; renders children unwrapped if
  `NEXT_PUBLIC_STATSIG_CLIENT_KEY` is absent (local dev works keyless).
- CSP allowlists `api.statsig.com`, `featureassets.org`, `prodregistryv2.org`, `statsigapi.net`,
  `sessionreplay.statsig.com`, plus `worker-src blob:` (session-replay compiles its worker from a
  blob URL) and `cloudflare-dns.com` (DoH fallback).

### Footguns

- Session replay needs `worker-src 'self' blob:` in CSP — already present; removing `blob:` breaks it.
- `STATSIG_SERVER_SECRET` (server) and `NEXT_PUBLIC_STATSIG_CLIENT_KEY` (client) are distinct keys.

### Sources
- https://docs.statsig.com/server-core/node-core
- https://docs.statsig.com/server-core/migration-guides/node
- https://www.npmjs.com/package/@statsig/statsig-node-core

---

## stripe @ 22.1.1

### ⚠️ Training-data deltas

- **stripe-node v12+ pins the API version to whatever shipped with the SDK**, and the TS types
  match that version. For **stripe@22.x the pinned API version is `2026-04-22.dahlia`** (the
  "basil" release names — `2025-07-30.basil` etc. — are older). If you set `apiVersion`
  manually it must be a **literal the installed types know about**, or TS complains.
- A common stale instinct is to pin an old `apiVersion: '2023-10-16'`-style string. With v22
  the types won't accept arbitrary old versions; prefer **omitting `apiVersion`** to inherit the
  SDK default, or set exactly `'2026-04-22.dahlia'`.

### How this repo uses it

- **Note**: customers' own Stripe is brokered via **Nango** (`stripe` slug in `NANGO_TOOLS`),
  not the `stripe` npm SDK — agents read MRR/invoices through `nangoProxy`. The `stripe` package
  is for **OpsRadar's own SaaS billing**. (Memory: Stripe Connect is blocked by the founder's
  country — never suggest Connect; customers bring their own key via Nango.)
- When instantiating for OpsRadar billing, the correct shape is:
  ```ts
  import Stripe from 'stripe'
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)   // inherits 2026-04-22.dahlia
  // or explicitly: new Stripe(key, { apiVersion: '2026-04-22.dahlia' })
  ```

### Footguns

- Don't copy an old `apiVersion` literal from training data — it'll fail typecheck against v22 types.

### Sources
- https://github.com/stripe/stripe-node/blob/master/CHANGELOG.md
- https://docs.stripe.com/api/versioning
- https://www.npmjs.com/package/stripe

---

## @notionhq/client @ 5.22.0

### ⚠️ Training-data deltas — the second-biggest trap after Supabase

- **SDK v5 + API version `2025-09-03` introduced "data sources".** A database is now a
  *container* that holds one or more **data sources**. This is a **breaking** model change.
- **`databases.query` is REPLACED by `dataSources.query`.** Old code:
  ```ts
  // ❌ WRONG for v5 / 2025-09-03
  await notion.databases.query({ database_id, filter, sorts })
  ```
  Correct:
  ```ts
  // ✅ query a DATA SOURCE, not a database
  await notion.dataSources.query({ data_source_id, filter, sorts, start_cursor, page_size })
  ```
- **Writes parent off a data source**: `pages.create({ parent: { data_source_id }, properties })`.
  (Database-parented `pages.create({ parent: { database_id } })` still appears in docs for the
  container case, but in the multi-source model you target the data source.)
- **`databases.create` takes `initial_data_source`** to seed the schema (properties live on the
  data source, not the database container).
- **Default version**: `@notionhq/client` v5 defaults `notionVersion` to **`2025-09-03`**. You
  can opt into `2026-03-11` via `new Client({ auth, notionVersion: '2026-03-11' })`. The legacy
  `databases.query` endpoint is removed from the SDK as of v5.
- The deprecated **"List databases"** endpoint is gone.

### How this repo uses it

- `src/lib/notion/client.ts`: `getNotionClient(userId)` → `new Client({ auth: accessToken })`.
  **It does NOT pass `notionVersion`** → relies on the SDK v5 default `2025-09-03`. Upgrading the
  package to a version whose default changes would silently shift API behavior — pin intentionally
  if that matters.
  - `withNotionRetry(op, maxRetries=3)` retries on `rate_limited`/5xx with 500ms→1500ms→4500ms
    backoff, using `APIResponseError.isAPIResponseError` + `APIErrorCode.{RateLimited,
    InternalServerError, ServiceUnavailable, GatewayTimeout}`.
- `src/lib/notion/create-brain.ts`: 20 `databases.create({ ..., initial_data_source: {...} })`
  calls. The IDs stored in `notion_workspaces.databases[slug]` are **data-source IDs**.
- `src/lib/notion/helpers.ts`: reads via `dataSources.query({ data_source_id })`, writes via
  `pages.create({ parent: { data_source_id }, ... })`, upserts via `pages.update({ page_id })`.
  Agents only touch these helpers, never the SDK directly.
- `src/lib/notion/export-markdown.ts`: paginates `dataSources.query({ data_source_id,
  start_cursor, page_size: 100 })` (some calls cast through `as unknown` for loose v5 typing).

### Footguns

- Any model-generated `notion.databases.query(...)` is wrong here — it won't exist / won't return
  rows under 2025-09-03. Always `dataSources.query`.
- The jsonb column is named `databases` for legacy reasons but stores data-source IDs (+ page IDs
  for curated pages, prefixed `__`). Don't assume the value is a database_id.
- Notion rate limit ~3 req/s per token — never bypass `withNotionRetry`.

### Sources
- https://developers.notion.com/docs/upgrade-guide-2025-09-03
- https://developers.notion.com/docs/upgrade-faqs-2025-09-03
- https://github.com/makenotion/notion-sdk-js (README + _autodocs/endpoints-core.md, endpoints-pages.md)
- https://www.npmjs.com/package/@notionhq/client

---

## resend @ 6.9.4

### ⚠️ Training-data deltas

- API is stable across recent majors: `new Resend(apiKey)` then
  `await resend.emails.send({ from, to, subject, html })`. v6 returns `{ data, error }` rather
  than throwing on API errors — check `error`, don't only try/catch. Models that `await` and
  assume a throw-on-error contract miss the `error` field.

### How this repo uses it

- `src/lib/notion/email-brain-ready.ts` (+ other senders): `import { Resend } from 'resend'`,
  guarded by `if (!process.env.RESEND_API_KEY) return` so local dev is a no-op. From address
  `OpsRadar <notifications@opsradar.co>`. Email HTML bodies are built by pure functions in
  `src/lib/emails/*` (e.g. `buildThresholdAlertEmail`) — separation of body vs transport.

### Footguns

- Resend is wrapped in fail-soft guards everywhere; a missing key must never throw into a
  customer flow.

### Sources
- https://resend.com/docs/api-reference/emails/send-email
- https://www.npmjs.com/package/resend

---

## @hubspot/api-client @ 13.5.0

### ⚠️ Training-data deltas

- **In this repo, HubSpot data is brokered through Nango** (`hubspot` slug → provider key
  `'hubspot'`), via `nangoProxy`, NOT through `@hubspot/api-client` directly. The npm client's
  `new Client({ accessToken })` + `client.crm.*` namespaces would bypass the broker, the quota
  tracking, and the connection cache — don't introduce it for customer data.
- If the client were used standalone: v13 keeps the `client.crm.contacts.basicApi.getPage()` /
  `client.crm.deals...` namespaced shape; the old flat `hubspot.contacts.get` API is long gone.

### How this repo uses it

- Customer HubSpot reads/writes go through `nangoProxy({ tool: 'hubspot', endpoint, ... })`.
  Toolkit availability is gated by `hubspotToolkitEnabled` (Statsig kill switch in
  `src/lib/flags/index.ts`). The `@hubspot/api-client` package is a transitive/type dependency,
  not the live data path.

### Footguns

- Routing HubSpot calls outside Nango skips quota enforcement (`checkQuota`/`recordUsage` in
  `src/lib/usage/track.ts`) and the L1/L2 connection cache. Always go through `nangoProxy`.

### Sources
- https://github.com/HubSpot/hubspot-api-nodejs
- https://www.npmjs.com/package/@hubspot/api-client
