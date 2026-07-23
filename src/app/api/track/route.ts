import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  looksLikeBot,
  recordPageView,
  referrerHost,
  visitorHash,
} from "@/lib/traffic";

/**
 * View beacon for event pages. Called from the browser because the event page
 * is ISR-cached and a server render does not happen per visit.
 *
 * This endpoint is public by necessity — anyone can post to it. Two things
 * keep the numbers honest: the per-IP rate limit below, and the fact that
 * repeat posts from one client all share a visitor hash, so padding "views"
 * never moves the unique-visitor count.
 *
 * It always answers 204, success or not. A visitor gets no signal from it and
 * a failed insert must never break the page they are reading.
 */

const trackSchema = z.object({
  eventId: z.uuid(),
  page: z.enum(["event", "book"]).default("event"),
});

// Generous enough for normal reading (reloads, back-and-forth to booking),
// tight enough that a loop cannot run the table up.
const LIMIT = { limit: 20, windowMs: 60_000 };

const noContent = () => new Response(null, { status: 204 });

export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (looksLikeBot(userAgent)) return noContent();

  const ip = clientIp(request);
  if (!rateLimit(`track:${ip}`, LIMIT).allowed) return noContent();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noContent();
  }

  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) return noContent();

  try {
    await recordPageView({
      eventId: parsed.data.eventId,
      page: parsed.data.page,
      visitorHash: visitorHash(ip, userAgent),
      // A view for an event id that no longer exists is rejected by the
      // foreign key, which is what we want — no orphan traffic.
      referrerHost: referrerHost(
        request.headers.get("referer"),
        new URL(request.url).hostname
      ),
    });
  } catch (error) {
    console.error("[track] insert failed:", error);
  }

  return noContent();
}
