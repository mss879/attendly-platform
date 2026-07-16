import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Sidebar } from "@/components/admin/Sidebar";
import { requireEventAccess } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

// Event console shell — only the event's owner or the super admin get in.

export default async function EventAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { user, event } = await requireEventAccess(eventId);

  return (
    <div className="flex min-h-screen flex-col p-2">
      <AuroraBackground />

      {/* Floating app panel */}
      <div className="flex flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        {/* Panel header */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-7 sm:py-4">
          <Logo size="sm" href="/admin" accent="orange" withMark />
          <form
            action={`/admin/e/${event.id}/registrations`}
            method="get"
            className="relative order-last w-full sm:order-none sm:w-auto"
          >
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              name="q"
              placeholder="Search participants…"
              className="w-full rounded-full border border-white/70 bg-white/80 py-2 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 shadow-sm outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-100 sm:w-56 sm:focus:w-72"
            />
          </form>
        </header>

        {/* Sidebar + content */}
        <div className="flex flex-1 flex-col px-3 pb-3 sm:px-4 sm:pb-4 md:flex-row">
          <Sidebar eventId={event.id} eventName={event.name} email={user.email ?? ""} />
          <main className="min-w-0 flex-1 rounded-2xl bg-white/75 p-4 shadow-sm ring-1 ring-black/[0.03] sm:rounded-3xl sm:p-7">
            {children}
          </main>
        </div>
      </div>

      <Footer admin />
    </div>
  );
}
