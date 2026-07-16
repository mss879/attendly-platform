import "server-only";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "./server";
import { createAdminClient } from "./admin";
import type { EventRow, Profile } from "@/lib/types";

/**
 * Organizer guard for admin pages — redirects to the login screen when
 * there is no valid session.
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");
  return user;
}

/** Session check for admin API routes — returns null instead of redirecting. */
export async function getAdminUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export interface AuthContext {
  user: User;
  profile: Profile | null;
  isSuperAdmin: boolean;
}

/** Current user + their profile row (role), or null when signed out. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Accounts created manually in the Supabase dashboard may predate the
  // profiles table — treat a missing row as a plain organizer.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return { user, profile, isSuperAdmin: profile?.role === "super_admin" };
}

/** Page guard: any signed-in user, with role context. */
export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/admin/login");
  return ctx;
}

/** Page guard for the platform area — super admins only. */
export async function requireSuperAdmin(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/admin/login");
  if (!ctx.isSuperAdmin) redirect("/admin");
  return ctx;
}

export interface EventAccess extends AuthContext {
  event: EventRow;
}

/**
 * Can this user manage this event? The event's owner and the super admin
 * may; anyone else gets null. API routes use this directly (403); pages
 * use requireEventAccess (redirect).
 */
export async function getEventAccess(eventId: string): Promise<EventAccess | null> {
  const ctx = await getAuthContext();
  if (!ctx) return null;

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle<EventRow>();
  if (!event) return null;

  if (event.owner_id !== ctx.user.id && !ctx.isSuperAdmin) return null;
  return { ...ctx, event };
}

/** Page guard for /admin/e/[eventId] — owner or super admin. */
export async function requireEventAccess(eventId: string): Promise<EventAccess> {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/admin/login");
  const access = await getEventAccess(eventId);
  if (!access) redirect("/admin");
  return access;
}
