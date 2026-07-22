import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { registrationSchema, SLIP_MAX_BYTES } from "@/lib/validation";
import { validateUpload } from "@/lib/upload";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { validSeatIds } from "@/lib/seating";
import { eventPhase } from "@/lib/event-time";
import { sendEmail } from "@/lib/email/send";
import { bookingEmail } from "@/lib/email/templates";
import { portalUrl } from "@/lib/config";
import type { EventRow } from "@/lib/types";

/**
 * Repeat bookings from the same email are allowed, but only this many may
 * sit unreviewed (pending / slip under review) per event at once — so one
 * address can't hold seats en masse without paying.
 */
const MAX_ACTIVE_BOOKINGS_PER_EMAIL = 5;

export async function POST(request: Request) {
  const limited = rateLimit(`book:${clientIp(request)}`, {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Too many booking attempts — please wait a few minutes and try again." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // --- load the event this booking belongs to ---
  const eventSlug = String(form.get("event") ?? "");
  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("slug", eventSlug)
    .maybeSingle<EventRow>();
  if (eventError) {
    console.error("[book] event lookup failed:", eventError);
    return NextResponse.json(
      { error: "Server error — please try again in a moment." },
      { status: 500 }
    );
  }
  if (!event || event.status !== "published") {
    return NextResponse.json({ error: "This event is not open for booking." }, { status: 404 });
  }
  if (eventPhase(event.starts_at) === "completed") {
    return NextResponse.json(
      { error: "This event has ended — bookings are closed." },
      { status: 409 }
    );
  }

  // --- validate the participant details ---
  const parsedDetails = registrationSchema(event.collect_batch).safeParse({
    fullName: String(form.get("fullName") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    batch: String(form.get("batch") ?? ""),
  });
  if (!parsedDetails.success) {
    const message = parsedDetails.error.issues[0]?.message ?? "Invalid details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // --- validate the seats against this event's seating plan ---
  const seating = event.seating;
  const validIds = validSeatIds(seating);
  const seatsSchema = z
    .array(z.string().refine((id) => validIds.has(id), "Invalid seat number"))
    .min(1, "Please select at least one seat.")
    .max(seating.maxSeatsPerBooking, `You can book up to ${seating.maxSeatsPerBooking} seats.`)
    .refine((arr) => new Set(arr).size === arr.length, "Duplicate seats selected.");

  let seatsRaw: unknown;
  try {
    seatsRaw = JSON.parse(String(form.get("seats") ?? "[]"));
  } catch {
    return NextResponse.json({ error: "Invalid seat selection." }, { status: 400 });
  }
  const parsedSeats = seatsSchema.safeParse(seatsRaw);
  if (!parsedSeats.success) {
    const message = parsedSeats.error.issues[0]?.message ?? "Invalid seat selection.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const seats = [...parsedSeats.data].sort();

  // --- validate the payment slip ---
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Please upload your payment slip to complete the booking." },
      { status: 400 }
    );
  }
  const upload = await validateUpload(file, {
    allowedExts: ["jpg", "png", "webp", "pdf"],
    maxBytes: SLIP_MAX_BYTES,
    typeError: "Only JPG, PNG, WebP or PDF files are accepted.",
    sizeError: "The file must be between 1 byte and 5 MB.",
  });
  if (!upload.ok) {
    return NextResponse.json({ error: upload.error }, { status: 400 });
  }

  const { fullName, phone, batch } = parsedDetails.data;
  const email = parsedDetails.data.email.toLowerCase();

  // --- cap unreviewed bookings per email (repeat bookings are welcome) ---
  // ilike with wildcards escaped = case-insensitive match on legacy
  // mixed-case rows too; new rows are stored lowercase.
  // Organizer-issued tickets are created 'verified', so they fall outside
  // this window and never lock a comped guest out of buying their own seats.
  const emailPattern = email.replace(/[\\%_]/g, "\\$&");
  const { count: activeCount, error: lookupError } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .ilike("email", emailPattern)
    .in("payment_status", ["pending", "slip_uploaded"]);
  if (lookupError) {
    console.error("[book] lookup failed:", lookupError);
    return NextResponse.json(
      { error: "Server error — please try again in a moment." },
      { status: 500 }
    );
  }
  if ((activeCount ?? 0) >= MAX_ACTIVE_BOOKINGS_PER_EMAIL) {
    return NextResponse.json(
      {
        error:
          "This email has several bookings awaiting payment review for this event. Please wait for those to be verified, or contact the organizers.",
      },
      { status: 409 }
    );
  }

  // --- quick availability pre-check (friendlier than a constraint error) ---
  const { data: clashes } = await supabase
    .from("booked_seats")
    .select("seat_no")
    .eq("event_id", event.id)
    .in("seat_no", seats)
    .returns<{ seat_no: string }[]>();
  if (clashes && clashes.length > 0) {
    return NextResponse.json(
      {
        error: "Some of your seats were just booked by someone else.",
        takenSeats: clashes.map((c) => c.seat_no),
      },
      { status: 409 }
    );
  }

  // --- create the registration ---
  const { data: registration, error: insertError } = await supabase
    .from("registrations")
    .insert({ event_id: event.id, full_name: fullName, email, phone, batch })
    .select()
    .single();
  if (insertError || !registration) {
    console.error("[book] registration insert failed:", insertError);
    return NextResponse.json(
      { error: "Could not save your booking — please try again." },
      { status: 500 }
    );
  }

  // Deleting the registration cascades to seats and slip rows, so any
  // failure below can roll everything back with one call.
  async function rollback() {
    await supabase.from("registrations").delete().eq("id", registration.id);
  }

  // --- claim the seats (unique constraint per event = race-safe) ---
  const { error: seatsError } = await supabase.from("booked_seats").insert(
    seats.map((seat_no) => ({
      registration_id: registration.id,
      event_id: event.id,
      seat_no,
    }))
  );
  if (seatsError) {
    await rollback();
    if (seatsError.code === "23505") {
      // Lost the race — report which seats are gone now.
      const { data: nowTaken } = await supabase
        .from("booked_seats")
        .select("seat_no")
        .eq("event_id", event.id)
        .in("seat_no", seats)
        .returns<{ seat_no: string }[]>();
      return NextResponse.json(
        {
          error: "Some of your seats were just booked by someone else.",
          takenSeats: (nowTaken ?? []).map((c) => c.seat_no),
        },
        { status: 409 }
      );
    }
    console.error("[book] seat insert failed:", seatsError);
    return NextResponse.json(
      { error: "Could not reserve your seats — please try again." },
      { status: 500 }
    );
  }

  // --- store the payment slip ---
  const storagePath = `${registration.id}/${Date.now()}.${upload.ext}`;
  const { error: uploadError } = await supabase.storage
    .from("payment-slips")
    .upload(storagePath, upload.bytes, { contentType: upload.contentType });
  if (uploadError) {
    console.error("[book] storage upload failed:", uploadError);
    await rollback();
    return NextResponse.json(
      { error: "Slip upload failed — please try again." },
      { status: 500 }
    );
  }

  const { error: slipError } = await supabase.from("payment_slips").insert({
    registration_id: registration.id,
    storage_path: storagePath,
  });
  if (slipError) {
    console.error("[book] slip insert failed:", slipError);
    await rollback();
    return NextResponse.json(
      { error: "Slip upload failed — please try again." },
      { status: 500 }
    );
  }

  // --- straight into review: the slip is already attached ---
  const { error: statusError } = await supabase
    .from("registrations")
    .update({ payment_status: "slip_uploaded" })
    .eq("id", registration.id);
  if (statusError) {
    console.error("[book] status update failed:", statusError);
    await rollback();
    return NextResponse.json(
      { error: "Could not finalize your booking — please try again." },
      { status: 500 }
    );
  }

  const link = portalUrl(registration.access_token);
  const { subject, html } = bookingEmail({
    eventName: event.name,
    fullName,
    batch,
    seats,
    total: seats.length * seating.pricePerSeat,
    reference: registration.id.slice(0, 8).toUpperCase(),
    portalUrl: link,
    bank: event.bank,
  });
  const emailResult = await sendEmail({ to: email, subject, html });

  return NextResponse.json({
    portalUrl: `/r/${registration.access_token}`,
    emailSent: emailResult.sent,
  });
}
