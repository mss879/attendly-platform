import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer({ admin = false }: { admin?: boolean }) {
  if (admin) {
    return (
      <footer className="relative z-10 w-full px-6 py-6 border-t border-black/[0.04] mt-8 text-[11px] font-bold uppercase tracking-wider text-black flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <span>Attendly Admin</span>
          <span>·</span>
          <span>Built and Designed by</span>
          <a
            href="https://www.arcai.agency"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center hover:opacity-80 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/arc-logo.png"
              alt="ARC AI Logo"
              className="h-5 w-auto object-contain"
            />
          </a>
        </div>
        <div>
          <Link
            href="/privacy"
            className="transition hover:text-orange-600 hover:underline underline-offset-4"
          >
            Privacy Policy
          </Link>
        </div>
      </footer>
    );
  }

  return (
    // pb-28 on phones keeps the last row clear of the app-style tab bar.
    <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-8 mt-12 sm:mt-16 border-t border-black/[0.06] pt-12 pb-28 sm:pb-8 text-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
        {/* Branding & Logo */}
        <div className="md:col-span-2 flex flex-col items-start gap-4">
          <Logo size="sm" href="/" accent="orange" withMark />
          <p className="text-sm text-slate-600 max-w-sm mt-1 leading-relaxed">
            Attendly is a smart, modern event ticketing platform. Enjoy interactive seat maps, bank-transfer payment verification, and seamless check-ins.
          </p>
        </div>

        {/* Column 1: Explore */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Explore</h4>
          <ul className="flex flex-col gap-2.5 text-sm">
            <li>
              <Link href="/events" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                Find Events
              </Link>
            </li>
            <li>
              <Link href="/host" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                Host an Event
              </Link>
            </li>
            <li>
              <Link href="/host/signup" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                Create Host Account
              </Link>
            </li>
            <li>
              <Link href="/preview-events" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                Preview Events
              </Link>
            </li>
          </ul>
        </div>

        {/* Column 2: Legal & Support */}
        <div className="flex flex-col gap-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Support & Legal</h4>
          <ul className="flex flex-col gap-2.5 text-sm">
            <li>
              <Link href="/privacy" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <a href="mailto:hello@arcai.agency" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                Contact Support
              </a>
            </li>
            <li>
              <a
                href="https://www.arcai.agency"
                target="_blank"
                rel="noopener"
                className="text-slate-600 hover:text-orange-600 font-medium transition-colors"
              >
                ARC AI Agency
              </a>
            </li>
            <li>
              <Link href="/admin/login" className="text-slate-600 hover:text-orange-600 font-medium transition-colors">
                Organizer Login
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="mt-12 pt-8 border-t border-black/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-400">
        <p>© {new Date().getFullYear()} Attendly. All rights reserved.</p>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span>Built and Designed by</span>
          <a
            href="https://www.arcai.agency"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center hover:opacity-80 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/arc-logo.png"
              alt="ARC AI Logo"
              loading="lazy"
              decoding="async"
              className="h-5 w-auto object-contain"
            />
          </a>
        </div>
      </div>
    </footer>
  );
}
