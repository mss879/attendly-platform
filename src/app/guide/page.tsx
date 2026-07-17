import type { Metadata } from "next";
import Link from "next/link";
import { AuroraBackground } from "@/components/AuroraBackground";
import { FadeIn } from "@/components/FadeIn";
import { Footer } from "@/components/Footer";
import { PublicHeader } from "@/components/PublicHeader";
import { GuideTabs } from "@/components/guide/GuideTabs";

export const metadata: Metadata = {
  title: "Guide — How Attendly works",
  description:
    "Everything about Attendly in one place: how attendees book numbered seats, pay by bank transfer and get QR tickets — and how organizers run events with slip verification, gate scanning and a live dashboard.",
  alternates: { canonical: "/guide" },
};

const ATTENDEE_STEPS = [
  {
    title: "Find your event",
    text: "Browse everything on the platform — each event has its own page with a live countdown, schedule, venue details and pricing.",
  },
  {
    title: "Enter your details",
    text: "Name, email and phone — that's who the ticket belongs to. Your QR ticket is emailed to the address you give here.",
  },
  {
    title: "Pick your exact seats",
    text: "A live seat map shows every numbered seat. Taken seats are locked, so the seats you pick are exactly where you'll sit.",
  },
  {
    title: "Pay by bank transfer",
    text: "Transfer the total to the organizer's bank account — the account details and exact amount are shown on screen at checkout.",
  },
  {
    title: "Upload your slip",
    text: "Snap or screenshot your transfer slip and upload it with the booking. A human verifies it against the bank records — no bots.",
  },
  {
    title: "QR ticket & gate",
    text: "Once your payment is approved, your personal QR ticket lands in your inbox. At the gate it's one scan and you're in.",
  },
];

const ATTENDEE_NOTES = [
  {
    title: "Tickets only exist after verification",
    text: "No ticket is issued until the organizer has checked your payment slip, so every QR at the gate is backed by a real payment.",
  },
  {
    title: "Seats can't be double-booked",
    text: "The seat map locks a seat the moment it's booked. Nobody else can pick your seat after you.",
  },
  {
    title: "No apps, no printouts",
    text: "Your QR ticket works straight from the email on your phone screen. Lost it? Reach out and we'll help: hello@arcai.agency.",
  },
];

const ORGANIZER_STEPS = [
  {
    title: "Apply to host",
    text: "One short application: your event's name, venue, date, seating layout, pricing and the bank account attendees pay into.",
  },
  {
    title: "Get approved",
    text: "The Attendly team reviews every application. You'll get an email as soon as you're approved — usually well within a day.",
  },
  {
    title: "Build & publish",
    text: "Your event page goes live with its countdown, and booking opens on the events listing. No website of your own needed.",
  },
  {
    title: "Verify payments",
    text: "Uploaded bank slips queue up in your dashboard. Approve one and the personal QR ticket is emailed automatically; reject anything that doesn't match.",
  },
  {
    title: "Scan at the gate",
    text: "Your staff scan QR tickets with any phone — valid tickets check in instantly and duplicates are flagged on the spot.",
  },
  {
    title: "Watch it live",
    text: "Registrations, pending payment reviews and check-in counts update live in your dashboard, right through the event.",
  },
];

const ORGANIZER_NOTES = [
  {
    title: "Payments go straight to your bank",
    text: "Attendees transfer directly into your account. Attendly never sits between you and your money.",
  },
  {
    title: "You stay in control",
    text: "Only you (and the platform team) can manage your event — other organizers never see your data.",
  },
  {
    title: "Free to apply",
    text: "Applying costs nothing. Questions before you start? Write to hello@arcai.agency.",
  },
];

function StepCards({ steps }: { steps: { title: string; text: string }[] }) {
  return (
    <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                "radial-gradient(120% 120% at 100% 100%, rgba(251,146,60,0.24) 0%, rgba(255,255,255,0) 55%)",
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
  );
}

function NoteCards({ notes }: { notes: { title: string; text: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {notes.map((note) => (
        <div
          key={note.title}
          className="rounded-2xl bg-white/40 p-5 shadow-sm ring-1 ring-white/60 backdrop-blur-md"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold text-black">
            <svg
              className="h-4 w-4 shrink-0 text-orange-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {note.title}
          </h3>
          <p className="mt-1.5 text-sm leading-relaxed text-black/80">{note.text}</p>
        </div>
      ))}
    </div>
  );
}

function AttendeeGuide() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-black sm:text-base">
        Booking with Attendly takes a few minutes: pick real numbered seats on
        a live map, pay the organizer by bank transfer, and walk in on event
        day with the QR ticket from your inbox.
      </p>

      <h2 className="mt-10 text-center text-xl font-bold tracking-tight text-black sm:text-2xl">
        From browsing to the gate
      </h2>
      <div className="mt-6">
        <StepCards steps={ATTENDEE_STEPS} />
      </div>

      <h2 className="mt-12 text-center text-xl font-bold tracking-tight text-black sm:text-2xl">
        Good to know
      </h2>
      <div className="mt-6">
        <NoteCards notes={ATTENDEE_NOTES} />
      </div>

      <div className="mt-12 text-center">
        <Link
          href="/events"
          className="inline-block rounded-full bg-orange-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-600/30 transition hover:-translate-y-0.5 hover:bg-orange-700 hover:shadow-xl"
        >
          Browse events →
        </Link>
      </div>
    </div>
  );
}

function OrganizerGuide() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="mx-auto max-w-2xl text-center text-sm leading-relaxed text-black sm:text-base">
        Attendly gives your event a booking page with numbered seat maps,
        bank-transfer payments you verify yourself, automatic QR tickets and
        gate scanning — all run from one live dashboard.
      </p>

      <h2 className="mt-10 text-center text-xl font-bold tracking-tight text-black sm:text-2xl">
        From application to event day
      </h2>
      <div className="mt-6">
        <StepCards steps={ORGANIZER_STEPS} />
      </div>

      <h2 className="mt-12 text-center text-xl font-bold tracking-tight text-black sm:text-2xl">
        Good to know
      </h2>
      <div className="mt-6">
        <NoteCards notes={ORGANIZER_NOTES} />
      </div>

      <div className="mt-12 flex flex-wrap items-center justify-center gap-3 text-center">
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
  );
}

export default function GuidePage() {
  return (
    <main className="flex flex-1 flex-col p-2">
      <AuroraBackground />

      <div className="flex flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        <PublicHeader active="guide" />

        <FadeIn stagger className="flex-1 px-4 pb-16 pt-10 sm:px-7 sm:pt-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
              Platform guide
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-black sm:text-5xl">
              How{" "}
              <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Attendly
              </span>{" "}
              works
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-black sm:text-base">
              Seats, bank-transfer payments, QR tickets and gate scanning —
              here&rsquo;s the whole journey, whichever side of the gate
              you&rsquo;re on.
            </p>
          </div>

          <div className="mx-auto mt-10 w-full max-w-5xl">
            <GuideTabs attendees={<AttendeeGuide />} organizers={<OrganizerGuide />} />
          </div>
        </FadeIn>
      </div>

      <Footer />
    </main>
  );
}
