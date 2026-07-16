import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventAccess } from "@/lib/supabase/auth";
import { sendEmail } from "@/lib/email/send";
import { rejectionEmail, ticketEmail } from "@/lib/email/templates";
import { portalUrl } from "@/lib/config";
import { qrPngBuffer } from "@/lib/qr";
import type { Registration, Ticket } from "@/lib/types";

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
    // Release the booked seats so they become available on the front-end map
    const { error: seatsDeleteError } = await supabase
      .from("booked_seats")
      .delete()
      .eq("registration_id", registrationId);
    if (seatsDeleteError) {
      console.error("[review] reject seat delete failed:", seatsDeleteError);
      return NextResponse.json({ error: "Could not release seats." }, { status: 500 });
    }

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

  // action === "verify": issue the ticket, then flip the status.
  const { data: ticket, error: ticketError } = await supabase
    .from("tickets")
    .insert({ registration_id: registrationId })
    .select()
    .single<Ticket>();

  if (ticketError || !ticket) {
    // Unique constraint on registration_id guards against double-issuing.
    console.error("[review] ticket insert failed:", ticketError);
    return NextResponse.json(
      { error: "Could not issue the ticket — it may already exist." },
      { status: 500 }
    );
  }

  const { error: statusError } = await supabase
    .from("registrations")
    .update({ payment_status: "verified" })
    .eq("id", registrationId);
  if (statusError) {
    console.error("[review] status update failed:", statusError);
    return NextResponse.json({ error: "Could not update status." }, { status: 500 });
  }

  const { data: seatRows } = await supabase
    .from("booked_seats")
    .select("seat_no")
    .eq("registration_id", registrationId)
    .order("seat_no")
    .returns<{ seat_no: string }[]>();

  const mail = ticketEmail({
    eventName,
    fullName: registration.full_name,
    batch: registration.batch,
    ticketNumber: ticket.ticket_number,
    seats: (seatRows ?? []).map((s) => s.seat_no),
    portalUrl: link,
  });

  let emailSent = false;
  try {
    const qrPng = await qrPngBuffer(ticket.qr_token);
    const emailResult = await sendEmail({
      to: registration.email,
      subject: mail.subject,
      html: mail.html,
      attachments: [
        { filename: `attendly-${ticket.ticket_number}.png`, content: qrPng },
      ],
    });
    emailSent = emailResult.sent;
  } catch (err) {
    console.error("[review] QR/email failed (ticket still issued):", err);
  }

  return NextResponse.json({
    ok: true,
    ticketNumber: ticket.ticket_number,
    emailSent,
  });
}
