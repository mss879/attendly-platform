"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Logo } from "./Logo";

// Shared header for the public platform pages (/, /events, /host).
// Desktop / tablet (sm+): a roomy transparent bar with a large logo that
// morphs into a compact glassy pill navbar once the visitor scrolls.
// Phones (< sm): native-app chrome instead — a slim logo-only top bar plus
// a floating bottom tab bar (icon + label per destination).

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

function useScrolled(threshold: number): boolean {
  return useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > threshold,
    () => false
  );
}

// False during SSR/hydration, true right after — lets us portal the pill
// nav to <body> (ancestor backdrop-blur panels would otherwise trap
// position:fixed and scroll it away with the page).
function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function NavLinks({ active, compact }: { active?: "events" | "host"; compact?: boolean }) {
  const linkBase = `whitespace-nowrap rounded-full font-semibold transition ${
    compact ? "px-2.5 py-1.5 text-xs sm:px-3 sm:text-sm" : "px-2.5 py-1.5 text-xs sm:px-3.5 sm:text-sm"
  }`;
  return (
    <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
      <Link
        href="/events"
        className={`${linkBase} ${
          active === "events"
            ? "bg-white/80 text-orange-700 shadow-sm ring-1 ring-orange-200/70"
            : "text-black/70 hover:bg-white/60 hover:text-black"
        }`}
      >
        Events
      </Link>
      <Link
        href="/#how-it-works"
        className={`${linkBase} hidden text-black/70 hover:bg-white/60 hover:text-black md:inline-flex`}
      >
        How it works
      </Link>

      {/* Organizer group — labelled so nobody has to guess what it's for */}
      <div
        className={`ml-1 flex items-center gap-1 rounded-full py-1 pl-1.5 pr-1 ring-1 sm:ml-2 sm:pl-3 ${
          active === "host"
            ? "bg-white/70 ring-orange-200/70"
            : "bg-white/40 ring-black/[0.06]"
        }`}
      >
        <span className="hidden text-[10px] font-bold uppercase tracking-wider text-black/50 sm:inline">
          Organizers
        </span>
        <Link
          href="/host"
          className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-bold transition sm:px-3 sm:text-sm ${
            active === "host"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-orange-700 hover:bg-orange-100/70"
          }`}
        >
          <span className="sm:hidden">Host</span>
          <span className="hidden sm:inline">Host an event</span>
        </Link>
        <Link
          href="/admin/login"
          title="Sign in to your organizer dashboard"
          className="whitespace-nowrap rounded-full bg-black/85 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-black sm:px-3 sm:text-sm"
        >
          Sign in
        </Link>
      </div>
    </nav>
  );
}

function TabIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      aria-hidden
      className="h-[22px] w-[22px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

const SIDE_TABS = [
  {
    key: "home",
    href: "/",
    label: "Home",
    icon: (
      <TabIcon>
        <path d="m3 10.5 9-7.5 9 7.5" />
        <path d="M5.5 8.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8.5" />
        <path d="M9.5 21v-6h5v6" />
      </TabIcon>
    ),
  },
  {
    key: "how",
    href: "/#how-it-works",
    label: "Guide",
    icon: (
      <TabIcon>
        <circle cx="12" cy="12" r="9" />
        <path d="m15.2 8.8-1.9 5.5-5.5 1.9 1.9-5.5z" />
      </TabIcon>
    ),
  },
  {
    key: "host",
    href: "/host",
    label: "Host",
    icon: (
      <TabIcon>
        <path d="M12 7.5v9M7.5 12h9" />
        <circle cx="12" cy="12" r="9.25" />
      </TabIcon>
    ),
  },
  {
    key: "signin",
    href: "/admin/login",
    label: "Sign in",
    icon: (
      <TabIcon>
        <circle cx="12" cy="8" r="3.75" />
        <path d="M4.5 20.5c.7-3.6 3.7-5.5 7.5-5.5s6.8 1.9 7.5 5.5" />
      </TabIcon>
    ),
  },
] as const;

function SideTab({
  tab,
  selected,
}: {
  tab: (typeof SIDE_TABS)[number];
  selected: boolean;
}) {
  return (
    <Link
      href={tab.href}
      aria-current={selected ? "page" : undefined}
      className="relative flex min-w-0 flex-col items-center justify-end gap-1 px-1 pb-2 pt-3 text-center"
    >
      {/* Active notch riding the bar's top edge */}
      <span
        aria-hidden
        className={`absolute top-0 h-1 w-8 rounded-b-full bg-orange-600 transition-opacity ${
          selected ? "opacity-100" : "opacity-0"
        }`}
      />
      <span className={selected ? "text-orange-600" : "text-black/45"}>{tab.icon}</span>
      <span
        className={`text-[10px] font-bold ${selected ? "text-orange-700" : "text-black/45"}`}
      >
        {tab.label}
      </span>
    </Link>
  );
}

/** Phone-only, app-style bottom tab bar: flush with the screen's bottom
 *  edge, Events as the raised hero action in the center. Portaled to
 *  <body> alongside the pill so the page's backdrop-blur panel can't trap
 *  its fixed position. */
function MobileTabBar({ active }: { active?: "events" | "host" }) {
  const current = active ?? "home";
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-50 sm:hidden">
      <div className="rounded-t-3xl border-t border-white/70 bg-[#f7f4f0]/95 shadow-[0_-10px_36px_rgba(67,20,7,0.16)] backdrop-blur-xl">
        <div className="grid grid-cols-5 items-stretch pb-[max(env(safe-area-inset-bottom),0.25rem)]">
          <SideTab tab={SIDE_TABS[0]} selected={current === "home"} />
          <SideTab tab={SIDE_TABS[1]} selected={false} />

          {/* Center hero action: Events */}
          <Link
            href="/events"
            aria-current={active === "events" ? "page" : undefined}
            className="relative flex flex-col items-center justify-end gap-1 pb-2 text-center"
          >
            <span
              className={`-mt-7 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-full bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white shadow-lg shadow-orange-600/45 ring-4 transition ${
                active === "events" ? "ring-orange-200" : "ring-[#f7f4f0]"
              }`}
            >
              <svg
                aria-hidden
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 8.5a2 2 0 0 0 0 7V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3.5a2 2 0 0 1 0-7V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1z" />
                <path d="M14 5.5v2M14 11v2M14 16.5v2" strokeDasharray="0.1 3.4" />
              </svg>
            </span>
            <span
              className={`text-[10px] font-bold ${
                active === "events" ? "text-orange-700" : "text-orange-600"
              }`}
            >
              Events
            </span>
          </Link>

          <SideTab tab={SIDE_TABS[2]} selected={current === "host"} />
          <SideTab tab={SIDE_TABS[3]} selected={false} />
        </div>
      </div>
    </nav>
  );
}

export function PublicHeader({ active }: { active?: "events" | "host" }) {
  const scrolled = useScrolled(80);
  const hydrated = useHydrated();

  const pill = (
    <div
      aria-hidden={!scrolled}
      inert={!scrolled}
      className={`fixed inset-x-0 top-0 z-50 border-b border-black/[0.06] bg-[#f7f4f0]/90 shadow-md backdrop-blur-xl transition-all duration-500 ease-out ${
        scrolled
          ? "translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-[130%] opacity-0"
      }`}
    >
      <div className="flex items-center justify-center px-3 py-2 sm:justify-between sm:gap-x-4 sm:px-7 sm:py-2.5">
        <span className="sm:hidden">
          <Logo size="sm" href="/" accent="orange" withMark />
        </span>
        <span className="hidden sm:inline">
          <Logo size="md" href="/" accent="orange" withMark />
        </span>
        <div className="hidden sm:block">
          <NavLinks active={active} compact />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* In-flow header. Phones: compact centered logo, app-title style
          (links live in the bottom tab bar). sm+: large logo left, nav
          links right. */}
      <header className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 py-3 sm:justify-between sm:px-7 sm:py-4">
        <span className="sm:hidden">
          <Logo size="md" href="/" accent="orange" withMark />
        </span>
        <span className="hidden sm:inline">
          <Logo size="lg" href="/" accent="orange" withMark />
        </span>
        <div className="hidden sm:block">
          <NavLinks active={active} />
        </div>
      </header>

      {/* Fixed chrome: sticky pill navbar (slides in on scroll) + phone tab bar */}
      {hydrated &&
        createPortal(
          <>
            {pill}
            <MobileTabBar active={active} />
          </>,
          document.body
        )}
    </>
  );
}
