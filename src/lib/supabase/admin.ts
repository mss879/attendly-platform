import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — full DB/Storage access, server-side only.
// All writes in the app go through this client; RLS blocks the anon key.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
