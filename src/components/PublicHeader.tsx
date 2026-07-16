"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Logo } from "./Logo";

// Shared header for the public platform pages (/, /events, /host).
// At the top of the page it's a roomy, transparent bar with a large logo
// riding on the page backdrop. As soon as the visitor scrolls, a compact
// glassy pill navbar slides down and stays fixed — the header "morphs"
// into a sticky nav.

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
  const linkBase = `rounded-full font-semibold transition ${
    compact ? "px-3 py-1.5 text-xs sm:text-sm" : "px-3.5 py-1.5 text-xs sm:text-sm"
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
        className={`ml-1 flex items-center gap-1 rounded-full py-1 pl-3 pr-1 ring-1 sm:ml-2 ${
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
          className={`rounded-full px-3 py-1.5 text-xs font-bold transition sm:text-sm ${
            active === "host"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-orange-700 hover:bg-orange-100/70"
          }`}
        >
          Host an event
        </Link>
        <Link
          href="/admin/login"
          title="Sign in to your organizer dashboard"
          className="rounded-full bg-black/85 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-black sm:text-sm"
        >
          Sign in
        </Link>
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
      <div className="flex items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 sm:px-7">
        <Logo size="md" href="/" accent="orange" withMark />
        <NavLinks active={active} compact />
      </div>
    </div>
  );

  return (
    <>
      {/* In-flow header: large logo, transparent, rides the page backdrop */}
      <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-7 sm:py-4">
        <Logo size="lg" href="/" accent="orange" withMark />
        <NavLinks active={active} />
      </header>

      {/* Sticky pill navbar — slides in once the visitor starts scrolling */}
      {hydrated && createPortal(pill, document.body)}
    </>
  );
}
