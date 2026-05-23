import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryResult,
  type QueryResultRow
} from "pg";
import { env } from "../config/env";
import { AppError } from "./errors";
import { logError, logInfo, logWarn } from "./logger";

/**
 * Postgres intelligence sidecar — connection layer.
 *
 * Scope
 * -----
 * This pool ONLY serves the Postgres sidecar (embeddings, pattern_cards,
 * failure_clusters, weekly_user_summaries, embedding_jobs). MySQL remains
 * the operational system of record; see `src/lib/db.ts`.
 *
 * Lazy init
 * ---------
 * The pool is constructed on first use. Boot order is: HTTP listener first,
 * then background workers. If POSTGRES_URL is not configured, `getPgPool`
 * throws `PG_NOT_CONFIGURED` and the embedding worker logs + exits cleanly
 * — the rest of the server keeps running.
 *
 * LISTEN/NOTIFY
 * -------------
 * pg's pool cannot be used for LISTEN — the connection is returned to the
 * pool between queries, and LISTEN state is per-connection. We hold a
 * dedicated client outside the pool for each listener. Callers get a
 * `release()` function and MUST call it on shutdown to free the connection
 * and unsubscribe.
 *
 * Timeouts
 * --------
 * Mirrors `db.ts`: per-query timeout via Promise.race against a deadline.
 * Postgres has its own `statement_timeout` GUC, but a wrapper-side timer
 * also catches the case where the server is unreachable mid-query.
 */

const STATEMENT_TIMEOUT_MS = 15_000;
const TRANSACTION_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 10_000;

let pool: Pool | null = null;
let poolErrorListenerAttached = false;

function buildPoolConfig(): PoolConfig {
  const url = env.POSTGRES_URL?.trim();
  if (!url) {
    throw new AppError(
      500,
      "PG_NOT_CONFIGURED",
      "POSTGRES_URL is not set — the Postgres sidecar is unavailable."
    );
  }

  // Conservative defaults. The intelligence sidecar serves ~4 connections
  // for the app (retrieval queries) and a handful more for background
  // workers (each holds 1 for queries + 1 for LISTEN). Postgres connections
  // are processes; we keep the budget tight to avoid surprises on small
  // managed instances.
  return {
    connectionString: url,
    max: env.POSTGRES_POOL_MAX,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    // Apply a server-side statement timeout as a backstop. The wrapper-side
    // timeout still applies; both must agree for the longest-running
    // operation to complete.
    statement_timeout: STATEMENT_TIMEOUT_MS,
    // SSL: rely on the connection string's sslmode= parameter. Managed
    // Postgres providers (DO/Supabase/etc.) ship URLs with sslmode=require
    // baked in; leaving this undefined lets the URL parser drive.
  };
}

export function getPgPool(): Pool {
  if (pool) return pool;

  const config = buildPoolConfig();
  pool = new Pool(config);

  if (!poolErrorListenerAttached) {
    // A pooled client can emit 'error' if the connection drops while idle.
    // Without a listener, node crashes. Log and let pg's reconnect logic
    // replace the client on the next acquire.
    pool.on("error", (error) => {
      logError("db-pg", "Idle Postgres client error", {
        error: error instanceof Error ? error.message : String(error)
      });
    });
    poolErrorListenerAttached = true;
    logInfo("db-pg", "Postgres pool initialized", {
      pool_max: config.max
    });
  }

  return pool;
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  context: Record<string, unknown>
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(
        new AppError(504, "PG_TIMEOUT", "Postgres operation timed out.", {
          timeout_ms: timeoutMs,
          ...context
        })
      );
    }, timeoutMs);
    promise
      .then((value) => resolve(value))
      .catch((error) => reject(error))
      .finally(() => {
        if (timer) clearTimeout(timer);
      });
  });
}

function compactSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim().slice(0, 240);
}

/**
 * The runner type matches mysql2 idiom: callers pass either the pool or a
 * checked-out client (typically inside a transaction). Tests can also pass a
 * fake by structural typing if they implement `query`.
 */
export type PgRunner = Pick<Pool, "query"> | Pick<PoolClient, "query">;

export async function dbPgQuery<R extends QueryResultRow = QueryResultRow>(
  runner: PgRunner,
  sql: string,
  values?: ReadonlyArray<unknown>
): Promise<QueryResult<R>> {
  return withTimeout(
    runner.query<R>(sql, values as unknown[]),
    STATEMENT_TIMEOUT_MS,
    { stage: "query", sql: compactSql(sql) }
  );
}

/**
 * Transaction wrapper. Acquires a dedicated client, runs BEGIN/COMMIT, and
 * always releases the client to the pool. Rollback is best-effort — if the
 * server is unreachable we destroy the client rather than leak it.
 */
export async function withPgTransaction<T>(
  handler: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPgPool();
  const client = await withTimeout(
    pool.connect(),
    CONNECT_TIMEOUT_MS,
    { stage: "acquire_connection" }
  );

  try {
    await withTimeout(client.query("BEGIN"), STATEMENT_TIMEOUT_MS, {
      stage: "begin"
    });
    const result = await withTimeout(handler(client), TRANSACTION_TIMEOUT_MS, {
      stage: "transaction_handler"
    });
    await withTimeout(client.query("COMMIT"), STATEMENT_TIMEOUT_MS, {
      stage: "commit"
    });
    return result;
  } catch (error) {
    try {
      await withTimeout(client.query("ROLLBACK"), STATEMENT_TIMEOUT_MS, {
        stage: "rollback"
      });
    } catch (rollbackError) {
      logWarn("db-pg", "Rollback failed; releasing client with error", {
        error:
          rollbackError instanceof Error
            ? rollbackError.message
            : String(rollbackError)
      });
      // .release(err) destroys the client instead of returning it to the pool
      client.release(rollbackError as Error);
      throw error;
    }
    throw error;
  } finally {
    // If we reach here without a rollback error, return the client cleanly.
    try {
      client.release();
    } catch {
      // already released in the catch path above; safe to swallow
    }
  }
}

/**
 * LISTEN handle. Holds one Postgres connection open for the lifetime of
 * the subscription. Caller MUST invoke `release()` on shutdown.
 */
export interface PgListener {
  release: () => Promise<void>;
  /** True once the underlying connection has been disposed. */
  isClosed: () => boolean;
}

export interface PgNotificationPayload {
  channel: string;
  payload: string | undefined;
  /** Process id of the notifier. Useful for ignoring self-notifies. */
  processId: number;
}

/**
 * Subscribe to a Postgres LISTEN channel. The handler is called for every
 * NOTIFY on that channel from any session.
 *
 * Resilience
 * ----------
 * The dedicated client emits 'error' on connection loss. We log and let
 * the caller decide whether to re-subscribe — the embedding worker pairs
 * this with a poll loop that runs every N seconds so a dropped LISTEN
 * doesn't permanently stall the queue.
 */
export async function createPgListener(input: {
  channel: string;
  onNotification: (payload: PgNotificationPayload) => void;
  onError?: (error: unknown) => void;
}): Promise<PgListener> {
  const pool = getPgPool();
  // Acquire from the pool but DON'T release — we own this client now.
  const client = await withTimeout(
    pool.connect(),
    CONNECT_TIMEOUT_MS,
    { stage: "acquire_listener_connection", channel: input.channel }
  );

  let closed = false;

  client.on("notification", (msg) => {
    if (msg.channel !== input.channel) return;
    try {
      input.onNotification({
        channel: msg.channel,
        payload: msg.payload,
        processId: msg.processId
      });
    } catch (handlerError) {
      logError("db-pg", "LISTEN handler threw", {
        channel: input.channel,
        error:
          handlerError instanceof Error
            ? handlerError.message
            : String(handlerError)
      });
    }
  });

  client.on("error", (error) => {
    logError("db-pg", "Listener client error", {
      channel: input.channel,
      error: error instanceof Error ? error.message : String(error)
    });
    closed = true;
    input.onError?.(error);
    // Best-effort dispose; the caller is expected to re-subscribe.
    try {
      client.release(error);
    } catch {
      // ignore double-release
    }
  });

  // pg requires the channel name to be a quoted identifier. We do not
  // accept arbitrary input here — channels are static literals in the
  // worker — but we still sanitize by rejecting anything not [a-z0-9_].
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(input.channel)) {
    client.release();
    throw new AppError(
      500,
      "PG_BAD_CHANNEL",
      `LISTEN channel must match /^[a-z][a-z0-9_]{0,62}$/: ${input.channel}`
    );
  }
  await client.query(`LISTEN ${input.channel}`);

  logInfo("db-pg", "Listening on Postgres channel", {
    channel: input.channel
  });

  return {
    isClosed: () => closed,
    release: async () => {
      if (closed) return;
      closed = true;
      try {
        await client.query(`UNLISTEN ${input.channel}`);
      } catch {
        // best effort; the client is being disposed anyway
      }
      try {
        client.release();
      } catch {
        // ignore
      }
    }
  };
}

/**
 * Fires a NOTIFY on the given channel. Payload is optional and capped at
 * Postgres's 8000-byte limit; we cap shorter to leave headroom and to
 * discourage callers from shipping data through NOTIFY (it's a wake-up
 * signal, not a message bus).
 */
export async function pgNotify(
  channel: string,
  payload?: string,
  runner?: PgRunner
): Promise<void> {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(channel)) {
    throw new AppError(500, "PG_BAD_CHANNEL", `NOTIFY channel invalid: ${channel}`);
  }
  const effective = runner ?? getPgPool();
  if (payload === undefined) {
    await dbPgQuery(effective, `NOTIFY ${channel}`);
  } else {
    const capped = payload.slice(0, 1024);
    await dbPgQuery(effective, `SELECT pg_notify($1, $2)`, [channel, capped]);
  }
}

/**
 * Graceful shutdown — drain the pool. Called from index.ts on SIGTERM/SIGINT
 * after the HTTP listener has stopped accepting new connections.
 */
export async function closePgPool(): Promise<void> {
  if (!pool) return;
  const current = pool;
  pool = null;
  poolErrorListenerAttached = false;
  try {
    await current.end();
    logInfo("db-pg", "Postgres pool drained");
  } catch (error) {
    logError("db-pg", "Failed to drain pool cleanly", {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
