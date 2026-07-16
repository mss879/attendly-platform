"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type NavItem = { href: string; label: string; icon: React.ReactNode };

const iconClass = "h-[18px] w-[18px] shrink-0";

function buildNav(base: string): { manage: NavItem[]; gate: NavItem[] } {
  return {
    manage: [
      {
        href: base,
        label: "Dashboard",
        icon: (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
          </svg>
        ),
      },
      {
        href: `${base}/registrations`,
        label: "Registrations",
        icon: (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3.5 19c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" strokeLinecap="round" />
            <path d="M15.5 8.5h5M15.5 12h5" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        href: `${base}/settings`,
        label: "Event settings",
        icon: (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
    gate: [
      {
        href: `${base}/scan`,
        label: "Scan tickets",
        icon: (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" strokeLinecap="round" />
            <path d="M4 12h16" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        href: `${base}/checkins`,
        label: "Check-ins",
        icon: (
          <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="8.5" />
            <path d="m8.5 12.2 2.4 2.4 4.6-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  };
}

function NavLinks({ items, pathname, base }: { items: NavItem[]; pathname: string; base: string }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active =
          item.href === base ? pathname === base : pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-white font-semibold text-slate-900 shadow-sm ring-1 ring-black/[0.04]"
                  : "font-medium text-slate-500 hover:bg-white/60 hover:text-slate-800"
              }`}
            >
              <span className={active ? "text-orange-600" : "text-slate-400"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Sidebar({
  eventId,
  eventName,
  email,
}: {
  eventId: string;
  eventName: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/admin/e/${eventId}`;
  const { manage, gate } = buildNav(base);

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col justify-between py-5 pl-1 pr-4 md:flex">
        <div className="space-y-6">
          <div className="px-1">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-white/70 hover:text-slate-800"
            >
              ← My events
            </Link>
            <p className="mt-2 truncate px-2 text-sm font-bold text-slate-900" title={eventName}>
              {eventName}
            </p>
          </div>
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              General
            </p>
            <NavLinks items={manage} pathname={pathname} base={base} />
          </div>
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              At the gate
            </p>
            <NavLinks items={gate} pathname={pathname} base={base} />
          </div>
        </div>

        <div className="space-y-2 px-1">
          <p className="truncate px-2 text-xs text-slate-400" title={email}>
            {email}
          </p>
          <button
            onClick={signOut}
            className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-500 transition hover:bg-white/70 hover:text-red-600"
          >
            ← Sign out
          </button>
        </div>
      </aside>

      {/* Mobile nav row */}
      <nav className="flex gap-1.5 overflow-x-auto px-1 pb-3 md:hidden">
        <Link
          href="/admin"
          className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-500"
        >
          ← Events
        </Link>
        {[...manage, ...gate].map((item) => {
          const active =
            item.href === base ? pathname === base : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition ${
                active
                  ? "bg-white font-semibold text-slate-900 shadow-sm"
                  : "font-medium text-slate-500"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={signOut}
          className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-slate-500"
        >
          Sign out
        </button>
      </nav>
    </>
  );
}
