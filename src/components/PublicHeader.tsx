import Link from "next/link";
import { Logo } from "./Logo";

// Shared header for the public platform pages (/, /events, /host).

export function PublicHeader({ active }: { active?: "events" | "host" }) {
  const linkBase =
    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:text-sm";
  return (
    <header className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-7 sm:py-4">
      <Logo href="/" accent="orange" withMark />
      <nav className="flex items-center gap-1 sm:gap-1.5">
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
          href="/host"
          className={`${linkBase} ${
            active === "host"
              ? "bg-white/80 text-orange-700 shadow-sm ring-1 ring-orange-200/70"
              : "text-black/70 hover:bg-white/60 hover:text-black"
          }`}
        >
          Host with us
        </Link>
        <Link
          href="/admin/login"
          className={`${linkBase} hidden bg-black/85 text-white shadow-sm hover:bg-black sm:inline-flex`}
        >
          Organizer sign in
        </Link>
      </nav>
    </header>
  );
}
