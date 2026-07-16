import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventAccess } from "@/lib/supabase/auth";
import type { Registration, Ticket } from "@/lib/types";

const checkinSchema = z
  .object({
    eventId: z.uuid(),
    qrToken: z.uuid().optional(),
    ticketNumber: z
      .string()
      .trim()
      .regex(/^TKT-\d{1,10}$/i)
      .optional(),
  })
  .refine((d) => d.qrToken || d.ticketNumber, {
    message: "qrToken or ticketNumber required",
  });

type TicketWithRegistration = Ticket & { registrations: Registration };

function participant(t: TicketWithRegistration) {
  return {
    name: t.registrations.full_name,
    batch: t.registrations.batch,
    ticketNumber: t.ticket_number,
    checkedInAt: t.checked_in_at,
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ result: "not_found" });
  }

  const { eventId, qrToken, ticketNumber } = parsed.data;

  // Only this event's owner (or the super admin) may scan its gate.
  const access = await getEventAccess(eventId);
  if (!access) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Find the ticket within this event (a QR from another event is invalid
  // at this gate).
  let lookup = supabase
    .from("tickets")
    .select("*, registrations!inner(*)")
    .eq("registrations.event_id", eventId);
  lookup = qrToken
    ? lookup.eq("qr_token", qrToken)
    : lookup.eq("ticket_number", ticketNumber!.toUpperCase());
  const { data: ticket, error: lookupError } =
    await lookup.maybeSingle<TicketWithRegistration>();

  if (lookupError) {
    console.error("[checkin] lookup failed:", lookupError);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
  if (!ticket) {
    return NextResponse.json({ result: "not_found" });
  }

  // Atomic claim: only succeeds if the ticket is not yet checked in — a
  // second scan of the same QR matches 0 rows.
  const { data: claimed, error: claimError } = await supabase
    .from("tickets")
    .update({
      checked_in_at: new Date().toISOString(),
      checked_in_by: access.user.id,
    })
    .eq("id", ticket.id)
    .is("checked_in_at", null)
    .select("*")
    .maybeSingle<Ticket>();

  if (claimError) {
    console.error("[checkin] update failed:", claimError);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }

  if (claimed) {
    return NextResponse.json({
      result: "ok",
      participant: participant({ ...claimed, registrations: ticket.registrations }),
    });
  }

  // Nothing claimed — the ticket exists, so it was already checked in.
  return NextResponse.json({
    result: "already",
    participant: participant(ticket),
  });
}
