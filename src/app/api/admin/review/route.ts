import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventAccess } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email/send";
import { rejectionEmail } from "@/lib/email/templates";
import { portalUrl } from "@/lib/config";
import { formatBatch } from "@/lib/batch";
import { issueSeatTickets, sendTicketsEmail } from "@/lib/tickets";
import type { Registration } from "@/lib/types";

const reviewSchema = z.object({
  registrationId: z.uuid(),
  action: z.enum(["verify", "reject"]),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { registrationId, action } = parsed.data;
  const supabase = createAdminClient();

  const { data: registration } = await supabase
    .from("registrations")
    .select("*")
    .eq("id", registrationId)
    .maybeSingle<Registration>();

  if (!registration) {
    return NextResponse.json({ error: "Registration not found." }, { status: 404 });
  }

  // Only this event's owner (or the super admin) may review its payments.
  const access = await getEventAccess(registration.event_id);
  if (!access) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const eventName = access.event.name;

  if (registration.payment_status === "verified") {
    return NextResponse.json(
      { error: "This payment is already verified." },
      { status: 409 }
    );
  }

  const link = portalUrl(registration.access_token);

  if (action === "reject") {
    // The seats stay held. Rejection asks the attendee to re-upload a clearer
    // slip, so releasing their seats here would leave them with nothing to be
    // verified against — and the seats could be resold in the meantime. To
    // actually free the seats, cancel the booking instead
    // (DELETE /api/admin/registrations/[id]).
    const { error } = await supabase
      .from("registrations")
      .update({ payment_status: "rejected" })
      .eq("id", registrationId);
    if (error) {
      console.error("[review] reject failed:", error);
      return NextResponse.json({ error: "Could not update status." }, { status: 500 });
    }

    const mail = rejectionEmail({
      eventName,
      fullName: registration.full_name,
      portalUrl: link,
    });
    const emailResult = await sendEmail({ to: registration.email, ...mail });
    return NextResponse.json({ ok: true, emailSent: emailResult.sent });
  }

  // action === "verify": issue one ticket per booked seat, then flip status.
  const { data: seatRows, error: seatsError } = await supabase
    .from("booked_seats")
    .select("seat_no")
    .eq("registration_id", registrationId)
    .order("seat_no")
    .returns<{ seat_no: string }[]>();

  // Never guess at the seat list: treating a failed read as "no seats" would
  // issue a single seat-less admission QR and lock the booking as verified.
  if (seatsError) {
    console.error("[review] seat lookup failed:", seatsError);
    return NextResponse.json(
      { error: "Could not read the booked seats — please try again." },
      { status: 500 }
    );
  }
  const seats = (seatRows ?? []).map((s) => s.seat_no);

  if (seats.length === 0) {
    return NextResponse.json(
      {
        error:
          "This booking holds no seats, so there is nothing to issue a ticket for. Assign seats under “Manage this booking” first.",
      },
      { status: 409 }
    );
  }

  const { tickets, error: ticketError } = await issueSeatTickets(
    supabase,
    registrationId,
    seats
  );
  if (!tickets) {
    return NextResponse.json({ error: ticketError }, { status: 500 });
  }

  const { error: statusError } = await supabase
    .from("registrations")
    .update({ payment_status: "verified" })
    .eq("id", registrationId);
  if (statusError) {
    console.error("[review] status update failed:", statusError);
    return NextResponse.json({ error: "Could not update status." }, { status: 500 });
  }

  const emailSent = await sendTicketsEmail({
    to: registration.email,
    eventName,
    fullName: registration.full_name,
    batchLabel: formatBatch(registration.batch, access.event.non_batch_label),
    tickets,
    portalUrl: link,
  });

  return NextResponse.json({
    ok: true,
    ticketNumber: tickets[0].ticket_number,
    ticketCount: tickets.length,
    emailSent,
  });
}
