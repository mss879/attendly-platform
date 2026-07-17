import type { Metadata } from "next";
import { EventsPreview } from "@/components/landing/EventsPreview";
import type { EventRow } from "@/lib/types";

// TEMPORARY dev-only harness to eyeball EventsPreview with mock data.
// Delete this file — it must never ship.

// Mock content must never reach Google's index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function mockEvent(n: number): EventRow {
  return {
    id: `mock-${n}`,
    owner_id: null,
    slug: `mock-event-${n}`,
    name: ["Big Match Encounter", "Colombo Jazz Night", "Startup Summit"][n - 1],
    edition: ["45th Edition", "Vol. 12", "2026"][n - 1],
    subtitle: "A night to remember at the heart of the city",
    tagline: [],
    description: "Mock event for layout preview.",
    venue: ["SSC Grounds, Colombo", "Nelum Pokuna", "BMICH Main Hall"][n - 1],
    schedule: [],
    teams: null,
    starts_at: new Date(Date.now() + n * 6 * 86400000).toISOString(),
    gates_open_at: null,
    seating: {
      rows: ["A", "B", "C"],
      seatsPerRow: 20,
      blocks: [10, 10],
      pricePerSeat: 2500 * n,
      maxSeatsPerBooking: 6,
    },
    bank: { name: "Mock Bank", accountName: "Mock", accountNumber: "000", branch: "Colombo" },
    collect_batch: false,
    status: "published",
    created_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
  };
}

export default function PreviewEventsPage() {
  const events = [mockEvent(1), mockEvent(2), mockEvent(3)];
  return (
    <main className="flex flex-1 flex-col p-2">
      <div className="flex flex-1 flex-col rounded-2xl bg-[#f7f4f0]/90 shadow-2xl shadow-orange-950/20 ring-1 ring-white/50 backdrop-blur-xl sm:rounded-[28px]">
        <div className="h-svh" />
        <EventsPreview events={events} />
        <div className="h-svh" />
      </div>
    </main>
  );
}
