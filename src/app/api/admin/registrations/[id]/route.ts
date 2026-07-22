import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser, getEventAccess } from "@/lib/supabase/auth";
import { registrationActionSchema, registrationEditSchema } from "@/lib/validation";
import { validSeatIds } from "@/lib/seating";
import { portalUrl } from "@/lib/config";
import { sendEmail } from "@/lib/email/send";
import { bookingEmail } from "@/lib/email/templates";
import { issueSeatTickets, sendTicketsEmail, sortTickets } from "@/lib/tickets";
import type { EventRow, Registration, Ticket } from "@/lib/types";

// Organizer control over an existing booking:
//   PATCH  — edit attendee details and/or reassign seats
//   POST   — resend the ticket/confirmation email, or un-verify
//   DELETE — cancel the booking outright, freeing its seats
//
// Tickets are per seat, so a seat that leaves a booking must have its ticket
// deleted: that is what stops the old QR scanning at the gate. A seat that is
// already checked in is never silently removed — someone walked through the
// gate on it, and dropping it would corrupt the attendance record.

interface Loaded {
  event: EventRow;
  registration: Registration;
  tickets: Ticket[];
  seats: string[];
}

/** Loads the booking and authorizes the caller against its event. */
async function load(
  id: string
): Promise<{ data: Loaded | null; response: NextResponse | null }> {
  // Check for a session before touching the row, so an anonymous caller can't
  // tell an existing booking id (401) from a made-up one (404).
  if (!(await getAdminUser())) {
    return {
      data: null,
      response: NextResponse.json({ error: "Not authorized." }, { status: 401 }),
    };
  }

  const supabase = createAdminClient();

  const { data: registration } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", id)
    .maybeSingle<Registration>();
  if (!registration) {
    return {
      data: null,
      response: NextResponse.json({ error: "Booking not found." }, { status: 404 }),
    };
  }

  const access = await getEventAccess(registration.event_id);
  if (!access) {
    return {
      data: null,
      response: NextResponse.json({ error: "Not authorized." }, { status: 401 }),
    };
  }

  const [{ data: ticketRows }, { data: seatRows }] = await Promise.all([
    supabase.from("tickets").select("*").eq("registration_id", id).returns<Ticket[]>(),
    supabase
      .from("booked_seats")
      .select("seat_no")
      .eq("registration_id", id)
      .order("seat_no")
      .returns<{ seat_no: string }[]>(),
  ]);

  return {
    data: {
      event: access.event,
      registration,
      tickets: sortTickets(ticketRows ?? []),
      seats: (seatRows ?? []).map((s) => s.seat_no),
    },
    response: null,
  };
}

function checkedInSeats(tickets: Ticket[], seats: string[]): string[] {
  return tickets
    .filter((t) => t.checked_in_at && t.seat_no && seats.includes(t.seat_no))
    .map((t) => t.seat_no as string);
}

/** Re-reads the booking's tickets so emails reflect the change just made. */
async function currentTickets(
  supabase: ReturnType<typeof createAdminClient>,
  registrationId: string
): Promise<Ticket[]> {
  const { data } = await supabase
    .from("tickets")
    .select("*")
    .eq("registration_id", registrationId)
    .returns<Ticket[]>();
  return sortTickets(data ?? []);
}

/* -------------------------------------------------------------------------- */
/* PATCH — edit details and/or seats                                          */
/* -------------------------------------------------------------------------- */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: loaded, response } = await load(id);
  if (!loaded) return response!;
  const { event, registration, tickets, seats: currentSeats } = loaded;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = registrationEditSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid booking details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const { fullName, email, phone, batch, notify } = parsed.data;

  const supabase = createAdminClient();
  const verified = registration.payment_status === "verified";

  // ---- seat reassignment -------------------------------------------------
  let seatsChanged = false;
  if (parsed.data.seats) {
    const nextSeats = [...parsed.data.seats].sort();

    const validIds = validSeatIds(event.seating);
    const invalid = nextSeats.filter((s) => !validIds.has(s));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: `Not a seat on this event's plan: ${invalid.join(", ")}` },
        { status: 400 }
      );
    }

    // Stripping a booking down to nothing leaves an attendee who is "booked"
    // with no seat and no ticket — the exact broken state cancelling exists
    // for.
    if (nextSeats.length === 0 && currentSeats.length > 0) {
      return NextResponse.json(
        {
          error:
            "A booking can't be left with no seats — cancel the booking instead.",
        },
        { status: 409 }
      );
    }

    const toAdd = nextSeats.filter((s) => !currentSeats.includes(s));
    const toRemove = currentSeats.filter((s) => !nextSeats.includes(s));
    seatsChanged = toAdd.length > 0 || toRemove.length > 0;

    if (seatsChanged) {
      // Never drop a seat someone already walked in on.
      const blocked = checkedInSeats(tickets, toRemove);
      if (blocked.length > 0) {
        return NextResponse.json(
          {
            error: `Already checked in at the gate, so ${blocked.join(", ")} can't be removed.`,
          },
          { status: 409 }
        );
      }

      // Claim the new seats FIRST: if they're gone, nothing is destroyed.
      if (toAdd.length > 0) {
        const { error: addError } = await supabase.from("booked_seats").insert(
          toAdd.map((seat_no) => ({
            registration_id: registration.id,
            event_id: event.id,
            seat_no,
          }))
        );
        if (addError) {
          if (addError.code === "23505") {
            const { data: nowTaken } = await supabase
              .from("booked_seats")
              .select("seat_no")
              .eq("event_id", event.id)
              .in("seat_no", toAdd)
              .returns<{ seat_no: string }[]>();
            return NextResponse.json(
              {
                error: `Already taken: ${(nowTaken ?? []).map((c) => c.seat_no).join(", ")}. Pick different seats.`,
                takenSeats: (nowTaken ?? []).map((c) => c.seat_no),
              },
              { status: 409 }
            );
          }
          console.error("[registration] seat add failed:", addError);
          return NextResponse.json(
            { error: "Could not reserve those seats — please try again." },
            { status: 500 }
          );
        }

        // A verified booking gets QRs for the seats it just gained.
        if (verified) {
          const { error: issueError } = await issueSeatTickets(
            supabase,
            registration.id,
            toAdd
          );
          if (issueError) {
            // Undo the claim so the seats don't sit in limbo.
            await supabase
              .from("booked_seats")
              .delete()
              .eq("registration_id", registration.id)
              .in("seat_no", toAdd);
            return NextResponse.json({ error: issueError }, { status: 500 });
          }
        }
      }

      if (toRemove.length > 0) {
        // Delete the tickets first — this is what invalidates their QR codes.
        const { error: ticketDeleteError } = await supabase
          .from("tickets")
          .delete()
          .eq("registration_id", registration.id)
          .in("seat_no", toRemove);
        if (ticketDeleteError) {
          console.error("[registration] ticket delete failed:", ticketDeleteError);
          return NextResponse.json(
            { error: "Could not release the old tickets — please try again." },
            { status: 500 }
          );
        }

        const { error: seatDeleteError } = await supabase
          .from("booked_seats")
          .delete()
          .eq("registration_id", registration.id)
          .in("seat_no", toRemove);
        if (seatDeleteError) {
          console.error("[registration] seat delete failed:", seatDeleteError);
          return NextResponse.json(
            { error: "Could not release those seats — please try again." },
            { status: 500 }
          );
        }
      }
    }
  }

  // ---- attendee details --------------------------------------------------
  const { error: updateError } = await supabase
    .from("registrations")
    .update({ full_name: fullName, email, phone, batch })
    .eq("id", registration.id);
  if (updateError) {
    console.error("[registration] detail update failed:", updateError);
    return NextResponse.json(
      { error: "Could not save the changes — please try again." },
      { status: 500 }
    );
  }

  // Seats moved on a live ticket — the attendee's old QRs are dead, send new.
  let emailSent = false;
  if (verified && seatsChanged && notify) {
    const fresh = await currentTickets(supabase, registration.id);
    if (fresh.length > 0) {
      emailSent = await sendTicketsEmail({
        to: email,
        eventName: event.name,
        fullName,
        batch,
        tickets: fresh,
        portalUrl: portalUrl(registration.access_token),
      });
    }
  }

  return NextResponse.json({ ok: true, seatsChanged, emailSent });
}

/* -------------------------------------------------------------------------- */
/* POST — resend email / un-verify                                            */
/* -------------------------------------------------------------------------- */

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: loaded, response } = await load(id);
  if (!loaded) return response!;
  const { event, registration, tickets, seats } = loaded;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = registrationActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const link = portalUrl(registration.access_token);

  /* ---- resend ---- */
  if (parsed.data.action === "resend") {
    if (registration.payment_status === "verified") {
      if (tickets.length === 0) {
        return NextResponse.json(
          { error: "This booking has no tickets to send." },
          { status: 409 }
        );
      }
      const emailSent = await sendTicketsEmail({
        to: registration.email,
        eventName: event.name,
        fullName: registration.full_name,
        batch: registration.batch,
        tickets,
        portalUrl: link,
        custom: registration.source === "custom",
      });
      return NextResponse.json({ ok: true, emailSent, kind: "ticket" });
    }

    // Not verified yet — resend the booking confirmation with the bank details.
    const mail = bookingEmail({
      eventName: event.name,
      fullName: registration.full_name,
      batch: registration.batch,
      seats,
      total: seats.length * event.seating.pricePerSeat,
      reference: registration.id.slice(0, 8).toUpperCase(),
      portalUrl: link,
      bank: event.bank,
    });
    const result = await sendEmail({
      to: registration.email,
      subject: mail.subject,
      html: mail.html,
    });
    return NextResponse.json({ ok: true, emailSent: result.sent, kind: "booking" });
  }

  /* ---- un-verify ---- */
  if (registration.payment_status !== "verified") {
    return NextResponse.json(
      { error: "This booking isn't verified." },
      { status: 409 }
    );
  }

  const alreadyIn = tickets.filter((t) => t.checked_in_at);
  if (alreadyIn.length > 0) {
    return NextResponse.json(
      {
        error:
          "Someone has already checked in on this booking, so it can't be un-verified.",
      },
      { status: 409 }
    );
  }

  // Deleting the tickets is what kills the issued QR codes.
  const { error: deleteError } = await supabase
    .from("tickets")
    .delete()
    .eq("registration_id", registration.id);
  if (deleteError) {
    console.error("[registration] ticket delete failed:", deleteError);
    return NextResponse.json(
      { error: "Could not revoke the tickets — please try again." },
      { status: 500 }
    );
  }

  // Back to "awaiting review" when a slip exists, otherwise "awaiting payment".
  const { count: slipCount } = await supabase
    .from("payment_slips")
    .select("id", { count: "exact", head: true })
    .eq("registration_id", registration.id);

  const nextStatus = (slipCount ?? 0) > 0 ? "slip_uploaded" : "pending";
  const { error: statusError } = await supabase
    .from("registrations")
    .update({ payment_status: nextStatus })
    .eq("id", registration.id);
  if (statusError) {
    console.error("[registration] unverify status update failed:", statusError);
    return NextResponse.json(
      { error: "Tickets revoked, but the status could not be updated." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}

/* -------------------------------------------------------------------------- */
/* DELETE — cancel the booking                                                */
/* -------------------------------------------------------------------------- */

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: loaded, response } = await load(id);
  if (!loaded) return response!;
  const { registration, tickets } = loaded;

  const alreadyIn = tickets.filter((t) => t.checked_in_at);
  if (alreadyIn.length > 0) {
    return NextResponse.json(
      {
        error:
          "Someone has already checked in on this booking, so it can't be cancelled.",
      },
      { status: 409 }
    );
  }

  // Cascades to booked_seats, tickets and payment_slips — the seats go straight
  // back on sale.
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("registrations")
    .delete()
    .eq("id", registration.id);
  if (error) {
    console.error("[registration] cancel failed:", error);
    return NextResponse.json(
      { error: "Could not cancel the booking — please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
