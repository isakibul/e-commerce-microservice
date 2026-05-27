import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL;

export const redis =
  REDIS_URL && REDIS_URL.length > 0
    ? createClient({
        url: REDIS_URL,
      })
    : null;

let connecting: Promise<void> | null = null;

export async function ensureRedisConnected() {
  if (!redis) return;
  if (redis.isOpen) return;
  if (connecting) return connecting;

  connecting = redis.connect().then(
    () => undefined,
    (err: unknown) => {
      connecting = null;
      throw err;
    },
  );

  try {
    await connecting;
  } finally {
    connecting = null;
  }
}
