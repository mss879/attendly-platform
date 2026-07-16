import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/auth";
import { appConfig } from "@/lib/config";
import { sendEmail } from "@/lib/email/send";
import { eventApprovedEmail, eventRejectedEmail } from "@/lib/email/templates";
import type { EventRow, Profile } from "@/lib/types";

const reviewSchema = z.object({
  eventId: z.uuid(),
  action: z.enum(["approve", "reject"]),
});

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.isSuperAdmin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

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
  const { eventId, action } = parsed.data;

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<EventRow>();
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  const status = action === "approve" ? "published" : "rejected";
  const { error } = await supabase
    .from("events")
    .update({
      status,
      published_at: action === "approve" ? new Date().toISOString() : event.published_at,
    })
    .eq("id", event.id);
  if (error) {
    console.error("[platform] review update failed:", error);
    return NextResponse.json({ error: "Could not update the event." }, { status: 500 });
  }

  // Fail-soft notification to the organizer.
  if (event.owner_id) {
    const [{ data: ownerUser }, { data: ownerProfile }] = await Promise.all([
      supabase.auth.admin.getUserById(event.owner_id),
      supabase
        .from("profiles")
        .select("*")
        .eq("id", event.owner_id)
        .maybeSingle<Profile>(),
    ]);
    const ownerEmail = ownerUser?.user?.email;
    if (ownerEmail) {
      const organizerName = ownerProfile?.full_name || ownerEmail;
      const mail =
        action === "approve"
          ? eventApprovedEmail({
              organizerName,
              eventName: event.name,
              eventUrl: `${appConfig.appUrl}/events/${event.slug}`,
            })
          : eventRejectedEmail({ organizerName, eventName: event.name });
      await sendEmail({ to: ownerEmail, ...mail });
    }
  }

  return NextResponse.json({ ok: true, status });
}
