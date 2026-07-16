import "server-only";
import { Resend } from "resend";

interface EmailAttachment {
  filename: string;
  content: Buffer;
}

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

/**
 * Fail-soft email sender: a registration or verification must never fail
 * because the email provider is down or unconfigured. Errors are logged and
 * reported back, but callers treat them as non-fatal.
 */
export async function sendEmail({ to, subject, html, attachments }: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return { sent: false as const, skipped: true as const };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "Attendly <onboarding@resend.dev>",
      to,
      subject,
      html,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content.toString("base64"),
      })),
    });
    if (error) {
      console.error(`[email] Resend error for "${subject}" to ${to}:`, error);
      return { sent: false as const, skipped: false as const };
    }
    return { sent: true as const, skipped: false as const };
  } catch (err) {
    console.error(`[email] failed to send "${subject}" to ${to}:`, err);
    return { sent: false as const, skipped: false as const };
  }
}
