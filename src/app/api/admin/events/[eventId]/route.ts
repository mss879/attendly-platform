import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventAccess } from "@/lib/supabase/auth";
import { eventDraftSchema } from "@/lib/validation";
import { draftDateError, draftToRow } from "@/lib/event-draft";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const access = await getEventAccess(eventId);
  if (!access) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { event } = access;

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
  const row = draftToRow(parsed.data);

  // Once seats are booked, the layout and price are locked — attendees have
  // already paid against them.
  const { count: bookedCount } = await supabase
    .from("booked_seats")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id);
  if ((bookedCount ?? 0) > 0) {
    if (JSON.stringify(row.seating) !== JSON.stringify(event.seating)) {
      return NextResponse.json(
        { error: "Seats have already been booked — the seating layout and price can't change." },
        { status: 409 }
      );
    }
  }

  // Editing a rejected event resubmits it for review.
  const status = event.status === "rejected" ? "pending" : event.status;

  const { error } = await supabase
    .from("events")
    .update({ ...row, status })
    .eq("id", event.id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That page address (slug) is already taken — pick another." },
        { status: 409 }
      );
    }
    console.error("[events] update failed:", error);
    return NextResponse.json(
      { error: "Could not save the changes — please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, status });
}
