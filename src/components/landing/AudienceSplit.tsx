import Link from "next/link";
import { ScrollReveal } from "@/components/home/ScrollReveal";

// "Which one are you?" — the first thing after the hero. Splits the two
// audiences (attendees vs organizers) into two unmistakable paths so the
// header never has to explain itself.

export function AudienceSplit() {
  return (
    <section className="scroll-mt-8 px-4 pb-4 pt-14 sm:px-7 sm:pt-20">
      <ScrollReveal className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
          Two ways in
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-black sm:text-3xl">
          What brings you here?
        </h2>
      </ScrollReveal>

      <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-2">
        {/* Attendees */}
        <ScrollReveal>
          <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-white/45 p-7 shadow-lg shadow-orange-950/5 ring-1 ring-white/60 backdrop-blur-md">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 120% at 0% 0%, rgba(251,146,60,0.28) 0%, rgba(255,255,255,0) 55%)",
              }}
            />
            <div className="relative flex flex-1 flex-col">
              <span className="inline-flex w-fit rounded-full bg-orange-100/80 px-3 py-1 text-[11px] font-bold text-orange-700">
                I&apos;m going to an event
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-black">
                Book your seat in three steps
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-black">
                Find your event, pick your exact seats on the live map, and pay
                by bank transfer. Once the organizers verify your slip, your
                personal QR ticket lands in your inbox — no account needed.
              </p>
              <div className="mt-5">
                <Link
                  href="/events"
                  className="inline-block rounded-full bg-orange-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-600/25 transition hover:-translate-y-0.5 hover:bg-orange-700"
                >
                  Browse events →
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Organizers */}
        <ScrollReveal>
          <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-white/45 p-7 shadow-lg shadow-orange-950/5 ring-1 ring-white/60 backdrop-blur-md">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(120% 120% at 100% 0%, rgba(220,38,38,0.16) 0%, rgba(255,255,255,0) 55%)",
              }}
            />
            <div className="relative flex flex-1 flex-col">
              <span className="inline-flex w-fit rounded-full bg-red-100/80 px-3 py-1 text-[11px] font-bold text-red-700">
                I&apos;m organizing one
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-black">
                Put your event on Attendly
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-black">
                Apply in minutes: your own animated event page, numbered seat
                map, payment-slip verification and QR gate scanning — live as
                soon as the Attendly team approves it.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Link
                  href="/host"
                  className="inline-block rounded-full bg-black/85 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-black"
                >
                  Host your event →
                </Link>
                <Link
                  href="/admin/login"
                  className="text-sm font-bold text-black/70 underline decoration-orange-300 underline-offset-4 transition hover:text-black"
                >
                  Already hosting? Sign in
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
