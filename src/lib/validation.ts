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
export const BANNER_ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** "Create event" wizard payload (organizer console). */
export const eventDraftSchema = z.object({
  name: z.string().trim().min(3, "Please enter the event name").max(120),
  bannerUrl: z.string().trim().max(500).optional().default(""),
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
        crest: z.string().trim().max(300).optional().default(""),
      }),
      away: z.object({
        name: z.string().trim().min(1).max(80),
        city: z.string().trim().max(80).optional().default(""),
        crest: z.string().trim().max(300).optional().default(""),
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

/**
 * Organizer-issued ticket payload. Unlike a public booking there is no
 * payment slip and no per-booking seat cap — the organizer is handing out
 * seats directly — but the seat ids are still validated against the event's
 * seating plan by the route.
 */
export const customTicketSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter the guest's full name").max(120),
  email: z.email("Please enter a valid email address").trim().max(200),
  phone: z
    .string()
    .trim()
    .max(32)
    .optional()
    .default("")
    .refine(
      (v) => v === "" || /^\+?[0-9()\s-]{7,20}$/.test(v),
      "Please enter a valid phone number, or leave it blank"
    ),
  batch: z
    .string()
    .trim()
    .max(4)
    .optional()
    .default("")
    .refine(
      (v) => v === "" || /^(19|20)\d{2}$/.test(v),
      "Please pick a valid batch year, or leave it blank"
    ),
  seats: z
    .array(z.string().trim())
    .min(1, "Please select at least one seat")
    .max(50, "You can issue up to 50 seats at a time")
    .refine((arr) => new Set(arr).size === arr.length, "Duplicate seats selected"),
  notify: z.boolean().optional().default(true),
});

export type CustomTicketInput = z.infer<typeof customTicketSchema>;

/**
 * Organizer edit of an existing booking. Seats are optional — omit them to
 * leave the seat assignment untouched. Like custom tickets, the organizer is
 * not bound by the public per-booking seat cap.
 */
export const registrationEditSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter the attendee's full name").max(120),
  email: z.email("Please enter a valid email address").trim().max(200),
  phone: z
    .string()
    .trim()
    .max(32)
    .optional()
    .default("")
    .refine(
      (v) => v === "" || /^\+?[0-9()\s-]{7,20}$/.test(v),
      "Please enter a valid phone number, or leave it blank"
    ),
  batch: z
    .string()
    .trim()
    .max(4)
    .optional()
    .default("")
    .refine(
      (v) => v === "" || /^(19|20)\d{2}$/.test(v),
      "Please pick a valid batch year, or leave it blank"
    ),
  seats: z
    .array(z.string().trim())
    .max(50, "A booking can hold up to 50 seats")
    .refine((arr) => new Set(arr).size === arr.length, "Duplicate seats selected")
    .optional(),
  /** Email the attendee their updated tickets when the seats change. */
  notify: z.boolean().optional().default(true),
});

export type RegistrationEditInput = z.infer<typeof registrationEditSchema>;

/** Side-effect actions on an existing booking. */
export const registrationActionSchema = z.object({
  action: z.enum(["resend", "unverify"]),
});

/** Organizer signup payload (/api/host/signup). */
export const hostSignupSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Please enter a valid email address").trim().max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});
