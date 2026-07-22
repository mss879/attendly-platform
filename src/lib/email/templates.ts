import { appConfig } from "@/lib/config";
import type { BankDetails } from "@/lib/types";

// Inline-styled HTML emails (email clients ignore stylesheets).
// Every template shares the Attendly header and footer; the event name is
// passed per email since each event on the platform has its own.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(bodyHtml: string, footerContext: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #e2e8f0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr><td style="font-size:24px;font-weight:bold;color:#1e293b;letter-spacing:-0.5px;">Attendly</td></tr>
                  <tr><td align="right" style="font-size:10px;color:#64748b;padding-top:2px;">${appConfig.tagline}</td></tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;color:#334155;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;">
                ${escapeHtml(footerContext)} &middot; Attendly &middot; ${appConfig.tagline}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>
      <td style="background-color:#4f46e5;border-radius:8px;">
        <a href="${href}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;white-space:nowrap;">${label}</td>
    <td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:bold;">${escapeHtml(value)}</td>
  </tr>`;
}

interface BookingEmailArgs {
  eventName: string;
  fullName: string;
  /** Display text: "Class of 2005", the event's non-cohort label, or "". */
  batchLabel: string;
  seats: string[];
  total: number;
  reference: string;
  portalUrl: string;
  bank: BankDetails;
}

export function bookingEmail({
  eventName,
  fullName,
  batchLabel,
  seats,
  total,
  reference,
  portalUrl,
  bank,
}: BookingEmailArgs) {
  const hasBank = Boolean(
    bank.name || bank.accountName || bank.accountNumber || bank.branch
  );
  const body = `
    <p style="margin:0 0 16px;">Hi <strong>${escapeHtml(fullName)}</strong>,</p>
    <p style="margin:0 0 16px;">Your seat booking for <strong>${escapeHtml(eventName)}</strong> has been received, and your payment slip is with the organizers for review. Here are your booking details:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${detailRow("Booking ref", reference)}
      ${detailRow("Name", fullName)}
      ${batchLabel ? detailRow("Batch", batchLabel) : ""}
      ${detailRow(seats.length === 1 ? "Seat" : "Seats", seats.join(", "))}
      ${detailRow("Total", `Rs ${total.toLocaleString("en-LK")}`)}
    </table>
    ${
      hasBank
        ? `<p style="margin:0 0 8px;font-weight:bold;color:#1e293b;">Payment account</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${bank.name ? detailRow("Bank", bank.name) : ""}
      ${bank.accountName ? detailRow("Account name", bank.accountName) : ""}
      ${bank.accountNumber ? detailRow("Account number", bank.accountNumber) : ""}
      ${bank.branch ? detailRow("Branch", bank.branch) : ""}
    </table>`
        : ""
    }
    <p style="margin:0 0 8px;font-weight:bold;color:#1e293b;">What happens next</p>
    <p style="margin:0 0 12px;">The organizers will verify your bank transfer. Once verified, your ticket with a QR code will be emailed to you — show it at the gate to check in. You can track the review on your personal page any time.</p>
    ${button(portalUrl, "Track my booking")}
    <p style="margin:0;color:#64748b;font-size:13px;">Keep this email — the link above is your personal page for tracking your booking and ticket.</p>
  `;
  return {
    subject: `Booking received — ${eventName}`,
    html: layout(body, eventName),
  };
}

/** One issued ticket = one seat = one QR code. */
export interface SeatTicket {
  ticketNumber: string;
  seatNo: string | null;
}

interface TicketEmailArgs {
  eventName: string;
  fullName: string;
  /** Display text: "Class of 2005", the event's non-cohort label, or "". */
  batchLabel: string;
  tickets: SeatTicket[];
  portalUrl: string;
  /** Organizer-issued comp ticket — there was no payment to verify. */
  custom?: boolean;
}

export function ticketEmail({
  eventName,
  fullName,
  batchLabel,
  tickets,
  portalUrl,
  custom = false,
}: TicketEmailArgs) {
  const many = tickets.length > 1;
  const opening = custom
    ? `The organizers have issued ${many ? `${tickets.length} tickets` : "a ticket"} for you for <strong>${escapeHtml(eventName)}</strong>. 🎟️`
    : `Your payment has been verified — your ${many ? "tickets are" : "ticket is"} confirmed for <strong>${escapeHtml(eventName)}</strong>! 🎉`;

  const ticketRows = tickets
    .map((t) =>
      detailRow(t.seatNo ? `Seat ${t.seatNo}` : "Ticket", t.ticketNumber)
    )
    .join("");

  const body = `
    <p style="margin:0 0 16px;">Hi <strong>${escapeHtml(fullName)}</strong>,</p>
    <p style="margin:0 0 16px;">${opening}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${detailRow("Name", fullName)}
      ${batchLabel ? detailRow("Batch", batchLabel) : ""}
    </table>
    <p style="margin:0 0 8px;font-weight:bold;color:#1e293b;">${many ? `Your ${tickets.length} tickets` : "Your ticket"}</p>
    <p style="margin:0 0 12px;">${
      many
        ? "Each seat has its <strong>own ticket number and its own QR code</strong> — every attendee is scanned in separately, so give each person their own QR."
        : "Your ticket number and QR code are below."
    }</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${ticketRows}
    </table>
    <p style="margin:0 0 12px;">${
      many
        ? `All ${tickets.length} QR codes are attached to this email (one image per seat, named with its seat) and are also on your ticket page.`
        : "Your QR code is attached to this email, and is also available on your ticket page."
    } <strong>Show the QR code at the entrance</strong> — it will be scanned to check you in.</p>
    ${button(portalUrl, many ? "View my tickets & QR codes" : "View my ticket & QR code")}
    <p style="margin:0;color:#64748b;font-size:13px;">Tip: save the attached QR ${many ? "images" : "image"} to your phone, or keep this page handy for quick entry at the gate.</p>
  `;

  const subject = many
    ? `Your ${tickets.length} tickets — ${eventName}`
    : `Your ticket ${tickets[0]?.ticketNumber ?? ""} — ${eventName}`;

  return { subject, html: layout(body, eventName) };
}

interface RejectionEmailArgs {
  eventName: string;
  fullName: string;
  portalUrl: string;
}

export function rejectionEmail({ eventName, fullName, portalUrl }: RejectionEmailArgs) {
  const body = `
    <p style="margin:0 0 16px;">Hi <strong>${escapeHtml(fullName)}</strong>,</p>
    <p style="margin:0 0 16px;">We couldn't verify the payment slip you uploaded for <strong>${escapeHtml(eventName)}</strong>. This usually happens when the image is unclear or the details don't match the transfer.</p>
    <p style="margin:0 0 12px;">Please upload a clear photo or PDF of your payment slip again:</p>
    ${button(portalUrl, "Re-upload payment slip")}
    <p style="margin:0;color:#64748b;font-size:13px;">If you believe this is a mistake, reply to this email and the organizing team will help you out.</p>
  `;
  return {
    subject: `Action needed: payment slip — ${eventName}`,
    html: layout(body, eventName),
  };
}

// --- Organizer lifecycle emails (apply -> approve/reject) ---

interface EventSubmittedEmailArgs {
  organizerName: string;
  eventName: string;
}

export function eventSubmittedEmail({ organizerName, eventName }: EventSubmittedEmailArgs) {
  const body = `
    <p style="margin:0 0 16px;">Hi <strong>${escapeHtml(organizerName)}</strong>,</p>
    <p style="margin:0 0 16px;">Thanks for submitting <strong>${escapeHtml(eventName)}</strong> to Attendly. Our team is reviewing your event — you'll get an email as soon as it's approved and live on the platform.</p>
    <p style="margin:0;color:#64748b;font-size:13px;">You can keep editing your event from your organizer dashboard while it's under review.</p>
  `;
  return {
    subject: `We received your event — ${eventName}`,
    html: layout(body, eventName),
  };
}

interface EventReviewedEmailArgs {
  organizerName: string;
  eventName: string;
  eventUrl: string;
}

export function eventApprovedEmail({
  organizerName,
  eventName,
  eventUrl,
}: EventReviewedEmailArgs) {
  const body = `
    <p style="margin:0 0 16px;">Hi <strong>${escapeHtml(organizerName)}</strong>,</p>
    <p style="margin:0 0 16px;"><strong>${escapeHtml(eventName)}</strong> has been approved and is now live on Attendly! 🎉 Attendees can view your event page and book their seats.</p>
    ${button(eventUrl, "View my event page")}
    <p style="margin:0;color:#64748b;font-size:13px;">Manage bookings, verify payments and scan tickets from your organizer dashboard.</p>
  `;
  return {
    subject: `Your event is live — ${eventName}`,
    html: layout(body, eventName),
  };
}

export function eventRejectedEmail({
  organizerName,
  eventName,
}: Omit<EventReviewedEmailArgs, "eventUrl">) {
  const body = `
    <p style="margin:0 0 16px;">Hi <strong>${escapeHtml(organizerName)}</strong>,</p>
    <p style="margin:0 0 16px;">Unfortunately <strong>${escapeHtml(eventName)}</strong> wasn't approved for the Attendly platform this time.</p>
    <p style="margin:0 0 12px;">This can happen when the event details are incomplete or the payment information couldn't be confirmed. You can update your event from your organizer dashboard and it will be reviewed again.</p>
    <p style="margin:0;color:#64748b;font-size:13px;">Questions? Reply to this email and the Attendly team will help you out.</p>
  `;
  return {
    subject: `Update on your event — ${eventName}`,
    html: layout(body, eventName),
  };
}
