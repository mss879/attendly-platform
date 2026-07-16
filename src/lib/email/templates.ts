import { appConfig } from "@/lib/config";

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
  batch: string;
  seats: string[];
  total: number;
  reference: string;
  portalUrl: string;
}

export function bookingEmail({
  eventName,
  fullName,
  batch,
  seats,
  total,
  reference,
  portalUrl,
}: BookingEmailArgs) {
  const body = `
    <p style="margin:0 0 16px;">Hi <strong>${escapeHtml(fullName)}</strong>,</p>
    <p style="margin:0 0 16px;">Your seat booking for <strong>${escapeHtml(eventName)}</strong> has been received, and your payment slip is with the organizers for review. Here are your booking details:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${detailRow("Booking ref", reference)}
      ${detailRow("Name", fullName)}
      ${batch ? detailRow("Batch", `Class of ${batch}`) : ""}
      ${detailRow(seats.length === 1 ? "Seat" : "Seats", seats.join(", "))}
      ${detailRow("Total", `Rs ${total.toLocaleString("en-LK")}`)}
    </table>
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

interface TicketEmailArgs {
  eventName: string;
  fullName: string;
  batch: string;
  ticketNumber: string;
  seats: string[];
  portalUrl: string;
}

export function ticketEmail({
  eventName,
  fullName,
  batch,
  ticketNumber,
  seats,
  portalUrl,
}: TicketEmailArgs) {
  const body = `
    <p style="margin:0 0 16px;">Hi <strong>${escapeHtml(fullName)}</strong>,</p>
    <p style="margin:0 0 16px;">Your payment has been verified — your ticket for <strong>${escapeHtml(eventName)}</strong> is confirmed! 🎉</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      ${detailRow("Ticket number", ticketNumber)}
      ${seats.length > 0 ? detailRow(seats.length === 1 ? "Seat" : "Seats", seats.join(", ")) : ""}
      ${detailRow("Name", fullName)}
      ${batch ? detailRow("Batch", `Class of ${batch}`) : ""}
    </table>
    <p style="margin:0 0 12px;">Your QR code is attached to this email, and is also available on your ticket page. <strong>Show the QR code at the entrance</strong> — it will be scanned to check you in.</p>
    ${button(portalUrl, "View my ticket & QR code")}
    <p style="margin:0;color:#64748b;font-size:13px;">Tip: save the attached QR image to your phone, or keep this page handy for quick entry at the gate.</p>
  `;
  return {
    subject: `Your ticket ${ticketNumber} — ${eventName}`,
    html: layout(body, eventName),
  };
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
