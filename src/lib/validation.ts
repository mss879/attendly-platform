import { z } from "zod";

/**
 * Attendee details schema. The batch ("Class of") field is per-event:
 * required when the event collects it, absent (stored as "") otherwise.
 */
export function registrationSchema(collectBatch: boolean) {
  return z.object({
    fullName: z.string().trim().min(2, "Please enter your full name").max(120),
    email: z.email("Please enter a valid email address").trim().max(200),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9()\s-]{7,20}$/, "Please enter a valid phone number"),
    batch: collectBatch
      ? z.string().trim().regex(/^(19|20)\d{2}$/, "Please select your batch")
      : z
          .string()
          .trim()
          .optional()
          .default("")
          .transform(() => ""),
  });
}

export type RegistrationInput = z.infer<ReturnType<typeof registrationSchema>>;

export const SLIP_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export const SLIP_ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const BANNER_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Image sources may be empty, a site-local path ("/...") or an http(s) URL. */
function imageSource(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .refine((v) => {
      if (v === "" || v.startsWith("/")) return true;
      try {
        const url = new URL(v);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    }, "Image must be a local path or an http(s) link")
    .optional()
    .default("");
}

/** "Create event" wizard payload (organizer console). */
export const eventDraftSchema = z.object({
  name: z.string().trim().min(3, "Please enter the event name").max(120),
  bannerUrl: imageSource(500),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_RE, "Slug may only contain lowercase letters, numbers and dashes")
    .min(3)
    .max(80),
  edition: z.string().trim().max(80).optional().default(""),
  subtitle: z.string().trim().max(160).optional().default(""),
  description: z.string().trim().min(10, "Please describe your event").max(2000),
  venue: z.string().trim().min(3, "Please enter the venue").max(200),
  startsAt: z.string().trim().optional().default(""), // ISO or "" = TBA
  gatesOpenAt: z.string().trim().optional().default(""),
  schedule: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        value: z.string().trim().min(1).max(120),
      })
    )
    .max(12)
    .optional()
    .default([]),
  teams: z
    .object({
      home: z.object({
        name: z.string().trim().min(1).max(80),
        city: z.string().trim().max(80).optional().default(""),
        crest: imageSource(300),
      }),
      away: z.object({
        name: z.string().trim().min(1).max(80),
        city: z.string().trim().max(80).optional().default(""),
        crest: imageSource(300),
      }),
    })
    .nullable()
    .optional()
    .default(null),
  seating: z.object({
    rows: z
      .array(z.string().trim().regex(/^[A-Z]$/, "Rows are single letters A–Z"))
      .min(1, "Add at least one row")
      .max(26)
      .refine((rows) => new Set(rows).size === rows.length, "Duplicate rows"),
    seatsPerRow: z.number().int().min(1).max(200),
    blocks: z.array(z.number().int().min(1)).min(1).max(8),
    pricePerSeat: z.number().int().min(0).max(1_000_000),
    maxSeatsPerBooking: z.number().int().min(1).max(50),
  }),
  bank: z.object({
    name: z.string().trim().max(120).optional().default(""),
    accountName: z.string().trim().max(120).optional().default(""),
    accountNumber: z.string().trim().max(60).optional().default(""),
    branch: z.string().trim().max(120).optional().default(""),
  }),
  collectBatch: z.boolean().optional().default(false),
});

export type EventDraftInput = z.infer<typeof eventDraftSchema>;

/** Organizer signup payload (/api/host/signup). */
export const hostSignupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email address").trim().max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
