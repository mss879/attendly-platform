import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventAccess } from "@/lib/supabase/auth";
import { customTicketSchema } from "@/lib/validation";
import { validSeatIds } from "@/lib/seating";
import { portalUrl } from "@/lib/config";
import { issueSeatTickets, sendTicketsEmail } from "@/lib/tickets";

// Organizer-issued ("custom") tickets: hand a seat to a guest without a
// booking or payment slip — comps, VIPs, sponsors, walk-in sales taken
// offline. The guest gets the same per-seat QR codes and the same personal
// portal as a self-service booking, so the gate scanner works unchanged.

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const access = await getEventAccess(eventId);
  if (!access) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { event } = access;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = customTicketSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid ticket details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { fullName, email, phone, batch, notify } = parsed.data;

  // Seats must exist in this event's plan.
  const validIds = validSeatIds(event.seating);
  const invalid = parsed.data.seats.filter((s) => !validIds.has(s));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: `Not a seat on this event's plan: ${invalid.join(", ")}` },
      { status: 400 }
    );
  }
  const seats = [...parsed.data.seats].sort();

  const supabase = createAdminClient();

  // Friendlier than a raw constraint error; the unique index below is what
  // actually makes this race-safe.
  const { data: clashes } = await supabase
    .from("booked_seats")
    .select("seat_no")
    .eq("event_id", event.id)
    .in("seat_no", seats)
    .returns<{ seat_no: string }[]>();
  if (clashes && clashes.length > 0) {
    return NextResponse.json(
      {
        error: `Already taken: ${clashes.map((c) => c.seat_no).join(", ")}. Pick different seats.`,
        takenSeats: clashes.map((c) => c.seat_no),
      },
      { status: 409 }
    );
  }

  // The ticket is issued outright — there is no payment to verify.
  const { data: registration, error: insertError } = await supabase
    .from("registrations")
    .insert({
      event_id: event.id,
      full_name: fullName,
      email,
      phone,
      batch,
      payment_status: "verified",
      source: "custom",
    })
    .select()
    .single();
  if (insertError || !registration) {
    console.error("[custom-ticket] registration insert failed:", insertError);
    return NextResponse.json(
      { error: "Could not create the ticket — please try again." },
      { status: 500 }
    );
  }

  // Deleting the registration cascades to seats and tickets, so any failure
  // below rolls the whole issue back.
  async function rollback() {
    await supabase.from("registrations").delete().eq("id", registration.id);
  }

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
      const { data: nowTaken } = await supabase
        .from("booked_seats")
        .select("seat_no")
        .eq("event_id", event.id)
        .in("seat_no", seats)
        .returns<{ seat_no: string }[]>();
      return NextResponse.json(
        {
          error: "Those seats were just taken — pick different seats.",
          takenSeats: (nowTaken ?? []).map((c) => c.seat_no),
        },
        { status: 409 }
      );
    }
    console.error("[custom-ticket] seat claim failed:", seatsError);
    return NextResponse.json(
      { error: "Could not reserve those seats — please try again." },
      { status: 500 }
    );
  }

  const { tickets, error: ticketError } = await issueSeatTickets(
    supabase,
    registration.id,
    seats
  );
  if (!tickets) {
    await rollback();
    return NextResponse.json({ error: ticketError }, { status: 500 });
  }

  const link = portalUrl(registration.access_token);
  const emailSent = notify
    ? await sendTicketsEmail({
        to: email,
        eventName: event.name,
        fullName,
        batch,
        tickets,
        portalUrl: link,
        custom: true,
      })
    : false;

  return NextResponse.json({
    ok: true,
    registrationId: registration.id,
    portalUrl: link,
    emailSent,
    tickets: tickets.map((t) => ({
      seatNo: t.seat_no,
      ticketNumber: t.ticket_number,
    })),
  });
}
