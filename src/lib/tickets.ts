import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { qrPngBuffer } from "./qr";
import { sendEmail } from "./email/send";
import { ticketEmail } from "./email/templates";
import type { Ticket } from "./types";

// Ticket issuing, shared by the payment-verification flow and the organizer's
// custom-ticket flow. One ticket — one seat — one QR code: every attendee is
// scanned in individually at the gate.

/**
 * Issues one ticket per seat. A registration with no seats still gets a
 * single seatless ticket, which is how pre-seating bookings behaved.
 * The unique index on (registration_id, seat_no) makes double-issuing fail
 * rather than silently duplicating a seat's QR.
 */
export async function issueSeatTickets(
  supabase: SupabaseClient,
  registrationId: string,
  seats: string[]
): Promise<{ tickets: Ticket[] | null; error: string | null }> {
  const rows: { registration_id: string; seat_no: string | null }[] =
    seats.length > 0
      ? seats.map((seat_no) => ({ registration_id: registrationId, seat_no }))
      : [{ registration_id: registrationId, seat_no: null }];

  const { data, error } = await supabase
    .from("tickets")
    .insert(rows)
    .select()
    .returns<Ticket[]>();

  if (error || !data || data.length === 0) {
    console.error("[tickets] issue failed:", error);
    return {
      tickets: null,
      error:
        error?.code === "23505"
          ? "Tickets have already been issued for these seats."
          : "Could not issue the tickets — please try again.",
    };
  }

  return { tickets: sortTickets(data), error: null };
}

/** Seat order (A01, A02, …); seatless tickets last. */
export function sortTickets(tickets: Ticket[]): Ticket[] {
  return [...tickets].sort((a, b) =>
    (a.seat_no ?? "￿").localeCompare(b.seat_no ?? "￿")
  );
}

/**
 * Emails the ticket(s) with one QR image attached per seat. Fail-soft: the
 * tickets are already issued, so an email problem is reported, never fatal.
 */
export async function sendTicketsEmail({
  to,
  eventName,
  fullName,
  batch,
  tickets,
  portalUrl,
  custom = false,
}: {
  to: string;
  eventName: string;
  fullName: string;
  batch: string;
  tickets: Ticket[];
  portalUrl: string;
  custom?: boolean;
}): Promise<boolean> {
  const mail = ticketEmail({
    eventName,
    fullName,
    batch,
    tickets: tickets.map((t) => ({
      ticketNumber: t.ticket_number,
      seatNo: t.seat_no,
    })),
    portalUrl,
    custom,
  });

  try {
    const attachments = await Promise.all(
      tickets.map(async (t) => ({
        filename: t.seat_no
          ? `attendly-${t.seat_no}-${t.ticket_number}.png`
          : `attendly-${t.ticket_number}.png`,
        content: await qrPngBuffer(t.qr_token),
      }))
    );
    const result = await sendEmail({
      to,
      subject: mail.subject,
      html: mail.html,
      attachments,
    });
    return result.sent;
  } catch (err) {
    console.error("[tickets] QR/email failed (tickets still issued):", err);
    return false;
  }
}
