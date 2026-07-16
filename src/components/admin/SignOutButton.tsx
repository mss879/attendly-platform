"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className={
        className ??
        "rounded-full px-4 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-white/70 hover:text-red-600"
      }
    >
      Sign out
    </button>
  );
}
