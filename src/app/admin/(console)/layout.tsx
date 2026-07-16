import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { AuroraBackground } from "@/components/AuroraBackground";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { requireAuthContext } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

// Console shell for the non-event-scoped admin pages: My events, the
// create-event wizard and the super-admin platform area.

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAuthContext();

  return (
    <div className="flex min-h-screen flex-col p-2 sm:p-4 lg:p-6">
      <AuroraBackground />

      {/* Floating app panel */}
      <div className="flex flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-7 sm:py-4">
          <Logo size="sm" href="/admin" accent="orange" withMark />
          <div className="flex items-center gap-2">
            <span className="hidden truncate text-xs text-slate-400 sm:inline" title={user.email ?? ""}>
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </header>

        <main className="mx-3 mb-3 flex-1 rounded-2xl bg-white/75 p-4 shadow-sm ring-1 ring-black/[0.03] sm:mx-4 sm:mb-4 sm:rounded-3xl sm:p-7">
          {children}
        </main>
      </div>

      <Footer admin />
    </div>
  );
}
