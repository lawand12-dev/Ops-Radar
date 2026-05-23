import Redis from "ioredis";
import { env } from "../config/env";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: false
    });
    client.on("error", (err) => {
      // Don't crash the process on connection errors; BullMQ handles retry
      console.error("[redis] connection error:", err.message);
    });
  }
  return client;
}
