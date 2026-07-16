import "server-only";
import { createAdminClient } from "./supabase/admin";
import { eventPhase } from "./event-time";
import type { EventRow } from "./types";

// Server-side event loaders. All queries use the service-role client
// (same pattern as the rest of the app); publication/ownership rules are
// enforced here and in the route guards. Loaders fail soft (null/[]) so
// pages still render in local dev without Supabase env vars.

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .maybeSingle<EventRow>();
    if (error) {
      console.error("[events] getEventBySlug failed:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("[events] getEventBySlug unavailable:", err);
    return null;
  }
}

export async function getEventById(id: string): Promise<EventRow | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .maybeSingle<EventRow>();
    if (error) {
      console.error("[events] getEventById failed:", error);
      return null;
    }
    return data;
  } catch (err) {
    console.error("[events] getEventById unavailable:", err);
    return null;
  }
}

/** Published events, dated ones first (soonest first), "Date TBA" last. */
export async function getPublishedEvents(): Promise<EventRow[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .order("starts_at", { ascending: true, nullsFirst: false })
      .returns<EventRow[]>();
    if (error) {
      console.error("[events] getPublishedEvents failed:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("[events] getPublishedEvents unavailable:", err);
    return [];
  }
}

/** Published events split for the /events hub. */
export async function getEventListings(): Promise<{
  upcoming: EventRow[];
  completed: EventRow[];
}> {
  const events = await getPublishedEvents();
  const now = new Date();
  const upcoming: EventRow[] = [];
  const completed: EventRow[] = [];
  for (const event of events) {
    if (eventPhase(event.starts_at, now) === "completed") completed.push(event);
    else upcoming.push(event);
  }
  // Completed: most recent first.
  completed.reverse();
  return { upcoming, completed };
}

/** Events for the organizer console: own events, or all for the super admin. */
export async function getEventsForUser(
  userId: string,
  isSuperAdmin: boolean
): Promise<EventRow[]> {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });
    if (!isSuperAdmin) query = query.eq("owner_id", userId);
    const { data, error } = await query.returns<EventRow[]>();
    if (error) {
      console.error("[events] getEventsForUser failed:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("[events] getEventsForUser unavailable:", err);
    return [];
  }
}
