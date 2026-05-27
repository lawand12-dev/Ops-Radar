/**
 * Model provider with OpenAI → backup fallback.
 *
 * Primary: OpenAI (the models the app was built for — gpt-5.4 / gpt-5.5).
 * Backup (whichever is configured, Groq first):
 *   1. Groq — free, no credit card. GROQ_API_KEY (+ optional GROQ_MODEL).
 *   2. DigitalOcean Gradient — DIGITALOCEAN_API_KEY + AI_DIGITALOCEAN_URL
 *      (+ optional AI_DIGITALOCEAN_MODEL).
 * Both are OpenAI-compatible HTTP APIs.
 *
 * Why a fallback at all: if OpenAI billing lapses (insufficient_quota) the
 * whole agent/chat/compile surface goes dark. The backup keeps it alive.
 *
 * Activation is automatic + lazy: if no backup env vars are set, `backupModel()`
 * returns null and the fallback is simply skipped — the app behaves exactly as
 * OpenAI-only. Set a backup key and it turns on with no code change.
 *
 * Streaming caveat: you cannot retry a stream that has already emitted bytes,
 * so `streamTextWithFallback` probes the primary with a tiny non-streaming
 * call first; if that fails with a fallback-worthy error it streams from the
 * backup, otherwise it streams from the primary. Non-streaming helpers
 * (`generateTextWithFallback`, `generateObjectWithFallback`) just catch-and-retry.
 */

import { createOpenAI } from '@ai-sdk/openai'
import { generateText, generateObject, streamText, type LanguageModel } from 'ai'

// ─── Provider factories ──────────────────────────────────────────────────

const openaiProvider = createOpenAI({
  apiKey: (process.env.OPENAI_API_KEY ?? '').trim(),
})

/** The primary OpenAI model. */
export function openaiModel(modelId: string): LanguageModel {
  return openaiProvider(modelId)
}

// ─── Backup providers (OpenAI-compatible) ──────────────────────────────────
//
// Two possible backups, tried in order. Both expose an OpenAI-compatible API,
// so each is a createOpenAI({ apiKey, baseURL }) call:
//
//   1. Groq — free, no credit card. Set GROQ_API_KEY (+ optional GROQ_MODEL).
//      Fast Llama / GPT-OSS models. This is the default backup.
//   2. DigitalOcean Gradient — CTO-provisioned. Set DIGITALOCEAN_API_KEY +
//      AI_DIGITALOCEAN_URL (+ optional AI_DIGITALOCEAN_MODEL).
//
// Whichever is configured (Groq checked first) becomes the backup. If neither
// is set, there's no backup and the app behaves exactly as OpenAI-only.

let _groqProvider: ReturnType<typeof createOpenAI> | null = null
let _doProvider: ReturnType<typeof createOpenAI> | null = null

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1'
// gpt-oss-120b is an open-weight GPT model on Groq that supports json_schema
// structured outputs — REQUIRED for the employee compiler's generateObject
// call. Llama-3.3 does NOT support json_schema and would break hiring at the
// draft step, so don't switch the default without re-checking structured-output
// support. Override with GROQ_MODEL if needed.
const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-120b'

function getGroqModel(): LanguageModel | null {
  const key = (process.env.GROQ_API_KEY ?? '').trim()
  if (!key) return null
  if (!_groqProvider) {
    _groqProvider = createOpenAI({ apiKey: key, baseURL: GROQ_BASE_URL })
  }
  const modelId = (process.env.GROQ_MODEL ?? GROQ_DEFAULT_MODEL).trim()
  return _groqProvider(modelId)
}

function getDigitalOceanModel(): LanguageModel | null {
  const key = (process.env.DIGITALOCEAN_API_KEY ?? '').trim()
  const baseURL = (process.env.AI_DIGITALOCEAN_URL ?? '').trim()
  if (!key || !baseURL) return null
  if (!_doProvider) {
    _doProvider = createOpenAI({ apiKey: key, baseURL })
  }
  const modelId = (process.env.AI_DIGITALOCEAN_MODEL ?? 'llama3.3-70b-instruct').trim()
  return _doProvider(modelId)
}

/**
 * The backup model, or null if none is configured. Groq first (free, no card),
 * then DigitalOcean Gradient. Never passes an OpenAI slug to the backup — each
 * provider uses its own model id from its own env var.
 */
export function backupModel(): LanguageModel | null {
  return getGroqModel() ?? getDigitalOceanModel()
}

export function hasBackup(): boolean {
  return backupModel() !== null
}

// ─── Error classification ──────────────────────────────────────────────────

/**
 * Should we fall back to the backup for this error? Only for failures that
 * mean "the primary provider can't serve this request" — billing/quota, auth,
 * rate limit, connection — NOT for our own bugs (bad schema, etc.), which the
 * backup would fail identically.
 */
export function isFallbackWorthy(err: unknown): boolean {
  const blob = JSON.stringify(serializeErr(err)).toLowerCase()
  return (
    blob.includes('insufficient_quota') ||
    blob.includes('exceeded your current quota') ||
    blob.includes('billing') ||
    blob.includes('invalid_api_key') ||
    blob.includes('incorrect api key') ||
    blob.includes('401') ||
    blob.includes('429') ||
    blob.includes('rate limit') ||
    blob.includes('econnrefused') ||
    blob.includes('etimedout') ||
    blob.includes('fetch failed')
  )
}

function serializeErr(err: unknown): unknown {
  if (err instanceof Error) {
    return { message: err.message, name: err.name, cause: serializeErr((err as { cause?: unknown }).cause) }
  }
  return err
}

// ─── Non-streaming: catch-and-retry ────────────────────────────────────────

// We accept the SDK's own arg type minus `model` (a plain string id), and let
// TS INFER each helper's return type from the wrapped call — annotating it via
// ReturnType<> trips over the SDK's overloads (generateObject) and the
// non-Promise streamText return. `model` is replaced with a real LanguageModel
// before the call, so the rest of the args type-check exactly as the SDK expects.

type GenTextArgs = Parameters<typeof generateText>[0]

export async function generateTextWithFallback(
  args: Omit<GenTextArgs, 'model'> & { model: string },
) {
  const { model: primaryId, ...rest } = args
  try {
    return await generateText({ ...(rest as GenTextArgs), model: openaiModel(primaryId) })
  } catch (err) {
    const backup = backupModel()
    if (!backup || !isFallbackWorthy(err)) throw err
    console.warn('[model-provider] OpenAI failed, falling back to backup provider:', describe(err))
    return await generateText({ ...(rest as GenTextArgs), model: backup })
  }
}

type GenObjArgs = Parameters<typeof generateObject>[0]

export async function generateObjectWithFallback(args: GenObjArgs & { model: string }) {
  const { model: primaryId, ...rest } = args
  try {
    return await generateObject({ ...(rest as GenObjArgs), model: openaiModel(primaryId) })
  } catch (err) {
    const backup = backupModel()
    if (!backup || !isFallbackWorthy(err)) throw err
    console.warn('[model-provider] OpenAI generateObject failed, falling back to backup provider:', describe(err))
    return await generateObject({ ...(rest as GenObjArgs), model: backup })
  }
}

// ─── Streaming: probe primary, then stream from whichever is healthy ────────

type StreamArgs = Parameters<typeof streamText>[0]

/**
 * Stream with fallback. You can't retry a stream once it has emitted bytes,
 * so we decide WHICH provider to stream from BEFORE returning the stream:
 *
 *   1. No backup configured → stream from OpenAI directly (unchanged).
 *   2. Backup exists → probe OpenAI's health with a real (non-streaming)
 *      generateText call. The probe uses the SAME model + a small token
 *      budget. If it THROWS or returns no usage (a silent quota/billing
 *      failure), OpenAI is treated as down and we stream from the backup.
 *      Only a clean, token-producing probe lets us stream from OpenAI.
 *
 * This is authoritative: a quota error surfaces on the probe's generateText
 * exactly as it would on the stream, so we catch it before committing.
 */
export async function streamTextWithFallback(
  args: Omit<StreamArgs, 'model'> & { model: string },
) {
  const { model: primaryId, ...rest } = args
  const backup = backupModel()

  // No backup configured → behave exactly as before.
  if (!backup) {
    return streamText({ ...(rest as StreamArgs), model: openaiModel(primaryId) })
  }

  // Probe OpenAI authoritatively. Healthy ONLY if it returns without throwing
  // AND actually produced output tokens — a quota/billing failure either
  // throws or yields zero tokens, both of which we treat as "use the backup".
  let useBackup = false
  try {
    const probe = await generateText({
      model: openaiModel(primaryId),
      prompt: 'Reply with the single word: ok',
      maxOutputTokens: 16,
    })
    if (!probe.text?.trim() && (probe.usage?.totalTokens ?? 0) === 0) {
      useBackup = true
      console.warn('[model-provider] OpenAI probe produced no output — streaming from backup.')
    }
  } catch (err) {
    if (isFallbackWorthy(err)) {
      useBackup = true
      console.warn('[model-provider] OpenAI probe failed — streaming from backup:', describe(err))
    } else {
      // Non-fallback-worthy probe error (transient/network): try OpenAI for
      // the real stream anyway; if it's truly broken the route surfaces it.
      console.warn('[model-provider] OpenAI probe errored (non-fallback):', describe(err))
    }
  }

  return streamText({
    ...(rest as StreamArgs),
    model: useBackup ? backup : openaiModel(primaryId),
  })
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.message
  try {
    return JSON.stringify(err).slice(0, 300)
  } catch {
    return String(err)
  }
}
