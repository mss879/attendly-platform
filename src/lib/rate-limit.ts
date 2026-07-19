import "server-only";

/**
 * Dependency-free in-memory sliding-window rate limiter for the public API
 * routes. State lives in module memory: it resets on redeploy and is
 * per-instance on serverless hosts, so treat the limits as a strong speed
 * bump rather than a hard global guarantee. Swap for a shared store
 * (e.g. Upstash/Redis) if the platform outgrows a single instance.
 */

interface Window {
  /** Timestamps (ms) of requests inside the current window. */
  hits: number[];
}

const buckets = new Map<string, Window>();

// Drop stale buckets now and then so the map can't grow forever.
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
let lastPrune = Date.now();

function prune(now: number, windowMs: number) {
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, bucket] of buckets) {
    if (bucket.hits.length === 0 || now - bucket.hits[bucket.hits.length - 1] > windowMs) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * Record a hit for `key` and report whether it is within the limit.
 * Sliding window: a request is allowed when fewer than `limit` hits
 * happened in the last `windowMs`.
 */
export function rateLimit(key: string, { limit, windowMs }: RateLimitOptions): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  prune(now, windowMs);

  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Best-effort client IP for rate-limit keys. Behind a proxy/CDN the first
 * x-forwarded-for hop is the client; locally there may be no header at all.
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
