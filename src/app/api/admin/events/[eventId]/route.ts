import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventAccess } from "@/lib/supabase/auth";
import { eventDraftSchema } from "@/lib/validation";
import { draftDateError, draftToRow } from "@/lib/event-draft";
import { seatingChangeBlocker } from "@/lib/seating";

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

  // Once seats are booked the organizer may still grow the plan, but never
  // reprice a sold seat or lay out a plan that no longer contains one.
  const { data: bookedRows, error: bookedError } = await supabase
    .from("booked_seats")
    .select("seat_no")
    .eq("event_id", event.id)
    .returns<{ seat_no: string }[]>();
  if (bookedError) {
    console.error("[events] booked seat lookup failed:", bookedError);
    return NextResponse.json(
      { error: "Could not check existing bookings — please try again." },
      { status: 500 }
    );
  }

  const blocker = seatingChangeBlocker(
    event.seating,
    row.seating,
    (bookedRows ?? []).map((s) => s.seat_no)
  );
  if (blocker) {
    return NextResponse.json({ error: blocker }, { status: 409 });
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
