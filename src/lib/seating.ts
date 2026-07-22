// Pure seating helpers, safe to import from client components.
// Every event carries its own SeatingConfig; nothing here is event-specific.

import type { SeatingConfig } from "./types";

/** Zero-pad width for seat numbers, e.g. 75 seats -> 2 ("A01"…"A75"). */
export function seatPad(seating: Pick<SeatingConfig, "seatsPerRow">): number {
  return Math.max(2, String(seating.seatsPerRow).length);
}

export function seatId(seating: Pick<SeatingConfig, "seatsPerRow">, row: string, n: number): string {
  return `${row}${String(n).padStart(seatPad(seating), "0")}`;
}

/** The full set of valid seat ids for an event — used for validation. */
export function validSeatIds(seating: SeatingConfig): Set<string> {
  const ids = new Set<string>();
  for (const row of seating.rows) {
    for (let n = 1; n <= seating.seatsPerRow; n++) {
      ids.add(seatId(seating, row, n));
    }
  }
  return ids;
}

/**
 * Why this seating change can't be applied to an event that already has
 * bookings — or null when it is safe.
 *
 * Growing the plan (more rows, more seats per row, different aisles) is fine:
 * nobody's seat moves. What is never allowed is repricing a sold seat, or a
 * layout that no longer contains one. The second check also catches the
 * subtle case where crossing 99 seats per row widens the zero-padding and
 * silently renumbers every existing seat (A01 -> A001).
 */
export function seatingChangeBlocker(
  current: SeatingConfig,
  next: SeatingConfig,
  bookedSeats: string[]
): string | null {
  if (bookedSeats.length === 0) return null;

  if (next.pricePerSeat !== current.pricePerSeat) {
    return "Seats have already been booked — the price per seat can't change.";
  }

  const valid = validSeatIds(next);
  const orphaned = bookedSeats.filter((seat) => !valid.has(seat));
  if (orphaned.length === 0) return null;

  const shown = orphaned.slice(0, 6).join(", ");
  const more = orphaned.length > 6 ? ` and ${orphaned.length - 6} more` : "";
  return seatPad(next) !== seatPad(current)
    ? `Going to ${next.seatsPerRow} seats per row would renumber every seat (A01 becomes A001), which breaks the ${bookedSeats.length} seats already booked.`
    : `That layout would remove seats people have already booked (${shown}${more}). Grow the plan instead of shrinking it.`;
}

export function formatLKR(amount: number): string {
  return `Rs ${amount.toLocaleString("en-LK")}`;
}

/** Sensible defaults for the "create event" wizard (the Bradby grandstand). */
export const DEFAULT_SEATING: SeatingConfig = {
  rows: ["A", "B", "C", "D", "E", "F"],
  seatsPerRow: 75,
  blocks: [20, 35, 20],
  pricePerSeat: 1500,
  maxSeatsPerBooking: 10,
};
