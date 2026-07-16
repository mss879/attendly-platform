import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthContext } from "@/lib/supabase/auth";
import { eventDraftSchema } from "@/lib/validation";
import { draftDateError, draftToRow } from "@/lib/event-draft";
import { sendEmail } from "@/lib/email/send";
import { eventSubmittedEmail } from "@/lib/email/templates";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = eventDraftSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid event details.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const dateError = draftDateError(parsed.data);
  if (dateError) return NextResponse.json({ error: dateError }, { status: 400 });

  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      ...draftToRow(parsed.data),
      owner_id: ctx.user.id,
      status: "pending",
    })
    .select("id, slug, name")
    .single();

  if (error || !event) {
    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "That page address (slug) is already taken — pick another." },
        { status: 409 }
      );
    }
    console.error("[events] insert failed:", error);
    return NextResponse.json(
      { error: "Could not create the event — please try again." },
      { status: 500 }
    );
  }

  // Fail-soft confirmation email, same as the booking flow.
  if (ctx.user.email) {
    const mail = eventSubmittedEmail({
      organizerName: ctx.profile?.full_name || ctx.user.email,
      eventName: event.name,
    });
    await sendEmail({ to: ctx.user.email, ...mail });
  }

  return NextResponse.json({ id: event.id, slug: event.slug });
}
