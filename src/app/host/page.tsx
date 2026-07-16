import type { Metadata } from "next";
import Link from "next/link";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Footer } from "@/components/Footer";
import { PublicHeader } from "@/components/PublicHeader";
import { FadeIn } from "@/components/FadeIn";

export const metadata: Metadata = {
  title: "Host your event",
  description:
    "Run your event on Attendly: numbered seat maps, bank-transfer payment verification, QR tickets and gate scanning — apply in minutes, go live once approved.",
  alternates: { canonical: "/host" },
};

const steps = [
  {
    title: "Apply",
    text: "Create your organizer account and fill in your event — name, venue, date, seating layout, pricing and the bank account attendees pay into.",
  },
  {
    title: "Get approved",
    text: "The Attendly team reviews your application. You'll get an email as soon as your event is approved — usually well within a day.",
  },
  {
    title: "Go live & manage",
    text: "Your event page goes up with its countdown and booking. Verify payment slips, issue QR tickets and scan attendees in from your dashboard.",
  },
];

const perks = [
  {
    title: "Your own event page",
    text: "An animated page with a live countdown, schedule and seat booking — no website needed.",
  },
  {
    title: "Numbered seat maps",
    text: "Configure rows, aisles and price; attendees book exact seats and double-booking is impossible.",
  },
  {
    title: "Payments to your bank",
    text: "Attendees transfer straight to your account and upload the slip — you verify before any ticket is issued.",
  },
  {
    title: "QR tickets & gate scanning",
    text: "Verified attendees get personal QR tickets; your staff scan them in with any phone.",
  },
  {
    title: "Live dashboard",
    text: "Registrations, pending reviews and check-in counts, live during the event.",
  },
  {
    title: "You stay in control",
    text: "Only you (and the platform team) can manage your event — other organizers never see your data.",
  },
];

export default function HostPage() {
  return (
    <main className="flex flex-1 flex-col p-2 sm:p-4 lg:p-6">
      <AuroraBackground />

      <div className="flex flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        <PublicHeader active="host" />

        <FadeIn stagger className="flex-1 px-4 pb-16 pt-10 sm:px-7 sm:pt-14">
          {/* Hero */}
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
              For organizers
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-black sm:text-5xl">
              Host your event on{" "}
              <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Attendly
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-black sm:text-base">
              Seat maps, verified bank-transfer payments, QR tickets and gate
              scanning — everything your event needs, set up in one short
              application. Free to apply.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/host/signup"
                className="inline-block rounded-full bg-orange-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl"
              >
                Apply to host →
              </Link>
              <Link
                href="/admin/login"
                className="inline-block rounded-full bg-white/80 px-8 py-3.5 text-sm font-bold text-black shadow-sm ring-1 ring-black/[0.06] transition hover:-translate-y-0.5 hover:bg-white"
              >
                Organizer sign in
              </Link>
            </div>
          </div>

          {/* How hosting works */}
          <div className="mx-auto mt-14 max-w-5xl">
            <h2 className="text-center text-xl font-bold tracking-tight text-black sm:text-2xl">
              How hosting works
            </h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-3">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className="relative overflow-hidden rounded-2xl bg-white/40 p-5 shadow-lg shadow-orange-950/5 ring-1 ring-white/60 backdrop-blur-md"
                >
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(120% 120% at 100% 100%, rgba(251,146,60,0.28) 0%, rgba(255,255,255,0) 55%)",
                    }}
                  />
                  <div className="relative">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-sm font-bold text-white shadow-lg shadow-orange-600/30">
                      {i + 1}
                    </span>
                    <h3 className="mt-3 text-base font-bold text-black">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-black">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Perks grid */}
          <div className="mx-auto mt-14 max-w-5xl">
            <h2 className="text-center text-xl font-bold tracking-tight text-black sm:text-2xl">
              What you get
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {perks.map((perk) => (
                <div
                  key={perk.title}
                  className="rounded-2xl bg-white/40 p-5 shadow-sm ring-1 ring-white/60 backdrop-blur-md"
                >
                  <h3 className="flex items-center gap-2 text-sm font-bold text-black">
                    <svg className="h-4 w-4 shrink-0 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {perk.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-black/80">{perk.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-8 text-center sm:p-12">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(55% 65% at 25% 30%, rgba(245,158,11,0.25) 0%, rgba(0,0,0,0) 70%), radial-gradient(55% 65% at 75% 70%, rgba(234,88,12,0.28) 0%, rgba(0,0,0,0) 70%)",
                }}
              />
              <div className="relative">
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Ready to open your gates?
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
                  Apply now — your event could be live on Attendly with its own
                  countdown before the day is out.
                </p>
                <Link
                  href="/host/signup"
                  className="mt-6 inline-block rounded-full bg-orange-600 px-9 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/40 transition hover:-translate-y-0.5 hover:bg-orange-500"
                >
                  Apply to host →
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>

      <Footer />
    </main>
  );
}
